// src/components/ProvenanceBadge.jsx
import React from "react";

/**
 * Radical Data Honesty Badge
 * Visually distinguishes verified/sourced data from estimated/model data.
 * Solid Dot = Verified Source (Census 2011, GSI 2023, Surveyed OSM)
 * Hollow/Dashed Dot = Estimated Source (Model Buffer, Simulated Telemetry)
 */
export default function ProvenanceBadge({ source = "Census 2011", type, tooltip, style = {} }) {
  const isEstimated =
    type === "estimated" ||
    source?.toLowerCase().includes("estimate") ||
    source?.toLowerCase().includes("buffer") ||
    source?.toLowerCase().includes("simulated") ||
    source?.toLowerCase().includes("approx");

  const label = source ? (source.length > 24 ? source.slice(0, 22) + "…" : source) : "Verified";

  const titleText =
    tooltip ||
    (isEstimated
      ? `ESTIMATED / APPROXIMATED DATA (Source: ${source}). Unsurveyed algorithmically derived metric.`
      : `OFFICIALLY SOURCED / VERIFIED (Source: ${source}). Ground-truth surveyed record.`);

  return (
    <span
      title={titleText}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.68rem",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: "4px",
        background: isEstimated ? "var(--watch-bg)" : "var(--safe-bg)",
        color: isEstimated ? "var(--watch)" : "var(--safe)",
        border: isEstimated ? "1px dashed var(--watch-border)" : "1px solid var(--safe-border)",
        cursor: "help",
        userSelect: "none",
        lineHeight: 1.3,
        verticalAlign: "middle",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        ...style,
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: isEstimated ? "transparent" : "currentColor",
          border: isEstimated ? "1.5px dashed currentColor" : "none",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

