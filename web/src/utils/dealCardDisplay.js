import { normalizeGeoScalar } from './normalizeMarketDeal';

/** State for card metrics; else city, county, country; then combined location line. */
export function cardMetricLocation(deal) {
  const state = normalizeGeoScalar(deal?.state);
  if (state) return { label: 'State', value: state };
  const city = normalizeGeoScalar(deal?.city);
  if (city) return { label: 'City', value: city };
  const county = normalizeGeoScalar(deal?.county);
  if (county) return { label: 'County', value: county };
  const country = normalizeGeoScalar(deal?.country);
  if (country) return { label: 'Country', value: country };
  const locationLine = normalizeGeoScalar(deal?.location);
  if (locationLine) return { label: 'Location', value: locationLine };
  return null;
}

function normalizeCardDescription(description) {
  if (description == null) return '';
  return String(description).replace(/\s+/g, ' ').trim();
}

/** First `maxSentences` sentences for card preview. */
export function cardViewDescriptionPreview(description, maxSentences = 4) {
  const full = normalizeCardDescription(description);
  if (!full) return { preview: '', full: '', truncated: false };
  const sentences = full.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  if (sentences.length === 0) return { preview: full, full, truncated: false };
  if (sentences.length <= maxSentences) {
    return { preview: sentences.join(' '), full, truncated: false };
  }
  return {
    preview: `${sentences.slice(0, maxSentences).join(' ')} …`,
    full,
    truncated: true
  };
}

export function formatMoneyShort(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `$${m}M` : `$${m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k % 1 === 0 ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${n.toLocaleString()}`;
}

export function formatRatio(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isNaN(numeric) ? '—' : numeric.toFixed(2);
}

export function formatDealDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

const MS_PER_DAY = 86_400_000;
const AGE_BUCKETS = [
  { max: 14, cls: 'deal-date-age--fresh', label: 'fresh' },
  { max: 28, cls: 'deal-date-age--recent', label: 'recent' },
  { max: 56, cls: 'deal-date-age--aging', label: 'aging' },
];

function getListingAgeDays(discoveredAt) {
  if (!discoveredAt) return null;
  const d = new Date(discoveredAt);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_DAY);
}

export function getListingAgeClass(discoveredAt) {
  const days = getListingAgeDays(discoveredAt);
  if (days == null) return '';
  for (const b of AGE_BUCKETS) {
    if (days < b.max) return b.cls;
  }
  return 'deal-date-age--older';
}

export function listingAgeTitle(discoveredAt) {
  const days = getListingAgeDays(discoveredAt);
  const dateStr = formatDealDate(discoveredAt);
  if (days == null) return dateStr;
  if (days === 0) return `${dateStr} — today`;
  if (days === 1) return `${dateStr} — 1 day ago`;
  return `${dateStr} — ${days} days ago`;
}
