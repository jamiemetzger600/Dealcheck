import { useCallback, useEffect, useRef, useState } from 'react';
import DealCalculator from './DealCalculator';
import IOIModal from './IOIModal';
import { getCalculatorDefaultsFromSettings } from '../utils/calculatorDefaultsFromSettings';
import { dealsAPI } from '../utils/api';
import { saveCalculatorState } from '../utils/dealCalculatorStorage';
import { useTeam } from '../context/TeamContext';

/** Stable id so calculator inputs persist in localStorage between sessions. */
export const QUICK_CALCULATOR_DEAL = {
  id: '__vettr_quick_calculator__',
  name: 'Quick Deal Calculator',
  source: 'quick-calculator'
};

export default function QuickDealCalculatorModal({
  isOpen,
  onClose,
  settings = null,
  onSaveCalculatorDefaults = null,
  onDealSaved = null
}) {
  const { saveTeamId } = useTeam();
  const [businessName, setBusinessName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ioiPayload, setIoiPayload] = useState(null);
  const businessNameInputRef = useRef(null);
  const addToMyDealsPayloadRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setBusinessName('');
      setNameError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const calculatorDefaults = getCalculatorDefaultsFromSettings(settings);

  const promptForBusinessName = () => {
    setNameError('Enter a business name to save to My Deals.');
    businessNameInputRef.current?.focus();
  };

  const handleAddToMyDeals = async ({ calculatorState, askingPrice, ebitda }) => {
    const name = businessName.trim();
    if (!name) {
      promptForBusinessName();
      return;
    }

    const dealId = `quick_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const data = await dealsAPI.saveDeal({
      dealId,
      name,
      url: null,
      askingPrice: askingPrice > 0 ? askingPrice : null,
      ebitda: ebitda > 0 ? ebitda : null,
      source: 'Quick calculator',
      sourceType: 'manual',
      discoveredAt: Date.now(),
      calculatorState,
      ...(saveTeamId ? { teamId: saveTeamId } : {})
    });

    if (data?.dealId != null) {
      saveCalculatorState(data.dealId, calculatorState);
    }

    console.log('[QuickDealCalculator] Saved to My Deals', { dealId, name, rowId: data?.dealId });

    if (typeof onDealSaved === 'function') {
      await Promise.resolve(onDealSaved());
    }
    onClose();
  };

  const handleSaveClick = async () => {
    if (saving) return;

    if (!businessName.trim()) {
      promptForBusinessName();
      return;
    }

    setNameError('');

    if (typeof addToMyDealsPayloadRef.current !== 'function') {
      console.warn('[QuickDealCalculator] calculator not ready yet');
      return;
    }

    setSaving(true);
    try {
      await handleAddToMyDeals(addToMyDealsPayloadRef.current());
    } catch (error) {
      console.error('[QuickDealCalculator] save failed', error);
      alert(`Failed to save deal: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="deal-details-overlay panel-center quick-calculator-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="deal-details-panel panel-center quick-calculator-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="deal-details-header">
          <div className="deal-details-header-title-block">
            <h2>Quick Deal Calculator</h2>
            <p className="quick-calculator-subtitle">
              Run a deal analysis on any opportunity — even deals that are not in Vettr yet.
            </p>
            <div className="quick-calculator-name-row">
              <div className="form-group quick-calculator-name-field">
                <label htmlFor="quick-calc-business-name">Business name</label>
                <input
                  ref={businessNameInputRef}
                  id="quick-calc-business-name"
                  type="text"
                  className={`modal-input ${nameError ? 'modal-input--error' : ''}`.trim()}
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (nameError && e.target.value.trim()) setNameError('');
                  }}
                  placeholder="e.g. Main Street HVAC"
                  aria-invalid={nameError ? 'true' : undefined}
                  aria-describedby={nameError ? 'quick-calc-business-name-error' : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveClick();
                    }
                  }}
                />
                {nameError ? (
                  <p id="quick-calc-business-name-error" className="quick-calculator-name-error" role="alert">
                    {nameError}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-primary quick-calculator-save-btn"
                disabled={saving}
                onClick={handleSaveClick}
              >
                {saving ? 'Saving…' : 'Add to My Deals'}
              </button>
            </div>
          </div>
          <div className="deal-details-header-actions">
            <button type="button" className="deal-details-close" onClick={onClose} aria-label="Close calculator">
              ×
            </button>
          </div>
        </div>

        <div className="deal-details-body quick-calculator-body">
          <section className="deal-details-section deal-calculator-section">
            <DealCalculator
              deal={QUICK_CALCULATOR_DEAL}
              calculatorDefaults={calculatorDefaults}
              onSaveCalculatorDefaults={onSaveCalculatorDefaults}
              showRefreshFromListing={false}
              addToMyDealsInFooter={false}
              collectAddToMyDealsPayloadRef={addToMyDealsPayloadRef}
              onUseForIOI={(data) => {
                console.log('[QuickDealCalculator] Quick IOI');
                setIoiPayload(data);
              }}
              showQuickIOI="always"
            />
          </section>
        </div>
      </div>
      {ioiPayload ? (
        <IOIModal
          deal={{
            ...QUICK_CALCULATOR_DEAL,
            name: businessName.trim() || QUICK_CALCULATOR_DEAL.name
          }}
          scenarios={ioiPayload.scenarios}
          activeScenario={ioiPayload.activeScenario}
          qualityPrefs={{
            targetCOC: parseFloat(calculatorDefaults.targetCOC) || 25,
            targetPayback: parseFloat(calculatorDefaults.targetPayback) || 4
          }}
          settings={settings}
          onClose={() => setIoiPayload(null)}
        />
      ) : null}
    </div>
  );
}
