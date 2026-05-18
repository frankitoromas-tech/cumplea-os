/* ─────────────────────────────────────────────────────────────
 * pastel.js — Pastel 3D CSS + detección de soplido por micrófono.
 * ───────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    const escena = document.querySelector('.pastel-escena');
    if (!escena || escena.dataset.pastelBound === '1') return;
    escena.dataset.pastelBound = '1';

    const velas = Array.from(escena.querySelectorAll('.vela'));
    const instruccion =
      document.getElementById('instruccionPastel') ||
      escena.querySelector('.instruccion-pastel');
    const btnMic = escena.closest('#contenidoSorpresa')?.querySelector('.btn-soplar') ||
      document.querySelector('.pastel-controles .btn-soplar');
    const medidor = document.querySelector('.medidor-soplido');
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
      if (btnMic) {
        btnMic.disabled = true;
        btnMic.style.opacity = '0.5';
      }
      stopMic();
      document.dispatchEvent(new CustomEvent('pastel:deseo-cumplido'));
    }

    // Click / touch en la vela (sin mouseenter: evitaba apagarlas al pasar el ratón).
    velas.forEach((vela) => {
      const handler = (e) => {
        if (e.type === 'touchstart') e.preventDefault();
        apagarVela(vela);
      };
      vela.addEventListener('click', handler);
      vela.addEventListener('touchstart', handler, { passive: false });
      vela.style.cursor = 'pointer';
    });

    async function resumeAudioCtx(ctx) {
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (err) {
          console.warn('[pastel] AudioContext.resume failed:', err);
        }
      }
    }

    async function startMic() {
      if (micActivo) {
        stopMic();
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (instruccion) {
          instruccion.textContent =
            'Tu navegador no permite micrófono. Toca las velas para apagarlas.';
        }
        return;
      }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        if (instruccion) {
          instruccion.textContent =
            'Tu navegador no soporta Web Audio. Toca las velas.';
        }
        return;
      }

      try {
        if (btnMic) {
          btnMic.disabled = true;
          btnMic.textContent = '🎙️ Pidiendo permiso…';
        }
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (err) {
        console.warn('[pastel] mic denied or unavailable:', err);
        if (instruccion) {
          instruccion.textContent =
            'No puedo escucharte. Toca las velas para apagarlas.';
        }
        if (btnMic) {
          btnMic.disabled = false;
          btnMic.textContent = '🎙️ Soplar con micrófono';
        }
        return;
      }

      audioCtx = new Ctx();
      await resumeAudioCtx(audioCtx);

      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
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
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
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

      const sampleRate = audioCtx ? audioCtx.sampleRate : 48000;
      const binWidth = sampleRate / 2 / bins.length;
      const idxFor = (hz) => Math.min(bins.length - 1, Math.floor(hz / binWidth));

      const low = avg(bins, idxFor(40), idxFor(300));
      const mid = avg(bins, idxFor(300), idxFor(2000));
      const high = avg(bins, idxFor(2000), idxFor(8000));

      const esSoplido = low > 72 && low > mid * 1.25 && high < low * 0.9;

      const intensidad = Math.min(1, low / 180);
      if (barra) barra.style.width = `${(intensidad * 100).toFixed(0)}%`;

      if (esSoplido) {
        soploSostenido += 16;
        if (soploSostenido > 160) {
          apagarSiguienteVela();
          soploSostenido = -220;
        }
      } else {
        soploSostenido = Math.max(0, soploSostenido - 25);
      }

      rafId = requestAnimationFrame(loopAnalisis);
    }

    function avg(bins, start, end) {
      let sum = 0;
      const a = Math.max(0, start);
      const b = Math.max(a + 1, end);
      for (let i = a; i < b; i++) sum += bins[i];
      return sum / (b - a);
    }

    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (micActivo) stopMic();
        else startMic();
      });
    }
  }

  function tryInit() {
    const escena = document.querySelector('.pastel-escena');
    const sorpresa = document.getElementById('contenidoSorpresa');
    if (!escena) return;
    if (sorpresa && sorpresa.classList.contains('oculto')) return;
    init();
  }

  function boot() {
    tryInit();
    const sorpresa = document.getElementById('contenidoSorpresa');
    if (!sorpresa) return;
    const obs = new MutationObserver(() => tryInit());
    obs.observe(sorpresa, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('pastel:reinit', tryInit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
