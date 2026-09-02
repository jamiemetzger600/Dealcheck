import { useRef } from 'react';
import { formatMoney, getDealProgressLabel, isPassedOnDeal } from '../../utils/normalizeDeal';
import { cocReturnTier } from '../../utils/pipelineStages';
import { deedColorById, waitingOnLabels } from '../../utils/deedCardPrefs';

function ddStatusForDeal(deal, overdueDealIds) {
  const id = Number(deal?.id);
  if (overdueDealIds instanceof Set && overdueDealIds.has(id)) {
    return { label: 'Overdue', urgent: true };
  }
  const stage = String(deal?.progressStage || deal?.progress_stage || '').trim();
  if (stage === 'Starting Due Diligence' || /due diligence/i.test(stage)) {
    return { label: 'In progress', urgent: false };
  }
  return { label: 'Not started', urgent: false };
}

function stop(e) {
  e.preventDefault();
  e.stopPropagation();
}

function DeedRow({ label, value, onClick, urgent = false, onBlockDrag }) {
  return (
    <button
      type="button"
      className={`crm-deed-card__row${urgent ? ' crm-deed-card__row--urgent' : ''}`}
      onClick={(e) => {
        stop(e);
        onClick?.();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onBlockDrag?.();
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </button>
  );
}

export default function CrmDeedCard({
  deal,
  summary,
  nextAction = null,
  waiting,
  overdueDealIds = null,
  colorId,
  pinned = false,
  selected = false,
  dragging = false,
  dropTarget = false,
  writeEnabled = true,
  onOpen,
  onContextMenu,
  onOpenField,
  onPin,
  onArchive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}) {
  const skipClick = useRef(false);
  const blockDrag = useRef(false);
  const color = deedColorById(colorId, deal.id);
  const stageLabel = getDealProgressLabel(deal);
  const statusUnset = !stageLabel;
  const status = statusUnset ? 'Status: Tap to set' : stageLabel;
  const nextLabel = nextAction?.title || 'Set next step';
  const asking = summary?.askingPrice ?? deal.askingPrice;
  const ebitda = summary?.ebitda ?? deal.ebitda;
  const coc = summary?.cocReturn;
  const cocOk = coc != null && Number.isFinite(coc);
  const waitingLabels = waitingOnLabels(waiting).slice(0, 4);
  const waitingExtra = Math.max(0, waitingOnLabels(waiting).length - 4);
  const ddStatus = ddStatusForDeal(deal, overdueDealIds);

  return (
    <article
      className={[
        'crm-deed-card',
        selected ? 'crm-deed-card--selected' : '',
        dragging ? 'crm-deed-card--dragging' : '',
        dropTarget ? 'crm-deed-card--drop' : '',
        pinned ? 'crm-deed-card--pinned' : ''
      ].filter(Boolean).join(' ')}
      draggable={writeEnabled}
      onDragStart={writeEnabled ? (e) => {
        if (blockDrag.current) {
          e.preventDefault();
          blockDrag.current = false;
          return;
        }
        skipClick.current = true;
        onDragStart?.(e);
      } : undefined}
      onDragEnd={writeEnabled ? (e) => {
        onDragEnd?.(e);
        setTimeout(() => { skipClick.current = false; }, 200);
      } : undefined}
      onDragOver={writeEnabled ? onDragOver : undefined}
      onDrop={writeEnabled ? onDrop : undefined}
      onClick={() => {
        if (skipClick.current) return;
        onOpen?.(deal.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, deal);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(deal.id);
        }
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          onContextMenu?.({ clientX: r.left + r.width / 2, clientY: r.bottom }, deal);
        }
      }}
      style={{ '--deed-color': color.hex, '--deed-ink': color.ink }}
    >
      <div className="crm-deed-card__inner">
        <header className="crm-deed-card__header">
          <h3 className="crm-deed-card__name">{deal.name || 'Untitled deal'}</h3>
        </header>

        <button
          type="button"
          className={`crm-deed-card__status${statusUnset ? ' crm-deed-card__status--empty' : ''}`}
          onClick={(e) => {
            stop(e);
            onOpenField?.('status');
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            blockDrag.current = true;
          }}
        >
          {status}
        </button>

        <div className="crm-deed-card__rows">
          <DeedRow
            label="Next step"
            value={nextLabel}
            urgent={Boolean(nextAction?.urgent)}
            onClick={() => onOpenField?.('next')}
            onBlockDrag={() => { blockDrag.current = true; }}
          />
        </div>

        <button
          type="button"
          className="crm-deed-card__waiting"
          onClick={(e) => {
            stop(e);
            onOpenField?.('waiting');
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            blockDrag.current = true;
          }}
        >
          <span className="crm-deed-card__waiting-label">Waiting on</span>
          {waitingLabels.length === 0 ? (
            <span className="crm-deed-card__waiting-empty">None — tap to set</span>
          ) : (
            <ul>
              {waitingLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
              {waitingExtra > 0 ? <li>+{waitingExtra} more</li> : null}
            </ul>
          )}
        </button>

        <div className="crm-deed-card__rows">
          <DeedRow
            label="Due diligence"
            value={ddStatus.label}
            urgent={ddStatus.urgent}
            onClick={() => {
              console.log('[CrmDeedCard] open DD', deal.id);
              onOpen?.(deal.id, { focusSection: 'crm-dd' });
            }}
            onBlockDrag={() => { blockDrag.current = true; }}
          />
        </div>

        <button
          type="button"
          className="crm-deed-card__metrics"
          title="Asking · EBITDA/SDE · CoC"
          aria-label="Asking, EBITDA/SDE, and cash-on-cash"
          onClick={(e) => {
            stop(e);
            onOpenField?.('metrics');
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            blockDrag.current = true;
          }}
        >
          <span>{asking != null ? formatMoney(asking) : '—'}</span>
          <span>{ebitda != null ? formatMoney(ebitda) : '—'}</span>
          <span
            className="crm-deed-card__coc"
            data-tier={cocOk ? cocReturnTier(coc) : 'neutral'}
          >
            {cocOk ? `${coc.toFixed(0)}% CoC` : '— CoC'}
          </span>
        </button>

        <div
          className="crm-deed-card__shortcuts"
          onClick={stop}
          onPointerDown={(e) => {
            e.stopPropagation();
            blockDrag.current = true;
          }}
        >
          <button type="button" onClick={() => onPin?.()}>
            {pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" onClick={() => onOpenField?.('color')}>
            Color
          </button>
          {writeEnabled && !isPassedOnDeal(deal) ? (
            <button type="button" onClick={() => onArchive?.()}>
              Archive
            </button>
          ) : null}
          <button type="button" onClick={() => onOpen?.(deal.id)}>
            Open
          </button>
        </div>
      </div>
    </article>
  );
}
