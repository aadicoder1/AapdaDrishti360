import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMapEvents } from "react-leaflet";
import { zoneColor } from "./HazardZoneColor";
import { routePathColor } from "./SignalBar";
import "leaflet/dist/leaflet.css";

const REGION_CENTER = {
  uttarakhand: [30.53, 79.05],
  odisha: [19.8, 85.85],
};
const BOUNDARY_ZOOM_THRESHOLD = 13; // >= this zoom shows real polygons/buffers; below it, dots

const HAZARD_COLOR = {
  landslide: "#c4432e",
  cloudburst: "#e07a3f",
};

// Tracks current zoom level and reports it up, without needing a ref -
// useMapEvents must be used inside a child of MapContainer.
function ZoomWatcher({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
  return null;
}

export default function MapView({
  region,
  villages,
  sites,
  hazardZones,
  villageBoundaries,
  siteBoundaries,
  routeGeometry,
  routeScores,
  selectedVillage,
  onSelectVillage,
}) {
  const [zoom, setZoom] = useState(11);
  const showBoundaries = zoom >= BOUNDARY_ZOOM_THRESHOLD;

  const hazardStyle = (feature) => ({
    color: HAZARD_COLOR[feature.properties.hazard_type] || "#e8b94a",
    weight: 1.5,
    fillColor: HAZARD_COLOR[feature.properties.hazard_type] || "#e8b94a",
    fillOpacity: 0.15,
    dashArray: "4 3",
  });

  const routeStyle = (feature) => {
    if (!routeScores) return { color: "#8b96a5", weight: 4, opacity: 0.6 };
    const featureSite = feature.properties.site?.trim().toLowerCase();
    const match = routeScores.find(
      (r) => r.site?.trim().toLowerCase() === featureSite
    );
    if (match) console.log(`${feature.properties.site}: score=${match.route_feasibility_score}, status=${match.verification_status}`);
    if (!match) {
      // visibly distinct "no match found" color - if you see hot pink on
      // the map, it means site names don't match between geometry and
      // scores, and this needs a real fix, not a silent fallback
      return { color: "#ff00ff", weight: 4, opacity: 0.7 };
    }
    const color = routePathColor(match.route_feasibility_score, match.verification_status);
    return { color, weight: 6, opacity: 0.9 };
  };

  const onEachRoute = (feature, layer) => {
    const match = routeScores?.find((r) => r.site === feature.properties.site);
    if (match) {
      layer.bindPopup(
        `<strong>${feature.properties.village} → ${feature.properties.site}</strong><br/>Feasibility: ${match.route_feasibility_score}/100<br/>${match.verification_status}`
      );
    }
  };

  // Village boundary polygons/buffers - styled by red-zone level, same
  // color logic as the dot markers, plus a visual cue (dashed border) for
  // estimated buffers vs solid border for real OSM polygons - honesty
  // pattern extended into the visual layer, not just the data.
  const villageBoundaryStyle = (feature) => {
    const name = feature.properties.name;
    const village = villages.find((v) => v.name === name);
    const color = zoneColor(village?.red_zone_level);
    const isEstimated = feature.properties.boundary_source === "estimated_buffer";
    console.log(`BOUNDARY STYLE: ${name} | source=${feature.properties.boundary_source} | isEstimated=${isEstimated} | dashArray=${isEstimated ? "5 4" : "none"}`);
    return {
      color,
      weight: name === selectedVillage ? 3 : 1.5,
      fillColor: color,
      fillOpacity: 0.35,
      dashArray: isEstimated ? "5 4" : null,
    };
  };

  const onEachVillageBoundary = (feature, layer) => {
    const name = feature.properties.name;
    const village = villages.find((v) => v.name === name);
    const sourceNote =
      feature.properties.boundary_source === "estimated_buffer"
        ? "Estimated boundary (approximate, not surveyed)"
        : "Real OSM boundary";
    layer.bindPopup(
      `<strong>${name}</strong><br/>${village?.red_zone_level ?? "—"}<br/>Population: ${village?.population ?? "—"}<br/><em>${sourceNote}</em>`
    );
    layer.on("click", () => onSelectVillage(name));
  };

  const siteBoundaryStyle = (feature) => {
    const isEstimated = feature.properties.boundary_source === "estimated_buffer";
    return {
      color: "#e8ecf1",
      weight: 1.5,
      fillColor: "#2c3440",
      fillOpacity: 0.5,
      dashArray: isEstimated ? "5 4" : null,
    };
  };

  const onEachSiteBoundary = (feature, layer) => {
    const name = feature.properties.name;
    const site = sites.find((s) => s.name === name);
    const sourceNote =
      feature.properties.boundary_source === "estimated_buffer"
        ? "Estimated boundary (approximate, not surveyed)"
        : "Real OSM boundary";
    layer.bindPopup(`<strong>${name}</strong><br/>${site?.safety_assessment ?? ""}<br/><em>${sourceNote}</em>`);
  };

  return (
    <MapContainer center={REGION_CENTER[region] || REGION_CENTER.uttarakhand} zoom={11} key={region} style={{ height: "100%", width: "100%" }}>
      <ZoomWatcher onZoomChange={setZoom} />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {hazardZones && <GeoJSON data={hazardZones} style={hazardStyle} />}

      {routeGeometry && (
        <GeoJSON
          key={`route-${selectedVillage}-${routeGeometry.features?.length}-${JSON.stringify(routeScores?.map(r => `${r.site}:${r.route_feasibility_score}:${r.verification_status}`))}`}
          data={routeGeometry}
          style={routeStyle}
          onEachFeature={onEachRoute}
        />
      )}

      {showBoundaries ? (
        <>
                    {villageBoundaries && (
            <GeoJSON
              key={`village-boundaries-${selectedVillage}-${villageBoundaries.features?.length}-${JSON.stringify(villageBoundaries.features?.map(f => f.properties.boundary_source))}`}
              data={villageBoundaries}
              style={villageBoundaryStyle}
              onEachFeature={onEachVillageBoundary}
            />
          )}
          {siteBoundaries && (
            <GeoJSON
              key={`site-boundaries-${siteBoundaries.features?.length}-${JSON.stringify(siteBoundaries.features?.map(f => f.properties.boundary_source))}`}
              data={siteBoundaries}
              style={siteBoundaryStyle}
              onEachFeature={onEachSiteBoundary}
            />
          )}
        </>
      ) : (
        <>
          {villages.map((v) => (
            <CircleMarker
              key={v.name}
              center={[v.lat, v.lon]}
              radius={v.name === selectedVillage ? 12 : 8}
              pathOptions={{
                color: zoneColor(v.red_zone_level),
                fillColor: zoneColor(v.red_zone_level),
                fillOpacity: 0.85,
                weight: v.name === selectedVillage ? 3 : 1,
              }}
              eventHandlers={{ click: () => onSelectVillage(v.name) }}
            >
              <Popup>
                <strong>{v.name}</strong><br />
                <span className="mono">{v.red_zone_level}</span><br />
                Population: {v.population ?? "—"}
              </Popup>
            </CircleMarker>
          ))}

          {sites.map((s) => (
            <CircleMarker
              key={s.name}
              center={[s.lat, s.lon]}
              radius={9}
              pathOptions={{ color: "#e8ecf1", fillColor: "#2c3440", fillOpacity: 0.9, weight: 2 }}
            >
              <Popup><strong>{s.name}</strong><br />{s.safety_assessment}</Popup>
            </CircleMarker>
          ))}
        </>
      )}
    </MapContainer>
  );
}