// AapdaDrishti - NDMA / ITU-T CAP v1.2 & GeoJSON Standard Incident Exporter
// Multi-Agency Disaster Management and 112 ERSS Standard Interoperability

class CapExporterModule {
  constructor() {
    this.createCapModal();
  }

  createCapModal() {
    if (document.getElementById('capExportModal')) return;

    const modal = document.createElement('div');
    modal.id = 'capExportModal';
    modal.className = 'hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4';

    modal.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-8 shadow-2xl space-y-5 relative max-h-[90vh] flex flex-col">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              CAP
            </span>
            <div>
              <h3 class="text-base font-bold text-slate-900 font-heading">NDMA / ITU-T CAP v1.2 & GeoJSON Incident Export</h3>
              <p class="text-xs text-slate-500 font-mono">Standardized multi-agency disaster alert payload for emergency response</p>
            </div>
          </div>
          <button onclick="window.AapdaCapExporter.closeCapModal()" class="text-slate-400 hover:text-slate-900 text-lg">✕</button>
        </div>

        <div class="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-mono">
          <button onclick="window.AapdaCapExporter.setCapTab('json')" id="tabCapJson" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold">
            GeoJSON & CAP JSON
          </button>
          <button onclick="window.AapdaCapExporter.setCapTab('xml')" id="tabCapXml" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
            CAP XML Protocol
          </button>
        </div>

        <div class="flex-1 overflow-y-auto bg-slate-950 text-cyan-300 p-4 rounded-2xl font-mono text-xs max-h-[380px] select-all leading-relaxed" id="capCodePreview">
          <!-- Code injected dynamically -->
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-200 text-xs font-mono">
          <span class="text-slate-500">Ready for 112 ERSS & State Emergency Operations Centers</span>
          <div class="flex gap-2">
            <button onclick="window.AapdaCapExporter.copyCapPayload()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition">
              📋 Copy Payload
            </button>
            <button onclick="window.AapdaCapExporter.downloadCapFile()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow">
              ⬇ Download File
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
  }

  openCapModal() {
    const modal = document.getElementById('capExportModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.setCapTab('json');
    }
  }

  closeCapModal() {
    const modal = document.getElementById('capExportModal');
    if (modal) modal.classList.add('hidden');
  }

  setCapTab(tab) {
    const tabJson = document.getElementById('tabCapJson');
    const tabXml = document.getElementById('tabCapXml');
    const preview = document.getElementById('capCodePreview');

    if (tab === 'json') {
      if (tabJson) { tabJson.classList.add('bg-slate-900', 'text-white'); tabJson.classList.remove('bg-slate-100', 'text-slate-600'); }
      if (tabXml) { tabXml.classList.remove('bg-slate-900', 'text-white'); tabXml.classList.add('bg-slate-100', 'text-slate-600'); }
      
      const payload = {
        type: "FeatureCollection",
        standard: "NDMA / ITU-T X.1303 CAP v1.2",
        generator: "AapdaDrishti AI Rescue OS (Edge-v2.4)",
        timestamp: new Date().toISOString(),
        incident: {
          identifier: "INC-2026-ASSAM-SAR-004",
          urgency: "Immediate",
          severity: "Extreme",
          certainty: "Observed (YOLOv9-SAR 98.1%)",
          event: "Flood Extrication & Survivor Extraction"
        },
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [91.73620, 26.14450]
            },
            properties: {
              trackId: "TRK-104",
              priority: "CRITICAL",
              confidence: 0.968,
              uncertaintyMeters: 14,
              bodyTemperatureCelsius: 36.9,
              locationDescription: "Survivor on roof of submerged commercial van",
              responderUnitDispatched: "SDRF Watercraft Team 03"
            }
          },
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [79.66100, 29.59850]
            },
            properties: {
              trackId: "TRK-208",
              priority: "CRITICAL",
              confidence: 0.981,
              uncertaintyMeters: 12,
              bodyTemperatureCelsius: 37.2,
              locationDescription: "Thermal heat anomaly on rocky ridge (night_uav.mp4)",
              sensor: "FLIR Radiometric LWIR (8-14µm)"
            }
          }
        ]
      };
      if (preview) preview.textContent = JSON.stringify(payload, null, 2);
    } else {
      if (tabXml) { tabXml.classList.add('bg-slate-900', 'text-white'); tabXml.classList.remove('bg-slate-100', 'text-slate-600'); }
      if (tabJson) { tabJson.classList.remove('bg-slate-900', 'text-white'); tabJson.classList.add('bg-slate-100', 'text-slate-600'); }
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>NDMA-AAPDA-2026-0821-001</identifier>
  <sender>uav-edge-01@ndrf.gov.in</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Restricted</scope>
  <info>
    <category>Rescue</category>
    <event>Survivor Detected via Edge AI</event>
    <urgency>Immediate</urgency>
    <severity>Extreme</severity>
    <certainty>Observed</certainty>
    <headline>Critical Survivor Trapped in Flood Current</headline>
    <description>YOLOv9-SAR and FLIR Thermal identified trapped individual with 98.1% confidence at Ground GPS 26.14450 N, 91.73620 E (±14m buffer).</description>
    <area>
      <areaDesc>Assam Brahmaputra Basin Sector 4</areaDesc>
      <circle>26.14450,91.73620,0.014</circle>
    </area>
  </info>
</alert>`;
      if (preview) preview.textContent = xmlPayload;
    }
  }

  copyCapPayload() {
    const preview = document.getElementById('capCodePreview');
    if (preview) {
      navigator.clipboard.writeText(preview.textContent).then(() => {
        alert("CAP / GeoJSON Incident Payload copied to clipboard!");
      });
    }
  }

  downloadCapFile() {
    const preview = document.getElementById('capCodePreview');
    if (!preview) return;
    const text = preview.textContent;
    const isJson = text.trim().startsWith('{');
    const filename = isJson ? "AapdaDrishti_CAP_GeoJSON.json" : "AapdaDrishti_CAP_Alert.xml";
    const mime = isJson ? "application/json" : "application/xml";

    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaCapExporter = new CapExporterModule();
});
