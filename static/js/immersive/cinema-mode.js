/* ══════════════════════════════════════════════════════════════
   cinema-mode.js — Vista cine para fotos (.marco-foto)
   ──────────────────────────────────────────────────────────────
   Click en cualquier .marco-foto → la foto se expande a fullscreen
   con vignette y desenfoque del resto. Click fuera, Esc o flecha →
   cierra. Soporta navegación entre fotos con ←/→.
   • Cero dependencias.
   • Respeta prefers-reduced-motion.
   • Se desactiva durante pantallaBloqueo / pantallaAuth.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  if (window.__cinemaMode) return;
  window.__cinemaMode = true;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SELECTOR = '.marco-foto';

  /* ── CSS inyectado bajo demanda ───────────────────────────── */
  function injectStyles() {
    if (document.getElementById('cinema-styles')) return;
    const s = document.createElement('style');
    s.id = 'cinema-styles';
    s.textContent = `
      body.cinema-active > *:not(#cinemaOverlay):not(#immersiveBg):not(#immersiveMuteBtn):not(#previewBanner) {
        filter: blur(14px) brightness(.45);
        transition: filter .55s ease;
        pointer-events: none;
      }
      #cinemaOverlay {
        position: fixed; inset: 0; z-index: 9994;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at center,
                    rgba(8,5,30,.45) 0%, rgba(0,0,0,.93) 100%);
        backdrop-filter: blur(8px);
        opacity: 0; transition: opacity .55s ease;
        cursor: zoom-out;
      }
      #cinemaOverlay.show { opacity: 1; }
      #cinemaOverlay .cinema-stage {
        position: relative;
        max-width: 92vw; max-height: 86vh;
        transform: scale(.92);
        transition: transform .65s cubic-bezier(.22,1,.36,1);
        will-change: transform;
      }
      #cinemaOverlay.show .cinema-stage { transform: scale(1); }
      #cinemaOverlay img {
        display: block;
        max-width: 92vw; max-height: 78vh;
        border-radius: 6px;
        box-shadow: 0 40px 120px rgba(0,0,0,.7),
                    0 0 60px rgba(255,107,129,.18);
      }
      #cinemaOverlay .cinema-caption {
        margin-top: 18px; text-align: center;
        font-family: 'Playfair Display', serif; font-style: italic;
        color: rgba(255,235,255,.92);
        font-size: clamp(1.1rem, 2.4vw, 1.6rem);
        text-shadow: 0 2px 14px rgba(0,0,0,.7);
        letter-spacing: 1.2px;
      }
      #cinemaOverlay .cinema-counter {
        position: absolute; top: 18px; right: 22px;
        font-family: 'Cormorant Garamond', serif; font-style: italic;
        color: rgba(255,255,255,.5); font-size: .9rem; letter-spacing: 2px;
      }
      #cinemaOverlay .cinema-nav {
        position: fixed; top: 50%; transform: translateY(-50%);
        width: 48px; height: 48px; border-radius: 50%;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.15);
        color: rgba(255,255,255,.7); font-size: 1.4rem;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all .25s ease;
        backdrop-filter: blur(8px);
      }
      #cinemaOverlay .cinema-nav:hover {
        background: rgba(255,107,129,.25); color: white;
        transform: translateY(-50%) scale(1.08);
      }
      #cinemaOverlay .cinema-prev { left: 22px; }
      #cinemaOverlay .cinema-next { right: 22px; }
      #cinemaOverlay .cinema-close {
        position: fixed; top: 22px; left: 22px;
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.15);
        color: rgba(255,255,255,.7); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem;
      }
      .marco-foto { cursor: zoom-in; }
      .marco-foto img { transition: filter .35s ease; }
      .marco-foto:hover img { filter: brightness(1.06) saturate(1.1); }
    `;
    document.head.appendChild(s);
  }

  /* ── Estado y construcción del overlay ───────────────────── */
  let overlay  = null;
  let imgEl    = null;
  let capEl    = null;
  let counter  = null;
  let photos   = [];
  let cursor   = 0;

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'cinemaOverlay';
    overlay.innerHTML = `
      <div class="cinema-counter"></div>
      <button class="cinema-close"  aria-label="Cerrar">✕</button>
      <button class="cinema-nav cinema-prev" aria-label="Anterior">‹</button>
      <button class="cinema-nav cinema-next" aria-label="Siguiente">›</button>
      <div class="cinema-stage">
        <img alt="">
        <div class="cinema-caption"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    imgEl   = overlay.querySelector('img');
    capEl   = overlay.querySelector('.cinema-caption');
    counter = overlay.querySelector('.cinema-counter');

    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.classList.contains('cinema-stage')) close();
    });
    overlay.querySelector('.cinema-close').addEventListener('click', close);
    overlay.querySelector('.cinema-prev').addEventListener('click', e => { e.stopPropagation(); show(cursor - 1); });
    overlay.querySelector('.cinema-next').addEventListener('click', e => { e.stopPropagation(); show(cursor + 1); });
  }

  function show(idx) {
    if (!photos.length) return;
    cursor = (idx + photos.length) % photos.length;
    const p = photos[cursor];
    imgEl.src = p.src;
    imgEl.alt = p.alt || '';
    capEl.textContent = p.caption || '';
    counter.textContent = `${cursor + 1} / ${photos.length}`;
    if (window.__immersiveAudio) window.__immersiveAudio.sfx('reveal');
  }

  function open(startEl) {
    injectStyles();
    if (!overlay) build();

    // Recolectar TODAS las polaroids en la página al momento de abrir
    photos = [...document.querySelectorAll(SELECTOR)].map(m => ({
      src: m.querySelector('img')?.src,
      alt: m.querySelector('img')?.alt,
      caption: m.querySelector('.texto-foto')?.textContent || '',
    })).filter(p => p.src);

    cursor = photos.findIndex(p => p.src === startEl.querySelector('img')?.src);
    if (cursor < 0) cursor = 0;

    show(cursor);
    document.body.classList.add('cinema-active');
    requestAnimationFrame(() => overlay.classList.add('show'));

    if (window.__immersiveAudio) window.__immersiveAudio.sfx('transition');
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('show');
    document.body.classList.remove('cinema-active');
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft')  show(cursor - 1);
    else if (e.key === 'ArrowRight') show(cursor + 1);
  }

  /* ── Wiring ──────────────────────────────────────────────── */
  function gateOpen() {
    const b = document.getElementById('pantallaBloqueo');
    const a = document.getElementById('pantallaAuth');
    return !((b && !b.classList.contains('oculto')) ||
             (a && !a.classList.contains('oculto')));
  }

  document.addEventListener('click', e => {
    const m = e.target.closest?.(SELECTOR);
    if (!m) return;
    if (!gateOpen()) return;
    if (reduced) return;
    e.preventDefault();
    e.stopPropagation();
    open(m);
  }, true);
})();
