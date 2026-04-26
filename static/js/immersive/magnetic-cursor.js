/* ══════════════════════════════════════════════════════════════
   magnetic-cursor.js — Botones que atraen el cursor
   ──────────────────────────────────────────────────────────────
   Los elementos con la clase .magnetic o el atributo [data-magnetic]
   ejercen una atracción sutil sobre el cursor cuando éste se acerca.
   Visualmente: el botón se desplaza ligeramente hacia el cursor.

   Sólo en pointer:fine (ratón). Off durante cinema-mode y
   memory-universe (no quieres añadir movimiento extra ahí).
   Respeta prefers-reduced-motion.

   Auto-tag: aplico la clase a los CTAs principales sin tocar HTML.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__magneticCursor) return;
  window.__magneticCursor = true;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(pointer: fine)').matches) return;

  const RANGE = 110;        // px — distancia donde empieza a atraer
  const STRENGTH = 0.30;    // fracción del vector cursor↔centro
  const SMOOTH = 0.20;      // factor de easing por frame

  const tracked = new WeakMap();

  function attach(el) {
    if (tracked.has(el)) return;
    tracked.set(el, { tx: 0, ty: 0, x: 0, y: 0 });
    el.style.willChange = 'transform';
    // Preservar transformaciones existentes vía variable CSS
    el.style.transition = el.style.transition ||
      'transform .2s cubic-bezier(.22,1,.36,1)';
  }

  function isDisabled() {
    return document.body.classList.contains('cinema-active') ||
           document.body.classList.contains('memory-universe-open');
  }

  /* ── BUG FIX: el botón de regalo se anima con .abriendo-caja
     vía transforms en CSS. Si seguimos escribiendo style.transform
     inline, ANULAMOS la animación de apertura. Detectamos ese estado
     y limpiamos el inline transform inmediatamente. ── */
  function shouldSkip(el) {
    if (!el) return true;
    if (el.classList.contains('abriendo-caja')) return true;
    if (el.classList.contains('caja-abierta'))   return true;
    return false;
  }

  function scan() {
    document.querySelectorAll('.magnetic, [data-magnetic], .caja-regalo, #botonRegalo, #immersiveMuteBtn, #btnEntrarUniverso').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
  new MutationObserver(scan).observe(document.body, { subtree: true, childList: true });

  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  /* Loop único que actualiza todos los elementos magnéticos */
  function tick() {
    requestAnimationFrame(tick);
    if (isDisabled()) {
      // Forzar reset suave
      tracked && document.querySelectorAll('.magnetic, [data-magnetic], .caja-regalo, #botonRegalo, #immersiveMuteBtn, #btnEntrarUniverso').forEach(el => {
        const s = tracked.get(el);
        if (!s) return;
        s.x += (0 - s.x) * SMOOTH;
        s.y += (0 - s.y) * SMOOTH;
        if (Math.abs(s.x) < 0.02 && Math.abs(s.y) < 0.02) {
          el.style.transform = '';
        } else {
          el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
        }
      });
      return;
    }

    document.querySelectorAll('.magnetic, [data-magnetic], .caja-regalo, #botonRegalo, #immersiveMuteBtn, #btnEntrarUniverso').forEach(el => {
      const s = tracked.get(el);
      if (!s) return;
      // BUG FIX: si el elemento está animándose por CSS, soltarlo.
      if (shouldSkip(el)) {
        if (el.style.transform) el.style.transform = '';
        s.x = s.y = s.tx = s.ty = 0;
        return;
      }
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < RANGE) {
        const k = (1 - dist / RANGE) * STRENGTH;
        s.tx = dx * k;
        s.ty = dy * k;
      } else {
        s.tx = 0;
        s.ty = 0;
      }
      s.x += (s.tx - s.x) * SMOOTH;
      s.y += (s.ty - s.y) * SMOOTH;
      if (Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05 && Math.abs(s.tx) < 0.05) {
        el.style.transform = '';
      } else {
        // Combinamos con cualquier transform 3D existente (tilt-cards) usando
        // CSS variables — pero como tilt-cards también usa style.transform,
        // hay que decidir un dueño. Convención: si el elemento tiene tilt
        // activo (.marco-foto, .caja-regalo con perspective), el tilt manda.
        // Nuestros magnetics típicos (botones) no tienen tilt → seguros.
        if (!el.matches('.marco-foto, .caja-regalo')) {
          el.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
        }
      }
    });
  }
  requestAnimationFrame(tick);
})();
