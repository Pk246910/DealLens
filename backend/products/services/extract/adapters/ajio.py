"""AJIO adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1.prod-title", "div.item-name", "h1"],
        "price": ["div.prod-sp", "div.price strong", "span.price"],
        "mrp": ["span.prod-cp", "span.mrp"],
        "rating": ["div.rating", "span.rating-val"],
        "image": ["img.rilrtl-products-img__img", "img.prod-image"],
        "brand": ["h2.brand-name", "div.brand"],
    },
    "id_patterns": [r"/p/([a-zA-Z0-9_]+)", r"/(\d{6,})(?:\?|/|$)"],
    "wait_selector": "h1.prod-title, div.prod-sp, div.item-name",
}


class AjioExtractor(BaseProductExtractor):
    name = "AJIO"
    domains = ("ajio.com",)
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
