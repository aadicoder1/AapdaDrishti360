// AapdaDrishti - "We Could Analyze That Disaster" Interactive Simulator
// Preset Scenarios + Real-Time Custom Disaster Query Analyzer (Type Any Scenario)

const DISASTER_ANALYSIS_DATA = {
  flood: {
    id: "flood",
    title: "Urban & Riverine Floods",
    subtitle: "e.g. Assam Brahmaputra, Delhi Yamuna Basin",
    icon: "🌊",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    whatDroneSees: "4K Optical Video + Radiometric FLIR Water Inundation mapping.",
    whatAiSpots: "Survivors stranded on vehicle roofs, people clinging to banyan trees, rising water speed (3.4 knots), and submerged electrical hazards.",
    gpsPrecision: "26.14450° N, 91.73620° E (±14m buffer circle)",
    rescueAction: "Directly dispatches NDRF inflatable rescue boats with live coordinate navigation.",
    presetVideo: "assam_flood"
  },
  earthquake: {
    id: "earthquake",
    title: "Earthquake & Building Collapse",
    subtitle: "e.g. Urban Concrete Pancake Slabs & Rubble Voids",
    icon: "🏢",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    whatDroneSees: "High-Resolution Zoom + Thermal Micro-Vibration probes.",
    whatAiSpots: "Waving hand gestures through 40cm slab openings, void space structural survivability, and trapped survivors beneath debris.",
    gpsPrecision: "37.58580° N, 36.93710° E (±10m buffer circle)",
    rescueAction: "Alerts Urban Search & Rescue (USAR) acoustic listening and hydraulic breaker teams.",
    presetVideo: "night_uav"
  },
  fire: {
    id: "fire",
    title: "Forest & Industrial Night Fires",
    subtitle: "e.g. Uttarakhand Pine Reserves & Factory Smoke",
    icon: "🔥",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
    whatDroneSees: "FLIR Radiometric Long-Wave Infrared (LWIR 8-14µm White-Hot).",
    whatAiSpots: "Isolates 37.2°C human core body heat signatures through pitch darkness and dense smoke plumes where human eyes see nothing.",
    gpsPrecision: "29.59850° N, 79.66100° E (±12m buffer circle)",
    rescueAction: "Transmits coordinates to helicopter winch teams and forest emergency squads.",
    presetVideo: "night_uav"
  },
  landslide: {
    id: "landslide",
    title: "Mountain Landslides & Avalanches",
    subtitle: "e.g. Wayanad Highland Debris & Mudslides",
    icon: "⛰️",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    whatDroneSees: "4K Telephoto Lens + Digital Elevation Terrain Models.",
    whatAiSpots: "Isolated plantation workers sheltered on retaining walls, impassable mudflow blockages, and safe dry evacuation routes.",
    gpsPrecision: "11.68540° N, 76.13200° E (±15m buffer circle)",
    rescueAction: "Drops emergency drone supply kits and directs SDRF mountain extrication teams.",
    presetVideo: "assam_flood"
  },
  cyclone: {
    id: "cyclone",
    title: "Cyclones & Coastal Storm Surges",
    subtitle: "e.g. Odisha & Bengal Coastal Embankments",
    icon: "🌀",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    whatDroneSees: "All-Weather Synthetic Aperture Radar (SAR) & Optical feeds.",
    whatAiSpots: "Fishermen stranded in mangrove tree pockets, flooded storm shelter foundations, and high-tide breached sea dykes.",
    gpsPrecision: "19.81350° N, 85.83120° E (±18m buffer circle)",
    rescueAction: "Guides coastal hovercraft units and disaster response cutters directly to coordinates.",
    presetVideo: "assam_flood"
  }
};

class DisasterAnalyzerModule {
  constructor() {
    this.activeDisaster = 'flood';
  }

  selectDisaster(type) {
    if (!DISASTER_ANALYSIS_DATA[type]) return;
    this.activeDisaster = type;
    const data = DISASTER_ANALYSIS_DATA[type];

    // Clear custom input field
    const input = document.getElementById('customDisasterInput');
    if (input) input.value = '';

    // Update buttons
    document.querySelectorAll('.disaster-pill-btn').forEach(btn => {
      if (btn.dataset.disaster === type) {
        btn.classList.add('bg-slate-900', 'text-white', 'shadow-md');
        btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
      } else {
        btn.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      }
    });

    this.renderResultCard(data);
  }

  analyzeCustomQuery(customText) {
    const text = (customText || '').trim();
    if (!text) return;

    // Deselect pills
    document.querySelectorAll('.disaster-pill-btn').forEach(btn => {
      btn.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
      btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
    });

    const lower = text.toLowerCase();
    let icon = "🛡️";
    let isThermal = lower.includes("fire") || lower.includes("smoke") || lower.includes("night") || lower.includes("dark") || lower.includes("heat") || lower.includes("burn");
    let isWater = lower.includes("flood") || lower.includes("water") || lower.includes("river") || lower.includes("rain") || lower.includes("cyclone") || lower.includes("lake") || lower.includes("sea") || lower.includes("boat");
    let isMountain = lower.includes("slide") || lower.includes("mountain") || lower.includes("hill") || lower.includes("avalanche") || lower.includes("snow");
    let isQuake = lower.includes("quake") || lower.includes("collapse") || lower.includes("building") || lower.includes("rubble") || lower.includes("void");

    if (isWater) icon = "🌊";
    else if (isThermal) icon = "🔥";
    else if (isMountain) icon = "⛰️";
    else if (isQuake) icon = "🏢";

    const customData = {
      id: "custom",
      title: `Custom Analysis: "${text}"`,
      subtitle: "Dynamic AI Tactical Flight & Extraction Model",
      icon: icon,
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      whatDroneSees: isThermal 
        ? "FLIR Radiometric Thermal (LWIR 8-14µm) + 4K Optical with optical smoke penetration filter."
        : (isWater ? "4K Optical High-Frame Inundation Sensor + Multi-spectral water line tracking." : "4K Telephoto Lens + Digital Elevation 3D Contour Raycasting."),
      whatAiSpots: `Custom inference isolates human distress silhouettes, tracks movement duration, evaluates ambient hazard parameters, and calculates Ground GPS coordinates.`,
      gpsPrecision: `Calculated Target Sector ±14m Uncertainty Buffer`,
      rescueAction: `Generates NDMA CAP v1.2 incident payload and dispatches nearest SDRF / 112 emergency response unit with live telemetry vector.`,
      presetVideo: isThermal ? "night_uav" : "assam_flood"
    };

    this.renderResultCard(customData);
  }

  setPresetPrompt(promptText) {
    const input = document.getElementById('customDisasterInput');
    if (input) {
      input.value = promptText;
      this.analyzeCustomQuery(promptText);
    }
  }

  renderResultCard(data) {
    const panel = document.getElementById('disasterAnalysisResultCard');
    if (!panel) return;

    panel.innerHTML = `
      <div class="space-y-6 animate-float-delayed">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${data.icon}</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${data.badgeColor}">
                  DISASTER INTELLIGENCE MODEL
                </span>
                <span class="text-xs font-mono text-slate-500">${data.subtitle}</span>
              </div>
              <h3 class="text-xl font-bold text-slate-900 font-heading mt-1">${data.title}</h3>
            </div>
          </div>
          <button onclick="window.AapdaDisasterAnalyzer.launchAnalysisVideo('${data.presetVideo}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 self-start sm:self-auto">
            <span>▶</span> Run in Live Video Feed
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <!-- Column 1: What Drone Sees -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div class="text-[11px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <span>📷</span> 1. Drone Sensors Deployed
            </div>
            <p class="text-xs text-slate-700 leading-relaxed">${data.whatDroneSees}</p>
          </div>

          <!-- Column 2: What AI Spots -->
          <div class="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
            <div class="text-[11px] font-mono font-bold text-blue-700 uppercase flex items-center gap-1.5">
              <span>🧠</span> 2. What AI Analyzes (&lt;5s)
            </div>
            <p class="text-xs text-blue-950 font-medium leading-relaxed">${data.whatAiSpots}</p>
          </div>

          <!-- Column 3: Rescue Action -->
          <div class="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
            <div class="text-[11px] font-mono font-bold text-emerald-700 uppercase flex items-center gap-1.5">
              <span>🚁</span> 3. Life-Saving Rescue Action
            </div>
            <p class="text-xs text-emerald-950 font-medium leading-relaxed">${data.rescueAction}</p>
            <div class="text-[10px] font-mono text-emerald-700 pt-1 font-bold">
              Precision: ${data.gpsPrecision}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  launchAnalysisVideo(presetKey) {
    if (window.AapdaShowcase) {
      window.AapdaShowcase.loadPreset(presetKey);
    }
    const showcaseSection = document.getElementById('showcase');
    if (showcaseSection) {
      showcaseSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaDisasterAnalyzer = new DisasterAnalyzerModule();
  window.AapdaDisasterAnalyzer.selectDisaster('flood');
});
