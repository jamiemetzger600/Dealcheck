"""
Playwright helpers for BizBuySell (Akamai-protected).

scrapy-playwright docs recommend:
- USER_AGENT = None so the browser's real UA is used (not Scrapy's default).
- playwright_page_init_callback for early page tweaks.
- playwright_page_methods / wait_for_selector after JS challenges resolve.

Optional: set PLAYWRIGHT_CDP_URL=http://127.0.0.1:9222 and start Chrome with
  Google Chrome --remote-debugging-port=9222
Then connect with a real profile — often passes bot checks that headless fails.
See: https://github.com/scrapy-plugins/scrapy-playwright#playwright_cdp_url
"""
from __future__ import annotations

import asyncio
import os

from scrapy_playwright.page import PageMethod


def _init_script() -> str:
    # Reduce obvious automation signals (not a silver bullet vs Akamai).
    return """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    """


async def playwright_init_page(page, request):
    await page.add_init_script(_init_script())


async def playwright_wait_for_listing_links(page):
    """Wait for search results or challenge to finish (up to ~2 min).

    PageMethod callables receive only ``page`` (scrapy-playwright docs).
    """
    timeout_ms = int(os.environ.get("BBS_PLAYWRIGHT_WAIT_MS", "120000"))
    poll_ms = 2500
    elapsed = 0
    sel = "a[href*='/business-opportunity/']"
    while elapsed < timeout_ms:
        try:
            await page.wait_for_selector(sel, timeout=poll_ms)
            return
        except Exception:
            pass
        elapsed += poll_ms
        await asyncio.sleep(0.3)
    await page.wait_for_selector(sel, timeout=5000)


def bbs_playwright_meta(extra: dict | None = None) -> dict:
    """Default Request.meta for BizBuySell Playwright downloads."""
    m = {
        "playwright": True,
        "playwright_page_init_callback": playwright_init_page,
        "playwright_page_goto_kwargs": {
            "wait_until": "domcontentloaded",
        },
        "playwright_page_methods": [
            PageMethod(playwright_wait_for_listing_links),
        ],
    }
    if extra:
        m.update(extra)
    return m


def bbs_detail_playwright_meta(extra: dict | None = None) -> dict:
    m = {
        "playwright": True,
        "playwright_page_init_callback": playwright_init_page,
        "playwright_page_goto_kwargs": {
            "wait_until": "domcontentloaded",
        },
        "playwright_page_methods": [
            PageMethod(
                "wait_for_selector",
                "h1",
                timeout=int(os.environ.get("BBS_DETAIL_WAIT_MS", "90000")),
            ),
        ],
    }
    if extra:
        m.update(extra)
    return m
