document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('widget-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set real canvas dimensions
  const size = 120;
  canvas.width = size * window.devicePixelRatio;
  canvas.height = size * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const centerX = size / 2;
  const centerY = size / 2;

  let state = 'idle'; // idle, listening, thinking, speaking, alert
  let rotation = 0;
  let rotationInner = 0;
  let pulse = 0;
  let audioLevel = 0;

  // Orbiting particles
  const particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      radius: 18 + Math.random() * 28,
      speed: (Math.random() * 0.03 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 1.6 + 0.8,
      opacity: Math.random() * 0.8 + 0.2
    });
  }

  function getColor(opacity = 1) {
    if (state === 'alert') return `rgba(239, 68, 68, ${opacity})`;
    if (state === 'thinking') return `rgba(245, 158, 11, ${opacity})`;
    if (state === 'listening') return `rgba(255, 255, 255, ${opacity})`;
    if (state === 'speaking') return `rgba(226, 232, 240, ${opacity})`;
    return `rgba(255, 255, 255, ${opacity})`;
  }

  function render() {
    ctx.clearRect(0, 0, size, size);

    const speedMultiplier = state === 'thinking' ? 3.5 : (state === 'listening' ? 1.8 : 1);
    rotation += 0.008 * speedMultiplier;
    rotationInner -= 0.012 * speedMultiplier;
    pulse += 0.05;

    const baseColor = getColor(1);
    const glowRadius = (Math.sin(pulse) * 0.15 + 0.85) + (audioLevel * 0.4);

    // 1. Outermost subtle dashed ring (Radius: 55px)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation * 0.4);
    ctx.strokeStyle = getColor(0.3);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Outer Rotating HUD Ring with 8 notches (Radius: 48px)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    ctx.strokeStyle = getColor(0.6);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    const numNodes = 8;
    for (let i = 0; i < numNodes; i++) {
      const angle = (i * Math.PI * 2) / numNodes;
      const x = Math.cos(angle) * 48;
      const y = Math.sin(angle) * 48;

      ctx.fillStyle = (i % 2 === 0) ? getColor(1) : getColor(0.4);
      ctx.beginPath();
      ctx.arc(x, y, (i % 2 === 0) ? 2 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Inner Orbiting Ring encircling the CY9 Logo (Radius: 40px)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationInner);

    ctx.strokeStyle = getColor(0.75);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.stroke();

    // 6 Solenoid Tick Nodes
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      const x1 = Math.cos(a) * 37;
      const y1 = Math.sin(a) * 37;
      const x2 = Math.cos(a) * 41;
      const y2 = Math.sin(a) * 41;

      ctx.strokeStyle = getColor(0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Orbiting Quantum Energy Particles around the Logo
    for (const p of particles) {
      p.angle += p.speed * speedMultiplier;
      const r = 38 + Math.sin(p.angle * 2 + pulse) * 12 + (audioLevel * 6);
      const px = centerX + Math.cos(p.angle) * r;
      const py = centerY + Math.sin(p.angle) * r;

      ctx.fillStyle = getColor(p.opacity * glowRadius);
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // ----------------------------------------------------
  // Dragging & Interaction Handling
  // ----------------------------------------------------
  const orb = document.getElementById('orb-container');
  const contextMenu = document.getElementById('widget-context-menu');
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startY = 0;

  // Single or double click restores the main HUD window
  orb.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left click
      isDragging = true;
      dragMoved = false;
      startX = e.screenX;
      startY = e.screenY;
      if (!contextMenu.classList.contains('hidden')) {
        contextMenu.classList.add('hidden');
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = Math.abs(e.screenX - startX);
      const dy = Math.abs(e.screenY - startY);
      if (dx > 3 || dy > 3) {
        dragMoved = true;
        // Request window move via IPC if available
        if (window.jarvisAPI && window.jarvisAPI.moveWidget) {
          window.jarvisAPI.moveWidget(e.screenX - startX, e.screenY - startY);
          startX = e.screenX;
          startY = e.screenY;
        }
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 && isDragging) {
      isDragging = false;
      if (!dragMoved) {
        // Simple click -> Open main CY9 app!
        if (window.jarvisAPI && window.jarvisAPI.restoreFromWidget) {
          window.jarvisAPI.restoreFromWidget();
        }
      }
    }
  });

  // Right-click context menu (Native Windows Menu with zero clipping)
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (window.jarvisAPI && window.jarvisAPI.showWidgetContextMenu) {
      window.jarvisAPI.showWidgetContextMenu();
    } else if (contextMenu) {
      contextMenu.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target) && e.target !== orb) {
      contextMenu.classList.add('hidden');
    }
  });

  // Context Menu Actions
  document.getElementById('ctx-open-hud')?.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
    if (window.jarvisAPI && window.jarvisAPI.restoreFromWidget) {
      window.jarvisAPI.restoreFromWidget();
    }
  });

  document.getElementById('ctx-voice')?.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
    if (window.jarvisAPI && window.jarvisAPI.restoreFromWidget) {
      window.jarvisAPI.restoreFromWidget(true); // with voice trigger
    }
  });

  const autostartText = document.getElementById('ctx-autostart-text');
  if (window.jarvisAPI && window.jarvisAPI.getAutoStart) {
    window.jarvisAPI.getAutoStart().then(enabled => {
      if (autostartText) {
        autostartText.textContent = `التشغيل مع الويندوز: ${enabled ? 'مفعّل' : 'معطّل'}`;
      }
    });
  }

  document.getElementById('ctx-autostart')?.addEventListener('click', async () => {
    if (window.jarvisAPI && window.jarvisAPI.toggleAutoStart) {
      const isNowEnabled = await window.jarvisAPI.toggleAutoStart();
      if (autostartText) {
        autostartText.textContent = `التشغيل مع الويندوز: ${isNowEnabled ? 'مفعّل' : 'معطّل'}`;
      }
    }
    contextMenu.classList.add('hidden');
  });

  document.getElementById('ctx-quit')?.addEventListener('click', () => {
    if (window.jarvisAPI && window.jarvisAPI.quitApp) {
      window.jarvisAPI.quitApp();
    }
  });

  // Listen for state/audio updates from main process if available
  if (window.jarvisAPI && window.jarvisAPI.onWidgetUpdate) {
    window.jarvisAPI.onWidgetUpdate((data) => {
      if (data.state) state = data.state;
      if (typeof data.audioLevel === 'number') audioLevel = data.audioLevel;
    });
  }
});
