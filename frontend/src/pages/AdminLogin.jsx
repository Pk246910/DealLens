import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Terminal,
  LogOut,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import adminLoginBg from "../assets/admin-login-bg.jpg";

/**
 * Dedicated Administrative Gateway for Staff & Operators.
 * Enforces role-based clearance (is_staff / is_superuser) before granting session tokens.
 */
const AdminLogin = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState(location.state?.username || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    location.state?.denied ? "Administrative clearance required to access the Admin Console." : ""
  );

  // If already logged in as staff, offer instant redirect or auto-redirect
  useEffect(() => {
    if (user && (user.is_staff || user.is_superuser)) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim()) {
      toast.error("Enter administrative username.");
      return;
    }
    if (!password) {
      toast.error("Enter administrative password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate with backend
      const loginRes = await API.post("/users/login/", { username, password });
      const { access, refresh } = loginRes.data;

      // 2. Query user profile to verify staff clearance
      const meRes = await API.get("/users/me/", {
        headers: { Authorization: `Bearer ${access}` },
      });
      const userData = meRes.data;

      if (!userData.is_staff && !userData.is_superuser) {
        // Clear state & reject
        setErrorMessage(
          `Access Denied: Account "${userData.username}" does not possess administrative or staff privileges. Customer accounts cannot enter the Admin Console.`
        );
        toast.error("Access Denied: Administrative clearance required.");
        return;
      }

      // 3. Authorized staff member - store credentials
      localStorage.setItem("deallens_access", access);
      localStorage.setItem("deallens_refresh", refresh);
      localStorage.setItem("deallens_user", JSON.stringify(userData));
      setUser(userData);

      toast.success(`Staff clearance verified. Welcome, ${userData.username}`);
      navigate("/admin", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      let msg = "Authentication failed — invalid administrative credentials.";
      if (data?.detail) {
        msg = data.detail;
      } else if (data?.non_field_errors) {
        msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="admin-auth-page-wrapper"
      style={{
        backgroundImage: `var(--admin-auth-bg-overlay), url(${adminLoginBg})`,
      }}
    >
      <div
        className="card-panel card-glow"
        style={{
          width: "100%",
          maxWidth: 460,
          padding: "2.5rem 2rem",
          background: "var(--bg-glass-card)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--border-color)",
          borderRadius: "18px",
          boxShadow: "var(--shadow-card), 0 0 35px rgba(244, 63, 94, 0.14)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Crimson/Amber Alert Beacon */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #f43f5e, #f59e0b, #f43f5e)",
            boxShadow: "0 0 15px rgba(244, 63, 94, 0.6)",
          }}
        />

        {/* Security Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "14px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "var(--accent-rose)",
              marginBottom: "0.85rem",
              boxShadow: "0 0 20px rgba(244, 63, 94, 0.2)",
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <div style={{ display: "inline-block", marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--accent-rose)",
                background: "rgba(244, 63, 94, 0.12)",
                padding: "0.22rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid rgba(244, 63, 94, 0.28)",
                fontFamily: "var(--font-mono)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Terminal size={11} />
              Staff Security Gateway
            </span>
          </div>

          <h2
            style={{
              fontSize: "1.55rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: "0.4rem",
              fontFamily: "var(--font-heading)",
              letterSpacing: "-0.01em",
            }}
          >
            Administrative Console
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", margin: 0, lineHeight: 1.45 }}>
            Restricted access portal for catalog maintainers, system operators, and platform managers.
          </p>
        </div>

        {/* Current Session Warning (If logged in as normal non-staff user) */}
        {user && !user.is_staff && !user.is_superuser && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "10px",
              padding: "0.85rem",
              marginBottom: "1.25rem",
              fontSize: "0.82rem",
              color: "var(--accent-amber)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Currently logged in as shopper <strong>{user.username}</strong> (Non-Staff).
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{
                alignSelf: "flex-start",
                fontSize: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.3rem 0.65rem",
              }}
            >
              <LogOut size={12} />
              Sign Out Shopper Account
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "var(--accent-rose)",
              fontSize: "0.84rem",
              lineHeight: 1.45,
              marginBottom: "1.25rem",
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Admin Username */}
          <div>
            <label
              htmlFor="admin-username"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Staff Identifier / Username
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Terminal
                size={16}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  color: "var(--accent-rose)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                placeholder="Enter staff username"
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
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent-rose)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(244, 63, 94, 0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <label
              htmlFor="admin-password"
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                marginBottom: "0.35rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Security Passkey
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <KeyRound
                size={16}
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  color: "var(--accent-rose)",
                  pointerEvents: "none",
                }}
              />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter staff security key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 2.6rem 0.75rem 2.4rem",
                  borderRadius: "10px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.92rem",
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--accent-rose)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(244, 63, 94, 0.15)";
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
          </div>

          {/* Submit Clearance Verification */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.85rem",
              fontSize: "0.95rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #e11d48, #be123c)",
              color: "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(225, 29, 72, 0.35)",
              transition: "all 0.2s ease",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Verifying Clearance...</span>
              </>
            ) : (
              <>
                <span>Authenticate Staff Clearance</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Return to Customer Portal */}
        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          Customer looking to track prices?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--accent-cyan)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Shopper Sign In
          </Link>
        </div>

        {/* Security Protocol Specs */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <Lock size={12} style={{ color: "var(--accent-emerald)" }} />
          <span>RBAC ENFORCED • TLS 1.3 • AUDIT LOGGED</span>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
