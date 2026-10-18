import logging
from decimal import Decimal

logger = logging.getLogger(__name__)


def send_price_alert_email(alert, current_lowest_price: Decimal) -> bool:
    from django.core.mail import send_mail
    from django.conf import settings
    from django.template.loader import render_to_string

    user = alert.user
    if not user or not user.email:
        logger.warning("Price alert %s: no user email, skipping", alert.id)
        return False

    product = alert.product
    platform = ""
    product_url = ""
    best_offer = product.offers.filter(in_stock=True).order_by("current_price").first()
    if best_offer:
        platform = best_offer.store_name or ""
        product_url = best_offer.product_url or ""

    subject = f"DealLens Price Alert — {product.title[:60]}"
    context = {
        "user_name": user.first_name or user.username,
        "product_title": product.title,
        "product_category": product.category,
        "platform": platform,
        "target_price": f"{alert.target_price:,.0f}",
        "current_price": f"{current_lowest_price:,.0f}",
        "product_url": product_url,
    }

    try:
        text_body = render_to_string("emails/price_alert.txt", context)
    except Exception:
        text_body = (
            f"Hello {context['user_name']},\n\n"
            f"Your DealLens price alert has been triggered.\n\n"
            f"Product: {context['product_title']}\n"
            f"Platform: {context['platform']}\n"
            f"Target Price: ₹{context['target_price']}\n"
            f"Current Price: ₹{context['current_price']}\n\n"
            f"Your target price has been reached.\n\n"
            f"{'View Product: ' + context['product_url'] if context['product_url'] else ''}\n\n"
            f"Thank you for using DealLens."
        )

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Price alert email sent to %s for alert %s", user.email, alert.id)
        return True
    except Exception as e:
        logger.error("Failed to send price alert email for alert %s: %s", alert.id, str(e)[:200])
        return False
