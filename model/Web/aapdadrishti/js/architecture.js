// AapdaDrishti - Interactive 8-Stage Platform Architecture Pipeline (Section 5)

const ARCHITECTURE_STAGES = [
  {
    id: 1,
    title: "Camera Feed Ingestion",
    subtitle: "RTSP / HDMI / SDI",
    latency: "12ms",
    description: "Ingests raw 4K 60FPS optical RGB video and radiometric FLIR long-wave infrared (LWIR) streams via encrypted low-latency COFDM mesh or 5G edge relays.",
    specifications: [
      "Formats: H.265 / H.264 / RAW Radiometric",
      "Sensor Compatibility: DJI Matrice, Autel EVO Max, Teledyne FLIR, Skydio",
      "Hardware Acceleration: NVDEC / VPI Zero-Copy Pipeline"
    ]
  },
  {
    id: 2,
    title: "YOLO AI Detection",
    subtitle: "Custom YOLOv9-SAR",
    latency: "24ms",
    description: "Custom-trained lightweight vision transformer optimized for high-altitude human silhouettes, occluded limbs, waving gestures, and thermal anomalies in extreme weather.",
    specifications: [
      "Precision: 98.2% mAP@0.5 on disaster aerial benchmarks",
      "Inference Speed: 42 FPS on NVIDIA Jetson Orin Nano (15W)",
      "Multi-Class: Human, Vehicle, Vessel, Structural Void, Thermal Hit"
    ]
  },
  {
    id: 3,
    title: "ByteTrack Tracking",
    subtitle: "Persistent ID Association",
    latency: "8ms",
    description: "Associates detections across consecutive frames to assign persistent tracking IDs (`TRK-104`), maintaining survivor lock even through severe camera panning or temporary tree occlusions.",
    specifications: [
      "Kalman Filter Motion Estimation + IoU Association",
      "Re-identification: Feature vector embedding cosine similarity",
      "Occlusion Resilience: Retains ID lock up to 180 dropped frames"
    ]
  },
  {
    id: 4,
    title: "Duplicate Removal",
    subtitle: "Spatial-Temporal NMS",
    latency: "6ms",
    description: "Filters repeated alerts from overlapping drone flight passes over the same coordinates, ensuring rescue teams receive clean, deduplicated incident counts.",
    specifications: [
      "3D Spatial Clustered Non-Maximum Suppression",
      "Temporal Geo-fencing: Prevents re-alerting on known targets",
      "Bandwidth Conservation: Decreases telemetry overhead by 84%"
    ]
  },
  {
    id: 5,
    title: "Evidence Selection",
    subtitle: "Optimal Keyframe Capture",
    latency: "14ms",
    description: "Automatically selects and crops the highest-resolution, sharpest evidence photo with minimal motion blur, attaching forensic metadata and thermal delta scores.",
    specifications: [
      "Laplacian Blur Score Optimization",
      "Optical + FLIR Dual Frame Alignment",
      "Automated Geo-tag and EXIF 2.31 Cryptographic Hash"
    ]
  },
  {
    id: 6,
    title: "Location Estimation",
    subtitle: "Raycast GPS + Uncertainty",
    latency: "18ms",
    description: "Calculates precise ground coordinates by projecting drone GNSS position, barometric altitude, gimbal pitch/yaw, and DEM elevation models, attaching an honest uncertainty radius.",
    specifications: [
      "Digital Elevation Model (DEM) Ray-Triangle Intersection",
      "Uncertainty Modeling: Dilution of Precision (DOP) + Optical Parallax",
      "Output Format: WGS84 Decimal Degrees (e.g. 28.69820° N, 77.23410° E ±14m)"
    ]
  },
  {
    id: 7,
    title: "Priority Scoring",
    subtitle: "Explainable Triage Matrix",
    latency: "9ms",
    description: "Synthesizes immobility duration, vital sign gestures, rising flood levels, fire temperature proximity, and structural stability into an explainable urgency rating.",
    specifications: [
      "Classifications: CRITICAL (Red), HIGH (Orange), MEDIUM (Amber), LOW (Green)",
      "Multi-Hazard Factor: Proximity to fast current, fire plume, live power",
      "Explainable AI: Outputs weighted score breakdown for commanders"
    ]
  },
  {
    id: 8,
    title: "Rescue Command Center",
    subtitle: "Human Verification & Dispatch",
    latency: "15ms",
    description: "Delivers live interactive triage cards and geospatial pins to emergency operations centers, requiring explicit operator sign-off before dispatching rescue assets.",
    specifications: [
      "Protocol Support: CAP (Common Alerting Protocol), Cursor-on-Target (CoT)",
      "Mesh Relay to Field SAR Radios & ATAK Tactical Terminals",
      "Full Forensic Audit Logging for Post-Disaster Inquiry"
    ]
  }
];

class ArchitecturePipelineModule {
  constructor() {
    this.selectedStageId = 1;
    this.init();
  }

  init() {
    this.renderNodes();
    this.showStageDetails(1);
  }

  renderNodes() {
    const container = document.getElementById('architectureNodesContainer');
    if (!container) return;

    container.innerHTML = ARCHITECTURE_STAGES.map((stage, idx) => `
      <div class="arch-node group cursor-pointer p-4 rounded-xl border transition-all duration-200 ${stage.id === this.selectedStageId ? 'bg-blue-50/80 border-blue-500 shadow-md ring-1 ring-blue-400' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}" onclick="window.AapdaArch.showStageDetails(${stage.id})" id="archNode_${stage.id}">
        <div class="flex items-center justify-between mb-2">
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${stage.id === this.selectedStageId ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}">
            ${stage.id}
          </span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            ${stage.latency}
          </span>
        </div>
        <h4 class="text-xs font-bold text-slate-900 font-heading mb-0.5">${stage.title}</h4>
        <div class="text-[11px] font-mono text-slate-500">${stage.subtitle}</div>
      </div>
    `).join('');
  }

  showStageDetails(stageId) {
    this.selectedStageId = stageId;
    const stage = ARCHITECTURE_STAGES.find(s => s.id === stageId) || ARCHITECTURE_STAGES[0];

    // Update node active states
    document.querySelectorAll('.arch-node').forEach(node => {
      node.classList.remove('bg-blue-50/80', 'border-blue-500', 'shadow-md', 'ring-1', 'ring-blue-400');
      node.classList.add('bg-white', 'border-slate-200');
    });

    const activeNode = document.getElementById(`archNode_${stageId}`);
    if (activeNode) {
      activeNode.classList.add('bg-blue-50/80', 'border-blue-500', 'shadow-md', 'ring-1', 'ring-blue-400');
      activeNode.classList.remove('bg-white', 'border-slate-200');
    }

    // Render detailed panel
    const detailContainer = document.getElementById('architectureDetailPanel');
    if (!detailContainer) return;

    detailContainer.innerHTML = `
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 text-blue-800">
                STAGE 0${stage.id} OF 08
              </span>
              <span class="text-xs font-mono text-slate-500">Pipeline Latency: ${stage.latency}</span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 font-heading mt-1">${stage.title}</h3>
          </div>
          <span class="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            End-to-End Budget: &lt;100ms
          </span>
        </div>

        <p class="text-sm text-slate-600 leading-relaxed">${stage.description}</p>

        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
          <div class="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Engineering Specifications:</div>
          <ul class="space-y-1.5 text-xs text-slate-600 font-mono">
            ${stage.specifications.map(s => `
              <li class="flex items-start gap-2">
                <span class="text-blue-600 font-bold">›</span>
                <span>${s}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaArch = new ArchitecturePipelineModule();
});
