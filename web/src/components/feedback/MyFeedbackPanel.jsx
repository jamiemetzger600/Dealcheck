import { useEffect, useState } from 'react';
import { feedbackAPI } from '../../utils/api';
import FeedbackThread from './FeedbackThread';

export default function MyFeedbackPanel({ open, onClose, initialId = null, onUnreadChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(initialId);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackAPI.mine();
      setItems(data.items || []);
      onUnreadChange?.(data.unreadCount || 0, data.isAdmin);
    } catch (err) {
      console.error('[feedback] mine', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActiveId(initialId);
    load();
  }, [open, initialId]);

  if (!open) return null;

  return (
    <div className="modal-overlay feedback-overlay" role="dialog" aria-modal="true">
      <div className="modal-card feedback-modal feedback-modal--wide">
        <div className="modal-header">
          <h2>My feedback</h2>
          <button type="button" className="column-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {activeId ? (
          <FeedbackThread
            submissionId={activeId}
            onBack={() => {
              setActiveId(null);
              load();
            }}
            onUpdated={() => onUnreadChange?.(0)}
          />
        ) : (
          <>
            {loading ? <p className="feedback-muted">Loading…</p> : null}
            {error ? <p className="feedback-error">{error}</p> : null}
            {!loading && !items.length ? (
              <p className="feedback-muted">No feedback yet. Use the Feedback button to send one.</p>
            ) : null}
            <ul className="feedback-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="feedback-list__item"
                    onClick={() => setActiveId(item.id)}
                  >
                    <span className="feedback-list__title">
                      {item.public_id ? `${item.public_id} · ` : ''}{item.title}
                    </span>
                    <span className="feedback-list__meta">
                      <span className="feedback-chip">{item.category}</span>
                      <span className={`feedback-status`}>{item.status_label}</span>
                      {item.unread_admin_replies > 0 ? (
                        <span className="feedback-unread-dot" title="New reply">
                          {item.unread_admin_replies} new
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
