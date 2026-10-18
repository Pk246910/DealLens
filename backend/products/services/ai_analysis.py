import random
import hashlib
from decimal import Decimal


CATEGORY_INSIGHTS = {
    "Smartphones": {
        "pros": [
            "Wide cross-marketplace availability with competitive seller offers",
            "Strong resale and trade-in exchange value across major Indian platforms",
            "Full manufacturer warranty and authorized service center coverage",
            "High daily utility with multi-year software and security support",
        ],
        "cons": [
            "Prices fluctuate during festive and bank-partner promotional windows",
            "Fast-charging adapters or protective cases may be sold separately",
            "Storage and RAM variant pricing can differ steeply across sellers",
        ],
        "tips": [
            "Check instant bank card discounts (HDFC, ICICI, SBI) for an extra 5–10% off at checkout",
            "Compare smartphone exchange valuations across Amazon and Flipkart before ordering",
            "Verify No-Cost EMI tenure options to spread the cost without interest",
            "Compare identical RAM/storage variants across at least 3 marketplaces",
        ],
    },
    "Laptops": {
        "pros": [
            "High-value productivity investment with multi-year operational longevity",
            "Manufacturer onsite warranty and authorized support coverage included",
            "Strong configuration value for work, study, and multitasking workloads",
            "Eligible for no-cost EMI and old-laptop exchange bonuses on top stores",
        ],
        "cons": [
            "Significant seller-to-seller price spread across online marketplaces",
            "Extended warranty and accidental damage protection add to total checkout cost",
            "RAM or SSD upgradeability varies by chassis generation",
        ],
        "tips": [
            "Compare across at least 3 marketplaces — laptop prices often differ by ₹2,000–₹6,000",
            "Check for student, corporate, or bank credit card instant cashback offers",
            "Bundle manufacturer extended warranty at purchase time for lower rates",
            "Verify exact processor generation and display panel specs across listings",
        ],
    },
    "Fashion": {
        "pros": [
            "Broad size and color availability across leading fashion marketplaces",
            "Hassle-free 7 to 14-day return and size-exchange policies on top stores",
            "Attractive seasonal markdowns compared to offline retail MRP",
        ],
        "cons": [
            "Fit and sizing tolerances can vary slightly across production batches",
            "Fabric texture and color tone depend on studio lighting in catalog photos",
        ],
        "tips": [
            "Cross-check the brand's garment measurements in inches before selecting a size",
            "Apply platform coupon codes and combo-cart discounts before checkout",
            "Compare prices across Myntra, AJIO, Amazon Fashion, and Flipkart",
            "Read verified buyer reviews with uploaded photos for real-world fit feedback",
        ],
    },
    "Kitchen Appliances": {
        "pros": [
            "High daily household utility with dependable brand warranty backing",
            "Noticeable online discount advantage over brick-and-mortar retail MRP",
            "Doorstep delivery with replacement coverage for transit damage",
        ],
        "cons": [
            "Heavy appliances may carry pin-code specific delivery or installation scheduling",
            "Long-term electricity consumption depends on BEE star efficiency rating",
        ],
        "tips": [
            "Check energy star ratings and wattage specifications for long-term utility savings",
            "Compare free installation and demo inclusions across Amazon, Flipkart, and Croma",
            "Look for festive exchange bonuses when replacing an older kitchen appliance",
            "Apply bank card instant discounts on orders above ₹5,000",
        ],
    },
    "Home Appliances": {
        "pros": [
            "Long operational lifespan backed by official brand compressor/motor warranty",
            "Substantial online markdown compared to offline showroom MRP",
            "Authorized brand installation and pan-India service network support",
            "High energy-efficiency engineering designed for Indian voltage conditions",
        ],
        "cons": [
            "Scheduled delivery and technician installation coordination required after delivery",
            "Exchange value and stabilizer/stand accessories vary by marketplace seller",
        ],
        "tips": [
            "Compare total landed cost including delivery, installation, and old-appliance exchange",
            "Check BEE star ratings — higher star ratings significantly reduce monthly power bills",
            "Use old-appliance exchange offers + bank EMI cashback to save ₹1,500–₹4,000 extra",
            "Inspect package condition at doorstep delivery to qualify for open-box protection",
        ],
    },
    "Beauty": {
        "pros": [
            "100% authentic catalog sourcing from authorized brand distributors",
            "Competitive multi-platform pricing with frequent bundle and coupon deals",
            "High volume of verified customer ratings for skin/hair type compatibility",
        ],
        "cons": [
            "Non-returnable hygiene policy once the outer seal is opened",
            "Batch shelf-life and expiry windows vary by seller inventory",
        ],
        "tips": [
            "Purchase from verified flagship or top-rated marketplace sellers only",
            "Check manufacturing and expiry date details in the product specification tab",
            "Compare value-pack sizes (per-ml cost) across Nykaa, Amazon, and Flipkart",
            "Stack platform beauty coupons at checkout for extra savings",
        ],
    },
    "Grocery": {
        "pros": [
            "Consistent savings below printed MRP on daily household essentials",
            "Convenient doorstep slot delivery with bulk-pack discounts",
            "Freshness-backed replacement guarantee on major grocery platforms",
        ],
        "cons": [
            "Minimum cart value may be required to unlock free shipping",
            "Stock availability and delivery slots depend on local pin code",
        ],
        "tips": [
            "Compare per-kg / per-litre unit pricing rather than pack price alone",
            "Use recurring subscription or super-saver cart tiers for an extra 5–15% off",
            "Bundle non-perishable staples to cross the free-delivery threshold",
        ],
    },
    "Earbuds": {
        "pros": [
            "Compact true-wireless form factor ideal for commuting, calls, and workouts",
            "Strong feature-to-price ratio with fast USB-C charging support",
            "Backed by 1-year manufacturer replacement warranty across authorized stores",
        ],
        "cons": [
            "Real-world battery backup varies when Active Noise Cancellation (ANC) is enabled",
            "In-ear acoustic seal and comfort depend on choosing the right ear-tip size",
        ],
        "tips": [
            "Compare battery runtime with ANC turned on versus ANC turned off",
            "Check verified buyer reviews for microphone call clarity in outdoor traffic",
            "Compare lightning deal prices across Amazon, Flipkart, and Croma",
        ],
    },
    "Headphones": {
        "pros": [
            "Immersive acoustic stage with superior noise isolation for long sessions",
            "Ergonomic over-ear cushioning with multi-hour battery endurance",
            "Official brand warranty with authorized service support",
        ],
        "cons": [
            "Larger travel footprint compared to in-ear TWS earbuds",
            "Codec support and multi-point pairing vary by model tier",
        ],
        "tips": [
            "Compare ANC attenuation and clamping comfort in long-session buyer reviews",
            "Look for bank card instant discounts and festive audio sale events",
            "Verify included carrying case and AUX cable accessories in box contents",
        ],
    },
    "Tablets": {
        "pros": [
            "Versatile large-screen canvas for productivity, reading, and streaming",
            "All-day battery efficiency with lightweight portability",
            "Strong brand ecosystem and official warranty coverage",
        ],
        "cons": [
            "Keyboard folio and active stylus accessories are often sold separately",
            "Base storage tiers cannot always be expanded via microSD",
        ],
        "tips": [
            "Factor in stylus and keyboard cover prices when comparing total cost",
            "Check education/student offers and bank EMI cashback across platforms",
            "Compare Wi-Fi vs Cellular variant pricing across Amazon, Flipkart, and Croma",
        ],
    },
    "TVs": {
        "pros": [
            "High visual impact with built-in smart streaming OS and voice control",
            "Substantial online price advantage compared to offline electronics chains",
            "Includes brand-authorized technician wall-mount/table-top installation",
        ],
        "cons": [
            "Scheduled large-appliance delivery and wall-mount bracket charges may apply",
            "Built-in speaker output may benefit from an external soundbar in large rooms",
        ],
        "tips": [
            "Compare total price including wall-mount installation and extended panel warranty",
            "Exchange an older working TV to unlock additional instant markdowns",
            "Verify HDMI eARC and refresh-rate specs across Croma, Amazon, and Flipkart",
        ],
    },
    "Footwear": {
        "pros": [
            "Wide UK/India size availability with easy doorstep size-exchange policies",
            "Attractive online discount compared to retail showroom pricing",
            "Verified customer comfort and durability ratings available",
        ],
        "cons": [
            "Shoe width and arch fit can vary by brand last — check UK vs US sizing",
            "Popular sizes sell out quickly during seasonal clearance sales",
        ],
        "tips": [
            "Measure foot length in cm and match against the brand's official size chart",
            "Compare prices across Myntra, AJIO, Amazon, and Flipkart before checkout",
            "Look for prepaid payment and coupon discounts for extra 10% savings",
        ],
    },
    "Cameras": {
        "pros": [
            "Professional imaging sensor performance with strong long-term resale value",
            "Compatible with a wide ecosystem of lenses and creator accessories",
            "Official manufacturer warranty with authorized service center support",
        ],
        "cons": [
            "High initial investment — lenses, high-speed SD cards, and bags add cost",
            "Kit lens bundles vs body-only pricing varies significantly across stores",
        ],
        "tips": [
            "Compare body-only vs combo kit lens bundle pricing across platforms",
            "Ensure the seller is an authorized brand dealer to claim multi-year warranty",
            "Use no-cost EMI and bank cashback deals to reduce effective purchase price",
        ],
    },
}

DEFAULT_INSIGHTS = {
    "pros": [
        "Verified availability across major Indian e-commerce marketplaces",
        "Competitive online pricing with transparent cross-store comparison",
        "Backed by standard platform return protection and manufacturer warranty",
        "Strong overall value-for-money profile in its category segment",
    ],
    "cons": [
        "Prices and promotional coupons fluctuate across different sellers",
        "Estimated delivery speed varies based on destination pin code",
    ],
    "tips": [
        "Compare prices across all listed marketplaces before completing checkout",
        "Apply available store coupons and bank card offers for extra 5–10% savings",
        "Set a DealLens Price Drop Alert to get notified automatically on any further markdown",
        "Verify seller rating and return window terms on the destination store",
    ],
}


class AIAnalysisService:
    """Generates AI-powered shopping analysis with Best Deal Score.

    Score Weights:
        Price Value:         35%
        Product Rating:      15%
        Review Confidence:   10%
        Offers & Discount:   10%
        Delivery Info:       10%
        Warranty & Returns:  10%
        Seller Reliability:   5%
        Data Freshness:       5%
    """

    WEIGHTS = {
        "price": 0.35,
        "rating": 0.15,
        "review_confidence": 0.10,
        "offers": 0.10,
        "delivery": 0.10,
        "warranty": 0.10,
        "seller": 0.05,
        "freshness": 0.05,
    }

    CONFIDENCE_LEVELS = {
        "high": {"label": "High Confidence", "min_score": 75, "description": "Strong data from multiple sources"},
        "medium": {"label": "Medium Confidence", "min_score": 50, "description": "Adequate data available"},
        "low": {"label": "Low Confidence", "min_score": 25, "description": "Limited data — verify before buying"},
        "unknown": {"label": "Insufficient Data", "min_score": 0, "description": "Not enough information to assess"},
    }

    def analyze(self, normalized_product: dict, comparison: dict) -> dict:
        price = float(normalized_product.get("price", 0) or 0)
        mrp = float(normalized_product.get("mrp", 0) or 0)
        rating = normalized_product.get("rating")
        category = normalized_product.get("category", "")
        platform = normalized_product.get("platform", "")
        title = normalized_product.get("title", "This product")
        delivery_days = normalized_product.get("delivery_days", 3)
        coupon_discount = normalized_product.get("coupon_discount", 0)
        warranty = normalized_product.get("warranty", "")
        seller_name = normalized_product.get("seller", "")

        listings = comparison.get("listings", [])
        best_price = float(comparison.get("best_price", 0) or 0)
        price_range = float(comparison.get("price_range", 0) or 0)
        matches = int(comparison.get("matches_found", 0) or 0)

        insights = CATEGORY_INSIGHTS.get(category, DEFAULT_INSIGHTS)
        seed_int = int(hashlib.md5(title.encode("utf-8", errors="replace")).hexdigest(), 16) % 10000
        random.seed(seed_int)

        scored_listings = self._score_all_listings(listings)
        best_deal = scored_listings[0] if scored_listings else None

        deal_score = best_deal["score"] if best_deal else 50
        deal_assessment = self._get_deal_assessment(deal_score, price, best_price, matches)
        best_platform = self._find_best_platform(listings)
        cheapest_store = best_platform.get("platform") or platform or "top store"
        effective_best_price = best_price if best_price > 0 else price

        summary = self._generate_summary(
            title, platform, price, mrp, rating, effective_best_price, matches, deal_assessment, category, cheapest_store
        )
        recommendation = self._generate_recommendation(
            deal_assessment, price, effective_best_price, platform, matches, best_deal
        )
        categories = self._get_recommendation_categories(scored_listings)
        confidence = self._get_confidence_level(scored_listings, matches)
        explanation = self._generate_explanation(scored_listings, best_deal, confidence)

        # Build data-driven, product-specific pros & cons combined with category intelligence
        data_pros = []
        if mrp > effective_best_price > 0:
            disc_amt = mrp - effective_best_price
            disc_pct = (disc_amt / mrp) * 100
            if disc_pct >= 5:
                data_pros.append(
                    f"Saves ₹{disc_amt:,.0f} ({disc_pct:.0f}% OFF) below the ₹{mrp:,.0f} retail MRP"
                )
        if rating:
            try:
                r_val = float(rating)
                if r_val >= 4.3:
                    data_pros.append(
                        f"Strong customer satisfaction with a {r_val}★ out of 5 verified buyer rating"
                    )
                elif r_val >= 4.0:
                    data_pros.append(
                        f"Positive buyer reception rated {r_val}★ out of 5 across verified purchases"
                    )
            except (TypeError, ValueError):
                pass
        if price_range > 0 and matches > 0:
            data_pros.append(
                f"Save an extra ₹{price_range:,.0f} by picking {cheapest_store} over higher-priced stores"
            )
        if best_deal and best_deal.get("delivery_days") and int(best_deal["delivery_days"]) <= 3:
            d_days = int(best_deal["delivery_days"])
            data_pros.append(
                f"Fast doorstep fulfillment available ({'Next-day' if d_days <= 1 else f'{d_days}-day'} estimated delivery on { best_deal.get('platform', platform) })"
            )

        category_pros = list(insights["pros"])
        selected_cat_pros = random.sample(category_pros, min(len(category_pros), 2))
        selected_pros = (data_pros + selected_cat_pros)[:4]
        if len(selected_pros) < 3:
            for p in category_pros:
                if p not in selected_pros:
                    selected_pros.append(p)
                if len(selected_pros) >= 3:
                    break

        data_cons = []
        if best_price > 0 and price > best_price:
            diff = price - best_price
            data_cons.append(
                f"Priced ₹{diff:,.0f} higher on {platform} compared to the lowest verified offer on {cheapest_store} (₹{best_price:,.0f})"
            )
        if not rating:
            data_cons.append("Limited customer review volume on the source listing — verify seller ratings before checkout")

        category_cons = list(insights["cons"])
        selected_cat_cons = random.sample(category_cons, min(len(category_cons), 2))
        selected_cons = (data_cons + selected_cat_cons)[:3]

        all_tips = list(insights["tips"])
        smart_tips = random.sample(all_tips, min(len(all_tips), 3))
        tip = smart_tips[0] if smart_tips else random.choice( DEFAULT_INSIGHTS["tips"] )

        price_diff_from_best = price - best_price if best_price > 0 and price > 0 else 0

        # Structured AI Value & Timing Metrics for rich frontend presentation
        mrp_savings = max(0.0, mrp - effective_best_price) if mrp > effective_best_price > 0 else 0.0
        discount_pct = round((mrp_savings / mrp) * 100, 1) if mrp > 0 and mrp_savings > 0 else 0.0
        active_stores_count = sum(1 for l in listings if (l.get("price") or 0) > 0 and l.get("data_source") != "unavailable")

        if discount_pct >= 20:
            price_fairness = {
                "verdict": "Exceptional Markdown",
                "badge": "green",
                "detail": f"Trading {discount_pct:.0f}% below MRP (₹{mrp_savings:,.0f} direct savings).",
            }
        elif discount_pct >= 10:
            price_fairness = {
                "verdict": "Below Market MRP",
                "badge": "green",
                "detail": f"Healthy {discount_pct:.0f}% discount (saves ₹{mrp_savings:,.0f} off ₹{mrp:,.0f} MRP).",
            }
        elif effective_best_price > 0:
            price_fairness = {
                "verdict": "Fair Market Price",
                "badge": "cyan",
                "detail": f"Competitive pricing at ₹{effective_best_price:,.0f} across verified marketplaces.",
            }
        else:
            price_fairness = {
                "verdict": "Market Rate",
                "badge": "amber",
                "detail": "Compare seller offers at checkout for best effective price.",
            }

        if best_price > 0 and price > best_price:
            buy_timing = {
                "action": f"Switch to {cheapest_store} & Buy",
                "badge": "emerald",
                "reason": f"{cheapest_store} offers the lowest verified price at ₹{best_price:,.0f} (saves ₹{price - best_price:,.0f} vs {platform}).",
            }
        elif deal_score >= 70 or discount_pct >= 12:
            buy_timing = {
                "action": "Buy Now — Optimal Price Window",
                "badge": "emerald",
                "reason": f"{cheapest_store} currently holds the lowest verified price with a {deal_score}/100 DealLens score.",
            }
        else:
            buy_timing = {
                "action": "Good Time to Buy / Track Alerts",
                "badge": "cyan",
                "reason": "Price is stable across stores; apply bank offers or set a price alert for extra savings.",
            }

        value_metrics = {
            "mrp_savings": round(mrp_savings, 2),
            "discount_pct": discount_pct,
            "cross_store_spread": round(price_range, 2),
            "stores_compared": max(1, active_stores_count),
            "cheapest_store": cheapest_store,
            "cheapest_price": round(effective_best_price, 2),
        }

        return {
            "deal_assessment": deal_assessment,
            "deal_score": deal_score,
            "summary": summary,
            "pros": selected_pros,
            "cons": selected_cons,
            "best_platform": best_platform,
            "recommendation": recommendation,
            "savings_tip": tip,
            "smart_tips": smart_tips,
            "price_fairness": price_fairness,
            "buy_timing": buy_timing,
            "value_metrics": value_metrics,
            "price_difference_from_best": round(price_diff_from_best, 2),
            "scored_listings": scored_listings,
            "recommendation_categories": categories,
            "confidence": confidence,
            "explanation": explanation,
        }

    def _score_all_listings(self, listings: list) -> list:
        """Score each listing with full sub-scores."""
        scored = []
        for listing in listings:
            sub_scores = self._calculate_sub_scores(listing, listings)
            total_score = sum(
                sub_scores[k] * self.WEIGHTS[k] for k in self.WEIGHTS
            )
            total_score = max(0, min(100, int(total_score)))
            scored.append({
                **listing,
                "score": total_score,
                "sub_scores": {k: round(v, 1) for k, v in sub_scores.items()},
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored

    def _calculate_sub_scores(self, listing: dict, all_listings: list) -> dict:
        """Calculate individual sub-scores (0-100) for a listing."""
        prices = [l["price"] for l in all_listings if l.get("price", 0) > 0]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        price_range = max_price - min_price if max_price > min_price else 1

        # 1. Price Score (35%)
        price = listing.get("price", 0)
        if price <= 0:
            price_score = 0
        elif min_price == max_price:
            price_score = 100
        else:
            price_score = max(0, 100 - ((price - min_price) / price_range * 100))

        # 2. Rating Score (15%)
        rating = listing.get("rating")
        if rating:
            r = float(rating)
            rating_score = min(100, (r / 5.0) * 100)
        else:
            rating_score = 40

        # 3. Review Confidence Score (10%)
        reviews_count = listing.get("reviews_count", 0)
        if reviews_count:
            if reviews_count >= 5000:
                review_confidence = 100
            elif reviews_count >= 1000:
                review_confidence = 80
            elif reviews_count >= 200:
                review_confidence = 60
            elif reviews_count >= 50:
                review_confidence = 40
            else:
                review_confidence = 20
        else:
            review_confidence = 10

        # 4. Offers Score (10%)
        coupon_discount = listing.get("coupon_discount", 0)
        has_coupon = coupon_discount and coupon_discount > 0
        if has_coupon and price > 0:
            discount_pct = (coupon_discount / price) * 100
            offer_score = min(100, discount_pct * 10)
        elif listing.get("discount_percent") and listing["discount_percent"] > 0:
            offer_score = min(100, float(listing["discount_percent"]) * 2)
        else:
            offer_score = 20

        # 5. Delivery Score (10%)
        delivery_days = listing.get("delivery_days")
        if delivery_days is not None and delivery_days > 0:
            if delivery_days <= 1:
                delivery_score = 100
            elif delivery_days <= 2:
                delivery_score = 80
            elif delivery_days <= 3:
                delivery_score = 60
            elif delivery_days <= 5:
                delivery_score = 40
            else:
                delivery_score = 20
        else:
            delivery_score = 50

        # 6. Warranty Score (10%)
        warranty = listing.get("warranty", "")
        return_policy = listing.get("return_policy", "")
        warranty_score = 30
        if warranty:
            w = str(warranty).lower()
            if "2 year" in w or "3 year" in w or "extended" in w:
                warranty_score = 90
            elif "1 year" in w or "12 month" in w:
                warranty_score = 70
            elif "6 month" in w:
                warranty_score = 50
            else:
                warranty_score = 40
        if return_policy:
            rp = str(return_policy).lower()
            if "7 day" in rp or "10 day" in rp or "30 day" in rp:
                warranty_score = min(100, warranty_score + 20)

        # 7. Seller Reliability Score (5%)
        seller_score = 50
        seller = listing.get("seller") or listing.get("seller_details") or {}
        if isinstance(seller, dict):
            if seller.get("is_verified"):
                seller_score = 90
            elif seller.get("reliability_score"):
                seller_score = min(100, float(seller["reliability_score"]) * 100)
        if listing.get("data_source") == "live":
            seller_score = min(100, seller_score + 10)
        if listing.get("in_stock") is False:
            seller_score = max(0, seller_score - 40)

        # 8. Data Freshness Score (5%)
        freshness_score = 50
        data_source = listing.get("data_source", "")
        data_freshness = listing.get("data_freshness")
        data_status = listing.get("data_status", "demonstration")
        if data_source == "live":
            freshness_score = 90
        elif data_source == "dataset":
            freshness_score = 60
        if data_status == "verified":
            freshness_score = min(100, freshness_score + 10)
        elif data_status == "estimated":
            freshness_score = max(0, freshness_score - 20)
        elif data_status == "source_unavailable":
            freshness_score = max(0, freshness_score - 30)

        return {
            "price": price_score,
            "rating": rating_score,
            "review_confidence": review_confidence,
            "offers": offer_score,
            "delivery": delivery_score,
            "warranty": warranty_score,
            "seller": seller_score,
            "freshness": freshness_score,
        }

    def _get_deal_assessment(self, deal_score: int, price: float, best_price: float, matches: int) -> str:
        if price <= 0:
            return "Price Unavailable — check the platform for current pricing"
        if matches == 0 and price > 0:
            if deal_score >= 70:
                return "Good Deal"
            return "Fair Deal — limited comparison data"
        if best_price > 0 and price > 0 and price > best_price * 1.15:
            return "Expensive — other platforms offer better pricing"
        if deal_score >= 80:
            return "Excellent Deal"
        elif deal_score >= 65:
            return "Good Deal"
        elif deal_score >= 50:
            return "Fair Deal"
        else:
            return "Below Average — consider alternatives"

    def _generate_summary(
        self, title, platform, price, mrp, rating, best_price, matches, deal_assessment, category, cheapest_store="another platform"
    ):
        parts = []
        if price > 0:
            parts.append(f"{title} is currently listed on {platform} at ₹{price:,.0f}.")
        else:
            parts.append(f"{title} was evaluated on {platform}.")

        if mrp > price and mrp > 0 and price > 0:
            discount_pct = ((mrp - price) / mrp) * 100
            savings_amt = mrp - price
            parts.append(
                f"Against a retail MRP of ₹{mrp:,.0f}, this represents an immediate {discount_pct:.0f}% markdown (saving ₹{savings_amt:,.0f})."
            )

        if rating:
            try:
                r_val = float(rating)
                sentiment = "excellent" if r_val >= 4.4 else "strong" if r_val >= 4.0 else "moderate"
                parts.append(f"Verified buyers give it a {sentiment} {r_val}★ out of 5 rating.")
            except (TypeError, ValueError):
                parts.append(f"It holds a customer rating of {rating} out of 5.")

        if matches > 0:
            if best_price > 0 and price > best_price:
                diff = price - best_price
                parts.append(
                    f"Cross-marketplace scanning shows {cheapest_store} offering the same product at a lower price of ₹{best_price:,.0f} "
                    f"(₹{diff:,.0f} extra savings across {matches + 1} compared stores)."
                )
            elif best_price > 0 and price <= best_price:
                parts.append(
                    f"{platform} currently leads all {matches + 1} compared marketplaces with the lowest verified price."
                )
            else:
                parts.append(f"Compared across {matches + 1} active marketplace listings.")

        return " ".join(parts)

    def _generate_recommendation(self, deal_assessment, price, best_price, platform, matches, best_deal):
        if best_deal and best_deal.get("score", 0) >= 75:
            reasons = []
            if best_deal.get("is_cheapest"):
                reasons.append("lowest verified market price")
            if best_deal.get("rating") and float(best_deal["rating"]) >= 4.3:
                reasons.append(f"high {best_deal['rating']}★ buyer rating")
            if best_deal.get("delivery_days") and best_deal["delivery_days"] <= 2:
                reasons.append("express delivery")
            if best_deal.get("coupon_discount") and best_deal["coupon_discount"] > 0:
                reasons.append("extra coupon discount")
            reason_str = ", ".join(reasons) if reasons else "highest composite value score"
            return f"Recommended Purchase: Buy on {best_deal['platform']} at ₹{best_deal.get('price', price):,.0f} ({reason_str})."

        if "Excellent" in deal_assessment or "Good" in deal_assessment:
            return f"Recommended Purchase: {platform} offers strong value at ₹{price:,.0f} — apply bank or exchange offers at checkout."
        if "Price Unavailable" in deal_assessment:
            return "Visit the official store listing directly to verify current live pricing and stock."
        if "Expensive" in deal_assessment:
            return f"Switch Store Recommended: Purchase from the cheapest verified marketplace at ₹{best_price:,.0f} to avoid overpaying."
        if matches == 0:
            return f"Buy on {platform} or set a DealLens Price Drop Alert to track upcoming festive markdowns."
        return "Compare the marketplace cards below and select the store with the lowest effective checkout price."

    def _find_best_platform(self, listings):
        valid = [l for l in listings if l.get("price", 0) > 0]
        if not valid:
            return {"platform": "N/A", "price": 0, "reason": "No valid listings available"}

        cheapest = min(valid, key=lambda x: x["price"])
        best_rated = max(valid, key=lambda x: x.get("rating") or 0)

        if cheapest["platform"] == best_rated.get("platform") and best_rated.get("rating"):
            return {
                "platform": cheapest["platform"],
                "price": cheapest["price"],
                "reason": "Lowest price with best rating",
            }
        return {
            "platform": cheapest["platform"],
            "price": cheapest["price"],
            "reason": "Lowest available price",
        }

    @staticmethod
    def _is_verifiable(listing: dict) -> bool:
        """Recommendation-eligible only with real data.

        Excludes unavailable placeholders (price 0), rows without a
        usable price, and explicitly demo/reference rows. Scoring
        weights and formulas are untouched — this only gates which
        listings may become recommendation candidates.
        """
        if not isinstance(listing, dict):
            return False
        if listing.get("data_source") == "unavailable":
            return False
        if listing.get("is_demo"):
            return False
        try:
            return float(listing.get("price", 0) or 0) > 0
        except (TypeError, ValueError):
            return False

    def _get_recommendation_categories(self, scored_listings: list) -> list:
        """Assign recommendation categories based on sub-scores."""
        if not scored_listings:
            return []

        categories = []
        valid = [l for l in scored_listings
                 if l.get("score", 0) > 0 and self._is_verifiable(l)]
        if not valid:
            return categories

        # Best Overall Value — highest total score
        best_overall = valid[0]
        categories.append({
            "category": "Best Overall Value",
            "platform": best_overall.get("platform", ""),
            "price": best_overall.get("price", 0),
            "score": best_overall.get("score", 0),
            "reason": f"Highest combined score of {best_overall.get('score', 0)}/100",
        })

        # Lowest Price
        with_prices = [l for l in valid if l.get("price", 0) > 0]
        if with_prices:
            cheapest = min(with_prices, key=lambda x: x["price"])
            categories.append({
                "category": "Lowest Price",
                "platform": cheapest.get("platform", ""),
                "price": cheapest.get("price", 0),
                "score": cheapest.get("score", 0),
                "reason": f"Cheapest at Rs.{cheapest['price']:,.0f}",
            })

        # Best Rated
        with_ratings = [l for l in valid if l.get("rating") and float(l["rating"]) > 0]
        if with_ratings:
            best_rated = max(with_ratings, key=lambda x: float(x["rating"]))
            categories.append({
                "category": "Best Rated",
                "platform": best_rated.get("platform", ""),
                "price": best_rated.get("price", 0),
                "score": best_rated.get("score", 0),
                "reason": f"Highest rating at {best_rated['rating']}/5",
            })

        # Best Offer (highest discount)
        with_offers = [l for l in valid if l.get("coupon_discount") and l["coupon_discount"] > 0]
        if with_offers:
            best_offer = max(with_offers, key=lambda x: x.get("coupon_discount", 0))
            categories.append({
                "category": "Best Offer",
                "platform": best_offer.get("platform", ""),
                "price": best_offer.get("price", 0),
                "score": best_offer.get("score", 0),
                "reason": f"Biggest coupon discount of Rs.{best_offer['coupon_discount']:,.0f}",
            })

        # Best Warranty
        with_warranty = [l for l in valid if l.get("sub_scores", {}).get("warranty", 0) > 50]
        if with_warranty:
            best_warranty = max(with_warranty, key=lambda x: x.get("sub_scores", {}).get("warranty", 0))
            categories.append({
                "category": "Best Warranty",
                "platform": best_warranty.get("platform", ""),
                "price": best_warranty.get("price", 0),
                "score": best_warranty.get("score", 0),
                "reason": "Best warranty and return policy",
            })

        # Fastest Delivery
        with_delivery = [l for l in valid if l.get("delivery_days") and l["delivery_days"] > 0]
        if with_delivery:
            fastest = min(with_delivery, key=lambda x: x["delivery_days"])
            if fastest["delivery_days"] <= 3:
                delivery_text = "Today" if fastest["delivery_days"] == 0 else (
                    "Tomorrow" if fastest["delivery_days"] == 1 else f"{fastest['delivery_days']} days"
                )
                categories.append({
                    "category": "Fastest Delivery",
                    "platform": fastest.get("platform", ""),
                    "price": fastest.get("price", 0),
                    "score": fastest.get("score", 0),
                    "reason": f"Delivers in {delivery_text}",
                })

        # Most Reliable (best seller + data freshness sub-scores)
        with_reliability = sorted(
            valid,
            key=lambda x: x.get("sub_scores", {}).get("seller", 0) * 0.5 + x.get("sub_scores", {}).get("freshness", 0) * 0.5,
            reverse=True,
        )
        if with_reliability and len(with_reliability) > 1:
            most_reliable = with_reliability[0]
            categories.append({
                "category": "Most Reliable Listing",
                "platform": most_reliable.get("platform", ""),
                "price": most_reliable.get("price", 0),
                "score": most_reliable.get("score", 0),
                "reason": "Best seller reliability and data freshness",
            })

        # Best Alternative (prefer different platform from best overall)
        if len(valid) > 1:
            best_overall_platform = best_overall.get("platform")
            alt = None
            for candidate in valid[1:]:
                if candidate.get("score", 0) > 0:
                    if not alt:
                        alt = candidate
                    if candidate.get("platform") != best_overall_platform:
                        alt = candidate
                        break
            if alt:
                categories.append({
                    "category": "Best Alternative",
                    "platform": alt.get("platform", ""),
                    "price": alt.get("price", 0),
                    "score": alt.get("score", 0),
                    "reason": f"Score of {alt.get('score', 0)}/100 — strong alternative option",
                })

        return categories

    def _get_confidence_level(self, scored_listings: list, matches: int) -> dict:
        """Determine overall confidence based on data quality and quantity."""
        if not scored_listings:
            return {"level": "unknown", **self.CONFIDENCE_LEVELS["unknown"]}

        total = len(scored_listings)
        live_count = sum(1 for l in scored_listings if l.get("data_source") == "live")
        verified_count = sum(1 for l in scored_listings if l.get("data_status") == "verified")
        with_rating = sum(1 for l in scored_listings if l.get("rating"))
        with_reviews = sum(1 for l in scored_listings if l.get("reviews_count", 0) > 0)

        quality_score = 0
        if total >= 4:
            quality_score += 25
        elif total >= 2:
            quality_score += 15
        elif total >= 1:
            quality_score += 5

        if live_count > 0:
            quality_score += 20
        if verified_count > 0:
            quality_score += 15
        if with_rating > 0:
            quality_score += 15
        if with_reviews > 0:
            quality_score += 15
        if matches >= 3:
            quality_score += 10

        if quality_score >= 70:
            level = "high"
        elif quality_score >= 40:
            level = "medium"
        elif quality_score >= 15:
            level = "low"
        else:
            level = "unknown"

        return {"level": level, **self.CONFIDENCE_LEVELS[level]}

    def _generate_explanation(self, scored_listings: list, best_deal: dict, confidence: dict) -> str:
        """Generate a human-readable explanation of the scoring."""
        if not best_deal:
            return "Insufficient data to generate a scoring explanation."

        sub = best_deal.get("sub_scores", {})
        parts = []

        platform = best_deal.get("platform", "this platform")
        score = best_deal.get("score", 0)
        parts.append(f"The top recommendation is {platform} with an overall Best Deal Score of {score}/100.")

        # Highlight strengths
        strengths = []
        if sub.get("price", 0) >= 70:
            strengths.append("competitive pricing")
        if sub.get("rating", 0) >= 70:
            strengths.append("strong customer rating")
        if sub.get("delivery", 0) >= 70:
            strengths.append("fast delivery")
        if sub.get("offers", 0) >= 70:
            strengths.append("good coupon/discount")
        if sub.get("warranty", 0) >= 70:
            strengths.append("strong warranty")
        if sub.get("seller", 0) >= 70:
            strengths.append("reliable seller")
        if sub.get("freshness", 0) >= 70:
            strengths.append("fresh/verified data")

        if strengths:
            parts.append(f"Key strengths: {', '.join(strengths)}.")

        # Highlight weaknesses
        weaknesses = []
        if sub.get("price", 0) < 40:
            weaknesses.append("higher price")
        if sub.get("rating", 0) < 40:
            weaknesses.append("low or missing rating")
        if sub.get("delivery", 0) < 40:
            weaknesses.append("slower delivery")
        if sub.get("offers", 0) < 40:
            weaknesses.append("no active coupons")

        if weaknesses:
            parts.append(f"Trade-offs: {', '.join(weaknesses)}.")

        parts.append(f"Data confidence: {confidence.get('label', 'Unknown')} — {confidence.get('description', '')}.")

        return " ".join(parts)
