from django.db import models
from django.conf import settings
from django.utils import timezone


class Platform(models.Model):
    name = models.CharField(max_length=100, unique=True)
    website_url = models.URLField(max_length=500, blank=True, default="")
    logo_url = models.URLField(max_length=500, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DataSource(models.Model):
    """Tracks where product data originated from."""
    name = models.CharField(max_length=200)
    source_type = models.CharField(max_length=50, choices=[
        ("scrape", "Web Scraping"),
        ("api", "External API"),
        ("seed", "Seed Data"),
        ("user", "User Provided"),
        ("ai", "AI Generated"),
    ])
    platform = models.ForeignKey(Platform, on_delete=models.SET_NULL, null=True, blank=True)
    reliability_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.5)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reliability_score"]

    def __str__(self):
        return f"{self.name} ({self.source_type})"


class Product(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    subcategory = models.CharField(max_length=100, blank=True, default="")
    brand = models.CharField(max_length=100, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    specifications = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProductVariant(models.Model):
    """Tracks distinct variants (size, color, storage, RAM) of a product."""
    product = models.ForeignKey(Product, related_name="variants", on_delete=models.CASCADE)
    variant_name = models.CharField(max_length=255, help_text="E.g. '256GB / Black / 8GB RAM'")
    sku = models.CharField(max_length=100, blank=True, default="")
    storage = models.CharField(max_length=50, blank=True, default="")
    ram = models.CharField(max_length=50, blank=True, default="")
    color = models.CharField(max_length=50, blank=True, default="")
    size = models.CharField(max_length=50, blank=True, default="")
    weight = models.CharField(max_length=50, blank=True, default="")
    specifications = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "variant_name"]
        unique_together = ("product", "variant_name")

    def __str__(self):
        return f"{self.product.title} - {self.variant_name}"


class Seller(models.Model):
    """Represents a seller/store on a platform."""
    name = models.CharField(max_length=200)
    platform = models.ForeignKey(Platform, on_delete=models.SET_NULL, null=True, blank=True)
    seller_url = models.URLField(max_length=500, blank=True, default="")
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    reliability_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.5)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reliability_score", "name"]
        unique_together = ("name", "platform")

    def __str__(self):
        return f"{self.name} ({self.platform.name if self.platform else 'Unknown'})"


class ProductOffer(models.Model):
    DATA_SOURCE_CHOICES = [
        ("dataset", "Dataset / Historical"),
        ("demo", "Demonstration / Reference"),
        ("live", "Live Extraction"),
    ]
    DATA_STATUS_CHOICES = [
        ("verified", "Verified"),
        ("user_provided", "User Provided"),
        ("demonstration", "Demonstration"),
        ("estimated", "Estimated"),
        ("source_unavailable", "Source Unavailable"),
        ("not_verified", "Not Verified"),
    ]
    CONFIDENCE_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
        ("unknown", "Not Enough Information"),
    ]

    product = models.ForeignKey(Product, related_name="offers", on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, related_name="offers", on_delete=models.SET_NULL, null=True, blank=True)
    platform = models.ForeignKey(
        Platform, related_name="offers", on_delete=models.SET_NULL, null=True, blank=True
    )
    seller = models.ForeignKey(Seller, related_name="offers", on_delete=models.SET_NULL, null=True, blank=True)
    store_name = models.CharField(max_length=100)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    reviews_count = models.PositiveIntegerField(default=0)
    coupon_code = models.CharField(max_length=50, blank=True, default="")
    coupon_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_url = models.URLField(max_length=1000)
    in_stock = models.BooleanField(default=True)
    delivery_days = models.PositiveSmallIntegerField(default=3)
    delivery_time = models.CharField(max_length=100, blank=True, default="")
    warranty = models.CharField(max_length=200, blank=True, default="")
    return_policy = models.CharField(max_length=200, blank=True, default="")
    data_source = models.CharField(
        max_length=20, choices=DATA_SOURCE_CHOICES, default="dataset"
    )
    data_status = models.CharField(
        max_length=20, choices=DATA_STATUS_CHOICES, default="demonstration"
    )
    data_freshness = models.DateTimeField(null=True, blank=True, help_text="When was this data last verified?")
    verification_status = models.CharField(
        max_length=20, choices=CONFIDENCE_CHOICES, default="unknown"
    )
    matching_confidence = models.CharField(
        max_length=20, choices=CONFIDENCE_CHOICES, default="unknown",
        help_text="How confident are we this offer matches the same product variant?"
    )
    last_dataset_update = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("product", "store_name")
        ordering = ["current_price"]

    def __str__(self):
        return f"{self.product.title} @ {self.store_name} - Rs.{self.current_price}"

    def save(self, *args, **kwargs):
        if self.original_price and self.current_price and self.original_price > 0:
            try:
                disc = ((self.original_price - self.current_price) / self.original_price) * 100
                self.discount_percent = round(disc, 2)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("ProductOffer discount calculation failed for pk=%s: %s", self.pk, e)
        super().save(*args, **kwargs)

    def coupon_is_valid(self) -> bool:
        """True unless a matching Coupon record says expired/inactive.

        Codes with no Coupon row stay visible (unknown = displayable),
        preserving current UI behavior.
        """
        if not self.coupon_code:
            return True
        try:
            coupons = Coupon.objects.filter(code=self.coupon_code)
            if self.platform_id:
                coupons = coupons.filter(platform=self.platform)
            elif self.store_name:
                coupons = coupons.filter(platform__name=self.store_name)
            coupon = coupons.first()
            if coupon is None:
                return True
            now = timezone.now()
            if not coupon.is_active:
                return False
            if coupon.valid_from and coupon.valid_from > now:
                return False
            if coupon.valid_until and coupon.valid_until < now:
                return False
            return True
        except Exception:
            return True


class PriceHistory(models.Model):
    COLLECTION_METHOD_CHOICES = [
        ("seed", "Seed / Demonstration"),
        ("scrape", "Web Scraping"),
        ("api", "External API"),
        ("user", "User Reported"),
    ]
    product = models.ForeignKey(Product, related_name="price_history", on_delete=models.CASCADE)
    store_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=5, default="INR")
    collection_method = models.CharField(
        max_length=20, choices=COLLECTION_METHOD_CHOICES, default="seed"
    )
    data_status = models.CharField(max_length=20, default="demonstration")
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.product.title} - {self.store_name}: Rs.{self.price}"


class Review(models.Model):
    """Individual product review from a platform."""
    product = models.ForeignKey(Product, related_name="reviews", on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.SET_NULL, null=True, blank=True)
    author_name = models.CharField(max_length=200, blank=True, default="")
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    title = models.CharField(max_length=300, blank=True, default="")
    body = models.TextField(blank=True, default="")
    review_url = models.URLField(max_length=1000, blank=True, default="")
    helpful_count = models.PositiveIntegerField(default=0)
    verified_purchase = models.BooleanField(default=False)
    source_url = models.URLField(max_length=1000, blank=True, default="")
    data_status = models.CharField(max_length=20, default="demonstration")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review by {self.author_name or 'Anonymous'} - {self.product.title[:50]}"


class ReviewSummary(models.Model):
    """AI-generated summary of reviews for a product."""
    product = models.OneToOneField(Product, related_name="review_summary", on_delete=models.CASCADE)
    total_reviews = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    summary = models.TextField(blank=True, default="")
    common_pros = models.JSONField(default=list, blank=True)
    common_cons = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    best_suited_for = models.TextField(blank=True, default="")
    not_recommended_for = models.TextField(blank=True, default="")
    review_confidence = models.CharField(max_length=20, default="unknown")
    ai_provider = models.CharField(max_length=50, blank=True, default="")
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Review summaries"

    def __str__(self):
        return f"Review summary: {self.product.title[:50]}"


class Coupon(models.Model):
    """Tracks available coupons per platform."""
    code = models.CharField(max_length=50)
    platform = models.ForeignKey(Platform, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=300, blank=True, default="")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = (("code", "platform"),)

    def __str__(self):
        return f"{self.code} ({self.platform.name if self.platform else 'Unknown'})"


class ComparisonSession(models.Model):
    """Tracks a user's product comparison session."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="comparison_sessions",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    guest_id = models.CharField(max_length=100, blank=True, null=True)
    source_url = models.URLField(max_length=2000, blank=True, default="")
    product = models.ForeignKey(Product, related_name="comparison_sessions", on_delete=models.SET_NULL, null=True, blank=True)
    compared_offer_ids = models.JSONField(default=list, blank=True)
    result_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.id} - {self.product.title[:40] if self.product else 'Unknown'}"


class SearchHistory(models.Model):
    """Tracks user search queries."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="search_history",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    guest_id = models.CharField(max_length=100, blank=True, null=True)
    query = models.CharField(max_length=500)
    results_count = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Search: {self.query[:50]}"


class AIAnalysis(models.Model):
    """Dedicated model for AI-generated analyses."""
    PROVIDER_CHOICES = [
        ("gemini", "Gemini"),
        ("openai", "OpenAI"),
        ("claude", "Claude"),
        ("ollama", "Ollama"),
        ("local", "Rule-Based Fallback"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="ai_analyses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product = models.ForeignKey(Product, related_name="ai_analyses", on_delete=models.SET_NULL, null=True, blank=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default="gemini")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    analysis_type = models.CharField(max_length=50, default="review", help_text="review, comparison, recommendation")
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    confidence = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    is_fallback = models.BooleanField(default=False, help_text="Was this generated by a fallback provider?")
    error_message = models.TextField(blank=True, default="")
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AI Analysis {self.id}: {self.provider} ({self.status})"


class AIProviderLog(models.Model):
    """Logs every AI provider call for monitoring."""
    provider = models.CharField(max_length=20)
    endpoint = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=[
        ("success", "Success"),
        ("error", "Error"),
        ("timeout", "Timeout"),
        ("rate_limited", "Rate Limited"),
        ("quota_exceeded", "Quota Exceeded"),
    ])
    request_tokens = models.PositiveIntegerField(null=True, blank=True)
    response_tokens = models.PositiveIntegerField(null=True, blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.provider} - {self.status} ({self.created_at})"


class AuditLog(models.Model):
    """Tracks admin and system actions for accountability."""
    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("promote", "Promote"),
        ("demote", "Demote"),
        ("seed", "Seed Database"),
        ("export", "Export"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="audit_logs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100, blank=True, default="")
    object_id = models.PositiveIntegerField(null=True, blank=True)
    object_repr = models.CharField(max_length=300, blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.model_name} by {self.user or 'system'}"


class Wishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="wishlist_items",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    guest_id = models.CharField(max_length=100, blank=True, null=True)
    product = models.ForeignKey(Product, related_name="wishlisted_by", on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-added_at"]
        unique_together = (('user', 'product'),)

    def __str__(self):
        return f"Wishlist: {self.product.title}"


class URLAnalysis(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="url_analyses",
    )
    guest_id = models.CharField(max_length=100, blank=True, null=True)
    submitted_url = models.URLField(max_length=2000)
    detected_platform = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analyses",
    )
    analysis_result = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")
    viewed_at = models.DateTimeField(null=True, blank=True, help_text="When the user last opened this analysis")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Analysis {self.id}: {self.submitted_url[:60]} ({self.status})"
