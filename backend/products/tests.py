"""Comprehensive tests for the DealLens products app.

Run with:  python manage.py test products
"""

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from products.models import Product, ProductOffer, Wishlist, PriceHistory, URLAnalysis


class HealthCheckTests(TestCase):
    def test_health_endpoint(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")


class ProductApiTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            title="Samsung Galaxy S24 Ultra 5G 256GB",
            category="Smartphones",
            brand="Samsung",
        )
        self.amazon_offer = ProductOffer.objects.create(
            product=self.product,
            store_name="Amazon",
            current_price=113000,
            original_price=134999,
            product_url="https://amazon.in/dp/B0CMDL4WPB",
            rating=4.5,
            reviews_count=12500,
            in_stock=True,
            delivery_days=2,
            delivery_time="Free delivery by Tomorrow",
        )
        self.flipkart_offer = ProductOffer.objects.create(
            product=self.product,
            store_name="Flipkart",
            current_price=109999,
            original_price=134999,
            product_url="https://flipkart.com/samsung-galaxy-s24-ultra",
            rating=4.4,
            reviews_count=8500,
            in_stock=True,
            delivery_days=3,
        )

    def test_product_list(self):
        res = self.client.get("/api/products/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        products = body.get("products", body.get("results", body))
        self.assertTrue(len(products) >= 1)

    def test_product_list_search(self):
        res = self.client.get("/api/products/?search=Samsung")
        self.assertEqual(res.status_code, 200)

    def test_product_list_category_filter(self):
        res = self.client.get("/api/products/?category=Smartphones")
        self.assertEqual(res.status_code, 200)

    def test_product_detail(self):
        res = self.client.get(f"/api/products/{self.product.pk}/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], "Samsung Galaxy S24 Ultra 5G 256GB")
        self.assertEqual(data["brand"], "Samsung")
        self.assertEqual(len(data["offers"]), 2)

    def test_product_detail_not_found(self):
        res = self.client.get("/api/products/99999/")
        self.assertEqual(res.status_code, 404)

    def test_product_has_lowest_price(self):
        res = self.client.get(f"/api/products/{self.product.pk}/")
        data = res.json()
        self.assertEqual(float(data["lowest_price"]), 109999)

    def test_product_has_platforms_available(self):
        from products.models import Platform
        amazon = Platform.objects.create(name="Amazon")
        flipkart = Platform.objects.create(name="Flipkart")
        self.amazon_offer.platform = amazon
        self.amazon_offer.save()
        self.flipkart_offer.platform = flipkart
        self.flipkart_offer.save()
        res = self.client.get(f"/api/products/{self.product.pk}/")
        data = res.json()
        platforms = data["platforms_available"]
        self.assertIn("Amazon", platforms)
        self.assertIn("Flipkart", platforms)

    def test_discount_auto_calculated(self):
        self.amazon_offer.refresh_from_db()
        self.assertIsNotNone(self.amazon_offer.discount_percent)
        self.assertGreater(float(self.amazon_offer.discount_percent), 0)

    def test_categories_endpoint(self):
        res = self.client.get("/api/categories/")
        self.assertEqual(res.status_code, 200)
        categories = res.json()
        names = [c["name"] for c in categories]
        self.assertIn("Smartphones", names)

    def test_price_history(self):
        PriceHistory.objects.create(
            product=self.product,
            store_name="Amazon",
            price=115000,
        )
        PriceHistory.objects.create(
            product=self.product,
            store_name="Amazon",
            price=113000,
        )
        res = self.client.get(f"/api/products/{self.product.pk}/history/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)

    def test_price_history_empty(self):
        res = self.client.get(f"/api/products/{self.product.pk}/history/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 0)

    def test_supported_platforms(self):
        res = self.client.get("/api/supported-platforms/")
        self.assertEqual(res.status_code, 200)
        platforms = res.json()
        names = [p["name"] for p in platforms]
        self.assertIn("Amazon", names)
        self.assertIn("Flipkart", names)


class WishlistApiTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(title="Wish Phone", category="Smartphones")
        self.user = User.objects.create_user(username="wishuser", password="pass12345")

    def test_user_wishlist_create(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.post("/api/wishlist/", {"product": self.product.pk}, format="json")
        self.assertIn(res.status_code, (200, 201))

    def test_user_wishlist_duplicate_prevented(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        client.post("/api/wishlist/", {"product": self.product.pk}, format="json")
        res = client.post("/api/wishlist/", {"product": self.product.pk}, format="json")
        self.assertIn(res.status_code, (400, 409))

    def test_anonymous_wishlist_requires_auth(self):
        res = self.client.get("/api/wishlist/")
        self.assertIn(res.status_code, (401, 403))

    def test_guest_wishlist_requires_auth(self):
        res = self.client.post(
            "/api/wishlist/",
            {"product": self.product.pk, "guest_id": "guest_test123"},
            content_type="application/json",
            HTTP_X_GUEST_ID="guest_test123",
        )
        self.assertIn(res.status_code, (401, 403))

    def test_guest_wishlist_list_requires_auth(self):
        res = self.client.get("/api/wishlist/", {"guest_id": "guest_test456"}, HTTP_X_GUEST_ID="guest_test456")
        self.assertIn(res.status_code, (401, 403))


class AnalysisApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_analyze_url_required(self):
        res = self.client.post("/api/analyze-url/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_analyze_url_too_long(self):
        res = self.client.post("/api/analyze-url/", {"url": "https://example.com/" + "a" * 2500}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_analyze_url_invalid_format(self):
        res = self.client.post("/api/analyze-url/", {"url": "not-a-url"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_analyze_url_unsupported_platform(self):
        res = self.client.post("/api/analyze-url/", {"url": "https://example.com/product/123"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_analysis_history(self):
        res = self.client.get("/api/analyses/")
        self.assertEqual(res.status_code, 200)


class AdminApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="admin12345", is_staff=True)
        self.user = User.objects.create_user(username="regular", password="pass12345")

    def test_admin_products_requires_staff(self):
        res = self.client.get("/api/admin/products/")
        self.assertIn(res.status_code, (401, 403))

    def test_admin_products_requires_staff_non_admin(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        res = client.get("/api/admin/products/")
        self.assertEqual(res.status_code, 403)

    def test_admin_products_works_for_admin(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        res = client.get("/api/admin/products/")
        self.assertEqual(res.status_code, 200)


class URLAnalyzerTests(TestCase):
    def test_valid_amazon_url(self):
        from products.services.url_analyzer import URLAnalyzer
        result = URLAnalyzer.detect_platform("https://www.amazon.in/dp/B0CMDL4WPB")
        self.assertTrue(result["valid"])
        self.assertTrue(result["supported"])
        self.assertEqual(result["platform"], "Amazon")

    def test_valid_flipkart_url(self):
        from products.services.url_analyzer import URLAnalyzer
        result = URLAnalyzer.detect_platform("https://www.flipkart.com/samsung-galaxy-s24-ultra/p/itm123")
        self.assertTrue(result["valid"])
        self.assertTrue(result["supported"])

    def test_invalid_url(self):
        from products.services.url_analyzer import URLAnalyzer
        result = URLAnalyzer.detect_platform("not-a-url")
        self.assertTrue(result["valid"])
        self.assertFalse(result["supported"])

    def test_unsupported_platform(self):
        from products.services.url_analyzer import URLAnalyzer
        result = URLAnalyzer.detect_platform("https://www.walmart.com/product/123")
        self.assertTrue(result["valid"])
        self.assertFalse(result["supported"])


class AIAnalysisServiceTests(TestCase):
    def setUp(self):
        from products.services.ai_analysis import AIAnalysisService
        self.ai = AIAnalysisService()

    def test_analyze_returns_score(self):
        product = {
            "title": "Test Phone",
            "brand": "TestBrand",
            "category": "Smartphones",
            "price": 15000,
            "mrp": 20000,
            "rating": 4.2,
            "platform": "Amazon",
        }
        comparison = {
            "listings": [
                {"platform": "Amazon", "price": 15000, "mrp": 20000, "rating": 4.2, "review_count": 1000, "in_stock": True, "coupon_discount": 0, "delivery_days": 2, "data_source": "live", "is_cheapest": True},
                {"platform": "Flipkart", "price": 16000, "mrp": 20000, "rating": 4.0, "review_count": 500, "in_stock": True, "coupon_discount": 0, "delivery_days": 3, "data_source": "live", "is_cheapest": False},
            ],
            "best_price": 15000,
            "price_range": 1000,
            "matches_found": 1,
        }
        result = self.ai.analyze(product, comparison)
        self.assertIn("deal_score", result)
        self.assertGreater(result["deal_score"], 0)
        self.assertLessEqual(result["deal_score"], 100)

    def test_analyze_returns_assessment(self):
        product = {
            "title": "Test Laptop",
            "brand": "Dell",
            "category": "Laptops",
            "price": 55000,
            "mrp": 70000,
            "rating": 4.3,
            "platform": "Flipkart",
        }
        comparison = {
            "listings": [
                {"platform": "Flipkart", "price": 55000, "mrp": 70000, "rating": 4.3, "review_count": 2000, "in_stock": True, "coupon_discount": 500, "delivery_days": 2, "data_source": "live", "is_cheapest": True},
            ],
            "best_price": 55000,
            "price_range": 0,
            "matches_found": 0,
        }
        result = self.ai.analyze(product, comparison)
        self.assertIn("deal_assessment", result)
        self.assertIn("summary", result)
        self.assertIn("pros", result)
        self.assertIn("cons", result)

    def test_sub_scores_are_present(self):
        product = {
            "title": "Test Product",
            "brand": "Brand",
            "category": "Electronics",
            "price": 10000,
            "mrp": 12000,
            "rating": 4.0,
            "platform": "Amazon",
        }
        comparison = {
            "listings": [
                {"platform": "Amazon", "price": 10000, "mrp": 12000, "rating": 4.0, "review_count": 500, "in_stock": True, "coupon_discount": 0, "delivery_days": 2, "data_source": "live", "is_cheapest": True},
            ],
            "best_price": 10000,
            "price_range": 0,
            "matches_found": 0,
        }
        result = self.ai.analyze(product, comparison)
        self.assertIn("scored_listings", result)
        self.assertTrue(len(result["scored_listings"]) > 0)
        listing = result["scored_listings"][0]
        self.assertIn("sub_scores", listing)
        self.assertIn("price", listing["sub_scores"])

    def test_recommendation_categories(self):
        product = {
            "title": "Test",
            "brand": "Brand",
            "category": "Smartphones",
            "price": 20000,
            "mrp": 25000,
            "rating": 4.5,
            "platform": "Amazon",
        }
        comparison = {
            "listings": [
                {"platform": "Amazon", "price": 20000, "mrp": 25000, "rating": 4.5, "review_count": 3000, "in_stock": True, "coupon_discount": 0, "delivery_days": 1, "data_source": "live", "is_cheapest": True},
                {"platform": "Flipkart", "price": 21000, "mrp": 25000, "rating": 4.6, "review_count": 2000, "in_stock": True, "coupon_discount": 0, "delivery_days": 2, "data_source": "live", "is_cheapest": False},
            ],
            "best_price": 20000,
            "price_range": 1000,
            "matches_found": 1,
        }
        result = self.ai.analyze(product, comparison)
        self.assertIn("recommendation_categories", result)
        self.assertTrue(len(result["recommendation_categories"]) > 0)


class CompareEngineTests(TestCase):
    def test_comparison_returns_matches(self):
        from products.services.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        product = Product.objects.create(title="Samsung Galaxy S24", brand="Samsung", category="Smartphones")
        ProductOffer.objects.create(
            product=product, store_name="Amazon", current_price=100000,
            original_price=120000, product_url="https://amazon.in/dp/test1",
            rating=4.5, reviews_count=1000, in_stock=True, data_source="dataset"
        )
        ProductOffer.objects.create(
            product=product, store_name="Flipkart", current_price=95000,
            original_price=120000, product_url="https://flipkart.com/test2",
            rating=4.3, reviews_count=800, in_stock=True, data_source="dataset"
        )
        normalized = {
            "title": "Samsung Galaxy S24 256GB",
            "brand": "Samsung",
            "category": "Smartphones",
            "platform": "Amazon",
            "price": 100000,
            "specifications": {"RAM": "8GB", "Storage": "256GB"},
        }
        result = engine.find_comparisons(normalized)
        self.assertIn("listings", result)
        self.assertIn("matches_found", result)
        self.assertTrue(len(result["listings"]) >= 1)
