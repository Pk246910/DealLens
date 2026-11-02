"""Automated test suite verifying DealLens URL Analyzer accuracy and security.

Covers all 22 required scenarios:
 1. Correct product title and price.
 2. Missing price.
 3. Missing title.
 4. Incorrect or unrelated price in HTML.
 5. Crossed-out price versus current selling price.
 6. EMI amount mistakenly detected as the product price.
 7. Wrong product variant separation.
 8. Product title / identity mismatch.
 9. JavaScript-rendered product information (browser fallback).
10. HTTP 403 or 429 response.
11. HTTP 404 response.
12. Timeout.
13. Malformed HTML.
14. CAPTCHA or access-denied page.
15. Stale database price preservation (no masquerading as fresh).
16. Failed extraction with an existing database record.
17. Unsupported marketplace.
18. Invalid or unsafe URL (SSRF localhost / private IP).
19. Redirect to a private or internal address.
20. Invalid or missing product image.
21. Repeated extraction of the same URL (caching).
22. Regression tests for existing working functionality.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch
import requests

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from products.models import Product, ProductOffer, PriceHistory, URLAnalysis
from products.services.extract.adapters._common import run_standard
from products.services.extract.base import (
    CONFIDENCE_FAILED,
    CONFIDENCE_HIGH,
    ExtractedProduct,
)
from products.services.extract.pipeline import extract_product
from products.services.extract.registry import detect_platform, get_adapter
from products.services.extract.validator import (
    clean_price_string,
    clean_rating,
    clean_review_count,
    validate_image_url,
    verify_product_identity,
)
from products.services.security import (
    SecurityValidationError,
    is_allowed_domain,
    is_ip_private_or_reserved,
    safe_http_fetch,
    validate_url_security,
)
from products.services.url_analyzer import URLAnalyzer
from products.views import AnalyzeURLView

FETCH_MOCK = "products.services.extract.adapters._common.fetch"
BROWSER_AVAIL_MOCK = "products.services.extract.adapters._common.browser_available"
BROWSER_RENDER_MOCK = "products.services.extract.adapters._common.browser_render"


class URLAnalyzerAccuracyAndSecurityTests(TestCase):

    # 1. Correct product title and price
    @patch(FETCH_MOCK)
    def test_01_correct_product_title_and_price(self, mock_fetch):
        html = """
        <html>
          <head><title>Apple iPhone 15 (128 GB) - Black</title></head>
          <body>
            <h1 id="productTitle">Apple iPhone 15 (128 GB) - Black</h1>
            <div id="corePriceDisplay_desktop_feature_div">
              <span class="a-price aok-align-center">
                <span class="a-offscreen">₹65,999.00</span>
              </span>
              <span class="a-price a-text-price">
                <span class="a-offscreen">₹79,900.00</span>
              </span>
            </div>
          </body>
        </html>
        """
        mock_fetch.return_value = html
        adapter = get_adapter("Amazon")
        result = adapter.extract("https://www.amazon.in/dp/B0CHX1W1XY")
        self.assertEqual(result.product_name, "Apple iPhone 15 (128 GB) - Black")
        self.assertEqual(result.price, 65999.0)
        self.assertEqual(result.original_price, 79900.0)
        self.assertTrue(result.field_status["price"]["verified"])

    # 2. Missing price
    @patch(FETCH_MOCK)
    @patch(BROWSER_AVAIL_MOCK, return_value=False)
    def test_02_missing_price(self, mock_browser, mock_fetch):
        html = """
        <html>
          <body>
            <h1 id="productTitle">Out of Stock Vintage Camera</h1>
            <div id="availability">Currently unavailable.</div>
          </body>
        </html>
        """
        mock_fetch.return_value = html
        adapter = get_adapter("Amazon")
        result = adapter.extract("https://www.amazon.in/dp/B000000000")
        self.assertEqual(result.product_name, "Out of Stock Vintage Camera")
        self.assertIsNone(result.price)
        self.assertTrue(result.is_partial)
        self.assertFalse(result.field_status["price"]["verified"])

    # 3. Missing title
    @patch(FETCH_MOCK)
    @patch(BROWSER_AVAIL_MOCK, return_value=False)
    def test_03_missing_title(self, mock_browser, mock_fetch):
        html = """
        <html>
          <body>
            <div class="Nx9bqj">₹1,999</div>
          </body>
        </html>
        """
        mock_fetch.return_value = html
        adapter = get_adapter("Flipkart")
        result = adapter.extract("https://www.flipkart.com/p/itm123?pid=XYZ")
        self.assertIsNone(result.product_name)
        self.assertFalse(result.success)
        self.assertEqual(result.confidence, CONFIDENCE_FAILED)

    # 4. Incorrect or unrelated price in HTML
    def test_04_incorrect_or_unrelated_price_in_html(self):
        # Battery specs, RAM specs, or pincodes should not be extracted as selling price
        text_with_battery = "5000 mAh Battery Phone"
        self.assertIsNone(clean_price_string("5000 mAh"))
        self.assertIsNone(clean_price_string("Pin code 560001"))
        self.assertEqual(clean_price_string("₹12,499 (Includes 5000mAh Battery)"), 12499.0)

    # 5. Crossed-out price versus current selling price
    @patch(FETCH_MOCK)
    def test_05_crossed_out_price_vs_current_price(self, mock_fetch):
        html = """
        <html>
          <body>
            <span class="VU-ZEz">Sony WH-1000XM5 Wireless Headphones</span>
            <div class="yRaY8j Z3DfBu">₹34,990</div>
            <div class="Nx9bqj _4b5DiR">₹26,990</div>
          </body>
        </html>
        """
        mock_fetch.return_value = html
        adapter = get_adapter("Flipkart")
        result = adapter.extract("https://www.flipkart.com/sony-headphones/p/itm123?pid=AUD123")
        self.assertEqual(result.price, 26990.0)
        self.assertEqual(result.original_price, 34990.0)
        self.assertLess(result.price, result.original_price)

    # 6. EMI amount mistakenly detected as product price
    def test_06_emi_amount_not_detected_as_price(self):
        self.assertIsNone(clean_price_string("EMI starting at ₹2,150/month"))
        self.assertIsNone(clean_price_string("No Cost EMI from ₹1,499 per month"))
        self.assertIsNone(clean_price_string("₹3,250/mo for 12 months"))
        # Valid price alongside EMI message
        parsed = clean_price_string("₹48,999 (EMI starts at ₹2,400/mo)")
        self.assertIsNone(parsed)  # The string contains EMI indicator, rejected as ambiguous

    # 7. Wrong product variant separation
    def test_07_variant_separation(self):
        from products.services.comparison_engine import extract_key_attributes, compute_match_score
        attrs_256 = extract_key_attributes("Samsung Galaxy S24 Ultra 5G (256GB, Titanium Black)")
        attrs_512 = extract_key_attributes("Samsung Galaxy S24 Ultra 5G (512GB, Titanium Black)")
        self.assertEqual(attrs_256.get("storage"), "256GB")
        self.assertEqual(attrs_512.get("storage"), "512GB")
        score = compute_match_score(attrs_256, attrs_512)
        # Different storage must penalize match score
        self.assertLess(score, 80.0)

    # 8. Product title / identity mismatch
    def test_08_product_title_mismatch(self):
        url = "https://www.amazon.in/Apple-iPhone-16-128-GB/dp/B0DGJ9N123"
        extracted_unrelated = "boAt Airdopes 141 Bluetooth Truly Wireless Earbuds"
        check = verify_product_identity(url, extracted_unrelated, extracted_id="B099999999")
        self.assertFalse(check["verified"])

    # 9. JavaScript-rendered product information (browser fallback)
    @patch(FETCH_MOCK)
    @patch(BROWSER_AVAIL_MOCK, return_value=True)
    @patch(BROWSER_RENDER_MOCK)
    def test_09_javascript_rendered_product_browser_fallback(self, mock_render, mock_avail, mock_fetch):
        # Initial HTTP fetch returns shell with title but missing JS price
        shell_html = "<html><head><title>JS Store</title></head><body><h1 class='pdp-title'>Croma 4K Smart TV</h1></body></html>"
        mock_fetch.return_value = shell_html

        # Rendered browser returns HTML with dynamically injected price
        rendered_html = """
        <html>
          <body>
            <h1 class="pdp-title">Croma 4K Smart TV</h1>
            <span class="amount">₹32,990</span>
          </body>
        </html>
        """
        mock_render.return_value = {"html": rendered_html, "blocked": False, "reason": ""}

        adapter = get_adapter("Croma")
        result = adapter.extract("https://www.croma.com/croma-4k-tv/p/245678")
        self.assertEqual(result.product_name, "Croma 4K Smart TV")
        self.assertEqual(result.price, 32990.0)
        self.assertEqual(result.extraction_method, "browser")

    # 10. HTTP 403 or 429 response
    @patch("products.services.extract.http.safe_http_fetch")
    def test_10_http_403_and_429_handling(self, mock_http):
        mock_resp_403 = MagicMock()
        mock_resp_403.status_code = 403
        mock_http.side_effect = requests.exceptions.HTTPError(response=mock_resp_403)
        from products.services.extract.http import fetch
        from products.services.product_extractor import ExtractionError
        with self.assertRaises(ExtractionError) as ctx:
            fetch("https://www.amazon.in/dp/B0CQYGPQPF")
        self.assertIn("HTTP 403", str(ctx.exception))

        mock_resp_429 = MagicMock()
        mock_resp_429.status_code = 429
        mock_http.side_effect = requests.exceptions.HTTPError(response=mock_resp_429)
        with self.assertRaises(ExtractionError) as ctx:
            fetch("https://www.amazon.in/dp/B0CQYGPQPF")
        self.assertIn("HTTP 429", str(ctx.exception))

    # 11. HTTP 404 response
    @patch("products.services.extract.http.safe_http_fetch")
    def test_11_http_404_response(self, mock_http):
        mock_resp_404 = MagicMock()
        mock_resp_404.status_code = 404
        mock_http.side_effect = requests.exceptions.HTTPError(response=mock_resp_404)
        from products.services.extract.http import fetch
        from products.services.product_extractor import ExtractionError
        with self.assertRaises(ExtractionError) as ctx:
            fetch("https://www.flipkart.com/x/p/itm123?pid=NOTFOUND")
        self.assertIn("HTTP 404", str(ctx.exception))

    # 12. Timeout
    @patch("products.services.extract.http.safe_http_fetch")
    def test_12_timeout_handling(self, mock_http):
        mock_http.side_effect = requests.exceptions.Timeout("Request timed out")
        from products.services.extract.http import fetch
        from products.services.product_extractor import ExtractionError
        with self.assertRaises(ExtractionError) as ctx:
            fetch("https://www.croma.com/slow-item/p/12345")
        self.assertIn("timed out", str(ctx.exception).lower())

    # 13. Malformed HTML
    @patch(FETCH_MOCK)
    def test_13_malformed_html(self, mock_fetch):
        broken_html = "<html><body><h1>Broken Item<div><span class='Nx9bqj'>₹499</span"
        mock_fetch.return_value = broken_html
        adapter = get_adapter("Flipkart")
        result = adapter.extract("https://www.flipkart.com/item/p/itm1?pid=ABC")
        self.assertEqual(result.price, 499.0)

    # 14. CAPTCHA or access-denied page
    @patch(FETCH_MOCK)
    @patch(BROWSER_AVAIL_MOCK, return_value=True)
    @patch(BROWSER_RENDER_MOCK)
    def test_14_captcha_blocked_page(self, mock_render, mock_avail, mock_fetch):
        captcha_html = """
        <html>
          <head><title>Robot Check</title></head>
          <body>Enter the characters you see below: captcha verification required</body>
        </html>
        """
        mock_fetch.return_value = captcha_html
        mock_render.return_value = {"html": None, "blocked": True, "reason": "anti-bot barrier detected (captcha)"}
        adapter = get_adapter("Amazon")
        result = adapter.extract("https://www.amazon.in/dp/B0CQYGPQPF")
        self.assertFalse(result.success)
        self.assertEqual(result.confidence, CONFIDENCE_FAILED)
        self.assertIn("captcha", result.reason.lower())

    # 15. Stale database price (not masquerading as live)
    def test_15_stale_database_price_preserves_timestamp(self):
        past_time = timezone.now() - timezone.timedelta(days=45)
        product = Product.objects.create(title="Legacy Tablet", category="Tablets")
        offer = ProductOffer.objects.create(
            product=product,
            store_name="Amazon",
            current_price=Decimal("15000"),
            product_url="https://www.amazon.in/dp/B0LEGACY01",
            data_source="dataset",
        )
        ProductOffer.objects.filter(pk=offer.pk).update(updated_at=past_time, created_at=past_time)

        view = AnalyzeURLView()
        fallback = view._fallback_to_database("https://www.amazon.in/dp/B0LEGACY01", "Amazon")
        self.assertIsNotNone(fallback)
        self.assertEqual(fallback["price"], 15000.0)
        self.assertEqual(fallback["data_source"], "dataset")
        # Ensure timestamp is preserved and not updated to today
        self.assertIn(past_time.strftime("%Y-%m-%d"), fallback["last_updated"])

    # 16. Failed extraction with an existing database record
    def test_16_failed_extraction_with_existing_database_record(self):
        product = Product.objects.create(title="Historical Laptop", category="Laptops")
        ProductOffer.objects.create(
            product=product,
            store_name="Reliance Digital",
            current_price=Decimal("42999"),
            product_url="https://www.reliancedigital.in/p/49123456",
            data_source="dataset",
        )
        view = AnalyzeURLView()
        with patch("products.services.extract.pipeline.extract_product") as mock_extract:
            mock_res = ExtractedProduct(platform="Reliance Digital", product_name=None, reason="HTTP 403")
            mock_extract.return_value = mock_res
            fallback = view._fallback_to_database("https://www.reliancedigital.in/p/49123456", "Reliance Digital")
            self.assertIsNotNone(fallback)
            self.assertEqual(fallback["price"], 42999.0)

    # 17. Unsupported marketplace
    def test_17_unsupported_marketplace(self):
        detect = URLAnalyzer.detect_platform("https://www.ebay.com/itm/123456", allow_universal=False)
        self.assertFalse(detect["supported"])
        self.assertIn("not supported", detect["error"])

    # 18. Invalid or unsafe URL (SSRF localhost / private IP)
    def test_18_ssrf_localhost_and_private_ip(self):
        with self.assertRaises(SecurityValidationError):
            validate_url_security("http://localhost:8000/api/secret")
        with self.assertRaises(SecurityValidationError):
            validate_url_security("http://127.0.0.1:9000/")
        with self.assertRaises(SecurityValidationError):
            validate_url_security("http://169.254.169.254/latest/meta-data/")
        with self.assertRaises(SecurityValidationError):
            validate_url_security("http://192.168.1.100/admin")
        with self.assertRaises(SecurityValidationError):
            validate_url_security("http://10.0.0.1/")

    # 19. Redirect to a private or internal address
    @patch("products.services.security.requests.Session")
    def test_19_redirect_to_private_ip_blocked(self, mock_session_cls):
        mock_sess = MagicMock()
        mock_session_cls.return_value = mock_sess

        # First request redirects to internal IP 192.168.1.1
        mock_resp_1 = MagicMock()
        mock_resp_1.is_redirect = True
        mock_resp_1.status_code = 302
        mock_resp_1.headers = {"Location": "http://192.168.1.1/secret"}

        mock_sess.get.return_value = mock_resp_1

        with self.assertRaises(SecurityValidationError):
            safe_http_fetch("https://www.amazon.in/dp/B0CQYGPQPF")

    # 20. Invalid or missing product image
    def test_20_invalid_or_missing_product_image(self):
        self.assertIsNone(validate_image_url(""))
        self.assertIsNone(validate_image_url(None))
        self.assertIsNone(validate_image_url("https://images.amazon.com/images/G/01/x-locale/common/grey-pixel.gif"))
        self.assertIsNone(validate_image_url("https://example.com/1x1.png"))
        self.assertEqual(
            validate_image_url("https://m.media-amazon.com/images/I/71xyz.jpg"),
            "https://m.media-amazon.com/images/I/71xyz.jpg",
        )

    # 21. Repeated extraction of the same URL (caching)
    @patch(FETCH_MOCK)
    def test_21_repeated_extraction_uses_cache(self, mock_fetch):
        html = """
        <html><body>
          <h1 id="productTitle">Cached Product</h1>
          <span class="a-price"><span class="a-offscreen">₹999</span></span>
        </body></html>
        """
        mock_fetch.return_value = html
        url = "https://www.amazon.in/dp/B0CACHED01"
        res1 = extract_product(url, "Amazon", refresh=False)
        self.assertEqual(mock_fetch.call_count, 1)

        # Second call within TTL returns cached result without refetching
        res2 = extract_product(url, "Amazon", refresh=False)
        self.assertEqual(mock_fetch.call_count, 1)
        self.assertEqual(res2.product_name, res1.product_name)

    # 22. Regression tests for existing working functionality
    def test_22_regression_supported_platforms_and_adapters(self):
        for name in ["Amazon", "Flipkart", "Myntra", "AJIO", "Meesho", "Croma", "Reliance Digital", "Tata CLiQ"]:
            adapter = get_adapter(name)
            self.assertIsNotNone(adapter, f"Adapter for {name} must exist")
            self.assertEqual(adapter.name, name)
