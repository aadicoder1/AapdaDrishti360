"""
fetch_amenities_retry.py
Phase 1 (Puri region) - standalone retry for amenities, since the full
fetch_osm.py run timed out on this specific call after everything else
succeeded. No need to re-run the whole pipeline.
"""

import osmnx as ox
import geopandas as gpd

ox.settings.log_console = True
ox.settings.use_cache = True
ox.settings.timeout = 300  # longer timeout this time, Puri's a bigger area

OUTPUT_DIR = "regions/puri/data/processed"


def fetch_amenities():
    boundary = gpd.read_file(f"{OUTPUT_DIR}/district_boundary.geojson")
    polygon = boundary.geometry.iloc[0]
    tags = {"amenity": ["hospital", "clinic", "doctors"]}
    print("Retrying amenities fetch...")
    amenities = ox.features_from_polygon(polygon, tags)
    amenities = amenities[amenities.geometry.type == "Point"]
    keep_cols = [c for c in amenities.columns if c == "geometry" or amenities[c].apply(lambda x: isinstance(x, (str, int, float, type(None)))).all()]
    amenities[keep_cols].to_file(f"{OUTPUT_DIR}/amenities.geojson", driver="GeoJSON")
    print(f"Saved {len(amenities)} amenity features.")


if __name__ == "__main__":
    fetch_amenities()