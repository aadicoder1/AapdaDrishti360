// AapdaDrishti - Interactive Drone Mission Flight & Casualty Capture Engine (Section 9)
// Area Marking + Lawnmower Drone Patrol + Real-Time Casualty Discovery & Extraction

const DISASTER_SECTORS = {
  assam: {
    id: "assam",
    name: "Assam Brahmaputra Basin",
    center: [26.1445, 91.7362],
    zoom: 14,
    defaultZone: [
      [26.1400, 91.7280],
      [26.1520, 91.7300],
      [26.1560, 91.7450],
      [26.1420, 91.7430]
    ],
    casualties: [
      {
        id: "CAS-AS-101",
        title: "Commercial Van Roof Trapped Survivor",
        priority: "CRITICAL",
        lat: 26.1452,
        lng: 91.7348,
        coordinates: "26.14520° N, 91.73480° E",
        uncertaintyMeters: 14,
        confidence: 96.8,
        immobility: "Static (18 mins)",
        hazard: "Water current 3.4 knots, live power line <25m",
        verified: false,
        dispatched: false,
        notes: "Individual signaling from roof of submerged van. Water approaching window line."
      },
      {
        id: "CAS-AS-102",
        title: "Banyan Tree Clinging Child & Adult",
        priority: "CRITICAL",
        lat: 26.1495,
        lng: 91.7380,
        coordinates: "26.14950° N, 91.73800° E",
        uncertaintyMeters: 16,
        confidence: 94.5,
        immobility: "Static on branch (35 mins)",
        hazard: "Structural tree trunk tilt, water depth 3.1m",
        verified: false,
        dispatched: false,
        notes: "Two distinct thermal signatures on primary branch. Water vortex detected around trunk."
      },
      {
        id: "CAS-AS-103",
        title: "Elevated Concrete Terrace Group (3 Persons)",
        priority: "HIGH",
        lat: 26.1530,
        lng: 91.7410,
        coordinates: "26.15300° N, 91.74100° E",
        uncertaintyMeters: 18,
        confidence: 93.2,
        immobility: "Sheltered in place",
        hazard: "Ground floor submerged, power grid offline",
        verified: true,
        dispatched: false,
        notes: "Family safe above current flood crest line. Flashlight signaling confirmed."
      },
      {
        id: "CAS-AS-104",
        title: "Waterworks Tanker Platform Worker",
        priority: "MEDIUM",
        lat: 26.1415,
        lng: 91.7395,
        coordinates: "26.14150° N, 91.73950° E",
        uncertaintyMeters: 22,
        confidence: 89.6,
        immobility: "Stationary",
        hazard: "Road access severed",
        verified: false,
        dispatched: false,
        notes: "Worker safe on reinforced concrete staging pad. Non-immediate urgency."
      }
    ]
  },
  delhi: {
    id: "delhi",
    name: "Yamuna Flood Corridor (Delhi-NCR)",
    center: [28.6982, 77.2341],
    zoom: 14,
    defaultZone: [
      [28.6940, 77.2280],
      [28.7040, 77.2300],
      [28.7070, 77.2420],
      [28.6970, 77.2400]
    ],
    casualties: [
      {
        id: "CAS-DL-201",
        title: "Wazirabad Embankment Stranded Laborers",
        priority: "CRITICAL",
        lat: 28.6990,
        lng: 77.2335,
        coordinates: "28.69900° N, 77.23350° E",
        uncertaintyMeters: 12,
        confidence: 97.1,
        immobility: "Surrounded by rising water",
        hazard: "Current 4.1 knots, rising 10cm/hr",
        verified: false,
        dispatched: false,
        notes: "Two workers on temporary masonry wall. Urgent extraction needed."
      },
      {
        id: "CAS-DL-202",
        title: "Low-Lying Dairy Farm Terrace",
        priority: "HIGH",
        lat: 28.7030,
        lng: 77.2360,
        coordinates: "28.70300° N, 77.23600° E",
        uncertaintyMeters: 15,
        confidence: 92.4,
        immobility: "Isolated on rooftop",
        hazard: "Submerged access road (2.2m depth)",
        verified: true,
        dispatched: true,
        notes: "4 residents waiting for SDRF rescue boat dispatch."
      }
    ]
  },
  uttarakhand: {
    id: "uttarakhand",
    name: "Uttarakhand Mountain Fire & Slide",
    center: [29.5977, 79.6591],
    zoom: 14,
    defaultZone: [
      [29.5930, 79.6520],
      [29.6040, 79.6550],
      [29.6060, 79.6670],
      [29.5950, 79.6640]
    ],
    casualties: [
      {
        id: "CAS-UK-301",
        title: "Pine Forest Ridge Trapped Guard",
        priority: "CRITICAL",
        lat: 29.5985,
        lng: 79.6610,
        coordinates: "29.59850° N, 79.66100° E",
        uncertaintyMeters: 18,
        confidence: 95.8,
        immobility: "Trapped by smoke wall",
        hazard: "Thermal plume >380°C, zero visibility",
        verified: false,
        dispatched: false,
        notes: "FLIR thermal confirmed single white-hot human signature pinned on rocky promontory."
      }
    ]
  }
};

class DroneMissionMapModule {
  constructor() {
    this.map = null;
    this.currentSector = 'assam';
    this.drawnPoints = [];
    this.isDrawing = false;
    this.drawType = 'polygon';
    
    this.searchZoneLayer = null;
    this.tempDrawLayer = null;
    this.markersLayer = null;
    this.circlesLayer = null;
    
    this.droneMarker = null;
    this.droneFlightPath = [];
    this.droneCurrentIndex = 0;
    this.droneInterval = null;
    
    this.capturedCasualties = [];
    this.discoveredIds = new Set();
    this.selectedCasualtyId = null;
    this.filterMode = 'ALL'; // ALL, CRITICAL, HIGH, VERIFIED
  }

  init() {
    const mapEl = document.getElementById('worldMissionsMap');
    if (!mapEl) return;

    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 150);
      return;
    }

    const sector = DISASTER_SECTORS[this.currentSector];

    this.map = L.map('worldMissionsMap', {
      center: sector.center,
      zoom: sector.zoom,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Positron Clean Light Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Feature Layers
    this.searchZoneLayer = L.layerGroup().addTo(this.map);
    this.tempDrawLayer = L.layerGroup().addTo(this.map);
    this.circlesLayer = L.layerGroup().addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);

    // Click handler for area drawing
    this.map.on('click', (e) => this.handleMapClick(e));

    // Spawn default marked search zone and start scanning
    this.loadSector(this.currentSector);
  }

  loadSector(sectorKey) {
    if (!DISASTER_SECTORS[sectorKey]) return;
    this.currentSector = sectorKey;
    const sector = DISASTER_SECTORS[sectorKey];

    this.map.flyTo(sector.center, sector.zoom, { duration: 1.2 });
    
    this.capturedCasualties = [];
    this.discoveredIds.clear();
    
    this.setSearchZone(sector.defaultZone);
    this.updateSectorButtons();
  }

  updateSectorButtons() {
    document.querySelectorAll('.sector-pill-btn').forEach(btn => {
      if (btn.dataset.sector === this.currentSector) {
        btn.classList.add('bg-slate-900', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600');
      } else {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600');
      }
    });
  }

  // Draw Area Tool
  startDrawing(type = 'polygon') {
    this.isDrawing = true;
    this.drawType = type;
    this.drawnPoints = [];
    this.tempDrawLayer.clearLayers();

    const banner = document.getElementById('mapDrawingBanner');
    if (banner) banner.classList.remove('hidden');

    const msg = document.getElementById('mapDrawingBannerMsg');
    if (msg) msg.textContent = "Click on the map to define search perimeter points. Click 'Launch Drone Search' when done.";
  }

  cancelDrawing() {
    this.isDrawing = false;
    this.drawnPoints = [];
    this.tempDrawLayer.clearLayers();
    const banner = document.getElementById('mapDrawingBanner');
    if (banner) banner.classList.add('hidden');
  }

  handleMapClick(e) {
    if (!this.isDrawing) return;

    const pt = [e.latlng.lat, e.latlng.lng];
    this.drawnPoints.push(pt);

    // Draw vertex marker
    const vertex = L.circleMarker(pt, {
      radius: 5,
      color: '#00E5FF',
      fillColor: '#0284C7',
      fillOpacity: 1
    });
    this.tempDrawLayer.addLayer(vertex);

    // Polyline
    if (this.drawnPoints.length > 1) {
      const line = L.polyline(this.drawnPoints, {
        color: '#0284C7',
        weight: 2,
        dashArray: '5, 5'
      });
      this.tempDrawLayer.addLayer(line);
    }
  }

  completeDrawing() {
    if (this.drawnPoints.length < 3) {
      alert("Please designate at least 3 points on the map to define a search corridor.");
      return;
    }

    this.isDrawing = false;
    const banner = document.getElementById('mapDrawingBanner');
    if (banner) banner.classList.add('hidden');

    this.setSearchZone(this.drawnPoints);
    this.tempDrawLayer.clearLayers();
  }

  setSearchZone(polygonVertices) {
    this.searchZoneLayer.clearLayers();
    this.circlesLayer.clearLayers();
    this.markersLayer.clearLayers();
    this.capturedCasualties = [];
    this.discoveredIds.clear();

    // Draw search polygon
    const polygon = L.polygon(polygonVertices, {
      color: '#0284C7',
      weight: 2,
      fillColor: '#00E5FF',
      fillOpacity: 0.12,
      dashArray: '6, 6'
    });
    this.searchZoneLayer.addLayer(polygon);

    // Start autonomous drone flight patrol
    this.startDronePatrol(polygonVertices);
  }

  // Autonomous Drone Flight Simulation
  startDronePatrol(polygonVertices) {
    if (this.droneInterval) clearInterval(this.droneInterval);

    this.droneFlightPath = this.generateSearchGrid(polygonVertices);
    this.droneCurrentIndex = 0;

    if (this.droneMarker) {
      this.map.removeLayer(this.droneMarker);
    }

    // Drone Icon
    const droneIcon = L.divIcon({
      className: 'drone-active-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full border border-cyan-400/50 animate-ping"></div>
          <div class="relative w-9 h-9 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-2xl">
            <svg class="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
            </svg>
          </div>
          <div class="absolute -top-7 bg-slate-900/95 text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded border border-slate-700 shadow whitespace-nowrap">
            UAV-PATROL-01
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    this.droneMarker = L.marker(this.droneFlightPath[0], { icon: droneIcon }).addTo(this.map);

    // Update Status HUD
    const statusHud = document.getElementById('mapDroneStatusHud');
    if (statusHud) {
      statusHud.classList.remove('hidden');
      statusHud.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <div>
            <div class="font-bold text-xs text-slate-900 font-heading">Drone Active — Scanning Marked Search Area</div>
            <div class="text-[11px] font-mono text-slate-500">Alt: 48.5m AGL | Speed: 22 km/h | Mode: 4K Optical + FLIR Radiometric</div>
          </div>
        </div>
      `;
    }

    // Drone Motion Loop & Casualty Proximity Discovery
    this.droneInterval = setInterval(() => {
      this.droneCurrentIndex = (this.droneCurrentIndex + 1) % this.droneFlightPath.length;
      const currentPos = this.droneFlightPath[this.droneCurrentIndex];
      
      if (this.droneMarker) {
        this.droneMarker.setLatLng(currentPos);
      }

      // Check proximity to undiscovered casualties in this sector
      this.checkCasualtyDiscovery(currentPos);
    }, 220);
  }

  generateSearchGrid(pts) {
    const path = [];
    const steps = 24;

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

  // Real-Time Discovery & Capture of Casualties in Marked Zone
  checkCasualtyDiscovery(dronePos) {
    const sector = DISASTER_SECTORS[this.currentSector];
    if (!sector || !sector.casualties) return;

    sector.casualties.forEach(cas => {
      if (this.discoveredIds.has(cas.id)) return;

      const dist = Math.hypot(dronePos[0] - cas.lat, dronePos[1] - cas.lng);

      // Trigger capture if drone is within proximity
      if (dist < 0.008) {
        this.captureCasualty(cas);
      }
    });
  }

  captureCasualty(cas) {
    this.discoveredIds.add(cas.id);
    this.capturedCasualties.unshift(cas);

    // Play subtle audio ping
    if (window.AapdaApp && window.AapdaApp.audioCtx) {
      try {
        const osc = window.AapdaApp.audioCtx.createOscillator();
        const gain = window.AapdaApp.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(window.AapdaApp.audioCtx.destination);
        osc.frequency.setValueAtTime(880, window.AapdaApp.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, window.AapdaApp.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, window.AapdaApp.audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(window.AapdaApp.audioCtx.currentTime + 0.15);
      } catch (e) {}
    }

    // Render Pin & Uncertainty Circle on map
    this.renderCasualtyPin(cas);

    // Update Captured Casualties Queue UI
    this.renderCasualtiesQueue();
  }

  renderCasualtyPin(cas) {
    const priorityHex = cas.priority === 'CRITICAL' ? '#EF4444' : (cas.priority === 'HIGH' ? '#F97316' : '#F59E0B');

    // 1. Mandatory Uncertainty Radius Circle
    const circle = L.circle([cas.lat, cas.lng], {
      radius: cas.uncertaintyMeters,
      color: priorityHex,
      weight: 1.5,
      opacity: 0.8,
      fillColor: priorityHex,
      fillOpacity: 0.15,
      dashArray: '4, 4'
    });
    circle.bindTooltip(`<span class="font-mono text-xs font-bold">${cas.id} Uncertainty: ±${cas.uncertaintyMeters}m</span>`);
    this.circlesLayer.addLayer(circle);

    // 2. High-Contrast Pin
    const pinIcon = L.divIcon({
      className: 'casualty-pin',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <div class="absolute w-7 h-7 rounded-full animate-ping opacity-60" style="background-color: ${priorityHex}"></div>
          <div class="relative w-8 h-8 rounded-full border-2 border-slate-900 shadow-lg flex items-center justify-center" style="background-color: ${priorityHex}">
            <span class="text-[10px] font-mono font-bold text-white">${cas.priority[0]}</span>
          </div>
          <div class="absolute -bottom-6 bg-slate-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow text-white whitespace-nowrap">
            ${cas.id} (±${cas.uncertaintyMeters}m)
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([cas.lat, cas.lng], { icon: pinIcon });
    marker.on('click', () => this.inspectCasualty(cas.id));
    this.markersLayer.addLayer(marker);
  }

  renderCasualtiesQueue() {
    const list = document.getElementById('capturedCasualtiesList');
    const counterBadge = document.getElementById('capturedCountBadge');
    
    if (counterBadge) {
      counterBadge.textContent = `${this.capturedCasualties.length} Captured`;
    }

    if (!list) return;

    if (this.capturedCasualties.length === 0) {
      list.innerHTML = `
        <div class="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
          <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <i data-lucide="scan" class="w-4 h-4"></i>
          </div>
          <div>Drone is sweeping the marked zone...</div>
          <div class="text-[11px] text-slate-500">Casualties discovered along the flight corridor will appear here instantly.</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    list.innerHTML = this.capturedCasualties.map(c => {
      const priorityClass = c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : (c.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-amber-100 text-amber-700 border-amber-200');

      return `
        <div class="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm transition space-y-3 cursor-pointer" onclick="window.AapdaMissionsMap.inspectCasualty('${c.id}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityClass}">
                ${c.priority}
              </span>
              <span class="text-xs font-mono font-bold text-slate-800">${c.id}</span>
            </div>
            <span class="text-[11px] font-mono text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded">
              ${c.confidence}% Conf
            </span>
          </div>

          <div>
            <h4 class="text-sm font-bold text-slate-900">${c.title}</h4>
            <p class="text-xs text-slate-600 mt-0.5 line-clamp-2">${c.notes}</p>
          </div>

          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 font-mono text-[11px] space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-400">GPS Coordinates:</span>
              <span class="text-slate-900 font-bold">${c.coordinates}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Uncertainty Radius:</span>
              <span class="text-amber-600 font-bold">±${c.uncertaintyMeters} meters</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 text-xs">
            <span class="text-slate-400 font-mono">${c.immobility}</span>
            <button onclick="event.stopPropagation(); window.AapdaMissionsMap.verifyCasualty('${c.id}')" class="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-[11px] transition">
              ${c.verified ? '✓ Verified' : 'Verify & Dispatch →'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  inspectCasualty(casId) {
    const cas = this.capturedCasualties.find(c => c.id === casId);
    if (!cas) return;

    this.selectedCasualtyId = casId;
    this.map.flyTo([cas.lat, cas.lng], 16, { duration: 1.0 });

    const drawer = document.getElementById('mapCasualtyInspectorDrawer');
    if (!drawer) return;

    const priorityClass = cas.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200';

    drawer.innerHTML = `
      <div class="p-5 flex flex-col justify-between h-full space-y-4 overflow-y-auto">
        <div class="space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${priorityClass}">
                ${cas.priority}
              </span>
              <span class="font-mono text-sm font-bold text-slate-900">${cas.id}</span>
            </div>
            <button onclick="window.AapdaMissionsMap.closeInspectorDrawer()" class="text-slate-400 hover:text-slate-800 text-base">✕</button>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-900 font-heading">${cas.title}</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">${cas.notes}</p>
          </div>

          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-xs space-y-2">
            <div class="text-[10px] font-bold text-slate-400 uppercase">GPS Precision Buffer</div>
            <div class="flex justify-between">
              <span class="text-slate-500">Location:</span>
              <span class="text-slate-900 font-bold">${cas.coordinates}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Uncertainty Buffer:</span>
              <span class="text-amber-600 font-bold">±${cas.uncertaintyMeters} meters</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Confidence:</span>
              <span class="text-blue-600 font-bold">${cas.confidence}%</span>
            </div>
          </div>

          <div class="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <span>⚠️</span> Environmental Hazard Flag
            </div>
            <div class="text-[11px] leading-relaxed">${cas.hazard}</div>
          </div>

        </div>

        <div class="pt-3 border-t border-slate-200 space-y-2">
          <button onclick="window.AapdaMissionsMap.verifyCasualty('${cas.id}')" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl font-heading transition">
            ${cas.verified ? '✓ Operator Verified' : 'Confirm Human Verification'}
          </button>
          <button onclick="window.AapdaMissionsMap.dispatchUnit('${cas.id}')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl font-heading transition">
            ${cas.dispatched ? '⚡ SAR Boat Unit Deployed' : 'Dispatch SAR Watercraft Unit →'}
          </button>
        </div>

      </div>
    `;

    drawer.classList.remove('translate-x-full');
  }

  closeInspectorDrawer() {
    const drawer = document.getElementById('mapCasualtyInspectorDrawer');
    if (drawer) drawer.classList.add('translate-x-full');
  }

  verifyCasualty(casId) {
    const cas = this.capturedCasualties.find(c => c.id === casId);
    if (cas) {
      cas.verified = true;
      this.renderCasualtiesQueue();
      this.inspectCasualty(casId);
    }
  }

  dispatchUnit(casId) {
    const cas = this.capturedCasualties.find(c => c.id === casId);
    if (cas) {
      cas.dispatched = true;
      cas.verified = true;
      alert(`SAR Rescue Unit Dispatched to ${cas.id} at ${cas.coordinates} (±${cas.uncertaintyMeters}m)! Target telemetry transmitted to responder HUD.`);
      this.renderCasualtiesQueue();
      this.inspectCasualty(casId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaMissionsMap = new DroneMissionMapModule();
  window.AapdaMissionsMap.init();
});
