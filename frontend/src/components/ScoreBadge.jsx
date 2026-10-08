import React from "react";

const getScoreColor = (score) => {
  const num = Number(score) || 0;
  if (num >= 80) return { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.35)", text: "var(--accent-green)", glow: "rgba(16, 185, 129, 0.3)", label: "Top Deal" };
  if (num >= 60) return { bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.35)", text: "var(--accent-cyan)", glow: "rgba(6, 182, 212, 0.3)", label: "Great Deal" };
  if (num >= 40) return { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)", text: "var(--accent-amber)", glow: "rgba(245, 158, 11, 0.3)", label: "Fair Deal" };
  return { bg: "rgba(244, 63, 94, 0.15)", border: "rgba(244, 63, 94, 0.35)", text: "var(--accent-rose)", glow: "rgba(244, 63, 94, 0.3)", label: "Low Value" };
};

const ScoreBadge = ({ score, size = "md", showLabel = false, style = {} }) => {
  if (score === null || score === undefined || score === "") return null;
  const num = Math.round(Number(score));
  const meta = getScoreColor(num);

  const isLg = size === "lg";
  const isSm = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: isLg ? "0.35rem 0.8rem" : isSm ? "0.15rem 0.45rem" : "0.2rem 0.6rem",
        borderRadius: isLg ? "10px" : "6px",
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.text,
        fontSize: isLg ? "0.95rem" : isSm ? "0.72rem" : "0.82rem",
        fontWeight: 800,
        fontFamily: "var(--font-mono)",
        boxShadow: `0 0 10px ${meta.glow}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      title={`Best Deal Score: ${num}/100 (${meta.label})`}
    >
      <span style={{ fontSize: isLg ? "0.85rem" : "0.7rem", opacity: 0.85 }}>⚡</span>
      <span>{num}</span>
      {isLg && <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>/100</span>}
      {showLabel && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginLeft: "0.25rem",
            paddingLeft: "0.35rem",
            borderLeft: `1px solid ${meta.border}`,
          }}
        >
          {meta.label}
        </span>
      )}
    </span>
  );
};

export default ScoreBadge;
