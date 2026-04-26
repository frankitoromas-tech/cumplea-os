/* ══════════════════════════════════════════════════════════════
   scroll-engine.js — Smooth scroll + parallax + reveals (Fase 2)
   ──────────────────────────────────────────────────────────────
   • Lenis smooth scroll con sincronía perfecta a GSAP ScrollTrigger
   • Reveal automático para [data-reveal]
   • Parallax automático para [data-parallax="0.4"] (factor 0..1)
   • Pin ligero para [data-pin]
   • NO interfiere con NavigadorPaginas.js, JuegoCorazones.js,
     ni con la pantallaBloqueo / pantallaAuth (las detecta y no
     activa scroll suave hasta que estén ocultas).
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveScroll) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    // Modo accesible: solo activamos los reveals con un fade básico.
    document.documentElement.dataset.reducedMotion = '1';
  }

  const hasLenis = typeof Lenis !== 'undefined';
  const hasGsap  = typeof gsap  !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ── Lenis ──────────────────────────────────────────────────
     BUG FIX (testing real): Lenis intercepta wheel sobre document
     incluso con .stop(). Cuando la luna ve la pantalla de bloqueo,
     el scroll nativo se quedaba muerto. Solución: NO instanciar
     Lenis hasta que la pantalla de bloqueo/auth haya desaparecido.
     ──────────────────────────────────────────────────────────── */
  let lenis = null;

  function isLocked() {
    const bloqueo = document.getElementById('pantallaBloqueo');
    const auth    = document.getElementById('pantallaAuth');
    return (bloqueo && !bloqueo.classList.contains('oculto')) ||
           (auth    && !auth.classList.contains('oculto'));
  }

  function initLenis() {
    if (lenis || !hasLenis || reduced) return;
    if (isLocked()) return;       // todavía bloqueado, no instanciar
    console.info('[scroll-engine] inicializando Lenis (lock liberado)');

    lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      lerp: 0.09,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sincroniza Lenis ↔ ScrollTrigger
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  // Probar de inmediato — si ya no hay lock, Lenis arranca ya
  initLenis();

  // Y observar cambios: cuando la pantalla de bloqueo o auth se oculten,
  // intentar inicializar Lenis. Si ya está, no hace nada.
  if (hasLenis && !reduced) {
    new MutationObserver(() => {
      if (!lenis && !isLocked()) initLenis();
    }).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class'],
    });
  }

  /* ── Reveals automáticos ────────────────────────────────────
     Cualquier elemento con [data-reveal] o [data-reveal="up|left|zoom"]
     se anima al entrar al viewport. Sin escribir más JS.
     ──────────────────────────────────────────────────────────── */
  function bindReveals() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    if (!hasGsap) {
      // Fallback puro CSS (la clase la define immersive.css)
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('immersive-reveal--in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.18 });
      els.forEach(el => io.observe(el));
      return;
    }

    els.forEach(el => {
      const dir = el.dataset.reveal || 'up';
      const from = { opacity: 0 };
      if (dir === 'up')   from.y = 40;
      if (dir === 'down') from.y = -40;
      if (dir === 'left') from.x = -40;
      if (dir === 'right')from.x = 40;
      if (dir === 'zoom') from.scale = 0.92;

      gsap.from(el, {
        ...from,
        duration: 0.95,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          once: true,
        },
        onComplete: () => {
          // Marca canónica para CSS — no dependemos del frágil [style*="opacity"]
          el.classList.add('immersive-reveal--in');
          if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');
        },
      });
    });
  }

  /* ── Parallax declarativo ───────────────────────────────────
     [data-parallax="0.3"]   → se mueve 30% más lento que el scroll
     [data-parallax-x="20"]  → desplazamiento horizontal opcional
     ──────────────────────────────────────────────────────────── */
  function bindParallax() {
    if (!hasGsap || reduced) return;
    const els = document.querySelectorAll('[data-parallax]');
    els.forEach(el => {
      const factor = parseFloat(el.dataset.parallax) || 0.3;
      const px     = parseFloat(el.dataset.parallaxX) || 0;
      gsap.to(el, {
        yPercent: -factor * 50,
        xPercent: px,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('[data-music]') || el.parentElement || el,
          start: 'top bottom',
          end:   'bottom top',
          scrub: 0.6,
        },
      });
    });
  }

  /* ── Pin de sección ─────────────────────────────────────────
     [data-pin] → la sección se queda fija mientras dura su altura.
     Útil para hero / introAnimada.
     ──────────────────────────────────────────────────────────── */
  function bindPin() {
    if (!hasGsap || reduced) return;
    document.querySelectorAll('[data-pin]').forEach(el => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: '+=120%',
        pin: true,
        pinSpacing: true,
      });
    });
  }

  /* ── Re-cálculo cuando aparece contenido oculto ──────────────
     script.js revela #contenidoSorpresa quitándole .oculto. Si no
     re-calculamos, los reveals/parallax/pin operan sobre alturas
     viejas (a veces 0). Observamos la clase y refrescamos.
     ──────────────────────────────────────────────────────────── */
  function watchOcultoChanges() {
    if (!hasGsap) return;
    let scheduled = 0;
    const refresh = () => {
      cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(() => {
        try { ScrollTrigger.refresh(); } catch (_) {}
      });
    };
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const t = m.target;
          if (t.classList?.contains('oculto') !== m.oldValue?.includes('oculto')) {
            // pasó de .oculto a sin .oculto o viceversa
            refresh();
            return;
          }
        }
        if (m.addedNodes && m.addedNodes.length) { refresh(); return; }
      }
    }).observe(document.body, {
      subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['class'], childList: true,
    });

    // También al cargarse fuentes (cambia el reflow)
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
  }

  function init() {
    bindReveals();
    bindParallax();
    bindPin();
    watchOcultoChanges();
    if (hasGsap) ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__immersiveScroll = {
    lenis: () => lenis,
    refresh: () => { if (hasGsap) ScrollTrigger.refresh(); },
  };
})();
