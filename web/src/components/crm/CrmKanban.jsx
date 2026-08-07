import { useState, useEffect, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { normalizeDeal, formatMoney } from '../../utils/normalizeDeal';
import { getCalculatorDefaultsFromSettings } from '../../utils/calculatorDefaultsFromSettings';
import { getSavedDealCalculatorSummary } from '../../utils/savedDealCalculatorSummary';
import {
  UNSTAGED_KEY,
  daysInCurrentStage,
  cocReturnTier,
  defaultStageForKanbanColumn,
  kanbanColumnForStage,
  resolveDealStage
} from '../../utils/pipelineStages';
import { useTeam } from '../../context/TeamContext';

function KanbanCard({
  deal,
  summary,
  onSelect,
  dragging,
  isSelected,
  onDragStart,
  onDragEnd,
  draggable = true,
  dimmed = false,
  highlighted = false,
  nextAction = null
}) {
  const days = daysInCurrentStage(deal);
  const coc = summary?.cocReturn;
  const cocOk = coc != null && Number.isFinite(coc);
  const stageLabel = resolveDealStage(deal);
  const pending = deal.pending_approval || deal.pendingApproval;
  const last = deal.last_activity || deal.lastActivity;
  const lastTouchLabel = (() => {
    if (!last?.at) return null;
    const d = new Date(last.at);
    if (Number.isNaN(d.getTime())) return null;
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (daysAgo <= 0) return 'today';
    if (daysAgo === 1) return '1d ago';
    return `${daysAgo}d ago`;
  })();
  const actorShort = last?.actorEmail ? String(last.actorEmail).split('@')[0] : null;

  return (
    <article
      className={[
        'crm-kanban-card',
        dragging ? 'crm-kanban-card--dragging' : '',
        isSelected ? 'crm-kanban-card--selected' : '',
        pending ? 'crm-kanban-card--pending' : '',
        dimmed ? 'crm-kanban-card--dimmed' : '',
        highlighted ? 'crm-kanban-card--highlighted' : '',
        nextAction?.urgent ? 'crm-kanban-card--has-urgent' : ''
      ].filter(Boolean).join(' ')}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={() => onSelect(deal.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(deal.id);
        }
      }}
    >
      <h4 className="crm-kanban-card__title">{deal.name || 'Untitled deal'}</h4>
      {pending ? <span className="crm-kanban-card__pending">Pending approval</span> : null}
      {deal.unread_messages > 0 ? (
        <span className="crm-kanban-card__unread">{deal.unread_messages} new</span>
      ) : null}
      {nextAction ? (
        <div
          className={`crm-kanban-card__next${nextAction.urgent ? ' crm-kanban-card__next--urgent' : ''}`}
          title={nextAction.title}
        >
          {nextAction.urgent ? 'Overdue: ' : 'Next: '}
          {nextAction.title}
        </div>
      ) : null}
      <div className="crm-kanban-card__meta">
        {deal.askingPrice != null ? <span>{formatMoney(deal.askingPrice)}</span> : null}
        {cocOk ? (
          <span className="crm-kanban-card__coc" data-tier={cocReturnTier(coc)}>
            {coc.toFixed(0)}% CoC
          </span>
        ) : null}
      </div>
      <div className="crm-kanban-card__footer">
        {stageLabel ? <span className="crm-kanban-card__stage">{stageLabel}</span> : null}
        {days != null ? <span>{days}d</span> : null}
      </div>
      {lastTouchLabel ? (
        <div
          className="crm-kanban-card__touched"
          title={actorShort ? `Last touched by ${actorShort}` : 'Last CRM activity'}
        >
          Touched {lastTouchLabel}
          {actorShort ? ` · ${actorShort}` : ''}
        </div>
      ) : null}
    </article>
  );
}

export default function CrmKanban({
  deals = [],
  settings = null,
  selectedDealId = null,
  onSelectDeal,
  onRefresh,
  onStageChanged = null,
  onBlankUnderwriting = null,
  highlightDealIds = null,
  nextActionByDealId = null,
  onAddDeal = null
}) {
  const { activeTeamId, activeTeam, isTeamMode } = useTeam();
  const canWriteBoard = !isTeamMode || activeTeam?.role !== 'viewer';
  const [kanban, setKanban] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragDealId, setDragDealId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [moving, setMoving] = useState(false);

  const calculatorDefaults = useMemo(
    () => getCalculatorDefaultsFromSettings(settings),
    [settings]
  );

  const dealsById = useMemo(() => {
    const map = new Map();
    for (const d of deals) {
      const n = normalizeDeal(d);
      if (n?.id) map.set(n.id, n);
    }
    return map;
  }, [deals]);

  const loadKanban = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getKanban(
        isTeamMode && activeTeamId
          ? { scope: 'team', teamId: activeTeamId }
          : { scope: 'personal' }
      );
      setKanban(data);
    } catch (err) {
      setError(err.message || 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, isTeamMode]);

  useEffect(() => {
    loadKanban();
  }, [loadKanban, deals.length]);

  const normalizeKanbanDeal = useCallback(
    (row) => {
      const fromParent = dealsById.get(row.id);
      const lastActivity = row.last_activity || row.lastActivity || null;
      if (fromParent) {
        return lastActivity ? { ...fromParent, last_activity: lastActivity } : fromParent;
      }
      const n = normalizeDeal(row);
      return lastActivity ? { ...n, last_activity: lastActivity } : n;
    },
    [dealsById]
  );

  const columns = useMemo(() => {
    if (!kanban) return [];
    return (kanban.columns || []).map((col) => ({
      id: col.id || col.stage,
      label: col.label || col.stage,
      deals: (col.deals || []).map(normalizeKanbanDeal)
    }));
  }, [kanban, normalizeKanbanDeal]);

  const summaryFor = useCallback(
    (deal) => getSavedDealCalculatorSummary(deal, calculatorDefaults),
    [calculatorDefaults]
  );

  const handleDragStart = (e, dealId) => {
    setDragDealId(dealId);
    e.dataTransfer.setData('text/plain', String(dealId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragDealId(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(columnId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    setDropTarget(null);
    const dealId = Number(e.dataTransfer.getData('text/plain') || dragDealId);
    if (!dealId || moving) return;

    const deal = dealsById.get(dealId) || normalizeKanbanDeal({ id: dealId });
    const currentCol = kanbanColumnForStage(resolveDealStage(deal));
    if (currentCol.id === columnId) return;

    const targetStage = defaultStageForKanbanColumn(columnId);

    setMoving(true);
    try {
      const result = await crmAPI.updateStage(dealId, targetStage);
      if (result.needsApproval) {
        alert(`Approval requested for "${result.pendingApproval?.to_value || targetStage}". An admin will review.`);
      }
      onStageChanged?.(result, deal.name);
      await loadKanban();
      onRefresh?.();
    } catch (err) {
      alert('Failed to move deal: ' + err.message);
    } finally {
      setMoving(false);
      setDragDealId(null);
    }
  };

  const filtering = highlightDealIds instanceof Set && highlightDealIds.size > 0;

  // Must run before any early return (Rules of Hooks).
  useEffect(() => {
    if (!filtering) return;
    const el = document.querySelector('.crm-kanban-card--highlighted');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [filtering, highlightDealIds]);

  if (loading && !kanban) {
    return <div className="crm-panel">Loading pipeline…</div>;
  }

  if (error) {
    return (
      <div className="crm-panel crm-panel--error">
        <p>{error}</p>
        <button type="button" className="btn-secondary" onClick={loadKanban}>Retry</button>
      </div>
    );
  }

  const totalDeals = kanban?.totalDeals ?? 0;

  return (
    <div className="crm-kanban">
      <div className="crm-kanban-toolbar">
        <p className="crm-kanban-toolbar__hint">
          {canWriteBoard
            ? 'Drag deals between columns to update pipeline stage. Click a card to open the workspace.'
            : 'Viewer role — pipeline is read-only. Open a deal to use Talk.'}
        </p>
        <div className="crm-kanban-toolbar__actions">
          {typeof onAddDeal === 'function' ? (
            <button type="button" className="btn-primary" onClick={onAddDeal}>
              Add deal
            </button>
          ) : null}
          {canWriteBoard && onBlankUnderwriting ? (
            <button type="button" className="btn-secondary" onClick={onBlankUnderwriting}>
              New blank underwriting
            </button>
          ) : null}
          <span className="crm-kanban-count">{totalDeals} deals</span>
        </div>
      </div>

      {totalDeals === 0 ? (
        <div className="crm-empty">
          <h2>Pipeline is empty</h2>
          <p>Save deals from the Aggregator — they appear in Inbox until you move them forward.</p>
        </div>
      ) : (
        <div className="crm-kanban-board" aria-busy={moving}>
          {columns.map((col) => {
            const isDrop = dropTarget === col.id;
            return (
              <section
                key={col.id}
                className={`crm-kanban-column${isDrop ? ' crm-kanban-column--drop' : ''}`}
                onDragOver={canWriteBoard ? (e) => handleDragOver(e, col.id) : undefined}
                onDragLeave={canWriteBoard ? () => setDropTarget((t) => (t === col.id ? null : t)) : undefined}
                onDrop={canWriteBoard ? (e) => handleDrop(e, col.id) : undefined}
              >
                <header className="crm-kanban-column__header">
                  <h3>{col.label}</h3>
                  <span className="crm-kanban-column__count">{col.deals.length}</span>
                </header>
                <div className="crm-kanban-column__body">
                  {col.deals.map((deal) => {
                    const dealId = Number(deal.id);
                    const highlighted = filtering && highlightDealIds.has(dealId);
                    const dimmed = filtering && !highlighted;
                    const nextAction =
                      nextActionByDealId instanceof Map
                        ? nextActionByDealId.get(dealId) || null
                        : null;
                    return (
                      <KanbanCard
                        key={deal.id}
                        deal={deal}
                        summary={summaryFor(deal)}
                        dragging={dragDealId === deal.id}
                        isSelected={
                          selectedDealId != null && String(selectedDealId) === String(deal.id)
                        }
                        onSelect={onSelectDeal}
                        draggable={canWriteBoard}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onDragEnd={handleDragEnd}
                        dimmed={dimmed}
                        highlighted={highlighted}
                        nextAction={nextAction}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { UNSTAGED_KEY };
