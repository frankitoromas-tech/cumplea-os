/* ══════════════════════════════════════════════════════════════
   whispers.js — "Susurros del Universo"
   ──────────────────────────────────────────────────────────────
   Sistema de pistas progresivas para los easter eggs. La idea es
   no arruinar la sorpresa, pero dejar migajas si la luna se queda
   atascada o no descubre los secretos por sí misma.

   Cada pista aparece como una ESTRELLA FUGAZ que cruza la pantalla
   con un texto críptico debajo, y se autodisuelve a los 7 segundos.

   Reglas de descubrimiento:
     • Konami        → tras 3 minutos de inactividad total.
     • Frank         → tras 3 fallos consecutivos en pantallaAuth.
     • Pastel 7clics → tras 30s en la fiesta sin click al pastel.
     • Amor          → tras 2 minutos en la fiesta.
     • Estrella      → tras hover prolongado (>5s) sobre la luna interactiva.
     • Te amo        → tras pasar el cursor 4 veces sobre cualquier .marco-foto.
     • Luyuromo      → tras escribir 'l','u' sin completar la palabra (3 veces).

   Cada pista solo se muestra UNA vez por sesión (en memoria, F5 reset).
   No molesta: hay un cooldown global de 25s entre pistas.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__whispers) return;
  window.__whispers = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Catálogo de pistas (frase críptica) ───────────────── */
  const HINTS = {
    konami:   { txt: '✦ Las viejas leyendas se invocan con flechas y dos letras.', icon: '🎮' },
    frank:    { txt: '✦ A veces el secreto está en el nombre del que escribe.',   icon: '✍️' },
    pastel:   { txt: '✦ El pastel guarda un secreto. Siete velas, siete deseos.', icon: '🎂' },
    amor:     { txt: '✦ Hay palabras que cuando se escriben, llueven.',           icon: '💕' },
    estrella: { txt: '✦ Una palabra de cinco letras explota en el cielo.',        icon: '⭐' },
    teamo:    { txt: '✦ Dos palabras que ya sabes. Escribe sin pensar.',          icon: '💖' },
    luyuromo: { txt: '✦ Tu nombre tiene un eco que abre noches estrelladas.',     icon: '🌙' },
  };

  /* ── Estado en memoria ─────────────────────────────────── */
  const shown      = new Set();
  let lastShownAt  = 0;
  const COOLDOWN   = 25_000;
  let idleTimer    = 0;
  let lastActivity = Date.now();
  let inFiesta     = false;
  let fiestaStart  = 0;

  /* ── Estilos ────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('whispers-style')) return;
    const s = document.createElement('style');
    s.id = 'whispers-style';
    s.textContent = `
      .whisper {
        position: fixed; right: 28px; bottom: 26px;
        z-index: 9986; pointer-events: none;
        max-width: 320px; padding: 14px 18px 12px;
        background: linear-gradient(135deg,
          rgba(20,12,42,.85) 0%, rgba(10,5,30,.92) 100%);
        border: 1px solid rgba(255,180,220,.18);
        border-radius: 14px;
        backdrop-filter: blur(10px);
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: rgba(255,235,255,.92);
        font-size: .92rem;
        line-height: 1.45;
        letter-spacing: .3px;
        box-shadow: 0 14px 36px rgba(0,0,0,.5),
                    0 0 32px rgba(255,180,220,.12);
        opacity: 0;
        transform: translateY(18px) scale(.96);
        animation: whisperIn .7s cubic-bezier(.22,1,.36,1) forwards,
                   whisperOut .9s ease 6s forwards;
      }
      .whisper .w-icon {
        display: inline-block; margin-right: 8px;
        filter: drop-shadow(0 0 12px rgba(255,180,220,.65));
      }
      .whisper::before {
        content: ''; position: absolute; inset: -1px;
        border-radius: inherit;
        background: linear-gradient(135deg,
          rgba(255,140,200,.45) 0%, transparent 50%, rgba(160,200,255,.35) 100%);
        opacity: .35; z-index: -1;
        animation: whisperShimmer 4s ease-in-out infinite alternate;
      }
      @keyframes whisperIn  {
        from { opacity: 0; transform: translateY(18px) scale(.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes whisperOut { to { opacity: 0; transform: translateY(-12px); } }
      @keyframes whisperShimmer {
        from { opacity: .25; }
        to   { opacity: .55; }
      }

      /* Estrella fugaz que precede el whisper */
      .whisper-shooter {
        position: fixed; pointer-events: none; z-index: 9987;
        font-size: 1.6rem;
        text-shadow: 0 0 20px rgba(255,235,180,.95),
                     0 0 60px rgba(255,180,220,.55);
        animation: shooterFly 1.4s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes shooterFly {
        from { top: -10vh; right: -10vw; opacity: 0;
               transform: rotate(45deg) scale(.4); }
        20%  { opacity: 1; }
        to   { top: 70vh;  right: 60vw; opacity: 0;
               transform: rotate(45deg) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Mostrar un susurro ─────────────────────────────────── */
  function whisper(key) {
    if (reduced) return;
    if (shown.has(key)) return;
    if (Date.now() - lastShownAt < COOLDOWN) return;
    if (!HINTS[key]) return;
    shown.add(key);
    lastShownAt = Date.now();

    injectStyles();

    // Estrella fugaz preludio
    const shooter = document.createElement('div');
    shooter.className = 'whisper-shooter';
    shooter.textContent = '✦';
    document.body.appendChild(shooter);
    setTimeout(() => shooter.remove(), 1500);

    // Texto del susurro
    setTimeout(() => {
      const w = document.createElement('div');
      w.className = 'whisper';
      const { txt, icon } = HINTS[key];
      w.innerHTML = `<span class="w-icon">${icon}</span>${txt}`;
      document.body.appendChild(w);
      setTimeout(() => w.remove(), 7200);
      // SFX delicado
      if (window.__immersiveAudio) window.__immersiveAudio.sfx('hover');
    }, 600);
  }

  /* ── Detectores de condiciones ──────────────────────────── */

  // Idle global — para pista konami (3 min sin actividad)
  function resetIdle() {
    lastActivity = Date.now();
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => whisper('konami'), 3 * 60 * 1000);
  }
  ['pointermove','keydown','click','scroll','touchstart'].forEach(ev => {
    document.addEventListener(ev, resetIdle, { passive: true });
  });
  resetIdle();

  // Fallos de auth → pista frank tras 3 fallos consecutivos
  document.addEventListener('auth:fail', e => {
    if ((e.detail?.count || 0) >= 3) whisper('frank');
  });

  // Cuando aparece la fiesta (#contenidoSorpresa pierde .oculto):
  // contar tiempo y hovers
  function watchFiesta() {
    const sorpresa = document.getElementById('contenidoSorpresa');
    if (!sorpresa) { setTimeout(watchFiesta, 300); return; }

    new MutationObserver(() => {
      if (!sorpresa.classList.contains('oculto') && !inFiesta) {
        inFiesta = true;
        fiestaStart = Date.now();

        // Pista pastel: 30s en la fiesta sin click al pastel
        let pastelClicked = false;
        document.addEventListener('click', e => {
          if (e.target.closest?.('.pastel-animado, #cake3DCanvas')) pastelClicked = true;
        });
        setTimeout(() => { if (!pastelClicked) whisper('pastel'); }, 30_000);

        // Pista amor: 2 minutos en la fiesta
        setTimeout(() => whisper('amor'), 2 * 60 * 1000);

        // Pista estrella: hover sostenido sobre #lunaInteractiva
        let hoverInicio = 0;
        document.addEventListener('pointerenter', e => {
          if (e.target.closest?.('#lunaInteractiva')) hoverInicio = Date.now();
        }, true);
        document.addEventListener('pointerleave', e => {
          if (e.target.closest?.('#lunaInteractiva')) hoverInicio = 0;
        }, true);
        setInterval(() => {
          if (hoverInicio && Date.now() - hoverInicio > 5_000) whisper('estrella');
        }, 1000);
      }
    }).observe(sorpresa, { attributes: true, attributeFilter: ['class'] });
  }
  watchFiesta();

  // Pista te amo: 4 hovers sobre cualquier .marco-foto
  let hoverPolaroidCount = 0;
  document.addEventListener('pointerenter', e => {
    if (e.target.closest?.('.marco-foto')) {
      hoverPolaroidCount++;
      if (hoverPolaroidCount >= 4) whisper('teamo');
    }
  }, true);

  // Pista luyuromo: si escribe l,u sin completar 3 veces (rastreo aproximado)
  let buffer = '';
  let abandonosLu = 0;
  document.addEventListener('keydown', e => {
    if (e.key.length !== 1) return;
    const k = e.key.toLowerCase();
    if (k < 'a' || k > 'z') {
      if (buffer.startsWith('lu') && buffer.length < 8) {
        abandonosLu++;
        if (abandonosLu >= 3) whisper('luyuromo');
      }
      buffer = '';
      return;
    }
    buffer = (buffer + k).slice(-12);
  });

  /* ── API pública ────────────────────────────────────────── */
  window.__whispers = {
    show: whisper,
    shown: () => [...shown],
    reset: () => shown.clear(),
  };
})();
