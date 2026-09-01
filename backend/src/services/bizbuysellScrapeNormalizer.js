/**
 * Maps raw BizBuySell scrape rows into the market_deals shape used by the Vettr Aggregator.
 * Field names match backend/src/services/airtableScraper.js upsert columns.
 */

export const SOURCE_KEY = 'bizbuysell_direct';

const US_STATE_ABBRS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

const MULTI_LOCATION_LABELS = new Set([
  'available in multiple locations',
  'available nationwide',
  'multiple locations',
  'nationwide',
]);

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function computeMultiple(numerator, denominator) {
  const a = toNumber(numerator);
  const b = toNumber(denominator);
  if (!a || !b) return null;
  return Number((a / b).toFixed(2));
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http')) return trimmed;
  if (trimmed.startsWith('/')) return `https://www.bizbuysell.com${trimmed}`;
  return trimmed;
}

/**
 * Parse BizBuySell location strings like "Seattle, WA" or "Kitsap County, WA".
 */
export function parseBizBuySellLocation(location) {
  const empty = { city: null, county: null, state: null, country: 'USA' };
  if (!location || typeof location !== 'string') return empty;

  const raw = location.trim();
  if (!raw) return empty;

  const lower = raw.toLowerCase();
  if (MULTI_LOCATION_LABELS.has(lower)) {
    return { city: null, county: null, state: raw, country: 'USA' };
  }

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return empty;

  if (parts.length === 1) {
    const only = parts[0];
    if (/county$/i.test(only)) return { city: null, county: only, state: null, country: 'USA' };
    if (US_STATE_ABBRS.has(only.toUpperCase())) {
      return { city: null, county: null, state: only.toUpperCase(), country: 'USA' };
    }
    return { city: null, county: null, state: only, country: 'USA' };
  }

  const last = parts[parts.length - 1];
  const state = US_STATE_ABBRS.has(last.toUpperCase()) ? last.toUpperCase() : last;
  const locality = parts.slice(0, -1).join(', ');

  if (/county$/i.test(locality)) {
    return { city: null, county: locality, state, country: 'USA' };
  }

  return { city: locality, county: null, state, country: 'USA' };
}

/**
 * Infer listing type / industry tags from BizBuySell URL path.
 */
export function inferIndustriesFromUrl(url) {
  const normalized = normalizeUrl(url) || '';
  const path = normalized.toLowerCase();

  if (path.includes('/franchise-for-sale/')) return ['Franchise'];
  if (path.includes('/business-asset/')) return ['Asset Sale'];
  if (path.includes('/business-auction/')) return ['Auction'];
  if (path.includes('/business-real-estate-for-sale/')) return ['Real Estate'];
  if (path.includes('/business-opportunity/')) return ['Established Business'];
  return null;
}

export function inferFranchiseFlag(url, title = '') {
  const normalized = normalizeUrl(url) || '';
  if (normalized.toLowerCase().includes('/franchise-for-sale/')) return 'Yes';
  if (/\bfranchise\b/i.test(title || '')) return 'Yes';
  return 'No';
}

function resolveScrapeTimestamp(raw, options = {}) {
  if (options.scrapedAt) return new Date(options.scrapedAt).toISOString();
  if (options.scrapeDate) return new Date(`${options.scrapeDate}T12:00:00.000Z`).toISOString();
  if (raw.source_added_at) return new Date(raw.source_added_at).toISOString();
  return new Date().toISOString();
}

/**
 * Normalize one BizBuySell listing (search-card scrape or BFF listing object).
 */
export function normalizeBizBuySellListing(raw, options = {}) {
  if (!raw) return null;

  const sourceId = raw.id ?? raw.listNumber ?? raw.specificId ?? raw.siteSpecificId;
  if (sourceId == null || String(sourceId).trim() === '') return null;

  const name = raw.title ?? raw.header ?? raw.name ?? null;
  const listingUrl = normalizeUrl(raw.url ?? raw.urlStub ?? raw.listing_url);
  if (!listingUrl) return null;

  const location = parseBizBuySellLocation(raw.location);
  const askingPrice = toNumber(raw.price ?? raw.asking_price);
  const annualProfit = toNumber(raw.cashFlow ?? raw.cash_flow ?? raw.annual_profit);
  const annualRevenue = toNumber(raw.annual_revenue ?? raw.grossRevenue ?? raw.gross_revenue);
  const yearsEstablished = toNumber(raw.years_established ?? raw.yearsEstablished);

  const industries = Array.isArray(raw.industries)
    ? raw.industries.filter(Boolean)
    : inferIndustriesFromUrl(listingUrl);

  const addedAt = raw.recentlyAdded === false ? null : resolveScrapeTimestamp(raw, options);

  return {
    source: SOURCE_KEY,
    source_id: String(sourceId).trim(),
    name,
    description: raw.description ?? null,
    listing_url: listingUrl,
    industries,
    asking_price: askingPrice,
    annual_revenue: annualRevenue,
    annual_profit: annualProfit,
    profit_multiple: toNumber(raw.profit_multiple) ?? computeMultiple(askingPrice, annualProfit),
    revenue_multiple: toNumber(raw.revenue_multiple) ?? computeMultiple(askingPrice, annualRevenue),
    city: location.city,
    county: location.county,
    state: location.state,
    country: location.country,
    years_established: yearsEstablished,
    remote_relocatable: raw.remote_relocatable ?? null,
    franchise: raw.franchise ?? inferFranchiseFlag(listingUrl, name),
    five_plus_years: yearsEstablished != null
      ? (yearsEstablished >= 5 ? 'Yes' : 'No')
      : (raw.five_plus_years ?? null),
    broker_name: raw.broker_name ?? raw.brokerContactFullName ?? null,
    broker_company: raw.broker_company ?? raw.brokerCompany ?? null,
    broker_contact: raw.broker_contact ?? null,
    broker_email: raw.broker_email ?? null,
    source_added_at: addedAt,
    source_updated_at: raw.source_updated_at ?? null,
  };
}

/**
 * Normalize a full scrape payload: { date, listings: [...] }.
 */
export function normalizeBizBuySellScrape(payload, options = {}) {
  const listings = Array.isArray(payload?.listings) ? payload.listings : [];
  const scrapeOptions = {
    scrapeDate: payload?.date ?? options.scrapeDate,
    scrapedAt: payload?.scrapedAt ?? options.scrapedAt,
  };

  const seen = new Set();
  const deals = [];

  for (const raw of listings) {
    const deal = normalizeBizBuySellListing(raw, scrapeOptions);
    if (!deal) continue;
    const key = `${deal.source}:${deal.source_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push(deal);
  }

  return {
    source: SOURCE_KEY,
    scrapeDate: scrapeOptions.scrapeDate ?? null,
    scrapedAt: scrapeOptions.scrapedAt ?? null,
    inputCount: listings.length,
    outputCount: deals.length,
    skipped: listings.length - deals.length,
    deals,
  };
}

/** market_deals columns in upsert order (for validation/logging). */
export const MARKET_DEAL_FIELDS = [
  'source', 'source_id', 'name', 'description', 'industries', 'listing_url',
  'asking_price', 'annual_revenue', 'annual_profit', 'profit_multiple', 'revenue_multiple',
  'city', 'county', 'state', 'country',
  'years_established', 'remote_relocatable', 'franchise', 'five_plus_years',
  'broker_name', 'broker_company', 'broker_contact', 'broker_email',
  'source_added_at', 'source_updated_at',
];

export function validateMarketDealShape(deal) {
  const missing = MARKET_DEAL_FIELDS.filter((field) => !(field in deal));
  return { valid: missing.length === 0, missing };
}
