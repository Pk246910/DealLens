"""Tata CLiQ adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1.ProductName", "h1.product-title", "h1"],
        "price": ["span.ProductPrice", "span.ProductDescription__price", "span.amount"],
        "mrp": ["span.mrp", "span.ProductDescription__mrp"],
        "rating": ["span.rating", "div.ProductDetails__rating"],
        "image": ["img.product-hero-img", "img.ProductImage__image"],
    },
    "id_patterns": [r"[?&]pid=(\d+)", r"/p-mp(\d+)", r"/(\d{5,})(?:\?|/|$)"],
    "wait_selector": "h1.ProductName, span.ProductPrice",
}


class TataCliqExtractor(BaseProductExtractor):
    name = "Tata CLiQ"
    domains = ("tatacliq.com", "tatcliq.com")
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
