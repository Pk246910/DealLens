import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, Compass, AlertCircle, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import API from "../api/axios";
import { SkeletonProductCard } from "../components/Skeleton";
import ProductCard from "../components/ProductCard";

const ProductCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, total_pages: 1 });
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Sync local searchInput if url search param changes externally
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentSearch) params.set("search", currentSearch);
      if (currentCategory) params.set("category", currentCategory);
      params.set("page", currentPage.toString());
      const res = await API.get(`/products/?${params.toString()}`);
      const rawProducts = res.data.products || res.data.results || (Array.isArray(res.data) ? res.data : []);
      setProducts(rawProducts);
      setPagination({
        total: res.data.total || res.data.count || rawProducts.length || 0,
        page: res.data.page || currentPage || 1,
        total_pages: res.data.total_pages || (res.data.count ? Math.ceil(res.data.count / 24) : 1),
      });
    } catch {
      setProducts([]);
      setError("Failed to load products. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [currentSearch, currentCategory, currentPage]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await API.get("/categories/");
      const rawCats = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCategories(rawCats);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== "page") next.set("page", "1");
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam("search", searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page-container" style={{ paddingTop: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span
            style={{
              padding: "0.25rem 0.65rem",
              borderRadius: "8px",
              background: "rgba(6, 182, 212, 0.12)",
              color: "var(--accent-cyan)",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Compass size={13} /> Product Directory
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {pagination.total} Verified Items
          </span>
        </div>

        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
          Browse Product Catalog
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", maxWidth: 650 }}>
          Explore pre-extracted cross-platform listings across {categories.length} categories. Compare live pricing, original MRPs, and marketplace availability.
        </p>
      </div>

      {/* Search Bar & Active Filters */}
      <div
        className="card-panel"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: "flex", gap: "0.75rem", alignItems: "stretch", flexWrap: "wrap" }}
        >
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "flex",
              }}
            >
              <Search size={17} />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products by title, model, or brand (e.g. iPhone, Sony, Samsung)..."
              style={{
                width: "100%",
                padding: "0.75rem 2.5rem 0.75rem 2.75rem",
                borderRadius: "10px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontSize: "0.92rem",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent-cyan)";
                e.target.style.boxShadow = "var(--shadow-glow)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-color)";
                e.target.style.boxShadow = "none";
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  if (currentSearch) updateParam("search", "");
                }}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                }}
                aria-label="Clear search text"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
            Search
          </button>

          {(currentSearch || currentCategory) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <RotateCcw size={14} /> Clear All
            </button>
          )}
        </form>

        {/* Category Filter Chips */}
        {categories.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: "0.5rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: "0.25rem" }}>
              Categories:
            </span>
            <button
              onClick={() => updateParam("category", "")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: !currentCategory ? "var(--accent-cyan)" : "var(--border-color)",
                background: !currentCategory ? "var(--accent-cyan)" : "var(--bg-card)",
                color: !currentCategory ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: !currentCategory ? "0 0 10px rgba(6, 182, 212, 0.3)" : "none",
              }}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const isSelected = currentCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => updateParam("category", cat.name)}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "999px",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--accent-cyan)" : "var(--border-color)",
                    background: isSelected ? "var(--accent-cyan)" : "var(--bg-card)",
                    color: isSelected ? "#ffffff" : "var(--text-secondary)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 0 10px rgba(6, 182, 212, 0.3)" : "none",
                  }}
                >
                  <span>{cat.name}</span>
                  <span
                    style={{
                      opacity: isSelected ? 0.9 : 0.6,
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ({cat.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {!loading && error && (
        <div
          className="card-panel"
          style={{
            textAlign: "center",
            padding: "3.5rem 2rem",
            background: "rgba(244, 63, 94, 0.06)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            marginBottom: "2rem",
          }}
        >
          <AlertCircle size={36} color="var(--accent-rose)" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "0.5rem" }}>
            {error}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
            The product catalog service could not be reached.
          </p>
          <button onClick={fetchProducts} className="btn btn-primary btn-sm">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div
          className="card-glass"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            borderRadius: "18px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            No Matching Products Found
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 450, margin: "0 auto 1.5rem" }}>
            We couldn't find any products matching your current filters. Try changing your search query or selecting another category.
          </p>
          <button onClick={handleClearFilters} className="btn btn-primary btn-md">
            <RotateCcw size={15} /> Reset All Filters
          </button>
        </div>
      )}

      {/* Unified Product Grid */}
      {!loading && products.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginBottom: "3rem",
            }}
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {/* Standardized Pagination Bar */}
          {pagination.total_pages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.75rem",
                marginTop: "2rem",
                flexWrap: "wrap",
              }}
            >
              <button
                disabled={currentPage <= 1}
                onClick={() => updateParam("page", (currentPage - 1).toString())}
                className="btn btn-secondary btn-sm"
                style={{ opacity: currentPage <= 1 ? 0.45 : 1 }}
              >
                <ChevronLeft size={16} /> Prev
              </button>

              <span
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  background: "var(--bg-card)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              >
                Page {currentPage} of {pagination.total_pages}
              </span>

              <button
                disabled={currentPage >= pagination.total_pages}
                onClick={() => updateParam("page", (currentPage + 1).toString())}
                className="btn btn-secondary btn-sm"
                style={{ opacity: currentPage >= pagination.total_pages ? 0.45 : 1 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductCatalog;
