"""
fetch_dem.py
Phase 1 - Pull SRTM 30m DEM tiles directly (bypasses the 'elevation'
package's make-based downloader, which Device Guard blocks on this
machine). Merges tiles, clips to district bounds, computes slope.
"""

import os
import zipfile
import requests
import rasterio
from rasterio.merge import merge
from rasterio.mask import mask
import numpy as np
import geopandas as gpd
from shapely.geometry import box

RAW_DIR = "data/raw"
OUTPUT_DIR = "data/processed"
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

ELEVATION_PATH = f"{OUTPUT_DIR}/elevation.tif"
SLOPE_PATH = f"{OUTPUT_DIR}/slope.tif"

# Tiles identified from the district bounds - covers Rudraprayag fully
TILES = ["N30E078", "N30E079"]

# Public SRTM 1-arc-second (30m) mirror, no login required
BASE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/N30/{tile}.hgt.gz"


def get_bounds():
    boundary = gpd.read_file("data/processed/district_boundary.geojson")
    minx, miny, maxx, maxy = boundary.total_bounds
    pad = 0.05
    bounds = (minx - pad, miny - pad, maxx + pad, maxy + pad)
    print(f"District bounds (padded): {bounds}")
    return bounds, boundary


def download_tiles():
    paths = []
    for tile in TILES:
        gz_path = f"{RAW_DIR}/{tile}.hgt.gz"
        hgt_path = f"{RAW_DIR}/{tile}.hgt"
        if not os.path.exists(hgt_path):
            url = BASE_URL.format(tile=tile)
            print(f"Downloading {tile} from {url} ...")
            r = requests.get(url, stream=True, timeout=120)
            r.raise_for_status()
            with open(gz_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            import gzip
            with gzip.open(gz_path, "rb") as f_in, open(hgt_path, "wb") as f_out:
                f_out.write(f_in.read())
            print(f"  Saved {hgt_path}")
        else:
            print(f"  {tile} already downloaded, skipping.")
        paths.append(hgt_path)
    return paths


def merge_and_clip(hgt_paths, bounds, boundary):
    print("Merging tiles...")
    srcs = [rasterio.open(p) for p in hgt_paths]
    mosaic, out_transform = merge(srcs)

    out_meta = srcs[0].meta.copy()
    out_meta.update({
        "driver": "GTiff",
        "height": mosaic.shape[1],
        "width": mosaic.shape[2],
        "transform": out_transform,
        "dtype": "float32",
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
            "height": clipped.shape[1],
            "width": clipped.shape[2],
            "transform": clipped_transform,
            "dtype": "float32",
        })

    with rasterio.open(ELEVATION_PATH, "w", **clipped_meta) as dst:
        dst.write(clipped.astype(np.float32))

    print(f"Elevation saved to {ELEVATION_PATH}")
    return clipped, clipped_transform, clipped_meta


def compute_slope(elev, transform, meta):
    print("Computing slope...")
    elev = elev[0]  # drop band dimension
    pixel_size_deg = transform[0]
    meters_per_deg_lat = 111320
    mean_lat = 30.5  # approx Rudraprayag center latitude
    pixel_size_m = pixel_size_deg * meters_per_deg_lat * np.cos(np.radians(mean_lat))

    dzdx, dzdy = np.gradient(elev, pixel_size_m, pixel_size_m)
    slope_rad = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
    slope_deg = np.degrees(slope_rad)

    slope_meta = meta.copy()
    with rasterio.open(SLOPE_PATH, "w", **slope_meta) as dst:
        dst.write(slope_deg.astype(np.float32), 1)

    print(f"Slope saved to {SLOPE_PATH}")
    print(f"Slope range: {np.nanmin(slope_deg):.1f}° to {np.nanmax(slope_deg):.1f}°")
    print(f"Mean slope: {np.nanmean(slope_deg):.1f}°")


if __name__ == "__main__":
    bounds, boundary = get_bounds()
    hgt_paths = download_tiles()
    elev, transform, meta = merge_and_clip(hgt_paths, bounds, boundary)
    compute_slope(elev, transform, meta)
    print("\n--- DEM/slope pipeline complete (direct-download method) ---")