import re
from urllib.parse import urlparse


PLATFORM_DOMAINS = {
    "amazon.in": "Amazon",
    "amazon.com": "Amazon",
    "flipkart.com": "Flipkart",
    "myntra.com": "Myntra",
    "ajio.com": "AJIO",
    "meesho.com": "Meesho",
    "croma.com": "Croma",
    "reliancedigital.in": "Reliance Digital",
    "relianceelectronics.com": "Reliance Digital",
    "tatacliq.com": "Tata CLiQ",
}

SUPPORTED_PLATFORMS = [
    {"name": "Amazon", "domains": ["amazon.in", "amazon.com"], "icon": "🛒"},
    {"name": "Flipkart", "domains": ["flipkart.com"], "icon": "🛍️"},
    {"name": "Myntra", "domains": ["myntra.com"], "icon": "👗"},
    {"name": "AJIO", "domains": ["ajio.com"], "icon": "👟"},
    {"name": "Meesho", "domains": ["meesho.com"], "icon": "🏷️"},
    {"name": "Croma", "domains": ["croma.com"], "icon": "📺"},
    {"name": "Reliance Digital", "domains": ["reliancedigital.in", "relianceelectronics.com"], "icon": "🏪"},
    {"name": "Tata CLiQ", "domains": ["tatacliq.com"], "icon": "🏬"},
]


class URLAnalyzer:
    """Validates URLs, extracts domains, detects platforms, and looks up products in database."""

    @staticmethod
    def validate_url(url: str) -> dict:
        if not url or not isinstance(url, str):
            return {"valid": False, "error": "URL is required"}

        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return {"valid": False, "error": "Invalid URL format"}
            if parsed.scheme not in ("http", "https"):
                return {"valid": False, "error": "Only HTTP/HTTPS URLs are supported"}
        except Exception:
            return {"valid": False, "error": "Invalid URL format"}

        return {"valid": True, "url": url, "domain": parsed.netloc.lower().replace("www.", "")}

    @staticmethod
    def detect_platform(url: str) -> dict:
        validation = URLAnalyzer.validate_url(url)
        if not validation["valid"]:
            return {"supported": False, **validation}

        domain = validation["domain"]
        platform_name = PLATFORM_DOMAINS.get(domain)

        if platform_name:
            return {
                "supported": True,
                "valid": True,
                "url": validation["url"],
                "domain": domain,
                "platform": platform_name,
                "error": "",
            }

        return {
            "supported": False,
            "valid": True,
            "url": validation["url"],
            "domain": domain,
            "platform": "",
            "error": f"Platform '{domain}' is not supported yet. Supported: {', '.join(sorted(set(PLATFORM_DOMAINS.values())))}",
        }

    @staticmethod
    def lookup_product_by_url(url: str, platform: str) -> dict:
        """Look up a product in the database by matching the URL against stored offers."""
        from products.models import ProductOffer

        offer = ProductOffer.objects.filter(
            product_url=url, store_name=platform
        ).select_related("product").first()

        if offer:
            p = offer.product
            return {
                "found": True,
                "product_id": p.id,
                "title": p.title,
                "brand": p.brand,
                "category": p.category,
                "image_url": p.image_url,
                "description": p.description,
                "specifications": p.specifications or {},
                "price": float(offer.current_price),
                "mrp": float(offer.original_price) if offer.original_price else 0,
                "rating": float(offer.rating) if offer.rating else None,
                "review_count": offer.reviews_count,
                "availability": "In Stock" if offer.in_stock else "Out of Stock",
                "delivery_days": offer.delivery_days,
                "coupon_code": offer.coupon_code,
                "coupon_discount": float(offer.coupon_discount) if offer.coupon_discount else 0,
                "product_url": offer.product_url,
                "data_source": offer.data_source,
            }

        return {"found": False}

    @staticmethod
    def get_supported_platforms() -> list:
        return SUPPORTED_PLATFORMS
