"""Pipeline orchestration: L1 official API → cache → adapter → validate.

Official-API hook: if <PLATFORM>_PRODUCT_API_URL and <PLATFORM>_API_KEY
env vars exist (e.g. FLIPKART_PRODUCT_API_URL), the adapter may implement
official_api() — none do by default, and scraping is never mixed with it.
"""

from __future__ import annotations

import hashlib
import logging
import os

logger = logging.getLogger(__name__)

FAILURE_CACHE_MINUTES = 5


def _cache_minutes() -> int:
    try:
        return max(1, int(os.getenv("PRODUCT_DATA_CACHE_MINUTES", "30")))
    except ValueError:
        return 30


def _cache_key(platform: str, url: str) -> str:
    digest = hashlib.sha256(f"{platform}|{url}".encode()).hexdigest()[:32]
    return f"extract:{digest}"


def _cache_get(key: str):
    try:
        from django.core.cache import cache
        return cache.get(key)
    except Exception:
        return None


def _cache_set(key: str, value, minutes: int) -> None:
    try:
        from django.core.cache import cache
        cache.set(key, value, timeout=minutes * 60)
    except Exception as e:
        logger.debug("Extraction cache write failed: %s", str(e)[:80])


def extract_product(url: str, platform: str | None = None,
                    refresh: bool = False):
    """Run the layered pipeline. Always returns an ExtractedProduct."""
    from .adapters.universal import UniversalExtractor
    from .base import CONFIDENCE_FAILED, ExtractedProduct
    from .registry import detect_platform, get_adapter

    if not platform:
        detected = detect_platform(url)
        platform = detected["platform"] or ""

    adapter = get_adapter(platform or url)
    if not adapter and platform:
        adapter = UniversalExtractor(platform=platform)
    if not adapter:
        return ExtractedProduct(
            platform=platform or "",
            reason=f"Platform '{platform}' is not supported.",
        )

    key = _cache_key(adapter.name, url)
    if not refresh:
        cached = _cache_get(key)
        if isinstance(cached, dict) and cached.get("platform"):
            try:
                return ExtractedProduct(**cached)
            except TypeError:
                pass

    official = getattr(adapter, "official_api", None)
    result = None
    if callable(official):
        try:
            result = official(url)
        except Exception as e:
            logger.info("%s official API failed: %s", adapter.name, str(e)[:120])
            result = None

    if result is None:
        try:
            result = adapter.extract(url)
        except Exception as e:
            logger.warning("%s extraction crashed: %s", adapter.name, str(e)[:150])
            result = ExtractedProduct(
                platform=adapter.name,
                reason="Extraction failed unexpectedly.",
            )

    result.validate()
    result.compute_confidence()
    if result.confidence == CONFIDENCE_FAILED and not result.reason:
        result.reason = "No reliable product data extracted."

    ttl = _cache_minutes() if result.success else FAILURE_CACHE_MINUTES
    try:
        _cache_set(key, result.__dict__, ttl)
    except Exception:
        pass
    return result
