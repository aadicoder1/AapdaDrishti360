"""
build_routes.py
Phase 4 - Build real road routes from Gaurikund to each candidate
relocation site, using the routable graph fetched in Phase 1.
Computes real travel distance (not straight-line), overlays hazard
zones on the route path, and counts bridge crossings.
"""

import osmnx as ox
import geopandas as gpd
import networkx as nx
from shapely.geometry import LineString, Point
import pandas as pd
import os

import copy
BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "data/raw")
PROC = os.path.join(BASE, "data/processed")

GRAPH_PATH = f"{RAW}/puri_road_graph.graphml"


def load_graph():
    print("Loading road graph...")
    G = ox.load_graphml(GRAPH_PATH)
    print(f"  {len(G.nodes)} nodes, {len(G.edges)} edges")
    return G


def nearest_node(G, point):
    return ox.distance.nearest_nodes(G, point.x, point.y)


def build_route(G, origin_point, dest_point):
    """Returns (route_nodes, route_geometry, distance_km) or (None, None, None) if unreachable.
    Uses each edge's actual OSM geometry (curvy road shape) where available,
    falling back to a straight node-to-node line only when an edge has no
    stored geometry - this makes the route follow real roads on the map,
    not just connect graph nodes with straight chords."""
    orig_node = nearest_node(G, origin_point)
    dest_node = nearest_node(G, dest_point)

    if orig_node == dest_node:
        print(f"  WARNING: origin and destination snapped to the same graph node - skipping (likely coordinate precision issue)")
        return None, None, None

    try:
        route_nodes = nx.shortest_path(G, orig_node, dest_node, weight="length")
    except nx.NetworkXNoPath:
        return None, None, None

    if len(route_nodes) < 2:
        print(f"  WARNING: route has fewer than 2 nodes - skipping")
        return None, None, None

    # Stitch together each edge's real geometry, not just node coordinates
    all_coords = []
    total_length_m = 0

    for i in range(len(route_nodes) - 1):
        u, v = route_nodes[i], route_nodes[i + 1]
        edge_data = G.get_edge_data(u, v)
        # multigraph - pick the shortest parallel edge, matching original distance logic
        best_edge = min(edge_data.values(), key=lambda x: x.get("length", 0))
        total_length_m += best_edge.get("length", 0)

        if "geometry" in best_edge:
            # real curvy road shape for this segment
            seg_coords = list(best_edge["geometry"].coords)
        else:
            # no stored geometry for this edge - fall back to straight node-to-node
            seg_coords = [(G.nodes[u]["x"], G.nodes[u]["y"]), (G.nodes[v]["x"], G.nodes[v]["y"])]

        # avoid duplicating the shared point between consecutive segments
        if all_coords and seg_coords[0] == all_coords[-1]:
            seg_coords = seg_coords[1:]
        all_coords.extend(seg_coords)

    route_geom = LineString(all_coords)
    return route_nodes, route_geom, total_length_m / 1000

def hazard_overlap(route_geom, hazards):
    """Returns list of hazard zones the route passes through, with overlap length in meters."""
    route_metric = gpd.GeoSeries([route_geom], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]
    hazards_metric = hazards.to_crs(epsg=32644)

    overlaps = []
    for _, hz in hazards_metric.iterrows():
        if route_metric.intersects(hz.geometry):
            intersection = route_metric.intersection(hz.geometry)
            overlap_m = intersection.length
            if overlap_m > 0:
                overlaps.append({
                    "hazard_name": hz["name"],
                    "hazard_type": hz["hazard_type"],
                    "overlap_meters": round(overlap_m, 1),
                })
    return overlaps


def bridge_crossings(route_geom, bridges):
    """Count bridges the route geometry passes near/through."""
    if bridges is None or len(bridges) == 0:
        return 0, []

    route_metric = gpd.GeoSeries([route_geom], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]
    bridges_metric = bridges.to_crs(epsg=32644)

    crossed = []
    for _, b in bridges_metric.iterrows():
        # buffer route slightly to catch bridges right on/near the path
        if route_metric.buffer(15).intersects(b.geometry):
            name = b.get("name", "unnamed bridge")
            if not isinstance(name, str):
                name = "unnamed bridge"
            crossed.append(name)

    return len(crossed), crossed


def route_for_village(G, village, sites, hazards, bridges):
    """Runs the full routing pipeline for one village against all candidate sites."""
    route_records = []
    route_geoms = []

    for _, site in sites.iterrows():
        print(f"\nRouting {village['name']} -> {site['name']}...")
        nodes, geom, dist_km = build_route(G, village.geometry, site.geometry)

        if geom is None:
            print(f"  NO ROUTE FOUND (graph may not connect these points)")
            continue

        overlaps = hazard_overlap(geom, hazards)
        n_bridges, bridge_names = bridge_crossings(geom, bridges)

        print(f"  Real route distance: {dist_km:.1f}km")
        print(f"  Hazard overlaps: {len(overlaps)}")
        for o in overlaps:
            print(f"    - {o['hazard_name']} ({o['hazard_type']}): {o['overlap_meters']}m of route inside zone")
        print(f"  Bridges crossed: {n_bridges}")

        route_records.append({
            "village": village["name"],
            "site": site["name"],
            "distance_km": round(dist_km, 1),
            "hazard_overlap_count": len(overlaps),
            "hazard_overlap_total_m": round(sum(o["overlap_meters"] for o in overlaps), 1),
            "bridge_count": n_bridges,
            "bridge_names": "; ".join(bridge_names) if bridge_names else "none identified",
        })
        route_geoms.append({"village": village["name"], "site": site["name"], "geometry": geom})

    return route_records, route_geoms



def build_route_avoiding_point(G, origin_point, dest_point, avoid_lat, avoid_lon, avoid_radius_m=500):
    """Removes graph edges within avoid_radius_m of a reported blockage point
    (manual click or drone detection), then finds the real detour to the
    SAME destination - only falls back to a different site if no detour exists."""
    G_detour = copy.deepcopy(G)
    avoid_point_metric = gpd.GeoSeries([Point(avoid_lon, avoid_lat)], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]

    edges_to_remove = []
    for u, v, k, data in G_detour.edges(keys=True, data=True):
        if "geometry" in data:
            edge_geom = data["geometry"]
        else:
            edge_geom = LineString([(G_detour.nodes[u]["x"], G_detour.nodes[u]["y"]),
                                     (G_detour.nodes[v]["x"], G_detour.nodes[v]["y"])])
        edge_metric = gpd.GeoSeries([edge_geom], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]
        if edge_metric.distance(avoid_point_metric) < avoid_radius_m:
            edges_to_remove.append((u, v, k))

    G_detour.remove_edges_from(edges_to_remove)
    print(f"  Blocked {len(edges_to_remove)} road segments near ({avoid_lat}, {avoid_lon})")
    return build_route(G_detour, origin_point, dest_point)


def main():
    G = load_graph()
    villages = gpd.read_file(f"{PROC}/villages.geojson")
    sites = gpd.read_file(f"{PROC}/relocation_sites.geojson")
    hazards = gpd.read_file(f"{PROC}/hazard_zones.geojson")
    try:
        bridges = gpd.read_file(f"{PROC}/bridges.geojson")
    except Exception:
        bridges = None
        print("No bridges.geojson found - route bridge counts will be 0.")

    for _, village in villages.iterrows():
        print(f"\n{'='*60}\nProcessing routes for {village['name']}\n{'='*60}")

        route_records, route_geoms = route_for_village(G, village, sites, hazards, bridges)

        if not route_records:
            print(f"  No routes found for {village['name']} at all - skipping file write.")
            continue

        village_key = village["name"].lower()
        routes_df = pd.DataFrame(route_records)
        routes_df.to_csv(f"{PROC}/routes_{village_key}.csv", index=False)
        print(f"\nSaved route summary to {PROC}/routes_{village_key}.csv")

        routes_gdf = gpd.GeoDataFrame(route_geoms, crs="EPSG:4326")
        routes_gdf.to_file(f"{PROC}/routes_{village_key}.geojson", driver="GeoJSON")
        print(f"Saved route geometries to {PROC}/routes_{village_key}.geojson")


if __name__ == "__main__":
    main()