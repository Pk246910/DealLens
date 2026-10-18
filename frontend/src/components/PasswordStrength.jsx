import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

/**
 * Visual password-strength meter with multi-stage criteria checklist
 * and animated health bar matching Design 2 (Obsidian AI Platform).
 */
const PasswordStrength = ({ password }) => {
  const criteria = useMemo(() => {
    return [
      { id: "length", label: "8+ characters", met: password.length >= 8 },
      { id: "upper", label: "Uppercase letter", met: /[A-Z]/.test(password) },
      { id: "lower", label: "Lowercase letter", met: /[a-z]/.test(password) },
      { id: "number", label: "Number (0-9)", met: /[0-9]/.test(password) },
      { id: "special", label: "Special symbol", met: /[^A-Za-z0-9]/.test(password) },
    ];
  }, [password]);

  if (!password) return null;

  const metCount = criteria.filter((c) => c.met).length;
  
  // Strength tiers
  let strengthLabel = "Weak";
  let strengthColor = "var(--accent-rose)";
  let barPercent = 20;

  if (metCount >= 5) {
    strengthLabel = "Excellent";
    strengthColor = "var(--accent-emerald)";
    barPercent = 100;
  } else if (metCount >= 4) {
    strengthLabel = "Strong";
    strengthColor = "var(--accent-cyan)";
    barPercent = 80;
  } else if (metCount >= 3) {
    strengthLabel = "Fair";
    strengthColor = "var(--accent-amber)";
    barPercent = 60;
  } else if (metCount >= 2) {
    strengthLabel = "Moderate";
    strengthColor = "var(--accent-amber)";
    barPercent = 40;
  }

  return (
    <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      {/* Strength meter bar & label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Password Strength:</span>
        <span style={{ color: strengthColor, fontWeight: 700, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
          {strengthLabel}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: 4,
          background: "var(--border-color)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barPercent}%`,
            background: strengthColor,
            boxShadow: `0 0 8px ${strengthColor}`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Criteria chips checklist */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
        {criteria.map((c) => (
          <span
            key={c.id}
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              padding: "0.2rem 0.5rem",
              borderRadius: "6px",
              background: c.met ? "rgba(16, 185, 129, 0.1)" : "var(--bg-subtle-surface)",
              color: c.met ? "var(--accent-emerald)" : "var(--text-muted)",
              border: `1px solid ${c.met ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              transition: "all 0.2s ease",
            }}
          >
            {c.met ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
