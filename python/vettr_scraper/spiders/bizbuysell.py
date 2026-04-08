"""
BizBuySell search → detail crawl using scrapy-playwright.

Requires: ``pip install scrapy-playwright`` and ``playwright install firefox`` (or chromium).

**Why Playwright:** BizBuySell is behind Akamai; TLS + ``User-Agent`` must match a real
browser. scrapy-playwright README says set ``USER_AGENT = None`` so Playwright sends the
browser's own UA — we do that in ``settings.py``.

Env tuning:
  PLAYWRIGHT_BROWSER_TYPE=firefox|chromium|webkit  (default firefox — often passes Akamai)
  PLAYWRIGHT_HEADLESS=true|false
  PLAYWRIGHT_CHANNEL=chrome          # use installed Google Chrome binary
  PLAYWRIGHT_CDP_URL=http://127.0.0.1:9222  # Chrome started with --remote-debugging-port=9222
"""
from __future__ import annotations

import json
import re
from urllib.parse import urljoin

from scrapy.http import Request

from vettr_scraper.playwright_bbs import bbs_detail_playwright_meta, bbs_playwright_meta
from vettr_scraper.spiders.base_listing_spider import BaseListingSpider
from vettr_scraper.utils.field_parsers import normalize_state


LISTING_URL_RE = re.compile(r"/business-opportunity/[^/]+/(\d+)/?", re.I)


class BizBuySellSpider(BaseListingSpider):
    name = "bizbuysell"
    source_key = "bizbuysell"
    allowed_domains = ["bizbuysell.com", "www.bizbuysell.com"]

    custom_settings = {
        **BaseListingSpider.custom_settings,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    start_urls = [
        "https://www.bizbuysell.com/california-businesses-for-sale/",
    ]

    def start_requests(self):
        for url in self.start_urls:
            yield Request(url=url, meta=bbs_playwright_meta(), dont_filter=True)

    def parse(self, response):
        body_l = response.text.lower()
        if "access denied" in body_l or "akamai" in body_l and "errors.edgesuite" in body_l:
            self.logger.error(
                "BizBuySell returned a block page. Try: PLAYWRIGHT_HEADLESS=false, "
                "PLAYWRIGHT_CHANNEL=chrome, or PLAYWRIGHT_CDP_URL with manual Chrome "
                "(see python/README_SCRAPY.md)."
            )
            return

        hrefs = response.css("a[href*='/business-opportunity/']::attr(href)").getall()
        seen = set()
        for href in hrefs:
            if not href:
                continue
            absolute = urljoin(response.url, href)
            m = LISTING_URL_RE.search(absolute)
            if not m:
                continue
            sid = m.group(1)
            if absolute in seen:
                continue
            seen.add(absolute)
            yield Request(
                url=absolute,
                callback=self.parse_detail,
                meta=bbs_detail_playwright_meta(),
            )

        # Pagination
        next_href = (
            response.css('a[rel="next"]::attr(href)').get()
            or response.css('a[aria-label="Next"]::attr(href)').get()
            or response.xpath(
                '//a[contains(translate(normalize-space(.),"NEXT","next"),"next")]/@href'
            ).get()
        )
        if next_href:
            yield Request(
                url=urljoin(response.url, next_href),
                callback=self.parse,
                meta=bbs_playwright_meta(),
            )

    def parse_detail(self, response):
        if "access denied" in response.text.lower():
            self.logger.warning("Detail blocked: %s", response.url)
            return

        url = response.url
        m = LISTING_URL_RE.search(url)
        source_id = m.group(1) if m else None

        name = (
            response.css("h1::text").get()
            or response.css('h1 span::text').get()
            or response.xpath("//h1//text()").get()
        )
        if name:
            name = name.strip()

        description_parts = response.css(
            "#businessDescription *, .business-description *, [data-module='Description'] *"
        ).xpath("string()").getall()
        if not description_parts:
            description_parts = response.css(
                "article p::text, .listing-description ::text"
            ).getall()
        description = " ".join(p.strip() for p in description_parts if p and p.strip())

        asking_price = self._first_labeled_value(
            response, ("asking price", "asking:", "price:")
        )
        cash_flow = self._first_labeled_value(
            response,
            ("cash flow", "sde", "seller's discretionary", "discretionary earnings"),
        )
        gross_rev = self._first_labeled_value(
            response, ("gross revenue", "revenue", "gross income")
        )
        established = self._first_labeled_value(
            response, ("established", "year established", "years in business")
        )

        ld = self._extract_ld_json(response)
        city, state = self._location_from_ld(ld)
        if not city and not state:
            city, state = self._location_from_title(response)
        if not city and not state:
            city, state = self._location_from_response(response)

        description = description or (ld.get("description") if ld else None)
        if isinstance(description, str):
            description = description.strip() or None

        industries = response.css(
            "[data-module='Category'] a::text, .category a::text, nav[aria-label='breadcrumb'] a::text"
        ).getall()
        industries = [i.strip() for i in industries if i.strip()]

        broker_name = response.css(
            ".broker-card .name::text, [data-module='Broker'] .broker-name::text, a.broker-name::text"
        ).get()
        if broker_name:
            broker_name = broker_name.strip()

        item = self.build_item(
            source_id=source_id,
            listing_url=url,
            name=name,
            description=description or None,
            asking_price=asking_price,
            annual_profit=cash_flow,
            annual_revenue=gross_rev,
            years_established=established,
            city=city,
            state=state,
            country="US",
            industries=industries or None,
            broker_name=broker_name,
        )
        yield item

    def _extract_ld_json(self, response) -> dict:
        """Return the first JSON-LD node that looks like a listing (address or description)."""
        for raw in response.css('script[type="application/ld+json"]::text').getall():
            raw = (raw or "").strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            for node in self._iter_ld_nodes(data):
                if not isinstance(node, dict):
                    continue
                t = node.get("@type")
                types = t if isinstance(t, list) else ([t] if t else [])
                types_l = {str(x).lower() for x in types if x}
                if not types_l & {
                    "localbusiness",
                    "organization",
                    "product",
                    "place",
                }:
                    continue
                if node.get("address") or node.get("description"):
                    return node
        return {}

    def _iter_ld_nodes(self, data):
        if isinstance(data, dict):
            yield data
            if "graph" in data and isinstance(data["graph"], list):
                for item in data["graph"]:
                    yield from self._iter_ld_nodes(item)
            if "@graph" in data and isinstance(data["@graph"], list):
                for item in data["@graph"]:
                    yield from self._iter_ld_nodes(item)
        elif isinstance(data, list):
            for item in data:
                yield from self._iter_ld_nodes(item)

    def _location_from_ld(self, ld: dict):
        if not ld:
            return None, None
        addr = ld.get("address")
        if isinstance(addr, list) and addr:
            addr = addr[0]
        if not isinstance(addr, dict):
            return None, None
        city = addr.get("addressLocality") or addr.get("name")
        region = addr.get("addressRegion")
        if isinstance(city, str):
            city = city.strip()
        if isinstance(region, str):
            region = region.strip()
        st = normalize_state(region) if region else None
        return city or None, st

    def _location_from_title(self, response):
        title = response.css("title::text").get() or ""
        title = title.split(" - BizBuySell")[0].strip()
        if " in " not in title:
            return None, None
        _, rest = title.rsplit(" in ", 1)
        parts = [p.strip() for p in rest.split(",") if p.strip()]
        if len(parts) >= 2:
            return parts[0], normalize_state(parts[1])
        if len(parts) == 1:
            st = normalize_state(parts[0])
            if st:
                return None, st
            return parts[0], None
        return None, None

    def _first_labeled_value(self, response, label_keywords: tuple[str, ...]):
        """Find a DD or adjacent cell after a DT / label containing one of the keywords."""
        for kw in label_keywords:
            # dt/dd pairs
            val = response.xpath(
                f"//dt[contains(translate(normalize-space(string(.)), "
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{kw}')]"
                f"/following-sibling::dd[1]"
            )
            if val:
                text = " ".join(val.xpath(".//text()").getall()).strip()
                if text:
                    return text
            # div / span label patterns
            val = response.xpath(
                f"//*[self::div or self::span or self::p]"
                f"[contains(translate(normalize-space(string(.)), "
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{kw}')]"
                f"/following-sibling::*[1]"
            )
            if val:
                text = " ".join(val.xpath(".//text()").getall()).strip()
                if text and kw not in text.lower():
                    return text
            # "Label: Value" on one line
            line = response.xpath(
                f"//*[contains(translate(normalize-space(string(.)), "
                f"'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{kw}')]"
                f"/text()"
            ).get()
            if line and ":" in line:
                part = line.split(":", 1)[1].strip()
                if part:
                    return part
        return None

    def _location_from_response(self, response):
        # Breadcrumb or subtitle "City, ST"
        loc = response.css(
            "[data-module='Location']::text, .location::text, .business-location::text"
        ).get()
        if not loc:
            loc = response.xpath(
                "//*[contains(@class,'location')][1]//text()[normalize-space()]"
            ).get()
        if not loc:
            return None, None
        loc = loc.strip()
        parts = [p.strip() for p in loc.split(",") if p.strip()]
        if len(parts) >= 2:
            return parts[-2], parts[-1]
        if len(parts) == 1:
            return parts[0], None
        return None, None
