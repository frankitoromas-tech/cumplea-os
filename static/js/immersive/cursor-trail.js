/* ══════════════════════════════════════════════════════════════
   cursor-trail.js — Estela de partículas que sigue al cursor
   ──────────────────────────────────────────────────────────────
   • Se dibuja sobre un <canvas> dedicado, position:fixed top.
   • Reacciona al audio leyendo window.__immersiveBg.readBands()
     (el AnalyserNode que tú añadiste en bg-particles.js).
   • Solo se activa en pointer-fine (ratón); en táctil se queda
     dormido para no comerte FPS.
   • Se oculta automáticamente cuando pantallaBloqueo o pantallaAuth
     están visibles, o cuando hay un modo cine abierto.
   • Cero dependencias.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__cursorTrail) return;
  window.__cursorTrail = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine    = matchMedia('(pointer: fine)').matches;
  if (reduced || !fine) return;

  /* ── Canvas dedicado ─────────────────────────────────────── */
  const cv = document.createElement('canvas');
  cv.id = 'cursorTrailCanvas';
  Object.assign(cv.style, {
    position: 'fixed', inset: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9985',
    mixBlendMode: 'screen',
    opacity: '0',
    transition: 'opacity .4s ease',
  });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    W = cv.width  = innerWidth  * devicePixelRatio;
    H = cv.height = innerHeight * devicePixelRatio;
    cv.style.width  = innerWidth  + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  /* ── Estado ──────────────────────────────────────────────── */
  let mx = innerWidth / 2, my = innerHeight / 2;
  let lastSpawn = 0;
  const particles = [];
  const MAX = 240;

  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  /* ── Visibilidad condicionada (no compite con bloqueo/cine) ── */
  function shouldShow() {
    const bloqueo = document.getElementById('pantallaBloqueo');
    const auth    = document.getElementById('pantallaAuth');
    const lock = (bloqueo && !bloqueo.classList.contains('oculto')) ||
                 (auth    && !auth.classList.contains('oculto'));
    if (lock) return false;
    if (document.body.classList.contains('cinema-active')) return false;
    return true;
  }
  function syncVisibility() {
    const show = shouldShow();
    cv.style.opacity = show ? '1' : '0';
    // Si pasó de oculto a visible y el loop estaba dormido, despertarlo
    if (show && !rafId && frame.__started) {
      rafId = requestAnimationFrame(frame);
    }
  }
  syncVisibility();
  new MutationObserver(syncVisibility).observe(document.body, {
    subtree: true, attributes: true, attributeFilter: ['class'],
  });

  /* ── Spawn de partículas ─────────────────────────────────── */
  function spawn(level, bass) {
    const now = performance.now();
    const interval = 16 - Math.min(10, level * 22);   // más volumen → más densidad
    if (now - lastSpawn < interval) return;
    lastSpawn = now;

    // Color cálido base; con bajo intensifica el rosa
    const hue = 320 + Math.random() * 30 - bass * 18;
    const sat = 70 + bass * 25;

    particles.push({
      x: mx + (Math.random() - 0.5) * 10,
      y: my + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6 - 0.4,
      r: 0.9 + Math.random() * 1.5 + level * 1.6,
      a: 0.95,
      hue, sat,
      life: 1,
    });
    if (particles.length > MAX) particles.splice(0, particles.length - MAX);
  }

  /* ── Loop ────────────────────────────────────────────────── */
  let rafId = 0;
  function frame() {
    // Mejora: si está oculto, NO programamos siguiente RAF.
    // El syncVisibility (MutationObserver) re-arranca el loop al volver a ser visible.
    if (cv.style.opacity === '0') {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particles.length = 0;
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(frame);

    const bands = window.__immersiveBg?.readBands?.() || { bass: 0, mid: 0, treble: 0, level: 0 };

    spawn(bands.level, bands.bass);

    // Trail con fade — pintar un rectángulo translúcido encima
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.018;
      p.r   *= 0.985;
      if (p.life <= 0 || p.r < 0.2) {
        particles.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, 78%, ${p.life * 0.85})`;
      ctx.shadowColor = `hsla(${p.hue}, ${p.sat}%, 75%, ${p.life})`;
      ctx.shadowBlur  = 8 + bands.bass * 18;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Espera al primer pointer real para arrancar el bucle
  addEventListener('pointermove', () => {
    if (!frame.__started) {
      frame.__started = true;
      rafId = requestAnimationFrame(frame);
    }
  }, { once: true, passive: true });
})();
