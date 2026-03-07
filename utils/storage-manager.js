// Storage Manager for Aggregated Deals
// Uses unlimitedStorage permission - no Chrome quota restrictions

console.log('💾 Storage Manager module loaded');

const STORAGE_KEYS = {
    AGGREGATED_DEALS: 'aggregatedDealsPool',
    SAVED_DEALS: 'savedDeals',
    BUY_BOX_SETTINGS: 'buyBoxSettings',
    USER_PREFERENCES: 'userPreferences',
    LAST_SYNC: 'lastSyncTimestamp'
};

const MAX_AGGREGATED_DEALS = 100000; // 100K deals (unlimitedStorage enabled)
const STORAGE_LIMIT_MB = 500; // Reference limit for usage reporting
const BYTES_PER_MB = 1048576;

// Calculate storage usage
async function getStorageUsage() {
    return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            resolve({ bytesUsed: 0, percentUsed: 0 });
            return;
        }
        
        chrome.storage.local.getBytesInUse(null, (bytes) => {
            const percentUsed = (bytes / (STORAGE_LIMIT_MB * BYTES_PER_MB)) * 100;
            resolve({
                bytesUsed: bytes,
                megabytesUsed: (bytes / BYTES_PER_MB).toFixed(2),
                percentUsed: percentUsed.toFixed(1),
                remaining: STORAGE_LIMIT_MB - (bytes / BYTES_PER_MB)
            });
        });
    });
}

// Save aggregated deals with LRU pruning
// Sanitize deal object for storage (remove non-serializable data)
function sanitizeDealForStorage(deal) {
    // Create a clean copy with only serializable data
    const sanitized = {
        id: String(deal.id || ''),
        name: String(deal.name || ''),
        url: String(deal.url || ''),
        description: String(deal.description || '').substring(0, 800), // Limit description length to save space
        broker: String(deal.broker || ''),
        brokerName: String(deal.brokerName || ''),
        brokerCompany: String(deal.brokerCompany || ''),
        brokerEmail: String(deal.brokerEmail || ''),
        brokerPhone: String(deal.brokerPhone || ''),
        source: String(deal.source || ''),
        sourceType: String(deal.sourceType || ''),
        discoveredAt: Number(deal.discoveredAt) || Date.now(),
        askingPrice: Number(deal.askingPrice) || null,
        ebitda: Number(deal.ebitda) || null,
        revenue: Number(deal.revenue) || null,
        location: String(deal.location || ''),
        city: String(deal.city || ''),
        state: String(deal.state || ''),
        county: String(deal.county || ''),
        country: String(deal.country || ''),
        industry: String(deal.industry || ''),
        yearsEstablished: String(deal.yearsEstablished || ''),
        franchise: String(deal.franchise || ''),
        remote: String(deal.remote || ''),
        listingId: String(deal.listingId || '')
    };
    
    // Preserve ALL original columns from Google Sheets for user access
    if (deal.rawColumns && typeof deal.rawColumns === 'object') {
        sanitized.rawColumns = {};
        // Only keep string values, truncate long text
        Object.keys(deal.rawColumns).forEach(key => {
            const value = deal.rawColumns[key];
            if (typeof value === 'string') {
                sanitized.rawColumns[key] = value.substring(0, 500);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                sanitized.rawColumns[key] = value;
            }
        });
    }
    
    return sanitized;
}

async function saveAggregatedDeals(deals) {
    console.log(`💾 Saving ${deals.length} aggregated deals...`);
    
    try {
        // Check storage usage
        const usage = await getStorageUsage();
        console.log(`📊 Storage usage: ${usage.percentUsed}% (${usage.megabytesUsed} MB)`);
        
        // Sanitize all deals to ensure they're serializable
        let dealsToSave = deals.map(sanitizeDealForStorage);
        
        // If we have too many deals or approaching storage limit, prune
        if (dealsToSave.length > MAX_AGGREGATED_DEALS || usage.percentUsed > 80) {
            console.log('⚠️  Pruning deals (LRU eviction)...');
            dealsToSave = pruneDealsByRelevance(dealsToSave, MAX_AGGREGATED_DEALS);
        }
        
        // Estimate size before saving
        const jsonString = JSON.stringify(dealsToSave);
        const estimatedSizeMB = (jsonString.length * 2) / BYTES_PER_MB; // UTF-16 = 2 bytes per char
        console.log(`📦 Estimated data size: ${estimatedSizeMB.toFixed(2)} MB`);
        
        if (estimatedSizeMB > 400) {
            console.warn('⚠️ Data exceeds 400MB, reducing deal count...');
            const targetCount = Math.floor(dealsToSave.length * (350 / estimatedSizeMB));
            dealsToSave = pruneDealsByRelevance(dealsToSave, targetCount);
            console.log(`📉 Reduced to ${dealsToSave.length} deals`);
        }
        
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({
                [STORAGE_KEYS.AGGREGATED_DEALS]: dealsToSave,
                [STORAGE_KEYS.LAST_SYNC]: Date.now()
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Storage error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`✅ Saved ${dealsToSave.length} deals to storage`);
                    resolve(dealsToSave);
                }
            });
        });
    } catch (error) {
        console.error('Error saving aggregated deals:', error);
        throw error;
    }
}

// Load aggregated deals from storage
async function loadAggregatedDeals() {
    return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            resolve([]);
            return;
        }
        
        chrome.storage.local.get([STORAGE_KEYS.AGGREGATED_DEALS], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                const deals = result[STORAGE_KEYS.AGGREGATED_DEALS] || [];
                console.log(`📂 Loaded ${deals.length} aggregated deals from storage`);
                resolve(deals);
            }
        });
    });
}

// Prune deals by relevance score (LRU eviction)
function pruneDealsByRelevance(deals, maxDeals) {
    // Calculate relevance score for each deal
    const scoredDeals = deals.map(deal => ({
        ...deal,
        relevanceScore: calculateRelevanceScore(deal)
    }));
    
    // Sort by relevance (highest first)
    scoredDeals.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Keep only top N deals
    const pruned = scoredDeals.slice(0, maxDeals);
    
    console.log(`✂️  Pruned ${deals.length - pruned.length} deals (kept top ${maxDeals})`);
    
    // Log breakdown by source type
    const sourceBreakdown = {};
    pruned.forEach(deal => {
        const sourceType = deal.sourceType || 'unknown';
        sourceBreakdown[sourceType] = (sourceBreakdown[sourceType] || 0) + 1;
    });
    console.log(`📊 Kept deals by source:`, sourceBreakdown);
    
    return pruned;
}

// Calculate relevance score for a deal (prioritize most recent)
function calculateRelevanceScore(deal) {
    // Simple scoring: Most recent deals get highest scores
    // This ensures we keep the 6000 most recent deals
    
    let score = 0;
    
    // Recency is king - use timestamp directly as score
    // Newer deals get higher scores automatically
    const daysSinceDiscovered = (Date.now() - deal.discoveredAt) / (1000 * 60 * 60 * 24);
    
    // Score based on age (newer = higher score)
    if (daysSinceDiscovered < 1) {
        score += 10000; // Today
    } else if (daysSinceDiscovered < 7) {
        score += 5000; // This week
    } else if (daysSinceDiscovered < 30) {
        score += 1000; // This month
    } else if (daysSinceDiscovered < 90) {
        score += 100; // Last 3 months
    } else {
        score += 10; // Older
    }
    
    // Bonus for complete data
    if (deal.askingPrice) score += 5;
    if (deal.ebitda) score += 5;
    if (deal.location) score += 2;
    
    // Google Sheets deals get slight bonus
    if (deal.sourceType === 'google_sheets') score += 10;
    
    // Not passed by user
    if (!deal.userPassed) score += 10;
    
    return score;
}

// Add new deals to aggregated pool (merge without duplicates)
async function addDealsToPool(newDeals) {
    console.log(`➕ Adding ${newDeals.length} new deals to pool...`);
    
    try {
        const existingDeals = await loadAggregatedDeals();
        
        // Create map of existing deals by ID for fast lookup
        const existingDealsMap = new Map(existingDeals.map(d => [d.id, d]));
        
        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;
        const updatedDeals = [];
        
        // Process each new deal
        for (const newDeal of newDeals) {
            const existingDeal = existingDealsMap.get(newDeal.id);
            
            if (!existingDeal) {
                // New deal - add it
                updatedDeals.push(newDeal);
                addedCount++;
            } else {
                // Deal exists - check if data has changed
                const hasChanges = detectDealChanges(existingDeal, newDeal);
                
                if (hasChanges.changed) {
                    // Update the existing deal with new data
                    const updatedDeal = {
                        ...existingDeal,
                        ...newDeal,
                        // Preserve original discovery date
                        discoveredAt: existingDeal.discoveredAt,
                        // Add last updated timestamp
                        lastUpdatedAt: Date.now(),
                        // Track what changed
                        lastChanges: hasChanges.changes
                    };
                    updatedDeals.push(updatedDeal);
                    updatedCount++;
                    
                    console.log(`🔄 Updated deal "${newDeal.name?.substring(0, 40)}": ${hasChanges.changes.join(', ')}`);
                } else {
                    // No changes - keep existing deal as-is
                    updatedDeals.push(existingDeal);
                    unchangedCount++;
                }
            }
        }
        
        // Add any existing deals that weren't in the new batch
        for (const existingDeal of existingDeals) {
            if (!newDeals.find(d => d.id === existingDeal.id)) {
                updatedDeals.push(existingDeal);
            }
        }
        
        console.log(`📊 Deal processing summary:`);
        console.log(`   ✅ Added: ${addedCount} new deals`);
        console.log(`   🔄 Updated: ${updatedCount} deals with changes`);
        console.log(`   ⏭️  Unchanged: ${unchangedCount} deals (skipped)`);
        
        // Log details about new deals for debugging
        if (addedCount > 0) {
            const sampleDeal = updatedDeals.find(d => !existingDealsMap.has(d.id));
            if (sampleDeal) {
                console.log(`📋 Sample new deal:`, {
                    name: sampleDeal.name?.substring(0, 50),
                    source: sampleDeal.source,
                    sourceType: sampleDeal.sourceType,
                    hasPrice: !!sampleDeal.askingPrice,
                    hasEbitda: !!sampleDeal.ebitda,
                    hasLocation: !!sampleDeal.location,
                    discoveredAt: new Date(sampleDeal.discoveredAt).toISOString()
                });
            }
        }
        
        // Save updated deals (with automatic pruning if needed)
        await saveAggregatedDeals(updatedDeals);
        
        return {
            added: addedCount,
            updated: updatedCount,
            unchanged: unchangedCount,
            duplicates: unchangedCount, // For backwards compatibility
            total: updatedDeals.length
        };
    } catch (error) {
        console.error('Error adding deals to pool:', error);
        throw error;
    }
}

// Detect changes between existing and new deal data
function detectDealChanges(existingDeal, newDeal) {
    const changes = [];
    
    // Key fields to check for changes
    const fieldsToCheck = [
        { key: 'askingPrice', label: 'Price' },
        { key: 'ebitda', label: 'EBITDA' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'description', label: 'Description' },
        { key: 'industry', label: 'Industry' },
        { key: 'location', label: 'Location' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'broker', label: 'Broker' },
        { key: 'brokerName', label: 'Broker Name' },
        { key: 'brokerCompany', label: 'Broker Company' },
        { key: 'brokerPhone', label: 'Broker Phone' },
        { key: 'brokerEmail', label: 'Broker Email' },
        { key: 'profitMultiple', label: 'Profit Multiple' },
        { key: 'revenueMultiple', label: 'Revenue Multiple' }
    ];
    
    for (const field of fieldsToCheck) {
        const oldValue = existingDeal[field.key];
        const newValue = newDeal[field.key];
        
        // Check if values are different (handle null/undefined)
        if (oldValue != newValue) { // Intentional != for null/undefined equivalence
            // Only track as change if new value is not empty
            if (newValue !== null && newValue !== undefined && newValue !== '') {
                changes.push(field.label);
            }
        }
    }
    
    return {
        changed: changes.length > 0,
        changes: changes
    };
}

// Clear all aggregated deals (keep saved deals)
async function clearAggregatedDeals() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove([STORAGE_KEYS.AGGREGATED_DEALS], () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log('🗑️  Cleared aggregated deals pool');
                resolve();
            }
        });
    });
}

// Get last sync timestamp
async function getLastSyncTime() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.LAST_SYNC], (result) => {
            resolve(result[STORAGE_KEYS.LAST_SYNC] || null);
        });
    });
}

// Save buy box settings
async function saveBuyBoxSettings(settings) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({
            [STORAGE_KEYS.BUY_BOX_SETTINGS]: settings
        }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log('💾 Saved buy box settings');
                resolve();
            }
        });
    });
}

// Load buy box settings
async function loadBuyBoxSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.BUY_BOX_SETTINGS], (result) => {
            resolve(result[STORAGE_KEYS.BUY_BOX_SETTINGS] || null);
        });
    });
}

// Export functions for browser (global scope)
window.getStorageUsage = getStorageUsage;
window.saveAggregatedDeals = saveAggregatedDeals;
window.loadAggregatedDeals = loadAggregatedDeals;
window.addDealsToPool = addDealsToPool;
window.clearAggregatedDeals = clearAggregatedDeals;
window.getLastSyncTime = getLastSyncTime;
window.saveBuyBoxSettings = saveBuyBoxSettings;
window.loadBuyBoxSettings = loadBuyBoxSettings;
window.STORAGE_KEYS = STORAGE_KEYS;

// ===== HIDDEN DEALS MANAGEMENT =====
const HIDDEN_DEALS_KEY = 'hiddenDealIds';

// Get hidden deal IDs
async function getHiddenDealIds() {
    return new Promise((resolve) => {
        chrome.storage.local.get([HIDDEN_DEALS_KEY], (result) => {
            const ids = result[HIDDEN_DEALS_KEY] || [];
            resolve(new Set(ids));
        });
    });
}

// Save hidden deal IDs
async function saveHiddenDealIds(idsSet) {
    const ids = Array.from(idsSet);
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [HIDDEN_DEALS_KEY]: ids }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log(`💾 Saved ${ids.length} hidden deal IDs`);
                resolve();
            }
        });
    });
}

// Hide a deal
async function hideDeal(dealId) {
    const hiddenIds = await getHiddenDealIds();
    hiddenIds.add(dealId);
    await saveHiddenDealIds(hiddenIds);
    console.log(`👁️‍🗨️ Hidden deal: ${dealId}`);
}

// Unhide a deal
async function unhideDeal(dealId) {
    const hiddenIds = await getHiddenDealIds();
    hiddenIds.delete(dealId);
    await saveHiddenDealIds(hiddenIds);
    console.log(`👁️ Unhidden deal: ${dealId}`);
}

// Hide multiple deals
async function hideDeals(dealIds) {
    const hiddenIds = await getHiddenDealIds();
    dealIds.forEach(id => hiddenIds.add(id));
    await saveHiddenDealIds(hiddenIds);
    console.log(`👁️‍🗨️ Hidden ${dealIds.length} deals`);
}

// Clear all hidden deals
async function clearHiddenDeals() {
    await saveHiddenDealIds(new Set());
    console.log(`🗑️ Cleared all hidden deals`);
}

// Get count of hidden deals
async function getHiddenDealsCount() {
    const hiddenIds = await getHiddenDealIds();
    return hiddenIds.size;
}

// Export hidden deals functions
window.getHiddenDealIds = getHiddenDealIds;
window.saveHiddenDealIds = saveHiddenDealIds;
window.hideDeal = hideDeal;
window.unhideDeal = unhideDeal;
window.hideDeals = hideDeals;
window.clearHiddenDeals = clearHiddenDeals;
window.getHiddenDealsCount = getHiddenDealsCount;

// Also export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStorageUsage,
        saveAggregatedDeals,
        loadAggregatedDeals,
        addDealsToPool,
        clearAggregatedDeals,
        getLastSyncTime,
        saveBuyBoxSettings,
        loadBuyBoxSettings,
        STORAGE_KEYS
    };
}
