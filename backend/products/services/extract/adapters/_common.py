"""Shared L2→L5 runner used by every platform adapter.

Order: HTTP fetch → JSON-LD → OG/meta → CSS selectors → browser.
Structured data always wins over selectors; selectors only fill gaps.
"""

from __future__ import annotations

import logging
import re

from bs4 import BeautifulSoup

from ..base import (
    CONFIDENCE_FAILED,
    METHOD_BROWSER,
    METHOD_CSS_SELECTOR,
    METHOD_JSON_LD,
    METHOD_METADATA,
    METHOD_NONE,
    SOURCE_LIVE_EXTRACTION,
    ExtractedProduct,
)
from ..browser import available as browser_available
from ..browser import render as browser_render
from ..http import fetch
from ..structured import extract_embedded_state, extract_json_ld, extract_meta
from products.services.product_extractor import ExtractionError

logger = logging.getLogger(__name__)


def _parse_price(text) -> float | None:
    if text is None:
        return None
    if isinstance(text, (int, float)):
        return float(text) if float(text) > 0 else None
    cleaned = re.sub(r"[^\d.]", "", str(text))
    try:
        value = float(cleaned)
        return value if value > 0 else None
    except (TypeError, ValueError):
        return None


def _first_text(soup, selectors: list) -> str | None:
    for sel in selectors:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return el.get_text(strip=True)
    return None


def _first_src(soup, selectors: list) -> str | None:
    import json

    def _clean_candidate(val: str) -> str | None:
        if not val or not isinstance(val, str):
            return None
        val = val.strip()
        if val.startswith("//"):
            val = "https:" + val
        if not val.startswith(("http://", "https://")):
            return None
        low = val.lower()
        if any(bad in low for bad in ("grey-pixel", "transparent-pixel", "1x1", "spacer.gif", "pixel.gif")):
            return None
        return val

    for sel in selectors:
        for el in soup.select(sel):
            for attr in ("data-old-hires", "data-src", "data-lazy-src", "data-original"):
                cleaned = _clean_candidate(el.get(attr, ""))
                if cleaned:
                    return cleaned

            dyn = (el.get("data-a-dynamic-image") or "").strip()
            if dyn.startswith("{"):
                try:
                    dyn_map = json.loads(dyn)
                    if isinstance(dyn_map, dict) and dyn_map:
                        best_url = max(
                            dyn_map.items(),
                            key=lambda kv: (kv[1][0] * kv[1][1])
                            if isinstance(kv[1], list) and len(kv[1]) >= 2
                            else 0,
                        )[0]
                        cleaned = _clean_candidate(best_url)
                        if cleaned:
                            return cleaned
                except Exception:
                    pass

            srcset = (el.get("srcset") or "").strip()
            if srcset:
                parts = [p.strip().split()[0] for p in srcset.split(",") if p.strip()]
                for candidate in reversed(parts):
                    cleaned = _clean_candidate(candidate)
                    if cleaned:
                        return cleaned

            cleaned = _clean_candidate(el.get("src", ""))
            if cleaned:
                return cleaned
    return None


def _extract_id(url: str, patterns: list) -> str | None:
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def _apply_selectors(result: ExtractedProduct, soup, cfg: dict) -> bool:
    """Fill missing fields from CSS selectors. Returns True if anything set."""
    touched = False

    def fill(field, value):
        nonlocal touched
        if value and getattr(result, field) in (None, "", 0):
            setattr(result, field, value)
            touched = True

    sel = cfg.get("selectors", {})
    fill("product_name", _first_text(soup, sel.get("title", [])))
    fill("price", _parse_price(_first_text(soup, sel.get("price", []))))
    fill("original_price", _parse_price(_first_text(soup, sel.get("mrp", []))))
    fill("image_url", _first_src(soup, sel.get("image", [])))
    fill("brand", _first_text(soup, sel.get("brand", [])))

    rating_raw = _first_text(soup, sel.get("rating", []))
    if rating_raw and result.rating is None:
        parser = cfg.get("parse_rating")
        try:
            result.rating = parser(rating_raw) if parser else float(rating_raw)
            touched = True
        except (TypeError, ValueError):
            pass

    reviews_raw = _first_text(soup, sel.get("reviews", []))
    if reviews_raw and result.review_count is None:
        parser = cfg.get("parse_reviews")
        try:
            if parser:
                result.review_count = parser(reviews_raw)
            else:
                m = re.search(r"([\d,]+)", reviews_raw)
                result.review_count = int(m.group(1).replace(",", "")) if m else None
            touched = True
        except (TypeError, ValueError):
            pass

    avail_raw = _first_text(soup, sel.get("availability", []))
    if avail_raw and result.availability is None:
        result.availability = (
            "Out of Stock" if "out of stock" in avail_raw.lower()
            else avail_raw.strip()[:60]
        )
        touched = True

    return touched


def run_standard(*, platform: str, url: str, cfg: dict) -> ExtractedProduct:
    """Execute L2→L5 for one platform. Never raises; FAILED result on block."""
    result = ExtractedProduct(platform=platform, product_url=url,
                              source=SOURCE_LIVE_EXTRACTION)
    html = None
    try:
        html = fetch(url)
    except ExtractionError as e:
        result.reason = str(e)
    except Exception as e:
        result.reason = f"Fetch failed: {str(e)[:150]}"

    if html:
        soup = BeautifulSoup(html, "html.parser")
        structured = extract_json_ld(soup)
        embedded = extract_embedded_state(soup)
        meta = extract_meta(soup)
        merged = {**meta, **embedded, **structured}
        for key, value in merged.items():
            if value is not None and getattr(result, key, None) in (None, "", 0):
                setattr(result, key, value)
        if result.product_name and result.price is not None:
            result.extraction_method = (
                METHOD_JSON_LD if (structured.get("product_name") or embedded.get("product_name"))
                else METHOD_METADATA
            )

        if _apply_selectors(result, soup, cfg) and result.extraction_method == METHOD_NONE:
            if result.product_name or result.price is not None:
                result.extraction_method = METHOD_CSS_SELECTOR

    result.product_id = _extract_id(url, cfg.get("id_patterns", []))

    if not result.product_name and browser_available():
        rendered = browser_render(url, wait_selector=cfg.get("wait_selector"))
        if rendered.get("blocked"):
            if not result.reason:
                result.reason = rendered.get("reason") or "Automated access blocked."
        elif rendered.get("html"):
            rsoup = BeautifulSoup(rendered["html"], "html.parser")
            r_struct = extract_json_ld(rsoup)
            r_embed = extract_embedded_state(rsoup)
            r_meta = extract_meta(rsoup)
            for key, value in {**r_meta, **r_embed, **r_struct}.items():
                if value is not None and getattr(result, key, None) in (None, "", 0):
                    setattr(result, key, value)
            _apply_selectors(result, rsoup, cfg)
            if result.product_name:
                result.extraction_method = METHOD_BROWSER
                result.reason = ""

    if not result.product_name and not result.reason:
        result.reason = "No product data found on the page."

    from datetime import datetime, timezone as dt_timezone
    result.last_updated = datetime.now(dt_timezone.utc).isoformat()
    result.validate()
    result.compute_confidence()
    if result.confidence == CONFIDENCE_FAILED and not result.reason:
        result.reason = "No reliable product data extracted."
    return result
