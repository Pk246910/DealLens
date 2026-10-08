import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axios";
import {
  KeyRound,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import PasswordStrength from "../components/PasswordStrength";
import loginBg from "../assets/login-bg.jpg";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialUid = params.get("uid") || "";
  const initialToken = params.get("token") || "";

  const [step, setStep] = useState(initialUid && initialToken ? 2 : 1);
  const [form, setForm] = useState({
    username: "",
    email: "",
    uid: initialUid,
    token: initialToken,
    new_password: "",
    confirm_password: "",
  });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState("");

  const errText = (err, fallback) => {
    const d = err.response?.data;
    if (!d) return fallback;
    if (d.detail) return d.detail;
    const parts = [];
    for (const [k, v] of Object.entries(d)) {
      parts.push(`${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    }
    return parts.join(" | ") || fallback;
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessInfo("");

    if (!form.username.trim() || !form.email.trim()) {
      toast.error("Please enter both username and email.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/users/forgot-password/", {
        username: form.username,
        email: form.email,
      });
      const msg = res.data.detail || "Reset instructions sent to your email";
      toast.success(msg);
      setSuccessInfo(msg);
      setStep(2);
    } catch (err) {
      const msg = errText(err, "Failed to send reset instructions");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.uid.trim() || !form.token.trim()) {
      toast.error("Reset ID (UID) and Token are required.");
      return;
    }
    if (form.new_password.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/users/reset-password/", {
        uid: form.uid,
        token: form.token,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      const msg = res.data.detail || "Password reset successfully! Redirecting to login...";
      toast.success(msg);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      const msg = errText(err, "Reset failed — token may be expired or invalid");
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
          maxWidth: 480,
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

        {/* Header */}
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
            <KeyRound size={24} />
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
            Account Recovery
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
            {step === 1
              ? "Verify your identity to generate a secure password reset token."
              : "Enter your verification token and define your new credentials."}
          </p>
        </div>

        {/* Step Indicator Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "10px",
            padding: "0.35rem",
            marginBottom: "1.5rem",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              flex: 1,
              padding: "0.45rem",
              border: "none",
              borderRadius: "7px",
              background: step === 1 ? "var(--bg-card)" : "transparent",
              color: step === 1 ? "var(--accent-cyan)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            1. Request Token
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            style={{
              flex: 1,
              padding: "0.45rem",
              border: "none",
              borderRadius: "7px",
              background: step === 2 ? "var(--bg-card)" : "transparent",
              color: step === 2 ? "var(--accent-cyan)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            2. Set Password
          </button>
        </div>

        {/* Success Banner */}
        {successInfo && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "var(--accent-emerald)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successInfo}</span>
          </div>
        )}

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

        {/* STEP 1: Request Link */}
        {step === 1 ? (
          <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label
                htmlFor="forgot-username"
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
                  id="forgot-username"
                  type="text"
                  placeholder="Enter your registered username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
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
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="forgot-email"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Registered Email
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
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
            </div>

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
                  <span>Dispatching Token...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Instructions</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Confirm Reset */
          <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label
                  htmlFor="reset-uid"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Reset UID
                </label>
                <input
                  id="reset-uid"
                  placeholder="UID from email"
                  value={form.uid}
                  onChange={(e) => setForm({ ...form, uid: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.7rem",
                    borderRadius: "10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="reset-token"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Reset Token
                </label>
                <input
                  id="reset-token"
                  placeholder="Token string"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "0.7rem",
                    borderRadius: "10px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reset-new-password"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                New Password
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
                  id="reset-new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
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
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={form.new_password} />
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: "0.35rem",
                }}
              >
                Confirm New Password
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
                  id="reset-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm matching password"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
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
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Development Tip */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <HelpCircle size={14} style={{ flexShrink: 0, marginTop: "0.1rem", color: "var(--accent-cyan)" }} />
          <span>
            {step === 1
              ? "If you have an account registered, a reset email with your UID and Token will be generated."
              : "In a development environment, your reset link UID and Token are printed to the Django terminal console."}
          </span>
        </div>

        {/* Return to Login */}
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            textAlign: "center",
          }}
        >
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.color = "var(--accent-cyan)")}
            onMouseLeave={(e) => (e.target.style.color = "var(--text-secondary)")}
          >
            <ArrowLeft size={15} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
