// AapdaDrishti - Enhanced Motion Animation, 3D Magnetic Tilt & Scroll Reveals

class MainAppController {
  constructor() {
    this.countersAnimated = false;
    this.init();
  }

  init() {
    this.initNavbarScroll();
    this.initScrollReveal();
    this.initMagneticCardTilt();
    this.initCursorGlow();
    this.initFaqAccordion();
    this.initDemoModal();
    this.initAutoplayEnforcer();
  }

  // Global Video Autoplay Enforcer
  initAutoplayEnforcer() {
    const playAllVideos = () => {
      document.querySelectorAll('video').forEach(video => {
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => {});
      });
    };

    // Attempt on load
    playAllVideos();

    // Re-attempt on any user touch/click/scroll if browser blocked initial autoplay
    const triggerPlay = () => {
      playAllVideos();
      window.removeEventListener('click', triggerPlay);
      window.removeEventListener('scroll', triggerPlay);
      window.removeEventListener('touchstart', triggerPlay);
    };

    window.addEventListener('click', triggerPlay);
    window.addEventListener('scroll', triggerPlay);
    window.addEventListener('touchstart', triggerPlay);
  }

  // Sticky Navbar State
  initNavbarScroll() {
    const navbar = document.getElementById('mainNavbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('shadow-md', 'bg-white/95', 'border-slate-200');
        navbar.classList.remove('bg-transparent', 'border-transparent');
      } else {
        navbar.classList.remove('shadow-md', 'bg-white/95', 'border-slate-200');
        navbar.classList.add('bg-transparent', 'border-transparent');
      }
    });
  }

  // Scroll Triggered Reveals & Animated Numbers
  initScrollReveal() {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
      revealObserver.observe(el);
    });

    // Counters
    const countersSection = document.getElementById('heroCountersSection');
    if (countersSection) {
      const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.countersAnimated) {
            this.countersAnimated = true;
            this.animateAllCounters();
          }
        });
      }, { threshold: 0.2 });
      counterObserver.observe(countersSection);
    }

    // Map section trigger
    const mapSection = document.getElementById('map');
    if (mapSection) {
      const mapObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && window.AapdaMissionsMap) {
            window.AapdaMissionsMap.init();
          }
        });
      }, { threshold: 0.1 });
      mapObserver.observe(mapSection);
    }
  }

  animateAllCounters() {
    document.querySelectorAll('.stat-counter').forEach(el => {
      const target = parseFloat(el.dataset.target || 0);
      const isPercent = el.dataset.percent === 'true';
      const isSeconds = el.dataset.seconds === 'true';
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      
      let current = 0;
      const duration = 1800;
      const steps = 40;
      const increment = target / steps;
      const intervalTime = duration / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }

        if (isPercent) {
          el.textContent = `${prefix}${Math.round(current)}%`;
        } else if (isSeconds) {
          el.textContent = `<${Math.round(current)} sec`;
        } else {
          el.textContent = `${prefix}${Math.round(current)}${suffix}`;
        }
      }, intervalTime);
    });
  }

  // 3D Magnetic Card Tilt Interaction
  initMagneticCardTilt() {
    const cards = document.querySelectorAll('.tilt-card, .glass-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
      });
    });
  }

  // Mouse Ambient Follower Glow
  initCursorGlow() {
    const glow = document.createElement('div');
    glow.className = 'mouse-ambient-glow hidden md:block';
    document.body.appendChild(glow);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const updateGlow = () => {
      currentX += (mouseX - currentX) * 0.1;
      currentY += (mouseY - currentY) * 0.1;
      glow.style.left = `${currentX}px`;
      glow.style.top = `${currentY}px`;
      requestAnimationFrame(updateGlow);
    };
    updateGlow();
  }

  // FAQ Accordion
  initFaqAccordion() {
    document.querySelectorAll('.faq-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const content = item.querySelector('.faq-content');
        const icon = btn.querySelector('.faq-icon');
        const isOpen = !content.classList.contains('hidden');

        document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');

        if (!isOpen) {
          content.classList.remove('hidden');
          if (icon) icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  }

  // Demo Booking Modal
  initDemoModal() {
    const modal = document.getElementById('demoBookingModal');
    if (!modal) return;

    window.openDemoModal = () => {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };

    window.closeDemoModal = () => {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    };

    window.handleDemoFormSubmit = (e) => {
      e.preventDefault();
      const form = e.target;
      const successMsg = document.getElementById('demoSuccessMsg');
      
      if (successMsg) {
        form.classList.add('hidden');
        successMsg.classList.remove('hidden');
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaApp = new MainAppController();
  if (window.lucide) lucide.createIcons();
});
