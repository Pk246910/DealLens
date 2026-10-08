import React from "react";
import { getPlatformColor } from "../utils/platforms";

const PlatformBadge = ({ platform, size = "md", showDot = true, style = {} }) => {
  if (!platform) return null;

  const color = getPlatformColor(platform, "var(--accent-cyan)");
  const isSm = size === "sm";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? "0.25rem" : "0.35rem",
        padding: isSm ? "0.15rem 0.45rem" : "0.2rem 0.6rem",
        borderRadius: "6px",
        fontSize: isSm ? "0.7rem" : "0.75rem",
        fontWeight: 700,
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}35`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showDot && (
        <span
          style={{
            width: isSm ? 5 : 6,
            height: isSm ? 5 : 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }}
        />
      )}
      {platform}
    </span>
  );
};

export default PlatformBadge;
