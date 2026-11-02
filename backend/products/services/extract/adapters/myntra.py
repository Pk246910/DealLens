"""Myntra adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1.pdp-name", "h1.pdp-title", "h1"],
        "price": ["span.pdp-price", "span.pdp-price-strong", "span.price-per-piece"],
        "mrp": ["span.pdp-mrp"],
        "rating": ["div.index-overallRating"],
        "reviews": ["div.index-ratingsCount"],
        "image": ["img.picture-picture", "div.image-grid-image img", "img.jCqzTN"],
        "brand": ["h1.pdp-title", "h1.pdp-name"],
    },
    "id_patterns": [r"/(\d{6,})(?:\?|/|$)", r"-(\d{6,})/buy"],
    "wait_selector": "h1.pdp-name, h1.pdp-title, span.pdp-price",
}


class MyntraExtractor(BaseProductExtractor):
    name = "Myntra"
    domains = ("myntra.com",)
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
