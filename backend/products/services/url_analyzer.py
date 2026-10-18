import re
from urllib.parse import urlparse


PLATFORM_DOMAINS = {
    "amazon.in": "Amazon",
    "amazon.com": "Amazon",
    "amzn.in": "Amazon",
    "flipkart.com": "Flipkart",
    "fkrt.it": "Flipkart",
    "myntra.com": "Myntra",
    "ajio.com": "AJIO",
    "meesho.com": "Meesho",
    "croma.com": "Croma",
    "reliancedigital.in": "Reliance Digital",
    "relianceelectronics.com": "Reliance Digital",
    "tatacliq.com": "Tata CLiQ",
    "nykaa.com": "Nykaa",
    "nykaafashion.com": "Nykaa",
    "jiomart.com": "JioMart",
    "snapdeal.com": "Snapdeal",
    "vijaysales.com": "Vijay Sales",
    "poorvika.com": "Poorvika",
    "boat-lifestyle.com": "boAt",
    "samsung.com": "Samsung Shop",
    "apple.com": "Apple Store",
    "oneplus.in": "OnePlus Store",
    "mi.com": "Xiaomi Store",
    "realme.com": "Realme Store",
    "lenskart.com": "Lenskart",
    "decathlon.in": "Decathlon",
    "pepperfry.com": "Pepperfry",
    "firstcry.com": "FirstCry",
}

RESERVED_TEST_DOMAINS = {
    "example.com",
    "example.org",
    "example.net",
    "test.com",
    "localhost",
    "127.0.0.1",
    "invalid",
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
    {"name": "Nykaa", "domains": ["nykaa.com", "nykaafashion.com"], "icon": "💄"},
    {"name": "JioMart", "domains": ["jiomart.com"], "icon": "🛍️"},
    {"name": "Snapdeal", "domains": ["snapdeal.com"], "icon": "🏷️"},
    {"name": "Vijay Sales", "domains": ["vijaysales.com"], "icon": "🔌"},
]


def _derive_store_name_from_domain(domain: str) -> str:
    """Derive a clean human-readable store name from an arbitrary domain."""
    host = (domain or "").split(":")[0].lower().strip(".")
    for prefix in ("www.", "m.", "shop.", "store.", "buy.", "online.", "dl."):
        if host.startswith(prefix):
            host = host[len(prefix):]
    parts = host.split(".")
    if not parts or not parts[0]:
        return "Online Store"
    core = parts[0]
    cleaned = re.sub(r"[-_]+", " ", core).strip()
    return cleaned.title() if cleaned else "Online Store"


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

        domain = parsed.netloc.lower().split(":")[0]
        if domain.startswith("www."):
            domain = domain[4:]
        return {"valid": True, "url": url, "domain": domain}

    @staticmethod
    def detect_platform(url: str, allow_universal: bool = False) -> dict:
        validation = URLAnalyzer.validate_url(url)
        if not validation["valid"]:
            return {"supported": False, **validation}

        domain = validation["domain"]
        platform_name = PLATFORM_DOMAINS.get(domain)

        if not platform_name:
            for known_domain, name in PLATFORM_DOMAINS.items():
                if domain == known_domain or domain.endswith("." + known_domain):
                    platform_name = name
                    break

        if platform_name:
            return {
                "supported": True,
                "valid": True,
                "url": validation["url"],
                "domain": domain,
                "platform": platform_name,
                "is_universal": False,
                "error": "",
            }

        is_reserved = any(
            domain == r or domain.endswith("." + r) for r in RESERVED_TEST_DOMAINS
        ) or "." not in domain

        if allow_universal and not is_reserved:
            derived_platform = _derive_store_name_from_domain(domain)
            return {
                "supported": True,
                "valid": True,
                "url": validation["url"],
                "domain": domain,
                "platform": derived_platform,
                "is_universal": True,
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
