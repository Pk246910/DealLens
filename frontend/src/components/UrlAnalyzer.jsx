import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ClipboardPaste, X, Sparkles, Link2, AlertCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getPlatformColor } from "../utils/platforms";

export const PLATFORMS = [
  { name: "Amazon", icon: "🛒", color: getPlatformColor("Amazon") },
  { name: "Flipkart", icon: "🛍️", color: getPlatformColor("Flipkart") },
  { name: "Croma", icon: "📺", color: getPlatformColor("Croma") },
  { name: "Reliance Digital", icon: "🏪", color: getPlatformColor("Reliance Digital") },
  { name: "Myntra", icon: "👗", color: getPlatformColor("Myntra") },
  { name: "AJIO", icon: "👟", color: getPlatformColor("AJIO") },
  { name: "Meesho", icon: "🏷️", color: getPlatformColor("Meesho") },
  { name: "Tata CLiQ", icon: "🏬", color: getPlatformColor("Tata CLiQ") },
  { name: "Nykaa", icon: "💄", color: getPlatformColor("Nykaa") },
  { name: "JioMart", icon: "🛍️", color: getPlatformColor("JioMart") },
  { name: "Snapdeal", icon: "🏷️", color: getPlatformColor("Snapdeal") },
  { name: "Vijay Sales", icon: "🔌", color: getPlatformColor("Vijay Sales") },
];

const ANALYSIS_STEPS = [
  "Detecting platform origin...",
  "Retrieving live product listing...",
  "Extracting prices, specs & seller details...",
  "Validating product data integrity...",
  "Matching cross-platform listings...",
  "Comparing pricing, delivery & reviews...",
  "Computing explainable Best Deal Score...",
];

const UrlAnalyzer = ({ onResult, onLoading }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [url, setUrl] = useState(() => location.state?.pendingUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  const isValidUrl = (str) => {
    try {
      const u = new URL(str.startsWith("http") ? str : `https://${str}`);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const advanceStep = async (idx) => {
    if (idx < ANALYSIS_STEPS.length) {
      setStep(ANALYSIS_STEPS[idx]);
      setStepIndex(idx);
      await new Promise((r) => setTimeout(r, 280 + Math.random() * 180));
    }
  };

  const handleAnalyze = async (overrideUrl) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) {
      setError("Please paste a product URL to analyze");
      return;
    }
    if (!isValidUrl(targetUrl)) {
      setError("Please enter a valid HTTP/HTTPS URL");
      return;
    }

    if (!user) {
      toast.error("Please log in or register to analyze product links.", { id: "auth-required" });
      setError("Please log in or register to analyze product links.");
      navigate("/login", {
        state: {
          from: location.pathname + location.search,
          pendingUrl: targetUrl,
        },
      });
      return;
    }

    setLoading(true);
    setError(null);
    onLoading?.(true);

    try {
      await advanceStep(0);
      await advanceStep(1);
      await advanceStep(2);

      // Analysis does live scraping + comparison + rule-based scoring
      const res = await API.post("/analyze-url/", { url: targetUrl }, { timeout: 120000 });

      await advanceStep(3);
      await advanceStep(4);
      await advanceStep(5);
      await advanceStep(6);

      onResult?.(res.data);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 401 || data?.auth_required) {
        toast.error("Please log in or register to analyze product links.", { id: "auth-required" });
        setError("Please log in or register to analyze product links.");
        navigate("/login", {
          state: {
            from: location.pathname + location.search,
            pendingUrl: targetUrl,
          },
        });
      } else if (data?.supported_platforms) {
        setError(`Platform not supported. Supported: ${data.supported_platforms.join(", ")}`);
      } else {
        setError(data?.error || "Analysis failed. Please try another product URL.");
      }
      onResult?.(null);
    } finally {
      setLoading(false);
      setStep("");
      setStepIndex(0);
      onLoading?.(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleAnalyze();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setError(null);
        toast.success("URL pasted from clipboard");
      }
    } catch {
      toast.error("Clipboard permission unavailable. Please paste manually (Ctrl+V).");
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Main Input Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "stretch",
          flexDirection: "row",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px", position: "relative" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste any product URL (Amazon, Flipkart, Nykaa, JioMart, Croma, or any online store...)"
            disabled={loading}
            aria-label="Product URL to analyze"
            style={{
              width: "100%",
              padding: "0.95rem 5.8rem 0.95rem 2.85rem",
              background: "var(--bg-card)",
              border: `1.5px solid ${error ? "var(--accent-rose)" : "var(--border-color)"}`,
              borderRadius: "14px",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: "var(--shadow-sm)",
            }}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = "var(--accent-cyan)";
                e.target.style.boxShadow = "var(--shadow-glow)";
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = "var(--border-color)";
                e.target.style.boxShadow = "var(--shadow-sm)";
              }
            }}
          />

          <span
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--accent-cyan)",
              display: "flex",
              alignItems: "center",
              opacity: 0.8,
            }}
          >
            <Link2 size={18} />
          </span>

          {/* Action buttons inside input */}
          <div
            style={{
              position: "absolute",
              right: "0.6rem",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              gap: "0.3rem",
              alignItems: "center",
            }}
          >
            {!loading && (
              <button
                type="button"
                onClick={handlePaste}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "0.35rem 0.6rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
                title="Paste from clipboard"
                aria-label="Paste URL"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent-cyan)";
                  e.currentTarget.style.borderColor = "var(--accent-cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <ClipboardPaste size={14} /> Paste
              </button>
            )}

            {url && !loading && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setError(null);
                  onResult?.(null);
                }}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
                title="Clear input"
                aria-label="Clear URL"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => handleAnalyze()}
          disabled={loading || !url.trim()}
          className="btn btn-primary"
          style={{
            padding: "0.95rem 1.85rem",
            fontSize: "0.95rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
            borderRadius: "14px",
          }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={17} />
              <span>Analyze & Compare</span>
            </>
          )}
        </button>
      </div>

      {/* Sign in / Register Notice if Not Logged In */}
      {!user && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.65rem 0.95rem",
            background: "rgba(6, 182, 212, 0.08)",
            border: "1px solid rgba(6, 182, 212, 0.22)",
            borderRadius: "10px",
            fontSize: "0.83rem",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Lock size={15} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
            <span>
              Authentication required: Please <strong>sign in</strong> or <strong>create an account</strong> to analyze live product links.
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link
              to="/login"
              state={{ from: location.pathname + location.search, pendingUrl: url }}
              style={{
                color: "var(--accent-cyan)",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "0.82rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "6px",
                background: "rgba(6, 182, 212, 0.14)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              Sign In
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>or</span>
            <Link
              to="/register"
              state={{ from: location.pathname + location.search, pendingUrl: url }}
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.82rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "6px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                transition: "all 0.15s ease",
              }}
            >
              Register
            </Link>
          </div>
        </div>
      )}

      {/* Progress Telemetry Bar (During Live Scraping) */}
      {loading && step && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem 1.25rem",
            background: "rgba(6, 182, 212, 0.08)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            borderRadius: "12px",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              <span style={{ fontSize: "0.88rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                {step}
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              Step {stepIndex + 1} of {ANALYSIS_STEPS.length}
            </span>
          </div>

          {/* Stepper Progress Indicator */}
          <div style={{ display: "flex", gap: "5px" }}>
            {ANALYSIS_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: i <= stepIndex ? "var(--accent-cyan)" : "var(--border-color)",
                  boxShadow: i <= stepIndex ? "0 0 8px rgba(6, 182, 212, 0.5)" : "none",
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "12px",
            fontSize: "0.88rem",
            color: "var(--accent-rose)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            animation: "fadeIn 0.25s ease",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Supported Store Chips */}
      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Universal Analyzer:
        </span>
        {PLATFORMS.map((p) => (
          <span
            key={p.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "6px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            <span>{p.icon}</span>
            <span>{p.name}</span>
          </span>
        ))}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.15rem 0.55rem",
            borderRadius: "6px",
            background: "rgba(6, 182, 212, 0.12)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            fontSize: "0.72rem",
            color: "var(--accent-cyan)",
            fontWeight: 700,
          }}
        >
          <span>🌐</span>
          <span>+ Any Online Store</span>
        </span>
      </div>
    </div>
  );
};

export default UrlAnalyzer;
