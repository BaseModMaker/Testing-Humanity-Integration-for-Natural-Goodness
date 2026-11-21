import React from "react";

// Shared UI for all THING minigames. The contents are supplied by each game.
export const THING_COLORS = {
  cream: "rgb(248, 236, 221)",
  ink: "#43483a",
  olive: "#74875e",
  oliveDark: "#536d47",
  sage: "#a3b879",
  line: "#777b68",
  track: "#e2dfd1",
};

const shared = {
  display: "flex",
  flex: "0 0 auto",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  boxSizing: "border-box",
  background: THING_COLORS.cream,
  color: THING_COLORS.ink,
};

export function GameHeader({ children, className = "", style = {} }) {
  return (
    <header
      className={className}
      style={{
        ...shared,
        minHeight: 80,
        padding: "max(12px, env(safe-area-inset-top)) 24px 12px",
        borderBottom: `1px solid ${THING_COLORS.line}`,
        ...style,
      }}
    >
      {children}
    </header>
  );
}
