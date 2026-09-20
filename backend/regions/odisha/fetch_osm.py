"""
fetch_osm.py
Phase 1 (Puri region) - Pull OSM data for Puri district: boundary, roads,
bridges, villages/towns, relocation site candidates, amenities.

Same pattern as regions/rudraprayag/fetch_osm.py. Run from the
AapdaDrishti360 root so relative paths resolve correctly:
    python regions/puri/fetch_osm.py
"""

import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point
import os

ox.settings.log_console = True
ox.settings.use_cache = True
ox.settings.timeout = 180

OUTPUT_DIR = "regions/puri/data/processed"
RAW_DIR = "regions/puri/data/raw"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

# Real, documented coastal villages/towns - Astaranga and Kakatpur panchayats
# were named evacuation zones during Cyclone Fani (2019); Udayakani/Tandahara
# are actively documented as being lost to coastal erosion (ongoing, not a
# one-time event) - see Down To Earth coverage cited in project research.
VILLAGES = [
    "Astaranga, Puri, Odisha, India",
    "Kakatpur, Puri, Odisha, India",
    "Udayakani, Puri, Odisha, India",
    "Siara, Puri, Odisha, India",
]

# Puri town = major relocation anchor (real infrastructure, real hospital
# damage data exists for honest capacity framing). Bhubaneswar = second,
# larger relocation site (state capital, real evacuation shelter activity
# documented during Fani).
RELOCATION_SITES = [
    "Puri, Odisha, India",
    "Bhubaneswar, Odisha, India",
]


def fetch_district_boundary():
    print("Fetching Puri district boundary...")
    gdf = ox.geocode_to_gdf("Puri District, Odisha, India")
    gdf.to_file(f"{OUTPUT_DIR}/district_boundary.geojson", driver="GeoJSON")
    print(f"Saved district boundary. Bounds: {gdf.total_bounds}")
    return gdf


def fetch_roads(boundary_gdf):
    print("Fetching road network (this can take a few minutes)...")
    polygon = boundary_gdf.geometry.iloc[0]
    G = ox.graph_from_polygon(polygon, network_type="drive")
    edges = ox.graph_to_gdfs(G, nodes=False)
    edges = edges.reset_index()
    keep_cols = [c for c in edges.columns if c == "geometry" or edges[c].apply(lambda x: isinstance(x, (str, int, float, type(None)))).all()]
    edges[keep_cols].to_file(f"{OUTPUT_DIR}/roads.geojson", driver="GeoJSON")
    ox.save_graphml(G, f"{RAW_DIR}/puri_road_graph.graphml")
    print(f"Saved {len(edges)} road segments + routable graph.")
    return G, edges


def fetch_bridges(boundary_gdf):
    print("Fetching bridges...")
    polygon = boundary_gdf.geometry.iloc[0]
    tags = {"bridge": True}
    try:
        bridges = ox.features_from_polygon(polygon, tags)
        bridges = bridges[bridges.geometry.type.isin(["LineString", "Point"])]
        keep_cols = [c for c in bridges.columns if c == "geometry" or bridges[c].apply(lambda x: isinstance(x, (str, int, float, type(None)))).all()]
        bridges[keep_cols].to_file(f"{OUTPUT_DIR}/bridges.geojson", driver="GeoJSON")
        print(f"Saved {len(bridges)} bridge features.")
    except Exception as e:
        print(f"No bridges found via OSM tags, or query failed: {e}")
        bridges = gpd.GeoDataFrame()
    return bridges


def geocode_points(place_list, place_type):
    print(f"Geocoding {len(place_list)} {place_type}...")
    records = []
    failed = []
    for place in place_list:
        try:
            point = ox.geocode(place)  # (lat, lon)
            name = place.split(",")[0]
            records.append({
                "name": name,
                "full_query": place,
                "lat": point[0],
                "lon": point[1],
                "geometry": Point(point[1], point[0]),
                "coord_source": "osm_geocoded",
            })
            print(f"  OK  {name}: {point}")
        except Exception as e:
            name = place.split(",")[0]
            print(f"  FAIL {name}: {e}")
            failed.append(name)
    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326") if records else gpd.GeoDataFrame()
    return gdf, failed


def fetch_villages_and_sites():
    villages_gdf, v_failed = geocode_points(VILLAGES, "villages")
    sites_gdf, s_failed = geocode_points(RELOCATION_SITES, "relocation sites")

    if len(villages_gdf):
        villages_gdf.to_file(f"{OUTPUT_DIR}/villages.geojson", driver="GeoJSON")
    if len(sites_gdf):
        sites_gdf.to_file(f"{OUTPUT_DIR}/relocation_sites.geojson", driver="GeoJSON")

    print(f"\nVillages geocoded: {len(villages_gdf)}/{len(VILLAGES)}  Failed: {v_failed}")
    print(f"Sites geocoded: {len(sites_gdf)}/{len(RELOCATION_SITES)}  Failed: {s_failed}")
    return villages_gdf, sites_gdf


def fetch_amenities(boundary_gdf):
    print("Fetching hospitals/clinics...")
    polygon = boundary_gdf.geometry.iloc[0]
    tags = {"amenity": ["hospital", "clinic", "doctors"]}
    try:
        amenities = ox.features_from_polygon(polygon, tags)
        amenities = amenities[amenities.geometry.type == "Point"]
        keep_cols = [c for c in amenities.columns if c == "geometry" or amenities[c].apply(lambda x: isinstance(x, (str, int, float, type(None)))).all()]
        amenities[keep_cols].to_file(f"{OUTPUT_DIR}/amenities.geojson", driver="GeoJSON")
        print(f"Saved {len(amenities)} amenity features.")
    except Exception as e:
        print(f"Amenity fetch issue: {e}")


if __name__ == "__main__":
    boundary = fetch_district_boundary()
    G, roads = fetch_roads(boundary)
    bridges = fetch_bridges(boundary)
    villages, sites = fetch_villages_and_sites()
    fetch_amenities(boundary)
    print("\n--- Puri Phase 1 OSM fetch complete ---")