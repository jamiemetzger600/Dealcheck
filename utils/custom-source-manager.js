// Custom Source Manager
// Allows users to add their own deal sources (Google Sheets, CSV, URLs)

console.log('Custom Source Manager loaded');

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
                console.log(`Saved ${sources.length} custom sources`);
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

// Extract sheet ID from various Google Sheets URL formats
function extractSheetInfo(url) {
    // Extract gid (sheet tab ID) if present
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    
    // Published URL format: /d/e/PUBLISHED_ID/
    const pubIdMatch = url.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (pubIdMatch) {
        return { id: pubIdMatch[1], gid, isPublished: true };
    }
    
    // Standard URL format: /d/SHEET_ID/
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch) {
        return { id: sheetIdMatch[1], gid, isPublished: false };
    }
    
    throw new Error('Invalid Google Sheets URL');
}

// Parse Google Sheets URL to get export URL
function parseGoogleSheetsUrl(url, format = 'csv') {
    const info = extractSheetInfo(url);
    
    if (info.isPublished) {
        // Published sheet URLs
        if (format === 'html' || format === 'pubhtml') {
            return `https://docs.google.com/spreadsheets/d/e/${info.id}/pubhtml?gid=${info.gid}&single=true`;
        }
        if (format === 'csv') {
            return `https://docs.google.com/spreadsheets/d/e/${info.id}/pub?gid=${info.gid}&single=true&output=csv`;
        }
    }
    
    // Standard sheet URLs
    if (format === 'html') {
        return `https://docs.google.com/spreadsheets/d/${info.id}/pubhtml?gid=${info.gid}&single=true`;
    }
    
    if (format === 'json') {
        // Google Visualization API
        return `https://docs.google.com/spreadsheets/d/${info.id}/gviz/tq?tqx=out:json&gid=${info.gid}`;
    }
    
    return `https://docs.google.com/spreadsheets/d/${info.id}/export?format=csv&gid=${info.gid}`;
}

// Parse Google Sheets HTML export to extract data with hyperlinks
function parseGoogleSheetsHTML(htmlText, columnMapping) {
    console.log('Parsing Google Sheets HTML export...');
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Find the table
    const table = doc.querySelector('table');
    if (!table) {
        console.warn('No table found in HTML export');
        return [];
    }
    
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) {
        console.warn('Table has less than 2 rows');
        return [];
    }
    
    // Find header row (look for common header keywords)
    let headerRowIndex = 0;
    const headerKeywords = ['name', 'industry', 'asking', 'price', 'city', 'state', 'view listing', 'broker'];
    
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const cells = rows[i].querySelectorAll('td, th');
        const cellTexts = Array.from(cells).map(c => (c.textContent || '').toLowerCase().trim());
        
        let matches = 0;
        for (const keyword of headerKeywords) {
            if (cellTexts.some(t => t.includes(keyword))) matches++;
        }
        
        if (matches >= 3) {
            headerRowIndex = i;
            console.log('Found header row at index', i);
            break;
        }
    }
    
    // Extract headers
    const headerCells = rows[headerRowIndex].querySelectorAll('td, th');
    const headers = Array.from(headerCells).map(c => (c.textContent || '').trim());
    console.log('HTML Headers:', headers);
    
    // Get column indices - matching correct column order
    // Correct order: Date Added, Name, Industry, Description, City, County, State, Country, 
    // Years Established, Annual Profit, Annual Revenue, Asking Price, Profit Multiple, 
    // Revenue Multiple, Remote/Relocatable/Absentee-Run, Franchise, 5+ Years In Business,
    // Broker Name, Broker Company, Broker Contact, Broker Email, View Listing
    const colIndices = {
        discovered: findColumnIndex(headers, columnMapping.discovered || ['date added', 'discovered', 'added', 'listed date']),
        name: findColumnIndex(headers, columnMapping.name || ['name', 'business name', 'deal name', 'title']),
        industry: findColumnIndex(headers, columnMapping.industry || ['industry', 'sector', 'category', 'type']),
        description: findColumnIndex(headers, columnMapping.description || ['description', 'details', 'summary', 'about', 'notes']),
        city: findColumnIndex(headers, columnMapping.city || ['city']),
        county: findColumnIndex(headers, columnMapping.county || ['county']),
        state: findColumnIndex(headers, columnMapping.state || ['state']),
        country: findColumnIndex(headers, columnMapping.country || ['country']),
        yearsEstablished: findColumnIndex(headers, columnMapping.yearsEstablished || ['years established', 'years in business', 'established']),
        ebitda: findColumnIndex(headers, columnMapping.ebitda || ['annual profit', 'ebitda', 'sde', 'cash flow', 'earnings']),
        revenue: findColumnIndex(headers, columnMapping.revenue || ['annual revenue', 'revenue', 'sales', 'gross revenue']),
        price: findColumnIndex(headers, columnMapping.price || ['asking price', 'asking', 'price', 'sale price']),
        profitMultiple: findColumnIndex(headers, columnMapping.profitMultiple || ['profit multiple', 'ebitda multiple']),
        revenueMultiple: findColumnIndex(headers, columnMapping.revenueMultiple || ['revenue multiple']),
        remote: findColumnIndex(headers, columnMapping.remote || ['remote', 'relocatable', 'absentee', 'remote/relocatable/absentee-run']),
        franchise: findColumnIndex(headers, columnMapping.franchise || ['franchise']),
        fiveYearsInBusiness: findColumnIndex(headers, columnMapping.fiveYearsInBusiness || ['5+ years in business', 'years in business']),
        brokerName: findColumnIndex(headers, columnMapping.brokerName || ['broker name', 'broker']),
        brokerCompany: findColumnIndex(headers, columnMapping.brokerCompany || ['broker company', 'brokerage', 'brokerage firm']),
        brokerPhone: findColumnIndex(headers, columnMapping.brokerPhone || ['broker contact', 'broker phone', 'contact phone', 'phone', 'phone number']),
        brokerEmail: findColumnIndex(headers, columnMapping.brokerEmail || ['broker email', 'contact email', 'email']),
        url: findColumnIndex(headers, columnMapping.url || ['view listing', 'listing url', 'url', 'link', 'website', 'deal url']),
        location: findColumnIndex(headers, columnMapping.location || ['location', 'address', 'region']),
        source: findColumnIndex(headers, columnMapping.source || ['source', 'platform', 'marketplace']),
        // Listing ID for URL construction
        listingId: findColumnIndex(headers, columnMapping.listingId || ['listing id', 'ad#', 'ad #', 'id', 'reference', 'ref'])
    };
    
    console.log('HTML Column mapping:', colIndices);
    
    // Parse data rows
    const deals = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        try {
            const cells = rows[i].querySelectorAll('td, th');
            if (cells.length === 0) continue;
            
            // Helper to get cell text
            const getCellText = (idx) => idx !== -1 && cells[idx] ? (cells[idx].textContent || '').trim() : '';
            
            // Helper to get hyperlink from cell
            const getCellLink = (idx) => {
                if (idx === -1 || !cells[idx]) return '';
                
                // Try to find any anchor tag in the cell
                const anchors = cells[idx].querySelectorAll('a');
                for (const anchor of anchors) {
                    let href = anchor.href || anchor.getAttribute('href');
                    if (!href) continue;
                    
                    // Skip javascript: links and empty hrefs
                    if (href.startsWith('javascript:') || href === '#') continue;
                    
                    // Handle Google redirect URLs
                    if (href.includes('google.com/url?')) {
                        const urlMatch = href.match(/[?&](?:q|url)=([^&]+)/);
                        if (urlMatch) {
                            href = decodeURIComponent(urlMatch[1]);
                        }
                    }
                    
                    // Validate it's a proper URL
                    if (href.startsWith('http://') || href.startsWith('https://')) {
                        return href;
                    }
                }
                
                // Also check for URLs in the cell text itself
                const cellText = (cells[idx].textContent || '').trim();
                if (cellText.startsWith('http://') || cellText.startsWith('https://')) {
                    return cellText;
                }
                
                return '';
            };
            
            // Skip header-like rows or empty rows
            const nameVal = getCellText(colIndices.name);
            if (!nameVal || nameVal.toLowerCase().includes('auto update') || nameVal.toLowerCase().includes('member area')) {
                continue;
            }
            
            // Helper to extract URL from any text
            const extractUrlFromText = (text) => {
                if (!text) return '';
                // Match URLs in text
                const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
                const matches = text.match(urlRegex);
                if (matches && matches.length > 0) {
                    // Return the first valid-looking URL (prefer marketplace URLs)
                    for (const match of matches) {
                        // Clean up trailing punctuation
                        let cleanUrl = match.replace(/[.,;:!?)]+$/, '');
                        if (cleanUrl.includes('bizbuysell.com') || 
                            cleanUrl.includes('businessesforsale.com') || 
                            cleanUrl.includes('businessbroker.net') ||
                            cleanUrl.includes('loopnet.com') ||
                            cleanUrl.includes('tworld.com') ||
                            cleanUrl.includes('sunbeltnetwork.com')) {
                            return cleanUrl;
                        }
                    }
                    // If no marketplace URL, return the first one
                    return matches[0].replace(/[.,;:!?)]+$/, '');
                }
                return '';
            };
            
            // Get URL - multiple fallback strategies
            let url = '';
            
            // Strategy 1: Try to get hyperlink from URL column
            url = getCellLink(colIndices.url);
            
            // Strategy 2: Try URL column text directly
            if (!url) {
                const urlText = getCellText(colIndices.url);
                if (urlText.startsWith('http://') || urlText.startsWith('https://')) {
                    url = urlText;
                }
            }
            
            // Strategy 3: Look for URLs in the description
            if (!url) {
                const description = getCellText(colIndices.description);
                url = extractUrlFromText(description);
            }
            
            // Strategy 4: Try to find listing ID and construct URL
            if (!url && colIndices.listingId !== -1) {
                const listingId = getCellText(colIndices.listingId);
                if (listingId) {
                    // Check description to detect source marketplace
                    const description = getCellText(colIndices.description);
                    const broker = getCellText(colIndices.broker) + ' ' + getCellText(colIndices.brokerCompany);
                    
                    // Try to construct URL based on detected source
                    if (description.toLowerCase().includes('bizbuysell') || broker.toLowerCase().includes('bizbuysell')) {
                        url = `https://www.bizbuysell.com/Business-Opportunity/${listingId}/`;
                    } else if (description.toLowerCase().includes('businessbroker.net')) {
                        url = `https://www.businessbroker.net/listings/${listingId}`;
                    }
                    // Add more marketplace patterns as needed
                }
            }
            
            // Strategy 5: Scan all cells for any URL (last resort)
            if (!url) {
                for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
                    const cellUrl = getCellLink(cellIdx);
                    if (cellUrl && !cellUrl.includes('google.com')) {
                        url = cellUrl;
                        break;
                    }
                }
            }
            
            // Log URL extraction results for debugging
            if (i <= headerRowIndex + 5) {
                console.log(`🔗 URL extraction for "${nameVal.substring(0, 30)}":`, {
                    fromLink: getCellLink(colIndices.url) || 'none',
                    fromText: getCellText(colIndices.url) || 'none', 
                    fromDesc: extractUrlFromText(getCellText(colIndices.description)) || 'none',
                    final: url || 'NONE FOUND'
                });
            }
            
            // Build location
            let location = getCellText(colIndices.location);
            if (!location) {
                const city = getCellText(colIndices.city);
                const state = getCellText(colIndices.state);
                if (city && state) location = `${city}, ${state}`;
                else if (city) location = city;
                else if (state) location = state;
            }
            
            // Get broker info - combine name and company
            const brokerName = getCellText(colIndices.brokerName);
            const brokerCompany = getCellText(colIndices.brokerCompany);
            const brokerDisplay = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : brokerName || brokerCompany;
            
            const deal = {
                id: generateDealId(url || nameVal || `row_${i}`),
                name: nameVal,
                url: url,
                industry: getCellText(colIndices.industry),
                description: getCellText(colIndices.description),
                location: location,
                city: getCellText(colIndices.city),
                county: getCellText(colIndices.county),
                state: getCellText(colIndices.state),
                country: getCellText(colIndices.country),
                yearsEstablished: getCellText(colIndices.yearsEstablished),
                ebitda: parsePrice(getCellText(colIndices.ebitda)),
                revenue: colIndices.revenue !== -1 ? parsePrice(getCellText(colIndices.revenue)) : null,
                askingPrice: parsePrice(getCellText(colIndices.price)),
                profitMultiple: colIndices.profitMultiple !== -1 ? parseFloat(getCellText(colIndices.profitMultiple)) || null : null,
                revenueMultiple: colIndices.revenueMultiple !== -1 ? parseFloat(getCellText(colIndices.revenueMultiple)) || null : null,
                remote: getCellText(colIndices.remote),
                franchise: getCellText(colIndices.franchise),
                fiveYearsInBusiness: getCellText(colIndices.fiveYearsInBusiness),
                broker: brokerDisplay,
                brokerName: brokerName,
                brokerCompany: brokerCompany,
                brokerPhone: getCellText(colIndices.brokerPhone),
                brokerEmail: getCellText(colIndices.brokerEmail),
                source: getCellText(colIndices.source) || 'google_sheets',
                sourceType: 'google_sheets',
                discoveredAt: colIndices.discovered !== -1 && getCellText(colIndices.discovered) ? 
                    new Date(getCellText(colIndices.discovered)).getTime() : Date.now(),
                listingId: getCellText(colIndices.listingId)
            };
            
            // Debug: Log first few rows to see what we're getting
            if (i <= headerRowIndex + 3) {
                const urlCell = colIndices.url !== -1 && cells[colIndices.url] ? cells[colIndices.url] : null;
                console.log(`🔍 Row ${i} debug:`, {
                    name: nameVal.substring(0, 30),
                    urlCellHTML: urlCell ? urlCell.innerHTML.substring(0, 100) : 'N/A',
                    extractedUrl: url ? url.substring(0, 50) : 'none'
                });
            }
            
            if (url) {
                console.log(`✅ Row ${i}: Found URL: ${url.substring(0, 60)}...`);
            }
            
            deals.push(deal);
        } catch (error) {
            console.warn('Error parsing HTML row ' + i + ':', error);
        }
    }
    
    console.log(`Parsed ${deals.length} deals from HTML, ${deals.filter(d => d.url).length} with valid URLs`);
    return deals;
}

// Parse Google Sheets JSON from Visualization API
function parseGoogleSheetsJSON(jsonData, columnMapping) {
    console.log('Parsing Google Sheets JSON...');
    
    const cols = jsonData.table.cols || [];
    const rows = jsonData.table.rows || [];
    
    // Build header array from column labels
    const headers = cols.map(col => (col.label || '').toLowerCase().trim());
    console.log('JSON Headers:', headers);
    
    // Find column indices - matching correct column order
    const colIndices = {
        discovered: findColumnIndex(headers, columnMapping.discovered || ['date added', 'discovered', 'added', 'listed date']),
        name: findColumnIndex(headers, columnMapping.name || ['name', 'business name', 'deal name', 'title']),
        industry: findColumnIndex(headers, columnMapping.industry || ['industry', 'sector', 'category', 'type']),
        description: findColumnIndex(headers, columnMapping.description || ['description', 'details', 'summary', 'about', 'notes']),
        city: findColumnIndex(headers, columnMapping.city || ['city']),
        county: findColumnIndex(headers, columnMapping.county || ['county']),
        state: findColumnIndex(headers, columnMapping.state || ['state']),
        country: findColumnIndex(headers, columnMapping.country || ['country']),
        yearsEstablished: findColumnIndex(headers, columnMapping.yearsEstablished || ['years established', 'years in business', 'established']),
        ebitda: findColumnIndex(headers, columnMapping.ebitda || ['annual profit', 'ebitda', 'sde', 'cash flow', 'earnings']),
        revenue: findColumnIndex(headers, columnMapping.revenue || ['annual revenue', 'revenue', 'sales', 'gross revenue']),
        price: findColumnIndex(headers, columnMapping.price || ['asking price', 'asking', 'price', 'sale price']),
        profitMultiple: findColumnIndex(headers, columnMapping.profitMultiple || ['profit multiple', 'ebitda multiple']),
        revenueMultiple: findColumnIndex(headers, columnMapping.revenueMultiple || ['revenue multiple']),
        remote: findColumnIndex(headers, columnMapping.remote || ['remote', 'relocatable', 'absentee', 'remote/relocatable/absentee-run']),
        franchise: findColumnIndex(headers, columnMapping.franchise || ['franchise']),
        fiveYearsInBusiness: findColumnIndex(headers, columnMapping.fiveYearsInBusiness || ['5+ years in business', 'years in business']),
        brokerName: findColumnIndex(headers, columnMapping.brokerName || ['broker name', 'broker']),
        brokerCompany: findColumnIndex(headers, columnMapping.brokerCompany || ['broker company', 'brokerage']),
        brokerPhone: findColumnIndex(headers, columnMapping.brokerPhone || ['broker contact', 'broker phone', 'phone']),
        brokerEmail: findColumnIndex(headers, columnMapping.brokerEmail || ['broker email', 'contact email', 'email']),
        url: findColumnIndex(headers, columnMapping.url || ['view listing', 'listing url', 'url', 'link', 'website', 'deal url'])
    };
    
    console.log('JSON Column mapping:', colIndices);
    
    const deals = [];
    
    // Helper to get cell value
    const getCellValue = (row, idx) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '';
        const cell = row.c[idx];
        // Check for formatted value first, then raw value
        return (cell.f || cell.v || '').toString().trim();
    };
    
    // Check if JSON has hyperlink data in cells
    // Google Visualization API sometimes includes 'p' property with hyperlinks
    const getCellHyperlink = (row, idx) => {
        if (idx === -1 || !row.c || !row.c[idx]) return '';
        const cell = row.c[idx];
        // Check for hyperlink in cell properties
        if (cell.p && cell.p.link) {
            return cell.p.link;
        }
        // Check for URL in the value itself
        const val = (cell.v || '').toString();
        if (val.startsWith('http://') || val.startsWith('https://')) {
            return val;
        }
        return '';
    };
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.c) continue;
        
        const nameVal = getCellValue(row, colIndices.name);
        if (!nameVal || nameVal.toLowerCase().includes('auto update') || nameVal.toLowerCase().includes('member area')) {
            continue;
        }
        
        // Try to get URL from hyperlink property or direct value
        let url = getCellHyperlink(row, colIndices.url);
        
        // Log first few rows for debugging
        if (i < 5) {
            const urlCell = row.c && row.c[colIndices.url];
            console.log(`🔍 JSON Row ${i}: name="${nameVal.substring(0,30)}", urlCell:`, urlCell);
        }
        
        // Build location
        const city = getCellValue(row, colIndices.city);
        const state = getCellValue(row, colIndices.state);
        const location = city && state ? `${city}, ${state}` : city || state;
        
        // Get broker info
        const brokerName = getCellValue(row, colIndices.brokerName);
        const brokerCompany = getCellValue(row, colIndices.brokerCompany);
        const brokerDisplay = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : brokerName || brokerCompany;
        
        const deal = {
            id: generateDealId(url || nameVal || `json_row_${i}`),
            name: nameVal,
            url: url,
            industry: getCellValue(row, colIndices.industry),
            description: getCellValue(row, colIndices.description),
            location: location,
            city: city,
            county: getCellValue(row, colIndices.county),
            state: state,
            country: getCellValue(row, colIndices.country),
            yearsEstablished: getCellValue(row, colIndices.yearsEstablished),
            ebitda: parsePrice(getCellValue(row, colIndices.ebitda)),
            revenue: parsePrice(getCellValue(row, colIndices.revenue)),
            askingPrice: parsePrice(getCellValue(row, colIndices.price)),
            profitMultiple: parseFloat(getCellValue(row, colIndices.profitMultiple)) || null,
            revenueMultiple: parseFloat(getCellValue(row, colIndices.revenueMultiple)) || null,
            remote: getCellValue(row, colIndices.remote),
            franchise: getCellValue(row, colIndices.franchise),
            fiveYearsInBusiness: getCellValue(row, colIndices.fiveYearsInBusiness),
            broker: brokerDisplay,
            brokerName: brokerName,
            brokerCompany: brokerCompany,
            brokerPhone: getCellValue(row, colIndices.brokerPhone),
            brokerEmail: getCellValue(row, colIndices.brokerEmail),
            source: 'google_sheets',
            sourceType: 'google_sheets',
            discoveredAt: colIndices.discovered !== -1 && getCellValue(row, colIndices.discovered) ? 
                new Date(getCellValue(row, colIndices.discovered)).getTime() : Date.now()
        };
        
        deals.push(deal);
    }
    
    console.log(`Parsed ${deals.length} deals from JSON`);
    return deals;
}

// Extract hyperlinks from published Google Sheet by loading it in an iframe
async function extractHyperlinksFromPublishedSheet(pubhtmlUrl, columnIndex) {
    return new Promise((resolve, reject) => {
        console.log('🔗 Attempting to extract hyperlinks from rendered published sheet...');
        
        // Create hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.position = 'absolute';
        iframe.style.width = '100%';
        iframe.style.height = '1000px';
        iframe.style.visibility = 'hidden';
        iframe.sandbox = 'allow-same-origin allow-scripts';
        
        const timeout = setTimeout(() => {
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
            reject(new Error('Timeout loading published sheet'));
        }, 20000);
        
        iframe.onload = () => {
            // Wait a bit for JavaScript to render the table
            setTimeout(() => {
                try {
                    console.log('📄 Published sheet loaded in iframe, attempting to access...');
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // Find the table
                    const table = iframeDoc.querySelector('table.waffle') || iframeDoc.querySelector('table');
                    if (!table) {
                        clearTimeout(timeout);
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                        console.warn('No table found in iframe');
                        resolve([]); // Return empty array instead of rejecting
                        return;
                    }
                    
                    console.log('✅ Found table in published sheet');
                    
                    // Extract hyperlinks from the specified column
                    const rows = table.querySelectorAll('tr');
                    const hyperlinks = [];
                    
                    console.log(`Found ${rows.length} rows, extracting from column ${columnIndex}...`);
                    
                    for (let i = 1; i < rows.length; i++) { // Skip header row (index 0)
                        const cells = rows[i].querySelectorAll('td');
                        if (cells[columnIndex]) {
                            const link = cells[columnIndex].querySelector('a');
                            if (link && link.href) {
                                // Clean up the URL
                                let url = link.href;
                                // Remove Google redirect if present
                                if (url.includes('google.com/url?')) {
                                    const match = url.match(/[?&](?:q|url)=([^&]+)/);
                                    if (match) {
                                        url = decodeURIComponent(match[1]);
                                    }
                                }
                                hyperlinks.push(url);
                                console.log(`Row ${i}: Found URL: ${url.substring(0, 60)}...`);
                            } else {
                                hyperlinks.push('');
                            }
                        } else {
                            hyperlinks.push('');
                        }
                    }
                    
                    console.log(`✅ Extracted ${hyperlinks.filter(h => h).length} hyperlinks from ${hyperlinks.length} rows`);
                    
                    clearTimeout(timeout);
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    resolve(hyperlinks);
                    
                } catch (error) {
                    clearTimeout(timeout);
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    console.error('Error extracting hyperlinks:', error);
                    resolve([]); // Return empty array instead of rejecting
                }
            }, 5000); // Wait 5 seconds for JavaScript to render
        };
        
        iframe.onerror = (error) => {
            clearTimeout(timeout);
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
            console.error('Iframe load error:', error);
            resolve([]); // Return empty array instead of rejecting
        };
        
        document.body.appendChild(iframe);
        iframe.src = pubhtmlUrl;
    });
}

function getGoogleSheetsAuthToken(interactive = true) {
    return new Promise((resolve, reject) => {
        if (!chrome?.identity?.getAuthToken) {
            reject(new Error('Chrome identity API not available'));
            return;
        }
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError || !token) {
                reject(new Error(chrome.runtime.lastError?.message || 'Failed to get auth token'));
                return;
            }
            resolve(token);
        });
    });
}

function removeCachedAuthToken(token) {
    return new Promise((resolve) => {
        if (!chrome?.identity?.removeCachedAuthToken || !token) {
            resolve();
            return;
        }
        chrome.identity.removeCachedAuthToken({ token }, () => resolve());
    });
}

async function fetchSheetsMetadata(sheetId, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets(properties(sheetId,title))`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response;
}

async function fetchSheetsGridData(sheetId, range, token) {
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&ranges=${encodedRange}&fields=sheets(data(rowData(values(formattedValue,hyperlink))))`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response;
}

async function resolveSheetTitle(info, token, fallbackTitle) {
    try {
        const response = await fetchSheetsMetadata(info.id, token);
        if (!response.ok) {
            throw new Error(`Metadata fetch failed (${response.status})`);
        }
        const data = await response.json();
        const sheets = data.sheets || [];
        const gid = info.gid ? parseInt(info.gid, 10) : null;
        let match = null;
        if (!Number.isNaN(gid)) {
            match = sheets.find(s => s.properties?.sheetId === gid);
        }
        if (!match && fallbackTitle) {
            match = sheets.find(s => s.properties?.title === fallbackTitle);
        }
        return match?.properties?.title || sheets[0]?.properties?.title || fallbackTitle || 'Sheet1';
    } catch (error) {
        console.warn('⚠️ Failed to resolve sheet title, using fallback:', error.message);
        return fallbackTitle || 'Sheet1';
    }
}

function parseSheetsRowData(rows, columnMapping) {
    if (!rows || rows.length === 0) {
        return [];
    }

    const headerCells = rows[0]?.values || [];
    const headers = headerCells.map((cell, index) => {
        const label = (cell?.formattedValue || '').trim();
        if (label) return label;
        const columnLetter = String.fromCharCode(65 + index);
        return `Column_${columnLetter}`;
    });
    const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());

    const colIndices = {
        discovered: findColumnIndex(lowerHeaders, columnMapping.discovered || ['date added', 'discovered', 'added', 'listed date']),
        name: findColumnIndex(lowerHeaders, columnMapping.name || ['name', 'business name', 'deal name', 'title']),
        industry: findColumnIndex(lowerHeaders, columnMapping.industry || ['industry', 'sector', 'category', 'type']),
        description: findColumnIndex(lowerHeaders, columnMapping.description || ['description', 'details', 'summary', 'about', 'notes']),
        city: findColumnIndex(lowerHeaders, columnMapping.city || ['city']),
        county: findColumnIndex(lowerHeaders, columnMapping.county || ['county']),
        state: findColumnIndex(lowerHeaders, columnMapping.state || ['state']),
        country: findColumnIndex(lowerHeaders, columnMapping.country || ['country']),
        yearsEstablished: findColumnIndex(lowerHeaders, columnMapping.yearsEstablished || ['years established', 'years in business', 'established']),
        ebitda: findColumnIndex(lowerHeaders, columnMapping.ebitda || ['annual profit', 'ebitda', 'sde', 'cash flow', 'earnings']),
        revenue: findColumnIndex(lowerHeaders, columnMapping.revenue || ['annual revenue', 'revenue', 'sales', 'gross revenue']),
        price: findColumnIndex(lowerHeaders, columnMapping.price || ['asking price', 'asking', 'price', 'sale price']),
        profitMultiple: findColumnIndex(lowerHeaders, columnMapping.profitMultiple || ['profit multiple', 'ebitda multiple']),
        revenueMultiple: findColumnIndex(lowerHeaders, columnMapping.revenueMultiple || ['revenue multiple']),
        remote: findColumnIndex(lowerHeaders, columnMapping.remote || ['remote', 'relocatable', 'absentee', 'remote/relocatable/absentee-run']),
        franchise: findColumnIndex(lowerHeaders, columnMapping.franchise || ['franchise']),
        fiveYearsInBusiness: findColumnIndex(lowerHeaders, columnMapping.fiveYearsInBusiness || ['5+ years in business', 'years in business']),
        brokerName: findColumnIndex(lowerHeaders, columnMapping.brokerName || ['broker name', 'broker']),
        brokerCompany: findColumnIndex(lowerHeaders, columnMapping.brokerCompany || ['broker company', 'brokerage']),
        brokerPhone: findColumnIndex(lowerHeaders, columnMapping.brokerPhone || ['broker contact', 'broker phone', 'contact phone', 'phone', 'phone number']),
        brokerEmail: findColumnIndex(lowerHeaders, columnMapping.brokerEmail || ['broker email', 'contact email', 'email']),
        url: findColumnIndex(lowerHeaders, columnMapping.url || ['view listing', 'listing url', 'url', 'link', 'website', 'deal url']),
        location: findColumnIndex(lowerHeaders, columnMapping.location || ['location', 'address', 'region']),
        source: findColumnIndex(lowerHeaders, columnMapping.source || ['source', 'platform', 'marketplace'])
    };

    const deals = [];
    
    // DEBUG: Log headers to see what we're working with
    console.log('🔍 Google Sheets Headers (first 10):', headers.slice(0, 10));
    console.log('🔍 Column indices:', {
        name: colIndices.name,
        price: colIndices.price,
        ebitda: colIndices.ebitda,
        location: colIndices.location,
        city: colIndices.city,
        state: colIndices.state,
        url: colIndices.url
    });
    
    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i]?.values || [];
        const values = headers.map((_, index) => (cells[index]?.formattedValue || '').trim());
        const hasAnyValue = values.some(value => value && value.trim());
        if (!hasAnyValue) continue;
        
        // DEBUG: Log first 3 data rows
        if (i <= 3) {
            console.log(`🔍 Row ${i} sample values (first 10):`, values.slice(0, 10));
        }

        const getValue = (index) => {
            if (index === -1 || index >= values.length) return '';
            return values[index] || '';
        };

        const rawColumns = {};
        headers.forEach((header, index) => {
            rawColumns[header] = values[index] || '';
        });

        let url = '';
        if (colIndices.url !== -1) {
            const urlCell = cells[colIndices.url];
            if (urlCell?.hyperlink) {
                url = urlCell.hyperlink;
            } else {
                const urlText = getValue(colIndices.url);
                if (urlText.startsWith('http://') || urlText.startsWith('https://')) {
                    url = urlText;
                }
            }
        }
        if (!url) {
            const linkedCell = cells.find(cell => cell?.hyperlink);
            if (linkedCell?.hyperlink) {
                url = linkedCell.hyperlink;
            }
        }

        const nameVal = getValue(colIndices.name);
        const dealName = nameVal || generateDealName(values, colIndices, i);

        let location = getValue(colIndices.location);
        if (!location) {
            const city = getValue(colIndices.city);
            const state = getValue(colIndices.state);
            if (city && state) location = `${city}, ${state}`;
            else if (city) location = city;
            else if (state) location = state;
        }

        const brokerName = getValue(colIndices.brokerName);
        const brokerCompany = getValue(colIndices.brokerCompany);
        const brokerDisplay = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : brokerName || brokerCompany;

        const deal = {
            id: generateDealId(url || dealName || `row_${i}`),
            name: dealName,
            url: url,
            industry: getValue(colIndices.industry),
            description: getValue(colIndices.description),
            location: location,
            city: getValue(colIndices.city),
            county: getValue(colIndices.county),
            state: getValue(colIndices.state),
            country: getValue(colIndices.country),
            yearsEstablished: getValue(colIndices.yearsEstablished),
            ebitda: parsePrice(getValue(colIndices.ebitda)),
            revenue: parsePrice(getValue(colIndices.revenue)),
            askingPrice: parsePrice(getValue(colIndices.price)),
            profitMultiple: parseFloat(getValue(colIndices.profitMultiple)) || null,
            revenueMultiple: parseFloat(getValue(colIndices.revenueMultiple)) || null,
            remote: getValue(colIndices.remote),
            franchise: getValue(colIndices.franchise),
            fiveYearsInBusiness: getValue(colIndices.fiveYearsInBusiness),
            broker: brokerDisplay,
            brokerName: brokerName,
            brokerCompany: brokerCompany,
            brokerPhone: getValue(colIndices.brokerPhone),
            brokerEmail: getValue(colIndices.brokerEmail),
            source: getValue(colIndices.source) || 'google_sheets',
            sourceType: 'google_sheets',
            discoveredAt: getValue(colIndices.discovered) ?
                new Date(getValue(colIndices.discovered)).getTime() : Date.now(),
            rawColumns: rawColumns
        };
        
        // DEBUG: Log first 3 deals to see what we're getting
        if (i <= 3) {
            console.log(`🔍 Parsed deal ${i}:`, {
                name: deal.name?.substring(0, 50),
                askingPrice: deal.askingPrice,
                ebitda: deal.ebitda,
                location: deal.location,
                city: deal.city,
                state: deal.state,
                industry: deal.industry,
                url: deal.url?.substring(0, 50),
                rawPriceValue: getValue(colIndices.price),
                rawEbitdaValue: getValue(colIndices.ebitda)
            });
        }

        deals.push(deal);
    }

    console.log(`Parsed ${deals.length} deals from Google Sheets API`);
    return deals;
}

// Parse Opensheet JSON data to internal deal format
function parseOpensheetData(rows, columnMapping, sourceName) {
    if (!rows || rows.length === 0) {
        return [];
    }
    
    console.log('🔍 Parsing Opensheet data - first row keys:', Object.keys(rows[0] || {}).slice(0, 10));
    
    const deals = [];
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip empty rows
        const hasAnyValue = Object.values(row).some(val => val && String(val).trim());
        if (!hasAnyValue) continue;
        
        // Extract URL - check multiple possible column names
        let url = row['Parsed URL'] || row['View Listing'] || row['URL'] || row['Link'] || row['Listing URL'] || '';
        
        // Extract name
        const dealName = row['Name'] || row['Business Name'] || row['Deal Name'] || row['Title'] || '';
        
        // Build location from city + state
        const city = row['City'] || '';
        const state = row['State'] || '';
        const location = (city && state) ? `${city}, ${state}` : (city || state || row['Location'] || '');
        
        // Build broker display
        const brokerName = row['Broker Name'] || '';
        const brokerCompany = row['Broker Company'] || '';
        const brokerDisplay = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : brokerName || brokerCompany;
        
        const deal = {
            id: generateDealId(url || dealName || `opensheet_${i}`),
            name: dealName,
            url: url,
            industry: row['Industry'] || '',
            description: row['Description'] || '',
            location: location,
            city: city,
            county: row['County'] || '',
            state: state,
            country: row['Country'] || '',
            yearsEstablished: row['Years Established'] || '',
            ebitda: parsePrice(row['Annual Profit']),
            revenue: parsePrice(row['Annual Revenue']),
            askingPrice: parsePrice(row['Asking Price']),
            profitMultiple: parseFloat(row['Profit Multiple']) || null,
            revenueMultiple: parseFloat(row['Revenue Multiple']) || null,
            remote: row['Remote/Relocatable/Absentee-Run'] || '',
            franchise: row['Franchise'] || '',
            fiveYearsInBusiness: row['5+ Years In Business'] || '',
            broker: brokerDisplay,
            brokerName: brokerName,
            brokerCompany: brokerCompany,
            brokerPhone: row['Broker Contact'] || '',
            brokerEmail: row['Broker Email'] || '',
            source: sourceName || 'google_sheets',
            sourceType: 'google_sheets',
            discoveredAt: row['Date Added'] ? new Date(row['Date Added']).getTime() : Date.now(),
            rawColumns: row // Preserve all original columns
        };
        
        // DEBUG: Log first 3 deals
        if (i < 3) {
            console.log(`🔍 Parsed Opensheet deal ${i + 1}:`, {
                name: deal.name?.substring(0, 50),
                askingPrice: deal.askingPrice,
                ebitda: deal.ebitda,
                location: deal.location,
                industry: deal.industry?.substring(0, 30),
                url: deal.url?.substring(0, 50)
            });
        }
        
        deals.push(deal);
    }
    
    console.log(`✅ Parsed ${deals.length} deals from Opensheet JSON`);
    return deals;
}

// Fetch data from Google Sheets - tries authenticated API first (no row limit), falls back to Opensheet (~5K cap)
async function fetchGoogleSheets(source) {
    console.log('🌐 Fetching Google Sheets:', source.name);
    console.log('📋 Sheet URL:', source.url);

    const sheetInfo = extractSheetInfo(source.url);

    // Try authenticated Google Sheets API first (no row limit)
    try {
        const token = await getGoogleSheetsAuthToken(false);
        console.log('🔑 Got auth token, using Google Sheets API v4 (unlimited rows)');

        const sheetTitle = await resolveSheetTitle(sheetInfo, token, source.sheetName || source.sheetTab);
        console.log(`📄 Resolved sheet tab: "${sheetTitle}"`);

        const response = await fetchSheetsGridData(sheetInfo.id, sheetTitle, token);
        if (!response.ok) {
            throw new Error(`Google Sheets API error (${response.status})`);
        }

        const data = await response.json();
        const rows = data.sheets?.[0]?.data?.[0]?.rowData || [];
        console.log(`✅ Fetched ${rows.length} rows via Google Sheets API`);

        return parseSheetsRowData(rows, source.columnMapping || {});
    } catch (authError) {
        console.warn('⚠️ Authenticated API unavailable, falling back to Opensheet:', authError.message);
    }

    // Fallback: Opensheet API (no auth needed, but capped at ~5,000 rows)
    try {
        const sheetName = source.sheetName || source.sheetTab || '1';
        const opensheetUrl = `https://opensheet.elk.sh/${sheetInfo.id}/${encodeURIComponent(sheetName)}`;
        console.log('🌐 Opensheet URL:', opensheetUrl);
        console.log('⚠️ Note: Opensheet API may cap results at ~5,000 rows');

        const response = await fetch(opensheetUrl);
        if (!response.ok) {
            throw new Error(`Opensheet API error (${response.status}): ${response.statusText}`);
        }

        const jsonData = await response.json();
        console.log(`✅ Fetched ${jsonData.length} rows from Opensheet API`);

        return parseOpensheetData(jsonData, source.columnMapping || {}, source.name);
    } catch (error) {
        console.error('❌ Error fetching Google Sheets:', error);
        throw error;
    }
}

// Fetch data from CSV URL
async function fetchCSV(source) {
    console.log('Fetching CSV:', source.name);
    
    try {
        const response = await fetch(source.url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const deals = parseCSV(csvText, source.columnMapping || {});
        
        console.log(`Parsed ${deals.length} deals from CSV`);
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
    console.warn(`Could not extract name for row ${rowNumber}, using fallback name`);
    return `Deal ${rowNumber}`;
}

// Find the actual header row (some sheets have title rows before headers)
function findHeaderRow(lines) {
    // Updated keywords to match the actual column names from the spreadsheet
    const headerKeywords = ['date added', 'name', 'industry', 'description', 'city', 'county', 'state', 
                           'annual profit', 'annual revenue', 'asking price', 'broker name', 'view listing'];
    
    console.log('🔍 Searching for header row in first 15 lines...');
    
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const parsed = parseCSVLine(lines[i]);
        const lowerCells = parsed.map(cell => (cell || '').toLowerCase().trim());
        
        console.log(`  Row ${i}: First 5 cells:`, parsed.slice(0, 5));
        
        // Strategy 1: Check if first column is "Date Added" (very specific identifier)
        if (lowerCells[0] && lowerCells[0].includes('date added')) {
            console.log(`✅ Found header row at line ${i} (matched "Date Added" in first column)`);
            return i;
        }
        
        // Strategy 2: Check if this row contains multiple header keywords
        let matches = 0;
        const matchedKeywords = [];
        for (const keyword of headerKeywords) {
            if (lowerCells.some(cell => cell.includes(keyword))) {
                matches++;
                matchedKeywords.push(keyword);
            }
        }
        
        console.log(`    Matched ${matches} keywords:`, matchedKeywords);
        
        // If we find 5+ header keywords, this is likely the header row
        if (matches >= 5) {
            console.log(`✅ Found header row at line ${i}`);
            return i;
        }
    }
    
    console.warn('⚠️ Could not find header row, defaulting to row 0');
    // Default to first row if no header found
    return 0;
}

// Split CSV text into rows, properly handling quoted fields with newlines
function splitCSVIntoRows(csvText) {
    const rows = [];
    let currentRow = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];
        
        if (char === '"') {
            // Handle escaped quotes ("") inside quoted fields
            if (inQuotes && nextChar === '"') {
                currentRow += '""';
                i++; // Skip the next quote
            } else {
                inQuotes = !inQuotes;
                currentRow += char;
            }
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            // End of row (not inside quotes)
            if (currentRow.trim()) {
                rows.push(currentRow);
            }
            currentRow = '';
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n after \r
            }
        } else if (char === '\r' && !inQuotes) {
            // Handle standalone \r as line ending
            if (currentRow.trim()) {
                rows.push(currentRow);
            }
            currentRow = '';
        } else {
            currentRow += char;
        }
    }
    
    // Don't forget the last row
    if (currentRow.trim()) {
        rows.push(currentRow);
    }
    
    return rows;
}

// Parse CSV text to deals
function parseCSV(csvText, columnMapping) {
    const lines = splitCSVIntoRows(csvText);
    if (lines.length === 0) return [];
    
    // Find the actual header row (may not be row 0)
    const headerRowIndex = findHeaderRow(lines);
    const headers = parseCSVLine(lines[headerRowIndex]);
    console.log('🔍 CSV Headers found at row', headerRowIndex);
    console.log('📋 FULL HEADER LIST:');
    headers.forEach((header, index) => {
        console.log(`  Column ${index}: "${header}"`);
    });
    
    // Get column indices - matching your Google Sheet structure
    // Correct order: Date Added, Name, Industry, Description, City, County, State, Country, 
    // Years Established, Annual Profit, Annual Revenue, Asking Price, Profit Multiple, 
    // Revenue Multiple, Remote/Relocatable/Absentee-Run, Franchise, 5+ Years In Business,
    // Broker Name, Broker Company, Broker Contact, Broker Email, View Listing
    
    // Use exact column indices based on the known structure (more reliable than name matching)
    // Column W (index 22) contains the raw URL
    const colIndices = {
        discovered: 0,      // A: Date Added
        name: 1,            // B: Name
        industry: 2,        // C: Industry
        description: 3,     // D: Description
        city: 4,            // E: City
        county: 5,          // F: County
        state: 6,           // G: State
        country: 7,         // H: Country
        yearsEstablished: 8, // I: Years Established
        ebitda: 9,          // J: Annual Profit
        revenue: 10,        // K: Annual Revenue
        price: 11,          // L: Asking Price
        profitMultiple: 12, // M: Profit Multiple
        revenueMultiple: 13, // N: Revenue Multiple
        remote: 14,         // O: Remote/Relocatable/Absentee-Run
        franchise: 15,      // P: Franchise
        fiveYearsInBusiness: 16, // Q: 5+ Years In Business
        brokerName: 17,     // R: Broker Name
        brokerCompany: 18,  // S: Broker Company
        brokerPhone: 19,    // T: Broker Contact
        brokerEmail: 20,    // U: Broker Email
        viewListing: 21,    // V: View Listing (display text, not parsable)
        url: 22,            // W: Raw URL
        location: -1,       // Will be built from city + state
        source: -1          // Not in spreadsheet
    };
    
    // Log ALL headers for debugging
    console.log('📋 ALL HEADERS DETECTED:', headers);
    
    console.log('✅ Using fixed column indices (hardcoded based on known structure):');
    console.log('Column mapping:', {
        discovered: `${headers[0] || 'N/A'} (col A/0)`,
        name: `${headers[1] || 'N/A'} (col B/1)`,
        industry: `${headers[2] || 'N/A'} (col C/2)`,
        description: `${headers[3] || 'N/A'} (col D/3)`,
        city: `${headers[4] || 'N/A'} (col E/4)`,
        county: `${headers[5] || 'N/A'} (col F/5)`,
        state: `${headers[6] || 'N/A'} (col G/6)`,
        country: `${headers[7] || 'N/A'} (col H/7)`,
        yearsEstablished: `${headers[8] || 'N/A'} (col I/8)`,
        ebitda: `${headers[9] || 'N/A'} (col J/9)`,
        revenue: `${headers[10] || 'N/A'} (col K/10)`,
        price: `${headers[11] || 'N/A'} (col L/11)`,
        profitMultiple: `${headers[12] || 'N/A'} (col M/12)`,
        revenueMultiple: `${headers[13] || 'N/A'} (col N/13)`,
        remote: `${headers[14] || 'N/A'} (col O/14)`,
        franchise: `${headers[15] || 'N/A'} (col P/15)`,
        fiveYearsInBusiness: `${headers[16] || 'N/A'} (col Q/16)`,
        brokerName: `${headers[17] || 'N/A'} (col R/17)`,
        brokerCompany: `${headers[18] || 'N/A'} (col S/18)`,
        brokerPhone: `${headers[19] || 'N/A'} (col T/19)`,
        brokerEmail: `${headers[20] || 'N/A'} (col U/20)`,
        viewListing: `${headers[21] || 'N/A'} (col V/21)`,
        url: `${headers[22] || 'N/A'} (col W/22)`
    });
    
    // Parse data rows (start after header row)
    const deals = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;
            
            // Debug: Log first THREE data rows to understand the pattern
            if (i <= headerRowIndex + 3) {
                console.log(`\n🔍 DATA ROW ${i - headerRowIndex}:`);
                console.log(`  Total columns in this row: ${values.length}`);
                values.forEach((val, index) => {
                    const headerName = headers[index] || 'N/A';
                    const preview = val.substring(0, 60);
                    console.log(`  Col ${index} [${headerName}]: "${preview}${val.length > 60 ? '...' : ''}"`);
                });
            }
            
            // Skip rows that look like section headers or empty data
            const nameVal = colIndices.name !== -1 && values[colIndices.name] ? (values[colIndices.name] || '').trim() : '';
            if (!nameVal || nameVal.toLowerCase().includes('auto update') || nameVal.toLowerCase().includes('member area')) {
                continue;
            }
            
            // Use the name directly from the Name column
            const dealName = nameVal || generateDealName(values, colIndices, i);
            
            // Safety check: make sure we have enough columns
            if (values.length < 10) {
                console.warn(`Row ${i}: Only ${values.length} columns, skipping (expected at least 10)`);
                continue;
            }
            
            // Helper function to safely get value from array
            const safeGetValue = (index) => {
                if (index === -1 || index >= values.length) return '';
                return (values[index] || '').trim();
            };
            
            // Build location from city + state if available
            let location = safeGetValue(colIndices.location);
            if (!location) {
                const city = safeGetValue(colIndices.city);
                const state = safeGetValue(colIndices.state);
                if (city && state) {
                    location = `${city}, ${state}`;
                } else if (city) {
                    location = city;
                } else if (state) {
                    location = state;
                }
            }
            
            // Extract and validate URL
            let rawUrl = safeGetValue(colIndices.url);
            // Only keep URLs that start with http:// or https://
            const validUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) ? rawUrl : '';
            
            if (!validUrl && rawUrl && !rawUrl.startsWith('http')) {
                if (i <= headerRowIndex + 3) {
                    console.log(`Row ${i}: URL value "${rawUrl}" is not a valid URL (may be hyperlink display text)`);
                }
            }
            
            // Get broker info
            const brokerName = safeGetValue(colIndices.brokerName);
            const brokerCompany = safeGetValue(colIndices.brokerCompany);
            const brokerDisplay = brokerName && brokerCompany ? `${brokerName} (${brokerCompany})` : brokerName || brokerCompany;
            
            const deal = {
                id: generateDealId(validUrl || dealName || `row_${i}`),
                name: dealName,
                url: validUrl,
                description: safeGetValue(colIndices.description),
                industry: safeGetValue(colIndices.industry),
                location: location,
                city: safeGetValue(colIndices.city),
                county: safeGetValue(colIndices.county),
                state: safeGetValue(colIndices.state),
                country: safeGetValue(colIndices.country),
                yearsEstablished: safeGetValue(colIndices.yearsEstablished),
                ebitda: parsePrice(safeGetValue(colIndices.ebitda)),
                revenue: parsePrice(safeGetValue(colIndices.revenue)),
                askingPrice: parsePrice(safeGetValue(colIndices.price)),
                profitMultiple: parseFloat(safeGetValue(colIndices.profitMultiple)) || null,
                revenueMultiple: parseFloat(safeGetValue(colIndices.revenueMultiple)) || null,
                remote: safeGetValue(colIndices.remote),
                franchise: safeGetValue(colIndices.franchise),
                fiveYearsInBusiness: safeGetValue(colIndices.fiveYearsInBusiness),
                broker: brokerDisplay,
                brokerName: brokerName,
                brokerCompany: brokerCompany,
                brokerEmail: safeGetValue(colIndices.brokerEmail),
                brokerPhone: safeGetValue(colIndices.brokerPhone),
                source: safeGetValue(colIndices.source) || 'google_sheets',
                sourceType: 'csv',
                discoveredAt: safeGetValue(colIndices.discovered) ? 
                    new Date(safeGetValue(colIndices.discovered)).getTime() : Date.now()
            };
            
            deals.push(deal);
        } catch (error) {
            console.warn('Error parsing row ' + i + ':', error);
        }
    }
    
    console.log('Successfully parsed ' + deals.length + ' deals from CSV');
    return deals;
}

// Parse CSV line (handles quoted fields and escaped quotes)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote inside quoted field - add single quote
                current += '"';
                i++; // Skip the next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
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
    console.log(`Fetching custom source: ${source.name} (${source.type})`);
    
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

// Initialize default source on first launch
async function initializeDefaultSource() {
    const sources = await getCustomSources();
    
    // Check if default source already exists
    const hasDefault = sources.some(s => s.id === 'default_deal_source');
    if (hasDefault) {
        console.log('✅ Default source already initialized');
        return false; // Already initialized
    }
    
    console.log('🚀 First launch detected - initializing default deal source...');
    
    // Add your public deal aggregator spreadsheet as default source
    const defaultSource = {
        id: 'default_deal_source',
        name: 'Business Listings Database (100+ Real Deals)',
        type: 'google_sheets',
        url: 'https://docs.google.com/spreadsheets/d/1RKab4UHut6SvVjjCtSeCGL0xT__WTLNwsACFRmSXYyM/edit?usp=sharing',
        sheetName: '1', // First sheet tab
        enabled: true,
        addedAt: Date.now(),
        lastFetch: null,
        dealCount: 0,
        isDefault: true // Flag to identify default source
    };
    
    sources.push(defaultSource);
    await saveCustomSources(sources);
    
    console.log('✅ Default deal source initialized with real business listings');
    return true; // Newly initialized
}

// Fetch all enabled custom sources
async function fetchAllCustomSources() {
    console.log('Fetching all custom sources...');
    
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
    console.log(`Fetched ${totalDeals} deals from ${results.length} custom sources`);
    
    return results;
}

// Export functions for browser (global scope)
window.SOURCE_TYPES = SOURCE_TYPES;
window.getCustomSources = getCustomSources;
window.addCustomSource = addCustomSource;
window.removeCustomSource = removeCustomSource;
window.toggleCustomSource = toggleCustomSource;
window.fetchCustomSource = fetchCustomSource;
window.fetchAllCustomSources = fetchAllCustomSources;
window.parseGoogleSheetsUrl = parseGoogleSheetsUrl;
window.parseGoogleSheetsJSON = parseGoogleSheetsJSON;
window.extractHyperlinksFromPublishedSheet = extractHyperlinksFromPublishedSheet;

// Also export for Node.js if available
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
