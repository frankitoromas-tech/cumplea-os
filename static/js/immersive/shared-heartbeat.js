/* ══════════════════════════════════════════════════════════════
   shared-heartbeat.js — Latido emocional global
   ──────────────────────────────────────────────────────────────
   La página entera respira al unísono a 76 BPM (latido humano en
   reposo, casualmente el BPM de la "promesas" rock ballad). Una
   metáfora sutil: vuestro corazón.

   Mecanismo:
     • Un único requestAnimationFrame escribe dos CSS variables en
       :root cada frame:
         --heartbeat:        sine(0..1) — útil para escala/opacidad
         --heartbeat-pulse:  picos lub-dub (0 normalmente, 1 brevemente)
     • Cualquier elemento con la clase .heartbeat-pulse o el
       atributo [data-heartbeat] reacciona vía CSS (definido en
       immersive.css).

   Cero deps. Cero alocación por frame (las vars son escritas como
   números). Pausa cuando la pestaña está oculta para no gastar CPU.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__heartbeat) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // En modo accesible, ponemos el latido fijo en 0 y salimos.
    document.documentElement.style.setProperty('--heartbeat', '0');
    document.documentElement.style.setProperty('--heartbeat-pulse', '0');
    return;
  }

  const BPM = 76;                     // promesa-ballad sync
  const period = 60_000 / BPM;        // ms por latido

  let raf = 0;
  let visible = true;

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible && !raf) raf = requestAnimationFrame(tick);
  });

  function tick(now) {
    raf = visible ? requestAnimationFrame(tick) : 0;
    const phase = (now % period) / period;             // 0..1 dentro del beat

    // sine suave 0..1 (respiración continua)
    const breath = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);

    // Lub-dub: dos picos cortos al inicio del beat (estilo cardíaco)
    let pulse = 0;
    if (phase < 0.06)         pulse = 1 - (phase / 0.06);     // lub
    else if (phase < 0.10)    pulse = 0;
    else if (phase < 0.18)    pulse = 1 - ((phase - 0.10) / 0.08) * 0.7;  // dub
    else                       pulse = 0;

    document.documentElement.style.setProperty('--heartbeat', breath.toFixed(3));
    document.documentElement.style.setProperty('--heartbeat-pulse', pulse.toFixed(3));
  }

  raf = requestAnimationFrame(tick);

  /* ── Auto-aplicar la clase .heartbeat-pulse a elementos clave ── */
  function autoTag() {
    const targets = [
      '#botonRegalo',                 // el regalo principal late
      '#immersiveMuteBtn',            // el botón de mute respira
      '#btnEntrarUniverso',           // el portal mágico
      '.caja-regalo',                 // tarjetas de regalo
      '#lunaInteractiva .luna-brillo',// el brillo de la luna
    ];
    targets.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.classList.add('heartbeat-pulse'));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoTag);
  } else {
    autoTag();
  }
  // Re-tagging cuando aparece contenido nuevo
  new MutationObserver(autoTag).observe(document.body, { subtree: true, childList: true });

  window.__heartbeat = {
    bpm: BPM,
    pause: () => { cancelAnimationFrame(raf); raf = 0; },
    resume: () => { if (!raf) raf = requestAnimationFrame(tick); },
  };
})();
