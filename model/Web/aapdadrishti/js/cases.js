// AapdaDrishti - Case Detail Module
// Single Focused Case View with Plain Language and Quiet Human Verification

class CleanCaseModule {
  constructor() {
    this.selectedCaseId = 'CASE-01';
  }

  showCase(caseId) {
    this.selectedCaseId = caseId || this.selectedCaseId;

    // Search in active cases or fall back to flood scenario
    let c = (AAPDA_DATA.activeCases || []).find(item => item.id === this.selectedCaseId);
    if (!c) {
      // Find across all scenarios
      for (const key in AAPDA_DATA.scenarios) {
        const found = AAPDA_DATA.scenarios[key].cases.find(item => item.id === this.selectedCaseId);
        if (found) {
          c = found;
          break;
        }
      }
    }

    if (!c) c = AAPDA_DATA.scenarios.flood.cases[0];

    const container = document.getElementById('caseDetailContainer');
    if (!container) return;

    const badgeClass = {
      CRITICAL: 'badge-critical',
      HIGH: 'badge-high',
      MEDIUM: 'badge-medium',
      LOW: 'badge-low'
    }[c.priority];

    container.innerHTML = `
      <div class="max-w-2xl mx-auto bg-white border border-stone-200 rounded-2xl p-8 shadow-sm space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                ${c.priority}
              </span>
              <span class="text-xs font-mono text-stone-400">${c.id}</span>
            </div>
            <h2 class="text-xl font-semibold text-stone-900">${c.title}</h2>
          </div>
          <button onclick="window.AapdaApp.navigate('demo')" class="text-xs text-stone-500 hover:text-stone-800 transition">
            ← Back to results
          </button>
        </div>

        <!-- Evidence Photo Frame -->
        <div class="relative bg-stone-100 rounded-xl overflow-hidden aspect-video border border-stone-200 flex items-center justify-center">
          <canvas id="singleEvidenceCanvas" width="600" height="338" class="w-full h-full object-cover"></canvas>
          <div class="absolute bottom-3 left-3 bg-white/90 text-[11px] font-mono px-2.5 py-1 rounded shadow-sm text-stone-700">
            Aerial capture • ${c.confidence} confidence
          </div>
        </div>

        <!-- Coordinates & Plain Accuracy -->
        <div class="bg-stone-50 rounded-xl p-4 border border-stone-200/60 flex items-center justify-between text-xs font-mono text-stone-600">
          <div>
            <span class="text-stone-400">Location:</span> ${c.coordinates}
          </div>
          <div class="font-medium text-stone-700">
            ${c.accuracy}
          </div>
        </div>

        <!-- Details -->
        <div class="space-y-2">
          <h3 class="text-xs font-semibold text-stone-700 uppercase tracking-wider">Case Notes</h3>
          <p class="text-sm text-stone-600 leading-relaxed">${c.detailNotes || c.summary}</p>
        </div>

        <!-- Quiet Human Verification Notice & Action -->
        <div class="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p class="text-xs text-stone-500 max-w-sm">
            Human verification is required before field dispatch. Review the evidence photo to confirm human presence.
          </p>

          <div>
            ${c.verified ? `
              <span class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg border border-emerald-200">
                ✓ Verified by operator
              </span>
            ` : `
              <button onclick="window.AapdaCases.verifyCase('${c.id}')" class="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-medium rounded-lg transition shadow-sm">
                Confirm & verify case
              </button>
            `}
          </div>
        </div>

      </div>
    `;

    this.renderCanvas(c);
  }

  renderCanvas(c) {
    const canvas = document.getElementById('singleEvidenceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clean neutral illustration matching scenario
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#CBD5E1');
    grad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Structure
    ctx.fillStyle = '#475569';
    ctx.fillRect(w * 0.35, h * 0.4, 180, 80);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(w * 0.36, h * 0.36, 160, 55);

    // Person silhouette
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.32, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.46, h * 0.35, 18, 26);

    // Clean subtle bounding box
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.4, h * 0.22, 120, 110);
  }

  verifyCase(caseId) {
    let c = (AAPDA_DATA.activeCases || []).find(item => item.id === caseId);
    if (!c) {
      for (const key in AAPDA_DATA.scenarios) {
        const found = AAPDA_DATA.scenarios[key].cases.find(item => item.id === caseId);
        if (found) {
          c = found;
          break;
        }
      }
    }

    if (c) {
      c.verified = true;
      this.showCase(caseId);
    }
  }
}

window.AapdaCases = new CleanCaseModule();
