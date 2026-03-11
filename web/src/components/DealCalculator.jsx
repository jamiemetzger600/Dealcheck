import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_SBA_RATE = '9.25';
const CALC_STORAGE_KEY_PREFIX = 'vettr_calc_';
const PER_DEAL_PERSIST_DEBOUNCE_MS = 400;

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
  const [targetOfferResult, setTargetOfferResult] = useState(null);
  const persistTimerRef = useRef(null);
  const perDealPersistTimerRef = useRef(null);

  useEffect(() => {
    if (!deal) return;
    setTargetOfferResult(null);
    const defaults = createDefaultScenarios(deal, calculatorDefaults);
    const stored = loadPerDealCalcState(deal.id);
    if (stored && Array.isArray(stored.scenarios) && stored.scenarios.length === defaults.length) {
      const merged = stored.scenarios.map((s, i) => ({ ...defaults[i], ...s }));
      setScenarios(merged);
      setActiveScenario(Math.min(Number(stored.activeScenario) || 0, merged.length - 1));
      setTargetCOC(typeof stored.targetCOC === 'string' ? stored.targetCOC : '25');
    } else {
      setActiveScenario(0);
      setScenarios(defaults);
      setTargetCOC('25');
    }
  }, [deal?.id]);

  const currentScenario = scenarios[activeScenario] || {};
  const results = useMemo(() => calculateScenario(currentScenario), [currentScenario]);

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
        targetCOC
      });
    }, PER_DEAL_PERSIST_DEBOUNCE_MS);
    return () => {
      if (perDealPersistTimerRef.current) clearTimeout(perDealPersistTimerRef.current);
    };
  }, [deal?.id, scenarios, activeScenario, targetCOC]);

  const updateScenario = (field, value) => {
    const PERSISTED_CALC_FIELDS = ['sbaRate', 'dscr', 'sbaPercent', 'sbaTerm', 'equityPercent', 'salary'];
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
            salary: updated.salary ?? calculatorDefaults.salary
          });
        }, 600);
      }
      return next;
    });
  };

  const handleCalculateTargetOffer = () => {
    const ebitda = parseMoney(currentScenario.ebitda);
    if (!ebitda) {
      setTargetOfferResult({ error: 'Enter EBITDA first' });
      return;
    }
    const state = getCalcStateForTargetOffer(currentScenario);
    if (!state) return;
    const targetCOCNum = parseFloat(targetCOC) || 25;
    const result = calculateTargetOfferPrice(state, targetCOCNum);
    setTargetOfferResult(result);
  };

  const handleUseTargetOffer = () => {
    if (!targetOfferResult || targetOfferResult.error) return;
    const price = targetOfferResult.finalPrice;
    setScenarios((current) => current.map((scenario, index) =>
      index === activeScenario ? { ...scenario, askingPrice: String(Math.round(price)) } : scenario
    ));
    setTargetOfferResult(null);
  };

  if (!deal) return null;

  return (
    <div className={`deal-calculator-body ${className}`.trim()}>
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

      <div className="modal-grid two-col">
        <div className="form-group">
          <label>EBITDA/SDE ($)</label>
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

      <div className="calc-financing-grid">
        <CalcField label="SBA % of Price" value={currentScenario.sbaPercent} onChange={(v) => updateScenario('sbaPercent', v)} />
        <CalcField label="SBA Rate (%)" value={currentScenario.sbaRate} onChange={(v) => updateScenario('sbaRate', v)} />
        <CalcField label="SBA Term (Yrs)" value={currentScenario.sbaTerm} onChange={(v) => updateScenario('sbaTerm', v)} />
        <CalcField label="DSCR Target" value={currentScenario.dscr} onChange={(v) => updateScenario('dscr', v)} />
        <CalcField label="Buyer Equity %" value={currentScenario.equityPercent} onChange={(v) => updateScenario('equityPercent', v)} />
        <CalcField label="Owner Salary ($)" value={formatNumberWithCommas(currentScenario.salary)} onChange={(v) => updateScenario('salary', stripNumberInput(v))} />
        <div className="form-group">
          <label>Seller Note</label>
          <div className="seller-note-toggle">
            <input
              type="checkbox"
              checked={Boolean(currentScenario.sellerEnabled)}
              onChange={(e) => updateScenario('sellerEnabled', e.target.checked)}
            />
            <span>Enable seller note</span>
          </div>
        </div>
        <CalcField label="Seller Note %" value={currentScenario.sellerPercent} onChange={(v) => updateScenario('sellerPercent', v)} disabled={!currentScenario.sellerEnabled} />
      </div>

      {Math.abs(results.totalPercent - 100) > 0.01 && (
        <div className="calc-percent-warning">Percentages must total 100%</div>
      )}

      <div className="calc-results-grid-web">
        <ResultCard label="Max Price (DSCR)" value={formatMoney(results.maxPrice)} primary />
        <ResultCard label="Cash-on-Cash" value={`${results.cashOnCash.toFixed(1)}%`} />
        <ResultCard label="Payback" value={`${results.paybackPeriod.toFixed(1)} yrs`} />
        <ResultCard label="DSCR" value={`${results.actualDSCR.toFixed(2)}x`} />
      </div>

      <div className="calc-details-web">
        <DetailRow label="Total Debt Service (Annual)" value={formatMoney(results.totalDebtService)} />
        <DetailRow label="Available Cash Flow" value={formatMoney(results.availableCashFlow)} />
        <DetailRow label="Free Cash Flow (After Salary)" value={formatMoney(results.freeCashFlow)} />
        <DetailRow label="Total Owner Take-Home" value={formatMoney(results.totalTakeHome)} highlight />
      </div>

      <div className="target-offer-section">
        <h4 className="target-offer-header">Target Offer Calculator</h4>
        <p className="target-offer-desc">Max offer that achieves your target COC return while meeting DSCR and salary.</p>
        <div className="target-offer-input-row">
          <div className="form-group">
            <label>Target COC Return (%)</label>
            <input type="number" value={targetCOC} onChange={(e) => setTargetCOC(e.target.value)} min={1} max={100} step={1} />
          </div>
          <button type="button" className="btn-primary target-offer-calc-btn" onClick={handleCalculateTargetOffer}>
            Calculate Target Offer Price
          </button>
        </div>
        {targetOfferResult && (
          <div className="target-offer-result">
            {targetOfferResult.error ? (
              <p className="target-offer-error">{targetOfferResult.error}</p>
            ) : (
              <>
                <div className="target-offer-price-box">
                  <span className="target-offer-label">Recommended Offer Price</span>
                  <span className="target-offer-value">{formatMoney(targetOfferResult.finalPrice)}</span>
                  <span className="target-offer-subtitle">
                    {targetOfferResult.finalCOC.toFixed(0)}% COC · {targetOfferResult.finalPayback.toFixed(1)} yr payback · Limited by {targetOfferResult.constraint}
                  </span>
                </div>
                {targetOfferResult.askingPrice > 0 && (
                  <p className="target-offer-comparison">
                    <strong>vs Asking ({formatMoney(targetOfferResult.askingPrice)}):</strong>{' '}
                    {formatMoney(targetOfferResult.diff)} below ({targetOfferResult.diffPct.toFixed(1)}% discount)
                  </p>
                )}
                <button type="button" className="btn-secondary use-target-btn" onClick={handleUseTargetOffer}>
                  Use as Asking Price
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CalcField({ label, value, onChange, disabled = false }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function ResultCard({ label, value, primary = false }) {
  return (
    <div className={`calc-result-card ${primary ? 'primary' : ''}`.trim()}>
      <div className="calc-result-label">{label}</div>
      <div className="calc-result-value">{value}</div>
    </div>
  );
}

function DetailRow({ label, value, highlight = false }) {
  return (
    <div className={`calc-detail-row-web ${highlight ? 'highlight' : ''}`.trim()}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function createDefaultScenarios(deal, calculatorDefaults = {}) {
  const base = {
    ebitda: stringifyNumber(deal.ebitda),
    askingPrice: stringifyNumber(deal.askingPrice),
    dscr: calculatorDefaults.dscr ?? '1.25',
    sbaPercent: calculatorDefaults.sbaPercent ?? '80',
    sbaRate: calculatorDefaults.sbaRate ?? DEFAULT_SBA_RATE,
    sbaTerm: calculatorDefaults.sbaTerm ?? '10',
    equityPercent: calculatorDefaults.equityPercent ?? '10',
    salary: calculatorDefaults.salary ?? '150000',
    sellerEnabled: false,
    sellerPercent: '10'
  };
  return [
    base,
    { ...base, sbaPercent: '70', equityPercent: '20', sellerEnabled: true, sellerPercent: '10' },
    { ...base, sbaPercent: '60', equityPercent: '20', sellerEnabled: true, sellerPercent: '20' }
  ];
}

function calculateScenario(scenario) {
  const ebitda = parseMoney(scenario.ebitda);
  const askingPrice = parseMoney(scenario.askingPrice);
  const dscr = parseFloat(scenario.dscr) || 1.25;
  const sbaPercent = parseFloat(scenario.sbaPercent) || 0;
  const sbaRate = (parseFloat(scenario.sbaRate) || 0) / 100;
  const sbaTerm = parseFloat(scenario.sbaTerm) || 10;
  const equityPercent = parseFloat(scenario.equityPercent) || 0;
  const salary = parseMoney(scenario.salary);
  const sellerEnabled = Boolean(scenario.sellerEnabled);
  const sellerPercent = sellerEnabled ? (parseFloat(scenario.sellerPercent) || 0) : 0;
  const totalPercent = sbaPercent + equityPercent + sellerPercent;

  const sbaDebtServicePer1 = calcDebtServicePer1(sbaRate, sbaTerm);
  const sellerDebtServicePer1 = sellerEnabled ? calcDebtServicePer1(0.06, 5) : 0;
  const totalDebtPer1 = (sbaPercent / 100) * sbaDebtServicePer1 + (sellerPercent / 100) * sellerDebtServicePer1;
  const maxPrice = totalDebtPer1 > 0 ? (ebitda / dscr) / totalDebtPer1 : 0;

  const sbaLoan = (sbaPercent / 100) * askingPrice;
  const equity = (equityPercent / 100) * askingPrice;
  const sellerNote = (sellerPercent / 100) * askingPrice;
  const sbaAnnualDebt = sbaLoan * sbaDebtServicePer1;
  const sellerAnnualDebt = sellerNote * sellerDebtServicePer1;
  const totalDebtService = sbaAnnualDebt + sellerAnnualDebt;
  const availableCashFlow = ebitda - totalDebtService;
  const freeCashFlow = availableCashFlow - salary;
  const totalTakeHome = salary + freeCashFlow;
  const actualDSCR = totalDebtService > 0 ? ebitda / totalDebtService : 0;
  const cashOnCash = equity > 0 ? (totalTakeHome / equity) * 100 : 0;
  const paybackPeriod = totalTakeHome > 0 ? equity / totalTakeHome : 0;

  return {
    totalPercent,
    maxPrice,
    totalDebtService,
    availableCashFlow,
    freeCashFlow,
    totalTakeHome,
    actualDSCR,
    cashOnCash,
    paybackPeriod
  };
}

function calcDebtServicePer1(rate, years) {
  if (rate <= 0 || years <= 0) return 0;
  const r = rate / 12;
  const n = years * 12;
  const monthlyPer1 = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return monthlyPer1 * 12;
}

function parseMoney(value) {
  if (!value) return 0;
  return parseFloat(String(value).replace(/[$,]/g, '')) || 0;
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
  if (!value || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}

function getCalcStateForTargetOffer(scenario) {
  const ebitda = parseMoney(scenario.ebitda);
  const askingPrice = parseMoney(scenario.askingPrice);
  const dscr = parseFloat(scenario.dscr) || 1.25;
  const sbaPercent = parseFloat(scenario.sbaPercent) || 0;
  const sbaRate = (parseFloat(scenario.sbaRate) || 0) / 100;
  const sbaTerm = parseFloat(scenario.sbaTerm) || 10;
  const equityPercent = parseFloat(scenario.equityPercent) || 0;
  const salary = parseMoney(scenario.salary);
  const sellerEnabled = Boolean(scenario.sellerEnabled);
  const sellerPercent = sellerEnabled ? (parseFloat(scenario.sellerPercent) || 0) : 0;
  const sbaDebtServicePer1 = calcDebtServicePer1(sbaRate, sbaTerm);
  const sellerDebtServicePer1 = sellerEnabled ? calcDebtServicePer1(0.06, 5) : 0;
  const totalDSPer1 = (sbaPercent / 100) * sbaDebtServicePer1 + (sellerPercent / 100) * sellerDebtServicePer1;
  return {
    ebitda,
    askingPrice,
    targetDSCR: dscr,
    equityPercent,
    targetSalary: salary,
    totalDSPer1
  };
}

function calculateTargetOfferPrice(state, targetCOC) {
  const { ebitda, askingPrice, targetDSCR, equityPercent, targetSalary, totalDSPer1 } = state;
  const maxDSCRPrice = totalDSPer1 > 0 ? (ebitda / targetDSCR) / totalDSPer1 : Infinity;
  let targetPrice = maxDSCRPrice;
  for (let i = 0; i < 50; i++) {
    const equity = (equityPercent / 100) * targetPrice;
    const ds = totalDSPer1 * targetPrice;
    const fcf = ebitda - ds - targetSalary;
    const coc = equity > 0 ? ((targetSalary + fcf) / equity) * 100 : 0;
    if (coc >= targetCOC) break;
    targetPrice *= 0.98;
  }
  let finalPrice = Math.min(targetPrice, maxDSCRPrice);
  if (askingPrice > 0) finalPrice = Math.min(finalPrice, askingPrice);
  const finalEquity = (equityPercent / 100) * finalPrice;
  const finalDS = totalDSPer1 * finalPrice;
  const finalFCF = ebitda - finalDS - targetSalary;
  const finalCOC = finalEquity > 0 ? ((targetSalary + finalFCF) / finalEquity) * 100 : 0;
  const finalPayback = (targetSalary + finalFCF) > 0 ? finalEquity / (targetSalary + finalFCF) : 0;
  let constraint = 'COC target';
  if (finalPrice >= askingPrice && askingPrice > 0) constraint = 'asking price';
  else if (finalPrice >= maxDSCRPrice) constraint = 'DSCR requirement';
  const diff = askingPrice - finalPrice;
  const diffPct = askingPrice > 0 ? (diff / askingPrice) * 100 : 0;
  return {
    finalPrice,
    finalCOC,
    finalPayback,
    constraint,
    askingPrice,
    diff,
    diffPct
  };
}
