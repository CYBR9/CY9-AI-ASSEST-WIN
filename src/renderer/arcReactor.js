class ArcReactorVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = this.canvas.width = 260;
    this.height = this.canvas.height = 260;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.state = 'idle'; // idle, listening, thinking, speaking, alert
    this.rotation = 0;
    this.rotationInner = 0;
    this.pulse = 0;
    this.audioLevel = 0; // 0 to 1

    // Orbiting particles
    this.particles = [];
    for (let i = 0; i < 36; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 65,
        speed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.8 + 0.2
      });
    }

    this.logoImg = new Image();
    this.logoImg.src = 'assets/CY9.png';

    this.startAnimation();
  }

  setState(newState) {
    this.state = newState;
  }

  setAudioLevel(level) {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  getColor(opacity = 1) {
    const computed = getComputedStyle(document.body);
    const color = computed.getPropertyValue('--accent-color').trim() || '#ffffff';
    if (this.state === 'alert') return `rgba(239, 68, 68, ${opacity})`;
    if (this.state === 'thinking') return `rgba(245, 158, 11, ${opacity})`;
    
    // Parse hex to rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16) || 255;
      const g = parseInt(color.slice(3, 5), 16) || 255;
      const b = parseInt(color.slice(5, 7), 16) || 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }

  startAnimation() {
    const animate = () => {
      this.render();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const speedMultiplier = this.state === 'thinking' ? 3.5 : (this.state === 'listening' ? 1.8 : 1);
    this.rotation += 0.008 * speedMultiplier;
    this.rotationInner -= 0.012 * speedMultiplier;
    this.pulse += 0.04;

    const baseColor = this.getColor(1);
    const glowRadius = (Math.sin(this.pulse) * 0.12 + 0.88) + (this.audioLevel * 0.4);

    // 1. Outermost segmented dashed ring
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation * 0.5);
    ctx.strokeStyle = this.getColor(0.25);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Main Outer HUD Ring with tick marks
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotation);
    
    ctx.strokeStyle = this.getColor(0.5);
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 104, 0, Math.PI * 2);
    ctx.stroke();

    // 12 Outer Nodes / Arc Triangles
    const numNodes = 12;
    for (let i = 0; i < numNodes; i++) {
      const angle = (i * Math.PI * 2) / numNodes;
      const x = Math.cos(angle) * 104;
      const y = Math.sin(angle) * 104;

      ctx.fillStyle = (i % 3 === 0) ? this.getColor(0.9) : this.getColor(0.3);
      ctx.beginPath();
      ctx.arc(x, y, (i % 3 === 0) ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Tick notch
      ctx.strokeStyle = this.getColor(0.4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 98, Math.sin(angle) * 98);
      ctx.lineTo(Math.cos(angle) * 104, Math.sin(angle) * 104);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Middle Concentric Reactor Ring with Power Coils
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.rotationInner);

    ctx.strokeStyle = this.getColor(0.7);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();

    // 8 Power Solenoid Coils
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const x1 = Math.cos(a) * 66;
      const y1 = Math.sin(a) * 66;
      const x2 = Math.cos(a) * 78;
      const y2 = Math.sin(a) * 78;

      ctx.strokeStyle = this.getColor(0.85);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Orbiting Quantum Energy Particles
    for (const p of this.particles) {
      p.angle += p.speed * speedMultiplier;
      const px = this.centerX + Math.cos(p.angle) * (p.radius + (this.audioLevel * 10));
      const py = this.centerY + Math.sin(p.angle) * (p.radius + (this.audioLevel * 10));

      ctx.fillStyle = this.getColor(p.opacity * glowRadius);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 5. Central CY9 Core Emblem
    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    // Inner Core Glow
    const coreGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 52 * glowRadius);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    coreGrad.addColorStop(0.5, this.getColor(0.2));
    coreGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 52 * glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw central CY9 circular emblem
    const logoRadius = 40 * (Math.sin(this.pulse * 1.5) * 0.04 + 0.98) + (this.audioLevel * 4);

    if (this.logoImg && this.logoImg.complete && this.logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, logoRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.logoImg, -logoRadius, -logoRadius, logoRadius * 2, logoRadius * 2);
      ctx.restore();
    } else {
      // Fallback: elegant black disc with CY9 serif text
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, logoRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CY9.', 0, 0);
    }

    // Outer border for central emblem
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, logoRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

window.ArcReactorVisualizer = ArcReactorVisualizer;
