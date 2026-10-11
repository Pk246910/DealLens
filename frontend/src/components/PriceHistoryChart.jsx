import React, { useEffect, useMemo, useState } from "react";
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
import API from "../api/axios";
import { getPlatformColor } from "../utils/platforms";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

/**
 * Format Date object to "YYYY-MM-DD" local date string.
 */
const toLocalDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Format "YYYY-MM-DD" to human-readable Indian date (e.g. "9 Oct").
 */
const formatDateLabel = (dateKey) => {
  if (!dateKey) return "";
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

/**
 * Enhanced custom tooltip showing all store prices on the hovered date,
 * sorted from lowest to highest, highlighting the best deal.
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const validItems = payload
    .filter((p) => p.value !== undefined && p.value !== null && Number(p.value) > 0)
    .sort((a, b) => Number(a.value) - Number(b.value));

  if (validItems.length === 0) return null;

  const lowestVal = validItems[0].value;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card, #1e293b)",
        border: "1px solid var(--border-color, #334155)",
        borderRadius: "10px",
        padding: "0.65rem 0.9rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        fontSize: "0.8rem",
        minWidth: 190,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          marginBottom: "0.4rem",
          color: "var(--text-primary, #f8fafc)",
          borderBottom: "1px solid var(--border-color, #334155)",
          paddingBottom: "0.3rem",
          fontSize: "0.82rem",
        }}
      >
        📅 {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {validItems.map((item) => {
          const isBest = item.value === lowestVal && validItems.length > 1;
          return (
            <div
              key={item.dataKey}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--text-secondary, #94a3b8)", fontWeight: 600 }}>
                  {item.name}
                </span>
                {isBest && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      backgroundColor: "rgba(34, 197, 94, 0.18)",
                      color: "#22c55e",
                      padding: "1px 5px",
                      borderRadius: 4,
                      lineHeight: 1.2,
                    }}
                  >
                    Lowest
                  </span>
                )}
              </div>
              <span
                style={{
                  fontWeight: 800,
                  color: "var(--text-primary, #f8fafc)",
                  fontFamily: "monospace",
                  letterSpacing: "-0.2px",
                }}
              >
                ₹{Number(item.value).toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PriceHistoryChart = ({ productId, productTitle, demoListings = [] }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiddenStores, setHiddenStores] = useState([]);
  const [timeRange, setTimeRange] = useState("30d"); // "7d" | "14d" | "30d" | "all"
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setAlertSaved(false);
    API.get(`/products/${productId}/history/`)
      .then((res) => {
        if (!cancelled) {
          setHistory(Array.isArray(res.data) ? res.data : res.data.results || []);
        }
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Filter history items to valid positive numbers
  const validHistory = useMemo(() => {
    return history
      .filter((h) => h.store_name && Number(h.price) > 0 && Number(h.price) < 10000000)
      .map((h) => ({
        ...h,
        price: Number(h.price),
        dateObj: new Date(h.recorded_at),
      }))
      .sort((a, b) => a.dateObj - b.dateObj);
  }, [history]);

  // Extract all unique stores with recorded history
  const allStores = useMemo(() => {
    return [...new Set(validHistory.map((h) => h.store_name).filter(Boolean))];
  }, [validHistory]);

  const visibleStores = allStores.filter((s) => !hiddenStores.includes(s));

  // Compute key stats (lowest ever, highest ever, current lowest, 30-day average, and buy signal)
  const stats = useMemo(() => {
    if (validHistory.length === 0) return null;

    let minPrice = Infinity;
    let minStore = "";
    let maxPrice = -Infinity;
    let maxStore = "";
    let totalSum = 0;

    validHistory.forEach((h) => {
      totalSum += h.price;
      if (h.price < minPrice) {
        minPrice = h.price;
        minStore = h.store_name;
      }
      if (h.price > maxPrice) {
        maxPrice = h.price;
        maxStore = h.store_name;
      }
    });

    const avgPrice = Math.round(totalSum / validHistory.length);

    // Current latest prices
    const latestByStore = {};
    validHistory.forEach((h) => {
      latestByStore[h.store_name] = h.price;
    });

    let currentLowestPrice = Infinity;
    let currentLowestStore = "";
    Object.entries(latestByStore).forEach(([store, price]) => {
      if (price < currentLowestPrice) {
        currentLowestPrice = price;
        currentLowestStore = store;
      }
    });

    const activeCurrentPrice = currentLowestPrice !== Infinity ? currentLowestPrice : null;

    let buySignal = {
      label: "Fair Market Price",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.14)",
      icon: "⚖️",
      hint: "Trading near the 30-day historical average",
    };

    if (activeCurrentPrice && activeCurrentPrice <= minPrice * 1.03) {
      buySignal = {
        label: "Great Time to Buy",
        color: "#22c55e",
        bg: "rgba(34, 197, 94, 0.16)",
        icon: "🔥",
        hint: "Within 3% of the lowest recorded price!",
      };
    } else if (activeCurrentPrice && activeCurrentPrice > avgPrice * 1.03) {
      buySignal = {
        label: "Wait for Price Drop",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.16)",
        icon: "⏳",
        hint: "Currently trading above 30-day average",
      };
    }

    const suggestedTarget = activeCurrentPrice
      ? Math.max(1, Math.round((activeCurrentPrice * 0.95) / 50) * 50)
      : null;

    return {
      minPrice,
      minStore,
      maxPrice,
      maxStore,
      avgPrice,
      currentLowestPrice: activeCurrentPrice,
      currentLowestStore,
      latestByStore,
      buySignal,
      suggestedTarget,
    };
  }, [validHistory]);

  // Handle demo trends if present
  const demos = useMemo(() => {
    return (demoListings || []).filter(
      (l) => Array.isArray(l.trend) && l.trend.length === 31 && !allStores.includes(l.platform)
    );
  }, [demoListings, allStores]);

  const demoKeys = useMemo(() => demos.map((l) => `${l.platform} (Demo)`), [demos]);
  const visibleDemoKeys = demoKeys.filter((s) => !hiddenStores.includes(s));

  // Build the continuous timeline with forward-filled prices
  const mergedData = useMemo(() => {
    if (validHistory.length === 0 && demos.length === 0) return [];

    const now = new Date();
    const latestHistDate = validHistory.length > 0 ? validHistory[validHistory.length - 1].dateObj : now;
    const endDateObj = latestHistDate > now ? latestHistDate : now;

    const earliestHistDate = validHistory.length > 0 ? validHistory[0].dateObj : new Date(now.getTime() - 30 * 86400000);

    let daysBack = 30;
    if (timeRange === "7d") daysBack = 7;
    else if (timeRange === "14d") daysBack = 14;
    else if (timeRange === "30d") daysBack = 30;
    else if (timeRange === "all") {
      const diffMs = endDateObj - earliestHistDate;
      daysBack = Math.max(7, Math.ceil(diffMs / 86400000) + 1);
    }

    const startDateObj = new Date(endDateObj.getTime() - (daysBack - 1) * 86400000);

    // Group valid history by day
    const dailyStorePrices = {};
    validHistory.forEach((item) => {
      const dKey = toLocalDateKey(item.dateObj);
      if (!dailyStorePrices[dKey]) dailyStorePrices[dKey] = {};
      dailyStorePrices[dKey][item.store_name] = item.price;
    });

    // Generate continuous calendar days
    const calendarDays = [];
    const cur = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const end = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());

    while (cur <= end) {
      calendarDays.push(toLocalDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }

    // Determine starting last-known prices before or on calendarDays[0]
    const lastKnownPrice = {};
    validHistory.forEach((item) => {
      const dKey = toLocalDateKey(item.dateObj);
      if (dKey <= calendarDays[0]) {
        lastKnownPrice[item.store_name] = item.price;
      }
    });

    // Build timeline rows with forward-fill
    return calendarDays.map((dKey, idx) => {
      if (dailyStorePrices[dKey]) {
        Object.assign(lastKnownPrice, dailyStorePrices[dKey]);
      }

      const row = {
        dateKey: dKey,
        date: formatDateLabel(dKey),
        ...lastKnownPrice,
      };

      // Overlay demo trends if present
      if (demos.length > 0) {
        const demoIdx = Math.max(0, Math.min(30, Math.floor((idx / (calendarDays.length - 1 || 1)) * 30)));
        demos.forEach((l) => {
          row[`${l.platform} (Demo)`] = l.trend[demoIdx];
        });
      }

      return row;
    });
  }, [validHistory, demos, timeRange]);

  // Dynamic Y-Axis Bounds (eliminates ₹0 bottom dead-space)
  const yDomain = useMemo(() => {
    if (mergedData.length === 0) return [0, "auto"];

    const activePrices = mergedData.flatMap((row) =>
      visibleStores.map((s) => row[s]).filter((p) => typeof p === "number" && p > 0)
    );

    if (activePrices.length === 0) return [0, "auto"];

    const minVal = Math.min(...activePrices);
    const maxVal = Math.max(...activePrices);
    const diff = maxVal - minVal;

    const padding = diff > 0 ? Math.max(1000, Math.round(diff * 0.08)) : Math.round(minVal * 0.05);
    const step = diff > 25000 ? 5000 : diff > 8000 ? 2000 : diff > 2000 ? 1000 : 500;

    const yMin = Math.max(0, Math.floor((minVal - padding) / step) * step);
    const yMax = Math.ceil((maxVal + padding) / step) * step;

    return [yMin, yMax];
  }, [mergedData, visibleStores]);

  const storeColor = (s) => getPlatformColor(s.replace(" (Demo)", "")) || "#06b6d4";
  const pillStores = [...allStores, ...demoKeys];
  const hasReal = validHistory.length > 0;
  const dualAxis = hasReal && visibleDemoKeys.length > 0;

  if (!productId) return null;

  const handleQuickAlert = async () => {
    if (!user) {
      toast.error("Please sign in to set a price drop alert.");
      return;
    }
    if (!stats?.suggestedTarget || alertSaving || alertSaved) return;
    setAlertSaving(true);
    try {
      await API.post("/users/alerts/", {
        product: productId,
        target_price: stats.suggestedTarget,
      });
      setAlertSaved(true);
      toast.success(
        `Price alert set! We'll notify you when it drops below ₹${stats.suggestedTarget.toLocaleString("en-IN")}.`
      );
      window.dispatchEvent(new Event("alert:changed"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not set price alert.");
    } finally {
      setAlertSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-secondary, #0f172a)",
        border: "1px solid var(--border-color, #1e293b)",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.15)",
      }}
    >
      {/* Header and Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
              📈 Price History & Trends
            </h3>
            {allStores.length > 0 && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  padding: "0.15rem 0.5rem",
                  borderRadius: 999,
                }}
              >
                {allStores.length} {allStores.length === 1 ? "Store" : "Stores"} Tracked
              </span>
            )}
            {stats?.buySignal && (
              <span
                title={stats.buySignal.hint}
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  backgroundColor: stats.buySignal.bg,
                  color: stats.buySignal.color,
                  padding: "0.18rem 0.55rem",
                  borderRadius: 999,
                  border: `1px solid ${stats.buySignal.color}44`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <span>{stats.buySignal.icon}</span>
                <span>{stats.buySignal.label}</span>
              </span>
            )}
          </div>
          {productTitle && (
            <p
              style={{
                color: "var(--text-secondary, #94a3b8)",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
                marginBottom: 0,
                maxWidth: 680,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={productTitle}
            >
              {productTitle}
            </p>
          )}
        </div>

        {/* Right Controls: One-Click Alert & Time Range Selector */}
        {hasReal && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {stats?.suggestedTarget && (
              <button
                onClick={handleQuickAlert}
                disabled={alertSaving || alertSaved}
                title="Set a 1-click alert for a 5% price drop below current lowest price"
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.32rem 0.65rem",
                  borderRadius: "8px",
                  border: alertSaved
                    ? "1px solid rgba(34, 197, 94, 0.4)"
                    : "1px solid rgba(245, 158, 11, 0.4)",
                  background: alertSaved
                    ? "rgba(34, 197, 94, 0.14)"
                    : "rgba(245, 158, 11, 0.12)",
                  color: alertSaved ? "#22c55e" : "#f59e0b",
                  cursor: alertSaving || alertSaved ? "default" : "pointer",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <span>{alertSaved ? "✅" : "🔔"}</span>
                <span>
                  {alertSaved
                    ? `Alert Active (₹${stats.suggestedTarget.toLocaleString("en-IN")})`
                    : alertSaving
                    ? "Setting Alert..."
                    : `Alert at ₹${stats.suggestedTarget.toLocaleString("en-IN")} (-5%)`}
                </span>
              </button>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-card, #1e293b)",
                borderRadius: "8px",
                padding: "2px",
                border: "1px solid var(--border-color, #334155)",
              }}
            >
              {[
                { id: "7d", label: "7D" },
                { id: "14d", label: "14D" },
                { id: "30d", label: "30D" },
                { id: "all", label: "ALL" },
              ].map((tab) => {
                const active = timeRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTimeRange(tab.id)}
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: active ? 800 : 600,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                      border: "none",
                      background: active ? "var(--primary, #3b82f6)" : "transparent",
                      color: active ? "#ffffff" : "var(--text-secondary, #94a3b8)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Banner */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "0.6rem",
            padding: "0.65rem 0.85rem",
            background: "var(--bg-card, #1e293b)",
            border: "1px solid var(--border-color, #334155)",
            borderRadius: "10px",
            marginBottom: "1rem",
            fontSize: "0.78rem",
          }}
        >
          <div>
            <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.7rem", fontWeight: 600 }}>
              🟢 Lowest Ever Recorded
            </div>
            <div style={{ fontWeight: 800, color: "#22c55e", fontSize: "0.95rem" }}>
              ₹{stats.minPrice.toLocaleString("en-IN")}
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary, #94a3b8)", marginLeft: "0.3rem" }}>
                ({stats.minStore})
              </span>
            </div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.7rem", fontWeight: 600 }}>
              🏷️ Current Best Deal
            </div>
            <div style={{ fontWeight: 800, color: "var(--text-primary, #f8fafc)", fontSize: "0.95rem" }}>
              {stats.currentLowestPrice ? (
                <>
                  ₹{stats.currentLowestPrice.toLocaleString("en-IN")}
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary, #94a3b8)", marginLeft: "0.3rem" }}>
                    ({stats.currentLowestStore})
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.7rem", fontWeight: 600 }}>
              📊 30-Day Average
            </div>
            <div style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.95rem" }}>
              ₹{stats.avgPrice.toLocaleString("en-IN")}
            </div>
          </div>

          <div>
            <div style={{ color: "var(--text-muted, #64748b)", fontSize: "0.7rem", fontWeight: 600 }}>
              🔺 Highest Recorded
            </div>
            <div style={{ fontWeight: 800, color: "#ef4444", fontSize: "0.95rem" }}>
              ₹{stats.maxPrice.toLocaleString("en-IN")}
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary, #94a3b8)", marginLeft: "0.3rem" }}>
                ({stats.maxStore})
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
          <div>Loading price history...</div>
        </div>
      ) : mergedData.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>No price history recorded yet.</div>
          <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
            History is continuously tracked each time this product is analyzed.
          </div>
        </div>
      ) : (
        <>
          {/* Store Filter Pills with Color Dots and Toggle States */}
          {pillStores.length > 1 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.45rem",
                marginBottom: "0.85rem",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, marginRight: "0.2rem" }}>
                Filter:
              </span>
              {pillStores.map((s) => {
                const off = hiddenStores.includes(s);
                const color = storeColor(s);
                const currentPrice = stats?.latestByStore?.[s];
                return (
                  <button
                    key={s}
                    onClick={() =>
                      setHiddenStores((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.73rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.65rem",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: `1.5px solid ${color}${off ? "33" : "99"}`,
                      background: off ? "transparent" : `${color}18`,
                      color: off ? "var(--text-muted)" : "var(--text-primary)",
                      opacity: off ? 0.5 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "inline-block",
                        opacity: off ? 0.4 : 1,
                      }}
                    />
                    <span>{s}</span>
                    {currentPrice && !off && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          opacity: 0.85,
                          fontFamily: "monospace",
                        }}
                      >
                        ₹{currentPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span style={{ fontSize: "0.7rem", marginLeft: "1px" }}>{off ? "＋" : "✓"}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Recharts LineChart */}
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={mergedData} margin={{ top: 8, right: 12, left: -4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #1e293b)" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-secondary, #94a3b8)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-color, #334155)" }}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--text-secondary, #94a3b8)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border-color, #334155)" }}
                  domain={yDomain}
                  tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                  tickCount={6}
                />
                {dualAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--text-secondary, #94a3b8)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color, #334155)" }}
                    tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                    tickCount={6}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "0.6rem", fontSize: "0.75rem" }}
                  formatter={(val) => (
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{val}</span>
                  )}
                />
                {visibleStores.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    stroke={storeColor(s)}
                    strokeWidth={2.4}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
                {visibleDemoKeys.map((s) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    yAxisId={dualAxis ? "right" : undefined}
                    stroke={storeColor(s)}
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {dualAxis && (
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>
              💡 Dashed lines are category reference trends (right axis) — not this product's actual prices.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PriceHistoryChart;
