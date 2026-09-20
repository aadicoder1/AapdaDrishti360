"""
merge_population.py
Phase 1 prep (Puri region) - merge population data into villages.geojson,
same pattern as Rudraprayag's merge_population.py.
"""

import geopandas as gpd
import pandas as pd
import os

PROC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "processed")


def main():
    villages = gpd.read_file(f"{PROC}/villages.geojson")
    pop = pd.read_csv(f"{PROC}/village_population.csv")

    merged = villages.merge(pop, left_on="name", right_on="village_name", how="left")
    merged = merged.drop(columns=["village_name"])

    missing = merged[merged["population"].isna()]
    if len(missing):
        print(f"WARNING: {len(missing)} villages have no population match:")
        print(missing["name"].tolist())

    merged = gpd.GeoDataFrame(merged, crs=villages.crs)
    merged.to_file(f"{PROC}/villages.geojson", driver="GeoJSON")

    print("\nUpdated villages.geojson with population data:")
    print(merged[["name", "population", "households", "population_source", "coord_source"]])


if __name__ == "__main__":
    main()