import re
from difflib import SequenceMatcher
from django.db.models import Q
from products.models import Product, ProductOffer


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def similarity(a: str, b: str) -> float:
    a_norm = normalize_text(a)
    b_norm = normalize_text(b)
    if a_norm == b_norm:
        return 1.0
    return SequenceMatcher(None, a_norm, b_norm).ratio()


def extract_key_attributes(title: str, specs: dict = None) -> dict:
    """Extract key product attributes from title and specs for matching."""
    title_lower = title.lower()
    attrs = {}

    storage_matches = [
        (m.group(1), m.group(2), m.end())
        for m in re.finditer(r'(\d+)\s*(gb|tb)\b', title_lower)
    ]
    # A "GB" token followed by RAM/LPDDR is memory, not storage — exclude it.
    # From the rest, take the LAST (titles list RAM before storage:
    # "8GB, 256GB" → storage is 256GB, not 8GB).
    storage_pool = [
        (val, unit) for val, unit, end in storage_matches
        if not re.match(r'\s*(ram|lpddr)', title_lower[end:end + 6])
    ] or [(val, unit) for val, unit, _ in storage_matches]
    if storage_pool:
        val, unit = storage_pool[-1]
        attrs["storage"] = f"{val}{unit.upper()}"

    ram_match = re.search(r'(\d+)\s*gb\s*(ram|lpddr)', title_lower)
    if ram_match:
        attrs["ram"] = f"{ram_match.group(1)}GB"

    # Appliance capacity in litres ("253L", "183 L"). Used only for
    # variant separation (never scored), so different capacities never
    # match while missing values stay neutral.
    cap_match = re.search(r'(\d+)\s*l\b', title_lower)
    if cap_match:
        attrs["capacity_l"] = cap_match.group(1)

    color_words = [
        "black", "white", "blue", "navy", "red", "green", "silver", "gold",
        "midnight", "space gray", "space grey", "graphite", "titanium",
        "purple", "pink", "coral", "starlight", "natural", "blue",
        "dark blue", "light blue", "orange", "yellow",
    ]
    for color in color_words:
        if color in title_lower:
            attrs["color"] = color.title()
            break

    size_match = re.search(r'(\d+(?:\.\d+)?)\s*(inch|"|\'|\')', title_lower)
    if size_match:
        attrs["screen_size"] = size_match.group(1)

    model_patterns = [
        r'(galaxy\s*s\d+(?:\s*ultra|\s*\+|\s*plus|\s*fe)?)',
        r'(iphone\s*\d+(?:\s*(?:pro|pro\s*max|plus|mini))?)',
        r'(ipad\s*(?:air|pro|mini)?(?:\s*(?:m\d+|\d+)))',
        r'(macbook\s*(?:air|pro)(?:\s*(?:m\d+|\d+))?)',
        r'(wh-\d+\w*)',
        r'(airdopes?\s*\d+)',
        r'(galaxy\s*tab\s*\w+)',
        r'(oneplus\s*\d+(?:\s*(?:pro|t|\+))?)',
    ]
    for pattern in model_patterns:
        m = re.search(pattern, title_lower)
        if m:
            attrs["model_key"] = m.group(1).strip()
            break

    if specs:
        for key, val in specs.items():
            key_lower = key.lower()
            val_lower = str(val).lower()
            if "storage" in key_lower or "internal" in key_lower:
                if "storage" not in attrs:
                    s = re.search(r'(\d+)\s*(gb|tb)', val_lower)
                    if s:
                        attrs["storage"] = f"{s.group(1)}{s.group(2).upper()}"
            if "ram" in key_lower:
                if "ram" not in attrs:
                    r = re.search(r'(\d+)\s*gb', val_lower)
                    if r:
                        attrs["ram"] = f"{r.group(1)}GB"
            if "color" in key_lower or "colour" in key_lower:
                if "color" not in attrs:
                    attrs["color"] = val.strip().title()

    return attrs


def compute_match_score(attrs1: dict, attrs2: dict) -> float:
    """Compute match score between two products based on attributes. Returns 0-100."""
    score = 0
    total_weight = 0

    if "model_key" in attrs1 and "model_key" in attrs2:
        total_weight += 35
        model_sim = similarity(attrs1["model_key"], attrs2["model_key"])
        if model_sim >= 0.8:
            score += 35
        elif model_sim >= 0.6:
            score += 25
        elif model_sim >= 0.4:
            score += 15
    elif "model_key" not in attrs1 and "model_key" not in attrs2:
        total_weight += 35
        score += 15

    if "storage" in attrs1 and "storage" in attrs2:
        total_weight += 25
        if attrs1["storage"].lower() == attrs2["storage"].lower():
            score += 25
        else:
            score += 0
    elif "storage" not in attrs1 and "storage" not in attrs2:
        total_weight += 25
        score += 15

    if "ram" in attrs1 and "ram" in attrs2:
        total_weight += 15
        if attrs1["ram"] == attrs2["ram"]:
            score += 15
    elif "ram" not in attrs1 and "ram" not in attrs2:
        total_weight += 15
        score += 10

    if "color" in attrs1 and "color" in attrs2:
        total_weight += 15
        color_sim = similarity(attrs1["color"], attrs2["color"])
        score += int(15 * color_sim)
    elif "color" not in attrs1 and "color" not in attrs2:
        total_weight += 15
        score += 10

    if "screen_size" in attrs1 and "screen_size" in attrs2:
        total_weight += 10
        try:
            if abs(float(attrs1["screen_size"]) - float(attrs2["screen_size"])) < 0.2:
                score += 10
        except (ValueError, TypeError):
            pass
    elif "screen_size" not in attrs1 and "screen_size" not in attrs2:
        total_weight += 10
        score += 5

    if total_weight == 0:
        return 0

    return round((score / total_weight) * 100, 1)


def _title_word_overlap(title_a: str, title_b: str) -> float:
    """Compute the fraction of significant words from title_a that appear in title_b."""
    stopwords = {
        "for", "with", "the", "and", "new", "original", "genuine", "combo",
        "pack", "set", "inch", "cm", "mm", "in", "of", "a", "an", "is",
        "buy", "online", "price", "india", "black", "white", "blue",
        # Generic tier/radio tokens carry no product identity on their own
        # ("Pro" alone must not link an iPhone to AirPods).
        "pro", "max", "plus", "ultra", "mini", "fe", "neo",
        "5g", "4g", "lte", "wifi", "bluetooth",
    }
    words_a = {
        w for w in normalize_text(title_a).split()
        if len(w) > 2 and w not in stopwords
    }
    words_b = {
        w for w in normalize_text(title_b).split()
        if len(w) > 2 and w not in stopwords
    }
    if not words_a:
        return 0.0
    matched = words_a & words_b
    return len(matched) / len(words_a)


#: Canonical platform slots. The comparison always renders one row per
#: platform; platforms without a verified listing get an explicit
#: "unavailable" placeholder — never a fabricated price or URL.
ALL_PLATFORMS = [
    "Amazon",
    "Flipkart",
    "Myntra",
    "AJIO",
    "Meesho",
    "Croma",
    "Reliance Digital",
    "Tata CLiQ",
]


def _unavailable_listing(platform: str) -> dict:
    return {
        "platform": platform,
        "price": 0,
        "mrp": 0,
        "rating": None,
        "review_count": 0,
        "availability": "Unavailable",
        "source_url": "",
        "data_source": "unavailable",
        "in_stock": False,
        "is_source": False,
        "match_confidence": 0,
        "delivery_days": 0,
        "delivery_time": "",
        "coupon_code": None,
        "coupon_discount": 0,
        "is_cheapest": False,
        "is_best_rated": False,
        "fastest_delivery": False,
        "savings_vs_this": 0,
    }


class ComparisonEngine:
    """Finds comparable product listings across platforms and generates comparison data."""

    MATCH_THRESHOLD = 55.0

    def find_comparisons(self, normalized_product: dict) -> dict:
        title = normalized_product.get("title", "")
        brand = normalized_product.get("brand", "")
        source_platform = normalized_product.get("platform", "")
        specs = normalized_product.get("specifications", {})

        if not title:
            return {"matches_found": 0, "listings": [], "best_price": 0, "price_range": 0}

        source_attrs = extract_key_attributes(title, specs)

        q = Q()
        if brand:
            q |= Q(brand__iexact=brand)
        q |= Q(title__icontains=brand[:20] if brand else title[:20])

        candidates = Product.objects.filter(q).prefetch_related("offers").distinct()[:100]

        matching_products = []
        for product in candidates:
            product_attrs = extract_key_attributes(product.title, product.specifications)
            # Variant separation: when both sides state storage and it differs
            # (e.g. 256GB vs 128GB), they are different variants — never match.
            if (
                source_attrs.get("storage")
                and product_attrs.get("storage")
                and source_attrs["storage"].lower() != product_attrs["storage"].lower()
            ):
                continue
            # Same for appliance capacity (e.g. 253L vs 183L refrigerators).
            if (
                source_attrs.get("capacity_l")
                and product_attrs.get("capacity_l")
                and source_attrs["capacity_l"] != product_attrs["capacity_l"]
            ):
                continue
            # Fix 1 gate: a non-identical candidate needs positive evidence —
            # model_key similarity >= 0.6 OR title word overlap >= 0.3.
            # Missing attributes are never evidence, so denominator shrinkage
            # alone can no longer pass a candidate.
            word_overlap = _title_word_overlap(title, product.title)
            if normalize_text(title) != normalize_text(product.title):
                model_sim = 0.0
                if source_attrs.get("model_key") and product_attrs.get("model_key"):
                    model_sim = similarity(
                        source_attrs["model_key"], product_attrs["model_key"])
                if model_sim < 0.6 and word_overlap < 0.3:
                    continue
            score = compute_match_score(source_attrs, product_attrs)

            if score >= self.MATCH_THRESHOLD:
                matching_products.append((product, score))
                continue

            combined = score * 0.6 + word_overlap * 100 * 0.4
            if combined >= self.MATCH_THRESHOLD:
                matching_products.append((product, round(combined, 1)))

        matching_products.sort(key=lambda x: x[1], reverse=True)

        seen_offer_ids = set()
        listings = []

        source_listing = self._build_source_listing(
            normalized_product, source_platform, matching_products
        )
        listings.append(source_listing)

        for product, match_score in matching_products:
            for offer in product.offers.filter(in_stock=True).order_by("current_price"):
                if offer.store_name == source_platform:
                    continue
                if offer.id in seen_offer_ids:
                    continue
                seen_offer_ids.add(offer.id)
                listings.append(self._build_db_listing(offer, match_score))

        listings = self._deduplicate_platforms(listings)
        listings = self._compute_flags(listings)

        return self._build_response(listings, matching_products)

    def _deduplicate_platforms(self, listings: list) -> list:
        """Keep only the best offer per platform. Max 8 platforms."""
        best_per_platform = {}
        for listing in listings:
            platform = listing.get("platform", "")
            if not platform:
                continue
            is_source = listing.get("is_source", False)
            price = listing.get("price", 0) or float("inf")

            if platform not in best_per_platform:
                best_per_platform[platform] = listing
            elif is_source:
                best_per_platform[platform] = listing
            elif price < (best_per_platform[platform].get("price", 0) or float("inf")):
                best_per_platform[platform] = listing

        result = list(best_per_platform.values())
        result.sort(key=lambda x: (not x.get("is_source", False), x.get("price", 0) or float("inf")))
        return result[:8]

    def _build_source_listing(
        self, normalized_product: dict, source_platform: str, matching_products: list
    ) -> dict:
        best_score = matching_products[0][1] if matching_products else 0
        return {
            "platform": source_platform,
            "price": normalized_product.get("price", 0),
            "mrp": normalized_product.get("mrp", 0),
            "rating": normalized_product.get("rating"),
            "review_count": normalized_product.get("review_count", 0),
            "availability": normalized_product.get("availability", "Unknown"),
            "source_url": normalized_product.get("source_url", ""),
            "data_source": normalized_product.get("data_source", "live"),
            "in_stock": normalized_product.get("availability", "Unknown").lower() != "out of stock",
            "is_source": True,
            "match_confidence": round(best_score, 1),
            "delivery_days": normalized_product.get("delivery_days", 3),
            "delivery_time": normalized_product.get("delivery_time", ""),
            "coupon_code": normalized_product.get("coupon_code") or None,
            "coupon_discount": float(normalized_product.get("coupon_discount", 0) or 0),
            "coupon_valid": True,
            "is_cheapest": False,
            "is_best_rated": False,
            "fastest_delivery": False,
            "savings_vs_this": 0,
        }

    def _build_db_listing(self, offer: ProductOffer, match_score: float) -> dict:
        return {
            "platform": offer.store_name,
            "price": float(offer.current_price),
            "mrp": float(offer.original_price) if offer.original_price else 0,
            "rating": float(offer.rating) if offer.rating else None,
            "review_count": offer.reviews_count,
            "availability": "In Stock" if offer.in_stock else "Out of Stock",
            "source_url": offer.product_url,
            "data_source": offer.data_source or "database",
            "in_stock": offer.in_stock,
            "is_source": False,
            "match_confidence": match_score,
            "delivery_days": offer.delivery_days,
            "delivery_time": offer.delivery_time or "",
            "coupon_code": offer.coupon_code or None,
            "coupon_discount": float(offer.coupon_discount) if offer.coupon_discount else 0,
            "coupon_valid": offer.coupon_is_valid(),
            "is_cheapest": False,
            "is_best_rated": False,
            "fastest_delivery": False,
            "savings_vs_this": 0,
        }

    def _compute_flags(self, listings: list) -> list:
        if not listings:
            return listings

        prices = [l["price"] for l in listings if l["price"] and l["price"] > 0]
        best_price = min(prices) if prices else 0

        for l in listings:
            l["is_cheapest"] = l["price"] == best_price and l["price"] > 0
            if best_price > 0 and l["price"] and l["price"] > 0:
                l["savings_vs_this"] = round(l["price"] - best_price, 2)
            else:
                l["savings_vs_this"] = 0

        rated = [l for l in listings if l.get("rating") is not None]
        if rated:
            best_rating_val = max(r["rating"] for r in rated)
            for l in listings:
                l["is_best_rated"] = l.get("rating") == best_rating_val

        deliverable = [l for l in listings if l.get("delivery_days") and l["delivery_days"] > 0]
        if deliverable:
            fastest_days = min(d["delivery_days"] for d in deliverable)
            for l in listings:
                l["fastest_delivery"] = (
                    l.get("delivery_days") == fastest_days and l["delivery_days"] > 0
                )

        return listings

    def _build_response(self, listings: list, matching_products: list) -> dict:
        prices = [l["price"] for l in listings if l["price"] and l["price"] > 0]
        best_price = min(prices) if prices else 0
        highest_price = max(prices) if prices else 0

        rated = [l for l in listings if l.get("rating") is not None]
        best_rating_listing = (
            max(rated, key=lambda x: x["rating"]) if rated else None
        )

        deliverable = [l for l in listings if l.get("delivery_days") and l["delivery_days"] > 0]
        fastest_delivery = (
            min(deliverable, key=lambda x: x["delivery_days"]) if deliverable else None
        )

        sorted_listings = sorted(
            listings,
            key=lambda x: x["price"] if x["price"] and x["price"] > 0 else float("inf"),
        )

        best_product_title = (
            matching_products[0][0].title if matching_products else ""
        )
        best_score = matching_products[0][1] if matching_products else 0

        # Verified listings first; then one explicit "unavailable" slot per
        # missing platform so the UI always shows all 8 platforms.
        present = {l.get("platform") for l in sorted_listings}
        all_listings = list(sorted_listings)
        for name in ALL_PLATFORMS:
            if name not in present:
                all_listings.append(_unavailable_listing(name))

        return {
            "matches_found": max(0, len(sorted_listings) - 1),
            "match_confidence": round(best_score, 1),
            "match_product_title": best_product_title,
            "listings": all_listings,
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
