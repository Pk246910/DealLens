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
    title = content(
        'meta[property="og:title"]',
        'meta[name="og:title"]',
        'meta[name="twitter:title"]',
        'meta[property="twitter:title"]',
    )
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
    price = content(
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[name="price"]',
        'meta[name="twitter:data1"]',
    )
    if price:
        found["price"] = _parse_price(price)
    brand = content(
        'meta[property="product:brand"]',
        'meta[property="og:brand"]',
        'meta[name="brand"]',
    )
    if brand:
        found["brand"] = brand
    currency = content(
        'meta[property="product:price:currency"]',
        'meta[property="og:price:currency"]',
        'meta[name="priceCurrency"]',
    )
    if currency:
        found["currency"] = currency.upper()
    url = content('meta[property="og:url"]')
    if url:
        found["product_url"] = url
    description = content('meta[property="og:description"]', 'meta[name="description"]')
    if description:
        found["description"] = description[:1000]
        if found.get("price") is None:
            m_price = re.search(r"(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)", description, re.I)
            if m_price:
                found["price"] = _parse_price(m_price.group(1))
    availability = content('meta[property="product:availability"]', 'meta[property="og:availability"]')
    if availability:
        found["availability"] = _clean_availability(availability) or availability
    return {k: v for k, v in found.items() if v is not None}


def _walk_state_for_product(node, found: dict, depth: int = 0) -> None:
    """Recursively scan Next.js / Redux SSR state dicts for product fields."""
    if depth > 9 or not node:
        return
    if isinstance(node, list):
        for item in node[:15]:
            _walk_state_for_product(item, found, depth + 1)
        return
    if not isinstance(node, dict):
        return

    # Check if this dict looks like a product payload
    title_cand = (
        node.get("productName")
        or node.get("product_name")
        or node.get("title")
        or node.get("name")
    )
    price_cand = (
        node.get("discountedPrice")
        or node.get("sellingPrice")
        or node.get("selling_price")
        or node.get("finalPrice")
        or node.get("specialPrice")
        or node.get("offerPrice")
        or node.get("price")
    )
    if isinstance(price_cand, dict):
        price_cand = (
            price_cand.get("discounted")
            or price_cand.get("sellingPrice")
            or price_cand.get("value")
            or price_cand.get("amount")
            or price_cand.get("mrp")
        )

    if isinstance(title_cand, str) and len(title_cand.strip()) > 4 and price_cand is not None:
        parsed_p = _parse_price(price_cand)
        if parsed_p and parsed_p > 0:
            found.setdefault("product_name", title_cand.strip())
            found.setdefault("price", parsed_p)

    mrp_cand = node.get("mrp") or node.get("originalPrice") or node.get("maxRetailPrice")
    if isinstance(mrp_cand, dict):
        mrp_cand = mrp_cand.get("value") or mrp_cand.get("mrp") or mrp_cand.get("amount")
    if mrp_cand is not None and not found.get("original_price"):
        parsed_mrp = _parse_price(mrp_cand)
        if parsed_mrp:
            found["original_price"] = parsed_mrp

    brand_cand = node.get("brandName") or node.get("brand_name") or node.get("brand")
    if isinstance(brand_cand, dict):
        brand_cand = brand_cand.get("name")
    if isinstance(brand_cand, str) and 1 < len(brand_cand.strip()) < 50 and not found.get("brand"):
        found["brand"] = brand_cand.strip()

    img_cand = (
        node.get("imageUrl")
        or node.get("image_url")
        or node.get("primaryImage")
        or node.get("defaultImage")
        or node.get("searchImage")
    )
    if isinstance(img_cand, dict):
        img_cand = img_cand.get("src") or img_cand.get("url")
    if isinstance(img_cand, str) and img_cand.startswith(("http://", "https://", "//")) and not found.get("image_url"):
        found["image_url"] = ("https:" + img_cand) if img_cand.startswith("//") else img_cand

    rating_cand = node.get("averageRating") or node.get("ratingValue") or node.get("overallRating")
    if rating_cand is not None and found.get("rating") is None:
        try:
            r_val = float(rating_cand)
            if 0 < r_val <= 5:
                found["rating"] = round(r_val, 1)
        except (TypeError, ValueError):
            pass

    for val in node.values():
        if isinstance(val, (dict, list)):
            _walk_state_for_product(val, found, depth + 1)
            if found.get("product_name") and found.get("price") and found.get("image_url"):
                return


def extract_embedded_state(soup) -> dict:
    """Extract product fields from Next.js __NEXT_DATA__ or window.__INITIAL_STATE__ scripts."""
    found: dict = {}

    next_script = soup.select_one("script#__NEXT_DATA__")
    if next_script and next_script.string:
        try:
            data = json.loads(next_script.string)
            _walk_state_for_product(data.get("props", data), found)
        except Exception:
            pass

    if not (found.get("product_name") and found.get("price")):
        for script in soup.find_all("script"):
            raw = script.string or ""
            if not raw or len(raw) < 40:
                continue
            for marker in ("window.__INITIAL_STATE__", "window.__PRELOADED_STATE__", "window.__myx"):
                if marker in raw:
                    m = re.search(re.escape(marker) + r"\s*=\s*(\{.*?\})\s*(?:;|</script>|$)", raw, re.S)
                    if m:
                        try:
                            state_obj = json.loads(m.group(1))
                            _walk_state_for_product(state_obj, found)
                        except Exception:
                            pass
            if found.get("product_name") and found.get("price"):
                break

    return {k: v for k, v in found.items() if v is not None}

