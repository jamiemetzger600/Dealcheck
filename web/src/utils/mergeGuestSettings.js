
import { userAPI } from './api';
import { clearGuestSettings, hasGuestSettings, loadGuestSettings } from './guestSettings';
import { criteriaFromSlot, normalizeBuyBoxesState } from './buyBoxes';

export async function mergeGuestSettingsIntoAccount() {
  if (!hasGuestSettings()) return;
  const guest = loadGuestSettings();
  const { buyBoxes, activeBuyBoxIndex } = normalizeBuyBoxesState(guest);
  const activeSlot = buyBoxes[activeBuyBoxIndex] || buyBoxes[0];
  const crit = criteriaFromSlot(activeSlot);
  const patch = {
    buyBox: crit,
    excludeKeywords: guest.excludeKeywords,
    excludeLists: guest.excludeLists,
    currentExcludeList: guest.currentExcludeList || null,
    hiddenDealIds: guest.hiddenDealIds || [],
    visibleColumns: guest.visibleColumns,
    dealViewStyle: guest.dealViewStyle,
    preferences: {
      ...(guest.preferences || {}),
      buyBoxes,
      activeBuyBoxIndex,
    },
  };
  try {
    await userAPI.updateSettings(patch);
    clearGuestSettings();
    if (import.meta.env.DEV) console.log('[mergeGuestSettings] merged guest prefs into account');
  } catch (err) {
    console.warn('[mergeGuestSettings] failed; guest prefs kept locally', err);
  }
}
