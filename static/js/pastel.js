/* ─────────────────────────────────────────────────────────────
 * pastel.js — Lógica del pastel 3D + detección de soplido.
 *
 * Estrategia:
 * 1. Click / touch / hover en una vela siempre la apaga (fallback).
 * 2. Botón "Soplar de verdad" pide permiso de micrófono. Si lo concede,
 *    analizamos el espectro de audio buscando la firma de un soplido:
 *       - mucha energía en banda baja (50-300 Hz)
 *       - poca energía relativa en banda alta (>2 kHz, donde vive la voz)
 *       - sostenido por ≥150 ms
 *    Por cada "soplido detectado" apagamos una vela. La señal del medidor
 *    visual sirve de feedback (ves la barrita subir mientras soplás).
 * 3. Cuando todas las velas se apagan se dispara `pastel:deseo-cumplido`
 *    para que el resto de la página reaccione (confeti, mensaje, etc).
 * 4. Respeta `prefers-reduced-motion`: ni humo ni jitter.
 * ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  if (window.__pastelInicializado) return;
  window.__pastelInicializado = true;

  const reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }

  function init() {
    const escena = document.querySelector('.pastel-escena');
    if (!escena) return;

    const velas = Array.from(escena.querySelectorAll('.vela'));
    const instruccion = escena.querySelector('.instruccion-pastel');
    const btnMic = escena.querySelector('.btn-soplar');
    const medidor = escena.querySelector('.medidor-soplido');
    const barra = medidor ? medidor.querySelector('.barra') : null;

    if (!velas.length) return;

    let apagadas = 0;
    let micActivo = false;
    let audioCtx = null;
    let analyser = null;
    let micStream = null;
    let rafId = null;
    let soploSostenido = 0;

    function apagarVela(vela) {
      if (!vela || vela.classList.contains('apagada')) return false;
      vela.classList.add('apagada');
      lanzarHumo(vela);
      apagadas += 1;
      if (apagadas === velas.length) cumplirDeseo();
      return true;
    }

    function apagarSiguienteVela() {
      const siguiente = velas.find((v) => !v.classList.contains('apagada'));
      return apagarVela(siguiente);
    }

    function lanzarHumo(vela) {
      if (reducedMotion) return;
      for (let i = 0; i < 3; i++) {
        const humo = document.createElement('div');
        humo.className = 'humo';
        humo.style.animationDelay = `${i * 0.2}s`;
        humo.style.left = `${50 + (Math.random() * 20 - 10)}%`;
        vela.appendChild(humo);
        setTimeout(() => humo.remove(), 2400);
      }
    }

    function cumplirDeseo() {
      if (instruccion) {
        instruccion.textContent = '✨ Deseo concedido. Que se cumpla, mi luna.';
        instruccion.classList.add('cumplido');
      }
      if (btnMic) { btnMic.disabled = true; btnMic.style.opacity = '0.5'; }
      stopMic();
      document.dispatchEvent(new CustomEvent('pastel:deseo-cumplido'));
    }

    // ─── Fallback: click / touch / hover apagan una vela ─────
    velas.forEach((vela) => {
      const handler = () => apagarVela(vela);
      vela.addEventListener('click', handler);
      vela.addEventListener('touchstart', handler, { passive: true });
      vela.addEventListener('mouseenter', handler);
      vela.style.cursor = 'pointer';
    });

    // ─── Detección de soplido por micrófono ──────────────────
    async function startMic() {
      if (micActivo) { stopMic(); return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (instruccion) instruccion.textContent = 'Tu navegador no permite microfono. Toca las velas para soplar.';
        return;
      }
      if (!window.AudioContext && !window.webkitAudioContext) {
        if (instruccion) instruccion.textContent = 'Tu navegador no soporta Web Audio. Toca las velas.';
        return;
      }
      try {
        if (btnMic) {
          btnMic.disabled = true;
          btnMic.textContent = '🎙️ Pidiendo permiso…';
        }
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      } catch (err) {
        console.warn('[pastel] mic denied or unavailable:', err);
        if (instruccion) instruccion.textContent = 'No puedo escucharte. Toca las velas para apagarlas.';
        if (btnMic) {
          btnMic.disabled = false;
          btnMic.textContent = '🎙️ Soplar con micrófono';
        }
        return;
      }

      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      micActivo = true;
      soploSostenido = 0;
      if (btnMic) {
        btnMic.disabled = false;
        btnMic.classList.add('escuchando');
        btnMic.textContent = '🎙️ Escuchando… (toca para parar)';
      }
      if (medidor) medidor.classList.add('activo');
      if (instruccion) instruccion.textContent = 'Sopla cerca del micrófono…';

      loopAnalisis();
    }

    function stopMic() {
      micActivo = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
      analyser = null;
      if (btnMic) {
        btnMic.classList.remove('escuchando');
        if (apagadas < velas.length) {
          btnMic.textContent = '🎙️ Soplar con micrófono';
          btnMic.disabled = false;
        }
      }
      if (medidor) medidor.classList.remove('activo');
      if (barra) barra.style.width = '0%';
    }

    function loopAnalisis() {
      if (!micActivo || !analyser) return;
      const bins = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins);

      // FFT: 0..1024/2 bins, Nyquist = sampleRate/2.
      const sampleRate = audioCtx ? audioCtx.sampleRate : 48000;
      const binWidth = sampleRate / 2 / bins.length;
      const idxFor = (hz) => Math.min(bins.length - 1, Math.floor(hz / binWidth));

      const lowStart = idxFor(40);
      const lowEnd   = idxFor(300);   // soplido: pico aquí
      const midStart = idxFor(300);
      const midEnd   = idxFor(2000);  // voz humana
      const highStart = idxFor(2000);
      const highEnd   = idxFor(8000); // sibilantes / música

      const avg = (a, b) => {
        let sum = 0;
        for (let i = a; i < b; i++) sum += bins[i];
        return sum / Math.max(b - a, 1);
      };

      const low  = avg(lowStart, lowEnd);
      const mid  = avg(midStart, midEnd);
      const high = avg(highStart, highEnd);

      // Soplido: low dominante y banda alta moderada+ (el aire genera ruido blanco).
      // Voz: mid alta. Silbar: high muy alta.
      const esSoplido = low > 95 && low > mid * 1.4 && high < low * 0.85;

      const intensidad = Math.min(1, low / 200);
      if (barra) barra.style.width = `${(intensidad * 100).toFixed(0)}%`;

      if (esSoplido) {
        soploSostenido += 16; // ~ms por frame a 60fps
        if (soploSostenido > 180) {
          apagarSiguienteVela();
          soploSostenido = -250; // pequeño cooldown
        }
      } else {
        soploSostenido = Math.max(0, soploSostenido - 25);
      }

      rafId = requestAnimationFrame(loopAnalisis);
    }

    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (micActivo) stopMic();
        else startMic();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
