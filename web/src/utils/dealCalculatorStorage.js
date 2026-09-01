/**
 * Browser persistence for the deal calculator (localStorage).
 * Saved deals also sync this payload to the API (saved_deals.calculator_state).
 */

const CALC_STORAGE_KEY_PREFIX = 'vettr_calc_';

export function getCalculatorStorageKey(dealId) {
  if (dealId === undefined || dealId === null) return null;
  return `${CALC_STORAGE_KEY_PREFIX}${dealId}`;
}

export function loadCalculatorState(dealId) {
  if (dealId === undefined || dealId === null) return null;
  try {
    const raw = localStorage.getItem(getCalculatorStorageKey(dealId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.scenarios) || data.scenarios.length < 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCalculatorState(dealId, state) {
  if (dealId === undefined || dealId === null) return;
  try {
    localStorage.setItem(getCalculatorStorageKey(dealId), JSON.stringify(state));
  } catch (e) {
    console.warn('dealCalculatorStorage: failed to write localStorage', e);
  }
}

/** Saved rows use numeric DB id; market / feed rows use string composite id. */
export function isSavedDealRowId(id) {
  return typeof id === 'number' && Number.isFinite(id);
}
