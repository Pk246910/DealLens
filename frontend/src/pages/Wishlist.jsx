import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { SkeletonProductCard } from "../components/Skeleton";
import { getProductImage, handleImageError } from "../utils/images";
import toast from "react-hot-toast";
import {
  Heart,
  Trash2,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

const Wishlist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get("/wishlist/");
      const data = res.data;
      const list = data.results !== undefined ? data.results : data;
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load saved wishlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
    const handler = () => fetchWishlist();
    window.addEventListener("wishlist:changed", handler);
    return () => window.removeEventListener("wishlist:changed", handler);
  }, [user]);

  const remove = async (id, title) => {
    try {
      await API.delete(`/wishlist/${id}/`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      window.dispatchEvent(new Event("wishlist:changed"));
      toast.success(`Removed "${title || "item"}" from wishlist.`);
    } catch {
      toast.error("Failed to remove item.");
    }
  };

  if (!user) {
    return (
      <div className="page-container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <div
          className="card-panel card-glow"
          style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 2rem" }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "14px",
              background: "rgba(244, 63, 94, 0.12)",
              color: "var(--accent-rose)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Heart size={28} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Sign In to Access Your Wishlist
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Create custom watchlists and track historical price movements across Amazon, Flipkart, and Croma.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <span>Sign In to Shopper Portal</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: "2.5rem 1rem 4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--accent-rose)",
              background: "rgba(244, 63, 94, 0.1)",
              padding: "0.2rem 0.6rem",
              borderRadius: 999,
              border: "1px solid rgba(244, 63, 94, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Heart size={12} fill="var(--accent-rose)" />
            Saved Watchlist
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.4rem", fontFamily: "var(--font-heading)" }}>
          Monitored Products ({items.length})
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
          Items you've bookmarked for automated multi-store price intelligence and tracking.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div
          className="card-panel"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            borderRadius: "16px",
            border: "1px dashed var(--border-color)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "14px",
              background: "rgba(6, 182, 212, 0.1)",
              color: "var(--accent-cyan)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.4rem" }}>
            Your Wishlist is Empty
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 440, margin: "0 auto 1.5rem" }}>
            Paste any product link into the ShopSmart analyzer or browse recent analyses to save products to your watchlist.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Sparkles size={16} />
            <span>Analyze Product URL</span>
          </Link>
        </div>
      ) : (
        /* Items Grid */
        <div className="product-grid">
          {items.map((w) => {
            const p = w.product_details || w.product;
            if (!p) return null;
            const price = p.lowest_price || p.offers?.[0]?.current_price;

            return (
              <div
                key={w.id}
                className="card-panel card-glow"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "1.25rem",
                  borderRadius: "14px",
                  position: "relative",
                  transition: "all 0.25s ease",
                }}
              >
                {/* Brand & Category */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                    fontSize: "0.74rem",
                  }}
                >
                  <span style={{ color: "var(--accent-cyan)", fontWeight: 700, textTransform: "uppercase" }}>
                    {p.brand || "Brand"}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {p.category || "General"}
                  </span>
                </div>

                {/* Product Image */}
                <Link
                  to={`/product/${p.id}`}
                  style={{
                    height: 180,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    borderRadius: "10px",
                    padding: "0.75rem",
                    marginBottom: "1rem",
                    textDecoration: "none",
                  }}
                >
                  <img
                    src={getProductImage(p.image_url)}
                    alt={p.title}
                    onError={handleImageError}
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      transition: "transform 0.25s ease",
                    }}
                  />
                </Link>

                {/* Title */}
                <Link
                  to={`/product/${p.id}`}
                  style={{
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    lineHeight: 1.35,
                    marginBottom: "0.75rem",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    height: "2.5rem",
                  }}
                  title={p.title}
                >
                  {p.title}
                </Link>

                {/* Pricing Block */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "1.35rem",
                        fontWeight: 800,
                        color: "var(--accent-emerald)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {price ? `₹${Number(price).toLocaleString("en-IN")}` : "Check Stores"}
                    </span>
                    {p.lowest_mrp && Number(p.lowest_mrp) > Number(price) && (
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                          textDecoration: "line-through",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        ₹{Number(p.lowest_mrp).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Saved on {new Date(w.added_at).toLocaleDateString("en-IN")}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
                  <Link
                    to={`/product/${p.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                      fontSize: "0.78rem",
                      textDecoration: "none",
                    }}
                  >
                    <span>Inspect</span>
                    <ExternalLink size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(w.id, p.title)}
                    className="btn btn-sm"
                    style={{
                      padding: "0.4rem 0.65rem",
                      background: "rgba(244, 63, 94, 0.1)",
                      color: "var(--accent-rose)",
                      border: "1px solid rgba(244, 63, 94, 0.25)",
                    }}
                    title="Remove from wishlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
