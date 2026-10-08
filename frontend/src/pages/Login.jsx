import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Loader2,
} from "lucide-react";
import loginBg from "../assets/login-bg.jpg";

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAdminDetected, setIsAdminDetected] = useState(false);

  // If already authenticated as an administrator, automatically route to the Admin Console
  useEffect(() => {
    if (user && (user.is_staff || user.is_superuser)) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsAdminDetected(false);

    if (!username.trim()) {
      toast.error("Please enter your username.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await login(username, password, { disallowStaff: true });
      toast.success("Welcome back to ShopSmart!");
      navigate(from, { replace: true });
    } catch (err) {
      if (err.isStaff || err.message === "ADMIN_ACCOUNT_NOT_ALLOWED") {
        const msg = "Administrator account detected. Administrator accounts must log in through the Admin Gateway only.";
        setErrorMessage(msg);
        setIsAdminDetected(true);
        toast.error("Admin accounts must use the Admin Gateway.");
        return;
      }
      const data = err.response?.data;
      let msg = "Invalid username or password";
      if (data?.detail) {
        msg = data.detail;
      } else if (data?.non_field_errors) {
        msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
      } else if (data?.username) {
        msg = Array.isArray(data.username) ? data.username[0] : data.username;
      } else if (data?.password) {
        msg = Array.isArray(data.password) ? data.password[0] : data.password;
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
        className="card-panel card-glow"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "2.25rem 2rem",
          background: "var(--bg-glass-card)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--border-color)",
          borderRadius: "18px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--shadow-card), 0 0 35px rgba(6, 182, 212, 0.12)",
        }}
      >
        {/* Subtle top ambient glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "2px",
            background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
            boxShadow: "0 0 12px var(--accent-cyan)",
          }}
        />

        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: "rgba(6, 182, 212, 0.1)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              color: "var(--accent-cyan)",
              marginBottom: "0.85rem",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.15)",
            }}
          >
            <Sparkles size={24} />
          </div>
          <div style={{ display: "inline-block", marginBottom: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--accent-cyan)",
                background: "rgba(6, 182, 212, 0.1)",
                padding: "0.2rem 0.6rem",
                borderRadius: 999,
                border: "1px solid rgba(6, 182, 212, 0.2)",
              }}
            >
              Shopper Portal
            </span>
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: "0.35rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            Welcome Back
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
            Sign in to access price alerts, saved watchlists, and decision telemetry.
          </p>
        </div>

        {/* Admin Clearance Security Banner */}
        {isAdminDetected && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              animation: "fadeIn 0.25s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--accent-rose)",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              <ShieldAlert size={18} />
              <span>Administrative Clearance Required</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              Account <strong>{username}</strong> possesses administrative credentials. For security isolation, administrator accounts can only log in through the Admin Gateway.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/login", { state: { username } })}
              style={{
                alignSelf: "flex-start",
                background: "linear-gradient(135deg, #e11d48, #be123c)",
                color: "#ffffff",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontWeight: 700,
                fontSize: "0.82rem",
                marginTop: "0.25rem",
                cursor: "pointer",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(225, 29, 72, 0.35)",
              }}
            >
              <span>Go to Admin Login Gateway</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Standard Error Banner */}
        {!isAdminDetected && errorMessage && (
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Username Field */}
          <div>
            <label
              htmlFor="login-username"
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
                id="login-username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
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

          {/* Password Field */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label
                htmlFor="login-password"
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "0.78rem",
                  color: "var(--accent-cyan)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </div>
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
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
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
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
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
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Registration Link */}
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
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--accent-cyan)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Create Free Account
          </Link>
        </div>

        {/* Staff Security Gateway Link */}
        <div
          style={{
            marginTop: "0.85rem",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          System Administrator or Staff?{" "}
          <Link
            to="/admin/login"
            style={{
              color: "var(--accent-rose)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Staff Gateway →
          </Link>
        </div>

        {/* Security Indicator */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            color: "var(--text-muted)",
          }}
        >
          <ShieldCheck size={13} style={{ color: "var(--accent-emerald)" }} />
          <span>256-Bit Encrypted Session • Real-Time Deal Alerts</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
