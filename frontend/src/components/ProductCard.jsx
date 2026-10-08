import React from "react";
import { Link } from "react-router-dom";
import { getProductImage, handleImageError } from "../utils/images";
import ScoreBadge from "./ScoreBadge";
import PlatformBadge from "./PlatformBadge";

const ProductCard = ({ product, action, footerText, linkTo }) => {
  if (!product) return null;

  const targetLink = linkTo || `/product/${product.id}`;
  const price = product.lowest_price || product.price || product.offers?.[0]?.current_price;
  const mrp = product.mrp || product.original_price;
  const discount = product.discount || (mrp && price && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const score = product.best_deal_score ?? product.score;
  const platforms = product.platforms_available || [];

  return (
    <div className="product-card-elevated">
      {/* Top Header: Category & Score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--accent-cyan)",
          }}
        >
          {product.category || product.brand || "Product"}
        </span>
        {score !== undefined && score !== null && (
          <ScoreBadge score={score} size="sm" />
        )}
      </div>

      {/* Product Image Link */}
      <Link to={targetLink} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        <div className="image-showcase">
          <img
            src={getProductImage(product.image_url)}
            alt={product.title}
            loading="lazy"
            onError={handleImageError}
          />
        </div>

        {/* Title */}
        <h3 className="product-name" title={product.title}>
          {product.title}
        </h3>

        {/* Brand Subtitle if available */}
        {product.brand && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem", fontWeight: 500 }}>
            by <strong style={{ color: "var(--text-secondary)" }}>{product.brand}</strong>
          </div>
        )}

        {/* Price & Discount Row */}
        <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: price ? "var(--accent-green)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "-0.03em",
              }}
            >
              {price ? `₹${Number(price).toLocaleString("en-IN")}` : "N/A"}
            </span>

            {mrp > price && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ₹{Number(mrp).toLocaleString("en-IN")}
              </span>
            )}

            {discount > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "var(--accent-rose)",
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "6px",
                }}
              >
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Store Availability Indicators */}
          {platforms.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
              {platforms.slice(0, 3).map((plat, i) => (
                <PlatformBadge key={i} platform={plat} size="sm" />
              ))}
              {platforms.length > 3 && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "var(--text-muted)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                  }}
                >
                  +{platforms.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Custom Action (e.g. Remove Button or View Button) */}
      {action && (
        <div style={{ marginTop: "0.85rem" }}>
          {action}
        </div>
      )}

      {/* Footer Text */}
      {footerText && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            marginTop: "0.6rem",
            textAlign: "center",
          }}
        >
          {footerText}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
