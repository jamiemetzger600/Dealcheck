/**
 * Buy Box Matching Logic
 * Extracted from extension background.js and deals-dashboard.js
 * Used by: Extension, Web App, Backend (for notifications)
 */

/**
 * Check if a deal matches the user's buy box criteria
 * @param {Object} deal - Deal object
 * @param {Object} buyBox - Buy box configuration
 * @returns {boolean} - True if deal matches
 */
export function dealMatchesBuyBox(deal, buyBox) {
  if (!buyBox) return true;

  // Price filters
  if (buyBox.minPrice && deal.askingPrice < buyBox.minPrice) return false;
  if (buyBox.maxPrice && deal.askingPrice > buyBox.maxPrice) return false;

  // EBITDA filters
  if (buyBox.minEbitda && deal.ebitda < buyBox.minEbitda) return false;
  if (buyBox.maxEbitda && deal.ebitda > buyBox.maxEbitda) return false;

  // Revenue filters
  if (buyBox.minRevenue && deal.revenue < buyBox.minRevenue) return false;
  if (buyBox.maxRevenue && deal.revenue > buyBox.maxRevenue) return false;

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

  // Revenue multiple filter
  if (buyBox.revenueMultiple && deal.revenue && deal.askingPrice) {
    const actualMultiple = deal.askingPrice / deal.revenue;
    if (actualMultiple > buyBox.revenueMultiple) return false;
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
