// RSS Feed Parser for Business Listings
// Parses RSS feeds from various business-for-sale sources

console.log('📡 RSS Parser module loaded');

// Parse RSS XML to JSON
function parseRSSFeed(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parsing error: ' + parserError.textContent);
        }
        
        const items = xmlDoc.querySelectorAll('item');
        const deals = [];
        
        items.forEach(item => {
            const deal = extractDealFromRSSItem(item);
            if (deal) {
                deals.push(deal);
            }
        });
        
        return deals;
    } catch (error) {
        console.error('Error parsing RSS feed:', error);
        throw error;
    }
}

// Extract deal information from RSS item
function extractDealFromRSSItem(item) {
    try {
        const title = getElementText(item, 'title');
        const link = getElementText(item, 'link');
        const description = getElementText(item, 'description');
        const pubDate = getElementText(item, 'pubDate');
        
        if (!title || !link) {
            return null; // Skip items without essential data
        }
        
        // Parse deal details from title and description
        const dealData = parseDealDetails(title, description);
        
        return {
            id: generateDealId(link),
            name: title,
            url: link,
            description: cleanHTML(description),
            source: 'RSS Feed',
            sourceType: 'rss',
            discoveredAt: new Date(pubDate || Date.now()).getTime(),
            ...dealData
        };
    } catch (error) {
        console.error('Error extracting deal from RSS item:', error);
        return null;
    }
}

// Parse deal details from text (price, location, industry)
function parseDealDetails(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const details = {};
    
    // Extract price (various formats)
    const pricePatterns = [
        /\$[\d,]+k/gi,  // $500k
        /\$[\d,]+m/gi,  // $2.5m
        /\$[\d,]+/gi,   // $500000
        /price:?\s*\$?[\d,]+/gi
    ];
    
    for (const pattern of pricePatterns) {
        const match = text.match(pattern);
        if (match) {
            details.askingPrice = parsePrice(match[0]);
            break;
        }
    }
    
    // Extract EBITDA/SDE/Cash Flow
    const ebitdaPatterns = [
        /ebitda:?\s*\$?[\d,]+k?/gi,
        /sde:?\s*\$?[\d,]+k?/gi,
        /cash flow:?\s*\$?[\d,]+k?/gi
    ];
    
    for (const pattern of ebitdaPatterns) {
        const match = text.match(pattern);
        if (match) {
            details.ebitda = parsePrice(match[0]);
            break;
        }
    }
    
    // Extract location (city, state)
    const locationMatch = text.match(/(?:in|located in|location:)\s*([a-z\s]+),\s*([a-z]{2})/i);
    if (locationMatch) {
        details.city = locationMatch[1].trim();
        details.state = locationMatch[2].toUpperCase();
        details.location = `${details.city}, ${details.state}`;
    }
    
    // Extract industry keywords
    const industries = detectIndustry(text);
    if (industries.length > 0) {
        details.industry = industries[0];
        details.industries = industries;
    }
    
    return details;
}

// Detect industry from text
function detectIndustry(text) {
    const industryKeywords = {
        'Restaurant': ['restaurant', 'cafe', 'food service', 'dining'],
        'Retail': ['retail', 'store', 'shop', 'boutique'],
        'Healthcare': ['healthcare', 'medical', 'dental', 'clinic'],
        'SaaS': ['saas', 'software', 'platform', 'tech'],
        'Manufacturing': ['manufacturing', 'production', 'factory'],
        'E-commerce': ['ecommerce', 'e-commerce', 'online store'],
        'Services': ['services', 'consulting', 'agency'],
        'Franchise': ['franchise', 'franchised']
    };
    
    const detected = [];
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            detected.push(industry);
        }
    }
    
    return detected;
}

// Parse price string to number
function parsePrice(priceStr) {
    if (!priceStr) return null;
    
    // Remove non-numeric characters except K, M, and decimal
    const cleaned = priceStr.replace(/[^0-9kmKM.]/g, '').toLowerCase();
    
    let multiplier = 1;
    if (cleaned.includes('k')) {
        multiplier = 1000;
    } else if (cleaned.includes('m')) {
        multiplier = 1000000;
    }
    
    const number = parseFloat(cleaned.replace(/[km]/g, ''));
    return number * multiplier;
}

// Helper: Get text content from XML element
function getElementText(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
}

// Helper: Clean HTML from text
function cleanHTML(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// Helper: Generate unique ID from URL
function generateDealId(url) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'rss_' + Math.abs(hash).toString(36);
}

// Fetch and parse RSS feed from URL
async function fetchRSSFeed(feedUrl) {
    console.log('📡 Fetching RSS feed:', feedUrl);
    
    try {
        const response = await fetch(feedUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlText = await response.text();
        const deals = parseRSSFeed(xmlText);
        
        console.log(`✅ Parsed ${deals.length} deals from RSS feed`);
        return deals;
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
        throw error;
    }
}

// RSS Feed Sources Configuration
const RSS_FEEDS = [
    {
        name: 'Nationwide Businesses (UK)',
        url: 'https://nationwidebusinesses.co.uk/RSSFeeds/all.xml',
        enabled: true,
        region: 'UK'
    },
    {
        name: 'BizWorldUSA',
        url: 'https://www.bizworldusa.com/rss.xml',
        enabled: true,
        region: 'US'
    }
    // More feeds can be added here
];

// Fetch all enabled RSS feeds
async function fetchAllRSSFeeds() {
    console.log('📡 Fetching all RSS feeds...');
    
    const enabledFeeds = RSS_FEEDS.filter(feed => feed.enabled);
    const results = [];
    
    for (const feed of enabledFeeds) {
        try {
            const deals = await fetchRSSFeed(feed.url);
            results.push({
                source: feed.name,
                region: feed.region,
                deals: deals,
                success: true
            });
        } catch (error) {
            console.error(`Failed to fetch ${feed.name}:`, error);
            results.push({
                source: feed.name,
                region: feed.region,
                deals: [],
                success: false,
                error: error.message
            });
        }
    }
    
    const totalDeals = results.reduce((sum, r) => sum + r.deals.length, 0);
    console.log(`✅ Fetched ${totalDeals} total deals from ${results.length} RSS feeds`);
    
    return results;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseRSSFeed,
        fetchRSSFeed,
        fetchAllRSSFeeds,
        RSS_FEEDS
    };
}
