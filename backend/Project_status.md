# AapdaDrishti 360 — Project Status

*Last updated: 30 Aug 2026 (Phase 7-8 complete). Update this after every phase — paste at the start of new chat sessions for full context.*

## What this project is

Built for **SIH 2026 Level 2**, mapped to official **PS 26191** (Ministry of Home Affairs / NDRF): an AI-driven GIS decision-support platform that identifies multi-hazard red zones, assesses relocation site suitability + carrying capacity, prioritizes vulnerable habitations for relocation, and scores whether they can actually *reach* safety (route feasibility — our differentiator).

Our original rescue/detection project (AapdaDrishti — YOLO/ByteTrack survivor detection, priority scoring) didn't map to any live SIH PS on its own. It's now folded in as the **post-disaster response layer**: reused unmodified, positioned as what handles residents who couldn't evacuate despite planning.

**Demo region:** Rudraprayag district, Uttarakhand — landslide + cloudburst hazards (both real, documented, not single-hazard, per the PS's multi-hazard requirement).

**Core principle:** honest scoping. Every dataset is labeled real vs. estimated. Never overclaim.

**Locked decision (30 Aug):** Finish Rudraprayag end-to-end first (Phases 7-10). Multi-region expansion (Odisha/Kerala cyclone, Assam flood, etc.) is now **Phase 11**, added after full completion — not instead of it. No time constraint currently, but depth before breadth.

---

## Phase status

| Phase | Status | Key files |
|---|---|---|
| 0 — Setup & validation | ✅ Done | — |
| 1 — Data foundation | ✅ Done | `fetch_osm.py`, `fetch_dem.py`, `build_hazard_zones.py`, `verify_phase1.py` |
| 2 — Red-zone + vulnerability scoring | ✅ Done | `score_vulnerability.py`, `merge_population.py`, `finalize_phase2.py` |
| 3 — Site suitability + carrying capacity | ✅ Done (all 5 villages) | `score_site_suitability.py` |
| 4 — Route feasibility scoring | ✅ Done (all 5 villages, 14/15 pairs — Semla→Guptkashi has no valid route) | `build_routes.py`, `score_route_feasibility.py` |
| 5 — Drone/field verification | ✅ Done | `verify_route.py`, `demo_trigger.py` |
| 6 — Rescue module integration | ✅ Done | `bridge_rescue_cases.py` (in AapdaDrishti360), `detect.py` (separate AapdaDrishti repo) |
| 7 — Backend (FastAPI) | ✅ Done | `main.py` |
| 8 — Dashboard (React + Leaflet) | ✅ Functionally complete | `aapdadrishti-dashboard/` (separate repo, sibling folder) |
| 9 — Integration + rehearsal | ⏳ Starting now | — |
| 10 — Packaging + docs | ❌ Not started | — |
| 11 — Multi-region expansion (NEW) | ❌ Not started, deferred until 7-10 fully solid | — |

---

## Phase 7 — Backend (detail)

FastAPI serving Phase 1-6 output files directly (no PostGIS yet — files-first, matching the project's established convention). Full endpoint list: `/villages`, `/red-zones`, `/sites`, `/suitability/{village}`, `/routes/{village}`, `/routes/{village}/geometry`, `/recommendation/{village}`, `POST /verification`, `/rescue-cases`.

**Environment issue hit again:** `pydantic_core` DLL load failed the same way rasterio did in Phase 1 (Windows Smart App Control blocking a pip-installed compiled binary). **Same fix**: reinstalled `fastapi`/`uvicorn`/`pydantic` via `conda-forge` instead of pip, inside the `aapdadrishti` conda env. Pattern now confirmed: any compiled-extension Python package should go through conda-forge first on this machine, not pip.

**Real bugs found and fixed during testing (all confirmed via live endpoint testing, not assumed):**

1. **`/villages` returned `red_zone_level: null` for every village** — `finalize_phase2.py` writes the column as `zone`, not `red_zone_level`. Fixed by remapping the field in the endpoint.
2. **`/sites` returned `suitability_score`/`capacity` as `null`** — wrong model entirely. Suitability is village-specific (same site scores differently per village), so it was never meant to live as a flat field on the site. Fixed by simplifying `/sites` to static site identity only, and adding a new `/suitability/{village}` endpoint mirroring `/routes/{village}`.
3. **`route_feasibility_{village}.csv` and `routes_{village}.csv` only existed for Gaurikund** — both `score_site_suitability.py` and `build_routes.py`/`score_route_feasibility.py` hardcoded `"Gaurikund"`. Fixed by looping both scripts over all 5 villages.
4. **`build_routes.py` crashed on Semla→Guptkashi** — `shapely.errors.GEOSException: point array must contain 0 or >1 elements`. Root cause: origin and destination snapped to the *same* graph node (likely due to Semla's `manual_estimate` coordinate precision). Fixed with an explicit same-node check before routing; this one pair is now cleanly skipped rather than crashing. No other pairs hit this — confirmed a one-off, not a wider graph precision problem.
5. **`POST /verification` accepted any garbage value** (`village: "string"`, `status: "string"`) and returned `200 OK`, silently writing bad data into `route_verification_status.json`. Fixed with a proper `status` enum (Pydantic `Enum`) and explicit validation of `village`/`site` against real data before writing. Confirmed working — bad requests now correctly return `422`.
6. **The most serious bug: `/recommendation/{village}` and `/routes/{village}` read a stale pre-baked CSV instead of computing live.** A `POST /verification` would correctly update `route_verification_status.json`, but the GET endpoints were reading `route_feasibility_{village}.csv` — a snapshot from whenever the script was last run manually — so the live-flip demo lever silently did *not* work through the API (only through re-running the script by hand). **This would have failed live in front of judges if not caught.** Fixed by making both endpoints call `score_routes(village)` live on every request instead of reading the file. Confirmed fixed end-to-end.

**Known open item:** no low-confidence warning when the top recommendation still scores very low (e.g., all routes blocked, "best" option is still under 10/100). Explicitly deferred, not blocking.

**Cleanup pending:** a `"string__string"` junk entry from bug #5's testing is still sitting in `route_verification_status.json` — harmless (never matches a real village/site) but should be removed before final packaging.

---

## Phase 8 — Dashboard (detail)

React (Vite) + Leaflet, in a **separate sibling folder** `aapdadrishti-dashboard/` (not nested inside `AapdaDrishti360`). Frontend and backend run as two separate dev servers simultaneously (`uvicorn` on :8000, Vite on :5173), same machine, CORS configured to allow this.

**Design direction:** terrain/topographic basemap (switched from an initial dark CARTO theme — CARTO's dark tiles started requiring an API key mid-build, and separately, the terrain basemap was judged more useful for a disaster-context tool: visible roads, elevation, forest cover). Hazard zones render as dashed-border polygons (visually signals "digitized/estimated," not surveyed). Village markers colored by `red_zone_level`. Route feasibility shown as a custom "signal bar" component (degrading bar meter, not a generic progress bar) — deliberate signature visual tying the UI to what the score actually means.

**Structure:** `src/api/client.js` (thin fetch wrapper matching every backend endpoint 1:1), `src/theme.css` (design tokens), `src/components/` (MapView, RouteDrawer, RescuePanel, SignalBar, HazardZoneColor), `src/App.jsx` (owns shared state, single source of truth for route/suitability data so map and drawer update together).

**Real bugs found and fixed:**

1. **Route paths on the map were straight lines, not following real roads**, despite `build_routes.py` supposedly computing real road-network routes. Root cause: `build_route()` was only using graph *node* coordinates to build the path geometry, discarding each edge's actual stored OSM geometry (the real curvy road shape). Fixed by stitching together each edge's real `geometry` attribute where available, falling back to a straight node-to-node segment only when an edge has no stored shape. Re-ran `build_routes.py` — paths now visibly follow real roads/river valleys on the map.
2. **Frontend crash: blank screen, `ReferenceError: suitability is not defined`** — when the suitability panel was added to `RouteDrawer.jsx`, the component's function signature wasn't updated to actually destructure the new `suitability`/`suitabilityError` props being passed from `App.jsx`. Fixed by adding both to the parameter list.

**Known open item, deferred:** route path color-by-score works correctly for low/mid tiers (yellow ~20-49, orange <20, red for verified-blocked) but the green/teal tier (score ≥50, "safest route") does not visibly render on the map, even when real data has scores in that range (confirmed via drawer numbers). Suspected cause: shorter high-score route segments may be getting visually overlapped/drawn-under by longer lower-score routes sharing the same road corridor near the village origin point. A z-ordering fix (sort route features by score, draw highest last) was attempted and did not resolve it. Does not block the demo (drawer text/numbers are correct and are the actual source of truth), but is a visual polish gap on the map itself.

**What's working, confirmed via live testing:**
- Map: villages (colored by red-zone), sites, hazard zone polygons (all 5, real citations)
- Click village → suitability panel (safety/capacity/access breakdown, real resource-gap text) + route feasibility panel (distance, signal bar, verification status/note)
- Live verification buttons → `POST /verification` → drawer refreshes with new score, map path recolors (aside from the deferred green-tier issue)
- Rescue Cases tab: all 17 test cases, priority-colored, honesty disclaimer visible, cleanly separated from relocation planning (per Phase 6 rule)

---

## Phase 1 — Data foundation (detail, unchanged from last update)

- District boundary, roads, bridges — pulled via OSM/OSMnx
- Villages (5/5 resolved): Gaurikund, Mangoli, Agastmuni real OSM geocode; **Pondar, Semla — `coord_source: manual_estimate`**
- Relocation sites (3/3): Rudraprayag town, Guptkashi, Ukhimath — real OSM geocode
- Amenities: only 8 features pulled — still thin, still flagged
- Hazard zones: 5 polygons, `landslide` + `cloudburst`, incident-anchored buffers with citations
- DEM/slope: resolved via Miniconda + conda-forge

## Phase 6 — Rescue module integration (detail, unchanged from last update)

- `detect.py` patched with `save_case_log()`, tested against `Sample_videos/Assam.mp4` — 17 cases, LOW→CRITICAL spread, correct hazard flagging
- `bridge_rescue_cases.py` adds nearest-village heuristic with explicit `association_note` disclaimer
- **Known limitation, still open:** Assam footage is geographically meaningless against Rudraprayag (all 17 cases match "Mangoli" by pure coordinate proximity, ~1328km away in reality). Demo footage strategy still not decided.

---

## Open items / not forgotten

- [ ] Decide demo footage strategy for rescue module
- [ ] Supplement thin amenities layer (8 features) if needed
- [ ] Fix route path green-tier color rendering on map (deferred, not blocking)
- [ ] Add low-confidence warning to `/recommendation` when top pick still scores very low (deferred, not blocking)
- [ ] Remove `"string__string"` junk entry from `route_verification_status.json`
- [ ] Keep this doc updated after each phase

---

## Environment notes

- Windows, personal (non-managed) laptop
- **Miniconda environment (`aapdadrishti`) used for everything backend-related** — geo-stack AND API stack — due to recurring Windows Smart App Control DLL blocks on pip-installed compiled binaries. **Established pattern: prefer conda-forge over pip for any compiled-extension package on this machine.**
- Three separate project folders side-by-side: `AapdaDrishti` (rescue module), `AapdaDrishti360` (backend), `aapdadrishti-dashboard` (React frontend, Node/npm, no conda needed)
- Backend: `uvicorn main:app --reload` on `127.0.0.1:8000`, from `AapdaDrishti360`, conda env active
- Frontend: `npm run dev` on `127.0.0.1:5173`, from `aapdadrishti-dashboard`, plain Node
- Both must run simultaneously in separate terminals for the dashboard to show real data

---

## Working conventions (for continuity across sessions)

- Files delivered in chat, never as downloadable documents
- Complete files, not diffs
- Every dataset/field labeled honestly: real vs. estimated vs. simulated
- Test each phase's script/endpoint in isolation, confirm actual output before moving on — this caught every real bug listed above, including one (Phase 7, bug #6) that would have failed silently in front of judges
- Build order: data foundation → scoring logic → route feasibility (protected/critical path) → verification wiring → rescue integration → backend → dashboard → integration/rehearsal → packaging last → multi-region expansion (new, explicitly last)