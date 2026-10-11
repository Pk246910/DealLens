"""LEVEL 3 — structured page data.

JSON-LD (Product/Offer/AggregateRating schema) and OG/meta tags are
preferred over fragile CSS selectors wherever present.
"""

from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

_AVAILABILITY_MAP = {
    "instock": "In Stock",
    "outofstock": "Out of Stock",
    "preorder": "Pre-Order",
    "limitedavailability": "Limited Availability",
}


def _clean_availability(value) -> str | None:
    if not value or not isinstance(value, str):
        return None
    key = value.split("/")[-1].lower()
    return _AVAILABILITY_MAP.get(key)


def _parse_price(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if float(value) > 0 else None
    cleaned = re.sub(r"[^\d.]", "", str(value))
    try:
        number = float(cleaned)
        return number if number > 0 else None
    except (TypeError, ValueError):
        return None


def _iter_product_nodes(doc) -> list:
    """Yield Product-typed nodes from JSON-LD (handles @graph and lists)."""
    candidates = doc if isinstance(doc, list) else [doc]
    for node in candidates:
        if not isinstance(node, dict):
            continue
        node_type = node.get("@type", "")
        types = node_type if isinstance(node_type, list) else [node_type]
        if any(str(t).lower() == "product" for t in types):
            yield node
        graph = node.get("@graph")
        if isinstance(graph, list):
            for child in graph:
                if isinstance(child, dict):
                    child_type = child.get("@type", "")
                    ctypes = child_type if isinstance(child_type, list) else [child_type]
                    if any(str(t).lower() == "product" for t in ctypes):
                        yield child


def extract_json_ld(soup) -> dict:
    """Return product fields from JSON-LD Product schema (empty if none)."""
    found: dict = {}
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string
        if not raw:
            continue
        try:
            doc = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        for node in _iter_product_nodes(doc):
            found.setdefault("product_name", (node.get("name") or "").strip() or None)
            brand = node.get("brand")
            if isinstance(brand, dict):
                brand = brand.get("name")
            if brand and not found.get("brand"):
                found["brand"] = str(brand).strip()
            image = node.get("image")
            if isinstance(image, list):
                image = image[0] if image else None
            if isinstance(image, dict):
                image = image.get("url")
            if image and not found.get("image_url"):
                found["image_url"] = str(image).strip()
            if node.get("sku") and not found.get("sku"):
                found["sku"] = str(node["sku"]).strip()
            if node.get("description") and not found.get("description"):
                found["description"] = str(node["description"]).strip()[:1000]

            offers = node.get("offers")
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            if isinstance(offers, dict):
                if found.get("price") is None:
                    found["price"] = _parse_price(offers.get("price"))
                if not found.get("currency") and offers.get("priceCurrency"):
                    found["currency"] = str(offers["priceCurrency"]).strip().upper()
                if not found.get("availability"):
                    found["availability"] = _clean_availability(offers.get("availability"))
                if not found.get("product_url") and offers.get("url"):
                    found["product_url"] = str(offers["url"]).strip()

            rating = node.get("aggregateRating")
            if isinstance(rating, dict):
                if found.get("rating") is None:
                    try:
                        found["rating"] = float(rating.get("ratingValue"))
                    except (TypeError, ValueError):
                        pass
                if found.get("review_count") is None:
                    try:
                        found["review_count"] = int(float(rating.get("reviewCount", 0)))
                    except (TypeError, ValueError):
                        pass
            if found.get("product_name") and found.get("price") is not None:
                break
    return {k: v for k, v in found.items() if v is not None}


def extract_meta(soup) -> dict:
    """Return product fields from OG / product meta tags (empty if none)."""
    def content(*selectors) -> str | None:
        for sel in selectors:
            tag = soup.select_one(sel)
            if tag and tag.get("content", "").strip():
                return tag["content"].strip()
        return None

    found: dict = {}
    title = content('meta[property="og:title"]')
    if title:
        found["product_name"] = title
    image = content(
        'meta[property="og:image"]',
        'meta[property="og:image:secure_url"]',
        'meta[name="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
    )
    if not image:
        link_img = soup.select_one('link[rel="image_src"]')
        if link_img and link_img.get("href", "").strip():
            image = link_img["href"].strip()
    if image:
        if image.startswith("//"):
            image = "https:" + image
        found["image_url"] = image
    price = content('meta[property="product:price:amount"]', 'meta[name="price"]')
    if price:
        found["price"] = _parse_price(price)
    currency = content(
        'meta[property="product:price:currency"]', 'meta[name="priceCurrency"]'
    )
    if currency:
        found["currency"] = currency.upper()
    url = content('meta[property="og:url"]')
    if url:
        found["product_url"] = url
    description = content('meta[property="og:description"]', 'meta[name="description"]')
    if description:
        found["description"] = description[:1000]
    availability = content('meta[property="product:availability"]')
    if availability:
        found["availability"] = _clean_availability(availability) or availability
    return found
