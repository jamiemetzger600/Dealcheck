import { useState } from 'react';
import { crmAPI } from '../../utils/api';

/**
 * Todoist-style quick add: "Call broker Friday on Acme P1"
 */
export default function CrmQuickAdd({ deals = [], defaultDealId = null, onCreated }) {
  const [text, setText] = useState('');
  const [dealId, setDealId] = useState(defaultDealId ? String(defaultDealId) : '');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setHint('');
    try {
      const payload = {
        text: text.trim(),
        ...(dealId ? { savedDealId: Number(dealId) || dealId } : {})
      };
      const data = await crmAPI.quickAddTask(payload);
      console.log('[CrmQuickAdd] created', data.task?.id, data.parsed);
      setText('');
      setHint(data.parsed?.dueAt ? `Due ${new Date(data.parsed.dueAt).toLocaleDateString()}` : 'Task created');
      onCreated?.(data.task);
    } catch (err) {
      console.error('[CrmQuickAdd] failed', err);
      setHint(err.message || 'Failed to create task');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="crm-quick-add" onSubmit={handleSubmit}>
      <input
        className="crm-quick-add__input"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Quick add: “Call broker Friday on Acme P1”'
        maxLength={300}
        disabled={busy}
        aria-label="Quick add task"
      />
      {!defaultDealId ? (
        <select
          className="crm-quick-add__deal"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          aria-label="Deal (optional if named in text)"
        >
          <option value="">Deal…</option>
          {(deals || []).slice(0, 80).map((d) => {
            const id = d.vettrId ?? d.id;
            return (
              <option key={id} value={id}>{d.name || `Deal ${id}`}</option>
            );
          })}
        </select>
      ) : null}
      <button type="submit" className="btn-primary btn-secondary--sm" disabled={busy || !text.trim()}>
        {busy ? '…' : 'Add'}
      </button>
      {hint ? <span className="crm-quick-add__hint crm-muted">{hint}</span> : null}
    </form>
  );
}
