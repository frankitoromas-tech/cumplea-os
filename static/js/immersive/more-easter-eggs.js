/* ══════════════════════════════════════════════════════════════
   more-easter-eggs.js — Capa adicional de huevos de pascua
   ──────────────────────────────────────────────────────────────
   Reutiliza EasterEggBase / EasterEggTeclado del proyecto si
   existen (declaradas en EasterEggManager.js). Si no, cae a
   detectores propios.

   Easter eggs nuevos:
     1. Escribir "te amo"             → lluvia masiva de corazones
     2. Triple-click en #lunaInteractiva (escena luna abierta)
                                       → frase secreta sobre la luna
     3. Long-press 1.5s en .marco-foto → revela "Año XXXX" (poético)
     4. Aware de fechas:
          - Aniversario mensual del 30 → mini saludo en la consola
          - Domingos                   → toast cariñoso al cargar

   No toca ningún archivo del proyecto. Cero deps.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__moreEasterEggs) return;
  window.__moreEasterEggs = true;

  const useExisting = typeof EasterEggTeclado !== 'undefined';

  /* ─────────────────────────────────────────────────────────
     1) "te amo" → lluvia de corazones
     ───────────────────────────────────────────────────────── */
  function lluviaCorazones() {
    const emojis = ['💕','💖','💗','💞','🩷','❤️','💝'];
    const N = 40;
    if (!document.getElementById('mee-rain-style')) {
      const s = document.createElement('style');
      s.id = 'mee-rain-style';
      s.textContent = `
        @keyframes meeRain {
          0%   { opacity: 0; transform: translateY(-12vh) rotate(-12deg); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(112vh) rotate(18deg); }
        }
      `;
      document.head.appendChild(s);
    }
    for (let i = 0; i < N; i++) {
      setTimeout(() => {
        const h = document.createElement('span');
        h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        Object.assign(h.style, {
          position: 'fixed',
          left: (Math.random() * 100) + 'vw',
          top: '-12vh',
          fontSize: (1.4 + Math.random() * 1.6) + 'rem',
          pointerEvents: 'none',
          zIndex: '9985',
          animation: `meeRain ${3 + Math.random() * 2}s cubic-bezier(.36,.66,.64,1) forwards`,
          textShadow: '0 0 18px rgba(255,107,129,.55)',
        });
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 5500);
      }, i * 60);
    }
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');
    if (typeof showToast === 'function') showToast('💕 Y yo a ti, infinitamente 💕', 4000);
    fetch('/api/notificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'te_amo' }),
    }).catch(() => {});
  }

  if (useExisting) {
    try { new EasterEggTeclado('te_amo', 'teamo', lluviaCorazones); } catch (_) {}
  } else {
    let buf = '';
    document.addEventListener('keydown', e => {
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase();
      if (k < 'a' || k > 'z') return;
      buf = (buf + k).slice(-5);
      if (buf === 'teamo') { buf = ''; lluviaCorazones(); }
    });
  }

  /* ─────────────────────────────────────────────────────────
     2) Triple-click en #lunaInteractiva → frase secreta
     ───────────────────────────────────────────────────────── */
  let lunaClicks = 0;
  let lunaTimer  = 0;
  document.addEventListener('click', e => {
    if (!e.target.closest?.('#lunaInteractiva')) return;
    const escena = document.getElementById('escenaLuna');
    if (!escena || escena.style.display === 'none') return;

    lunaClicks++;
    clearTimeout(lunaTimer);
    lunaTimer = setTimeout(() => { lunaClicks = 0; }, 1100);
    if (lunaClicks >= 3) {
      lunaClicks = 0;
      revelarLuna();
    }
  });

  function revelarLuna() {
    if (!document.getElementById('mee-luna-style')) {
      const s = document.createElement('style');
      s.id = 'mee-luna-style';
      s.textContent = `
        .mee-luna-msg {
          position: fixed; top: 22%; left: 50%;
          transform: translateX(-50%);
          font-family: 'Playfair Display', serif; font-style: italic;
          font-size: clamp(1.2rem, 3vw, 2rem);
          color: rgba(255, 240, 250, .94);
          text-shadow: 0 0 38px rgba(255, 200, 240, .7),
                       0 0 80px rgba(180, 140, 255, .4);
          z-index: 9988; pointer-events: none;
          letter-spacing: 1px; text-align: center; max-width: 80vw;
          animation: meeLunaIn 1s cubic-bezier(.22,1,.36,1) both,
                     meeLunaOut 1s ease 5.5s forwards;
        }
        @keyframes meeLunaIn  { from { opacity:0; transform: translate(-50%, 12px) scale(.96); }
                                 to   { opacity:1; transform: translate(-50%, 0) scale(1); } }
        @keyframes meeLunaOut { to   { opacity:0; transform: translate(-50%, -10px) scale(1.05); } }
      `;
      document.head.appendChild(s);
    }
    const m = document.createElement('div');
    m.className = 'mee-luna-msg';
    m.textContent = 'Porque tú también eres mi luna.';
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 7000);
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');
    fetch('/api/notificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'triple_luna' }),
    }).catch(() => {});
  }

  /* ─────────────────────────────────────────────────────────
     3) Long-press en .marco-foto → metadata poética
     ───────────────────────────────────────────────────────── */
  const PHOTO_META = [
    'Capítulo I — Cuando empezamos a aprendernos.',
    'Capítulo II — Cuando dejamos de tener miedo.',
    'Capítulo III — Cuando supe que te quería sin condiciones.',
    'Capítulo IV — Cuando hicimos del caos algo nuestro.',
    'Capítulo V — Hasta donde alcance este universo.',
  ];
  let pressTimer = 0;
  let pressedEl  = null;
  document.addEventListener('pointerdown', e => {
    const m = e.target.closest?.('.marco-foto');
    if (!m) return;
    pressedEl = m;
    pressTimer = setTimeout(() => {
      const idx = [...document.querySelectorAll('.marco-foto')].indexOf(m);
      const meta = PHOTO_META[idx % PHOTO_META.length];
      revelarMeta(m, meta);
      pressTimer = 0;
    }, 1500);
  });
  document.addEventListener('pointerup',     () => cancelPress());
  document.addEventListener('pointercancel', () => cancelPress());
  document.addEventListener('pointerleave',  () => cancelPress());
  function cancelPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = 0; }
    pressedEl = null;
  }

  function revelarMeta(marco, texto) {
    if (!document.getElementById('mee-meta-style')) {
      const s = document.createElement('style');
      s.id = 'mee-meta-style';
      s.textContent = `
        .mee-meta-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg,
            rgba(8,5,30,.72) 0%, rgba(20,10,50,.92) 100%);
          color: rgba(255,235,255,.94);
          font-family: 'Playfair Display', serif; font-style: italic;
          display: flex; align-items: center; justify-content: center;
          padding: 18px; text-align: center; line-height: 1.5;
          font-size: .95rem;
          opacity: 0; pointer-events: none;
          animation: meeMetaIn .55s ease forwards,
                     meeMetaOut .6s ease 3.5s forwards;
          border-radius: inherit;
        }
        @keyframes meeMetaIn  { to { opacity: 1; } }
        @keyframes meeMetaOut { to { opacity: 0; } }
      `;
      document.head.appendChild(s);
    }
    if (getComputedStyle(marco).position === 'static') marco.style.position = 'relative';
    const ov = document.createElement('div');
    ov.className = 'mee-meta-overlay';
    ov.textContent = texto;
    marco.appendChild(ov);
    setTimeout(() => ov.remove(), 4500);
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('hover');
  }

  /* ─────────────────────────────────────────────────────────
     4) Awareness de fecha — gestos sutiles
     ───────────────────────────────────────────────────────── */
  function dateAwareness() {
    const now = new Date();
    const dow = now.getDay();      // 0 dom, 6 sáb
    const day = now.getDate();
    const isAniversarioMensual = day === 30;
    const isDomingo = dow === 0;

    // Toast cariñoso al cargar (solo una vez por día gracias a sessionStorage)
    const stamp = now.toISOString().slice(0, 10);
    if (sessionStorage.getItem('mee-greeted') === stamp) return;

    let texto = null;
    if (isAniversarioMensual) {
      texto = '💖 Hoy se cumple otro mes. Y yo te quiero un mes más. 💖';
    } else if (isDomingo) {
      texto = '☕ Domingo contigo. Mi formato favorito de descansar.';
    }
    if (texto) {
      // Esperar a que showToast esté disponible
      const intent = setInterval(() => {
        if (typeof showToast === 'function') {
          clearInterval(intent);
          showToast(texto, 4500);
          sessionStorage.setItem('mee-greeted', stamp);
        }
      }, 400);
      setTimeout(() => clearInterval(intent), 8000);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dateAwareness);
  } else {
    dateAwareness();
  }

  window.__moreEasterEggs = {
    triggers: { lluviaCorazones, revelarLuna },
  };
})();
