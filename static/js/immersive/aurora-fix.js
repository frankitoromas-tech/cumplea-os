/* ══════════════════════════════════════════════════════════════
   aurora-fix.js — Parche externo para aurora.html
   ──────────────────────────────────────────────────────────────
   Bug detectado en testing real (foto 2 del usuario):
     aurora.html línea 112 declara: `let W, H, mx = W/2, my = H/2`
     `W` se usa antes de inicializar → mx y my arrancan como NaN.
     Resultado: createRadialGradient(NaN, NaN, ...) no dibuja nada
     y la luna ve la página en blanco hasta que mueve el ratón.

   Solución (sin tocar aurora.html):
     1. Detecto que estoy en /aurora.
     2. En cuanto el DOM está listo, simulo un mousemove al centro
        del viewport para inicializar mx/my con valores válidos.
     3. Espera 200ms para que la inline script ya haya registrado
        sus listeners.

   Con esto la aurora pinta de inmediato, sin esperar interacción.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__auroraFix) return;
  window.__auroraFix = true;

  // Detectar /aurora — funciona también con trailing slash o query
  if (!location.pathname.toLowerCase().includes('aurora')) return;

  function kick() {
    // Disparar dos eventos: mousemove (que es el que escucha aurora.html)
    // y pointermove por si alguna versión usa otro listener.
    const evt = new MouseEvent('mousemove', {
      bubbles: true, cancelable: true,
      clientX: window.innerWidth  / 2,
      clientY: window.innerHeight / 2,
    });
    document.dispatchEvent(evt);
    window.dispatchEvent(evt);

    // Forzar también un resize por si las dimensiones del canvas son 0
    window.dispatchEvent(new Event('resize'));

    console.info('[aurora-fix] mousemove sintético al centro: aurora arranca');
  }

  function start() {
    // Doble seguridad: ejecutar varias veces durante los primeros 1.5s
    setTimeout(kick, 50);
    setTimeout(kick, 250);
    setTimeout(kick, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
