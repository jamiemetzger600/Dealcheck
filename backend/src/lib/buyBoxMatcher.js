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
