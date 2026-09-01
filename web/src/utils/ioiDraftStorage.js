/**
 * Per-listing Quick IOI draft (localStorage).
 * Account-level fields (signature, company, default timeline) live in user settings.
 */

const IOI_DRAFT_PREFIX = 'vettr_ioi_draft_';

export function getIoiDraftStorageKey(dealId) {
  if (dealId === undefined || dealId === null || dealId === '') return null;
  return `${IOI_DRAFT_PREFIX}${dealId}`;
}

export function loadIoiDraft(dealId) {
  const key = getIoiDraftStorageKey(dealId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch (err) {
    console.warn('[IOI] load draft failed', err);
    return null;
  }
}

export function saveIoiDraft(dealId, draft) {
  const key = getIoiDraftStorageKey(dealId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err) {
    console.warn('[IOI] save draft failed', err);
  }
}
