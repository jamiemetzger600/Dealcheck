# VETTR SUPER-SCRAPER — Cursor Build Plan

> Scrapy + Playwright + Site Health Monitor  
> Alpine Coast Investments — April 2026

---

## 1. Project context

This plan integrates a Python-based Scrapy scraping engine into the existing Vettr codebase.

**Current stack:**
- **Backend:** Node.js/Express (`vettr-backend` v4.2.27) with PostgreSQL on Koyeb
- **Frontend:** React/Vite (`vettr-web`) 
- **Extension:** Chrome extension (Manifest V3)
- **Existing scrapers:** `scraperRegistry.js` (service registry with cron scheduling) + `airtableScraper.js` (writes to `market_deals` table via `(source, source_id)` upsert)
- **Database:** PostgreSQL with tables: `users`, `user_settings`, `saved_deals`, `subscriptions`, `market_deals`, `deal_sources`

**What we're building:** A Python Scrapy engine that runs as a separate service alongside the Node backend. It writes to the **same `market_deals` table** using the same `(source, source_id)` upsert pattern. The Vettr frontend needs **zero changes** to display new listings.

---

## 2. Architecture overview

**Layer 1 — Scrapy Spiders (one per site):**  
Each spider defines crawl logic, pagination, and CSS/XPath selectors for a single listing site. All spiders yield standardized `DealItem` objects. For JS-rendered SPAs (Crexi, LoopNet), spiders use `scrapy-playwright` to render pages in headless Chromium.

**Layer 2 — Item Pipelines (chained processors):**  
Five pipeline stages run in sequence on every extracted item:
1. `SchemaMapperPipeline` — normalize field names and types
2. `ValidationPipeline` — type checks, range validation, cross-field logic
3. `ConfidenceScorerPipeline` — 0-100 extraction confidence
4. `DedupPipeline` — check against known `source_ids`, detect price changes
5. `PostgresPipeline` — upsert to `market_deals`

**Layer 3 — Health Monitor:**  
Tracks per-site metrics (items scraped, error rate, field yield, last successful run). Detects schema drift by comparing expected vs actual field extraction rates. Writes to `scraper_health_log` table.

**Layer 4 — Site Registry:**  
Database table (`scraper_site_config`) tracking all registered sites, their health status, selectors, and schedules. Exposed via Node API endpoints for admin dashboard.

---

## 3. File structure

**Branch: `feature/scrapy-engine`**

All new files go under a new `/python` directory at the repo root.

```
Dealcheck-main/
├── backend/                          # Existing Node.js backend (minimal changes)
│   └── src/
│       ├── services/
│       │   ├── scraperRegistry.js    # Add new source registrations
│       │   └── airtableScraper.js    # Existing — keep as-is
│       ├── routes/
│       │   └── scraperAdmin.js       # NEW: health/status API endpoints
│       └── db/
│           └── migrate.js            # ADD: new table migrations
│
├── python/                           # NEW: Scrapy engine
│   ├── requirements.txt
│   ├── scrapy.cfg
│   ├── .env.example                  # DATABASE_URL, PROXY_LIST, etc.
│   ├── vettr_scraper/
│   │   ├── __init__.py
│   │   ├── settings.py               # Scrapy settings, pipeline chain, middleware
│   │   ├── items.py                  # DealItem (canonical schema)
│   │   │
│   │   ├── pipelines/
│   │   │   ├── __init__.py
│   │   │   ├── schema_mapper.py      # Normalize raw fields → clean types
│   │   │   ├── validator.py          # Type/range checks, drop invalid items
│   │   │   ├── confidence_scorer.py  # 0-100 score based on field completeness
│   │   │   ├── dedup.py              # Detect new vs updated vs unchanged
│   │   │   └── postgres_writer.py    # Upsert to market_deals
│   │   │
│   │   ├── spiders/
│   │   │   ├── __init__.py
│   │   │   ├── base_listing_spider.py    # Shared pagination, error handling
│   │   │   ├── bizbuysell.py             # Static HTML
│   │   │   ├── bizquest.py               # Static HTML (similar to BizBuySell)
│   │   │   ├── crexi.py                  # Uses scrapy-playwright (SPA)
│   │   │   ├── loopnet.py                # Uses scrapy-playwright (SPA)
│   │   │   └── bizden.py                 # Static HTML
│   │   │
│   │   ├── middlewares/
│   │   │   ├── __init__.py
│   │   │   ├── proxy_rotation.py         # Rotate proxies per request
│   │   │   └── user_agent_rotation.py    # Rotate User-Agent strings
│   │   │
│   │   ├── health/
│   │   │   ├── __init__.py
│   │   │   ├── monitor.py                # Post-crawl health metrics
│   │   │   ├── schema_drift.py           # Compare field yields vs baseline
│   │   │   └── alerter.py                # Email alerts via API call to Node
│   │   │
│   │   └── utils/
│   │       ├── field_parsers.py           # Currency/date/enum parsing helpers
│   │       └── llm_fallback.py            # Claude API for offline selector regen
│   │
│   ├── run_spider.py                 # CLI: python run_spider.py bizbuysell
│   ├── run_all.py                    # Orchestrate all enabled spiders
│   └── tests/
│       ├── test_bizbuysell.py
│       ├── test_pipelines.py
│       └── fixtures/                 # Saved HTML samples per site for offline testing
│           ├── bizbuysell_listing.html
│           ├── bizbuysell_detail.html
│           ├── crexi_listing.html
│           └── crexi_detail.html
│
├── scrapers/                         # Existing (keep rss-parser.js as-is)
└── web/                              # Existing React frontend (no changes needed)
```

---

## 4. Database changes

Add these migrations to `backend/src/db/migrate.js`. The existing `market_deals` table is **unchanged** — Scrapy writes to it using the same `(source, source_id)` upsert pattern.

### 4a. `scraper_health_log` table

```sql
CREATE TABLE IF NOT EXISTS scraper_health_log (
    id SERIAL PRIMARY KEY,
    source_key VARCHAR(50) NOT NULL,        -- matches deal_sources.source_key
    spider_name VARCHAR(100),               -- Scrapy spider class name
    run_started_at TIMESTAMP NOT NULL,
    run_finished_at TIMESTAMP,
    items_scraped INTEGER DEFAULT 0,        -- total items yielded by spider
    items_stored INTEGER DEFAULT 0,         -- items successfully upserted
    items_new INTEGER DEFAULT 0,            -- new listings discovered
    items_updated INTEGER DEFAULT 0,        -- existing listings with changes
    items_failed INTEGER DEFAULT 0,         -- items that failed validation
    error_count INTEGER DEFAULT 0,          -- HTTP/parse errors during crawl
    avg_confidence NUMERIC,                 -- mean confidence score this run
    field_yield JSONB,                      -- {"asking_price": 0.94, "revenue": 0.72, ...}
    status VARCHAR(20) DEFAULT 'running',   -- running | completed | failed | partial
    error_log TEXT,                         -- error details if failed
    schema_drift_detected BOOLEAN DEFAULT FALSE,  -- true if field yield dropped >20%
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_log_source ON scraper_health_log(source_key);
CREATE INDEX IF NOT EXISTS idx_health_log_started ON scraper_health_log(run_started_at);
CREATE INDEX IF NOT EXISTS idx_health_log_status ON scraper_health_log(status);
```

### 4b. `scraper_site_config` table

```sql
CREATE TABLE IF NOT EXISTS scraper_site_config (
    id SERIAL PRIMARY KEY,
    source_key VARCHAR(50) UNIQUE NOT NULL,   -- e.g. 'bizbuysell'
    display_name VARCHAR(255),                -- e.g. 'BizBuySell'
    site_url TEXT,                            -- base URL of the listing site
    spider_class VARCHAR(100),                -- Python spider class name
    scrape_schedule VARCHAR(50),              -- cron expression
    is_enabled BOOLEAN DEFAULT TRUE,
    requires_js BOOLEAN DEFAULT FALSE,        -- needs scrapy-playwright
    last_healthy_at TIMESTAMP,                -- last successful full crawl
    health_status VARCHAR(20) DEFAULT 'unknown',  -- healthy | degraded | broken | unknown
    expected_field_yield JSONB,               -- baseline field extraction rates
    selector_config JSONB,                    -- CSS/XPath selectors per field (reference)
    confidence_threshold INTEGER DEFAULT 70,  -- items below this go to review queue
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial sites
INSERT INTO scraper_site_config (source_key, display_name, site_url, spider_class, scrape_schedule, requires_js) VALUES
    ('bizbuysell', 'BizBuySell', 'https://www.bizbuysell.com', 'BizBuySellSpider', '0 */6 * * *', false),
    ('bizquest', 'BizQuest', 'https://www.bizquest.com', 'BizQuestSpider', '0 */8 * * *', false),
    ('crexi', 'Crexi', 'https://www.crexi.com', 'CrexiSpider', '0 */12 * * *', true),
    ('loopnet', 'LoopNet', 'https://www.loopnet.com', 'LoopNetSpider', '0 */12 * * *', true),
    ('bizden', 'BizDen', 'https://www.bizden.com', 'BizDenSpider', '0 */8 * * *', false)
ON CONFLICT (source_key) DO NOTHING;
```

### 4c. Register new sources in `deal_sources`

```sql
INSERT INTO deal_sources (source_key, display_name, source_type, scrape_cron, scrape_enabled) VALUES
    ('bizbuysell', 'BizBuySell', 'scrapy', '0 */6 * * *', true),
    ('bizquest', 'BizQuest', 'scrapy', '0 */8 * * *', true),
    ('crexi', 'Crexi', 'scrapy', '0 */12 * * *', true),
    ('loopnet', 'LoopNet', 'scrapy', '0 */12 * * *', true),
    ('bizden', 'BizDen', 'scrapy', '0 */8 * * *', true)
ON CONFLICT (source_key) DO NOTHING;
```

---

## 5. DealItem schema (`items.py`)

This is the canonical Scrapy Item every spider yields. It maps 1:1 to the `market_deals` table columns.

```python
import scrapy


class DealItem(scrapy.Item):
    """Canonical deal schema. Every spider yields this."""

    # === Identity ===
    source = scrapy.Field()              # e.g. 'bizbuysell' — auto-set by BaseSpider
    source_id = scrapy.Field()           # unique ID from source site
    listing_url = scrapy.Field()         # direct URL to listing detail page
    name = scrapy.Field()                # business name or listing headline
    description = scrapy.Field()         # full listing description text

    # === Financials ===
    asking_price = scrapy.Field()        # numeric, in dollars (no $ or commas)
    annual_revenue = scrapy.Field()      # gross revenue
    annual_profit = scrapy.Field()       # SDE / cash flow / owner benefit
    profit_multiple = scrapy.Field()     # asking_price / annual_profit
    revenue_multiple = scrapy.Field()    # asking_price / annual_revenue

    # === Location ===
    city = scrapy.Field()
    county = scrapy.Field()
    state = scrapy.Field()               # 2-letter abbreviation
    country = scrapy.Field()             # default 'US'

    # === Classification ===
    industries = scrapy.Field()          # list of industry tags
    franchise = scrapy.Field()           # 'Yes' / 'No' / None
    remote_relocatable = scrapy.Field()  # 'Remote' / 'Relocatable' / 'Absentee' / None
    five_plus_years = scrapy.Field()     # 'Yes' / 'No' / None
    years_established = scrapy.Field()   # integer year or years in business

    # === Broker ===
    broker_name = scrapy.Field()
    broker_company = scrapy.Field()
    broker_contact = scrapy.Field()      # phone number
    broker_email = scrapy.Field()

    # === Dates (from source site) ===
    source_added_at = scrapy.Field()     # when listing was first posted
    source_updated_at = scrapy.Field()   # when listing was last modified

    # === Pipeline metadata (NOT stored in DB) ===
    _raw_html = scrapy.Field()           # kept for LLM fallback if selectors fail
    _confidence = scrapy.Field()         # set by ConfidenceScorerPipeline (0-100)
    _extraction_notes = scrapy.Field()   # list of warnings/ambiguities
```

---

## 6. Base spider pattern (`base_listing_spider.py`)

All site-specific spiders inherit from this. They only override `start_urls`, `parse()` for listing pages, and `parse_detail()` for detail pages.

```python
import scrapy
from vettr_scraper.items import DealItem
from vettr_scraper.utils.field_parsers import parse_price, parse_date


class BaseListingSpider(scrapy.Spider):
    """Base class for all Vettr listing site spiders."""

    source_key = None  # MUST be set by subclass — e.g. 'bizbuysell'

    custom_settings = {
        'DOWNLOAD_DELAY': 2,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 4,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 1,
        'AUTOTHROTTLE_MAX_DELAY': 10,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 2.0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def parse(self, response):
        """
        Override in subclass.
        Parse listing/search results page.
        Yield scrapy.Request for each detail page URL.
        Yield scrapy.Request for next pagination page.
        """
        raise NotImplementedError

    def parse_detail(self, response):
        """
        Override in subclass.
        Parse a single listing detail page.
        Yield a DealItem with all extractable fields.
        """
        raise NotImplementedError

    def build_item(self, **kwargs):
        """Helper: create DealItem with source auto-set."""
        item = DealItem()
        item['source'] = self.source_key
        item['_extraction_notes'] = []
        for key, value in kwargs.items():
            if key in DealItem.fields:
                item[key] = value
        return item
```

---

## 7. Example spider: BizBuySell (`bizbuysell.py`)

```python
from vettr_scraper.spiders.base_listing_spider import BaseListingSpider
from vettr_scraper.utils.field_parsers import parse_price
import re


class BizBuySellSpider(BaseListingSpider):
    name = 'bizbuysell'
    source_key = 'bizbuysell'
    allowed_domains = ['bizbuysell.com']

    # Start with California — expand to more states via scraper_site_config
    start_urls = [
        'https://www.bizbuysell.com/california-businesses-for-sale/',
    ]

    def parse(self, response):
        """Parse search results page, yield detail page requests."""
        # Each listing card on BizBuySell
        for card in response.css('.listing'):
            detail_url = card.css('a.listingTitle::attr(href)').get()
            if detail_url:
                yield response.follow(detail_url, callback=self.parse_detail)

        # Pagination — follow "Next" link
        next_page = response.css('a.next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_detail(self, response):
        """Extract all deal fields from a listing detail page."""
        # Extract source_id from URL (e.g., /business-opportunity/.../2322559/)
        url_match = re.search(r'/(\d+)/?$', response.url)
        source_id = url_match.group(1) if url_match else response.url

        item = self.build_item(
            source_id=source_id,
            listing_url=response.url,
            name=response.css('h1::text').get('').strip(),
            description=response.css('.businessDescription ::text').getall(),

            # Financials — look for labeled fields
            asking_price=parse_price(
                response.css('.price ::text').get()
            ),
            annual_revenue=parse_price(
                self._extract_labeled_field(response, 'Gross Revenue')
            ),
            annual_profit=parse_price(
                self._extract_labeled_field(response, 'Cash Flow')
            ),

            # Location
            city=self._extract_labeled_field(response, 'City'),
            state=self._extract_labeled_field(response, 'State'),
            county=self._extract_labeled_field(response, 'County'),
            country='US',

            # Classification
            industries=response.css('.category ::text').getall(),
            years_established=self._extract_labeled_field(response, 'Established'),
            franchise=self._extract_labeled_field(response, 'Franchise'),

            # Broker
            broker_name=response.css('.broker-name ::text').get(),
            broker_company=response.css('.broker-company ::text').get(),
        )

        # Join description list into single string
        if isinstance(item.get('description'), list):
            item['description'] = ' '.join(item['description']).strip()

        # Store raw HTML for LLM fallback if needed
        item['_raw_html'] = response.text[:5000]

        yield item

    def _extract_labeled_field(self, response, label):
        """
        Extract value from BizBuySell's label:value pattern.
        e.g., <dt>Cash Flow:</dt><dd>$194,500</dd>
        """
        # Try dt/dd pattern
        for dt in response.css('dt'):
            if label.lower() in dt.css('::text').get('').lower():
                dd = dt.xpath('./following-sibling::dd[1]/text()').get()
                if dd:
                    return dd.strip()

        # Try label span pattern
        for el in response.css('.detailItem'):
            label_text = el.css('.label::text').get('')
            if label.lower() in label_text.lower():
                return el.css('.value::text').get('').strip()

        return None
```

> **IMPORTANT FOR CURSOR:** The CSS selectors above are educated guesses based on common BizBuySell patterns. When you run the spider for the first time, save the actual HTML response to `tests/fixtures/bizbuysell_detail.html` and adjust selectors to match. Use `scrapy shell "https://www.bizbuysell.com/..."` to test selectors interactively.

---

## 8. Pipeline chain (`settings.py`)

```python
# vettr_scraper/settings.py

BOT_NAME = 'vettr_scraper'
SPIDER_MODULES = ['vettr_scraper.spiders']
NEWSPIDER_MODULE = 'vettr_scraper.spiders'

# Respect robots.txt
ROBOTSTXT_OBEY = True

# Global concurrency (per-spider settings override these)
CONCURRENT_REQUESTS = 16
DOWNLOAD_DELAY = 1

# === ITEM PIPELINES (order matters — lower number runs first) ===
ITEM_PIPELINES = {
    'vettr_scraper.pipelines.schema_mapper.SchemaMapperPipeline': 100,
    'vettr_scraper.pipelines.validator.ValidationPipeline': 200,
    'vettr_scraper.pipelines.confidence_scorer.ConfidenceScorerPipeline': 300,
    'vettr_scraper.pipelines.dedup.DedupPipeline': 400,
    'vettr_scraper.pipelines.postgres_writer.PostgresPipeline': 500,
}

# === DOWNLOADER MIDDLEWARES ===
DOWNLOADER_MIDDLEWARES = {
    'vettr_scraper.middlewares.user_agent_rotation.UserAgentRotationMiddleware': 400,
    # 'vettr_scraper.middlewares.proxy_rotation.ProxyRotationMiddleware': 410,  # enable when proxies are set up
}

# === SCRAPY-PLAYWRIGHT (for JS-rendered sites) ===
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {"headless": True}

# === DATABASE ===
# Loaded from .env — same DATABASE_URL as the Node backend
import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# === LOGGING ===
LOG_LEVEL = 'INFO'
LOG_FORMAT = '%(asctime)s [%(name)s] %(levelname)s: %(message)s'
```

---

## 9. Pipeline implementations

### 9a. SchemaMapperPipeline

```python
from vettr_scraper.utils.field_parsers import parse_price, normalize_state


class SchemaMapperPipeline:
    """Normalize raw extracted values into clean typed fields."""

    def process_item(self, item, spider):
        # Normalize price fields (strip $, commas, handle "2.5M", "500K")
        for field in ['asking_price', 'annual_revenue', 'annual_profit']:
            if item.get(field) and isinstance(item[field], str):
                item[field] = parse_price(item[field])

        # Normalize state to 2-letter code
        if item.get('state'):
            item['state'] = normalize_state(item['state'])

        # Default country
        if not item.get('country'):
            item['country'] = 'US'

        # Clean description
        if item.get('description') and isinstance(item['description'], list):
            item['description'] = ' '.join(item['description']).strip()

        # Ensure industries is a list
        if item.get('industries') and isinstance(item['industries'], str):
            item['industries'] = [item['industries']]

        return item
```

### 9b. ValidationPipeline

```python
from scrapy.exceptions import DropItem


class ValidationPipeline:
    """Drop items that fail critical validation. Flag warnings for non-critical issues."""

    def process_item(self, item, spider):
        # CRITICAL: must have source_id
        if not item.get('source_id'):
            raise DropItem(f"Missing source_id: {item.get('listing_url')}")

        # CRITICAL: must have name or listing_url
        if not item.get('name') and not item.get('listing_url'):
            raise DropItem(f"Missing both name and URL for {item.get('source_id')}")

        # Validate price is numeric and positive
        if item.get('asking_price') is not None:
            try:
                item['asking_price'] = float(item['asking_price'])
                if item['asking_price'] <= 0:
                    item['asking_price'] = None
                    item['_extraction_notes'].append('asking_price was <= 0, set to null')
            except (ValueError, TypeError):
                item['asking_price'] = None
                item['_extraction_notes'].append('asking_price was non-numeric, set to null')

        # Flag suspicious: profit > revenue
        if (item.get('annual_profit') and item.get('annual_revenue')
                and item['annual_profit'] > item['annual_revenue']):
            item['_extraction_notes'].append('WARNING: annual_profit > annual_revenue')

        # Flag suspicious: asking_price < annual_profit (likely data error)
        if (item.get('asking_price') and item.get('annual_profit')
                and item['asking_price'] < item['annual_profit']):
            item['_extraction_notes'].append('WARNING: asking_price < annual_profit')

        return item
```

### 9c. ConfidenceScorerPipeline

```python
class ConfidenceScorerPipeline:
    """Score extraction quality 0-100 based on field completeness."""

    # Fields weighted by importance (higher = more important)
    FIELD_WEIGHTS = {
        'name': 3, 'asking_price': 3, 'state': 3, 'source_id': 3, 'listing_url': 3,
        'annual_revenue': 2, 'annual_profit': 2, 'city': 2, 'industries': 2,
        'description': 1, 'broker_name': 1, 'broker_company': 1,
        'years_established': 1, 'franchise': 1, 'county': 1,
    }

    def process_item(self, item, spider):
        earned = 0
        total = 0
        for field, weight in self.FIELD_WEIGHTS.items():
            total += weight
            value = item.get(field)
            if value is not None and value != '' and value != []:
                earned += weight

        item['_confidence'] = round((earned / total) * 100) if total > 0 else 0
        return item
```

### 9d. DedupPipeline

```python
import psycopg2
from scrapy.exceptions import DropItem


class DedupPipeline:
    """
    Check if listing already exists. Skip if identical, pass through if changed.
    Detects: new listings, price changes, status changes.
    """

    def open_spider(self, spider):
        from vettr_scraper.settings import DATABASE_URL
        self.conn = psycopg2.connect(DATABASE_URL)

    def close_spider(self, spider):
        self.conn.close()

    def process_item(self, item, spider):
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT asking_price, name, is_active FROM market_deals WHERE source = %s AND source_id = %s",
            (item['source'], item['source_id'])
        )
        existing = cursor.fetchone()
        cursor.close()

        if existing:
            old_price, old_name, old_active = existing
            new_price = item.get('asking_price')
            new_name = item.get('name')

            # If nothing changed, skip the upsert (save DB writes)
            if (old_price == new_price and old_name == new_name and old_active):
                raise DropItem(f"Unchanged: {item['source_id']}")

            # Something changed — let it through for update
            if old_price != new_price:
                item['_extraction_notes'].append(
                    f'PRICE_CHANGE: {old_price} → {new_price}'
                )

        return item
```

### 9e. PostgresPipeline

```python
import psycopg2
import psycopg2.extras


class PostgresPipeline:
    """Upsert DealItem to market_deals table. Same pattern as airtableScraper.js."""

    def open_spider(self, spider):
        from vettr_scraper.settings import DATABASE_URL
        self.conn = psycopg2.connect(DATABASE_URL)
        self.stats = {'inserted': 0, 'updated': 0, 'failed': 0}

    def close_spider(self, spider):
        self.conn.commit()
        self.conn.close()
        spider.logger.info(
            f"PostgresPipeline: {self.stats['inserted']} new, "
            f"{self.stats['updated']} updated, {self.stats['failed']} failed"
        )

    def process_item(self, item, spider):
        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT INTO market_deals (
                    source, source_id, name, description, listing_url, industries,
                    asking_price, annual_revenue, annual_profit, profit_multiple, revenue_multiple,
                    city, county, state, country, years_established,
                    remote_relocatable, franchise, five_plus_years,
                    broker_name, broker_company, broker_contact, broker_email,
                    source_added_at, source_updated_at,
                    last_scraped_at, is_active
                ) VALUES (
                    %(source)s, %(source_id)s, %(name)s, %(description)s, %(listing_url)s, %(industries)s,
                    %(asking_price)s, %(annual_revenue)s, %(annual_profit)s, %(profit_multiple)s, %(revenue_multiple)s,
                    %(city)s, %(county)s, %(state)s, %(country)s, %(years_established)s,
                    %(remote_relocatable)s, %(franchise)s, %(five_plus_years)s,
                    %(broker_name)s, %(broker_company)s, %(broker_contact)s, %(broker_email)s,
                    %(source_added_at)s, %(source_updated_at)s,
                    NOW(), true
                )
                ON CONFLICT (source, source_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    listing_url = EXCLUDED.listing_url,
                    industries = EXCLUDED.industries,
                    asking_price = EXCLUDED.asking_price,
                    annual_revenue = EXCLUDED.annual_revenue,
                    annual_profit = EXCLUDED.annual_profit,
                    profit_multiple = EXCLUDED.profit_multiple,
                    revenue_multiple = EXCLUDED.revenue_multiple,
                    city = EXCLUDED.city,
                    county = EXCLUDED.county,
                    state = EXCLUDED.state,
                    country = EXCLUDED.country,
                    years_established = EXCLUDED.years_established,
                    remote_relocatable = EXCLUDED.remote_relocatable,
                    franchise = EXCLUDED.franchise,
                    five_plus_years = EXCLUDED.five_plus_years,
                    broker_name = EXCLUDED.broker_name,
                    broker_company = EXCLUDED.broker_company,
                    broker_contact = EXCLUDED.broker_contact,
                    broker_email = EXCLUDED.broker_email,
                    source_added_at = EXCLUDED.source_added_at,
                    source_updated_at = EXCLUDED.source_updated_at,
                    last_scraped_at = NOW(),
                    is_active = true
                RETURNING (xmax = 0) AS is_insert
            """, {
                'source': item.get('source'),
                'source_id': str(item.get('source_id', '')),
                'name': item.get('name'),
                'description': item.get('description'),
                'listing_url': item.get('listing_url'),
                'industries': item.get('industries'),
                'asking_price': item.get('asking_price'),
                'annual_revenue': item.get('annual_revenue'),
                'annual_profit': item.get('annual_profit'),
                'profit_multiple': item.get('profit_multiple'),
                'revenue_multiple': item.get('revenue_multiple'),
                'city': item.get('city'),
                'county': item.get('county'),
                'state': item.get('state'),
                'country': item.get('country'),
                'years_established': item.get('years_established'),
                'remote_relocatable': item.get('remote_relocatable'),
                'franchise': item.get('franchise'),
                'five_plus_years': item.get('five_plus_years'),
                'broker_name': item.get('broker_name'),
                'broker_company': item.get('broker_company'),
                'broker_contact': item.get('broker_contact'),
                'broker_email': item.get('broker_email'),
                'source_added_at': item.get('source_added_at'),
                'source_updated_at': item.get('source_updated_at'),
            })

            result = cursor.fetchone()
            if result and result[0]:
                self.stats['inserted'] += 1
            else:
                self.stats['updated'] += 1

            self.conn.commit()
            cursor.close()

        except Exception as e:
            self.conn.rollback()
            self.stats['failed'] += 1
            spider.logger.error(f"DB write failed for {item.get('source_id')}: {e}")

        return item
```

---

## 10. Health monitor (`health/monitor.py`)

```python
from scrapy import signals
import psycopg2
import json
from datetime import datetime


class HealthMonitorExtension:
    """
    Scrapy extension that logs crawl metrics after every spider run.
    Detects schema drift by comparing field yields against stored baselines.
    """

    def __init__(self, stats, database_url):
        self.stats = stats
        self.database_url = database_url
        self.start_time = None

    @classmethod
    def from_crawler(cls, crawler):
        from vettr_scraper.settings import DATABASE_URL
        ext = cls(crawler.stats, DATABASE_URL)
        crawler.signals.connect(ext.spider_opened, signal=signals.spider_opened)
        crawler.signals.connect(ext.spider_closed, signal=signals.spider_closed)
        return ext

    def spider_opened(self, spider):
        self.start_time = datetime.utcnow()

    def spider_closed(self, spider, reason):
        conn = psycopg2.connect(self.database_url)
        cursor = conn.cursor()

        items_scraped = self.stats.get_value('item_scraped_count', 0)
        items_dropped = self.stats.get_value('item_dropped_count', 0)

        # Calculate field yields from pipeline stats
        field_yield = self._calculate_field_yields(spider)

        # Check for schema drift
        drift = self._check_drift(cursor, spider.source_key, field_yield)

        status = 'completed' if reason == 'finished' else 'failed'

        cursor.execute("""
            INSERT INTO scraper_health_log
            (source_key, spider_name, run_started_at, run_finished_at,
             items_scraped, items_failed, field_yield, status, schema_drift_detected)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            spider.source_key, spider.name,
            self.start_time, datetime.utcnow(),
            items_scraped, items_dropped,
            json.dumps(field_yield), status, drift
        ))

        # Update site config health status
        new_status = 'broken' if status == 'failed' else ('degraded' if drift else 'healthy')
        cursor.execute("""
            UPDATE scraper_site_config
            SET health_status = %s, last_healthy_at = CASE WHEN %s = 'healthy' THEN NOW() ELSE last_healthy_at END,
                updated_at = NOW()
            WHERE source_key = %s
        """, (new_status, new_status, spider.source_key))

        conn.commit()
        cursor.close()
        conn.close()

        if drift:
            spider.logger.warning(
                f"SCHEMA DRIFT DETECTED for {spider.source_key}! "
                f"Field yields dropped significantly. Check scraper_health_log."
            )

    def _calculate_field_yields(self, spider):
        """Calculate what % of items had non-null values per field."""
        # This would be tracked by the pipelines during processing
        # For now, return from Scrapy stats
        return {}  # TODO: implement per-field tracking in pipelines

    def _check_drift(self, cursor, source_key, current_yields):
        """Compare current yields against stored baseline."""
        cursor.execute(
            "SELECT expected_field_yield FROM scraper_site_config WHERE source_key = %s",
            (source_key,)
        )
        row = cursor.fetchone()
        if not row or not row[0]:
            return False

        baseline = row[0]
        core_fields = ['asking_price', 'name', 'state', 'listing_url']

        for field in core_fields:
            baseline_val = baseline.get(field, 0)
            current_val = current_yields.get(field, 0)
            if baseline_val > 0 and (baseline_val - current_val) > 0.20:
                return True  # >20% drop in a core field

        return False
```

Register in `settings.py`:

```python
EXTENSIONS = {
    'vettr_scraper.health.monitor.HealthMonitorExtension': 500,
}
```

---

## 11. Change tracking (pending, sold, price changes)

After a full crawl completes, mark stale listings as inactive:

```python
# In run_spider.py, after spider finishes:
def mark_stale_listings(source_key, hours=48):
    """Listings not refreshed within N hours are likely sold/removed."""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE market_deals
        SET is_active = false
        WHERE source = %s
          AND is_active = true
          AND last_scraped_at < NOW() - INTERVAL '%s hours'
    """, (source_key, hours))
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return count
```

Price changes are detected by the `DedupPipeline` — when a listing's `asking_price` differs from what's in the database, it logs a `PRICE_CHANGE` note and allows the update through.

---

## 12. Node.js API endpoints (`scraperAdmin.js`)

Add to `backend/src/routes/scraperAdmin.js`:

```javascript
import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// GET /api/scraper-admin/sites — all registered sites with health status
router.get('/sites', async (req, res) => {
  const result = await pool.query(`
    SELECT sc.*, ds.deal_count,
      (SELECT COUNT(*) FROM scraper_health_log WHERE source_key = sc.source_key AND status = 'completed' AND run_started_at > NOW() - INTERVAL '7 days') as runs_last_week
    FROM scraper_site_config sc
    LEFT JOIN deal_sources ds ON ds.source_key = sc.source_key
    ORDER BY sc.source_key
  `);
  res.json(result.rows);
});

// GET /api/scraper-admin/health/:sourceKey — recent health logs for a site
router.get('/health/:sourceKey', async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM scraper_health_log
    WHERE source_key = $1
    ORDER BY run_started_at DESC
    LIMIT 20
  `, [req.params.sourceKey]);
  res.json(result.rows);
});

// GET /api/scraper-admin/alerts — sites with issues
router.get('/alerts', async (req, res) => {
  const result = await pool.query(`
    SELECT sc.source_key, sc.display_name, sc.health_status, sc.last_healthy_at,
      hl.schema_drift_detected, hl.error_log, hl.field_yield, hl.run_finished_at
    FROM scraper_site_config sc
    LEFT JOIN LATERAL (
      SELECT * FROM scraper_health_log
      WHERE source_key = sc.source_key
      ORDER BY run_started_at DESC LIMIT 1
    ) hl ON true
    WHERE sc.health_status IN ('degraded', 'broken')
      OR hl.schema_drift_detected = true
    ORDER BY sc.health_status DESC
  `);
  res.json(result.rows);
});

export default router;
```

Register in `backend/src/index.js`:

```javascript
import scraperAdminRoutes from './routes/scraperAdmin.js';
app.use('/api/scraper-admin', scraperAdminRoutes);
```

---

## 13. `requirements.txt`

```
scrapy>=2.14
scrapy-playwright>=0.0.41
psycopg2-binary>=2.9
python-dotenv>=1.0
twisted>=24.0
```

---

## 14. CLI entry points

### `run_spider.py`

```python
#!/usr/bin/env python
"""Run a single spider by name. Usage: python run_spider.py bizbuysell"""
import sys
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings


def run(spider_name):
    settings = get_project_settings()
    process = CrawlerProcess(settings)
    process.crawl(spider_name)
    process.start()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python run_spider.py <spider_name>")
        print("Available: bizbuysell, bizquest, crexi, loopnet, bizden")
        sys.exit(1)
    run(sys.argv[1])
```

### `run_all.py`

```python
#!/usr/bin/env python
"""Run all enabled spiders sequentially."""
import psycopg2
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from dotenv import load_dotenv
import os

load_dotenv()


def run_all():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cursor = conn.cursor()
    cursor.execute("SELECT source_key, spider_class FROM scraper_site_config WHERE is_enabled = true")
    sites = cursor.fetchall()
    cursor.close()
    conn.close()

    settings = get_project_settings()
    process = CrawlerProcess(settings)

    spider_map = {
        'BizBuySellSpider': 'bizbuysell',
        'BizQuestSpider': 'bizquest',
        'CrexiSpider': 'crexi',
        'LoopNetSpider': 'loopnet',
        'BizDenSpider': 'bizden',
    }

    for source_key, spider_class in sites:
        spider_name = spider_map.get(spider_class, source_key)
        print(f"Queuing spider: {spider_name}")
        process.crawl(spider_name)

    process.start()


if __name__ == '__main__':
    run_all()
```

---

## 15. Build order (phases)

### Phase 1: Foundation (2-3 days)
1. Create `feature/scrapy-engine` branch
2. Set up `python/` directory with `scrapy.cfg`, `requirements.txt`, `settings.py`
3. Create `items.py` with full `DealItem` schema
4. Build all 5 pipelines (mapper, validator, scorer, dedup, postgres)
5. Add DB migrations for `scraper_health_log` and `scraper_site_config`
6. Write `field_parsers.py` utility (currency, date, enum parsing)

### Phase 2: First Spider + Testing (2-3 days)
1. Build `BizBuySellSpider` with real CSS selectors
2. Use `scrapy shell` to test selectors against live pages
3. Save HTML fixtures for offline testing
4. Write tests: parse fixtures → verify DealItem output
5. Run live crawl → verify data in `market_deals` table
6. Verify Vettr web app displays new listings

### Phase 3: More Spiders + Playwright (3-4 days)
1. Build `BizQuestSpider` (similar HTML to BizBuySell)
2. Configure `scrapy-playwright` for Chromium headless
3. Build `CrexiSpider` (JS-rendered SPA)
4. Build `LoopNetSpider`
5. Build `BizDenSpider`

### Phase 4: Health Monitor + Dashboard (2 days)
1. Implement health monitor extension (spider_closed signal)
2. Implement schema drift detection
3. Add `/api/scraper-admin/*` routes in Node backend
4. Build alerter (email via existing nodemailer)
5. Create admin dashboard page or export to spreadsheet

### Phase 5: Scheduling + Deployment (1-2 days)
1. Set up cron scheduling (Node triggers Python via child_process)
2. Add Dockerfile for Python scraper service
3. Deploy to Koyeb as separate service
4. Verify all spiders run on schedule
5. Merge `feature/scrapy-engine` to main

---

## 16. Key decisions

- **Python alongside Node, not replacing it:** Scrapy runs as a separate process. Node remains the API server. They share PostgreSQL.
- **CSS selectors first, LLM never in the hot path:** Every listing extracted via fast CSS selectors. Claude Haiku used only offline to regenerate selectors when a site changes.
- **Same `market_deals` table:** Scrapy uses the same `(source, source_id)` upsert. Frontend needs zero changes.
- **Confidence scoring routes review:** Items < 70 confidence get `needs_review = true`. Above 70 goes directly to the deal feed.
- **Stale detection = sold detection:** Listings not refreshed within 48 hours get `is_active = false`. No need to explicitly scrape "sold" status.
