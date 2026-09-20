// App.jsx
import { useState, useEffect, useCallback } from "react";
import { api } from "./api/client";
import MapView from "./components/MapView";
import RouteDrawer from "./components/RouteDrawer";
import RescuePanel from "./components/RescuePanel";
import "./theme.css";

const REGIONS = [
  { value: "uttarakhand", label: "Uttarakhand" },
  { value: "odisha", label: "Odisha" },
];

export default function App() {
  const [region, setRegion] = useState("uttarakhand"); // fixed: was stale "rudraprayag"
  const [villages, setVillages] = useState([]);
  const [sites, setSites] = useState([]);
  const [hazardZones, setHazardZones] = useState(null);
  const [villageBoundaries, setVillageBoundaries] = useState(null);
  const [siteBoundaries, setSiteBoundaries] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeScores, setRouteScores] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [tab, setTab] = useState("planning");
  const [suitability, setSuitability] = useState(null);
  const [suitabilityError, setSuitabilityError] = useState(null);

  useEffect(() => {
    setSelectedVillage(null);
    api.getVillages(region).then(setVillages).catch(console.error);
    api.getSites(region).then(setSites).catch(console.error);
    api.getRedZones(region).then(setHazardZones).catch(console.error);
    api.getVillageBoundaries(region).then(setVillageBoundaries).catch(console.error);
    api.getSiteBoundaries(region).then(setSiteBoundaries).catch(console.error);
  }, [region]);

  const refreshRoutes = useCallback(async (village) => {
    if (!village) {
      setRouteGeometry(null);
      setRouteScores(null);
      return;
    }
    setRouteError(null);
    try {
      const [geom, scores] = await Promise.all([
        api.getRouteGeometry(region, village),
        api.getRoutes(region, village),
      ]);
      setRouteGeometry(geom);
      setRouteScores(scores);
    } catch (e) {
      setRouteError(e.message);
      setRouteGeometry(null);
      setRouteScores(null);
    }
  }, [region]);

  useEffect(() => {
    refreshRoutes(selectedVillage);
  }, [selectedVillage, refreshRoutes]);

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

  const handleVerify = async (site, status) => {
    await api.setVerification(region, selectedVillage, site, status, "Set via dashboard");
    refreshRoutes(selectedVillage);
  };

  const currentRegionLabel = REGIONS.find((r) => r.value === region)?.label || region;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div className="eyebrow">AapdaDrishti 360 · PS 26191</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", margin: 0 }}>
            {currentRegionLabel} Relocation Planning
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "var(--panel-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
            }}
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <TabButton active={tab === "planning"} onClick={() => setTab("planning")}>
            Relocation Planning
          </TabButton>
          <TabButton active={tab === "rescue"} onClick={() => setTab("rescue")}>
            Rescue Cases
          </TabButton>
        </div>
      </header>

      {tab === "planning" ? (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1 }}>
            <MapView
              region={region}
              villages={villages}
              sites={sites}
              hazardZones={hazardZones}
              villageBoundaries={villageBoundaries}
              siteBoundaries={siteBoundaries}
              routeGeometry={routeGeometry}
              routeScores={routeScores}
              selectedVillage={selectedVillage}
              onSelectVillage={setSelectedVillage}
            />
          </div>
          <div style={{ width: "380px", borderLeft: "1px solid var(--border)" }}>
            <RouteDrawer
              region={region}
              village={selectedVillage}
              sites={sites}
              routeScores={routeScores}
              suitability={suitability}
              suitabilityError={suitabilityError}
              error={routeError}
              onVerify={handleVerify}
              onRerouted={() => refreshRoutes(selectedVillage)}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <RescuePanel region={region} />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        background: active ? "var(--panel-raised)" : "transparent",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: "pointer",
        fontSize: "0.85rem",
      }}
    >
      {children}
    </button>
  );
}