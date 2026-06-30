import { useState, useEffect } from 'react';
import { ddPublicAPI } from '../utils/api';
import { formatDate } from '../utils/normalizeDeal';

export default function DdPortalPage() {
  const token = window.location.pathname.split('/dd/')[1]?.split('/')[0] || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    ddPublicAPI.getPortal(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStatus = async (itemId, status) => {
    if (data?.mode !== 'collaborative') return;
    try {
      const res = await ddPublicAPI.patchItem(token, itemId, { status });
      setData((prev) => ({ ...prev, checklist: res.checklist }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="dd-portal"><p>Loading…</p></div>;
  if (error) return <div className="dd-portal"><p>{error}</p></div>;

  const checklist = data?.checklist;
  const progress = checklist?.progress || {};

  return (
    <div className="dd-portal">
      <header className="dd-portal__header">
        <img src="/vettr-logo.png" alt="Vettr" className="dd-portal__logo" width={160} height={46} />
        <h1>{data.dealName}</h1>
        <p className="dd-portal__mode">
          {data.mode === 'collaborative' ? 'Collaborative access' : 'View only'}
          {data.label ? ` · ${data.label}` : ''}
        </p>
        <p className="dd-portal__progress">{progress.percent ?? 0}% complete</p>
      </header>

      {(checklist?.groups || []).map((group) => (
        <section key={group.id} className="dd-group">
          <h2>{group.name}</h2>
          <ul className="dd-item-list">
            {(group.items || []).map((item) => (
              <li key={item.id} className="dd-item dd-item--portal">
                <span>{item.title}</span>
                {item.requests_document ? <span className="dd-item__badge">Document</span> : null}
                {item.due_at ? <span className="dd-item__due">Due {formatDate(item.due_at)}</span> : null}
                {data.mode === 'collaborative' ? (
                  <select
                    value={item.status}
                    onChange={(e) => handleStatus(item.id, e.target.value)}
                    className="modal-input"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="waiting_on_other">Waiting</option>
                  </select>
                ) : (
                  <span className="dd-item__status-readonly">{item.status.replace(/_/g, ' ')}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
