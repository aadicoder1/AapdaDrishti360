"""
main.py
Phase 7/12 - FastAPI backend for AapdaDrishti 360. Now region-aware:
every endpoint takes {region} as a path param and reads from
regions/{region}/data/processed/.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from enum import Enum
import pandas as pd
import geopandas as gpd
import json
import os
import importlib
from fastapi import UploadFile, File, Form
import tempfile

REGIONS = {"uttarakhand", "odisha"}

def get_proc(region: str):
    if region not in REGIONS:
        raise HTTPException(status_code=404, detail=f"Unknown region '{region}'. Valid: {sorted(REGIONS)}")
    return f"regions/{region}/data/processed"

def _file_path(region: str, name: str):
    return os.path.join(get_proc(region), name)

def _require_file(region: str, name: str):
    path = _file_path(region, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=503, detail=f"{name} not found for region '{region}'. Has this phase's script been run?")
    return path

def _route_module(region: str):
    """Loads the correct region's score_route_feasibility module."""
    get_proc(region)  # validates region, raises 404 if unknown
    return importlib.import_module(f"regions.{region}.score_route_feasibility")


app = FastAPI(
    title="AapdaDrishti 360 API",
    description="GIS decision-support API for hazard red-zones, relocation "
                 "site suitability, route feasibility, and rescue case data. "
                 "Built for PS 26191 (SIH 2026).",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Response models ----------

class Village(BaseModel):
    name: str
    lat: float
    lon: float
    coord_source: str
    population: Optional[int] = None
    red_zone_level: Optional[str] = None
    vulnerability_score: Optional[float] = None
    vulnerability_reason: Optional[str] = None


class RelocationSite(BaseModel):
    name: str
    lat: float
    lon: float
    baseline_hazard_score: Optional[float] = None
    safety_assessment: Optional[str] = None


class RouteFeasibility(BaseModel):
    village: str
    site: str
    distance_km: float
    travel_time_min: float
    hazard_score: float
    bridge_score: float
    distance_score: float
    base_feasibility: float
    verification_status: str
    verification_note: str
    route_feasibility_score: float

class VerificationStatus(str, Enum):
    verified_clear = "verified_clear"
    verified_blocked = "verified_blocked"
    unverified = "unverified"

class VerificationRequest(BaseModel):
    village: str
    site: str
    status: VerificationStatus
    note: str = ""


class RescueCase(BaseModel):
    case_id: str
    priority_label: str
    priority_score: float
    people_count: int
    estimated_lat: float
    estimated_lon: float
    error_radius_m: float
    hazard_flags: list
    is_still: bool
    stillness_seconds: Optional[float] = None
    evidence_file: str
    disaster_type: Optional[str] = None
    location_source: str
    nearest_village: str
    nearest_village_distance_km: float
    association_note: str


class SiteSuitability(BaseModel):
    village: str
    site: str
    suitability_score: float
    safety_score: float
    capacity_score: float
    access_score: float
    straight_line_km: float
    capacity_sufficient: bool
    resource_gap: str
    hazard_note: str


class BlockPointRequest(BaseModel):
    village: str
    site: str
    lat: float
    lon: float
    note: str = ""
    source: str = "manual"  # "manual" | "drone_ai"


# ---------- Endpoints ----------

@app.get("/{region}/villages", response_model=list[Village])
def get_villages(region: str):
    path = _require_file(region, "villages.geojson")
    gdf = gpd.read_file(path)
    records = gdf.to_dict(orient="records")
    for r in records:
        r["red_zone_level"] = r.pop("zone", None)
    return records


@app.get("/{region}/red-zones")
def get_red_zones(region: str):
    path = _require_file(region, "hazard_zones.geojson")
    gdf = gpd.read_file(path)
    return json.loads(gdf.to_json())


@app.get("/{region}/sites", response_model=list[RelocationSite])
def get_sites(region: str):
    path = _require_file(region, "relocation_sites.geojson")
    gdf = gpd.read_file(path)
    return gdf.to_dict(orient="records")


@app.get("/{region}/suitability/{village}", response_model=list[SiteSuitability])
def get_suitability(region: str, village: str):
    filename = f"site_suitability_{village.lower()}.csv"
    path = _require_file(region, filename)
    df = pd.read_csv(path)
    return df.to_dict(orient="records")


@app.get("/{region}/routes/{village}", response_model=list[RouteFeasibility])
def get_routes(region: str, village: str):
    mod = _route_module(region)
    df = mod.score_routes(village)
    if df is None or df.empty:
        raise HTTPException(status_code=503, detail=f"No route data for '{village}' in {region}. Has build_routes.py been run?")
    return df.to_dict(orient="records")


@app.get("/{region}/recommendation/{village}")
def get_recommendation(region: str, village: str):
    mod = _route_module(region)
    df = mod.score_routes(village)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No routes found for village '{village}' in {region}")
    top = df.iloc[0].to_dict()
    return {
        "region": region,
        "village": village,
        "recommended_site": top["site"],
        "route_feasibility_score": top["route_feasibility_score"],
        "verification_status": top["verification_status"],
        "full_ranking": df.to_dict(orient="records"),
    }

@app.post("/{region}/verification/block-point")
def post_block_point(region: str, req: BlockPointRequest):
    """Mark a specific point on a route as blocked (manual map click or
    drone detection) and attempt an automatic detour to the same site
    before falling back to re-ranking a different site."""
    mod = importlib.import_module(f"regions.{region}.build_routes")
    route_mod = _route_module(region)

    villages_gdf = gpd.read_file(_require_file(region, "villages.geojson"))
    sites_gdf = gpd.read_file(_require_file(region, "relocation_sites.geojson"))
    village_row = villages_gdf[villages_gdf["name"] == req.village]
    site_row = sites_gdf[sites_gdf["name"] == req.site]

    if village_row.empty or site_row.empty:
        raise HTTPException(status_code=422, detail="Unknown village or site")

    G = mod.load_graph()
    hazards = gpd.read_file(_require_file(region, "hazard_zones.geojson"))

    nodes, geom, dist_km = mod.build_route_avoiding_point(
        G, village_row.iloc[0].geometry, site_row.iloc[0].geometry, req.lat, req.lon
    )

    if geom is None:
        route_mod.set_verification(req.village, req.site, "verified_blocked",
            req.note or f"[{req.source}] Blocked near ({req.lat},{req.lon}) - no detour found")
        return {"status": "no_detour", "message": "Site unreachable via any road - falling back to next-best site.",
                "recommendation": route_mod.score_routes(req.village).to_dict(orient="records")}

    overlaps = mod.hazard_overlap(geom, hazards)

    original_routes = pd.read_csv(_file_path(region, f"routes_{req.village.lower()}.csv"))
    orig_row = original_routes[original_routes["site"] == req.site]
    orig_dist = orig_row.iloc[0]["distance_km"] if not orig_row.empty else dist_km
    delta_km = round(dist_km - orig_dist, 1)

    route_mod.set_verification(req.village, req.site, "verified_clear",
        req.note or f"[{req.source}] Rerouted around blockage, +{delta_km}km detour")

    return {
        "status": "rerouted",
        "region": region, "village": req.village, "site": req.site,
        "original_distance_km": round(orig_dist, 1),
        "new_distance_km": round(dist_km, 1),
        "detour_added_km": delta_km,
        "hazard_overlap_count": len(overlaps),
        "message": f"Detour found - same site still reachable, +{delta_km}km added"
    }


@app.post("/{region}/verification/drone-check")
async def post_drone_check(
    region: str,
    village: str = Form(...),
    site: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    video: UploadFile = File(...),
):
    """Upload a drone video clip, run Gemini frame analysis, and if blocked,
    automatically reroute to the same site - same pipeline as the CLI tool,
    callable from the dashboard."""
    drone_mod = importlib.import_module("regions.drone_verify")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = drone_mod.run_drone_check(region, village, site, lat, lon, tmp_path)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    finally:
        os.unlink(tmp_path)

    return result


@app.post("/{region}/verification")
def post_verification(region: str, req: VerificationRequest):
    villages_gdf = gpd.read_file(_require_file(region, "villages.geojson"))
    sites_gdf = gpd.read_file(_require_file(region, "relocation_sites.geojson"))
    valid_villages = set(villages_gdf["name"])
    valid_sites = set(sites_gdf["name"])

    if req.village not in valid_villages:
        raise HTTPException(status_code=422, detail=f"'{req.village}' is not a known village. Valid: {sorted(valid_villages)}")
    if req.site not in valid_sites:
        raise HTTPException(status_code=422, detail=f"'{req.site}' is not a known relocation site. Valid: {sorted(valid_sites)}")

    mod = _route_module(region)
    mod.set_verification(req.village, req.site, req.status.value, req.note)
    return {"status": "ok", "region": region, "village": req.village, "site": req.site, "set_to": req.status.value}


@app.get("/{region}/rescue-cases", response_model=list[RescueCase])
def get_rescue_cases(region: str):
    path = _require_file(region, "rescue_cases.json")
    with open(path) as f:
        return json.load(f)


@app.get("/{region}/routes/{village}/geometry")
def get_route_geometry(region: str, village: str):
    filename = f"routes_{village.lower()}.geojson"
    path = _require_file(region, filename)
    gdf = gpd.read_file(path)
    return json.loads(gdf.to_json())


@app.get("/{region}/villages/boundaries")
def get_village_boundaries(region: str):
    path = _require_file(region, "village_boundaries.geojson")
    with open(path) as f:
        return json.load(f)


@app.get("/{region}/sites/boundaries")
def get_site_boundaries(region: str):
    path = _require_file(region, "site_boundaries.geojson")
    with open(path) as f:
        return json.load(f)


@app.get("/")
def root():
    return {
        "project": "AapdaDrishti 360",
        "ps": "26191",
        "regions": sorted(REGIONS),
        "docs": "/docs",
        "note": "Data is a mix of real sources and clearly labeled estimates. "
                "See coord_source, location_source, and confidence fields throughout for provenance.",
    }