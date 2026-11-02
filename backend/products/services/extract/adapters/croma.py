"""Croma adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1.pdp-title", "h1.product-title", "h1"],
        "price": ["span.amount", "span.pdp-price", "div.pdp-price"],
        "mrp": ["span.mrp", "span.old-price"],
        "rating": ["span.rating-value", "span.rating"],
        "image": ["img.product-image", "div.main-image img", "img[alt]"],
    },
    "id_patterns": [r"/p/(\d{5,})", r"/(\d{5,})(?:\?|/|$)"],
    "wait_selector": "h1.pdp-title, span.amount",
}


class CromaExtractor(BaseProductExtractor):
    name = "Croma"
    domains = ("croma.com",)
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
