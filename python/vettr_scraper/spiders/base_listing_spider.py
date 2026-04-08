import scrapy
from vettr_scraper.items import DealItem


class BaseListingSpider(scrapy.Spider):
    """Base class for all Vettr listing site spiders."""

    source_key = None

    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 2,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 2,
        'AUTOTHROTTLE_MAX_DELAY': 15,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 2.0,
        'RETRY_TIMES': 3,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 408, 429],
    }

    def parse(self, response):
        raise NotImplementedError

    def parse_detail(self, response):
        raise NotImplementedError

    def build_item(self, **kwargs):
        """Create DealItem with source auto-set."""
        item = DealItem()
        item['source'] = self.source_key
        item['_extraction_notes'] = []
        for key, value in kwargs.items():
            if key in DealItem.fields:
                item[key] = value
        return item
