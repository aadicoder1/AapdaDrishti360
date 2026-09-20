"""
fetch_dem.py
Phase 1 (Puri region) - Pull SRTM 30m DEM tiles directly (same
direct-download method as Rudraprayag's fetch_dem.py, bypassing the
'elevation' package's make-based downloader due to the same Windows
Device Guard restriction). Elevation only - no slope computation, since
slope isn't a meaningful risk factor for coastal storm-surge/erosion
exposure the way it was for landslide risk in Rudraprayag.
"""

import os
import gzip
import requests
import rasterio
from rasterio.merge import merge
from rasterio.mask import mask
import numpy as np
import geopandas as gpd
from shapely.geometry import box

RAW_DIR = "regions/puri/data/raw"
OUTPUT_DIR = "regions/puri/data/processed"
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

ELEVATION_PATH = f"{OUTPUT_DIR}/elevation.tif"

# Puri district spans roughly 85.1-86.4 lon, 19.5-20.2 lat - covered by
# tiles N19E085 and N20E085
TILES = ["N19E085", "N20E085"]
BASE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/{prefix}/{tile}.hgt.gz"


def get_bounds():
    boundary = gpd.read_file(f"{OUTPUT_DIR}/district_boundary.geojson")
    minx, miny, maxx, maxy = boundary.total_bounds
    pad = 0.05
    bounds = (minx - pad, miny - pad, maxx + pad, maxy + pad)
    print(f"District bounds (padded): {bounds}")
    return bounds


def download_tiles():
    paths = []
    for tile in TILES:
        prefix = tile[:3]  # e.g. "N19" from "N19E085"
        gz_path = f"{RAW_DIR}/{tile}.hgt.gz"
        hgt_path = f"{RAW_DIR}/{tile}.hgt"
        if not os.path.exists(hgt_path):
            url = BASE_URL.format(prefix=prefix, tile=tile)
            print(f"Downloading {tile} from {url} ...")
            r = requests.get(url, stream=True, timeout=120)
            r.raise_for_status()
            with open(gz_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            with gzip.open(gz_path, "rb") as f_in, open(hgt_path, "wb") as f_out:
                f_out.write(f_in.read())
            print(f"  Saved {hgt_path}")
        else:
            print(f"  {tile} already downloaded, skipping.")
        paths.append(hgt_path)
    return paths


def merge_and_clip(hgt_paths, bounds):
    print("Merging tiles...")
    srcs = [rasterio.open(p) for p in hgt_paths]
    mosaic, out_transform = merge(srcs)

    out_meta = srcs[0].meta.copy()
    out_meta.update({
        "driver": "GTiff", "height": mosaic.shape[1], "width": mosaic.shape[2],
        "transform": out_transform, "dtype": "float32",
    })

    merged_path = f"{RAW_DIR}/dem_merged.tif"
    with rasterio.open(merged_path, "w", **out_meta) as dst:
        dst.write(mosaic.astype(np.float32))
    for s in srcs:
        s.close()

    print("Clipping to district bounds...")
    clip_geom = [box(*bounds)]
    with rasterio.open(merged_path) as src:
        clipped, clipped_transform = mask(src, clip_geom, crop=True)
        clipped_meta = src.meta.copy()
        clipped_meta.update({
            "height": clipped.shape[1], "width": clipped.shape[2],
            "transform": clipped_transform, "dtype": "float32",
        })

        # SRTM void/no-data pixels are encoded as -32768, not NaN - must be
    # masked explicitly before any statistics, or they silently corrupt
    # every downstream mean/min/max calculation.
    clean = clipped.astype(np.float32)
    clean[clean <= -500] = np.nan  # -32768 void sentinel, safely below any real elevation

    with rasterio.open(ELEVATION_PATH, "w", **clipped_meta) as dst:
        dst.write(clean)

    print(f"Elevation saved to {ELEVATION_PATH}")
    void_count = np.sum(np.isnan(clean))
    total_pixels = clean.size
    print(f"Void/no-data pixels: {void_count}/{total_pixels} ({100*void_count/total_pixels:.1f}%)")
    print(f"Elevation range: {np.nanmin(clean):.1f}m to {np.nanmax(clean):.1f}m")
    print(f"Mean elevation: {np.nanmean(clean):.1f}m")

if __name__ == "__main__":
    bounds = get_bounds()
    hgt_paths = download_tiles()
    merge_and_clip(hgt_paths, bounds)
    print("\n--- Elevation-only DEM fetch complete (coastal region, no slope needed) ---")