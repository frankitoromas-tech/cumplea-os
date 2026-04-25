/* ══════════════════════════════════════════════════════════════
   lyric-sync.js — Karaoke poético sincronizado a synth-music
   ──────────────────────────────────────────────────────────────
   Suscribe a los eventos del compositor procedural y pinta letras
   compuestas a medida para cada sección. Las líneas aparecen con
   fade elegante, alineadas a los compases reales de la música.

   Las letras están escritas para encajar narrativamente con el
   carácter de cada pista. Toda decisión de timing es por compás
   (no por segundo), así si cambias el BPM en synth-music, la
   sincronía se mantiene.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__lyricSync) return;
  window.__lyricSync = true;

  /* ── Letras por pista ────────────────────────────────────
     Formato: { measure: 'línea' }  →  aparece exactamente al
     comenzar ese compás de la canción.
     Si una línea es null o '', el overlay se vacía.
     ──────────────────────────────────────────────────────── */
  const LYRICS = {

    // Suite clásica: solo aparecen frases poéticas en momentos clave
    intro: {
      0:  '',
      4:  'Hubo un día en que el universo eligió tu nombre…',
      12: 'Y desde entonces, cada estrella sabe a quién pertenece.',
      20: 'Si miras al cielo, mira con cuidado:',
      24: 'la mitad brilla por ti.',
      28: '',
    },

    // Piano íntimo, narrativo
    recuerdos: {
      0:  '',
      4:  'La primera vez que te vi reír,',
      6:  'algo en mí cambió de lugar.',
      8:  'Y ahora cada eco lleva tu nombre,',
      10: 'cada silencio es un poema sin terminar.',
      12: 'Te recuerdo,',
      14: 'aunque estés aquí.',
    },

    // Power ballad — letra "cantable" sobre los acordes
    promesas: {
      0:  '',
      2:  'Prometo hacerte café cada mañana,',
      3:  'aunque el cielo se caiga sobre nuestra ventana.',
      4:  'Prometo escuchar tus locuras a las tres,',
      5:  'y bailar contigo aunque nadie nos vea después.',
      6:  '✦ Si el mundo se acaba, tú escoges canción.',
      7:  '✦ Si el tiempo se rompe, te invento un reloj.',
      8:  '✦ Mi luna, mi todo, mi razón de cantar.',
      9:  '✦ Cada respiro tuyo es mi forma de orar.',
      10: 'Prometo memorizar tus pequeños desastres,',
      11: 'y reírme contigo cuando se vuelvan paisajes.',
      12: 'Prometo no soltar tu mano en la oscuridad,',
      13: 'aunque cierre los ojos para imaginarte un poco más.',
      14: '✦ Mi luna, mi todo, mi razón de cantar.',
      15: '✦ Cada respiro tuyo es mi forma de orar.',
    },

    // Ambient — fragmentos casi haiku
    luna: {
      0: 'La luna, callada, te aprende.',
      2: 'Yo, con suerte, te imito.',
      4: 'Si te quedaras dormida ahora,',
      6: 'el cielo se quedaría contigo.',
    },
  };

  /* ── DOM del karaoke ─────────────────────────────────────
     Lo creo de forma diferida en el primer evento.
     ──────────────────────────────────────────────────────── */
  let stage = null;
  let lineEl = null;
  let visibleKey = null;
  let lastLine = '';

  function ensureStage() {
    if (stage) return;
    stage = document.createElement('div');
    stage.id = 'lyricStage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="lyric-line" id="lyricLine"></div>
    `;
    document.body.appendChild(stage);
    lineEl = stage.querySelector('.lyric-line');
  }

  function show(text) {
    ensureStage();
    if (text === lastLine) return;
    lastLine = text;

    // Fade out → swap → fade in
    lineEl.classList.remove('show');
    setTimeout(() => {
      if (!text) {
        lineEl.textContent = '';
        return;
      }
      lineEl.textContent = text;
      // Doble RAF para asegurar que el reflow vea el cambio antes del fade-in
      requestAnimationFrame(() => requestAnimationFrame(() => {
        lineEl.classList.add('show');
      }));
    }, 380);
  }

  function clear() {
    if (!stage) return;
    lineEl.classList.remove('show');
    lastLine = '';
  }

  /* ── Suscripciones ───────────────────────────────────────
     ──────────────────────────────────────────────────────── */
  document.addEventListener('synthmusic:start', e => {
    visibleKey = e.detail.key;
    ensureStage();
    stage.classList.add('active');
  });

  document.addEventListener('synthmusic:stop', e => {
    if (visibleKey === e.detail.key) {
      visibleKey = null;
      clear();
      if (stage) stage.classList.remove('active');
    }
  });

  document.addEventListener('synthmusic:beat', e => {
    const { key, measure } = e.detail;
    if (key !== visibleKey) return;
    const map = LYRICS[key];
    if (!map) return;
    if (measure in map) show(map[measure]);
  });

  /* ── Mute → ocultar letras (no tiene sentido sin música) ── */
  document.addEventListener('immersive:audio-unlocked', () => { /* noop */ });

  // API
  window.__lyricSync = {
    show: t => show(t),
    clear,
    setLyrics: (key, map) => { LYRICS[key] = map; },
  };
})();
