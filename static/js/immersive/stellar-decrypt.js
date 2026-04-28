/* ══════════════════════════════════════════════════════════════
   stellar-decrypt.js — Efecto de desencriptación estelar
   ──────────────────────────────────────────────────────────────
   Cuando #contenidoSorpresa pierde la clase .oculto (= se revela
   la fiesta), aplicamos un efecto Matrix-like sobre los textos
   principales: caracteres aleatorios que se "estabilizan" hacia
   el texto real, letra por letra, dando sensación de que la
   información está bajando del espacio.

   Aplicamos a:
     • #tituloMensaje      (el "¡Feliz Cumpleaños!")
     • #estadisticasAstro  (los días vividos / órbitas)
     • #textoRegalo        (el texto sobre el botón)
     • Cualquier elemento con [data-decrypt]

   Cada letra: rota por símbolos espaciales/aleatorios durante
   ~0.3-0.6s, luego se fija en el carácter correcto. La reveleación
   avanza de izquierda a derecha tipo escáner.

   Cero deps. Reduced motion → noop.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__stellarDecrypt) return;
  window.__stellarDecrypt = true;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Glifos espaciales / arcanos para la fase de scrambling
  const GLYPHS = '✦✧✩✪✫✬✭✮✯✰⋆⏣◇◈⟁⟁ΛΣΞΨΩΦΘ∞∗★☆⚝₊⁕⁂';
  const NOISE  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  function pickGlyph() {
    return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
  }
  function pickNoise() {
    // Mezcla 70% glifos espaciales, 30% letras random
    return Math.random() < 0.7 ? pickGlyph()
         : NOISE.charAt(Math.floor(Math.random() * NOISE.length));
  }

  /* ── Aplicar el efecto a un elemento ──────────────────── */
  function decryptElement(el, opts = {}) {
    if (!el || el.dataset.decryptDone) return;
    const original = el.textContent;
    if (!original.trim()) return;
    el.dataset.decryptDone = '1';

    const total = original.length;
    const speed       = opts.speed       || 24;     // ms por frame
    const stagger     = opts.stagger     || 35;     // ms entre letras
    const scrambleMs  = opts.scrambleMs  || 380;    // tiempo de revuelto por letra
    const startDelay  = opts.startDelay  || 0;

    // Estado: array de chars finales y un buffer mutable
    const target = Array.from(original);
    const view   = Array.from(original).map(() => pickNoise());

    // Marcar visualmente el efecto con un span
    el.style.fontFeatureSettings = '"tnum"';   // tabular nums si aplica
    el.textContent = view.join('');

    // Programa la fijación de cada letra
    target.forEach((ch, i) => {
      // Conservar espacios y saltos sin scrambling
      if (/\s/.test(ch)) {
        view[i] = ch;
        return;
      }
      const fixAt = startDelay + i * stagger + scrambleMs;
      setTimeout(() => {
        view[i] = ch;
      }, fixAt);
    });

    // Loop de render: actualiza chars no fijados con noise
    const startTime = performance.now() + startDelay;
    const endTime   = performance.now() + startDelay + total * stagger + scrambleMs + 50;

    function tick() {
      const now = performance.now();
      // Mientras alguna letra no esté fija, hacer scrambling
      const stillScrambling = target.some((ch, i) => view[i] !== ch);
      // Re-aleatorizar letras aún no fijadas
      target.forEach((ch, i) => {
        if (view[i] !== ch && !/\s/.test(ch)) view[i] = pickNoise();
      });
      el.textContent = view.join('');
      if (stillScrambling && now < endTime + 300) {
        setTimeout(tick, speed);
      } else {
        // Estado final: texto original limpio
        el.textContent = original;
      }
    }
    setTimeout(tick, startDelay);
  }

  /* ── Disparar al revelarse la fiesta ──────────────────── */
  function decryptFiesta() {
    // Esperar un poco para dejar que script.js inserte el texto real
    setTimeout(() => {
      const titulo = document.getElementById('tituloMensaje');
      const stats  = document.getElementById('estadisticasAstro');
      const texto  = document.getElementById('textoRegalo');
      if (titulo) decryptElement(titulo, { stagger: 28, scrambleMs: 480, startDelay: 200 });
      if (stats)  decryptElement(stats,  { stagger: 18, scrambleMs: 320, startDelay: 600 });
      // Cualquier [data-decrypt]
      document.querySelectorAll('[data-decrypt]').forEach((el, i) => {
        decryptElement(el, { startDelay: 800 + i * 200 });
      });
    }, 100);
  }

  /* ── Texto del botón regalo: aplicar al cargar ────────── */
  function decryptOnLoad() {
    const t = document.getElementById('textoRegalo');
    if (t && !t.dataset.decryptDone) {
      // Solo si NO estamos en pantalla de auth o bloqueo
      const auth    = document.getElementById('pantallaAuth');
      const bloqueo = document.getElementById('pantallaBloqueo');
      if (auth && !auth.classList.contains('oculto')) return;
      if (bloqueo && !bloqueo.classList.contains('oculto')) return;
      decryptElement(t, { stagger: 30, scrambleMs: 400 });
    }
  }

  /* ── Observer: cuando #contenidoSorpresa pierde .oculto ── */
  function observeReveal() {
    const sorpresa = document.getElementById('contenidoSorpresa');
    if (!sorpresa) { setTimeout(observeReveal, 250); return; }
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName === 'class' && !sorpresa.classList.contains('oculto')) {
          decryptFiesta();
        }
      });
    }).observe(sorpresa, { attributes: true, attributeFilter: ['class'] });
  }

  /* ── Hook al evento personalizado regalo:listo ──────── */
  document.addEventListener('regalo:listo', decryptOnLoad);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observeReveal();
      decryptOnLoad();
    });
  } else {
    observeReveal();
    decryptOnLoad();
  }

  // API pública
  window.__stellarDecrypt = { decryptElement, decryptFiesta };
})();
