import { useCallback, useEffect, useState } from 'react';
import DealCalculator from './DealCalculator';
import IOIModal from './IOIModal';
import { getCalculatorDefaultsFromSettings } from '../utils/calculatorDefaultsFromSettings';

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
  onSaveCalculatorDefaults = null,
  panelOnly = false,
  showPositionToggle = true,
  showSaveButton = true,
  renderFooter = null,
  extraSectionsAfterCalculator = null,
  overviewAdditions = null,
  onIOISent = null,
  onIOIPrefsSaved = null,
  headerProgressLabel = null
}) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(true);
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [ioiData, setIoiData] = useState(null);
  /** Remount IOIModal each open so signature/company hydrate from latest `settings.preferences`. */
  const [ioiModalKey, setIoiModalKey] = useState(0);

  useEffect(() => {
    if (!deal) return;
    setIsDescriptionOpen(true);
    setIsOverviewOpen(true);
    setIsCalculatorOpen(false);
  }, [deal]);

  useEffect(() => {
    if (!isOpen && !panelOnly) return;
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, panelOnly, onClose]);

  const handleUseForIOI = useCallback((data) => {
    setIoiData(data);
    setIoiModalKey((k) => k + 1);
  }, []);

  const handleCloseIOI = useCallback(() => {
    setIoiData(null);
  }, []);

  if (!deal) return null;
  if (!panelOnly && !isOpen) return null;

  const calculatorDefaults = getCalculatorDefaultsFromSettings(settings);
  const listedDate = deal.discoveredAt ? new Date(deal.discoveredAt).toLocaleDateString() : '-';
  const multiple = deal.askingPrice && deal.ebitda ? `${(deal.askingPrice / deal.ebitda).toFixed(2)}x` : '-';
  const brokerName = deal.brokerName || deal.broker || '-';
  const brokerCompany = deal.brokerCompany || deal.source || '-';
  const brokerEmail = deal.brokerEmail || '-';
  const brokerPhone = deal.brokerPhone || '-';

  const panelContent = (
    <div className={`deal-details-panel panel-${position}`} onClick={panelOnly ? undefined : (e) => e.stopPropagation()}>
      <div className="deal-details-header">
        <div className="deal-details-header-title-block">
          <h2>{deal.name || 'Deal Details'}</h2>
          {(headerProgressLabel || deal.url) ? (
            <div className="deal-details-header-meta-row">
              {headerProgressLabel ? (
                <p className="deal-details-header-progress" title="Current progress status">
                  <strong>{headerProgressLabel}</strong>
                </p>
              ) : null}
              {deal.url ? (
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary deal-details-header-listing-link"
                >
                  View Original Listing
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="deal-details-header-actions">
          {showPositionToggle && (
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
          )}
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
                <div className="deal-overview-grid">
                  {overviewAdditions}
                  <InfoCard label="Asking Price" value={formatMoneyPanel(deal.askingPrice)} accent />
                  <InfoCard label="EBITDA/SDE" value={formatMoneyPanel(deal.ebitda)} accent />
                  <InfoCard label="Revenue" value={formatMoneyPanel(deal.revenue)} />
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
              onUseForIOI={handleUseForIOI}
            />
          )}
        </section>
        {extraSectionsAfterCalculator}
      </div>

      {ioiData && (
        <IOIModal
          key={ioiModalKey}
          deal={deal}
          scenarios={ioiData.scenarios}
          activeScenario={ioiData.activeScenario}
          qualityPrefs={{
            targetCOC: parseFloat(calculatorDefaults.targetCOC) || 25,
            targetPayback: parseFloat(calculatorDefaults.targetPayback) || 4
          }}
          settings={settings}
          onClose={handleCloseIOI}
          onIOISent={onIOISent ? (text) => { onIOISent(text); handleCloseIOI(); } : null}
          onIOIPrefsSaved={onIOIPrefsSaved}
        />
      )}

      <div className="deal-details-footer">
        {renderFooter != null ? (typeof renderFooter === 'function' ? renderFooter() : renderFooter) : (
          <>
            {showSaveButton && (
              <button type="button" className="btn-primary" disabled={isSavingDeal} onClick={() => onSaveDeal(deal)}>
                {isSavingDeal ? 'Saving...' : 'Save to My Deals'}
              </button>
            )}
            {deal.url ? (
              <a href={deal.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                View Original Listing
              </a>
            ) : (
              <button type="button" className="btn-secondary" disabled aria-label="No listing URL">No Listing URL Available</button>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (panelOnly) return panelContent;

  return (
    <div className={`deal-details-overlay panel-${position}`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      {panelContent}
    </div>
  );
}

export function InfoCard({ label, value, accent = false, wide = false }) {
  return (
    <div className={`deal-overview-card ${accent ? 'accent' : ''} ${wide ? 'wide' : ''}`.trim()}>
      <div className="deal-overview-label">{label}</div>
      <div className="deal-overview-value">{value}</div>
    </div>
  );
}

export function BrokerItem({ label, value, href = null, wide = false }) {
  return (
    <div className={`deal-broker-item ${wide ? 'wide' : ''}`.trim()}>
      <div className="deal-broker-label">{label}</div>
      <div className="deal-broker-value">
        {href ? <a href={href}>{value}</a> : value}
      </div>
    </div>
  );
}

export function formatMoneyPanel(value) {
  if (!value || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}
