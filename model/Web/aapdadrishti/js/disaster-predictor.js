// AapdaDrishti - AI Disaster Predictor & Early Warning Engine
// Hydrological Inundation, Soil Saturation Slope Slip & Thermal Fire Spread Forecasting

const PREDICTOR_REGIONS = {
  assam: {
    id: "assam",
    name: "Brahmaputra Basin, Assam",
    disasterType: "Riverine Flood & Inundation",
    icon: "🌊",
    currentRisk: "CRITICAL",
    riskPercent: 88,
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    vulnerablePop: "42,500 Residents",
    primaryThreat: "Upstream Arunachal cloudburst causing +2.4m crest wave",
    timelineHours: 7.5,
    forecastMetrics: {
      waterCrest: "+2.4m above danger level",
      currentVelocity: "4.2 knots",
      breachVulnerability: "92% along Majuli & Dhubri dykes",
      earlyAction: "Pre-position 6x UAV mesh pods and 8x NDRF inflatable motorboats at Sector 3."
    }
  },
  wayanad: {
    id: "wayanad",
    name: "Wayanad Highlands, Kerala",
    disasterType: "Mountain Landslide & Debris Avalanche",
    icon: "⛰️",
    currentRisk: "HIGH",
    riskPercent: 76,
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    vulnerablePop: "18,200 Residents",
    primaryThreat: "Continuous monsoon precipitation reaching 91.8% soil saturation",
    timelineHours: 12.0,
    forecastMetrics: {
      waterCrest: "Soil Saturation: 91.8%",
      currentVelocity: "Slope Shear Stress: 84 kPa",
      breachVulnerability: "High slip probability in Meppadi & Chooralmala",
      earlyAction: "Issue preemptive tea estate evacuation advisory; establish aerial supply corridor."
    }
  },
  uttarakhand: {
    id: "uttarakhand",
    name: "Almora & Chamoli Pine Belt, Uttarakhand",
    disasterType: "High-Altitude Forest Fire Complex",
    icon: "🔥",
    currentRisk: "VERY HIGH",
    riskPercent: 82,
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    vulnerablePop: "9,600 Forest Inhabitants",
    primaryThreat: "Dry pine needle biomass + 34 km/h northwest wind velocity",
    timelineHours: 5.0,
    forecastMetrics: {
      waterCrest: "Biomass Fuel Moisture: 7.1% (Extreme)",
      currentVelocity: "Wind Spread Vector: 34 km/h NW",
      breachVulnerability: "Fire perimeter advancing towards residential ridgeline",
      earlyAction: "Launch thermal night reconnaissance UAVs to guide tactical bulldozers for firebreak creation."
    }
  },
  odisha: {
    id: "odisha",
    name: "Puri Coastal Belt, Odisha",
    disasterType: "Coastal Cyclone & Storm Surge",
    icon: "🌀",
    currentRisk: "HIGH",
    riskPercent: 71,
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    vulnerablePop: "64,000 Coastal Residents",
    primaryThreat: "Category-3 Cyclone landfall coinciding with spring high-tide",
    timelineHours: 16.0,
    forecastMetrics: {
      waterCrest: "Storm Surge: +3.8m above MSL",
      currentVelocity: "Gale Gusts: 135 km/h",
      breachVulnerability: "Saltwater intrusion into 14 low-lying villages",
      earlyAction: "Pre-deploy autonomous COFDM emergency communication repeaters at multi-purpose cyclone shelters."
    }
  }
};

class DisasterPredictorModule {
  constructor() {
    this.selectedRegion = 'assam';
    this.forecastHours = 6;
    this.init();
  }

  init() {
    this.renderRegionTabs();
    this.showPrediction(this.selectedRegion);
    this.initSlider();
  }

  renderRegionTabs() {
    const container = document.getElementById('predictorRegionTabs');
    if (!container) return;

    container.innerHTML = Object.values(PREDICTOR_REGIONS).map(r => `
      <button class="predictor-tab-btn px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 ${r.id === this.selectedRegion ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'}" onclick="window.AapdaPredictor.showPrediction('${r.id}')" id="predTab_${r.id}">
        <span>${r.icon}</span> ${r.name.split(',')[0]}
      </button>
    `).join('');
  }

  initSlider() {
    const slider = document.getElementById('predictorHourSlider');
    const label = document.getElementById('predictorHourDisplay');

    if (slider && label) {
      slider.addEventListener('input', (e) => {
        this.forecastHours = parseFloat(e.target.value);
        label.textContent = `${this.forecastHours}h Forecast Window`;
        this.updateDynamicForecast();
      });
    }
  }

  showPrediction(regionId) {
    if (!PREDICTOR_REGIONS[regionId]) return;
    this.selectedRegion = regionId;
    const reg = PREDICTOR_REGIONS[regionId];

    // Update tab styles
    document.querySelectorAll('.predictor-tab-btn').forEach(btn => {
      btn.classList.remove('bg-slate-900', 'text-white', 'shadow-md');
      btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
    });

    const activeTab = document.getElementById(`predTab_${regionId}`);
    if (activeTab) {
      activeTab.classList.add('bg-slate-900', 'text-white', 'shadow-md');
      activeTab.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
    }

    this.updateDynamicForecast();
  }

  updateDynamicForecast() {
    const reg = PREDICTOR_REGIONS[this.selectedRegion];
    const container = document.getElementById('predictorResultCard');
    if (!container) return;

    // Calculate dynamic risk scaling based on hours slider
    const hourFactor = Math.min(1.25, Math.max(0.7, (this.forecastHours / 12) + 0.6));
    const dynamicRisk = Math.min(99, Math.round(reg.riskPercent * hourFactor));
    const isCritical = dynamicRisk >= 80;

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header Info -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${reg.icon}</span>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${isCritical ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}">
                  ${isCritical ? 'CRITICAL RISK LEVEL' : 'HIGH RISK LEVEL'} (${dynamicRisk}% Probability)
                </span>
                <span class="text-xs font-mono text-slate-500">${reg.disasterType}</span>
              </div>
              <h3 class="text-xl font-bold text-slate-900 font-heading mt-1">${reg.name}</h3>
            </div>
          </div>

          <div class="text-right self-start sm:self-auto font-mono text-xs">
            <div class="text-slate-400 text-[10px] uppercase">Vulnerable Population:</div>
            <div class="text-slate-900 font-bold text-sm">${reg.vulnerablePop}</div>
          </div>
        </div>

        <!-- Primary Threat Banner -->
        <div class="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-1">
          <div class="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Early Warning AI Assessment (T-${this.forecastHours}h Forecast):
          </div>
          <p class="text-xs text-slate-300 leading-relaxed font-sans">${reg.primaryThreat}.</p>
        </div>

        <!-- 4 Forecast Telemetry Metrics Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-slate-400 text-[10px] block uppercase">Hazard Magnitude:</span>
            <span class="text-slate-900 font-bold text-sm block">${reg.forecastMetrics.waterCrest}</span>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-slate-400 text-[10px] block uppercase">Velocity / Dynamics:</span>
            <span class="text-blue-600 font-bold text-sm block">${reg.forecastMetrics.currentVelocity}</span>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-slate-400 text-[10px] block uppercase">Critical Failure Zone:</span>
            <span class="text-amber-600 font-bold text-xs block">${reg.forecastMetrics.breachVulnerability}</span>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <span class="text-slate-400 text-[10px] block uppercase">Time to Peak Impact:</span>
            <span class="text-red-600 font-bold text-sm block">T-${Math.max(1, (reg.timelineHours - (this.forecastHours * 0.4)).toFixed(1))} Hours</span>
          </div>

        </div>

        <!-- Preemptive Life-Saving Action Plan -->
        <div class="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-emerald-800 uppercase flex items-center gap-1.5">
              <span>🛡️</span> Preemptive Life-Saving Recommendation for Commanders
            </span>
            <span class="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Automated Advisory</span>
          </div>
          <p class="text-xs text-emerald-950 font-medium leading-relaxed font-sans">${reg.forecastMetrics.earlyAction}</p>
        </div>

      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaPredictor = new DisasterPredictorModule();
});
