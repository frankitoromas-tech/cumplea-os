/* ══════════════════════════════════════════════════════════════
   audio-stars.js — Estrellas reactivas a la música (Web Audio API)
   ──────────────────────────────────────────────────────────────
   Capa adicional de estrellas que reaccionan al audio en tiempo real:
     • Tamaño y brillo pulsan con los GRAVES (bass).
     • Velocidad de parpadeo con los AGUDOS (treble).
     • Posición ligeramente influida por los MEDIOS (mid).

   Usa el AnalyserNode que ya está conectado en bg-particles.js
   (window.__immersiveBg.readBands). NO toca el canvasFondo del
   script.js base, sino añade un canvas overlay propio z-index 0.

   Cuando NO hay analyser disponible aún (audio sin desbloquear),
   las estrellas siguen titilando con un patrón orgánico aleatorio.

   Pausa cuando la pestaña no es visible. Apagado en bloqueo/auth.
   Respeta prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__audioStars) return;
  window.__audioStars = true;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const STAR_COUNT = 280;

  /* ── Canvas overlay ──────────────────────────────────────── */
  const cv = document.createElement('canvas');
  cv.id = 'audioStarsCanvas';
  cv.setAttribute('aria-hidden', 'true');
  Object.assign(cv.style, {
    position: 'fixed', inset: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '0',
    mixBlendMode: 'screen',
    opacity: '0',
    transition: 'opacity .9s ease',
  });
  function appendCanvas() {
    if (cv.parentNode) return;
    if (document.body) document.body.appendChild(cv);
    else document.addEventListener('DOMContentLoaded', appendCanvas, { once: true });
  }
  appendCanvas();

  const ctx = cv.getContext('2d');
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = cv.width  = innerWidth  * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width  = innerWidth  + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  /* ── Generador de estrellas ──────────────────────────────── */
  // Cada estrella: posición base, fase de twinkle, color por grupo.
  // Tres colores por grupo para variar la paleta sutil.
  const PALETA = [
    [255, 235, 200],  // dorado cálido
    [255, 180, 220],  // rosa Luna
    [200, 220, 255],  // azul estelar
    [255, 255, 255],  // blanco puro
  ];

  const stars = Array.from({ length: STAR_COUNT }, () => {
    const c = PALETA[Math.floor(Math.random() * PALETA.length)];
    return {
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.3 + Math.random() * 1.7,            // radio base
      phase: Math.random() * Math.PI * 2,       // offset de twinkle
      speed: 0.3 + Math.random() * 1.4,         // velocidad de twinkle base
      drift: 0.02 + Math.random() * 0.05,       // movimiento muy lento
      angle: Math.random() * Math.PI * 2,
      color: c,
      group: Math.random() < 0.3 ? 'bass'
           : Math.random() < 0.5 ? 'mid' : 'treble',
    };
  });

  /* ── Visibilidad / pausa ─────────────────────────────────── */
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) tick();
  });

  function lockGate() {
    const bloqueo = document.getElementById('pantallaBloqueo');
    const auth    = document.getElementById('pantallaAuth');
    const lock = (bloqueo && !bloqueo.classList.contains('oculto')) ||
                 (auth    && !auth.classList.contains('oculto'));
    cv.style.opacity = lock ? '0' : '1';
  }
  function watchLockChanges() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', watchLockChanges, { once: true });
      return;
    }
    lockGate();
    new MutationObserver(lockGate).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class'],
    });
  }
  watchLockChanges();

  /* ── Render loop ──────────────────────────────────────────── */
  let t = 0;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    t += 0.016;

    // Limpieza con leve persistencia (trail muy sutil)
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // Lee bandas si hay analyser
    const bands = (window.__immersiveBg && window.__immersiveBg.readBands)
      ? window.__immersiveBg.readBands()
      : { bass: 0, mid: 0, treble: 0, level: 0 };

    // Pintar cada estrella reactiva a SU banda asignada
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const band = bands[s.group];   // 0..1

      // Twinkle base + boost por banda
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed * (1 + band * 2.5) + s.phase);
      const glow = tw * (0.55 + band * 0.7);

      // Tamaño: base + boost por banda asignada
      const size = s.r * (1 + band * 1.6);

      // Drift suave
      s.x += Math.cos(s.angle) * s.drift * (1 + bands.mid * 0.6);
      s.y += Math.sin(s.angle) * s.drift * (1 + bands.mid * 0.6);
      // Wrap-around
      if (s.x < -10)             s.x = innerWidth + 10;
      if (s.x > innerWidth + 10) s.x = -10;
      if (s.y < -10)             s.y = innerHeight + 10;
      if (s.y > innerHeight + 10) s.y = -10;

      const [r, g, b] = s.color;

      // Halo (suma aditiva)
      const haloR = size * (3 + band * 4);
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${0.18 * glow})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.07 * glow})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + glow * 0.5})`;
      ctx.fill();

      // Punto blanco brillante en kick (solo bass)
      if (s.group === 'bass' && band > 0.4) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${band * 0.85})`;
        ctx.fill();
      }
    }
  }
  tick();

  /* ── API ──────────────────────────────────────────────────── */
  window.__audioStars = {
    canvas: cv,
    count: STAR_COUNT,
    setOpacity: v => { cv.style.opacity = String(Math.max(0, Math.min(1, v))); },
  };
})();
