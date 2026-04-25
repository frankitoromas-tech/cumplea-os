/* ══════════════════════════════════════════════════════════════
   error-boundary.js — Resiliencia de la capa inmersiva
   ──────────────────────────────────────────────────────────────
   Es el PRIMER módulo que carga boot.js. Su misión:
     1. Atrapar errores no manejados de JS y promesas rechazadas.
     2. Distinguir "ruido" (warnings esperados) de "fallos críticos".
     3. Si un fallo crítico se repite, mostrar un banner sobrio
        invitando a recargar — JAMÁS bloquear la experiencia base.
     4. Reportar al backend (mismo patrón que los easter eggs).

   No debe romper si el resto de la capa no carga. Cero deps.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__errorBoundary) return;
  window.__errorBoundary = true;

  const SILENCE_PATTERNS = [
    /favicon/i,
    /loadAudio|onloaderror/i,        // Howler escupe esto cuando un MP3 no existe
    /Tone is not defined/i,          // Tone.js sin cargar es esperable
    /THREE is not defined/i,         // Three.js sin cargar es esperable
    /MutationObserver/i,             // ruido de extensiones
    /ResizeObserver loop/i,
    /Script error/i,                 // CORS opaco — no aporta
  ];

  let critical = 0;
  let bannerShown = false;
  const seen = new Set();

  function isSilenced(msg) {
    if (!msg) return true;
    return SILENCE_PATTERNS.some(re => re.test(msg));
  }

  function report(kind, detail) {
    // Dedupe por mensaje (evita inundar el backend con el mismo error en bucle)
    const key = kind + '|' + (detail.message || detail.reason || '');
    if (seen.has(key)) return;
    seen.add(key);

    fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento: 'error_cliente',
        kind,
        message: String(detail.message || detail.reason || '').slice(0, 240),
        url:     location.pathname,
        ua:      navigator.userAgent.slice(0, 120),
      }),
    }).catch(() => {});
  }

  function showBanner() {
    if (bannerShown) return;
    bannerShown = true;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', showBanner);
      return;
    }

    const div = document.createElement('div');
    div.id = 'immersiveErrorBanner';
    div.innerHTML = `
      <span>✦ Algo no se cargó del todo. La experiencia sigue funcionando, pero podrías ver mejor con</span>
      <button type="button" class="ieb-reload">recargar</button>
      <button type="button" class="ieb-dismiss" aria-label="Cerrar">×</button>
    `;
    Object.assign(div.style, {
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 18px',
      background: 'rgba(20,10,40,.92)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,107,129,.3)',
      borderRadius: '50px',
      color: 'rgba(255,235,255,.92)',
      fontFamily: "'Cormorant Garamond', serif",
      fontStyle: 'italic',
      fontSize: '.9rem',
      zIndex: '99997',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'iebSlideIn .55s cubic-bezier(.22,1,.36,1) both',
    });
    if (!document.getElementById('ieb-style')) {
      const s = document.createElement('style');
      s.id = 'ieb-style';
      s.textContent = `
        @keyframes iebSlideIn  { from { opacity:0; transform:translate(-50%, 24px); }
                                 to   { opacity:1; transform:translate(-50%, 0); } }
        @keyframes iebSlideOut { to { opacity:0; transform:translate(-50%, 24px); } }
        #immersiveErrorBanner button {
          background: rgba(255,107,129,.22);
          border: 1px solid rgba(255,255,255,.18);
          color: white; cursor: pointer;
          padding: 4px 12px; border-radius: 50px;
          font: inherit;
        }
        #immersiveErrorBanner .ieb-dismiss {
          background: transparent; border: none; padding: 0 4px;
          font-size: 1.3rem; line-height: 1;
        }
        #immersiveErrorBanner button:hover { background: rgba(255,107,129,.4); }
      `;
      document.head.appendChild(s);
    }
    div.querySelector('.ieb-reload').addEventListener('click', () => location.reload());
    div.querySelector('.ieb-dismiss').addEventListener('click', () => {
      div.style.animation = 'iebSlideOut .4s ease forwards';
      setTimeout(() => div.remove(), 450);
    });
    document.body.appendChild(div);
  }

  /* ── Captura global de errores ─────────────────────────── */
  window.addEventListener('error', e => {
    const msg = e.message || (e.error && e.error.message);
    if (isSilenced(msg)) return;
    critical++;
    report('error', { message: msg });
    if (critical >= 3) showBanner();
  });

  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason?.message || String(e.reason || '');
    if (isSilenced(reason)) return;
    critical++;
    report('rejection', { reason });
    if (critical >= 3) showBanner();
  });

  /* ── API útil para otros módulos ──────────────────────── */
  window.__errorBoundary = {
    report,
    forceBanner: showBanner,
    silence: re => SILENCE_PATTERNS.push(re),
  };
})();
