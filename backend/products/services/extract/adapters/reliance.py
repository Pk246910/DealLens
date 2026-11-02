"""Reliance Digital adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1.pdp-title", "h1.pdp__title", "h1"],
        "price": ["span.pdp__salePrice", "span.amount", "div.price"],
        "mrp": ["span.pdp__mrp", "span.mrp"],
        "rating": ["span.rating", "div.rating-number"],
        "image": ["img.product-image", "img.pdp__mainImage"],
    },
    "id_patterns": [r"/p/(\d{6,})", r"/(\d{6,})(?:\?|/|$)"],
    "wait_selector": "h1.pdp-title, span.pdp__salePrice, span.amount",
}


class RelianceExtractor(BaseProductExtractor):
    name = "Reliance Digital"
    domains = ("reliancedigital.in", "relianceelectronics.com")
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
