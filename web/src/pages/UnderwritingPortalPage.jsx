import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { underwritingPublicAPI } from '../utils/api';
import '../components/crm/underwriting/underwriting.css';

const MONEY = (n) =>
  n == null || Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const PCT = (n) => (n == null || Number.isNaN(n) ? '—' : `${(n * 100).toFixed(1)}%`);
const X = (n) => (n == null || Number.isNaN(n) ? '—' : `${Number(n).toFixed(2)}x`);

export default function UnderwritingPortalPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const res = pwd
        ? await underwritingPublicAPI.unlock(token, pwd)
        : await underwritingPublicAPI.get(token);
      setData(res);
      setNeedsPassword(false);
      console.log('[underwriting] public load ok', { token: String(token).slice(0, 8) });
    } catch (err) {
      if (err.message === 'Password required' || String(err.message).includes('Password')) {
        setNeedsPassword(true);
      } else {
        setError(err.message || 'Unable to load underwriting');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  if (loading) return <div className="uw-public">Loading shared underwriting…</div>;

  if (needsPassword && !data) {
    return (
      <div className="uw-public">
        <h1>Protected underwriting</h1>
        <p>Enter the share password to continue.</p>
        <input
          className="modal-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" className="btn-primary" onClick={() => load(password)}>
          Unlock
        </button>
        {error ? <p className="uw-error">{error}</p> : null}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="uw-public">
        <p className="uw-error">{error}</p>
      </div>
    );
  }

  const wb = data.workbook;
  const cmp = wb?.outputs?.comparison || [];
  const preferred = cmp.find((c) => c.isPreferred) || cmp.find((c) => c.isBaseline) || cmp[0];
  const hist = wb?.outputs?.historicals || [];

  return (
    <div className="uw-public">
      <h1>{data.dealName || 'Underwriting'}</h1>
      <p className="uw-muted">
        {data.label || 'Live shared view'} · read only
        {preferred ? ` · preferred: ${preferred.name}` : ''}
      </p>
      {preferred ? (
        <div className="uw-kpi-row" style={{ marginTop: 16 }}>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Purchase</div>
            <div className="uw-kpi-value">{MONEY(preferred.purchasePrice)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Y1 DSCR</div>
            <div className="uw-kpi-value">{X(preferred.year1Dscr)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Sponsor IRR</div>
            <div className="uw-kpi-value">{PCT(preferred.sponsorIrr)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Exit equity</div>
            <div className="uw-kpi-value">{MONEY(preferred.exitEquityValue)}</div>
          </div>
        </div>
      ) : null}

      {hist.length ? (
        <>
          <h2 style={{ marginTop: 24 }}>Historicals</h2>
          <div className="uw-year-table-wrap">
            <table className="uw-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Revenue</th>
                  <th>Adj. EBITDA</th>
                  <th>SDE</th>
                </tr>
              </thead>
              <tbody>
                {hist.map((h) => (
                  <tr key={h.year}>
                    <td>{h.year}</td>
                    <td>{MONEY(h.revenue)}</td>
                    <td>{MONEY(h.adjustedEbitda)}</td>
                    <td>{MONEY(h.sde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h2 style={{ marginTop: 24 }}>Structure comparison</h2>
      <div className="uw-year-table-wrap">
        <table className="uw-table">
          <thead>
            <tr>
              <th>Metric</th>
              {cmp.map((c) => (
                <th key={c.id}>
                  {c.name}
                  {c.isPreferred ? ' ✓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Equity check</td>
              {cmp.map((c) => (
                <td key={c.id}>{MONEY(c.equityCheck)}</td>
              ))}
            </tr>
            <tr>
              <td>Cash at close</td>
              {cmp.map((c) => (
                <td key={c.id}>{MONEY(c.cashAtClose)}</td>
              ))}
            </tr>
            <tr>
              <td>Seller mode</td>
              {cmp.map((c) => (
                <td key={c.id}>{c.sellerNoteMode}</td>
              ))}
            </tr>
            <tr>
              <td>Y1 DSCR</td>
              {cmp.map((c) => (
                <td key={c.id}>{X(c.year1Dscr)}</td>
              ))}
            </tr>
            <tr>
              <td>Y1 CoC</td>
              {cmp.map((c) => (
                <td key={c.id}>{PCT(c.year1Coc)}</td>
              ))}
            </tr>
            <tr>
              <td>Sponsor IRR</td>
              {cmp.map((c) => (
                <td key={c.id}>{PCT(c.sponsorIrr)}</td>
              ))}
            </tr>
            <tr>
              <td>Sponsor MOIC</td>
              {cmp.map((c) => (
                <td key={c.id}>{X(c.sponsorMoic)}</td>
              ))}
            </tr>
            <tr>
              <td>Exit equity</td>
              {cmp.map((c) => (
                <td key={c.id}>{MONEY(c.exitEquityValue)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
