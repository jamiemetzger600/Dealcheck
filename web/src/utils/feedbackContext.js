/** Client diagnostics + error buffers for feedback / agent handoff. */

const MAX_ERRORS = 12;
const MAX_API = 12;
const errors = [];
const apiEvents = [];

function pushBounded(buf, entry, max) {
  buf.push({ ...entry, at: new Date().toISOString() });
  if (buf.length > max) buf.shift();
}

let installed = false;

export function installFeedbackErrorCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    pushBounded(errors, {
      type: 'error',
      message: event.message || String(event.error || 'error'),
      source: event.filename || null,
      line: event.lineno || null,
      col: event.colno || null,
      stack: event.error?.stack ? String(event.error.stack).slice(0, 1500) : null,
    }, MAX_ERRORS);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    pushBounded(errors, {
      type: 'unhandledrejection',
      message: reason?.message || String(reason || 'rejection'),
      stack: reason?.stack ? String(reason.stack).slice(0, 1500) : null,
    }, MAX_ERRORS);
  });
}

/** Record failed API calls from api.js for feedback context. */
export function recordApiFailure({ method, endpoint, status, message }) {
  pushBounded(apiEvents, {
    type: 'api',
    method: method || 'GET',
    endpoint: endpoint || null,
    status: status ?? null,
    message: message ? String(message).slice(0, 300) : null,
  }, MAX_API);
}

export function getRecentClientErrors() {
  return [...errors];
}

export function getRecentApiFailures() {
  return [...apiEvents];
}

function safeLocalStorageSummary() {
  const SECRET = /^(token|.*password.*|.*secret.*|.*jwt.*)$/i;
  try {
    const all = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && !SECRET.test(k)) all.push(k);
    }
    const calcKeys = all.filter((k) => k.startsWith('vettr_calc_'));
    const other = all.filter((k) => !k.startsWith('vettr_calc_'));
    return {
      keyCount: all.length,
      calcCacheCount: calcKeys.length,
      keys: other.slice(0, 30),
    };
  } catch {
    return { keyCount: 0, calcCacheCount: 0, keys: [] };
  }
}

function activeTabLabel() {
  try {
    const el = document.querySelector('.tab-btn.active span');
    return el?.textContent?.trim() || null;
  } catch {
    return null;
  }
}

function workspaceLabel() {
  try {
    const sel = document.querySelector('.nav-team-switcher select');
    if (!sel) return null;
    const opt = sel.options[sel.selectedIndex];
    return opt?.text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Snapshot of browser/app state attached to every feedback submission.
 */
export function collectClientDiagnostics({ captureMode } = {}) {
  if (typeof window === 'undefined') return {};

  const nav = window.navigator || {};
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const mem = performance?.memory;
  const vv = window.visualViewport;

  return {
    capturedAt: new Date().toISOString(),
    captureMode: captureMode || null,
    location: {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer || null,
    },
    browser: {
      userAgent: nav.userAgent || null,
      language: nav.language || null,
      languages: Array.isArray(nav.languages) ? [...nav.languages].slice(0, 8) : null,
      platform: nav.platform || null,
      vendor: nav.vendor || null,
      cookieEnabled: nav.cookieEnabled ?? null,
      onLine: nav.onLine ?? null,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
      maxTouchPoints: nav.maxTouchPoints ?? null,
      pdfViewerEnabled: nav.pdfViewerEnabled ?? null,
    },
    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      availWidth: window.screen?.availWidth ?? null,
      availHeight: window.screen?.availHeight ?? null,
      colorDepth: window.screen?.colorDepth ?? null,
      pixelRatio: window.devicePixelRatio ?? null,
    },
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      visualWidth: vv?.width ?? null,
      visualHeight: vv?.height ?? null,
      visualScale: vv?.scale ?? null,
    },
    timezone: {
      name: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      offsetMinutes: new Date().getTimezoneOffset(),
    },
    network: conn
      ? {
          effectiveType: conn.effectiveType || null,
          downlink: conn.downlink ?? null,
          rtt: conn.rtt ?? null,
          saveData: conn.saveData ?? null,
        }
      : null,
    memory: mem
      ? {
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
          totalJSHeapSize: mem.totalJSHeapSize,
          usedJSHeapSize: mem.usedJSHeapSize,
        }
      : null,
    document: {
      visibilityState: document.visibilityState,
      readyState: document.readyState,
      title: document.title || null,
    },
    media: {
      prefersColorScheme: window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
        ? 'dark'
        : 'light',
      prefersReducedMotion: Boolean(
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ),
    },
    appUi: {
      activeTab: activeTabLabel(),
      workspace: workspaceLabel(),
      hasAuthToken: Boolean(localStorage.getItem('token')),
      localStorage: safeLocalStorageSummary(),
    },
    consoleErrors: getRecentClientErrors(),
    apiFailures: getRecentApiFailures(),
  };
}

/** Format diagnostics for “Copy for agent” clipboard. */
export function formatDiagnosticsForAgent(metadata, submission = {}) {
  const m = metadata && typeof metadata === 'object' ? metadata : {};
  const loc = m.location || {};
  const browser = m.browser || {};
  const screen = m.screen || {};
  const viewport = m.viewport || submission.viewport || {};
  const tz = m.timezone || {};
  const net = m.network;
  const mem = m.memory;
  const appUi = m.appUi || {};
  const lines = [
    '### Environment',
    `User agent: ${submission.user_agent || browser.userAgent || '(unknown)'}`,
    `Language: ${browser.language || '(unknown)'} · Platform: ${browser.platform || '(unknown)'}`,
    `Online: ${browser.onLine ?? '(unknown)'} · Cookies: ${browser.cookieEnabled ?? '(unknown)'}`,
    `Timezone: ${tz.name || '(unknown)'} (offset ${tz.offsetMinutes ?? '?'} min)`,
    `Screen: ${screen.width || '?'}×${screen.height || '?'} @${screen.pixelRatio || '?'}x`,
    `Viewport: ${viewport.innerWidth || viewport.w || '?'}×${viewport.innerHeight || viewport.h || '?'} (scroll ${viewport.scrollX ?? 0},${viewport.scrollY ?? 0})`,
    net
      ? `Network: ${net.effectiveType || '?'} downlink=${net.downlink ?? '?'} rtt=${net.rtt ?? '?'}`
      : 'Network: (not available)',
    mem
      ? `JS heap used: ${Math.round((mem.usedJSHeapSize || 0) / 1048576)}MB / ${Math.round((mem.totalJSHeapSize || 0) / 1048576)}MB`
      : 'JS heap: (not available)',
    `Color scheme: ${m.media?.prefersColorScheme || '?'} · Reduced motion: ${m.media?.prefersReducedMotion ?? '?'}`,
    '',
    '### App UI state',
    `Active tab: ${appUi.activeTab || '(unknown)'}`,
    `Workspace: ${appUi.workspace || '(unknown)'}`,
    `Auth token present: ${appUi.hasAuthToken ?? '(unknown)'}`,
    `Path: ${loc.pathname || '(unknown)'}${loc.search || ''}${loc.hash || ''}`,
    `Capture mode: ${m.captureMode || '(unknown)'}`,
    `Diag captured at: ${m.capturedAt || '(unknown)'}`,
    `localStorage: ${appUi.localStorage?.keyCount ?? 0} keys` +
      (appUi.localStorage?.calcCacheCount
        ? ` (${appUi.localStorage.calcCacheCount} deal-calc caches omitted)`
        : ''),
    `Notable keys: ${(appUi.localStorage?.keys || appUi.localStorageKeys || []).join(', ') || '(none)'}`,
    '',
    '### Console errors',
    (m.consoleErrors || []).length
      ? JSON.stringify(m.consoleErrors, null, 2)
      : '(none captured)',
    '',
    '### Recent API failures',
    (m.apiFailures || []).length
      ? JSON.stringify(m.apiFailures, null, 2)
      : '(none captured)',
  ];
  return lines.join('\n');
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}
