"""
fix_missing_villages.py
Phase 1 patch (Puri region) - retry Udayakani and Tandahara, add fallback
coordinates anchored near Astaranga (real OSM point), append to villages.geojson.

Udayakani and Tandahara are real, extensively documented villages in Sisuo
Panchayat, Astaranga block - actively losing land to coastal erosion since
the 1999 super cyclone (see project research citations). Too small/rural to
have individual OSM geocoding, same limitation as Pondar/Semla in the
Rudraprayag region.
"""

import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd
import os

ox.settings.log_console = False
ox.settings.use_cache = True

PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "processed")

RETRY_VILLAGES = {
    "Udayakani": ["Udayakani, Sisuo, Astaranga, Puri, Odisha, India",
                  "Udayakani, Astaranga, Puri, Odisha, India"],
    "Tandahara": ["Tandahara, Sisuo, Astaranga, Puri, Odisha, India",
                  "Tandahara, Astaranga, Puri, Odisha, India"],
}

# Astaranga's real OSM coordinate (19.9794794, 86.2693691) anchors these
# estimates. Offset slightly toward the coastline since both villages are
# documented as being right at the advancing shoreline - direction is a
# reasonable approximation, not surveyed.
MANUAL_FALLBACK = {
    "Udayakani": (19.9720, 86.2850),   # ~2km SE of Astaranga, coastal-facing
    "Tandahara": (19.9680, 86.2900),   # nearby, same panchayat
}


def try_geocode(name, queries):
    for q in queries:
        try:
            point = ox.geocode(q)
            print(f"  {name}: SUCCESS via '{q}' -> {point}")
            return point, q, "osm_geocoded"
        except Exception:
            print(f"  {name}: failed for '{q}'")
    if name in MANUAL_FALLBACK:
        point = MANUAL_FALLBACK[name]
        print(f"  {name}: using MANUAL FALLBACK -> {point} (mark as estimated)")
        return point, "manual", "manual_estimate"
    return None, None, "failed"


def main():
    existing = gpd.read_file(f"{PROC}/villages.geojson")
    print(f"Existing villages: {list(existing['name'])}")

    new_records = []
    for name, queries in RETRY_VILLAGES.items():
        point, source_query, status = try_geocode(name, queries)
        if point is None:
            print(f"  {name}: COULD NOT RESOLVE - skipping, needs manual input")
            continue
        lat, lon = point
        new_records.append({
            "name": name,
            "full_query": source_query,
            "lat": lat,
            "lon": lon,
            "geometry": Point(lon, lat),
            "coord_source": status,
        })

    if not new_records:
        print("No new villages resolved. Nothing to append.")
        return

    new_gdf = gpd.GeoDataFrame(new_records, crs="EPSG:4326")
    if "coord_source" not in existing.columns:
        existing["coord_source"] = "osm_geocoded"

    combined = pd.concat([existing, new_gdf], ignore_index=True)
    combined = gpd.GeoDataFrame(combined, crs="EPSG:4326")
    combined.to_file(f"{PROC}/villages.geojson", driver="GeoJSON")

    print(f"\nUpdated villages.geojson now has {len(combined)} villages:")
    print(combined[["name", "lat", "lon", "coord_source"]])


if __name__ == "__main__":
    main()