/**
 * PWA update check: when the deployed version differs from the running build,
 * reload so the user gets the latest (e.g. after adding to home screen on Safari).
 * Runs on load and when the app becomes visible again (return to tab/PWA).
 */

const VERSION_URL = '/version.json';
const STORAGE_KEY = 'vettr_app_version';

function getCurrentVersion() {
  return typeof import.meta.env !== 'undefined' && import.meta.env.VITE_APP_VERSION
    ? String(import.meta.env.VITE_APP_VERSION).trim()
    : null;
}

export function checkForUpdate() {
  const current = getCurrentVersion();
  if (!current) return;

  const url = `${VERSION_URL}?t=${Date.now()}`;
  fetch(url, { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const deployed = data && typeof data.version === 'string' ? data.version.trim() : null;
      if (!deployed) return;
      if (deployed !== current) {
        try {
          localStorage.setItem(STORAGE_KEY, deployed);
        } catch (_) {}
        window.location.reload();
      }
    })
    .catch(() => {});
}

export function initUpdateCheck() {
  checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  });
}
