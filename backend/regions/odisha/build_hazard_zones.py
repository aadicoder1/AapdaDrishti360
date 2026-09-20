"""
build_hazard_zones.py
Phase 1 (Puri region) - Coastal hazard layer: cyclone/storm-surge impact
zones (point-buffer, same pattern as Rudraprayag's landslide zones) plus
a coastal erosion zone (line-buffer along the retreating shoreline, since
erosion is an ongoing process affecting a stretch of coast, not a single
point event).

METHOD (stated explicitly for judge Q&A):
Polygons are digitized from real, published, citable disaster incidents
and ongoing documented coastal erosion in the Astaranga/Puri coastal belt.
NOT a live IMD cyclone-track feed, NOT a predictive storm-surge model -
a hand-digitized historical/ongoing hazard-incident layer, same honesty
pattern as the Rudraprayag region's hazard_zones.geojson.
"""

import geopandas as gpd
from shapely.geometry import Point, LineString
import pandas as pd

OUTPUT_PATH = "regions/puri/data/processed/hazard_zones.geojson"

# Point-buffer incidents: cyclone landfall / storm surge impact areas
POINT_INCIDENTS = [
    {
        "name": "Puri Fani landfall zone",
        "hazard_type": "cyclone",
        "lat": 19.807608, "lon": 85.825254,  # Puri (already geocoded)
        "buffer_km": 8.0,  # cyclone wind/surge damage radius is far larger than a landslide buffer
        "year": 2019,
        "source": "Cyclone Fani made landfall at Puri, 3 May 2019, 200kmph winds, 1.5m storm surge; 21 deaths and 189,095 houses damaged in Puri district",
        "confidence": "historical_incident_buffer",
    },
    {
        "name": "Astaranga-Kakatpur 1999 super cyclone surge zone",
        "hazard_type": "storm_surge",
        "lat": 19.9794794, "lon": 86.2693691,  # Astaranga (real OSM point)
        "buffer_km": 6.0,
        "year": 1999,
        "source": "1999 Odisha Super Cyclone; storm surge devastated Astaranga block coastal villages, ~10,000 deaths statewide, triggered first forced relocation of Udayakani residents",
        "confidence": "historical_incident_buffer",
    },
]

# Line-buffer: ongoing coastal erosion affecting Udayakani/Tandahara.
# Represented as a buffered line along the approximate coastline near
# these villages, not a single point - erosion is a stretch-of-coast
# process, not a localized event.
EROSION_LINE = {
    "name": "Astaranga block ongoing coastal erosion zone",
    "hazard_type": "coastal_erosion",
    "coords": [(86.2820, 19.9750), (86.2900, 19.9660)],  # rough coastline segment near Udayakani/Tandahara
    "buffer_km": 1.5,
    "year": 2026,  # ongoing - dated to present, not a single past event
    "source": "Ongoing coastal erosion since 1999 super cyclone; Udayakani village relocated three times, sea now ~100m from village (was several km); Tandahara household water access also affected. Documented in Down To Earth, The Statesman, Mongabay-India, ICSF coverage 2019-2022",
    "confidence": "historical_incident_buffer",
}


def build_point_zone(inc):
    point_wgs84 = gpd.GeoSeries([Point(inc["lon"], inc["lat"])], crs="EPSG:4326")
    point_metric = point_wgs84.to_crs(epsg=32645)  # UTM zone 45N, covers Odisha
    buffer_metric = point_metric.buffer(inc["buffer_km"] * 1000)
    buffer_wgs84 = gpd.GeoSeries(buffer_metric, crs=32645).to_crs(epsg=4326)
    return buffer_wgs84.iloc[0]


def build_line_zone(inc):
    line_wgs84 = gpd.GeoSeries([LineString(inc["coords"])], crs="EPSG:4326")
    line_metric = line_wgs84.to_crs(epsg=32645)
    buffer_metric = line_metric.buffer(inc["buffer_km"] * 1000)
    buffer_wgs84 = gpd.GeoSeries(buffer_metric, crs=32645).to_crs(epsg=4326)
    return buffer_wgs84.iloc[0]


def build_hazard_zones():
    records = []

    for inc in POINT_INCIDENTS:
        geom = build_point_zone(inc)
        records.append({
            "name": inc["name"], "hazard_type": inc["hazard_type"],
            "year": inc["year"], "buffer_km": inc["buffer_km"],
            "source": inc["source"], "confidence": inc["confidence"],
            "geometry": geom,
        })
        print(f"  Built {inc['hazard_type']} zone: {inc['name']} ({inc['buffer_km']}km buffer)")

    geom = build_line_zone(EROSION_LINE)
    records.append({
        "name": EROSION_LINE["name"], "hazard_type": EROSION_LINE["hazard_type"],
        "year": EROSION_LINE["year"], "buffer_km": EROSION_LINE["buffer_km"],
        "source": EROSION_LINE["source"], "confidence": EROSION_LINE["confidence"],
        "geometry": geom,
    })
    print(f"  Built coastal_erosion zone: {EROSION_LINE['name']} ({EROSION_LINE['buffer_km']}km line buffer)")

    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    gdf.to_file(OUTPUT_PATH, driver="GeoJSON")
    print(f"\nSaved {len(gdf)} hazard zone polygons to {OUTPUT_PATH}")
    print(f"Hazard types present: {sorted(gdf['hazard_type'].unique())}")
    return gdf


if __name__ == "__main__":
    build_hazard_zones()