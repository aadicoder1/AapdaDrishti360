// components/SignalBar.jsx
import React from "react";

export function routePathColor(score, status) {
  if (status?.toUpperCase().includes("BLOCKED")) return "#EF4444"; // Red (Blocked)
  if (Number(score) >= 50) return "#10B981"; // Vibrant Green (Ready to Go)
  if (Number(score) >= 20) return "#F59E0B"; // Amber (Caution / Bottleneck)
  return "#EF4444"; // Red (Impasse)
}


export default function SignalBar({ score = 0, status = "UNVERIFIED" }) {
  const totalBars = 10;
  const numericScore = Number(score) || 0;
  const litBars = Math.max(0, Math.min(totalBars, Math.round((numericScore / 100) * totalBars)));

  const isBlocked = status?.toUpperCase().includes("BLOCKED");
  const isClear = status?.toUpperCase().includes("CLEAR");

  const color = isBlocked
    ? "var(--verified-blocked)"
    : isClear
    ? "var(--verified-clear)"
    : numericScore >= 50
    ? "var(--safe)"
    : numericScore >= 20
    ? "var(--watch)"
    : "var(--warning)";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "10px" }}
      title={`Feasibility Score: ${numericScore.toFixed(1)}/100 (${status})`}
    >
      <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "20px" }}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "4px",
              height: `${7 + i * 1.5}px`,
              background: i < litBars ? color : "#E2E8F0",
              borderRadius: "2px",
              transition: "background 0.3s ease, height 0.2s ease",
            }}
          />
        ))}
      </div>
      <span className="mono" style={{ fontSize: "0.88rem", fontWeight: 700, color }}>
        {numericScore.toFixed(1)}
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "2px" }}>/100</span>
      </span>
    </div>
  );
}

