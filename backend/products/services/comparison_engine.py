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
        r'(iphone\s*\d+(?:\s*(?:pro\s*max|pro|plus|mini))?)',
        r'(ipad\s*(?:air|pro|mini)?(?:\s*(?:m\d+|\d+)))',
        r'(macbook\s*(?:air|pro)(?:\s*(?:m\d+|\d+))?)',
        r'(wh-\d+\w*)',
        r'(airdopes?\s*\d+)',
        r'(galaxy\s*tab\s*\w+)',
        r'(oneplus\s*\d+(?:\s*(?:pro|t|\+))?)',
        r'(airpods(?:\s*pro)?(?:\s*(?:max|\d+(?:nd|rd|th)?\s*gen))?)',
        r'(apple\s*watch(?:\s*(?:ultra\s*\d*|series\s*\d+|se))?)',
        r'(galaxy\s*watch\s*\d+(?:\s*(?:classic|pro|ultra))?)',
        r'(pixel\s*\d+(?:\s*(?:pro|a))?)',
        r'(redmi\s*note\s*\d+\w*)',
        r'(realme\s*\d+\w*)',
        r'(poco\s*\w+\d+\w*)',
        r'(nord\s*(?:ce)?\s*\d+\w*)',
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
    """Compute match score between two products based on positive attributes. Returns 0-100."""
    score = 0
    total_weight = 0

    has_m1 = "model_key" in attrs1
    has_m2 = "model_key" in attrs2
    if has_m1 and has_m2:
        total_weight += 40
        m1 = attrs1["model_key"].lower()
        m2 = attrs2["model_key"].lower()
        if m1 == m2:
            score += 40
        else:
            model_sim = similarity(m1, m2)
            if model_sim >= 0.85:
                score += 35
            elif model_sim >= 0.65:
                score += 20
            else:
                return 0.0  # Incompatible distinct models (e.g. iPhone 15 vs 16 or Galaxy S23 vs S24)
    elif has_m1 != has_m2:
        total_weight += 40
        score += 0

    has_s1 = "storage" in attrs1
    has_s2 = "storage" in attrs2
    if has_s1 and has_s2:
        total_weight += 25
        if attrs1["storage"].lower() == attrs2["storage"].lower():
            score += 25
        else:
            score += 0
    elif has_s1 != has_s2:
        total_weight += 20
        score += 0

    has_r1 = "ram" in attrs1
    has_r2 = "ram" in attrs2
    if has_r1 and has_r2:
        total_weight += 15
        if attrs1["ram"].lower() == attrs2["ram"].lower():
            score += 15
        else:
            score += 0
    elif has_r1 != has_r2:
        total_weight += 10
        score += 0

    has_c1 = "color" in attrs1
    has_c2 = "color" in attrs2
    if has_c1 and has_c2:
        total_weight += 10
        color_sim = similarity(attrs1["color"], attrs2["color"])
        score += int(10 * color_sim)

    has_ss1 = "screen_size" in attrs1
    has_ss2 = "screen_size" in attrs2
    if has_ss1 and has_ss2:
        total_weight += 10
        try:
            if abs(float(attrs1["screen_size"]) - float(attrs2["screen_size"])) < 0.2:
                score += 10
        except (ValueError, TypeError):
            pass
    elif has_ss1 != has_ss2:
        total_weight += 10
        score += 0

    if total_weight == 0:
        return 0.0

    return round((score / total_weight) * 100, 1)


def _title_word_overlap(title_a: str, title_b: str, brand: str = "") -> float:
    """Compute the fraction of significant words from title_a that appear in title_b."""
    stopwords = {
        "for", "with", "the", "and", "new", "original", "genuine", "combo",
        "pack", "set", "inch", "cm", "mm", "in", "of", "a", "an", "is",
        "buy", "online", "price", "india", "black", "white", "blue",
        # Generic tier/radio tokens carry no product identity on their own
        "pro", "max", "plus", "ultra", "mini", "fe", "neo",
        "5g", "4g", "lte", "wifi", "bluetooth", "edition", "series",
    }
    if brand:
        stopwords.add(brand.lower().strip())
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

        source_category = (normalized_product.get("category") or "").strip().lower()

        candidates = Product.objects.filter(q).prefetch_related("offers").distinct()[:100]

        matching_products = []
        for product in candidates:
            cand_category = (product.category or "").strip().lower()
            if source_category and cand_category and source_category not in ("other", "") and cand_category not in ("other", ""):
                is_phone_src = any(k in source_category for k in ("phone", "mobile"))
                is_phone_cand = any(k in cand_category for k in ("phone", "mobile"))
                is_audio_src = any(k in source_category for k in ("headphone", "earbud", "audio", "speaker"))
                is_audio_cand = any(k in cand_category for k in ("headphone", "earbud", "audio", "speaker"))
                is_laptop_src = any(k in source_category for k in ("laptop", "notebook", "computer"))
                is_laptop_cand = any(k in cand_category for k in ("laptop", "notebook", "computer"))
                is_watch_src = any(k in source_category for k in ("watch", "wearable"))
                is_watch_cand = any(k in cand_category for k in ("watch", "wearable"))

                if (is_phone_src and not is_phone_cand) or (is_phone_cand and not is_phone_src):
                    continue
                if (is_audio_src and not is_audio_cand) or (is_audio_cand and not is_audio_src):
                    continue
                if (is_laptop_src and not is_laptop_cand) or (is_laptop_cand and not is_laptop_src):
                    continue
                if (is_watch_src and not is_watch_cand) or (is_watch_cand and not is_watch_src):
                    continue

            product_attrs = extract_key_attributes(product.title, product.specifications)

            # Strict model key check: e.g. iphone 15 vs iphone 16 or airpods must NEVER match
            if source_attrs.get("model_key") and product_attrs.get("model_key"):
                if source_attrs["model_key"].lower() != product_attrs["model_key"].lower():
                    continue
            elif source_attrs.get("model_key") and not product_attrs.get("model_key"):
                continue

            # Variant separation: when both sides state storage and it differs, never match
            if (
                source_attrs.get("storage")
                and product_attrs.get("storage")
                and source_attrs["storage"].lower() != product_attrs["storage"].lower()
            ):
                continue
            if (
                source_attrs.get("capacity_l")
                and product_attrs.get("capacity_l")
                and source_attrs["capacity_l"] != product_attrs["capacity_l"]
            ):
                continue

            word_overlap = _title_word_overlap(title, product.title, brand=brand)
            if normalize_text(title) == normalize_text(product.title):
                matching_products.append((product, 100.0))
                continue

            model_sim = 0.0
            if source_attrs.get("model_key") and product_attrs.get("model_key"):
                model_sim = similarity(
                    source_attrs["model_key"], product_attrs["model_key"])
            if model_sim < 0.6 and word_overlap < 0.35:
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

        # Collect offers strictly prioritizing the primary matched product
        if matching_products:
            best_match_product, best_score = matching_products[0]
            for offer in best_match_product.offers.filter(in_stock=True).order_by("current_price"):
                if offer.store_name == source_platform:
                    continue
                seen_offer_ids.add(offer.id)
                listings.append(self._build_db_listing(offer, best_score))

            # Secondary products with matching model_key can contribute missing stores
            for product, match_score in matching_products[1:]:
                prod_m = extract_key_attributes(product.title).get("model_key")
                src_m = source_attrs.get("model_key")
                if src_m and prod_m and src_m.lower() != prod_m.lower():
                    continue
                for offer in product.offers.filter(in_stock=True).order_by("current_price"):
                    if offer.store_name == source_platform or offer.id in seen_offer_ids:
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
            conf = listing.get("match_confidence", 0)

            if platform not in best_per_platform:
                best_per_platform[platform] = listing
            elif is_source:
                best_per_platform[platform] = listing
            else:
                existing = best_per_platform[platform]
                exist_conf = existing.get("match_confidence", 0)
                # Never replace high-confidence match with lower confidence
                if exist_conf - conf > 15:
                    continue
                if price < (existing.get("price", 0) or float("inf")):
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
