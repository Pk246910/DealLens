from rest_framework import serializers
from .models import (
    Platform, Product, ProductVariant, ProductOffer, PriceHistory,
    Wishlist, URLAnalysis, Seller, Review, ReviewSummary, Coupon,
    DataSource, ComparisonSession, SearchHistory, AIAnalysis,
    AIProviderLog, AuditLog,
)


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = ["id", "name", "website_url", "logo_url", "is_active"]


class SellerSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.name", read_only=True, default="")

    class Meta:
        model = Seller
        fields = [
            "id", "name", "platform", "platform_name", "seller_url",
            "rating", "reliability_score", "is_verified",
        ]


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id", "product", "variant_name", "sku", "storage", "ram",
            "color", "size", "weight", "specifications", "is_default",
        ]


class ProductOfferSerializer(serializers.ModelSerializer):
    discount = serializers.SerializerMethodField()
    platform_details = PlatformSerializer(source="platform", read_only=True)
    seller_details = SellerSerializer(source="seller", read_only=True)
    data_source_display = serializers.SerializerMethodField()
    data_status_display = serializers.SerializerMethodField()
    coupon_valid = serializers.SerializerMethodField()

    class Meta:
        model = ProductOffer
        fields = [
            "id", "store_name", "current_price", "original_price",
            "discount", "discount_percent",
            "rating", "reviews_count",
            "coupon_code", "coupon_discount", "coupon_valid",
            "product_url", "in_stock", "delivery_days", "delivery_time",
            "warranty", "return_policy",
            "data_source", "data_source_display",
            "data_status", "data_status_display",
            "data_freshness", "verification_status", "matching_confidence",
            "platform", "platform_details",
            "seller", "seller_details",
            "variant", "last_dataset_update", "updated_at", "created_at",
        ]

    def get_coupon_valid(self, obj):
        try:
            return obj.coupon_is_valid()
        except Exception:
            return True

    def get_discount(self, obj):
        if obj.discount_percent is not None:
            return float(obj.discount_percent)
        return None

    def get_data_source_display(self, obj):
        if obj.data_source == "dataset":
            return "Dataset Price"
        elif obj.data_source == "live":
            return "Live Price"
        return obj.data_source

    def get_data_status_display(self, obj):
        labels = {
            "verified": "Verified",
            "user_provided": "User Provided",
            "demonstration": "Demonstration",
            "estimated": "Estimated",
            "source_unavailable": "Source Unavailable",
            "not_verified": "Not Verified",
        }
        return labels.get(obj.data_status, obj.data_status)


class ProductSerializer(serializers.ModelSerializer):
    offers = ProductOfferSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    lowest_price = serializers.SerializerMethodField()
    highest_price = serializers.SerializerMethodField()
    best_offer = serializers.SerializerMethodField()
    platforms_available = serializers.SerializerMethodField()
    review_summary = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "category",
            "subcategory",
            "brand",
            "image_url",
            "description",
            "specifications",
            "variants",
            "lowest_price",
            "highest_price",
            "best_offer",
            "offers",
            "platforms_available",
            "review_summary",
            "created_at",
            "updated_at",
        ]

    def get_lowest_price(self, obj):
        lowest = obj.offers.filter(in_stock=True).order_by("current_price").first()
        return float(lowest.current_price) if lowest else None

    def get_highest_price(self, obj):
        highest = obj.offers.filter(in_stock=True).order_by("-current_price").first()
        return float(highest.current_price) if highest else None

    def get_best_offer(self, obj):
        best = obj.offers.filter(in_stock=True).order_by("current_price").first()
        if best:
            return ProductOfferSerializer(best).data
        return None

    def get_platforms_available(self, obj):
        return list(
            obj.offers.values_list("platform__name", flat=True).distinct()
        )

    def get_review_summary(self, obj):
        try:
            rs = obj.review_summary
            return ReviewSummarySerializer(rs).data
        except ReviewSummary.DoesNotExist:
            return None


class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "guest_id", "product", "product_details", "added_at"]
        read_only_fields = ["id", "added_at"]


class URLAnalysisSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True, default="")
    product_brand = serializers.CharField(source="product.brand", read_only=True, default="")
    product_category = serializers.CharField(source="product.category", read_only=True, default="")
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = URLAnalysis
        fields = [
            "id", "submitted_url", "detected_platform", "status",
            "product", "product_title", "product_brand", "product_image", "product_category",
            "analysis_result", "error_message", "viewed_at", "created_at",
        ]
        read_only_fields = ["id", "status", "detected_platform", "product", "analysis_result", "error_message", "viewed_at", "created_at"]

    def get_product_image(self, obj):
        if obj.product and obj.product.image_url and "placehold.co" not in obj.product.image_url:
            return obj.product.image_url
        result = obj.analysis_result or {}
        p = result.get("product", {})
        img = p.get("image_url", "")
        if img and "placehold.co" not in img:
            return img
        from .services.benchmark_service import resolve_product_image
        return resolve_product_image(
            title=p.get("title") or (obj.product.title if obj.product else ""),
            brand=p.get("brand") or (obj.product.brand if obj.product else ""),
            category=p.get("category") or (obj.product.category if obj.product else ""),
            current_image=img,
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        res = data.get("analysis_result")
        if isinstance(res, dict) and isinstance(res.get("product"), dict):
            prod = res["product"]
            if not prod.get("image_url") or "placehold.co" in prod.get("image_url", ""):
                prod["image_url"] = data.get("product_image") or ""
        return data


class PriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceHistory
        fields = [
            "id", "store_name", "price", "currency",
            "collection_method", "data_status", "recorded_at",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.name", read_only=True, default="")

    class Meta:
        model = Review
        fields = [
            "id", "product", "platform", "platform_name", "author_name",
            "rating", "title", "body", "review_url", "helpful_count",
            "verified_purchase", "source_url", "data_status", "created_at",
        ]


class ReviewSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewSummary
        fields = [
            "id", "product", "total_reviews", "average_rating", "summary",
            "common_pros", "common_cons", "warnings",
            "best_suited_for", "not_recommended_for",
            "review_confidence", "ai_provider", "generated_at",
        ]


class CouponSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source="platform.name", read_only=True, default="")

    class Meta:
        model = Coupon
        fields = [
            "id", "code", "platform", "platform_name", "description",
            "discount_amount", "discount_percent", "min_order_value",
            "max_discount", "valid_from", "valid_until", "is_active",
        ]


class ComparisonSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComparisonSession
        fields = [
            "id", "user", "guest_id", "source_url", "product",
            "compared_offer_ids", "result_snapshot", "created_at",
        ]


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ["id", "user", "guest_id", "query", "results_count", "category", "created_at"]


class AIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAnalysis
        fields = [
            "id", "user", "product", "provider", "status", "analysis_type",
            "input_data", "output_data", "confidence", "is_fallback",
            "error_message", "processing_time_ms", "created_at",
        ]


class AIProviderLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIProviderLog
        fields = [
            "id", "provider", "endpoint", "status", "request_tokens",
            "response_tokens", "response_time_ms", "error_message", "created_at",
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default="system")

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "username", "action", "model_name", "object_id",
            "object_repr", "details", "ip_address", "created_at",
        ]


class DataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = [
            "id", "name", "source_type", "platform", "reliability_score",
            "is_active", "last_used_at", "created_at",
        ]
