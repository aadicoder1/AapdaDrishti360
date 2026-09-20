"""
fetch_real_boundaries.py
Phase 9.5 - Attempt to fetch REAL building footprints from OSM near each
village/site point, and compute a concave hull around them as the actual
settlement outline. Falls back to the existing estimated circular buffer
(from fetch_boundaries.py) wherever no real buildings are found.

This tries harder than fetch_boundaries.py's polygon lookup - that one only
checked if the PLACE itself was mapped as a polygon. This checks if
individual BUILDINGS near the point exist, which is a different (often
more available) OSM data layer.
"""

import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point, MultiPoint
from shapely.ops import unary_union
import pandas as pd
import json
import os
PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/processed")

# Search radius around each point to look for real buildings.
SEARCH_RADIUS_M = 400

# Minimum number of buildings required before we trust a computed hull
# over the fallback buffer - 2-3 stray buildings isn't a reliable outline.
MIN_BUILDINGS_FOR_REAL_BOUNDARY = 4


def fetch_buildings_near(lat, lon, radius_m):
    try:
        tags = {"building": True}
        gdf = ox.features_from_point((lat, lon), tags, dist=radius_m)
        gdf = gdf[gdf.geometry.type.isin(["Polygon", "MultiPolygon", "Point"])]
        return gdf
    except Exception as e:
        return None


def compute_hull(buildings_gdf):
    """Concave-ish hull via buffered union - simpler and more robust than
    a true concave hull algorithm, and good enough for a visual boundary."""
    geoms = buildings_gdf.geometry.tolist()
    # buffer each building slightly, union them, then take the union's
    # convex hull of the merged shape - captures the settlement's real
    # footprint area without an overly jagged/unstable concave algorithm
    buffered = [g.buffer(0.0003) for g in geoms]  # ~30m buffer in degrees, rough
    merged = unary_union(buffered)
    hull = merged.convex_hull
    return hull


def process_point_set(input_path, name_field, output_path, pop_field=None):
    gdf = gpd.read_file(input_path)
    existing_fallback = gpd.read_file(output_path) if _file_exists(output_path) else None

    results = []
    for _, row in gdf.iterrows():
        name = row[name_field]
        lat, lon = row.geometry.y, row.geometry.x
        print(f"Checking real buildings near {name}...")

        buildings = fetch_buildings_near(lat, lon, SEARCH_RADIUS_M)

        if buildings is not None and len(buildings) >= MIN_BUILDINGS_FOR_REAL_BOUNDARY:
            hull = compute_hull(buildings)
            print(f"  {name}: {len(buildings)} real buildings found - using computed boundary")
            results.append({
                "name": name,
                "geometry": hull,
                "boundary_source": "osm_buildings_hull",
                "building_count": len(buildings),
            })
        else:
            n_found = len(buildings) if buildings is not None else 0
            print(f"  {name}: only {n_found} buildings found (need {MIN_BUILDINGS_FOR_REAL_BOUNDARY}+) - keeping estimated buffer")
            # reuse the existing fallback buffer geometry already built
            if existing_fallback is not None:
                match = existing_fallback[existing_fallback["name"] == name]
                if len(match):
                    results.append({
                        "name": name,
                        "geometry": match.geometry.iloc[0],
                        "boundary_source": "estimated_buffer",
                        "building_count": n_found,
                    })
                    continue
            # last-resort: no fallback file available either, skip
            print(f"  {name}: WARNING - no fallback buffer found either, skipping")

    out_gdf = gpd.GeoDataFrame(results, crs="EPSG:4326")
    out_gdf.to_file(output_path, driver="GeoJSON")
    print(f"Saved {output_path}\n")
    return out_gdf


def _file_exists(path):
    import os
    return os.path.exists(path)


if __name__ == "__main__":
    print("=== Villages ===")
    process_point_set(
        f"{PROC}/villages.geojson", "name",
        f"{PROC}/village_boundaries.geojson", pop_field="population"
    )

    print("=== Relocation sites ===")
    process_point_set(
        f"{PROC}/relocation_sites.geojson", "name",
        f"{PROC}/site_boundaries.geojson"
    )

    print("--- Real boundary fetch complete ---")