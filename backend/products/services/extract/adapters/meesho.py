"""Meesho adapter."""

from __future__ import annotations

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CONFIG = {
    "selectors": {
        "title": ["h1", "div[class*='ProductName']", "span[class*='StyledText']"],
        "price": ["span[class*='Price']", "div[class*='Price']", "h4[class*='Heading']"],
        "rating": ["span[class*='Rating']"],
        "image": ["img[class*='Product']", "img[src*='images.meesho.com']"],
    },
    "id_patterns": [r"/p/([a-zA-Z0-9]+)", r"/(\d{5,})(?:\?|/|$)"],
    "wait_selector": "h1, span[class*='Price']",
}


class MeeshoExtractor(BaseProductExtractor):
    name = "Meesho"
    domains = ("meesho.com",)
    # No public affiliate/product API (as of Sept 2026) — inherits the
    # no-op official_api(); pipeline proceeds to HTTP extraction.

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=dict(_CONFIG))
