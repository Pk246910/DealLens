import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Heart,
  Bell,
  ArrowLeft,
  ExternalLink,
  TrendingDown,
  Activity,
} from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ShareButton from "../components/ShareButton";
import PlatformBadge from "../components/PlatformBadge";
import { SkeletonProductDetail } from "../components/Skeleton";
import { getProductImage, handleImageError } from "../utils/images";
import { getPlatformColor } from "../utils/platforms";
import toast from "react-hot-toast";

const CHART_COLORS = {
  Amazon: "#f59e0b",
  Flipkart: "#3b82f6",
  Croma: "#06b6d4",
  "Reliance Digital": "#10b981",
  Myntra: "#ec4899",
  AJIO: "#8b5cf6",
  Meesho: "#f43f5e",
  "Tata CLiQ": "#6366f1",
};

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [wishlistSaving, setWishlistSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [targetPrice, setTargetPrice] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);
  const [hiddenStores, setHiddenStores] = useState([]);

  useEffect(() => {
    setLoading(true);
    API.get(`/products/${id}/`)
      .then((res) => {
        setProduct(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Product not found or has been removed.");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    API.get("/wishlist/")
      .then((res) => {
        const list = res.data.results || res.data;
        const found = Array.isArray(list)
          ? list.find(
              (w) =>
                String(w.product) === String(id) ||
                w.product?.id === Number(id)
            )
          : null;
        if (found) {
          setWishlisted(true);
          setWishlistId(found.id);
        }
      })
      .catch(() => {});
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    setHistoryLoading(true);
    API.get(`/products/${id}/history/`)
      .then((res) => setHistory(res.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [id]);

  const toggleWishlist = async () => {
    if (!user) {
      toast.error("Please login to save products to your wishlist");
      return;
    }
    setWishlistSaving(true);
    try {
      if (wishlisted && wishlistId) {
        await API.delete(`/wishlist/${wishlistId}/`);
        setWishlisted(false);
        setWishlistId(null);
        toast.success("Removed from wishlist");
      } else {
        const res = await API.post("/wishlist/", {
          product: Number(id),
        });
        setWishlisted(true);
        setWishlistId(res.data.id);
        toast.success("Saved to wishlist");
      }
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update wishlist");
    } finally {
      setWishlistSaving(false);
    }
  };

  const handleSetAlert = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to set price alerts");
      return;
    }
    if (!product?.id || !targetPrice) return;
    setAlertSaving(true);
    try {
      await API.post("/users/alerts/", {
        product: product.id,
        target_price: Number(targetPrice),
      });
      toast.success(`Alert set for ₹${Number(targetPrice).toLocaleString("en-IN")}`);
      setTargetPrice("");
      window.dispatchEvent(new Event("alert:changed"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to set alert");
    } finally {
      setAlertSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: "2.5rem" }}>
        <SkeletonProductDetail />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page-container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <div className="card-panel" style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📦</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-rose)", marginBottom: "0.5rem" }}>
            {error || "Product Not Found"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            The requested product details could not be retrieved from the catalog.
          </p>
          <Link to="/" className="btn btn-secondary btn-sm">
            ← Return Home
          </Link>
        </div>
      </div>
    );
  }

  const offers = product.offers || [];
  const bestOffer = product.best_offer || offers[0];

  const allStores = [...new Set(history.map((h) => h.store_name).filter(Boolean))];
  const visibleStores = allStores.filter((s) => !hiddenStores.includes(s));
  const visibleHistory = history.filter((h) => visibleStores.includes(h.store_name));

  const toggleStore = (s) => {
    setHiddenStores((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const chartData = visibleHistory
    .filter((h) => h.price > 0 && h.price < 10000000)
    .slice()
    .reverse()
    .reduce((acc, cur) => {
      const date = new Date(cur.recorded_at).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
      let existing = acc.find((x) => x.date === date);
      if (!existing) {
        existing = { date };
        acc.push(existing);
      }
      existing[cur.store_name] = Number(cur.price);
      return acc;
    }, []);

  const lowestPrice =
    offers.length > 0
      ? Math.min(...offers.map((o) => Number(o.current_price)))
      : 0;

  return (
    <div className="page-container" style={{ paddingTop: "2rem" }}>
      {/* Top Breadcrumb & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <Link
          to="/"
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={15} /> Back to Search
        </Link>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <button
            onClick={toggleWishlist}
            disabled={wishlistSaving}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: wishlisted ? "rgba(244, 63, 94, 0.4)" : "var(--border-color)",
              background: wishlisted ? "rgba(244, 63, 94, 0.12)" : "var(--bg-card)",
              color: wishlisted ? "var(--accent-rose)" : "var(--text-primary)",
            }}
          >
            <Heart
              size={15}
              fill={wishlisted ? "var(--accent-rose)" : "none"}
              color={wishlisted ? "var(--accent-rose)" : "currentColor"}
            />
            <span>{wishlisted ? "Saved" : "Save to Wishlist"}</span>
          </button>

          <ShareButton title={product.title} price={bestOffer?.current_price} />
        </div>
      </div>

      {/* 1. Main Product Overview Panel */}
      <div
        className="card-panel"
        style={{
          padding: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "2.5rem",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        {/* Product Image Frame */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 280,
            maxWidth: 320,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <img
            src={getProductImage(product.image_url, product)}
            alt={product.title}
            data-brand={product.brand || ""}
            data-category={product.category || ""}
            referrerPolicy="no-referrer"
            style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain" }}
            onError={handleImageError}
          />
        </div>

        {/* Product Meta & Actions */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--accent-cyan)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {product.category}
            </span>
            {product.brand && (
              <>
                <span style={{ color: "var(--text-muted)" }}>•</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {product.brand}
                </span>
              </>
            )}
          </div>

          <h1
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              lineHeight: 1.35,
              marginBottom: "1rem",
              color: "var(--text-primary)",
            }}
          >
            {product.title}
          </h1>

          {/* Pricing Highlight */}
          {bestOffer && (
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-green)",
                  letterSpacing: "-0.03em",
                }}
              >
                ₹{Number(bestOffer.current_price).toLocaleString("en-IN")}
              </span>

              {bestOffer.original_price > bestOffer.current_price && (
                <span
                  style={{
                    fontSize: "1.1rem",
                    color: "var(--text-muted)",
                    textDecoration: "line-through",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ₹{Number(bestOffer.original_price).toLocaleString("en-IN")}
                </span>
              )}

              {bestOffer.discount_percent > 0 && (
                <span className="badge badge-rose" style={{ fontSize: "0.82rem" }}>
                  <TrendingDown size={14} /> {bestOffer.discount_percent}% OFF
                </span>
              )}

              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                Best price on <strong style={{ color: "var(--text-primary)" }}>{bestOffer.store_name}</strong>
              </span>
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {bestOffer?.product_url && (
              <a
                href={bestOffer.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success btn-md"
                style={{ display: "inline-flex", gap: "0.45rem" }}
              >
                <span>Buy at {bestOffer.store_name}</span>
                <ExternalLink size={15} />
              </a>
            )}

            {user && (
              <button
                onClick={() =>
                  document.getElementById("alert-section")?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="btn btn-secondary btn-md"
                style={{ display: "inline-flex", gap: "0.45rem" }}
              >
                <Bell size={15} />
                <span>Track Price Drop</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Multi-Store Price Comparison Table */}
      {offers.length > 0 && (
        <section className="card-panel" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Activity size={18} color="var(--accent-cyan)" /> Cross-Store Offer Comparison
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Comparing pricing, coupon availability, and shipping across {offers.length} merchants
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", minWidth: 700 }}>
              <thead>
                <tr style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "0.85rem 1rem" }}>Store</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Price</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Original MRP</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Discount</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Delivery</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Coupon</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Stock</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Store Link</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o, i) => {
                  const isBest = Number(o.current_price) === lowestPrice && offers.length > 1;

                  return (
                    <tr
                      key={o.id || i}
                      style={{
                        background: isBest ? "rgba(16, 185, 129, 0.08)" : "transparent",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                          <PlatformBadge platform={o.store_name} size="sm" />
                          {isBest && (
                            <span
                              style={{
                                background: "var(--accent-green)",
                                color: "#fff",
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                padding: "0.1rem 0.4rem",
                                borderRadius: 999,
                              }}
                            >
                              LOWEST
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          color: isBest ? "var(--accent-green)" : "var(--text-primary)",
                        }}
                      >
                        ₹{Number(o.current_price).toLocaleString("en-IN")}
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "var(--text-muted)",
                          textDecoration: o.original_price > o.current_price ? "line-through" : "none",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {o.original_price > o.current_price
                          ? `₹${Number(o.original_price).toLocaleString("en-IN")}`
                          : "—"}
                      </td>

                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: o.discount_percent > 0 ? "var(--accent-green)" : "var(--text-muted)",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {o.discount_percent > 0 ? `${o.discount_percent}%` : "—"}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {o.delivery_days ? `${o.delivery_days} day${o.delivery_days > 1 ? "s" : ""}` : "Standard"}
                      </td>

                      <td style={{ padding: "0.85rem 1rem" }}>
                        {o.coupon_code ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.15rem 0.45rem",
                              background: "rgba(245, 158, 11, 0.12)",
                              color: "var(--accent-amber)",
                              borderRadius: "4px",
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {o.coupon_code}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {o.in_stock === false ? (
                          <span style={{ color: "var(--accent-rose)", fontWeight: 700, fontSize: "0.8rem" }}>Out</span>
                        ) : (
                          <span style={{ color: "var(--accent-green)", fontWeight: 700, fontSize: "0.8rem" }}>In Stock</span>
                        )}
                      </td>

                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        {o.product_url ? (
                          <a
                            href={o.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ display: "inline-flex", gap: "0.35rem", fontSize: "0.78rem" }}
                          >
                            <span>Buy</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. Recharts 30-Day Historical Price Movement */}
      <section className="card-panel" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Activity size={18} color="var(--accent-purple)" /> 30-Day Price Movement Trends
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Historical daily price telemetry across tracked platforms
            </p>
          </div>

          {/* Store Filter Chips */}
          {allStores.length > 1 && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {allStores.map((s) => {
                const isHidden = hiddenStores.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStore(s)}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: isHidden ? "transparent" : "var(--bg-card)",
                      color: isHidden ? "var(--text-muted)" : "var(--text-primary)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: isHidden ? 0.45 : 1,
                      textDecoration: isHidden ? "line-through" : "none",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {historyLoading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            Loading historical telemetry...
          </div>
        ) : chartData.length > 0 ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                  }}
                />
                <Legend />
                {visibleStores.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={CHART_COLORS[s] || getPlatformColor(s, "var(--accent-cyan)")}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No price fluctuation recorded in the last 30 days. Listing remains at launch price.
          </div>
        )}
      </section>

      {/* 4. Automated 30-Day Price Alert Setter Form */}
      {user && (
        <section id="alert-section" className="card-panel card-glow" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem" }}>
            <Bell size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>
              Set Price Drop Notification
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1rem", maxWidth: 650 }}>
            Enter your target purchase price. Our background monitor will notify you when this item drops below your target.
          </p>

          <form onSubmit={handleSetAlert} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "0 0.85rem",
                width: 220,
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.95rem" }}>₹</span>
              <input
                type="number"
                placeholder="Target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                required
                min="1"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  padding: "0.7rem 0.5rem",
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={alertSaving || !targetPrice}
              className="btn btn-primary"
              style={{ padding: "0.7rem 1.4rem" }}
            >
              {alertSaving ? "Saving..." : "Set Price Alert"}
            </button>
          </form>
        </section>
      )}

      {/* 5. Technical Specifications */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <section className="card-panel">
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem" }}>
            📋 Specifications
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
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
