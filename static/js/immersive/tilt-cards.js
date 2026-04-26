/* ══════════════════════════════════════════════════════════════
   tilt-cards.js — Profundidad nativa al cursor (CSS 3D puro)
   ──────────────────────────────────────────────────────────────
   Cero dependencias. Aplica rotateX/rotateY a cualquier elemento
   con la clase .immersive-tilt o el atributo [data-tilt].
   El padre necesita perspective (lo da immersive.css).
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveTilt) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const SELECTOR = '.immersive-tilt, [data-tilt], .marco-foto, .caja-regalo, .tl-card';
  const MAX_DEG  = 12;     // ángulo máximo
  const SMOOTH   = 0.16;   // factor de easing (0..1)

  const tracked = new WeakMap();

  function attach(el) {
    if (tracked.has(el)) return;
    const state = { rx: 0, ry: 0, trx: 0, try_: 0, raf: 0, hover: false };
    tracked.set(el, state);

    el.style.transformStyle = 'preserve-3d';
    el.style.willChange     = 'transform';

    function onMove(e) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      state.try_ =  -dy * MAX_DEG;
      state.trx =   dx * MAX_DEG;
      if (!state.raf) loop();
    }

    function onLeave() {
      state.hover = false;
      state.trx = 0;
      state.try_ = 0;
      if (!state.raf) loop();
    }

    function onEnter() {
      state.hover = true;
      el.style.transition = 'box-shadow .35s ease';
      el.style.boxShadow  = '0 30px 60px -25px rgba(0,0,0,.55), 0 18px 38px -28px rgba(255,107,129,.25)';
    }

    function loop() {
      // BUG FIX: si el elemento se está animando con CSS clases propias
      // del proyecto (ej: .abriendo-caja en el regalo), soltamos el control.
      if (el.classList.contains('abriendo-caja') ||
          el.classList.contains('caja-abierta')) {
        el.style.transform = '';
        state.raf = 0;
        return;
      }
      state.rx += (state.try_ - state.rx) * SMOOTH;
      state.ry += (state.trx - state.ry) * SMOOTH;
      el.style.transform =
        `perspective(900px) rotateX(${state.rx.toFixed(2)}deg) ` +
        `rotateY(${state.ry.toFixed(2)}deg) translateZ(0)`;

      if (Math.abs(state.rx - state.try_) > 0.05 ||
          Math.abs(state.ry - state.trx)  > 0.05) {
        state.raf = requestAnimationFrame(loop);
      } else {
        state.raf = 0;
        if (!state.hover) {
          el.style.boxShadow = '';
        }
      }
    }

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove',  onMove);
    el.addEventListener('pointerleave', onLeave);
  }

  function scan(root = document) {
    root.querySelectorAll(SELECTOR).forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }

  // Re-escanear cuando se inserten nuevas tarjetas dinámicamente
  // (por ejemplo, al abrir el regalo y revelar #contenidoSorpresa).
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches?.(SELECTOR)) attach(n);
      n.querySelectorAll?.(SELECTOR).forEach(attach);
    }));
  }).observe(document.body, { subtree: true, childList: true });

  window.__immersiveTilt = { scan };
})();
