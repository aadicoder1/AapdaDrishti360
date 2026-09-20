"""
score_site_suitability.py
Phase 3 - Rank candidate relocation sites for a given at-risk village.

Combines:
  - hazard safety (from Phase 2, inverted - lower hazard = better site)
  - carrying capacity vs village population (with explicit resource gaps)
  - straight-line distance (proxy for access; Phase 4 replaces with real route distance)

NOT yet included: real road-based travel time, bridge/chokepoint exposure -
that is Phase 4's job specifically. This script answers "is the site safe
and big enough", not "can people actually get there."
"""

import geopandas as gpd
import pandas as pd
import numpy as np
import os

PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "processed")

WATER_PER_PERSON_LITERS = 15 * 10  # Sphere standard: ~15L/person/day, x10 buffer margin for days of supply
SANITATION_PEOPLE_PER_UNIT = 15    # Sphere standard ratio


def load_data():
    villages = gpd.read_file(f"{PROC}/villages.geojson")
    sites = gpd.read_file(f"{PROC}/relocation_sites.geojson")
    capacity = pd.read_csv(f"{PROC}/site_capacity.csv")
    return villages, sites, capacity


def straight_line_distance_km(village_geom, site_geom):
    v_m = gpd.GeoSeries([village_geom], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]
    s_m = gpd.GeoSeries([site_geom], crs="EPSG:4326").to_crs(epsg=32644).iloc[0]
    return v_m.distance(s_m) / 1000


def check_capacity(village_pop, site_row):
    shelter_cap = site_row["est_shelter_capacity"]
    water_cap = site_row["est_water_capacity_liters_day"]
    sanitation_cap = site_row["est_sanitation_units"]

    water_needed = village_pop * WATER_PER_PERSON_LITERS
    sanitation_needed = int(np.ceil(village_pop / SANITATION_PEOPLE_PER_UNIT))

    shelter_ok = village_pop <= shelter_cap
    water_ok = water_needed <= water_cap
    sanitation_ok = sanitation_needed <= sanitation_cap

    gaps = []
    if not shelter_ok:
        gaps.append(f"shelter short by {village_pop - shelter_cap} people")
    if not water_ok:
        deficit_liters = water_needed - water_cap
        gaps.append(f"water short by {deficit_liters:,.0f}L/day")
    if not sanitation_ok:
        gaps.append(f"sanitation short by {sanitation_needed - sanitation_cap} units")

    all_ok = shelter_ok and water_ok and sanitation_ok
    gap_text = "; ".join(gaps) if gaps else "No resource gaps - capacity sufficient"

    # capacity score: 100 if fully sufficient, decays based on how badly short
    shelter_ratio = min(1, shelter_cap / village_pop) if village_pop > 0 else 1
    water_ratio = min(1, water_cap / water_needed) if water_needed > 0 else 1
    sanitation_ratio = min(1, sanitation_cap / sanitation_needed) if sanitation_needed > 0 else 1
    capacity_score = round(((shelter_ratio + water_ratio + sanitation_ratio) / 3) * 100, 1)

    return capacity_score, all_ok, gap_text


def score_sites_for_village(village_name, villages, sites, capacity):
    village = villages[villages["name"] == village_name].iloc[0]
    village_pop = village["population"]

    results = []
    for _, site in sites.iterrows():
        cap_row = capacity[capacity["site_name"] == site["name"]].iloc[0]

        # hazard safety score (inverted: 100 - hazard_score, since site's baseline_hazard_score
        # already exists from Phase 2's finalize_phase2.py)
        hazard_score = site.get("baseline_hazard_score", 0)
        safety_score = round(100 - hazard_score, 1)

        capacity_score, capacity_ok, gap_text = check_capacity(village_pop, cap_row)

        dist_km = straight_line_distance_km(village.geometry, site.geometry)
        # access score: closer is better, decay to 0 at 60km straight-line
        access_score = round(max(0, 100 - (dist_km / 60) * 100), 1)

        # combined suitability - weighted
        suitability = round(
            safety_score * 0.40 +
            capacity_score * 0.35 +
            access_score * 0.25,
            1
        )

        results.append({
            "village": village_name,
            "site": site["name"],
            "suitability_score": suitability,
            "safety_score": safety_score,
            "capacity_score": capacity_score,
            "access_score": access_score,
            "straight_line_km": round(dist_km, 1),
            "capacity_sufficient": capacity_ok,
            "resource_gap": gap_text,
            "hazard_note": site.get("hazard_note", "n/a"),
        })

    df = pd.DataFrame(results).sort_values("suitability_score", ascending=False)
    return df

if __name__ == "__main__":
    villages, sites, capacity = load_data()

    for village_name in villages["name"]:
        print(f"=== Site Suitability Ranking: {village_name} ===\n")
        df = score_sites_for_village(village_name, villages, sites, capacity)

        for i, row in df.iterrows():
            rank = list(df.index).index(i) + 1
            print(f"#{rank} {row['site']} — Suitability: {row['suitability_score']}/100")
            print(f"    Safety: {row['safety_score']} | Capacity: {row['capacity_score']} | Access: {row['access_score']} (straight-line {row['straight_line_km']}km)")
            print(f"    Resource check: {row['resource_gap']}")
            print(f"    Hazard context: {row['hazard_note']}\n")

        out_path = f"{PROC}/site_suitability_{village_name.lower()}.csv"
        df.to_csv(out_path, index=False)
        print(f"Saved to {out_path}\n{'-'*60}\n")