import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Info,
  Award,
} from "lucide-react";
import ShareButton from "./ShareButton";
import PriceHistoryChart from "./PriceHistoryChart";
import PlatformBadge from "./PlatformBadge";
import ScoreBadge from "./ScoreBadge";
import API from "../api/axios";
import { getProductImage, handleImageError } from "../utils/images";

const AnalysisResult = ({ data, analysisId }) => {
  const navigate = useNavigate();
  const [demo, setDemo] = useState(null);

  const product = data?.product || {};
  const comparison = data?.comparisons || {};
  const ai = data?.ai_analysis || {};
  const listings = comparison.listings || [];
  const scoredListings = ai.scored_listings || listings;

  // Demo fallback: only when the real result is too thin to compare (<2 verified listings)
  const verifiedCount = scoredListings.filter(
    (l) => l.price > 0 && l.data_source !== "unavailable"
  ).length;
  const demoCategory = product.category || "";

  useEffect(() => {
    if (!data || verifiedCount >= 2) {
      setDemo(null);
      return;
    }
    let cancelled = false;
    const basePrice = Number(product.price) || 0;
    API.get("/demo-comparison/", {
      params: {
        category: demoCategory,
        base_price: basePrice > 0 ? basePrice : undefined,
        title: product.title || undefined,
        source_platform: product.platform || undefined,
        mrp: Number(product.mrp) || undefined,
      },
    })
      .then((res) => {
        if (!cancelled) setDemo(res.data);
      })
      .catch(() => {
        if (!cancelled) setDemo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data, verifiedCount, demoCategory, analysisId, product.price, product.title, product.platform, product.mrp]);

  if (!data) return null;

  // Demo rows merge into the main table
  const demoRows = (demo?.listings || []).map((l) => ({
    platform: l.platform,
    price: Number(l.price) || 0,
    mrp: Number(l.mrp) || 0,
    rating: l.rating ?? null,
    review_count: l.review_count || 0,
    delivery_days: l.delivery_days || 0,
    delivery_time: l.delivery_time || "",
    availability: "In Stock",
    in_stock: true,
    coupon_code: l.coupon_code || null,
    coupon_discount: 0,
    source_url: l.product_url || l.source_url || "",
    data_source: "demo",
    is_demo: true,
    is_cheapest: false,
    is_best_rated: false,
    fastest_delivery: false,
    savings_vs_this: 0,
    score: null,
  }));

  const existingPlatforms = new Set(
    scoredListings
      .filter((l) => l.data_source !== "unavailable" && l.price > 0)
      .map((l) => l.platform)
  );
  const filteredDemoRows = demoRows.filter((d) => !existingPlatforms.has(d.platform));

  const rawDisplayRows = [
    ...scoredListings.filter((l) => l.data_source !== "unavailable" && l.price > 0),
    ...filteredDemoRows,
  ];

  const validCombinedPrices = rawDisplayRows.map((r) => r.price).filter((p) => p > 0);
  const minCombinedPrice = validCombinedPrices.length > 0 ? Math.min(...validCombinedPrices) : 0;

  const displayRows = rawDisplayRows.map((r) => ({
    ...r,
    is_cheapest: r.price === minCombinedPrice && r.price > 0,
    savings_vs_this: r.price > minCombinedPrice ? Math.round(r.price - minCombinedPrice) : 0,
  }));

  const verifiedRows = displayRows.filter(
    (l) => l.price > 0 && l.data_source !== "unavailable" && !l.is_demo
  );
  const referenceRows = filteredDemoRows;
  const nV = verifiedRows.length;
  const nR = referenceRows.length;
  const countLabel =
    nR > 0
      ? `${nV} verified listing${nV === 1 ? "" : "s"} + ${nR} comparable marketplace${nR === 1 ? "" : "s"}`
      : `${nV} verified marketplace listing${nV === 1 ? "" : "s"}`;

  const bestDeal = displayRows.length > 0 ? displayRows[0] : null;
  const cheapest = displayRows.find((l) => l.is_cheapest) || listings.find((l) => l.is_cheapest);
  const bestRated = comparison.best_rating;
  const fastest = comparison.fastest_delivery;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* 1. Product Overview Card */}
      <div
        className="card-panel"
        style={{
          padding: "1.75rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2rem",
          alignItems: "center",
        }}
      >
        {/* Product Image Box */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 220,
            maxWidth: 280,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <img
            src={getProductImage(product.image_url, product)}
            alt={product.title || "Product"}
            data-brand={product.brand || ""}
            data-category={product.category || ""}
            referrerPolicy="no-referrer"
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            onError={handleImageError}
          />
        </div>

        {/* Product Meta & Headline */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
            <PlatformBadge platform={data.platform} size="md" />

            {product.data_source === "live" && (
              <span className="badge badge-green">● Live Scraped</span>
            )}
            {product.data_source === "url_extract" && (
              <span className="badge badge-cyan">● URL Detected</span>
            )}
            {product.data_source === "demo" && (
              <span className="badge badge-amber">● Demonstration Data</span>
            )}
          </div>

          <h1
            style={{
              fontSize: "1.35rem",
              fontWeight: 800,
              lineHeight: 1.35,
              marginBottom: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            {product.title}
          </h1>

          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {product.brand && (
              <span>
                Brand: <strong style={{ color: "var(--text-primary)" }}>{product.brand}</strong>
              </span>
            )}
            {product.category && (
              <span>
                Category: <strong style={{ color: "var(--text-primary)" }}>{product.category}</strong>
              </span>
            )}
          </div>

          {/* Pricing Row */}
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                Current Best Price
              </div>
              <div
                style={{
                  fontSize: "2.1rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: product.price > 0 || bestDeal?.price > 0 ? "var(--accent-green)" : "var(--text-muted)",
                  letterSpacing: "-0.03em",
                }}
              >
                {product.price > 0
                  ? `₹${product.price?.toLocaleString("en-IN")}`
                  : bestDeal?.price > 0
                  ? `₹${bestDeal.price.toLocaleString("en-IN")}`
                  : "N/A"}
              </div>
            </div>

            {product.mrp > product.price && product.price > 0 && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                  Original MRP
                </div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    color: "var(--text-muted)",
                    textDecoration: "line-through",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ₹{product.mrp?.toLocaleString("en-IN")}
                </div>
              </div>
            )}

            {product.discount > 0 && (
              <span className="badge badge-rose" style={{ fontSize: "0.85rem", padding: "0.35rem 0.65rem" }}>
                <TrendingDown size={14} /> {product.discount}% OFF
              </span>
            )}

            {product.rating && (
              <div style={{ fontSize: "0.92rem", color: "var(--accent-amber)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <span>★ {product.rating}</span>
                {product.review_count > 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 500 }}>
                    ({product.review_count.toLocaleString("en-IN")} reviews)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Best Deal Hero Banner & AI Recommendation Score */}
      {bestDeal && (
        <div
          className="card-glass card-glow"
          style={{
            padding: "2rem",
            border: "1.5px solid rgba(16, 185, 129, 0.35)",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.06) 100%)",
            boxShadow: "var(--shadow-glow-emerald)",
          }}
        >
          {/* Top Deal Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.6rem" }}>🏆</span>
              <div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-green)", letterSpacing: "-0.01em" }}>
                  Best Deal Recommendation
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Verified lowest evaluated cost across all compared marketplaces
                </div>
              </div>
            </div>

            {ai.confidence && (
              <span
                className={`badge ${
                  ai.confidence.level === "high"
                    ? "badge-green"
                    : ai.confidence.level === "medium"
                    ? "badge-amber"
                    : "badge-rose"
                }`}
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
              >
                ● {ai.confidence.label}
              </span>
            )}
          </div>

          {/* Deal Score & Reasoning Matrix */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
              alignItems: "center",
              marginBottom: "1.75rem",
            }}
          >
            {/* Store & Price Callout */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                  Recommended Store:
                </span>
                <PlatformBadge platform={bestDeal.platform} size="md" />
              </div>

              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  color: bestDeal.price > 0 ? "var(--accent-green)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "-0.03em",
                }}
              >
                {bestDeal.price > 0 ? `₹${bestDeal.price?.toLocaleString("en-IN")}` : "N/A"}
              </div>

              {bestDeal.coupon_discount > 0 && (
                <div style={{ fontSize: "0.82rem", color: "var(--accent-green)", fontWeight: 700 }}>
                  Includes ₹{Number(bestDeal.coupon_discount).toLocaleString("en-IN")} coupon discount
                </div>
              )}
            </div>

            {/* Circular / Radial Score Highlight */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                padding: "1.25rem 1.5rem",
                background: "var(--bg-card)",
                borderRadius: "16px",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "2px solid var(--accent-green)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 900,
                    color: "var(--accent-green)",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1,
                  }}
                >
                  {bestDeal.score}
                </span>
                <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700 }}>/100</span>
              </div>

              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  Best Deal Score
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Comprehensive multi-criteria intelligence score
                </div>
              </div>
            </div>

            {/* Rationale Checklist */}
            <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: "12px", padding: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                Decision Factors:
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {cheapest && cheapest.platform === bestDeal.platform && (
                  <li style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--accent-green)" }}>
                    <CheckCircle2 size={15} /> Lowest verified marketplace price
                  </li>
                )}
                {bestRated && bestRated.platform === bestDeal.platform && (
                  <li style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--accent-amber)" }}>
                    <CheckCircle2 size={15} /> Highest verified customer rating ({bestRated.rating}★)
                  </li>
                )}
                {fastest && fastest.platform === bestDeal.platform && (
                  <li style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--accent-cyan)" }}>
                    <CheckCircle2 size={15} /> Fastest shipping ({fastest.days} day{fastest.days > 1 ? "s" : ""})
                  </li>
                )}
                {bestDeal.coupon_discount > 0 && (
                  <li style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "var(--accent-purple)" }}>
                    <CheckCircle2 size={15} /> Extra coupon savings available
                  </li>
                )}
                {(!cheapest || cheapest.platform !== bestDeal.platform) && (
                  <li style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <CheckCircle2 size={15} /> Optimal composite value across price & seller trust
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* 8-Dimension Sub-Scores Breakdown */}
          {bestDeal.sub_scores && (
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.85rem" }}>
                <Award size={14} color="var(--accent-cyan)" /> 8-Dimension Score Breakdown
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                {[
                  { key: "price", label: "Price Value", icon: "💰", weight: "35%" },
                  { key: "rating", label: "Product Rating", icon: "⭐", weight: "15%" },
                  { key: "review_confidence", label: "Review Confidence", icon: "📊", weight: "10%" },
                  { key: "offers", label: "Offers & Discount", icon: "🏷️", weight: "10%" },
                  { key: "delivery", label: "Delivery Speed", icon: "🚚", weight: "10%" },
                  { key: "warranty", label: "Warranty & Return", icon: "🛡️", weight: "10%" },
                  { key: "seller", label: "Seller Reliability", icon: "✅", weight: "5%" },
                  { key: "freshness", label: "Data Freshness", icon: "🕐", weight: "5%" },
                ].map(({ key, label, icon, weight }) => {
                  const val = bestDeal.sub_scores[key] || 0;
                  const color = val >= 70 ? "var(--accent-green)" : val >= 40 ? "var(--accent-amber)" : "var(--accent-rose)";

                  return (
                    <div
                      key={key}
                      style={{
                        padding: "0.65rem 0.85rem",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                          {icon} {label}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
                          {weight}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ flex: 1, height: 6, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${val}%`,
                              height: "100%",
                              background: color,
                              borderRadius: 3,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: color,
                            minWidth: 28,
                            textAlign: "right",
                            fontSize: "0.85rem",
                          }}
                        >
                          {Math.round(val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Recommendation Categories */}
      {ai.recommendation_categories && ai.recommendation_categories.length > 0 && (
        <div className="card-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={18} color="var(--accent-cyan)" /> Recommendation Tiers
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {ai.recommendation_categories.map((cat, i) => (
              <div
                key={i}
                style={{
                  padding: "1rem 1.25rem",
                  background: i === 0 ? "rgba(16, 185, 129, 0.08)" : "var(--bg-card)",
                  border: i === 0 ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border-color)",
                  borderRadius: "12px",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                  {cat.category}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <PlatformBadge platform={cat.platform} size="sm" />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 800, color: "var(--accent-green)", fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>
                      ₹{cat.price?.toLocaleString("en-IN")}
                    </span>
                    <ScoreBadge score={cat.score} size="sm" />
                  </div>
                </div>

                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  {cat.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. AI Synthesis: Pros, Cons & Predictive Advice */}
      {ai.deal_assessment && (
        <div className="card-panel">
          {data.extraction_notice && (
            <div
              style={{
                padding: "0.85rem 1rem",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                fontSize: "0.85rem",
                color: "var(--accent-amber)",
                marginBottom: "1.25rem",
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: "0.6rem",
              }}
            >
              <Info size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div>{data.extraction_notice}</div>
                {data.extraction_method && data.extraction_method !== "none" && (
                  <div style={{ marginTop: "0.3rem", fontSize: "0.76rem", opacity: 0.85, fontFamily: "var(--font-mono)" }}>
                    Source: {data.extraction_method} • Confidence: {data.extraction_confidence}
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={18} color="var(--accent-purple)" /> ShopSmart AI Intelligence Report
          </h3>

          {/* Executive Summary */}
          <div
            style={{
              padding: "1.15rem 1.25rem",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.22)",
              borderRadius: "12px",
              marginBottom: "1.25rem",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
            }}
          >
            {ai.summary}
          </div>

          {/* Pros vs Cons Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            {/* Pros */}
            <div
              style={{
                padding: "1.1rem",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--accent-green)", fontSize: "0.88rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={16} /> Key Strengths
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                {(ai.pros || []).map((p, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                    <span style={{ color: "var(--accent-green)", marginTop: 2 }}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div
              style={{
                padding: "1.1rem",
                borderRadius: "12px",
                background: "rgba(244, 63, 94, 0.06)",
                border: "1px solid rgba(244, 63, 94, 0.2)",
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--accent-rose)", fontSize: "0.88rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <XCircle size={16} /> Drawbacks & Caveats
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                {(ai.cons || []).map((c, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                    <span style={{ color: "var(--accent-rose)", marginTop: 2 }}>✕</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Advice & Savings Tip */}
          {ai.savings_tip && (
            <div
              style={{
                padding: "0.85rem 1.15rem",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "10px",
                fontSize: "0.88rem",
                color: "var(--accent-amber)",
                marginBottom: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              <div>
                <strong>Smart Savings Tip:</strong> {ai.savings_tip}
              </div>
            </div>
          )}

          {ai.recommendation && (
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Award size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              <div>
                <strong>Recommendation:</strong> {ai.recommendation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Multi-Marketplace Comparison Table */}
      {scoredListings.length > 0 && (
        <div className="card-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                📊 Cross-Marketplace Comparison Matrix
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {countLabel}
              </p>
            </div>
          </div>

          {demoRows.length > 0 && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "8px",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
              }}
            >
              🧪 <strong>Reference Data Included:</strong> {demo?.demo_notice || "Reference listings shown to illustrate cross-store comparison."}
            </div>
          )}

          {/* Responsive Table Wrapper */}
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: 780 }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1rem" }}>Marketplace</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Price</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Original MRP</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Discount</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Rating</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Delivery</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Coupon</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Availability</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Score</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Store Link</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((l, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i === 0 ? "rgba(16, 185, 129, 0.07)" : l.is_demo ? "rgba(245, 158, 11, 0.03)" : "transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                      opacity: l.data_source === "unavailable" ? 0.5 : 1,
                    }}
                  >
                    {/* Platform Name */}
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                        <PlatformBadge platform={l.platform} size="sm" />
                        {l.is_cheapest && (
                          <span
                            style={{
                              background: "var(--accent-green)",
                              color: "#fff",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                            }}
                          >
                            CHEAPEST
                          </span>
                        )}
                        {i === 0 && !l.is_cheapest && !l.is_demo && (
                          <span
                            style={{
                              background: "var(--accent-cyan)",
                              color: "#fff",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              padding: "0.1rem 0.4rem",
                              borderRadius: "999px",
                            }}
                          >
                            BEST VALUE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: l.is_cheapest ? "var(--accent-green)" : "var(--text-primary)" }}>
                      {l.price > 0 ? `₹${l.price?.toLocaleString("en-IN")}` : "N/A"}
                    </td>

                    {/* MRP */}
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", textDecoration: l.mrp > l.price ? "line-through" : undefined, fontFamily: "var(--font-mono)" }}>
                      {l.mrp > 0 ? `₹${l.mrp.toLocaleString("en-IN")}` : "—"}
                    </td>

                    {/* Discount */}
                    <td style={{ padding: "0.85rem 1rem", color: "var(--accent-green)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      {l.mrp > l.price && l.price > 0 ? `${Math.round(((l.mrp - l.price) / l.mrp) * 100)}%` : "—"}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      {l.rating ? (
                        <span style={{ color: "var(--accent-amber)", fontWeight: 700 }}>★ {l.rating}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Delivery */}
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                      {l.delivery_days ? `${l.delivery_days} day${l.delivery_days > 1 ? "s" : ""}` : l.delivery_time || "—"}
                    </td>

                    {/* Coupon */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      {l.coupon_code ? (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.15rem 0.45rem",
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "var(--accent-amber)",
                            borderRadius: "4px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            border: "1px dashed rgba(245, 158, 11, 0.35)",
                          }}
                        >
                          {l.coupon_code}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Availability */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      {l.in_stock === false || l.availability === "Out of Stock" ? (
                        <span style={{ color: "var(--accent-rose)", fontWeight: 700, fontSize: "0.8rem" }}>Out of Stock</span>
                      ) : (
                        <span style={{ color: "var(--accent-green)", fontWeight: 700, fontSize: "0.8rem" }}>In Stock</span>
                      )}
                    </td>

                    {/* Score */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <ScoreBadge score={l.score} size="sm" />
                    </td>

                    {/* Store Link Action */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      {l.source_url ? (
                        <a
                          href={l.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ display: "inline-flex", gap: "0.35rem", fontSize: "0.78rem" }}
                        >
                          <span>Visit Store</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Inline Price History Chart */}
      <PriceHistoryChart productId={product.id} productTitle={product.title} demoListings={demo?.listings || []} />

      {/* 7. Product Specifications (if available) */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <div className="card-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
            📋 Technical Specifications
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.6rem" }}>
            {Object.entries(product.specifications).map(([key, val]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.85rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{key}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Bottom Action Bar */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", padding: "1rem 0" }}>
        {analysisId && (
          <button
            onClick={() => navigate(`/report/${analysisId}`, { state: { analysis: { analysis_result: data }, demo } })}
            className="btn btn-secondary btn-lg"
            style={{ display: "inline-flex", gap: "0.5rem" }}
          >
            <FileText size={17} /> View Comprehensive Report
          </button>
        )}

        {bestDeal?.source_url && (
          <a
            href={bestDeal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success btn-lg"
            style={{ display: "inline-flex", gap: "0.5rem" }}
          >
            <span>Buy on {bestDeal.platform}</span>
            <ExternalLink size={17} />
          </a>
        )}

        <ShareButton
          title={product.title}
          price={data.best_deal_price}
          url={analysisId ? `${window.location.origin}/analysis/${analysisId}` : undefined}
        />
      </div>
    </div>
  );
};

export default AnalysisResult;
