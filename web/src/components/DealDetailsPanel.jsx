import { useEffect, useMemo, useState } from 'react';

const POSITION_OPTIONS = ['left', 'center', 'right'];

export default function DealDetailsPanel({
  isOpen,
  deal,
  position = 'center',
  onClose,
  onSaveDeal,
  onPositionChange
}) {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState(0);
  const [scenarios, setScenarios] = useState([]);

  useEffect(() => {
    if (!deal) return;
    setIsCalculatorOpen(false);
    setActiveScenario(0);
    setScenarios(createDefaultScenarios(deal));
  }, [deal]);

  const currentScenario = scenarios[activeScenario] || {};
  const results = useMemo(() => calculateScenario(currentScenario), [currentScenario]);

  if (!isOpen || !deal) return null;

  const updateScenario = (field, value) => {
    setScenarios((current) => current.map((scenario, index) => (
      index === activeScenario ? { ...scenario, [field]: value } : scenario
    )));
  };

  const listedDate = deal.discoveredAt ? new Date(deal.discoveredAt).toLocaleDateString() : '-';
  const multiple = deal.askingPrice && deal.ebitda ? `${(deal.askingPrice / deal.ebitda).toFixed(2)}x` : '-';
  const brokerName = deal.brokerName || deal.broker || '-';
  const brokerCompany = deal.brokerCompany || deal.source || '-';
  const brokerEmail = deal.brokerEmail || '-';
  const brokerPhone = deal.brokerPhone || '-';

  return (
    <div className={`deal-details-overlay panel-${position}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`deal-details-panel panel-${position}`}>
        <div className="deal-details-header">
          <div>
            <h2>{deal.name || 'Deal Details'}</h2>
            <p>Relevant listing information and quick underwriting, modeled after the extension.</p>
          </div>
          <div className="deal-details-header-actions">
            <div className="panel-position-toggle" aria-label="Panel position">
              {POSITION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={position === option ? 'active' : ''}
                  onClick={() => onPositionChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button type="button" className="deal-details-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="deal-details-body">
          <section className="deal-details-section">
            <h3>Deal Overview</h3>
            <div className="deal-overview-grid">
              <InfoCard label="Asking Price" value={formatMoney(deal.askingPrice)} accent />
              <InfoCard label="EBITDA/SDE" value={formatMoney(deal.ebitda)} accent />
              <InfoCard label="Revenue" value={formatMoney(deal.revenue)} />
              <InfoCard label="Multiple" value={multiple} />
              <InfoCard label="Location" value={deal.location || deal.city || '-'} />
              <InfoCard label="State" value={deal.state || '-'} />
              <InfoCard label="Industry" value={deal.industry || '-'} wide />
              <InfoCard label="Source" value={deal.source || deal.sourceType || '-'} wide />
            </div>
          </section>

          <section className="deal-details-section">
            <h3>Broker Information</h3>
            <div className="deal-broker-grid">
              <BrokerItem label="Broker Name" value={brokerName} />
              <BrokerItem label="Company" value={brokerCompany} />
              <BrokerItem label="Email" value={brokerEmail} href={brokerEmail !== '-' ? `mailto:${brokerEmail}` : null} />
              <BrokerItem label="Phone" value={brokerPhone} href={brokerPhone !== '-' ? `tel:${brokerPhone}` : null} />
              <BrokerItem label="Listed" value={listedDate} wide />
            </div>
          </section>

          <section className="deal-details-section">
            <h3>Description</h3>
            <div className="deal-details-description">
              {deal.description || 'No description available.'}
            </div>
          </section>

          <section className="deal-details-section deal-calculator-section">
            <button type="button" className={`calc-section-header ${isCalculatorOpen ? '' : 'collapsed'}`} onClick={() => setIsCalculatorOpen((current) => !current)}>
              <span>{isCalculatorOpen ? '▼' : '▶'} Deal Analyzer Calculator</span>
            </button>

            {isCalculatorOpen && (
              <div className="deal-calculator-body">
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
                    <input value={currentScenario.ebitda} onChange={(event) => updateScenario('ebitda', event.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Asking Price ($)</label>
                    <input value={currentScenario.askingPrice} onChange={(event) => updateScenario('askingPrice', event.target.value)} />
                  </div>
                </div>

                <div className="calc-financing-grid">
                  <CalcField label="SBA % of Price" value={currentScenario.sbaPercent} onChange={(value) => updateScenario('sbaPercent', value)} />
                  <CalcField label="SBA Rate (%)" value={currentScenario.sbaRate} onChange={(value) => updateScenario('sbaRate', value)} />
                  <CalcField label="SBA Term (Yrs)" value={currentScenario.sbaTerm} onChange={(value) => updateScenario('sbaTerm', value)} />
                  <CalcField label="DSCR Target" value={currentScenario.dscr} onChange={(value) => updateScenario('dscr', value)} />
                  <CalcField label="Buyer Equity %" value={currentScenario.equityPercent} onChange={(value) => updateScenario('equityPercent', value)} />
                  <CalcField label="Owner Salary ($)" value={currentScenario.salary} onChange={(value) => updateScenario('salary', value)} />
                  <div className="form-group">
                    <label>Seller Note</label>
                    <div className="seller-note-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(currentScenario.sellerEnabled)}
                        onChange={(event) => updateScenario('sellerEnabled', event.target.checked)}
                      />
                      <span>Enable seller note</span>
                    </div>
                  </div>
                  <CalcField label="Seller Note %" value={currentScenario.sellerPercent} onChange={(value) => updateScenario('sellerPercent', value)} disabled={!currentScenario.sellerEnabled} />
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
              </div>
            )}
          </section>
        </div>

        <div className="deal-details-footer">
          <button type="button" className="btn-primary" onClick={() => onSaveDeal(deal)}>Save to My Deals</button>
          {deal.url ? (
            <a href={deal.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              View Original Listing
            </a>
          ) : (
            <button type="button" className="btn-secondary" disabled>No Listing URL Available</button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, accent = false, wide = false }) {
  return (
    <div className={`deal-overview-card ${accent ? 'accent' : ''} ${wide ? 'wide' : ''}`.trim()}>
      <div className="deal-overview-label">{label}</div>
      <div className="deal-overview-value">{value}</div>
    </div>
  );
}

function BrokerItem({ label, value, href = null, wide = false }) {
  return (
    <div className={`deal-broker-item ${wide ? 'wide' : ''}`.trim()}>
      <div className="deal-broker-label">{label}</div>
      <div className="deal-broker-value">
        {href ? <a href={href}>{value}</a> : value}
      </div>
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

function CalcField({ label, value, onChange, disabled = false }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </div>
  );
}

function createDefaultScenarios(deal) {
  const base = {
    ebitda: stringifyNumber(deal.ebitda),
    askingPrice: stringifyNumber(deal.askingPrice),
    dscr: '1.25',
    sbaPercent: '80',
    sbaRate: '11.5',
    sbaTerm: '10',
    equityPercent: '10',
    salary: '150000',
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

function formatMoney(value) {
  if (!value || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}
