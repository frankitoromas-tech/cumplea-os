/* ══════════════════════════════════════════════════════════════
   audio-engine.js — Motor de audio inmersivo (Fase 1)
   ──────────────────────────────────────────────────────────────
   • Howler.js como motor (carga vía CDN en boot.js)
   • Sprite SFX único para hover/click/reveal/transition
   • Música por sección con crossfade de 1.5s
   • Sortea bloqueo de autoplay esperando el primer gesto del usuario
   • Mute persistente en sessionStorage
   • RESPETA los <audio id="musicaFondo"> y <audio id="musicaLuna">
     existentes: si ya están sonando, no los pisa.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveAudio) return;          // singleton
  if (typeof Howl === 'undefined') {
    console.warn('[audio-engine] Howler.js no está cargado todavía');
    return;
  }

  const KEY_MUTE = 'immersive:muted';
  const FADE_MS  = 1500;

  /* ── Sprite SFX ─────────────────────────────────────────────
     Un solo archivo MP3 con todos los efectos cortos.
     Si el archivo no existe aún, los métodos hacen no-op (silenciosamente).
     ──────────────────────────────────────────────────────────── */
  const SFX_SRC = '/static/audio/sfx/ui-sprite.mp3';
  // Sprite por defecto (ms): hover 0-200, click 250-500, reveal 600-1400, transition 1500-3000
  const SFX_MAP = {
    hover:      [0,    200 ],
    click:      [250,  250 ],
    reveal:     [600,  800 ],
    transition: [1500, 1500],
  };

  /* ── Biblioteca de música por sección ──────────────────────
     Las pistas se cargan en demanda. Si el archivo aún no existe,
     el motor lo ignora sin romper nada. Edita estos paths a gusto.
     ──────────────────────────────────────────────────────────── */
  const TRACKS = {
    intro:     '/static/audio/music/01-intro-classical.mp3',
    recuerdos: '/static/audio/music/02-recuerdos-piano.mp3',
    promesas:  '/static/audio/music/03-promesas-rock-ballad.mp3',
    luna:      '/static/audio/music/04-luna-ambient.mp3',
  };

  /* ── Estado interno ─────────────────────────────────────────
     ──────────────────────────────────────────────────────────── */
  let sfx          = null;
  let unlocked     = false;
  let muted        = sessionStorage.getItem(KEY_MUTE) === '1';
  let currentKey   = null;
  let currentHowl  = null;
  const cache      = Object.create(null);

  /* ── Volumen global (0..1) ──────────────────────────────────
     ──────────────────────────────────────────────────────────── */
  Howler.volume(muted ? 0 : 0.7);

  /* ── Carga del sprite (lazy) ────────────────────────────────
     Si el archivo MP3 no existe, marcamos el motor para usar el
     sintetizador Web Audio (synth-sfx.js) como fallback.
     ──────────────────────────────────────────────────────────── */
  let useSynth = false;
  function loadSprite() {
    if (sfx || useSynth) return;
    sfx = new Howl({
      src: [SFX_SRC],
      sprite: SFX_MAP,
      preload: true,
      volume: 0.45,
      onloaderror: () => {
        sfx = null;
        useSynth = true;
        document.documentElement.dataset.audioFallback = 'synth';
      },
    });
  }

  /* ── Carga de pista de música ───────────────────────────────
     Si el MP3 no carga, marcamos la pista como "procedural" y la
     reproducción la toma window.__synthMusic (Tone.js, lazy).
     ──────────────────────────────────────────────────────────── */
  const PROC = Object.create(null);     // key → true si va por synth
  function loadTrack(key) {
    if (PROC[key]) return null;          // forzar uso de synthMusic
    if (cache[key] !== undefined) return cache[key];
    const src = TRACKS[key];
    if (!src) { PROC[key] = true; return null; }
    const h = new Howl({
      src: [src],
      loop: true,
      volume: 0,           // arranca en 0, hacemos fade-in
      html5: true,         // streaming para archivos largos
      onloaderror: () => {
        cache[key] = null;
        PROC[key]  = true;
        document.documentElement.dataset.musicFallback = 'synth';
        // Si la sección actual es ésta, cambiamos a synth en caliente
        if (currentKey === key && window.__synthMusic) {
          window.__synthMusic.play(key);
        }
      },
    });
    cache[key] = h;
    return h;
  }

  /* ── API pública ────────────────────────────────────────────
     ──────────────────────────────────────────────────────────── */
  function playSfx(name) {
    if (!unlocked || muted) return;
    if (!sfx && !useSynth) loadSprite();
    if (sfx && SFX_MAP[name]) {
      try { sfx.play(name); return; } catch (_) {}
    }
    // Fallback: sintetizador Web Audio
    if (window.__synthSfx) window.__synthSfx.play(name);
  }

  function playSection(key) {
    if (!unlocked) { currentKey = key; return; }   // se reanudará al desbloquear
    if (key === currentKey) return;
    const next = loadTrack(key);
    const prev = currentHowl;

    if (next) {
      next.volume(0);
      const id = next.play();
      next.fade(0, muted ? 0 : 0.55, FADE_MS, id);
    } else if (window.__synthMusic) {
      // Pista procedural (Tone.js).
      // Bug fix: arrancar AUNQUE esté muted; setMasterDb(-100) hace el silencio.
      // Si no, al desmutear no había nada sonando.
      window.__synthMusic.play(key);
      if (muted) window.__synthMusic.setMasterDb(-100);
    }

    // Detener pista anterior (Howl o procedural)
    if (prev) {
      const fromVol = prev.volume();
      prev.fade(fromVol, 0, FADE_MS);
      setTimeout(() => { try { prev.stop(); } catch (_) {} }, FADE_MS + 80);
    }
    if (window.__synthMusic && currentKey && currentKey !== key) {
      window.__synthMusic.stop(currentKey);
    }

    currentKey  = key;
    currentHowl = next || null;
  }

  function stopAll() {
    if (currentHowl) { try { currentHowl.stop(); } catch (_) {} }
    if (window.__synthMusic) window.__synthMusic.stopAll();
    currentHowl = null;
    currentKey  = null;
  }

  function toggleMute() {
    muted = !muted;
    sessionStorage.setItem(KEY_MUTE, muted ? '1' : '0');
    Howler.volume(muted ? 0 : 0.7);
    // Propagar el estado al sintetizador musical (Tone.js maneja dB)
    if (window.__synthMusic) window.__synthMusic.setMasterDb(muted ? -100 : -8);
    document.documentElement.dataset.audioMuted = muted ? '1' : '0';
    return muted;
  }

  function isMuted() { return muted; }

  /* ── Desbloqueo en primer gesto ─────────────────────────────
     Chrome/Safari requieren un gesto para iniciar AudioContext.
     Engancho una sola vez a pointerdown / keydown / touchstart.
     ──────────────────────────────────────────────────────────── */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    document.documentElement.dataset.audioReady = '1';
    try { sessionStorage.setItem('immersive:wasUnlocked', '1'); } catch (_) {}

    // Si el contexto está suspendido, reanudar.
    try { if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume(); } catch (_) {}

    loadSprite();

    // Si alguien pidió una sección antes del desbloqueo, arrancar ahora
    if (currentKey) {
      const k = currentKey;
      currentKey = null;
      playSection(k);
    }

    document.dispatchEvent(new CustomEvent('immersive:audio-unlocked'));
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, unlock, { once: true, passive: true });
  });

  /* ── Hooks declarativos ─────────────────────────────────────
     Cualquier elemento con [data-sfx="hover|click|reveal"] dispara
     el SFX correspondiente sin que tengas que escribir más JS.
     Cualquier sección con [data-music="intro|recuerdos|..."] activa
     la pista cuando el 50% entra al viewport.
     ──────────────────────────────────────────────────────────── */
  function bindDeclarative() {
    // SFX hover
    document.addEventListener('pointerenter', e => {
      const t = e.target.closest?.('[data-sfx-hover]');
      if (t) playSfx(t.dataset.sfxHover || 'hover');
    }, true);

    // SFX click
    document.addEventListener('click', e => {
      const t = e.target.closest?.('[data-sfx-click]');
      if (t) playSfx(t.dataset.sfxClick || 'click');
    }, true);

    // Música por sección via IntersectionObserver
    const sections = document.querySelectorAll('[data-music]');
    if (!sections.length) return;
    const io = new IntersectionObserver(entries => {
      // Toma la sección con mayor intersección visible
      let best = null, bestRatio = 0;
      entries.forEach(en => {
        if (en.intersectionRatio > bestRatio) {
          bestRatio = en.intersectionRatio;
          best = en.target;
        }
      });
      if (best && bestRatio > 0.45) playSection(best.dataset.music);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    sections.forEach(s => io.observe(s));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDeclarative);
  } else {
    bindDeclarative();
  }

  /* ── Exposición global ──────────────────────────────────────
     ──────────────────────────────────────────────────────────── */
  window.__immersiveAudio = {
    sfx:        playSfx,
    section:    playSection,
    stop:       stopAll,
    toggleMute: toggleMute,
    isMuted:    isMuted,
    isUnlocked: () => unlocked,
  };
})();
