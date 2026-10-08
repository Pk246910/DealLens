from django.conf import settings
from django.db import models


class PriceAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="price_alerts",
        null=True,
        blank=True
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="alerts"
    )
    target_price = models.DecimalField(max_digits=10, decimal_places=2)
    active = models.BooleanField(default=True)
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = (('user', 'product'),)

    def __str__(self):
        return f"Alert for {self.product.title} at ₹{self.target_price}"