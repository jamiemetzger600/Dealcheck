import pool from '../db/pool.js';
import { getMembership } from '../lib/teamAcl.js';
import { hydrateCrmForSavedDeal } from './crmHydration.js';
import { createContact, linkContactToDeal } from './crmContactService.js';

const EXTERNAL_SOURCE_TYPES = new Set([
  'broker_intro',
  'proprietary',
  'pe',
  'attorney',
  'marketplace',
  'other',
  'manual'
]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const input = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell.trim());
      cell = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      if (row.some((c) => c)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

function headerKey(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

const FIELD_ALIASES = {
  name: ['name', 'business_name', 'company', 'deal_name', 'title'],
  description: ['description', 'desc', 'summary'],
  city: ['city'],
  state: ['state', 'st'],
  industry: ['industry', 'sector'],
  asking_price: ['asking_price', 'asking', 'price', 'askingprice'],
  revenue: ['revenue', 'sales', 'gross_revenue'],
  ebitda: ['ebitda', 'cash_flow', 'sde', 'profit'],
  broker_name: ['broker_name', 'broker', 'contact_name'],
  broker_email: ['broker_email', 'email', 'contact_email'],
  broker_phone: ['broker_phone', 'phone', 'contact_phone'],
  url: ['url', 'listing_url', 'link', 'website'],
  notes: ['notes', 'note', 'comments'],
  referral_source: ['referral_source', 'referral', 'referred_by'],
  external_source_type: ['external_source_type', 'source_type', 'deal_source', 'origin'],
  close_target_date: ['close_target_date', 'close_date', 'target_close', 'target_date'],
  tags: ['tags', 'tag', 'labels'],
  contact_name: ['contact_name', 'person'],
  contact_email: ['contact_email'],
  contact_role: ['contact_role', 'role']
};

function mapHeaders(headers) {
  const map = {};
  const keys = headers.map(headerKey);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = keys.findIndex((k) => aliases.includes(k));
    if (idx >= 0) map[field] = idx;
  }
  return map;
}

function cell(row, map, field) {
  const idx = map[field];
  if (idx == null) return '';
  return row[idx] || '';
}

function parseMoney(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseTags(v) {
  if (!v) return [];
  return String(v)
    .split(/[|;,]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeExternalSourceType(v) {
  const raw = String(v || 'manual').trim().toLowerCase().replace(/\s+/g, '_');
  if (EXTERNAL_SOURCE_TYPES.has(raw)) return raw;
  if (raw.includes('broker')) return 'broker_intro';
  if (raw.includes('prop')) return 'proprietary';
  if (raw === 'pe' || raw.includes('private')) return 'pe';
  if (raw.includes('attorney') || raw.includes('lawyer')) return 'attorney';
  return 'other';
}

/**
 * Import deals from CSV text. Returns { created, skipped, errors }.
 */
export async function importDealsFromCsv(userId, csvText, { teamId = null } = {}) {
  if (teamId) {
    const membership = await getMembership(userId, teamId);
    if (!membership || (membership.role !== 'admin' && membership.role !== 'member')) {
      const err = new Error('Cannot import deals to this team');
      err.status = 403;
      throw err;
    }
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    const err = new Error('CSV must include a header row and at least one data row');
    err.status = 400;
    throw err;
  }

  const map = mapHeaders(rows[0]);
  if (map.name == null) {
    const err = new Error('CSV must include a Name (or Business Name) column');
    err.status = 400;
    throw err;
  }

  const created = [];
  const skipped = [];
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cell(row, map, 'name').trim();
    if (!name) {
      skipped.push({ row: i + 1, reason: 'missing name' });
      continue;
    }

    try {
      const dealId = `import_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
      const city = cell(row, map, 'city').trim() || null;
      const state = (cell(row, map, 'state').trim() || '').toUpperCase() || null;
      const location = [city, state].filter(Boolean).join(', ') || null;
      const tags = parseTags(cell(row, map, 'tags'));
      const closeRaw = cell(row, map, 'close_target_date').trim();
      const closeTarget = closeRaw && !Number.isNaN(Date.parse(closeRaw))
        ? closeRaw.slice(0, 10)
        : null;
      const externalSourceType = normalizeExternalSourceType(cell(row, map, 'external_source_type'));
      const brokerName = cell(row, map, 'broker_name').trim() || null;
      const brokerEmail = cell(row, map, 'broker_email').trim().toLowerCase() || null;
      const brokerPhone = cell(row, map, 'broker_phone').trim() || null;

      const result = await pool.query(
        `INSERT INTO saved_deals (
           user_id, deal_id, name, url, description, broker_name, broker_email, broker_phone,
           source, source_type, discovered_at, asking_price, ebitda, revenue,
           location, city, state, industry, notes, status,
           team_id, shared_by_user_id, owner_user_id,
           close_target_date, referral_source, external_source_type, tags
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, 'none',
           $20, $21, $1,
           $22, $23, $24, $25
         )
         RETURNING id, name`,
        [
          userId,
          dealId,
          name,
          cell(row, map, 'url').trim() || null,
          cell(row, map, 'description').trim() || null,
          brokerName,
          brokerEmail,
          brokerPhone,
          'CSV import',
          'manual',
          Date.now(),
          parseMoney(cell(row, map, 'asking_price')),
          parseMoney(cell(row, map, 'ebitda')),
          parseMoney(cell(row, map, 'revenue')),
          location,
          city,
          state,
          cell(row, map, 'industry').trim() || null,
          cell(row, map, 'notes').trim() || null,
          teamId,
          teamId ? userId : null,
          closeTarget,
          cell(row, map, 'referral_source').trim() || null,
          externalSourceType,
          tags
        ]
      );

      const savedDealId = result.rows[0].id;
      await hydrateCrmForSavedDeal(userId, savedDealId, {
        dealId,
        source: 'CSV import',
        brokerName,
        brokerEmail,
        brokerPhone
      }).catch((err) => console.warn('[crmImport] hydrate skipped', err.message));

      const contactName = cell(row, map, 'contact_name').trim();
      const contactEmail = cell(row, map, 'contact_email').trim().toLowerCase();
      if (contactName || contactEmail) {
        try {
          const contact = await createContact(userId, {
            name: contactName || contactEmail,
            email: contactEmail || null,
            teamId
          });
          await linkContactToDeal(
            userId,
            savedDealId,
            contact.id,
            cell(row, map, 'contact_role') || 'other'
          );
        } catch (err) {
          console.warn('[crmImport] contact link failed row', i + 1, err.message);
        }
      }

      created.push({ row: i + 1, id: savedDealId, name });
    } catch (err) {
      console.error('[crmImport] row failed', i + 1, err.message);
      errors.push({ row: i + 1, error: err.message });
    }
  }

  console.log('[crmImport] done', { created: created.length, skipped: skipped.length, errors: errors.length });
  return { created, skipped, errors, totalRows: rows.length - 1 };
}

export { EXTERNAL_SOURCE_TYPES, normalizeExternalSourceType };
