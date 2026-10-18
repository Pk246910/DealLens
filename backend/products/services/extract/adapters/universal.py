"""Universal e-commerce product adapter.

Extracts product data from any online store (Nykaa, JioMart, Snapdeal,
Vijay Sales, Poorvika, Shopify/WooCommerce brand stores, or any arbitrary
retailer URL) using JSON-LD, SSR state (__NEXT_DATA__ / __INITIAL_STATE__),
OpenGraph/meta tags, and universal e-commerce DOM selectors.
"""

from ..base import BaseProductExtractor, ExtractedProduct
from ._common import run_standard

_CFG = {
    "id_patterns": [
        r"/p/([A-Za-z0-9_-]{4,})",
        r"/dp/([A-Z0-9]{8,12})",
        r"/products/([A-Za-z0-9_-]{3,})",
        r"/product/([A-Za-z0-9_-]{3,})",
        r"[?&](?:pid|id|sku)=([A-Za-z0-9_-]{3,})",
    ],
    "wait_selector": "h1",
    "selectors": {
        "title": [
            'h1[itemprop="name"]',
            "h1.product-title",
            "h1.product_title",
            "h1.pdp-title",
            "h1.pdp-e-i-head",
            "h1#product-name",
            ".product-title h1",
            "main h1",
            "h1",
        ],
        "price": [
            '[itemprop="price"]',
            ".payBlkBig",
            "#jm-final-price",
            ".vsp",
            ".pdp-price",
            ".selling-price",
            ".final-price",
            ".offer-price",
            ".discounted-price",
            ".price-item--sale",
            ".price-item--regular",
            ".product-price",
            ".price",
        ],
        "mrp": [
            ".mrp",
            ".original-price",
            ".compare-price",
            ".strike-price",
            "#jm-mrp-price",
            ".price-item--compare",
            "del .amount",
        ],
        "image": [
            'img[itemprop="image"]',
            ".product-gallery img",
            ".product-image img",
            ".pdp-image img",
            ".product-single__photo img",
            ".woocommerce-product-gallery__image img",
            "#bx-slider-left-image-panel img",
            "main img",
        ],
        "brand": [
            '[itemprop="brand"]',
            ".product-brand",
            ".brand-name",
            ".pdp-brand",
        ],
        "rating": [
            '[itemprop="ratingValue"]',
            ".rating-value",
            ".avg-rating",
        ],
        "reviews": [
            '[itemprop="reviewCount"]',
            ".review-count",
            ".ratings-count",
        ],
        "availability": [
            '[itemprop="availability"]',
            ".availability",
            ".stock-status",
        ],
    },
}


class UniversalExtractor(BaseProductExtractor):
    """Dynamic adapter for any e-commerce platform outside the 8 core adapters."""

    name = "Universal"
    domains: tuple = ()

    def __init__(self, platform: str = "Universal"):
        self.name = platform or "Universal"

    def extract(self, url: str) -> ExtractedProduct:
        return run_standard(platform=self.name, url=url, cfg=_CFG)
