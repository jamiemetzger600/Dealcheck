import pool from '../db/pool.js';

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Resolve market_deals.id from client payload or composite deal_id.
 */
export async function resolveMarketDealId({ marketDealId, dealId, listingId, source }) {
  const direct = Number(marketDealId ?? listingId);
  if (Number.isFinite(direct) && direct > 0) {
    const row = await pool.query('SELECT id FROM market_deals WHERE id = $1 LIMIT 1', [direct]);
    if (row.rows.length > 0) return row.rows[0].id;
  }

  if (dealId && typeof dealId === 'string' && dealId.includes('_')) {
    const underscore = dealId.indexOf('_');
    const src = dealId.slice(0, underscore);
    const sid = dealId.slice(underscore + 1);
    if (src && sid) {
      const row = await pool.query(
        'SELECT id FROM market_deals WHERE source = $1 AND source_id = $2 LIMIT 1',
        [src, sid]
      );
      if (row.rows.length > 0) return row.rows[0].id;
    }
  }

  if (source && listingId) {
    const row = await pool.query(
      'SELECT id FROM market_deals WHERE source = $1 AND source_id = $2 LIMIT 1',
      [source, String(listingId)]
    );
    if (row.rows.length > 0) return row.rows[0].id;
  }

  return null;
}

async function fetchMarketDealRow(marketDealId) {
  if (!marketDealId) return null;
  const result = await pool.query(
    `SELECT id, name, description, listing_url, industries, asking_price, annual_revenue,
            annual_profit, profit_multiple, revenue_multiple, city, county, state, country,
            years_established, remote_relocatable, franchise, five_plus_years,
            broker_name, broker_company, broker_contact, broker_email, source, source_id,
            source_added_at, source_updated_at
     FROM market_deals WHERE id = $1`,
    [marketDealId]
  );
  return result.rows[0] || null;
}

function industriesLabel(industries) {
  if (Array.isArray(industries)) return industries.filter(Boolean).join(', ');
  return industries || null;
}

function locationFromMarket(row) {
  const city = row.city || '';
  const state = row.state || '';
  if (city && state) return `${city}, ${state}`;
  return city || state || row.county || row.country || null;
}

/**
 * Apply listing row fields onto saved_deals (point-in-time snapshot refresh).
 */
async function applyMarketSnapshot(savedDealId, userId, marketRow) {
  await pool.query(
    `UPDATE saved_deals SET
      market_deal_id = $1,
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      url = COALESCE($4, url),
      asking_price = COALESCE($5, asking_price),
      ebitda = COALESCE($6, ebitda),
      revenue = COALESCE($7, revenue),
      location = COALESCE($8, location),
      city = COALESCE($9, city),
      state = COALESCE($10, state),
      county = COALESCE($11, county),
      country = COALESCE($12, country),
      industry = COALESCE($13, industry),
      years_established = COALESCE($14, years_established),
      franchise = COALESCE($15, franchise),
      remote = COALESCE($16, remote),
      broker_name = COALESCE($17, broker_name),
      broker_company = COALESCE($18, broker_company),
      broker_phone = COALESCE($19, broker_phone),
      broker_email = COALESCE($20, broker_email),
      broker = COALESCE($21, broker),
      source = COALESCE($22, source),
      listing_snapshot_at = NOW(),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $23 AND user_id = $24`,
    [
      marketRow.id,
      marketRow.name,
      marketRow.description,
      marketRow.listing_url,
      marketRow.asking_price,
      marketRow.annual_profit,
      marketRow.annual_revenue,
      locationFromMarket(marketRow),
      marketRow.city,
      marketRow.state,
      marketRow.county,
      marketRow.country,
      industriesLabel(marketRow.industries),
      marketRow.years_established != null ? String(marketRow.years_established) : null,
      marketRow.franchise,
      marketRow.remote_relocatable,
      marketRow.broker_name,
      marketRow.broker_company,
      marketRow.broker_contact,
      marketRow.broker_email,
      marketRow.broker_name && marketRow.broker_company
        ? `${marketRow.broker_name} (${marketRow.broker_company})`
        : (marketRow.broker_name || marketRow.broker_company),
      marketRow.source,
      savedDealId,
      userId
    ]
  );
}

async function findOrCreateCompany(userId, name, companyType = 'brokerage') {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  const existing = await pool.query(
    `SELECT id FROM companies WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER($2) LIMIT 1`,
    [userId, trimmed]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await pool.query(
    `INSERT INTO companies (user_id, name, company_type) VALUES ($1, $2, $3) RETURNING id`,
    [userId, trimmed, companyType]
  );
  return inserted.rows[0].id;
}

async function findOrCreateContact(userId, { name, email, phone, companyId }) {
  const emailNorm = normalizeEmail(email);
  if (emailNorm) {
    const byEmail = await pool.query(
      `SELECT id FROM contacts WHERE user_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
      [userId, emailNorm]
    );
    if (byEmail.rows.length > 0) {
      const contactId = byEmail.rows[0].id;
      if (companyId) {
        await pool.query(
          'UPDATE contacts SET company_id = COALESCE(company_id, $1), name = COALESCE(name, $2), phone = COALESCE(phone, $3) WHERE id = $4',
          [companyId, name || null, phone || null, contactId]
        );
      }
      return contactId;
    }
  }

  const displayName = (name || emailNorm || phone || 'Contact').trim();
  const inserted = await pool.query(
    `INSERT INTO contacts (user_id, company_id, name, email, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, companyId, displayName, emailNorm || null, phone || null]
  );
  return inserted.rows[0].id;
}

async function linkDealContact(savedDealId, contactId, role = 'broker') {
  await pool.query(
    `INSERT INTO deal_contacts (saved_deal_id, contact_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (saved_deal_id, contact_id, role) DO NOTHING`,
    [savedDealId, contactId, role]
  );
}

async function hasActivityType(savedDealId, activityType) {
  const row = await pool.query(
    `SELECT id FROM activities WHERE saved_deal_id = $1 AND activity_type = $2 LIMIT 1`,
    [savedDealId, activityType]
  );
  return row.rows.length > 0;
}

async function addActivity(userId, savedDealId, { activityType, body, contactId = null, metadata = {} }) {
  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, contact_id, activity_type, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, savedDealId, contactId, activityType, body, JSON.stringify(metadata)]
  );
}

/**
 * Hydrate CRM data for a saved deal after save/update.
 * Idempotent: won't duplicate "deal_saved" activity or broker link.
 */
export async function hydrateCrmForSavedDeal(userId, savedDealId, payload = {}) {
  try {
    const marketDealId = await resolveMarketDealId(payload);
    let marketRow = null;

    if (marketDealId) {
      marketRow = await fetchMarketDealRow(marketDealId);
      if (marketRow) {
        await applyMarketSnapshot(savedDealId, userId, marketRow);
      } else {
        await pool.query(
          `UPDATE saved_deals SET market_deal_id = $1, listing_snapshot_at = NOW() WHERE id = $2 AND user_id = $3`,
          [marketDealId, savedDealId, userId]
        );
      }
    }

    const dealRow = await pool.query(
      `SELECT broker_name, broker_company, broker_email, broker_phone, name, source
       FROM saved_deals WHERE id = $1 AND user_id = $2`,
      [savedDealId, userId]
    );
    const deal = dealRow.rows[0];
    if (!deal) return { marketDealId, contactId: null };

    const brokerName = deal.broker_name || payload.brokerName;
    const brokerCompany = deal.broker_company || payload.brokerCompany;
    const brokerEmail = deal.broker_email || payload.brokerEmail;
    const brokerPhone = deal.broker_phone || payload.brokerPhone;

    let contactId = null;
    if (brokerName || brokerEmail || brokerPhone) {
      const companyId = await findOrCreateCompany(userId, brokerCompany, 'brokerage');
      contactId = await findOrCreateContact(userId, {
        name: brokerName,
        email: brokerEmail,
        phone: brokerPhone,
        companyId
      });
      await linkDealContact(savedDealId, contactId, 'broker');
    }

    if (!(await hasActivityType(savedDealId, 'deal_saved'))) {
      const sourceLabel = marketRow?.source || deal.source || 'listing';
      await addActivity(userId, savedDealId, {
        activityType: 'deal_saved',
        body: `Deal added to CRM from ${sourceLabel}`,
        contactId,
        metadata: { marketDealId: marketDealId || null, hydrated: Boolean(marketRow) }
      });
    }

    if (marketRow && !(await hasActivityType(savedDealId, 'listing_hydrated'))) {
      await addActivity(userId, savedDealId, {
        activityType: 'listing_hydrated',
        body: 'Listing data synced from market feed',
        metadata: {
          askingPrice: marketRow.asking_price,
          annualProfit: marketRow.annual_profit,
          annualRevenue: marketRow.annual_revenue
        }
      });
    }

    console.log(`[crmHydration] saved_deal=${savedDealId} market_deal_id=${marketDealId || 'none'} contact=${contactId || 'none'}`);
    return { marketDealId, contactId };
  } catch (err) {
    console.error('[crmHydration] failed for saved_deal', savedDealId, err);
    return { marketDealId: null, contactId: null, error: err.message };
  }
}
