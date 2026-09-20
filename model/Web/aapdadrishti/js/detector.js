// AapdaDrishti - Clean Video Processing & Live Demo Engine

class LiveDetectorEngine {
  constructor() {
    this.selectedDisaster = 'flood';
    this.isProcessing = false;
    this.hasResults = false;
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.time = 0;
    this.uploadedFile = null;
  }

  init() {
    this.canvas = document.getElementById('demoVideoCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = 720;
      this.canvas.height = 405;
    }
  }

  setDisasterType(type) {
    this.selectedDisaster = type;
    
    // Update pill buttons UI
    document.querySelectorAll('.disaster-pill').forEach(pill => {
      if (pill.dataset.type === type) {
        pill.classList.add('bg-teal-900', 'text-white');
        pill.classList.remove('bg-white', 'text-stone-700', 'border-stone-200');
      } else {
        pill.classList.remove('bg-teal-900', 'text-white');
        pill.classList.add('bg-white', 'text-stone-700', 'border-stone-200');
      }
    });

    if (this.hasResults) {
      this.processSelectedFootage();
    }
  }

  // Load sample footage directly
  loadSample(type) {
    this.setDisasterType(type);
    this.processSelectedFootage();
  }

  // Handle uploaded video file
  handleFileUpload(file) {
    if (!file) return;
    this.uploadedFile = file;
    const filenameEl = document.getElementById('uploadFileName');
    if (filenameEl) {
      filenameEl.textContent = `Selected: ${file.name}`;
      filenameEl.classList.remove('hidden');
    }
    this.processSelectedFootage();
  }

  processSelectedFootage() {
    this.isProcessing = true;
    this.hasResults = true;
    this.time = 0;

    // Load matching cases into active state
    const scenarioData = AAPDA_DATA.scenarios[this.selectedDisaster];
    AAPDA_DATA.activeCases = scenarioData ? [...scenarioData.cases] : [];

    // Switch from empty state to results view
    const emptyState = document.getElementById('demoEmptyState');
    const resultsView = document.getElementById('demoResultsView');
    
    if (emptyState) emptyState.classList.add('hidden');
    if (resultsView) resultsView.classList.remove('hidden');

    this.init();
    this.startLoop();
    this.renderCaseCards();

    // Notify map
    if (window.AapdaMap) {
      window.AapdaMap.updateMapCases();
    }

    // Scroll to results cleanly
    resultsView.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  startLoop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const step = () => {
      this.time += 0.03;
      this.drawFrame();
      this.animationId = requestAnimationFrame(step);
    };
    this.animationId = requestAnimationFrame(step);
  }

  drawFrame() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = this.time;
    const ctx = this.ctx;

    // Draw scene based on selected disaster type
    if (this.selectedDisaster === 'flood') {
      // Water background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#CBD5E1');
      grad.addColorStop(0.5, '#94A3B8');
      grad.addColorStop(1, '#64748B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Water ripples
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const y0 = 40 + i * 60;
        ctx.moveTo(0, y0);
        for (let x = 0; x <= w; x += 30) {
          ctx.lineTo(x, y0 + Math.sin(x * 0.02 + t * 2 + i) * 8);
        }
        ctx.stroke();
      }

      // Submerged Van
      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.4, h * 0.42, 140, 70);
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(w * 0.41, h * 0.38, 120, 50);

      // Person on roof waving
      const wave = Math.sin(t * 5) * 8;
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(w * 0.48, h * 0.34, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w * 0.46, h * 0.37, 10, 16);
      // Arm waving cloth
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.52, h * 0.38);
      ctx.lineTo(w * 0.57, h * 0.30 + wave * 0.3);
      ctx.stroke();

      // Bounding Box Overlays
      this.drawBoundingBox(ctx, w * 0.42, h * 0.26, 110, 100, "CASE-01", "CRITICAL", "96%");

    } else if (this.selectedDisaster === 'fire') {
      // Fire & Smoke Scene
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 0, w, h);

      const fireGlow = ctx.createRadialGradient(w * 0.35, h * 0.5, 10, w * 0.35, h * 0.5, 180);
      fireGlow.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
      fireGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
      fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fireGlow;
      ctx.fillRect(0, 0, w, h);

      // Parapet
      ctx.fillStyle = '#57534E';
      ctx.fillRect(w * 0.6, h * 0.3, 140, 10);
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.26, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(w * 0.66, h * 0.28, 9, 12);

      this.drawBoundingBox(ctx, w * 0.62, h * 0.2, 90, 80, "CASE-03", "CRITICAL", "97%");

    } else if (this.selectedDisaster === 'night') {
      // FLIR Thermal scene
      ctx.fillStyle = '#1C1917';
      ctx.fillRect(0, 0, w, h);

      // Thermal heat signature
      const rad = ctx.createRadialGradient(w * 0.5, h * 0.45, 2, w * 0.5, h * 0.45, 25);
      rad.addColorStop(0, '#FFFFFF');
      rad.addColorStop(0.4, '#EA580C');
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, 25, 0, Math.PI * 2);
      ctx.fill();

      this.drawBoundingBox(ctx, w * 0.45, h * 0.38, 70, 60, "CASE-04", "MEDIUM", "87%");

    } else if (this.selectedDisaster === 'accident') {
      // Highway scene
      ctx.fillStyle = '#44403C';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, h * 0.25, w, h * 0.5);

      // Overturned vehicle
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(w * 0.42, h * 0.45, 110, 45);

      this.drawBoundingBox(ctx, w * 0.4, h * 0.38, 120, 80, "CASE-05", "HIGH", "90%");

    } else if (this.selectedDisaster === 'earthquake') {
      // Concrete rubble
      ctx.fillStyle = '#78716C';
      ctx.fillRect(0, 0, w, h);

      // Slab opening
      ctx.fillStyle = '#1C1917';
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.48, 35, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawBoundingBox(ctx, w * 0.42, h * 0.4, 90, 70, "CASE-06", "CRITICAL", "91%");
    }
  }

  drawBoundingBox(ctx, x, y, bw, bh, id, priority, conf) {
    // Subtle clean box
    ctx.strokeStyle = priority === 'CRITICAL' ? '#DC2626' : (priority === 'HIGH' ? '#EA580C' : '#D97706');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, bw, bh);

    // Clean label badge on top
    ctx.fillStyle = priority === 'CRITICAL' ? '#DC2626' : (priority === 'HIGH' ? '#EA580C' : '#D97706');
    ctx.fillRect(x, y - 18, bw, 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillText(`${id} • ${priority}`, x + 4, y - 5);
  }

  renderCaseCards() {
    const container = document.getElementById('demoEvidenceCardsGrid');
    if (!container) return;

    const cases = AAPDA_DATA.activeCases;

    if (cases.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center text-stone-500 text-sm">
          No detections found in this footage.
        </div>
      `;
      return;
    }

    container.innerHTML = cases.map(c => {
      const badgeClass = {
        CRITICAL: 'badge-critical',
        HIGH: 'badge-high',
        MEDIUM: 'badge-medium',
        LOW: 'badge-low'
      }[c.priority];

      return `
        <div class="bg-white border border-stone-200 hover:border-stone-300 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between" onclick="window.AapdaApp.showCaseDetail('${c.id}')">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                ${c.priority}
              </span>
              <span class="text-xs font-mono text-stone-400">${c.accuracy}</span>
            </div>

            <h3 class="text-sm font-semibold text-stone-900 mb-1">${c.title}</h3>
            <p class="text-xs text-stone-600 leading-relaxed">${c.summary}</p>
          </div>

          <div class="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
            <span class="font-mono text-stone-500">${c.coordinates}</span>
            <span class="text-teal-700 font-medium hover:text-teal-800">Review case →</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.AapdaDetector = new LiveDetectorEngine();
