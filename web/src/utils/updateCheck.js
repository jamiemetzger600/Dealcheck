/**
 * Prompt the service worker to fetch a new release.
 * Do not location.reload() here: a SW can keep serving an old JS bundle while
 * /version.json is already the new version, which caused an infinite refresh loop.
 */

export function checkForUpdate() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration()
    .then((reg) => {
      if (!reg) return;
      console.log('[updateCheck] checking for new service worker');
      return reg.update();
    })
    .catch((err) => {
      console.warn('[updateCheck] SW update failed', err);
    });
}

export function initUpdateCheck() {
  checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  });
}
