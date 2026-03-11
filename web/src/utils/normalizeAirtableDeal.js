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

/**
 * Fetches all pages from /api/airtable-deals and returns normalized deals.
 */
export async function fetchAllAirtableDeals(apiBaseUrl) {
  const PAGE_SIZE = 500;
  let offset = 0;
  let allDeals = [];
  let hasMore = true;

  while (hasMore) {
    const url = `${apiBaseUrl}/airtable-deals?limit=${PAGE_SIZE}&offset=${offset}`;
    console.log(`[Airtable feed] Fetching offset=${offset}...`, url);
    const res = await fetch(url);
    if (!res.ok) {
      const err = new Error(`Airtable deals API error (${res.status})`);
      err.url = url;
      throw err;
    }

    const data = await res.json();
    const rows = data.deals || [];
    const normalized = rows.map(normalizeAirtableDeal);
    allDeals = allDeals.concat(normalized);

    if (rows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
    }
  }

  console.log(`[Airtable feed] Loaded ${allDeals.length} deals total`);
  return allDeals;
}
