/* ══════════════════════════════════════════════════════════════
   boot.js — Bootloader del stack inmersivo
   ──────────────────────────────────────────────────────────────
   Carga las CDN externas en orden y luego despacha el evento
   "immersive:ready". Los módulos del proyecto se autoinicializan
   en cuanto se cargan; aquí solo orquestamos los terceros.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__immersiveBoot) return;
  window.__immersiveBoot = true;

  const CDNS = [
    'https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js',
    'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js',
  ];

  function loadScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => { console.warn('[immersive] no cargó', src); resolve(false); };
      document.head.appendChild(s);
    });
  }

  /* ── Fallback de :has() para mute/CTA ──────────────────────────
     Mantiene #immersiveStart y #immersiveMuteBtn ocultos cuando hay
     bloqueo/auth visibles, sin depender del soporte de :has() en CSS.
     ──────────────────────────────────────────────────────────── */
  function syncLockedClass() {
    const b = document.getElementById('pantallaBloqueo');
    const a = document.getElementById('pantallaAuth');
    const lock = (b && !b.classList.contains('oculto')) ||
                 (a && !a.classList.contains('oculto'));
    document.body.classList.toggle('immersive-locked', !!lock);
  }

  async function boot() {
    // PRIMERÍSIMO: error boundary — atrapa cualquier fallo del resto de la carga.
    await loadScript('/static/js/immersive/error-boundary.js');

    // SEGUNDO: modo preview (si ?preview=1) — ejecuta antes de todo lo demás
    // para que cuando lleguen los chequeos de bloqueo/auth ya esté bypassado.
    await loadScript('/static/js/immersive/preview-mode.js');

    // Aplica la clase fallback YA y sincroniza ante cualquier cambio de DOM
    syncLockedClass();
    new MutationObserver(syncLockedClass).observe(document.body, {
      subtree: true, attributes: true, attributeFilter: ['class'],
    });

    /* ── Mejora: paralelizar CDNs (Howler/Lenis/ScrollTrigger/Three) ──
       Antes los cargábamos en serie con `for...await`. Como son
       independientes (GSAP base ya está en index.html), ahorramos
       100-300ms en TTI cargándolos en paralelo. ─────────────────── */
    await Promise.all(CDNS.map(loadScript));
    document.dispatchEvent(new CustomEvent('immersive:ready'));

    // Cargar nuestros módulos al final, ya que dependen de los CDNs.
    // synth-sfx.js y synth-music.js van ANTES de audio-engine porque
    // éste los usa como fallback automático cuando no hay MP3.
    const local = [
      '/static/js/immersive/synth-sfx.js',
      '/static/js/immersive/synth-music.js',
      '/static/js/immersive/audio-engine.js',
      '/static/js/immersive/scroll-engine.js',
      '/static/js/immersive/tilt-cards.js',
      '/static/js/immersive/bg-particles.js',          // analyser de audio
      '/static/js/immersive/cinema-mode.js',           // click polaroid → fullscreen + nav ←/→
      '/static/js/immersive/cursor-trail.js',          // estela reactiva al audio
      '/static/js/immersive/audio-reactive-luna.js',   // luna respira con el bajo
      '/static/js/immersive/lyric-sync.js',            // karaoke poético sync
      '/static/js/immersive/cake-3d.js',               // pastel Three.js con velas reales
      '/static/js/immersive/memory-universe.js',       // galaxia navegable de recuerdos
      '/static/js/immersive/shared-heartbeat.js',      // latido global a 76 BPM
      '/static/js/immersive/magnetic-cursor.js',       // botones que atraen el cursor
      '/static/js/immersive/page-transitions.js',      // navegación cinemática
      '/static/js/immersive/luyuromo-mode.js',
      '/static/js/immersive/more-easter-eggs.js',      // teamo, triple-luna, long-press
      '/static/js/immersive/preview-mode.js',          // ?preview=1 → bypass cliente
      '/static/js/immersive/debug-hud.js',             // Shift+D → panel de estado
    ];
    for (const src of local) await loadScript(src);

    // ── Botón mute flotante ────────────────────────────────
    const btn = document.createElement('button');
    btn.id = 'immersiveMuteBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Silenciar / activar audio');
    btn.innerHTML = '<span aria-hidden="true">♪</span>';
    document.body.appendChild(btn);

    function refreshLabel() {
      const m = window.__immersiveAudio?.isMuted();
      btn.dataset.muted = m ? '1' : '0';
      btn.innerHTML = m ? '<span aria-hidden="true">⊘</span>'
                        : '<span aria-hidden="true">♪</span>';
    }
    refreshLabel();

    btn.addEventListener('click', () => {
      window.__immersiveAudio?.toggleMute();
      refreshLabel();
    });

    // ── Overlay de arranque (solo si la pantallaBloqueo está OCULTA) ──
    // No quieres un CTA de audio mientras Luna ve la cuenta regresiva.
    const bloqueo = document.getElementById('pantallaBloqueo');
    const auth    = document.getElementById('pantallaAuth');
    const blocked = (bloqueo && !bloqueo.classList.contains('oculto')) ||
                    (auth    && !auth.classList.contains('oculto'));
    if (!blocked) {
      const cta = document.createElement('div');
      cta.id = 'immersiveStart';
      cta.innerHTML = `
        <div class="is-card">
          <p class="is-eyebrow">✦ experiencia inmersiva ✦</p>
          <p class="is-title">Toca para activar el audio</p>
          <p class="is-hint">Sonido 3D, música por sección, partículas vivas</p>
        </div>`;
      document.body.appendChild(cta);
      const dismiss = () => {
        cta.classList.add('is-hide');
        setTimeout(() => cta.remove(), 700);
      };
      cta.addEventListener('click', dismiss);
      document.addEventListener('immersive:audio-unlocked', dismiss, { once: true });
      // auto-dismiss tras 12s aunque no haya gesto
      setTimeout(dismiss, 12000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
