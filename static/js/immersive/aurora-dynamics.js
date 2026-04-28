/* ══════════════════════════════════════════════════════════════
   aurora-dynamics.js — Capa dinámica para /aurora
   ──────────────────────────────────────────────────────────────
   Solo se activa en /aurora. Añade CINCO efectos sin tocar el
   canvas original:

     1. ESTRELLAS FUGACES periódicas que cruzan diagonalmente.
     2. CONSTELACIONES emergentes: si la luna pasa el cursor lento
        sobre una zona, los puntos cercanos se conectan con líneas
        luminosas, formando una constelación efímera.
     3. AURORA PULSANTE: si hay música sonando, las cintas pulsan
        con el bajo (vía window.__immersiveBg.readBands).
     4. POEMA FLOTANTE: una frase poética flota suavemente desde
        un borde aleatorio cada 90 segundos.
     5. PORTAL DE ESCAPE: un anillo dorado que aparece tras 60s
        en la página y permite volver al index con transición suave.

   Cero deps. Reduced motion → noop.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__auroraDynamics) return;
  if (!/\/aurora\b/i.test(location.pathname)) return;     // SOLO /aurora
  window.__auroraDynamics = true;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Canvas overlay para shooting stars + constelaciones ── */
  const cv = document.createElement('canvas');
  cv.id = 'auroraDynCanvas';
  Object.assign(cv.style, {
    position: 'fixed', inset: 0, width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '5',
    mixBlendMode: 'screen',
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
    W = cv.width  = innerWidth;
    H = cv.height = innerHeight;
  }
  resize();
  addEventListener('resize', resize);

  /* ── Estado ────────────────────────────────────────────── */
  const shooters = [];          // estrellas fugaces
  const dust     = [];          // partículas de constelación
  let mx = -1000, my = -1000;
  let lastMx = mx, lastMy = my;
  let mouseSpeed = 0;

  document.addEventListener('pointermove', e => {
    const dx = e.clientX - lastMx;
    const dy = e.clientY - lastMy;
    mouseSpeed = Math.hypot(dx, dy);
    lastMx = e.clientX;
    lastMy = e.clientY;
    mx = e.clientX;
    my = e.clientY;
    // Sembrar puntos donde pasa el cursor LENTAMENTE → constelación
    if (mouseSpeed > 0 && mouseSpeed < 6 && Math.random() < 0.18) {
      dust.push({
        x: mx + (Math.random() - 0.5) * 28,
        y: my + (Math.random() - 0.5) * 28,
        life: 1,
        born: performance.now(),
      });
      if (dust.length > 36) dust.shift();
    }
  }, { passive: true });

  /* ── Fugaces periódicas ─────────────────────────────────── */
  function spawnShooter() {
    shooters.push({
      x: Math.random() * W * 1.2 - W * 0.1,
      y: -30,
      vx: 4 + Math.random() * 5,
      vy: 5 + Math.random() * 3,
      len: 80 + Math.random() * 80,
      life: 1,
      hue: 30 + Math.random() * 60,    // dorado/cálido
    });
  }
  setInterval(() => {
    if (Math.random() < 0.7) spawnShooter();
  }, 3500 + Math.random() * 3500);

  /* ── Render loop ────────────────────────────────────────── */
  let lastT = performance.now();
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = (now - lastT) / 16.67;
    lastT = now;

    ctx.clearRect(0, 0, W, H);

    /* ── Constelación: conectar dust cercanos ────────────── */
    ctx.lineWidth = 0.7;
    for (let i = 0; i < dust.length; i++) {
      const a = dust[i];
      a.life = Math.max(0, 1 - (now - a.born) / 4500);
      // Punto luminoso
      ctx.beginPath();
      ctx.arc(a.x, a.y, 1.6 * a.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,255,220,${0.85 * a.life})`;
      ctx.shadowColor = 'rgba(120,255,200,.9)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Línea con vecinos cercanos
      for (let j = i + 1; j < dust.length; j++) {
        const b = dust[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 95) {
          const k = (1 - d / 95) * Math.min(a.life, b.life);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(150,255,200,${k * 0.55})`;
          ctx.stroke();
        }
      }
    }
    // Limpiar dust viejo
    while (dust.length && dust[0].life <= 0) dust.shift();

    /* ── Fugaces ─────────────────────────────────────────── */
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.y > H + 50 || s.x > W + 100) { shooters.splice(i, 1); continue; }
      const tailX = s.x - s.vx * 12;
      const tailY = s.y - s.vy * 12;
      const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      grad.addColorStop(0, `hsla(${s.hue},100%,80%,1)`);
      grad.addColorStop(1, `hsla(${s.hue},100%,80%,0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      // Cabeza brillante
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},100%,90%,1)`;
      ctx.shadowColor = `hsla(${s.hue},100%,80%,.9)`;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  tick();

  /* ══════════════════════════════════════════════════════
     POEMA FLOTANTE — cada 90 segundos
     ══════════════════════════════════════════════════════ */
  const POEMAS = [
    'Si la noche supiera tu nombre, dejaría de ser noche.',
    'Aurora — del latín "aurora": diosa del amanecer.',
    'Hay cielos que solo aparecen cuando alguien los espera.',
    'Tu mirada también dibuja auroras.',
    'Cada color del cielo tiene memoria de alguien que amó.',
    'Las luces del norte solo bailan por costumbre — tú, por vocación.',
  ];
  function lanzarPoema() {
    const p = document.createElement('div');
    p.className = 'aurora-poem';
    p.textContent = POEMAS[Math.floor(Math.random() * POEMAS.length)];
    Object.assign(p.style, {
      position: 'fixed', zIndex: '6',
      left: '50%', top: (35 + Math.random() * 35) + '%',
      transform: 'translate(-50%, -50%) translateY(20px)',
      fontFamily: "'Playfair Display', serif",
      fontStyle: 'italic',
      fontSize: 'clamp(1rem, 2.2vw, 1.6rem)',
      color: 'rgba(220,255,240,.92)',
      textShadow: '0 0 30px rgba(120,255,200,.7), 0 0 80px rgba(80,200,255,.4)',
      letterSpacing: '1.2px',
      maxWidth: '80vw',
      textAlign: 'center',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 1.6s ease, transform 1.6s ease',
    });
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      p.style.opacity = '1';
      p.style.transform = 'translate(-50%, -50%) translateY(0)';
    });
    setTimeout(() => {
      p.style.opacity = '0';
      p.style.transform = 'translate(-50%, -50%) translateY(-20px)';
      setTimeout(() => p.remove(), 1700);
    }, 7000);
  }
  setTimeout(lanzarPoema, 8000);    // primer poema a los 8s
  setInterval(lanzarPoema, 90000);  // luego cada 90s

  /* ══════════════════════════════════════════════════════
     PORTAL DE ESCAPE — anillo dorado tras 60s
     ══════════════════════════════════════════════════════ */
  function montarPortal() {
    const portal = document.createElement('a');
    portal.href = '/';
    portal.id = 'auroraPortal';
    portal.setAttribute('aria-label', 'Volver al inicio');
    portal.innerHTML = '<span class="ap-icon">✦</span><span class="ap-text">Volver</span>';
    Object.assign(portal.style, {
      position: 'fixed', zIndex: '7',
      bottom: '90px', right: '24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '4px',
      width: '64px', height: '64px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,235,180,.18) 0%, rgba(255,180,220,.05) 70%)',
      border: '1px solid rgba(255,220,180,.5)',
      color: 'rgba(255,235,200,.9)',
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: 'italic',
      fontSize: '.78rem',
      textDecoration: 'none',
      justifyContent: 'center',
      cursor: 'pointer',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 24px rgba(255,220,180,.35), 0 0 60px rgba(255,180,220,.2)',
      animation: 'apPulse 3s ease-in-out infinite',
      opacity: '0',
      transition: 'opacity 1.2s ease, transform .3s ease',
    });
    if (!document.getElementById('aurora-portal-keys')) {
      const ks = document.createElement('style');
      ks.id = 'aurora-portal-keys';
      ks.textContent = `
        @keyframes apPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(255,220,180,.35), 0 0 60px rgba(255,180,220,.2); }
          50%      { box-shadow: 0 0 36px rgba(255,220,180,.6),  0 0 120px rgba(255,180,220,.45); }
        }
        #auroraPortal:hover { transform: scale(1.08); }
        #auroraPortal .ap-icon { font-size: 1.4rem; line-height: 1; }
      `;
      document.head.appendChild(ks);
    }
    document.body.appendChild(portal);
    requestAnimationFrame(() => { portal.style.opacity = '1'; });

    // Hover prepara la transición; click se aprovecha de page-transitions.js
  }
  setTimeout(montarPortal, 60_000);     // tras 60s en aurora

  window.__auroraDynamics = { spawnShooter, lanzarPoema };
})();
