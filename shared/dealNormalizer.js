/**
 * Deal Data Normalization
 * Ensures consistent deal data structure across sources
 */

/**
 * Sanitize deal for storage (remove non-serializable data)
 * @param {Object} deal - Raw deal object
 * @returns {Object} - Sanitized deal
 */
export function sanitizeDealForStorage(deal) {
  return {
    id: String(deal.id || ''),
    name: String(deal.name || ''),
    url: String(deal.url || ''),
    description: String(deal.description || '').substring(0, 800),
    broker: String(deal.broker || ''),
    brokerName: String(deal.brokerName || ''),
    brokerCompany: String(deal.brokerCompany || ''),
    brokerEmail: String(deal.brokerEmail || ''),
    brokerPhone: String(deal.brokerPhone || ''),
    source: String(deal.source || ''),
    sourceType: String(deal.sourceType || ''),
    discoveredAt: Number(deal.discoveredAt) || Date.now(),
    askingPrice: Number(deal.askingPrice) || null,
    ebitda: Number(deal.ebitda) || null,
    revenue: Number(deal.revenue) || null,
    location: String(deal.location || ''),
    city: String(deal.city || ''),
    state: String(deal.state || ''),
    county: String(deal.county || ''),
    country: String(deal.country || ''),
    industry: String(deal.industry || ''),
    yearsEstablished: String(deal.yearsEstablished || ''),
    franchise: String(deal.franchise || ''),
    remote: String(deal.remote || ''),
    listingId: String(deal.listingId || '')
  };
}

/**
 * Generate unique deal ID from deal data
 * @param {string} url - Deal URL
 * @param {string} name - Deal name
 * @param {string} source - Source identifier
 * @returns {string} - Unique ID
 */
export function generateDealId(url, name, source) {
  if (url) {
    return `url_${btoa(url).substring(0, 50)}`;
  }
  if (name) {
    return `name_${btoa(name).substring(0, 50)}_${Date.now()}`;
  }
  return `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse numeric value from string (handles $, commas, etc.)
 * @param {string|number} value - Value to parse
 * @returns {number|null} - Parsed number or null
 */
export function parseNumericValue(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;

  const cleaned = String(value)
    .replace(/[$,]/g, '')
    .replace(/[kK]$/, '000')
    .replace(/[mM]$/, '000000')
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency
 */
export function formatCurrency(value, currency = 'USD') {
  if (!value) return 'N/A';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `$${value.toLocaleString()}`;
  }
}

/**
 * Calculate deal metrics
 * @param {Object} deal - Deal object
 * @returns {Object} - Calculated metrics
 */
export function calculateDealMetrics(deal) {
  const metrics = {};

  if (deal.askingPrice && deal.revenue) {
    metrics.revenueMultiple = (deal.askingPrice / deal.revenue).toFixed(2);
  }

  if (deal.askingPrice && deal.ebitda) {
    metrics.ebitdaMultiple = (deal.askingPrice / deal.ebitda).toFixed(2);
  }

  if (deal.ebitda && deal.revenue) {
    metrics.ebitdaMargin = ((deal.ebitda / deal.revenue) * 100).toFixed(1) + '%';
  }

  return metrics;
}
