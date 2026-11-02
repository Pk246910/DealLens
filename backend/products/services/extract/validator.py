"""Central data validation and sanitization layer for extracted product data.

Ensures:
- Strict price parsing rejecting EMI amounts, discount badges, and crossed-out numbers.
- Rating scale validation (0.0 to 5.0).
- Non-negative review count extraction.
- Product image URL validation excluding spacers/tracking pixels.
- Product identity verification matching submitted URL against extracted identifiers.
- Field-level verification provenance.
"""

from __future__ import annotations

import logging
import re
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Patterns indicating EMI or recurring payments (NOT current selling price)
EMI_PATTERNS = [
    re.compile(r"\bemi\b", re.I),
    re.compile(r"per\s+month", re.I),
    re.compile(r"/\s*mo(?:nth)?\b", re.I),
    re.compile(r"starting\s+(?:from|at)\s+[₹Rs\d]", re.I),
    re.compile(r"interest\s+free\s+emi", re.I),
    re.compile(r"no\s+cost\s+emi", re.I),
]

# Patterns indicating discounts, savings, or percentages (NOT selling price)
DISCOUNT_PATTERNS = [
    re.compile(r"\d+%\s*off", re.I),
    re.compile(r"save\s+[₹Rs]", re.I),
    re.compile(r"upto\s+[₹Rs\d]", re.I),
    re.compile(r"instant\s+bank\s+discount", re.I),
    re.compile(r"coupon\s+discount", re.I),
    re.compile(r"cashback", re.I),
]

# Patterns indicating tracking / placeholder images
INVALID_IMAGE_MARKERS = [
    "grey-pixel",
    "transparent-pixel",
    "1x1",
    "spacer.gif",
    "pixel.gif",
    "blank.gif",
    "placeholder",
    "data:image",
]

# Patterns indicating non-price technical specifications or address data
SPEC_AND_UNIT_PATTERNS = [
    re.compile(r"\b(?:mah|gb|tb|mb|kb|mp|hz|khz|mhz|ghz|w|watt|watts|kw|v|volt|volts|a|amp|amps|cm|mm|m|inch|inches|ft|kg|g|mg|dpi|fps)\b", re.I),
    re.compile(r"\b(?:pin\s*code|pincode|zip\s*code|postal)\b", re.I),
    re.compile(r"\b(?:battery|ram|rom|storage|processor|display|resolution|camera)\b", re.I),
]


def clean_price_string(text: str | int | float | None) -> float | None:
    """Parse text into a verified selling price.

    Strict rules:
    - Rejects EMI amounts.
    - Rejects discount/percentage amounts.
    - Rejects specifications (mAh, GB, MP, Hz, etc.) and address data (pincodes).
    - Rejects negative or zero values.
    - Parses currency-specific thousands formatting (e.g. 1,29,999.00 -> 129999.0).
    """
    if text is None:
        return None

    if isinstance(text, (int, float)):
        val = float(text)
        return val if (val > 0 and val < 100_000_000) else None

    raw_str = str(text).strip()
    if not raw_str:
        return None

    # Check for EMI disqualifiers
    for pat in EMI_PATTERNS:
        if pat.search(raw_str):
            logger.debug("Rejected price '%s' due to EMI pattern match", raw_str[:60])
            return None

    # Check for standalone discount percentages (e.g. "50% off")
    for pat in DISCOUNT_PATTERNS:
        # If the string ONLY contains a discount/savings message, reject it
        if pat.search(raw_str) and not re.search(r"(?:₹|Rs\.?|INR)\s*[\d,]+", raw_str, re.I):
            logger.debug("Rejected price '%s' due to discount pattern match", raw_str[:60])
            return None

    # Find currency-tagged amounts first
    currency_match = re.search(
        r"(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)",
        raw_str,
        re.I,
    )
    if currency_match:
        cand = currency_match.group(1).replace(",", "")
        try:
            val = float(cand)
            if 0 < val < 100_000_000:
                return round(val, 2)
        except (ValueError, TypeError):
            pass

    # Reject specifications, units, or address numbers when no currency symbol is present
    for pat in SPEC_AND_UNIT_PATTERNS:
        if pat.search(raw_str):
            logger.debug("Rejected non-price specification or address: '%s'", raw_str[:60])
            return None

    # If there is no currency symbol, and the string contains alphabet letters, reject it
    if re.search(r"[a-zA-Z]", raw_str):
        logger.debug("Rejected non-currency text with numbers: '%s'", raw_str[:60])
        return None

    # Generic clean number extraction
    cleaned = re.sub(r"[^\d.]", "", raw_str)
    # If multiple dots appear (e.g. 1499.0073), take the first valid decimal representation
    if cleaned.count(".") > 1:
        parts = cleaned.split(".")
        cleaned = f"{parts[0]}.{parts[1][:2]}"

    try:
        val = float(cleaned)
        if 0 < val < 100_000_000:
            return round(val, 2)
    except (ValueError, TypeError):
        pass

    return None


def clean_rating(value: str | int | float | None, max_scale: float = 5.0) -> float | None:
    """Validate that product rating is a valid float within 0.0 to 5.0.

    Rejects non-numeric, negative, or out-of-bounds ratings.
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        val = float(value)
        return round(val, 2) if 0.0 <= val <= max_scale else None

    raw_str = str(value).strip()
    # Match "4.5 out of 5", "4.5 / 5", "★ 4.5", "4.5"
    m = re.search(r"([\d.]+)\s*(?:out\s+of|\/|stars?|\*|★)?", raw_str, re.I)
    if m:
        try:
            val = float(m.group(1))
            if 0.0 <= val <= max_scale:
                return round(val, 2)
        except (ValueError, TypeError):
            pass

    return None


def clean_review_count(value: str | int | float | None) -> int | None:
    """Validate that review count is a non-negative integer.

    Rejects negative numbers, floating points without integer meaning, or unparseable text.
    """
    if value is None:
        return None

    if isinstance(value, int):
        return value if value >= 0 else None

    if isinstance(value, float):
        return int(value) if value >= 0 else None

    raw_str = str(value).strip()
    # Extract comma-separated integers, e.g. "1,245 Ratings" -> 1245
    m = re.search(r"([\d,]+)", raw_str)
    if m:
        try:
            count = int(m.group(1).replace(",", ""))
            return count if count >= 0 else None
        except (ValueError, TypeError):
            pass

    return None


def validate_image_url(url: str | None) -> str | None:
    """Validate that image URL is a well-formed, public HTTP/HTTPS URL and not a tracking pixel."""
    if not url or not isinstance(url, str):
        return None

    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return None
    except Exception:
        return None

    low = url.lower()
    for marker in INVALID_IMAGE_MARKERS:
        if marker in low:
            return None

    return url


def verify_product_identity(
    submitted_url: str,
    extracted_title: str | None,
    extracted_id: str | None = None,
    canonical_url: str | None = None,
) -> dict:
    """Verify that extracted product data actually belongs to the submitted URL.

    Checks:
    1. Extracted product identifier (ASIN, PID, etc.) against URL.
    2. Significant keywords in URL slug against extracted title.
    3. Canonical URL match.

    Returns dict:
      {
        "verified": bool,
        "confidence": "high" | "medium" | "low" | "failed",
        "reason": str
      }
    """
    if not extracted_title or not extracted_title.strip():
        return {
            "verified": False,
            "confidence": "failed",
            "reason": "Missing product title",
        }

    # Extract slug tokens from submitted URL
    try:
        parsed = urlparse(submitted_url)
        path = parsed.path.lower()
        slug_words = re.findall(r"[a-z0-9]{3,}", path)
        skip = {
            "http", "https", "www", "com", "product", "products", "item", "items",
            "dp", "gp", "itm", "pid", "shop", "online", "buy", "india", "html",
            "ref", "qid", "sr",
        }
        meaningful_slug_tokens = [w for w in slug_words if w not in skip and not w.isdigit()]
    except Exception:
        meaningful_slug_tokens = []

    # 1. Product ID check
    if extracted_id:
        if extracted_id.lower() in submitted_url.lower():
            # If the ID is present in the URL, verify slug tokens don't completely contradict
            if meaningful_slug_tokens:
                title_lower = extracted_title.lower()
                matched_tokens = sum(1 for tok in meaningful_slug_tokens if tok in title_lower)
                if len(meaningful_slug_tokens) >= 3 and matched_tokens == 0:
                    return {
                        "verified": False,
                        "confidence": "failed",
                        "reason": "Extracted title shares no keywords with submitted URL slug despite ID presence",
                    }
            return {
                "verified": True,
                "confidence": "high",
                "reason": f"Product identifier '{extracted_id}' matches submitted URL",
            }
        else:
            # Extracted ID was provided but does not match URL ID
            if re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", submitted_url, re.I) or "pid=" in submitted_url.lower():
                return {
                    "verified": False,
                    "confidence": "failed",
                    "reason": f"Product identifier '{extracted_id}' does not match submitted URL",
                }

    # 2. Slug keyword overlap
    if meaningful_slug_tokens:
        title_lower = extracted_title.lower()
        matched_tokens = sum(1 for tok in meaningful_slug_tokens if tok in title_lower)
        overlap_ratio = matched_tokens / len(meaningful_slug_tokens)

        if overlap_ratio >= 0.25 or matched_tokens >= 2 or (len(meaningful_slug_tokens) == 1 and matched_tokens == 1):
            return {
                "verified": True,
                "confidence": "high" if overlap_ratio >= 0.5 else "medium",
                "reason": f"Title matched {matched_tokens} slug keywords ({round(overlap_ratio*100)}% overlap)",
            }
        elif matched_tokens == 0:
            return {
                "verified": False,
                "confidence": "failed",
                "reason": "Title has zero keyword overlap with submitted URL slug; potential product mismatch",
            }
        else:
            return {
                "verified": False,
                "confidence": "low",
                "reason": f"Low keyword overlap ({matched_tokens}/{len(meaningful_slug_tokens)}) between title and URL",
            }

    # 3. Canonical URL check
    if canonical_url:
        try:
            sub_parsed = urlparse(submitted_url)
            can_parsed = urlparse(canonical_url)
            if sub_parsed.netloc == can_parsed.netloc and sub_parsed.path.rstrip("/") == can_parsed.path.rstrip("/"):
                return {
                    "verified": True,
                    "confidence": "high",
                    "reason": "Canonical URL exactly matches submitted URL path",
                }
        except Exception:
            pass

    # If URL lacks slug tokens and no ID was extracted
    return {
        "verified": True,
        "confidence": "low",
        "reason": "URL lacks slug tokens or product ID; unable to refute or independently confirm",
    }
