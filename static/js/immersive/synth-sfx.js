/* ══════════════════════════════════════════════════════════════
   synth-sfx.js — Sintetizador de efectos sonoros en Web Audio
   ──────────────────────────────────────────────────────────────
   Genera hover / click / reveal / transition en tiempo real con
   OscillatorNode y BufferSource (ruido). Cero archivos, cero red.

   Diseño sonoro coherente con el universo cinematográfico-romántico
   del proyecto: tonalidad cálida, ataques suaves, ambiente etéreo.

   El audio-engine.js usa este módulo como FALLBACK cuando el sprite
   /static/audio/sfx/ui-sprite.mp3 no está presente. También se puede
   forzar siempre con: window.__synthSfx.play('hover')
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__synthSfx) return;

  let ctx = null;
  let master = null;

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    // Pequeño compresor para evitar picos al disparar dos SFX a la vez
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value     = 4;
    comp.attack.value    = 0.005;
    comp.release.value   = 0.18;
    master.connect(comp).connect(ctx.destination);
    return ctx;
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function envelope(node, t0, attack, decay, peak = 1, sustain = 0, release = 0.05) {
    node.gain.cancelScheduledValues(t0);
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak,           t0 + attack);
    node.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + attack + decay);
    if (release) node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay + release);
  }

  function noiseBuffer(duration = 0.4) {
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buf;
  }

  /* ── HOVER — pequeño shimmer cristalino ─────────────────── */
  function playHover() {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(1760, t);                // A6
    o.frequency.exponentialRampToValueAtTime(2349, t + 0.12); // D7
    f.type = 'highpass';
    f.frequency.value = 800;
    envelope(g, t, 0.005, 0.16, 0.18, 0, 0.04);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.25);
  }

  /* ── CLICK — tick suave con pluck grave ─────────────────── */
  function playClick() {
    const t = ctx.currentTime;

    // Componente: ruido corto filtrado
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(0.08);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2400;
    nf.Q.value = 0.9;
    const ng = ctx.createGain();
    envelope(ng, t, 0.002, 0.05, 0.32, 0, 0.02);
    n.connect(nf).connect(ng).connect(master);
    n.start(t);
    n.stop(t + 0.12);

    // Componente: pluck sine grave
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    envelope(og, t, 0.004, 0.10, 0.28, 0, 0.03);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 0.18);
  }

  /* ── REVEAL — glissando etéreo con eco corto ────────────── */
  function playReveal() {
    const t = ctx.currentTime;
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.18;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb).connect(delay).connect(master);

    [0, 0.08, 0.16].forEach((off, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const base = [523.25, 783.99, 1046.5][i]; // C5, G5, C6
      o.frequency.setValueAtTime(base * 0.6, t + off);
      o.frequency.exponentialRampToValueAtTime(base, t + off + 0.45);
      envelope(g, t + off, 0.04, 0.32, 0.22 - i * 0.05, 0, 0.18);
      o.connect(g).connect(master);
      o.connect(g).connect(delay);
      o.start(t + off);
      o.stop(t + off + 0.7);
    });
  }

  /* ── TRANSITION — wash filtrado, tipo "swoosh" cinematográfico ── */
  function playTransition() {
    const t = ctx.currentTime;

    // Ruido filtrado pasa-banda con barrido
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(1.2);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.7);
    f.frequency.exponentialRampToValueAtTime(180,  t + 1.15);

    const g = ctx.createGain();
    envelope(g, t, 0.06, 0.7, 0.28, 0, 0.4);
    n.connect(f).connect(g).connect(master);
    n.start(t);
    n.stop(t + 1.2);

    // Drone sub grave
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 1.0);
    envelope(og, t, 0.05, 0.4, 0.18, 0.06, 0.5);
    o.connect(og).connect(master);
    o.start(t);
    o.stop(t + 1.3);
  }

  const PLAYERS = {
    hover:      playHover,
    click:      playClick,
    reveal:     playReveal,
    transition: playTransition,
  };

  function play(name) {
    if (!ensureCtx()) return false;
    if (ctx.state !== 'running') {
      // Aún no se desbloqueó por gesto, deja que el primer evento global
      // del audio-engine reanude el contexto.
      try { ctx.resume(); } catch (_) {}
    }
    const fn = PLAYERS[name];
    if (!fn) return false;
    try { fn(); return true; } catch (_) { return false; }
  }

  /* ── API pública ───────────────────────────────────────── */
  window.__synthSfx = {
    play,
    setVolume: v => { if (master) master.gain.value = Math.max(0, Math.min(1, v)); },
    isReady:   () => !!ctx,
    resume:    () => { try { ctx?.resume(); } catch (_) {} },
  };
})();
