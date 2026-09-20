"""
fetch_boundaries.py
Phase 9.5 - Fetch real OSM polygon boundaries for villages/sites where
available; fall back to an estimated circular buffer (sized to population)
where OSM only has a point. Honestly labeled either way via boundary_source.
"""

import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd
import os

PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "processed")

# Rough buffer radius by population, for places with no real OSM polygon.
# Not a precise footprint - a labeled, reasonable visual approximation.
def estimate_radius_m(population):
    if population < 200:
        return 150
    elif population < 500:
        return 250
    elif population < 1000:
        return 400
    else:
        return 600


def try_fetch_polygon(name, full_query, max_area_km2=15):
    """Attempt to get a real polygon (not just a point) from OSM.
    Rejects polygons that are implausibly large for a single settlement -
    this catches cases where a place name is ambiguous with a larger
    administrative area (e.g. 'Ukhimath' the town vs 'Ukhimath' the
    tehsil), which OSM will happily return as a valid polygon otherwise."""
    try:
        gdf = ox.geocode_to_gdf(full_query)
        geom = gdf.geometry.iloc[0]
        if geom.geom_type in ("Polygon", "MultiPolygon"):
            # check real area, not just that it's a polygon shape
            area_km2 = gpd.GeoSeries([geom], crs="EPSG:4326").to_crs(epsg=32644).area.iloc[0] / 1_000_000
            if area_km2 > max_area_km2:
                print(f"  {name}: OSM polygon found but implausibly large ({area_km2:.1f} km²) - likely matched a tehsil/district, not the settlement. Falling back to buffer.")
                return None, None
            return geom, "osm_polygon"
    except Exception as e:
        print(f"  {name}: polygon fetch failed ({e})")
    return None, None


def build_boundary(row, name_field="name", query_field="full_query", pop_field=None):
    name = row[name_field]
    query = row.get(query_field, name)

    polygon, source = try_fetch_polygon(name, query)
    if polygon is not None:
        print(f"  {name}: real OSM polygon found")
        return polygon, source

    # fallback: circular buffer around the existing point
    pop = row.get(pop_field, 300) if pop_field else 300
    radius_m = estimate_radius_m(pop if pd.notna(pop) else 300)

    point_metric = gpd.GeoSeries([row.geometry], crs="EPSG:4326").to_crs(epsg=32644)
    buffer_metric = point_metric.buffer(radius_m)
    buffer_wgs84 = gpd.GeoSeries(buffer_metric, crs=32644).to_crs(epsg=4326).iloc[0]

    print(f"  {name}: no OSM polygon - using estimated {radius_m}m buffer")
    return buffer_wgs84, "estimated_buffer"


def process_villages():
    print("Processing villages...")
    villages = gpd.read_file(f"{PROC}/villages.geojson")

    boundaries, sources = [], []
    for _, row in villages.iterrows():
        poly, source = build_boundary(row, pop_field="population")
        boundaries.append(poly)
        sources.append(source)

    villages["boundary_geometry"] = boundaries
    villages["boundary_source"] = sources

    # save boundaries as their own file (separate from the point geometry file,
    # so existing point-based logic elsewhere is untouched)
    boundary_gdf = villages[["name", "boundary_source"]].copy()
    boundary_gdf["geometry"] = boundaries
    boundary_gdf = gpd.GeoDataFrame(boundary_gdf, crs="EPSG:4326")
    boundary_gdf.to_file(f"{PROC}/village_boundaries.geojson", driver="GeoJSON")
    print(f"Saved village_boundaries.geojson\n")


def process_sites():
    print("Processing relocation sites...")
    sites = gpd.read_file(f"{PROC}/relocation_sites.geojson")

    boundaries, sources = [], []
    for _, row in sites.iterrows():
        poly, source = build_boundary(row, pop_field=None)
        boundaries.append(poly)
        sources.append(source)

    boundary_gdf = sites[["name"]].copy()
    boundary_gdf["boundary_source"] = sources
    boundary_gdf["geometry"] = boundaries
    boundary_gdf = gpd.GeoDataFrame(boundary_gdf, crs="EPSG:4326")
    boundary_gdf.to_file(f"{PROC}/site_boundaries.geojson", driver="GeoJSON")
    print(f"Saved site_boundaries.geojson")


if __name__ == "__main__":
    process_villages()
    process_sites()
    print("\n--- Boundary fetch complete ---")