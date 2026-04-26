/* ══════════════════════════════════════════════════════════════
   ee-music.js — Música contextual por easter egg
   ──────────────────────────────────────────────────────────────
   Cada easter egg tiene una identidad sonora propia. Para no tocar
   EasterEggManager.js (protegido), registramos listeners paralelos
   con la misma palabra clave o el mismo gesto: ambos disparan a la
   vez — el original muestra su efecto visual, el nuestro cambia la
   música temporalmente.

   Usa __immersiveAudio.playTemporary(key, ms) que regresa a la
   pista previa cuando expira. Cero side-effects sobre la sección.

   Mapeo:
     frank      → carta       (íntima, e-piano cálido)
     amor       → fiesta      (cuerdas brillantes)
     estrella   → universo    (cósmica con cometas)
     konami     → fiesta      (celebratoria)
     pastel7    → fiesta      (deseo concedido)
     teamo      → carta       (declaración íntima)
     luyuromo   → luna        (ya tiene su modo, refuerzo)
     soplido completo de velas → fiesta (cuando llega .apagada al 3er .llama)
     deseo en universe → universo (refuerzo)

   Si __immersiveAudio o __synthMusic no existen, el módulo es no-op.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__eeMusic) return;
  window.__eeMusic = true;

  const EE_TRACKS = {
    frank:    { key: 'carta',    ms: 12000 },
    amor:     { key: 'fiesta',   ms: 10000 },
    estrella: { key: 'universo', ms: 11000 },
    konami:   { key: 'fiesta',   ms: 14000 },
    pastel7:  { key: 'fiesta',   ms: 12000 },
    teamo:    { key: 'carta',    ms: 12000 },
    luyuromo: { key: 'luna',     ms: 14000 },
  };

  function spin(name) {
    const conf = EE_TRACKS[name];
    if (!conf) return;
    if (!window.__immersiveAudio || !window.__immersiveAudio.playTemporary) return;
    window.__immersiveAudio.playTemporary(conf.key, conf.ms);
    document.documentElement.dataset.eeActive = name;
    setTimeout(() => {
      if (document.documentElement.dataset.eeActive === name) {
        document.documentElement.removeAttribute('data-ee-active');
      }
    }, conf.ms);
  }

  /* ── Detector de teclado paralelo ─────────────────────────
     Idéntico al de EasterEggTeclado pero solo dispara música. ── */
  function tecladoListener(palabra, name) {
    let buf = '';
    document.addEventListener('keydown', e => {
      if (e.key.length !== 1) return;
      const k = e.key.toLowerCase();
      if (k < 'a' || k > 'z') return;
      buf = (buf + k).slice(-palabra.length);
      if (buf === palabra) {
        buf = '';
        spin(name);
      }
    });
  }

  function attach() {
    tecladoListener('frank',    'frank');
    tecladoListener('amor',     'amor');
    tecladoListener('estrella', 'estrella');
    tecladoListener('teamo',    'teamo');
    tecladoListener('luyuromo', 'luyuromo');

    /* Konami */
    const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                 'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let kbuf = [];
    document.addEventListener('keydown', e => {
      kbuf.push(e.key);
      if (kbuf.length > SEQ.length) kbuf.shift();
      if (kbuf.join(',') === SEQ.join(',')) { kbuf = []; spin('konami'); }
    });

    /* Pastel — 7 clics. Reusamos el mismo selector que el EE original. */
    let pclics = 0;
    let preset = 0;
    document.addEventListener('click', e => {
      if (!e.target.closest?.('.pastel-animado')) return;
      pclics++;
      clearTimeout(preset);
      preset = setTimeout(() => { pclics = 0; }, 3000);
      if (pclics >= 7) { pclics = 0; spin('pastel7'); }
    });

    /* Soplar las 3 velas — cuando la última .llama gana .apagada */
    const llamasObserver = new MutationObserver(() => {
      const llamas = document.querySelectorAll('.llama');
      if (llamas.length === 0) return;
      const apagadas = [...llamas].filter(l => l.classList.contains('apagada')).length;
      if (apagadas === llamas.length && llamas.length > 0 && !document.documentElement.dataset.deseoConcedido) {
        document.documentElement.dataset.deseoConcedido = '1';
        spin('pastel7');   // mismo flourish: deseo concedido = celebración
      }
    });
    // Observar cambios en cualquier .llama
    function observarLlamas() {
      document.querySelectorAll('.llama').forEach(l => {
        llamasObserver.observe(l, { attributes: true, attributeFilter: ['class'] });
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observarLlamas);
    } else {
      observarLlamas();
    }
    // Re-observar si las llamas son inyectadas después
    new MutationObserver(observarLlamas).observe(document.body, { subtree: true, childList: true });

    /* Deseo en universe — escuchar el evento que ya emite memory-universe */
    document.addEventListener('memory-universe:wish', () => spin('estrella'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  // API
  window.__eeMusic = { spin };
})();
