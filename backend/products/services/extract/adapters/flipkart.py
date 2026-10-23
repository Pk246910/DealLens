"""Flipkart adapter — selectors moved from the legacy extractor."""

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
        "title": [
            "h1",
            "span.VU-ZEz",
            "h1.yhB1nd",
            "span.m-wzvd",
            "span.B_NuCI",
            "span._35KyD6",
            "div._2W9c4Q",
            "span.G6XhRU",
        ],
        "price": [
            "div.Nx9bqj",
            "div._30jeq3",
            "div._25b18c",
            "div.Nx9bqj._4b5DiR",
            "div._30jeq3._16Jk6d",
            "div.CxhGGd",
            "div._30jeq3._1_WHN1",
        ],
        "mrp": [
            "div.yRaY8j",
            "div._3I9_wc",
            "div.yRaY8j.Z3DfBu",
            "div._3I9_wc.Z3DfBu",
            "div._25b18c ._3I9_wc",
            "div._3I9_wc._2p6cR8",
        ],
        "rating": [
            "div.XQDdHH",
            "div._3LWZlK",
            "div.XQDdHH._1QuN7K",
            "div._3LWZlK._1BLPMq",
            "span._1lRcqv",
            "div._3LWZlK",
        ],
        "reviews": [
            "span.Wphh3N",
            "span._2_R_DZ",
            "span._13vcmD",
        ],
        "image": [
            "img.DByuf4",
            "img._53J4C-",
            "img._396cs4._3n0Glp",
            "img._396cs4",
            "img._2r_T1I",
            "div._4WELSP img",
            "div.vU5WPQ img",
            "img[src*='rukminim']",
            "img[src*='flixcart']",
        ],
        "brand": [
            "span.m-wzvd",
            "span.G6XhRU",
            "span.BWIKRJ",
            "span._2WkVRV",
            "span.BWIKRJ._10LaC2",
        ],
        "availability": [
            "div._16FRkq",
            "div._1AtVbE",
        ],
        "description": [
            "div._1m3Rg7",
            "div._11pzQk",
            "div._3la3Fn",
            "div.RmoJUa",
        ],
    },
    "id_patterns": [r"[?&]pid=([A-Za-z0-9]+)", r"/p/(itm[A-Za-z0-9]+)"],
    "wait_selector": "h1, span.VU-ZEz, div.Nx9bqj, div._30jeq3",
}


def _parse_rating(text: str) -> float:
    m = re.search(r"([\d.]+)", text)
    if not m:
        raise ValueError("no rating")
    return float(m.group(1))


class FlipkartExtractor(BaseProductExtractor):
    name = "Flipkart"
    domains = ("flipkart.com",)

    def extract(self, url: str) -> ExtractedProduct:
        cfg = dict(_CONFIG, parse_rating=_parse_rating)
        return run_standard(platform=self.name, url=url, cfg=cfg)

    # -- LEVEL 1: Flipkart Affiliate API --------------------------------
    # Needs FLIPKART_AFFILIATE_ID / FLIPKART_AFFILIATE_TOKEN in
    # backend/.env (from affiliate.flipkart.com, never in frontend code).
    # Returns None when unconfigured or on any error (pipeline continues).
    def official_api(self, url: str) -> ExtractedProduct | None:
        import os

        import requests

        aff_id = os.getenv("FLIPKART_AFFILIATE_ID", "")
        token = os.getenv("FLIPKART_AFFILIATE_TOKEN", "")
        if not (aff_id and token):
            return None
        m = re.search(r"[?&]pid=([A-Za-z0-9]+)", url)
        if not m:
            return None
        try:
            response = requests.get(
                "https://affiliate-api.flipkart.net/affiliate/product/json",
                params={"id": m.group(1)},
                headers={"Fk-Affiliate-Id": aff_id, "Fk-Affiliate-Token": token},
                timeout=15,
            )
            response.raise_for_status()
            info = response.json().get("productBaseInfoV1", {})
            if not info.get("title"):
                return None

            selling = info.get("flipkartSpecialPrice") or info.get("flipkartSellingPrice") or {}
            mrp_info = info.get("maximumRetailPrice") or {}
            images = info.get("imageUrls") or {}
            image = next((v for v in images.values() if isinstance(v, str) and v.startswith("http")), None)
            rating_info = info.get("rating") or {}
            specs = {
                str(k): str(v)[:200]
                for k, v in list((info.get("attributes") or {}).items())[:20]
            }

            result = ExtractedProduct(
                platform=self.name,
                product_name=str(info["title"]).strip(),
                brand=(info.get("brand") or "").strip() or None,
                product_id=str(info.get("productId") or m.group(1)),
                price=self._amount(selling),
                currency=str(selling.get("currency") or mrp_info.get("currency") or "INR").upper(),
                original_price=self._amount(mrp_info),
                rating=self._safe_float(rating_info.get("average")),
                image_url=image,
                product_url=info.get("productUrl") or url,
                availability="In Stock" if info.get("inStock") else "Out of Stock",
                specifications=specs,
                source=SOURCE_OFFICIAL_API,
                extraction_method=METHOD_OFFICIAL_API,
            )
            from datetime import datetime, timezone as dt_timezone
            result.last_updated = datetime.now(dt_timezone.utc).isoformat()
            result.validate()
            result.compute_confidence()
            return result if result.success else None
        except Exception as e:
            logger.info("Flipkart affiliate lookup failed: %s", str(e)[:150])
            return None

    @staticmethod
    def _amount(node) -> float | None:
        if not isinstance(node, dict):
            return None
        try:
            value = float(node.get("amount", 0))
            return value if value > 0 else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _safe_float(value) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
