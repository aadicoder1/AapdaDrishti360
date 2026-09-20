// src/components/ReplanBanner.jsx
import React from "react";

export default function ReplanBanner({ replanEvent, onDismiss }) {
  if (!replanEvent) return null;

  const { village, blockedSite, newSite, newScore, timestamp } = replanEvent;

  return (
    <div
      className="replan-alert-pulse"
      style={{
        margin: "12px 0 16px 0",
        padding: "14px 16px",
        background: "var(--red-zone-bg)",
        border: "1.5px solid var(--red-zone)",
        borderRadius: "var(--radius)",
        color: "var(--text-headline)",
        position: "relative",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>🚨</span>
          <div>
            <div className="eyebrow" style={{ color: "var(--red-zone)", letterSpacing: "0.08em" }}>
              Dynamic Route Re-Plan Active
            </div>
            <strong style={{ fontSize: "0.95rem", color: "#991B1B" }}>
              Evacuation Route Blockage Detected
            </strong>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.9rem",
              padding: "2px 6px",
            }}
            title="Dismiss notification"
          >
            ✕
          </button>
        )}
      </div>

      <p style={{ fontSize: "0.82rem", margin: "6px 0 10px", lineHeight: "1.45", color: "#7F1D1D" }}>
        Route from <strong>{village}</strong> to <strong>{blockedSite}</strong> was reported <span style={{ color: "var(--red-zone)", fontWeight: 700 }}>BLOCKED</span>. Relocation target has been dynamically recalculated.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#FFFFFF",
          border: "1px solid var(--red-zone-border)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.82rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div>
          <span style={{ color: "var(--text-secondary)" }}>New Recommended Target: </span>
          <strong style={{ color: "var(--safe)", fontSize: "0.9rem" }}>{newSite || "Alternative Safe Site"}</strong>
        </div>
        {newScore !== undefined && (
          <span className="mono" style={{ color: "var(--safe)", fontWeight: 700 }}>
            Feasibility: {Number(newScore).toFixed(1)}/100
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
        <span className="mono">Trigger: Field Verification Override</span>
        <span className="mono">{timestamp || "Just now"}</span>
      </div>
    </div>
  );
}

