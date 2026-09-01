export const MONEY = (n) => {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);
};

export const PCT = (n, digits = 1) => {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
};

export const X = (n) => (n == null || Number.isNaN(n) ? '—' : `${Number(n).toFixed(2)}x`);

export const PCT_INPUT = (decimal) => {
  if (decimal == null || Number.isNaN(Number(decimal))) return '';
  const n = Number(decimal);
  // Accept both 0.085 and 8.5 styles in display as percent points for rates stored as percent
  return n;
};

export function val(shared, key, fallback = '') {
  const v = shared?.[key];
  if (v && typeof v === 'object' && 'value' in v) return v.value ?? fallback;
  return v ?? fallback;
}
