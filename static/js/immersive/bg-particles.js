/* ══════════════════════════════════════════════════════════════
   bg-particles.js — Capa cinematográfica de partículas (Three.js)
   ──────────────────────────────────────────────────────────────
   • Canvas fixed, z-index -1, pointer-events:none.
   • 1500 partículas con leve drift, color templado a la paleta del
     proyecto (rosa / dorado / blanco azulado).
   • Lazy via requestIdleCallback para no penalizar el LCP.
   • Pausa cuando la pestaña pierde foco (visibilitychange).
   • Apagado total con prefers-reduced-motion o cuando se abre la
     pantallaBloqueo / pantallaAuth (esas ya tienen su propio canvas).
   • Three.js se carga vía CDN en boot.js. Si no está disponible,
     este módulo no hace nada (silencioso).
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveBg) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  function start() {
    if (typeof THREE === 'undefined') return;

    /* ── Canvas anclado al body ─────────────────────────────── */
    const canvas = document.createElement('canvas');
    canvas.id = 'immersiveBg';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '-1',
      // se pone sobre el fondo del body pero detrás de todo lo demás
    });
    document.body.appendChild(canvas);

    /* ── Three básico ──────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight, false);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 1, 2000);
    camera.position.z = 600;

    /* ── Geometría de partículas ───────────────────────────── */
    const N = 1500;
    const positions = new Float32Array(N * 3);
    const colors    = new Float32Array(N * 3);
    const palette = [
      new THREE.Color(0xff6b81),  // rosa
      new THREE.Color(0xf5c842),  // dorado
      new THREE.Color(0xc8d4ff),  // azul claro
      new THREE.Color(0xffffff),
    ];
    for (let i = 0; i < N; i++) {
      positions[i*3+0] = (Math.random() - 0.5) * 2400;
      positions[i*3+1] = (Math.random() - 0.5) * 1400;
      positions[i*3+2] = (Math.random() - 0.5) * 1200;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i*3+0] = c.r;
      colors[i*3+1] = c.g;
      colors[i*3+2] = c.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    const mat = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geom, mat);
    scene.add(points);

    /* ── Reacción al cursor ────────────────────────────────── */
    let mx = 0, my = 0;
    addEventListener('pointermove', e => {
      mx = (e.clientX / innerWidth  - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    /* ── Loop con pausa si la pestaña no es visible ────────── */
    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) tick();
    });

    /* ── Apagado en pantallas bloqueo/auth ─────────────────── */
    function lockGate() {
      const bloqueo = document.getElementById('pantallaBloqueo');
      const auth    = document.getElementById('pantallaAuth');
      const lock = (bloqueo && !bloqueo.classList.contains('oculto')) ||
                   (auth    && !auth.classList.contains('oculto'));
      canvas.style.opacity = lock ? '0' : '1';
    }
    canvas.style.transition = 'opacity .8s ease';
    lockGate();
    new MutationObserver(lockGate).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class'],
    });

    /* ── Resize ────────────────────────────────────────────── */
    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight, false);
    });

    /* ── Reactividad al audio ──────────────────────────────────
       Engancho un AnalyserNode al destination de Howler en cuanto
       el audio esté desbloqueado. Mido bass / mid / treble.
       ──────────────────────────────────────────────────────────── */
    let analyser = null;
    let freqData = null;
    function attachAnalyser() {
      try {
        if (!window.Howler || !Howler.ctx || analyser) return;
        analyser = Howler.ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        // Howler conecta su masterGain a destination; insertamos analyser en paralelo
        Howler.masterGain.connect(analyser);
        freqData = new Uint8Array(analyser.frequencyBinCount);
      } catch (_) {}
    }
    document.addEventListener('immersive:audio-unlocked', attachAnalyser);
    setTimeout(attachAnalyser, 1200);  // por si el evento ya pasó

    function readBands() {
      if (!analyser) return { bass: 0, mid: 0, treble: 0, level: 0 };
      analyser.getByteFrequencyData(freqData);
      const N = freqData.length;
      let bass = 0, mid = 0, treble = 0;
      const b1 = Math.floor(N * 0.10), b2 = Math.floor(N * 0.45);
      for (let i = 0; i < b1;   i++) bass   += freqData[i];
      for (let i = b1; i < b2;  i++) mid    += freqData[i];
      for (let i = b2; i < N;   i++) treble += freqData[i];
      bass   /= (b1        || 1) * 255;
      mid    /= (b2 - b1   || 1) * 255;
      treble /= (N - b2    || 1) * 255;
      return { bass, mid, treble, level: (bass + mid + treble) / 3 };
    }

    /* ── Render loop con reactividad ───────────────────────── */
    let t0 = performance.now();
    let smoothedLevel = 0, smoothedBass = 0;
    function tick() {
      if (!running) return;
      const t = performance.now() - t0;

      // Lectura de audio
      const { bass, mid, treble, level } = readBands();
      smoothedLevel += (level - smoothedLevel) * 0.15;
      smoothedBass  += (bass  - smoothedBass)  * 0.20;

      // Tamaño de partícula reactivo al volumen
      mat.size = 1.4 + smoothedLevel * 4.2;
      mat.opacity = 0.78 + smoothedLevel * 0.22;

      // Rotación: añadir empuje del bajo
      points.rotation.y =  t * 0.00004 + mx * 0.18 + smoothedBass * 0.04;
      points.rotation.x =  -my * 0.18 - mid * 0.03;

      // Cámara: pulso suave al kick (bass)
      const pulse = smoothedBass * 18;
      camera.position.x += (mx * 60 - camera.position.x) * 0.04;
      camera.position.y += (-my * 40 - camera.position.y) * 0.04;
      camera.position.z = 600 - pulse;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();

    window.__immersiveBg = {
      canvas, renderer, scene, camera, points, mat,
      readBands, hasAnalyser: () => !!analyser,
    };
  }

  // Carga diferida — no bloquea LCP
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 800));
  idle(start);
})();
