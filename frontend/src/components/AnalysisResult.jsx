import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Award,
} from "lucide-react";
import ShareButton from "./ShareButton";
import PriceHistoryChart from "./PriceHistoryChart";
import PlatformBadge from "./PlatformBadge";
import ScoreBadge from "./ScoreBadge";
import MarketplaceComparisonCards from "./MarketplaceComparisonCards";
import API from "../api/axios";
import { getProductImage, handleImageError } from "../utils/images";
import { ALL_CHECKED_PLATFORMS, getOfficialStoreUrl } from "../utils/platforms";

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
  ].slice(0, 4);

  const validCombinedPrices = rawDisplayRows.map((r) => r.price).filter((p) => p > 0);
  const minCombinedPrice = validCombinedPrices.length > 0 ? Math.min(...validCombinedPrices) : 0;

  const displayRows = rawDisplayRows.map((r) => ({
    ...r,
    is_cheapest: r.price === minCombinedPrice && r.price > 0,
    savings_vs_this: r.price > minCombinedPrice ? Math.round(r.price - minCombinedPrice) : 0,
  }));

  const availablePlatformNames = displayRows.map((r) => r.platform).filter(Boolean);
  const unavailablePlatforms = (
    comparison.unavailable_platforms && comparison.unavailable_platforms.length > 0
      ? comparison.unavailable_platforms
      : ALL_CHECKED_PLATFORMS
  ).filter(
    (p) => !availablePlatformNames.some((ap) => ap.toLowerCase() === p.toLowerCase())
  );

  const countLabel = `Available across ${displayRows.length} verified marketplaces • Checked against ${displayRows.length + unavailablePlatforms.length} major Indian stores`;

  const bestDeal = displayRows.length > 0 ? displayRows[0] : null;
  const cheapest = displayRows.find((l) => l.is_cheapest) || listings.find((l) => l.is_cheapest);
  const bestRated = comparison.best_rating;
  const fastest = comparison.fastest_delivery;

  // Compute enriched AI review metrics (works seamlessly for both fresh and cached analyses)
  const cleanText = (str) =>
    String(str || "").replace(/Rs\.\s*/g, "₹");

  const effectiveBestPrice = Number(cheapest?.price || bestDeal?.price || product.price || 0);
  const effectiveMrp = Number(product.mrp || bestDeal?.mrp || 0);
  const mrpSavings = effectiveMrp > effectiveBestPrice && effectiveBestPrice > 0 ? Math.round(effectiveMrp - effectiveBestPrice) : 0;
  const discountPct = effectiveMrp > 0 && mrpSavings > 0 ? Math.round((mrpSavings / effectiveMrp) * 100) : Number(product.discount || 0);
  const maxStorePrice = validCombinedPrices.length > 0 ? Math.max(...validCombinedPrices) : 0;
  const crossStoreSpread = maxStorePrice > minCombinedPrice && minCombinedPrice > 0 ? Math.round(maxStorePrice - minCombinedPrice) : 0;
  const cheapestStoreName = cheapest?.platform || bestDeal?.platform || data.platform || "Top Store";

  const enrichedPros = (() => {
    const basePros = (ai.pros || []).map(cleanText);
    const dynamicPros = [];
    if (mrpSavings > 0 && discountPct >= 5) {
      dynamicPros.push(
        `Saves ₹${mrpSavings.toLocaleString("en-IN")} (${discountPct}% OFF) below the ₹${effectiveMrp.toLocaleString("en-IN")} retail MRP`
      );
    }
    if (product.rating && Number(product.rating) >= 4.0) {
      dynamicPros.push(
        `Strong customer satisfaction rated ${product.rating}★ out of 5 across verified buyers`
      );
    }
    if (crossStoreSpread > 0 && displayRows.length > 1) {
      dynamicPros.push(
        `Up to ₹${crossStoreSpread.toLocaleString("en-IN")} cross-store price advantage by purchasing on ${cheapestStoreName}`
      );
    }
    const merged = [...dynamicPros];
    basePros.forEach((p) => {
      if (!merged.some((m) => m.toLowerCase().slice(0, 18) === p.toLowerCase().slice(0, 18))) {
        merged.push(p);
      }
    });
    return merged.slice(0, 4);
  })();

  const enrichedCons = (() => {
    const baseCons = (ai.cons || []).map(cleanText);
    const dynamicCons = [];
    if (Number(product.price) > effectiveBestPrice && effectiveBestPrice > 0) {
      const overpay = Math.round(Number(product.price) - effectiveBestPrice);
      dynamicCons.push(
        `Listed ₹${overpay.toLocaleString("en-IN")} higher on ${data.platform} than the cheapest offer on ${cheapestStoreName} (₹${effectiveBestPrice.toLocaleString("en-IN")})`
      );
    }
    const merged = [...dynamicCons];
    baseCons.forEach((c) => {
      if (!merged.some((m) => m.toLowerCase().slice(0, 18) === c.toLowerCase().slice(0, 18))) {
        merged.push(c);
      }
    });
    if (merged.length < 2) {
      merged.push("Bank card instant discounts and exchange valuations vary across marketplace sellers");
    }
    return merged.slice(0, 3);
  })();

  const smartTipsList = (() => {
    if (Array.isArray(ai.smart_tips) && ai.smart_tips.length > 0) {
      return ai.smart_tips.map(cleanText);
    }
    const list = [];
    if (ai.savings_tip) list.push(cleanText(ai.savings_tip));
    list.push(`Compare final checkout total on ${cheapestStoreName} with bank credit/debit EMI offers for an extra 5–10% discount`);
    list.push("Set a DealLens Price Drop Alert below to receive an instant notification on any further festive price cut");
    return list.slice(0, 3);
  })();

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
              <span className="badge badge-cyan">● Verified Product</span>
            )}
            {product.data_source === "demo" && (
              <span className="badge badge-cyan">● Verified Catalog</span>
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

              <div style={{ marginTop: "0.45rem" }}>
                <a
                  href={getOfficialStoreUrl(
                    bestDeal.platform,
                    product.title,
                    bestDeal.source_url,
                    Boolean(bestDeal.is_source)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
                >
                  <span>Buy on {bestDeal.platform}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
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
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1rem" }}>
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
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
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
        <div
          className="card-panel"
          style={{
            border: "1px solid rgba(139, 92, 246, 0.28)",
            background: "linear-gradient(160deg, rgba(139, 92, 246, 0.06) 0%, rgba(6, 182, 212, 0.04) 50%, var(--bg-card) 100%)",
          }}
        >
          {/* Top Header Row with AI Verdict & Buy Signal Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "0.85rem",
              marginBottom: "1.25rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.18rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={19} color="var(--accent-purple)" /> DealLens AI Intelligence Report
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", marginBottom: 0 }}>
                Multi-factor price fairness, buyer sentiment, and cross-marketplace value synthesis
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
              <span
                className="badge badge-green"
                style={{
                  fontSize: "0.76rem",
                  padding: "0.32rem 0.75rem",
                  fontWeight: 800,
                }}
              >
                {ai.buy_timing?.action ||
                  (Number(product.price) > effectiveBestPrice && effectiveBestPrice > 0
                    ? `⚡ Switch to ${cheapestStoreName} & Buy`
                    : "🟢 Buy Now — Optimal Price Window")}
              </span>
              <span
                className="badge badge-cyan"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.32rem 0.7rem",
                  fontWeight: 700,
                }}
              >
                Verdict: {cleanText(ai.deal_assessment)}
              </span>
            </div>
          </div>

          {/* 4-Tile AI Quick Market Intelligence Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {/* Tile 1: Price Fairness vs MRP */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                🏷️ Price Fairness vs MRP
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: discountPct >= 10 ? "var(--accent-green)" : "var(--accent-cyan)" }}>
                {discountPct > 0 ? `${discountPct}% Below MRP` : ai.price_fairness?.verdict || "Fair Market Price"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {mrpSavings > 0
                  ? `Saves ₹${mrpSavings.toLocaleString("en-IN")} off ₹${effectiveMrp.toLocaleString("en-IN")} MRP`
                  : "Verified competitive catalog price"}
              </div>
            </div>

            {/* Tile 2: Cross-Store Price Spread */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                📊 Cross-Store Spread
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: crossStoreSpread > 0 ? "var(--accent-green)" : "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {crossStoreSpread > 0 ? `₹${crossStoreSpread.toLocaleString("en-IN")} Savings Gap` : `${displayRows.length} Stores Matched`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Lowest on <strong style={{ color: "var(--text-primary)" }}>{cheapestStoreName}</strong> at ₹{effectiveBestPrice.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Tile 3: Verified Buyer Sentiment */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                ⭐ Buyer Sentiment
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--accent-amber)" }}>
                {product.rating
                  ? `${product.rating} ★ ${Number(product.rating) >= 4.3 ? "Highly Rated" : "Positive"}`
                  : bestRated?.rating
                  ? `${bestRated.rating} ★ Verified`
                  : "Verified Listing"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {product.review_count > 0
                  ? `Backed by ${product.review_count.toLocaleString("en-IN")}+ buyer ratings`
                  : "Strong category reliability profile"}
              </div>
            </div>

            {/* Tile 4: Optimal Purchase Strategy */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.85rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                🎯 Optimal Store Choice
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                Buy on {cheapestStoreName}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Score: <strong style={{ color: "var(--accent-green)" }}>{bestDeal?.score || ai.deal_score || 82}/100</strong> across {displayRows.length} stores
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div
            style={{
              padding: "1.15rem 1.25rem",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.24)",
              borderRadius: "12px",
              marginBottom: "1.25rem",
              fontSize: "0.92rem",
              lineHeight: 1.65,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-cyan)", marginBottom: "0.35rem" }}>
              Executive Market Synthesis
            </div>
            {cleanText(ai.summary)}
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
                padding: "1.15rem",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.06)",
                border: "1px solid rgba(16, 185, 129, 0.22)",
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--accent-green)", fontSize: "0.9rem", marginBottom: "0.7rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <CheckCircle2 size={16} /> Key Strengths & Value Drivers
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                {enrichedPros.map((p, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "var(--accent-green)", fontWeight: 800, marginTop: 1 }}>✓</span>
                    <span style={{ color: "var(--text-primary)" }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div
              style={{
                padding: "1.15rem",
                borderRadius: "12px",
                background: "rgba(244, 63, 94, 0.06)",
                border: "1px solid rgba(244, 63, 94, 0.22)",
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--accent-rose)", fontSize: "0.9rem", marginBottom: "0.7rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <XCircle size={16} /> Buyer Considerations & Watch-Outs
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.48 }}>
                {enrichedCons.map((c, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "var(--accent-rose)", fontWeight: 800, marginTop: 1 }}>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Buying Playbook (Multi-Tip Savings + Final Recommendation) */}
          <div
            style={{
              padding: "1.1rem 1.25rem",
              background: "rgba(245, 158, 11, 0.07)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "12px",
              marginBottom: ai.recommendation ? "0.9rem" : 0,
            }}
          >
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 800,
                color: "var(--accent-amber)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.6rem",
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
              }}
            >
              <Sparkles size={15} /> Smart Checkout Savings Playbook
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.65rem" }}>
              {smartTipsList.map((tipItem, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "9px",
                    fontSize: "0.81rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.45,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.45rem",
                  }}
                >
                  <span style={{ color: "var(--accent-amber)", fontWeight: 800 }}>#{idx + 1}</span>
                  <span>{tipItem}</span>
                </div>
              ))}
            </div>
          </div>

          {ai.recommendation && (
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "var(--bg-card)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                fontSize: "0.9rem",
                color: "var(--text-primary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <Award size={18} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: "var(--accent-green)" }}>AI Final Verdict:</strong> {cleanText(ai.recommendation)}
                </div>
              </div>
              {cheapest && (
                <a
                  href={getOfficialStoreUrl(
                    cheapest.platform,
                    product.title,
                    cheapest.source_url,
                    Boolean(cheapest.is_source)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }}
                >
                  <span>Buy on {cheapest.platform} (₹{Number(cheapest.price).toLocaleString("en-IN")})</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Multi-Marketplace Comparison Cards */}
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

          <MarketplaceComparisonCards
            listings={displayRows}
            productTitle={product.title}
            availablePlatformNames={availablePlatformNames}
            unavailablePlatforms={unavailablePlatforms}
          />
        </div>
      )}

      {/* 6. Inline Price History Chart */}
      <PriceHistoryChart
        productId={product.id}
        productTitle={product.title}
        comparedListings={displayRows}
        demoListings={(demo?.listings || []).filter((l) =>
          availablePlatformNames.some((ap) => ap.toLowerCase() === (l.platform || "").toLowerCase())
        )}
      />

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

        {bestDeal && (
          <a
            href={getOfficialStoreUrl(
              bestDeal.platform,
              product.title,
              bestDeal.source_url,
              Boolean(bestDeal.is_source)
            )}
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
