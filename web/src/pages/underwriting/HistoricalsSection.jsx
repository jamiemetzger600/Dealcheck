import { useMemo, useState } from 'react';
import { MONEY, val } from './uwFormat';

const emptyYear = (year) => ({
  year,
  revenue: { value: 0, source: 'manual', verified: false },
  cogs: { value: 0, source: 'manual', verified: false },
  opex: { value: 0, source: 'manual', verified: false },
  other: { value: 0, source: 'manual', verified: false },
  ownerSalaryAddback: { value: 0, source: 'manual', verified: false },
  taxReturnRevenue: { value: 0, source: 'manual', verified: false },
  taxReturnEbitda: { value: 0, source: 'manual', verified: false },
  addbacks: []
});

function fieldVal(f) {
  if (f && typeof f === 'object' && 'value' in f) return f.value ?? 0;
  return Number(f) || 0;
}

function setField(existing, value, source = 'manual') {
  return {
    value: Number(value) || 0,
    source: existing?.source || source,
    verified: Boolean(existing?.verified)
  };
}

/**
 * P&L YoY historicals + tax-return cross-check + DD evidence loop.
 */
export default function HistoricalsSection({ uw }) {
  const {
    workbook,
    canWrite,
    persistShared,
    requestEvidence,
    verifyEvidence,
    pathOutput
  } = uw;
  const [addbackLabel, setAddbackLabel] = useState('');
  const [addbackAmount, setAddbackAmount] = useState('');
  const [addbackYearIdx, setAddbackYearIdx] = useState(0);

  const historicals = useMemo(() => {
    const h = workbook?.sharedInputs?.historicals;
    if (Array.isArray(h) && h.length) return h;
    const y = new Date().getFullYear() - 1;
    return [emptyYear(y - 1), emptyYear(y)];
  }, [workbook]);

  const normalized = workbook?.outputs?.historicals || [];

  const updateYear = (idx, patch) => {
    const next = historicals.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    persistShared({ historicals: next });
  };

  const updateLine = (idx, key, raw) => {
    const row = historicals[idx] || emptyYear(new Date().getFullYear() - 1);
    updateYear(idx, { [key]: setField(row[key], raw) });
  };

  const addYear = () => {
    const last = historicals[historicals.length - 1];
    const year = (last?.year || new Date().getFullYear() - 1) + 1;
    persistShared({ historicals: [...historicals, emptyYear(year)] });
  };

  const addAddback = () => {
    if (!canWrite) return;
    const row = historicals[addbackYearIdx];
    if (!row) return;
    const addbacks = [
      ...(row.addbacks || []),
      { label: addbackLabel || 'Addback', amount: Number(addbackAmount) || 0, include: true }
    ];
    updateYear(addbackYearIdx, { addbacks });
    setAddbackLabel('');
    setAddbackAmount('');
  };

  const evidenceStatus = (path) =>
    (workbook?.evidenceLinks || []).find((e) => e.inputPath === path)?.status;

  if (!workbook) return null;

  return (
    <div className="uw-hist">
      <div className="uw-qu__toolbar">
        <p className="uw-muted" style={{ margin: 0 }}>
          P&L YoY with tax-return cross-check. Request DD evidence per year; mark verified when numbers match.
        </p>
        <button type="button" className="btn-secondary" disabled={!canWrite} onClick={addYear}>
          Add year
        </button>
      </div>

      <div className="uw-year-table-wrap">
        <table className="uw-table uw-table--dense">
          <thead>
            <tr>
              <th>Line</th>
              {historicals.map((h) => (
                <th key={h.year}>{h.year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Revenue (books)', 'revenue'],
              ['Tax return revenue', 'taxReturnRevenue'],
              ['COGS', 'cogs'],
              ['Opex', 'opex'],
              ['Other', 'other'],
              ['Owner salary addback', 'ownerSalaryAddback'],
              ['Tax return EBITDA', 'taxReturnEbitda']
            ].map(([label, key]) => (
              <tr key={key}>
                <td>{label}</td>
                {historicals.map((h, idx) => (
                  <td key={`${h.year}-${key}`}>
                    <input
                      className="modal-input"
                      type="number"
                      disabled={!canWrite}
                      value={fieldVal(h[key])}
                      onChange={(e) => updateLine(idx, key, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td>EBITDA (calc)</td>
              {normalized.map((n) => (
                <td key={`ebitda-${n.year}`}>{MONEY(n.ebitda)}</td>
              ))}
            </tr>
            <tr>
              <td>Addbacks total</td>
              {normalized.map((n) => (
                <td key={`ab-${n.year}`}>{MONEY(n.addbackTotal)}</td>
              ))}
            </tr>
            <tr>
              <td>Adj. EBITDA / SDE</td>
              {normalized.map((n) => (
                <td key={`adj-${n.year}`}>
                  {MONEY(n.adjustedEbitda)} / {MONEY(n.sde)}
                </td>
              ))}
            </tr>
            <tr>
              <td>Revenue vs tax</td>
              {normalized.map((n) => (
                <td key={`rv-${n.year}`}>
                  {n.revenuePass == null ? '—' : n.revenuePass ? (
                    <span className="uw-pass">Pass {MONEY(n.revenueVariance)}</span>
                  ) : (
                    <span className="uw-fail">Fail {MONEY(n.revenueVariance)}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td>EBITDA vs tax</td>
              {normalized.map((n) => (
                <td key={`ev-${n.year}`}>
                  {n.ebitdaPass == null ? '—' : n.ebitdaPass ? (
                    <span className="uw-pass">Pass {MONEY(n.ebitdaVariance)}</span>
                  ) : (
                    <span className="uw-fail">Fail {MONEY(n.ebitdaVariance)}</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td>Evidence</td>
              {historicals.map((h) => {
                const path = `historicals.${h.year}.taxReturn`;
                const status = evidenceStatus(path) || evidenceStatus('historicals.taxReturn');
                return (
                  <td key={`evd-${h.year}`}>
                    <div className="uw-hist__ev">
                      {status ? <em className={`uw-ev-badge uw-ev-badge--${status}`}>{status}</em> : (
                        <em className="uw-muted">none</em>
                      )}
                      {canWrite ? (
                        <>
                          <button
                            type="button"
                            className="uw-evidence-btn"
                            onClick={() =>
                              requestEvidence(path, `Tax return ${h.year}`)
                            }
                          >
                            Request DD
                          </button>
                          <button
                            type="button"
                            className="uw-evidence-btn"
                            onClick={() => verifyEvidence(path, 'verified', `Confirmed ${h.year}`)}
                          >
                            Verify
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <section className="uw-qu__card">
        <h3>Addbacks</h3>
        <div className="uw-qu__toolbar">
          <label>
            Year
            <select
              className="modal-input"
              value={addbackYearIdx}
              onChange={(e) => setAddbackYearIdx(Number(e.target.value))}
            >
              {historicals.map((h, i) => (
                <option key={h.year} value={i}>
                  {h.year}
                </option>
              ))}
            </select>
          </label>
          <input
            className="modal-input"
            placeholder="Label"
            value={addbackLabel}
            disabled={!canWrite}
            onChange={(e) => setAddbackLabel(e.target.value)}
          />
          <input
            className="modal-input"
            type="number"
            placeholder="Amount"
            value={addbackAmount}
            disabled={!canWrite}
            onChange={(e) => setAddbackAmount(e.target.value)}
          />
          <button type="button" className="btn-secondary" disabled={!canWrite} onClick={addAddback}>
            Add addback
          </button>
        </div>
        <ul className="uw-rev-list">
          {historicals.flatMap((h, idx) =>
            (h.addbacks || []).map((a, ai) => (
              <li key={`${h.year}-${ai}`}>
                {h.year}: {a.label} · {MONEY(a.amount)}
                {canWrite ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const addbacks = (h.addbacks || []).filter((_, i) => i !== ai);
                      updateYear(idx, { addbacks });
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="uw-qu__card">
        <h3>Feed Quick Underwrite</h3>
        <p className="uw-muted">
          Push the latest year&apos;s adj. EBITDA / revenue into starting assumptions
          {pathOutput ? ` · current TTM rev ${MONEY(val(workbook.sharedInputs, 'startingRevenue'))}` : ''}.
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={!canWrite || !normalized.length}
          onClick={() => {
            const last = normalized[normalized.length - 1];
            persistShared({
              startingRevenue: last.revenue,
              startingEbitda: last.adjustedEbitda || last.sde,
              ebitdaMargin: last.revenue > 0 ? (last.adjustedEbitda || last.sde) / last.revenue : 0.25
            });
          }}
        >
          Use latest year as TTM
        </button>
      </section>
    </div>
  );
}
