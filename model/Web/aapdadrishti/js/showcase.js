// AapdaDrishti - Real-Time Drone Stream Analyzer with Multi-Feed Video Selector
// Supports night_uav.mp4 (Night Thermal Recon) & Assam_flood.mp4 (Flood SAR) & Custom Uploads

const VIDEO_PRESETS = {
  night_uav: {
    id: 'night_uav',
    name: 'Night UAV Thermal Recon (night_uav.mp4)',
    src: 'night_uav.mp4',
    fallbackSrc: 'videos/night_uav.mp4',
    sensorName: 'FLIR Radiometric Thermal (LWIR 8-14µm White-Hot)',
    defaultMode: 'thermal',
    uavCallsign: 'UAV-02 • NIGHT THERMAL FLIR RECON',
    osdLocation: 'GPS: 29.5985° N, 79.6591° E',
    targets: [
      {
        trkId: 'TRK-208',
        label: 'THERMAL SIGNATURE - HUMAN CORE',
        priority: 'CRITICAL',
        conf: '98.1%',
        temp: '37.2°C',
        uncert: '±12m',
        coords: '29.59850° N, 79.66100° E',
        xPct: 0.38,
        yPct: 0.44,
        w: 120,
        h: 110,
        color: '#EF4444',
        headerBg: '#991B1B'
      },
      {
        trkId: 'TRK-215',
        label: 'HEAT ANOMALY IN VOID',
        priority: 'HIGH',
        conf: '93.4%',
        temp: '36.8°C',
        uncert: '±15m',
        coords: '29.60120° N, 79.66350° E',
        xPct: 0.68,
        yPct: 0.28,
        w: 105,
        h: 95,
        color: '#F97316',
        headerBg: '#9A3412'
      }
    ]
  },
  assam_flood: {
    id: 'assam_flood',
    name: 'Assam Flood Basin (Assam_flood.mp4)',
    src: 'Assam_flood.mp4',
    fallbackSrc: 'videos/Assam_flood.mp4',
    sensorName: 'Optical 4K RGB Ultra-HDR (Assam Flood Basin)',
    defaultMode: 'rgb',
    uavCallsign: 'UAV-01 • ASSAM BRAHMAPUTRA',
    osdLocation: 'GPS: 26.1445° N, 91.7362° E',
    targets: [
      {
        trkId: 'TRK-104',
        label: 'VICTIM ON SUBMERGED VAN ROOF',
        priority: 'CRITICAL',
        conf: '96.8%',
        temp: '36.9°C',
        uncert: '±14m',
        coords: '26.14450° N, 91.73620° E',
        xPct: 0.36,
        yPct: 0.40,
        w: 115,
        h: 105,
        color: '#EF4444',
        headerBg: '#991B1B'
      },
      {
        trkId: 'TRK-089',
        label: 'SURVIVOR CLUSTER ON TERRACE',
        priority: 'HIGH',
        conf: '94.2%',
        temp: '37.1°C',
        uncert: '±16m',
        coords: '26.15100° N, 91.74200° E',
        xPct: 0.70,
        yPct: 0.22,
        w: 105,
        h: 90,
        color: '#F97316',
        headerBg: '#9A3412'
      }
    ]
  }
};

class AiShowcaseEngine {
  constructor() {
    this.video = document.getElementById('showcaseVideo');
    this.canvas = document.getElementById('showcaseCanvas');
    this.container = document.getElementById('showcaseVideoContainer');
    
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.currentPreset = 'night_uav'; // default to night_uav
    this.mode = 'thermal';
    this.isPlaying = true;
    this.animId = null;
    this.verifiedCases = new Set();
    this.sensitivity = 88;

    this.canvas.width = 960;
    this.canvas.height = 540;

    this.initVideo();
    this.initControls();
    this.loadPreset(this.currentPreset);
    this.startRenderLoop();
  }

  initVideo() {
    if (!this.video) return;

    this.video.muted = true;
    this.video.autoplay = true;
    this.video.loop = true;
    this.video.playsInline = true;

    this.video.addEventListener('error', () => {
      const preset = VIDEO_PRESETS[this.currentPreset];
      if (preset && this.video.src.indexOf(preset.fallbackSrc) === -1) {
        this.video.src = preset.fallbackSrc;
        this.video.load();
        this.video.play().catch(() => {});
      }
    });
  }

  loadPreset(presetKey) {
    if (!VIDEO_PRESETS[presetKey]) return;
    this.currentPreset = presetKey;
    const preset = VIDEO_PRESETS[presetKey];

    if (this.video) {
      this.video.src = preset.src;
      this.video.load();
      this.video.play().catch(() => {});
    }

    const label = document.getElementById('showcaseVideoFilename');
    if (label) label.textContent = preset.src;

    // Update preset tabs UI
    document.querySelectorAll('.video-preset-btn').forEach(btn => {
      if (btn.dataset.preset === presetKey) {
        btn.classList.add('bg-slate-900', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600');
      } else {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600');
      }
    });

    this.setMode(preset.defaultMode);
    this.renderTriageCards();
  }

  setMode(newMode) {
    this.mode = newMode;
    const btnRgb = document.getElementById('showcaseBtnRgb');
    const btnThermal = document.getElementById('showcaseBtnThermal');
    const modeBadge = document.getElementById('showcaseSensorBadge');

    if (newMode === 'thermal') {
      if (btnThermal) {
        btnThermal.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        btnThermal.classList.remove('text-slate-400');
      }
      if (btnRgb) {
        btnRgb.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        btnRgb.classList.add('text-slate-400');
      }
      if (modeBadge) modeBadge.textContent = "FLIR Radiometric Thermal (LWIR 8-14µm White-Hot)";
      if (this.video) {
        this.video.style.filter = 'contrast(170%) hue-rotate(185deg) saturate(240%) brightness(0.9)';
      }
    } else {
      if (btnRgb) {
        btnRgb.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        btnRgb.classList.remove('text-slate-400');
      }
      if (btnThermal) {
        btnThermal.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        btnThermal.classList.add('text-slate-400');
      }
      if (modeBadge) modeBadge.textContent = "Optical 4K RGB Ultra-HDR";
      if (this.video) {
        this.video.style.filter = 'none';
      }
    }
  }

  ensurePlay() {
    if (this.video && this.video.paused) {
      this.video.play().catch(() => {});
      this.isPlaying = true;
      const btn = document.getElementById('showcasePlayPauseBtn');
      if (btn) btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  togglePlay() {
    if (!this.video) return;
    if (this.video.paused) {
      this.video.play().catch(() => {});
      this.isPlaying = true;
      const btn = document.getElementById('showcasePlayPauseBtn');
      if (btn) btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4"></i>`;
    } else {
      this.video.pause();
      this.isPlaying = false;
      const btn = document.getElementById('showcasePlayPauseBtn');
      if (btn) btn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  toggleMute() {
    if (!this.video) return;
    this.video.muted = !this.video.muted;
    const btn = document.getElementById('showcaseMuteBtn');
    if (btn) {
      btn.innerHTML = this.video.muted
        ? `<i data-lucide="volume-x" class="w-4 h-4"></i>`
        : `<i data-lucide="volume-2" class="w-4 h-4 text-cyan-400"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  initControls() {
    const btnRgb = document.getElementById('showcaseBtnRgb');
    const btnThermal = document.getElementById('showcaseBtnThermal');
    const playPauseBtn = document.getElementById('showcasePlayPauseBtn');
    const muteBtn = document.getElementById('showcaseMuteBtn');
    const fileInput = document.getElementById('showcaseCustomFileInput');

    if (btnRgb && btnThermal) {
      btnRgb.addEventListener('click', () => this.setMode('rgb'));
      btnThermal.addEventListener('click', () => this.setMode('thermal'));
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.togglePlay());
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => this.toggleMute());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          this.video.src = url;
          this.video.play().catch(() => {});
          const label = document.getElementById('showcaseVideoFilename');
          if (label) label.textContent = file.name;
        }
      });
    }
  }

  renderTriageCards() {
    const container = document.getElementById('showcaseTriageCardsContainer');
    if (!container) return;

    const preset = VIDEO_PRESETS[this.currentPreset] || VIDEO_PRESETS.night_uav;

    container.innerHTML = preset.targets.map(t => {
      const priorityClass = t.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200';
      const isVerified = this.verifiedCases.has(t.trkId);

      return `
        <div class="bg-white p-4 rounded-xl border ${t.priority === 'CRITICAL' ? 'border-red-200' : 'border-orange-200'} space-y-2.5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityClass}">
              ${t.priority}
            </span>
            <span class="text-xs font-mono text-slate-500 font-bold">${t.trkId}</span>
          </div>
          <div class="text-sm font-bold text-slate-900">${t.label}</div>
          <div class="text-xs font-mono text-slate-500">${t.coords} (${t.uncert})</div>
          
          <button onclick="window.AapdaShowcase.verifyCase('${t.trkId}')" id="btnVerify_${t.trkId}" class="w-full py-2 ${isVerified ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-900 hover:bg-slate-800 text-white'} text-xs font-medium rounded-lg transition">
            ${isVerified ? '✓ Verified by Operator' : '✓ Confirm Human Verification'}
          </button>
        </div>
      `;
    }).join('');
  }

  startRenderLoop() {
    const render = () => {
      this.draw();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = this.video ? this.video.currentTime : 0;

    ctx.clearRect(0, 0, w, h);

    // Thermal scanlines
    if (this.mode === 'thermal') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }
    }

    // Overlay AI Bounding Boxes & Tracking
    this.drawAiDetections(ctx, w, h, time);

    // Overlay Tactical Drone Telemetry OSD
    this.drawTacticalOsd(ctx, w, h, time);
  }

  drawAiDetections(ctx, w, h, t) {
    const preset = VIDEO_PRESETS[this.currentPreset] || VIDEO_PRESETS.night_uav;
    const tOffset = Math.sin(t * 0.9);

    preset.targets.forEach((tgt, idx) => {
      const mult = idx === 0 ? 1 : -0.8;
      const bx = w * tgt.xPct + tOffset * 16 * mult;
      const by = h * tgt.yPct + Math.cos(t * 0.7) * 7 * mult;

      this.renderTacticalBox(ctx, bx, by, tgt.w, tgt.h, tgt.trkId, tgt.priority, tgt.conf, tgt.color, tgt.headerBg, tgt.uncert);
    });
  }

  renderTacticalBox(ctx, x, y, bw, bh, trkId, priority, conf, borderCol, headerBg, uncert) {
    ctx.fillStyle = priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(249, 115, 22, 0.16)';
    ctx.fillRect(x, y, bw, bh);

    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, bw, bh);

    // Precision Corner Crosshairs
    ctx.lineWidth = 2.5;
    const c = 12;
    ctx.beginPath(); ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - c, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + bh - c); ctx.lineTo(x, y + bh); ctx.lineTo(x + c, y + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + bw - c, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - c); ctx.stroke();

    // Top Header Banner
    ctx.fillStyle = headerBg;
    ctx.fillRect(x, y - 22, bw, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`[${priority}] ${trkId}`, x + 5, y - 7);

    // Bottom Telemetry Tag
    ctx.fillStyle = 'rgba(11, 18, 32, 0.92)';
    ctx.fillRect(x, y + bh, bw, 20);
    ctx.fillStyle = '#38BDF8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`CONF: ${conf} | ${uncert}`, x + 5, y + bh + 14);
  }

  drawTacticalOsd(ctx, w, h, t) {
    const preset = VIDEO_PRESETS[this.currentPreset] || VIDEO_PRESETS.night_uav;
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx - 24, cy); ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 24, cy);
    ctx.moveTo(cx, cy - 24); ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Top Left OSD
    ctx.fillStyle = 'rgba(11, 18, 32, 0.88)';
    ctx.fillRect(14, 14, 250, 56);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeRect(14, 14, 250, 56);

    ctx.fillStyle = '#00E5FF';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(preset.uavCallsign, 24, 32);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('ALT: 52.5m AGL | HDOP: 0.71', 24, 48);
    ctx.fillText(preset.osdLocation, 24, 62);

    // Top Right AI Engine Status
    ctx.fillStyle = 'rgba(11, 18, 32, 0.88)';
    ctx.fillRect(w - 204, 14, 190, 56);
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeRect(w - 204, 14, 190, 56);

    ctx.fillStyle = '#10B981';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('AI INFERENCE: 42 FPS', w - 194, 32);
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('MODEL: YOLOv9-SAR-FP16', w - 194, 48);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText('TRACK: BYTETRACK-PERSIST', w - 194, 62);
  }

  verifyCase(caseId) {
    this.verifiedCases.add(caseId);
    const btn = document.getElementById(`btnVerify_${caseId}`);
    if (btn) {
      btn.innerHTML = '✓ Verified by Operator';
      btn.classList.add('bg-emerald-50', 'text-emerald-800', 'border-emerald-200');
      btn.classList.remove('bg-slate-900', 'text-white');
    }
  }

  exportIncidentReport() {
    const preset = VIDEO_PRESETS[this.currentPreset] || VIDEO_PRESETS.night_uav;
    const reportData = {
      platform: "AapdaDrishti AI Rescue OS",
      mission: preset.uavCallsign,
      timestamp: new Date().toISOString(),
      standard: "NDMA / ITU CAP v1.2 Protocol Compatible",
      telemetry: {
        altitudeAGL: "52.5m",
        sensorMode: this.mode === 'thermal' ? "FLIR Radiometric LWIR" : "Optical 4K RGB",
        inferenceFPS: 42
      },
      detections: preset.targets.map(t => ({
        trackId: t.trkId,
        label: t.label,
        priority: t.priority,
        confidence: t.conf,
        uncertaintyBufferMeters: t.uncert,
        gpsCoordinates: t.coords,
        verifiedByOperator: this.verifiedCases.has(t.trkId)
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AapdaDrishti_Tactical_Report_${preset.id}.json`;
    a.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaShowcase = new AiShowcaseEngine();
});
