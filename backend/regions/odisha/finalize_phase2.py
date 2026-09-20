"""
finalize_phase2.py  (Puri / Odisha)
Phase 2 close-out:
1. Merge zone/score/reason back into villages.geojson
2. Score relocation sites for hazard proximity (baseline safety check,
   full suitability scoring happens in Phase 3)
"""

import geopandas as gpd
import pandas as pd
from score_vulnerability import hazard_score_for_village, load_data
import os

# Resolve paths relative to this script's own location, not the current working directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROC = os.path.join(SCRIPT_DIR, "data", "processed")


def merge_scores_into_villages():
    villages = gpd.read_file(f"{PROC}/villages.geojson")
    scores = pd.read_csv(f"{PROC}/village_vulnerability_scores.csv")

    scores_slim = scores[["name", "zone", "score", "reason"]].rename(
        columns={"score": "vulnerability_score", "reason": "vulnerability_reason"}
    )

    # Drop stale columns from a previous run before merging, so pandas
    # never has to auto-suffix (_x/_y) and silently corrupt the schema.
    stale_cols = ["zone", "vulnerability_score", "vulnerability_reason"]
    villages = villages.drop(columns=[c for c in stale_cols if c in villages.columns])

    merged = villages.merge(scores_slim, on="name", how="left")
    merged = gpd.GeoDataFrame(merged, crs=villages.crs)
    merged.to_file(f"{PROC}/villages.geojson", driver="GeoJSON")

    print("Merged zone/score/reason into villages.geojson:")
    print(merged[["name", "zone", "vulnerability_score"]])
    return merged

def score_relocation_sites(hazards):
    sites = gpd.read_file(f"{PROC}/relocation_sites.geojson")
    results = []

    for _, s in sites.iterrows():
        h_score, h_reason, _ = hazard_score_for_village(s.geometry, hazards)
        safety_note = "Low baseline hazard exposure - viable candidate" if h_score < 40 else \
                      "Moderate hazard exposure - verify local conditions" if h_score < 60 else \
                      "High hazard exposure - reconsider as primary site"
        results.append({
            "name": s["name"],
            "baseline_hazard_score": h_score,
            "hazard_note": h_reason,
            "safety_assessment": safety_note,
        })

    df = pd.DataFrame(results)

    # Drop any stale hazard columns from a previous run before merging fresh ones in,
    # so pandas never has to auto-suffix (_x/_y) and silently break downstream reads.
    stale_cols = ["baseline_hazard_score", "hazard_note", "safety_assessment"]
    sites = sites.drop(columns=[c for c in stale_cols if c in sites.columns])

    sites_merged = sites.merge(df, on="name", how="left")
    sites_merged = gpd.GeoDataFrame(sites_merged, crs=sites.crs)
    sites_merged.to_file(f"{PROC}/relocation_sites.geojson", driver="GeoJSON")

    print("\nRelocation site baseline hazard check:")
    for _, row in df.iterrows():
        print(f"  {row['name']:15s} | hazard score {row['baseline_hazard_score']:5.1f} | {row['safety_assessment']}")
        print(f"    {row['hazard_note']}")

    return sites_merged

if __name__ == "__main__":
    villages, hazards, amenities = load_data()
    merge_scores_into_villages()
    score_relocation_sites(hazards)
    print("\n--- Phase 2 complete: villages.geojson and relocation_sites.geojson now carry full risk context ---")