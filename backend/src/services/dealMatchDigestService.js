import pool from '../db/pool.js';
import { dealMatchesBuyBox, marketRowToMatchDeal, dealPassesSlotFeed } from '../lib/buyBoxMatcher.js';
import { normalizeUserBuyBoxes, slotHasMatchCriteria, criteriaFromSlot } from '../lib/userBuyBoxes.js';

const NEW_DEALS_CAP = 2000;
const PER_BOX_CAP = 12;

export function formatMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Load newly seen market listings since `sinceDate`. Caller should reuse one batch per job.
 */
export async function loadNewMarketDeals(sinceDate) {
  const since = sinceDate instanceof Date ? sinceDate : new Date(sinceDate);
  const result = await pool.query(
    `SELECT id, name, listing_url, asking_price, annual_revenue, annual_profit,
            city, state, industries, first_seen_at
     FROM market_deals
     WHERE is_active = true
       AND first_seen_at IS NOT NULL
       AND first_seen_at >= $1
     ORDER BY first_seen_at DESC
     LIMIT $2`,
    [since.toISOString(), NEW_DEALS_CAP]
  );
  console.log('[dealMatch] loaded new market deals', {
    since: since.toISOString(),
    count: result.rows.length
  });
  return result.rows.map(marketRowToMatchDeal);
}

/**
 * Match deals to buy-box slots in slot order. Each deal appears once, under the
 * first (highest-priority) box it matches.
 */
export function groupDealsByBuyBox(deals, buyBoxes) {
  const boxes = Array.isArray(buyBoxes) ? buyBoxes : [];
  const groups = boxes.map((slot, index) => ({
    index,
    name: (slot?.name && String(slot.name).trim()) || `Buy box ${index + 1}`,
    hasCriteria: slotHasMatchCriteria(slot),
    deals: []
  }));

  const activeGroups = groups.filter((g) => g.hasCriteria);
  if (!activeGroups.length || !deals?.length) {
    return { groups: groups.filter((g) => g.hasCriteria), total: 0 };
  }

  for (const deal of deals) {
    for (const group of activeGroups) {
      const slot = boxes[group.index];
      const criteria = criteriaFromSlot(slot);
      if (!dealMatchesBuyBox(deal, criteria)) continue;
      if (!dealPassesSlotFeed(deal, slot)) continue;
      if (group.deals.length < PER_BOX_CAP) group.deals.push(deal);
      else group.overflow = (group.overflow || 0) + 1;
      break;
    }
  }

  const filled = groups.filter((g) => g.hasCriteria && (g.deals.length > 0 || g.overflow));
  const total = filled.reduce((n, g) => n + g.deals.length + (g.overflow || 0), 0);
  return { groups: filled, total };
}

export function matchUserBuyBoxes(deals, settingsRow) {
  const normalized = normalizeUserBuyBoxes(
    settingsRow?.buy_box,
    settingsRow?.preferences || {},
    {}
  );
  return groupDealsByBuyBox(deals, normalized.buyBoxes);
}

export function summarizeMatchGroups(grouped) {
  if (!grouped?.total) return '';
  return grouped.groups
    .map((g) => `${g.deals.length} in ${g.name}`)
    .join(' · ');
}
