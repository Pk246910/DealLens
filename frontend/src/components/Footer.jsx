import React from "react";
import { Link } from "react-router-dom";
import { Shield, Cpu, Activity } from "lucide-react";

const Footer = () => {
  return (
    <footer
      style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
        padding: "3.5rem 1.5rem 2rem",
        marginTop: "auto",
        position: "relative",
        zIndex: 10,
      }}
      role="contentinfo"
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem",
        }}
      >
        {/* Brand & Mission Column */}
        <div style={{ maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <span style={{ fontSize: "1.35rem", filter: "drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))" }}>⚡</span>
            <span
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                background: "var(--gradient-brand)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              ShopSmart
            </span>
          </div>

          <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)", marginBottom: "1.25rem" }}>
            AI-powered product comparison and decision-support platform. Analyzes live listings across leading e-commerce marketplaces to calculate explainable deal scores.
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              fontSize: "0.75rem",
              color: "var(--accent-green)",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent-green)",
                boxShadow: "0 0 8px var(--accent-green)",
              }}
            />
            Multi-Platform Scrapers Online
          </div>
        </div>

        {/* Quick Links Column */}
        <div>
          <h4
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
              marginBottom: "1.1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <CompassIcon /> Platform Navigation
          </h4>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.88rem" }}>
            <li>
              <Link to="/" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--accent-cyan)"} onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}>
                Analyze Product URL
              </Link>
            </li>
            <li>
              <Link to="/recent" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--accent-cyan)"} onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}>
                Recent Analyses
              </Link>
            </li>
            <li>
              <Link to="/alerts" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--accent-cyan)"} onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}>
                Price Drop Monitor
              </Link>
            </li>
            <li>
              <Link to="/wishlist" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--accent-cyan)"} onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}>
                Saved Wishlist
              </Link>
            </li>
          </ul>
        </div>

        {/* Supported Marketplaces */}
        <div>
          <h4
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
              marginBottom: "1.1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Activity size={14} color="var(--accent-cyan)" /> Supported Stores
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#f59e0b" }}>●</span> Amazon India
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#3b82f6" }}>●</span> Flipkart
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#06b6d4" }}>●</span> Croma
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#10b981" }}>●</span> Reliance Digital
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#ec4899" }}>●</span> Myntra
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#8b5cf6" }}>●</span> AJIO
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#f43f5e" }}>●</span> Meesho
            </span>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#6366f1" }}>●</span> Tata CLiQ
            </span>
          </div>
        </div>

        {/* AI Engine & System */}
        <div>
          <h4
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
              marginBottom: "1.1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <Cpu size={14} color="var(--accent-purple)" /> Decision Engine
          </h4>
          <p style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-muted)", marginBottom: "1rem" }}>
            Weighted scoring algorithm evaluates Price (35%), Ratings (15%), Review Confidence (10%), Delivery (10%), Discounts, and Merchant Reliability.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem" }}>
            <Link
              to="/admin/login"
              style={{
                color: "var(--accent-cyan)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: 600,
              }}
            >
              <Shield size={13} /> Staff Administration Portal ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Legal / Project Disclaimer Bar */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        <div>
          © 2026 <strong>ShopSmart</strong> — AI-Powered E-Commerce Product Comparison & Decision-Support Platform.
        </div>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <span>Final Year Project</span>
          <span>•</span>
          <span>All store trademarks belong to their respective owners</span>
        </div>
      </div>
    </footer>
  );
};

const CompassIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

export default Footer;
