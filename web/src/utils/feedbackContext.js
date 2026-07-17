/** Ring buffer of recent client errors for feedback context. */
const MAX = 8;
const errors = [];

function push(entry) {
  errors.push({ ...entry, at: new Date().toISOString() });
  if (errors.length > MAX) errors.shift();
}

let installed = false;

export function installFeedbackErrorCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    push({
      type: 'error',
      message: event.message || String(event.error || 'error'),
      source: event.filename || null,
      line: event.lineno || null,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    push({
      type: 'unhandledrejection',
      message: reason?.message || String(reason || 'rejection'),
    });
  });
}

export function getRecentClientErrors() {
  return [...errors];
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
