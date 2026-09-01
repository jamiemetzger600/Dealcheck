
import { userAPI } from './api';
import {
  clearGuestSettings,
  defaultGuestSettings,
  hasGuestSettings,
  loadGuestSettings
} from './guestSettings';
import {
  buyBoxesHaveCustomization,
  criteriaFromSlot,
  normalizeBuyBoxesState
} from './buyBoxes';

/**
 * Merge guest local settings into the signed-in account.
 * Skips default/empty guest buy boxes so a brief guest session after logout
 * cannot wipe saved account buy boxes on re-login.
 */
export async function mergeGuestSettingsIntoAccount() {
  if (!hasGuestSettings()) return;
  const guest = loadGuestSettings();
  const defaults = defaultGuestSettings();
  const guestNorm = normalizeBuyBoxesState(guest);

  let account = null;
  try {
    account = await userAPI.getSettings();
  } catch (err) {
    console.warn('[mergeGuestSettings] could not load account settings', err);
  }
  const accountNorm = account ? normalizeBuyBoxesState(account) : null;

  const patch = {};
  const prefPatch = {};

  const guestCustomBuyBoxes = buyBoxesHaveCustomization(guestNorm.buyBoxes);
  const accountCustomBuyBoxes = accountNorm && buyBoxesHaveCustomization(accountNorm.buyBoxes);
  if (guestCustomBuyBoxes && !accountCustomBuyBoxes) {
    const activeSlot = guestNorm.buyBoxes[guestNorm.activeBuyBoxIndex] || guestNorm.buyBoxes[0];
    patch.buyBox = criteriaFromSlot(activeSlot);
    prefPatch.buyBoxes = guestNorm.buyBoxes;
    prefPatch.activeBuyBoxIndex = guestNorm.activeBuyBoxIndex;
  }

  const guestPrefs = guest.preferences || {};
  const defaultPrefs = defaults.preferences || {};
  for (const [key, value] of Object.entries(guestPrefs)) {
    if (key === 'buyBoxes' || key === 'activeBuyBoxIndex') continue;
    const defaultVal = defaultPrefs[key];
    if (JSON.stringify(value) !== JSON.stringify(defaultVal)) {
      prefPatch[key] = value;
    }
  }

  if (Array.isArray(guest.excludeKeywords) && guest.excludeKeywords.length > 0) {
    patch.excludeKeywords = guest.excludeKeywords;
  }
  if (
    guest.excludeLists &&
    typeof guest.excludeLists === 'object' &&
    Object.keys(guest.excludeLists).length > 0
  ) {
    patch.excludeLists = guest.excludeLists;
  }
  if (guest.currentExcludeList) {
    patch.currentExcludeList = guest.currentExcludeList;
  }
  if (Array.isArray(guest.hiddenDealIds) && guest.hiddenDealIds.length > 0) {
    patch.hiddenDealIds = guest.hiddenDealIds;
  }
  if (guest.visibleColumns && typeof guest.visibleColumns === 'object' && !Array.isArray(guest.visibleColumns)
      && Object.keys(guest.visibleColumns).length > 0) {
    patch.visibleColumns = guest.visibleColumns;
  } else if (Array.isArray(guest.visibleColumns) && guest.visibleColumns.length > 0) {
    patch.visibleColumns = guest.visibleColumns;
  }
  if (guest.dealViewStyle && guest.dealViewStyle !== defaults.dealViewStyle) {
    patch.dealViewStyle = guest.dealViewStyle;
  }

  if (Object.keys(prefPatch).length > 0) {
    patch.preferences = prefPatch;
  }

  if (Object.keys(patch).length === 0) {
    clearGuestSettings();
    if (import.meta.env.DEV) console.log('[mergeGuestSettings] guest settings were defaults; cleared without overwrite');
    return;
  }

  try {
    await userAPI.updateSettings(patch);
    clearGuestSettings();
    if (import.meta.env.DEV) console.log('[mergeGuestSettings] merged guest prefs into account');
  } catch (err) {
    console.warn('[mergeGuestSettings] failed; guest prefs kept locally', err);
  }
}
