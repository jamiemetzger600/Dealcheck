/**
 * Buy Box Matching Logic
 * Extracted from extension background.js and deals-dashboard.js
 * Used by: Extension, Web App, Backend (for notifications)
 */

/**
 * Apply "near match" slack to numeric limits (e.g. 10% = show deals slightly over max or under min).
 * @param {number} limit - The user's limit (min or max)
 * @param {number} dealValue - The deal's value
 * @param {'min'|'max'} type - For 'max': allow dealValue up to limit * (1 + pct/100). For 'min': allow dealValue down to limit * (1 - pct/100).
 * @param {number} pct - Percent slack (0 = strict)
 * @returns {boolean} - True if deal value is within the relaxed limit
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

/**
 * Check if a deal matches the user's buy box criteria.
 * Optional includeNearMatchesPercent (0–100) relaxes numeric limits so slightly over-max or under-min deals still show (e.g. negotiable listings).
 * @param {Object} deal - Deal object
 * @param {Object} buyBox - Buy box configuration (may include includeNearMatchesPercent)
 * @returns {boolean} - True if deal matches
 */
export function dealMatchesBuyBox(deal, buyBox) {
  if (!buyBox) return true;

  const pct = Math.min(100, Math.max(0, Number(buyBox.includeNearMatchesPercent) || 0));

  // Price filters (with optional slack)
  if (buyBox.minPrice != null && deal.askingPrice != null && !withinSlack(buyBox.minPrice, deal.askingPrice, 'min', pct)) return false;
  if (buyBox.maxPrice != null && deal.askingPrice != null && !withinSlack(buyBox.maxPrice, deal.askingPrice, 'max', pct)) return false;

  // EBITDA filters
  if (buyBox.minEbitda != null && deal.ebitda != null && !withinSlack(buyBox.minEbitda, deal.ebitda, 'min', pct)) return false;
  if (buyBox.maxEbitda != null && deal.ebitda != null && !withinSlack(buyBox.maxEbitda, deal.ebitda, 'max', pct)) return false;

  // Revenue filters
  if (buyBox.minRevenue != null && deal.revenue != null && !withinSlack(buyBox.minRevenue, deal.revenue, 'min', pct)) return false;
  if (buyBox.maxRevenue != null && deal.revenue != null && !withinSlack(buyBox.maxRevenue, deal.revenue, 'max', pct)) return false;

  // State filters (target states)
  if (buyBox.targetStates && buyBox.targetStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const hasTargetState = buyBox.targetStates.some(s =>
      dealState.includes(s.toUpperCase().trim())
    );
    if (!hasTargetState) return false;
  }

  // State filters (exclude states)
  if (buyBox.excludeStates && buyBox.excludeStates.length > 0) {
    const dealState = (deal.state || '').toUpperCase().trim();
    const isExcluded = buyBox.excludeStates.some(s =>
      dealState.includes(s.toUpperCase().trim())
    );
    if (isExcluded) return false;
  }

  // Industry filters
  if (buyBox.targetIndustries && buyBox.targetIndustries.length > 0) {
    const dealIndustry = (deal.industry || '').toLowerCase();
    const hasTargetIndustry = buyBox.targetIndustries.some(ind =>
      dealIndustry.includes(ind.toLowerCase())
    );
    if (!hasTargetIndustry) return false;
  }

  // Revenue multiple filter (treated as max multiple; slack allows slightly higher)
  if (buyBox.revenueMultiple != null && deal.revenue && deal.askingPrice) {
    const actualMultiple = deal.askingPrice / deal.revenue;
    if (!withinSlack(buyBox.revenueMultiple, actualMultiple, 'max', pct)) return false;
  }

  return true;
}

/**
 * Filter deals by exclude keywords
 * @param {Object} deal - Deal object
 * @param {Array<string>} excludeKeywords - Array of keywords to exclude
 * @returns {boolean} - True if deal should be included (not excluded)
 */
export function dealPassesExcludeFilter(deal, excludeKeywords = []) {
  if (!excludeKeywords || excludeKeywords.length === 0) return true;

  const searchableText = [
    deal.name || '',
    deal.description || '',
    deal.industry || '',
    deal.location || ''
  ].join(' ').toLowerCase();

  // Exclude if ANY keyword is found
  const isExcluded = excludeKeywords.some(keyword =>
    searchableText.includes(keyword.toLowerCase())
  );

  return !isExcluded;
}

/**
 * Filter deals by hidden IDs
 * @param {Object} deal - Deal object
 * @param {Array<string>|Set<string>} hiddenIds - Array or Set of hidden deal IDs
 * @returns {boolean} - True if deal should be included (not hidden)
 */
export function dealIsNotHidden(deal, hiddenIds = []) {
  if (!hiddenIds || hiddenIds.length === 0 && !(hiddenIds instanceof Set)) return true;

  const hiddenSet = hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds);
  return !hiddenSet.has(deal.id);
}

/**
 * Apply all filters to a deal
 * @param {Object} deal - Deal object
 * @param {Object} filters - Combined filters object
 * @param {Object} filters.buyBox - Buy box configuration
 * @param {Array<string>} filters.excludeKeywords - Exclude keywords
 * @param {Array<string>|Set<string>} filters.hiddenIds - Hidden deal IDs
 * @param {boolean} filters.showHidden - Whether to show hidden deals
 * @returns {boolean} - True if deal passes all filters
 */
export function dealPassesAllFilters(deal, filters = {}) {
  const {
    buyBox,
    excludeKeywords = [],
    hiddenIds = [],
    showHidden = false
  } = filters;

  // Buy box filter
  if (!dealMatchesBuyBox(deal, buyBox)) return false;

  // Exclude keywords filter
  if (!dealPassesExcludeFilter(deal, excludeKeywords)) return false;

  // Hidden deals filter (unless showing hidden)
  if (!showHidden && !dealIsNotHidden(deal, hiddenIds)) return false;

  return true;
}

/**
 * Filter an array of deals
 * @param {Array<Object>} deals - Array of deals
 * @param {Object} filters - Filters to apply
 * @returns {Array<Object>} - Filtered deals
 */
export function filterDeals(deals, filters = {}) {
  return deals.filter(deal => dealPassesAllFilters(deal, filters));
}

/**
 * Count deals matching filters
 * @param {Array<Object>} deals - Array of deals
 * @param {Object} filters - Filters to apply
 * @returns {number} - Count of matching deals
 */
export function countMatchingDeals(deals, filters = {}) {
  return deals.filter(deal => dealPassesAllFilters(deal, filters)).length;
}
