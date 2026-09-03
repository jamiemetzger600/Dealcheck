/**
 * Buy Box Matching Logic (backend copy for Koyeb deploy)
 * Source of truth: repo root shared/buyBoxMatcher.js
 * Used here by notificationScheduler for deal-matching. Keep in sync with shared/ when that file changes.
 */

function withinSlack(limit, dealValue, type, pct) {
  if (pct <= 0) return type === 'max' ? dealValue <= limit : dealValue >= limit;
  if (type === 'max') {
    const cap = limit * (1 + pct / 100);
    return dealValue <= cap;
  }
  const floor = limit * (1 - pct / 100);
  return dealValue >= floor;
}

export function dealMatchesBuyBox(deal, buyBox) {
  if (!buyBox) return true;

  const pct = Math.min(100, Math.max(0, Number(buyBox.includeNearMatchesPercent) || 0));

  if (buyBox.minPrice != null && deal.askingPrice != null && !withinSlack(buyBox.minPrice, deal.askingPrice, 'min', pct)) return false;
  if (buyBox.maxPrice != null && deal.askingPrice != null && !withinSlack(buyBox.maxPrice, deal.askingPrice, 'max', pct)) return false;
  if (buyBox.minEbitda != null && deal.ebitda != null && !withinSlack(buyBox.minEbitda, deal.ebitda, 'min', pct)) return false;
  if (buyBox.maxEbitda != null && deal.ebitda != null && !withinSlack(buyBox.maxEbitda, deal.ebitda, 'max', pct)) return false;
  if (buyBox.minRevenue != null && deal.revenue != null && !withinSlack(buyBox.minRevenue, deal.revenue, 'min', pct)) return false;
  if (buyBox.maxRevenue != null && deal.revenue != null && !withinSlack(buyBox.maxRevenue, deal.revenue, 'max', pct)) return false;

  if (buyBox.targetStates && buyBox.targetStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const hasTargetState = buyBox.targetStates.some(s =>
      dealState.includes(s.toUpperCase().trim())
    );
    if (!hasTargetState) return false;
  }
  if (buyBox.excludeStates && buyBox.excludeStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const isExcluded = buyBox.excludeStates.some(s =>
      dealState.includes(s.toUpperCase().trim())
    );
    if (isExcluded) return false;
  }
  if (buyBox.targetIndustries && buyBox.targetIndustries.length > 0) {
    const dealIndustry = (deal.industry || '').toLowerCase();
    const hasTargetIndustry = buyBox.targetIndustries.some(ind =>
      dealIndustry.includes(ind.toLowerCase())
    );
    if (!hasTargetIndustry) return false;
  }
  if (buyBox.revenueMultiple != null && deal.revenue && deal.askingPrice) {
    const actualMultiple = deal.askingPrice / deal.revenue;
    if (!withinSlack(buyBox.revenueMultiple, actualMultiple, 'max', pct)) return false;
  }

  return true;
}

/** Map a market_deals row onto the matcher deal shape. */
export function marketRowToMatchDeal(row) {
  const industries = row?.industries;
  let industry = '';
  if (Array.isArray(industries)) industry = industries.filter(Boolean).join(' ');
  else if (typeof industries === 'string') industry = industries;

  const asking = row?.asking_price != null ? Number(row.asking_price) : null;
  const revenue = row?.annual_revenue != null ? Number(row.annual_revenue) : null;
  const ebitda = row?.annual_profit != null ? Number(row.annual_profit) : null;

  return {
    id: row?.id,
    name: row?.name || 'Unnamed listing',
    url: row?.listing_url || '',
    askingPrice: Number.isFinite(asking) ? asking : null,
    revenue: Number.isFinite(revenue) ? revenue : null,
    ebitda: Number.isFinite(ebitda) ? ebitda : null,
    state: row?.state || '',
    industry,
    location: [row?.city, row?.state].filter(Boolean).join(', '),
    firstSeenAt: row?.first_seen_at || null
  };
}

/** Slot feed search (AND terms) and exclude keywords. */
export function dealPassesSlotFeed(deal, slot) {
  if (!slot || typeof slot !== 'object') return true;
  const text = `${deal.name || ''} ${deal.industry || ''} ${deal.location || ''} ${deal.state || ''}`.toLowerCase();
  const exclude = Array.isArray(slot.excludeKeywords) ? slot.excludeKeywords : [];
  for (const raw of exclude) {
    const k = String(raw || '').trim().toLowerCase();
    if (k && text.includes(k)) return false;
  }
  const search = typeof slot.feedSearch === 'string' ? slot.feedSearch.trim() : '';
  if (!search) return true;
  const terms = search
    .split(/\s*[,&]\s*/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  return terms.every((t) => text.includes(t));
}
