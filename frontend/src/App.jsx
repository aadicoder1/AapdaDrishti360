// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { api } from "./api/client";
import MapView from "./components/MapView";
import RouteDrawer from "./components/RouteDrawer";
import RescuePanel from "./components/RescuePanel";
import DisasterPredictor from "./components/DisasterPredictor";
import ProvenanceBadge from "./components/ProvenanceBadge";
import ErrorBoundary from "./components/ErrorBoundary";
import "./theme.css";


const REGIONS = [
  {
    value: "uttarakhand",
    label: "Uttarakhand",
    district: "Himalayan Landslide & Cloudburst Corridor (Rudraprayag)",
    icon: "⛰️",
  },
  {
    value: "odisha",
    label: "Odisha",
    district: "Coastal Cyclone & Inundation Belt (Puri)",
    icon: "🌊",
  },
];

export default function App() {
  const [region, setRegion] = useState("uttarakhand");
  const [activeTab, setActiveTab] = useState("map"); // "map" | "rescue" | "matrix"
  const [villages, setVillages] = useState([]);
  const [sites, setSites] = useState([]);
  const [hazardZones, setHazardZones] = useState(null);
  const [villageBoundaries, setVillageBoundaries] = useState(null);
  const [siteBoundaries, setSiteBoundaries] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeScores, setRouteScores] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [suitability, setSuitability] = useState(null);
  const [suitabilityError, setSuitabilityError] = useState(null);

  // Live status & ops telemetry
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [rescueCount, setRescueCount] = useState(0);
  const [replanEvent, setReplanEvent] = useState(null);

  // Live health ping to FastAPI
  useEffect(() => {
    let isMounted = true;
    const verifyBackend = async () => {
      const isLive = await api.checkHealth();
      if (isMounted) {
        setIsConnected(isLive);
        if (isLive) {
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      }
    };
    verifyBackend();
    const interval = setInterval(verifyBackend, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load all region base data
  const loadRegionData = useCallback(async (currentRegion) => {
    try {
      setSelectedVillage(null);
      setRouteGeometry(null);
      setRouteScores(null);
      setRecommendation(null);
      setSuitability(null);
      setReplanEvent(null);

      const [vData, sData, hData, vbData, sbData, rCases] = await Promise.all([
        api.getVillages(currentRegion).catch(() => []),
        api.getSites(currentRegion).catch(() => []),
        api.getRedZones(currentRegion).catch(() => null),
        api.getVillageBoundaries(currentRegion).catch(() => null),
        api.getSiteBoundaries(currentRegion).catch(() => null),
        api.getRescueCases(currentRegion).catch(() => []),
      ]);

      setVillages(vData || []);
      setSites(sData || []);
      setHazardZones(hData);
      setVillageBoundaries(vbData);
      setSiteBoundaries(sbData);
      setRescueCount(rCases?.length || 0);
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Failed to load region data:", e);
    }
  }, []);

  useEffect(() => {
    loadRegionData(region);
  }, [region, loadRegionData]);

  // Refresh routes, geometry, and recommendation
  const refreshRoutesAndRecommendation = useCallback(async (currentVillage) => {
    if (!currentVillage) {
      setRouteGeometry(null);
      setRouteScores(null);
      setRecommendation(null);
      return;
    }
    setRouteError(null);
    try {
      const [geom, scores, rec] = await Promise.all([
        api.getRouteGeometry(region, currentVillage).catch(() => null),
        api.getRoutes(region, currentVillage),
        api.getRecommendation(region, currentVillage).catch(() => null),
      ]);
      setRouteGeometry(geom);
      setRouteScores(scores);
      setRecommendation(rec);
    } catch (e) {
      setRouteError(e.message);
      setRouteGeometry(null);
      setRouteScores(null);
      setRecommendation(null);
    }
  }, [region]);

  useEffect(() => {
    refreshRoutesAndRecommendation(selectedVillage);
  }, [selectedVillage, refreshRoutesAndRecommendation]);

  // Load suitability
  useEffect(() => {
    if (!selectedVillage) {
      setSuitability(null);
      return;
    }
    setSuitabilityError(null);
    api.getSuitability(region, selectedVillage)
      .then(setSuitability)
      .catch((e) => {
        setSuitabilityError(e.message);
        setSuitability(null);
      });
  }, [selectedVillage, region]);

  // Manual verification handler
  const handleVerify = async (site, status) => {
    try {
      const previousTopSite = recommendation?.recommended_site;
      await api.setVerification(region, selectedVillage, site, status, "Verified via AapdaDrishti Console");
      
      const [newScores, newRec] = await Promise.all([
        api.getRoutes(region, selectedVillage),
        api.getRecommendation(region, selectedVillage).catch(() => null),
      ]);
      setRouteScores(newScores);
      setRecommendation(newRec);

      if (status === "verified_blocked" && site === previousTopSite && newRec && newRec.recommended_site !== previousTopSite) {
        setReplanEvent({
          blockedSite: site,
          newTarget: newRec.recommended_site,
          newScore: newRec.route_feasibility_score,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (e) {
      console.error("Verification failed:", e);
    }
  };

  const currentRegionMeta = REGIONS.find((r) => r.value === region) || REGIONS[0];
  const redZoneVillages = villages.filter((v) => v.red_zone_level === "Red Zone");
  const totalPopAtRisk = villages.reduce((acc, v) => acc + (v.population || 0), 0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      {/* 1. FIXED TOP HEADER (Announcement + Navbar) */}
      <header style={{ flexShrink: 0, zIndex: 100 }}>
        {/* Top Announcement Strip */}
        <div
          style={{
            background: "#0F172A",
            color: "#E2E8F0",
            padding: "5px 20px",
            fontSize: "0.74rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            fontFamily: "var(--font-mono)",
            borderBottom: "1px solid #1E293B",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#475569" }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: isConnected ? "#10B981" : "#EF4444",
                  boxShadow: isConnected ? "0 0 8px #10B981" : "0 0 8px #EF4444",
                  display: "inline-block",
                }}
              />
              <span style={{ color: isConnected ? "#34D399" : "#FCA5A5", fontWeight: 700 }}>
                {isConnected ? "🟢 Live Backend Connected (:8000)" : "🔴 Backend Offline (Cache Active)"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>Sync: {lastSyncTime}</span>
            <ProvenanceBadge source="Census 2011 & OSRM Verified" type="verified" />
          </div>
        </div>

        {/* Main Light Enterprise Navbar */}
        <nav
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid var(--border)",
            padding: "8px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Brand Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #334155",
              }}
            >
              <span style={{ fontSize: "1.1rem", color: "#00E5FF" }}>⬡</span>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, color: "var(--text-headline)", letterSpacing: "-0.01em" }}>
                  AapdaDrishti <span style={{ color: "var(--accent-blue)" }}>360</span>
                </span>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-tertiary)", color: "var(--accent-blue)", border: "1px solid rgba(2, 132, 199, 0.3)" }}>
                  AI RESCUE OS
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-secondary)", padding: "3px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setActiveTab("map")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "map" ? "#0F172A" : "transparent",
                color: activeTab === "map" ? "#FFFFFF" : "var(--text-headline)",
                fontWeight: activeTab === "map" ? 700 : 500,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🗺️ Tactical Relocation Map
            </button>
            <button
              onClick={() => setActiveTab("rescue")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "rescue" ? "#0F172A" : "transparent",
                color: activeTab === "rescue" ? "#FFFFFF" : "var(--text-headline)",
                fontWeight: activeTab === "rescue" ? 700 : 500,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🚁 Live Drone AI & Dispatch
              {rescueCount > 0 && (
                <span className="mono" style={{ background: "var(--red-zone)", color: "#FFF", fontSize: "0.65rem", padding: "1px 5px", borderRadius: "8px", fontWeight: 700 }}>
                  {rescueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("predictor")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "predictor" ? "#0F172A" : "transparent",
                color: activeTab === "predictor" ? "#FFFFFF" : "var(--text-headline)",
                fontWeight: activeTab === "predictor" ? 700 : 500,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🔮 Disaster Predictor
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: activeTab === "matrix" ? "#0F172A" : "transparent",
                color: activeTab === "matrix" ? "#FFFFFF" : "var(--text-headline)",
                fontWeight: activeTab === "matrix" ? 700 : 500,
                fontSize: "0.8rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              📊 Logic & Provenance
            </button>
          </div>


          {/* Region Switcher Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-secondary)", padding: "3px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            {REGIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRegion(r.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: region === r.value ? "#FFFFFF" : "transparent",
                  color: region === r.value ? "var(--text-headline)" : "var(--text-secondary)",
                  fontWeight: region === r.value ? 700 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: region === r.value ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* 2. MIDDLE CONTENT AREA (Flex 1, Fits exact viewport remaining height) */}
      <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: activeTab === "map" ? "hidden" : "auto", padding: activeTab === "map" ? "10px 18px" : "18px 24px" }}>
        {/* VIEW 01: TACTICAL RELOCATION MAP */}
        {activeTab === "map" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "10px", minHeight: 0 }}>
            {/* Top Compact KPI Ribbon */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-headline)" }}>
                  {currentRegionMeta.label} Evacuation Corridors
                </h2>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {currentRegionMeta.district}
                </span>
              </div>

              {/* 4 Mini KPI Readouts */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <MiniKpi label="Monitored" value={villages.length} color="var(--accent-blue)" />
                <MiniKpi label="Pop at Risk" value={totalPopAtRisk.toLocaleString()} color="var(--red-zone)" />
                <MiniKpi label="Safe Sites" value={sites.length} color="var(--safe)" />
                <MiniKpi label="Casualties" value={rescueCount} color="var(--warning)" />
              </div>
            </div>

            {/* Map + RouteDrawer Grid (Fits 100% remaining height) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 410px",
                gap: "14px",
                flex: 1,
                minHeight: 0,
                height: "100%",
              }}
              className="map-workspace-grid"
            >
              {/* Left: Full-Height Map */}
              <div style={{ height: "100%", minHeight: 0, position: "relative" }}>
                <ErrorBoundary>
                  <MapView
                    region={region}
                    villages={villages}
                    sites={sites}
                    hazardZones={hazardZones}
                    villageBoundaries={villageBoundaries}
                    siteBoundaries={siteBoundaries}
                    routeGeometry={routeGeometry}
                    routeScores={routeScores}
                    recommendation={recommendation}
                    selectedVillage={selectedVillage}
                    onSelectVillage={setSelectedVillage}
                  />
                </ErrorBoundary>
              </div>

              {/* Right: Full-Height Internal-Scrolling RouteDrawer */}
              <div style={{ height: "100%", minHeight: 0, overflow: "hidden" }}>
                <ErrorBoundary>
                  <RouteDrawer
                    region={region}
                    village={selectedVillage}
                    villages={villages}
                    sites={sites}
                    onSelectVillage={setSelectedVillage}
                    routeScores={routeScores}
                    recommendation={recommendation}
                    suitability={suitability}
                    suitabilityError={suitabilityError}
                    error={routeError}
                    replanEvent={replanEvent}
                    onDismissReplan={() => setReplanEvent(null)}
                    onVerify={handleVerify}
                    onRerouted={() => refreshRoutesAndRecommendation(selectedVillage)}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 02: POST-DISASTER RESCUE TRIAGE & CASUALTY VERIFICATION */}
        {activeTab === "rescue" && (
          <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%" }}>
            <div style={{ marginBottom: "16px" }}>
              <div className="eyebrow" style={{ color: "var(--red-zone)", marginBottom: "2px" }}>
                Post-Disaster AI Search & Rescue
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, margin: 0, color: "var(--text-headline)" }}>
                Post-Disaster Rescue Triage & Casualty Verification Console
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                Every casualty is assigned an urgency score based on stillness telemetry and proximity to active hazards. Field responders can review evidence footage, verify coordinates, and authorize deployment.
              </p>
            </div>
            <ErrorBoundary>
              <RescuePanel region={region} />
            </ErrorBoundary>
          </div>
        )}

        {/* VIEW 03: DISASTER PREDICTOR & SPHERE INVENTORY LOGISTICS */}
        {activeTab === "predictor" && (
          <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%" }}>
            <ErrorBoundary>
              <DisasterPredictor region={region} villages={villages} sites={sites} />
            </ErrorBoundary>
          </div>
        )}

        {/* VIEW 04: LOGIC & PROVENANCE MATRIX */}
        {activeTab === "matrix" && (
          <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%" }}>
            <div style={{ marginBottom: "16px" }}>
              <div className="eyebrow" style={{ color: "var(--accent-blue)", marginBottom: "2px" }}>
                Transparency & Decision Audit
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, margin: 0, color: "var(--text-headline)" }}>
                Methodology, Formulas & Data Provenance Lineage
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                All algorithmic decisions adhere to explainable multi-criteria weighting. Real-time re-routing failovers are triggered when critical corridor segments are compromised.
              </p>
            </div>

            {/* Provenance Table */}
            <div style={{ background: "#FFFFFF", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: "0 0 12px" }}>
                Data Source Lineage & Estimation Disclosure
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 12px" }}>Dataset Layer</th>
                      <th style={{ padding: "10px 12px" }}>Source Authority</th>
                      <th style={{ padding: "10px 12px" }}>Lineage Type</th>
                      <th style={{ padding: "10px 12px" }}>Visual Representation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}><strong>Village Population</strong></td>
                      <td style={{ padding: "10px 12px" }}>Census of India 2011 Handbooks</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--safe)", fontWeight: 700 }}>Ground Truth</span></td>
                      <td style={{ padding: "10px 12px" }}>Solid Circle Markers</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}><strong>Hazard Corridors</strong></td>
                      <td style={{ padding: "10px 12px" }}>Geological Survey of India (GSI)</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--safe)", fontWeight: 700 }}>Government Historical Data</span></td>
                      <td style={{ padding: "10px 12px" }}>Shaded Red/Orange Corridors</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}><strong>Surveyed Boundaries</strong></td>
                      <td style={{ padding: "10px 12px" }}>OpenStreetMap (OSM) Surveyed Footprints</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--safe)", fontWeight: 700 }}>Measured Geospatial Polygon</span></td>
                      <td style={{ padding: "10px 12px" }}>Solid Polygon Boundary</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}><strong>Estimated Buffers</strong></td>
                      <td style={{ padding: "10px 12px" }}>AapdaDrishti 1.0 km Buffer Extrapolation</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--warning)", fontWeight: 700 }}>Algorithmically Estimated</span></td>
                      <td style={{ padding: "10px 12px" }}><strong>Dashed Border Line</strong></td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 12px" }}><strong>Drone Casualties</strong></td>
                      <td style={{ padding: "10px 12px" }}>Edge Machine Vision Telemetry</td>
                      <td style={{ padding: "10px 12px" }}><span style={{ color: "var(--warning)", fontWeight: 700 }}>Inferred Telemetry</span></td>
                      <td style={{ padding: "10px 12px" }}>Target Reticle + Error Radius (±m)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM FOOTER (No white space below ever) */}
      <footer
        style={{
          flexShrink: 0,
          background: "#0F172A",
          color: "#94A3B8",
          padding: "7px 20px",
          borderTop: "1px solid #1E293B",
          fontSize: "0.75rem",
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: "1440px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1rem", color: "#00E5FF" }}>⬡</span>
            <strong style={{ color: "#FFFFFF", fontFamily: "var(--font-display)", fontSize: "0.85rem" }}>
              AapdaDrishti 360
            </strong>
            <span style={{ color: "#475569" }}>·</span>
          </div>

          <div style={{ display: "flex", gap: "14px" }}>
            <button onClick={() => setActiveTab("map")} style={{ background: "none", border: "none", color: "#E2E8F0", cursor: "pointer", fontSize: "0.75rem" }}>Tactical Map</button>
            <button onClick={() => setActiveTab("rescue")} style={{ background: "none", border: "none", color: "#E2E8F0", cursor: "pointer", fontSize: "0.75rem" }}>Live Drone & Dispatch</button>
            <button onClick={() => setActiveTab("predictor")} style={{ background: "none", border: "none", color: "#E2E8F0", cursor: "pointer", fontSize: "0.75rem" }}>Disaster Predictor</button>
            <button onClick={() => setActiveTab("matrix")} style={{ background: "none", border: "none", color: "#E2E8F0", cursor: "pointer", fontSize: "0.75rem" }}>Logic & Provenance</button>
          </div>



          <div style={{ color: "#64748B", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}>
            Built for National Disaster Response Force & Ministry of Home Affairs
          </div>
        </div>
      </footer>
    </div>
  );
}

function MiniKpi({ label, value, color }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "3px 10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}:</span>
      <strong style={{ fontSize: "0.82rem", color: color || "var(--text-headline)", fontFamily: "var(--font-display)" }}>{value}</strong>
    </div>
  );
}
