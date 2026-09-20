"""
score_route_feasibility.py
Phase 4 - Route feasibility scoring with verification states.

Combines:
  - Real distance/travel time (from build_routes.py)
  - Hazard exposure along the route (overlap length)
  - Bridge/chokepoint count
  - Verification status: verified_clear / verified_blocked / unverified

This is the differentiator - a safe, sufficient site is useless if the
route to it is impassable. Verification status is the live lever: change
it, and the recommendation changes with it.
"""

import pandas as pd
import json
import os

PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "processed")
VERIFICATION_LOG_PATH = f"{PROC}/route_verification_status.json"

# Assumed average travel speed on mountain roads (conservative, unpaved/hilly stretches)
AVG_SPEED_KMH = 25


def load_routes(village):
    path = f"{PROC}/routes_{village.lower()}.csv"
    if not os.path.exists(path):
        return None
    return pd.read_csv(path)

def load_verification_status():
    """Verification status per route - defaults to 'unverified' unless
    explicitly set. This file is the toggle for your live demo moment."""
    if os.path.exists(VERIFICATION_LOG_PATH):
        with open(VERIFICATION_LOG_PATH) as f:
            return json.load(f)
    return {}


def set_verification(village, site, status, note=""):
    """status: 'verified_clear' | 'verified_blocked' | 'unverified'"""
    log = load_verification_status()
    key = f"{village}__{site}"
    log[key] = {"status": status, "note": note}
    with open(VERIFICATION_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)
    print(f"Verification updated: {village} -> {site} = {status} ({note})")


def get_verification(village, site, log):
    key = f"{village}__{site}"
    entry = log.get(key, {"status": "unverified", "note": "No recent field/drone observation"})
    return entry["status"], entry["note"]


def travel_time_minutes(distance_km):
    return round((distance_km / AVG_SPEED_KMH) * 60, 1)


MIN_SUBSCORE_FLOOR = 5  # avoid misleading hard-zero scores; "very bad" != "impossible"

def hazard_exposure_score(row):
    """More hazard overlap = worse. Scale: 0m=100 (perfect), 2000m+=floor."""
    overlap_m = row["hazard_overlap_total_m"]
    score = max(MIN_SUBSCORE_FLOOR, 100 - (overlap_m / 2000) * 100)
    return round(score, 1)


def bridge_risk_score(row):
    """More bridges = more chokepoint risk. 0 bridges=100, 4+=floor."""
    n = row["bridge_count"]
    score = max(MIN_SUBSCORE_FLOOR, 100 - (n / 4) * 100)
    return round(score, 1)


def distance_score(row, max_km=70):
    """Shorter route = better. Scaled against the longest route in this set."""
    score = max(MIN_SUBSCORE_FLOOR, 100 - (row["distance_km"] / max_km) * 100)
    return round(score, 1)

def score_routes(village):
    routes = load_routes(village)
    if routes is None or routes.empty:
        return None

    verification_log = load_verification_status()
    max_km = routes["distance_km"].max()

    results = []
    for _, row in routes.iterrows():
        status, note = get_verification(row["village"], row["site"], verification_log)

        hazard_score = hazard_exposure_score(row)
        bridge_score = bridge_risk_score(row)
        dist_score = distance_score(row, max_km)
        travel_min = travel_time_minutes(row["distance_km"])

        base_score = (
            hazard_score * 0.35 +
            bridge_score * 0.30 +
            dist_score * 0.35
        )

        if status == "verified_blocked":
            final_score = round(base_score * 0.15, 1)
            status_label = "VERIFIED BLOCKED"
        elif status == "verified_clear":
            final_score = round(min(100, base_score * 1.1), 1)
            status_label = "VERIFIED CLEAR"
        else:
            final_score = round(base_score * 0.85, 1)
            status_label = "UNVERIFIED - provisional"

        results.append({
            "village": row["village"],
            "site": row["site"],
            "distance_km": row["distance_km"],
            "travel_time_min": travel_min,
            "hazard_score": hazard_score,
            "bridge_score": bridge_score,
            "distance_score": dist_score,
            "base_feasibility": round(base_score, 1),
            "verification_status": status_label,
            "verification_note": note,
            "route_feasibility_score": final_score,
        })

    df = pd.DataFrame(results).sort_values("route_feasibility_score", ascending=False)
    return df

def print_report(df, village):
    print(f"\n=== Route Feasibility Ranking: {village} -> Candidate Sites ===\n")
    for i, (_, row) in enumerate(df.iterrows(), 1):
        print(f"#{i} {row['site']} — Feasibility: {row['route_feasibility_score']}/100  [{row['verification_status']}]")
        print(f"    Distance: {row['distance_km']}km (~{row['travel_time_min']} min) | Hazard: {row['hazard_score']} | Bridges: {row['bridge_score']}")
        print(f"    Verification note: {row['verification_note']}\n")


if __name__ == "__main__":
    villages_gdf = None
    try:
        import geopandas as gpd
        villages_gdf = gpd.read_file(f"{PROC}/villages.geojson")
        village_names = list(villages_gdf["name"])
    except Exception:
        village_names = ["Gaurikund"]

    for village in village_names:
        df = score_routes(village)
        if df is None:
            print(f"Skipping {village} - no routes_{village.lower()}.csv found (build_routes.py may not have produced routes for this village).")
            continue

        print_report(df, village)
        out_path = f"{PROC}/route_feasibility_{village.lower()}.csv"
        df.to_csv(out_path, index=False)
        print(f"Saved to {out_path}\n{'-'*60}\n")