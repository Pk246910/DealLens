from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WishlistViewSet,
    GeminiAIReviewView,
    AnalyzeURLView,
    AnalysisHistoryView,
    AnalysisDetailView,
    RecentView,
    MarkAnalysisViewedView,
    ClearRecentHistoryView,
    SupportedPlatformsView,
    ProductDetailView,
    ProductPriceHistoryView,
    ProductCatalogView,
    CategoryListView,
    DemoComparisonView,
    admin_products,
    delete_product,
    admin_product_offers,
    admin_analyses,
    admin_offers,
    admin_platforms,
)

router = DefaultRouter()
router.register(r"wishlist", WishlistViewSet, basename="wishlist")

urlpatterns = [
    path("products/", ProductCatalogView.as_view(), name="product-catalog"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/history/", ProductPriceHistoryView.as_view(), name="product-price-history"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("analyze-url/", AnalyzeURLView.as_view(), name="analyze-url"),
    path("analyses/", AnalysisHistoryView.as_view(), name="analysis-history"),
    path("analyses/<int:pk>/", AnalysisDetailView.as_view(), name="analysis-detail"),
    path("recent/", RecentView.as_view(), name="recent-list"),
    path("recent/<int:pk>/viewed/", MarkAnalysisViewedView.as_view(), name="recent-mark-viewed"),
    path("recent/clear/", ClearRecentHistoryView.as_view(), name="recent-clear"),
    path("supported-platforms/", SupportedPlatformsView.as_view(), name="supported-platforms"),
    path("ai-review/", GeminiAIReviewView.as_view(), name="ai-review"),
    path("demo-comparison/", DemoComparisonView.as_view(), name="demo-comparison"),
    path("admin/products/", admin_products, name="admin-products"),
    path("admin/products/<int:pk>/", delete_product, name="admin-delete-product"),
    path("admin/products/<int:pk>/offers/", admin_product_offers, name="admin-product-offers"),
    path("admin/analyses/", admin_analyses, name="admin-analyses"),
    path("admin/offers/", admin_offers, name="admin-offers"),
    path("admin/platforms/", admin_platforms, name="admin-platforms"),
    path("", include(router.urls)),
]
