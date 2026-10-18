import React from "react";

/**
 * DealLens Custom Cart-Inside-Lens SVG Brand Logo
 * Combines a magnifying glass ("Lens") with a shopping cart & deal checkmark ("Deal").
 */
export const BrandIcon = ({ size = 34, className = "", style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    className={className}
    style={{
      flexShrink: 0,
      filter: "drop-shadow(0 0 10px rgba(6, 182, 212, 0.32))",
      ...style,
    }}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="dl-icon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0b0f19" />
        <stop offset="100%" stopColor="#162032" />
      </linearGradient>
      <linearGradient id="dl-icon-lens" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="55%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="dl-icon-cart" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#bae6fd" />
      </linearGradient>
      <radialGradient id="dl-icon-glow" cx="42%" cy="42%" r="45%">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Squircle Badge Container */}
    <rect
      x="2"
      y="2"
      width="60"
      height="60"
      rx="15"
      fill="url(#dl-icon-bg)"
      stroke="url(#dl-icon-lens)"
      strokeWidth="2.5"
    />
    <circle cx="27" cy="27" r="20" fill="url(#dl-icon-glow)" />

    {/* Magnifying Lens Handle */}
    <path
      d="M40.5 40.5L53 53"
      stroke="url(#dl-icon-lens)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M41.5 41.5L51.5 51.5"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeOpacity="0.55"
    />

    {/* Magnifying Lens Outer Ring */}
    <circle
      cx="27"
      cy="27"
      r="18"
      fill="#0f172a"
      fillOpacity="0.8"
      stroke="url(#dl-icon-lens)"
      strokeWidth="3.8"
    />

    {/* Shopping Cart Inside Lens */}
    <path
      d="M16.5 20.5H19.5L21.8 30.2C22.05 31.25 22.98 32 24.06 32H33.4C34.38 32 35.24 31.36 35.55 30.42L37.8 23.5H20.4"
      stroke="url(#dl-icon-cart)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Deal Verification Check / Trend Line inside Cart */}
    <path
      d="M24 27.5L26.8 29.8L32.5 24.5"
      stroke="#10b981"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Cart Wheels */}
    <circle cx="24.5" cy="36" r="2.2" fill="#10b981" />
    <circle cx="33" cy="36" r="2.2" fill="#06b6d4" />

    {/* Lens Deal Spark Accent */}
    <path
      d="M38 12L39.1 14.9L42 16L39.1 17.1L38 20L36.9 17.1L34 16L36.9 14.9L38 12Z"
      fill="#10b981"
    />
  </svg>
);

const BrandLogo = ({ iconSize = 34, fontSize = "1.42rem", showText = true }) => {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        userSelect: "none",
      }}
    >
      <BrandIcon size={iconSize} />
      {showText && (
        <span
          style={{
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "var(--text-primary)",
              WebkitTextFillColor: "var(--text-primary)",
            }}
          >
            Deal
          </span>
          <span
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Lens
          </span>
        </span>
      )}
    </span>
  );
};

export default BrandLogo;
