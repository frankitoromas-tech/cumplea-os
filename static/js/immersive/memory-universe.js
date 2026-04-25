/* ══════════════════════════════════════════════════════════════
   memory-universe.js — Universo navegable de recuerdos
   ──────────────────────────────────────────────────────────────
   Se abre por __memoryUniverse.open() (lo dispara cake-3d.js
   cuando soplas las 3 velas).

   • Pantalla completa con su propia escena Three.js.
   • Las 5 polaroids (DEFAULT_RECUERDOS/foto1..5.png) flotan en el
     espacio como planos texturizados con halo dorado.
   • Constelación: líneas tenues conectan los recuerdos formando
     una figura coherente.
   • Mouse rota la cámara (orbit-lite manual).
   • Scroll dolly-in / dolly-out.
   • Click en un recuerdo → tween hacia la cámara + cinema-mode.
   • Botón "Volver" o ESC cierra con fade-to-black.
   • Música cambia a "recuerdos" mientras dura la experiencia.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__memoryUniverse) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PHOTOS = [
    { src: '/static/DEFAULT_RECUERDOS/foto1.png', caption: 'Nuestra diversión' },
    { src: '/static/DEFAULT_RECUERDOS/foto2.png', caption: 'Tú y yo' },
    { src: '/static/DEFAULT_RECUERDOS/foto3.png', caption: 'Siempre juntos' },
    { src: '/static/DEFAULT_RECUERDOS/foto4.png', caption: 'Nuestras locuras' },
    { src: '/static/DEFAULT_RECUERDOS/foto5.png', caption: 'Hasta mi último suspiro' },
  ];

  let isOpen = false;
  let stage, cv, renderer, scene, camera;
  let frames = [];
  let raf = 0;
  let yaw = 0, pitch = 0, dolly = 8;
  let targetYaw = 0, targetPitch = 0, targetDolly = 8;
  let prevX = 0, prevY = 0, dragging = false;

  function ensureDom() {
    if (stage) return;
    stage = document.createElement('div');
    stage.id = 'memoryUniverse';
    stage.innerHTML = `
      <canvas></canvas>
      <div class="mu-hud">
        <p class="mu-title">Universo de Recuerdos</p>
        <p class="mu-hint">Arrastra para girar · Rueda para acercarte · Click para entrar</p>
      </div>
      <button class="mu-close" type="button" aria-label="Volver">←  Volver</button>
      <div class="mu-caption" aria-live="polite"></div>
    `;
    document.body.appendChild(stage);
    cv = stage.querySelector('canvas');

    stage.querySelector('.mu-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup',   onUp);
    cv.addEventListener('pointerleave',onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('click', onClickPhoto);
    addEventListener('resize', onResize);
  }

  function injectStyles() {
    if (document.getElementById('memoryUniverse-styles')) return;
    const s = document.createElement('style');
    s.id = 'memoryUniverse-styles';
    s.textContent = `
      #memoryUniverse {
        position: fixed; inset: 0; z-index: 9994;
        background: radial-gradient(ellipse at center,
                    rgba(8,5,30,.55) 0%, rgba(0,0,8,1) 70%);
        opacity: 0;
        transition: opacity .9s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }
      #memoryUniverse.show { opacity: 1; pointer-events: auto; }
      #memoryUniverse canvas {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        cursor: grab; touch-action: none;
      }
      #memoryUniverse canvas:active { cursor: grabbing; }
      #memoryUniverse .mu-hud {
        position: absolute; top: 28px; left: 50%;
        transform: translateX(-50%);
        text-align: center; pointer-events: none;
        color: rgba(255,255,255,.92);
      }
      #memoryUniverse .mu-title {
        font-family: 'Playfair Display', serif; font-style: italic;
        font-size: clamp(1.6rem, 4vw, 2.6rem);
        letter-spacing: 4px;
        text-shadow: 0 0 30px rgba(255,180,230,.45);
      }
      #memoryUniverse .mu-hint {
        font-family: 'Cormorant Garamond', serif; font-style: italic;
        margin-top: 6px; font-size: .95rem;
        color: rgba(255,255,255,.55); letter-spacing: 1.5px;
      }
      #memoryUniverse .mu-close {
        position: absolute; top: 22px; left: 22px;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.15);
        color: rgba(255,255,255,.75);
        font-family: 'Cormorant Garamond', serif; font-style: italic;
        padding: 10px 18px; border-radius: 50px;
        cursor: pointer; transition: all .25s ease;
        backdrop-filter: blur(10px);
      }
      #memoryUniverse .mu-close:hover {
        background: rgba(255,107,129,.22); color: white;
        transform: translateY(-2px);
      }
      #memoryUniverse .mu-caption {
        position: absolute; bottom: 36px; left: 50%;
        transform: translateX(-50%);
        font-family: 'Playfair Display', serif; font-style: italic;
        color: rgba(255,235,255,.85);
        font-size: clamp(1rem, 2vw, 1.35rem);
        text-shadow: 0 2px 12px rgba(0,0,0,.7);
        opacity: 0; transition: opacity .4s ease;
        pointer-events: none;
        letter-spacing: 1.5px;
      }
      #memoryUniverse .mu-caption.show { opacity: 1; }

      /* Botón mágico que aparece tras soplar las velas */
      #btnEntrarUniverso {
        display: flex; flex-direction: column; align-items: center;
        gap: 6px; margin: 22px auto 0;
        background: linear-gradient(135deg,
          rgba(255,107,129,.85) 0%,
          rgba(245,200,66,.78) 100%);
        border: 1px solid rgba(255,255,255,.25);
        color: white; cursor: pointer;
        padding: 18px 32px; border-radius: 56px;
        font-family: inherit;
        box-shadow: 0 12px 36px rgba(255,107,129,.35),
                    0 0 60px rgba(245,200,66,.2);
        transform: scale(0);
        animation: btnEntrarIn 1s cubic-bezier(.22,1.5,.36,1) .6s forwards;
        position: relative; overflow: hidden;
      }
      #btnEntrarUniverso::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at 30% 30%,
          rgba(255,255,255,.4) 0%, transparent 50%);
        animation: btnSheen 4s ease-in-out infinite;
      }
      @keyframes btnEntrarIn  {
        from { transform: scale(0) rotate(-6deg); opacity: 0; }
        to   { transform: scale(1) rotate(0); opacity: 1; }
      }
      @keyframes btnSheen {
        0%, 100% { opacity: .5; transform: translate(-30%,-30%); }
        50%      { opacity: .85; transform: translate(30%, 30%); }
      }
      #btnEntrarUniverso .bu-eyebrow {
        font-family: 'Cormorant Garamond', serif; font-style: italic;
        font-size: .8rem; letter-spacing: 3px;
        opacity: .92;
      }
      #btnEntrarUniverso .bu-title {
        font-family: 'Playfair Display', serif; font-style: italic;
        font-size: 1.1rem; letter-spacing: 1px;
      }
      #btnEntrarUniverso .bu-arrow {
        font-size: 1.4rem;
        transition: transform .3s ease;
      }
      #btnEntrarUniverso:hover { transform: translateY(-3px) scale(1.03); }
      #btnEntrarUniverso:hover .bu-arrow { transform: translateX(6px); }
      #btnEntrarUniverso.bu-going {
        animation: btnGoing .7s ease forwards;
      }
      @keyframes btnGoing {
        to { transform: scale(20); opacity: 0; }
      }

      /* Deseos en el universo */
      #memoryUniverse .mu-wish {
        position: absolute;
        font-size: 1.6rem;
        color: #ffe9a3;
        text-shadow: 0 0 24px rgba(255,220,140,.95),
                     0 0 60px rgba(255,180,100,.6);
        pointer-events: none;
        transform: translate(-50%, -50%);
        animation: wishRise 2.2s cubic-bezier(.22,1,.36,1) forwards;
        will-change: transform, opacity;
      }
      @keyframes wishRise {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
        15%  { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        100% { opacity: 0; transform: translate(-50%, -160%) scale(.7); }
      }
      #memoryUniverse .mu-wish-trail {
        position: absolute;
        width: 5px; height: 5px;
        border-radius: 50%;
        background: radial-gradient(circle, #fff7cf, transparent 70%);
        pointer-events: none;
        transform: translate(-50%, -50%);
        animation: wishTrail 1.6s ease-out forwards;
      }
      @keyframes wishTrail {
        0%   { opacity: .9; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0;  transform: translate(-50%, -150%) scale(.3); }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Construcción de la escena ──────────────────────────── */
  function build() {
    if (typeof THREE === 'undefined') {
      console.warn('[memory-universe] Three.js no disponible');
      return false;
    }

    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    onResize();

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000810, 0.05);

    camera = new THREE.PerspectiveCamera(56, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, dolly);

    /* Estrellas de fondo */
    const N = 1200;
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 30 + Math.random() * 30;
      const a = Math.random() * Math.PI * 2;
      const e = Math.acos(Math.random() * 2 - 1);
      sp[i*3+0] = r * Math.sin(e) * Math.cos(a);
      sp[i*3+1] = r * Math.sin(e) * Math.sin(a);
      sp[i*3+2] = r * Math.cos(e);
    }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xc8d4ff, size: 0.05, transparent: true, opacity: 0.85,
    })));

    /* Cargar las polaroids como planos texturizados */
    const loader = new THREE.TextureLoader();
    const ANG_STEP = (Math.PI * 2) / PHOTOS.length;
    const RING_R = 4.2;

    PHOTOS.forEach((p, i) => {
      const ang = i * ANG_STEP - Math.PI / 2;
      const x = Math.cos(ang) * RING_R;
      const y = Math.sin(i * 1.3) * 0.8;
      const z = Math.sin(ang) * RING_R;

      // Marco de la polaroid
      const frame = new THREE.Group();
      frame.position.set(x, y, z);
      frame.lookAt(0, 0, 0);
      frame.rotation.y += Math.PI;     // mirar hacia el centro/cámara

      // Plano de papel
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.95),
        new THREE.MeshBasicMaterial({ color: 0xf5ead4 })
      );
      frame.add(paper);

      // Plano de la foto
      const photo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ color: 0x222 })
      );
      photo.position.y = 0.16;
      photo.position.z = 0.001;
      frame.add(photo);

      // Cargar textura asíncrona
      loader.load(p.src,
        tex => { photo.material = new THREE.MeshBasicMaterial({ map: tex }); },
        undefined,
        () => { /* ignore errors */ }
      );

      // Halo luminoso detrás
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 2.85),
        new THREE.MeshBasicMaterial({
          color: 0xff8eb1, transparent: true, opacity: 0.18,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      halo.position.z = -0.01;
      frame.add(halo);

      scene.add(frame);
      frames.push({ group: frame, paper, photo, halo, idx: i, baseY: y, ang });
    });

    /* Constelación: líneas que conectan recuerdos consecutivos */
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd9ec, transparent: true, opacity: 0.35,
    });
    for (let i = 0; i < frames.length; i++) {
      const a = frames[i].group.position;
      const b = frames[(i + 1) % frames.length].group.position;
      const g = new THREE.BufferGeometry().setFromPoints([a, b]);
      scene.add(new THREE.Line(g, lineMat));
    }

    return true;
  }

  /* ── Eventos de cámara ──────────────────────────────────── */
  function onDown(e) {
    dragging = true;
    prevX = e.clientX; prevY = e.clientY;
    cv.setPointerCapture?.(e.pointerId);
  }
  function onMove(e) {
    // Hover caption
    hoverCaption(e);
    if (!dragging) return;
    targetYaw   += (e.clientX - prevX) * 0.005;
    targetPitch += (e.clientY - prevY) * 0.004;
    targetPitch = Math.max(-0.8, Math.min(0.8, targetPitch));
    prevX = e.clientX; prevY = e.clientY;
  }
  function onUp() { dragging = false; }
  function onWheel(e) {
    e.preventDefault();
    targetDolly += e.deltaY * 0.005;
    targetDolly = Math.max(2.5, Math.min(14, targetDolly));
  }
  function onResize() {
    if (!cv || !renderer) return;
    renderer.setSize(innerWidth, innerHeight, false);
    if (camera) {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    }
  }
  function onKey(e) {
    if (e.key === 'Escape' && isOpen) close();
  }

  /* ── Hover caption ──────────────────────────────────────── */
  let hoveredFrame = null;
  function hoverCaption(e) {
    if (!camera || !frames.length) return;
    const rect = cv.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hits = ray.intersectObjects(frames.map(f => f.photo));
    const cap = stage.querySelector('.mu-caption');
    if (hits.length) {
      const idx = frames.findIndex(f => f.photo === hits[0].object);
      if (hoveredFrame !== idx) {
        hoveredFrame = idx;
        cap.textContent = '"' + PHOTOS[idx].caption + '"';
        cap.classList.add('show');
      }
    } else if (hoveredFrame !== null) {
      hoveredFrame = null;
      cap.classList.remove('show');
    }
  }

  function onClickPhoto(e) {
    if (hoveredFrame !== null) {
      const photo = PHOTOS[hoveredFrame];
      // Transición → reusar cinema-mode si está disponible
      if (window.__cinemaMode) {
        const realMarcos = document.querySelectorAll('.marco-foto');
        const target = realMarcos[hoveredFrame];
        if (target) target.click();
      }
      return;
    }

    // Click en espacio vacío → "pide un deseo"
    spawnWish(e.clientX, e.clientY);
  }

  /* ── Deseo: meteorito ascendente con estela ─────────────── */
  function spawnWish(x, y) {
    const wish = document.createElement('div');
    wish.className = 'mu-wish';
    wish.style.left = x + 'px';
    wish.style.top  = y + 'px';
    wish.innerHTML = '✦';
    stage.appendChild(wish);

    // Estela: pequeñas partículas que dejan rastro
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = 'mu-wish-trail';
        p.style.left = (x + (Math.random() - 0.5) * 12) + 'px';
        p.style.top  = (y - i * 18 + (Math.random() - 0.5) * 8) + 'px';
        p.style.animationDelay = (i * 30) + 'ms';
        stage.appendChild(p);
        setTimeout(() => p.remove(), 1800);
      }, i * 40);
    }

    setTimeout(() => wish.remove(), 2200);

    // Chime suave: usa el sintetizador de SFX (revela la nota más alta)
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');

    // Notificar (mismo patrón que los EE)
    fetch('/api/notificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'deseo_universo' }),
    }).catch(() => {});
  }

  /* ── Render loop ────────────────────────────────────────── */
  function tick() {
    if (!isOpen) return;
    raf = requestAnimationFrame(tick);

    // Cámara orbit-lite
    yaw   += (targetYaw   - yaw)   * 0.10;
    pitch += (targetPitch - pitch) * 0.10;
    dolly += (targetDolly - dolly) * 0.08;

    const cy = Math.cos(pitch);
    camera.position.x = Math.sin(yaw) * cy * dolly;
    camera.position.y = Math.sin(pitch) * dolly;
    camera.position.z = Math.cos(yaw) * cy * dolly;
    camera.lookAt(0, 0, 0);

    // Animación sutil de los frames
    const t = performance.now() / 1000;
    let bass = 0;
    if (window.__immersiveBg?.readBands) bass = window.__immersiveBg.readBands().bass;
    frames.forEach(f => {
      f.group.position.y = f.baseY + Math.sin(t * 0.6 + f.idx * 1.3) * 0.18;
      f.group.rotation.z = Math.sin(t * 0.4 + f.idx) * 0.04;
      f.halo.material.opacity = 0.18 + bass * 0.4 + (hoveredFrame === f.idx ? 0.25 : 0);
      f.halo.scale.setScalar(1 + bass * 0.15 + (hoveredFrame === f.idx ? 0.1 : 0));
    });

    renderer.render(scene, camera);
  }

  /* ── Public API ─────────────────────────────────────────── */
  function open() {
    if (isOpen) return;
    isOpen = true;
    injectStyles();
    ensureDom();
    if (!scene && !build()) { isOpen = false; return; }

    // Cambiar a la pista de "recuerdos" si el motor de audio existe
    if (window.__immersiveAudio) {
      try { window.__immersiveAudio.section('recuerdos'); } catch (_) {}
    }

    // Show con fade
    requestAnimationFrame(() => stage.classList.add('show'));
    document.body.classList.add('memory-universe-open');
    raf = requestAnimationFrame(tick);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    stage.classList.remove('show');
    document.body.classList.remove('memory-universe-open');
    cancelAnimationFrame(raf);
    if (window.__immersiveAudio) {
      try { window.__immersiveAudio.section('promesas'); } catch (_) {}
    }
  }

  if (reduced) return;     // accesibilidad
  window.__memoryUniverse = { open, close };
})();
