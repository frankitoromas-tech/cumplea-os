/* ══════════════════════════════════════════════════════════════
   boot-lite.js — Bootloader liviano para subpáginas
   ──────────────────────────────────────────────────────────────
   Aurora, Timeline, Carta y Universo ya traen su propio canvas
   pintado a mano. Este boot:
   • Carga SOLO Howler (audio) + tilt-cards (CSS 3D, sin libs)
   • NO carga Lenis ni Three.js (evita pisar canvas existentes)
   • Reutiliza el estado de mute / unlock de la sesión gracias a
     sessionStorage (la sesión empieza en index.html y persiste).
   • Permite continuidad de música por sección entre navegaciones.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveBootLite) return;
  window.__immersiveBootLite = true;

  function loadScript(src) {
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = src; s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function loadStyle(href) {
    if ([...document.styleSheets].some(s => s.href && s.href.includes(href))) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  async function boot() {
    // CSS compartido (botón mute, mute states, reduced-motion)
    loadStyle('/static/css/immersive.css');

    // Error boundary primero
    await loadScript('/static/js/immersive/error-boundary.js');

    await loadScript('https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js');
    await loadScript('/static/js/immersive/synth-sfx.js');   // fallback Web Audio (SFX)
    await loadScript('/static/js/immersive/synth-music.js'); // canciones procedurales
    await loadScript('/static/js/immersive/audio-engine.js');
    await loadScript('/static/js/immersive/tilt-cards.js');
    await loadScript('/static/js/immersive/lyric-sync.js');  // karaoke en subpáginas también
    await loadScript('/static/js/immersive/shared-heartbeat.js');  // latido también aquí
    await loadScript('/static/js/immersive/magnetic-cursor.js');   // magnetismo también aquí
    await loadScript('/static/js/immersive/page-transitions.js');  // transiciones entre subpáginas
    await loadScript('/static/js/immersive/more-easter-eggs.js');  // huevos también en subpáginas
    await loadScript('/static/js/immersive/ee-music.js');    // música por easter egg
    await loadScript('/static/js/immersive/aurora-fix.js');  // arregla NaN en aurora.html
    await loadScript('/static/js/immersive/whispers.js');    // pistas progresivas
    await loadScript('/static/js/immersive/audio-stars.js'); // estrellas reactivas al audio
    await loadScript('/static/js/immersive/aurora-dynamics.js'); // capa dinámica /aurora
    await loadScript('/static/js/immersive/debug-hud.js');   // Shift+D en cualquier página

    /* ── Resolver pista a reproducir ─────────────────────────
       1) Si <body data-music="..."> está, usa ese.
       2) Si no, deduce por la URL (cada página tiene su propia pista).
       ACTUALIZADO: ahora cada página apunta a SU pista propia, no
       comparten luna/recuerdos/promesas como antes.
       ──────────────────────────────────────────────────────── */
    const fromBody = document.body.dataset.music;
    const fromPath = (() => {
      const p = location.pathname.toLowerCase();
      if (p.includes('aurora'))    return 'aurora';
      if (p.includes('timeline'))  return 'timeline';
      if (p.includes('carta'))     return 'carta';
      if (p.includes('universo'))  return 'universo';
      return null;
    })();
    const trackKey = fromBody || fromPath;
    console.info('[immersive-lite] track resolved:', trackKey, '(body:', fromBody, ', path:', fromPath, ')');

    /* ── Reanudar audio si ya fue desbloqueado en index ────── */
    const wasUnlocked = sessionStorage.getItem('immersive:wasUnlocked') === '1';

    let started = false;
    function tryStart() {
      if (started) return;
      // Si la página ya declara su propia canción con data-music-src
      // (sistema simple de control-musica.js), NO arrancamos también el
      // audio-engine procedural: evitaría audio doble (la pista del usuario
      // + la procedural del fallback synth sonando a la vez).
      if (document.body.dataset.musicSrc) {
        console.info('[immersive-lite] data-music-src presente → no arranco audio-engine, lo gestiona control-musica.js');
        started = true;
        return;
      }
      if (!trackKey) { console.warn('[immersive-lite] sin trackKey, no arranco música'); started = true; return; }
      if (!window.__immersiveAudio) {
        console.warn('[immersive-lite] __immersiveAudio aún no listo, reintento en 250ms');
        setTimeout(tryStart, 250);
        return;
      }
      console.info('[immersive-lite] arrancando pista:', trackKey);
      window.__immersiveAudio.section(trackKey);
      started = true;
    }

    if (wasUnlocked) {
      // Ya hubo gesto en otra página de la sesión: el contexto se reanuda
      // con el primer pointer/keydown que el browser permita; encolamos.
      ['pointerdown','keydown','touchstart','scroll'].forEach(ev => {
        window.addEventListener(ev, tryStart, { once: true, passive: true });
      });
    } else {
      // Primer arranque en sesión nueva: requiere gesto.
      ['pointerdown','keydown','touchstart'].forEach(ev => {
        window.addEventListener(ev, () => {
          sessionStorage.setItem('immersive:wasUnlocked', '1');
          tryStart();
        }, { once: true, passive: true });
      });
    }

    // Guardar la flag cuando audio-engine emita su evento
    document.addEventListener('immersive:audio-unlocked', () => {
      sessionStorage.setItem('immersive:wasUnlocked', '1');
    });

    /* ── Botón mute compacto (mismo estilo que en index) ───── */
    const btn = document.createElement('button');
    btn.id = 'immersiveMuteBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Silenciar / activar audio');
    function refresh() {
      const m = window.__immersiveAudio?.isMuted();
      btn.dataset.muted = m ? '1' : '0';
      btn.innerHTML = m ? '<span aria-hidden="true">⊘</span>'
                        : '<span aria-hidden="true">♪</span>';
    }
    btn.addEventListener('click', () => {
      window.__immersiveAudio?.toggleMute();
      refresh();
    });
    document.body.appendChild(btn);
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
