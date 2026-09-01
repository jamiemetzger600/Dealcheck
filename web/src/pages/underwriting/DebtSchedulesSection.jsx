import { useState } from 'react';
import { MONEY, X } from './uwFormat';

/**
 * Correct monthly SBA + seller amort schedules + optional Y1 monthly DSCR.
 */
export default function DebtSchedulesSection({ uw }) {
  const { workbook, pathOutput, activePath, scenario, setScenarioKey, pathId, setPathId } = uw;
  const [showMonthlyDscr, setShowMonthlyDscr] = useState(true);

  if (!workbook) return null;

  const sbaMonthly = pathOutput?.debtSchedules?.sbaMonthly || [];
  const sellerMonthly = pathOutput?.debtSchedules?.sellerMonthly || [];
  const sbaAnnual = pathOutput?.debtSchedules?.sbaAnnual || [];
  const sellerAnnual = pathOutput?.debtSchedules?.sellerAnnual || [];
  const monthlyDscr = pathOutput?.monthlyDscr || [];

  const sbaEnd = sbaMonthly[sbaMonthly.length - 1]?.balance;
  const sellerEnd = sellerMonthly[sellerMonthly.length - 1]?.balance;
  const sellerMode = activePath?.sellerNoteMode || 'amortizing';
  const sellerShouldZero = sellerMode === 'amortizing' || sellerMode === 'standby' || sellerMode === 'balloon';

  return (
    <div className="uw-debt">
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
        <label className="uw-check">
          <input
            type="checkbox"
            checked={showMonthlyDscr}
            onChange={(e) => setShowMonthlyDscr(e.target.checked)}
          />
          Show Y1 monthly DSCR
        </label>
      </div>

      <div className="uw-kpi-row">
        <div className="uw-kpi">
          <div className="uw-kpi-label">SBA schedule</div>
          <div className="uw-kpi-value">
            {sbaMonthly.length} mo · end bal {MONEY(sbaEnd)}
            {sbaEnd != null && Math.abs(sbaEnd) < 1 ? ' ✓' : ''}
          </div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Seller ({sellerMode})</div>
          <div className="uw-kpi-value">
            {sellerMonthly.length} mo · end bal {MONEY(sellerEnd)}
            {sellerShouldZero && sellerEnd != null && Math.abs(sellerEnd) < 1 ? ' ✓' : ''}
          </div>
        </div>
        <div className="uw-kpi">
          <div className="uw-kpi-label">Y1 DSCR (annual)</div>
          <div className="uw-kpi-value">{X(pathOutput?.returns?.year1Dscr)}</div>
        </div>
      </div>

      <section className="uw-qu__card">
        <h3>Annual rollup</h3>
        <div className="uw-year-table-wrap">
          <table className="uw-table uw-table--dense">
            <thead>
              <tr>
                <th>Year</th>
                <th>SBA Pmt</th>
                <th>SBA Int</th>
                <th>SBA Prin</th>
                <th>SBA Bal</th>
                <th>Seller Pmt</th>
                <th>Seller Int</th>
                <th>Seller Prin</th>
                <th>Seller Bal</th>
              </tr>
            </thead>
            <tbody>
              {sbaAnnual.map((s, i) => {
                const seller = sellerAnnual[i] || {};
                return (
                  <tr key={s.year}>
                    <td>{s.year}</td>
                    <td>{MONEY(s.payment)}</td>
                    <td>{MONEY(s.interest)}</td>
                    <td>{MONEY(s.principal)}</td>
                    <td>{MONEY(s.balanceEnd)}</td>
                    <td>{MONEY(seller.payment)}</td>
                    <td>{MONEY(seller.interest)}</td>
                    <td>{MONEY(seller.principal)}</td>
                    <td>{MONEY(seller.balanceEnd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showMonthlyDscr ? (
        <section className="uw-qu__card">
          <h3>Y1 monthly DSCR (seasonality)</h3>
          <p className="uw-muted">
            Equal monthly weights by default. Import B-SOIL seasonality or set `seasonalityWeights` on shared inputs
            for FY monthly stress.
          </p>
          <div className="uw-year-table-wrap">
            <table className="uw-table uw-table--dense">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>EBITDA</th>
                  <th>SBA</th>
                  <th>Seller</th>
                  <th>Debt svc</th>
                  <th>DSCR</th>
                </tr>
              </thead>
              <tbody>
                {monthlyDscr.map((m) => (
                  <tr key={m.month} className={m.dscr != null && m.dscr < 1.25 ? 'uw-row--warn' : ''}>
                    <td>{m.month}</td>
                    <td>{MONEY(m.ebitda)}</td>
                    <td>{MONEY(m.sbaPayment)}</td>
                    <td>{MONEY(m.sellerPayment)}</td>
                    <td>{MONEY(m.totalDebtService)}</td>
                    <td>{X(m.dscr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="uw-qu__card">
        <h3>Monthly SBA schedule (first 24 / last 6)</h3>
        <MonthlyPreview rows={sbaMonthly} />
      </section>

      <section className="uw-qu__card">
        <h3>Monthly seller schedule (first 24 / last 6)</h3>
        <MonthlyPreview rows={sellerMonthly} />
      </section>
    </div>
  );
}

function MonthlyPreview({ rows }) {
  if (!rows.length) return <p className="uw-muted">No schedule (zero principal).</p>;
  const head = rows.slice(0, 24);
  const tail = rows.length > 30 ? rows.slice(-6) : [];
  const show = tail.length ? [...head, { month: '…', _gap: true }, ...tail] : head;
  return (
    <div className="uw-year-table-wrap">
      <table className="uw-table uw-table--dense">
        <thead>
          <tr>
            <th>Month</th>
            <th>Payment</th>
            <th>Interest</th>
            <th>Principal</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {show.map((r, i) =>
            r._gap ? (
              <tr key={`gap-${i}`}>
                <td colSpan={5}>…</td>
              </tr>
            ) : (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{MONEY(r.payment)}</td>
                <td>{MONEY(r.interest)}</td>
                <td>{MONEY(r.principal)}</td>
                <td>{MONEY(r.balance)}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
