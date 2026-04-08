import os

BOT_NAME = 'vettr_scraper'
SPIDER_MODULES = ['vettr_scraper.spiders']
NEWSPIDER_MODULE = 'vettr_scraper.spiders'

# BizBuySell serves different content to bots; let Playwright send the browser's real UA.
# scrapy-playwright README: https://github.com/scrapy-plugins/scrapy-playwright#notes-about-the-user-agent-header
USER_AGENT = None

# Listing pages are crawlable for extraction; obey robots in production if policy requires.
ROBOTSTXT_OBEY = False

DOWNLOAD_DELAY = 2
RANDOMIZE_DOWNLOAD_DELAY = True
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 1

AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 20
AUTOTHROTTLE_TARGET_CONCURRENCY = 1.0

CLOSESPIDER_ITEMCOUNT = 50

ITEM_PIPELINES = {
    'vettr_scraper.pipelines.schema_mapper.SchemaMapperPipeline': 100,
    'vettr_scraper.pipelines.validator.ValidationPipeline': 200,
}

LOG_LEVEL = 'INFO'
LOG_FORMAT = '%(asctime)s [%(name)s] %(levelname)s: %(message)s'

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"

# --- scrapy-playwright (see project README on GitHub) ---
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}

# chromium | firefox | webkit — firefox sometimes fares better on fingerprint checks.
PLAYWRIGHT_BROWSER_TYPE = os.environ.get("PLAYWRIGHT_BROWSER_TYPE", "firefox")

_launch = {
    "headless": os.environ.get("PLAYWRIGHT_HEADLESS", "true").lower() in ("1", "true", "yes"),
}
# Use real Chrome if installed: export PLAYWRIGHT_CHANNEL=chrome
if os.environ.get("PLAYWRIGHT_CHANNEL"):
    _launch["channel"] = os.environ["PLAYWRIGHT_CHANNEL"]

PLAYWRIGHT_LAUNCH_OPTIONS = _launch

PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = int(os.environ.get("PLAYWRIGHT_NAV_TIMEOUT_MS", "120000"))

# Connect to manual Chrome: PLAYWRIGHT_CDP_URL=http://127.0.0.1:9222
PLAYWRIGHT_CDP_URL = os.environ.get("PLAYWRIGHT_CDP_URL") or None

HTTPERROR_ALLOWED_CODES = [403, 404]
