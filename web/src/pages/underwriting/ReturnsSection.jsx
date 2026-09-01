import { MONEY, PCT, X } from './uwFormat';
import UwField from './UwField';

/** Pref / profit-share returns detail (ROI-Investor spirit). */
export default function ReturnsSection({ uw }) {
  const { workbook, pathOutput, activePath, canWrite, persistPath, scenario, setScenarioKey, pathId, setPathId } =
    uw;
  if (!workbook || !activePath) return null;
  const waterfall = pathOutput?.waterfall || [];
  const waterfall2 = pathOutput?.waterfall2 || [];
  const ret = pathOutput?.returns;

  return (
    <div className="uw-returns">
      <div className="uw-qu__toolbar">
        <label>
          Path
          <select className="modal-input" value={pathId || ''} onChange={(e) => setPathId(Number(e.target.value))}>
            {(workbook.paths || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
      </div>

      <section className="uw-qu__card">
        <h3>Waterfall preferences</h3>
        <div className="uw-grid">
          <UwField
            label="Preferred return %"
            value={activePath.preferredReturnPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ preferredReturnPercent: Number(v) || 0 })}
          />
          <UwField
            label="Investor equity % of check"
            value={activePath.investorEquityPercent}
            disabled={!canWrite}
            onChange={(v) => persistPath({ investorEquityPercent: Number(v) || 0 })}
          />
          <UwField
            label="Investor profit share %"
            value={activePath.investorProfitShare}
            disabled={!canWrite}
            onChange={(v) => persistPath({ investorProfitShare: Number(v) || 0 })}
          />
          <UwField
            label="Sponsor profit share %"
            value={activePath.sponsorProfitShare}
            disabled={!canWrite}
            onChange={(v) => persistPath({ sponsorProfitShare: Number(v) || 0 })}
          />
          <UwField
            label="Exit multiple #1"
            value={activePath.exitMultiple}
            disabled={!canWrite}
            onChange={(v) => persistPath({ exitMultiple: Number(v) || 4.5 })}
          />
          <UwField
            label="Exit multiple #2"
            value={activePath.exitMultiple2 ?? 5}
            disabled={!canWrite}
            onChange={(v) => persistPath({ exitMultiple2: Number(v) || 5 })}
          />
        </div>
      </section>

      <div className="uw-kpi-row">
        <div className="uw-kpi">
          <div className="uw-kpi-label">Investor IRR (#1)</div>
          <div className="uw-kpi-value">{PCT(ret?.investor?.irr)}</div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Investor MOIC (#1)</div>
          <div className="uw-kpi-value">{X(ret?.investor?.moic)}</div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Investor IRR (#2)</div>
          <div className="uw-kpi-value">{PCT(ret?.investor?.irrExit2)}</div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Sponsor IRR (#1)</div>
          <div className="uw-kpi-value">{PCT(ret?.sponsor?.irr)}</div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Sponsor MOIC (#1)</div>
          <div className="uw-kpi-value">{X(ret?.sponsor?.moic)}</div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Exit equity #1 / #2</div>
          <div className="uw-kpi-value">
            {MONEY(pathOutput?.exit?.exitEquityValue)} / {MONEY(pathOutput?.exit2?.exitEquityValue)}
          </div>
        </div>
      </div>

      <section className="uw-qu__card">
        <h3>Waterfall @ exit multiple #1</h3>
        <WaterfallTable rows={waterfall} />
      </section>
      <section className="uw-qu__card">
        <h3>Waterfall @ exit multiple #2</h3>
        <WaterfallTable rows={waterfall2} />
      </section>
    </div>
  );
}

function WaterfallTable({ rows }) {
  return (
    <div className="uw-year-table-wrap">
      <table className="uw-table uw-table--dense">
        <thead>
          <tr>
            <th>Year</th>
            <th>Pref</th>
            <th>Inv ROC</th>
            <th>Sp ROC</th>
            <th>Inv profit</th>
            <th>Sp profit</th>
            <th>Inv total</th>
            <th>Sp total</th>
            <th>Exit inv</th>
            <th>Exit sp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.year}>
              <td>{w.year}</td>
              <td>{MONEY(w.prefPaid)}</td>
              <td>{MONEY(w.investorRoc)}</td>
              <td>{MONEY(w.sponsorRoc)}</td>
              <td>{MONEY(w.investorProfit)}</td>
              <td>{MONEY(w.sponsorProfit)}</td>
              <td>{MONEY(w.investorTotal)}</td>
              <td>{MONEY(w.sponsorTotal)}</td>
              <td>{MONEY(w.exitInvestor)}</td>
              <td>{MONEY(w.exitSponsor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
