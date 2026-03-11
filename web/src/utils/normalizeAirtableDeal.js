/**
 * Maps a single Airtable API row (snake_case DB columns from /api/airtable-deals)
 * into the same camelCase deal shape that DealAggregator uses internally.
 */

function computeMultiple(price, base) {
  if (!price || !base) return null;
  return Number((price / base).toFixed(2));
}

export function normalizeAirtableDeal(row) {
  const city = row.city || '';
  const state = row.state || '';
  const location = (city && state) ? `${city}, ${state}` : (city || state || '');
  const brokerName = row.broker_name || '';
  const brokerCompany = row.broker_company || '';
  const broker = brokerName && brokerCompany
    ? `${brokerName} (${brokerCompany})`
    : (brokerName || brokerCompany);

  const ebitda = row.annual_profit != null ? Number(row.annual_profit) : null;
  const revenue = row.annual_revenue != null ? Number(row.annual_revenue) : null;
  const askingPrice = row.asking_price != null ? Number(row.asking_price) : null;

  const industries = Array.isArray(row.industries) ? row.industries.join(', ') : (row.industries || '');

  return {
    id: `airtable_${row.airtable_id || row.id}`,
    name: row.name || 'Unnamed Business',
    url: row.listing_url || '',
    industry: industries,
    description: row.description || '',
    location,
    city,
    state,
    county: row.county || '',
    country: row.country || '',
    yearsEstablished: row.years_established != null ? String(row.years_established) : '',
    ebitda,
    revenue,
    askingPrice,
    profitMultiple: row.profit_multiple != null ? Number(row.profit_multiple) : computeMultiple(askingPrice, ebitda),
    revenueMultiple: row.revenue_multiple != null ? Number(row.revenue_multiple) : computeMultiple(askingPrice, revenue),
    remote: row.remote_relocatable || '',
    franchise: row.franchise || '',
    fiveYearsInBusiness: row.five_plus_years || '',
    broker,
    brokerName,
    brokerCompany,
    brokerPhone: row.broker_contact || '',
    brokerEmail: row.broker_email || '',
    source: 'Airtable (BizBuySell)',
    sourceType: 'airtable',
    discoveredAt: row.airtable_added_at ? new Date(row.airtable_added_at).getTime() : Date.now(),
  };
}

const PAGE_SIZE = 500;

/**
 * Fetches a single page from /api/airtable-deals.
 * @param {AbortSignal} [signal] - Optional abort signal to cancel the request.
 * @returns {{ deals: Array, total: number, limit: number, offset: number }}
 */
export async function fetchAirtableDealsPage(apiBaseUrl, offset = 0, limit = PAGE_SIZE, signal = undefined) {
  const url = `${apiBaseUrl}/airtable-deals?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const err = new Error(`Airtable deals API error (${res.status})`);
    err.url = url;
    throw err;
  }
  const data = await res.json();
  const rows = data.deals || [];
  return {
    deals: rows.map(normalizeAirtableDeal),
    total: typeof data.total === 'number' ? data.total : rows.length,
    limit: data.limit || limit,
    offset: data.offset ?? offset
  };
}

/**
 * Fetches first page only for fast initial paint. Use with appendPage for progressive load.
 */
export async function fetchFirstPageAirtableDeals(apiBaseUrl, limit = 400, signal = undefined) {
  const safeLimit = Math.min(Math.max(Number(limit) || 400, 1), 500);
  const page = await fetchAirtableDealsPage(apiBaseUrl, 0, safeLimit, signal);
  console.log(`[Airtable feed] First page: ${page.deals.length} of ${page.total}`);
  return page;
}

/**
 * Fetches all pages from /api/airtable-deals (used for non-airtable or fallback).
 */
export async function fetchAllAirtableDeals(apiBaseUrl) {
  let offset = 0;
  let allDeals = [];
  let hasMore = true;

  while (hasMore) {
    const { deals, total } = await fetchAirtableDealsPage(apiBaseUrl, offset, PAGE_SIZE);
    allDeals = allDeals.concat(deals);
    if (deals.length < PAGE_SIZE || allDeals.length >= total) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
    }
  }

  console.log(`[Airtable feed] Loaded ${allDeals.length} deals total`);
  return allDeals;
}
