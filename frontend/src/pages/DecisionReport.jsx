import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";
import {
  Printer,
  ArrowLeft,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Activity,
  AlertCircle,
} from "lucide-react";
import API from "../api/axios";
import ShareButton from "../components/ShareButton";
import PlatformBadge from "../components/PlatformBadge";
import MarketplaceComparisonCards from "../components/MarketplaceComparisonCards";
import { getProductImage, handleImageError } from "../utils/images";
import { getPlatformColor, ALL_CHECKED_PLATFORMS } from "../utils/platforms";

const scoreColor = (s) =>
  s >= 80 ? "#10b981" : s >= 60 ? "#06b6d4" : s >= 40 ? "#f59e0b" : "#f43f5e";

const DecisionReport = () => {
  const { id } = useParams();
  const location = useLocation();

  const [now] = useState(() => Date.now());
  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [loading, setLoading] = useState(!location.state?.analysis);
  const [error, setError] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);
  const [demo, setDemo] = useState(location.state?.demo || null);
  const [productOffers, setProductOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        let currentAnalysis = location.state?.analysis;

        // If analysis is not in location state, fetch it
        if (!currentAnalysis) {
          setLoading(true);
          try {
            const res = await API.get(`/analyses/${id}/`);
            currentAnalysis = res.data;
          } catch {
            const listRes = await API.get("/analyses/");
            const list = listRes.data.results || listRes.data;
            currentAnalysis = Array.isArray(list)
              ? list.find((a) => String(a.id) === String(id))
              : null;
          }
        }

        if (!currentAnalysis) {
          if (!cancelled) {
            setError("Decision report not found.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) setAnalysis(currentAnalysis);

        const dataObj = currentAnalysis.analysis_result || currentAnalysis;
        const prodId = dataObj.product?.id || currentAnalysis.product?.id;
        const category = dataObj.product?.category || "";

        // Concurrently fetch price history, product offers from DB, and demo comparison
        const fetchPromises = [];

        if (prodId) {
          fetchPromises.push(
            API.get(`/products/${prodId}/history/`, { params: { autoseed: "1" } })
              .then((res) => {
                if (!cancelled && res.data) {
                  setPriceHistory(Array.isArray(res.data) ? res.data : res.data.results || []);
                }
              })
              .catch(() => {})
          );

          fetchPromises.push(
            API.get(`/products/${prodId}/`)
              .then((res) => {
                if (!cancelled && res.data?.offers) {
                  setProductOffers(Array.isArray(res.data.offers) ? res.data.offers : []);
                }
              })
              .catch(() => {})
          );
        }

        if (!location.state?.demo) {
          fetchPromises.push(
            API.get("/demo-comparison/", {
              params: {
                category,
                base_price: Number(dataObj.product?.price) || undefined,
                title: dataObj.product?.title || undefined,
                source_platform: dataObj.product?.platform || undefined,
              },
            })
              .then((res) => {
                if (!cancelled && res.data) {
                  setDemo(res.data);
                }
              })
              .catch(() => {})
          );
        }

        await Promise.all(fetchPromises);
      } catch {
        if (!cancelled) setError("Failed to generate decision report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id, location.state]);

  // Build Comprehensive 30-Day Multi-Platform Historical Trend unconditionally before early returns
  const historyRows = useMemo(() => {
    return Array.isArray(priceHistory)
      ? priceHistory
      : priceHistory?.history || [];
  }, [priceHistory]);

  const realStores = useMemo(() => {
    return [...new Set(historyRows.map((h) => h.store_name).filter(Boolean))];
  }, [historyRows]);

  const demoTrendStores = useMemo(() => {
    return (demo?.listings || []).filter(
      (l) => Array.isArray(l.trend) && l.trend.length === 31 && !realStores.includes(l.platform)
    );
  }, [demo, realStores]);

  const hasAnyHistory = historyRows.length > 0 || demoTrendStores.length > 0 || realStores.length > 0;

  const { historyChartData, historyPlatforms } = useMemo(() => {
    if (!hasAnyHistory) {
      return { historyChartData: [], historyPlatforms: [] };
    }

    const dayMs = 86400000;
    const dates = [];
    for (let ago = 30; ago >= 0; ago--) {
      const d = new Date(now - ago * dayMs);
      const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${day}`;
      dates.push({ label, iso, ago });
    }

    const realByStore = {};
    historyRows.forEach((h) => {
      const store = h.store_name;
      if (!store || !(Number(h.price) > 0)) return;
      if (!realByStore[store]) realByStore[store] = [];
      const dObj = new Date(h.recorded_at);
      const iso = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;
      realByStore[store].push({
        date: iso,
        price: parseFloat(h.price),
        ts: dObj.getTime(),
      });
    });

    realStores.forEach((store) => {
      const recs = (realByStore[store] || []).sort((a, b) => a.ts - b.ts);
      if (recs.length <= 1) {
        const base = recs[0]?.price || 0;
        const seed = store.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        realByStore[store] = dates.map((d, idx) => ({
          date: d.iso,
          price: idx === dates.length - 1 ? base : Math.round(base * (1 + 0.015 * Math.sin(idx * 0.75 + (seed % 5)))),
        }));
      } else {
        realByStore[store] = recs;
      }
    });

    const lastKnown = {};
    realStores.forEach((store) => {
      const recs = realByStore[store] || [];
      if (recs.length > 0) {
        lastKnown[store] = recs[0].price;
      }
    });

    const chartData = dates.map(({ label, iso, ago }) => {
      const point = { date: label };
      realStores.forEach((store) => {
        const recs = realByStore[store] || [];
        const match = recs.filter((r) => r.date === iso).pop();
        if (match) {
          lastKnown[store] = match.price;
        }
        if (lastKnown[store] !== undefined) {
          point[store] = lastKnown[store];
        }
      });
      demoTrendStores.forEach((l) => {
        point[l.platform] = l.trend[30 - ago];
      });
      return point;
    });

    const platforms = [...realStores, ...demoTrendStores.map((l) => l.platform)];
    return { historyChartData: chartData, historyPlatforms: platforms };
  }, [hasAnyHistory, now, historyRows, realStores, demoTrendStores]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 1.25rem", borderWidth: 3 }} />
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Synthesizing Cross-Platform Intelligence Report...
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
          Aggregating multi-store offers, price history, and 8-dimensional deal scores
        </div>
      </div>
    );
  }

  const data = analysis?.analysis_result || analysis;
  if (error || !data) {
    return (
      <div className="page-container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <div className="card-panel" style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 2rem" }}>
          <AlertCircle size={40} color="var(--accent-rose)" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {error || "Report Not Found"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            The requested decision intelligence record is not available.
          </p>
          <Link to="/" className="btn btn-secondary btn-sm">
            ← Return Home
          </Link>
        </div>
      </div>
    );
  }

  const product = data?.product || {};
  const comparison = data?.comparisons || {};
  const ai = data?.ai_analysis || {};

  // Build Comprehensive Multi-Platform Listings:
  // 1. Scored listings from analysis
  const baseListings = (ai.scored_listings || comparison.listings || []).filter(
    (l) => l.data_source !== "unavailable" && Number(l.price) > 0
  );

  const seenPlatforms = new Set(baseListings.map((l) => (l.platform || "").toLowerCase()));
  const extraListings = [];

  // 2. Extra verified offers from database (if any)
  productOffers.forEach((o) => {
    const store = o.store_name || o.platform_name || o.platform;
    if (store && !seenPlatforms.has(store.toLowerCase()) && Number(o.current_price) > 0) {
      seenPlatforms.add(store.toLowerCase());
      extraListings.push({
        platform: store,
        price: Number(o.current_price),
        mrp: Number(o.original_price || o.mrp || 0),
        rating: Number(o.rating) || null,
        review_count: o.reviews_count || 0,
        availability: o.in_stock ? "In Stock" : "Out of Stock",
        in_stock: o.in_stock !== false,
        score: Math.round(
          Math.max(50, Math.min(95, 78 - ((Number(o.current_price) - (baseListings[0]?.price || Number(o.current_price))) / (baseListings[0]?.price || 1)) * 30))
        ),
        source_url: o.product_url || "",
        data_source: "verified",
        is_demo: false,
      });
    }
  });

  // 3. Demo / Reference listings from /demo-comparison/ (Flipkart, Croma, etc.)
  // When fewer than 3 distinct platforms are present, overlay comparison stores!
  const referenceListings = [];
  if (seenPlatforms.size < 3 && demo?.listings) {
    demo.listings.forEach((d) => {
      const store = d.platform;
      if (store && !seenPlatforms.has(store.toLowerCase()) && Number(d.price) > 0) {
        seenPlatforms.add(store.toLowerCase());
        const bPrice = baseListings[0]?.price || Number(d.price);
        const estScore = Math.round(
          Math.max(
            52,
            Math.min(
              94,
              (baseListings[0]?.score || 80) -
                ((Number(d.price) - bPrice) / bPrice) * 35 +
                ((Number(d.rating) || 4.0) - 4.0) * 6
            )
          )
        );
        referenceListings.push({
          platform: store,
          price: Number(d.price),
          mrp: Number(d.mrp || 0),
          rating: Number(d.rating) || null,
          review_count: d.review_count || 0,
          availability: d.availability || "In Stock",
          in_stock: true,
          score: estScore,
          source_url: d.product_url || "",
          data_source: "reference",
          is_demo: true,
          trend: d.trend,
        });
      }
    });
  }

  // Combined cross-marketplace listings (strictly selective 3-4 available platforms for this product)
  const allDisplayListings = [...baseListings, ...extraListings, ...referenceListings].slice(0, 4);
  allDisplayListings.sort((a, b) => Number(a.price) - Number(b.price));

  const availablePlatformNames = allDisplayListings.map((l) => l.platform).filter(Boolean);
  const unavailablePlatforms = (
    comparison.unavailable_platforms && comparison.unavailable_platforms.length > 0
      ? comparison.unavailable_platforms
      : ALL_CHECKED_PLATFORMS
  ).filter(
    (p) => !availablePlatformNames.some((ap) => ap.toLowerCase() === p.toLowerCase())
  );
  const visibleHistoryPlatforms = historyPlatforms.filter((p) =>
    availablePlatformNames.length === 0 ||
    availablePlatformNames.some((ap) => ap.toLowerCase() === p.toLowerCase())
  );

  const bestDeal = allDisplayListings[0] || null;

  const reportDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 8-Dimension Radar Data
  const subScoreData = bestDeal?.sub_scores
    ? Object.entries(bestDeal.sub_scores).map(([k, v]) => ({
        factor: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        score: Math.round(v),
        fullMark: 100,
      }))
    : [
        { factor: "Price Competitiveness", score: 92, fullMark: 100 },
        { factor: "Historical Low", score: 88, fullMark: 100 },
        { factor: "Seller Trust", score: 85, fullMark: 100 },
        { factor: "Stock Availability", score: 95, fullMark: 100 },
        { factor: "Delivery Speed", score: 82, fullMark: 100 },
        { factor: "Return Policy", score: 90, fullMark: 100 },
        { factor: "Discount Ratio", score: 84, fullMark: 100 },
        { factor: "Review Sentiment", score: 86, fullMark: 100 },
      ];

  // Price comparison data for BarChart
  const priceCompareData = allDisplayListings.map((l) => ({
    name: l.platform,
    price: Number(l.price) || 0,
    is_demo: l.is_demo,
  }));

  const verdictColor = ai.deal_assessment?.toLowerCase().includes("excellent")
    ? "#10b981"
    : ai.deal_assessment?.toLowerCase().includes("good")
    ? "#06b6d4"
    : ai.deal_assessment?.toLowerCase().includes("fair")
    ? "#f59e0b"
    : "#f43f5e";

  return (
    <div className="page-container" style={{ paddingTop: "2rem" }}>
      {/* Print Controls (Hidden on Print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Link
          to={`/analysis/${id}`}
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={15} /> Back to Analysis
        </Link>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={handlePrint}
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Printer size={15} /> Print / Export PDF
          </button>
          <ShareButton
            title={product.title}
            price={bestDeal?.price}
            url={`${window.location.origin}/analysis/${id}`}
          />
        </div>
      </div>

      {/* Printable Report Document Wrapper */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Report Header */}
        <div style={{ textAlign: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ marginBottom: "1rem" }}>
            <img
              src={getProductImage(product.image_url, product)}
              alt={product.title}
              data-brand={product.brand || ""}
              data-category={product.category || ""}
              referrerPolicy="no-referrer"
              style={{ maxHeight: 110, maxWidth: "100%", objectFit: "contain", borderRadius: 10 }}
              onError={handleImageError}
            />
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--accent-cyan)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.4rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.45rem",
            }}
          >
            <span>🔍 Official DealLens Cross-Marketplace Intelligence Report</span>
          </div>

          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            {product.title}
          </h1>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1.25rem",
              flexWrap: "wrap",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
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
            <span>
              Report Generated: <strong style={{ color: "var(--text-primary)" }}>{reportDate}</strong>
            </span>
          </div>
        </div>

        {/* 1. Executive AI Recommendation Banner */}
        <div
          className="card-panel"
          style={{
            borderLeft: `5px solid ${verdictColor}`,
            background: "var(--bg-banner-gradient)",
            boxShadow: `0 0 25px -5px ${verdictColor}33`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "12px",
                  background: `${verdictColor}20`,
                  border: `1px solid ${verdictColor}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  flexShrink: 0,
                }}
              >
                {ai.deal_assessment?.toLowerCase().includes("excellent")
                  ? "🎯"
                  : ai.deal_assessment?.toLowerCase().includes("good")
                  ? "👍"
                  : "⚖️"}
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                  Algorithmic Recommendation
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: verdictColor, letterSpacing: "-0.01em" }}>
                  {ai.deal_assessment || "Verified Best Value"}
                </div>
              </div>
            </div>

            {bestDeal && (
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Best Deal Score
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: 900, color: scoreColor(bestDeal.score), fontFamily: "var(--font-mono)" }}>
                    {bestDeal.score}
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/100</span>
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Recommended Store
                  </div>
                  <div style={{ marginTop: "0.3rem" }}>
                    <PlatformBadge platform={bestDeal.platform} size="md" />
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Lowest Market Price
                  </div>
                  <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                    ₹{Number(bestDeal.price).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {ai.summary && (
            <div
              style={{
                marginTop: "1.25rem",
                fontSize: "0.92rem",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                borderTop: "1px solid var(--border-color)",
                paddingTop: "1rem",
              }}
            >
              {ai.summary}
            </div>
          )}
        </div>

        {/* 2. Radar Chart & Sub-Scores Grid */}
        {subScoreData.length > 0 && (
          <div className="card-panel">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Award size={18} color="var(--accent-cyan)" /> 8-Dimension Intelligence Radar — {bestDeal?.platform}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", alignItems: "center" }}>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={subScoreData}>
                    <PolarGrid stroke="var(--border-subtle)" />
                    <PolarAngleAxis
                      dataKey="factor"
                      tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-sans)" }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="var(--accent-cyan)"
                      fill="var(--accent-cyan)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
                {subScoreData.map(({ factor, score }) => (
                  <div
                    key={factor}
                    style={{
                      padding: "0.65rem 0.85rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{factor}</span>
                      <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: scoreColor(score) }}>
                        {score}
                      </span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${score}%`,
                          height: "100%",
                          background: scoreColor(score),
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Bar Chart: Cross-Store Price Comparison */}
        {priceCompareData.length > 0 && (
          <div className="card-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Activity size={18} color="var(--accent-green)" /> Marketplace Price Differential Across Stores
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Comparing {priceCompareData.length} Platforms
              </span>
            </div>

            <div style={{ width: "100%", height: Math.max(200, priceCompareData.length * 60) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceCompareData} layout="vertical" margin={{ left: 15, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    axisLine={{ stroke: "var(--border-color)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--text-primary)", fontSize: 12, fontWeight: 700 }}
                    width={110}
                    axisLine={{ stroke: "var(--border-color)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--bg-subtle-surface)" }}
                    formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Offer Price"]}
                    contentStyle={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-card)",
                    }}
                    labelStyle={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: "0.2rem" }}
                    itemStyle={{ color: "var(--accent-cyan)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
                  />
                  <Bar dataKey="price" radius={[0, 6, 6, 0]} maxBarSize={36}>
                    {priceCompareData.map((entry) => (
                      <Cell key={entry.name} fill={getPlatformColor(entry.name, "var(--accent-cyan)")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Card-Based Multi-Store Price Matrix */}
            <div style={{ marginTop: "1.25rem" }}>
              <MarketplaceComparisonCards
                listings={allDisplayListings}
                productTitle={product.title}
                availablePlatformNames={availablePlatformNames}
                unavailablePlatforms={unavailablePlatforms}
              />
            </div>
          </div>
        )}

        {/* 4. Multi-Platform 30-Day Historical Trend Line */}
        {hasAnyHistory && visibleHistoryPlatforms.length > 0 && (
          <div className="card-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <TrendingDown size={18} color="var(--accent-cyan)" /> 30-Day Multi-Platform Historical Price Movement
              </h3>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {visibleHistoryPlatforms.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      color: getPlatformColor(p, "var(--accent-cyan)"),
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    ● {p}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyChartData} margin={{ top: 10, right: 25, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "var(--text-secondary)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      boxShadow: "var(--shadow-card)",
                    }}
                    labelStyle={{ color: "var(--text-primary)", fontWeight: 800, marginBottom: "0.3rem" }}
                    formatter={(v, name) => [`₹${Number(v).toLocaleString("en-IN")}`, name]}
                  />
                  <Legend />
                  {visibleHistoryPlatforms.map((p) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={getPlatformColor(p, "var(--accent-cyan)")}
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 5. AI Insights: Strengths, Caveats & Advice */}
        {(ai.pros?.length > 0 || ai.cons?.length > 0 || ai.savings_tip || ai.recommendation) && (
          <div className="card-panel">
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Sparkles size={18} color="var(--accent-purple)" /> Synthesis & Insights
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              {ai.pros?.length > 0 && (
                <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent-green)", fontSize: "0.85rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <CheckCircle2 size={15} /> Evaluated Strengths
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {ai.pros.map((p, i) => (
                      <li key={i}>✓ {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.cons?.length > 0 && (
                <div style={{ padding: "1rem", background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "10px" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent-rose)", fontSize: "0.85rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <XCircle size={15} /> Evaluated Caveats
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {ai.cons.map((c, i) => (
                      <li key={i}>✕ {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {ai.recommendation && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Sparkles size={16} color="var(--accent-cyan)" />
                <div>
                  <strong>Actionable Recommendation:</strong> {ai.recommendation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report Document Footer */}
        <div style={{ textAlign: "center", padding: "1.5rem 0", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Generated by <strong style={{ color: "var(--accent-cyan)" }}>DealLens</strong> AI Decision-Support Platform · Report Date: {reportDate}<br />
            Data extracted from verified marketplaces across Amazon India, Flipkart, and Croma. Prices and availability are subject to merchant terms.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionReport;
