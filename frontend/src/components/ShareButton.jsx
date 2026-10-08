import React, { useState, useRef, useEffect, useCallback } from "react";
import { Share2, Copy, Check } from "lucide-react";

const shareItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.55rem 0.75rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "var(--text-primary)",
  textDecoration: "none",
  transition: "background 0.15s ease",
  cursor: "pointer",
  border: "none",
  background: "none",
  width: "100%",
  textAlign: "left",
};

const ShareButton = ({ title, url, price }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const firstItemRef = useRef(null);

  const shareUrl = url || `${window.location.origin}${window.location.pathname}`;
  const shareText = `${title}${price ? ` - ₹${Number(price).toLocaleString("en-IN")}` : ""} | Found on ShopSmart`;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
      firstItemRef.current?.focus();
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
      } catch (_e) {
        // User dismissed native share sheet
      }
      return;
    }
    setOpen((o) => !o);
  }, [title, shareText, shareUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={handleNativeShare}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          padding: "0.5rem 0.85rem",
          borderRadius: "8px",
          fontSize: "0.82rem",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          transition: "all 0.2s ease",
        }}
      >
        <Share2 size={14} /> Share
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.4rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "0.5rem",
            minWidth: 180,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            zIndex: 50,
            animation: "fadeInUp 0.15s ease",
          }}
        >
          <a
            ref={firstItemRef}
            href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            role="menuitem"
            style={shareItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <span style={{ fontSize: "1.1rem" }}>💬</span> WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            role="menuitem"
            style={shareItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <span style={{ fontSize: "1.1rem" }}>🐦</span> Twitter / X
          </a>
          <button
            onClick={() => { copyLink(); }}
            role="menuitem"
            style={shareItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {copied ? (
              <><Check size={14} style={{ color: "var(--accent-green)" }} /> Copied!</>
            ) : (
              <><Copy size={14} /> Copy Link</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
