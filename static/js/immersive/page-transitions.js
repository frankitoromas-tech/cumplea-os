/* ══════════════════════════════════════════════════════════════
   page-transitions.js — Navegación cinemática entre rutas
   ──────────────────────────────────────────────────────────────
   Intercepta los clicks en links internos (a[href^="/"]) y aplica
   una transición elegante:
     • Si el browser soporta View Transitions API → la usa.
     • Si no → fade-to-black + navigate (la página destino tiene su
       propia animación de entrada, así que no hacemos fade-in
       cliente para evitar flashes).
   Skip:
     • Modificadores (Ctrl/Cmd/Shift)        → abrir nueva pestaña
     • target="_blank" o rel="noopener"
     • Anchors (#) o protocolos no http(s)
     • download
   Respeta prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__pageTransitions) return;
  window.__pageTransitions = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shouldHandle(a, e) {
    if (!a) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false;
    if (a.target === '_blank') return false;
    const href = a.getAttribute('href');
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (a.hasAttribute('download')) return false;
    if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) return false;
    // Solo links internos (mismo origen)
    try {
      const u = new URL(a.href);
      if (u.origin !== location.origin) return false;
      if (u.pathname === location.pathname && !u.search && !u.hash) return false;
    } catch (_) { return false; }
    return true;
  }

  function fadeToBlackAnd(navigate) {
    const veil = document.createElement('div');
    veil.className = 'pt-veil';
    Object.assign(veil.style, {
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, rgba(8,5,30,.4) 0%, rgba(0,0,5,1) 100%)',
      opacity: '0',
      transition: 'opacity .55s cubic-bezier(.22,1,.36,1)',
      zIndex: '99996', pointerEvents: 'auto',
    });
    document.body.appendChild(veil);

    // Pequeña frase poética durante la transición
    const ghost = document.createElement('p');
    ghost.textContent = '✦';
    Object.assign(ghost.style, {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%) scale(.3)',
      color: 'rgba(255,200,230,.7)',
      fontSize: '3rem',
      opacity: '0',
      transition: 'opacity .5s ease, transform 1.2s cubic-bezier(.22,1,.36,1)',
      zIndex: '99997',
      pointerEvents: 'none',
      textShadow: '0 0 38px rgba(255,180,220,.7)',
    });
    veil.appendChild(ghost);

    if (window.__immersiveAudio) window.__immersiveAudio.sfx('transition');

    requestAnimationFrame(() => {
      veil.style.opacity = '1';
      ghost.style.opacity = '1';
      ghost.style.transform = 'translate(-50%, -50%) scale(1.4)';
    });

    setTimeout(navigate, 480);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!shouldHandle(a, e)) return;
    if (reduced) return;          // accesibilidad: dejar la nav nativa

    e.preventDefault();
    const url = a.href;

    // View Transitions API si existe (Chrome 111+, navegación same-document)
    // Para multi-page (cross-document) Chrome 126+. Cae al fade si no.
    if (document.startViewTransition && a.dataset.viewTransition !== 'off') {
      try {
        document.startViewTransition(() => { location.href = url; });
        return;
      } catch (_) { /* fallback */ }
    }
    fadeToBlackAnd(() => { location.href = url; });
  });
})();
