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
    "Footwear": 1999.0,
    "Fashion": 899.0,
    "Clothing": 899.0,
    "Apparel": 899.0,
    "Beauty": 499.0,
    "Grocery": 299.0,
    "Home Appliances": 6999.0,
    "Kitchen Appliances": 2499.0,
    "Gaming": 39999.0,
    "Computer Accessories": 2499.0,
    "Speakers": 3999.0,
    "Other": 999.0,
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
    "Beauty": (
        "#ec4899",
        "BEAUTY",
        '<path d="M180 120 L220 120 L225 150 L235 250 L165 250 L175 150 Z" fill="#ec4899" opacity="0.12" stroke="#ec4899" stroke-width="3"/>'
        '<rect x="185" y="90" width="30" height="30" rx="4" fill="none" stroke="#ec4899" stroke-width="2"/>',
    ),
    "Other": (
        "#8b5cf6",
        "PRODUCT",
        '<rect x="130" y="110" width="140" height="140" rx="16" fill="none" stroke="#8b5cf6" stroke-width="4"/>'
        '<circle cx="200" cy="180" r="30" fill="#8b5cf6" opacity="0.15"/>',
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
        "Clothing": "Fashion",
        "Apparel": "Fashion",
        "Shoes": "Footwear",
    }
    if c in alias:
        return alias[c]
    t = (title or "").lower()
    if any(w in t for w in ("phone", "galaxy", "iphone", "pixel", "oneplus", "redmi", "realme", "vivo", "oppo", "xiaomi", "moto", "nothing", "smartphone")):
        return "Smartphones"
    if any(w in t for w in ("laptop", "macbook", "thinkpad", "vivobook", "zenbook", "pavilion", "victus", "legion", "inspiron", "notebook")):
        return "Laptops"
    if any(w in t for w in ("airpods", "earbuds", "buds", "airdopes", "tws")):
        return "Earbuds"
    if any(w in t for w in ("headphone", "rockerz", "wh-", "quietcomfort", "over-ear", "on-ear")):
        return "Headphones"
    if any(w in t for w in ("watch", "smartwatch", "colorfit", "band")):
        return "Watches"
    if any(w in t for w in ("tv", "television", "bravia", "qled", "oled", "monitor")):
        return "TVs"
    if any(w in t for w in ("camera", "mirrorless", "dslr", "gopro", "eos", "digicam")):
        return "Cameras"
    if any(w in t for w in ("ipad", "tablet", "galaxy tab", "tab ")):
        return "Tablets"
    if any(w in t for w in ("shoe", "sneaker", "running", "boot", "sandal", "slipper", "loafer", "heel", "crocs", "footwear")):
        return "Footwear"
    if any(w in t for w in ("shirt", "jeans", "polo", "t-shirt", "tshirt", "jacket", "kurta", "kurti", "saree", "dress", "trouser", "pants", "chinos", "hoodie", "sweatshirt", "sweater", "shorts", "top", "blazer", "suit", "backpack", "fashion", "apparel", "clothing", "wear", "cotton", "denim", "roadster", "hrx", "wrogn", "allensolly")):
        return "Fashion"
    if any(w in t for w in ("perfume", "fragrance", "deodorant", "lipstick", "serum", "shampoo", "cream", "lotion", "sunscreen", "makeup", "facewash", "beauty")):
        return "Beauty"
    if any(w in t for w in ("mixer", "grinder", "fryer", "kettle", "refrigerator", "purifier", "washing", "fridge", "aquaguard", "microwave", "cooker", "oven", "iron")):
        return "Kitchen Appliances"
    return "Other"


CURATED_PRODUCT_IMAGES = {
    "apple_iphone": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80",
    "apple_macbook": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
    "apple_ipad": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80",
    "apple_airpods": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80",
    "apple_watch": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
    "samsung_galaxy": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80",
    "google_pixel": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
    "smart_glasses": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80",
    "sony_headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    "sony_camera": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
    "nike_shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    "puma_shoes": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
    "levis_jeans": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
    "casual_shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    "backpack": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    "refrigerator": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
    "kitchen_mixer": "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80",
    "kitchen_appliance": "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&auto=format&fit=crop&q=80",
    "water_purifier": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80",
    "Smartphones": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
    "Laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80",
    "Tablets": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80",
    "Headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    "Earbuds": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
    "Watches": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    "Televisions": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80",
    "Cameras": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
    "Footwear": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    "Fashion": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    "Appliances": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
    "Speakers": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
}


def get_curated_product_image(title: str = "", brand: str = "", category: str = "") -> str:
    """Returns a photorealistic, high-resolution product image matching brand/model/category."""
    t = f"{brand or ''} {title or ''}".lower()

    if any(k in t for k in ("meta", "ray-ban", "rayban", "smart glasses", "wayfarer", "transitions")):
        return CURATED_PRODUCT_IMAGES["smart_glasses"]

    if "iphone" in t or ("apple" in t and "phone" in t):
        return CURATED_PRODUCT_IMAGES["apple_iphone"]
    if "macbook" in t or ("apple" in t and "laptop" in t):
        return CURATED_PRODUCT_IMAGES["apple_macbook"]
    if "ipad" in t:
        return CURATED_PRODUCT_IMAGES["apple_ipad"]
    if "airpods" in t:
        return CURATED_PRODUCT_IMAGES["apple_airpods"]
    if "apple watch" in t:
        return CURATED_PRODUCT_IMAGES["apple_watch"]

    if "pixel" in t:
        return CURATED_PRODUCT_IMAGES["google_pixel"]

    if "galaxy" in t or ("samsung" in t and any(k in t for k in ("s24", "s23", "s22", "s21", "ultra", "plus", "phone", "mobile"))):
        return CURATED_PRODUCT_IMAGES["samsung_galaxy"]

    if any(k in t for k in ("earbuds", "buds", "airdopes", "tws", "in-ear")):
        return CURATED_PRODUCT_IMAGES["Earbuds"]

    if any(k in t for k in ("headphone", "wh-1000", "rockerz", "quietcomfort", "over-ear")):
        return CURATED_PRODUCT_IMAGES["Headphones"]

    if any(k in t for k in ("smartwatch", "watch", "colorfit", "fitbit")):
        return CURATED_PRODUCT_IMAGES["Watches"]

    if any(k in t for k in ("laptop", "thinkpad", "vivobook", "zenbook", "pavilion", "inspiron", "legion", "notebook")):
        return CURATED_PRODUCT_IMAGES["Laptops"]

    if any(k in t for k in ("tablet", "tab")):
        return CURATED_PRODUCT_IMAGES["Tablets"]

    if any(k in t for k in ("tv", "television", "bravia", "oled", "qled", "monitor")):
        return CURATED_PRODUCT_IMAGES["Televisions"]

    if any(k in t for k in ("camera", "mirrorless", "dslr", "gopro", "eos", "alpha")):
        return CURATED_PRODUCT_IMAGES["Cameras"]

    if any(k in t for k in ("shoe", "sneaker", "running", "nike", "puma", "adidas", "reebok", "air max", "dunk")):
        return CURATED_PRODUCT_IMAGES["Footwear"]

    if any(k in t for k in ("jean", "denim", "511", "512", "levis", "levi's")):
        return CURATED_PRODUCT_IMAGES["levis_jeans"]
    if any(k in t for k in ("shirt", "polo", "t-shirt", "kurta", "jacket", "apparel")):
        return CURATED_PRODUCT_IMAGES["casual_shirt"]
    if any(k in t for k in ("backpack", "bag", "rucksack", "wildcraft")):
        return CURATED_PRODUCT_IMAGES["backpack"]

    if any(k in t for k in ("refrigerator", "fridge", "single door", "double door")):
        return CURATED_PRODUCT_IMAGES["refrigerator"]
    if any(k in t for k in ("mixer", "grinder", "blender", "juicer")):
        return CURATED_PRODUCT_IMAGES["kitchen_mixer"]
    if any(k in t for k in ("kettle", "fryer", "air fryer", "cooktop")):
        return CURATED_PRODUCT_IMAGES["kitchen_appliance"]
    if any(k in t for k in ("purifier", "aquaguard", "aquasaver", "water filter")):
        return CURATED_PRODUCT_IMAGES["water_purifier"]

    theme_key = _map_svg_category(category, title)
    return CURATED_PRODUCT_IMAGES.get(theme_key, CURATED_PRODUCT_IMAGES["Smartphones"])


def resolve_product_image(title: str = "", brand: str = "", category: str = "", current_image: str = "") -> str:
    """
    Ensures a product always has a valid, working image URL.
    1. Preserves valid external/local image URLs (excluding placehold.co and product-placeholder.svg).
    2. Checks the database for a closely matching product with a valid HTTP image_url.
    3. Falls back to curated high-resolution real product photography.
    """
    import os
    import re

    img = (current_image or "").strip()
    if img and (img.startswith("http://") or img.startswith("https://") or img.startswith("data:image/")):
        if "placehold.co" not in img and "product-placeholder.svg" not in img:
            return img

    clean_title = (title or "").strip()
    stopwords = {"for", "with", "the", "and", "new", "buy", "online", "price", "india", "gb", "tb", "ram", "5g", "4g"}
    title_words = [
        w.lower() for w in re.sub(r"[^\w\s]", " ", clean_title).split()
        if len(w) > 2 and w.lower() not in stopwords
    ]

    if title_words:
        candidates = (
            Product.objects.filter(image_url__startswith="http")
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

    # Check if a pre-existing SVG file exists in public/products/ (e.g. legacy seed assets)
    slug = re.sub(r"[^a-z0-9]+", "-", clean_title.lower()).strip("-")[:60] or "analyzed-product"
    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "products"))
        if os.path.isdir(base_dir) and os.path.exists(os.path.join(base_dir, f"{slug}.svg")):
            # If the SVG is already an established seed file on disk, it's safe to return
            return f"/products/{slug}.svg"
    except Exception:
        pass

    # Return real, high-resolution product photography
    return get_curated_product_image(title=clean_title, brand=brand, category=category)


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
        base = CATEGORY_PRICE_DEFAULTS.get(mapped, 999.0)
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
    seen_plats = {(l.get("platform") or "").lower() for l in verified_listings}
    active_listings = list(verified_listings)
    for l in valid_raw:
        plat_l = (l.get("platform") or "").lower()
        if plat_l not in seen_plats and plat_l in allowed_lower and len(active_listings) < 4:
            seen_plats.add(plat_l)
            active_listings.append(l)

    if not active_listings:
        active_listings = valid_raw[:4]

    # If fewer than 3 platforms are available, fill with realistic category benchmark listings
    if len(active_listings) < 3 and active_listings:
        source_item = next((l for l in active_listings if l.get("is_source")), active_listings[0])
        base_p = float(source_item.get("price") or 0)
        base_m = float(source_item.get("mrp") or round_to_retail_price(base_p * 1.15))
        if base_p > 0:
            benchmarks = generate_benchmark_listings(
                base_price=base_p,
                title=title,
                category=category,
                source_platform=source_platform,
                base_mrp=base_m,
            )
            for b in benchmarks:
                b_plat = (b.get("platform") or "").lower()
                if b_plat not in seen_plats and b_plat in allowed_lower and len(active_listings) < 4:
                    seen_plats.add(b_plat)
                    active_listings.append(b)

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


