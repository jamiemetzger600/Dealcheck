import { useState } from 'react';
import UwField from './UwField';
import { MONEY, PCT, X } from './uwFormat';

/**
 * Seller-note / capital-stack path workshop with comparison matrix + simple charts.
 */
export default function StructurePathsSection({ uw }) {
  const {
    workbook,
    canWrite,
    activePath,
    pathId,
    setPathId,
    scenario,
    setScenarioKey,
    duplicatePath,
    persistPath,
    patchPathMeta,
    saving
  } = uw;
  const [rename, setRename] = useState('');

  if (!workbook) return null;
  const cmp = workbook.outputs?.comparison || [];

  const maxIrr = Math.max(0.01, ...cmp.map((c) => c.sponsorIrr || 0));
  const maxDscr = Math.max(
    1,
    ...cmp.flatMap((c) => (c.dscrSeries || []).map((d) => d || 0))
  );

  return (
    <div className="uw-paths">
      <div className="uw-qu__toolbar">
        <label>
          Active path
          <select className="modal-input" value={pathId || ''} onChange={(e) => setPathId(Number(e.target.value))}>
            {(workbook.paths || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isBaseline ? ' (baseline)' : ''}
                {p.isPreferred ? ' ★ preferred' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scenario
          <select className="modal-input" value={scenario} onChange={(e) => setScenarioKey(e.target.value)}>
            <option value="base">Base</option>
            <option value="optimistic">Optimistic</option>
            <option value="downturn">Downturn</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={!canWrite || saving}
          onClick={() => duplicatePath(window.prompt('New path name', `${activePath?.name || 'Path'} variant`))}
        >
          Duplicate path
        </button>
        {activePath && canWrite ? (
          <>
            <input
              className="modal-input"
              placeholder="Rename path"
              value={rename}
              onChange={(e) => setRename(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={!rename.trim()}
              onClick={() => {
                patchPathMeta(activePath.id, { name: rename.trim() });
                setRename('');
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => patchPathMeta(activePath.id, { isBaseline: true })}
            >
              Set baseline
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => patchPathMeta(activePath.id, { isPreferred: true })}
            >
              Mark preferred for LOI / bank
            </button>
          </>
        ) : null}
      </div>

      <section className="uw-qu__card">
        <h3>Path inputs (active)</h3>
        <div className="uw-grid">
          <UwField
            label="Purchase price"
            value={activePath?.purchasePrice}
            disabled={!canWrite}
            onChange={(v) => persistPath({ purchasePrice: Number(v) || 0 })}
          />
          <UwField
            label="Equity %"
            value={activePath?.equityPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ equityPercent: Number(v) || 0 })}
          />
          <UwField
            label="SBA %"
            value={activePath?.sbaPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sbaPercent: Number(v) || 0 })}
          />
          <UwField
            label="Seller %"
            value={activePath?.sellerPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sellerPercent: Number(v) || 0 })}
          />
          <UwField
            label="SBA rate %"
            value={activePath?.sbaRate}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sbaRate: Number(v) || 0 })}
          />
          <UwField
            label="Seller rate %"
            value={activePath?.sellerRate}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sellerRate: Number(v) || 0 })}
          />
          <UwField
            label="Seller term"
            value={activePath?.sellerTermYears}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sellerTermYears: Number(v) || 5 })}
          />
          <UwField
            label="Standby years"
            value={activePath?.standbyYears}
            disabled={!canWrite}
            onChange={(v) => persistPath({ standbyYears: Number(v) || 0 })}
          />
          <UwField
            label="Balloon year"
            value={activePath?.balloonYear}
            disabled={!canWrite}
            onChange={(v) => persistPath({ balloonYear: Number(v) || 5 })}
          />
          <UwField
            label="Pref %"
            value={activePath?.preferredReturnPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ preferredReturnPercent: Number(v) || 0 })}
          />
          <UwField
            label="Hold years"
            value={activePath?.holdYears}
            disabled={!canWrite}
            onChange={(v) => persistPath({ holdYears: Number(v) || 10 })}
          />
          <UwField
            label="Exit multiple"
            value={activePath?.exitMultiple}
            disabled={!canWrite}
            onChange={(v) => persistPath({ exitMultiple: Number(v) || 4.5 })}
          />
          <label className="uw-field">
            <span>Seller note mode</span>
            <select
              className="modal-input"
              disabled={!canWrite || !activePath}
              value={activePath?.sellerNoteMode || 'amortizing'}
              onChange={(e) => persistPath({ sellerNoteMode: e.target.value })}
            >
              <option value="amortizing">Amortizing</option>
              <option value="interest_only">Interest only</option>
              <option value="standby">Standby then amort</option>
              <option value="balloon">IO + balloon</option>
            </select>
          </label>
        </div>
      </section>

      <section className="uw-qu__card">
        <h3>Comparison matrix · {scenario}</h3>
        <div className="uw-year-table-wrap">
          <table className="uw-table">
            <thead>
              <tr>
                <th>Metric</th>
                {cmp.map((c) => (
                  <th key={c.id}>
                    {c.name}
                    {c.isBaseline ? ' ★' : ''}
                    {c.isPreferred ? ' ✓' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Purchase price', (c) => MONEY(c.purchasePrice)],
                ['Equity check', (c) => MONEY(c.equityCheck)],
                ['Cash at close', (c) => MONEY(c.cashAtClose)],
                ['SBA', (c) => MONEY(c.sbaAmount)],
                ['Seller', (c) => MONEY(c.sellerAmount)],
                ['Seller mode', (c) => c.sellerNoteMode],
                ['Y1 DSCR', (c) => X(c.year1Dscr)],
                ['Y1 CoC', (c) => PCT(c.year1Coc)],
                ['Y1 FCF', (c) => MONEY(c.year1Fcf)],
                ['Investor IRR', (c) => PCT(c.investorIrr)],
                ['Investor MOIC', (c) => X(c.investorMoic)],
                ['Sponsor IRR', (c) => PCT(c.sponsorIrr)],
                ['Sponsor MOIC', (c) => X(c.sponsorMoic)],
                ['Exit equity #1', (c) => MONEY(c.exitEquityValue)],
                ['Exit equity #2', (c) => MONEY(c.exitEquityValue2)]
              ].map(([label, fn]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {cmp.map((c) => (
                    <td key={c.id}>{fn(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="uw-paths__charts">
        <section className="uw-qu__card">
          <h3>Sponsor IRR / MOIC</h3>
          <div className="uw-bars">
            {cmp.map((c) => (
              <div key={c.id} className="uw-bar-row">
                <span>{c.name}</span>
                <div className="uw-bar-track">
                  <div
                    className="uw-bar-fill"
                    style={{ width: `${Math.min(100, ((c.sponsorIrr || 0) / maxIrr) * 100)}%` }}
                    title={PCT(c.sponsorIrr)}
                  />
                </div>
                <span>
                  {PCT(c.sponsorIrr)} · {X(c.sponsorMoic)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="uw-qu__card">
          <h3>DSCR over time</h3>
          <div className="uw-dscr-chart">
            {cmp.map((c) => (
              <div key={c.id} className="uw-dscr-series">
                <div className="uw-dscr-label">{c.name}</div>
                <div className="uw-dscr-bars">
                  {(c.dscrSeries || []).map((d, i) => (
                    <div
                      key={i}
                      className={`uw-dscr-bar${d != null && d >= 1.25 ? ' uw-dscr-bar--ok' : ''}`}
                      style={{ height: `${Math.min(100, ((d || 0) / maxDscr) * 100)}%` }}
                      title={`Y${i + 1}: ${X(d)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
