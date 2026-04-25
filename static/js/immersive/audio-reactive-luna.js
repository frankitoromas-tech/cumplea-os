/* ══════════════════════════════════════════════════════════════
   audio-reactive-luna.js — La Luna respira con el bajo
   ──────────────────────────────────────────────────────────────
   Lee window.__immersiveBg.readBands() (el AnalyserNode) y aplica
   un escalado sutil + halo dinámico a #lunaInteractiva mientras
   la #escenaLuna está visible.

   • Sin tocar el CSS existente: solo aplica style.transform y
     style.filter en runtime.
   • Cero impacto si la escena Luna no se ha abierto: el loop solo
     corre cuando #escenaLuna no tiene la clase .oculto.
   • Reduced motion → noop.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__audioReactiveLuna) return;
  window.__audioReactiveLuna = true;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let scene, luna, brillo;
  let raf = 0;
  let breath = 0;     // suavizado del bass
  let pulse  = 0;     // suavizado del level
  let originalTransform = '';   // ← se preserva el transform original

  function resolveTargets() {
    if (scene) return true;
    scene  = document.getElementById('escenaLuna');
    luna   = document.getElementById('lunaInteractiva');
    brillo = luna?.querySelector('.luna-brillo');
    if (luna) {
      // Lee el transform calculado UNA vez para apilar nuestras reactividades
      // sobre él en lugar de pisarlo. Si el original es 'none', lo dejamos vacío.
      const cs = getComputedStyle(luna).transform;
      originalTransform = (cs && cs !== 'none') ? cs : '';
    }
    return !!(scene && luna);
  }

  function isLunaOpen() {
    if (!resolveTargets()) return false;
    // La luna se abre quitando .oculto en script.js. Si no aplica esa
    // clase, comprobamos por estilo computado.
    if (scene.classList.contains('oculto')) return false;
    const cs = getComputedStyle(scene);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!isLunaOpen()) {
      // Limpia residuo. Restituir transform original (no pisar el del CSS)
      if (luna) {
        luna.style.transform = '';   // vuelve al original del stylesheet
        luna.style.filter    = '';
      }
      return;
    }

    const bands = window.__immersiveBg?.readBands?.()
              || { bass: 0, mid: 0, treble: 0, level: 0 };

    // Suavizado exponencial — la luna no debe bailar, debe respirar
    breath += (bands.bass  - breath) * 0.10;
    pulse  += (bands.level - pulse)  * 0.07;

    // Escala 1.000 → 1.045 según bajo
    const scale = 1 + breath * 0.045;
    // Brillo: boost suave 1.0 → 1.18
    const bright = 1 + pulse * 0.18;
    // Glow: drop-shadow más amplio con el bajo
    const glow = (12 + breath * 28) | 0;

    // Apilar nuestra escala SOBRE la transformación original (si la había).
    // Esto preserva translate/rotate/cualquier transform definido en CSS.
    luna.style.transform = `${originalTransform} scale(${scale.toFixed(4)})`.trim();
    luna.style.filter =
      `brightness(${bright.toFixed(3)}) drop-shadow(0 0 ${glow}px rgba(255,235,200,${0.35 + pulse * 0.35}))`;

    if (brillo) {
      brillo.style.opacity = (0.55 + pulse * 0.45).toFixed(3);
    }
  }

  // Arranque diferido — espera a que el DOM tenga la #escenaLuna
  function start() {
    if (!resolveTargets()) {
      // Reintentar cuando aparezca
      const mo = new MutationObserver(() => {
        if (resolveTargets()) {
          mo.disconnect();
          if (!raf) raf = requestAnimationFrame(tick);
        }
      });
      mo.observe(document.body, { subtree: true, childList: true });
      return;
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
