import datetime
import math
from decimal import Decimal
from urllib.parse import quote_plus
from django.utils import timezone
from products.models import Product, ProductOffer, PriceHistory

PLATFORM_PROFILES = {
    "Amazon": {
        "multiplier_range": (-0.015, 0.015),
        "rating_base": 4.4,
        "delivery_days": 2,
        "coupon_code": "AMZPRIME",
        "search_url": "https://www.amazon.in/s?k={query}",
    },
    "Flipkart": {
        "multiplier_range": (-0.025, 0.015),
        "rating_base": 4.3,
        "delivery_days": 2,
        "coupon_code": "FLIPKART5",
        "search_url": "https://www.flipkart.com/search?q={query}",
    },
    "Croma": {
        "multiplier_range": (0.005, 0.025),
        "rating_base": 4.2,
        "delivery_days": 3,
        "coupon_code": "CRNEW500",
        "search_url": "https://www.croma.com/searchB?q={query}",
    },
    "Reliance Digital": {
        "multiplier_range": (-0.01, 0.015),
        "rating_base": 4.2,
        "delivery_days": 3,
        "coupon_code": "REL1000",
        "search_url": "https://www.reliancedigital.in/search?q={query}",
    },
    "Tata CLiQ": {
        "multiplier_range": (-0.015, 0.025),
        "rating_base": 4.1,
        "delivery_days": 4,
        "coupon_code": "CLIQFIRST",
        "search_url": "https://www.tatacliq.com/search/?searchCategory=all&text={query}",
    },
    "Myntra": {
        "multiplier_range": (-0.03, 0.02),
        "rating_base": 4.3,
        "delivery_days": 3,
        "coupon_code": "MYNTRA200",
        "search_url": "https://www.myntra.com/{query}",
    },
    "AJIO": {
        "multiplier_range": (-0.035, 0.01),
        "rating_base": 4.2,
        "delivery_days": 4,
        "coupon_code": "AJIOMANIA",
        "search_url": "https://www.ajio.com/search/?text={query}",
    },
    "Meesho": {
        "multiplier_range": (-0.05, -0.01),
        "rating_base": 4.0,
        "delivery_days": 5,
        "coupon_code": "MEESHO10",
        "search_url": "https://www.meesho.com/search?q={query}",
    },
    "Nykaa": {
        "multiplier_range": (-0.02, 0.015),
        "rating_base": 4.4,
        "delivery_days": 3,
        "coupon_code": "NYKAA10",
        "search_url": "https://www.nykaa.com/search/result/?q={query}",
    },
    "JioMart": {
        "multiplier_range": (-0.03, 0.01),
        "rating_base": 4.1,
        "delivery_days": 3,
        "coupon_code": "JIO50",
        "search_url": "https://www.jiomart.com/search/{query}",
    },
    "Snapdeal": {
        "multiplier_range": (-0.04, 0.01),
        "rating_base": 4.0,
        "delivery_days": 5,
        "coupon_code": "SNAP100",
        "search_url": "https://www.snapdeal.com/search?keyword={query}",
    },
    "Vijay Sales": {
        "multiplier_range": (-0.015, 0.02),
        "rating_base": 4.2,
        "delivery_days": 3,
        "coupon_code": "VSDEAL",
        "search_url": "https://www.vijaysales.com/search/{query}",
    },
}


def round_to_retail_price(raw_price: float) -> float:
    """Rounds prices to realistic Indian retail price points (ending in 99, 90, 49, etc.)."""
    if raw_price <= 0:
        return 0.0
    if raw_price >= 10000:
        hundreds = round(raw_price / 100) * 100
        # alternate nice retail endings
        last_digits = int(raw_price) % 100
        if last_digits > 75:
            price = hundreds - 1  # 99
        elif last_digits > 40:
            price = hundreds - 10  # 90
        else:
            price = hundreds - 51  # 49
    elif raw_price >= 1000:
        fifties = round(raw_price / 50) * 50
        price = fifties - 1  # 49 or 99
    elif raw_price >= 100:
        tens = round(raw_price / 10) * 10
        price = tens - 1  # 9
    else:
        price = round(raw_price)
    return max(1.0, float(price))


def get_category_platforms(category: str, title: str = "", source_platform: str = "") -> list:
    """
    Returns a selective, realistic subset of 3 to 4 platforms where this specific
    product and category are actually available (instead of every store).
    """
    cat_lower = f"{category or ''} {title or ''}".lower()

    if any(k in cat_lower for k in ("beauty", "cosmetic", "makeup", "skincare", "lipstick", "serum", "shampoo", "perfume", "fragrance")):
        pool = ["Nykaa", "Amazon", "Flipkart", "Myntra", "Tata CLiQ"]
    elif any(k in cat_lower for k in ("cloth", "fashion", "wear", "shoe", "sneaker", "dress", "shirt", "jeans", "kurta", "jacket", "t-shirt", "polo", "apparel", "sandal", "boot", "backpack")):
        pool = ["Myntra", "AJIO", "Amazon", "Flipkart", "Tata CLiQ", "Meesho"]
    elif any(k in cat_lower for k in ("mixer", "grinder", "fryer", "kettle", "refrigerator", "purifier", "washing", "fridge", "aquaguard", "kitchen", "appliance")):
        pool = ["Amazon", "Flipkart", "Croma", "Reliance Digital", "Tata CLiQ"]
    elif any(k in cat_lower for k in ("phone", "smart", "tv", "audio", "laptop", "tablet", "tech", "electronic", "gaming", "watch", "earbud", "headphone", "airpods", "macbook", "iphone", "galaxy", "camera", "speaker")):
        pool = ["Amazon", "Flipkart", "Croma", "Reliance Digital", "Tata CLiQ"]
    else:
        pool = ["Amazon", "Flipkart", "Croma", "Reliance Digital", "Tata CLiQ"]

    seed_str = (title or category or "Product").strip().lower()
    seed = sum(ord(c) * (i + 1) for i, c in enumerate(seed_str))
    # Deterministically select 3 or 4 platforms per product
    target_count = 3 if (seed % 2 == 0) else 4

    selected = []
    if source_platform:
        # Match canonical casing if in pool
        matched_src = next((p for p in pool if p.lower() == source_platform.lower()), source_platform)
        selected.append(matched_src)

    # Rotate through the category pool starting at a product-specific offset
    n_pool = len(pool)
    start_idx = seed % n_pool
    step = 2 if (seed % 3 == 0 and n_pool > 4) else 1
    for i in range(n_pool):
        candidate = pool[(start_idx + i * step) % n_pool]
        if all(candidate.lower() != s.lower() for s in selected):
            selected.append(candidate)
        if len(selected) >= target_count:
            break

    return selected


def generate_platform_price(base_price: float, platform: str, title: str) -> float:
    """
    Deterministically computes a realistic price for a platform based on live base_price.
    Guaranteed to stay within ±1.5% to 3% of the live price so comparison is highly relevant.
    """
    if base_price <= 0:
        return 0.0
    profile = PLATFORM_PROFILES.get(platform, PLATFORM_PROFILES["Amazon"])
    low, high = profile.get("multiplier_range", (-0.02, 0.02))

    # Deterministic hash seed using title and platform
    seed = sum(ord(c) for c in (title or "") + platform)
    factor = (seed % 100) / 100.0
    multiplier = 1.0 + low + factor * (high - low)
    return round_to_retail_price(base_price * multiplier)


def generate_benchmark_listings(
    base_price: float,
    title: str = "",
    category: str = "",
    source_platform: str = "Amazon",
    base_mrp: float = 0.0,
) -> list:
    """
    Generates realistic comparison listings and 31-point price history trends
    for the 3-4 selective platforms where this product is available.
    """
    if base_price <= 0:
        return []

    platforms = get_category_platforms(category, title=title, source_platform=source_platform)

    if not base_mrp or base_mrp <= base_price:
        base_mrp = round_to_retail_price(base_price * 1.18)

    listings = []
    seed_base = sum(ord(c) for c in (title or "Product"))

    for platform in platforms:
        profile = PLATFORM_PROFILES.get(platform, PLATFORM_PROFILES["Amazon"])
        is_source = (platform.lower() == (source_platform or "").lower())

        if is_source:
            p = float(base_price)
            mrp = float(base_mrp)
        else:
            p = generate_platform_price(base_price, platform, title)
            mrp = round_to_retail_price(max(p * 1.05, base_mrp * (1.0 + ((seed_base % 5) - 2) * 0.01)))

        search_template = profile.get("search_url", "https://www.google.com/search?q={query}")
        clean_query = quote_plus((title or "product")[:60].strip())
        store_url = search_template.format(query=clean_query)

        p_seed = sum(ord(c) for c in platform)
        rating = round(min(4.9, max(3.9, profile["rating_base"] + ((p_seed % 5) - 2) * 0.1)), 1)
        reviews = 120 + ((seed_base + p_seed) % 850)

        # 31-point trend: Day 30 is current price, Days 0 to 29 fluctuate realistically
        trend = []
        for day in range(31):
            if day == 30:
                trend.append(p)
            else:
                days_ago = 30 - day
                # Sinusoidal cycle with platform offset: within ±3.5%
                cycle = math.sin((days_ago * 0.5) + (p_seed % 7))
                noise = (((seed_base * day) % 9) - 4) * 0.002
                t_price = round_to_retail_price(p * (1.0 + cycle * 0.03 + noise))
                trend.append(t_price)

        listings.append({
            "platform": platform,
            "product_title": title or "Product",
            "price": p,
            "mrp": mrp,
            "rating": rating,
            "review_count": reviews,
            "availability": "In Stock",
            "delivery_days": profile.get("delivery_days", 3),
            "delivery_time": f"{profile.get('delivery_days', 3)} days",
            "coupon_code": profile.get("coupon_code"),
            "product_url": store_url,
            "source_url": store_url,
            "trend": trend,
            "is_source": is_source,
            "is_demo": not is_source,
            "data_source": "live" if is_source else "benchmark",
            "match_confidence": 100.0 if is_source else 95.0,
        })

    # Sort listings cheapest first
    listings.sort(key=lambda l: l["price"] if l["price"] > 0 else float("inf"))
    min_price = listings[0]["price"] if listings else 0

    for l in listings:
        l["is_cheapest"] = (l["price"] == min_price and l["price"] > 0)
        l["savings_vs_this"] = round(l["price"] - min_price, 2) if min_price > 0 else 0

    return listings


def ensure_product_price_history(product: Product, base_price: float = None, source_platform: str = None):
    """
    Populates 30 days of realistic multi-store price history and ProductOffers
    for the 3-4 selective platforms where this product is available.
    """
    if not product:
        return

    if not base_price or base_price <= 0:
        first_offer = product.offers.filter(current_price__gt=0).first()
        if first_offer:
            base_price = float(first_offer.current_price)
        else:
            first_hist = PriceHistory.objects.filter(product=product, price__gt=0).first()
            if first_hist:
                base_price = float(first_hist.price)

    if not base_price or base_price <= 0:
        return

    source_platform = source_platform or (product.offers.first().store_name if product.offers.exists() else "Amazon")
    platforms = get_category_platforms(product.category, title=product.title, source_platform=source_platform)

    # Also include any existing valid non-benchmark offers on this product (up to 4 stores total)
    for existing_store in product.offers.filter(current_price__gt=0).exclude(data_source="benchmark").values_list("store_name", flat=True):
        if existing_store and all(existing_store.lower() != p.lower() for p in platforms) and len(platforms) < 4:
            platforms.append(existing_store)

    # Remove any excess benchmark offers/history on platforms outside the selective stores
    product.offers.filter(data_source="benchmark").exclude(store_name__in=platforms).delete()
    PriceHistory.objects.filter(product=product, collection_method="benchmark").exclude(store_name__in=platforms).delete()

    now = timezone.now()
    records_to_create = []
    seed_base = sum(ord(c) for c in (product.title or "Product"))

    for platform in platforms:
        is_src = (platform.lower() == source_platform.lower())
        existing_offer = product.offers.filter(store_name=platform, current_price__gt=0).first()
        if existing_offer and not is_src:
            p_current = float(existing_offer.current_price)
        else:
            p_current = base_price if is_src else generate_platform_price(base_price, platform, product.title)

        profile = PLATFORM_PROFILES.get(platform, PLATFORM_PROFILES["Amazon"])

        # Ensure ProductOffer exists with a valid price
        if not existing_offer:
            search_template = profile.get("search_url", "https://www.google.com/search?q={query}")
            clean_query = quote_plus((product.title or "product")[:60].strip())
            store_url = search_template.format(query=clean_query)
            mrp_val = round_to_retail_price(p_current * 1.18)

            ProductOffer.objects.update_or_create(
                product=product,
                store_name=platform,
                defaults={
                    "current_price": Decimal(str(p_current)),
                    "original_price": Decimal(str(mrp_val)),
                    "product_url": store_url,
                    "rating": Decimal(str(profile.get("rating_base", 4.3))),
                    "reviews_count": 120 + ((seed_base + sum(ord(c) for c in platform)) % 600),
                    "in_stock": True,
                    "data_source": "benchmark" if not is_src else "live",
                    "delivery_days": profile.get("delivery_days", 3),
                    "delivery_time": f"{profile.get('delivery_days', 3)} days",
                    "coupon_code": profile.get("coupon_code"),
                    "coupon_discount": Decimal("500") if p_current > 10000 else Decimal("0"),
                },
            )

        store_hist_qs = PriceHistory.objects.filter(product=product, store_name=platform)
        if store_hist_qs.filter(price__gt=p_current * 1.10).exists() or store_hist_qs.filter(price__lt=p_current * 0.90).exists():
            store_hist_qs.delete()
            store_hist_qs = PriceHistory.objects.filter(product=product, store_name=platform)

        store_hist_count = store_hist_qs.count()

        if store_hist_count >= 8:
            latest_rec = store_hist_qs.order_by("-recorded_at").first()
            if latest_rec and abs(float(latest_rec.price) - p_current) > 1.0:
                records_to_create.append(
                    PriceHistory(
                        product=product,
                        store_name=platform,
                        price=Decimal(str(p_current)),
                        currency="INR",
                        collection_method="benchmark" if not is_src else "live",
                        data_status="demonstration",
                        recorded_at=now,
                    )
                )
            continue

        if store_hist_count == 0:
            # Day 0 (today)
            records_to_create.append(
                PriceHistory(
                    product=product,
                    store_name=platform,
                    price=Decimal(str(p_current)),
                    currency="INR",
                    collection_method="benchmark" if not is_src else "live",
                    data_status="demonstration",
                    recorded_at=now,
                )
            )

        # 12 historical points across past 30 days for a smooth continuous curve
        p_seed = sum(ord(c) for c in platform)
        day_points = [2, 4, 6, 9, 12, 15, 18, 21, 24, 27, 30]
        for days_ago in day_points:
            cycle = math.sin((days_ago * 0.5) + (p_seed % 7))
            noise = (((seed_base * days_ago) % 11) - 5) * 0.002
            hist_p = round_to_retail_price(p_current * (1.0 + cycle * 0.032 + noise))
            past_dt = now - datetime.timedelta(days=days_ago, hours=(p_seed % 10))
            records_to_create.append(
                PriceHistory(
                    product=product,
                    store_name=platform,
                    price=Decimal(str(hist_p)),
                    currency="INR",
                    collection_method="benchmark",
                    data_status="demonstration",
                    recorded_at=past_dt,
                )
            )

    if records_to_create:
        PriceHistory.objects.bulk_create(records_to_create, ignore_conflicts=True)


CATEGORY_PRICE_DEFAULTS = {
    "Smartphones": 24999.0,
    "Mobile Phones": 24999.0,
    "Laptops": 54999.0,
    "Tablets": 29999.0,
    "Headphones": 4999.0,
    "Earbuds": 2499.0,
    "Watches": 3499.0,
    "Smartwatches": 3499.0,
    "TVs": 36999.0,
    "Televisions": 36999.0,
    "Cameras": 48999.0,
    "Footwear": 3499.0,
    "Fashion": 1499.0,
    "Home Appliances": 6999.0,
    "Kitchen Appliances": 3999.0,
    "Gaming": 39999.0,
    "Computer Accessories": 2499.0,
    "Speakers": 3999.0,
}

CATEGORY_SVG_THEMES = {
    "Smartphones": (
        "#06b6d4",
        "SMARTPHONES",
        '<rect x="148" y="80" width="104" height="180" rx="16" fill="none" stroke="#06b6d4" stroke-width="4"/>'
        '<rect x="156" y="96" width="88" height="140" rx="4" fill="#06b6d4" opacity="0.15"/>'
        '<circle cx="200" cy="248" r="8" fill="none" stroke="#06b6d4" stroke-width="2"/>'
        '<rect x="180" y="86" width="40" height="4" rx="2" fill="#06b6d4" opacity="0.5"/>',
    ),
    "Laptops": (
        "#10b981",
        "LAPTOPS",
        '<rect x="110" y="100" width="180" height="110" rx="8" fill="none" stroke="#10b981" stroke-width="4"/>'
        '<rect x="118" y="108" width="164" height="86" rx="4" fill="#10b981" opacity="0.15"/>'
        '<path d="M90 210 L110 210 L290 210 L310 210 L300 220 L100 220 Z" fill="none" stroke="#10b981" stroke-width="3"/>',
    ),
    "Tablets": (
        "#06b6d4",
        "TABLETS",
        '<rect x="130" y="80" width="140" height="180" rx="14" fill="none" stroke="#06b6d4" stroke-width="4"/>'
        '<rect x="140" y="94" width="120" height="148" rx="4" fill="#06b6d4" opacity="0.15"/>'
        '<circle cx="200" cy="250" r="5" fill="#06b6d4" opacity="0.5"/>',
    ),
    "Headphones": (
        "#8b5cf6",
        "HEADPHONES",
        '<path d="M140 180 Q140 110 200 110 Q260 110 260 180" fill="none" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round"/>'
        '<rect x="124" y="170" width="32" height="50" rx="10" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" stroke-width="3"/>'
        '<rect x="244" y="170" width="32" height="50" rx="10" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" stroke-width="3"/>',
    ),
    "Earbuds": (
        "#f43f5e",
        "EARBUDS",
        '<ellipse cx="170" cy="180" rx="28" ry="30" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" stroke-width="3"/>'
        '<ellipse cx="230" cy="180" rx="28" ry="30" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" stroke-width="3"/>'
        '<circle cx="170" cy="178" r="8" fill="#f43f5e" opacity="0.5"/>'
        '<circle cx="230" cy="178" r="8" fill="#f43f5e" opacity="0.5"/>',
    ),
    "Watches": (
        "#ec4899",
        "WATCHES",
        '<circle cx="200" cy="175" r="55" fill="none" stroke="#ec4899" stroke-width="4"/>'
        '<circle cx="200" cy="175" r="45" fill="#ec4899" opacity="0.1"/>'
        '<line x1="200" y1="175" x2="200" y2="145" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>'
        '<line x1="200" y1="175" x2="222" y2="185" stroke="#ec4899" stroke-width="2" stroke-linecap="round"/>'
        '<rect x="190" y="108" width="20" height="12" rx="3" fill="none" stroke="#ec4899" stroke-width="2"/>'
        '<rect x="190" y="230" width="20" height="12" rx="3" fill="none" stroke="#ec4899" stroke-width="2"/>',
    ),
    "TVs": (
        "#06b6d4",
        "TELEVISIONS",
        '<rect x="90" y="100" width="220" height="130" rx="8" fill="none" stroke="#06b6d4" stroke-width="4"/>'
        '<rect x="98" y="108" width="204" height="110" rx="4" fill="#06b6d4" opacity="0.12"/>'
        '<line x1="200" y1="230" x2="200" y2="250" stroke="#06b6d4" stroke-width="4"/>'
        '<line x1="160" y1="250" x2="240" y2="250" stroke="#06b6d4" stroke-width="4" stroke-linecap="round"/>',
    ),
    "Cameras": (
        "#f97316",
        "CAMERAS",
        '<rect x="120" y="110" width="160" height="110" rx="10" fill="none" stroke="#f97316" stroke-width="4"/>'
        '<circle cx="200" cy="165" r="35" fill="#f97316" opacity="0.12" stroke="#f97316" stroke-width="3"/>'
        '<circle cx="200" cy="165" r="22" fill="none" stroke="#f97316" stroke-width="2"/>'
        '<circle cx="200" cy="165" r="10" fill="#f97316" opacity="0.3"/>',
    ),
    "Footwear": (
        "#f59e0b",
        "FOOTWEAR",
        '<path d="M110 200 Q110 170 140 160 L260 155 Q290 153 295 170 L300 195 Q302 210 290 215 L120 220 Q110 220 110 200Z" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" stroke-width="3"/>'
        '<circle cx="250" cy="185" r="15" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.3"/>',
    ),
    "Fashion": (
        "#6366f1",
        "FASHION",
        '<path d="M160 120 L200 100 L240 120 L260 140 L240 150 L235 260 L165 260 L160 150 L140 140 Z" fill="#6366f1" opacity="0.12" stroke="#6366f1" stroke-width="3"/>'
        '<path d="M160 120 L200 140 L240 120" fill="none" stroke="#6366f1" stroke-width="2" opacity="0.5"/>',
    ),
    "Kitchen Appliances": (
        "#10b981",
        "APPLIANCES",
        '<rect x="155" y="100" width="90" height="130" rx="10" fill="none" stroke="#10b981" stroke-width="4"/>'
        '<rect x="140" y="230" width="120" height="20" rx="6" fill="none" stroke="#10b981" stroke-width="3"/>'
        '<rect x="175" y="80" width="50" height="20" rx="4" fill="none" stroke="#10b981" stroke-width="2"/>',
    ),
}


def _map_svg_category(category: str, title: str = "") -> str:
    c = (category or "").strip()
    if c in CATEGORY_SVG_THEMES:
        return c
    alias = {
        "Mobile Phones": "Smartphones",
        "Smartwatches": "Watches",
        "Televisions": "TVs",
        "Home Appliances": "Kitchen Appliances",
    }
    if c in alias:
        return alias[c]
    t = (title or "").lower()
    if any(w in t for w in ("phone", "galaxy", "iphone", "pixel", "oneplus", "redmi", "realme", "vivo", "oppo", "xiaomi", "moto", "nothing")):
        return "Smartphones"
    if any(w in t for w in ("laptop", "macbook", "thinkpad", "vivobook", "zenbook", "pavilion", "victus", "legion", "inspiron")):
        return "Laptops"
    if any(w in t for w in ("airpods", "earbuds", "buds", "airdopes", "tws")):
        return "Earbuds"
    if any(w in t for w in ("headphone", "rockerz", "wh-", "quietcomfort", "over-ear", "on-ear")):
        return "Headphones"
    if any(w in t for w in ("watch", "smartwatch", "colorfit", "band")):
        return "Watches"
    if any(w in t for w in ("tv", "television", "bravia", "qled", "oled")):
        return "TVs"
    if any(w in t for w in ("camera", "mirrorless", "dslr", "gopro", "eos")):
        return "Cameras"
    if any(w in t for w in ("ipad", "tablet", "galaxy tab", "tab ")):
        return "Tablets"
    if any(w in t for w in ("shoe", "sneaker", "running", "boot", "sandal")):
        return "Footwear"
    if any(w in t for w in ("shirt", "jeans", "polo", "t-shirt", "jacket", "kurta", "dress", "backpack")):
        return "Fashion"
    if any(w in t for w in ("mixer", "grinder", "fryer", "kettle", "refrigerator", "purifier", "washing", "fridge", "aquaguard")):
        return "Kitchen Appliances"
    return "Smartphones"


def resolve_product_image(title: str = "", brand: str = "", category: str = "", current_image: str = "") -> str:
    """
    Ensures a product always has a valid, working image URL.
    1. Preserves valid external/local image URLs (excluding placehold.co and product-placeholder.svg).
    2. Checks the database for a closely matching product with a valid image_url.
    3. Generates a matching local SVG in frontend/public/products/<slug>.svg if needed.
    """
    import os
    import re
    from html import escape

    img = (current_image or "").strip()
    if img and "placehold.co" not in img and "product-placeholder.svg" not in img:
        return img

    clean_title = (title or "").strip()
    stopwords = {"for", "with", "the", "and", "new", "buy", "online", "price", "india", "gb", "tb", "ram", "5g", "4g"}
    title_words = [
        w.lower() for w in re.sub(r"[^\w\s]", " ", clean_title).split()
        if len(w) > 2 and w.lower() not in stopwords
    ]

    if title_words:
        candidates = (
            Product.objects.exclude(image_url="")
            .exclude(image_url__icontains="placehold.co")
            .exclude(image_url__icontains="product-placeholder")
        )
        if brand and brand.lower() != "unknown":
            brand_cands = list(candidates.filter(brand__iexact=brand)[:50])
        else:
            brand_cands = []
        pool = brand_cands if brand_cands else list(candidates[:100])

        best_img = ""
        best_score = 0
        for p in pool:
            p_lower = (p.title or "").lower()
            score = sum(1 for w in title_words if w in p_lower)
            if score > best_score:
                best_score = score
                best_img = p.image_url

        if best_img and best_score >= max(2, min(3, len(title_words))):
            return best_img

    slug = re.sub(r"[^a-z0-9]+", "-", clean_title.lower()).strip("-")[:60] or "analyzed-product"
    rel_path = f"/products/{slug}.svg"

    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "products"))
        if os.path.isdir(base_dir):
            svg_path = os.path.join(base_dir, f"{slug}.svg")
            if not os.path.exists(svg_path):
                theme_key = _map_svg_category(category, clean_title)
                color, badge_label, icon_svg = CATEGORY_SVG_THEMES.get(theme_key, CATEGORY_SVG_THEMES["Smartphones"])
                brand_text = escape(((brand if brand and brand.lower() != "unknown" else (clean_title.split()[0] if clean_title else "DEALLENS"))).upper()[:18])
                short_title = escape(" ".join(clean_title.split()[:4])[:28] or "Analyzed Product")
                svg_id = re.sub(r"[^A-Za-z0-9]", "_", theme_key)
                svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" width="400" height="350">
  <defs>
    <linearGradient id="bg_{svg_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="glow_{svg_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{color};stop-opacity:0.08"/>
      <stop offset="100%" style="stop-color:{color};stop-opacity:0.02"/>
    </linearGradient>
    <filter id="shadow_{svg_id}">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="{color}" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect width="400" height="350" rx="12" fill="url(#bg_{svg_id})"/>
  <rect width="400" height="350" rx="12" fill="url(#glow_{svg_id})"/>
  <g filter="url(#shadow_{svg_id})">
    {icon_svg}
  </g>
  <text x="200" y="50" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="{color}" letter-spacing="3" opacity="0.9">{brand_text}</text>
  <text x="200" y="300" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#94a3b8" opacity="0.8">{short_title}</text>
  <rect x="140" y="318" width="120" height="20" rx="10" fill="{color}" opacity="0.1"/>
  <text x="200" y="332" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="{color}" opacity="0.7">{badge_label}</text>
  <text x="200" y="22" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="400" fill="#475569" opacity="0.4">DEALLENS</text>
</svg>'''
                with open(svg_path, "w", encoding="utf-8") as fh:
                    fh.write(svg_content)
    except Exception:
        pass

    return rel_path


def estimate_fallback_price(title: str = "", brand: str = "", category: str = "") -> float:
    """Estimates a realistic benchmark price from similar DB products or category defaults."""
    qs = ProductOffer.objects.filter(current_price__gt=0, in_stock=True).select_related("product")
    if brand and brand.lower() != "unknown" and category and category != "Other":
        brand_cat = qs.filter(product__brand__iexact=brand, product__category__iexact=category)
        if brand_cat.exists():
            avg_p = sum(float(o.current_price) for o in brand_cat[:10]) / min(10, brand_cat.count())
            return round_to_retail_price(avg_p)
    if category and category in CATEGORY_PRICE_DEFAULTS:
        base = CATEGORY_PRICE_DEFAULTS[category]
    else:
        mapped = _map_svg_category(category, title)
        base = CATEGORY_PRICE_DEFAULTS.get(mapped, 14999.0)
    seed = sum(ord(c) for c in (title or "Product"))
    variation = 1.0 + (((seed % 21) - 10) * 0.015)
    return round_to_retail_price(base * variation)


def filter_comparison_to_selective_platforms(
    comparison: dict,
    category: str = "",
    title: str = "",
    source_platform: str = "",
) -> dict:
    """
    Filters a ComparisonEngine result so only the 3-4 realistic platforms for this
    product/category remain active, while all other checked marketplaces are marked
    unavailable.
    """
    if not isinstance(comparison, dict):
        return comparison

    from .comparison_engine import ALL_PLATFORMS, _unavailable_listing

    allowed = get_category_platforms(category, title=title, source_platform=source_platform)
    allowed_lower = {p.lower() for p in allowed}

    raw_listings = comparison.get("listings") or []
    valid_raw = [
        dict(l)
        for l in raw_listings
        if l.get("data_source") != "unavailable" and (l.get("price") or 0) > 0
    ]

    # Always preserve real verified/live listings up to 4 platforms
    verified_listings = [
        l for l in valid_raw
        if l.get("data_source") in ("live", "verified") or l.get("is_source")
    ]
    if len(verified_listings) >= 3:
        active_listings = verified_listings[:4]
    else:
        seen_plats = {(l.get("platform") or "").lower() for l in verified_listings}
        active_listings = list(verified_listings)
        for l in valid_raw:
            plat_l = (l.get("platform") or "").lower()
            if plat_l not in seen_plats and plat_l in allowed_lower and len(active_listings) < 4:
                seen_plats.add(plat_l)
                active_listings.append(l)

    if not active_listings:
        active_listings = valid_raw[:4]

    active_listings.sort(key=lambda x: x["price"] if x.get("price") and x["price"] > 0 else float("inf"))
    prices = [l["price"] for l in active_listings if l.get("price") and l["price"] > 0]
    best_price = min(prices) if prices else 0
    highest_price = max(prices) if prices else 0

    rated = [l for l in active_listings if l.get("rating") is not None]
    best_rating_val = max((r["rating"] for r in rated), default=None)
    best_rating_listing = max(rated, key=lambda x: x["rating"]) if rated else None

    deliverable = [l for l in active_listings if l.get("delivery_days") and l["delivery_days"] > 0]
    fastest_days = min((d["delivery_days"] for d in deliverable), default=None)
    fastest_delivery = min(deliverable, key=lambda x: x["delivery_days"]) if deliverable else None

    for l in active_listings:
        l["is_cheapest"] = (l.get("price") == best_price and best_price > 0)
        l["savings_vs_this"] = round(l["price"] - best_price, 2) if (best_price > 0 and l.get("price", 0) > 0) else 0
        l["is_best_rated"] = (best_rating_val is not None and l.get("rating") == best_rating_val)
        l["fastest_delivery"] = (fastest_days is not None and l.get("delivery_days") == fastest_days)

    present = {l.get("platform") for l in active_listings if l.get("platform")}
    all_listings = list(active_listings)
    unavailable_platforms = []
    for name in ALL_PLATFORMS:
        if name not in present:
            all_listings.append(_unavailable_listing(name))
            unavailable_platforms.append(name)

    return {
        **comparison,
        "matches_found": max(0, len(active_listings) - 1),
        "listings": all_listings,
        "available_platforms": [l.get("platform") for l in active_listings if l.get("platform")],
        "unavailable_platforms": unavailable_platforms,
        "best_price": best_price,
        "highest_price": highest_price,
        "price_range": round(highest_price - best_price, 2) if highest_price > best_price else 0,
        "best_rating": {
            "platform": best_rating_listing["platform"],
            "rating": best_rating_listing["rating"],
        } if best_rating_listing else None,
        "fastest_delivery": {
            "platform": fastest_delivery["platform"],
            "days": fastest_delivery["delivery_days"],
        } if fastest_delivery else None,
    }


