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

// Header row detection: look for row containing these (Google Sheet "Daily Deal Update" etc.)
const HEADER_MARKERS = ['name', 'asking price', 'industry', 'date added', 'annual profit', 'city'];

function detectHeaderRow(lines) {
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const parsed = parseCSVLine(lines[i]);
        const concat = parsed.join(' ').toLowerCase();
        const matches = HEADER_MARKERS.filter(m => concat.includes(m));
        if (matches.length >= 2) return i;
    }
    return 0;
}

// Parse CSV text to deals – import ALL columns into rawFields; map known cols for sorting/filters
function parseCSV(csvText, columnMapping) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headerRowIndex = detectHeaderRow(lines);
    const headers = parseCSVLine(lines[headerRowIndex]);
    
    const colIndices = {
        name: findColumnIndex(headers, columnMapping.name || ['name', 'business name', 'deal name', 'title']),
        url: findColumnIndex(headers, columnMapping.url || ['url', 'link', 'listing url', 'website', 'view listing']),
        price: findColumnIndex(headers, columnMapping.price || ['asking price', 'price', 'asking', 'sale price']),
        ebitda: findColumnIndex(headers, columnMapping.ebitda || ['annual profit', 'ebitda', 'sde', 'cash flow', 'earnings']),
        location: findColumnIndex(headers, columnMapping.location || ['location', 'city', 'address', 'region']),
        industry: findColumnIndex(headers, columnMapping.industry || ['industry', 'sector', 'category', 'type']),
        description: findColumnIndex(headers, columnMapping.description || ['description', 'details', 'summary', 'about']),
        city: findColumnIndex(headers, ['city']),
        state: findColumnIndex(headers, ['state']),
        dateAdded: findColumnIndex(headers, ['date added'])
    };
    
    const deals = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            const rawFields = {};
            headers.forEach((h, idx) => {
                const key = (h || '').trim();
                if (key) rawFields[key] = (values[idx] || '').trim();
            });
            
            const nameVal = (colIndices.name >= 0 ? values[colIndices.name] : '') || getFirstRaw(rawFields, ['Name', 'Business Name', 'Deal Name', 'Title']) || 'Unnamed Deal';
            const urlVal = (colIndices.url >= 0 ? values[colIndices.url] : '') || getFirstRaw(rawFields, ['View Listing', 'URL', 'Link', 'Listing URL', 'Website']) || '';
            const priceRaw = (colIndices.price >= 0 ? values[colIndices.price] : '') || getFirstRaw(rawFields, ['Asking Price', 'Asking', 'Price', 'Sale Price']);
            const ebitdaRaw = (colIndices.ebitda >= 0 ? values[colIndices.ebitda] : '') || getFirstRaw(rawFields, ['Annual Profit', 'EBITDA', 'SDE', 'Cash Flow', 'Earnings']);
            const locationParts = [];
            if (colIndices.city >= 0 && values[colIndices.city]) locationParts.push(values[colIndices.city]);
            if (colIndices.state >= 0 && values[colIndices.state]) locationParts.push(values[colIndices.state]);
            const cityRaw = getFirstRaw(rawFields, ['City']);
            const stateRaw = getFirstRaw(rawFields, ['State']);
            if (locationParts.length === 0 && (cityRaw || stateRaw)) locationParts.push(cityRaw, stateRaw);
            const locationVal = locationParts.filter(Boolean).join(', ') ||
                (colIndices.location >= 0 ? values[colIndices.location] : '') ||
                getFirstRaw(rawFields, ['Location', 'Address', 'Region']) ||
                '-';
            const industryVal = (colIndices.industry >= 0 ? values[colIndices.industry] : '') || getFirstRaw(rawFields, ['Industry', 'Sector', 'Category', 'Type']) || '';
            
            let discoveredAt = Date.now();
            if (colIndices.dateAdded >= 0 && values[colIndices.dateAdded]) {
                const parsed = parseDateAdded(values[colIndices.dateAdded]);
                if (parsed) discoveredAt = parsed;
            }
            
            const askingPrice = parsePrice(priceRaw);
            const ebitda = parsePrice(ebitdaRaw);
            
            // Only skip rows that are completely empty (no name, no rawFields, no data at all)
            const hasAnyData = nameVal !== 'Unnamed Deal' || askingPrice || ebitda || urlVal || 
                               Object.values(rawFields).some(v => v != null && String(v).trim() !== '');
            if (!hasAnyData) {
                console.log(`📋 CSV skip completely empty row ${i + 1} (no data at all)`);
                continue;
            }
            
            // Extract state from location or state column
            let stateVal = null;
            if (colIndices.state >= 0 && values[colIndices.state]) {
                stateVal = values[colIndices.state].trim().toUpperCase();
            } else if (stateRaw) {
                stateVal = String(stateRaw).trim().toUpperCase();
            } else if (locationVal) {
                // Try to extract state from location (e.g., "Tampa, FL" -> "FL")
                const stateMatch = locationVal.match(/,\s*([A-Z]{2})$/i);
                if (stateMatch) {
                    stateVal = stateMatch[1].toUpperCase();
                }
            }
            
            const deal = {
                id: generateDealId(urlVal || nameVal || `row_${i}`),
                name: nameVal,
                url: urlVal,
                description: (colIndices.description >= 0 ? values[colIndices.description] : '') || getFirstRaw(rawFields, ['Description', 'Details', 'Summary', 'About']) || '',
                source: 'Custom Source',
                sourceType: 'csv',
                discoveredAt,
                askingPrice: askingPrice || null,
                ebitda: ebitda || null,
                revenue: parsePrice(getFirstRaw(rawFields, ['Annual Revenue'])),
                location: locationVal || '-',
                city: (colIndices.city >= 0 ? values[colIndices.city] : '') || cityRaw || null,
                state: stateVal,
                industry: industryVal || '',
                rawFields
            };
            deals.push(deal);
        } catch (error) {
            console.warn(`Error parsing row ${i}:`, error);
        }
    }
    
    return deals;
}

function parseDateAdded(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim();
    const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdy) {
        const d = new Date(parseInt(mdy[3], 10), parseInt(mdy[1], 10) - 1, parseInt(mdy[2], 10));
        return isNaN(d.getTime()) ? null : d.getTime();
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.getTime();
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

// Get first non-empty rawFields value for any key matching candidates (exact or contains)
function getFirstRaw(rawFields, candidates) {
    if (!rawFields || typeof rawFields !== 'object') return '';
    const keys = Object.keys(rawFields);
    for (const c of candidates) {
        const lower = c.toLowerCase();
        for (const k of keys) {
            const v = rawFields[k];
            if (v != null && String(v).trim() !== '' && (k.toLowerCase() === lower || k.toLowerCase().includes(lower))) {
                return String(v).trim();
            }
        }
    }
    return '';
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
