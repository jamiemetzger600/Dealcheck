import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeDealScenario,
  buildFinancingCoefficients,
  calculateTargetOfferAnalytical,
  parseMoney,
  SELLER_NOTE_TERM_YEARS
} from '../utils/dealCalculatorMath';

const DEFAULT_SBA_RATE = '9.25';
const CALC_STORAGE_KEY_PREFIX = 'vettr_calc_';
const PER_DEAL_PERSIST_DEBOUNCE_MS = 400;

const DEFAULT_UI = {
  financingOpen: true,
  sbaOpen: true,
  equityOpen: false,
  sellerOpen: true,
  maxOpen: false,
  roiOpen: true,
  targetOfferOpen: true,
  actualOpen: false
};

function getCalcStorageKey(dealId) {
  return `${CALC_STORAGE_KEY_PREFIX}${dealId}`;
}

function loadPerDealCalcState(dealId) {
  if (!dealId) return null;
  try {
    const raw = localStorage.getItem(getCalcStorageKey(dealId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.scenarios) || data.scenarios.length < 1) return null;
    return data;
  } catch {
    return null;
  }
}

function savePerDealCalcState(dealId, state) {
  if (!dealId) return;
  try {
    localStorage.setItem(getCalcStorageKey(dealId), JSON.stringify(state));
  } catch (e) {
    console.warn('DealCalculator: failed to persist per-deal state', e);
  }
}

export default function DealCalculator({
  deal,
  calculatorDefaults = {},
  onSaveCalculatorDefaults = null,
  className = ''
}) {
  const [activeScenario, setActiveScenario] = useState(0);
  const [scenarios, setScenarios] = useState([]);
  const [targetCOC, setTargetCOC] = useState('25');
  const [uiOpen, setUiOpen] = useState(() => ({ ...DEFAULT_UI }));
  const [targetOfferResult, setTargetOfferResult] = useState(null);
  const [dismissOpportunity, setDismissOpportunity] = useState(false);
  const persistTimerRef = useRef(null);
  const perDealPersistTimerRef = useRef(null);

  const qualityPrefs = useMemo(
    () => ({
      targetCOC: parseFloat(calculatorDefaults.targetCOC) || 25,
      targetPayback: parseFloat(calculatorDefaults.targetPayback) || 4
    }),
    [calculatorDefaults.targetCOC, calculatorDefaults.targetPayback]
  );

  useEffect(() => {
    if (!deal) return;
    setTargetOfferResult(null);
    setDismissOpportunity(false);
    const defaults = createDefaultScenarios(deal, calculatorDefaults);
    const stored = loadPerDealCalcState(deal.id);
    if (stored && Array.isArray(stored.scenarios) && stored.scenarios.length === defaults.length) {
      const merged = stored.scenarios.map((s, i) => ({ ...defaults[i], ...s }));
      setScenarios(merged);
      setActiveScenario(Math.min(Number(stored.activeScenario) || 0, merged.length - 1));
      setTargetCOC(typeof stored.targetCOC === 'string' ? stored.targetCOC : '25');
      setUiOpen({ ...DEFAULT_UI, ...(stored.ui && typeof stored.ui === 'object' ? stored.ui : {}) });
      setDismissOpportunity(Boolean(stored.dismissOpportunity));
    } else {
      setActiveScenario(0);
      setScenarios(defaults);
      setTargetCOC('25');
      setUiOpen({ ...DEFAULT_UI });
      setDismissOpportunity(false);
    }
  }, [deal?.id]);

  const currentScenario = scenarios[activeScenario] || {};
  const analysis = useMemo(
    () => analyzeDealScenario(currentScenario, qualityPrefs),
    [currentScenario, qualityPrefs]
  );

  useEffect(() => {
    setTargetOfferResult(null);
  }, [activeScenario]);

  useEffect(() => {
    if (!deal?.id || scenarios.length === 0) return;
    if (perDealPersistTimerRef.current) clearTimeout(perDealPersistTimerRef.current);
    perDealPersistTimerRef.current = setTimeout(() => {
      savePerDealCalcState(deal.id, {
        scenarios,
        activeScenario,
        targetCOC,
        ui: uiOpen,
        dismissOpportunity
      });
    }, PER_DEAL_PERSIST_DEBOUNCE_MS);
    return () => {
      if (perDealPersistTimerRef.current) clearTimeout(perDealPersistTimerRef.current);
    };
  }, [deal?.id, scenarios, activeScenario, targetCOC, uiOpen, dismissOpportunity]);

  const updateScenario = useCallback(
    (field, value) => {
      const PERSISTED_CALC_FIELDS = [
        'sbaRate',
        'dscr',
        'sbaPercent',
        'sbaTerm',
        'equityPercent',
        'salary',
        'sellerRate',
        'sellerStandby',
        'sellerPaymentType'
      ];
      setScenarios((current) => {
        const next = current.map((scenario, index) =>
          index === activeScenario ? { ...scenario, [field]: value } : scenario
        );
        if (onSaveCalculatorDefaults && PERSISTED_CALC_FIELDS.includes(field)) {
          if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
          persistTimerRef.current = setTimeout(() => {
            const updated = next[activeScenario] || {};
            onSaveCalculatorDefaults({
              ...calculatorDefaults,
              sbaRate: updated.sbaRate ?? calculatorDefaults.sbaRate,
              dscr: updated.dscr ?? calculatorDefaults.dscr,
              sbaPercent: updated.sbaPercent ?? calculatorDefaults.sbaPercent,
              sbaTerm: updated.sbaTerm ?? calculatorDefaults.sbaTerm,
              equityPercent: updated.equityPercent ?? calculatorDefaults.equityPercent,
              salary: updated.salary ?? calculatorDefaults.salary,
              sellerRate: updated.sellerRate ?? calculatorDefaults.sellerRate,
              sellerStandby: updated.sellerStandby ?? calculatorDefaults.sellerStandby,
              sellerPaymentType: updated.sellerPaymentType ?? calculatorDefaults.sellerPaymentType
            });
          }, 600);
        }
        return next;
      });
    },
    [activeScenario, calculatorDefaults, onSaveCalculatorDefaults]
  );

  const toggleUi = (key) => {
    setUiOpen((u) => ({ ...u, [key]: !u[key] }));
  };

  const adjustDscr = (delta) => {
    const cur = parseFloat(currentScenario.dscr) || 1.25;
    const next = Math.max(1, Math.round((cur + delta) * 100) / 100);
    updateScenario('dscr', String(next));
  };

  const handleCalculateTargetOffer = () => {
    const ebitda = parseMoney(currentScenario.ebitda);
    const fin = buildFinancingCoefficients(currentScenario);
    const targetDSCR = parseFloat(currentScenario.dscr) || 1.25;
    const targetCOCNum = parseFloat(targetCOC) || 25;
    const result = calculateTargetOfferAnalytical({
      ebitda,
      askingPrice: parseMoney(currentScenario.askingPrice),
      targetSalary: parseMoney(currentScenario.salary),
      targetDSCR,
      targetCOC: targetCOCNum,
      equityPercent: fin.equityPercent,
      totalDSPer1: fin.totalDSPer1,
      sbaPercent: fin.sbaPercent,
      sellerPercent: fin.sellerPercent,
      sellerEnabled: fin.sellerEnabled,
      sellerPaymentType: fin.sellerPaymentType,
      sellerStandby: fin.sellerStandby,
      sellerRate: fin.sellerRate
    });
    setTargetOfferResult(result);
  };

  const handleUseTargetOffer = () => {
    if (!targetOfferResult || targetOfferResult.error) return;
    const price = Math.round(targetOfferResult.finalPrice);
    setScenarios((current) =>
      current.map((scenario, index) =>
        index === activeScenario
          ? {
              ...scenario,
              askingPrice: String(price),
              usePurchaseOverride: false,
              purchasePrice: ''
            }
          : scenario
      )
    );
    setTargetOfferResult(null);
  };

  const handleApplyPurchaseOverride = () => {
    if (!targetOfferResult || targetOfferResult.error) return;
    const price = Math.round(targetOfferResult.finalPrice);
    setScenarios((current) =>
      current.map((scenario, index) =>
        index === activeScenario
          ? { ...scenario, usePurchaseOverride: true, purchasePrice: String(price) }
          : scenario
      )
    );
    setTargetOfferResult(null);
  };

  const resetScenarioFromListing = () => {
    if (!deal) return;
    setScenarios((current) =>
      current.map((scenario, index) =>
        index === activeScenario
          ? {
              ...scenario,
              ebitda: stringifyNumber(deal.ebitda),
              askingPrice: stringifyNumber(deal.askingPrice),
              usePurchaseOverride: false,
              purchasePrice: ''
            }
          : scenario
      )
    );
    setTargetOfferResult(null);
  };

  if (!deal) return null;

  const { qualityPresentation } = analysis;
  const finCoeff = analysis.fin;
  const offerDisplay = currentScenario.usePurchaseOverride
    ? formatNumberWithCommas(currentScenario.purchasePrice)
    : formatNumberWithCommas(currentScenario.askingPrice);

  return (
    <div className={`deal-calculator-body deal-calculator-extension-style ${className}`.trim()}>
      <div
        className="calc-quality-banner"
        style={{ borderBottomColor: qualityPresentation.borderColor }}
      >
        <div className="calc-quality-left">
          <span className="calc-quality-badge" aria-hidden>
            {qualityPresentation.badge}
          </span>
          <div>
            <div className="calc-quality-kicker">Deal Quality</div>
            <div className="calc-quality-text" style={{ color: qualityPresentation.scoreColor }}>
              {qualityPresentation.text}
            </div>
          </div>
        </div>
        <div className="calc-quality-score" style={{ color: qualityPresentation.scoreColor }}>
          {analysis.qualityScore}
        </div>
      </div>

      <div className="calc-scenario-tabs">
        {scenarios.map((_, index) => (
          <button
            key={`scenario-${index + 1}`}
            type="button"
            className={`calc-scenario-tab ${activeScenario === index ? 'active' : ''}`}
            onClick={() => setActiveScenario(index)}
          >
            Scenario {index + 1}
          </button>
        ))}
      </div>

      <div className="modal-grid two-col calc-top-inputs">
        <div className="form-group">
          <label>Business EBITDA ($)</label>
          <input
            value={formatNumberWithCommas(currentScenario.ebitda)}
            onChange={(e) => updateScenario('ebitda', stripNumberInput(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Asking Price ($)</label>
          <input
            value={formatNumberWithCommas(currentScenario.askingPrice)}
            onChange={(e) => updateScenario('askingPrice', stripNumberInput(e.target.value))}
          />
        </div>
      </div>

      <CalcAccordion
        open={uiOpen.financingOpen}
        onToggle={() => toggleUi('financingOpen')}
        title="Financing Inputs"
      >
        {!analysis.pctOk && (
          <div className="calc-percent-warning">
            Total financing must equal 100% (currently {analysis.totalPercent.toFixed(1)}%)
          </div>
        )}

        <CalcAccordion
          open={uiOpen.sbaOpen}
          onToggle={() => toggleUi('sbaOpen')}
          title="A. SBA"
          summary={`${finCoeff.sbaPercent}% • ${currentScenario.sbaRate || DEFAULT_SBA_RATE}% • ${currentScenario.sbaTerm || '10'}yr • ${currentScenario.dscr || '1.25'}x DSCR`}
          nested
        >
          <div className="modal-grid two-col">
            <div className="form-group">
              <label>Percentage (%)</label>
              <input
                type="number"
                value={currentScenario.sbaPercent}
                onChange={(e) => updateScenario('sbaPercent', e.target.value)}
                step="0.1"
                min="0"
                max="100"
              />
            </div>
            <div className="form-group">
              <label>Loan Size ($)</label>
              <input value={formatMoneyReadonly(analysis.sbaLoanSize)} readOnly className="calc-readonly" />
            </div>
          </div>
          <div className="modal-grid three-col calc-sba-row">
            <div className="form-group">
              <label>Interest Rate (%)</label>
              <input
                type="number"
                value={currentScenario.sbaRate}
                onChange={(e) => updateScenario('sbaRate', e.target.value)}
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Term (Yrs)</label>
              <input
                type="number"
                value={currentScenario.sbaTerm}
                onChange={(e) => updateScenario('sbaTerm', e.target.value)}
                min="1"
              />
            </div>
            <div className="form-group calc-dscr-field">
              <label>Target DSCR</label>
              <div className="calc-dscr-input-row">
                <input
                  type="number"
                  value={currentScenario.dscr}
                  onChange={(e) => updateScenario('dscr', e.target.value)}
                  step="0.05"
                  min="1"
                />
                <div className="calc-stepper-col">
                  <button type="button" className="calc-stepper-btn" onClick={() => adjustDscr(0.05)} title="Increase DSCR">
                    ▲
                  </button>
                  <button type="button" className="calc-stepper-btn" onClick={() => adjustDscr(-0.05)} title="Decrease DSCR">
                    ▼
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CalcAccordion>

        <CalcAccordion
          open={uiOpen.equityOpen}
          onToggle={() => toggleUi('equityOpen')}
          title="B. Buyer Equity"
          summary={`${finCoeff.equityPercent}% (${formatCompactMoney(analysis.equityAmount)}) • ${formatCompactMoney(parseMoney(currentScenario.salary))} salary`}
          summaryWarn={analysis.salaryWarning}
          nested
        >
          <div className="modal-grid two-col">
            <div className="form-group">
              <label>Percentage (%)</label>
              <input
                type="number"
                value={currentScenario.equityPercent}
                onChange={(e) => updateScenario('equityPercent', e.target.value)}
                step="0.1"
                min="0"
                max="100"
              />
            </div>
            <div className="form-group">
              <label>Equity Amount ($)</label>
              <input value={formatMoneyReadonly(analysis.equityAmount)} readOnly className="calc-readonly" />
            </div>
          </div>
          <div className="form-group">
            <label>Target Owner Salary (Annual)</label>
            <input
              value={formatNumberWithCommas(currentScenario.salary)}
              onChange={(e) => updateScenario('salary', stripNumberInput(e.target.value))}
            />
            {analysis.salaryWarning && (
              <div className="calc-inline-warning">Target salary exceeds available cash flow at this price.</div>
            )}
          </div>
        </CalcAccordion>

        <div className="calc-accordion calc-accordion--nested">
          <div
            className={`calc-accordion-header calc-accordion-header--seller ${uiOpen.sellerOpen ? '' : 'collapsed'}`.trim()}
          >
            <button type="button" className="calc-accordion-toggle" onClick={() => toggleUi('sellerOpen')} aria-expanded={uiOpen.sellerOpen}>
              <span className="calc-accordion-arrow">{uiOpen.sellerOpen ? '▼' : '▶'}</span>
            </button>
            <label className="calc-seller-enable-label">
              <input
                type="checkbox"
                checked={Boolean(currentScenario.sellerEnabled)}
                onChange={(e) => updateScenario('sellerEnabled', e.target.checked)}
              />
              <span className="calc-accordion-title">C. Seller Note (Optional)</span>
            </label>
            <span
              className={`calc-accordion-summary ${!currentScenario.sellerEnabled ? 'calc-accordion-summary--muted' : ''}`.trim()}
            >
              {currentScenario.sellerEnabled
                ? `${finCoeff.sellerPercent}% • ${currentScenario.sellerRate || '6'}% • ${currentScenario.sellerPaymentType === 'interest-only' ? 'Interest Only' : 'Amortizing'}${finCoeff.sellerStandby === 'yes' ? ' • Standby' : ''}`
                : 'Not enabled'}
            </span>
          </div>
          {uiOpen.sellerOpen && (
            <div className="calc-accordion-body">
              <div className="form-group">
                <label>Percentage (%)</label>
                <input
                  type="number"
                  value={currentScenario.sellerPercent}
                  onChange={(e) => updateScenario('sellerPercent', e.target.value)}
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={!currentScenario.sellerEnabled}
                />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  value={formatMoneyReadonly(analysis.sellerNoteAmt)}
                  readOnly
                  className="calc-readonly"
                  disabled={!currentScenario.sellerEnabled}
                />
              </div>
              <div className="modal-grid three-col">
                <div className="form-group">
                  <label>Standby</label>
                  <select
                    value={currentScenario.sellerStandby || 'no'}
                    onChange={(e) => updateScenario('sellerStandby', e.target.value)}
                    disabled={!currentScenario.sellerEnabled}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input
                    type="number"
                    value={currentScenario.sellerRate}
                    onChange={(e) => updateScenario('sellerRate', e.target.value)}
                    step="0.1"
                    disabled={!currentScenario.sellerEnabled}
                  />
                </div>
                <div className="form-group">
                  <label>Payment Type</label>
                  <select
                    value={currentScenario.sellerPaymentType || 'amortizing'}
                    onChange={(e) => updateScenario('sellerPaymentType', e.target.value)}
                    disabled={!currentScenario.sellerEnabled}
                  >
                    <option value="amortizing">Amortizing</option>
                    <option value="interest-only">Interest Only</option>
                  </select>
                </div>
              </div>
              <p className="calc-hint">Seller note amortizes over {SELLER_NOTE_TERM_YEARS} years (extension default).</p>
            </div>
          )}
        </div>
      </CalcAccordion>

      {analysis.isDealOpportunity && !dismissOpportunity && (
        <div className="calc-opportunity-banner">
          <button
            type="button"
            className="calc-opportunity-dismiss"
            onClick={() => setDismissOpportunity(true)}
            title="Dismiss"
          >
            ✕
          </button>
          <strong>Deal opportunity</strong>
          <p>Asking is {formatMoney(analysis.opportunitySavings)} below your max allowable (DSCR-based) price.</p>
        </div>
      )}

      <CalcAccordion
        open={uiOpen.maxOpen}
        onToggle={() => toggleUi('maxOpen')}
        title="Maximum Allowable (DSCR-Based)"
        kicker
      >
        <div className="calc-result-pair">
          <div className="calc-result-box">
            <div className="calc-result-box-title">Max Allowable Purchase Price</div>
            <div className="calc-result-box-value">{formatMoney(analysis.maxPurchasePrice)}</div>
          </div>
          <div className="calc-result-box calc-result-box--muted">
            <div className="calc-result-box-title">Max Annual Debt Service</div>
            <div className="calc-result-box-value">{formatMoney(analysis.maxAnnualDebtService)}</div>
          </div>
        </div>
      </CalcAccordion>

      <CalcAccordion open={uiOpen.roiOpen} onToggle={() => toggleUi('roiOpen')} title="Return on Investment (Year 1)" kicker>
        <div className="calc-result-pair">
          <div className="calc-result-box calc-result-box--coc">
            <div className="calc-result-box-title">Cash-on-Cash Return</div>
            <div className="calc-result-box-value calc-coc-value" data-tier={cocTier(analysis.coc)}>
              {analysis.coc.toFixed(1)}%
            </div>
            <div className="calc-result-box-sub">Annual return on equity</div>
          </div>
          <div className="calc-result-box calc-result-box--payback">
            <div className="calc-result-box-title">Payback Period</div>
            <div className="calc-result-box-value calc-payback-value" data-tier={paybackTier(analysis.payback)}>
              {analysis.payback > 0 && analysis.payback < 100 ? `${analysis.payback.toFixed(1)} yrs` : '—'}
            </div>
            <div className="calc-result-box-sub">Time to recover equity</div>
          </div>
        </div>
      </CalcAccordion>

      <CalcAccordion
        open={uiOpen.targetOfferOpen}
        onToggle={() => toggleUi('targetOfferOpen')}
        title="Target Offer Calculator"
        kicker
      >
        <div className="target-offer-criteria">
          <strong>Maximum offer that meets all of:</strong>
          <ul>
            <li>
              Achieves your target <strong>{targetCOC}%</strong> cash-on-cash return
            </li>
            <li>
              Salary is covered ({formatMoney(parseMoney(currentScenario.salary))})
            </li>
            <li>
              DSCR requirement ({currentScenario.dscr || '1.25'}x)
            </li>
            <li>Never exceeds the asking price</li>
          </ul>
          <p className="target-offer-criteria-note">Shows which constraint limits your offer.</p>
        </div>
        <div className="form-group">
          <label>Target COC Return (%)</label>
          <input
            type="number"
            value={targetCOC}
            onChange={(e) => setTargetCOC(e.target.value)}
            min={1}
            max={100}
            step={1}
          />
        </div>
        <button type="button" className="btn-primary target-offer-calc-btn calc-target-btn-full" onClick={handleCalculateTargetOffer}>
          Calculate Target Offer Price
        </button>
        {targetOfferResult && (
          <div className="target-offer-result calc-target-results">
            {targetOfferResult.error ? (
              <p className="target-offer-error">{targetOfferResult.error}</p>
            ) : (
              <>
                <div className="target-offer-price-box">
                  <span className="target-offer-label">Recommended Offer Price</span>
                  <span className="target-offer-value">{formatMoney(targetOfferResult.finalPrice)}</span>
                  <p className="target-offer-subtitle-ext">
                    Achieves <strong>{targetOfferResult.finalCOC.toFixed(0)}% COC</strong> with{' '}
                    <strong>{targetOfferResult.finalPayback.toFixed(1)} year</strong> payback • DSCR:{' '}
                    {targetOfferResult.actualDSCR.toFixed(2)}x
                    {targetOfferResult.bindingConstraint === 'Target COC' ? (
                      <span className="target-offer-limit target-offer-limit--success">
                        {' '}
                        · Meets your {targetCOC}% COC target
                      </span>
                    ) : (
                      <span className="target-offer-limit"> · Limited by {targetOfferResult.bindingLabel}</span>
                    )}
                  </p>
                </div>
                {targetOfferResult.askingPrice > 0 && (
                  <div
                    className={`target-offer-comparison ${targetOfferResult.diff >= 0 ? 'target-offer-comparison--warn' : 'target-offer-comparison--good'}`}
                  >
                    <div className="target-offer-comparison-row">
                      <span>vs Asking ({formatMoney(targetOfferResult.askingPrice)}):</span>
                      <span>
                        {targetOfferResult.diff >= 0
                          ? `+${formatMoney(targetOfferResult.diff)} above`
                          : `${formatMoney(-targetOfferResult.diff)} below`}{' '}
                        ({Math.abs(targetOfferResult.diffPct).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
                {renderFinancingBreakdown(targetOfferResult.breakdownContext)}
                <div className="calc-target-metrics-grid">
                  <div>
                    <div className="calc-metric-label">Free Cash Flow</div>
                    <div className="calc-metric-value calc-metric-value--good">
                      {formatMoney(targetOfferResult.freeCashFlow)}
                    </div>
                  </div>
                  <div>
                    <div className="calc-metric-label">Total Take-Home</div>
                    <div className="calc-metric-value">{formatMoney(targetOfferResult.totalTakeHome)}</div>
                  </div>
                </div>
                <div className="calc-target-actions">
                  <button type="button" className="btn-secondary use-target-btn" onClick={handleUseTargetOffer}>
                    Use as Asking Price
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleApplyPurchaseOverride}>
                    Use as Offer Price (override)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </CalcAccordion>

      <CalcAccordion open={uiOpen.actualOpen} onToggle={() => toggleUi('actualOpen')} title="Actual Deal Scenario" kicker>
        <div className="form-group">
          <label>
            Offer Price ($){' '}
            <span className="calc-label-hint">
              {currentScenario.usePurchaseOverride ? '(overrides asking for math)' : '(uses asking price)'}
            </span>
          </label>
          <div className="calc-offer-row">
            <input
              value={offerDisplay}
              onChange={(e) => {
                const v = stripNumberInput(e.target.value);
                if (currentScenario.usePurchaseOverride) updateScenario('purchasePrice', v);
                else updateScenario('askingPrice', v);
              }}
            />
            <label className="calc-checkbox-inline">
              <input
                type="checkbox"
                checked={Boolean(currentScenario.usePurchaseOverride)}
                onChange={(e) => {
                  const on = e.target.checked;
                  if (on) {
                    const base = stripNumberInput(currentScenario.askingPrice) || stripNumberInput(currentScenario.purchasePrice);
                    updateScenario('purchasePrice', base);
                  }
                  updateScenario('usePurchaseOverride', on);
                }}
              />
              <span>Separate from asking</span>
            </label>
          </div>
        </div>
        <div className="calc-result-pair calc-actual-stack">
          <div className="calc-result-box">
            <div className="calc-result-box-title">Total Debt Service (Annual)</div>
            <div className="calc-result-box-value">{formatMoney(analysis.totalDebtService)}</div>
          </div>
          <div className="calc-result-box">
            <div className="calc-result-box-title">Free Cash Flow (Annual)</div>
            <div className="calc-result-box-value">{formatMoney(analysis.freeCashFlow)}</div>
            <div className="calc-result-box-sub">Monthly: {formatMoney(analysis.freeCashFlow / 12)}</div>
          </div>
          <div className="calc-result-box">
            <div className="calc-result-box-title">Total Owner Take-Home</div>
            <div className="calc-result-box-value">{formatMoney(analysis.totalTakeHome)}</div>
            <div className="calc-result-box-sub">Max available after debt: {formatMoney(analysis.availableCashFlow)}</div>
          </div>
          <div className="calc-result-box calc-result-box--muted">
            <div className="calc-result-box-title">DSCR (actual)</div>
            <div className="calc-result-box-value">{analysis.actualDSCR.toFixed(2)}x</div>
          </div>
        </div>
      </CalcAccordion>

      <div className="calc-footer-actions">
        <button type="button" className="btn-secondary" onClick={resetScenarioFromListing}>
          Refresh from listing
        </button>
      </div>
    </div>
  );
}

function CalcAccordion({ open, onToggle, title, summary, summaryWarn, summaryMuted, nested, kicker, children }) {
  return (
    <div className={`calc-accordion ${nested ? 'calc-accordion--nested' : ''} ${kicker ? 'calc-accordion--kicker' : ''}`.trim()}>
      <button type="button" className={`calc-accordion-header ${open ? '' : 'collapsed'}`.trim()} onClick={onToggle}>
        <span className="calc-accordion-arrow">{open ? '▼' : '▶'}</span>
        <span className="calc-accordion-title">{title}</span>
        {summary != null && (
          <span
            className={`calc-accordion-summary ${summaryMuted ? 'calc-accordion-summary--muted' : ''}`.trim()}
            style={summaryWarn ? { color: '#e74c3c', fontWeight: 700 } : undefined}
          >
            {summary}
          </span>
        )}
      </button>
      {open && <div className="calc-accordion-body">{children}</div>}
    </div>
  );
}

function renderFinancingBreakdown(ctx) {
  if (!ctx) return null;
  const ratePct = (ctx.sellerRate * 100).toFixed(1);
  let noteLine = '';
  if (ctx.sellerEnabled) {
    noteLine = `Seller note (${ctx.sellerPercent}%): ${formatMoney(ctx.sellerNote)} [${ctx.sellerPaymentType}, ${ratePct}%${ctx.sellerStandby === 'yes' ? ', standby' : ''}]`;
  }
  return (
    <div className="calc-financing-breakdown">
      <div className="calc-financing-breakdown-title">Financing at recommended price</div>
      <div className="calc-financing-breakdown-lines">
        <div>SBA ({ctx.sbaPercent}%): {formatMoney(ctx.sbaLoan)}</div>
        <div>Buyer equity ({ctx.equityPercent}%): {formatMoney(ctx.equity)}</div>
        {noteLine && <div>{noteLine}</div>}
        <div>Target DSCR: {ctx.targetDSCR}x</div>
        <div>Target salary: {formatMoney(ctx.targetSalary)}</div>
      </div>
    </div>
  );
}

function cocTier(coc) {
  if (coc >= 100) return 'excellent';
  if (coc >= 50) return 'very-good';
  if (coc >= 25) return 'good';
  if (coc >= 0) return 'fair';
  return 'bad';
}

function paybackTier(years) {
  if (years <= 0 || years >= 100) return 'none';
  if (years <= 2) return 'excellent';
  if (years <= 4) return 'very-good';
  if (years <= 6) return 'good';
  if (years <= 10) return 'fair';
  return 'bad';
}

function stringifyNumber(value) {
  return value ? String(Math.round(value)) : '';
}

function formatNumberWithCommas(val) {
  if (val == null || val === '') return '';
  const digits = String(val).replace(/[^0-9]/g, '');
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function stripNumberInput(str) {
  return String(str ?? '').replace(/[^0-9]/g, '');
}

function formatMoney(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}

function formatMoneyReadonly(value) {
  if (!value || Number.isNaN(value)) return '—';
  return formatMoney(value);
}

function formatCompactMoney(n) {
  if (!n || Number.isNaN(n)) return '$0';
  const x = Math.round(n);
  if (x >= 1000) return `$${Math.round(x / 1000)}k`;
  return `$${x}`;
}

function createDefaultScenarios(deal, calculatorDefaults = {}) {
  const base = {
    ebitda: stringifyNumber(deal.ebitda),
    askingPrice: stringifyNumber(deal.askingPrice),
    dscr: String(calculatorDefaults.dscr ?? '1.25'),
    sbaPercent: String(calculatorDefaults.sbaPercent ?? '80'),
    sbaRate: String(calculatorDefaults.sbaRate ?? DEFAULT_SBA_RATE),
    sbaTerm: String(calculatorDefaults.sbaTerm ?? '10'),
    equityPercent: String(calculatorDefaults.equityPercent ?? '10'),
    salary: String(calculatorDefaults.salary ?? '150000'),
    sellerEnabled: false,
    sellerPercent: '10',
    sellerRate: String(calculatorDefaults.sellerRate ?? '6'),
    sellerStandby: calculatorDefaults.sellerStandby === 'yes' ? 'yes' : 'no',
    sellerPaymentType: calculatorDefaults.sellerPaymentType === 'interest-only' ? 'interest-only' : 'amortizing',
    usePurchaseOverride: false,
    purchasePrice: ''
  };
  return [
    { ...base },
    { ...base, sbaPercent: '70', equityPercent: '20', sellerEnabled: true, sellerPercent: '10' },
    { ...base, sbaPercent: '60', equityPercent: '20', sellerEnabled: true, sellerPercent: '20' }
  ];
}
