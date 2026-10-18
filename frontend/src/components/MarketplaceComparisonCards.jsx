import React, { useState } from "react";
import {
  ExternalLink,
  Award,
  Truck,
  Tag,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  X,
} from "lucide-react";
import PlatformBadge from "./PlatformBadge";
import ScoreBadge from "./ScoreBadge";
import {
  getPlatformColor,
  getOfficialStoreUrl,
  getOfficialDomainLabel,
} from "../utils/platforms";

/**
 * Interactive Card-Based Cross-Marketplace Comparison Matrix.
 * - Renders separate cards for each marketplace instead of a table.
 * - Prominently highlights the CHEAPEST platform card with an emerald border, glow, and ribbon.
 * - Clicking any platform card displays a rich details panel for that specific chosen platform.
 * - Clicking "View in Store / Buy on [Platform]" redirects to that platform's official website.
 */
const MarketplaceComparisonCards = ({
  listings = [],
  productTitle = "",
  unavailablePlatforms = [],
  availablePlatformNames = [],
}) => {
  const [selectedPlatformKey, setSelectedPlatformKey] = useState(null);

  if (!listings || listings.length === 0) return null;

  // Normalize all incoming rows (supports both AnalysisResult listings and ProductDetail offers)
  const rawNormalized = listings
    .map((l) => {
      const platform = l.platform || l.store_name || l.platform_name || "Store";
      const price = Number(l.price ?? l.current_price ?? 0);
      const mrp = Number(l.mrp ?? l.original_price ?? 0);
      const discount =
        l.discount_percent > 0
          ? Math.round(Number(l.discount_percent))
          : mrp > price && price > 0
          ? Math.round(((mrp - price) / mrp) * 100)
          : 0;
      const rating = l.rating !== undefined && l.rating !== null ? Number(l.rating) : null;
      const reviewCount = Number(l.review_count ?? l.reviews_count ?? 0);
      const deliveryDays = Number(l.delivery_days || 0);
      const deliveryLabel = deliveryDays
        ? `${deliveryDays} day${deliveryDays > 1 ? "s" : ""}`
        : l.delivery_time || "2–4 days";
      const couponCode = l.coupon_code || null;
      const couponDiscount = Number(l.coupon_discount || 0);
      const inStock = l.in_stock !== false && l.availability !== "Out of Stock";
      const score = l.score !== undefined && l.score !== null ? Math.round(Number(l.score)) : null;
      const rawUrl = l.source_url || l.product_url || "";
      const isSource = Boolean(l.is_source);

      return {
        original: l,
        platform,
        price,
        mrp,
        discount,
        rating,
        reviewCount,
        deliveryDays,
        deliveryLabel,
        couponCode,
        couponDiscount,
        inStock,
        score,
        subScores: l.sub_scores || null,
        warranty: l.warranty || "1 Year Official Brand Warranty",
        returnPolicy: l.return_policy || "7-Day Official Store Replacement",
        isDemo: Boolean(l.is_demo),
        isSource,
        officialUrl: getOfficialStoreUrl(platform, productTitle, rawUrl, isSource),
        officialDomain: getOfficialDomainLabel(platform),
        brandColor: getPlatformColor(platform, "#06b6d4"),
      };
    })
    .filter((item) => item.price > 0);

  if (rawNormalized.length === 0) return null;

  const validPrices = rawNormalized.map((r) => r.price);
  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);

  const validRatings = rawNormalized.filter((r) => r.rating !== null).map((r) => r.rating);
  const maxRating = validRatings.length > 0 ? Math.max(...validRatings) : null;

  const cards = rawNormalized.map((item, idx) => {
    const isCheapest = item.price === minPrice && item.price > 0;
    const isTopRated = maxRating !== null && item.rating === maxRating && rawNormalized.length > 1;
    const savingsVsMrp = item.mrp > item.price ? Math.round(item.mrp - item.price) : 0;
    const savingsVsHighest = maxPrice > item.price ? Math.round(maxPrice - item.price) : 0;
    const diffFromCheapest = item.price > minPrice ? Math.round(item.price - minPrice) : 0;
    const netEffectivePrice =
      item.couponDiscount > 0 ? Math.max(1, item.price - item.couponDiscount) : item.price;

    // Synthesize sub-scores for the platform detail view if not already attached
    const computedSubScores = item.subScores || {
      price: isCheapest ? 96 : Math.max(60, Math.round(92 - (diffFromCheapest / (minPrice || 1)) * 120)),
      rating: item.rating ? Math.min(98, Math.round((item.rating / 5) * 100)) : 80,
      delivery: item.deliveryDays > 0 ? Math.max(65, Math.min(96, 100 - item.deliveryDays * 7)) : 82,
      offers: item.discount > 0 || item.couponCode ? Math.min(95, 70 + item.discount) : 68,
      seller: 90,
    };

    return {
      ...item,
      rank: idx + 1,
      isCheapest,
      isTopRated,
      savingsVsMrp,
      savingsVsHighest,
      diffFromCheapest,
      netEffectivePrice,
      computedSubScores,
    };
  });

  const selectedCard =
    cards.find((c) => c.platform.toLowerCase() === (selectedPlatformKey || "").toLowerCase()) ||
    null;

  const handleCardClick = (platformName) => {
    setSelectedPlatformKey((prev) =>
      prev && prev.toLowerCase() === platformName.toLowerCase() ? null : platformName
    );
  };

  return (
    <div>
      {/* Helper instruction pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          💡 <strong>Tip:</strong> Click any marketplace card below to inspect full pricing, coupon, delivery & trust details for that store.
        </span>
        {selectedCard && (
          <button
            type="button"
            onClick={() => setSelectedPlatformKey(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent-cyan)",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <X size={13} /> Clear Selection
          </button>
        )}
      </div>

      {/* Marketplace Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.15rem",
        }}
      >
        {cards.map((c, idx) => {
          const isSelected =
            selectedCard && selectedCard.platform.toLowerCase() === c.platform.toLowerCase();

          return (
            <div
              key={c.platform}
              onClick={() => handleCardClick(c.platform)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(c.platform);
                }
              }}
              className={`mp-comparison-card ${c.isCheapest ? "mp-cheapest-card" : ""}`}
              style={{
                position: "relative",
                borderRadius: "16px",
                padding: c.isCheapest ? "2.1rem 1.25rem 1.25rem" : "1.35rem 1.25rem 1.25rem",
                cursor: "pointer",
                animationDelay: `${idx * 95}ms`,
                background: c.isCheapest
                  ? "linear-gradient(160deg, rgba(16, 185, 129, 0.16) 0%, var(--bg-card) 65%)"
                  : isSelected
                  ? "linear-gradient(160deg, rgba(6, 182, 212, 0.13) 0%, var(--bg-card) 65%)"
                  : "var(--bg-card)",
                border: c.isCheapest
                  ? "2px solid #10b981"
                  : isSelected
                  ? `2px solid ${c.brandColor}`
                  : "1px solid var(--border-color)",
                boxShadow: c.isCheapest
                  ? "0 0 28px rgba(16, 185, 129, 0.24), var(--shadow-card)"
                  : isSelected
                  ? `0 0 22px ${c.brandColor}33, var(--shadow-card)`
                  : "var(--shadow-sm)",
                transform: c.isCheapest || isSelected ? "translateY(-2px)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "0.95rem",
                overflow: "hidden",
              }}
            >
              {/* Top Ribbon for CHEAPEST Card */}
              {c.isCheapest && (
                <div
                  className="mp-cheapest-ribbon"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    color: "#042f2e",
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "0.3rem 0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 2,
                  }}
                >
                  <span>🏆 CHEAPEST PRICE • LOWEST OFFER</span>
                  {c.savingsVsHighest > 0 && (
                    <span>SAVE UP TO ₹{c.savingsVsHighest.toLocaleString("en-IN")}</span>
                  )}
                </div>
              )}

              <div>
                {/* Card Header: Platform Badge + Deal Score */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    marginBottom: "0.65rem",
                  }}
                >
                  <div>
                    <PlatformBadge platform={c.platform} size="md" />
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginTop: "0.25rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {c.officialDomain}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {c.score !== null && <ScoreBadge score={c.score} size="sm" />}
                  </div>
                </div>

                {/* Highlight Badges Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                    marginBottom: "0.75rem",
                  }}
                >
                  {c.isCheapest && (
                    <span
                      style={{
                        background: "rgba(16, 185, 129, 0.16)",
                        color: "var(--accent-emerald)",
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                        fontSize: "0.66rem",
                        fontWeight: 800,
                        padding: "0.14rem 0.5rem",
                        borderRadius: "999px",
                        textTransform: "uppercase",
                      }}
                    >
                      ✓ Lowest Price
                    </span>
                  )}
                  {c.isTopRated && (
                    <span
                      style={{
                        background: "rgba(245, 158, 11, 0.16)",
                        color: "var(--accent-amber)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        fontSize: "0.66rem",
                        fontWeight: 800,
                        padding: "0.14rem 0.5rem",
                        borderRadius: "999px",
                        textTransform: "uppercase",
                      }}
                    >
                      ★ Highest Rated
                    </span>
                  )}
                  <span
                    style={{
                      background: c.inStock
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(244, 63, 94, 0.12)",
                      color: c.inStock ? "var(--accent-green)" : "var(--accent-rose)",
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      padding: "0.14rem 0.5rem",
                      borderRadius: "999px",
                    }}
                  >
                    {c.inStock ? "● In Stock" : "● Out of Stock"}
                  </span>
                </div>

                {/* Price Block */}
                <div
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "12px",
                    background: c.isCheapest
                      ? "rgba(16, 185, 129, 0.12)"
                      : "var(--bg-subtle-surface)",
                    border: c.isCheapest
                      ? "1px solid rgba(16, 185, 129, 0.35)"
                      : "1px solid var(--border-subtle)",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.55rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "1.65rem",
                        fontWeight: 900,
                        fontFamily: "var(--font-mono)",
                        color: c.isCheapest ? "var(--accent-emerald)" : "var(--text-primary)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      ₹{c.price.toLocaleString("en-IN")}
                    </span>

                    {c.mrp > c.price && (
                      <span
                        style={{
                          fontSize: "0.86rem",
                          color: "var(--text-muted)",
                          textDecoration: "line-through",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ₹{c.mrp.toLocaleString("en-IN")}
                      </span>
                    )}

                    {c.discount > 0 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: "var(--accent-emerald)",
                          fontFamily: "var(--font-mono)",
                          marginLeft: "auto",
                        }}
                      >
                        {c.discount}% OFF
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "0.74rem",
                      marginTop: "0.3rem",
                      color: c.isCheapest ? "var(--accent-emerald)" : "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {c.isCheapest
                      ? c.savingsVsMrp > 0
                        ? `You save ₹${c.savingsVsMrp.toLocaleString("en-IN")} off MRP`
                        : "Best verified price across all stores"
                      : `+₹${c.diffFromCheapest.toLocaleString("en-IN")} more than cheapest store`}
                  </div>
                </div>

                {/* Key Attributes Grid on Card */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    fontSize: "0.78rem",
                  }}
                >
                  <div
                    style={{
                      padding: "0.45rem 0.6rem",
                      borderRadius: "8px",
                      background: "var(--bg-subtle-surface)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Rating
                    </div>
                    <div style={{ fontWeight: 700, color: c.rating ? "var(--accent-amber)" : "var(--text-muted)", marginTop: "0.1rem" }}>
                      {c.rating ? `★ ${c.rating}` : "—"}
                      {c.reviewCount > 0 && (
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500, marginLeft: "0.25rem" }}>
                          ({c.reviewCount})
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "0.45rem 0.6rem",
                      borderRadius: "8px",
                      background: "var(--bg-subtle-surface)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      Delivery
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.1rem" }}>
                      🚚 {c.deliveryLabel}
                    </div>
                  </div>
                </div>

                {/* Coupon Pill if present */}
                {c.couponCode && (
                  <div
                    style={{
                      marginTop: "0.55rem",
                      padding: "0.35rem 0.65rem",
                      background: "rgba(245, 158, 11, 0.1)",
                      border: "1px dashed rgba(245, 158, 11, 0.4)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.74rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>Coupon Code:</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        color: "var(--accent-amber)",
                      }}
                    >
                      {c.couponCode}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions: Inspect Details + Redirect to Official Website */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  paddingTop: "0.65rem",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.3rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: isSelected ? "var(--accent-cyan)" : "var(--text-secondary)",
                    padding: "0.2rem 0",
                  }}
                >
                  {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>
                    {isSelected ? `Hide ${c.platform} Details` : `Click Card for ${c.platform} Details`}
                  </span>
                </div>

                <a
                  href={c.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`mp-buy-btn ${c.isCheapest ? "btn btn-success btn-sm" : "btn btn-secondary btn-sm"}`}
                  style={{
                    width: "100%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.58rem 0.85rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                  title={`Open official ${c.platform} website (${c.officialDomain})`}
                >
                  <span>Buy on {c.platform}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Platform Deep-Dive Details Panel */}
      {selectedCard && (
        <div
          key={selectedCard.platform}
          className="mp-detail-panel"
          style={{
            marginTop: "1.35rem",
            padding: "1.5rem",
            borderRadius: "16px",
            background: "var(--bg-detail-gradient)",
            border: `2px solid ${selectedCard.isCheapest ? "#10b981" : selectedCard.brandColor}`,
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Detail Panel Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              paddingBottom: "1rem",
              marginBottom: "1.2rem",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <PlatformBadge platform={selectedCard.platform} size="lg" />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {selectedCard.platform} — Complete Platform Offer Breakdown
                  </h4>
                  {selectedCard.isCheapest && (
                    <span
                      style={{
                        background: "#10b981",
                        color: "#042f2e",
                        fontSize: "0.68rem",
                        fontWeight: 900,
                        padding: "0.18rem 0.55rem",
                        borderRadius: "999px",
                        textTransform: "uppercase",
                      }}
                    >
                      🏆 Cheapest Store
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-secondary)",
                    marginTop: "0.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Globe size={13} style={{ color: "var(--accent-cyan)" }} />
                  <span>
                    Official Marketplace Domain:{" "}
                    <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      https://www.{selectedCard.officialDomain}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              {selectedCard.score !== null && <ScoreBadge score={selectedCard.score} size="md" />}
              <a
                href={selectedCard.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mp-buy-btn btn btn-success btn-sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <span>Visit Official {selectedCard.platform} Website</span>
                <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={() => setSelectedPlatformKey(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.5rem 0.7rem" }}
                title="Close platform details"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 6-Card Detailed Metrics Grid for the Selected Platform */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.9rem",
              marginBottom: "1.2rem",
            }}
          >
            {/* 1. Price & Position */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "40ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Store Offer Price
              </div>
              <div
                style={{
                  fontSize: "1.45rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  color: selectedCard.isCheapest ? "#10b981" : "var(--text-primary)",
                  marginTop: "0.25rem",
                }}
              >
                ₹{selectedCard.price.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {selectedCard.isCheapest
                  ? "Ranked #1 Lowest Price across all stores"
                  : `₹${selectedCard.diffFromCheapest.toLocaleString("en-IN")} above lowest price store`}
              </div>
            </div>

            {/* 2. MRP & Direct Savings */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "80ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                Original MRP & Discount
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  marginTop: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ textDecoration: selectedCard.mrp > selectedCard.price ? "line-through" : "none", color: "var(--text-muted)" }}>
                  {selectedCard.mrp > 0 ? `₹${selectedCard.mrp.toLocaleString("en-IN")}` : "—"}
                </span>
                {selectedCard.discount > 0 && (
                  <span style={{ color: "#10b981", fontSize: "0.95rem" }}>{selectedCard.discount}% OFF</span>
                )}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.2rem", fontWeight: 600 }}>
                {selectedCard.savingsVsMrp > 0
                  ? `Direct savings of ₹${selectedCard.savingsVsMrp.toLocaleString("en-IN")}`
                  : "Standard retail pricing"}
              </div>
            </div>

            {/* 3. Coupon & Net Effective Price */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "120ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Tag size={12} color="var(--accent-amber)" /> Promo Coupon & Net Price
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  color: selectedCard.couponCode ? "var(--accent-amber)" : "var(--text-muted)",
                  marginTop: "0.25rem",
                }}
              >
                {selectedCard.couponCode || "No Code Required"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {selectedCard.couponDiscount > 0
                  ? `Net Price: ₹${selectedCard.netEffectivePrice.toLocaleString("en-IN")} (Extra ₹${selectedCard.couponDiscount.toLocaleString("en-IN")} off)`
                  : selectedCard.couponCode
                  ? `Apply ${selectedCard.couponCode} at ${selectedCard.platform} checkout`
                  : "Best discount already applied to price"}
              </div>
            </div>

            {/* 4. Customer Rating & Reviews */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "160ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles size={12} color="var(--accent-amber)" /> Shopper Rating & Reviews
              </div>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "var(--accent-amber)",
                  marginTop: "0.25rem",
                }}
              >
                {selectedCard.rating ? `★ ${selectedCard.rating} / 5.0` : "Verified Store"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {selectedCard.reviewCount > 0
                  ? `Based on ${selectedCard.reviewCount.toLocaleString("en-IN")} customer ratings`
                  : "Verified marketplace seller"}
              </div>
            </div>

            {/* 5. Shipping & Delivery */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "200ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Truck size={12} color="var(--accent-cyan)" /> Delivery Estimate
              </div>
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginTop: "0.25rem",
                }}
              >
                {selectedCard.deliveryLabel}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Standard doorstep delivery by {selectedCard.platform}
              </div>
            </div>

            {/* 6. Availability, Warranty & Return Policy */}
            <div
              className="mp-metric-card"
              style={{
                padding: "0.9rem 1rem",
                borderRadius: "12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                animationDelay: "240ms",
              }}
            >
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ShieldCheck size={12} color="var(--accent-green)" /> Stock & Buyer Protection
              </div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: selectedCard.inStock ? "var(--accent-green)" : "var(--accent-rose)",
                  marginTop: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                {selectedCard.inStock ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                <span>{selectedCard.inStock ? "In Stock & Ready to Ship" : "Currently Out of Stock"}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {selectedCard.warranty} • {selectedCard.returnPolicy}
              </div>
            </div>
          </div>

          {/* Selected Platform Score Breakdown Bars */}
          <div
            style={{
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.7rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Award size={14} color="var(--accent-cyan)" /> {selectedCard.platform} Multi-Criteria Evaluation
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.65rem",
              }}
            >
              {[
                { key: "price", label: "Price Value" },
                { key: "rating", label: "Customer Rating" },
                { key: "delivery", label: "Delivery Speed" },
                { key: "offers", label: "Discount & Coupon" },
                { key: "seller", label: "Store Reliability" },
              ].map(({ key, label }, barIdx) => {
                const val = Math.round(Number(selectedCard.computedSubScores[key] || 78));
                const barColor =
                  val >= 80 ? "#10b981" : val >= 60 ? "var(--accent-cyan)" : "var(--accent-amber)";
                return (
                  <div
                    key={key}
                    style={{
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      background: "var(--bg-subtle-surface)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: barColor }}>
                        {val}/100
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        className="mp-score-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, val))}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 3,
                          animationDelay: `${120 + barIdx * 65}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selective Marketplace Availability Summary Bar */}
      {(availablePlatformNames.length > 0 || unavailablePlatforms.length > 0) && (
        <div
          style={{
            marginTop: "1.15rem",
            padding: "0.75rem 1rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "0.78rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>
              ✓ Available on ({availablePlatformNames.length || cards.length}):
            </span>
            {(availablePlatformNames.length > 0 ? availablePlatformNames : cards.map((c) => c.platform)).map(
              (p) => (
                <PlatformBadge key={p} platform={p} size="sm" />
              )
            )}
          </div>
          {unavailablePlatforms.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", color: "var(--text-muted)" }}>
              <span style={{ fontWeight: 600 }}>✕ Not listed on:</span>
              {unavailablePlatforms.map((p) => (
                <span
                  key={p}
                  style={{
                    padding: "0.12rem 0.45rem",
                    borderRadius: "5px",
                    background: "rgba(148, 163, 184, 0.08)",
                    border: "1px dashed var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketplaceComparisonCards;
