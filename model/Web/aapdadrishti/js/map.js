// AapdaDrishti - Clean Light Map Module
// Leaflet Light Cartography + Subtle Area Draw + Smooth Slow Drone Patrol

class CleanMapModule {
  constructor() {
    this.map = null;
    this.markersGroup = null;
    this.searchZonesGroup = null;
    this.droneMarker = null;
    this.droneInterval = null;
    this.dronePath = [];
    this.droneStep = 0;
    this.isDrawing = false;
    this.drawnPoints = [];
    this.tempLayer = null;
  }

  init() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
      return;
    }

    const mapEl = document.getElementById('mainMap');
    if (!mapEl) return;

    // Centered around disaster operational theater
    const center = [28.6982, 77.2341];

    this.map = L.map('mainMap', {
      center: center,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Clean CartoDB Positron Light Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // Minimal Zoom Control
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.searchZonesGroup = L.layerGroup().addTo(this.map);
    this.tempLayer = L.layerGroup().addTo(this.map);

    // Click handler for area drawing
    this.map.on('click', (e) => this.handleMapClick(e));

    // Ensure default active cases exist if user jumps straight to map
    if (!AAPDA_DATA.activeCases || AAPDA_DATA.activeCases.length === 0) {
      AAPDA_DATA.activeCases = [...AAPDA_DATA.scenarios.flood.cases];
    }

    this.updateMapCases();
    this.spawnDefaultSearchZone();
  }

  updateMapCases() {
    if (!this.map || !this.markersGroup) return;

    this.markersGroup.clearLayers();
    const cases = AAPDA_DATA.activeCases || [];

    cases.forEach(c => {
      const pinColor = {
        CRITICAL: '#DC2626',
        HIGH: '#EA580C',
        MEDIUM: '#D97706',
        LOW: '#16A34A'
      }[c.priority] || '#0F766E';

      const customIcon = L.divIcon({
        className: 'clean-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-6 h-6 rounded-full bg-white border-2 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110" style="border-color: ${pinColor}">
              <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${pinColor}"></div>
            </div>
            <div class="absolute -bottom-6 bg-white/95 text-[10px] font-medium px-2 py-0.5 rounded shadow-sm border border-stone-200 text-stone-700 whitespace-nowrap opacity-90 group-hover:opacity-100">
              ${c.id}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([c.lat, c.lng], { icon: customIcon });
      marker.on('click', () => this.openSidePanel(c.id));
      this.markersGroup.addLayer(marker);
    });
  }

  // Draw Area Tool
  startDrawingArea() {
    this.isDrawing = true;
    this.drawnPoints = [];
    this.tempLayer.clearLayers();

    const banner = document.getElementById('mapDrawBanner');
    if (banner) banner.classList.remove('hidden');
  }

  cancelDrawing() {
    this.isDrawing = false;
    this.drawnPoints = [];
    this.tempLayer.clearLayers();
    const banner = document.getElementById('mapDrawBanner');
    if (banner) banner.classList.add('hidden');
  }

  handleMapClick(e) {
    if (!this.isDrawing) return;

    const pt = [e.latlng.lat, e.latlng.lng];
    this.drawnPoints.push(pt);

    // Marker for vertex
    const marker = L.circleMarker(pt, {
      radius: 4,
      color: '#0F766E',
      fillColor: '#FFFFFF',
      fillOpacity: 1
    });
    this.tempLayer.addLayer(marker);

    // Polyline
    if (this.drawnPoints.length > 1) {
      const line = L.polyline(this.drawnPoints, {
        color: '#0F766E',
        weight: 1.5,
        dashArray: '4, 4'
      });
      this.tempLayer.addLayer(line);
    }
  }

  finishDrawingArea() {
    if (this.drawnPoints.length < 3) {
      alert("Click at least 3 points on the map to define a search area.");
      return;
    }

    this.isDrawing = false;
    const banner = document.getElementById('mapDrawBanner');
    if (banner) banner.classList.add('hidden');

    const polygon = L.polygon(this.drawnPoints, {
      color: '#0F766E',
      weight: 1.5,
      fillColor: '#0F766E',
      fillOpacity: 0.08,
      dashArray: '4, 4'
    });

    this.searchZonesGroup.clearLayers();
    this.searchZonesGroup.addLayer(polygon);
    this.tempLayer.clearLayers();

    this.startDronePatrol(this.drawnPoints);
  }

  spawnDefaultSearchZone() {
    const defaultZone = [
      [28.6940, 77.2280],
      [28.7040, 77.2300],
      [28.7070, 77.2420],
      [28.6970, 77.2400]
    ];

    const polygon = L.polygon(defaultZone, {
      color: '#0F766E',
      weight: 1.5,
      fillColor: '#0F766E',
      fillOpacity: 0.08,
      dashArray: '4, 4'
    });

    this.searchZonesGroup.addLayer(polygon);
    this.startDronePatrol(defaultZone);
  }

  // Subtle, slow drone patrol animation
  startDronePatrol(pts) {
    if (this.droneInterval) clearInterval(this.droneInterval);

    this.dronePath = this.interpolatePath(pts);
    this.droneStep = 0;

    if (this.droneMarker) {
      this.map.removeLayer(this.droneMarker);
    }

    // Small, simple drone icon
    const droneIcon = L.divIcon({
      className: 'drone-patrol-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-white border border-teal-600/30 shadow-sm flex items-center justify-center">
            <svg class="w-4 h-4 text-teal-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this.droneMarker = L.marker(this.dronePath[0], { icon: droneIcon }).addTo(this.map);

    // Slow, subtle motion (minimal cue, not gamey)
    this.droneInterval = setInterval(() => {
      this.droneStep = (this.droneStep + 1) % this.dronePath.length;
      if (this.droneMarker) {
        this.droneMarker.setLatLng(this.dronePath[this.droneStep]);
      }
    }, 400);
  }

  interpolatePath(pts) {
    const path = [];
    const steps = 25;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        path.push([
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t
        ]);
      }
    }
    return path;
  }

  // Small, simple side panel (not a modal covering the map)
  openSidePanel(caseId) {
    const c = (AAPDA_DATA.activeCases || []).find(item => item.id === caseId);
    if (!c) return;

    const panel = document.getElementById('mapSidePanel');
    if (!panel) return;

    const badgeClass = {
      CRITICAL: 'badge-critical',
      HIGH: 'badge-high',
      MEDIUM: 'badge-medium',
      LOW: 'badge-low'
    }[c.priority];

    panel.innerHTML = `
      <div class="p-5 flex flex-col justify-between h-full">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-stone-100">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
              ${c.priority}
            </span>
            <button onclick="window.AapdaMap.closeSidePanel()" class="text-stone-400 hover:text-stone-700 text-sm">
              ✕
            </button>
          </div>

          <div class="mt-4">
            <h3 class="text-base font-semibold text-stone-900 mb-1">${c.title}</h3>
            <div class="text-xs font-mono text-stone-500 mb-3">${c.coordinates} • ${c.accuracy}</div>
            <p class="text-xs text-stone-600 leading-relaxed">${c.summary}</p>
          </div>
        </div>

        <div class="pt-4 border-t border-stone-100">
          <button onclick="window.AapdaApp.showCaseDetail('${c.id}')" class="w-full py-2 px-3 bg-teal-800 hover:bg-teal-900 text-white text-xs font-medium rounded-lg transition">
            Open full case detail →
          </button>
        </div>
      </div>
    `;

    panel.classList.remove('translate-x-full');
  }

  closeSidePanel() {
    const panel = document.getElementById('mapSidePanel');
    if (panel) panel.classList.add('translate-x-full');
  }
}

window.AapdaMap = new CleanMapModule();
