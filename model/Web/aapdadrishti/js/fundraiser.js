// AapdaDrishti - Humanitarian Disaster Relief Fundraiser & Life-Saving Drone Fleet Fund
// 100% Transparent Community Contribution Engine for Field Search & Rescue Missions

class DisasterFundraiserModule {
  constructor() {
    this.selectedAmount = 1500;
    this.totalGoal = 2500000;
    this.currentRaised = 1845000;
    this.init();
  }

  init() {
    this.renderDonationTiers();
    this.createDonationModal();
  }

  selectAmount(amount) {
    this.selectedAmount = amount;
    const customInput = document.getElementById('customDonationInput');
    if (customInput) customInput.value = '';

    document.querySelectorAll('.donation-tier-btn').forEach(btn => {
      if (parseInt(btn.dataset.amount) === amount) {
        btn.classList.add('bg-slate-900', 'text-white', 'shadow-md', 'border-slate-900');
        btn.classList.remove('bg-white', 'text-slate-800', 'border-slate-200');
      } else {
        btn.classList.remove('bg-slate-900', 'text-white', 'shadow-md', 'border-slate-900');
        btn.classList.add('bg-white', 'text-slate-800', 'border-slate-200');
      }
    });

    this.updateImpactDisplay(amount);
  }

  handleCustomAmount(val) {
    const amount = parseInt(val) || 0;
    if (amount > 0) {
      this.selectedAmount = amount;
      document.querySelectorAll('.donation-tier-btn').forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-white', 'shadow-md', 'border-slate-900');
        btn.classList.add('bg-white', 'text-slate-800', 'border-slate-200');
      });
      this.updateImpactDisplay(amount);
    }
  }

  updateImpactDisplay(amount) {
    const impactText = document.getElementById('fundraiserImpactText');
    if (!impactText) return;

    let impactDesc = "Funds life-saving drone search and rescue reconnaissance in flooded disaster zones.";

    if (amount <= 500) {
      impactDesc = "🔋 Supplies emergency battery field charging stations and medical triage packs for ground search teams.";
    } else if (amount <= 1500) {
      impactDesc = "🚁 Fully funds 1 Autonomous UAV Search Sortie covering a 15 sq. km flooded river basin to spot trapped survivors.";
    } else if (amount <= 5000) {
      impactDesc = "🌙 Funds 1 FLIR Thermal Night Reconnaissance Battery Pack and an Emergency Air-Drop First Aid Pod.";
    } else {
      impactDesc = "⚡ Equips 1 State Disaster Response Force (SDRF) field unit with a 100% Offline Edge AI Computer Box.";
    }

    impactText.textContent = impactDesc;
  }

  renderDonationTiers() {
    this.updateImpactDisplay(this.selectedAmount);
  }

  createDonationModal() {
    if (document.getElementById('reliefDonationModal')) return;

    const modal = document.createElement('div');
    modal.id = 'reliefDonationModal';
    modal.className = 'hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4';

    modal.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-5 relative">
        <button onclick="window.AapdaFundraiser.closeDonationModal()" class="absolute top-6 right-6 text-slate-400 hover:text-slate-900 text-lg">✕</button>

        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span class="text-xs font-mono font-bold text-emerald-700 uppercase">Direct Relief Contribution</span>
          </div>
          <h3 class="text-xl font-bold text-slate-900 font-heading">Support Life-Saving UAV Missions</h3>
          <p class="text-xs text-slate-500">Your contribution directly funds drone battery packs, edge compute units, and medical drops.</p>
        </div>

        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 font-mono text-xs">
          <div class="flex justify-between text-slate-600">
            <span>Contribution Amount:</span>
            <span class="font-bold text-slate-900 text-sm" id="modalDonationAmount">₹1,500</span>
          </div>
          <div class="text-[11px] text-emerald-700 pt-1 font-medium" id="modalImpactNote">
            Funds 1 Autonomous UAV Search Sortie (15 sq. km grid)
          </div>
        </div>

        <form onsubmit="window.AapdaFundraiser.handleDonationSubmit(event)" class="space-y-4 text-xs font-sans">
          <div>
            <label class="block font-mono font-bold text-slate-700 mb-1 uppercase text-[11px]">Full Name / Organization</label>
            <input type="text" required placeholder="e.g. Dr. Sunita Rao" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-600">
          </div>
          <div>
            <label class="block font-mono font-bold text-slate-700 mb-1 uppercase text-[11px]">Email Address for 80G Tax Receipt</label>
            <input type="email" required placeholder="sunita@foundation.org" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-600">
          </div>
          <div>
            <label class="block font-mono font-bold text-slate-700 mb-1 uppercase text-[11px]">Preferred Contribution Channel</label>
            <select class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs focus:outline-none focus:border-blue-600">
              <option>UPI QR & Instant App (GPay / PhonePe / Paytm)</option>
              <option>Debit / Credit Card (Visa, Mastercard, RuPay)</option>
              <option>Direct Bank NEFT / RTGS Transfer</option>
              <option>CSR / Corporate Grant Partnership</option>
            </select>
          </div>

          <button type="submit" class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl font-heading shadow-lg transition">
            Proceed to Secure Contribution →
          </button>
        </form>

        <div id="donationSuccessMsg" class="hidden text-center py-6 space-y-2">
          <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold text-lg">✓</div>
          <h4 class="text-base font-bold text-slate-900 font-heading">Thank You for Supporting Life-Saving Missions!</h4>
          <p class="text-xs text-slate-600">A verified 80G tax-exemption receipt and live field telemetry dispatch log has been sent to your email.</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  openDonationModal() {
    const modal = document.getElementById('reliefDonationModal');
    const amountLabel = document.getElementById('modalDonationAmount');
    if (amountLabel) amountLabel.textContent = `₹${this.selectedAmount.toLocaleString('en-IN')}`;
    if (modal) modal.classList.remove('hidden');
  }

  closeDonationModal() {
    const modal = document.getElementById('reliefDonationModal');
    if (modal) modal.classList.add('hidden');
  }

  handleDonationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const successMsg = document.getElementById('donationSuccessMsg');
    if (form && successMsg) {
      form.classList.add('hidden');
      successMsg.classList.remove('hidden');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaFundraiser = new DisasterFundraiserModule();
});
