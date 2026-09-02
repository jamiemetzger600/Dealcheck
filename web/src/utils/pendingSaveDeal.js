export const PENDING_SAVE_STORAGE_KEY = 'vettr_pending_save_db_id';

const inFlight = new Set();

export function setPendingSaveDealDbId(dbId) {
  if (dbId == null || dbId === '') return;
  try {
    sessionStorage.setItem(PENDING_SAVE_STORAGE_KEY, String(dbId));
    console.log('[pendingSave] queued', dbId);
  } catch (err) {
    console.warn('[pendingSave] set failed', err);
  }
}

export function peekPendingSaveDealDbId() {
  try {
    return sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function takePendingSaveDealDbId() {
  try {
    const id = sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY);
    if (id) sessionStorage.removeItem(PENDING_SAVE_STORAGE_KEY);
    return id || null;
  } catch {
    return null;
  }
}

/** Returns true if this tab should run the pending save (once across Strict Mode remounts). */
export function claimPendingSaveDealDbId() {
  const id = peekPendingSaveDealDbId();
  if (!id || inFlight.has(id)) return null;
  inFlight.add(id);
  takePendingSaveDealDbId();
  return id;
}

