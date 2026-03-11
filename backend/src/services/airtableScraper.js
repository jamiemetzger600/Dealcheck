import cron from 'node-cron';
import pool from '../db/pool.js';

// ---------------------------------------------------------------------------
// Config — all tuneable via env vars
// ---------------------------------------------------------------------------
const AIRTABLE_SHARE_URL =
  process.env.AIRTABLE_SHARE_URL ||
  'https://airtable.com/appEGxhjno0HTpEco/shrUhtbnzZTPaR4Lk/tblACIQ9QNiVmoWSK';

// Cron expression: default every 30 minutes
const SCRAPE_CRON =
  process.env.AIRTABLE_SCRAPE_CRON || '*/30 * * * *';

// Toggle the scraper on/off without removing code
const SCRAPE_ENABLED =
  (process.env.AIRTABLE_SCRAPE_ENABLED || 'true') === 'true';

// ---------------------------------------------------------------------------
// Airtable column name → DB column + type handler
// ---------------------------------------------------------------------------
const COLUMN_MAP = {
  'ID':                                { db: 'airtable_id',        type: 'number' },
  'Name':                              { db: 'name',               type: 'text' },
  'Description':                       { db: 'description',        type: 'text' },
  'Industry':                          { db: 'industries',         type: 'multiSelect' },
  'Asking Price':                      { db: 'asking_price',       type: 'number' },
  'Annual Revenue':                    { db: 'annual_revenue',     type: 'number' },
  'Annual Profit':                     { db: 'annual_profit',      type: 'number' },
  'Profit Multiple':                   { db: 'profit_multiple',    type: 'number' },
  'Revenue Multiple':                  { db: 'revenue_multiple',   type: 'number' },
  'Years Established':                 { db: 'years_established',  type: 'number' },
  'City':                              { db: 'city',               type: 'text' },
  'County':                            { db: 'county',             type: 'text' },
  'State':                             { db: 'state',              type: 'text' },
  'Country':                           { db: 'country',            type: 'text' },
  'Remote/Relocatable/Absentee-Run':   { db: 'remote_relocatable', type: 'select' },
  'Franchise':                         { db: 'franchise',          type: 'select' },
  '5+ Years In Business':              { db: 'five_plus_years',    type: 'select' },
  'Broker Name':                       { db: 'broker_name',        type: 'text' },
  'Broker Company':                    { db: 'broker_company',     type: 'text' },
  'Broker Contact':                    { db: 'broker_contact',     type: 'text' },
  'Broker Email':                      { db: 'broker_email',       type: 'text' },
  'Listing':                           { db: 'listing_url',        type: 'button' },
  'Last Updated':                      { db: 'airtable_updated_at', type: 'date' },
  'Date Added':                        { db: 'airtable_added_at',   type: 'date' },
};

// ---------------------------------------------------------------------------
// Step 1: Fetch the shared-view HTML page & collect cookies
// ---------------------------------------------------------------------------
async function fetchSharedViewPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTML fetch failed: ${res.status}`);

  // Collect Set-Cookie headers
  const cookies = (res.headers.getSetCookie?.() || [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const html = await res.text();
  return { html, cookies };
}

// ---------------------------------------------------------------------------
// Step 2: Extract API parameters embedded in the page JS
// ---------------------------------------------------------------------------
function extractApiParams(html) {
  // urlWithParams — try multiple patterns
  const urlPatterns = [
    /urlWithParams\s*:\s*["']([^"']*readSharedViewData[^"']*)["']/,
    /"urlWithParams"\s*:\s*"([^"]*readSharedViewData[^"]*)"/,
    /urlWithParams["'\s]*:["'\s]*["']([^"']+)["']/,
  ];

  let urlWithParams = null;
  for (const pat of urlPatterns) {
    const m = html.match(pat);
    if (m) {
      // Decode unicode escapes like \u002F → /
      urlWithParams = m[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );
      break;
    }
  }
  if (!urlWithParams) throw new Error('Could not find urlWithParams in HTML');

  // Application ID
  const appMatch = html.match(
    /x-airtable-application-id["']?\s*:\s*["']?(app[a-zA-Z0-9]+)["']?/
  );
  const appId = appMatch ? appMatch[1] : AIRTABLE_SHARE_URL.match(/app[a-zA-Z0-9]+/)?.[0];

  // Page-load ID
  const pglMatch = html.match(
    /x-airtable-page-load-id["']?\s*:\s*["']?(pgl[a-zA-Z0-9]+)["']?/
  );
  const pageLoadId = pglMatch ? pglMatch[1] : null;

  return { urlWithParams, appId, pageLoadId };
}

// ---------------------------------------------------------------------------
// Step 3: Call the readSharedViewData internal API
// ---------------------------------------------------------------------------
async function fetchSharedViewData({ urlWithParams, appId, pageLoadId, cookies }) {
  const fullUrl = `https://airtable.com${urlWithParams}`;

  const headers = {
    Cookie: cookies,
    'X-Requested-With': 'XMLHttpRequest',
    'x-airtable-inter-service-client': 'webClient',
    'x-user-locale': 'en',
    'x-time-zone': 'America/New_York',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
    Referer: AIRTABLE_SHARE_URL,
  };
  if (appId) headers['x-airtable-application-id'] = appId;
  if (pageLoadId) headers['x-airtable-page-load-id'] = pageLoadId;

  const res = await fetch(fullUrl, { headers });
  if (!res.ok) throw new Error(`API call failed: ${res.status}`);

  return res.json();
}

// ---------------------------------------------------------------------------
// Step 4: Build column map & resolve cell values
// ---------------------------------------------------------------------------
function buildColumnLookup(columns) {
  const lookup = {}; // colId → { name, type, choices, dbField, handleType }
  for (const col of columns) {
    const name = col.name;
    const mapping = COLUMN_MAP[name];
    if (!mapping) continue;

    const choices = {};
    const opts = col.typeOptions || {};
    if (opts.choices) {
      for (const [key, val] of Object.entries(opts.choices)) {
        choices[key] = val.name || key;
      }
    }

    lookup[col.id] = {
      name,
      airtableType: col.type,
      choices,
      dbField: mapping.db,
      handleType: mapping.type,
    };
  }
  return lookup;
}

function resolveCell(value, handleType, choices) {
  if (value == null) return null;

  switch (handleType) {
    case 'number':
    case 'text':
    case 'date':
      return value;
    case 'select':
      return choices[value] ?? value;
    case 'multiSelect':
      if (Array.isArray(value)) return value.map((v) => choices[v] ?? v);
      return value;
    case 'button':
      if (typeof value === 'object' && value !== null) return value.url || value.label || null;
      return value;
    default:
      return value;
  }
}

function parseRows(rows, colLookup) {
  return rows.map((row) => {
    const record = {};
    const cells = row.cellValuesByColumnId || {};
    for (const [colId, value] of Object.entries(cells)) {
      const col = colLookup[colId];
      if (!col) continue;
      record[col.dbField] = resolveCell(value, col.handleType, col.choices);
    }
    return record;
  });
}

// ---------------------------------------------------------------------------
// Database upsert — bulk insert/update via airtable_id
// ---------------------------------------------------------------------------
async function upsertDeals(deals) {
  if (deals.length === 0) return { inserted: 0, updated: 0 };

  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const deal of deals) {
      if (!deal.airtable_id) continue;

      const result = await client.query(
        `INSERT INTO airtable_deals (
          airtable_id, name, description, industries, listing_url,
          asking_price, annual_revenue, annual_profit, profit_multiple, revenue_multiple,
          city, county, state, country,
          years_established, remote_relocatable, franchise, five_plus_years,
          broker_name, broker_company, broker_contact, broker_email,
          airtable_updated_at, airtable_added_at,
          last_scraped_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24,
          NOW()
        )
        ON CONFLICT (airtable_id) DO UPDATE SET
          name              = EXCLUDED.name,
          description       = EXCLUDED.description,
          industries        = EXCLUDED.industries,
          listing_url       = EXCLUDED.listing_url,
          asking_price      = EXCLUDED.asking_price,
          annual_revenue    = EXCLUDED.annual_revenue,
          annual_profit     = EXCLUDED.annual_profit,
          profit_multiple   = EXCLUDED.profit_multiple,
          revenue_multiple  = EXCLUDED.revenue_multiple,
          city              = EXCLUDED.city,
          county            = EXCLUDED.county,
          state             = EXCLUDED.state,
          country           = EXCLUDED.country,
          years_established = EXCLUDED.years_established,
          remote_relocatable = EXCLUDED.remote_relocatable,
          franchise         = EXCLUDED.franchise,
          five_plus_years   = EXCLUDED.five_plus_years,
          broker_name       = EXCLUDED.broker_name,
          broker_company    = EXCLUDED.broker_company,
          broker_contact    = EXCLUDED.broker_contact,
          broker_email      = EXCLUDED.broker_email,
          airtable_updated_at = EXCLUDED.airtable_updated_at,
          airtable_added_at   = EXCLUDED.airtable_added_at,
          last_scraped_at     = NOW()
        RETURNING (xmax = 0) AS is_insert`,
        [
          deal.airtable_id,
          deal.name || null,
          deal.description || null,
          deal.industries || null,
          deal.listing_url || null,
          deal.asking_price ?? null,
          deal.annual_revenue ?? null,
          deal.annual_profit ?? null,
          deal.profit_multiple ?? null,
          deal.revenue_multiple ?? null,
          deal.city || null,
          deal.county || null,
          deal.state || null,
          deal.country || null,
          deal.years_established ?? null,
          deal.remote_relocatable || null,
          deal.franchise || null,
          deal.five_plus_years || null,
          deal.broker_name || null,
          deal.broker_company || null,
          deal.broker_contact || null,
          deal.broker_email || null,
          deal.airtable_updated_at || null,
          deal.airtable_added_at || null,
        ]
      );

      if (result.rows[0]?.is_insert) inserted++;
      else updated++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { inserted, updated };
}

// ---------------------------------------------------------------------------
// Main scrape orchestration
// ---------------------------------------------------------------------------
let _isRunning = false;
let _lastRun = null;
let _lastResult = null;

export async function scrapeAirtable() {
  if (_isRunning) {
    console.log('  Airtable scrape already running, skipping');
    return _lastResult;
  }

  _isRunning = true;
  const start = Date.now();

  try {
    console.log('  Step 1/4: Fetching shared view HTML...');
    const { html, cookies } = await fetchSharedViewPage(AIRTABLE_SHARE_URL);

    console.log('  Step 2/4: Extracting API parameters...');
    const { urlWithParams, appId, pageLoadId } = extractApiParams(html);

    console.log('  Step 3/4: Calling readSharedViewData API...');
    const json = await fetchSharedViewData({ urlWithParams, appId, pageLoadId, cookies });

    const table = json?.data?.table;
    if (!table) throw new Error('Unexpected response shape — no data.table');

    const columns = table.columns || [];
    const rows = table.rows || [];
    console.log(`  Found ${columns.length} columns, ${rows.length} rows`);

    console.log('  Step 4/4: Parsing & upserting to database...');
    const colLookup = buildColumnLookup(columns);
    const deals = parseRows(rows, colLookup);
    const { inserted, updated } = await upsertDeals(deals);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    _lastResult = { rows: rows.length, inserted, updated, elapsed, ts: new Date().toISOString() };
    _lastRun = new Date();

    console.log(
      `  Done: ${rows.length} rows (${inserted} new, ${updated} updated) in ${elapsed}s`
    );
    return _lastResult;
  } catch (err) {
    console.error('  Airtable scrape error:', err.message);
    _lastResult = { error: err.message, ts: new Date().toISOString() };
    throw err;
  } finally {
    _isRunning = false;
  }
}

export function getScraperStatus() {
  return {
    enabled: SCRAPE_ENABLED,
    cron: SCRAPE_CRON,
    isRunning: _isRunning,
    lastRun: _lastRun,
    lastResult: _lastResult,
  };
}

// ---------------------------------------------------------------------------
// Cron schedule
// ---------------------------------------------------------------------------
if (SCRAPE_ENABLED) {
  cron.schedule(SCRAPE_CRON, async () => {
    console.log('🔄 [Airtable] Scheduled scrape starting...');
    try {
      await scrapeAirtable();
    } catch {
      // Error already logged inside scrapeAirtable
    }
  });

  console.log(`✅ Airtable scraper scheduled (cron: ${SCRAPE_CRON})`);

  // Run once on startup after a short delay so the server finishes booting
  setTimeout(() => {
    console.log('🔄 [Airtable] Initial scrape on startup...');
    scrapeAirtable().catch(() => {});
  }, 5000);
} else {
  console.log('⏸️  Airtable scraper disabled (AIRTABLE_SCRAPE_ENABLED=false)');
}
