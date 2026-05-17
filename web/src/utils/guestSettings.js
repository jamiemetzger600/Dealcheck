
import { normalizeBuyBoxesState, criteriaFromSlot } from './buyBoxes';

export const GUEST_SETTINGS_STORAGE_KEY = 'vettr_guest_settings_v1';

function mergePreferences(existing, incoming) {
  if (!incoming || typeof incoming !== 'object') return existing || {};
  const existingObj = existing && typeof existing === 'object' ? existing : {};
  const merged = { ...existingObj };
  for (const key of Object.keys(incoming)) {
    const existingVal = merged[key];
    const incomingVal = incoming[key];
    if (
      incomingVal !== null &&
      typeof incomingVal === 'object' &&
      !Array.isArray(incomingVal) &&
      existingVal !== null &&
      typeof existingVal === 'object' &&
      !Array.isArray(existingVal)
    ) {
      merged[key] = { ...existingVal, ...incomingVal };
    } else {
      merged[key] = incomingVal;
    }
  }
  return merged;
}

export function defaultGuestSettings() {
  const normalized = normalizeBuyBoxesState(null);
  const slot0 = normalized.buyBoxes[0] || {};
  return {
    buyBox: normalized.activeCriteria,
    buyBoxes: normalized.buyBoxes,
    activeBuyBoxIndex: normalized.activeBuyBoxIndex,
    excludeKeywords: Array.isArray(slot0.excludeKeywords) ? [...slot0.excludeKeywords] : [],
    excludeLists:
      slot0.excludeLists && typeof slot0.excludeLists === 'object' && !Array.isArray(slot0.excludeLists)
        ? { ...slot0.excludeLists }
        : {},
    currentExcludeList: slot0.currentExcludeList != null ? String(slot0.currentExcludeList) : '',
    hiddenDealIds: [],
    preferences: {},
    customSources: [],
    visibleColumns: [],
    dealViewStyle: 'table',
  };
}

export function hasGuestSettings() {
  try {
    return Boolean(localStorage.getItem(GUEST_SETTINGS_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function loadGuestSettings() {
  try {
    const raw = localStorage.getItem(GUEST_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultGuestSettings();
    const parsed = JSON.parse(raw);
    const base = defaultGuestSettings();
    const merged = {
      ...base,
      ...parsed,
      preferences: mergePreferences(base.preferences, parsed.preferences),
    };
    const normalized = normalizeBuyBoxesState(merged);
    const activeSlot = normalized.buyBoxes[normalized.activeBuyBoxIndex] || normalized.buyBoxes[0];
    const ex = activeSlot || {};
    return {
      ...merged,
      buyBoxes: normalized.buyBoxes,
      activeBuyBoxIndex: normalized.activeBuyBoxIndex,
      buyBox: criteriaFromSlot(activeSlot),
      excludeKeywords: Array.isArray(ex.excludeKeywords) ? ex.excludeKeywords : merged.excludeKeywords,
      excludeLists:
        ex.excludeLists && typeof ex.excludeLists === 'object' && !Array.isArray(ex.excludeLists)
          ? ex.excludeLists
          : merged.excludeLists,
      currentExcludeList: ex.currentExcludeList != null ? String(ex.currentExcludeList) : merged.currentExcludeList,
    };
  } catch (err) {
    console.warn('[guestSettings] load failed, using defaults', err);
    return defaultGuestSettings();
  }
}

export function saveGuestSettings(patch) {
  const current = loadGuestSettings();
  const next = { ...current, ...patch };
  if (patch?.preferences) {
    next.preferences = mergePreferences(current.preferences, patch.preferences);
  }
  if (patch?.buyBoxes) next.buyBoxes = patch.buyBoxes;
  if (patch?.buyBox) next.buyBox = patch.buyBox;
  const normalized = normalizeBuyBoxesState(next);
  const activeSlot = normalized.buyBoxes[normalized.activeBuyBoxIndex] || normalized.buyBoxes[0];
  const persisted = {
    ...next,
    buyBoxes: normalized.buyBoxes,
    activeBuyBoxIndex: normalized.activeBuyBoxIndex,
    buyBox: criteriaFromSlot(activeSlot),
    preferences: {
      ...(next.preferences || {}),
      buyBoxes: normalized.buyBoxes,
      activeBuyBoxIndex: normalized.activeBuyBoxIndex,
    },
  };
  try {
    localStorage.setItem(GUEST_SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
  } catch (err) {
    console.error('[guestSettings] save failed', err);
  }
  return persisted;
}

export function clearGuestSettings() {
  try {
    localStorage.removeItem(GUEST_SETTINGS_STORAGE_KEY);
  } catch {}
}

export async function persistGuestSettings(patch) {
  return saveGuestSettings(patch);
}
