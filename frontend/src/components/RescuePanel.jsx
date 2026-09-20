// components/RescuePanel.jsx
import { useState, useEffect } from "react";
import { api } from "../api/client";

const PRIORITY_COLOR = {
  CRITICAL: "var(--red-zone)",
  HIGH: "var(--warning)",
  MEDIUM: "var(--watch)",
  LOW: "var(--text-muted)",
};

export default function RescuePanel({ region }) {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    api.getRescueCases(region).then(setCases).catch(() => setCases([]));
  }, [region]);

  return (
    <div style={{ padding: "20px" }}>
      <div className="eyebrow">Post-event rescue cases</div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "480px" }}>
        Detected independently of relocation planning. Coordinates are
        simulated drone telemetry for this prototype.
      </p>

      {cases.map((c) => (
        <div
          key={c.case_id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <span style={{ color: PRIORITY_COLOR[c.priority_label], fontWeight: 600 }}>
              {c.priority_label}
            </span>{" "}
            <span className="mono" style={{ fontSize: "0.85rem" }}>
              {c.priority_score.toFixed(1)}
            </span>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {c.people_count} people · ± {c.error_radius_m}m
            </div>
          </div>
          <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {c.nearest_village}
          </div>
        </div>
      ))}
    </div>
  );
}