"""Amazon adapter — selectors moved from the legacy extractor."""

from __future__ import annotations

import logging
import re

from ..base import (
    METHOD_OFFICIAL_API,
    SOURCE_OFFICIAL_API,
    BaseProductExtractor,
    ExtractedProduct,
)
from ._common import run_standard

logger = logging.getLogger(__name__)

_CONFIG = {
    "selectors": {
        "title": ["#productTitle"],
        "price": [".a-price .a-offscreen", "#priceblock_ourprice", "#priceblock_dealprice"],
        "mrp": [".a-price.a-text-price .a-offscreen", "#priceblock_listprice"],
        "rating": ["#acrPopover .a-icon-alt", "#acrCustomerReviewText"],
        "reviews": ["#acrCustomerReviewText"],
        "image": ["#landingImage", "#imgBlkFront", "#imgTagWrapperId img", "#main-image-container img", "img.a-dynamic-image"],
        "brand": ["#bylineInfo"],
        "availability": ["#availability", "#outOfStock"],
        "description": ["#productDescription", "#feature-bullets"],
    },
    "id_patterns": [r"/dp/([A-Z0-9]{10})", r"/gp/product/([A-Z0-9]{10})"],
    "wait_selector": "#productTitle",
}


def _parse_rating(text: str) -> float:
    m = re.search(r"([\d.]+)\s*out of", text)
    if m:
        return float(m.group(1))
    return float(text.strip().split()[0])


def _parse_reviews(text: str) -> int:
    m = re.search(r"([\d,]+)", text)
    if not m:
        raise ValueError("no review count")
    return int(m.group(1).replace(",", ""))


def _parse_brand(text: str) -> str:
    cleaned = re.sub(r"^(Visit the |Brand:\s*)", "", text).replace(" Store", "").strip()
    return cleaned


def _extract_asin(url: str) -> str | None:
    m = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
    return m.group(1) if m else None


class AmazonExtractor(BaseProductExtractor):
    name = "Amazon"
    domains = ("amazon.in", "amazon.com")

    def extract(self, url: str) -> ExtractedProduct:
        cfg = dict(_CONFIG)
        result = run_standard(platform=self.name, url=url, cfg=cfg)
        if result.brand:
            result.brand = _parse_brand(result.brand)
        return result

    # -- LEVEL 1: Amazon Product Advertising API 5.0 ---------------------
    # Needs AMAZON_PAAPI_ACCESS_KEY / AMAZON_PAAPI_SECRET_KEY /
    # AMAZON_PARTNER_TAG in backend/.env (never in frontend code).
    # Signed directly with stdlib (AWS SigV4) — no extra dependency.
    # Returns None when unconfigured or on any error (pipeline continues).
    def official_api(self, url: str) -> ExtractedProduct | None:
        import os
        from concurrent.futures import ThreadPoolExecutor

        access = os.getenv("AMAZON_PAAPI_ACCESS_KEY", "")
        secret = os.getenv("AMAZON_PAAPI_SECRET_KEY", "")
        tag = os.getenv("AMAZON_PARTNER_TAG", "")
        if not (access and secret and tag):
            return None
        asin = _extract_asin(url)
        if not asin:
            return None
        pool = ThreadPoolExecutor(max_workers=1)
        try:
            return pool.submit(self._paapi_lookup, access, secret, tag, url, asin).result(timeout=20)
        except Exception as e:
            logger.info("Amazon PA-API lookup failed: %s", str(e)[:150])
            return None
        finally:
            pool.shutdown(wait=False, cancel_futures=True)

    def _paapi_lookup(self, access, secret, tag, url, asin):
        import hashlib
        import hmac
        import json
        from datetime import datetime, timezone as dt_timezone

        import requests

        host = "webservices.amazon.in"
        marketplace = "www.amazon.in"
        region = "eu-west-1"
        if "amazon.com" in url and "amazon.in" not in url:
            host, marketplace, region = (
                "webservices.amazon.com", "www.amazon.com", "us-east-1")

        payload = json.dumps({
            "ItemIds": [asin],
            "PartnerTag": tag,
            "PartnerType": "Associates",
            "Marketplace": marketplace,
            "Resources": [
                "Images.Primary.Large",
                "ItemInfo.Title",
                "ItemInfo.ByLineInfo",
                "Offers.Listings.Price",
                "Offers.Listings.Availability",
            ],
        })
        now = datetime.now(dt_timezone.utc)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = now.strftime("%Y%m%d")
        service = "ProductAdvertisingAPI"
        target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems"

        payload_hash = hashlib.sha256(payload.encode()).hexdigest()
        canonical_headers = f"content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:{host}\nx-amz-date:{amz_date}\nx-amz-target:{target}\n"
        signed_headers = "content-encoding;content-type;host;x-amz-date;x-amz-target"
        canonical_request = (
            f"POST\n/paapi5/getitems\n\n{canonical_headers}\n"
            f"{signed_headers}\n{payload_hash}"
        )
        scope = f"{date_stamp}/{region}/{service}/aws4_request"
        string_to_sign = (
            f"AWS4-HMAC-SHA256\n{amz_date}\n{scope}\n"
            + hashlib.sha256(canonical_request.encode()).hexdigest()
        )

        def _sign(key, msg):
            return hmac.new(key, msg.encode(), hashlib.sha256).digest()

        signing_key = _sign(
            _sign(_sign(_sign(("AWS4" + secret).encode(), date_stamp), region), service),
            "aws4_request",
        )
        signature = hmac.new(signing_key, string_to_sign.encode(), hashlib.sha256).hexdigest()

        response = requests.post(
            f"https://{host}/paapi5/getitems",
            data=payload,
            headers={
                "Content-Encoding": "amz-1.0",
                "Content-Type": "application/json; charset=utf-8",
                "Host": host,
                "X-Amz-Date": amz_date,
                "X-Amz-Target": target,
                "Authorization": (
                    f"AWS4-HMAC-SHA256 Credential={access}/{scope}, "
                    f"SignedHeaders={signed_headers}, Signature={signature}"
                ),
            },
            timeout=15,
        )
        response.raise_for_status()
        items = (response.json().get("ItemsResult") or {}).get("Items") or []
        if not items:
            return None
        item = items[0]
        info = item.get("ItemInfo") or {}
        images = item.get("Images") or {}
        listings = (item.get("Offers") or {}).get("Listings") or []
        listing = listings[0] if listings else {}
        price_node = listing.get("Price") or {}
        avail_msg = (listing.get("Availability") or {}).get("Message")
        amount = self._safe_amount(price_node.get("Amount"))
        mrp = self._safe_amount((listing.get("SavingBasis") or {}).get("Amount"))

        result = ExtractedProduct(
            platform=self.name,
            product_name=str((info.get("Title") or {}).get("DisplayValue") or "").strip() or None,
            brand=str((((info.get("ByLineInfo") or {}).get("Brand") or {}).get("DisplayValue")) or "").strip() or None,
            product_id=item.get("ASIN") or asin,
            price=amount,
            currency=str(price_node.get("Currency") or "INR").upper(),
            original_price=mrp,
            image_url=((images.get("Primary") or {}).get("Large") or {}).get("URL"),
            product_url=item.get("DetailPageURL") or url,
            availability=(
                "In Stock" if avail_msg and "in stock" in str(avail_msg).lower()
                else (str(avail_msg).strip()[:60] if avail_msg else None)
            ),
            source=SOURCE_OFFICIAL_API,
            extraction_method=METHOD_OFFICIAL_API,
        )
        from datetime import datetime as _dt, timezone as _tz
        result.last_updated = _dt.now(_tz.utc).isoformat()
        result.validate()
        result.compute_confidence()
        return result if result.success else None

    @staticmethod
    def _safe_amount(value) -> float | None:
        try:
            number = float(value)
            return number if number > 0 else None
        except (TypeError, ValueError):
            return None
