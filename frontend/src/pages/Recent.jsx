import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getProductImage, handleImageError } from "../utils/images";
import PlatformBadge from "../components/PlatformBadge";
import toast from "react-hot-toast";
import {
  Clock,
  History,
  Trash2,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const TABS = [
  { key: "all", label: "All Recent" },
  { key: "analyzed", label: "Recently Analyzed" },
  { key: "viewed", label: "Recently Viewed" },
];

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const Recent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== "all") params.type = activeTab;
      const res = await API.get("/recent/", { params });
      setItems(res.data.results || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  const handleView = async (item) => {
    if (item.viewed_at) {
      navigate(`/analysis/${item.id}`, { state: { analysis: item } });
      return;
    }
    try {
      await API.put(`/recent/${item.id}/viewed/`);
    } catch {
      // proceed anyway
    }
    navigate(`/analysis/${item.id}`, { state: { analysis: item } });
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all recent history? This cannot be undone.")) return;
    setClearing(true);
    try {
      const res = await API.delete("/recent/clear/");
      toast.success(`Cleared ${res.data.deleted} items`);
      setItems([]);
    } catch {
      toast.error("Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  const getLowestPrice = (item) => {
    const result = item.analysis_result;
    if (!result) return null;
    const comparisons = result.comparisons;
    if (comparisons?.best_price) return comparisons.best_price;
    const product = result.product;
    if (product?.price) return product.price;
    return null;
  };

  const getOfferCount = (item) => {
    const result = item.analysis_result;
    if (!result) return 0;
    return result.comparisons?.listings?.length || 0;
  };

  const getDealScore = (item) => {
    const result = item.analysis_result;
    if (!result?.ai_analysis?.deal_score) return null;
    return result.ai_analysis.deal_score;
  };

  return (
    <div
      className="page-container"
      style={{
        width: "100%",
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2.5rem 1.5rem 4rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-cyan)",
              }}
            >
              <History size={20} />
            </div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Recent History
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            {!user
              ? "Your recent product analyses and price lookups"
              : `Your recent product comparisons — ${items.length} ${items.length === 1 ? "item" : "items"}`}
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="btn btn-secondary btn-sm"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "10px",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              background: "rgba(244, 63, 94, 0.08)",
              color: "var(--accent-rose)",
              fontWeight: 600,
              fontSize: "0.84rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              cursor: clearing ? "not-allowed" : "pointer",
            }}
          >
            <Trash2 size={15} />
            <span>{clearing ? "Clearing..." : "Clear History"}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "1rem",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: isActive ? "var(--accent-cyan)" : "var(--border-color)",
                background: isActive ? "var(--accent-cyan)" : "var(--bg-secondary)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isActive ? "0 2px 10px rgba(6, 182, 212, 0.3)" : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card-panel"
              style={{
                height: 180,
                animation: "pulse 1.5s ease-in-out infinite",
                borderRadius: "14px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div
          className="card-panel"
          style={{
            textAlign: "center",
            padding: "4.5rem 2rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>🔍</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
            No recent analyses yet
          </div>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              maxWidth: 440,
              margin: "0 auto 1.75rem",
              lineHeight: 1.5,
            }}
          >
            Paste any product link from Amazon, Flipkart, or other stores into DealLens to start tracking prices and AI deal insights.
          </p>
          <Link
            to="/"
            className="btn btn-primary"
            style={{
              padding: "0.7rem 1.6rem",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.92rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>Analyze a Product</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Items Grid */}
      {!loading && items.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
            width: "100%",
          }}
        >
          {items.map((item) => {
            const price = getLowestPrice(item);
            const originalPrice =
              item.analysis_result?.product?.mrp ||
              item.analysis_result?.comparisons?.highest_price;
            const offerCount = getOfferCount(item);
            const dealScore = getDealScore(item);
            const platform = item.detected_platform || item.analysis_result?.platform;
            const title =
              item.product_title ||
              item.analysis_result?.product?.title ||
              "Analyzed Product";
            const brand =
              item.product_brand ||
              item.analysis_result?.product?.brand;
            const category =
              item.product_category ||
              item.analysis_result?.product?.category;
            const imageUrl = getProductImage(
              item.product_image || item.analysis_result?.product?.image_url,
              { title, brand, category }
            );

            return (
              <div
                key={item.id}
                className="card-panel card-glow"
                onClick={() => handleView(item)}
                style={{
                  padding: "1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderRadius: "14px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  position: "relative",
                  transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                  e.currentTarget.style.boxShadow = "0 8px 24px -4px rgba(6, 182, 212, 0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "var(--shadow-card)";
                }}
              >
                {/* Viewed badge */}
                {item.viewed_at && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "6px",
                      background: "rgba(99, 102, 241, 0.12)",
                      color: "#6366f1",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                    }}
                  >
                    Viewed
                  </div>
                )}

                {/* Top Section: Image + Title + Meta */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "10px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.4rem",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={title}
                      data-brand={brand || ""}
                      data-category={category || ""}
                      referrerPolicy="no-referrer"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={handleImageError}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: item.viewed_at ? "3.2rem" : 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.94rem",
                        lineHeight: 1.35,
                        marginBottom: "0.4rem",
                        color: "var(--text-primary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                      title={title}
                    >
                      {title}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      {platform && <PlatformBadge platform={platform} size="sm" />}
                      {brand && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            background: "var(--bg-subtle-surface)",
                            border: "1px solid var(--border-subtle)",
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                          }}
                        >
                          {brand}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Price + MRP + Deal Score */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "10px",
                    background: "var(--bg-subtle-surface)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                    {price ? (
                      <span
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: "var(--accent-green)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ₹{Number(price).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Price unavailable
                      </span>
                    )}

                    {originalPrice && Number(originalPrice) > Number(price) && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          textDecoration: "line-through",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ₹{Number(originalPrice).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {dealScore !== null && (
                    <span
                      style={{
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        padding: "0.25rem 0.6rem",
                        borderRadius: "6px",
                        background:
                          dealScore >= 75
                            ? "rgba(16, 185, 129, 0.12)"
                            : dealScore >= 50
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(244, 63, 94, 0.12)",
                        color:
                          dealScore >= 75
                            ? "#10b981"
                            : dealScore >= 50
                            ? "#f59e0b"
                            : "#f43f5e",
                        border: `1px solid ${
                          dealScore >= 75
                            ? "rgba(16, 185, 129, 0.25)"
                            : dealScore >= 50
                            ? "rgba(245, 158, 11, 0.25)"
                            : "rgba(244, 63, 94, 0.25)"
                        }`,
                      }}
                    >
                      Score: {dealScore}
                    </span>
                  )}
                </div>

                {/* Footer: Metadata + Quick Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "0.4rem",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "0.76rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--text-muted)" }}>
                    {offerCount > 0 && (
                      <span style={{ fontWeight: 600 }}>
                        {offerCount} {offerCount > 1 ? "listings" : "listing"}
                      </span>
                    )}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={12} />
                      {timeAgo(item.created_at)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Link
                      to={`/report/${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.72rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      title="View Multi-Store Decision Report"
                    >
                      <BarChart3 size={12} />
                      <span>Report</span>
                    </Link>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontWeight: 700,
                        color: "var(--accent-cyan)",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span>Analysis</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Recent;
