"""
merge_population.py
Phase 2 prep - merge population data into villages.geojson properties
"""

import geopandas as gpd
import pandas as pd

def main():
    villages = gpd.read_file("data/processed/villages.geojson")
    pop = pd.read_csv("data/processed/village_population.csv")

    merged = villages.merge(pop, left_on="name", right_on="village_name", how="left")
    merged = merged.drop(columns=["village_name"])

    missing = merged[merged["population"].isna()]
    if len(missing):
        print(f"WARNING: {len(missing)} villages have no population match:")
        print(missing["name"].tolist())

    merged = gpd.GeoDataFrame(merged, crs=villages.crs)
    merged.to_file("data/processed/villages.geojson", driver="GeoJSON")

    print("\nUpdated villages.geojson with population data:")
    print(merged[["name", "population", "households", "population_source", "coord_source"]])

if __name__ == "__main__":
    main()