import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { feedbackAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import FeedbackThread from '../components/feedback/FeedbackThread';
import Navigation from '../components/Navigation';

export default function AdminFeedbackPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');
  const selectedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackAPI.adminList({
        category: category || undefined,
        status: status || undefined,
        severity: severity || undefined,
        q: q || undefined,
      });
      setItems(data.items || []);
    } catch (err) {
      console.error('[feedback] admin list', err);
      setError(err.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, category, status, severity]);

  if (authLoading) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="loading-screen">
        <p>Sign in required.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="app-page-shell">
      <Navigation
        user={user}
        logout={logout}
        activeTab="aggregator"
        setActiveTab={() => {}}
        showTabs={false}
        pageTitle="Feedback admin"
        pageSubtitle="Internal triage inbox"
      />

      <div className="dashboard-content feedback-admin">
        <div className="feedback-admin__filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            <option value="bug">Bug</option>
            <option value="feedback">Feedback</option>
            <option value="suggestion">Suggestion</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="needs_info">Needs info</option>
            <option value="in_progress">In progress</option>
            <option value="fixed">Fixed</option>
            <option value="wont_fix">Won&apos;t fix</option>
            <option value="closed">Closed</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Severity">
            <option value="">All severities</option>
            <option value="blocking">Blocking</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <input
            type="search"
            className="modal-input"
            placeholder="Search title or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load();
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={load}>
            Refresh
          </button>
          <Link to="/dashboard" className="header-link">
            ← Dashboard
          </Link>
        </div>

        {error ? <p className="feedback-error">{error}</p> : null}

        <div className="feedback-admin__layout">
          <div className="feedback-admin__list">
            {loading ? <p className="feedback-muted">Loading…</p> : null}
            {!loading && !items.length ? <p className="feedback-muted">No items match.</p> : null}
            <ul className="feedback-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`feedback-list__item${selectedId === item.id ? ' is-selected' : ''}`}
                    onClick={() => setSearchParams({ id: String(item.id) })}
                  >
                    <span className="feedback-list__title">
                      {item.public_id || `#${item.id}`} {item.title}
                    </span>
                    <span className="feedback-list__meta">
                      <span className="feedback-chip">{item.category}</span>
                      {item.category === 'bug' ? (
                        <span className="feedback-chip">{item.severity}</span>
                      ) : null}
                      <span className="feedback-status">{item.status_label}</span>
                      {item.me_too_count > 0 ? (
                        <span className="feedback-chip">{item.me_too_count} me too</span>
                      ) : null}
                      <span className="feedback-muted">{item.user_email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="feedback-admin__detail">
            {selectedId ? (
              <FeedbackThread
                submissionId={selectedId}
                isAdmin
                onUpdated={() => load()}
              />
            ) : (
              <p className="feedback-muted">Select a submission to view the thread.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
