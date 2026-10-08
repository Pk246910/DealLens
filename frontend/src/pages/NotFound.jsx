import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
        padding: "3rem 2.5rem",
        maxWidth: 480,
        width: "100%",
      }}>
        <div style={{
          fontSize: "5rem",
          fontWeight: 900,
          background: "var(--gradient-brand)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: "0.5rem",
        }}>404</div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Page Not Found
        </h1>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
          lineHeight: 1.6,
          marginBottom: "1.75rem",
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" style={{
            padding: "0.65rem 1.5rem",
            borderRadius: "10px",
            border: "none",
            background: "var(--accent-cyan)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}>Go Home</Link>
          <Link to="/recent" style={{
            padding: "0.65rem 1.5rem",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontWeight: 700,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}>View Recent</Link>
        </div>
        <div style={{
          marginTop: "1.75rem",
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {[
            { to: "/", label: "Analyze" },
            { to: "/recent", label: "Recent History" },
            { to: "/wishlist", label: "Wishlist" },
          ].map((link) => (
            <Link key={link.to} to={link.to} style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              fontWeight: 600,
            }}>
              {link.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
