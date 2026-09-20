// api/client.js
// Region-aware fetch wrapper. Every call takes region as first arg.

const API_BASE = "http://127.0.0.1:8000";

async function request(region, path, options = {}) {
  const res = await fetch(`${API_BASE}/${region}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getVillages: (region) => request(region, "/villages"),
  getRedZones: (region) => request(region, "/red-zones"),
  getSites: (region) => request(region, "/sites"),
  getSuitability: (region, village) => request(region, `/suitability/${village}`),
  getRoutes: (region, village) => request(region, `/routes/${village}`),
  getRecommendation: (region, village) => request(region, `/recommendation/${village}`),
  getRescueCases: (region) => request(region, "/rescue-cases"),
  getRouteGeometry: (region, village) => request(region, `/routes/${village}/geometry`),
  getVillageBoundaries: (region) => request(region, "/villages/boundaries"),
  getSiteBoundaries: (region) => request(region, "/sites/boundaries"),
  setVerification: (region, village, site, status, note = "") =>
    request(region, "/verification", {
      method: "POST",
      body: JSON.stringify({ village, site, status, note }),
    }),

  // Uploads a drone video clip for a village->site route. Backend samples
  // frames, runs Gemini analysis, and if blocked, auto-reroutes to the
  // same site before falling back to re-ranking. No Content-Type header
  // set manually - the browser generates the multipart boundary itself.
  runDroneCheck: (region, village, site, lat, lon, videoFile) => {
    const formData = new FormData();
    formData.append("village", village);
    formData.append("site", site);
    formData.append("lat", lat);
    formData.append("lon", lon);
    formData.append("video", videoFile);
    return fetch(`${API_BASE}/${region}/verification/drone-check`, {
      method: "POST",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed: ${res.status}`);
      }
      return res.json();
    });
  },
};