import { useEffect, useState } from 'react';
import DealCalculator from './DealCalculator';

const POSITION_OPTIONS = ['left', 'center', 'right'];

export default function DealDetailsPanel({
  isOpen,
  deal,
  position = 'center',
  onClose,
  onSaveDeal,
  isSavingDeal = false,
  onPositionChange,
  settings = null,
  onSaveCalculatorDefaults = null
}) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true);
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setIsDescriptionOpen(true);
    setIsOverviewOpen(true);
    setIsCalculatorOpen(false);
  }, [deal]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !deal) return null;

  const calculatorDefaults = settings?.preferences?.calculatorDefaults || {};
  const listedDate = deal.discoveredAt ? new Date(deal.discoveredAt).toLocaleDateString() : '-';
  const multiple = deal.askingPrice && deal.ebitda ? `${(deal.askingPrice / deal.ebitda).toFixed(2)}x` : '-';
  const brokerName = deal.brokerName || deal.broker || '-';
  const brokerCompany = deal.brokerCompany || deal.source || '-';
  const brokerEmail = deal.brokerEmail || '-';
  const brokerPhone = deal.brokerPhone || '-';

  return (
    <div className={`deal-details-overlay panel-${position}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`deal-details-panel panel-${position}`} onClick={(e) => e.stopPropagation()}>
        <div className="deal-details-header">
          <div>
            <h2>{deal.name || 'Deal Details'}</h2>
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
          <section className="deal-details-section deal-description-section">
            <button type="button" className={`calc-section-header ${isDescriptionOpen ? '' : 'collapsed'}`} onClick={() => setIsDescriptionOpen((current) => !current)}>
              <span>{isDescriptionOpen ? '▼' : '▶'} Description</span>
            </button>
            {isDescriptionOpen && (
              <div className="deal-details-description">
                {deal.description || 'No description available.'}
              </div>
            )}
          </section>

          <section className="deal-details-section deal-overview-section">
            <button type="button" className={`calc-section-header ${isOverviewOpen ? '' : 'collapsed'}`} onClick={() => setIsOverviewOpen((current) => !current)}>
              <span>{isOverviewOpen ? '▼' : '▶'} Deal Overview</span>
            </button>
            {isOverviewOpen && (
              <div className="deal-overview-section-content">
                <div className="deal-overview-condensed">
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
                </div>
                <div className="deal-broker-condensed">
                  <h3>Broker Information</h3>
                  <div className="deal-broker-grid">
                    <BrokerItem label="Broker Name" value={brokerName} />
                    <BrokerItem label="Company" value={brokerCompany} />
                    <BrokerItem label="Email" value={brokerEmail} href={brokerEmail !== '-' ? `mailto:${brokerEmail}` : null} />
                    <BrokerItem label="Phone" value={brokerPhone} href={brokerPhone !== '-' ? `tel:${brokerPhone}` : null} />
                    <BrokerItem label="Listed" value={listedDate} wide />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="deal-details-section deal-calculator-section">
            <button type="button" className={`calc-section-header ${isCalculatorOpen ? '' : 'collapsed'}`} onClick={() => setIsCalculatorOpen((current) => !current)}>
              <span>{isCalculatorOpen ? '▼' : '▶'} Deal Analyzer Calculator</span>
            </button>

            {isCalculatorOpen && (
              <DealCalculator
                deal={deal}
                calculatorDefaults={calculatorDefaults}
                onSaveCalculatorDefaults={onSaveCalculatorDefaults}
              />
            )}
          </section>
        </div>

        <div className="deal-details-footer">
          <button type="button" className="btn-primary" disabled={isSavingDeal} onClick={() => onSaveDeal(deal)}>
            {isSavingDeal ? 'Saving...' : 'Save to My Deals'}
          </button>
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

function formatMoney(value) {
  if (!value || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}
