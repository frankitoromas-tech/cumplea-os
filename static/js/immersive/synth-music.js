/* ══════════════════════════════════════════════════════════════
   synth-music.js — Compositor procedural en Web Audio (Tone.js)
   ──────────────────────────────────────────────────────────────
   v2 — De loops a CANCIONES con estructura.
   Cada pista tiene secciones (intro / verso / coro / puente / outro)
   con cambios de instrumentación, dinámica y armonía. Cada compás
   emite "synthmusic:beat" para que lyric-sync pinte el karaoke.
   ──────────────────────────────────────────────────────────────
   API:
     window.__synthMusic.play(key)     → arrancar pista
     window.__synthMusic.stop(key)
     window.__synthMusic.stopAll()
     window.__synthMusic.setMasterDb(db)
     window.__synthMusic.isPlaying(key)
     window.__synthMusic.currentMeasure(key)

   Eventos:
     'synthmusic:start'  detail:{ key }
     'synthmusic:beat'   detail:{ key, measure, section }
     'synthmusic:stop'   detail:{ key }
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__synthMusic) return;

  const TONE_CDN = 'https://cdn.jsdelivr.net/npm/tone@14.8.49/build/Tone.js';

  let tonePromise = null;
  function ensureTone() {
    if (window.Tone) return Promise.resolve(window.Tone);
    if (tonePromise) return tonePromise;
    tonePromise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = TONE_CDN;
      s.defer = true;
      s.onload  = () => resolve(window.Tone || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return tonePromise;
  }

  /* ── Estado ──────────────────────────────────────────────── */
  const active = {};   // key → { dispose, getMeasure }
  let masterVol = -8;

  function fire(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /* ─────────────────────────────────────────────────────────────
     COMPOSITORES
     Cada uno construye una canción de N compases. La canción se
     repite en bucle, pero cada repetición puede variar (segundo
     verso con armonía sustituida, coro con drums extra, etc).
     Devuelve { dispose: fn, getMeasure: fn }.
     ───────────────────────────────────────────────────────────── */
  const COMPOSERS = {

    /* ═══════════════════════════════════════════════════════
       INTRO — Suite cinematográfica clásica
       Estructura (32 compases):
         intro  (4)  → pad solo, gradual
         tema   (8)  → arpa entra con tema melódico
         desar  (8)  → cuerdas + arpa, doble nivel
         coda   (4)  → swell + caída
         (loop)
       ─────────────────────────────────────────────────────── */
    intro(Tone, key) {
      const reverb = new Tone.Reverb({ decay: 7, wet: 0.45 }).toDestination();
      const lpf    = new Tone.Filter(2200, 'lowpass').connect(reverb);
      const wide   = new Tone.StereoWidener(0.7).connect(lpf);

      const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 22 },
        envelope:   { attack: 1.6, decay: 0.4, sustain: 0.85, release: 4 },
        volume: -16,
      }).connect(wide);

      const arpa = new Tone.PluckSynth({
        attackNoise: 1.1, dampening: 4500, resonance: 0.78, volume: -8,
      }).connect(reverb);

      const cello = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.25, decay: 0.4, sustain: 0.7, release: 1.6 },
        filter: { Q: 1, type: 'lowpass' },
        filterEnvelope: { attack: 0.4, decay: 0.6, sustain: 0.5, release: 1.2,
                          baseFrequency: 200, octaves: 2 },
        volume: -14,
      }).connect(reverb);

      // Progresión: Cm - Ab - Eb - Bb (épica, clásica)
      const PROG = [
        ['C3','Eb3','G3','Bb3'],
        ['Ab2','C3','Eb3','G3'],
        ['Eb3','G3','Bb3','D4'],
        ['Bb2','D3','F3','Ab3'],
      ];
      const TEMA_MELODIA = ['G4','Bb4','C5','Bb4','G4','F4','Eb4','D4'];

      let cycle = 0;          // 0..31 (32 compases)
      const loop = new Tone.Loop(time => {
        const m = cycle % 32;
        const ch = PROG[(m >> 2) % PROG.length];
        let section = 'intro';

        if (m < 4) {
          // Pad solo, suave
          pad.triggerAttackRelease(ch, '1m', time, 0.45);
          section = 'intro';
        } else if (m < 12) {
          // Tema con arpa
          pad.triggerAttackRelease(ch, '1m', time, 0.55);
          const idx = (m - 4) % TEMA_MELODIA.length;
          arpa.triggerAttackRelease(TEMA_MELODIA[idx], '2n',
            time + Tone.Time('8n').toSeconds(), 0.85);
          arpa.triggerAttackRelease(TEMA_MELODIA[(idx+2) % TEMA_MELODIA.length], '4n',
            time + Tone.Time('4n').toSeconds() * 2, 0.7);
          section = 'tema';
        } else if (m < 20) {
          // Desarrollo: pad + arpa + cello con bajo del acorde
          pad.triggerAttackRelease(ch, '1m', time, 0.6);
          cello.triggerAttackRelease(ch[0].replace(/\d$/, '2'), '2n', time, 0.7);
          [0, 1, 2, 3, 2, 1].forEach((n, i) => {
            arpa.triggerAttackRelease(ch[n] || ch[0], '8n',
              time + i * Tone.Time('8n').toSeconds(), 0.55);
          });
          section = 'desarrollo';
        } else if (m < 28) {
          // Subida emocional con tutti
          pad.triggerAttackRelease(ch, '1m', time, 0.7);
          cello.triggerAttackRelease(ch[0].replace(/\d$/, '2'), '1m', time, 0.85);
          // Arpegio ascendente más rápido
          for (let i = 0; i < 8; i++) {
            arpa.triggerAttackRelease(ch[i % ch.length], '16n',
              time + i * Tone.Time('16n').toSeconds(), 0.7 - i * 0.04);
          }
          section = 'climax';
        } else {
          // Coda: caída suave
          pad.triggerAttackRelease(ch, '1m', time, 0.4);
          arpa.triggerAttackRelease(ch[0], '2n', time, 0.5);
          section = 'coda';
        }

        // Aviso a lyric-sync
        Tone.Draw.schedule(() => {
          fire('synthmusic:beat', { key, measure: m, section });
        }, time);

        cycle++;
      }, '1m').start(0);

      Tone.Transport.bpm.value = 62;

      return {
        dispose: () => {
          [pad, arpa, cello, lpf, wide, reverb, loop].forEach(n => {
            try { n.stop?.(); } catch (_) {}
            try { n.dispose?.(); } catch (_) {}
          });
        },
        getMeasure: () => cycle % 32,
      };
    },

    /* ═══════════════════════════════════════════════════════
       RECUERDOS — Piano íntimo con arco de 16 compases
       intro (4) · verso (8) · puente (4)  → loop
       ─────────────────────────────────────────────────────── */
    recuerdos(Tone, key) {
      const reverb = new Tone.Reverb({ decay: 9, wet: 0.5 }).toDestination();
      const piano = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope:   { attack: 0.005, decay: 1.4, sustain: 0.0, release: 2.0 },
        volume: -10,
      }).connect(reverb);

      const sub = new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 1.4 },
        volume: -20,
      }).connect(reverb);

      // Progresión Em - Cmaj7 - G - D
      const ACORDES = [
        ['E3','G3','B3'],
        ['C3','E3','G3','B3'],
        ['G2','B2','D3','G3'],
        ['D3','F#3','A3','D4'],
      ];
      const VERSO_MEL  = ['E4','G4','B4','A4','G4','E4','D4','G4'];
      const PUENTE_MEL = ['B4','C5','D5','C5','B4','A4','G4','E4'];

      let cycle = 0;
      const loop = new Tone.Loop(time => {
        const m = cycle % 16;
        const ch = ACORDES[m % 4];
        let section = '';

        if (m < 4) {
          // Intro: solo bajo y notas sueltas
          sub.triggerAttackRelease(ch[0].replace(/\d$/, '2'), '1m', time, 0.6);
          piano.triggerAttackRelease(ch[ch.length - 1], '2n',
            time + Tone.Time('2n').toSeconds(), 0.45);
          section = 'intro';
        } else if (m < 12) {
          // Verso: melodía
          sub.triggerAttackRelease(ch[0].replace(/\d$/, '2'), '1m', time, 0.55);
          piano.triggerAttackRelease(ch, '1m', time, 0.4);
          const idx = (m - 4) % VERSO_MEL.length;
          piano.triggerAttackRelease(VERSO_MEL[idx], '2n',
            time + Tone.Time('4n').toSeconds(), 0.85);
          piano.triggerAttackRelease(VERSO_MEL[(idx + 1) % VERSO_MEL.length], '4n',
            time + Tone.Time('2n').toSeconds() * 1.5, 0.7);
          section = 'verso';
        } else {
          // Puente: melodía superior
          sub.triggerAttackRelease(ch[0].replace(/\d$/, '2'), '1m', time, 0.6);
          piano.triggerAttackRelease(ch, '1m', time, 0.45);
          const idx = (m - 12) % PUENTE_MEL.length;
          piano.triggerAttackRelease(PUENTE_MEL[idx], '2n',
            time + Tone.Time('4n').toSeconds(), 0.9);
          section = 'puente';
        }

        Tone.Draw.schedule(() => {
          fire('synthmusic:beat', { key, measure: m, section });
        }, time);

        cycle++;
      }, '1m').start(0);

      Tone.Transport.bpm.value = 68;

      return {
        dispose: () => {
          [piano, sub, reverb, loop].forEach(n => {
            try { n.stop?.(); } catch (_) {}
            try { n.dispose?.(); } catch (_) {}
          });
        },
        getMeasure: () => cycle % 16,
      };
    },

    /* ═══════════════════════════════════════════════════════
       PROMESAS — Power ballad rock con coro épico
       Estructura (16 compases):
         intro (2) · verso (4) · coro (4) · verso (4) · coro (2)
       Letras pensadas para encajar en el coro.
       ─────────────────────────────────────────────────────── */
    promesas(Tone, key) {
      const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.28 }).toDestination();
      const delay  = new Tone.FeedbackDelay('8n', 0.2).connect(reverb);

      const lead = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.02, decay: 0.18, sustain: 0.5, release: 0.6 },
        filter: { Q: 2, type: 'lowpass' },
        filterEnvelope: { attack: 0.05, decay: 0.4, sustain: 0.4, release: 0.7,
                          baseFrequency: 380, octaves: 2.7 },
        volume: -12,
      }).connect(delay);

      const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 2, spread: 20 },
        envelope: { attack: 0.4, decay: 0.4, sustain: 0.7, release: 1.2 },
        volume: -22,
      }).connect(reverb);

      const bajo = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.4, release: 0.4 },
        volume: -14,
      }).toDestination();

      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.6 },
        volume: -7,
      }).toDestination();

      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
        volume: -14,
      }).toDestination();

      const hat = new Tone.MetalSynth({
        frequency: 250,
        envelope: { attack: 0.001, decay: 0.08, release: 0.04 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
        volume: -30,
      }).toDestination();

      // Verso: Am-F-C-G   Coro: F-C-G-Am
      const VERSO_PROG = [
        ['A2', ['A4','C5','E5','C5']],
        ['F2', ['F4','A4','C5','A4']],
        ['C3', ['C5','E5','G5','E5']],
        ['G2', ['G4','B4','D5','B4']],
      ];
      const CORO_PROG = [
        ['F2', ['A4','C5','F5','C5']],
        ['C3', ['G4','C5','E5','C5']],
        ['G2', ['B4','D5','G5','D5']],
        ['A2', ['C5','E5','A5','E5']],
      ];

      let cycle = 0;
      const loop = new Tone.Loop(time => {
        const m = cycle % 16;
        let section, prog, idx;

        if (m < 2) {
          section = 'intro';
          prog = VERSO_PROG[m % 4];
          // Solo pad y hi-hats suaves
          pad.triggerAttackRelease(prog[1], '1m', time, 0.5);
          for (let i = 0; i < 8; i++) {
            hat.triggerAttackRelease('16n', time + i * Tone.Time('8n').toSeconds(), 0.4);
          }
        } else if (m < 6) {
          section = 'verso';
          idx = m - 2;
          prog = VERSO_PROG[idx];
          renderRock(prog, time, /*intensidad=*/0.8);
        } else if (m < 10) {
          section = 'coro';
          idx = m - 6;
          prog = CORO_PROG[idx];
          renderRock(prog, time, /*intensidad=*/1.0);
        } else if (m < 14) {
          section = 'verso2';
          idx = m - 10;
          prog = VERSO_PROG[idx];
          renderRock(prog, time, /*intensidad=*/0.85);
        } else {
          section = 'coro2';
          idx = m - 14;
          prog = CORO_PROG[idx];
          renderRock(prog, time, /*intensidad=*/1.05);
        }

        Tone.Draw.schedule(() => {
          fire('synthmusic:beat', { key, measure: m, section });
        }, time);

        cycle++;
      }, '1m').start(0);

      function renderRock([b, lead4], time, gain) {
        const beat = Tone.Time('4n').toSeconds();
        // Bajo en negras
        bajo.triggerAttackRelease(b, '4n', time);
        bajo.triggerAttackRelease(b, '4n', time + 2 * beat);
        // Pad sostenido
        pad.triggerAttackRelease(lead4, '1m', time, 0.5 * gain);
        // Lead 4 notas
        lead4.forEach((n, i) => {
          lead.triggerAttackRelease(n, '4n.', time + i * beat, 0.7 * gain);
        });
        // Drum pattern
        kick.triggerAttackRelease('C2', '8n', time, gain);
        kick.triggerAttackRelease('C2', '8n', time + 2 * beat, gain);
        snare.triggerAttackRelease('16n', time + 1 * beat, gain);
        snare.triggerAttackRelease('16n', time + 3 * beat, gain);
        for (let i = 0; i < 8; i++) {
          hat.triggerAttackRelease('16n', time + i * (beat / 2), gain * 0.8);
        }
      }

      Tone.Transport.bpm.value = 76;

      return {
        dispose: () => {
          [lead, pad, bajo, kick, snare, hat, delay, reverb, loop].forEach(n => {
            try { n.stop?.(); } catch (_) {}
            try { n.dispose?.(); } catch (_) {}
          });
        },
        getMeasure: () => cycle % 16,
      };
    },

    /* ═══════════════════════════════════════════════════════
       LUNA — Ambient drone con campanas FM
       Sin tempo definido, pero emite eventos de "compás" cada 4s
       para que el karaoke pueda mostrar fragmentos poéticos.
       ─────────────────────────────────────────────────────── */
    luna(Tone, key) {
      const reverb = new Tone.Reverb({ decay: 14, wet: 0.75 }).toDestination();
      const lpf    = new Tone.AutoFilter({
        frequency: 0.06, depth: 0.65, baseFrequency: 320, octaves: 3,
      }).start().connect(reverb);

      const drone = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 8, decay: 0.5, sustain: 0.92, release: 10 },
        volume: -18,
      }).connect(lpf);
      drone.triggerAttack(['C2','G2','D3','A3']);

      const campana = new Tone.FMSynth({
        harmonicity: 3.01, modulationIndex: 14,
        envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 4 },
        modulationEnvelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 2 },
        volume: -12,
      }).connect(reverb);

      // Coro de notas que alternan modos (mayor / menor)
      const NOTAS = ['C5','D5','G5','A5','D6','G6','E5','B5'];

      let bellId = 0;
      let measure = 0;
      const bellInterval = setInterval(() => {
        const n = NOTAS[Math.floor(Math.random() * NOTAS.length)];
        try {
          campana.triggerAttackRelease(n, '2n');
          bellId++;
        } catch (_) {}
      }, 1800 + Math.random() * 2200);

      // "Compases" virtuales cada 4 segundos para sincronizar lyrics
      const beatInterval = setInterval(() => {
        fire('synthmusic:beat', { key, measure, section: 'ambient' });
        measure = (measure + 1) % 8;
      }, 4000);

      Tone.Transport.bpm.value = 60;

      return {
        dispose: () => {
          clearInterval(bellInterval);
          clearInterval(beatInterval);
          [drone, campana, lpf, reverb].forEach(n => {
            try { n.dispose?.(); } catch (_) {}
          });
        },
        getMeasure: () => measure,
      };
    },
  };

  /* ── API pública ────────────────────────────────────────── */
  async function play(key) {
    if (!COMPOSERS[key]) return false;
    const Tone = await ensureTone();
    if (!Tone) return false;

    if (active[key]) return true;

    // BUG FIX: Unificar AudioContext con Howler para que el analyser
    // de bg-particles también vea la música procedural.
    try {
      if (window.Howler?.ctx && Tone.getContext().rawContext !== window.Howler.ctx) {
        Tone.setContext(window.Howler.ctx);
      }
    } catch (_) {}

    try { await Tone.start(); } catch (_) {}
    Tone.Destination.volume.value = masterVol;

    // Detener otras pistas procedurales
    for (const k of Object.keys(active)) if (k !== key) stop(k);

    const built = COMPOSERS[key](Tone, key);
    if (Tone.Transport.state !== 'started') Tone.Transport.start('+0.1');

    active[key] = built;
    fire('synthmusic:start', { key });
    return true;
  }

  function stop(key) {
    const a = active[key];
    if (!a) return;
    try { a.dispose(); } catch (_) {}
    delete active[key];
    fire('synthmusic:stop', { key });
    if (Object.keys(active).length === 0 && window.Tone?.Transport) {
      try { window.Tone.Transport.stop(); } catch (_) {}
    }
  }

  function stopAll() { Object.keys(active).forEach(stop); }

  function setMasterDb(db) {
    masterVol = db;
    if (window.Tone?.Destination) window.Tone.Destination.volume.value = db;
  }

  function isPlaying(key) { return !!active[key]; }
  function currentMeasure(key) { return active[key]?.getMeasure?.() ?? -1; }

  window.__synthMusic = {
    play, stop, stopAll, setMasterDb, isPlaying, currentMeasure,
  };
})();
