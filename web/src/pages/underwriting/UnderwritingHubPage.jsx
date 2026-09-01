import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { crmAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { openUnderwritingPopout, MONEY, X } from './underwritingNav';
import './underwritingApp.css';

export default function UnderwritingHubPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.listUnderwriting(100);
      setRows(res.workbooks || []);
      console.log('[underwriting] hub loaded', { count: res.workbooks?.length || 0 });
    } catch (err) {
      console.error('[underwriting] hub load failed', err);
      setError(err.message || 'Failed to load underwriting workbooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createBlank = async () => {
    const name = window.prompt('Deal name for blank underwriting', 'Off-market deal');
    if (name == null) return;
    setCreating(true);
    try {
      const res = await crmAPI.createBlankUnderwriting({ name: name.trim() || 'Off-market deal' });
      console.log('[underwriting] blank from hub', res);
      navigate(`/app/underwriting/${res.savedDealId}`);
    } catch (err) {
      console.error('[underwriting] blank create failed', err);
      setError(err.message || 'Failed to create blank underwriting');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="uw-hub">
      <header className="uw-hub__header">
        <div>
          <p className="uw-app__eyebrow">
            <Link to="/dashboard" style={{ color: 'inherit' }}>← Dashboard</Link>
            {' · '}
            Underwriting
          </p>
          <h1>Underwriting workbooks</h1>
          <p className="uw-app__meta">
            {user?.email || 'Signed in'} · One workbook per deal · Open full-screen or pop out from CRM
          </p>
        </div>
        <div className="uw-app__actions">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn-primary" onClick={createBlank} disabled={creating}>
            New blank underwriting
          </button>
          <button type="button" className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <p className="uw-error">{error}</p> : null}

      {loading ? (
        <p className="uw-muted">Loading workbooks…</p>
      ) : (
        <div className="uw-hub__table-wrap">
          <table className="uw-hub__table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Asking</th>
                <th>Y1 DSCR</th>
                <th>Paths</th>
                <th>Evidence</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.modelId}
                  onClick={() => navigate(`/app/underwriting/${row.savedDealId}`)}
                >
                  <td>
                    <strong>{row.dealName}</strong>
                    {row.industry || row.location ? (
                      <div className="uw-app__meta">
                        {[row.industry, row.location].filter(Boolean).join(' · ')}
                      </div>
                    ) : null}
                  </td>
                  <td>{MONEY(row.askingPrice)}</td>
                  <td>{X(row.year1Dscr)}</td>
                  <td>{row.pathCount}</td>
                  <td>
                    {row.evidenceTotal
                      ? `${row.evidenceOk}/${row.evidenceTotal} (${row.evidencePct}%)`
                      : '—'}
                  </td>
                  <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'}</td>
                  <td>
                    <div className="uw-hub__row-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate(`/app/underwriting/${row.savedDealId}`)}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          if (!openUnderwritingPopout(row.savedDealId)) {
                            navigate(`/app/underwriting/${row.savedDealId}`);
                          }
                        }}
                      >
                        Pop out
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? (
            <div className="uw-hub__empty">
              <p>No underwriting workbooks yet.</p>
              <p>Create a blank one, or open Underwriting from any CRM deal.</p>
              <button type="button" className="btn-primary" onClick={createBlank} disabled={creating}>
                New blank underwriting
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
