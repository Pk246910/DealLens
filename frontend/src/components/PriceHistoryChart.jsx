import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import API from "../api/axios";
import { getPlatformColor } from "../utils/platforms";

// Inline price-history chart (replaces the old popup modal).
// Renders nothing when there is no product id or no history yet.
// demoListings (optional): reference rows with a 31-point `trend` array
// (oldest first). Trends are overlaid as dashed lines and are never
// persisted — the database stays clean.
const PriceHistoryChart = ({ productId, productTitle, demoListings = [] }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiddenStores, setHiddenStores] = useState([]);
  const [mountedTime, setMountedTime] = useState(0);

  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    API.get(`/products/${productId}/history/`)
      .then((res) => { if (!cancelled) setHistory(Array.isArray(res.data) ? res.data : res.data.results || []); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (!productId) return null;

  const allStores = [...new Set(history.map((h) => h.store_name).filter(Boolean))];
  const visibleStores = allStores.filter((s) => !hiddenStores.includes(s));
  const visibleHistory = history.filter((h) => visibleStores.includes(h.store_name));

  const chartData = visibleHistory
    .filter((h) => h.price > 0 && h.price < 10000000)
    .slice()
    .reverse()
    .reduce((acc, cur) => {
      const date = new Date(cur.recorded_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      let existing = acc.find((x) => x.date === date);
      if (!existing) {
        existing = { date };
        acc.push(existing);
      }
      existing[cur.store_name] = Number(cur.price);
      return acc;
    }, []);

  // Overlay demo reference trends (computed, never stored).
  // A demo series is skipped when its real store line exists — no duplicates.
  const demos = (demoListings || []).filter(
    (l) => Array.isArray(l.trend) && l.trend.length === 31 && !allStores.includes(l.platform)
  );
  const demoKeys = demos.map((l) => `${l.platform} (Demo)`);
  const dateLabel = (daysAgo) => {
    const base = mountedTime || 1704067200000;
    return new Date(base - daysAgo * 86400000).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };
  const merged = [];
  if (chartData.length > 0 || demos.length > 0) {
    for (let ago = 30; ago >= 0; ago--) {
      const label = dateLabel(ago);
      const row = { date: label, ...(chartData.find((r) => r.date === label) || {}) };
      demos.forEach((l) => {
        row[`${l.platform} (Demo)`] = l.trend[30 - ago];
      });
      merged.push(row);
    }
  }
  const storeColor = (s) => getPlatformColor(s.replace(" (Demo)", "")) || "#06b6d4";
  const pillStores = [...allStores, ...demoKeys];
  const visibleDemoKeys = demoKeys.filter((s) => !hiddenStores.includes(s));
  // Demo trends belong to cheaper reference products — they would render
  // flat against the real price scale, so they get their own right axis
  // whenever real history is also present.
  const hasReal = chartData.length > 0;
  const dualAxis = hasReal && visibleDemoKeys.length > 0;

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-color)",
      borderRadius: "16px",
      padding: "1.5rem",
    }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "0.25rem" }}>📈 Price History</h3>
      {productTitle && (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>{productTitle}</p>
      )}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>Loading price history...</div>
      ) : merged.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <div style={{ fontSize: "0.9rem" }}>No price history recorded yet.</div>
          <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>History is tracked each time this product is analyzed.</div>
        </div>
      ) : (
        <>
          {pillStores.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
              {pillStores.map((s) => {
                const off = hiddenStores.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => setHiddenStores((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                    style={{
                      fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.6rem",
                      borderRadius: 999, cursor: "pointer",
                      border: `1px solid ${storeColor(s)}55`,
                      background: off ? "transparent" : `${storeColor(s)}18`,
                      color: off ? "var(--text-muted)" : "var(--text-primary)",
                      opacity: off ? 0.55 : 1,
                    }}
                  >
                    {s} {off ? "＋" : "✓"}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={merged}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} tickCount={7} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", borderRadius: "10px", color: "var(--text-primary)" }}
                  formatter={(val, name) => [`₹${Number(val).toLocaleString("en-IN")}`, name]}
                />
                <Legend />
                {dualAxis && (
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} tickCount={7} />
                )}
                {visibleStores.map((s) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={storeColor(s)} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                ))}
                {visibleDemoKeys.map((s) => (
                  <Line key={s} type="monotone" dataKey={s} yAxisId={dualAxis ? "right" : "left"} stroke={storeColor(s)} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {dualAxis && (
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Dashed lines are category reference trends (right axis) — not this product's prices.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PriceHistoryChart;
