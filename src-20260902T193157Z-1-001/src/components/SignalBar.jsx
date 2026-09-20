// components/SignalBar.jsx
export function routePathColor(score, status) {
  if (status?.includes("BLOCKED")) return "#c4432e";
  if (Number(score) >= 50) return "#3fa5a0";
  if (Number(score) >= 20) return "#e8b94a";
  return "#e07a3f";
}

export default function SignalBar({ score, status }) {
  const totalBars = 10;
  const litBars = Math.round((score / 100) * totalBars);

  const color =
    status?.includes("BLOCKED")
      ? "var(--verified-blocked)"
      : status?.includes("CLEAR")
      ? "var(--verified-clear)"
      : "var(--watch)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ display: "flex", gap: "2px", alignItems: "flex-end" }}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "4px",
              height: `${8 + i * 2}px`,
              background: i < litBars ? color : "var(--border)",
              borderRadius: "1px",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <span className="mono" style={{ fontSize: "0.9rem", color }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}