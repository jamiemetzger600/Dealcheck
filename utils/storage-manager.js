// Storage Manager for Aggregated Deals
// Manages local cache with LRU eviction for chrome.storage.local 10MB limit

console.log('💾 Storage Manager module loaded');

const STORAGE_KEYS = {
    AGGREGATED_DEALS: 'aggregatedDealsPool',
    SAVED_DEALS: 'savedDeals',
    BUY_BOX_SETTINGS: 'buyBoxSettings',
    USER_PREFERENCES: 'userPreferences',
    LAST_SYNC: 'lastSyncTimestamp'
};

const MAX_AGGREGATED_DEALS = 6000; // Keep top 6K most recent deals
const STORAGE_LIMIT_MB = 10;
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
    return {
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
        
        if (estimatedSizeMB > 8) {
            console.warn('⚠️ Data too large, reducing deal count...');
            // Reduce to fit within limits
            const targetCount = Math.floor(dealsToSave.length * (7 / estimatedSizeMB));
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
        
        // Create map of existing deal IDs
        const existingIds = new Set(existingDeals.map(d => d.id));
        
        // Filter out duplicates
        const uniqueNewDeals = newDeals.filter(deal => !existingIds.has(deal.id));
        
        console.log(`🔍 Found ${uniqueNewDeals.length} unique deals (${newDeals.length - uniqueNewDeals.length} duplicates)`);
        
        // Log details about new deals for debugging
        if (uniqueNewDeals.length > 0) {
            const sampleDeal = uniqueNewDeals[0];
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
        
        // Merge arrays
        const mergedDeals = [...existingDeals, ...uniqueNewDeals];
        
        // Save merged deals (with automatic pruning if needed)
        await saveAggregatedDeals(mergedDeals);
        
        return {
            added: uniqueNewDeals.length,
            duplicates: newDeals.length - uniqueNewDeals.length,
            total: mergedDeals.length
        };
    } catch (error) {
        console.error('Error adding deals to pool:', error);
        throw error;
    }
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
