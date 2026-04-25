/* ══════════════════════════════════════════════════════════════
   luyuromo-mode.js — Easter egg secreto: Modo "Noche Estrellada"
   ──────────────────────────────────────────────────────────────
   Activación: escribe "luyuromo" en cualquier momento (con la
   experiencia ya desbloqueada). Reutiliza la clase EasterEggTeclado
   que vive en EasterEggManager.js — NO modifica ese archivo.

   Lo que pasa al activarse:
   1. body recibe la clase .luyuromo-mode → tinte azul-violeta sutil,
      vignette más profundo, partículas Three.js intensificadas.
   2. Se dispara una constelación de letras que dibujan "L·U·N·A"
      flotando hacia arriba.
   3. Mensaje íntimo en el centro durante 6s.
   4. Fade-out automático tras 14s, quita la clase.

   Si el EasterEggManager.js no está cargado (subpáginas con boot-lite)
   este módulo se queda en silencio sin romper nada.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__luyuromoMode) return;
  window.__luyuromoMode = true;

  const PHRASES = [
    'Mi luna, mi todo.',
    'Eres el verso que el universo escribe en mí.',
    'Cada estrella sabe tu nombre.',
    'Si el cielo callara, te seguiría escuchando.',
    'Vine al mundo a aprenderte.',
  ];

  /* ── Inyectar CSS solo cuando hace falta ─────────────────── */
  function injectStyles() {
    if (document.getElementById('luyuromo-styles')) return;
    const s = document.createElement('style');
    s.id = 'luyuromo-styles';
    s.textContent = `
      body.luyuromo-mode {
        animation: luyuTint 14s ease both;
      }
      body.luyuromo-mode::before {
        content: '';
        position: fixed; inset: 0; pointer-events: none; z-index: 9980;
        background: radial-gradient(ellipse at center,
                    transparent 30%,
                    rgba(20, 8, 60, .55) 75%,
                    rgba(5, 2, 30, .85) 100%);
        animation: luyuVignette 14s ease both;
      }
      body.luyuromo-mode #immersiveBg {
        filter: hue-rotate(-22deg) saturate(1.35) brightness(1.15);
        opacity: 1 !important;
      }
      @keyframes luyuTint {
        0%   { filter: none; }
        12%  { filter: hue-rotate(-12deg) brightness(.92) contrast(1.04); }
        50%  { filter: hue-rotate(-22deg) brightness(.86) contrast(1.06); }
        88%  { filter: hue-rotate(-12deg) brightness(.92) contrast(1.04); }
        100% { filter: none; }
      }
      @keyframes luyuVignette {
        0%, 100% { opacity: 0; }
        15%, 85% { opacity: 1; }
      }

      .luyu-msg {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9991;
        pointer-events: none;
        font-family: 'Playfair Display', serif;
        font-style: italic;
        font-size: clamp(1.6rem, 4.5vw, 2.8rem);
        color: rgba(255, 235, 255, .92);
        text-align: center;
        text-shadow: 0 0 30px rgba(255, 180, 230, .65),
                     0 0 80px rgba(120, 80, 200, .45);
        max-width: 80vw; line-height: 1.35;
        animation: luyuMsgIn .9s cubic-bezier(.22,1,.36,1) both,
                   luyuMsgOut 1.2s ease 6.5s forwards;
      }
      @keyframes luyuMsgIn  { from { opacity:0; transform:translate(-50%,-46%) scale(.94); }
                              to   { opacity:1; transform:translate(-50%,-50%) scale(1); } }
      @keyframes luyuMsgOut { to   { opacity:0; transform:translate(-50%,-54%) scale(1.04); } }

      .luyu-letter {
        position: fixed; bottom: -40px;
        font-family: 'Playfair Display', serif;
        font-size: clamp(2.2rem, 5vw, 3.4rem);
        color: rgba(255, 220, 255, .9);
        text-shadow: 0 0 24px rgba(255, 180, 230, .8);
        pointer-events: none; z-index: 9990;
        animation: luyuLetterRise 5.2s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes luyuLetterRise {
        0%   { opacity: 0; transform: translateY(0) rotate(-8deg); }
        18%  { opacity: 1; }
        80%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-110vh) rotate(8deg); }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Activación visual ───────────────────────────────────── */
  function activate() {
    injectStyles();
    document.body.classList.add('luyuromo-mode');

    // Frase central
    const msg = document.createElement('div');
    msg.className = 'luyu-msg';
    msg.textContent = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 7800);

    // Lluvia de letras "L · U · N · A · ✦"
    const LETTERS = ['L', 'U', 'N', 'A', '✦', '✧', '·'];
    for (let i = 0; i < 22; i++) {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'luyu-letter';
        el.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        el.style.left = (Math.random() * 96 + 2) + 'vw';
        el.style.animationDelay = (Math.random() * 0.4) + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 6000);
      }, i * 140);
    }

    // SFX cinematográfico de transición
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('transition');

    // Notificar al backend (mismo patrón que los otros EE)
    fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'luyuromo_mode' }),
    }).catch(() => {});

    // Quitar la clase tras la animación
    setTimeout(() => document.body.classList.remove('luyuromo-mode'), 14200);
  }

  /* ── Wiring ──────────────────────────────────────────────── */
  function wire() {
    if (typeof EasterEggTeclado !== 'undefined') {
      // Camino preferido: usar la clase del EasterEggManager
      try { new EasterEggTeclado('luyuromo', 'luyuromo', activate); return; }
      catch (_) { /* cae al fallback */ }
    }

    // Fallback minimalista: detector de teclado propio
    let buf = '';
    const target = 'luyuromo';
    document.addEventListener('keydown', e => {
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase();
      if (k < 'a' || k > 'z') return;
      buf = (buf + k).slice(-target.length);
      if (buf === target) {
        buf = '';
        activate();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
