/* ══════════════════════════════════════════════════════════════
   control-musica.js — Música por página + widget flotante de control
   ──────────────────────────────────────────────────────────────
   Funciones:
   1. Si <body> tiene data-music-src="/static/audio/X.mp3", crea
      automáticamente un <audio loop> con esa pista (solo si no
      existe ya otro <audio> en la página).
   2. Detecta cualquier <audio> presente y lo controla en bloque:
      volumen, pausa/reanudar.
   3. Inyecta un widget flotante (esquina inferior derecha) con
      botones [+ / − / ⏸▶] y barra de nivel.
   4. Persiste configuración (volumen + pausada) en localStorage
      bajo la clave 'luna:musicaConfig'. Compartida entre páginas.
   5. Maneja la política de autoplay: intenta arrancar al cargar;
      si el navegador lo bloquea, arranca al primer gesto del
      usuario (click / scroll / keydown).

   Uso:
     <body data-music-src="/static/audio/carta.mp3">
       ...
       <script src="/static/js/control-musica.js" defer></script>
     </body>

   En index.html no hace falta data-music-src porque ya hay
   <audio id="musicaFondo"> y <audio id="musicaLuna"> declarados.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__controlMusicaCargado) return;
  window.__controlMusicaCargado = true;

  // Clave v2: invalida estados problemáticos previos (vol=0 o pausada=true
   // residuales de pruebas anteriores que dejaban el audio inaudible).
  const STORE = 'luna:musicaConfig-v2';

  // ─── 1. Crear <audio> dinámico si el body lo declara ─────────
  function asegurarAudioDePagina() {
    const src = document.body && document.body.dataset.musicSrc;
    if (!src) return;
    if (document.querySelector('audio')) return; // ya hay alguno
    const a = document.createElement('audio');
    a.id          = 'musicaPagina';
    a.src         = src;
    a.loop        = true;
    a.preload     = 'auto';
    a.crossOrigin = 'anonymous';
    document.body.appendChild(a);
  }

  // ─── 2. CSS del widget ───────────────────────────────────────
  function inyectarCSS() {
    if (document.getElementById('control-musica-styles')) return;
    const s = document.createElement('style');
    s.id = 'control-musica-styles';
    s.textContent = `
      .control-musica {
        position: fixed; bottom: 16px; left: 16px; z-index: 9999;
        display: flex; align-items: center; gap: 6px;
        padding: 6px 8px;
        background: rgba(8, 12, 32, .78);
        border: 1px solid rgba(255, 255, 255, .12);
        border-radius: 999px;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, .4);
        opacity: 0; transform: translateY(12px) scale(.96);
        pointer-events: none;
        transition: opacity .4s ease, transform .4s ease;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      }
      .control-musica.visible {
        opacity: 1; transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      .control-musica .cm-btn {
        background: rgba(255, 255, 255, .08);
        color: #f0e8ff;
        border: 1px solid rgba(255, 255, 255, .15);
        border-radius: 999px;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; line-height: 1; cursor: pointer;
        user-select: none;
        transition: background .2s ease, transform .12s ease, border-color .2s ease;
      }
      .control-musica .cm-btn:hover {
        background: rgba(255, 107, 129, .18);
        border-color: rgba(255, 107, 129, .4);
      }
      .control-musica .cm-btn:active { transform: scale(.9); }
      .control-musica .cm-btn.cm-mini { width: 28px; height: 28px; font-size: 16px; }
      .control-musica .cm-toggle {
        background: linear-gradient(135deg, #ff4757, #ff6b81);
        border-color: rgba(255, 107, 129, .45);
        color: white; font-size: 13px;
      }
      .control-musica .cm-vol {
        width: 54px; height: 5px;
        background: rgba(255, 255, 255, .1);
        border-radius: 999px; overflow: hidden;
      }
      .control-musica .cm-vol-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff6b81, #f5c842);
        width: 50%;
        transition: width .2s ease;
      }
      @media (max-width: 480px) {
        .control-musica { bottom: 12px; left: 10px; padding: 5px 7px; gap: 5px; }
        .control-musica .cm-btn { width: 32px; height: 32px; }
        .control-musica .cm-btn.cm-mini { width: 26px; height: 26px; }
        .control-musica .cm-vol { width: 44px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ─── 3. Construir el widget en el DOM ────────────────────────
  function construirWidget() {
    if (document.getElementById('controlMusica')) {
      return document.getElementById('controlMusica');
    }
    const cm = document.createElement('div');
    cm.id = 'controlMusica';
    cm.className = 'control-musica';
    cm.setAttribute('role', 'group');
    cm.setAttribute('aria-label', 'Control de música');
    cm.innerHTML = `
      <button class="cm-btn cm-toggle" id="cmToggle" aria-label="Pausar o reanudar música" title="Pausar/Reanudar">⏸</button>
      <button class="cm-btn cm-mini"  id="cmMenos"  aria-label="Bajar volumen"            title="Bajar volumen">−</button>
      <div class="cm-vol" aria-label="Nivel de volumen"><div class="cm-vol-fill" id="cmVolFill"></div></div>
      <button class="cm-btn cm-mini"  id="cmMas"    aria-label="Subir volumen"            title="Subir volumen">+</button>
    `;
    document.body.appendChild(cm);
    return cm;
  }

  // ─── 4. Estado persistido ────────────────────────────────────
  function leerCfg() {
    let cfg = { vol: 0.55, pausada: false };
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) cfg = Object.assign(cfg, JSON.parse(raw));
    } catch (_) {}
    // Saneamiento defensivo: nunca arrancar muteado por accidente.
    if (typeof cfg.vol !== 'number' || isNaN(cfg.vol)) cfg.vol = 0.55;
    cfg.vol = Math.max(0, Math.min(1, cfg.vol));
    cfg.pausada = !!cfg.pausada;
    return cfg;
  }
  function guardarCfg(cfg) {
    try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (_) {}
  }

  // ─── 5. Lógica de control ────────────────────────────────────
  function init() {
    asegurarAudioDePagina();
    inyectarCSS();
    construirWidget();

    const cfg = leerCfg();

    function audios() {
      return Array.from(document.querySelectorAll('audio'));
    }

    function aplicarVolumen() {
      audios().forEach(a => { try { a.volume = cfg.vol; } catch (_) {} });
      const fill = document.getElementById('cmVolFill');
      if (fill) fill.style.width = (cfg.vol * 100) + '%';
    }

    function aplicarPausa() {
      audios().forEach(a => {
        if (cfg.pausada) {
          if (!a.paused) a.pause();
        } else {
          // Reanuda solo el que ya tenía progreso (estaba sonando)
          if (a.paused && a.currentTime > 0 && !a.ended) {
            a.play().catch(() => {});
          }
        }
      });
      // Propagar pausa al sistema immersive (Howler + Tone) para evitar
      // que pistas procedurales sigan sonando cuando el usuario pausa.
      try {
        if (typeof Howler !== 'undefined' && Howler.mute) Howler.mute(cfg.pausada);
      } catch (_) {}
      try {
        if (cfg.pausada && window.__synthMusic && window.__synthMusic.stopAll) {
          window.__synthMusic.stopAll();
        }
      } catch (_) {}
      try {
        if (window.__immersiveAudio && typeof window.__immersiveAudio.isMuted === 'function') {
          if (window.__immersiveAudio.isMuted() !== cfg.pausada) {
            window.__immersiveAudio.toggleMute();
          }
        }
      } catch (_) {}
      const tog = document.getElementById('cmToggle');
      if (tog) tog.textContent = cfg.pausada ? '▶' : '⏸';
    }

    function mostrarWidget() {
      const cm = document.getElementById('controlMusica');
      if (cm) cm.classList.add('visible');
    }

    // Handlers de botones
    document.getElementById('cmMenos').addEventListener('click', () => {
      cfg.vol = Math.max(0, Math.round((cfg.vol - 0.1) * 10) / 10);
      aplicarVolumen(); guardarCfg(cfg);
    });
    document.getElementById('cmMas').addEventListener('click', () => {
      cfg.vol = Math.min(1, Math.round((cfg.vol + 0.1) * 10) / 10);
      aplicarVolumen(); guardarCfg(cfg);
    });
    document.getElementById('cmToggle').addEventListener('click', () => {
      cfg.pausada = !cfg.pausada;
      // Si el usuario reanuda manualmente y el audio nunca arrancó,
      // forzamos play() incondicional aprovechando el gesto del click.
      if (!cfg.pausada) {
        // Asegurar que Howler global no quede muted desde una sesión previa.
        try { if (typeof Howler !== 'undefined' && Howler.mute) Howler.mute(false); } catch (_) {}
        audios().forEach(a => {
          try { a.muted = false; a.volume = cfg.vol; } catch (_) {}
          a.play().catch(() => {});
        });
      }
      aplicarPausa(); guardarCfg(cfg);
    });

    // Engancha eventos a cada <audio>
    audios().forEach(a => {
      a.addEventListener('play', () => {
        mostrarWidget();
        try { a.volume = cfg.vol; } catch (_) {}
        if (cfg.pausada) a.pause();
      });
      a.addEventListener('volumechange', () => {
        if (Math.abs(a.volume - cfg.vol) > 0.01) {
          cfg.vol = Math.round(a.volume * 10) / 10;
          const fill = document.getElementById('cmVolFill');
          if (fill) fill.style.width = (cfg.vol * 100) + '%';
        }
      });
    });

    // Aplica configuración inicial
    aplicarVolumen();

    // Si NO estamos pausados, garantizar que Howler/audios no estén muted
    // (defensivo contra estados residuales de versiones previas).
    if (!cfg.pausada) {
      try { if (typeof Howler !== 'undefined' && Howler.mute) Howler.mute(false); } catch (_) {}
      audios().forEach(a => { try { a.muted = false; } catch (_) {} });
    }

    // ─── 6. Autoplay: intenta. Si falla, espera al primer gesto ───
    function intentarReproducirPagina() {
      // Solo dispara para los <audio> que tengan autoplay-intent:
      // - musicaPagina (creado dinámicamente con data-music-src)
      // - musicaFondo (existe en index.html)
      // No tocamos musicaLuna; la activa el easter egg manualmente.
      const objetivo = document.getElementById('musicaPagina')
                    || document.getElementById('musicaFondo');
      if (!objetivo) return;
      if (cfg.pausada) {
        // Si el usuario tenía pausada la música, no la arrancamos
        // pero sí mostramos el widget para que pueda darle al play.
        mostrarWidget();
        return;
      }
      const intento = objetivo.play();
      if (intento && typeof intento.then === 'function') {
        intento.then(() => {
          mostrarWidget();
        }).catch(() => {
          // Bloqueado por política de autoplay → esperamos un gesto
          const arrancarConGesto = () => {
            objetivo.play().then(mostrarWidget).catch(() => {});
            window.removeEventListener('click',   arrancarConGesto);
            window.removeEventListener('keydown', arrancarConGesto);
            window.removeEventListener('scroll',  arrancarConGesto);
            window.removeEventListener('touchstart', arrancarConGesto);
          };
          window.addEventListener('click',      arrancarConGesto, { once: true });
          window.addEventListener('keydown',    arrancarConGesto, { once: true });
          window.addEventListener('scroll',     arrancarConGesto, { once: true, passive: true });
          window.addEventListener('touchstart', arrancarConGesto, { once: true, passive: true });
        });
      }
    }

    // Solo intentamos auto-reproducir en subpáginas (donde existe musicaPagina).
    // En index.html la música la maneja script.js (al abrir el regalo).
    if (document.getElementById('musicaPagina')) {
      // Pequeño delay para que el navegador termine de cargar el audio
      setTimeout(intentarReproducirPagina, 200);
    } else {
      // En index, mostramos el widget cuando arranque cualquier <audio>
      // (lo gestiona el listener 'play' de arriba). Pero si ya está
      // sonando al cargar (caso entrarFiestaDirecto en script.js),
      // lo mostramos aquí también:
      setTimeout(() => {
        if (audios().some(a => !a.paused)) mostrarWidget();
      }, 600);
    }
  }

  // ─── 7. Esperar a DOM listo ─────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
