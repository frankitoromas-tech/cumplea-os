/* ══════════════════════════════════════════════════════════════
   synth-music-fallback.js — Música procedural en Web Audio puro
   ──────────────────────────────────────────────────────────────
   Si Tone.js NO carga (CSP, red bloqueada, etc.), este módulo
   garantiza que SIEMPRE haya música ambiental sonando. Usa solo
   Web Audio API, cero dependencias. La musica es más simple pero
   reliable: chords cíclicos sostenidos, sin batería ni FX.

   Se activa solo si __synthMusic.play() falla en arrancar Tone
   en menos de 3 segundos. Ofrece la misma API en
   window.__synthMusicFallback.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__synthMusicFallback) return;

  let ctx = null;
  let master = null;
  const active = {};   // key → { stop }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;    // muy suave, es fondo
    master.connect(ctx.destination);
    return ctx;
  }

  /* Acordes simples por sección (notas en Hz aproximadas).
     Cada track es un ciclo de N acordes que suena suave. */
  const TRACKS = {
    intro:     { bpm: 64, chords: [['C3','Eb3','G3','Bb3'], ['Ab2','C3','Eb3','G3'], ['Eb3','G3','Bb3','D4'], ['Bb2','D3','F3','Ab3']] },
    recuerdos: { bpm: 70, chords: [['E3','G3','B3'], ['C3','E3','G3','B3'], ['G2','B2','D3','G3'], ['D3','F#3','A3','D4']] },
    promesas:  { bpm: 78, chords: [['A2','C3','E3'], ['F2','A2','C3'], ['C3','E3','G3'], ['G2','B2','D3']] },
    luna:      { bpm: 60, chords: [['C2','G2','D3','A3'], ['G2','D3','A3','E4']] },
    regalo:    { bpm: 100, chords: [['C4','E4','G4'], ['F4','A4','C5'], ['G4','B4','D5'], ['A4','C5','E5']] },
    fiesta:    { bpm: 88, chords: [['C4','E4','G4','C5'], ['G3','B3','D4','G4'], ['A3','C4','E4','A4'], ['F3','A3','C4','F4']] },
    carta:     { bpm: 60, chords: [['F3','A3','C4'], ['A3','C4','E4'], ['Bb3','D4','F4'], ['C4','E4','G4']] },
    timeline:  { bpm: 84, chords: [['C3','E3','G3'], ['G2','B2','D3'], ['A2','C3','E3'], ['F2','A2','C3']] },
    aurora:    { bpm: 90, chords: [['D3','F3','A3','D4'], ['F3','A3','C4','F4'], ['C3','E3','G3','C4'], ['G2','B2','D3','G3']] },
    universo:  { bpm: 70, chords: [['D2','A2','E3','B3'], ['A2','E3','B3','F#4']] },
  };

  function noteToHz(note) {
    const map = { 'C':-9, 'C#':-8, 'Db':-8, 'D':-7, 'D#':-6, 'Eb':-6,
                  'E':-5, 'F':-4, 'F#':-3, 'Gb':-3, 'G':-2, 'G#':-1,
                  'Ab':-1, 'A':0, 'A#':1, 'Bb':1, 'B':2 };
    const m = note.match(/^([A-G][b#]?)(\d)$/);
    if (!m) return 440;
    const semis = map[m[1]] + (parseInt(m[2]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  function play(key) {
    if (!ensureCtx()) return false;
    if (active[key]) return true;
    const track = TRACKS[key];
    if (!track) return false;

    if (ctx.state !== 'running') ctx.resume().catch(()=>{});

    // Detener otras tracks
    for (const k in active) if (k !== key) stop(k);

    const beatMs = 60000 / track.bpm;
    const chordMs = beatMs * 4;     // un compás 4/4 por acorde

    let chordIdx = 0;
    let voices = [];

    function playChord() {
      // Crear voces fade-in
      voices.forEach(v => {
        try {
          v.gain.gain.cancelScheduledValues(ctx.currentTime);
          v.gain.gain.setValueAtTime(v.gain.gain.value, ctx.currentTime);
          v.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
          v.osc.stop(ctx.currentTime + 0.5);
        } catch (_) {}
      });
      voices = [];

      const chord = track.chords[chordIdx % track.chords.length];
      chord.forEach((n, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 0 ? 'triangle' : 'sine';
        o.frequency.value = noteToHz(n);
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(0.08 / Math.max(1, chord.length / 2),
                                        ctx.currentTime + 0.5);
        o.connect(g).connect(master);
        o.start();
        voices.push({ osc: o, gain: g });
      });
      chordIdx++;
    }

    playChord();
    const interval = setInterval(playChord, chordMs);

    active[key] = {
      stop: () => {
        clearInterval(interval);
        voices.forEach(v => {
          try {
            v.gain.gain.cancelScheduledValues(ctx.currentTime);
            v.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
            v.osc.stop(ctx.currentTime + 0.5);
          } catch (_) {}
        });
        voices = [];
      },
    };
    console.info('[synth-music-fallback] ▶ ', key);
    return true;
  }

  function stop(key) {
    const a = active[key];
    if (!a) return;
    a.stop();
    delete active[key];
    console.info('[synth-music-fallback] ■ ', key);
  }

  function stopAll() { Object.keys(active).forEach(stop); }

  function setMasterDb(db) {
    if (!master) return;
    // dB → linear amplitude
    const lin = db <= -100 ? 0 : Math.pow(10, db / 20);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(lin * 0.18, ctx.currentTime + 0.2);
  }

  function isPlaying(key) { return !!active[key]; }

  window.__synthMusicFallback = {
    play, stop, stopAll, setMasterDb, isPlaying,
    isAvailable: () => !!ensureCtx(),
  };
})();
