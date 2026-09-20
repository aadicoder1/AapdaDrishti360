"""
fix_missing_villages.py
Phase 1 patch - retry Pondar and Semla with correct census names,
append to existing villages.geojson
"""

import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd

ox.settings.log_console = False
ox.settings.use_cache = True

RETRY_VILLAGES = {
    "Pondar": ["Naini Pondar, Ukhimath, Rudraprayag, Uttarakhand, India",
               "Pondar, Rudraprayag, Uttarakhand, India"],
    "Semla": ["Dungar Semala, Ukhimath, Rudraprayag, Uttarakhand, India",
              "Semla, Rudraprayag, Uttarakhand, India"],
}

# Manual fallback coordinates (approximate, from published landslide-study
# figures near Okhimath/Mandakini valley — used ONLY if OSM geocoding fails
# for both query variants above; label as estimated in your data notes)
MANUAL_FALLBACK = {
    "Pondar": (30.5150, 79.0450),   # near Ukhimath, Madhyamaheshwar valley
    "Semla": (30.5250, 79.0900),    # Okhimath area, Kakra Gad valley
}

def try_geocode(name, queries):
    for q in queries:
        try:
            point = ox.geocode(q)
            print(f"  {name}: SUCCESS via '{q}' -> {point}")
            return point, q, "osm_geocoded"
        except Exception:
            print(f"  {name}: failed for '{q}'")
    # fallback
    if name in MANUAL_FALLBACK:
        point = MANUAL_FALLBACK[name]
        print(f"  {name}: using MANUAL FALLBACK -> {point} (mark as estimated)")
        return point, "manual", "manual_estimate"
    return None, None, "failed"

def main():
    existing = gpd.read_file("data/processed/villages.geojson")
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
            "coord_source": status,  # honesty flag: osm_geocoded vs manual_estimate
        })

    if not new_records:
        print("No new villages resolved. Nothing to append.")
        return

    new_gdf = gpd.GeoDataFrame(new_records, crs="EPSG:4326")

    # existing rows didn't have coord_source - backfill as osm_geocoded
    if "coord_source" not in existing.columns:
        existing["coord_source"] = "osm_geocoded"

    combined = pd.concat([existing, new_gdf], ignore_index=True)
    combined = gpd.GeoDataFrame(combined, crs="EPSG:4326")
    combined.to_file("data/processed/villages.geojson", driver="GeoJSON")

    print(f"\nUpdated villages.geojson now has {len(combined)}/5 villages:")
    print(combined[["name", "lat", "lon", "coord_source"]])

if __name__ == "__main__":
    main()