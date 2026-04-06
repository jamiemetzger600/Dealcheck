import { useCallback, useEffect, useState } from 'react';
import DealCalculator from './DealCalculator';
import IOIModal from './IOIModal';
import { getCalculatorDefaultsFromSettings } from '../utils/calculatorDefaultsFromSettings';

const POSITION_OPTIONS = ['left', 'center', 'right'];

function dashStr(v) {
  if (v == null || String(v).trim() === '') return '—';
  return String(v);
}

/** Read-only Deal Overview cards for saved deals when overview edit mode is off */
function SavedDealOverviewReadOnlyCards({ deal, savedAtDisplay, multiple }) {
  return (
    <>
      <InfoCard label="Saved Date" value={savedAtDisplay} />
      <InfoCard label="County" value={dashStr(deal.county)} />
      <InfoCard label="Country" value={dashStr(deal.country)} />
      <InfoCard label="Years Established" value={dashStr(deal.yearsEstablished)} />
      <InfoCard label="Franchise" value={dashStr(deal.franchise)} />
      <InfoCard label="Remote / Relocatable" value={dashStr(deal.remote)} wide />
      <InfoCard label="Asking Price" value={formatMoneyPanel(deal.askingPrice)} accent />
      <InfoCard label="EBITDA/SDE" value={formatMoneyPanel(deal.ebitda)} accent />
      <InfoCard label="Revenue" value={formatMoneyPanel(deal.revenue)} />
      <InfoCard label="Multiple" value={multiple} />
      <InfoCard label="Location" value={dashStr(deal.location || deal.city)} />
      <InfoCard label="City" value={dashStr(deal.city)} />
      <InfoCard label="State" value={dashStr(deal.state)} />
      <InfoCard label="Industry" value={dashStr(deal.industry)} wide />
      <InfoCard label="Listing URL" value={dashStr(deal.url)} wide />
    </>
  );
}

export default function DealDetailsPanel({
  isOpen,
  deal,
  position = 'center',
  onClose,
  onSaveDeal,
  onUnsaveDeal = null,
  isSavingDeal = false,
  dealSavedInMyDeals = false,
  savedHighlightStyle = true,
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
  headerProgressLabel = null,
  /** Saved-deal modal: editable overview, description, broker summary */
  listingEdit = null
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

  const parseMoneyInput = (raw) => {
    const n = parseFloat(String(raw ?? '').replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : NaN;
  };
  const numOrNaN = (v) => {
    if (v == null || v === '') return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const askingN =
    listingEdit?.overviewEditMode
      ? parseMoneyInput(listingEdit.values.askingPrice)
      : numOrNaN(deal.askingPrice);
  const ebitdaN =
    listingEdit?.overviewEditMode
      ? parseMoneyInput(listingEdit.values.ebitda)
      : numOrNaN(deal.ebitda);
  const multiple =
    Number.isFinite(askingN) && Number.isFinite(ebitdaN) && ebitdaN !== 0
      ? `${(askingN / ebitdaN).toFixed(2)}x`
      : '-';

  const brokerName = deal.brokerName || deal.broker || '-';
  const brokerCompany = deal.brokerCompany || deal.source || '-';
  const brokerEmail = deal.brokerEmail || '-';
  const brokerPhone = deal.brokerPhone || '-';

  const panelContent = (
    <div className={`deal-details-panel panel-${position}`} onClick={panelOnly ? undefined : (e) => e.stopPropagation()}>
      <div className="deal-details-header">
        <div className="deal-details-header-title-block">
          {listingEdit?.overviewEditMode ? (
            <input
              type="text"
              className="deal-details-title-input"
              value={listingEdit.values.name}
              onChange={(e) => listingEdit.onChange('name', e.target.value)}
              placeholder="Deal name"
              aria-label="Deal name"
            />
          ) : (
            <h2>{deal.name || 'Deal Details'}</h2>
          )}
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
          <div className="deal-details-section-header-row">
            <button type="button" className={`calc-section-header ${isDescriptionOpen ? '' : 'collapsed'}`} onClick={() => setIsDescriptionOpen((current) => !current)}>
              <span>{isDescriptionOpen ? '▼' : '▶'} Description</span>
            </button>
            {listingEdit?.onToggleDescriptionEdit ? (
              <button
                type="button"
                className={`btn-secondary deal-section-edit-btn ${listingEdit.descriptionEditMode ? 'deal-section-edit-btn--active' : ''}`}
                onClick={() => listingEdit.onToggleDescriptionEdit()}
                aria-pressed={listingEdit.descriptionEditMode}
              >
                {listingEdit.descriptionEditMode ? 'Done' : 'Edit'}
              </button>
            ) : null}
          </div>
          {isDescriptionOpen && (
            listingEdit ? (
              listingEdit.descriptionEditMode ? (
                <textarea
                  className="deal-details-description deal-details-description--edit"
                  value={listingEdit.values.description}
                  onChange={(e) => listingEdit.onChange('description', e.target.value)}
                  placeholder="No description yet — add notes about this listing."
                  rows={8}
                />
              ) : (
                <div className="deal-details-description">
                  {deal.description || 'No description available.'}
                </div>
              )
            ) : (
              <div className="deal-details-description">
                {deal.description || 'No description available.'}
              </div>
            )
          )}
        </section>

        <section className="deal-details-section deal-overview-section">
          <div className="deal-details-section-header-row">
            <button type="button" className={`calc-section-header ${isOverviewOpen ? '' : 'collapsed'}`} onClick={() => setIsOverviewOpen((current) => !current)}>
              <span>{isOverviewOpen ? '▼' : '▶'} Deal Overview</span>
            </button>
            {listingEdit?.onToggleOverviewEdit ? (
              <button
                type="button"
                className={`btn-secondary deal-section-edit-btn ${listingEdit.overviewEditMode ? 'deal-section-edit-btn--active' : ''}`}
                onClick={() => listingEdit.onToggleOverviewEdit()}
                aria-pressed={listingEdit.overviewEditMode}
              >
                {listingEdit.overviewEditMode ? 'Done' : 'Edit'}
              </button>
            ) : null}
          </div>
          {isOverviewOpen && (
            <div className="deal-overview-section-content">
              <div className="deal-overview-condensed">
                <div className="deal-overview-grid">
                  {listingEdit ? (
                    listingEdit.overviewEditMode ? (
                    <>
                      <InfoCard label="Saved Date" value={listingEdit.savedAtDisplay} />
                      <OverviewEditCard label="County" value={listingEdit.values.county} onChange={(v) => listingEdit.onChange('county', v)} />
                      <OverviewEditCard label="Country" value={listingEdit.values.country} onChange={(v) => listingEdit.onChange('country', v)} />
                      <OverviewEditCard label="Years Established" value={listingEdit.values.yearsEstablished} onChange={(v) => listingEdit.onChange('yearsEstablished', v)} />
                      <OverviewEditCard label="Franchise" value={listingEdit.values.franchise} onChange={(v) => listingEdit.onChange('franchise', v)} />
                      <OverviewEditCard label="Remote / Relocatable" value={listingEdit.values.remote} onChange={(v) => listingEdit.onChange('remote', v)} wide />
                      <OverviewEditCard label="Asking Price" value={listingEdit.values.askingPrice} onChange={(v) => listingEdit.onChange('askingPrice', v)} accent />
                      <OverviewEditCard label="EBITDA/SDE" value={listingEdit.values.ebitda} onChange={(v) => listingEdit.onChange('ebitda', v)} accent />
                      <OverviewEditCard label="Revenue" value={listingEdit.values.revenue} onChange={(v) => listingEdit.onChange('revenue', v)} />
                      <InfoCard label="Multiple" value={multiple} />
                      <OverviewEditCard label="Location" value={listingEdit.values.location} onChange={(v) => listingEdit.onChange('location', v)} />
                      <OverviewEditCard label="City" value={listingEdit.values.city} onChange={(v) => listingEdit.onChange('city', v)} />
                      <OverviewEditCard label="State" value={listingEdit.values.state} onChange={(v) => listingEdit.onChange('state', v)} />
                      <OverviewEditCard label="Industry" value={listingEdit.values.industry} onChange={(v) => listingEdit.onChange('industry', v)} wide />
                      <OverviewEditCard label="Listing URL" value={listingEdit.values.url} onChange={(v) => listingEdit.onChange('url', v)} wide />
                    </>
                    ) : (
                      <SavedDealOverviewReadOnlyCards deal={deal} savedAtDisplay={listingEdit.savedAtDisplay} multiple={multiple} />
                    )
                  ) : (
                    <>
                      {overviewAdditions}
                      <InfoCard label="Asking Price" value={formatMoneyPanel(deal.askingPrice)} accent />
                      <InfoCard label="EBITDA/SDE" value={formatMoneyPanel(deal.ebitda)} accent />
                      <InfoCard label="Revenue" value={formatMoneyPanel(deal.revenue)} />
                      <InfoCard label="Multiple" value={multiple} />
                      <InfoCard label="Location" value={deal.location || deal.city || '-'} />
                      <InfoCard label="State" value={deal.state || '-'} />
                      <InfoCard label="Industry" value={deal.industry || '-'} wide />
                      <InfoCard label="Source" value={deal.source || deal.sourceType || '-'} wide />
                    </>
                  )}
                </div>
              </div>
              {!listingEdit ? (
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
              ) : null}
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
              dealSavedInMyDeals ? (
                <button
                  type="button"
                  className={savedHighlightStyle ? 'btn-save btn-save--saved' : 'btn-save btn-save--saved-muted'}
                  disabled={isSavingDeal || typeof onUnsaveDeal !== 'function'}
                  title="Click to remove from My Deals"
                  onClick={() => onUnsaveDeal && onUnsaveDeal(deal)}
                >
                  {isSavingDeal ? 'Removing…' : 'Saved'}
                </button>
              ) : (
                <button type="button" className="btn-primary" disabled={isSavingDeal} onClick={() => onSaveDeal(deal)}>
                  {isSavingDeal ? 'Saving...' : 'Save to My Deals'}
                </button>
              )
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

function OverviewEditCard({ label, value, onChange, accent = false, wide = false, placeholder = '' }) {
  return (
    <div className={`deal-overview-card deal-overview-card--edit ${accent ? 'accent' : ''} ${wide ? 'wide' : ''}`.trim()}>
      <label className="deal-overview-label">{label}</label>
      <input
        type="text"
        className="modal-input deal-overview-edit-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
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
