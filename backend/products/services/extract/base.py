"""Common extraction interface, result model and field validation.

Unverifiable fields are None — never 0, never "" for prices/ratings.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone as dt_timezone
from urllib.parse import urlparse

# Extraction methods (ordered by preference)
METHOD_OFFICIAL_API = "official_api"
METHOD_JSON_LD = "json_ld"
METHOD_METADATA = "metadata"
METHOD_CSS_SELECTOR = "css_selector"
METHOD_BROWSER = "browser"
METHOD_NONE = "none"

# Confidence levels
CONFIDENCE_HIGH = "high"
CONFIDENCE_MEDIUM = "medium"
CONFIDENCE_LOW = "low"
CONFIDENCE_FAILED = "failed"

# Provenance labels
SOURCE_LIVE_EXTRACTION = "live_extraction"
SOURCE_OFFICIAL_API = "official_api"
SOURCE_DATABASE = "database"
SOURCE_USER_URL = "user_submitted_url"
SOURCE_UNAVAILABLE = "unavailable"


def _utcnow_iso() -> str:
    return datetime.now(dt_timezone.utc).isoformat()


def _valid_url(value) -> str | None:
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    try:
        parsed = urlparse(value)
    except Exception:
        return None
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    return value


@dataclass
class ExtractedProduct:
    """Common normalized structure returned by every platform adapter."""

    platform: str = ""
    product_name: str | None = None
    brand: str | None = None
    product_id: str | None = None
    sku: str | None = None
    price: float | None = None
    currency: str = "INR"
    original_price: float | None = None
    discount_percentage: float | None = None
    rating: float | None = None
    review_count: int | None = None
    image_url: str | None = None
    product_url: str | None = None
    availability: str | None = None
    delivery_information: str | None = None
    offers: list = field(default_factory=list)
    coupon: str | None = None
    specifications: dict = field(default_factory=dict)
    source: str = SOURCE_UNAVAILABLE
    extraction_method: str = METHOD_NONE
    last_updated: str = ""
    confidence: str = CONFIDENCE_FAILED
    reason: str = ""
    identity_verified: bool = True
    identity_reason: str = ""

    @property
    def success(self) -> bool:
        return bool(self.product_name) and self.confidence != CONFIDENCE_FAILED and self.identity_verified

    @property
    def is_partial(self) -> bool:
        """True when identity/title is verified but price could not be verified."""
        return bool(self.product_name) and (self.price is None or self.price <= 0)

    @property
    def fields_available(self) -> dict:
        return {
            "product_name": self.product_name is not None,
            "brand": self.brand is not None,
            "price": self.price is not None and self.price > 0,
            "original_price": self.original_price is not None and self.original_price > 0,
            "rating": self.rating is not None,
            "review_count": self.review_count is not None,
            "image_url": self.image_url is not None,
            "availability": self.availability is not None,
            "specifications": bool(self.specifications),
        }

    @property
    def field_status(self) -> dict:
        return {
            "title": {"value": self.product_name, "verified": bool(self.product_name)},
            "price": {"value": self.price, "verified": self.price is not None and self.price > 0},
            "mrp": {"value": self.original_price, "verified": self.original_price is not None and self.original_price > 0},
            "rating": {"value": self.rating, "verified": self.rating is not None},
            "review_count": {"value": self.review_count, "verified": self.review_count is not None},
            "image": {"value": self.image_url, "verified": self.image_url is not None},
            "availability": {"value": self.availability, "verified": self.availability is not None},
        }

    def validate(self) -> list[str]:
        """Validate every field in place; invalid values become None.

        Returns a list of field names that were nulled.
        """
        from .validator import (
            clean_price_string,
            clean_rating,
            clean_review_count,
            validate_image_url,
            verify_product_identity,
        )

        nulled = []

        if not self.product_name or not str(self.product_name).strip():
            self.product_name = None
            nulled.append("product_name")

        # Validate price
        if self.price is not None:
            cleaned_p = clean_price_string(self.price)
            if cleaned_p is None:
                self.price = None
                nulled.append("price")
            else:
                self.price = cleaned_p

        # Validate original_price (MRP)
        if self.original_price is not None:
            cleaned_mrp = clean_price_string(self.original_price)
            if cleaned_mrp is None:
                self.original_price = None
                nulled.append("original_price")
            else:
                self.original_price = cleaned_mrp

        if (
            self.original_price is not None
            and self.price is not None
            and self.original_price < self.price
        ):
            self.original_price = None
            nulled.append("original_price")

        if self.discount_percentage is not None:
            try:
                disc = float(self.discount_percentage)
                if not (0 <= disc <= 90):
                    raise ValueError
                self.discount_percentage = round(disc, 2)
            except (TypeError, ValueError):
                self.discount_percentage = None
                nulled.append("discount_percentage")

        if self.rating is not None:
            cleaned_r = clean_rating(self.rating)
            if cleaned_r is None:
                self.rating = None
                nulled.append("rating")
            else:
                self.rating = cleaned_r

        if self.review_count is not None:
            cleaned_rc = clean_review_count(self.review_count)
            if cleaned_rc is None:
                self.review_count = None
                nulled.append("review_count")
            else:
                self.review_count = cleaned_rc

        if self.image_url is not None:
            cleaned_img = validate_image_url(self.image_url)
            if cleaned_img is None:
                self.image_url = None
                nulled.append("image_url")
            else:
                self.image_url = cleaned_img

        if self.product_url is not None:
            cleaned_url = _valid_url(self.product_url)
            if cleaned_url is None:
                nulled.append("product_url")
            self.product_url = cleaned_url

        if not isinstance(self.specifications, dict):
            self.specifications = {}
            nulled.append("specifications")

        if not isinstance(self.offers, list):
            self.offers = []

        # Product identity check against submitted URL
        if self.product_name and self.product_url:
            ident = verify_product_identity(
                submitted_url=self.product_url,
                extracted_title=self.product_name,
                extracted_id=self.product_id,
            )
            self.identity_verified = ident["verified"]
            self.identity_reason = ident["reason"]
            if not self.identity_verified:
                self.confidence = CONFIDENCE_FAILED
                self.reason = f"Product identity mismatch: {ident['reason']}"

        if self.product_name is None:
            self.confidence = CONFIDENCE_FAILED
        return nulled

    def compute_confidence(self) -> str:
        """Grade the extraction from method + field completeness."""
        if not self.product_name:
            self.confidence = CONFIDENCE_FAILED
            return self.confidence
        if self.extraction_method == METHOD_OFFICIAL_API:
            self.confidence = CONFIDENCE_HIGH
        elif self.extraction_method == METHOD_JSON_LD and self.price is not None:
            self.confidence = CONFIDENCE_HIGH
        elif self.price is not None and self.extraction_method in (
            METHOD_METADATA,
            METHOD_CSS_SELECTOR,
            METHOD_BROWSER,
            METHOD_JSON_LD,
        ):
            self.confidence = CONFIDENCE_MEDIUM
        else:
            self.confidence = CONFIDENCE_LOW
        return self.confidence

    def to_legacy(self) -> dict:
        """Map to the existing normalized dict consumed by comparison/AI.

        None prices become 0 here (downstream scoring already treats 0 as
        missing); provenance travels in data_source.
        """
        source_map = {
            SOURCE_OFFICIAL_API: "live",
            SOURCE_LIVE_EXTRACTION: "live",
            SOURCE_DATABASE: "dataset",
            SOURCE_USER_URL: "url_extract",
            SOURCE_UNAVAILABLE: "url_extract",
        }
        return {
            "title": self.product_name or "",
            "brand": self.brand or "",
            "category": "",
            "price": self.price if self.price is not None else 0,
            "mrp": self.original_price if self.original_price is not None else 0,
            "rating": self.rating,
            "review_count": self.review_count if self.review_count is not None else 0,
            "image_url": self.image_url or "",
            "description": "",
            "specifications": self.specifications or {},
            "availability": self.availability or "Unknown",
            "delivery": self.delivery_information or "",
            "offers": self.offers or [],
            "coupon_code": self.coupon,
            "platform": self.platform,
            "source_url": self.product_url or "",
            "data_source": source_map.get(self.source, "url_extract"),
        }

    def to_response(self) -> dict:
        """Public extraction block for API responses (no internals)."""
        return {
            "success": self.success,
            "is_partial": self.is_partial,
            "identity_verified": self.identity_verified,
            "platform": self.platform,
            "method": self.extraction_method,
            "confidence": self.confidence,
            "source": self.source,
            "last_updated": self.last_updated or _utcnow_iso(),
            "reason": self.reason,
            "fields_available": self.fields_available,
            "field_status": self.field_status,
        }


class BaseProductExtractor(ABC):
    """Interface every platform adapter implements."""

    name: str = ""
    domains: tuple = ()

    @classmethod
    def match(cls, url: str) -> bool:
        try:
            host = urlparse(url).netloc.lower().replace("www.", "")
        except Exception:
            return False
        return host in cls.domains

    @abstractmethod
    def extract(self, url: str) -> ExtractedProduct:
        """Run this platform's extraction levels, return validated result."""

    def normalize(self, data: ExtractedProduct) -> ExtractedProduct:
        data.validate()
        data.compute_confidence()
        return data

    def validate(self, data: ExtractedProduct) -> list[str]:
        return data.validate()

    def official_api(self, url: str) -> ExtractedProduct | None:
        """LEVEL 1 — official/affiliate API. Return None when unconfigured.

        Convention: credentials come ONLY from environment variables
        (<PLATFORM>_API_KEY style, see each adapter). Adapters for
        platforms with no public affiliate API inherit this no-op.
        """
        return None
