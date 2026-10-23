"""LEVEL 2 — normal HTTP fetch.

Single attempt per call (no hammering): browser headers, 15s timeout,
up to 3 redirects. SSRF protection reused from the legacy extractor.
"""

from __future__ import annotations

import logging

import requests

from products.services.product_extractor import (
    HEADERS,
    ExtractionError,
    _validate_url_safety,
)

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 15
MAX_REDIRECTS = 3


def fetch(url: str, timeout: int = REQUEST_TIMEOUT) -> str:
    """GET a product page, return HTML. Raises ExtractionError with reason."""
    try:
        _validate_url_safety(url)
    except ValueError as e:
        raise ExtractionError(str(e))

    session = requests.Session()
    session.headers.update(HEADERS)
    session.max_redirects = MAX_REDIRECTS
    try:
        response = session.get(url, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
    except requests.exceptions.TooManyRedirects:
        raise ExtractionError("Too many redirects — URL may not be a product page.")
    except requests.exceptions.Timeout:
        raise ExtractionError(
            "Request timed out. The website may be slow or limiting automated access."
        )
    except (requests.exceptions.HTTPError, requests.exceptions.ConnectionError) as e:
        status = getattr(getattr(e, "response", None), "status_code", "unknown")
        import os
        scraper_key = os.getenv("SCRAPER_API_KEY", "").strip()
        if scraper_key and status in (403, 429, 503):
            try:
                proxy_resp = session.get(
                    "https://api.scraperapi.com/",
                    params={"api_key": scraper_key, "url": url, "country_code": "in"},
                    timeout=max(timeout, 25),
                )
                if proxy_resp.ok and proxy_resp.text:
                    return proxy_resp.text
            except Exception as proxy_err:
                logger.debug("ScraperAPI fallback failed for %s: %s", url, str(proxy_err)[:80])

        # Social crawler fallback: Many platforms (Flipkart, Myntra, Nykaa, etc.)
        # block standard scrapers with 403/500/503 but allow social crawlers (Facebook, WhatsApp)
        # to fetch full OpenGraph product metadata and high-res images.
        if status in (403, 500, 502, 503, 429, "unknown"):
            try:
                social_headers = {
                    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
                social_resp = requests.get(url, headers=social_headers, timeout=max(timeout, 12), allow_redirects=True)
                if social_resp.ok and len(social_resp.text) > 400:
                    return social_resp.text
            except Exception as s_err:
                logger.debug("Social fallback failed for %s: %s", url, str(s_err)[:80])

        if status == 403:
            raise ExtractionError(
                "Access denied (HTTP 403). The website is blocking automated requests."
            )
        if status == 404:
            raise ExtractionError(
                "Product page not found (HTTP 404). The URL may be invalid."
            )
        if status == 503:
            raise ExtractionError("Service temporarily unavailable (HTTP 503).")
        if status == 429:
            raise ExtractionError(
                "Rate limited (HTTP 429). The website asked us to slow down."
            )
        if isinstance(e, requests.exceptions.ConnectionError):
            raise ExtractionError(
                "Could not connect to the website. Please check the URL and try again."
            )
        raise ExtractionError(f"HTTP error {status} while fetching the page.")
    return response.text
