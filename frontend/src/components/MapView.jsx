// src/components/MapView.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { zoneColor, explainRiskLevel } from "./HazardZoneColor";
import { routePathColor } from "./SignalBar";
import MapLegend from "./MapLegend";
import "leaflet/dist/leaflet.css";

const REGION_CENTER = {
  uttarakhand: [30.53, 79.05],
  rudraprayag: [30.53, 79.05],
  odisha: [19.95, 86.20],
  puri: [19.95, 86.20],
};

const BOUNDARY_ZOOM_THRESHOLD = 13;

const HAZARD_COLOR = {
  landslide: "#DC2626",
  cloudburst: "#EA580C",
};

// Watermark-free, high reliability map tile providers with safe zoom caps
const BASEMAPS = {
  esri_topo: {
    label: "🗺️ Topo Relief (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, USGS, NOAA",
    maxZoom: 18,
    maxNativeZoom: 18,
  },
  hot: {
    label: "🚨 Relief Roads (OSM HOT)",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, Humanitarian Team",
    maxZoom: 18,
    maxNativeZoom: 18,
  },
  osm: {
    label: "🌐 Standard OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
    maxNativeZoom: 18,
  },
  satellite: {
    label: "🛰️ Satellite (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 18,
    maxNativeZoom: 18,
  },
};

// Tracks current zoom level
function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
      e.target.invalidateSize();
    },
  });
  return null;
}

// Controller component to programmatically pan/zoom and prevent grey tile glitches
function MapController({ region, center, zoom, selectedVillage, villages = [] }) {
  const map = useMap();

  // Smoothly fly to new center whenever region changes
  useEffect(() => {
    if (center && map) {
      try {
        map.flyTo(center, zoom || 11, { duration: 1.2 });
        map.invalidateSize();
      } catch (err) {
        console.warn("MapController flyTo error:", err);
      }
    }
  }, [region, center, map]);

  // Smoothly zoom in to selected village
  useEffect(() => {
    if (!map || !selectedVillage || villages.length === 0) return;
    const v = villages.find((item) => item.name === selectedVillage);
    if (v && v.lat && v.lon) {
      try {
        map.flyTo([v.lat, v.lon], 13, { duration: 1.0 });
      } catch {}
    }
  }, [selectedVillage, villages, map]);

  // Trigger tile re-draw whenever selection changes or window resizes
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);

    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch {}
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [selectedVillage, map]);

  return null;
}


export default function MapView({
  region = "rudraprayag",
  villages = [],
  sites = [],
  hazardZones,
  villageBoundaries,
  siteBoundaries,
  routeGeometry,
  routeScores,
  recommendation,
  selectedVillage,
  onSelectVillage,
}) {
  const [zoom, setZoom] = useState(11);
  const [baseMapKey, setBaseMapKey] = useState("esri_topo");
  const containerRef = useRef(null);
  const showBoundaries = zoom >= BOUNDARY_ZOOM_THRESHOLD;

  const currentCenter = REGION_CENTER[region] || REGION_CENTER.rudraprayag;
  const activeBasemap = BASEMAPS[baseMapKey] || BASEMAPS.esri_topo;

  const recommendedSiteName = recommendation?.recommended_site;
  const topRouteScore = routeScores?.find(
    (r) => r.site?.trim().toLowerCase() === recommendedSiteName?.trim().toLowerCase()
  );

  const hazardStyle = (feature) => {
    const hType = feature?.properties?.hazard_type || "landslide";
    const color = HAZARD_COLOR[hType] || "#EA580C";
    return {
      color,
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.15,
      dashArray: "5 4",
    };
  };

  const onEachHazard = (feature, layer) => {
    const props = feature?.properties || {};
    layer.bindPopup(`
      <div style="min-width: 190px;">
        <div style="font-family: var(--font-mono); font-size: 0.68rem; color: #DC2626; text-transform: uppercase; font-weight: 700;">
          ⚠️ Historical Hazard Zone
        </div>
        <strong style="font-size: 0.95rem; color: #0F172A;">${props.name || "Landslide Corridor"}</strong><br/>
        <div style="font-size: 0.78rem; margin: 4px 0; color: #475569;">
          Type: <strong>${props.hazard_type || "landslide"}</strong> (${props.year || "Recorded"})<br/>
          Buffer: <strong>${props.buffer_km || 1} km radius</strong>
        </div>
        <div style="font-size: 0.72rem; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px;">
          <em>Source: ${props.source || "GSI Historical Landslide Inventory"}</em>
        </div>
      </div>
    `);
  };

  // Google Maps Style Route Rendering:
  // Green (#10B981) for clear/ready to go, Red (#EF4444) for blocked, Amber (#F59E0B) for caution
  const routeStyle = (feature) => {
    if (!routeScores) return { color: "#64748B", weight: 5, opacity: 0.7 };
    const featureSite = feature?.properties?.site?.trim().toLowerCase();
    const match = routeScores.find(
      (r) => r.site?.trim().toLowerCase() === featureSite
    );
    if (!match) {
      return { color: "#94A3B8", weight: 4, opacity: 0.6 };
    }

    const color = routePathColor(match.route_feasibility_score, match.verification_status);
    const isBlocked = match.verification_status?.toUpperCase().includes("BLOCKED");
    const isRecommended = recommendation?.recommended_site?.trim().toLowerCase() === featureSite;

    return {
      color,
      weight: isRecommended ? 7 : isBlocked ? 5 : 4.5,
      opacity: isBlocked ? 0.95 : isRecommended ? 1.0 : 0.8,
      dashArray: isBlocked ? "8 6" : null,
      lineCap: "round",
      lineJoin: "round",
    };
  };

  const onEachRoute = (feature, layer) => {
    const featureSite = feature?.properties?.site;
    const match = routeScores?.find(
      (r) => r.site?.trim().toLowerCase() === featureSite?.trim().toLowerCase()
    );
    if (match) {
      const isBlocked = match.verification_status?.toUpperCase().includes("BLOCKED");
      const isRecommended = recommendation?.recommended_site === featureSite;
      const rColor = routePathColor(match.route_feasibility_score, match.verification_status);
      const roadStatus = isBlocked
        ? "🔴 ROAD BLOCKED · Impasse Reported"
        : Number(match.route_feasibility_score) >= 50
        ? "🟢 ROAD CLEAR & READY TO GO"
        : "🟠 CAUTION · Moderate Bottleneck";

      layer.bindPopup(`
        <div style="min-width: 220px; font-family: var(--font-body);">
          <div style="font-family: var(--font-mono); font-size: 0.68rem; color: ${isRecommended ? '#0D9488' : '#64748B'}; text-transform: uppercase; font-weight: 700;">
            ${isRecommended ? '★ Recommended Evacuation Corridor' : 'Alternative Evacuation Corridor'}
          </div>
          <strong style="color: #0F172A; font-size: 1rem; display: block; margin: 3px 0 6px;">
            ${feature?.properties?.village || 'Origin'} ➔ ${featureSite}
          </strong>
          
          <div style="display: flex; gap: 8px; margin-bottom: 8px; background: #F8FAFC; padding: 6px 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 0.65rem; color: #64748B;">EST. TRAVEL TIME</div>
              <div style="font-size: 1rem; font-weight: 800; color: #0F172A;" class="mono">
                ⏱️ ${match.travel_time_min || 0} min
              </div>
            </div>
            <div style="border-left: 1px solid #E2E8F0; padding-left: 8px;">
              <div style="font-size: 0.65rem; color: #64748B;">TOTAL DISTANCE</div>
              <div style="font-size: 1rem; font-weight: 800; color: #0F172A;" class="mono">
                📏 ${match.distance_km || 0} km
              </div>
            </div>
          </div>

          <div style="font-size: 0.78rem; font-weight: 700; color: ${rColor}; margin-bottom: 4px;">
            ${roadStatus}
          </div>

          <div style="font-size: 0.75rem; color: #475569; margin: 4px 0;">
            Feasibility Score: <strong style="color: ${rColor};" class="mono">${Number(match.route_feasibility_score || 0).toFixed(1)}/100</strong><br/>
            SPOF Bridges: <strong>${match.bridge_spof_count ?? 0} critical bridge crossings</strong>
          </div>
          ${match.verification_note ? `<div style="font-size: 0.72rem; color: #94A3B8; font-style: italic; border-top: 1px solid #E2E8F0; padding-top: 4px; margin-top: 4px;">"${match.verification_note}"</div>` : ''}
        </div>
      `);
    }
  };

  const villageBoundaryStyle = (feature) => {
    const name = feature?.properties?.name;
    const village = villages.find((v) => v.name === name);
    const color = zoneColor(village?.red_zone_level);
    const isEstimated = feature?.properties?.boundary_source === "estimated_buffer";
    const isSelected = name === selectedVillage;

    return {
      color: isSelected ? "#0284C7" : color,
      weight: isSelected ? 3 : 1.5,
      fillColor: color,
      fillOpacity: isSelected ? 0.35 : 0.22,
      dashArray: isEstimated ? "5 4" : null,
    };
  };

  const onEachVillageBoundary = (feature, layer) => {
    const name = feature?.properties?.name;
    const village = villages.find((v) => v.name === name);
    const color = zoneColor(village?.red_zone_level);
    const isEstimated = feature?.properties?.boundary_source === "estimated_buffer";
    const sourceNote = isEstimated
      ? "Estimated Buffer (approximate, unsurveyed)"
      : "Real OSM Survey Boundary";
    const riskExplanation = village?.vulnerability_reason || explainRiskLevel(village?.red_zone_level);

    layer.bindPopup(`
      <div style="min-width: 220px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="font-size: 1rem; color: #0F172A;">${name}</strong>
          <span style="color: ${color}; font-weight: 700; font-size: 0.75rem;" class="mono">
            ${village?.red_zone_level ?? "—"}
          </span>
        </div>
        <div style="font-size: 0.8rem; margin: 4px 0;">
          Population: <strong class="mono">${village?.population ?? "—"}</strong>
        </div>
        <div style="font-size: 0.75rem; color: #475569; margin: 6px 0; padding: 6px 8px; background: #F8FAFC; border-left: 3px solid ${color}; border-radius: 4px;">
          ${riskExplanation}
        </div>
        <div style="font-size: 0.7rem; color: #94A3B8; font-style: italic;">
          Provenance: ${sourceNote}
        </div>
      </div>
    `);
    if (onSelectVillage && name) {
      layer.on("click", () => onSelectVillage(name));
    }
  };

  const siteBoundaryStyle = (feature) => {
    const isEstimated = feature?.properties?.boundary_source === "estimated_buffer";
    const isRecommended = recommendation?.recommended_site === feature?.properties?.name;
    return {
      color: isRecommended ? "#0D9488" : "#475569",
      weight: isRecommended ? 2.5 : 1.5,
      fillColor: isRecommended ? "rgba(13, 148, 136, 0.25)" : "rgba(71, 85, 105, 0.15)",
      fillOpacity: 0.35,
      dashArray: isEstimated ? "5 4" : null,
    };
  };

  const onEachSiteBoundary = (feature, layer) => {
    const name = feature?.properties?.name;
    const site = sites.find((s) => s.name === name);
    const isEstimated = feature?.properties?.boundary_source === "estimated_buffer";
    const isRecommended = recommendation?.recommended_site === name;
    const sourceNote = isEstimated
      ? "Estimated Buffer (approximate, unsurveyed)"
      : "Real OSM Survey Boundary";

    layer.bindPopup(`
      <div style="min-width: 200px;">
        <div style="font-family: var(--font-mono); font-size: 0.68rem; color: ${isRecommended ? '#0D9488' : '#64748B'}; text-transform: uppercase; font-weight: 700;">
          ${isRecommended ? '★ Recommended Relocation Target' : 'Candidate Relocation Site'}
        </div>
        <strong style="font-size: 0.95rem; color: #0F172A;">${name}</strong>
        <div style="font-size: 0.78rem; margin: 4px 0; color: #475569;">
          ${site?.safety_assessment || "Verified candidate zone"}
        </div>
        <div style="font-size: 0.7rem; color: #94A3B8; font-style: italic;">
          Provenance: ${sourceNote}
        </div>
      </div>
    `);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        background: "#E2E8F0",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >

      {/* 1. Map Style & Zoom Switcher Controls */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          display: "flex",
          gap: "8px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          padding: "6px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          Zoom: <strong style={{ color: "var(--text-headline)" }}>{zoom}</strong>
          {showBoundaries ? " (Polygons)" : " (Markers)"}
        </span>

        <span style={{ color: "var(--border)" }}>|</span>

        {/* Free Clean Map Layer Selector */}
        <select
          value={baseMapKey}
          onChange={(e) => setBaseMapKey(e.target.value)}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-headline)",
            fontSize: "0.74rem",
            fontWeight: 600,
            padding: "3px 8px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {Object.entries(BASEMAPS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Top-Left Travel Time & Status Summary HUD */}
      {selectedVillage && topRouteScore && (
        <div
          className="google-nav-hud"
          style={{
            position: "absolute",
            bottom: "20px",
            left: "16px",
            top: "auto",
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0284C7" }}>
              ACTIVE EVACUATION CORRIDOR
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: "10px",
                background: topRouteScore.verification_status?.toUpperCase().includes("BLOCKED")
                  ? "#FEF2F2"
                  : "#DCFCE7",
                color: topRouteScore.verification_status?.toUpperCase().includes("BLOCKED")
                  ? "#DC2626"
                  : "#15803D",
              }}
            >
              {topRouteScore.verification_status?.toUpperCase().includes("BLOCKED")
                ? "⛔ BLOCKED"
                : "🟢 READY TO GO"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0F172A", fontFamily: "var(--font-mono)" }}>
              ⏱️ {topRouteScore.travel_time_min || 0} min
            </div>
            <div style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>
              📏 {topRouteScore.distance_km || 0} km
            </div>
          </div>

          <div style={{ fontSize: "0.78rem", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📍 <strong>{selectedVillage}</strong></span>
            <span>➔</span>
            <span>🏁 <strong>{recommendedSiteName || topRouteScore.site}</strong></span>
          </div>
        </div>
      )}

      <MapLegend />

      <MapContainer
        center={currentCenter}
        zoom={11}
        key={`${region}-${baseMapKey}`}
        style={{ height: "100%", width: "100%", minHeight: 0 }}
        zoomControl={true}
      >

        <ZoomWatcher onZoomChange={setZoom} />
        <MapController
          region={region}
          center={currentCenter}
          villages={villages}
          selectedVillage={selectedVillage}
        />


        {/* Clean, Watermark-Free TileLayer with maxNativeZoom guard */}
        <TileLayer
          url={activeBasemap.url}
          attribution={activeBasemap.attribution}
          maxZoom={activeBasemap.maxZoom}
          maxNativeZoom={activeBasemap.maxNativeZoom}
        />

        {/* Hazard Zones GeoJSON */}
        {hazardZones && hazardZones.features?.length > 0 && (
          <GeoJSON
            key={`hazard-${region}-${hazardZones.features.length}`}
            data={hazardZones}
            style={hazardStyle}
            onEachFeature={onEachHazard}
          />
        )}

        {/* Evacuation Routes GeoJSON */}
        {routeGeometry && routeGeometry.features?.length > 0 && (
          <GeoJSON
            key={`route-${selectedVillage || 'none'}-${routeGeometry.features.length}-${JSON.stringify(
              routeScores?.map((r) => `${r.site}:${r.route_feasibility_score}:${r.verification_status}`) || []
            )}`}
            data={routeGeometry}
            style={routeStyle}
            onEachFeature={onEachRoute}
          />
        )}

        {/* Detailed Boundary Polygons (zoom >= 13) */}
        {showBoundaries ? (
          <>
            {villageBoundaries && villageBoundaries.features?.length > 0 && (
              <GeoJSON
                key={`village-boundaries-${selectedVillage || 'none'}-${villageBoundaries.features.length}`}
                data={villageBoundaries}
                style={villageBoundaryStyle}
                onEachFeature={onEachVillageBoundary}
              />
            )}
            {siteBoundaries && siteBoundaries.features?.length > 0 && (
              <GeoJSON
                key={`site-boundaries-${siteBoundaries.features.length}`}
                data={siteBoundaries}
                style={siteBoundaryStyle}
                onEachFeature={onEachSiteBoundary}
              />
            )}
          </>
        ) : (
          /* Dot Markers (zoom < 13) */
          <>
            {villages.map((v) => {
              if (v.lat == null || v.lon == null) return null;
              const isSelected = v.name === selectedVillage;
              const color = zoneColor(v.red_zone_level);
              const riskExplanation = v.vulnerability_reason || explainRiskLevel(v.red_zone_level);

              return (
                <CircleMarker
                  key={v.name}
                  center={[v.lat, v.lon]}
                  radius={isSelected ? 11 : 7}
                  pathOptions={{
                    color: isSelected ? "#0284C7" : color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: isSelected ? 3 : 1.5,
                  }}
                  eventHandlers={{ click: () => onSelectVillage && onSelectVillage(v.name) }}
                >
                  <Popup>
                    <div style={{ minWidth: "200px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <strong style={{ fontSize: "0.95rem", color: "#0F172A" }}>{v.name}</strong>
                        <span style={{ color, fontWeight: 700, fontSize: "0.75rem;" }} className="mono">
                          {v.red_zone_level}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", margin: "4px 0" }}>
                        Population: <strong className="mono">{v.population ?? "—"}</strong>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "#475569", margin: "4px 0", lineHeight: "1.35" }}>
                        {riskExplanation}
                      </div>
                      <button
                        onClick={() => onSelectVillage && onSelectVillage(v.name)}
                        style={{
                          marginTop: "6px",
                          width: "100%",
                          padding: "5px 8px",
                          background: "#0284C7",
                          border: "none",
                          borderRadius: "4px",
                          color: "#FFFFFF",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Select for Relocation Plan →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {sites.map((s) => {
              if (s.lat == null || s.lon == null) return null;
              const isRecommended = recommendation?.recommended_site === s.name;
              const matchingRoute = routeScores?.find(
                (r) => r.site?.trim().toLowerCase() === s.name?.trim().toLowerCase()
              );
              const isBlocked = matchingRoute?.verification_status?.toUpperCase().includes("BLOCKED");

              return (
                <CircleMarker
                  key={s.name}
                  center={[s.lat, s.lon]}
                  radius={isRecommended ? 10 : 7}
                  pathOptions={{
                    color: isRecommended ? "#0D9488" : "#334155",
                    fillColor: isRecommended ? "#0D9488" : "#475569",
                    fillOpacity: 0.9,
                    weight: isRecommended ? 2.5 : 1.5,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: "200px" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: isRecommended ? '#0D9488' : '#64748B', textTransform: "uppercase", fontWeight: 700 }}>
                        {isRecommended ? '★ Recommended Safe Haven' : 'Candidate Safe Haven'}
                      </div>
                      <strong style={{ color: "#0F172A", fontSize: "1rem" }}>{s.name}</strong><br />
                      <div style={{ fontSize: "0.8rem", color: "#475569", margin: "4px 0" }}>
                        {s.safety_assessment}
                      </div>
                      {matchingRoute && (
                        <div style={{ background: "#F8FAFC", padding: "6px 8px", border: "1px solid #E2E8F0", borderRadius: "6px", marginTop: "6px" }}>
                          <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 700 }}>ROAD STATUS & TRAVEL TIME:</div>
                          <div style={{ color: isBlocked ? "#DC2626" : "#10B981", fontWeight: 700, fontSize: "0.82rem", marginTop: "2px" }}>
                            {isBlocked ? "⛔ Road Blocked" : `🟢 Ready · ⏱️ ${matchingRoute.travel_time_min} min (${matchingRoute.distance_km} km)`}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
