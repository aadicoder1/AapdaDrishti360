"""
bridge_rescue_cases.py
Phase 6 - Reads the rescue module's raw output (rescue_cases.json from
detect.py) and reshapes it into a clean, dashboard-ready file that matches
the naming conventions used across Phase 1-5 (data/processed/*).

This does NOT touch or reinterpret detect.py's scoring logic. It only
relabels/restructures for consistency with the relocation-planning side,
and tags which village's response zone each case likely falls under
(nearest-village heuristic, clearly labeled as such - NOT a claim that
the relocation algorithm detected these people).
"""

import json
import os
import math

RESCUE_INPUT_PATH = "../AapdaDrishti/evidence/rescue_cases.json"  # adjust to your actual path
RAW = os.path.dirname(os.path.abspath(__file__))  # if not already path-safe like build_routes.py
PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data/processed")
OUTPUT_PATH = f"{PROC}/rescue_cases.json"

VILLAGES_PATH = f"{PROC}/villages.geojson"


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def load_villages():
    import geopandas as gpd
    gdf = gpd.read_file(VILLAGES_PATH)
    return [{"name": row["name"], "lat": row["lat"], "lon": row["lon"]} for _, row in gdf.iterrows()]


def nearest_village(lat, lon, villages):
    best = min(villages, key=lambda v: haversine_km(lat, lon, v["lat"], v["lon"]))
    dist_km = haversine_km(lat, lon, best["lat"], best["lon"])
    return best["name"], round(dist_km, 2)


def bridge_cases():
    if not os.path.exists(RESCUE_INPUT_PATH):
        print(f"ERROR: {RESCUE_INPUT_PATH} not found. Check the path or copy rescue_cases.json here manually.")
        return

    with open(RESCUE_INPUT_PATH) as f:
        raw_cases = json.load(f)

    villages = load_villages()

    formatted = []
    for case in raw_cases:
        nearest_name, dist_km = nearest_village(case["estimated_lat"], case["estimated_lon"], villages)

        formatted.append({
            "case_id": case.get("evidence_file", "").replace("evidence/", ""),
            "priority_label": case["priority_label"],
            "priority_score": case["priority_score"],
            "people_count": case["people_count"],
            "estimated_lat": case["estimated_lat"],
            "estimated_lon": case["estimated_lon"],
            "error_radius_m": case["error_radius_m"],
            "hazard_flags": case["hazard_flags"],
            "is_still": case["is_still"],
            "stillness_seconds": case.get("stillness_seconds"),
            "evidence_file": case["evidence_file"],
            "disaster_type": case.get("disaster_type"),
            "location_source": case.get("location_source", "simulated_drone_coordinates"),
            # Bridge-specific fields (new, for relocation-side context only):
            "nearest_village": nearest_name,
            "nearest_village_distance_km": dist_km,
            "association_note": "Nearest-village proximity match, NOT a claim of red-zone linkage",
        })

    with open(OUTPUT_PATH, "w") as f:
        json.dump(formatted, f, indent=2)

    print(f"Bridged {len(formatted)} rescue cases -> {OUTPUT_PATH}")
    print("\nBy nearest village:")
    from collections import Counter
    counts = Counter(c["nearest_village"] for c in formatted)
    for village, n in counts.items():
        print(f"  {village}: {n} case(s)")


if __name__ == "__main__":
    bridge_cases()