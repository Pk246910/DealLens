import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Sparkles,
  Clock,
  Heart,
  Bell,
  User,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

const isActive = (pathname, path) => {
  if (path === "/") return pathname === "/";
  return pathname.startsWith(path);
};

const Navbar = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }
    try {
      const res = await API.get("/wishlist/");
      const data = res.data;
      const list = data.results !== undefined ? data.results : data;
      setWishlistCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setWishlistCount(0);
    }
  }, [user]);

  const fetchAlertCount = useCallback(async () => {
    if (!user) {
      setAlertCount(0);
      return;
    }
    try {
      const res = await API.get("/users/alerts/");
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAlertCount(list.length);
    } catch {
      setAlertCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();
    fetchAlertCount();
    setMobileOpen(false);
  }, [location.pathname, fetchCount, fetchAlertCount]);

  useEffect(() => {
    const handler = () => {
      fetchCount();
      fetchAlertCount();
    };
    window.addEventListener("wishlist:changed", handler);
    window.addEventListener("alert:changed", handler);
    return () => {
      window.removeEventListener("wishlist:changed", handler);
      window.removeEventListener("alert:changed", handler);
    };
  }, [fetchCount, fetchAlertCount]);

  return (
    <header className="navbar" role="banner">
      {/* Brand Logo & Platform Subtitle */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link to="/" className="brand" aria-label="ShopSmart Home">
          <span style={{ fontSize: "1.35rem", display: "inline-flex", filter: "drop-shadow(0 0 8px rgba(6, 182, 212, 0.4))" }}>
            ⚡
          </span>
          <span>ShopSmart</span>
        </Link>
        <span
          style={{
            display: "none",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "0.2rem 0.55rem",
            borderRadius: "6px",
            background: "rgba(6, 182, 212, 0.1)",
            color: "var(--accent-cyan)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
          }}
          className="brand-ai-badge"
        >
          <Sparkles size={11} /> AI Decision Engine
        </span>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="navbar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navigation Links Group */}
      <nav
        id="mobile-nav"
        className={`nav-links-group ${mobileOpen ? "mobile-open" : ""}`}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? "true" : undefined}
      >
        <Link
          to="/"
          className={`nav-item ${isActive(location.pathname, "/") && location.pathname === "/" ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <Sparkles size={15} style={{ opacity: 0.8 }} /> Analyze
          </span>
        </Link>


        <Link
          to="/recent"
          className={`nav-item ${isActive(location.pathname, "/recent") ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <Clock size={15} style={{ opacity: 0.8 }} /> Recent
          </span>
        </Link>

        <Link
          to="/wishlist"
          className={`nav-item ${isActive(location.pathname, "/wishlist") ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <Heart size={15} style={{ opacity: 0.8 }} /> Wishlist
            {wishlistCount > 0 && (
              <span
                style={{
                  background: "var(--accent-rose)",
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "0.1rem 0.45rem",
                  borderRadius: 999,
                  marginLeft: "0.2rem",
                  boxShadow: "0 0 8px rgba(244, 63, 94, 0.4)",
                }}
              >
                {wishlistCount}
              </span>
            )}
          </span>
        </Link>

        <Link
          to="/alerts"
          className={`nav-item ${isActive(location.pathname, "/alerts") ? "active" : ""}`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <Bell size={15} style={{ opacity: 0.8 }} /> Price Alerts
            {alertCount > 0 && (
              <span
                style={{
                  background: "var(--accent-amber)",
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "0.1rem 0.45rem",
                  borderRadius: 999,
                  marginLeft: "0.2rem",
                  boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)",
                }}
              >
                {alertCount}
              </span>
            )}
          </span>
        </Link>

        {/* User Account / Staff / Guest Actions */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              to="/profile"
              className={`nav-item ${isActive(location.pathname, "/profile") ? "active" : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <User size={15} style={{ opacity: 0.8 }} /> Profile
            </Link>

            {(user.is_staff || user.is_superuser) && (
              <Link
                to="/admin"
                className={`nav-item ${isActive(location.pathname, "/admin") ? "active" : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  color: "var(--accent-cyan)",
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={15} /> Admin
              </Link>
            )}

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-green)",
                  boxShadow: "0 0 8px var(--accent-green)",
                }}
              />
              <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.username}
              </span>
            </div>

            <button
              onClick={logout}
              className="nav-btn-logout"
              title="Sign out of account"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              to="/login"
              className={`nav-item ${isActive(location.pathname, "/login") ? "active" : ""}`}
            >
              Login
            </Link>
            <Link to="/register" className="nav-btn-register">
              Register
            </Link>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <>
              <Sun size={15} style={{ color: "#f59e0b" }} /> Light
            </>
          ) : (
            <>
              <Moon size={15} style={{ color: "var(--accent-cyan)" }} /> Dark
            </>
          )}
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
