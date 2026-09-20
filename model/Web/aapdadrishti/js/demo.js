// AapdaDrishti - Live Demo ("See It In Action") Engine
// Synchronized Dual Playback: Raw Drone Footage vs. AI-Processed Feed + Evidence Extraction Gallery

class LiveDemoModule {
  constructor() {
    this.isPlaying = true;
    this.animId = null;
    this.time = 0;
    this.rawCanvas = null;
    this.aiCanvas = null;
    this.rawCtx = null;
    this.aiCtx = null;
    this.activeScenario = 'flood';
  }

  initDemo() {
    this.rawCanvas = document.getElementById('demoRawCanvas');
    this.aiCanvas = document.getElementById('demoAiCanvas');

    if (!this.rawCanvas || !this.aiCanvas) return;

    this.rawCtx = this.rawCanvas.getContext('2d');
    this.aiCtx = this.aiCanvas.getContext('2d');

    this.rawCanvas.width = 640;
    this.rawCanvas.height = 360;
    this.aiCanvas.width = 640;
    this.aiCanvas.height = 360;

    this.startLoop();
    this.renderEvidenceGallery();
  }

  setDemoScenario(scenarioKey) {
    this.activeScenario = scenarioKey;
    this.time = 0;
    this.renderEvidenceGallery();
  }

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const step = () => {
      if (this.isPlaying) {
        this.time += 0.033;
        this.renderDemoFrames();
      }
      this.animId = requestAnimationFrame(step);
    };
    this.animId = requestAnimationFrame(step);
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    const btn = document.getElementById('demoPlayBtn');
    if (btn) {
      btn.innerHTML = this.isPlaying
        ? `<i data-lucide="pause" class="w-4 h-4 mr-1"></i> Pause Comparison`
        : `<i data-lucide="play" class="w-4 h-4 mr-1"></i> Play Comparison`;
      if (window.lucide) lucide.createIcons();
    }
  }

  renderDemoFrames() {
    const rw = this.rawCanvas.width;
    const rh = this.rawCanvas.height;
    const t = this.time;

    // 1. Draw Raw Drone Footage (No overlays, raw environmental scene)
    this.drawRawScene(this.rawCtx, rw, rh, t);

    // 2. Draw AI-Processed Feed (Identical scene + tactical neural bounding boxes, tracking IDs, priority banners)
    this.drawRawScene(this.aiCtx, rw, rh, t);
    this.drawAiOverlays(this.aiCtx, rw, rh, t);
  }

  drawRawScene(ctx, w, h, t) {
    if (this.activeScenario === 'flood') {
      // Murky flood waters with submerged structure and victim
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1c3444');
      grad.addColorStop(0.5, '#203d4c');
      grad.addColorStop(1, '#152630');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Current Swirls
      ctx.strokeStyle = 'rgba(75, 130, 150, 0.28)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        const y0 = 30 + i * 45;
        ctx.moveTo(0, y0);
        for (let x = 0; x <= w; x += 30) {
          ctx.lineTo(x, y0 + Math.sin(x * 0.02 + t * 2.5 + i) * 10);
        }
        ctx.stroke();
      }

      // Submerged Van
      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.38, h * 0.42, 140, 75);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(w * 0.39, h * 0.40, 120, 60);

      // Trapped Victim waving orange cloth
      const wave = Math.sin(t * 6) * 12;
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(w * 0.47, h * 0.36, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.44, h * 0.39, 14, 18);
      // Arm waving orange distress flag
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.41);
      ctx.lineTo(w * 0.58, h * 0.30 + wave * 0.4);
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(w * 0.58, h * 0.24 + wave * 0.4, 22, 14);

    } else if (this.activeScenario === 'fire') {
      // Fire Plume & Parapet
      ctx.fillStyle = '#0f131a';
      ctx.fillRect(0, 0, w, h);

      const fireGlow = ctx.createRadialGradient(w * 0.4, h * 0.55, 10, w * 0.4, h * 0.55, 160);
      fireGlow.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
      fireGlow.addColorStop(0.4, 'rgba(249, 115, 22, 0.6)');
      fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fireGlow;
      ctx.fillRect(0, 0, w, h);

      // Worker on roof
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w * 0.65, h * 0.25, 120, 8);
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.21, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(w * 0.70, h * 0.23, 10, 14);

    } else {
      // Night Thermal
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);

      const rad = ctx.createRadialGradient(w * 0.5, h * 0.45, 2, w * 0.5, h * 0.45, 20);
      rad.addColorStop(0, '#ffffff');
      rad.addColorStop(0.4, '#ef4444');
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawAiOverlays(ctx, w, h, t) {
    let bx = w * 0.41;
    let by = h * 0.28;
    let bw = 120;
    let bh = 110;
    let trkId = "TRK-104";
    let priority = "CRITICAL";
    let conf = "96.4%";
    let uncert = "±14m";

    if (this.activeScenario === 'fire') {
      bx = w * 0.67;
      by = h * 0.16;
      bw = 90;
      bh = 90;
      trkId = "TRK-112";
      priority = "CRITICAL";
      conf = "97.2%";
      uncert = "±10m";
    } else if (this.activeScenario === 'night') {
      bx = w * 0.45;
      by = h * 0.38;
      bw = 70;
      bh = 70;
      trkId = "TRK-088";
      priority = "MEDIUM";
      conf = "87.3%";
      uncert = "±28m";
    }

    // Bounding Box
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Crosshairs
    ctx.lineWidth = 3;
    const c = 10;
    ctx.beginPath(); ctx.moveTo(bx, by + c); ctx.lineTo(bx, by); ctx.lineTo(bx + c, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - c, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by + bh - c); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + c, by + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + bw - c, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - c); ctx.stroke();

    // Top Banner
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(bx, by - 20, bw, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`[${priority}] ${trkId}`, bx + 4, by - 6);

    // Bottom Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(bx, by + bh, bw, 18);
    ctx.fillStyle = '#FCA5A5';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`CONF: ${conf} | ${uncert}`, bx + 4, by + bh + 13);
  }

  renderEvidenceGallery() {
    const gallery = document.getElementById('demoEvidenceGallery');
    if (!gallery) return;

    const filtered = AAPDA_DATA.cases.filter(c => c.scenario === this.activeScenario || this.activeScenario === 'all');
    const casesToDisplay = filtered.length > 0 ? filtered : AAPDA_DATA.cases.slice(0, 3);

    gallery.innerHTML = casesToDisplay.map(item => {
      const priorityColors = {
        CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
        HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
        MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      }[item.priority];

      return `
        <div class="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition cursor-pointer flex flex-col justify-between" onclick="window.AapdaApp.openCaseModal('${item.id}')">
          <div class="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${priorityColors}">
              ${item.priority}
            </span>
            <span class="font-mono text-xs text-slate-300 font-bold">${item.id}</span>
          </div>

          <div class="p-4 space-y-3">
            <div class="font-semibold text-slate-100 text-sm">${item.title}</div>
            
            <div class="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-500">Confidence:</span>
                <span class="text-cyan-300 font-bold">${item.confidence}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">GPS Location:</span>
                <span class="text-slate-300">${item.gps.formatted}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Uncertainty Radius:</span>
                <span class="text-amber-300 font-bold">±${item.gps.uncertaintyRadiusMeters} meters</span>
              </div>
            </div>

            <div class="text-[11px] text-slate-400 line-clamp-2">
              ${item.notes}
            </div>
          </div>

          <div class="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-mono">${item.timestamp}</span>
            <span class="text-cyan-400 font-medium hover:text-cyan-300">View Forensic Details →</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.AapdaDemo = new LiveDemoModule();
