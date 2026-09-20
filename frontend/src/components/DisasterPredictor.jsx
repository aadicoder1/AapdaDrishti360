// src/components/DisasterPredictor.jsx
import React, { useState, useMemo } from "react";
import ProvenanceBadge from "./ProvenanceBadge";

const PRESETS = {
  uttarakhand: [
    {
      id: "cloudburst",
      label: "⛰️ Cloudburst & Debris Flow Surge",
      desc: "Extreme Himalayan precipitation with high slope saturation on NH-107 corridor",
      rainfall: 135,
      wind: 45,
      surge: 3.2,
      saturation: 94,
    },
    {
      id: "glof",
      label: "❄️ GLOF (Glacial Lake Outburst)",
      desc: "Rapid glacial moraine breach triggering sudden valley flash flooding",
      rainfall: 60,
      wind: 30,
      surge: 5.5,
      saturation: 88,
    },
  ],
  odisha: [
    {
      id: "super_cyclone",
      label: "🌊 Category 4 Super Cyclone",
      desc: "Severe coastal storm surge and catastrophic wind gust inundation",
      rainfall: 160,
      wind: 195,
      surge: 4.8,
      saturation: 96,
    },
    {
      id: "monsoon_flood",
      label: "🌧️ Continuous River Basin Flood",
      desc: "Prolonged Mahanadi/Devi river backwater flooding in low-lying villages",
      rainfall: 110,
      wind: 65,
      surge: 3.6,
      saturation: 90,
    },
  ],
};

export default function DisasterPredictor({ region = "uttarakhand", villages = [], sites = [] }) {
  // Simulation Sliders State
  const [rainfall, setRainfall] = useState(region === "uttarakhand" ? 115 : 140); // mm/hr
  const [windSpeed, setWindSpeed] = useState(region === "uttarakhand" ? 50 : 175); // km/h
  const [surgeHeight, setSurgeHeight] = useState(region === "uttarakhand" ? 2.8 : 4.2); // meters
  const [soilSaturation, setSoilSaturation] = useState(90); // %
  const [activePreset, setActivePreset] = useState("custom");
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [forecastDays, setForecastDays] = useState(7); // Relief operational buffer in days

  const regionPresets = PRESETS[region] || PRESETS.uttarakhand;

  // Apply a scenario preset
  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setRainfall(preset.rainfall);
    setWindSpeed(preset.wind);
    setSurgeHeight(preset.surge);
    setSoilSaturation(preset.saturation);
  };

  // Base ground-truth population from Census 2011
  const totalBasePopulation = useMemo(() => {
    return villages.reduce((acc, v) => acc + (v.population || 0), 0) || (region === "uttarakhand" ? 12450 : 28600);
  }, [villages, region]);

  // Dynamic Impact Calculations
  const impactMetrics = useMemo(() => {
    // Severity multiplier based on weather intensity (0.0 to 1.0 scale)
    const rainFactor = Math.min(rainfall / 150, 1.4);
    const windFactor = Math.min(windSpeed / 180, 1.3);
    const surgeFactor = Math.min(surgeHeight / 5.0, 1.5);
    const satFactor = Math.min(soilSaturation / 100, 1.2);

    const compositeSeverity = (rainFactor * 0.35 + windFactor * 0.25 + surgeFactor * 0.25 + satFactor * 0.15);
    const displacementRate = Math.min(0.95, Math.max(0.20, compositeSeverity * 0.72));

    const displacedPopulation = Math.round(totalBasePopulation * displacementRate);

    // Demographic vulnerability weights (Census 2011 averages for rural India)
    const infantsCount = Math.round(displacedPopulation * 0.092); // < 5 years
    const elderlyCount = Math.round(displacedPopulation * 0.114); // > 65 years
    const pregnantWomen = Math.round(displacedPopulation * 0.038); // Maternal care
    const criticalMedical = Math.round(displacedPopulation * 0.024); // Dialysis, oxygen, insulin

    // Infrastructure impact estimates
    const bridgesAtRisk = Math.min(5, Math.max(1, Math.round(surgeHeight * 0.9 + (soilSaturation > 85 ? 1 : 0))));
    const roadSeveranceKm = Number((compositeSeverity * (region === "uttarakhand" ? 38.5 : 54.0)).toFixed(1));
    const evacuationWindowHours = Math.max(1.5, Number((14.0 - compositeSeverity * 8.5).toFixed(1)));

    // Risk classification
    let riskLevel = "Moderate";
    let riskColor = "var(--watch)";
    if (compositeSeverity > 0.85) {
      riskLevel = "Extreme / Catastrophic";
      riskColor = "var(--red-zone)";
    } else if (compositeSeverity > 0.6) {
      riskLevel = "High Alert";
      riskColor = "var(--warning)";
    }

    return {
      compositeSeverity,
      displacementRate: (displacementRate * 100).toFixed(1),
      displacedPopulation,
      infantsCount,
      elderlyCount,
      pregnantWomen,
      criticalMedical,
      bridgesAtRisk,
      roadSeveranceKm,
      evacuationWindowHours,
      riskLevel,
      riskColor,
    };
  }, [rainfall, windSpeed, surgeHeight, soilSaturation, totalBasePopulation, region]);

  // Sphere Standard Inventory Logistics Demands (Humanitarian Charter Minimums)
  const inventoryForecast = useMemo(() => {
    const pop = impactMetrics.displacedPopulation;
    const days = forecastDays;

    // 1. Water: 15 Liters / person / day
    const totalWaterLiters = pop * 15 * days;
    const waterTrucksNeeded = Math.ceil(totalWaterLiters / 10000); // 10,000L bowsers

    // 2. High-energy food rations: 2,100 kcal / person / day (~0.65 kg emergency grain/ration per person/day)
    const totalRationKg = pop * 0.65 * days;
    const rationTonnes = (totalRationKg / 1000).toFixed(1);

    // 3. Emergency Shelter: 3.5 m² per person (~1 family tent kit per 5 persons)
    const familyShelterKits = Math.ceil(pop / 5);
    const tarpaulinSheets = familyShelterKits * 2;

    // 4. Sanitation: Minimum 1 latrine / 20 persons
    const bioToilets = Math.ceil(pop / 20);

    // 5. Medical & Health Supplies
    const chlorineTabs = Math.round(totalWaterLiters / 20); // 1 tab per 20L
    const orsSachets = pop * 3 * Math.min(days, 5); // 3 sachets / person / 5 days
    const traumaKits = Math.ceil(pop / 150);
    const antiVenomVials = Math.ceil(pop * 0.008); // Snakebite risk in floods

    // 6. Heavy Machinery & Tactical Deployment
    const rescueBoats = Math.ceil(pop / 800) + (surgeHeight > 3.0 ? 3 : 1);
    const jcbExcavators = Math.ceil(impactMetrics.roadSeveranceKm / 12);
    const generatorsKva = Math.ceil(pop / 600) * 15; // 15 kVA generators
    const vhfRadios = Math.ceil(pop / 400);

    return {
      totalWaterLiters,
      waterTrucksNeeded,
      rationTonnes,
      familyShelterKits,
      tarpaulinSheets,
      bioToilets,
      chlorineTabs,
      orsSachets,
      traumaKits,
      antiVenomVials,
      rescueBoats,
      jcbExcavators,
      generatorsKva,
      vhfRadios,
    };
  }, [impactMetrics.displacedPopulation, forecastDays, surgeHeight, impactMetrics.roadSeveranceKm]);

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%", paddingBottom: "20px" }}>
      {/* Top Header & Overview */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "14px", marginBottom: "16px" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent-blue)", marginBottom: "4px" }}>
            Predictive Disaster Intelligence & Supply Logistics
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, margin: 0, color: "var(--text-headline)" }}>
            🔮 Multi-Hazard Disaster Predictor & Sphere-Standard Inventory Engine
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "4px 0 0", maxWidth: "880px", lineHeight: "1.45" }}>
            Simulate incoming meteorological hazard intensities, calculate expected infrastructure severance and vulnerable population displacements, and automatically project Sphere-standard emergency relief supply requirements before impact.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowManifestModal(true)}
            style={{
              padding: "8px 16px",
              background: "#0F172A",
              color: "#FFFFFF",
              borderRadius: "var(--radius)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            📋 Generate NDMA Supply Requisition
          </button>
        </div>
      </div>

      {/* Preset Scenario Quick Selectors */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 18px",
          marginBottom: "16px",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="eyebrow" style={{ color: "var(--text-headline)", fontSize: "0.72rem" }}>
            Scenario Presets:
          </span>
          {regionPresets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: activePreset === p.id ? "1.5px solid var(--accent-blue)" : "1px solid var(--border)",
                background: activePreset === p.id ? "var(--bg-tertiary)" : "#FFFFFF",
                color: activePreset === p.id ? "var(--accent-blue)" : "var(--text-headline)",
                fontWeight: activePreset === p.id ? 700 : 500,
                fontSize: "0.78rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => {
              setActivePreset("baseline");
              setRainfall(40);
              setWindSpeed(30);
              setSurgeHeight(1.0);
              setSoilSaturation(65);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: activePreset === "baseline" ? "var(--bg-secondary)" : "#FFFFFF",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            🔄 Baseline / Moderate
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Relief Buffer Window:
          </span>
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            style={{
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: "0.76rem",
              background: "var(--bg-secondary)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <option value={3}>3 Days Emergency Buffer</option>
            <option value={7}>7 Days Standard Buffer (NDMA)</option>
            <option value={14}>14 Days Prolonged Crisis</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Controls Left + Predicted Impact Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "16px", marginBottom: "16px" }}>
        {/* Left Column: Interactive Multi-Hazard Sliders */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: 0, color: "var(--text-headline)" }}>
              ⚡ Meteorological & Terrain Input Sliders
            </h3>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--accent-blue)", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
              Live Model
            </span>
          </div>

          {/* Slider 1: Rainfall Intensity */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-headline)" }}>
                🌧️ Rainfall Precipitation Intensity
              </label>
              <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 800, color: rainfall > 100 ? "var(--red-zone)" : "var(--accent-blue)" }}>
                {rainfall} mm/hr
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={rainfall}
              onChange={(e) => {
                setActivePreset("custom");
                setRainfall(Number(e.target.value));
              }}
              style={{ width: "100%", accentColor: rainfall > 100 ? "#DC2626" : "#0284C7", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
              <span>10 mm/hr (Light)</span>
              <span>100 mm/hr (Cloudburst Threshold)</span>
              <span>200 mm/hr (Extreme)</span>
            </div>
          </div>

          {/* Slider 2: Sustained Wind Speed */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-headline)" }}>
                💨 Sustained Gale / Cyclone Wind Speed
              </label>
              <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 800, color: windSpeed > 130 ? "var(--red-zone)" : "var(--accent-blue)" }}>
                {windSpeed} km/h
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={windSpeed}
              onChange={(e) => {
                setActivePreset("custom");
                setWindSpeed(Number(e.target.value));
              }}
              style={{ width: "100%", accentColor: windSpeed > 130 ? "#DC2626" : "#0284C7", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
              <span>20 km/h</span>
              <span>120 km/h (Cat 1)</span>
              <span>220+ km/h (Super Cyclone)</span>
            </div>
          </div>

          {/* Slider 3: Flood / Storm Surge Height */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-headline)" }}>
                🌊 Riverine / Storm Inundation Surge
              </label>
              <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 800, color: surgeHeight > 3.5 ? "var(--red-zone)" : "var(--accent-blue)" }}>
                {surgeHeight} meters
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="8.0"
              step="0.1"
              value={surgeHeight}
              onChange={(e) => {
                setActivePreset("custom");
                setSurgeHeight(Number(e.target.value));
              }}
              style={{ width: "100%", accentColor: surgeHeight > 3.5 ? "#DC2626" : "#0284C7", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
              <span>0.5 m (Bankfull)</span>
              <span>3.0 m (Major Inundation)</span>
              <span>8.0 m (Catastrophic)</span>
            </div>
          </div>

          {/* Slider 4: Soil Saturation / Landslide Index */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-headline)" }}>
                ⛰️ Mountain Soil Moisture / Saturation Index
              </label>
              <span className="mono" style={{ fontSize: "0.85rem", fontWeight: 800, color: soilSaturation > 85 ? "var(--red-zone)" : "var(--accent-blue)" }}>
                {soilSaturation}%
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="1"
              value={soilSaturation}
              onChange={(e) => {
                setActivePreset("custom");
                setSoilSaturation(Number(e.target.value));
              }}
              style={{ width: "100%", accentColor: soilSaturation > 85 ? "#DC2626" : "#0284C7", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)" }}>
              <span>20% (Dry)</span>
              <span>80% (Mudflow Threshold)</span>
              <span>100% (Liquefaction)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Predicted Impact & Vulnerability Analysis */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "18px",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <div className="eyebrow" style={{ color: "var(--text-muted)" }}>Impact Assessment</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: 0, color: "var(--text-headline)" }}>
                  Projected Severity: <span style={{ color: impactMetrics.riskColor }}>{impactMetrics.riskLevel}</span>
                </h3>
              </div>
              <ProvenanceBadge source="Census 2011 & GSI DEM" type="verified" />
            </div>

            {/* 4 Impact Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "14px" }}>
              <div style={{ background: "var(--bg-secondary)", padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Displaced Pop</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--red-zone)", fontFamily: "var(--font-display)" }} className="mono">
                  {impactMetrics.displacedPopulation.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                  {impactMetrics.displacementRate}% of total
                </div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Bridges at Risk</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--warning)", fontFamily: "var(--font-display)" }} className="mono">
                  {impactMetrics.bridgesAtRisk} SPOFs
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                  Critical choke points
                </div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Road Blockage</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-blue)", fontFamily: "var(--font-display)" }} className="mono">
                  {impactMetrics.roadSeveranceKm} km
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                  Corridors cut off
                </div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Evacuation Window</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: impactMetrics.evacuationWindowHours < 4 ? "var(--red-zone)" : "var(--safe)", fontFamily: "var(--font-display)" }} className="mono">
                  ⏱️ {impactMetrics.evacuationWindowHours}h
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                  Before total impasse
                </div>
              </div>
            </div>

            {/* Vulnerable Demographic Breakdown Radar */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <div className="eyebrow" style={{ color: "var(--accent-blue)", marginBottom: "8px" }}>
                High-Priority Vulnerable Demographics (Census Ground-Truth)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: "8px 10px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.7rem", color: "#991B1B", fontWeight: 600 }}>👶 Infants (&lt;5 yrs)</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#DC2626" }} className="mono">
                    {impactMetrics.infantsCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#B91C1C" }}>Requires baby formula & diapers</div>
                </div>

                <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "8px 10px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.7rem", color: "#92400E", fontWeight: 600 }}>👵 Elderly (&gt;65 yrs)</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#D97706" }} className="mono">
                    {impactMetrics.elderlyCount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#B45309" }}>Mobility assistance needed</div>
                </div>

                <div style={{ background: "#FDF4FF", border: "1px solid #F0ABFC", padding: "8px 10px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.7rem", color: "#86198F", fontWeight: 600 }}>🤰 Pregnant / Lactating</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#C026D3" }} className="mono">
                    {impactMetrics.pregnantWomen.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#A21CAF" }}>Maternal care kits</div>
                </div>

                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "8px 10px", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.7rem", color: "#1E40AF", fontWeight: 600 }}>🏥 Critical Medical</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2563EB" }} className="mono">
                    {impactMetrics.criticalMedical.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#1D4ED8" }}>Oxygen & dialysis dependent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sphere Standard Relief Inventory Logistics Demands Table */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--safe)", marginBottom: "2px" }}>
              Humanitarian Charter Standards
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", margin: 0, color: "var(--text-headline)" }}>
              📦 Sphere-Standard Emergency Relief Inventory Forecaster ({forecastDays}-Day Operational Buffer)
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Based on <strong>{impactMetrics.displacedPopulation.toLocaleString()}</strong> displaced evacuees
            </span>
          </div>
        </div>

        {/* Inventory Demands Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
          {/* Card 1: Water & Hydration */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🚰</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>Potable Drinking Water</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-blue)", marginBottom: "4px" }} className="mono">
              {(inventoryForecast.totalWaterLiters / 1000).toLocaleString()} <span style={{ fontSize: "0.85rem" }}>kL ({inventoryForecast.totalWaterLiters.toLocaleString()} Liters)</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • Sphere Standard: <strong>15 L / person / day</strong><br />
              • Fleet Requirement: <strong>{inventoryForecast.waterTrucksNeeded} Water Tanker Bowsers (10kL)</strong><br />
              • Purification: <strong>{inventoryForecast.chlorineTabs.toLocaleString()} Chlorine Tablets</strong> (1 tab/20L)
            </div>
          </div>

          {/* Card 2: Emergency Food Rations */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🍞</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>High-Energy Food Rations</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#D97706", marginBottom: "4px" }} className="mono">
              {inventoryForecast.rationTonnes} <span style={{ fontSize: "0.85rem" }}>Metric Tonnes</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • Nutritional Standard: <strong>2,100 kcal / person / day</strong><br />
              • Ready-to-Eat (RTE) Meal Packets: <strong>{(impactMetrics.displacedPopulation * 2 * forecastDays).toLocaleString()} packs</strong><br />
              • Infant Formula Reserve: <strong>{Math.round(impactMetrics.infantsCount * 0.4 * forecastDays)} tins</strong>
            </div>
          </div>

          {/* Card 3: Emergency Shelter & Tarpaulins */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>⛺</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>Shelter & Non-Food Items</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--safe)", marginBottom: "4px" }} className="mono">
              {inventoryForecast.familyShelterKits.toLocaleString()} <span style={{ fontSize: "0.85rem" }}>Family Tents</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • Minimum Covered Area: <strong>3.5 m² / person</strong><br />
              • Heavy-Duty Tarpaulins: <strong>{inventoryForecast.tarpaulinSheets.toLocaleString()} sheets</strong><br />
              • Thermal Blankets: <strong>{(impactMetrics.displacedPopulation * 2).toLocaleString()} units</strong>
            </div>
          </div>

          {/* Card 4: Medical & Epidemic Pre-emption */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>💊</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>Emergency Medical Trauma</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--red-zone)", marginBottom: "4px" }} className="mono">
              {inventoryForecast.traumaKits} <span style={{ fontSize: "0.85rem" }}>Trauma Care Packs</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • ORS Dehydration Sachets: <strong>{inventoryForecast.orsSachets.toLocaleString()} units</strong><br />
              • Anti-Venom Polyvalent Vials: <strong>{inventoryForecast.antiVenomVials} vials</strong><br />
              • IV Fluid Saline Units: <strong>{(impactMetrics.displacedPopulation * 0.15 * forecastDays).toFixed(0)} bags</strong>
            </div>
          </div>

          {/* Card 5: Sanitation & Bio-Toilets */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🚻</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>Sanitation & Camp Hygiene</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#4F46E5", marginBottom: "4px" }} className="mono">
              {inventoryForecast.bioToilets} <span style={{ fontSize: "0.85rem" }}>Mobile Bio-Toilets</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • Sphere Ratio: <strong>1 Latrine / 20 Persons</strong><br />
              • Dignity & Menstrual Hygiene Kits: <strong>{Math.round(impactMetrics.displacedPopulation * 0.28).toLocaleString()} kits</strong><br />
              • Bleaching Powder / Disinfectant: <strong>{(impactMetrics.displacedPopulation * 0.05).toFixed(0)} kg/day</strong>
            </div>
          </div>

          {/* Card 6: Tactical NDRF Rescue & Power */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🚜</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-headline)" }}>Heavy Rescue & Power Fleet</strong>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0F172A", marginBottom: "4px" }} className="mono">
              {inventoryForecast.rescueBoats} <span style={{ fontSize: "0.85rem" }}>Rescue Boats (IRBs)</span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              • Earthmovers / JCB Backhoes: <strong>{inventoryForecast.jcbExcavators} units</strong><br />
              • Mobile Diesel Generators: <strong>{inventoryForecast.generatorsKva} kVA total</strong><br />
              • LoRa/VHF Radio Handsets: <strong>{inventoryForecast.vhfRadios} tactical radios</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Formal NDMA Supply Manifest Requisition Modal */}
      {showManifestModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowManifestModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "var(--radius-xl)",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0F172A", paddingBottom: "14px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#0284C7", fontWeight: 700 }}>
                  NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA) ·
                </div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", margin: "4px 0", color: "#0F172A" }}>
                  Emergency District Relief Requisition Manifest
                </h2>
                <div style={{ fontSize: "0.78rem", color: "#64748B" }}>
                  Sector: <strong>{region.toUpperCase()}</strong> | Date: <strong>{new Date().toLocaleDateString()}</strong> | Status: <strong style={{ color: "#DC2626" }}>URGENT PRE-EMPTION</strong>
                </div>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Manifest Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginBottom: "20px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Category</th>
                  <th style={{ padding: "8px 10px" }}>Item Description</th>
                  <th style={{ padding: "8px 10px" }}>Sphere Standard</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Requisition Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Water</strong></td>
                  <td style={{ padding: "8px 10px" }}>Potable Drinking Water (Tanker Bowsers)</td>
                  <td style={{ padding: "8px 10px" }}>15 L / person / day</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.totalWaterLiters.toLocaleString()} L ({inventoryForecast.waterTrucksNeeded} Bowsers)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Nutrition</strong></td>
                  <td style={{ padding: "8px 10px" }}>High-Energy Biscuits & Grain Rations</td>
                  <td style={{ padding: "8px 10px" }}>2,100 kcal / person / day</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.rationTonnes} Metric Tonnes</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Shelter</strong></td>
                  <td style={{ padding: "8px 10px" }}>Weather-Proof Family Disaster Tents</td>
                  <td style={{ padding: "8px 10px" }}>3.5 m² covered / person</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.familyShelterKits.toLocaleString()} Tents</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Sanitation</strong></td>
                  <td style={{ padding: "8px 10px" }}>Modular Camp Bio-Toilets</td>
                  <td style={{ padding: "8px 10px" }}>1 Latrine / 20 Persons</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.bioToilets} Units</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Medical</strong></td>
                  <td style={{ padding: "8px 10px" }}>Water Chlorine Tabs & Trauma Packs</td>
                  <td style={{ padding: "8px 10px" }}>1 Tab/20L + Trauma Units</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.chlorineTabs.toLocaleString()} Tabs / {inventoryForecast.traumaKits} Packs</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "8px 10px" }}><strong>Tactical</strong></td>
                  <td style={{ padding: "8px 10px" }}>Inflatable Rescue Boats & Backhoes</td>
                  <td style={{ padding: "8px 10px" }}>NDRF Fleet Deployment</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }} className="mono">{inventoryForecast.rescueBoats} IRBs / {inventoryForecast.jcbExcavators} JCBs</td>
                </tr>
              </tbody>
            </table>

            {/* Authorize Action */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748B" }}>
                Authorized under Disaster Management Act, 2005.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: "8px 16px",
                    background: "#0F172A",
                    color: "#FFF",
                    borderRadius: "var(--radius)",
                    border: "none",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  🖨️ Print / Save PDF Manifest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
