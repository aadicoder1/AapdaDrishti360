// components/RouteDrawer.jsx
import React, { useState } from "react";
import SignalBar from "./SignalBar";
import { zoneColor, zoneBg, zoneBorder, verificationColor } from "./HazardZoneColor";
import ProvenanceBadge from "./ProvenanceBadge";
import { api } from "../api/client";

const STATUS_OPTIONS = [
  { value: "unverified", label: "Unverified", color: "var(--unverified)", bg: "#F1F5F9" },
  { value: "verified_clear", label: "Clear", color: "var(--verified-clear)", bg: "var(--safe-bg)" },
  { value: "verified_blocked", label: "Blocked", color: "var(--verified-blocked)", bg: "var(--red-zone-bg)" },
];

export default function RouteDrawer({
  region,
  village,
  sites = [],
  routeScores,
  suitability,
  suitabilityError,
  error,
  onVerify,
  onRerouted,
}) {
  const [droneResult, setDroneResult] = useState({});
  const [droneError, setDroneError] = useState({});
  const [droneLoading, setDroneLoading] = useState(null);

  const handleDroneUpload = async (site, file) => {
    if (!file) return;
    const siteInfo = sites.find((s) => s.name === site) || { lat: 30.5, lon: 79.1 };

    setDroneLoading(site);
    setDroneError((prev) => ({ ...prev, [site]: null }));
    try {
      const result = await api.runDroneCheck(region, village, site, siteInfo.lat || 0, siteInfo.lon || 0, file);
      setDroneResult((prev) => ({ ...prev, [site]: result }));
      onRerouted?.();
    } catch (e) {
      setDroneError((prev) => ({ ...prev, [site]: e.message }));
    } finally {
      setDroneLoading(null);
    }
  };

  if (!village) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎯</div>
        <strong style={{ color: "var(--text-headline)", fontSize: "1.05rem", display: "block", marginBottom: "6px" }}>
          Select a Village on the Map
        </strong>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "260px", margin: "0 auto", lineHeight: "1.45" }}>
          Click any origin village marker to inspect multi-criteria suitability, evacuation corridors, and road blockages.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "var(--red-zone)", background: "var(--red-zone-bg)", borderRadius: "var(--radius)", margin: "16px" }}>
        {error.includes("not found") ? `No route data available yet for ${village}.` : error}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        background: "#FFFFFF",
        color: "var(--text-body)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      {/* Village Header */}
      <div style={{ padding: "16px 18px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <div className="eyebrow" style={{ color: "var(--text-muted)" }}>Origin Location</div>
          <ProvenanceBadge source="Census 2011 & OSRM" type="verified" />
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, margin: "2px 0 0", color: "var(--text-headline)" }}>
          {village}
        </h2>
      </div>

      {/* Main Drawer Scroll Area */}
      <div style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", padding: "16px 18px" }}>
        {/* Site Suitability Section */}
        {suitability && suitability.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div className="eyebrow" style={{ marginBottom: "8px", color: "var(--accent-blue)" }}>
              Shelter Capacity & Suitability
            </div>
            {suitability.map((s) => {
              const isSufficient = s.capacity_sufficient;
              return (
                <div
                  key={s.site}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "12px 14px",
                    marginBottom: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <strong style={{ color: "var(--text-headline)" }}>{s.site}</strong>
                    <span
                      className="mono"
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: s.suitability_score >= 60 ? "var(--safe)" : s.suitability_score >= 35 ? "var(--watch)" : "var(--red-zone)",
                      }}
                    >
                      {Number(s.suitability_score).toFixed(1)}/100
                    </span>
                  </div>

                  {/* Multi-criteria Scores */}
                  <div
                    className="mono"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      background: "var(--bg-secondary)",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      marginBottom: "6px",
                    }}
                  >
                    <span>Safety: <strong>{s.safety_score}</strong></span>
                    <span>Capacity: <strong>{s.capacity_score}</strong></span>
                    <span>Access: <strong>{s.access_score}</strong></span>
                  </div>

                  <div style={{ fontSize: "0.74rem", color: isSufficient ? "var(--safe)" : "#C2410C", fontWeight: isSufficient ? 500 : 600 }}>
                    {isSufficient ? "✓ " : "⚠️ "}{s.resource_gap}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Route Feasibility Section */}
        {routeScores && (
          <div>
            <div className="eyebrow" style={{ marginBottom: "8px", color: "var(--accent-blue)" }}>
              Evacuation Corridors & Road Status
            </div>

            {routeScores.map((r) => {
              const isBlocked = r.verification_status?.toUpperCase().includes("BLOCKED");
              const isClear = r.verification_status?.toUpperCase().includes("CLEAR");
              const dRes = droneResult[r.site]?.drone_result;

              return (
                <div
                  key={r.site}
                  style={{
                    background: isBlocked ? "var(--red-zone-bg)" : "#FFFFFF",
                    border: isBlocked ? "1.5px solid var(--red-zone)" : "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "14px",
                    marginBottom: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "var(--text-headline)" }}>{r.site}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: isBlocked ? "#DC2626" : "#0F172A" }} className="mono">
                        ⏱️ {r.travel_time_min} min
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        📏 {r.distance_km} km
                      </div>
                    </div>
                  </div>

                  <div style={{ margin: "8px 0" }}>
                    <SignalBar score={r.route_feasibility_score} status={r.verification_status} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Road Status:</span>
                    <span
                      className="mono"
                      style={{
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        color: verificationColor(r.verification_status),
                        background: isBlocked ? "var(--red-zone-bg)" : isClear ? "var(--safe-bg)" : "#F1F5F9",
                        border: `1px solid ${verificationColor(r.verification_status)}`,
                      }}
                    >
                      {r.verification_status}
                    </span>
                  </div>

                  {/* Manual Status Buttons */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onVerify(r.site, opt.value)}
                        style={{
                          flex: 1,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "5px 4px",
                          background: r.verification_status === opt.value ? opt.color : "#FFFFFF",
                          color: r.verification_status === opt.value ? "#FFFFFF" : opt.color,
                          border: `1px solid ${opt.color}`,
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Drone Video AI Check */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "8px" }}>
                    <label
                      style={{
                        width: "100%",
                        textAlign: "center",
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        padding: "7px 10px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-headline)",
                        cursor: droneLoading === r.site ? "wait" : "pointer",
                        display: "block",
                        opacity: droneLoading === r.site ? 0.6 : 1,
                      }}
                    >
                      {droneLoading === r.site ? "🛰️ Analyzing Drone Video Stream…" : "📹 Upload Drone Video for AI Obstruction Check"}
                      <input
                        type="file"
                        accept="video/*"
                        style={{ display: "none" }}
                        disabled={droneLoading === r.site}
                        onChange={(e) => handleDroneUpload(r.site, e.target.files?.[0])}
                      />
                    </label>

                    {dRes && (
                      <div style={{ marginTop: "8px", padding: "8px 10px", borderRadius: "6px", background: dRes.blocked ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${dRes.blocked ? "#FECACA" : "#BBF7D0"}`, fontSize: "0.74rem" }}>
                        <div style={{ fontWeight: 700, color: dRes.blocked ? "#DC2626" : "#15803D" }}>
                          {dRes.blocked ? "🚨 Obstruction Identified by Drone AI" : "✓ Corridor Verified Clear"}
                        </div>
                        <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                          {dRes.reason}
                        </div>
                      </div>
                    )}

                    {droneError[r.site] && (
                      <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#DC2626" }}>
                        {droneError[r.site]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
