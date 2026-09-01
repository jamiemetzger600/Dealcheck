import UwField from './UwField';
import { MONEY, PCT, X, val } from './uwFormat';

/**
 * SOIL Quick Underwrite parity — assumptions, deal costs, live KPIs, 10yr table, waterfall.
 */
export default function QuickUnderwriteSection({ uw }) {
  const {
    workbook,
    activePath,
    pathOutput,
    canWrite,
    persistShared,
    persistPath,
    requestEvidence,
    scenario,
    setScenarioKey,
    pathId,
    setPathId,
    saving
  } = uw;

  if (!workbook || !activePath) return null;

  const shared = workbook.sharedInputs || {};
  const su = pathOutput?.sourcesAndUses;
  const calc = pathOutput?.calculated || {};
  const years = pathOutput?.years || [];
  const waterfall = pathOutput?.waterfall || [];
  const dealCosts = {
    ...(shared.dealCosts || {}),
    ...(activePath.dealCosts || {})
  };
  const dscr = calc.dscrY1 ?? pathOutput?.returns?.year1Dscr;
  const lendable = dscr != null && dscr >= 1.25;

  const setDealCost = (key, raw) => {
    const next = { ...dealCosts, [key]: Number(raw) || 0 };
    const closingSum = (Number(next.qoe) || 0) + (Number(next.legal) || 0) + (Number(next.dd) || 0) + (Number(next.closing) || 0);
    persistPath({
      dealCosts: next,
      closingCosts: closingSum,
      workingCapitalInjection: Number(next.workingCapital ?? activePath.workingCapitalInjection) || 0
    });
  };

  const evidenceFor = (inputPath) =>
    (workbook.evidenceLinks || []).find((e) => e.inputPath === inputPath)?.status;

  return (
    <div className="uw-qu">
      <div className="uw-qu__toolbar">
        <label>
          Structure path
          <select
            className="modal-input"
            value={pathId || ''}
            onChange={(e) => setPathId(Number(e.target.value))}
          >
            {(workbook.paths || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isBaseline ? ' (baseline)' : ''}
                {p.isPreferred ? ' ★' : ''}
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
        {saving ? <span className="uw-muted">Saving…</span> : null}
      </div>

      <div className={`uw-qu__calc${lendable ? ' uw-qu__calc--ok' : dscr != null ? ' uw-qu__calc--warn' : ''}`}>
        <div>
          <div className="uw-app__kpi-label">SBA annual</div>
          <div className="uw-app__kpi-value">{MONEY(calc.sbaAnnualPayment)}</div>
        </div>
        <div>
          <div className="uw-app__kpi-label">Seller annual</div>
          <div className="uw-app__kpi-value">{MONEY(calc.sellerAnnualPayment)}</div>
        </div>
        <div>
          <div className="uw-app__kpi-label">Total debt svc</div>
          <div className="uw-app__kpi-value">{MONEY(calc.totalDebtServiceY1)}</div>
        </div>
        <div>
          <div className="uw-app__kpi-label">Y1 FCF</div>
          <div className="uw-app__kpi-value">{MONEY(calc.fcfY1)}</div>
        </div>
        <div>
          <div className="uw-app__kpi-label">Y1 DSCR</div>
          <div className="uw-app__kpi-value">
            {X(dscr)}
            {lendable ? ' · lendable' : dscr != null ? ' · below 1.25x' : ''}
          </div>
        </div>
        <div>
          <div className="uw-app__kpi-label">Cash at close</div>
          <div className="uw-app__kpi-value">{MONEY(su?.cashAtCloseToSeller)}</div>
        </div>
      </div>

      <div className="uw-qu__cols">
        <section className="uw-qu__card">
          <h3>Assumptions</h3>
          <div className="uw-grid">
            <UwField
              label="Purchase price"
              value={activePath.purchasePrice ?? val(shared, 'purchasePrice')}
              disabled={!canWrite}
              evidenceStatus={evidenceFor('purchasePrice')}
              onRequestEvidence={canWrite ? () => requestEvidence('purchasePrice', 'Purchase price support') : null}
              onChange={(v) => persistPath({ purchasePrice: Number(v) || 0 })}
            />
            <UwField
              label="Equity %"
              value={activePath.equityPercent}
              disabled={!canWrite}
              onChange={(v) => persistPath({ equityPercent: Number(v) || 0 })}
              hint={su ? `= ${MONEY(su.equityAmount)}` : ''}
            />
            <UwField
              label="SBA %"
              value={activePath.sbaPercent}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sbaPercent: Number(v) || 0 })}
              hint={su ? `= ${MONEY(su.sbaAmount)}` : ''}
            />
            <UwField
              label="Seller %"
              value={activePath.sellerPercent}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sellerPercent: Number(v) || 0 })}
              hint={su ? `= ${MONEY(su.sellerAmount)}` : ''}
            />
            <UwField
              label="SBA rate %"
              value={activePath.sbaRate}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sbaRate: Number(v) || 0 })}
            />
            <UwField
              label="SBA term (yrs)"
              value={activePath.sbaTermYears}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sbaTermYears: Number(v) || 10 })}
            />
            <UwField
              label="Seller rate %"
              value={activePath.sellerRate}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sellerRate: Number(v) || 0 })}
            />
            <UwField
              label="Seller term (yrs)"
              value={activePath.sellerTermYears}
              disabled={!canWrite}
              onChange={(v) => persistPath({ sellerTermYears: Number(v) || 5 })}
            />
            <label className="uw-field">
              <span>Seller note mode</span>
              <select
                className="modal-input"
                disabled={!canWrite}
                value={activePath.sellerNoteMode || 'amortizing'}
                onChange={(e) => persistPath({ sellerNoteMode: e.target.value })}
              >
                <option value="amortizing">Amortizing</option>
                <option value="interest_only">Interest only</option>
                <option value="standby">Standby then amort</option>
                <option value="balloon">IO + balloon</option>
              </select>
            </label>
            {activePath.sellerNoteMode === 'standby' ? (
              <UwField
                label="Standby years"
                value={activePath.standbyYears}
                disabled={!canWrite}
                onChange={(v) => persistPath({ standbyYears: Number(v) || 0 })}
              />
            ) : null}
            {activePath.sellerNoteMode === 'balloon' ? (
              <UwField
                label="Balloon year"
                value={activePath.balloonYear}
                disabled={!canWrite}
                onChange={(v) => persistPath({ balloonYear: Number(v) || 5 })}
              />
            ) : null}
            <UwField
              label="Starting revenue (TTM)"
              value={activePath.startingRevenue ?? val(shared, 'startingRevenue')}
              disabled={!canWrite}
              evidenceStatus={evidenceFor('startingRevenue') || evidenceFor('historicals.revenue')}
              onRequestEvidence={
                canWrite ? () => requestEvidence('historicals.revenue', 'Tax return / P&L — revenue') : null
              }
              onChange={(v) => {
                const n = Number(v) || 0;
                persistPath({ startingRevenue: n });
                persistShared({ startingRevenue: n });
              }}
            />
            <UwField
              label="Growth rate (Y1, decimal)"
              value={(shared.growthCurve || [0.05])[0]}
              disabled={!canWrite}
              onChange={(v) => {
                const g = Number(v) || 0;
                const curve = [...(shared.growthCurve || [0.05, 0.04, 0.03])];
                curve[0] = g;
                persistShared({ growthCurve: curve });
              }}
            />
            <UwField
              label="EBITDA margin (decimal)"
              value={activePath.ebitdaMargin ?? val(shared, 'ebitdaMargin')}
              disabled={!canWrite}
              onChange={(v) => {
                const n = Number(v) || 0;
                persistPath({ ebitdaMargin: n });
                persistShared({ ebitdaMargin: n });
              }}
            />
            <UwField
              label="Owner salary (annual)"
              value={val(shared, 'ownerSalary')}
              disabled={!canWrite}
              onChange={(v) => persistShared({ ownerSalary: Number(v) || 0 })}
            />
            <UwField
              label="EBITDA / SDE"
              value={activePath.startingEbitda ?? val(shared, 'startingEbitda')}
              disabled={!canWrite}
              evidenceStatus={evidenceFor('startingEbitda') || evidenceFor('historicals.ebitda')}
              onRequestEvidence={
                canWrite ? () => requestEvidence('historicals.ebitda', 'Tax return — EBITDA/SDE') : null
              }
              onChange={(v) => {
                const n = Number(v) || 0;
                persistPath({ startingEbitda: n });
                persistShared({ startingEbitda: n });
              }}
            />
            <UwField
              label="Pref return %"
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
            <UwField
              label="Hold years"
              value={activePath.holdYears}
              disabled={!canWrite}
              onChange={(v) => persistPath({ holdYears: Number(v) || 10 })}
            />
          </div>
        </section>

        <section className="uw-qu__card">
          <h3>Deal costs</h3>
          <div className="uw-grid">
            <UwField label="QoE" value={dealCosts.qoe || 0} disabled={!canWrite} onChange={(v) => setDealCost('qoe', v)} />
            <UwField label="Legal" value={dealCosts.legal || 0} disabled={!canWrite} onChange={(v) => setDealCost('legal', v)} />
            <UwField
              label="Closing"
              value={dealCosts.closing || 0}
              disabled={!canWrite}
              onChange={(v) => setDealCost('closing', v)}
            />
            <UwField label="DD" value={dealCosts.dd || 0} disabled={!canWrite} onChange={(v) => setDealCost('dd', v)} />
            <UwField
              label="Working capital"
              value={activePath.workingCapitalInjection ?? dealCosts.workingCapital ?? 0}
              disabled={!canWrite}
              onChange={(v) => {
                setDealCost('workingCapital', v);
                persistPath({ workingCapitalInjection: Number(v) || 0 });
              }}
            />
          </div>
          <div className="uw-qu__uses">
            <div>
              <span>Total uses</span>
              <strong>{MONEY(su?.usesTotal)}</strong>
            </div>
            <div>
              <span>Sources</span>
              <strong>
                {MONEY(su?.sourcesTotal)} {su?.balanced ? '✓' : '⚠ gap'}
              </strong>
            </div>
            <div>
              <span>Cash at close to seller</span>
              <strong>{MONEY(su?.cashAtCloseToSeller)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="uw-qu__card">
        <h3>10-year projection</h3>
        <div className="uw-year-table-wrap">
          <table className="uw-table uw-table--dense">
            <thead>
              <tr>
                <th>Year</th>
                <th>Revenue</th>
                <th>Owner Salary</th>
                <th>EBITDA</th>
                <th>SBA Pmt</th>
                <th>DSCR</th>
                <th>SBA Int</th>
                <th>SBA Prin</th>
                <th>SBA Bal</th>
                <th>Seller Pmt</th>
                <th>Seller Int</th>
                <th>Seller Prin</th>
                <th>Seller Bal</th>
                <th>FCF</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year}>
                  <td>{y.year}</td>
                  <td>{MONEY(y.revenue)}</td>
                  <td>{MONEY(y.ownerSalary)}</td>
                  <td>{MONEY(y.ebitda)}</td>
                  <td>{MONEY(y.sbaDebtService)}</td>
                  <td>{X(y.dscr)}</td>
                  <td>{MONEY(y.sbaInterest)}</td>
                  <td>{MONEY(y.sbaPrincipal)}</td>
                  <td>{MONEY(y.sbaBalance)}</td>
                  <td>{MONEY(y.sellerDebtService)}</td>
                  <td>{MONEY(y.sellerInterest)}</td>
                  <td>{MONEY(y.sellerPrincipal)}</td>
                  <td>{MONEY(y.sellerBalance)}</td>
                  <td>{MONEY(y.fcf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="uw-qu__card">
        <h3>Investor waterfall preview</h3>
        <p className="uw-muted">
          Pref → capital return → profit share · Exit @ {X(pathOutput?.exit?.exitMultiple)} → equity{' '}
          {MONEY(pathOutput?.exit?.exitEquityValue)} · Exit #2 @{X(pathOutput?.exit2?.exitMultiple)} →{' '}
          {MONEY(pathOutput?.exit2?.exitEquityValue)}
        </p>
        <div className="uw-year-table-wrap">
          <table className="uw-table uw-table--dense">
            <thead>
              <tr>
                <th>Year</th>
                <th>Pref paid</th>
                <th>Investor ROC</th>
                <th>Sponsor ROC</th>
                <th>Investor profit</th>
                <th>Sponsor profit</th>
                <th>Investor total</th>
                <th>Sponsor total</th>
                <th>Exit inv</th>
                <th>Exit sp</th>
              </tr>
            </thead>
            <tbody>
              {waterfall.map((w) => (
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
        <div className="uw-kpi-row" style={{ marginTop: 12 }}>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Investor IRR</div>
            <div className="uw-kpi-value">{PCT(pathOutput?.returns?.investor?.irr)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Investor MOIC</div>
            <div className="uw-kpi-value">{X(pathOutput?.returns?.investor?.moic)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Sponsor IRR</div>
            <div className="uw-kpi-value">{PCT(pathOutput?.returns?.sponsor?.irr)}</div>
          </div>
          <div className="uw-kpi">
            <div className="uw-kpi-label">Sponsor MOIC</div>
            <div className="uw-kpi-value">{X(pathOutput?.returns?.sponsor?.moic)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
