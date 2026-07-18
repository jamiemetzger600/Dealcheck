/**
 * Helpers for PWA install detection and the beforeinstallprompt flow.
 */

/** @type {BeforeInstallPromptEvent | null} */
let deferredPrompt = null;
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn(deferredPrompt);
    } catch (err) {
      console.warn('[pwaInstall] listener error', err);
    }
  }
}

/**
 * Call once at app boot so we capture the install prompt early.
 */
export function initPwaInstallCapture() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[pwaInstall] beforeinstallprompt captured');
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('[pwaInstall] appinstalled');
    notify();
  });
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function subscribeInstallPrompt(fn) {
  listeners.add(fn);
  fn(deferredPrompt);
  return () => listeners.delete(fn);
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = typeof navigator !== 'undefined' && navigator.standalone === true;
  return Boolean(mq || iosStandalone);
}

export function getInstallPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  if (isIPhone || isIPad) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isIosSafari() {
  if (getInstallPlatform() !== 'ios') return false;
  const ua = navigator.userAgent || '';
  // Chrome/Firefox/Edge on iOS include CriOS/FxiOS/EdgiOS
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  return !isOtherBrowser;
}

/**
 * Trigger the native install UI when a deferred prompt is available.
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
 */
export async function promptPwaInstall() {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  try {
    deferredPrompt = null;
    notify();
    await event.prompt();
    const choice = await event.userChoice;
    console.log('[pwaInstall] userChoice', choice?.outcome);
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch (err) {
    console.warn('[pwaInstall] prompt failed', err);
    return 'unavailable';
  }
}
