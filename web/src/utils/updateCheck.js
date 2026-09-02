/**
 * Keep the installed PWA on the latest Cloudflare Pages build.
 *
 * iOS home-screen apps often leave a new service worker in "waiting" and do
 * not fire controllerchange, so a fetch of sw.js is not enough — we skip-wait
 * and reload once. sessionStorage prevents a reload loop.
 */

const SW_URL = '/sw.js';
const RELOAD_KEY = 'vettr_pwa_reload_for';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

let started = false;
let reloading = false;
let checkTimer = null;

function currentControllerUrl() {
  try {
    return navigator.serviceWorker.controller?.scriptURL || '';
  } catch {
    return '';
  }
}

function alreadyReloadedFor(token) {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === token;
  } catch {
    return false;
  }
}

function markReloadedFor(token) {
  try {
    sessionStorage.setItem(RELOAD_KEY, token);
  } catch {}
}

function reloadOnce(token) {
  if (!token || reloading || alreadyReloadedFor(token)) return;
  reloading = true;
  markReloadedFor(token);
  console.log('[updateCheck] applying new service worker', token);
  window.location.reload();
}

function activateWaiting(reg) {
  const waiting = reg?.waiting;
  if (!waiting) return false;
  const token = waiting.scriptURL || `waiting:${Date.now()}`;
  if (alreadyReloadedFor(token)) return true;
  console.log('[updateCheck] skipWaiting', token);
  waiting.postMessage({ type: 'SKIP_WAITING' });
  // iOS/WebKit often never fires controllerchange — reload after skipWaiting.
  window.setTimeout(() => reloadOnce(token), 900);
  return true;
}

function watchInstalling(reg) {
  const worker = reg.installing;
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      activateWaiting(reg);
    }
  });
}

export async function checkForUpdate() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, {
      scope: '/',
      updateViaCache: 'none'
    });
    console.log('[updateCheck] checking for new service worker');
    await reg.update();
    if (reg.waiting) {
      activateWaiting(reg);
      return;
    }
    if (reg.installing) {
      watchInstalling(reg);
    }
  } catch (err) {
    console.warn('[updateCheck] SW update failed', err);
  }
}

export function initUpdateCheck() {
  if (started) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  started = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const url = currentControllerUrl() || 'controllerchange';
    console.log('[updateCheck] controllerchange', url);
    reloadOnce(url);
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data?.type === 'WAITING') {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) activateWaiting(reg);
      });
    }
  });

  void checkForUpdate();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) void checkForUpdate();
  });

  window.addEventListener('online', () => {
    void checkForUpdate();
  });

  checkTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  }, CHECK_INTERVAL_MS);

  if (import.meta.env.DEV) {
    console.log('[updateCheck] interval started', CHECK_INTERVAL_MS);
  }

  return () => {
    if (checkTimer) window.clearInterval(checkTimer);
  };
}
