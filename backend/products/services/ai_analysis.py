import random
import hashlib
from decimal import Decimal


CATEGORY_INSIGHTS = {
    "Smartphones": {
        "pros": ["Wide availability across platforms", "Strong brand resale value", "Feature-rich for daily use"],
        "cons": ["Prices fluctuate frequently", "New models launch often", "Accessories add to total cost"],
        "tips": [
            "Buy during festive sales for best discounts",
            "Compare exchange offers across platforms",
            "Check bank card offers for additional 5-10% savings",
            "Consider previous-generation models for better value",
        ],
    },
    "Laptops": {
        "pros": ["Essential for productivity", "Long-term investment", "Good resale value"],
        "cons": ["High upfront cost", "Prices vary significantly across sellers", "Accessories sold separately"],
        "tips": [
            "Compare across at least 3 platforms before buying",
            "Check for student or corporate discounts",
            "Look for extended warranty deals",
            "Consider refurbished for 20-30% savings",
        ],
    },
    "Fashion": {
        "pros": ["Wide variety available", "Seasonal sales offer deep discounts", "Easy returns policy"],
        "cons": ["Sizing varies across brands", "Quality hard to judge online", "Trend-dependent value"],
        "tips": [
            "Check size charts carefully before ordering",
            "Buy during end-of-season sales for 50-70% off",
            "Read verified buyer reviews for fit guidance",
            "Compare prices across Myntra, AJIO, and Meesho",
        ],
    },
    "Kitchen Appliances": {
        "pros": ["Daily use value", "Good brand options", "Warranty support available"],
        "cons": ["Heavy items may have delivery charges", "Installation sometimes extra", "Energy ratings matter long-term"],
        "tips": [
            "Check energy star ratings for long-term savings",
            "Compare installation charges across platforms",
            "Look for combo deals with accessories included",
            "Buy during Big Billion Day or Great Indian Festival sales",
        ],
    },
    "Home Appliances": {
        "pros": ["Long lifespan", "Significant price differences across platforms", "Good warranty support"],
        "cons": ["Large investment", "Delivery and installation complexity", "Energy consumption varies"],
        "tips": [
            "Compare total cost including installation and delivery",
            "Check energy ratings — a 5-star AC saves thousands yearly",
            "Look for exchange offers on old appliances",
            "Buy during festive season for best prices",
        ],
    },
    "Beauty": {
        "pros": ["Wide product range", "Easy to compare prices", "Customer reviews help decide"],
        "cons": ["Counterfeit risk on some platforms", "Shelf life concerns", "Returns can be complicated"],
        "tips": [
            "Buy from authorized sellers only",
            "Check manufacturing and expiry dates",
            "Compare gift sets and combo offers",
            "Use coupon codes at checkout for extra savings",
        ],
    },
    "Grocery": {
        "pros": ["Daily essentials at competitive prices", "Subscription discounts available", "Home delivery convenience"],
        "cons": ["Perishable items risk", "Minimum order requirements", "Delivery time varies"],
        "tips": [
            "Subscribe for regular deliveries to save 10-15%",
            "Compare prices per unit, not per pack",
            "Buy in bulk for non-perishable items",
            "Check for first-time user discounts on new platforms",
        ],
    },
    "Earbuds": {
        "pros": ["Compact and portable", "Wide price range available", "Good for daily commute"],
        "cons": ["Battery life varies", "Fit can be uncomfortable for some", "Sound quality differs significantly"],
        "tips": [
            "Check battery life with ANC on vs off",
            "Compare sound quality reviews across platforms",
            "Look for bundle deals with charging cases",
        ],
    },
    "Headphones": {
        "pros": ["Superior sound quality", "Active noise cancellation", "Comfortable for long sessions"],
        "cons": ["Bulky for travel", "Premium models expensive", "Wired vs wireless trade-offs"],
        "tips": [
            "Compare noise cancellation performance",
            "Check comfort reviews for extended wear",
            "Look for multi-device connectivity features",
        ],
    },
    "Tablets": {
        "pros": ["Portable productivity", "Good for media consumption", "Stylus support on premium models"],
        "cons": ["Not a laptop replacement for heavy tasks", "Accessories add cost", "Storage limitations"],
        "tips": [
            "Compare stylus compatibility across platforms",
            "Check keyboard accessory prices separately",
            "Look for student discount programs",
        ],
    },
    "TVs": {
        "pros": ["Significant price differences across platforms", "Good for home entertainment", "Smart features built-in"],
        "cons": ["Delivery and installation complexity", "Wall mounting extra cost", "Panel quality varies"],
        "tips": [
            "Compare total cost including installation",
            "Check warranty terms across platforms",
            "Look for exchange offers on old TVs",
        ],
    },
    "Footwear": {
        "pros": ["Wide variety", "Seasonal sales offer deep discounts", "Easy returns on most platforms"],
        "cons": ["Sizing varies across brands", "Comfort hard to judge online", "Counterfeit risk"],
        "tips": [
            "Check size charts carefully",
            "Read verified buyer reviews for fit",
            "Compare prices across Myntra, AJIO, and Nike.com",
        ],
    },
    "Cameras": {
        "pros": ["Good resale value", "Price varies significantly", "Accessories ecosystem"],
        "cons": ["High upfront cost", "Lens investment adds up", "New models depreciate fast"],
        "tips": [
            "Compare body-only vs kit prices",
            "Check for authorized dealer warranty",
            "Look for refurbished from brand stores",
        ],
    },
}

DEFAULT_INSIGHTS = {
    "pros": ["Available across multiple platforms", "Competitive pricing options", "Easy to compare"],
    "cons": ["Price differences across platforms", "Delivery times may vary", "Availability not guaranteed everywhere"],
    "tips": [
        "Compare prices on at least 3 platforms",
        "Check for coupon codes before checkout",
        "Read recent reviews for quality assurance",
        "Look for bank card offers for extra savings",
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
        price = normalized_product.get("price", 0)
        mrp = normalized_product.get("mrp", 0)
        rating = normalized_product.get("rating")
        category = normalized_product.get("category", "")
        platform = normalized_product.get("platform", "")
        title = normalized_product.get("title", "This product")
        delivery_days = normalized_product.get("delivery_days", 3)
        coupon_discount = normalized_product.get("coupon_discount", 0)
        warranty = normalized_product.get("warranty", "")
        seller_name = normalized_product.get("seller", "")

        listings = comparison.get("listings", [])
        best_price = comparison.get("best_price", 0)
        price_range = comparison.get("price_range", 0)
        matches = comparison.get("matches_found", 0)

        insights = CATEGORY_INSIGHTS.get(category, DEFAULT_INSIGHTS)
        seed_int = int(hashlib.md5(title.encode("utf-8", errors="replace")).hexdigest(), 16) % 10000
        random.seed(seed_int)

        scored_listings = self._score_all_listings(listings)
        best_deal = scored_listings[0] if scored_listings else None

        deal_score = best_deal["score"] if best_deal else 50
        deal_assessment = self._get_deal_assessment(deal_score, price, best_price, matches)
        summary = self._generate_summary(title, platform, price, mrp, rating, best_price, matches, deal_assessment, category)
        recommendation = self._generate_recommendation(deal_assessment, price, best_price, platform, matches, best_deal)
        best_platform = self._find_best_platform(listings)
        categories = self._get_recommendation_categories(scored_listings)
        confidence = self._get_confidence_level(scored_listings, matches)
        explanation = self._generate_explanation(scored_listings, best_deal, confidence)

        pros = list(insights["pros"])
        cons = list(insights["cons"])
        if price_range > 0 and matches > 0:
            pros.append(f"Save up to Rs.{price_range:,.0f} by choosing the best platform")
        if matches > 0:
            pros.append(f"Available on {matches + 1} platforms — easy to compare")
        if not rating:
            cons.append("No customer rating available yet")

        selected_pros = random.sample(pros, min(len(pros), random.randint(2, 3)))
        selected_cons = random.sample(cons, min(len(cons), random.randint(1, 2)))
        tip = random.choice(insights["tips"])

        price_diff_from_best = price - best_price if best_price > 0 and price > 0 else 0

        return {
            "deal_assessment": deal_assessment,
            "deal_score": deal_score,
            "summary": summary,
            "pros": selected_pros,
            "cons": selected_cons,
            "best_platform": best_platform,
            "recommendation": recommendation,
            "savings_tip": tip,
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

    def _generate_summary(self, title, platform, price, mrp, rating, best_price, matches, deal_assessment, category):
        parts = []
        if price > 0:
            parts.append(f"{title} is currently available on {platform} at Rs.{price:,.0f}.")
        else:
            parts.append(f"{title} was found on {platform}. Pricing is not yet available in our database.")

        if mrp > price and mrp > 0 and price > 0:
            discount_pct = ((mrp - price) / mrp) * 100
            parts.append(f"The listed MRP is Rs.{mrp:,.0f}, representing a {discount_pct:.0f}% discount.")

        if rating:
            parts.append(f"It has a customer rating of {rating} out of 5.")

        if matches > 0:
            if best_price > 0 and price > best_price:
                diff = price - best_price
                parts.append(
                    f"The same product is available on another platform at a lower price of Rs.{best_price:,.0f} "
                    f"(Rs.{diff:,.0f} savings)."
                )
            elif best_price > 0 and price <= best_price:
                parts.append("This listing offers the best price among the compared platforms with verified data.")
            parts.append(f"{matches} additional listing{'s' if matches != 1 else ''} found across other platforms.")
        else:
            parts.append("No other platform listings were found for direct comparison.")

        return " ".join(parts)

    def _generate_recommendation(self, deal_assessment, price, best_price, platform, matches, best_deal):
        if best_deal and best_deal.get("score", 0) >= 75:
            reasons = []
            if best_deal.get("is_cheapest"):
                reasons.append("lowest price")
            if best_deal.get("rating") and float(best_deal["rating"]) >= 4.3:
                reasons.append("strong rating")
            if best_deal.get("delivery_days") and best_deal["delivery_days"] <= 2:
                reasons.append("fast delivery")
            if best_deal.get("coupon_discount") and best_deal["coupon_discount"] > 0:
                reasons.append("available coupon")
            reason_str = " and ".join(reasons) if reasons else "best overall value"
            return f"Buy from {best_deal['platform']} — {reason_str}."

        if "Excellent" in deal_assessment or "Good" in deal_assessment:
            return f"Recommended — {platform} offers competitive pricing for this product."
        if "Price Unavailable" in deal_assessment:
            return "Price data is not yet available. Visit the platform directly to check current pricing and offers."
        if "Expensive" in deal_assessment:
            return f"Consider buying from a cheaper platform. Same product available from Rs.{best_price:,.0f}."
        if matches == 0:
            return "Limited data available. Consider checking other platforms manually before purchasing."
        return "Compare all available options before making a decision."

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
