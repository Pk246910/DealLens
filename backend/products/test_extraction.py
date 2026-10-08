"""Mocked tests for the layered extraction pipeline.

No live websites are touched: HTTP and browser layers are mocked.
Covers: detection, per-platform extraction, JSON-LD, metadata, browser
STOP rules, invalid/unsupported/blocked URLs, partial data, validation,
variant separation, DB fallback, offer URLs, comparison, Best Deal Score.
"""

from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from products.models import Product, ProductOffer
from products.services.extract import detect_platform, get_adapter
from products.services.extract.base import (
    CONFIDENCE_FAILED,
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_MEDIUM,
    ExtractedProduct,
)
from products.services.extract.pipeline import extract_product
from products.services.extract.structured import extract_json_ld, extract_meta
from products.services.product_extractor import ExtractionError, ProductExtractor

AMAZON_HTML = """
<html><head>
<script type="application/ld+json">
{"@context": "https://schema.org", "@type": "Product",
 "name": "Samsung Galaxy S24 5G (Amber Yellow, 8GB, 256GB)",
 "brand": {"@type": "Brand", "name": "Samsung"},
 "sku": "S24-256",
 "image": ["https://m.media-amazon.com/images/I/test.jpg"],
 "offers": {"@type": "Offer", "price": "62000", "priceCurrency": "INR",
            "availability": "https://schema.org/InStock",
            "url": "https://www.amazon.in/dp/B0CQYGPQPF"},
 "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.5",
                     "reviewCount": "2345"}}
</script>
</head><body>
<h1><span id="productTitle">Samsung Galaxy S24 5G (Amber Yellow, 8GB, 256GB)</span></h1>
<span class="a-price"><span class="a-offscreen">₹61,999</span></span>
</body></html>
"""

FLIPKART_HTML = """
<html><body>
<span class="VU-ZEz">Samsung Galaxy S24 5G (8GB, 256GB)</span>
<div class="Nx9bqj _4b5DiR">₹63,999</div>
<div class="yRaY8j Z3DfBu">₹79,999</div>
<div class="XQDdHH _1QuN7K">4.4</div>
<span class="Wphh3N">1,987 Ratings</span>
<img class="_396cs4 _3n0Glp" src="https://rukminim1.flixcart.com/image/test.jpg">
</body></html>
"""

META_HTML = """
<html><head>
<meta property="og:title" content="OnePlus 12R (Cool Blue, 8GB, 128GB)">
<meta property="og:image" content="https://m.media-amazon.com/images/I/one.jpg">
<meta property="product:price:amount" content="39999">
<meta property="product:price:currency" content="INR">
</head><body><p>shell</p></body></html>
"""

TITLE_ONLY_HTML = "<html><body><h1>Test Gadget Pro</h1><p>no price here</p></body></html>"

BLOCKED_HTML = """
<html><head><title>Robot Check</title></head>
<body><p>Enter the characters you see below, captcha verification required.</p></body></html>
"""

EMPTY_SHELL = "<html><head><title>Buy Products Online</title></head><body><div id='root'></div></body></html>"

FETCH = "products.services.extract.adapters._common.fetch"
BROWSER_AVAILABLE = "products.services.extract.adapters._common.browser_available"
BROWSER_RENDER = "products.services.extract.adapters._common.browser_render"


class DetectionTests(TestCase):
    def test_all_platforms_detected(self):
        cases = {
            "https://www.amazon.in/dp/B0CQYGPQPF": "Amazon",
            "https://www.flipkart.com/x/p/itm1?pid=ABC": "Flipkart",
            "https://www.ajio.com/p/123456": "AJIO",
            "https://www.myntra.com/x/123456": "Myntra",
            "https://www.meesho.com/x/12345": "Meesho",
            "https://www.croma.com/x/12345": "Croma",
            "https://www.reliancedigital.in/x/123456": "Reliance Digital",
            "https://www.tatacliq.com/x/12345": "Tata CLiQ",
        }
        for url, platform in cases.items():
            with self.subTest(url=url):
                result = detect_platform(url)
                self.assertTrue(result["valid"])
                self.assertEqual(result["platform"], platform)

    def test_unsupported_website(self):
        result = detect_platform("https://www.example.com/product/1")
        self.assertFalse(result["valid"])
        self.assertIsNone(result["platform"])

    def test_invalid_url(self):
        for bad in ["", "not a url", "ftp://host/x"]:
            with self.subTest(url=bad):
                self.assertFalse(detect_platform(bad)["valid"])

    def test_all_adapters_resolve(self):
        for name in ["Amazon", "Flipkart", "AJIO", "Myntra", "Meesho",
                     "Croma", "Reliance Digital", "Tata CLiQ"]:
            with self.subTest(platform=name):
                adapter = get_adapter(name)
                self.assertIsNotNone(adapter)
                self.assertEqual(adapter.name, name)


class StructuredDataTests(TestCase):
    def test_json_ld_preferred_over_selectors(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(AMAZON_HTML, "html.parser")
        data = extract_json_ld(soup)
        self.assertEqual(data["product_name"], "Samsung Galaxy S24 5G (Amber Yellow, 8GB, 256GB)")
        self.assertEqual(data["price"], 62000.0)
        self.assertEqual(data["currency"], "INR")
        self.assertEqual(data["availability"], "In Stock")
        self.assertEqual(data["rating"], 4.5)
        self.assertEqual(data["review_count"], 2345)

    def test_metadata_extraction(self):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(META_HTML, "html.parser")
        data = extract_meta(soup)
        self.assertEqual(data["product_name"], "OnePlus 12R (Cool Blue, 8GB, 128GB)")
        self.assertEqual(data["price"], 39999.0)


class AdapterTests(TestCase):
    @patch(FETCH, return_value=AMAZON_HTML)
    @patch(BROWSER_AVAILABLE, return_value=False)
    def test_amazon_json_ld(self, *_):
        result = get_adapter("Amazon").extract("https://www.amazon.in/dp/B0CQYGPQPF")
        self.assertTrue(result.success)
        # Structured price wins over the ₹61,999 selector price
        self.assertEqual(result.price, 62000.0)
        self.assertEqual(result.extraction_method, "json_ld")
        self.assertEqual(result.confidence, CONFIDENCE_HIGH)
        self.assertEqual(result.product_id, "B0CQYGPQPF")

    @patch(FETCH, return_value=FLIPKART_HTML)
    @patch(BROWSER_AVAILABLE, return_value=False)
    def test_flipkart_selectors(self, *_):
        result = get_adapter("Flipkart").extract("https://www.flipkart.com/x/p/itm1?pid=ABC")
        self.assertTrue(result.success)
        self.assertEqual(result.price, 63999.0)
        self.assertEqual(result.rating, 4.4)
        self.assertIn(result.extraction_method, ("css_selector", "metadata"))
        self.assertIn(result.confidence, (CONFIDENCE_MEDIUM, CONFIDENCE_HIGH))

    @patch(FETCH, return_value=META_HTML)
    @patch(BROWSER_AVAILABLE, return_value=False)
    def test_metadata_only_is_medium(self, *_):
        result = get_adapter("AJIO").extract("https://www.ajio.com/x/123456")
        self.assertTrue(result.success)
        self.assertEqual(result.extraction_method, "metadata")
        self.assertEqual(result.confidence, CONFIDENCE_MEDIUM)

    @patch(FETCH, return_value=TITLE_ONLY_HTML)
    @patch(BROWSER_AVAILABLE, return_value=False)
    def test_partial_title_only_is_low(self, *_):
        result = get_adapter("Meesho").extract("https://www.meesho.com/x/12345")
        self.assertTrue(result.success)
        self.assertIsNone(result.price)
        self.assertEqual(result.confidence, CONFIDENCE_LOW)

    @patch(FETCH, return_value=EMPTY_SHELL)
    @patch(BROWSER_AVAILABLE, return_value=False)
    def test_empty_shell_fails_gracefully(self, *_):
        result = get_adapter("Croma").extract("https://www.croma.com/x/12345")
        self.assertFalse(result.success)
        self.assertEqual(result.confidence, CONFIDENCE_FAILED)
        self.assertTrue(result.reason)


class FailureModeTests(TestCase):
    def test_http_403_graceful(self):
        from products.services.product_extractor import ExtractionError as EE

        with patch(FETCH, side_effect=EE("Access denied (HTTP 403).")):
            result = get_adapter("Myntra").extract("https://www.myntra.com/x/123456")
        self.assertFalse(result.success)
        self.assertIn("403", result.reason)

    def test_browser_block_stops(self):
        with patch(FETCH, return_value=BLOCKED_HTML), \
             patch(BROWSER_AVAILABLE, return_value=True), \
             patch(BROWSER_RENDER, return_value={
                 "html": None, "blocked": True,
                 "reason": "anti-bot barrier detected (captcha)"}):
            result = get_adapter("Tata CLiQ").extract("https://www.tatacliq.com/x/1")
        self.assertFalse(result.success)
        self.assertIn("captcha", result.reason)

    def test_unsupported_platform_pipeline(self):
        result = extract_product("https://www.example.com/product/1", platform=None)
        self.assertFalse(result.success)

    def test_private_ip_rejected(self):
        with self.assertRaises(ExtractionError):
            ProductExtractor().extract("http://127.0.0.1/admin", "Amazon")


class ValidationTests(TestCase):
    def test_invalid_fields_become_null(self):
        p = ExtractedProduct(platform="Amazon", product_name="  ", price=-5,
                             original_price=10, rating=9.5, review_count=-3,
                             product_url="notaurl", discount_percentage=150)
        nulled = p.validate()
        for f in ("product_name", "price", "rating", "review_count",
                  "product_url", "discount_percentage"):
            self.assertIn(f, nulled)
        self.assertIsNone(p.price)
        self.assertIsNone(p.rating)
        self.assertEqual(p.confidence, CONFIDENCE_FAILED)

    def test_mrp_below_price_nulled(self):
        p = ExtractedProduct(platform="Amazon", product_name="X",
                             price=5000, original_price=4000)
        p.validate()
        self.assertIsNone(p.original_price)
        self.assertEqual(p.price, 5000)


class MatchingTests(TestCase):
    def setUp(self):
        self.p256 = Product.objects.create(
            title="Samsung Galaxy S24 5G (8GB, 256GB)", brand="Samsung",
            category="Smartphones")
        ProductOffer.objects.create(
            product=self.p256, store_name="Amazon", current_price=Decimal("62000"),
            original_price=Decimal("79999"), product_url="https://www.amazon.in/dp/X1",
            in_stock=True, data_source="demo")
        self.p128 = Product.objects.create(
            title="Samsung Galaxy S24 5G (8GB, 128GB)", brand="Samsung",
            category="Smartphones")
        ProductOffer.objects.create(
            product=self.p128, store_name="Flipkart", current_price=Decimal("59000"),
            original_price=Decimal("74999"), product_url="https://www.flipkart.com/p/X2",
            in_stock=True, data_source="demo")

    def test_variant_storage_veto(self):
        from products.services.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        out = engine.find_comparisons({
            "title": "Samsung Galaxy S24 5G (8GB, 256GB)", "brand": "Samsung",
            "platform": "Amazon", "specifications": {}})
        by_platform = {l["platform"]: l for l in out["listings"]}
        # 128GB variant must have NO verified listing — only the
        # explicit "unavailable" placeholder row.
        self.assertEqual(by_platform["Flipkart"]["data_source"], "unavailable")
        self.assertEqual(by_platform["Flipkart"]["source_url"], "")

    def _make_ip18_world(self):
        """iPhone 18 Pro world mirroring production #7569 false matches."""
        ip18 = Product.objects.create(
            title="iPhone 18 Pro (1 TB) - Glacier", brand="Apple",
            category="Smartphones")
        ProductOffer.objects.create(
            product=ip18, store_name="Amazon", current_price=Decimal("239900"),
            original_price=Decimal("259900"),
            product_url="https://www.amazon.in/dp/IP18",
            in_stock=True, data_source="demo")
        pods = Product.objects.create(
            title="Apple AirPods Pro (2nd Gen) USB-C", brand="Apple",
            category="Earbuds")
        ProductOffer.objects.create(
            product=pods, store_name="Meesho", current_price=Decimal("19982"),
            original_price=Decimal("25900"),
            product_url="https://www.meesho.com/airpods-pro",
            in_stock=True, data_source="demo")
        watch = Product.objects.create(
            title="Apple Watch SE (2nd Gen) 40mm GPS Midnight", brand="Apple",
            category="Watches")
        ProductOffer.objects.create(
            product=watch, store_name="Flipkart", current_price=Decimal("30500"),
            original_price=Decimal("32900"),
            product_url="https://www.flipkart.com/p/WATCHSE",
            in_stock=True, data_source="demo")
        ip16 = Product.objects.create(
            title="Apple iPhone 16 128GB Ultramarine", brand="Apple",
            category="Smartphones")
        ProductOffer.objects.create(
            product=ip16, store_name="Croma", current_price=Decimal("72000"),
            original_price=Decimal("79900"),
            product_url="https://www.croma.com/iphone16",
            in_stock=True, data_source="demo")
        pad = Product.objects.create(
            title="Apple iPad Pro M4 11-inch 256GB Space Black", brand="Apple",
            category="Tablets")
        ProductOffer.objects.create(
            product=pad, store_name="Reliance Digital",
            current_price=Decimal("105500"),
            original_price=Decimal("119900"),
            product_url="https://www.reliancedigital.in/ipadpro",
            in_stock=True, data_source="demo")
        return {
            "airpods_url": "https://www.meesho.com/airpods-pro",
            "watch_url": "https://www.flipkart.com/p/WATCHSE",
        }

    def _verified_urls(self, out):
        return {
            l["source_url"] for l in out["listings"]
            if not l.get("is_source") and l.get("data_source") != "unavailable"
        }

    def test_iphone18_vs_airpods_no_match(self):
        urls = self._make_ip18_world()
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "iPhone 18 Pro (1 TB) - Glacier", "brand": "Apple",
            "platform": "Amazon", "specifications": {}})
        self.assertNotIn(urls["airpods_url"], self._verified_urls(out))

    def test_iphone18_vs_watch_no_match(self):
        urls = self._make_ip18_world()
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "iPhone 18 Pro (1 TB) - Glacier", "brand": "Apple",
            "platform": "Amazon", "specifications": {}})
        self.assertNotIn(urls["watch_url"], self._verified_urls(out))

    def test_iphone18_vs_iphone_ipad_no_match(self):
        self._make_ip18_world()
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "iPhone 18 Pro (1 TB) - Glacier", "brand": "Apple",
            "platform": "Amazon", "specifications": {}})
        urls = self._verified_urls(out)
        self.assertNotIn("https://www.croma.com/iphone16", urls)
        self.assertNotIn("https://www.reliancedigital.in/ipadpro", urls)

    def test_same_product_different_formatting_matches(self):
        ultra = Product.objects.create(
            title="Samsung Galaxy S24 Ultra 5G 12GB 256GB Titanium Black",
            brand="Samsung", category="Smartphones")
        ProductOffer.objects.create(
            product=ultra, store_name="Flipkart", current_price=Decimal("129999"),
            original_price=Decimal("134999"),
            product_url="https://www.flipkart.com/p/ULTRA",
            in_stock=True, data_source="demo")
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "Galaxy S24 Ultra (12 GB RAM, 256 GB) Titanium",
            "brand": "Samsung", "platform": "Amazon", "specifications": {}})
        self.assertIn("https://www.flipkart.com/p/ULTRA", self._verified_urls(out))

    def test_missing_attrs_with_strong_evidence_matches(self):
        bare = Product.objects.create(
            title="Galaxy S24", brand="Samsung", category="Smartphones")
        ProductOffer.objects.create(
            product=bare, store_name="Croma", current_price=Decimal("61000"),
            original_price=Decimal("79999"),
            product_url="https://www.croma.com/s24bare",
            in_stock=True, data_source="demo")
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "Samsung Galaxy S24 5G (8GB, 256GB)", "brand": "Samsung",
            "platform": "Amazon", "specifications": {}})
        self.assertIn("https://www.croma.com/s24bare", self._verified_urls(out))

    def test_price_difference_does_not_block_match(self):
        pricey = Product.objects.create(
            title="Samsung Galaxy S24 5G (8GB, 256GB)", brand="Samsung",
            category="Smartphones")
        ProductOffer.objects.create(
            product=pricey, store_name="Meesho", current_price=Decimal("620000"),
            original_price=Decimal("650000"),
            product_url="https://www.meesho.com/s24pricey",
            in_stock=True, data_source="demo")
        from products.services.comparison_engine import ComparisonEngine
        out = ComparisonEngine().find_comparisons({
            "title": "Samsung Galaxy S24 5G (8GB, 256GB)", "brand": "Samsung",
            "platform": "Amazon", "specifications": {}})
        self.assertIn("https://www.meesho.com/s24pricey", self._verified_urls(out))

    def test_same_variant_matches(self):
        from products.services.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        out = engine.find_comparisons({
            "title": "Samsung Galaxy S24 5G Amber Yellow 8GB 256GB",
            "brand": "Samsung", "platform": "Croma", "specifications": {}})
        platforms = [l["platform"] for l in out["listings"]]
        self.assertIn("Amazon", platforms)

    def test_offer_urls_preserved(self):
        from products.services.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        out = engine.find_comparisons({
            "title": "Samsung Galaxy S24 5G (8GB, 256GB)", "brand": "Samsung",
            "platform": "Croma", "specifications": {}})
        for listing in out["listings"]:
            if not listing.get("is_source") and listing.get("data_source") != "unavailable":
                self.assertTrue(listing.get("source_url", "").startswith("http"))

    def test_all_eight_platform_slots(self):
        from products.services.comparison_engine import (
            ALL_PLATFORMS,
            ComparisonEngine,
        )
        engine = ComparisonEngine()
        out = engine.find_comparisons({
            "title": "Samsung Galaxy S24 5G (8GB, 256GB)", "brand": "Samsung",
            "platform": "Croma", "specifications": {}})
        platforms = [l["platform"] for l in out["listings"]]
        for name in ALL_PLATFORMS:
            with self.subTest(platform=name):
                self.assertIn(name, platforms)
        # No fabricated data in unavailable slots
        for listing in out["listings"]:
            if listing.get("data_source") == "unavailable":
                self.assertEqual(listing["price"], 0)
                self.assertEqual(listing["source_url"], "")
                self.assertIsNone(listing["rating"])
                self.assertFalse(listing["in_stock"])
        # matches_found counts verified listings only
        verified = [l for l in out["listings"]
                    if l.get("data_source") != "unavailable"]
        self.assertEqual(out["matches_found"], max(0, len(verified) - 1))


class FallbackAndScoringTests(TestCase):
    def test_db_fallback_exact_url(self):
        from products.views import AnalyzeURLView
        product = Product.objects.create(
            title="Test Phone", brand="Test", category="Other")
        ProductOffer.objects.create(
            product=product, store_name="Amazon", current_price=Decimal("1000"),
            original_price=Decimal("1500"), product_url="https://www.amazon.in/dp/ZZZ",
            rating=Decimal("4.0"), reviews_count=10, in_stock=True,
            data_source="demo")
        view = AnalyzeURLView()
        found = view._fallback_to_database("https://www.amazon.in/dp/ZZZ", "Amazon")
        self.assertIsNotNone(found)
        self.assertEqual(found["price"], 1000.0)

    def test_best_deal_score_deterministic(self):
        from products.services.ai_analysis import AIAnalysisService
        svc = AIAnalysisService()
        normalized = {"title": "T", "brand": "B", "category": "Other",
                      "price": 1000, "mrp": 1500, "rating": 4.0}
        comparison = {"matches_found": 1, "listings": [
            {"platform": "Amazon", "price": 1000, "mrp": 1500, "rating": 4.0,
             "review_count": 100, "in_stock": True, "delivery_days": 3,
             "data_source": "demo"}]}
        first = svc.analyze(normalized, comparison)["deal_score"]
        second = svc.analyze(normalized, comparison)["deal_score"]
        self.assertEqual(first, second)

    def test_legacy_facade_contract(self):
        with patch(FETCH, return_value=AMAZON_HTML):
            out = ProductExtractor().extract(
                "https://www.amazon.in/dp/B0CQYGPQPF", "Amazon")
        for key in ("title", "brand", "category", "price", "mrp", "rating",
                    "platform", "source_url", "data_source"):
            self.assertIn(key, out)
        self.assertEqual(out["price"], 62000.0)

    def test_legacy_facade_raises_on_empty(self):
        with patch(FETCH, return_value=EMPTY_SHELL), \
             patch(BROWSER_AVAILABLE, return_value=False):
            with self.assertRaises(ExtractionError):
                ProductExtractor().extract("https://www.croma.com/x/1", "Croma")


class OfficialApiTests(TestCase):
    AMAZON_URL = "https://www.amazon.in/dp/B0CQYGPQPF"
    FLIPKART_URL = "https://www.flipkart.com/x/p/itm1?pid=MOBABC123"

    def test_missing_creds_skips(self):
        import os
        from unittest.mock import patch as mock_patch
        env = {k: "" for k in ("AMAZON_PAAPI_ACCESS_KEY", "AMAZON_PAAPI_SECRET_KEY",
                               "AMAZON_PARTNER_TAG", "FLIPKART_AFFILIATE_ID",
                               "FLIPKART_AFFILIATE_TOKEN")}
        with mock_patch.dict(os.environ, env, clear=False):
            self.assertIsNone(get_adapter("Amazon").official_api(self.AMAZON_URL))
            self.assertIsNone(get_adapter("Flipkart").official_api(self.FLIPKART_URL))
            # Platforms without a public API always skip
            self.assertIsNone(get_adapter("Myntra").official_api("https://www.myntra.com/x/1"))

    def test_l1_preferred_over_scraping(self):
        from products.services.extract.base import ExtractedProduct
        from products.services.extract.pipeline import extract_product
        stub = ExtractedProduct(platform="Amazon", product_name="L1 Phone",
                                price=50000.0, source="official_api",
                                extraction_method="official_api")
        stub.validate()
        stub.compute_confidence()
        with patch.object(get_adapter("Amazon").__class__, "official_api",
                          return_value=stub), \
             patch(FETCH, side_effect=AssertionError("fetch must not run")):
            result = extract_product(self.AMAZON_URL, "Amazon", refresh=True)
        self.assertTrue(result.success)
        self.assertEqual(result.product_name, "L1 Phone")
        self.assertEqual(result.extraction_method, "official_api")

    def test_flipkart_affiliate_parses(self):
        import os
        from unittest.mock import patch as mock_patch

        payload = {"productBaseInfoV1": {
            "title": "Galaxy S24 5G", "brand": "Samsung", "productId": "MOBABC123",
            "flipkartSpecialPrice": {"amount": 62000, "currency": "inr"},
            "maximumRetailPrice": {"amount": 79999, "currency": "inr"},
            "rating": {"average": 4.5},
            "imageUrls": {"400x400": "https://img.test/s24.jpg"},
            "productUrl": "https://www.flipkart.com/p/MOBABC123",
            "inStock": True,
            "attributes": {"Storage": "256 GB"},
        }}

        class FakeResponse:
            def raise_for_status(self):
                pass

            def json(self):
                return payload

        env = {"FLIPKART_AFFILIATE_ID": "x", "FLIPKART_AFFILIATE_TOKEN": "y"}
        with mock_patch.dict(os.environ, env, clear=False), \
             patch("requests.get", return_value=FakeResponse()):
            result = get_adapter("Flipkart").official_api(self.FLIPKART_URL)
        self.assertIsNotNone(result)
        self.assertTrue(result.success)
        self.assertEqual(result.price, 62000.0)
        self.assertEqual(result.original_price, 79999.0)
        self.assertEqual(result.confidence, "high")

    def test_amazon_paapi_parses(self):
        import os
        from unittest.mock import patch as mock_patch

        payload = {"ItemsResult": {"Items": [{
            "ASIN": "B0CQYGPQPF",
            "DetailPageURL": "https://www.amazon.in/dp/B0CQYGPQPF",
            "ItemInfo": {"Title": {"DisplayValue": "Galaxy S24 5G"},
                         "ByLineInfo": {"Brand": {"DisplayValue": "Samsung"}}},
            "Images": {"Primary": {"Large": {"URL": "https://img.test/a.jpg"}}},
            "Offers": {"Listings": [{
                "Price": {"Amount": 61999.0, "Currency": "INR"},
                "SavingBasis": {"Amount": 79999.0},
                "Availability": {"Message": "In Stock"}}]},
        }]}}

        class FakeResponse:
            def raise_for_status(self):
                pass

            def json(self):
                return payload

        env = {"AMAZON_PAAPI_ACCESS_KEY": "k", "AMAZON_PAAPI_SECRET_KEY": "s",
               "AMAZON_PARTNER_TAG": "t"}
        with mock_patch.dict(os.environ, env, clear=False), \
             patch("requests.post", return_value=FakeResponse()):
            result = get_adapter("Amazon").official_api(self.AMAZON_URL)
        self.assertIsNotNone(result)
        self.assertTrue(result.success)
        self.assertEqual(result.price, 61999.0)
        self.assertEqual(result.product_id, "B0CQYGPQPF")
        self.assertEqual(result.availability, "In Stock")


class DemoComparisonTests(TestCase):
    def setUp(self):
        phone = Product.objects.create(
            title="Demo Phone X", brand="DemoBrand", category="Smartphones")
        ProductOffer.objects.create(
            product=phone, store_name="Amazon", current_price=Decimal("20000"),
            original_price=Decimal("25000"), product_url="https://www.amazon.in/dp/DEMO1",
            rating=Decimal("4.2"), reviews_count=100, in_stock=True,
            data_source="demo", data_status="demonstration")
        ProductOffer.objects.create(
            product=phone, store_name="Flipkart", current_price=Decimal("21000"),
            original_price=Decimal("25000"), product_url="https://www.flipkart.com/p/DEMO1",
            in_stock=True, data_source="demo", data_status="demonstration")

    def test_demo_listings_flagged_and_priced(self):
        from products.models import PriceHistory, ProductOffer
        offers_before = ProductOffer.objects.count()
        history_before = PriceHistory.objects.count()
        response = self.client.get("/api/demo-comparison/", {"category": "Smartphones"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["listings"])
        self.assertLessEqual(len(data["listings"]), 8)
        self.assertIn("Demonstration data", data["demo_notice"])
        for listing in data["listings"]:
            self.assertTrue(listing["is_demo"])
            self.assertGreater(listing["price"], 0)
            self.assertTrue(listing["product_url"].startswith("http"))
            trend = listing["trend"]
            self.assertEqual(len(trend), 31)
            self.assertTrue(all(p > 0 for p in trend))
        # Read-only: nothing persisted
        self.assertEqual(ProductOffer.objects.count(), offers_before)
        self.assertEqual(PriceHistory.objects.count(), history_before)

    def test_demo_category_mapping(self):
        response = self.client.get("/api/demo-comparison/", {"category": "Mobile Phones"})
        data = response.json()
        self.assertEqual(data["category_used"], "Smartphones")
        self.assertTrue(data["listings"])

    def test_demo_unknown_category_falls_back(self):
        response = self.client.get("/api/demo-comparison/", {"category": "Spaceships"})
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data["listings"])


class RecommendationSafetyTests(TestCase):
    def _listing(self, platform, price, score=60, source="demo"):
        return {
            "platform": platform, "price": price, "mrp": price,
            "rating": 4.0, "review_count": 100, "in_stock": price > 0,
            "delivery_days": 3, "data_source": source,
            "coupon_code": None, "coupon_discount": 0,
            "availability": "In Stock" if price > 0 else "Unavailable",
            "score": score,
            "sub_scores": {"warranty": 30, "seller": 50, "freshness": 50},
        }

    def _placeholder(self, platform):
        return {
            "platform": platform, "price": 0, "mrp": 0, "rating": None,
            "review_count": 0, "in_stock": False, "delivery_days": 0,
            "data_source": "unavailable", "coupon_code": None,
            "coupon_discount": 0, "availability": "Unavailable",
            "score": 20, "sub_scores": {"warranty": 30, "seller": 50, "freshness": 50},
        }

    def _categories(self, listings):
        from products.services.ai_analysis import AIAnalysisService
        return AIAnalysisService()._get_recommendation_categories(listings)

    def test_single_verified_no_placeholder_alternative(self):
        cats = self._categories([
            self._listing("Amazon", 239900, score=72),
            self._placeholder("Flipkart"),
            self._placeholder("Croma"),
        ])
        platforms = [c["platform"] for c in cats]
        self.assertNotIn("Flipkart", platforms)
        self.assertNotIn("Croma", platforms)
        for c in cats:
            self.assertGreater(c["price"], 0)
        self.assertFalse([c for c in cats if c["category"] == "Best Alternative"])

    def test_placeholders_only_yield_nothing(self):
        cats = self._categories([
            self._placeholder("Flipkart"), self._placeholder("Croma"),
        ])
        self.assertEqual(cats, [])

    def test_two_verified_alternative_is_verified(self):
        cats = self._categories([
            self._listing("Amazon", 62000, score=80),
            self._listing("Flipkart", 63999, score=75),
            self._placeholder("Croma"),
        ])
        alt = [c for c in cats if c["category"] == "Best Alternative"]
        self.assertEqual(len(alt), 1)
        self.assertEqual(alt[0]["platform"], "Flipkart")
        self.assertGreater(alt[0]["price"], 0)

    def test_verified_scores_unaffected_by_placeholders(self):
        from products.services.ai_analysis import AIAnalysisService
        svc = AIAnalysisService()
        real = [self._listing("Amazon", 62000, score=0)]
        scored_alone = svc._score_all_listings(real)
        scored_mixed = svc._score_all_listings(
            real + [self._placeholder("Flipkart")])
        alone = [l for l in scored_alone if l["platform"] == "Amazon"][0]
        mixed = [l for l in scored_mixed if l["platform"] == "Amazon"][0]
        self.assertEqual(alone["score"], mixed["score"])
        self.assertEqual(alone["sub_scores"], mixed["sub_scores"])


class CouponValidityTests(TestCase):
    def _offer_with_code(self, code="SAVE100"):
        from products.models import Product, ProductOffer
        product = Product.objects.create(
            title="Coupon Test Phone", brand="TestCo", category="Smartphones")
        return ProductOffer.objects.create(
            product=product, store_name="Amazon", current_price=Decimal("10000"),
            original_price=Decimal("12000"), product_url="https://www.amazon.in/dp/CPN1",
            coupon_code=code, coupon_discount=Decimal("500"),
            in_stock=True, data_source="demo")

    def test_unknown_code_stays_visible(self):
        offer = self._offer_with_code("NORECORD")
        self.assertTrue(offer.coupon_is_valid())

    def test_no_code_is_valid(self):
        offer = self._offer_with_code("")
        self.assertTrue(offer.coupon_is_valid())

    def test_expired_coupon_invalid(self):
        from datetime import timedelta
        from django.utils import timezone
        from products.models import Coupon, Platform
        platform, _ = Platform.objects.get_or_create(name="Amazon")
        Coupon.objects.create(
            code="OLD100", platform=platform, discount_amount=Decimal("100"),
            valid_until=timezone.now() - timedelta(days=1), is_active=True)
        offer = self._offer_with_code("OLD100")
        offer.platform = platform
        offer.save()
        self.assertFalse(offer.coupon_is_valid())

    def test_inactive_coupon_invalid(self):
        from products.models import Coupon, Platform
        platform, _ = Platform.objects.get_or_create(name="Amazon")
        Coupon.objects.create(
            code="DEAD100", platform=platform, discount_amount=Decimal("100"),
            is_active=False)
        offer = self._offer_with_code("DEAD100")
        offer.platform = platform
        offer.save()
        self.assertFalse(offer.coupon_is_valid())

    def test_active_unexpired_coupon_valid(self):
        from datetime import timedelta
        from django.utils import timezone
        from products.models import Coupon, Platform
        platform, _ = Platform.objects.get_or_create(name="Amazon")
        Coupon.objects.create(
            code="LIVE100", platform=platform, discount_amount=Decimal("100"),
            valid_from=timezone.now() - timedelta(days=1),
            valid_until=timezone.now() + timedelta(days=30),
            is_active=True)
        offer = self._offer_with_code("LIVE100")
        offer.platform = platform
        offer.save()
        self.assertTrue(offer.coupon_is_valid())

    def test_serializer_exposes_coupon_valid(self):
        res = self.client.get(f"/api/products/{self._offer_with_code('NORECORD').product_id}/")
        self.assertEqual(res.status_code, 200)
        offers = res.json()["offers"]
        self.assertTrue(all("coupon_valid" in o for o in offers))
        self.assertTrue(offers[0]["coupon_valid"])

    def test_engine_listing_carries_coupon_valid(self):
        from products.services.comparison_engine import ComparisonEngine
        offer = self._offer_with_code("NORECORD")
        out = ComparisonEngine().find_comparisons({
            "title": "Coupon Test Phone", "brand": "TestCo",
            "platform": "Flipkart", "specifications": {}})
        rows = [l for l in out["listings"] if l.get("source_url") == offer.product_url]
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["coupon_valid"])
