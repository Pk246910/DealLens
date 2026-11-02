"""LEVEL 2 — normal HTTP fetch with SSRF protection.

Single attempt per call: browser headers, 15s timeout, up to 3 redirects.
Redirects are checked hop-by-hop against SSRF rules to prevent redirection
to private/internal IPs or cloud metadata endpoints.
"""

from __future__ import annotations

import logging
import os
import requests

from products.services.product_extractor import HEADERS, ExtractionError
from products.services.security import (
    SecurityValidationError,
    safe_http_fetch,
    validate_url_security,
)

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 15
MAX_REDIRECTS = 3


def fetch(url: str, timeout: int = REQUEST_TIMEOUT) -> str:
    """GET a product page, return HTML string.

    Raises ExtractionError with explicit reason on security rejection,
    HTTP errors, redirects, or network errors.
    """
    try:
        validate_url_security(url)
    except SecurityValidationError as e:
        raise ExtractionError(str(e))
    except Exception as e:
        raise ExtractionError(f"URL validation failed: {str(e)[:100]}")

    try:
        response = safe_http_fetch(
            url,
            headers=HEADERS,
            timeout=timeout,
            max_redirects=MAX_REDIRECTS,
        )
        response.raise_for_status()
    except requests.exceptions.TooManyRedirects:
        raise ExtractionError("Too many redirects — URL may not be a product page.")
    except requests.exceptions.Timeout:
        raise ExtractionError(
            "Request timed out. The website may be slow or limiting automated access."
        )
    except SecurityValidationError as e:
        raise ExtractionError(f"Security validation blocked request: {e}")
    except (requests.exceptions.HTTPError, requests.exceptions.ConnectionError) as e:
        status = getattr(getattr(e, "response", None), "status_code", "unknown")

        scraper_key = os.getenv("SCRAPER_API_KEY", "").strip()
        if scraper_key and status in (403, 429, 503):
            try:
                proxy_resp = requests.get(
                    "https://api.scraperapi.com/",
                    params={"api_key": scraper_key, "url": url, "country_code": "in"},
                    timeout=max(timeout, 25),
                )
                if proxy_resp.ok and proxy_resp.text:
                    return proxy_resp.text
            except Exception as proxy_err:
                logger.debug("ScraperAPI fallback failed for %s: %s", url, str(proxy_err)[:80])

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
    except Exception as e:
        raise ExtractionError(f"Fetch failed: {str(e)[:150]}")

    return response.text
