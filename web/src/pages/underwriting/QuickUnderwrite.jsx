import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';
import './quickUnderwrite.css';

const MONEY = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(n));
};

const PCT = (n, digits = 1) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${(Number(n) * 100).toFixed(digits)}%`;
};

const X = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n).toFixed(2)}x`);

function unwrap(shared, key, fallback = '') {
  const v = shared?.[key];
  if (v && typeof v === 'object' && 'value' in v) return v.value ?? fallback;
  return v ?? fallback;
}

function NumInput({ label, value, onCommit, disabled, suffix, step = 'any', title }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);
  return (
    <label className="qu-field" title={title}>
      <span className="qu-field__label">{label}</span>
      <span className="qu-field__control">
        <input
          type="number"
          step={step}
          disabled={disabled}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (String(local) !== String(value ?? '')) onCommit?.(local);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </label>
  );
}

function Readout({ label, value, emphasize }) {
  return (
    <div className={`qu-readout${emphasize ? ' qu-readout--em' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GrowthSuggestions({ suggestions, canWrite, onApply }) {
  if (!suggestions?.suggested) return null;
  const s = suggestions.suggested;
  const hist = suggestions.historicalCagr;
  const sector = suggestions.sectorBenchmark;
  return (
    <div className="qu-suggest">
      <div className="qu-suggest__head">
        <strong>Vettr suggestions</strong>
        <span>{suggestions.industryLabel}</span>
      </div>
      {suggestions.dealIndustry ? (
        <p className="qu-muted">Deal industry: {suggestions.dealIndustry}</p>
      ) : (
        <p className="qu-muted">No industry on deal — using generic sector band. Set industry on the CRM deal for better hints.</p>
      )}
      <div className="qu-suggest__rates">
        <span>Cons. <b>{s.growthConservativePct}%</b></span>
        <span>Base <b>{s.growthBaselinePct}%</b></span>
        <span>Opt. <b>{s.growthOptimisticPct}%</b></span>
      </div>
      {hist?.cagrPct != null ? (
        <p className="qu-suggest__note">
          Historical revenue CAGR {hist.fromYear}–{hist.toYear}: <b>{hist.cagrPct}%/yr</b> (anchors baseline)
        </p>
      ) : (
        <p className="qu-suggest__note">
          Add 2+ years of historical revenue to compute deal CAGR.
        </p>
      )}
      {sector?.note ? <p className="qu-suggest__note">{sector.note}</p> : null}
      <p className="qu-suggest__disclaimer">
        Indicative underwriting starting points — not forecasts. Override freely.
      </p>
      <button
        type="button"
        className="btn-secondary"
        disabled={!canWrite}
        onClick={() => onApply?.(s)}
      >
        Apply suggestions
      </button>
    </div>
  );
}

/**
 * Interactive Quick Underwrite — mirrors B-SOIL layout, live recalculation.
 */
export default function QuickUnderwrite({ dealId, canWrite = true, onMeta = null }) {
  const [workbook, setWorkbook] = useState(null);
  const [pathId, setPathId] = useState(null);
  const [scenario, setScenario] = useState('base');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.getUnderwriting(dealId);
      setWorkbook(res.workbook);
      const baseline = res.workbook.paths?.find((p) => p.isBaseline) || res.workbook.paths?.[0];
      setPathId((prev) => prev || baseline?.id || null);
      setScenario(res.workbook.settings?.scenarioKey || 'base');
      console.log('[quick-uw] loaded', { dealId, modelId: res.workbook.id });
    } catch (err) {
      console.error('[quick-uw] load failed', err);
      setError(err.message || 'Failed to load workbook');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const activePath = useMemo(
    () => workbook?.paths?.find((p) => p.id === pathId) || workbook?.paths?.[0],
    [workbook, pathId]
  );

  const out = useMemo(() => {
    if (!workbook?.outputs?.pathResults || !activePath) return null;
    return workbook.outputs.pathResults[activePath.id]?.[scenario] || null;
  }, [workbook, activePath, scenario]);

  useEffect(() => {
    if (!onMeta || !workbook) return;
    const links = workbook.evidenceLinks || [];
    const verified = links.filter((l) => l.status === 'verified' || l.status === 'received').length;
    onMeta({
      id: workbook.id,
      dealName: workbook.dealName,
      paths: workbook.paths,
      updatedAt: workbook.updatedAt,
      pathOutput: out,
      evidenceCoverage: {
        total: links.length,
        verified,
        pct: links.length ? Math.round((verified / links.length) * 100) : 0
      },
      canWrite,
      reload: load
    });
  }, [onMeta, workbook, out, canWrite, load]);

  const shared = workbook?.sharedInputs || {};

  const persistShared = async (patch) => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    setFlash('');
    try {
      const res = await crmAPI.patchUnderwriting(workbook.id, {
        sharedInputs: { ...workbook.sharedInputs, ...patch }
      });
      setWorkbook(res.workbook);
      setFlash('Updated');
      console.log('[quick-uw] shared saved', Object.keys(patch));
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const persistPath = async (patch) => {
    if (!workbook || !activePath || !canWrite) return;
    setSaving(true);
    setFlash('');
    try {
      const res = await crmAPI.patchUwPath(workbook.id, activePath.id, { pathInputs: patch });
      setWorkbook(res.workbook);
      setFlash('Updated');
      console.log('[quick-uw] path saved', Object.keys(patch));
    } catch (err) {
      setError(err.message || 'Path save failed');
    } finally {
      setSaving(false);
    }
  };

  const setScenarioKey = async (key) => {
    setScenario(key);
    if (!workbook || !canWrite) return;
    const res = await crmAPI.patchUnderwriting(workbook.id, {
      settings: { ...(workbook.settings || {}), scenarioKey: key }
    });
    setWorkbook(res.workbook);
  };

  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  if (loading) return <p className="qu-muted">Loading Quick Underwrite…</p>;
  if (error && !workbook) {
    return (
      <div>
        <p className="qu-error">{error}</p>
        <button type="button" className="btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!workbook || !activePath) return null;

  const su = out?.sourcesAndUses || {};
  const dealCosts = {
    ...(shared.dealCosts || {}),
    ...(activePath.dealCosts || {}),
    ...(su.dealCosts || {})
  };
  const calc = out?.calculated || {};
  const inv = out?.returns?.investor || {};
  const sp = out?.returns?.sponsor || {};
  const dscr = out?.returns?.year1Dscr;
  const lendable = dscr != null && dscr >= 1.25;
  const marginDisplay = (() => {
    const m = activePath.ebitdaMargin ?? unwrap(shared, 'ebitdaMargin', 0.25);
    const numM = Number(m);
    if (!Number.isFinite(numM)) return '';
    return numM > 1 ? numM : numM * 100;
  })();
  const yearTotals = (out?.years || []).reduce(
    (acc, y) => ({
      revenue: acc.revenue + (y.revenue || 0),
      ebitda: acc.ebitda + (y.ebitda || 0),
      sbaDebtService: acc.sbaDebtService + (y.sbaDebtService || 0),
      sellerDebtService: acc.sellerDebtService + (y.sellerDebtService || 0),
      fcf: acc.fcf + (y.fcf || 0)
    }),
    { revenue: 0, ebitda: 0, sbaDebtService: 0, sellerDebtService: 0, fcf: 0 }
  );
  let invCum = 0;
  const waterfallRows = (out?.waterfall || []).map((w, i) => {
    invCum += w.investorTotal || 0;
    return {
      ...w,
      fcfAvail: w.fcfAvail ?? out.years?.[i]?.cashToEquity,
      ownerCfProfit: w.ownerCfProfit ?? w.sponsorTotal,
      sde: (out.years?.[i]?.fcf || 0) + (out.years?.[i]?.ownerSalary || 0),
      invCumulative: invCum
    };
  });

  const persistDealCost = async (key, value) => {
    const next = {
      qoe: Number(dealCosts.qoe) || 0,
      legal: Number(dealCosts.legal) || 0,
      dd: Number(dealCosts.dd) || 0,
      closing: Number(dealCosts.closing) || 0,
      [key]: n(value)
    };
    await persistPath({
      dealCosts: next,
      closingCosts: next.qoe + next.legal + next.dd + next.closing
    });
  };

  return (
    <div className="qu">
      <div className="qu-toolbar">
        <div className="qu-toolbar__left">
          <h2 className="qu-title">{workbook.dealName || 'Quick Underwrite'}</h2>
          <p className="qu-muted">
            Live model · change any input and tab away — projections, debt, and returns recalculate
            {saving ? ' · Saving…' : flash ? ` · ${flash}` : ''}
          </p>
        </div>
        <div className="qu-toolbar__right">
          <label>
            Path
            <select
              value={activePath.id}
              onChange={(e) => setPathId(Number(e.target.value))}
            >
              {(workbook.paths || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isBaseline ? ' ★' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scenario
            <select value={scenario} onChange={(e) => setScenarioKey(e.target.value)}>
              <option value="base">Baseline</option>
              <option value="optimistic">Optimistic</option>
              <option value="downturn">Downside</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={!canWrite}
            onClick={async () => {
              const res = await crmAPI.createUwPath(workbook.id, {
                duplicateFromId: activePath.id,
                name: `${activePath.name} copy`
              });
              setWorkbook(res.workbook);
              const newest = res.workbook.paths?.[res.workbook.paths.length - 1];
              if (newest) setPathId(newest.id);
            }}
          >
            Duplicate structure
          </button>
        </div>
      </div>

      {error ? <p className="qu-error">{error}</p> : null}

      <div className={`qu-verdict${lendable ? ' qu-verdict--ok' : dscr != null ? ' qu-verdict--warn' : ''}`}>
        {dscr == null
          ? 'Enter price, stack, and earnings to see DSCR'
          : lendable
            ? `Y1 DSCR ${X(dscr)} — at/above 1.25x lendable threshold`
            : `Y1 DSCR ${X(dscr)} — below 1.25x; adjust price, structure, or earnings`}
      </div>

      {/* SOIL-style 3-column header */}
      <div className="qu-grid3">
        <section className="qu-card">
          <h3>Assumptions</h3>
          <NumInput
            label="Purchase price"
            value={activePath.purchasePrice ?? unwrap(shared, 'purchasePrice')}
            disabled={!canWrite}
            onCommit={(v) => persistPath({ purchasePrice: n(v) })}
          />
          <NumInput
            label="Sponsor equity %"
            value={activePath.equityPercent}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ equityPercent: n(v) })}
            title="Total equity check as % of purchase (sponsor + investor share of this check below)"
          />
          <NumInput
            label="Investor share of equity %"
            value={activePath.investorEquityPercent}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ investorEquityPercent: n(v) })}
          />
          <NumInput
            label="SBA %"
            value={activePath.sbaPercent}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ sbaPercent: n(v) })}
          />
          <NumInput
            label="Seller note %"
            value={activePath.sellerPercent}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ sellerPercent: n(v) })}
          />
          <Readout label="SBA loan amount" value={MONEY(su.sbaAmount)} />
          <NumInput
            label="SBA interest rate"
            value={activePath.sbaRate ?? unwrap(shared, 'sbaRate', 8.5)}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ sbaRate: n(v) })}
          />
          <NumInput
            label="SBA term"
            value={activePath.sbaTermYears ?? unwrap(shared, 'sbaTermYears', 10)}
            disabled={!canWrite}
            suffix="yrs"
            onCommit={(v) => persistPath({ sbaTermYears: n(v) })}
          />
          <NumInput
            label="Seller note rate"
            value={activePath.sellerRate}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ sellerRate: n(v) })}
          />
          <NumInput
            label="Seller note term"
            value={activePath.sellerTermYears}
            disabled={!canWrite}
            suffix="yrs"
            onCommit={(v) => persistPath({ sellerTermYears: n(v) })}
          />
          <label className="qu-field">
            <span className="qu-field__label">Seller note mode</span>
            <select
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
          {(activePath.sellerNoteMode === 'standby') && (
            <NumInput
              label="Standby years"
              value={activePath.standbyYears}
              disabled={!canWrite}
              onCommit={(v) => persistPath({ standbyYears: n(v) })}
            />
          )}
          {(activePath.sellerNoteMode === 'balloon') && (
            <NumInput
              label="Balloon year"
              value={activePath.balloonYear}
              disabled={!canWrite}
              onCommit={(v) => persistPath({ balloonYear: n(v) })}
            />
          )}
          <NumInput
            label="Starting revenue (TTM)"
            value={activePath.startingRevenue ?? unwrap(shared, 'startingRevenue')}
            disabled={!canWrite}
            onCommit={(v) => {
              persistPath({ startingRevenue: n(v) });
              persistShared({ startingRevenue: n(v) });
            }}
          />
          <div className="qu-growth-block">
            <h4 className="qu-growth-block__title">Growth assumptions (% / yr)</h4>
            <p className="qu-muted qu-growth-block__hint">
              Baseline / Conservative / Optimistic feed the scenario toggle. Enter your own rates anytime.
            </p>
            <NumInput
              label="Baseline growth"
              value={activePath.growthBaselinePct ?? unwrap(shared, 'growthBaselinePct', unwrap(shared, 'revenueGrowthRate', 4))}
              disabled={!canWrite}
              suffix="%/yr"
              title="Used when scenario = Baseline"
              onCommit={(v) => {
                const pct = n(v);
                persistPath({ growthBaselinePct: pct, revenueGrowthRate: pct });
                persistShared({ growthBaselinePct: pct, revenueGrowthRate: pct });
              }}
            />
            <NumInput
              label="Conservative growth"
              value={activePath.growthConservativePct ?? unwrap(shared, 'growthConservativePct', 0)}
              disabled={!canWrite}
              suffix="%/yr"
              title="Used when scenario = Downside / Conservative"
              onCommit={(v) => {
                const pct = n(v);
                persistPath({ growthConservativePct: pct });
                persistShared({ growthConservativePct: pct });
              }}
            />
            <NumInput
              label="Optimistic growth"
              value={activePath.growthOptimisticPct ?? unwrap(shared, 'growthOptimisticPct', 7.5)}
              disabled={!canWrite}
              suffix="%/yr"
              title="Used when scenario = Optimistic"
              onCommit={(v) => {
                const pct = n(v);
                persistPath({ growthOptimisticPct: pct });
                persistShared({ growthOptimisticPct: pct });
              }}
            />
            {workbook.growthSuggestions ? (
              <GrowthSuggestions
                suggestions={workbook.growthSuggestions}
                canWrite={canWrite}
                onApply={async (suggested) => {
                  if (!workbook || !canWrite) return;
                  setSaving(true);
                  try {
                    const sharedInputs = {
                      ...workbook.sharedInputs,
                      growthBaselinePct: suggested.growthBaselinePct,
                      growthConservativePct: suggested.growthConservativePct,
                      growthOptimisticPct: suggested.growthOptimisticPct,
                      revenueGrowthRate: suggested.growthBaselinePct
                    };
                    await crmAPI.patchUnderwriting(workbook.id, { sharedInputs });
                    const res = await crmAPI.patchUwPath(workbook.id, activePath.id, {
                      pathInputs: {
                        growthBaselinePct: suggested.growthBaselinePct,
                        growthConservativePct: suggested.growthConservativePct,
                        growthOptimisticPct: suggested.growthOptimisticPct,
                        revenueGrowthRate: suggested.growthBaselinePct
                      }
                    });
                    setWorkbook(res.workbook);
                    setFlash('Applied growth suggestions');
                    console.log('[quick-uw] applied growth suggestions', suggested);
                  } catch (err) {
                    setError(err.message || 'Failed to apply suggestions');
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            ) : null}
          </div>
          <NumInput
            label="EBITDA margin"
            value={marginDisplay}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => {
              const pct = n(v);
              const decimal = pct > 1 ? pct / 100 : pct;
              persistPath({ ebitdaMargin: decimal });
              persistShared({ ebitdaMargin: decimal });
            }}
          />
          <NumInput
            label="Owner salary (annual)"
            value={activePath.ownerSalary ?? unwrap(shared, 'ownerSalary')}
            disabled={!canWrite}
            onCommit={(v) => {
              persistPath({ ownerSalary: n(v) });
              persistShared({ ownerSalary: n(v) });
            }}
          />
          <NumInput
            label="Starting EBITDA / SDE"
            value={activePath.startingEbitda ?? unwrap(shared, 'startingEbitda')}
            disabled={!canWrite}
            onCommit={(v) => {
              persistPath({ startingEbitda: n(v) });
              persistShared({ startingEbitda: n(v) });
            }}
          />
          <NumInput
            label="Preferred return"
            value={activePath.preferredReturnPercent}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ preferredReturnPercent: n(v) })}
          />
          <NumInput
            label="Investor profit share"
            value={activePath.investorProfitShare}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ investorProfitShare: n(v) })}
          />
          <NumInput
            label="Owner / sponsor profit share"
            value={activePath.sponsorProfitShare}
            disabled={!canWrite}
            suffix="%"
            onCommit={(v) => persistPath({ sponsorProfitShare: n(v) })}
          />
          <NumInput
            label="Exit multiple #1"
            value={activePath.exitMultiple ?? unwrap(shared, 'exitMultiple', 4.5)}
            disabled={!canWrite}
            suffix="x"
            onCommit={(v) => persistPath({ exitMultiple: n(v) })}
          />
          <NumInput
            label="Exit multiple #2"
            value={activePath.exitMultiple2 ?? unwrap(shared, 'exitMultiple2', 5)}
            disabled={!canWrite}
            suffix="x"
            onCommit={(v) => persistPath({ exitMultiple2: n(v) })}
          />
          <NumInput
            label="Hold years"
            value={activePath.holdYears ?? unwrap(shared, 'holdYears', 10)}
            disabled={!canWrite}
            onCommit={(v) => persistPath({ holdYears: n(v) })}
          />
        </section>

        <section className="qu-card">
          <h3>Deal costs</h3>
          <NumInput
            label="QoE"
            value={dealCosts.qoe}
            disabled={!canWrite}
            onCommit={(v) => persistDealCost('qoe', v)}
          />
          <NumInput
            label="Legal"
            value={dealCosts.legal}
            disabled={!canWrite}
            onCommit={(v) => persistDealCost('legal', v)}
          />
          <NumInput
            label="Closing costs"
            value={dealCosts.closing}
            disabled={!canWrite}
            onCommit={(v) => persistDealCost('closing', v)}
          />
          <NumInput
            label="Due diligence"
            value={dealCosts.dd}
            disabled={!canWrite}
            onCommit={(v) => persistDealCost('dd', v)}
          />
          <NumInput
            label="Working capital"
            value={activePath.workingCapitalInjection ?? unwrap(shared, 'workingCapitalInjection')}
            disabled={!canWrite}
            onCommit={(v) => persistPath({ workingCapitalInjection: n(v) })}
          />
          <Readout
            label="Total deal costs"
            value={MONEY(
              (Number(dealCosts.qoe) || 0)
              + (Number(dealCosts.legal) || 0)
              + (Number(dealCosts.dd) || 0)
              + (Number(dealCosts.closing) || 0)
              + (Number(su.workingCapital) || 0)
            )}
            emphasize
          />
          <div className="qu-divider" />
          <h3>Calculated</h3>
          <Readout label="SBA annual payment" value={MONEY(calc.sbaAnnualPayment)} />
          <Readout label="Seller note annual payment" value={MONEY(calc.sellerAnnualPayment)} />
          <Readout label="Total debt service (Y1)" value={MONEY(calc.totalDebtServiceY1)} />
          <Readout label="Free cash flow (Y1)" value={MONEY(calc.fcfY1)} emphasize />
          <Readout label="Seller note total paid" value={MONEY(yearTotals.sellerDebtService)} />
        </section>

        <section className="qu-card">
          <h3>Deal breakdown</h3>
          <Readout label="Cash at close to seller" value={MONEY(su.cashAtCloseToSeller)} emphasize />
          <Readout label="Seller note amount" value={MONEY(su.sellerAmount)} />
          <Readout label="Equity check" value={MONEY(su.equityAmount)} />
          <Readout label="Investor capital" value={MONEY(out?.equity?.investorCapital)} />
          <Readout label="Sponsor capital" value={MONEY(out?.equity?.sponsorCapital)} />
          <Readout
            label="Sources = Uses"
            value={su.balanced ? 'Balanced' : `Gap ${MONEY(su.fundingGap)}`}
            emphasize={!su.balanced}
          />
          <div className="qu-divider" />
          <h3>Exit @ multiple #1 ({activePath.exitMultiple ?? 4.5}x)</h3>
          <Readout label="Exit EBITDA" value={MONEY(out?.years?.[out.years.length - 1]?.ebitda)} />
          <Readout label="Exit equity value" value={MONEY(out?.exit?.exitEquityValue)} />
          <Readout label="Investor exit proceeds" value={MONEY(out?.waterfall?.[out.waterfall.length - 1]?.exitInvestor)} />
          <Readout label="Sponsor exit proceeds" value={MONEY(out?.waterfall?.[out.waterfall.length - 1]?.exitSponsor)} />
          <div className="qu-divider" />
          <h3>Investor metrics</h3>
          <Readout label="IRR (w/ exit #1)" value={PCT(inv.irr)} emphasize />
          <Readout label="MOIC (w/ exit #1)" value={X(inv.moic)} />
          <Readout label="IRR @ exit #2" value={PCT(inv.irrExit2)} />
          <Readout label="MOIC @ exit #2" value={X(inv.moicExit2)} />
          <Readout
            label="Payback"
            value={out?.returns?.paybackYears != null ? `${Number(out.returns.paybackYears).toFixed(1)} yrs` : '—'}
          />
          <div className="qu-divider" />
          <h3>Owner / sponsor metrics</h3>
          <Readout label="IRR (w/ exit #1)" value={PCT(sp.irr)} emphasize />
          <Readout label="MOIC (w/ exit #1)" value={X(sp.moic)} />
          <Readout label="IRR @ exit #2" value={PCT(sp.irrExit2)} />
          <Readout label="MOIC @ exit #2" value={X(sp.moicExit2)} />
        </section>
      </div>

      {/* 10-year projection — SOIL columns */}
      <section className="qu-card qu-card--wide">
        <h3>10-year projection</h3>
        <div className="qu-table-wrap">
          <table className="qu-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Revenue</th>
                <th>Owner salary</th>
                <th>EBITDA</th>
                <th>SBA pmt</th>
                <th>DSCR</th>
                <th>SBA int</th>
                <th>SBA prin</th>
                <th>SBA bal</th>
                <th>Seller pmt</th>
                <th>Seller int</th>
                <th>Seller prin</th>
                <th>Seller bal</th>
                <th>Total debt</th>
                <th>FCF</th>
              </tr>
            </thead>
            <tbody>
              {(out?.years || []).map((y) => (
                <tr key={y.year} className={y.dscr != null && y.dscr < 1.25 ? 'qu-row--warn' : ''}>
                  <td>{y.calendarYear || y.year}</td>
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
                  <td>{MONEY(y.totalDebtBalance)}</td>
                  <td>{MONEY(y.fcf)}</td>
                </tr>
              ))}
            </tbody>
            {(out?.years || []).length ? (
              <tfoot>
                <tr>
                  <td>TOTALS</td>
                  <td>{MONEY(yearTotals.revenue)}</td>
                  <td />
                  <td>{MONEY(yearTotals.ebitda)}</td>
                  <td>{MONEY(yearTotals.sbaDebtService)}</td>
                  <td />
                  <td colSpan={3} />
                  <td>{MONEY(yearTotals.sellerDebtService)}</td>
                  <td colSpan={3} />
                  <td />
                  <td>{MONEY(yearTotals.fcf)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {/* Investor waterfall */}
      <section className="qu-card qu-card--wide">
        <h3>Investor waterfall distribution</h3>
        <div className="qu-table-wrap">
          <table className="qu-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>FCF avail</th>
                <th>Pref return</th>
                <th>Cap return</th>
                <th>Inv profit</th>
                <th>Total to inv</th>
                <th>Owner CF</th>
                <th>SDE (CF+salary)</th>
                <th>Inv cap rem</th>
                <th>Inv cumulative</th>
              </tr>
            </thead>
            <tbody>
              {waterfallRows.map((w, i) => (
                <tr key={w.year}>
                  <td>{out.years?.[i]?.calendarYear || w.year}</td>
                  <td>{MONEY(w.fcfAvail)}</td>
                  <td>{MONEY(w.prefPaid)}</td>
                  <td>{MONEY(w.investorRoc)}</td>
                  <td>{MONEY(w.investorProfit)}</td>
                  <td>{MONEY(w.investorTotal)}</td>
                  <td>{MONEY(w.ownerCfProfit)}</td>
                  <td>{MONEY(w.sde)}</td>
                  <td>{MONEY(w.invCapRemaining)}</td>
                  <td>{MONEY(w.invCumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
