import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  Bell,
  Trash2,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    if (!user) {
      setLoading(false);
      setError("Sign in required to view active price monitors.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.get("/users/alerts/");
      setAlerts(Array.isArray(res.data) ? res.data : res.data.results || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load price alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  const handleDelete = async (id, title) => {
    try {
      await API.delete(`/users/alerts/${id}/`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      window.dispatchEvent(new Event("alert:changed"));
      toast.success(`Removed monitor for "${title || "item"}".`);
    } catch (e) {
      toast.error("Failed to delete alert: " + (e.response?.data?.detail || e.message));
    }
  };

  if (!user) {
    return (
      <div className="page-container" style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <div className="card-panel card-glow" style={{ maxWidth: 480, margin: "0 auto", padding: "3rem 2rem" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "14px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "var(--accent-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Bell size={28} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Sign In to Manage Price Alerts
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Configure target buy prices and receive automated triggers when prices drop on Amazon, Flipkart, or Croma.
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
              color: "var(--accent-amber)",
              background: "rgba(245, 158, 11, 0.1)",
              padding: "0.2rem 0.6rem",
              borderRadius: 999,
              border: "1px solid rgba(245, 158, 11, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <Bell size={12} fill="var(--accent-amber)" />
            30-Day Automated Monitor
          </span>
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.4rem", fontFamily: "var(--font-heading)" }}>
          Active Price Drop Monitors ({alerts.length})
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
          DealLens background monitors continuously check store prices and notify you when prices reach your target.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)" }}>
          <Clock size={28} className="spinner" style={{ margin: "0 auto 0.75rem", color: "var(--accent-cyan)" }} />
          <div>Checking active price monitors...</div>
        </div>
      ) : error ? (
        <div
          className="card-panel"
          style={{
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "var(--accent-rose)",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : alerts.length === 0 ? (
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
              background: "rgba(245, 158, 11, 0.1)",
              color: "var(--accent-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Bell size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.4rem" }}>
            No Active Price Monitors
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 460, margin: "0 auto 1.5rem" }}>
            To monitor a price drop, open any product page and enter your desired target price in the 30-day price alert setter.
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <Sparkles size={16} />
            <span>Find Products to Track</span>
          </Link>
        </div>
      ) : (
        /* Alerts List */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {alerts.map((a) => {
            const isTriggered = a.is_triggered;
            const target = Number(a.target_price);
            const current = a.current_lowest ? Number(a.current_lowest) : null;
            const diff = current ? current - target : null;

            return (
              <div
                key={a.id}
                className="card-panel card-glow"
                style={{
                  padding: "1.25rem 1.5rem",
                  borderRadius: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1.25rem",
                  borderLeft: isTriggered
                    ? "4px solid var(--accent-emerald)"
                    : "4px solid var(--accent-amber)",
                }}
              >
                {/* Left Info */}
                <div style={{ minWidth: 260, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                      {a.product_title || "Monitored Product"}
                    </h3>
                    {a.product_category && (
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        • {a.product_category}
                      </span>
                    )}
                    {isTriggered ? (
                      <span
                        className="badge badge-emerald"
                        style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                      >
                        <CheckCircle2 size={11} /> TRIGGER MET
                      </span>
                    ) : (
                      <span className="badge badge-cyan" style={{ fontSize: "0.7rem" }}>
                        ACTIVE MONITOR
                      </span>
                    )}
                    {a.email_sent && (
                      <span className="badge badge-purple" style={{ fontSize: "0.7rem" }}>
                        EMAIL DISPATCHED
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Your Target: </span>
                      <strong style={{ color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>
                        ₹{target.toLocaleString("en-IN")}
                      </strong>
                    </div>

                    <span style={{ color: "var(--border-color)" }}>|</span>

                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Current Lowest: </span>
                      <strong
                        style={{
                          color: isTriggered ? "var(--accent-emerald)" : "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {current ? `₹${current.toLocaleString("en-IN")}` : "Scraping..."}
                      </strong>
                    </div>

                    {diff !== null && (
                      <>
                        <span style={{ color: "var(--border-color)" }}>|</span>
                        <div style={{ fontSize: "0.78rem", color: isTriggered ? "var(--accent-emerald)" : "var(--text-secondary)" }}>
                          {isTriggered
                            ? "🎉 Price is currently below your target!"
                            : `₹${diff.toLocaleString("en-IN")} above target`}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    Monitor registered on {new Date(a.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <Link
                    to={`/product/${a.product}`}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.8rem",
                      textDecoration: "none",
                    }}
                  >
                    <span>Inspect</span>
                    <ExternalLink size={13} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(a.id, a.product_title)}
                    className="btn btn-sm"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.8rem",
                      background: "rgba(244, 63, 94, 0.12)",
                      color: "var(--accent-rose)",
                      border: "1px solid rgba(244, 63, 94, 0.25)",
                    }}
                    title="Remove alert monitor"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
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

export default Alerts;
