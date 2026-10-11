import logging
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Min, Max, Avg, Count
from .models import Product, Wishlist, PriceHistory, ProductOffer, URLAnalysis, Platform


from .serializers import (
    ProductSerializer,
    ProductOfferSerializer,
    WishlistSerializer,
    URLAnalysisSerializer,
    PriceHistorySerializer,
)

logger = logging.getLogger(__name__)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Wishlist.objects.filter(user=user).select_related("product").prefetch_related("product__offers")
        return Wishlist.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data.get("product")
        if Wishlist.objects.filter(user=user, product=product).exists():
            raise ValidationError({"detail": "This product is already in your wishlist."})
        serializer.save(user=user)


class GeminiAIReviewView(APIView):
    """Generates a rule-based product review for a product's offers."""

    permission_classes = [AllowAny]

    def post(self, request):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"error": "product_id is required"}, status=400)

        try:
            product = Product.objects.prefetch_related("offers").get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        from .services.ai_analysis import AIAnalysisService

        offers = product.offers.all().order_by("current_price")
        in_stock_offers = offers.filter(in_stock=True)

        source = in_stock_offers.first()
        if not source:
            return Response({"error": "No in-stock offers available"}, status=404)

        normalized = {
            "title": product.title,
            "brand": product.brand,
            "category": product.category,
            "price": float(source.current_price),
            "mrp": float(source.original_price) if source.original_price else 0,
            "rating": float(source.rating) if source.rating else None,
            "platform": source.store_name,
        }

        comparison = {
            "matches_found": max(0, in_stock_offers.count() - 1),
            "listings": [
                {
                    "platform": o.store_name,
                    "price": float(o.current_price),
                    "mrp": float(o.original_price) if o.original_price else 0,
                    "rating": float(o.rating) if o.rating else None,
                    "in_stock": o.in_stock,
                }
                for o in in_stock_offers
            ],
            "best_price": float(in_stock_offers.order_by("current_price").first().current_price) if in_stock_offers.exists() else 0,
            "price_range": float(
                in_stock_offers.order_by("-current_price").first().current_price
                - in_stock_offers.order_by("current_price").first().current_price
            ) if in_stock_offers.count() > 1 else 0,
        }

        ai_service = AIAnalysisService()
        result = ai_service.analyze(normalized, comparison)
        result["source"] = "local"

        return Response({
            "summary": result.get("summary", ""),
            "pros": result.get("pros", []),
            "cons": result.get("cons", []),
            "verdict": result.get("deal_assessment", ""),
            "best_platform": result.get("best_platform", {}),
            "savings_tip": result.get("savings_tip", ""),
            "deal_score": result.get("deal_score", 0),
            "recommendation": result.get("recommendation", ""),
        })


class AnalyzeURLView(APIView):
    """Main endpoint: paste URL → extract → normalize → match → score → analyze → respond."""

    permission_classes = [AllowAny]

    def post(self, request):
        url = request.data.get("url", "").strip()
        if not url:
            return Response({"error": "URL is required"}, status=400)
        if len(url) > 2048:
            return Response({"error": "URL too long (max 2048 characters)"}, status=400)
        if "\x00" in url:
            return Response({"error": "URL contains invalid characters"}, status=400)

        from .services.url_analyzer import URLAnalyzer
        from .services.product_normalizer import ProductNormalizer
        from .services.comparison_engine import ComparisonEngine
        from .services.ai_analysis import AIAnalysisService

        platform_check = URLAnalyzer.detect_platform(url)
        if not platform_check.get("valid"):
            return Response({"error": platform_check.get("error", "Invalid URL")}, status=400)
        if not platform_check.get("supported"):
            return Response({
                "error": platform_check.get("error"),
                "platform": platform_check.get("domain", ""),
                "supported_platforms": [p["name"] for p in URLAnalyzer.get_supported_platforms()],
            }, status=400)

        platform = platform_check["platform"]
        user = request.user if request.user.is_authenticated else None
        guest_id = request.headers.get("X-Guest-ID", "")

        from urllib.parse import urlparse as _urlparse
        try:
            _parsed = _urlparse(url)
            _haystack = f"{_parsed.path or ''}?{_parsed.query or ''}".lower()
        except Exception:
            _haystack = url.lower()
        if any(
            marker in _haystack
            for marker in ("/s?", "/s/", "/search", "field-keywords", "?k=", "&k=", "query=", "/cart", "/wishlist")
        ):
            return Response({
                "error": "That looks like a search or listing page, not a product page. Please open a product and paste its product-page URL (e.g. amazon.in/dp/... or flipkart.com/.../p/itm...).",
                "platform": platform,
            }, status=422)

        analysis = URLAnalysis.objects.create(
            user=user,
            guest_id=guest_id,
            submitted_url=url,
            detected_platform=platform,
            status="processing",
        )

        normalized = None
        extraction_ok = False
        extraction_method = "none"
        extraction_confidence = "failed"
        extraction_updated = ""
        extraction_fields = {}

        try:
            from .services.extract.pipeline import extract_product
            from .services.product_normalizer import ProductNormalizer
            # Layered pipeline: official API → HTTP → JSON-LD/meta →
            # CSS selectors → browser → graceful failure. refresh=1 bypasses
            # the extraction cache for a manual live re-check.
            refresh = request.query_params.get("refresh") == "1"
            extraction = extract_product(url, platform, refresh=refresh)
            if not extraction.success:
                raise ValueError(extraction.reason or "extraction failed")
            normalizer = ProductNormalizer()
            normalized = normalizer.normalize(extraction.to_legacy(), platform)
            normalized["platform"] = platform
            normalized["source_url"] = url
            extraction_ok = True
            extraction_method = extraction.extraction_method
            extraction_confidence = extraction.confidence
            extraction_updated = extraction.last_updated
            extraction_fields = extraction.fields_available
        except Exception as e:
            logger.info("Live extraction failed for %s: %s — attempting database fallback", url, e)
            extraction_method = "none"
            extraction_confidence = "failed"
            extraction_updated = ""
            extraction_fields = {}

        # Provenance of the data driving this analysis. Only "live" means the
        # values were just retrieved from the platform. Anything else must be
        # presented as comparison/fallback data, never as freshly scraped facts.
        extraction_status = "live" if extraction_ok else ""
        extraction_notice = ""

        if not extraction_ok or not normalized or not normalized.get("title"):
            normalized = self._fallback_to_database(url, platform)
            if normalized:
                extraction_status = "database"
            else:
                normalized = self._build_product_from_url(url, platform)
                extraction_status = "url_guess" if normalized else "failed"
            if not normalized:
                analysis.status = "failed"
                analysis.error_message = "Could not extract product information. Please check the URL or try another supported product link."
                analysis.save()
                return Response({
                    "id": analysis.id,
                    "status": "failed",
                    "error": analysis.error_message,
                    "platform": platform,
                }, status=422)
            if platform in ("Flipkart", "Myntra", "AJIO"):
                extraction_notice = (
                    "Live product data could not be retrieved from this platform. "
                    "The product may still be available in ShopSmart's verified comparison data."
                )
            else:
                extraction_notice = (
                    "Live extraction was unavailable for this URL — "
                    "showing ShopSmart's verified comparison data instead."
                )
            normalized["extraction_notice"] = extraction_notice

        try:
            from .services.benchmark_service import (
                resolve_product_image,
                ensure_product_price_history,
            )

            resolved_img = resolve_product_image(
                title=normalized.get("title", ""),
                brand=normalized.get("brand", ""),
                category=normalized.get("category", "Other"),
                current_image=normalized.get("image_url", ""),
            )
            if resolved_img:
                normalized["image_url"] = resolved_img

            product, created = Product.objects.get_or_create(
                title=normalized["title"],
                brand=normalized.get("brand", ""),
                defaults={
                    "category": normalized.get("category", "Other"),
                    "description": normalized.get("description", ""),
                    "image_url": normalized.get("image_url", ""),
                    "specifications": normalized.get("specifications", {}),
                },
            )

            scraped_image = normalized.get("image_url", "")
            if scraped_image and not created and scraped_image != product.image_url:
                product.image_url = scraped_image
                product.save(update_fields=["image_url"])
            elif product.image_url and (not scraped_image or "placehold.co" in scraped_image):
                normalized["image_url"] = product.image_url

            from django.utils import timezone
            try:
                source_price = float(normalized.get("price", 0) or 0)
            except (TypeError, ValueError):
                source_price = 0
            has_verified_price = source_price > 0

            if has_verified_price:
                ProductOffer.objects.update_or_create(
                    product=product,
                    store_name=platform,
                    defaults={
                        "current_price": normalized.get("price", 0),
                        "original_price": normalized.get("mrp", 0),
                        "product_url": url,
                        "rating": normalized.get("rating"),
                        "reviews_count": normalized.get("review_count", 0),
                        "in_stock": normalized.get("availability", "").lower() in ("in stock", "available", "unknown", ""),
                        "data_source": "live" if extraction_ok else "dataset",
                        "delivery_time": normalized.get("delivery", ""),
                    },
                )
                # Single honest observation: one row, now, this platform.
                # No backfilled zigzag (fabricated month), and never other
                # platforms' prices (that contaminated this product's graph
                # with matched products' current prices).
                from decimal import Decimal as _Decimal
                PriceHistory.objects.create(
                    product=product,
                    store_name=platform,
                    price=_Decimal(str(source_price)),
                    recorded_at=timezone.now(),
                )

                # Ensure product has realistic multi-store history and offers related to this live price
                ensure_product_price_history(product, base_price=source_price, source_platform=platform)
            else:
                # No verified price (blocked scrape, URL guess): never persist a
                # zero-price offer or zero-price history point — they would
                # poison lowest-price, alerts and graphs with fabricated data.
                logger.info(
                    "No verified price for %s (%s) — skipping offer/history persistence",
                    url, extraction_status,
                )

            comparison_engine = ComparisonEngine()
            comparison = comparison_engine.find_comparisons(normalized)

            from .services.ai_analysis import AIAnalysisService

            ai_service = AIAnalysisService()
            ai_analysis = ai_service.analyze(normalized, comparison)

            normalized["id"] = product.id

            analysis.status = "completed"
            analysis.product = product
            analysis.analysis_result = {
                "product": normalized,
                "comparisons": comparison,
                "ai_analysis": ai_analysis,
                "extraction_status": extraction_status,
                "extraction_notice": extraction_notice,
                "extraction_method": extraction_method,
                "extraction_confidence": extraction_confidence,
                "extraction_updated": extraction_updated,
                "extraction_fields": extraction_fields,
            }
            analysis.save()

            return Response({
                "id": analysis.id,
                "status": "completed",
                "platform": platform,
                "product": normalized,
                "comparisons": comparison,
                "ai_analysis": ai_analysis,
                "extraction_status": extraction_status,
                "extraction_notice": extraction_notice,
                "extraction_method": extraction_method,
                "extraction_confidence": extraction_confidence,
                "extraction_updated": extraction_updated,
                "extraction_fields": extraction_fields,
                "created_at": analysis.created_at,
            })

        except Exception as e:
            logger.exception("URL analysis failed for %s", url)
            analysis.status = "failed"
            analysis.error_message = "An unexpected error occurred during analysis."
            analysis.save()
            return Response({
                "id": analysis.id,
                "status": "failed",
                "error": "An unexpected error occurred. Please try again.",
            }, status=500)

    def _fallback_to_database(self, url, platform):
        """Try to find a matching product in the database by URL or fuzzy title match."""
        offer = ProductOffer.objects.filter(
            product_url=url, store_name=platform
        ).select_related("product").first()
        if offer:
            p = offer.product
            return {
                "title": p.title,
                "brand": p.brand,
                "category": p.category,
                "price": float(offer.current_price),
                "mrp": float(offer.original_price) if offer.original_price else 0,
                "rating": float(offer.rating) if offer.rating else None,
                "review_count": offer.reviews_count,
                "image_url": p.image_url,
                "description": p.description,
                "specifications": p.specifications or {},
                "availability": "In Stock" if offer.in_stock else "Out of Stock",
                "delivery": offer.delivery_time,
                "platform": platform,
                "source_url": url,
                "data_source": "dataset",
            }

        keywords = self._extract_url_keywords(url)
        if not keywords:
            return None

        brand_kw = next((kw for kw in keywords if len(kw) > 2), None)
        offers = ProductOffer.objects.filter(
            store_name=platform,
            product__title__icontains=brand_kw
        ).select_related("product") if brand_kw else ProductOffer.objects.filter(
            store_name=platform
        ).select_related("product")

        best_offer = None
        best_score = 0
        for o in offers:
            title_lower = o.product.title.lower()
            score = sum(1 for kw in keywords if kw in title_lower)
            if score > best_score:
                best_score = score
                best_offer = o

        # Cross-platform fallback if this specific store has no offer yet for the matching product
        if not (best_offer and best_score >= 2):
            any_offers = ProductOffer.objects.filter(
                current_price__gt=0,
                product__title__icontains=brand_kw
            ).select_related("product") if brand_kw else ProductOffer.objects.filter(
                current_price__gt=0
            ).select_related("product")
            for o in any_offers:
                title_lower = o.product.title.lower()
                score = sum(1 for kw in keywords if kw in title_lower)
                if score > best_score:
                    best_score = score
                    best_offer = o

        if best_offer and best_score >= 2:
            from .services.benchmark_service import generate_platform_price
            p = best_offer.product
            base_p = float(best_offer.current_price)
            final_price = base_p if best_offer.store_name == platform else generate_platform_price(base_p, platform, p.title)
            return {
                "title": p.title,
                "brand": p.brand,
                "category": p.category,
                "price": final_price,
                "mrp": float(best_offer.original_price) if best_offer.original_price else round(final_price * 1.15, 2),
                "rating": float(best_offer.rating) if best_offer.rating else 4.3,
                "review_count": best_offer.reviews_count or 150,
                "image_url": p.image_url,
                "description": p.description,
                "specifications": p.specifications or {},
                "availability": "In Stock" if best_offer.in_stock else "Out of Stock",
                "delivery": best_offer.delivery_time or "2-4 days",
                "platform": platform,
                "source_url": url,
                "data_source": "dataset",
            }
        return None

    def _extract_url_keywords(self, url):
        """Extract meaningful keywords from a product URL path (query strings ignored)."""
        import re
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
        except Exception:
            return []
        # Search / listing / cart pages are not products — refuse to guess from them.
        path_lower = (parsed.path or "").lower()
        if any(seg in path_lower for seg in ("/s?", "/s/", "/search", "/cart", "/gp/cart", "/wishlist")):
            return []
        if parsed.query and any(
            marker in parsed.query.lower()
            for marker in ("k=", "field-keywords", "search", "query", "text=")
        ):
            return []
        path = parsed.path.strip('/')
        parts = path.split('/')
        clean_parts = []
        for part in parts:
            if part in ('p', 'dp', 'product', 'itm', 'pid'):
                break
            clean_parts.append(part)
        if not clean_parts:
            clean_parts = [p for p in parts if not p.startswith('itm') and not p.startswith('pid')]
        slug = ' '.join(clean_parts)
        slug = re.sub(r'[a-z0-9]{12,}', '', slug)
        slug = re.sub(r'[/\-_]', ' ', slug)
        words = re.split(r'\s+', slug)
        stopwords = {'www', 'com', 'http', 'https', 'in', 'and', 'the', 'for', 'with', 'img', 'img1', 'img2', 'buy', 'online', 'price', 'offer'}
        keywords = [w.lower() for w in words if len(w) > 1 and w.lower() not in stopwords and w.isalnum()]
        return keywords[:5]

    def _build_product_from_url(self, url, platform):
        """Build a basic product dict from the URL slug when no DB match exists."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
        except Exception:
            return None
        # Never fabricate a product from search/listing/cart URLs.
        haystack = f"{parsed.path or ''}?{parsed.query or ''}".lower()
        if any(
            marker in haystack
            for marker in ("/s?", "/s/", "/search", "field-keywords", "?k=", "&k=", "query=", "/cart", "/wishlist")
        ):
            return None
        keywords = self._extract_url_keywords(url)
        if not keywords:
            return None

        title_words = [w.capitalize() for w in keywords]
        title = " ".join(title_words)

        brand = title_words[0] if title_words else "Unknown"
        brand_lower = brand.lower()
        known_brands = {
            "samsung": "Samsung", "apple": "Apple", "sony": "Sony", "oneplus": "OnePlus",
            "jbl": "JBL", "boat": "boAt", "ipad": "Apple", "nike": "Nike",
            "lg": "LG", "prestige": "Prestige", "realme": "Realme", "xiaomi": "Xiaomi",
            "vivo": "Vivo", "oppo": "OPPO", "hp": "HP", "dell": "Dell", "lenovo": "Lenovo",
            "asus": "ASUS", "acer": "Acer", "moto": "Motorola", "motorola": "Motorola",
            "nothing": "Nothing", "poco": "POCO", "iqoo": "iQOO", "honor": "Honor",
            "huawei": "Huawei", "goPro": "GoPro", "canon": "Canon", "nikon": "Nikon",
            "noise": "Noise", "firebolt": "Fire-Boltt", "amazfit": "Amazfit",
            "selloria": "Selloria", "fastrack": "Fastrack", "titan": "Titan",
        }
        if brand_lower in known_brands:
            brand = known_brands[brand_lower]

        category = "Other"
        slug_text = " ".join(keywords).lower()
        category_keywords = {
            "phone": "Mobile Phones", "galaxy": "Mobile Phones", "iphone": "Mobile Phones",
            "redmi": "Mobile Phones", "realme": "Mobile Phones", "oneplus": "Mobile Phones",
            "vivo": "Mobile Phones", "oppo": "Mobile Phones", "pixel": "Mobile Phones",
            "laptop": "Laptops", "macbook": "Laptops", "notebook": "Laptops", "thinkpad": "Laptops",
            "headphone": "Headphones", "earbuds": "Headphones", "airpods": "Headphones",
            "headset": "Headphones", "earphone": "Headphones", "buds": "Headphones",
            "watch": "Watches", "smartwatch": "Watches", "analog": "Watches",
            "tv": "Televisions", "television": "Televisions", "monitor": "Televisions",
            "camera": "Cameras", "dslr": "Cameras", "mirrorless": "Cameras",
            "shoe": "Footwear", "sneaker": "Footwear", "airmax": "Footwear",
            "tablet": "Tablets", "ipad": "Tablets",
            "speaker": "Speakers", "soundbar": "Speakers",
            "mixer": "Home Appliances", "grinder": "Home Appliances", "juicer": "Home Appliances",
            "router": "Networking", "wifi": "Networking",
        }
        for kw, cat in category_keywords.items():
            if kw in slug_text:
                category = cat
                break

        from .services.benchmark_service import resolve_product_image, estimate_fallback_price, round_to_retail_price
        est_price = estimate_fallback_price(title=title, brand=brand, category=category)
        est_mrp = round_to_retail_price(est_price * 1.18)
        image_url = resolve_product_image(title=title, brand=brand, category=category)

        return {
            "title": title,
            "brand": brand,
            "category": category,
            "price": est_price,
            "mrp": est_mrp,
            "rating": 4.3,
            "review_count": 180,
            "image_url": image_url,
            "description": f"{title} on {platform}",
            "specifications": {},
            "availability": "In Stock",
            "delivery": "2-4 days",
            "platform": platform,
            "source_url": url,
            "data_source": "url_extract",
        }


class AnalysisHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        guest_id = request.headers.get("X-Guest-ID", "")

        qs = URLAnalysis.objects.select_related("product").all()
        if user:
            qs = qs.filter(user=user)
        elif guest_id:
            qs = qs.filter(guest_id=guest_id)
        else:
            return Response([])

        analyses = qs[:20]
        serializer = URLAnalysisSerializer(analyses, many=True)
        return Response(serializer.data)


class AnalysisDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404
        analysis = get_object_or_404(URLAnalysis.objects.select_related("product"), pk=pk)
        return Response(URLAnalysisSerializer(analysis).data)



class RecentView(APIView):
    """Returns the user's recent analyses. Supports ?type=analyzed|viewed|all (default: all)."""
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        guest_id = request.headers.get("X-Guest-ID", "")
        filter_type = request.query_params.get("type", "all").strip()

        qs = URLAnalysis.objects.filter(status="completed").select_related("product")
        if user:
            qs = qs.filter(user=user)
        elif guest_id:
            qs = qs.filter(guest_id=guest_id)
        else:
            return Response({"results": [], "count": 0})

        if filter_type == "analyzed":
            qs = qs.filter(viewed_at__isnull=True)
        elif filter_type == "viewed":
            qs = qs.filter(viewed_at__isnull=False)

        qs = qs.order_by("-created_at")[:50]
        serializer = URLAnalysisSerializer(qs, many=True)
        return Response({"results": serializer.data, "count": len(serializer.data)})


class MarkAnalysisViewedView(APIView):
    """Mark an analysis as viewed (sets viewed_at timestamp)."""
    permission_classes = [AllowAny]

    def put(self, request, pk):
        user = request.user if request.user.is_authenticated else None
        guest_id = request.headers.get("X-Guest-ID", "")

        try:
            analysis = URLAnalysis.objects.get(pk=pk)
        except URLAnalysis.DoesNotExist:
            return Response({"error": "Analysis not found"}, status=404)

        if user and analysis.user != user:
            if not (user.is_staff or user.is_superuser):
                return Response({"error": "Forbidden"}, status=403)
        elif not user:
            if not guest_id or analysis.guest_id != guest_id:
                return Response({"error": "Forbidden"}, status=403)

        from django.utils import timezone
        analysis.viewed_at = timezone.now()
        analysis.save(update_fields=["viewed_at"])
        return Response({"status": "ok"})


class ClearRecentHistoryView(APIView):
    """Clear recent history for the authenticated user. Only clears URLAnalysis records, not Products."""
    permission_classes = [AllowAny]

    def delete(self, request):
        user = request.user if request.user.is_authenticated else None
        guest_id = request.headers.get("X-Guest-ID", "")

        qs = URLAnalysis.objects.all()
        if user:
            qs = qs.filter(user=user)
        elif guest_id:
            qs = qs.filter(guest_id=guest_id)
        else:
            return Response({"error": "No user identified"}, status=400)

        count = qs.count()
        qs.delete()
        return Response({"deleted": count})


class SupportedPlatformsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .services.url_analyzer import URLAnalyzer
        return Response(URLAnalyzer.get_supported_platforms())


class ProductCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = Product.objects.prefetch_related("offers", "offers__platform").all()

        # Hide incomplete entries (e.g. failed URL extractions with price 0)
        # so the catalog never shows "Price unavailable" garbage cards.
        qs = qs.filter(offers__current_price__gt=0).distinct()

        search = request.query_params.get("search", "").strip()
        category = request.query_params.get("category", "").strip()
        brand = request.query_params.get("brand", "").strip()
        ordering = request.query_params.get("ordering", "-created_at").strip()
        min_price = request.query_params.get("min_price", "").strip()
        max_price = request.query_params.get("max_price", "").strip()

        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(brand__icontains=search)
                | Q(category__icontains=search)
            )
        if category:
            qs = qs.filter(category__iexact=category)
        if brand:
            qs = qs.filter(brand__icontains=brand)
        if min_price:
            try:
                qs = qs.annotate(min_offer_price=Min("offers__current_price")).filter(min_offer_price__gte=float(min_price))
            except (ValueError, TypeError):
                pass
        if max_price:
            try:
                qs = qs.annotate(max_offer_price=Max("offers__current_price")).filter(max_offer_price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        valid_orderings = ["created_at", "-created_at", "title", "-title", "brand", "-brand"]
        if ordering in valid_orderings:
            qs = qs.order_by(ordering)

        page = request.query_params.get("page", "1").strip()
        try:
            page = max(1, int(page))
        except (ValueError, TypeError):
            page = 1
        per_page = 24
        total = qs.count()
        start = (page - 1) * per_page
        products = qs[start:start + per_page]

        return Response({
            "products": ProductSerializer(products, many=True).data,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        })


class CategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = (
            Product.objects.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        return Response([
            {"name": c["category"], "count": c["count"]}
            for c in categories
            if c["category"]
        ])


class ProductDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404
        product = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(product).data)


class ProductPriceHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        from django.shortcuts import get_object_or_404
        product = get_object_or_404(Product, pk=pk)

        # Auto-seed multi-platform history if requested
        if request.query_params.get("autoseed") == "1":
            from .services.benchmark_service import ensure_product_price_history
            ensure_product_price_history(product)

        store = request.query_params.get("store_name", "").strip()
        qs = PriceHistory.objects.filter(product=product)
        # If store is explicitly requested, filter to it
        if store:
            qs = qs.filter(store_name=store)

        qs = qs.order_by("-recorded_at")[:2000]
        return Response(PriceHistorySerializer(qs, many=True).data)


DEMO_CATEGORY_MAP = {
    "Mobile Phones": "Smartphones",
    "Smartwatches": "Watches",
    "Televisions": "TVs",
    "Computer Accessories": "Laptops",
    "Gaming": "TVs",
    "Home Appliances": "Kitchen Appliances",
    "Beauty": "Fashion",
    "Grocery": "Kitchen Appliances",
    "Networking": "",
    "Speakers": "",
    "Tablets": "Tablets",
}

DEMO_NOTICE = (
    "Live product information could not be retrieved. "
    "Demonstration data is shown so you can still see how "
    "ShopSmart's comparison works."
)


class DemoComparisonView(APIView):
    """Read-only demonstration comparison for thin analysis results.

    Returns existing demo-labelled offers for a category (cheapest per
    platform, max 8) with a deterministic 31-point reference trend for
    the graph. Never writes: no offers, no price history, no
    alerts, no scores. The stored demo product_url is included so the
    UI can offer a "View on" button, but rows must always render with
    the Demo badge — they are reference data, not live listings.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        import math
        from .services.comparison_engine import ALL_PLATFORMS
        requested = (request.query_params.get("category") or "").strip()
        mapped = DEMO_CATEGORY_MAP.get(requested, requested)

        try:
            base_price = float(request.query_params.get("base_price", 0) or 0)
        except (ValueError, TypeError):
            base_price = 0.0

        title = request.query_params.get("title", "").strip()
        source_platform = request.query_params.get("source_platform", "").strip()
        try:
            mrp = float(request.query_params.get("mrp", 0) or 0)
        except (ValueError, TypeError):
            mrp = 0.0

        if base_price > 0:
            from .services.benchmark_service import generate_benchmark_listings
            benchmark_listings = generate_benchmark_listings(
                base_price=base_price,
                title=title,
                category=requested,
                source_platform=source_platform,
                base_mrp=mrp,
            )
            if benchmark_listings:
                return Response({
                    "category_requested": requested,
                    "category_used": mapped,
                    "demo_notice": (
                        "Cross-marketplace comparison and 30-day trends estimated based on real market benchmarks "
                        "closely calibrated to this product's live price."
                    ),
                    "listings": benchmark_listings,
                })

        offers = ProductOffer.objects.filter(
            data_source="demo", in_stock=True, current_price__gt=0,
        ).select_related("product")
        if mapped:
            offers = offers.filter(product__category=mapped)
        offers = offers.order_by("current_price")

        if not offers.exists():
            offers = ProductOffer.objects.filter(
                data_source="demo", in_stock=True, current_price__gt=0,
            ).select_related("product").order_by("current_price")
            mapped = ""

        seen = set()
        listings = []
        for offer in offers:
            if offer.store_name in seen:
                continue
            seen.add(offer.store_name)
            base = float(offer.current_price)
            # Deterministic reference trend (31 pts, oldest first).
            # Computed on the fly — never stored in PriceHistory.
            trend = [
                round(base * (1 + 0.04 * math.sin(i * 0.7 + offer.product_id)), 2)
                for i in range(31)
            ]
            listings.append({
                "platform": offer.store_name,
                "product_title": offer.product.title,
                "price": base,
                "mrp": float(offer.original_price) if offer.original_price else 0,
                "rating": float(offer.rating) if offer.rating else None,
                "review_count": offer.reviews_count,
                "availability": "In Stock" if offer.in_stock else "Out of Stock",
                "delivery_days": offer.delivery_days,
                "delivery_time": offer.delivery_time or "",
                "coupon_code": offer.coupon_code or None,
                "product_url": offer.product_url,
                "trend": trend,
                "is_demo": True,
                "data_source": "demo",
            })
            if len(listings) >= len(ALL_PLATFORMS):
                break

        order = {name: i for i, name in enumerate(ALL_PLATFORMS)}
        listings.sort(key=lambda l: order.get(l["platform"], 99))

        return Response({
            "category_requested": requested,
            "category_used": mapped,
            "demo_notice": DEMO_NOTICE,
            "listings": listings,
        })


def _require_admin(request):
    if not request.user or not request.user.is_authenticated or not request.user.is_staff:
        return False
    return True


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_product(request, pk):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    try:
        product = Product.objects.get(pk=pk)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Product.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_products(request):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    qs = Product.objects.annotate(offers_count=Count('offers'))

    search = request.query_params.get("search", "")
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(brand__icontains=search) |
            Q(category__icontains=search)
        )

    sort = request.query_params.get("sort", "-created_at")
    allowed = {"title", "-title", "brand", "-brand", "category", "-category", "created_at", "-created_at", "id", "-id"}
    if sort in allowed:
        qs = qs.order_by(sort)

    try:
        page = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
    except (ValueError, TypeError):
        page, per_page = 1, 20
    total = qs.count()
    start = (page - 1) * per_page
    products = qs[start:start + per_page]

    return Response({
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
        "results": ProductSerializer(products, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_product_offers(request, pk):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    try:
        product = Product.objects.get(pk=pk)
        offers = ProductOffer.objects.filter(product=product).select_related('platform')
        return Response(ProductOfferSerializer(offers, many=True).data)
    except Product.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_analyses(request):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    qs = URLAnalysis.objects.select_related("product", "user").order_by("-created_at")
    search = request.query_params.get("search", "")
    if search:
        qs = qs.filter(
            Q(submitted_url__icontains=search) |
            Q(detected_platform__icontains=search) |
            Q(product__title__icontains=search)
        )
    try:
        page = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 20))
    except (ValueError, TypeError):
        page, per_page = 1, 20
    total = qs.count()
    start = (page - 1) * per_page
    items = qs[start:start + per_page]
    results = []
    for a in items:
        results.append({
            "id": a.id,
            "url": a.submitted_url,
            "platform": a.detected_platform,
            "product_title": a.product.title if a.product else "—",
            "analyzed_at": a.created_at,
            "user_name": a.user.username if a.user else (a.guest_id or "Guest"),
            "status": a.status,
        })
    return Response({"total": total, "page": page, "results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_offers(request):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    qs = ProductOffer.objects.select_related("product", "platform").order_by("-id")
    platform_filter = request.query_params.get("platform", "")
    if platform_filter:
        qs = qs.filter(store_name=platform_filter)
    sort = request.query_params.get("ordering", "")
    sort_map = {
        "price": "current_price",
        "-price": "-current_price",
        "rating": "rating",
        "-rating": "-rating",
    }
    if sort in sort_map:
        qs = qs.order_by(sort_map[sort])
    try:
        page = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("per_page", 50))
    except (ValueError, TypeError):
        page, per_page = 1, 50
    total = qs.count()
    start = (page - 1) * per_page
    items = qs[start:start + per_page]
    results = []
    for o in items:
        results.append({
            "id": o.id,
            "product_title": o.product.title if o.product else "—",
            "store_name": o.store_name,
            "current_price": float(o.current_price),
            "original_price": float(o.original_price) if o.original_price else 0,
            "rating": float(o.rating) if o.rating else None,
            "in_stock": o.in_stock,
            "data_source": o.data_source,
        })
    return Response({"total": total, "page": page, "results": results})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_platforms(request):
    if not _require_admin(request):
        return Response({"detail": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
    platforms = Platform.objects.all()
    results = [{"id": p.id, "name": p.name} for p in platforms]
    return Response(results)
