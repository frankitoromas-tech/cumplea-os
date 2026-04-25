/* ══════════════════════════════════════════════════════════════
   debug-hud.js — Overlay de diagnóstico (Shift+D)
   ──────────────────────────────────────────────────────────────
   Pulsa Shift+D para mostrar/ocultar un panel discreto que reporta:
     • Audio: unlocked / muted / sección actual / fuente (sprite|synth)
     • Música procedural activa (sí/no, qué pista)
     • Partículas: FPS, analyser conectado, niveles bass/mid/treble
     • Scroll engine: Lenis activo, ScrollTrigger activo
     • Tilt: número de elementos enganchados
     • Modo preview: on/off
   No persiste estado, no hace fetch, no toca lógica del proyecto.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__debugHud) return;
  window.__debugHud = true;

  let panel = null;
  let visible = false;
  let raf = 0;

  /* ── Estilos inyectados ──────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('debug-hud-styles')) return;
    const s = document.createElement('style');
    s.id = 'debug-hud-styles';
    s.textContent = `
      #debugHud {
        position: fixed; top: 70px; left: 18px; z-index: 99998;
        font-family: ui-monospace, 'SF Mono', Menlo, monospace;
        font-size: 11px; line-height: 1.55;
        color: #c8d4ff; background: rgba(4,7,26,.78);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 10px; padding: 12px 16px;
        backdrop-filter: blur(12px);
        min-width: 240px; max-width: 320px;
        box-shadow: 0 12px 40px rgba(0,0,0,.5);
        pointer-events: auto;
        opacity: 0; transform: translateX(-12px);
        transition: opacity .25s ease, transform .25s ease;
      }
      #debugHud.visible { opacity: 1; transform: translateX(0); }
      #debugHud .dh-title {
        font-size: 10px; font-weight: 700; letter-spacing: 2px;
        color: #ff6b81; text-transform: uppercase; margin-bottom: 8px;
        border-bottom: 1px solid rgba(255,107,129,.25); padding-bottom: 6px;
      }
      #debugHud .dh-row {
        display: flex; justify-content: space-between; gap: 12px;
      }
      #debugHud .dh-key { color: rgba(200,212,255,.55); }
      #debugHud .dh-val { color: #f5c842; font-weight: 600; text-align: right; word-break: break-all; }
      #debugHud .dh-val.ok    { color: #0afab0; }
      #debugHud .dh-val.warn  { color: #f5c842; }
      #debugHud .dh-val.err   { color: #ff4757; }
      #debugHud .dh-bar {
        height: 4px; background: rgba(255,255,255,.08); border-radius: 2px;
        overflow: hidden; margin: 2px 0;
      }
      #debugHud .dh-bar-fill {
        height: 100%; background: linear-gradient(90deg,#ff6b81,#f5c842);
        transition: width .08s linear;
      }
      #debugHud .dh-section { margin-top: 8px; }
      #debugHud .dh-hint {
        margin-top: 8px; padding-top: 6px; font-size: 10px;
        color: rgba(255,255,255,.4); border-top: 1px solid rgba(255,255,255,.08);
      }
    `;
    document.head.appendChild(s);
  }

  /* ── DOM del panel ───────────────────────────────────────── */
  function build() {
    panel = document.createElement('div');
    panel.id = 'debugHud';
    panel.innerHTML = `
      <div class="dh-title">✦ Immersive Debug</div>
      <div id="dh-content"></div>
      <div class="dh-hint">Shift+D para alternar · Solo cliente</div>
    `;
    document.body.appendChild(panel);
  }

  /* ── FPS counter ─────────────────────────────────────────── */
  let lastFrame = performance.now();
  let fps = 60;
  function updateFps() {
    const now = performance.now();
    const dt = now - lastFrame;
    lastFrame = now;
    fps = fps * 0.9 + (1000 / dt) * 0.1;
  }

  /* ── Render del HUD ──────────────────────────────────────── */
  function bar(v) {
    const pct = Math.max(0, Math.min(100, v * 100));
    return `<div class="dh-bar"><div class="dh-bar-fill" style="width:${pct.toFixed(0)}%"></div></div>`;
  }
  function row(k, v, cls = '') {
    return `<div class="dh-row"><span class="dh-key">${k}</span><span class="dh-val ${cls}">${v}</span></div>`;
  }
  function bool(b) { return b ? '<span class="ok">✓</span>' : '<span class="err">✗</span>'; }

  function render() {
    updateFps();

    const aud = window.__immersiveAudio;
    const music = window.__synthMusic;
    const bg  = window.__immersiveBg;
    const scr = window.__immersiveScroll;
    const tilt = window.__immersiveTilt;

    const audSection = document.documentElement.dataset.musicFallback === 'synth'
      ? 'procedural'
      : (aud && document.documentElement.dataset.audioReady ? 'sprite/MP3' : '—');
    const audMode = document.documentElement.dataset.audioFallback === 'synth'
      ? 'synth (Web Audio)'
      : 'sprite (Howler)';

    let bands = { bass: 0, mid: 0, treble: 0, level: 0 };
    if (bg && bg.readBands) bands = bg.readBands();

    const previewOn = document.documentElement.dataset.previewMode === '1';
    const reduced   = document.documentElement.dataset.reducedMotion === '1';
    const luyu      = document.body.classList.contains('luyuromo-mode');

    // Pista activa
    let activaProc = '—';
    if (music) {
      ['intro','recuerdos','promesas','luna'].forEach(k => {
        if (music.isPlaying && music.isPlaying(k)) activaProc = k;
      });
    }

    const html = `
      <div class="dh-section">
        ${row('preview',  previewOn ? bool(true) + ' on' : 'off',  previewOn ? 'ok' : '')}
        ${row('reduced',  reduced ? 'reduced-motion' : 'full',     reduced ? 'warn' : 'ok')}
        ${row('luyuromo', luyu ? 'ACTIVO' : 'idle',                luyu ? 'ok' : '')}
      </div>

      <div class="dh-section">
        ${row('audio.unlocked', bool(aud?.isUnlocked?.()))}
        ${row('audio.muted',    bool(aud?.isMuted?.()))}
        ${row('audio.sfx',      audMode)}
        ${row('audio.section',  audSection)}
        ${row('synth.music',    activaProc)}
      </div>

      <div class="dh-section">
        ${row('three.fps',     fps.toFixed(0))}
        ${row('three.analyser', bool(bg?.hasAnalyser?.()))}
        ${row('bass',  (bands.bass*100).toFixed(0)+'%')}
        ${bar(bands.bass)}
        ${row('mid',   (bands.mid*100).toFixed(0)+'%')}
        ${bar(bands.mid)}
        ${row('treble',(bands.treble*100).toFixed(0)+'%')}
        ${bar(bands.treble)}
      </div>

      <div class="dh-section">
        ${row('lenis',  bool(!!scr?.lenis?.()))}
        ${row('tilt',   tilt ? 'scan() OK' : '—')}
        ${row('Howler', typeof Howler !== 'undefined' ? 'v' + (Howler.version || '?') : '—')}
        ${row('Tone',   typeof Tone   !== 'undefined' ? 'v' + (Tone.version   || '?') : '—')}
        ${row('THREE',  typeof THREE  !== 'undefined' ? THREE.REVISION : '—')}
      </div>
    `;
    document.getElementById('dh-content').innerHTML = html;

    if (visible) raf = requestAnimationFrame(render);
  }

  function toggle() {
    visible = !visible;
    if (visible) {
      injectStyles();
      if (!panel) build();
      panel.classList.add('visible');
      lastFrame = performance.now();
      render();
    } else {
      panel?.classList.remove('visible');
      cancelAnimationFrame(raf);
    }
  }

  document.addEventListener('keydown', e => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      e.preventDefault();
      toggle();
    }
  });

  // Auto-mostrar en modo preview
  setTimeout(() => {
    if (document.documentElement.dataset.previewMode === '1' && !visible) toggle();
  }, 1500);

  window.__debugHud = { toggle };
})();
