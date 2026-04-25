/* ══════════════════════════════════════════════════════════════
   cake-3d.js — Pastel cinematográfico en Three.js
   ──────────────────────────────────────────────────────────────
   • Reemplaza el emoji 🎂 con un pastel real de tres pisos.
   • Velas con llama emisiva + PointLight que parpadea.
   • Detecta la VELOCIDAD del cursor sobre el canvas: cuando supera
     un umbral cerca de una vela, dispara `mouseenter` sobre el
     elemento .llama correspondiente — RESPETANDO el contrato
     existente en script.js (activarVelas → contador → confetti).
   • Cuando las 3 velas se apagan, el pastel emite estrellas que
     se ensamblan en un botón mágico que abre el universo de
     recuerdos.
   • Si Three.js no está disponible o estamos en pantalla bloqueo,
     el módulo no hace nada y el emoji original sigue funcionando.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__cake3D) return;
  window.__cake3D = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    if (typeof THREE === 'undefined') return;        // boot.js no cargó Three
    const cont = document.querySelector('.contenedor-pastel');
    if (!cont) return;

    /* ── Estilo del contenedor para alojar el canvas ──────── */
    cont.style.position = cont.style.position || 'relative';
    // El emoji original lo escondemos visualmente; lo dejamos en el DOM por si
    // algún listener externo lo necesita.
    const emoji = cont.querySelector('.pastel-animado');
    if (emoji) {
      emoji.style.opacity = '0';
      emoji.style.position = 'absolute';
      emoji.style.pointerEvents = 'none';
    }
    const velasWrap = cont.querySelector('.velas');
    const llamas    = cont.querySelectorAll('.llama');
    if (velasWrap) {
      velasWrap.style.opacity = '0';
      velasWrap.style.position = 'absolute';
      velasWrap.style.pointerEvents = 'none';
    }

    /* ── Canvas 3D ─────────────────────────────────────────── */
    const SIZE = Math.min(380, cont.clientWidth || 360);
    const cv = document.createElement('canvas');
    cv.id = 'cake3DCanvas';
    Object.assign(cv.style, {
      width: SIZE + 'px', height: SIZE + 'px',
      display: 'block', margin: '0 auto',
      cursor: 'crosshair',
      borderRadius: '14px',
    });
    cont.insertBefore(cv, cont.firstChild);

    const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(SIZE, SIZE, false);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 2.4, 7.6);
    camera.lookAt(0, 0.8, 0);

    /* ── Luces ─────────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xffe6d8, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0xff80b0, 0.9, 14);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    /* ── Plato base ────────────────────────────────────────── */
    const plato = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.5, 0.15, 48),
      new THREE.MeshPhongMaterial({ color: 0xece4d6, shininess: 80 })
    );
    plato.position.y = 0.075;
    scene.add(plato);

    /* ── Pisos del pastel ──────────────────────────────────── */
    const cake = new THREE.Group();
    cake.position.y = 0.15;
    scene.add(cake);

    function piso(rTop, rBot, h, y, color, glaseado) {
      const g = new THREE.Group();
      g.position.y = y;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, h, 64),
        new THREE.MeshPhongMaterial({ color, shininess: 12 })
      );
      g.add(body);
      // Glaseado superior (anillo)
      const top = new THREE.Mesh(
        new THREE.TorusGeometry(rTop * 0.96, 0.08, 16, 64),
        new THREE.MeshPhongMaterial({ color: glaseado, shininess: 90 })
      );
      top.rotation.x = Math.PI / 2;
      top.position.y = h / 2;
      g.add(top);
      // Goteos del glaseado (pequeñas esferas)
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const drip = new THREE.Mesh(
          new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 12, 12),
          new THREE.MeshPhongMaterial({ color: glaseado, shininess: 90 })
        );
        drip.position.set(
          Math.cos(ang) * rTop * 0.94,
          h / 2 - 0.05 - Math.random() * 0.18,
          Math.sin(ang) * rTop * 0.94
        );
        g.add(drip);
      }
      cake.add(g);
      return g;
    }

    const piso1 = piso(2.0, 2.05, 0.8, 0.4,  0xf4c2c2, 0xff8eb1);   // base rosa pastel
    const piso2 = piso(1.45, 1.55, 0.7, 1.15, 0xfce8c9, 0xf5c842);  // crema
    const piso3 = piso(0.9, 0.95, 0.6, 1.8,  0xff6b81, 0xffd8e6);   // rosa coral

    /* ── Velas ─────────────────────────────────────────────── */
    const candles = [];
    const candlePositions = [
      [-0.45, 2.18,  0.0],
      [ 0.0,  2.18, -0.45],
      [ 0.45, 2.18,  0.0],
    ];
    candlePositions.forEach((p, i) => {
      const grp = new THREE.Group();
      grp.position.set(p[0], p[1], p[2]);

      // Cuerpo de la vela
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.55, 24),
        new THREE.MeshPhongMaterial({
          color: i === 1 ? 0xff6b81 : 0xfff7ee, shininess: 50,
        })
      );
      body.position.y = 0.275;
      grp.add(body);

      // Mecha
      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8),
        new THREE.MeshBasicMaterial({ color: 0x222 })
      );
      wick.position.y = 0.58;
      grp.add(wick);

      // Llama: dos conos anidados con material emisivo
      const llamaOut = new THREE.Mesh(
        new THREE.ConeGeometry(0.085, 0.30, 16),
        new THREE.MeshBasicMaterial({
          color: 0xff8a3d, transparent: true, opacity: 0.85, depthWrite: false,
        })
      );
      llamaOut.position.y = 0.78;
      grp.add(llamaOut);

      const llamaIn = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.18, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffe9a3, transparent: true, opacity: 0.95, depthWrite: false,
        })
      );
      llamaIn.position.y = 0.78;
      grp.add(llamaIn);

      // Luz parpadeante
      const light = new THREE.PointLight(0xffb060, 1.4, 3.2, 1.6);
      light.position.y = 0.85;
      grp.add(light);

      cake.add(grp);
      candles.push({ grp, body, wick, llamaOut, llamaIn, light, alive: true, smokeT: 0 });
    });

    /* ── Partículas de humo (cuando se apaga una vela) ─────── */
    const SMOKE_MAX = 60;
    const smokeGeom = new THREE.BufferGeometry();
    const smokePos  = new Float32Array(SMOKE_MAX * 3);
    const smokeLife = new Float32Array(SMOKE_MAX);
    smokeGeom.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      size: 0.18, color: 0xb0b0b0, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.NormalBlending,
    });
    const smoke = new THREE.Points(smokeGeom, smokeMat);
    cake.add(smoke);
    let smokeHead = 0;

    function spawnSmoke(pos) {
      const i = smokeHead;
      smokePos[i*3+0] = pos.x;
      smokePos[i*3+1] = pos.y;
      smokePos[i*3+2] = pos.z;
      smokeLife[i] = 1.0;
      smokeHead = (smokeHead + 1) % SMOKE_MAX;
      smokeGeom.attributes.position.needsUpdate = true;
    }

    /* ── Estrellas ascendentes (final mágico) ──────────────── */
    const STAR_MAX = 80;
    const starGeom = new THREE.BufferGeometry();
    const starPos  = new Float32Array(STAR_MAX * 3);
    const starLife = new Float32Array(STAR_MAX);
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.25, color: 0xffe6a0, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeom, starMat);
    cake.add(stars);
    let starHead = 0;
    function spawnStar() {
      const i = starHead;
      const ang = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 1.4;
      starPos[i*3+0] = Math.cos(ang) * r;
      starPos[i*3+1] = 0.5;
      starPos[i*3+2] = Math.sin(ang) * r;
      starLife[i] = 1.0;
      starHead = (starHead + 1) % STAR_MAX;
      starGeom.attributes.position.needsUpdate = true;
    }

    /* ── BUG FIX: el EE de 7 clics necesita clicks en .pastel-animado.
       Como ahora el canvas ocupa ese espacio visual, reenviamos los
       clicks del canvas al elemento original (que está oculto pero
       presente). El document-listener de EasterEggClic los captura. ── */
    cv.addEventListener('click', e => {
      if (emoji) {
        emoji.dispatchEvent(new MouseEvent('click', {
          bubbles: true, cancelable: true,
          clientX: e.clientX, clientY: e.clientY,
        }));
      }
      // Feedback visual: onda expansiva en el lugar del click
      spawnRipple(e);
    });

    /* ── Onda expansiva al click sobre el canvas ───────────── */
    function spawnRipple(e) {
      const rect = cv.getBoundingClientRect();
      const r = document.createElement('span');
      Object.assign(r.style, {
        position: 'absolute', pointerEvents: 'none',
        left:   (e.clientX - rect.left - 8) + 'px',
        top:    (e.clientY - rect.top  - 8) + 'px',
        width:  '16px', height: '16px',
        borderRadius: '50%',
        border: '2px solid rgba(255,200,220,.8)',
        boxShadow: '0 0 18px rgba(255,180,220,.6)',
        animation: 'cakeRipple .7s ease-out forwards',
      });
      // Asegurar el keyframe (idempotente)
      if (!document.getElementById('cake3d-ripple-style')) {
        const ks = document.createElement('style');
        ks.id = 'cake3d-ripple-style';
        ks.textContent = `
          @keyframes cakeRipple {
            from { transform: scale(.4); opacity: .9; }
            to   { transform: scale(5);  opacity: 0; }
          }`;
        document.head.appendChild(ks);
      }
      cont.appendChild(r);
      setTimeout(() => r.remove(), 750);

      if (window.__immersiveAudio) window.__immersiveAudio.sfx('hover');
    }

    /* ── Detección de "soplido" ────────────────────────────── */
    let lastMx = 0, lastMy = 0, lastT = 0;
    cv.addEventListener('pointermove', e => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const t = performance.now();
      const dt = t - lastT;
      if (dt > 0 && lastT) {
        const speed = Math.hypot(x - lastMx, y - lastMy) / dt;  // px/ms
        if (speed > 0.6) {
          // Posición normalizada del puntero en NDC
          const ndcX = (x / rect.width)  * 2 - 1;
          const ndcY = -(y / rect.height) * 2 + 1;
          const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
          // Buscar vela viva más cercana en pantalla
          let best = -1, bestD = Infinity;
          candles.forEach((c, i) => {
            if (!c.alive) return;
            const wp = c.grp.getWorldPosition(new THREE.Vector3());
            const sp = wp.clone().project(camera);
            const sx = (sp.x + 1) * 0.5 * rect.width;
            const sy = (1 - sp.y) * 0.5 * rect.height;
            const d = Math.hypot(sx - x, sy - y);
            if (d < bestD) { bestD = d; best = i; }
          });
          if (best >= 0 && bestD < 80) {
            apagarVela(best);
          }
        }
      }
      lastMx = x; lastMy = y; lastT = t;
    });

    /* ── Apagar vela: dispara el mouseenter en .llama original ──
       para que script.js mantenga su contador y dispare confetti. ── */
    function apagarVela(idx) {
      const c = candles[idx];
      if (!c.alive) return;
      const llama = llamas[idx];
      if (llama && !llama.classList.contains('apagada')) {
        llama.dispatchEvent(new Event('mouseenter'));
      } else {
        // Fallback (por si script.js no enganchó)
        markExtinguished(idx);
      }
      // Humo + SFX
      const wp = c.llamaIn.getWorldPosition(new THREE.Vector3());
      for (let k = 0; k < 6; k++) spawnSmoke(wp);
      if (window.__immersiveAudio) window.__immersiveAudio.sfx('transition');
    }

    function markExtinguished(idx) {
      const c = candles[idx];
      if (!c.alive) return;
      c.alive = false;
      c.smokeT = 1.0;
      // Apagar la luz progresivamente (lo hace el render loop)
      checkAllOut();
    }

    /* ── Observa los cambios de .apagada en .llama ─────────── */
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.attributeName !== 'class') return;
        const idx = [...llamas].indexOf(m.target);
        if (idx < 0) return;
        if (m.target.classList.contains('apagada')) markExtinguished(idx);
      });
    });
    llamas.forEach(l => obs.observe(l, { attributes: true }));

    /* ── Botón mágico al apagar todas ──────────────────────── */
    let allOut = false;
    let starsBursting = false;
    let burstStart = 0;
    function checkAllOut() {
      if (allOut) return;
      if (candles.every(c => !c.alive)) {
        allOut = true;
        starsBursting = true;
        burstStart = performance.now();
        // Glow rosa que sube del pastel
        cake.traverse(n => {
          if (n.material && n.material.emissive) {
            n.material.emissive = new THREE.Color(0xff6b81);
            n.material.emissiveIntensity = 0.0;
          }
        });
        showMagicButton();
      }
    }

    function showMagicButton() {
      // Si ya existe (re-entry), no duplicar
      if (document.getElementById('btnEntrarUniverso')) return;

      const btn = document.createElement('button');
      btn.id = 'btnEntrarUniverso';
      btn.type = 'button';
      btn.innerHTML =
        '<span class="bu-eyebrow">✦ tu deseo abrió un portal ✦</span>' +
        '<span class="bu-title">Entra al universo de los recuerdos</span>' +
        '<span class="bu-arrow">→</span>';

      // Insertar después de la instrucción del pastel
      const after = document.getElementById('instruccionPastel');
      (after?.parentNode || cont).appendChild(btn);

      btn.addEventListener('click', () => {
        if (window.__memoryUniverse) {
          btn.classList.add('bu-going');
          setTimeout(() => window.__memoryUniverse.open(), 350);
        }
      });

      // SFX glorioso
      if (window.__immersiveAudio) {
        window.__immersiveAudio.sfx('reveal');
        setTimeout(() => window.__immersiveAudio.sfx('transition'), 450);
      }
    }

    /* ── Render loop ───────────────────────────────────────── */
    let t0 = performance.now();
    function tick() {
      requestAnimationFrame(tick);
      const t  = (performance.now() - t0) / 1000;

      // Auto rotación (lenta) + reactividad al bajo de la música
      let bass = 0;
      if (window.__immersiveBg?.readBands) bass = window.__immersiveBg.readBands().bass;
      cake.rotation.y = t * 0.18 + bass * 0.4;
      plato.rotation.y = t * 0.18;

      // Animación de las llamas
      candles.forEach((c, i) => {
        if (c.alive) {
          const flicker = 0.95 + Math.sin(t * 11 + i * 1.7) * 0.05;
          c.llamaIn.scale.set(flicker, 0.9 + Math.sin(t * 8 + i) * 0.1, flicker);
          c.llamaOut.scale.set(flicker * 1.05, 0.95 + Math.sin(t * 7 + i * 0.6) * 0.07, flicker * 1.05);
          c.light.intensity = 1.2 + Math.sin(t * 13 + i * 2) * 0.3 + bass * 0.4;
        } else if (c.smokeT > 0) {
          // Apagado progresivo
          const k = Math.max(0, c.smokeT);
          c.llamaIn.scale.setScalar(k);
          c.llamaOut.scale.setScalar(k);
          c.light.intensity = k * 0.8;
          c.smokeT -= 0.04;
          if (c.smokeT <= 0) {
            c.llamaIn.visible = false;
            c.llamaOut.visible = false;
            c.light.intensity = 0;
            // Humo final
            const wp = c.wick.getWorldPosition(new THREE.Vector3());
            for (let k = 0; k < 8; k++) spawnSmoke(wp);
          }
        }
      });

      // Humo
      for (let i = 0; i < SMOKE_MAX; i++) {
        if (smokeLife[i] > 0) {
          smokePos[i*3+1] += 0.02;
          smokePos[i*3+0] += (Math.random() - 0.5) * 0.005;
          smokeLife[i] -= 0.01;
        }
      }
      smokeMat.opacity = 0.55;
      smokeGeom.attributes.position.needsUpdate = true;

      // Estrellas mágicas
      if (starsBursting) {
        const elapsed = (performance.now() - burstStart) / 1000;
        if (elapsed < 5 && Math.random() < 0.6) spawnStar();
        for (let i = 0; i < STAR_MAX; i++) {
          if (starLife[i] > 0) {
            starPos[i*3+1] += 0.05 + (1 - starLife[i]) * 0.05;
            starPos[i*3+0] += (Math.random() - 0.5) * 0.01;
            starPos[i*3+2] += (Math.random() - 0.5) * 0.01;
            starLife[i] -= 0.005;
          }
        }
        starGeom.attributes.position.needsUpdate = true;
        if (elapsed > 8) starsBursting = false;
      }

      renderer.render(scene, camera);
    }
    tick();

    // Resize del canvas si el contenedor cambia
    new ResizeObserver(() => {
      const s = Math.min(380, cont.clientWidth || 360);
      renderer.setSize(s, s, false);
      cv.style.width = cv.style.height = s + 'px';
    }).observe(cont);

    window.__cake3D = { scene, camera, renderer, candles };
  }

  /* ── Esperar a que aparezca .contenedor-pastel ──────────── */
  function waitFor() {
    const cont = document.querySelector('.contenedor-pastel');
    if (cont && cont.offsetParent !== null) {
      // Está visible
      init();
      return;
    }
    // Reintentar cuando #contenidoSorpresa pierda .oculto
    const observer = new MutationObserver(() => {
      const c = document.querySelector('.contenedor-pastel');
      if (c && c.offsetParent !== null) {
        observer.disconnect();
        init();
      }
    });
    observer.observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class'],
    });
  }

  if (reduced) return;   // accesibilidad
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitFor);
  } else {
    waitFor();
  }
})();
