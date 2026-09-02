import { useEffect, useState } from 'react';
import { formatMoney } from '../../utils/normalizeDeal';
import { PIPELINE_STAGE_OPTIONS } from '../../utils/pipelineStages';
import { DEED_COLORS, WAITING_DEFAULTS, emptyWaitingOn } from '../../utils/deedCardPrefs';

function ModalShell({ title, onClose, children, footer = null }) {
  return (
    <div className="modal-overlay crm-deed-modal-overlay" role="presentation">
      <button type="button" className="crm-deed-modal-overlay__backdrop" aria-label="Close" onClick={onClose} />
      <div className="crm-deed-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="crm-deed-modal__header">
          <h3>{title}</h3>
          <button type="button" className="crm-deed-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="crm-deed-modal__body">{children}</div>
        {footer ? <footer className="crm-deed-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

function StatusModal({ deal, writeEnabled, saving, onChange, onClose }) {
  const current = deal?.progressStage || '';
  return (
    <ModalShell title="Current status" onClose={onClose}>
      <p className="crm-muted">{deal?.name}</p>
      <label htmlFor="crm-deed-status">Pipeline status</label>
      <select
        id="crm-deed-status"
        className="modal-input"
        value={current}
        disabled={!writeEnabled || saving}
        onChange={onChange}
      >
        <option value="">Select status…</option>
        {PIPELINE_STAGE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        {current && !PIPELINE_STAGE_OPTIONS.includes(current) ? (
          <option value={current}>{current} (saved)</option>
        ) : null}
      </select>
    </ModalShell>
  );
}

function NextStepModal({
  deal,
  nextAction,
  writeEnabled,
  onClose,
  onCreateTask,
  onOpenTasks
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onCreateTask?.(trimmed);
      setTitle('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Next step"
      onClose={onClose}
      footer={
        <button type="button" className="btn-secondary" onClick={onOpenTasks}>
          Open tasks
        </button>
      }
    >
      <p className="crm-muted">{deal?.name}</p>
      {nextAction ? (
        <p className={`crm-deed-modal__next${nextAction.urgent ? ' crm-deed-modal__next--urgent' : ''}`}>
          {nextAction.urgent ? 'Overdue: ' : 'Current: '}
          {nextAction.title}
          {nextAction.dueLabel ? ` · ${nextAction.dueLabel}` : ''}
        </p>
      ) : (
        <p>No next step on this deal yet.</p>
      )}
      {writeEnabled ? (
        <form onSubmit={handleAdd} className="crm-deed-modal__form">
          <label htmlFor="crm-deed-next-title">Add next step</label>
          <input
            id="crm-deed-next-title"
            className="modal-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review CIM with attorney"
          />
          <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Add task'}
          </button>
        </form>
      ) : (
        <p className="crm-muted">Viewer role — next steps are read-only.</p>
      )}
    </ModalShell>
  );
}

function MetricsModal({ deal, summary, onClose, onOpenCalculator }) {
  const asking = summary?.askingPrice ?? deal?.askingPrice;
  const ebitda = summary?.ebitda ?? deal?.ebitda;
  const coc = summary?.cocReturn;
  const cocOk = coc != null && Number.isFinite(coc);
  return (
    <ModalShell
      title="Deal metrics"
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary" onClick={onOpenCalculator}>
          Open calculator
        </button>
      }
    >
      <p className="crm-muted">{deal?.name}</p>
      <dl className="crm-deed-modal__metrics">
        <div><dt>Asking</dt><dd>{asking != null ? formatMoney(asking) : '—'}</dd></div>
        <div><dt>EBITDA/SDE</dt><dd>{ebitda != null ? formatMoney(ebitda) : '—'}</dd></div>
        <div><dt>Cash-on-cash</dt><dd>{cocOk ? `${coc.toFixed(1)}%` : '—'}</dd></div>
      </dl>
    </ModalShell>
  );
}

function WaitingOnModal({ deal, waiting, writeEnabled, onClose, onSave }) {
  const initial = waiting || emptyWaitingOn();
  const [active, setActive] = useState(initial.active);
  const [custom, setCustom] = useState(initial.custom);
  const [draft, setDraft] = useState('');

  const toggle = (id) => {
    setActive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addCustom = (e) => {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setCustom((prev) => [...prev, { id: `c-${Date.now()}`, label }]);
    setDraft('');
  };

  const removeCustom = (id) => {
    setCustom((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <ModalShell
      title="Waiting on"
      onClose={onClose}
      footer={
        writeEnabled ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSave?.({ active, custom })}
          >
            Save
          </button>
        ) : null
      }
    >
      <p className="crm-muted">{deal?.name}</p>
      <ul className="crm-deed-modal__checks">
        {WAITING_DEFAULTS.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={active.includes(item.id)}
                disabled={!writeEnabled}
                onChange={() => toggle(item.id)}
              />
              {item.label}
            </label>
          </li>
        ))}
      </ul>
      {custom.length > 0 ? (
        <ul className="crm-deed-modal__custom">
          {custom.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              {writeEnabled ? (
                <button type="button" className="btn-secondary" onClick={() => removeCustom(item.id)}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {writeEnabled ? (
        <form onSubmit={addCustom} className="crm-deed-modal__form">
          <label htmlFor="crm-deed-waiting-custom">Custom</label>
          <input
            id="crm-deed-waiting-custom"
            className="modal-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Escrow officer"
          />
          <button type="submit" className="btn-secondary" disabled={!draft.trim()}>
            Add
          </button>
        </form>
      ) : null}
    </ModalShell>
  );
}

function ColorModal({ deal, colorId, onClose, onPick }) {
  return (
    <ModalShell title="Header color" onClose={onClose}>
      <p className="crm-muted">{deal?.name}</p>
      <div className="crm-deed-modal__swatches">
        {DEED_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`crm-deed-swatch${colorId === c.id ? ' crm-deed-swatch--active' : ''}`}
            style={{ background: c.hex, color: c.ink }}
            onClick={() => onPick?.(c.id)}
            aria-label={c.label}
          >
            {c.label}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

export default function CrmDeedModals({
  modal,
  deal,
  summary,
  nextAction,
  waiting,
  colorId,
  writeEnabled,
  stageSaving,
  onClose,
  onStageChange,
  onCreateTask,
  onOpenTasks,
  onOpenCalculator,
  onSaveWaiting,
  onPickColor
}) {
  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  if (!modal || !deal) return null;

  if (modal === 'status') {
    return (
      <StatusModal
        deal={deal}
        writeEnabled={writeEnabled}
        saving={stageSaving}
        onChange={onStageChange}
        onClose={onClose}
      />
    );
  }
  if (modal === 'next') {
    return (
      <NextStepModal
        deal={deal}
        nextAction={nextAction}
        writeEnabled={writeEnabled}
        onClose={onClose}
        onCreateTask={onCreateTask}
        onOpenTasks={onOpenTasks}
      />
    );
  }
  if (modal === 'metrics') {
    return (
      <MetricsModal
        deal={deal}
        summary={summary}
        onClose={onClose}
        onOpenCalculator={onOpenCalculator}
      />
    );
  }
  if (modal === 'waiting') {
    return (
      <WaitingOnModal
        deal={deal}
        waiting={waiting}
        writeEnabled={writeEnabled}
        onClose={onClose}
        onSave={onSaveWaiting}
      />
    );
  }
  if (modal === 'color') {
    return (
      <ColorModal
        deal={deal}
        colorId={colorId}
        onClose={onClose}
        onPick={onPickColor}
      />
    );
  }

  return null;
}
