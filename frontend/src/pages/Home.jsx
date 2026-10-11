import React, { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import UrlAnalyzer from "../components/UrlAnalyzer";
import AnalysisResult from "../components/AnalysisResult";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import { getProductImage, handleImageError } from "../utils/images";
import PlatformBadge from "../components/PlatformBadge";
import { Sparkles, ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import homeHeroBg from "../assets/home-hero-bg.jpg";

const Home = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => {
    if (user) {
      API.get("/recent/", { params: { type: "analyzed" } })
        .then((res) => setRecentItems((res.data.results || []).slice(0, 3)))
        .catch(() => {});
    }
  }, [user]);

  const handleResult = useCallback(
    (data) => {
      setLoading(false);
      if (data && data.id) {
        navigate(`/analysis/${data.id}`, { state: { analysis: data } });
      } else {
        setResult(data);
      }
    },
    [navigate]
  );

  const handleLoading = useCallback((isLoading) => {
    setLoading(isLoading);
    if (isLoading) setResult(null);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Home Hero 3D Theme Backdrop */}
      <div
        className="home-hero-backdrop"
        style={{
          backgroundImage: `var(--home-hero-overlay), url(${homeHeroBg})`,
        }}
      />

      <div className="page-container" style={{ position: "relative", zIndex: 1, paddingTop: "2.75rem" }}>
        {/* Hero Section */}
      <section style={{ textAlign: "center", paddingBottom: "2rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.35rem 0.95rem",
            background: "rgba(6, 182, 212, 0.1)",
            border: "1px solid rgba(6, 182, 212, 0.28)",
            borderRadius: "999px",
            color: "var(--accent-cyan)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "1.25rem",
            animation: "fadeInDown 0.5s ease both",
          }}
        >
          <Sparkles size={13} /> AI-Powered Decision Support
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginBottom: "1rem",
            animation: "fadeInDown 0.5s 0.1s ease both",
          }}
        >
          Compare Across Stores.{" "}
          <span
            style={{
              background: "var(--gradient-brand)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Decide Smarter.
          </span>
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.05rem",
            maxWidth: 680,
            margin: "0 auto 2rem",
            lineHeight: 1.6,
            animation: "fadeInDown 0.5s 0.2s ease both",
          }}
        >
          Paste any product URL from Amazon, Flipkart, Croma, Myntra & more. ShopSmart cross-scrapes alternative stores, analyzes prices & ratings, and computes an explainable <strong>Best Deal Score</strong> before you buy.
        </p>

        {/* Feature Value Pills */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.25rem",
            flexWrap: "wrap",
            marginBottom: "2.5rem",
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            fontWeight: 600,
            animation: "fadeInDown 0.5s 0.25s ease both",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Zap size={14} color="var(--accent-cyan)" /> Live Marketplace Extraction
          </span>
          <span>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <BarChart3 size={14} color="var(--accent-green)" /> 8-Dimension Deal Scoring
          </span>
          <span>•</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldCheck size={14} color="var(--accent-purple)" /> 100% Unbiased Recommendations
          </span>
        </div>
      </section>

      {/* URL Analyzer Panel */}
      <div
        className="card-glass card-glow"
        style={{
          padding: "2rem",
          marginBottom: "3.5rem",
          animation: "slideUp 0.4s 0.3s ease both",
        }}
      >
        <UrlAnalyzer onResult={handleResult} onLoading={handleLoading} />
      </div>

      {/* Live Loading State */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "var(--text-secondary)",
            animation: "fadeIn 0.3s ease",
            background: "var(--bg-secondary)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            marginBottom: "3rem",
          }}
        >
          <div
            className="spinner"
            style={{ width: 36, height: 36, margin: "0 auto 1.25rem", borderWidth: 3 }}
          />
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            Running Cross-Platform Intelligence
          </div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Scraping live prices, parsing seller metadata, and calculating Best Deal Score...
          </div>
        </div>
      )}

      {/* Immediate Inline Analysis Result (if available) */}
      {!loading && result && (
        <div style={{ marginBottom: "3.5rem" }}>
          <AnalysisResult data={result} analysisId={result?.id} />
        </div>
      )}

      {/* Default State: How It Works & Recent Analyses */}
      {!loading && !result && (
        <>
          {/* How It Works Section */}
          <section className="section-container">
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--accent-cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
                Decision Pipeline
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>How ShopSmart Works</h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {[
                {
                  step: "01",
                  title: "Paste Any Product Link",
                  desc: "Copy a link from Amazon, Flipkart, Croma, Myntra, or AJIO. Our scraper automatically recognizes the marketplace and item identity.",
                  icon: "🔗",
                  badge: "Input Stage",
                  color: "var(--accent-cyan)",
                },
                {
                  step: "02",
                  title: "Live Cross-Store Matching",
                  desc: "ShopSmart scans alternate stores in parallel, extracting real-time pricing, stock status, delivery speed, and coupon codes.",
                  icon: "⚡",
                  badge: "Extraction Stage",
                  color: "var(--accent-blue)",
                },
                {
                  step: "03",
                  title: "AI Best Deal Recommendation",
                  desc: "Our weighted model computes an explainable 0–100 score across 8 dimensions to advise whether to buy now or wait.",
                  icon: "🏆",
                  badge: "Decision Stage",
                  color: "var(--accent-green)",
                },
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="card-panel card-glow"
                  style={{
                    padding: "1.75rem",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    animation: `slideUp 0.4s ${0.35 + i * 0.1}s ease both`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "12px",
                        background: `${item.color}15`,
                        border: `1px solid ${item.color}35`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.4rem",
                      }}
                    >
                      {item.icon}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "1rem",
                        fontWeight: 800,
                        color: item.color,
                        opacity: 0.8,
                      }}
                    >
                      {item.step}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: item.color,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {item.badge}
                  </span>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.6rem" }}>
                    {item.title}
                  </h3>

                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Analyses (Logged-In Users) */}
          {user && recentItems.length > 0 && (
            <section className="section-container">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Recent Decision Reports</h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Your recently analyzed products and price comparisons
                  </p>
                </div>
                <Link
                  to="/recent"
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <span>View All History</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {recentItems.map((item) => {
                  const price =
                    item.analysis_result?.comparisons?.best_price ||
                    item.analysis_result?.product?.price;
                  const platform = item.detected_platform || item.analysis_result?.platform;

                  return (
                    <Link
                      key={item.id}
                      to={`/analysis/${item.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div
                        className="card-panel card-glow"
                        style={{
                          padding: "1.25rem",
                          display: "flex",
                          gap: "1rem",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 68,
                            height: 68,
                            borderRadius: "10px",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.4rem",
                          }}
                        >
                          <img
                            src={getProductImage(
                              item.product_image || item.analysis_result?.product?.image_url,
                              {
                                title: item.product_title || item.analysis_result?.product?.title,
                                brand: item.product_brand || item.analysis_result?.product?.brand,
                                category: item.product_category || item.analysis_result?.product?.category,
                              }
                            )}
                            alt={item.product_title || item.analysis_result?.product?.title || "Analyzed Product"}
                            data-brand={item.product_brand || item.analysis_result?.product?.brand || ""}
                            data-category={item.product_category || item.analysis_result?.product?.category || ""}
                            referrerPolicy="no-referrer"
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            onError={handleImageError}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.92rem",
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginBottom: "0.35rem",
                            }}
                          >
                            {item.product_title || "Analyzed Product"}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                            {platform && <PlatformBadge platform={platform} size="sm" />}
                            {price && (
                              <span
                                style={{
                                  fontSize: "0.95rem",
                                  fontWeight: 800,
                                  color: "var(--accent-green)",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                ₹{Number(price).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quick-Start Discovery Section */}
          {(!user || recentItems.length === 0) && (
            <section
              className="card-glass"
              style={{
                padding: "2.5rem 2rem",
                textAlign: "center",
                borderRadius: "18px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "14px",
                  background: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-cyan)",
                }}
              >
                <Zap size={26} />
              </div>

              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                  Ready to test cross-store comparison?
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 560, margin: "0 auto" }}>
                  Paste any product link from Amazon, Flipkart, Croma, Myntra, or AJIO into the analyzer above to instantly discover matching listings, price differences, and our explainable Best Deal Score.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="btn btn-primary btn-md"
                >
                  <Sparkles size={16} /> Analyze a Product Now
                </button>
                {!user && (
                  <Link to="/register" className="btn btn-secondary btn-md">
                    Create Free Account
                  </Link>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  </div>
  );
};

export default Home;
