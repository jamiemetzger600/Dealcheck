/** Shared underwriting navigation helpers (M2a). */

export function openUnderwritingPopout(dealId) {
  const url = `${window.location.origin}/app/underwriting/${dealId}`;
  const features = 'noopener,noreferrer,width=1400,height=900';
  const w = window.open(url, `vettr-uw-${dealId}`, features);
  if (!w) {
    console.warn('[underwriting] popout blocked; fallback navigate', { dealId });
    return false;
  }
  console.log('[underwriting] popout opened', { dealId, url });
  return true;
}

export const MONEY = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
};

export const X = (n) => (n == null || Number.isNaN(n) ? '—' : `${Number(n).toFixed(2)}x`);
