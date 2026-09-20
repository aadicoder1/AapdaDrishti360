import React, { useState } from "react";

export default function MapLegend() {
  const [isOpen, setIsOpen] = useState(true);


  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-md)",
        maxWidth: "280px",
        transition: "all 0.2s ease",
        color: "var(--text-primary)",
        fontSize: "0.78rem",
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "var(--bg-secondary)",
          borderBottom: isOpen ? "1px solid var(--border)" : "none",
          borderRadius: isOpen ? "var(--radius) var(--radius) 0 0" : "var(--radius)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--accent-blue)", fontSize: "0.9rem" }}>⬡</span>
          <span className="eyebrow" style={{ color: "var(--text-headline)", letterSpacing: "0.08em" }}>
            Map Legend
          </span>
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {isOpen ? "▲ Collapse" : "▼ Expand"}
        </span>
      </div>


      {isOpen && (
        <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Risk Severity */}
          <div>
            <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: "5px", color: "var(--text-secondary)" }}>
              Village Risk Level
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--red-zone)" }} />
                <span>Red Zone</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--warning)" }} />
                <span>Warning</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--watch)" }} />
                <span>Watch</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--safe)" }} />
                <span>Safe</span>
              </div>
            </div>
          </div>

          {/* Route Feasibility */}
          <div>
            <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: "5px", color: "var(--text-secondary)" }}>
              Road Readiness & ETA
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "4px", background: "#10B981", borderRadius: "2px" }} />
                <span><strong style={{ color: "#15803D" }}>Green:</strong> Ready to Go (Score ≥ 50)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "4px", background: "#F59E0B", borderRadius: "2px" }} />
                <span><strong style={{ color: "#D97706" }}>Amber:</strong> Caution / Risk (20–49)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "4px", background: "#EF4444", borderRadius: "2px" }} />
                <span><strong style={{ color: "#DC2626" }}>Red:</strong> Impasse / Blocked</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span style={{ fontSize: "0.8rem" }}>🚗</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Floating ETA Pills: <strong>Duration & Distance</strong></span>
              </div>
            </div>
          </div>


          {/* Boundaries: Radical Honesty */}
          <div>
            <div className="eyebrow" style={{ fontSize: "0.62rem", marginBottom: "5px", color: "var(--text-secondary)" }}>
              Data Provenance & Boundaries
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "0", borderTop: "2px solid var(--text-primary)" }} />
                <span>Solid Line: Real OSM / Surveyed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "16px", height: "0", borderTop: "2px dashed var(--watch)" }} />
                <span style={{ color: "var(--watch)" }}>Dashed Line: Estimated Buffer</span>
              </div>
            </div>
          </div>

          {/* Hazards */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", background: "rgba(196,67,46,0.3)", border: "1px dashed #c4432e" }} />
                <span>Landslide</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", background: "rgba(224,122,63,0.3)", border: "1px dashed #e07a3f" }} />
                <span>Cloudburst</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
