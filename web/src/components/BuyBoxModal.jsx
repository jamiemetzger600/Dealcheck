import { useCallback, useEffect, useRef, useState } from 'react';
import { userAPI } from '../utils/api';
import {
  BUY_BOX_SLOT_COUNT,
  defaultBuyBoxSlotName,
  emptyBuyBoxCriteria,
  normalizeBuyBoxesState
} from '../utils/buyBoxes';

const DEFAULT_BUYBOX = {
  minPrice: null,
  maxPrice: null,
  minEbitda: null,
  maxEbitda: null,
  minRevenue: null,
  maxRevenue: null,
  revenueMultiple: null,
  targetStates: [],
  excludeStates: [],
  targetIndustries: [],
  targetCOC: null,
  targetPayback: null,
  minBuyerSalary: null,
  includeNearMatchesPercent: 0
};

const FLEXIBILITY_PRESETS = [0, 5, 10, 15, 20];
const NEAR_MATCH_OPTIONS = [
  { value: 0, label: 'Off (strict match only)' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
  { value: 'custom', label: 'Custom' }
];

const INDUSTRIES = ['Healthcare', 'SaaS', 'Manufacturing', 'Restaurant', 'Retail', 'E-commerce', 'Services', 'Real Estate'];

/** Set true to show Target Industries checkboxes in the Buy Box modal again. */
const SHOW_TARGET_INDUSTRIES_IN_BUYBOX = false;

export default function BuyBoxModal({
  isOpen,
  settings,
  editingSlotIndex,
  onClose,
  onSaved,
  isOnboarding = false
}) {
  const [form, setForm] = useState(DEFAULT_BUYBOX);
  const [buyBoxName, setBuyBoxName] = useState(defaultBuyBoxSlotName(0));
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const busyRef = useRef(false);
  busyRef.current = saving || dismissing;
  const onboardingDismissLock = useRef(false);
  /** True only if the current gesture started with pointerdown on the backdrop (not inside the card). Avoids closing when text selection ends on the overlay. */
  const closeGestureFromBackdropRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
    const idx = isOnboarding ? 0 : (Number.isFinite(editingSlotIndex) ? editingSlotIndex : activeBuyBoxIndex);
    const safeIdx = Math.min(BUY_BOX_SLOT_COUNT - 1, Math.max(0, idx));
    const slot = buyBoxes[safeIdx] || {};
    const { name, ...crit } = slot;
    setBuyBoxName(typeof name === 'string' && name.trim() ? name.trim() : defaultBuyBoxSlotName(safeIdx));
    setForm({ ...DEFAULT_BUYBOX, ...crit });
  }, [isOpen, settings, editingSlotIndex, isOnboarding]);

  const dismissOnboarding = useCallback(async () => {
    if (onboardingDismissLock.current || saving) return;
    onboardingDismissLock.current = true;
    setDismissing(true);
    try {
      await userAPI.updateSettings({ preferences: { buyBoxOnboardingDismissed: true } });
      onSaved();
      onClose();
    } catch (error) {
      console.error('[BuyBoxModal] dismiss onboarding failed:', error);
      onClose();
    } finally {
      onboardingDismissLock.current = false;
      setDismissing(false);
    }
  }, [onSaved, onClose, saving]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape' || busyRef.current) return;
      if (isOnboarding) dismissOnboarding();
      else onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isOnboarding, onClose, dismissOnboarding]);

  if (!isOpen) return null;

  const busy = saving || dismissing;

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/[$,]/g, ''));
    return Number.isNaN(num) ? null : num;
  };
  const formatWithCommas = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (Number.isNaN(num)) return '';
    const s = String(num);
    const [intPart, decPart] = s.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  };
  const handleNumberChange = (key, rawInput) => {
    updateField(key, parseNumber(rawInput));
  };

  const handleIndustryToggle = (industry) => {
    setForm((current) => ({
      ...current,
      targetIndustries: current.targetIndustries?.includes(industry)
        ? current.targetIndustries.filter((item) => item !== industry)
        : [...(current.targetIndustries || []), industry]
    }));
  };

  const handleSave = async () => {
    if (form.minPrice && form.maxPrice && Number(form.minPrice) > Number(form.maxPrice)) {
      alert('Min price cannot be greater than max price');
      return;
    }
    if (form.minEbitda && form.maxEbitda && Number(form.minEbitda) > Number(form.maxEbitda)) {
      alert('Min EBITDA cannot be greater than max EBITDA');
      return;
    }

    setSaving(true);
    try {
      const buyBoxPayload = {
        minPrice: parseNumber(form.minPrice),
        maxPrice: parseNumber(form.maxPrice),
        minEbitda: parseNumber(form.minEbitda),
        maxEbitda: parseNumber(form.maxEbitda),
        minRevenue: parseNumber(form.minRevenue),
        revenueMultiple: parseNumber(form.revenueMultiple),
        targetStates: (form.targetStatesInput || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
        excludeStates: (form.excludeStatesInput || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
        targetIndustries: form.targetIndustries || [],
        targetCOC: parseNumber(form.targetCOC),
        targetPayback: parseNumber(form.targetPayback),
        minBuyerSalary: parseNumber(form.minBuyerSalary),
        includeNearMatchesPercent: Number(form.includeNearMatchesPercent) || 0
      };

      const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
      const slotIndex = isOnboarding ? 0 : (Number.isFinite(editingSlotIndex) ? editingSlotIndex : activeBuyBoxIndex);
      const safeIdx = Math.min(BUY_BOX_SLOT_COUNT - 1, Math.max(0, slotIndex));
      const trimmed = buyBoxName.trim();
      const nextName = trimmed || defaultBuyBoxSlotName(safeIdx);
      const { name: _drop, ...prevCrit } = buyBoxes[safeIdx] || {};
      const nextSlots = [...buyBoxes];
      nextSlots[safeIdx] = {
        name: nextName,
        ...prevCrit,
        ...buyBoxPayload
      };

      const preferencePayload = {
        buyBoxes: nextSlots,
        activeBuyBoxIndex
      };
      if (isOnboarding) {
        preferencePayload.buyBoxOnboardingDismissed = true;
      }

      const updates = { preferences: preferencePayload };
      if (safeIdx === activeBuyBoxIndex) {
        updates.buyBox = buyBoxPayload;
      }
      await userAPI.updateSettings(updates);
      onSaved();
      onClose();
    } catch (error) {
      alert(`Failed to save buy box: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset this buy box slot to defaults?')) return;
    const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(settings);
    const slotIndex = isOnboarding ? 0 : (Number.isFinite(editingSlotIndex) ? editingSlotIndex : activeBuyBoxIndex);
    const safeIdx = Math.min(BUY_BOX_SLOT_COUNT - 1, Math.max(0, slotIndex));
    const nextSlots = buyBoxes.map((b, i) =>
      i === safeIdx ? { name: defaultBuyBoxSlotName(safeIdx), ...DEFAULT_BUYBOX } : b
    );
    setForm(DEFAULT_BUYBOX);
    setBuyBoxName(defaultBuyBoxSlotName(safeIdx));
    try {
      const updates = {
        preferences: { buyBoxes: nextSlots, activeBuyBoxIndex }
      };
      if (safeIdx === activeBuyBoxIndex) {
        updates.buyBox = emptyBuyBoxCriteria();
      }
      await userAPI.updateSettings(updates);
      onSaved();
      onClose();
    } catch (error) {
      alert(`Failed to reset buy box: ${error.message}`);
    }
  };

  return (
    <div
      className="modal-overlay buybox-modal-overlay"
      onPointerDownCapture={(e) => {
        if (busy) return;
        closeGestureFromBackdropRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || busy) return;
        if (!closeGestureFromBackdropRef.current) return;
        closeGestureFromBackdropRef.current = false;
        if (isOnboarding) dismissOnboarding();
        else onClose();
      }}
    >
      <div className="modal-card buybox-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header buybox-modal-header">
          <div className="buybox-modal-header__main">
            <h2>Configure Buy Box</h2>
            <label className="buybox-modal-name-field">
              <span className="buybox-modal-name-field__label">Name</span>
              <input
                type="text"
                className="buybox-modal-name-field__input"
                value={buyBoxName}
                onChange={(e) => setBuyBoxName(e.target.value)}
                placeholder={defaultBuyBoxSlotName(
                  isOnboarding ? 0 : (Number.isFinite(editingSlotIndex) ? editingSlotIndex : settings?.activeBuyBoxIndex ?? 0)
                )}
                maxLength={80}
                disabled={busy}
                autoComplete="off"
                aria-label="Buy box name"
              />
            </label>
          </div>
          <button
            type="button"
            className="column-close-btn"
            onClick={() => (isOnboarding ? dismissOnboarding() : onClose())}
            disabled={busy}
            aria-label={isOnboarding ? 'Skip buy box and browse deals' : 'Close'}
          >
            ×
          </button>
        </div>
        {isOnboarding && (
          <p className="buybox-onboarding-intro">
            <strong>Optional but recommended:</strong> set your buy box so the feed highlights deals that fit you. You can skip for now and browse all listings — change this anytime from the dashboard. Deals load in the background.
          </p>
        )}

        <div className="modal-grid two-col">
          <div className="form-group"><label>Min Price</label><input value={formatWithCommas(form.minPrice)} onChange={(e) => handleNumberChange('minPrice', e.target.value)} placeholder="$500,000" /></div>
          <div className="form-group"><label>Max Price</label><input value={formatWithCommas(form.maxPrice)} onChange={(e) => handleNumberChange('maxPrice', e.target.value)} placeholder="$5,000,000" /></div>
          <div className="form-group"><label>Min EBITDA</label><input value={formatWithCommas(form.minEbitda)} onChange={(e) => handleNumberChange('minEbitda', e.target.value)} placeholder="$100,000" /></div>
          <div className="form-group"><label>Max EBITDA</label><input value={formatWithCommas(form.maxEbitda)} onChange={(e) => handleNumberChange('maxEbitda', e.target.value)} placeholder="$1,000,000" /></div>
          <div className="form-group"><label>Min Revenue</label><input value={formatWithCommas(form.minRevenue)} onChange={(e) => handleNumberChange('minRevenue', e.target.value)} placeholder="$1,000,000" /></div>
          <div className="form-group"><label>Revenue Multiple</label><input value={formatWithCommas(form.revenueMultiple)} onChange={(e) => handleNumberChange('revenueMultiple', e.target.value)} placeholder="3.5" /></div>
          <div className="form-group"><label>Target States</label><input value={form.targetStatesInput ?? form.targetStates?.join(', ') ?? ''} onChange={(e) => updateField('targetStatesInput', e.target.value)} placeholder="CA, TX, FL" /></div>
          <div className="form-group"><label>Exclude States</label><input value={form.excludeStatesInput ?? form.excludeStates?.join(', ') ?? ''} onChange={(e) => updateField('excludeStatesInput', e.target.value)} placeholder="AK, HI" /></div>
          {SHOW_TARGET_INDUSTRIES_IN_BUYBOX && (
            <div className="form-group full-width">
              <label>Target Industries</label>
              <div className="industry-checkboxes">
                {INDUSTRIES.map((industry) => (
                  <label key={industry} className="industry-checkbox">
                    <input type="checkbox" checked={form.targetIndustries?.includes(industry) || false} onChange={() => handleIndustryToggle(industry)} />
                    {industry}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="modal-grid three-col full-width buybox-analyzer-defaults-row" role="group" aria-label="Deal analyzer defaults">
            <div className="form-group">
              <label>Minimum CoC return (%)</label>
              <input
                value={formatWithCommas(form.targetCOC)}
                onChange={(e) => handleNumberChange('targetCOC', e.target.value)}
                placeholder="25"
                inputMode="decimal"
              />
            </div>
            <div className="form-group">
              <label>Payback period (years)</label>
              <input
                value={formatWithCommas(form.targetPayback)}
                onChange={(e) => handleNumberChange('targetPayback', e.target.value)}
                placeholder="4"
                inputMode="decimal"
              />
            </div>
            <div className="form-group">
              <label>Minimum Buyer Salary</label>
              <input
                value={formatWithCommas(form.minBuyerSalary)}
                onChange={(e) => handleNumberChange('minBuyerSalary', e.target.value)}
                placeholder="150,000"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <div className="buybox-near-matches">
          <h3 className="buybox-near-matches__title">Include near matches</h3>
          <p className="buybox-near-matches__desc">
            Show deals that are slightly over your maximums (or under your minimums) so you don’t miss listings that might negotiate. For example, with 10%, a $1M max price also shows deals up to $1.1M.
          </p>
          <label className="form-group buybox-near-matches__field">
            <span className="buybox-near-matches__label">Flexibility</span>
            <select
              value={FLEXIBILITY_PRESETS.includes(Number(form.includeNearMatchesPercent)) ? Number(form.includeNearMatchesPercent) : 'custom'}
              onChange={(e) => {
                const v = e.target.value;
                if (v !== 'custom') updateField('includeNearMatchesPercent', Number(v));
              }}
              className="buybox-near-matches__select"
            >
              {NEAR_MATCH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {!FLEXIBILITY_PRESETS.includes(Number(form.includeNearMatchesPercent)) && (
              <input
                type="number"
                min={0}
                max={100}
                className="buybox-near-matches__custom"
                value={form.includeNearMatchesPercent ?? ''}
                onChange={(e) => updateField('includeNearMatchesPercent', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                aria-label="Custom flexibility percent"
              />
            )}
          </label>
        </div>

        <div className="modal-actions">
          {!isOnboarding && <button type="button" className="btn-secondary" onClick={handleReset} disabled={busy}>Reset</button>}
          {!isOnboarding && (
            <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          )}
          {isOnboarding && (
            <button type="button" className="btn-secondary" onClick={() => dismissOnboarding()} disabled={busy}>
              {dismissing ? 'Skipping...' : 'Skip for now'}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={handleSave} disabled={busy}>
            {saving ? 'Saving...' : 'Save Buy Box'}
          </button>
        </div>
      </div>
    </div>
  );
}
