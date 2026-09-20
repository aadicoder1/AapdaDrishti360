// api/client.js
// Strict live FastAPI health check and region-aware fetch wrapper.
import fallbackData from "./mockData.json";

const HOST_CANDIDATES = [
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

let workingBase = "http://127.0.0.1:8000";

async function fetchWithFallback(urlPath, options = {}) {
  // Try workingBase first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${workingBase}${urlPath}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("application/json")) return res;
  } catch {}

  // Try alternative host candidates
  for (const candidate of HOST_CANDIDATES) {
    if (candidate === workingBase) continue;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${candidate}${urlPath}`, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeout);
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        workingBase = candidate;
        return res;
      }
    } catch {}
  }
  throw new Error("Backend connection unreachable.");
}

async function request(region, path, options = {}) {
  const cacheKey = `aapda_${region}_${path}`;
  try {
    const res = await fetchWithFallback(`/${region}${path}`, options);
    const data = await res.json();
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    // Fallback to embedded ground-truth dataset
    const regData = fallbackData[region] || fallbackData["uttarakhand"] || fallbackData["rudraprayag"];
    if (path === "/villages") return regData?.villages || [];
    if (path === "/sites") return regData?.sites || [];
    if (path === "/red-zones") return regData?.redZones || null;
    if (path === "/villages/boundaries") return regData?.villageBoundaries || null;
    if (path === "/sites/boundaries") return regData?.siteBoundaries || null;
    if (path === "/rescue-cases") return regData?.rescueCases || [];

    throw err;
  }
}

export const api = {
  checkHealth: async () => {
    for (const base of HOST_CANDIDATES) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${base}/`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timeout);
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          if (data && data.project === "AapdaDrishti 360") {
            workingBase = base;
            return true;
          }
        }
      } catch {}
    }
    return false;
  },

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

  runDroneCheck: async (region, village, site, lat, lon, videoFile) => {
    const formData = new FormData();
    formData.append("village", village);
    formData.append("site", site);
    formData.append("lat", lat);
    formData.append("lon", lon);
    formData.append("video", videoFile);

    for (const base of HOST_CANDIDATES) {
      try {
        const res = await fetch(`${base}/${region}/verification/drone-check`, {
          method: "POST",
          body: formData,
        });
        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          workingBase = base;
          return res.json();
        }
      } catch {}
    }
    throw new Error("Drone check backend unavailable.");
  },
};
