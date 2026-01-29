// Custom Source Manager
// Allows users to add their own deal sources (Google Sheets, CSV, URLs)

console.log('📥 Custom Source Manager loaded');

const SOURCE_TYPES = {
    GOOGLE_SHEETS: 'google_sheets',
    CSV_URL: 'csv_url',
    RSS: 'rss',
    JSON_API: 'json_api',
    MANUAL: 'manual'
};

const STORAGE_KEY_CUSTOM_SOURCES = 'customSources';

// Get all custom sources
async function getCustomSources() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_CUSTOM_SOURCES], (result) => {
            resolve(result[STORAGE_KEY_CUSTOM_SOURCES] || []);
        });
    });
}

// Save custom sources
async function saveCustomSources(sources) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [STORAGE_KEY_CUSTOM_SOURCES]: sources }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log(`✅ Saved ${sources.length} custom sources`);
                resolve();
            }
        });
    });
}

// Add a new custom source
async function addCustomSource(source) {
    const sources = await getCustomSources();
    
    // Validate
    if (!source.name || !source.type || !source.url) {
        throw new Error('Source must have name, type, and url');
    }
    
    // Generate ID
    source.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    source.enabled = true;
    source.addedAt = Date.now();
    source.lastFetch = null;
    source.dealCount = 0;
    
    sources.push(source);
    await saveCustomSources(sources);
    
    return source;
}

// Remove custom source
async function removeCustomSource(sourceId) {
    const sources = await getCustomSources();
    const filtered = sources.filter(s => s.id !== sourceId);
    await saveCustomSources(filtered);
}

// Toggle source enabled/disabled
async function toggleCustomSource(sourceId, enabled) {
    const sources = await getCustomSources();
    const source = sources.find(s => s.id === sourceId);
    if (source) {
        source.enabled = enabled;
        await saveCustomSources(sources);
    }
}

// Parse Google Sheets URL to get CSV export URL
function parseGoogleSheetsUrl(url) {
    // Convert Google Sheets URL to CSV export URL
    // Example: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
    // To: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
    
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheets URL');
    }
    
    const sheetId = sheetIdMatch[1];
    
    // Extract gid (sheet tab ID) if present
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// Fetch data from Google Sheets
async function fetchGoogleSheets(source) {
    console.log('📊 Fetching Google Sheets:', source.name);
    
    try {
        const csvUrl = parseGoogleSheetsUrl(source.url);
        const response = await fetch(csvUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const deals = parseCSV(csvText, source.columnMapping || {});
        
        console.log(`✅ Parsed ${deals.length} deals from Google Sheets`);
        return deals;
        
    } catch (error) {
        console.error('Error fetching Google Sheets:', error);
        throw error;
    }
}

// Fetch data from CSV URL
async function fetchCSV(source) {
    console.log('📄 Fetching CSV:', source.name);
    
    try {
        const response = await fetch(source.url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const deals = parseCSV(csvText, source.columnMapping || {});
        
        console.log(`✅ Parsed ${deals.length} deals from CSV`);
        return deals;
        
    } catch (error) {
        console.error('Error fetching CSV:', error);
        throw error;
    }
}

// Generate a meaningful name from available deal data
function generateDealName(values, colIndices, rowNumber) {
    // Try to extract name from various sources in priority order
    let name = null;
    
    // 1. Try the name column
    if (colIndices.name !== -1 && values[colIndices.name]) {
        name = values[colIndices.name].trim();
        if (name) return name;
    }
    
    // 2. Try to extract from description (first line or sentence)
    if (colIndices.description !== -1 && values[colIndices.description]) {
        const desc = values[colIndices.description].trim();
        if (desc) {
            // Take first sentence or first 50 chars
            const firstSentence = desc.split(/[.!?\n]/)[0].trim();
            if (firstSentence && firstSentence.length > 0 && firstSentence.length <= 100) {
                return firstSentence;
            }
            if (desc.length <= 100) {
                return desc;
            }
            return desc.substring(0, 97) + '...';
        }
    }
    
    // 3. Build name from industry + location
    const industry = colIndices.industry !== -1 ? (values[colIndices.industry] || '').trim() : '';
    const location = colIndices.location !== -1 ? (values[colIndices.location] || '').trim() : '';
    
    if (industry && location) {
        return `${industry} Business in ${location}`;
    }
    if (industry) {
        return `${industry} Business`;
    }
    if (location) {
        return `Business in ${location}`;
    }
    
    // 4. Try to extract domain from URL
    if (colIndices.url !== -1 && values[colIndices.url]) {
        const url = values[colIndices.url].trim();
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            if (domain) {
                return `Business - ${domain}`;
            }
        } catch (e) {
            // Not a valid URL, ignore
        }
    }
    
    // 5. Last resort: use row number
    console.warn(`⚠️ Could not extract name for row ${rowNumber}, using fallback name`);
    return `Deal #${rowNumber}`;
}

// Parse CSV text to deals
function parseCSV(csvText, columnMapping) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse header row
    const headers = parseCSVLine(lines[0]);
    console.log('📋 CSV Headers found:', headers);
    
    // Get column indices
    const colIndices = {
        name: findColumnIndex(headers, columnMapping.name || ['name', 'business name', 'deal name', 'title']),
        url: findColumnIndex(headers, columnMapping.url || ['url', 'link', 'listing url', 'website']),
        price: findColumnIndex(headers, columnMapping.price || ['price', 'asking price', 'asking', 'sale price']),
        ebitda: findColumnIndex(headers, columnMapping.ebitda || ['ebitda', 'sde', 'cash flow', 'earnings']),
        location: findColumnIndex(headers, columnMapping.location || ['location', 'city', 'address', 'region']),
        industry: findColumnIndex(headers, columnMapping.industry || ['industry', 'sector', 'category', 'type']),
        description: findColumnIndex(headers, columnMapping.description || ['description', 'details', 'summary', 'about'])
    };
    
    console.log('📊 Column mapping:', {
        name: colIndices.name !== -1 ? headers[colIndices.name] : 'NOT FOUND',
        url: colIndices.url !== -1 ? headers[colIndices.url] : 'NOT FOUND',
        industry: colIndices.industry !== -1 ? headers[colIndices.industry] : 'NOT FOUND',
        location: colIndices.location !== -1 ? headers[colIndices.location] : 'NOT FOUND'
    });
    
    // Parse data rows
    const deals = [];
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            // Generate meaningful name using smart fallback logic
            const dealName = generateDealName(values, colIndices, i);
            
            const deal = {
                id: generateDealId(values[colIndices.url] || dealName || `row_${i}`),
                name: dealName,
                url: values[colIndices.url] || '',
                description: values[colIndices.description] || '',
                source: 'Custom Source',
                sourceType: 'csv',
                discoveredAt: Date.now(),
                askingPrice: parsePrice(values[colIndices.price]),
                ebitda: parsePrice(values[colIndices.ebitda]),
                location: values[colIndices.location] || '',
                industry: values[colIndices.industry] || ''
            };
            
            deals.push(deal);
        } catch (error) {
            console.warn(`⚠️ Error parsing row ${i}:`, error);
        }
    }
    
    console.log(`✅ Successfully parsed ${deals.length} deals from CSV`);
    return deals;
}

// Parse CSV line (handles quoted fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Find column index by multiple possible names
function findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
        const index = headers.findIndex(h => 
            h.toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) return index;
    }
    return -1; // Not found
}

// Parse price from string
function parsePrice(priceStr) {
    if (!priceStr) return null;
    
    // Remove currency symbols and commas
    const cleaned = priceStr.replace(/[$,€£]/g, '').trim().toLowerCase();
    
    let multiplier = 1;
    if (cleaned.includes('k')) {
        multiplier = 1000;
    } else if (cleaned.includes('m')) {
        multiplier = 1000000;
    }
    
    const number = parseFloat(cleaned.replace(/[km]/g, ''));
    return isNaN(number) ? null : number * multiplier;
}

// Generate unique ID
function generateDealId(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'custom_' + Math.abs(hash).toString(36);
}

// Fetch deals from custom source
async function fetchCustomSource(source) {
    console.log(`📥 Fetching custom source: ${source.name} (${source.type})`);
    
    try {
        let deals = [];
        
        switch (source.type) {
            case SOURCE_TYPES.GOOGLE_SHEETS:
                deals = await fetchGoogleSheets(source);
                break;
                
            case SOURCE_TYPES.CSV_URL:
                deals = await fetchCSV(source);
                break;
                
            case SOURCE_TYPES.RSS:
                // Use existing RSS parser
                if (typeof fetchRSSFeed !== 'undefined') {
                    deals = await fetchRSSFeed(source.url);
                }
                break;
                
            default:
                throw new Error(`Unsupported source type: ${source.type}`);
        }
        
        // Update source metadata
        source.lastFetch = Date.now();
        source.dealCount = deals.length;
        
        // Tag deals with source
        deals.forEach(deal => {
            deal.source = source.name;
            deal.sourceType = source.type;
            deal.customSource = true;
            deal.customSourceId = source.id;
        });
        
        return deals;
        
    } catch (error) {
        console.error(`Error fetching custom source ${source.name}:`, error);
        throw error;
    }
}

// Fetch all enabled custom sources
async function fetchAllCustomSources() {
    console.log('📥 Fetching all custom sources...');
    
    const sources = await getCustomSources();
    const enabledSources = sources.filter(s => s.enabled);
    
    const results = [];
    
    for (const source of enabledSources) {
        try {
            const deals = await fetchCustomSource(source);
            results.push({
                source: source.name,
                sourceId: source.id,
                type: source.type,
                deals: deals,
                success: true
            });
        } catch (error) {
            results.push({
                source: source.name,
                sourceId: source.id,
                type: source.type,
                deals: [],
                success: false,
                error: error.message
            });
        }
    }
    
    // Update sources with new metadata
    await saveCustomSources(sources);
    
    const totalDeals = results.reduce((sum, r) => sum + r.deals.length, 0);
    console.log(`✅ Fetched ${totalDeals} deals from ${results.length} custom sources`);
    
    return results;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SOURCE_TYPES,
        getCustomSources,
        addCustomSource,
        removeCustomSource,
        toggleCustomSource,
        fetchCustomSource,
        fetchAllCustomSources,
        parseGoogleSheetsUrl
    };
}
