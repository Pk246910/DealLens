import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingDown,
  BellRing,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PasswordStrength from "../components/PasswordStrength";
import loginBg from "../assets/login-bg.jpg";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim()) {
      toast.error("Please enter a username.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      toast.success("Account created successfully! Welcome aboard.");
      navigate(from, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      let msg = "Registration failed";
      if (data) {
        if (typeof data === "string") {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else {
          const parts = [];
          for (const [k, v] of Object.entries(data)) {
            const val = Array.isArray(v) ? v.join(", ") : String(v);
            parts.push(`${k}: ${val}`);
          }
          msg = parts.join(" | ");
        }
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page-wrapper"
      style={{
        backgroundImage: `var(--auth-bg-overlay), url(${loginBg})`,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
          alignItems: "stretch",
        }}
      >
        {/* Left Side: Value Proposition Banner */}
        <div
          className="card-panel"
          style={{
            padding: "2.5rem 2rem",
            background: "linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(11, 15, 25, 0.95))",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50px",
              left: "-50px",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--accent-cyan-glow), transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--accent-cyan)",
                  background: "rgba(6, 182, 212, 0.1)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: 999,
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                }}
              >
                <Sparkles size={12} />
                Shopper Membership
              </span>
            </div>

            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                fontFamily: "var(--font-heading)",
                lineHeight: 1.25,
                marginBottom: "0.75rem",
              }}
            >
              Shop smarter. Save hours. Never overpay again.
            </h2>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.5, marginBottom: "2rem" }}>
              Unlock automated multi-store price monitoring, AI-computed Best Deal Scores, and instant price drop alerts.
            </p>

            {/* Feature List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    color: "var(--accent-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.15rem" }}>
                    Multi-Store Live Telemetry
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                    Instant product scraping across Amazon India, Flipkart, and Croma in seconds.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "var(--accent-emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <TrendingDown size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.15rem" }}>
                    AI Best Deal Scoring
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                    Proprietary 8-dimension scoring engine analyzing seller trust, returns, and historical discounts.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    color: "var(--accent-amber)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BellRing size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.15rem" }}>
                    Automated Price Drop Alerts
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                    Set custom price targets and receive instantaneous alerts when items drop.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "2rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            <ShieldCheck size={16} style={{ color: "var(--accent-emerald)" }} />
            <span>100% Free Forever • Zero Ad Spam • Privacy Guaranteed</span>
          </div>
        </div>

        {/* Right Side: Registration Form Card */}
        <div
          className="card-panel card-glow"
          style={{
            padding: "2.25rem 2rem",
            background: "var(--bg-surface)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: "0.3rem",
                fontFamily: "var(--font-heading)",
              }}
            >
              Create Account
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
              Join thousands of shoppers making data-driven purchasing decisions.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Username */}
            <div>
              <label
                htmlFor="register-username"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Username
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <User
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.85rem",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="register-username"
                  type="text"
                  autoComplete="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.85rem 0.75rem 2.4rem",
                    borderRadius: "10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.92rem",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent-cyan)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(6, 182, 212, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="register-email"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Email Address
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.85rem",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.85rem 0.75rem 2.4rem",
                    borderRadius: "10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.92rem",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent-cyan)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(6, 182, 212, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Lock
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.85rem",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "0.75rem 2.6rem 0.75rem 2.4rem",
                    borderRadius: "10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.92rem",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--accent-cyan)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(6, 182, 212, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0.2rem",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Enhanced Password Strength Meter */}
              <PasswordStrength password={password} />
            </div>

            {/* Terms notice */}
            <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.4, margin: "0.25rem 0" }}>
              By creating an account, you agree to ShopSmart's automated scraping terms and privacy protocols.
            </p>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                marginTop: "0.25rem",
                width: "100%",
                padding: "0.85rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Setting Up Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Already have account */}
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              style={{
                color: "var(--accent-cyan)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
