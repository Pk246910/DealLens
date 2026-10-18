import React, { useEffect, useState } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Calendar,
  LogOut,
  Save,
  KeyRound,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import PasswordStrength from "../components/PasswordStrength";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", first_name: "", last_name: "" });
  const [pwd, setPwd] = useState({ old_password: "", new_password: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    API.get("/users/me/")
      .then((res) => {
        setProfile(res.data);
        setForm({
          username: res.data.username || "",
          email: res.data.email || "",
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
        });
      })
      .catch(() => toast.error("Failed to load user profile"))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await API.patch("/users/me/", form);
      setProfile(res.data);
      toast.success("Profile preferences saved ✓");
      localStorage.setItem("deallens_user", JSON.stringify(res.data));
      setUser(res.data);
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.detail || "Profile update failed.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwd.new_password.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setSavingPwd(true);
    try {
      await API.post("/users/change-password/", pwd);
      toast.success("Security credentials updated! Please keep them safe.");
      setPwd({ old_password: "", new_password: "" });
    } catch (err) {
      const d = err.response?.data;
      let m = "Password update failed";
      if (d) {
        if (d.old_password) m = `Current password: ${Array.isArray(d.old_password) ? d.old_password.join(", ") : d.old_password}`;
        else if (d.new_password) m = `New password: ${Array.isArray(d.new_password) ? d.new_password.join(", ") : d.new_password}`;
        else if (d.detail) m = d.detail;
      }
      toast.error(m);
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: "4rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <Loader2 size={32} className="spinner" style={{ margin: "0 auto 0.75rem", color: "var(--accent-cyan)" }} />
        <div>Retrieving account telemetry...</div>
      </div>
    );
  }

  if (!profile) return null;

  const isStaff = profile.is_staff || profile.is_superuser;

  return (
    <div className="page-container" style={{ padding: "2.5rem 1rem 4rem", maxWidth: 960 }}>
      {/* User Hero Banner */}
      <div
        className="card-panel card-glow"
        style={{
          padding: "2rem",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2rem",
          background: "var(--bg-banner-gradient)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: isStaff
                ? "linear-gradient(135deg, #e11d48, #be123c)"
                : "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "1.5rem",
              boxShadow: isStaff
                ? "0 0 20px rgba(225, 29, 72, 0.35)"
                : "0 0 20px rgba(6, 182, 212, 0.3)",
              flexShrink: 0,
            }}
          >
            {profile.username?.charAt(0).toUpperCase()}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                {profile.username}
              </h1>
              {profile.is_superuser ? (
                <span className="badge badge-purple" style={{ fontSize: "0.72rem" }}>
                  Super Admin
                </span>
              ) : profile.is_staff ? (
                <span className="badge badge-cyan" style={{ fontSize: "0.72rem" }}>
                  Staff Operator
                </span>
              ) : (
                <span className="badge badge-emerald" style={{ fontSize: "0.72rem" }}>
                  Verified Shopper
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span>{profile.email || "No email assigned"}</span>
              <span style={{ color: "var(--border-color)" }}>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <Calendar size={13} />
                Joined {new Date(profile.date_joined).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {isStaff && (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem" }}
            >
              <ShieldCheck size={14} />
              <span>Admin Console</span>
              <ArrowRight size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.5rem 0.9rem",
              color: "var(--accent-rose)",
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Grid: Profile Edit & Password Security */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.75rem" }}>
        {/* Card 1: Personal Details */}
        <div className="card-panel" style={{ padding: "1.75rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <User size={18} style={{ color: "var(--accent-cyan)" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Account Identity
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "0 0 1.25rem" }}>
            Update your registered account name and contact email.
          </p>

          <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Username
              </label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.7rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Registered Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.7rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  First Name
                </label>
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Last Name
                </label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Optional"
                  style={{
                    width: "100%",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
              style={{
                marginTop: "0.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.75rem",
                fontSize: "0.88rem",
                fontWeight: 700,
              }}
            >
              {savingProfile ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="card-panel" style={{ padding: "1.75rem", borderRadius: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <KeyRound size={18} style={{ color: "var(--accent-amber)" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Security Credentials
            </h3>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", margin: "0 0 1.25rem" }}>
            Update your account password with encrypted end-to-end authorization.
          </p>

          <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Current Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showOld ? "text" : "password"}
                  value={pwd.old_password}
                  onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })}
                  placeholder="Enter current password"
                  required
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "0.7rem 2.6rem 0.7rem 0.85rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld((prev) => !prev)}
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
                  aria-label={showOld ? "Hide password" : "Show password"}
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                New Password (Minimum 8 Characters)
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showNew ? "text" : "password"}
                  value={pwd.new_password}
                  onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                  placeholder="Create new strong password"
                  required
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "0.7rem 2.6rem 0.7rem 0.85rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
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
              <PasswordStrength password={pwd.new_password} />
            </div>

            <button
              type="submit"
              disabled={savingPwd}
              className="btn btn-secondary"
              style={{
                marginTop: "0.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                padding: "0.75rem",
                fontSize: "0.88rem",
                fontWeight: 700,
              }}
            >
              {savingPwd ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
