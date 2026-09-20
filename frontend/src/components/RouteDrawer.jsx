// components/RouteDrawer.jsx
import { useState } from "react";
import SignalBar from "./SignalBar";
import { verificationColor } from "./HazardZoneColor";
import { api } from "../api/client";

const STATUS_OPTIONS = ["unverified", "verified_clear", "verified_blocked"];

export default function RouteDrawer({ region, village, sites, routeScores, suitability, suitabilityError, error, onVerify, onRerouted }) {
  const [droneSite, setDroneSite] = useState(null); // which site's drone-check is in progress
  const [droneResult, setDroneResult] = useState({}); // { [site]: result }
  const [droneError, setDroneError] = useState({});
  const [droneLoading, setDroneLoading] = useState(null);

  const handleDroneUpload = async (site, file) => {
    if (!file) return;
    const siteInfo = sites.find((s) => s.name === site);
    if (!siteInfo) return;

    setDroneLoading(site);
    setDroneError((prev) => ({ ...prev, [site]: null }));
    try {
      const result = await api.runDroneCheck(region, village, site, siteInfo.lat, siteInfo.lon, file);
      setDroneResult((prev) => ({ ...prev, [site]: result }));
      if (result.backend_response) {
        onRerouted?.(); // refresh map/route scores since verification status changed
      }
    } catch (e) {
      setDroneError((prev) => ({ ...prev, [site]: e.message }));
    } finally {
      setDroneLoading(null);
      setDroneSite(null);
    }
  };

  if (!village) {
    return (
      <div style={{ padding: "24px", color: "var(--text-muted)" }}>
        Select a village on the map to see relocation options.
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "var(--red-zone)" }}>
        {error.includes("not found")
          ? `No route data yet for ${village}. Has the scoring pipeline been run for this village?`
          : error}
      </div>
    );
  }

  if (!routeScores) {
    return <div style={{ padding: "24px" }}>Loading routes…</div>;
  }

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
      <div className="eyebrow">Relocation options</div>
      <h2 style={{ fontFamily: "var(--font-display)", margin: "4px 0 20px" }}>
        {village}
      </h2>

      {suitability && (
        <>
          <div className="eyebrow" style={{ marginTop: "8px" }}>Site suitability</div>
          {suitability.map((s) => (
            <div
              key={s.site}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "14px",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{s.site}</strong>
                <span
                  className="mono"
                  style={{
                    fontSize: "0.9rem",
                    color: s.suitability_score >= 60 ? "var(--safe)" : s.suitability_score >= 35 ? "var(--watch)" : "var(--red-zone)",
                  }}
                >
                  {s.suitability_score}/100
                </span>
              </div>

              <div style={{ display: "flex", gap: "12px", margin: "8px 0", fontSize: "0.75rem" }} className="mono">
                <span style={{ color: "var(--text-secondary)" }}>Safety {s.safety_score}</span>
                <span style={{ color: "var(--text-secondary)" }}>Capacity {s.capacity_score}</span>
                <span style={{ color: "var(--text-secondary)" }}>Access {s.access_score}</span>
              </div>

              <div
                style={{
                  fontSize: "0.8rem",
                  color: s.capacity_sufficient ? "var(--safe)" : "var(--warning)",
                  marginBottom: "4px",
                }}
              >
                {s.resource_gap}
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {s.hazard_note}
              </div>
            </div>
          ))}
        </>
      )}

      {suitabilityError && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>
          Suitability data not available for {village} yet.
        </div>
      )}

      {routeScores.map((r) => (
        <div
          key={r.site}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <strong>{r.site}</strong>
            <span className="mono" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {r.distance_km}km · {r.travel_time_min}min
            </span>
          </div>

          <div style={{ margin: "10px 0" }}>
            <SignalBar score={r.route_feasibility_score} status={r.verification_status} />
          </div>

          <div
            className="mono"
            style={{ fontSize: "0.75rem", color: verificationColor(r.verification_status), marginBottom: "10px" }}
          >
            {r.verification_status}
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
            {r.verification_note}
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => onVerify(r.site, status)}
                style={{
                  fontSize: "0.7rem",
                  padding: "5px 10px",
                  background: "var(--panel-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Drone AI verification */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
            <label
              style={{
                fontSize: "0.7rem",
                padding: "6px 10px",
                background: "var(--panel-raised)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text-primary)",
                cursor: droneLoading === r.site ? "wait" : "pointer",
                display: "inline-block",
                opacity: droneLoading === r.site ? 0.6 : 1,
              }}
            >
              {droneLoading === r.site ? "Analyzing drone footage…" : "📹 Verify with drone footage"}
              <input
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                disabled={droneLoading === r.site}
                onChange={(e) => handleDroneUpload(r.site, e.target.files?.[0])}
              />
            </label>

            {droneResult[r.site] && (
              <div style={{ marginTop: "8px", fontSize: "0.75rem" }}>
                <div style={{ color: droneResult[r.site].detection.blocked ? "var(--red-zone)" : "var(--safe)" }}>
                  {droneResult[r.site].detection.blocked ? "⚠ Blockage detected" : "✓ No blockage detected"}
                </div>
                <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                  {droneResult[r.site].detection.reason} (confidence: {droneResult[r.site].detection.confidence})
                </div>
                {droneResult[r.site].backend_response?.status === "rerouted" && (
                  <div style={{ color: "var(--watch)", marginTop: "4px" }}>
                    Rerouted: +{droneResult[r.site].backend_response.detour_added_km}km detour, same site still reachable
                  </div>
                )}
                {droneResult[r.site].backend_response?.status === "no_detour" && (
                  <div style={{ color: "var(--red-zone)", marginTop: "4px" }}>
                    No detour found - site unreachable, check next-best option
                  </div>
                )}
              </div>
            )}

            {droneError[r.site] && (
              <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--red-zone)" }}>
                {droneError[r.site]}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}