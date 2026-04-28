/* ══════════════════════════════════════════════════════════════
   gift-burst.js — Burst dramático al abrir el regalo
   ──────────────────────────────────────────────────────────────
   La animación CSS .abriendo-caja en styless.css solo hace que el
   emoji 🎁 vuele hacia arriba mientras el texto se desvanece. Es
   sutil. Aquí añadimos un BURST visible: aro de luz expansivo +
   estrellas que salen disparadas + flash blanco breve, todo
   centrado en el botón.

   No toca script.js. Solo escucha el click sobre #botonRegalo y
   añade overlay temporal (z-index alto, pointer-events:none).
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__giftBurst) return;
  window.__giftBurst = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  function injectStyles() {
    if (document.getElementById('gift-burst-style')) return;
    const s = document.createElement('style');
    s.id = 'gift-burst-style';
    s.textContent = `
      .gb-flash {
        position: fixed; pointer-events: none; z-index: 9988;
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(.2);
        opacity: 1;
        background: radial-gradient(circle,
          rgba(255,235,200,.95) 0%,
          rgba(255,180,220,.55) 40%,
          rgba(255,107,129,0)   80%);
        animation: gbFlash .9s cubic-bezier(.22,1,.36,1) forwards;
        will-change: transform, opacity;
      }
      @keyframes gbFlash {
        0%   { transform: translate(-50%,-50%) scale(.2); opacity: 1; }
        45%  { transform: translate(-50%,-50%) scale(2.4); opacity: .9; }
        100% { transform: translate(-50%,-50%) scale(5);   opacity: 0; }
      }
      .gb-ring {
        position: fixed; pointer-events: none; z-index: 9987;
        border: 3px solid rgba(255,210,170,.85);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(.3);
        animation: gbRing 1.1s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes gbRing {
        0%   { transform: translate(-50%,-50%) scale(.3); opacity: 1; border-width: 3px; }
        100% { transform: translate(-50%,-50%) scale(7);  opacity: 0; border-width: 1px; }
      }
      .gb-spark {
        position: fixed; pointer-events: none; z-index: 9989;
        font-size: 1.7rem;
        transform: translate(-50%, -50%);
        will-change: transform, opacity;
        text-shadow: 0 0 18px rgba(255,180,220,.7);
        animation: gbSpark 1.4s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes gbSpark {
        0%   { transform: translate(-50%,-50%) scale(.4) rotate(0); opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: translate(calc(-50% + var(--vx)), calc(-50% + var(--vy))) scale(.4) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  function explode(cx, cy) {
    injectStyles();

    // Flash central
    const flash = document.createElement('div');
    flash.className = 'gb-flash';
    flash.style.left = cx + 'px';
    flash.style.top  = cy + 'px';
    flash.style.width = '120px';
    flash.style.height = '120px';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 950);

    // Aro doble
    [0, 200].forEach((delay, i) => {
      setTimeout(() => {
        const r = document.createElement('div');
        r.className = 'gb-ring';
        r.style.left = cx + 'px';
        r.style.top  = cy + 'px';
        r.style.width  = '90px';
        r.style.height = '90px';
        r.style.borderColor = i === 0 ? 'rgba(255,210,170,.85)' : 'rgba(255,140,180,.7)';
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 1150);
      }, delay);
    });

    // Estrellas/sparkles que salen disparadas
    const emojis = ['✨','🌟','💫','✦','⭐','💖','🎉'];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const ang = (Math.PI * 2 / N) * i + (Math.random() - 0.5) * 0.3;
      const r = 180 + Math.random() * 220;
      const sp = document.createElement('span');
      sp.className = 'gb-spark';
      sp.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      sp.style.left = cx + 'px';
      sp.style.top  = cy + 'px';
      sp.style.setProperty('--vx', (Math.cos(ang) * r).toFixed(0) + 'px');
      sp.style.setProperty('--vy', (Math.sin(ang) * r).toFixed(0) + 'px');
      sp.style.animationDelay = (Math.random() * 80) + 'ms';
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 1500);
    }

    // SFX cinematográfico
    if (window.__immersiveAudio) {
      window.__immersiveAudio.sfx('reveal');
      setTimeout(() => window.__immersiveAudio.sfx('transition'), 220);
    }
  }

  /* ── Engancha al click del regalo (idempotente) ─────────── */
  function wire() {
    const btn = document.getElementById('botonRegalo');
    if (!btn) return false;
    if (btn.dataset.gbWired) return true;
    btn.dataset.gbWired = '1';
    btn.addEventListener('click', () => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      explode(cx, cy);
    }, { capture: true });   // captura para fire ANTES de la animación
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  // Re-intentar si el botón aparece después
  if (!wire()) {
    new MutationObserver(() => { if (wire()) {/* enganchado */} })
      .observe(document.body, { subtree: true, childList: true });
  }

  window.__giftBurst = { explode };
})();
