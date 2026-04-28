/* ══════════════════════════════════════════════════════════════
   auth-enhance.js — Mejoras visuales y UX a la pantalla de auth
   ──────────────────────────────────────────────────────────────
   Complementa el listener oficial de script.js. NO reemplaza el
   POST a /api/verificar_nombre — ese vive en script.js. Aquí solo
   añadimos:
     • Validación visual en tiempo real (verde / rojo).
     • Animación shake cuando el nombre es inválido.
     • Flash dorado al éxito.
     • Auto-focus del input cuando aparece la pantalla.
     • Hint sutil ("Prueba con tu nombre o tu apodo").
     • Bloquea tilt/magnetic sobre el botón Verificar.
     • Contador de fallos expuesto para whispers.js.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__authEnhance) return;
  window.__authEnhance = true;

  const ALIASES = ['luyuromo', 'luna', 'luyu'];

  function normalize(s) {
    return (s || '').toString()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '').toLowerCase().trim();
  }
  function isValid(name) {
    return ALIASES.includes(normalize(name));
  }

  function injectStyles() {
    if (document.getElementById('auth-enhance-style')) return;
    const s = document.createElement('style');
    s.id = 'auth-enhance-style';
    s.textContent = `
      .ae-shake { animation: aeShake .55s cubic-bezier(.36,.07,.19,.97) both; }
      @keyframes aeShake {
        10%,90% { transform: translateX(-2px); }
        20%,80% { transform: translateX(4px); }
        30%,50%,70% { transform: translateX(-8px); }
        40%,60% { transform: translateX(8px); }
      }
      .ae-success-flash {
        position: fixed; inset: 0; z-index: 99995;
        background: radial-gradient(ellipse at center,
          rgba(255,235,200,.65) 0%, rgba(255,180,220,.35) 40%, transparent 75%);
        pointer-events: none;
        animation: aeFlash 1.1s cubic-bezier(.22,1,.36,1) forwards;
      }
      @keyframes aeFlash {
        0%   { opacity: 0; }
        25%  { opacity: 1; }
        100% { opacity: 0; }
      }
      .ae-hint {
        margin-top: 8px;
        font-family: 'Cormorant Garamond', serif;
        font-style: italic;
        color: rgba(180, 200, 255, .55);
        font-size: .82rem;
        letter-spacing: 1px;
      }
      #inputNombreAuth.ae-error {
        border-color: rgba(255, 71, 87, .7) !important;
        box-shadow: 0 0 0 3px rgba(255, 71, 87, .15);
      }
      #inputNombreAuth.ae-ok {
        border-color: rgba(10, 250, 176, .7) !important;
        box-shadow: 0 0 0 3px rgba(10, 250, 176, .15);
      }
    `;
    document.head.appendChild(s);
  }

  function attach() {
    const auth   = document.getElementById('pantallaAuth');
    const input  = document.getElementById('inputNombreAuth');
    const btn    = document.getElementById('btnVerificarAuth');
    const errMsg = document.getElementById('msgErrorAuth');
    if (!auth || !input || !btn) return false;
    if (auth.dataset.aeEnhanced) return true;
    auth.dataset.aeEnhanced = '1';

    injectStyles();

    btn.classList.remove('caja-regalo');
    btn.dataset.tilt = 'off';

    if (!auth.querySelector('.ae-hint')) {
      const hint = document.createElement('p');
      hint.className = 'ae-hint';
      hint.textContent = '✦ Prueba con tu nombre o tu apodo ✦';
      input.insertAdjacentElement('afterend', hint);
    }

    function focusIfVisible() {
      if (!auth.classList.contains('oculto') &&
          getComputedStyle(auth).display !== 'none') {
        try { input.focus({ preventScroll: true }); } catch (_) {}
      }
    }
    focusIfVisible();
    new MutationObserver(focusIfVisible).observe(auth, {
      attributes: true, attributeFilter: ['class', 'style'],
    });

    /* Validación visual en cada input — no reemplaza el POST de script.js */
    input.addEventListener('input', () => {
      input.classList.remove('ae-error');
      if (errMsg) errMsg.style.display = 'none';
      const n = normalize(input.value);
      if (n.length >= 4 && isValid(input.value)) {
        input.classList.add('ae-ok');
      } else {
        input.classList.remove('ae-ok');
      }
    });

    /* Listener del FALLO desde script.js (event 'auth:fail') →
       efectos visuales sin tocar la lógica POST */
    document.addEventListener('auth:fail', () => {
      input.classList.add('ae-error');
      input.classList.remove('ae-ok');
      auth.querySelector('.bloqueo-contenido')?.classList.add('ae-shake');
      setTimeout(() => {
        auth.querySelector('.bloqueo-contenido')?.classList.remove('ae-shake');
      }, 600);
      if (window.__immersiveAudio) window.__immersiveAudio.sfx('click');
    });

    /* Detectar éxito — observamos cuando pantallaAuth gana .oculto */
    new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName === 'class' && auth.classList.contains('oculto') &&
            !auth.dataset.aeFlashed) {
          auth.dataset.aeFlashed = '1';
          const flash = document.createElement('div');
          flash.className = 'ae-success-flash';
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 1100);
          if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');
        }
      });
    }).observe(auth, { attributes: true, attributeFilter: ['class'] });

    return true;
  }

  function loop() {
    if (attach()) return;
    setTimeout(loop, 200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loop);
  } else {
    loop();
  }

  window.__authEnhance = { isValid, normalize, ALIASES };
})();
