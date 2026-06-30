import { useState, useEffect, useCallback } from 'react';
import { crmAPI } from '../../../utils/api';
import { formatDate } from '../../../utils/normalizeDeal';

const DD_STATUSES = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_other', label: 'Waiting' },
  { value: 'complete', label: 'Complete' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'na', label: 'N/A' }
];

export default function DdChecklist({ dealId, onRefresh }) {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getDealDd(dealId);
      setChecklist(data.checklist);
    } catch (err) {
      setError(err.message);
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!dealId || starting) return;
    setStarting(true);
    try {
      const data = await crmAPI.startDealDd(dealId);
      setChecklist(data.checklist);
      onRefresh?.();
    } catch (err) {
      alert('Failed to start DD: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStatusChange = async (itemId, status) => {
    try {
      const data = await crmAPI.patchDdItem(dealId, itemId, { status });
      setChecklist(data.checklist);
      onRefresh?.();
    } catch (err) {
      alert('Failed to update item: ' + err.message);
    }
  };

  const handleShare = async (mode) => {
    try {
      const data = await crmAPI.createDdShareLink(dealId, {
        label: mode === 'collaborative' ? 'Collaborative' : 'View only',
        mode
      });
      const url = `${window.location.origin}/dd/${data.link.token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard');
      await load();
    } catch (err) {
      alert('Failed to create share link: ' + err.message);
    }
  };

  if (loading) return <p>Loading due diligence…</p>;
  if (error) return <p className="crm-panel--error">{error}</p>;

  if (!checklist) {
    return (
      <div className="dd-start-prompt">
        <h3>Due Diligence</h3>
        <p>Start from the business acquisition template (~35 checklist items across 9 groups).</p>
        <button type="button" className="btn-primary" disabled={starting} onClick={handleStart}>
          {starting ? 'Starting…' : 'Start DD checklist'}
        </button>
      </div>
    );
  }

  const progress = checklist.progress || {};

  return (
    <div className="dd-checklist">
      <header className="dd-checklist__header">
        <div>
          <h3>Due Diligence</h3>
          <p className="dd-checklist__progress">
            {progress.percent ?? 0}% complete
            {progress.overdueItems ? ` · ${progress.overdueItems} overdue` : ''}
          </p>
        </div>
        <div className="dd-checklist__actions">
          <button type="button" className="btn-secondary" onClick={() => handleShare('view_only')}>
            Share (view)
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleShare('collaborative')}>
            Share (collab)
          </button>
        </div>
      </header>

      {shareUrl ? (
        <p className="dd-share-url">
          Latest link: <a href={shareUrl} target="_blank" rel="noopener noreferrer">{shareUrl}</a>
        </p>
      ) : null}

      {(checklist.groups || []).map((group) => {
        const done = (group.items || []).filter((i) => i.status === 'complete' || i.status === 'na').length;
        const total = (group.items || []).length;
        return (
          <section key={group.id} className="dd-group">
            <h4 className="dd-group__title">
              {group.name} <span>({done}/{total})</span>
            </h4>
            <ul className="dd-item-list">
              {(group.items || []).map((item) => (
                <li key={item.id} className="dd-item">
                  <div className="dd-item__main">
                    <span className="dd-item__title">{item.title}</span>
                    {item.requests_document ? (
                      <span className="dd-item__badge">Doc request</span>
                    ) : null}
                    {item.due_at ? (
                      <span className="dd-item__due">Due {formatDate(item.due_at)}</span>
                    ) : null}
                  </div>
                  <select
                    className="modal-input dd-item__status"
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    aria-label={`Status for ${item.title}`}
                  >
                    {DD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
