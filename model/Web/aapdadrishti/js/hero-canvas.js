// AapdaDrishti - Enhanced 3D Topographic Terrain & Particle Physics Engine

class EnhancedHeroCanvas {
  constructor() {
    this.canvas = document.getElementById('heroBgCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, speed: 0 };
    this.time = 0;
    this.animId = null;
    this.gridCols = 36;
    this.gridRows = 20;
    this.particles = [];
    this.ripples = [];

    this.resize();
    this.initParticles();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('click', (e) => this.handleClick(e));

    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.parentElement.clientWidth || window.innerWidth;
    this.height = this.canvas.parentElement.clientHeight || window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        color: i % 3 === 0 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(79, 70, 229, 0.45)',
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / this.width - 0.5;
    const ny = (e.clientY - rect.top) / this.height - 0.5;
    
    this.mouse.speed = Math.hypot(nx - this.mouse.targetX, ny - this.mouse.targetY);
    this.mouse.targetX = nx;
    this.mouse.targetY = ny;
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.ripples.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      radius: 5,
      maxRadius: 140,
      opacity: 0.6
    });
  }

  start() {
    const render = () => {
      this.time += 0.016;
      // Damped smooth mouse tracking
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

      this.draw();
      this.animId = requestAnimationFrame(render);
    };
    this.animId = requestAnimationFrame(render);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Update & draw ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 2.5;
      r.opacity *= 0.96;

      ctx.strokeStyle = `rgba(0, 229, 255, ${r.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      if (r.radius >= r.maxRadius || r.opacity < 0.02) {
        this.ripples.splice(i, 1);
      }
    }

    // Topographic undulating wave mesh
    ctx.save();
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.12)';
    ctx.lineWidth = 1;

    const cellW = w / this.gridCols;
    const cellH = h / this.gridRows;

    // Horizontal waves
    for (let r = 0; r <= this.gridRows; r++) {
      ctx.beginPath();
      for (let c = 0; c <= this.gridCols; c++) {
        const x = c * cellW;
        const baseY = r * cellH;

        const distFromCenter = Math.hypot((c / this.gridCols - 0.5), (r / this.gridRows - 0.5));
        const elevation = Math.sin(c * 0.22 + this.time + this.mouse.x * 4.5) * 16 * Math.cos(r * 0.28 + this.time * 0.9) +
                          Math.sin(distFromCenter * 7 - this.time * 1.4) * 12;
        
        const y = baseY + elevation + (this.mouse.y * 36 * (r / this.gridRows));

        if (c === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Vertical contour lines
    for (let c = 0; c <= this.gridCols; c++) {
      ctx.beginPath();
      for (let r = 0; r <= this.gridRows; r++) {
        const x = c * cellW;
        const baseY = r * cellH;
        const distFromCenter = Math.hypot((c / this.gridCols - 0.5), (r / this.gridRows - 0.5));
        const elevation = Math.sin(c * 0.22 + this.time + this.mouse.x * 4.5) * 16 * Math.cos(r * 0.28 + this.time * 0.9) +
                          Math.sin(distFromCenter * 7 - this.time * 1.4) * 12;
        const y = baseY + elevation + (this.mouse.y * 36 * (r / this.gridRows));

        if (r === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Floating Sensor Particles
    this.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      p.pulse += 0.03;
      const currentSize = p.size + Math.sin(p.pulse) * 0.6;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, currentSize), 0, Math.PI * 2);
      ctx.fill();

      // Connecting fine laser lines to nearby particles
      for (let j = idx + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 90) {
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.18 * (1 - dist / 90)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });

    ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AapdaHeroCanvas = new EnhancedHeroCanvas();
});
