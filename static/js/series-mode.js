'use strict';

(function () {
  const episodes = [
    {
      id: 1,
      title: 'E01 - Primer Destello',
      tag: 'Inicio',
      duration: '11 min',
      image: '/static/DEFAULT_RECUERDOS/foto1.png',
      text: 'El capitulo donde todo se alinea. Dos personas, una chispa y una sensacion clara de que esto iba a ser inolvidable.',
    },
    {
      id: 2,
      title: 'E02 - Codigo y Risas',
      tag: 'Complicidad',
      duration: '14 min',
      image: '/static/DEFAULT_RECUERDOS/foto2.png',
      text: 'Entre conversaciones largas, bromas internas y planes imposibles, empezamos a construir nuestro propio idioma.',
    },
    {
      id: 3,
      title: 'E03 - Orbitas Cruzadas',
      tag: 'Aventura',
      duration: '13 min',
      image: '/static/DEFAULT_RECUERDOS/foto3.png',
      text: 'Los dias intensos y los momentos tranquilos. Todo cuenta cuando se vive con alguien que te hace sentir en casa.',
    },
    {
      id: 4,
      title: 'E04 - Modo Infinito',
      tag: 'Lealtad',
      duration: '15 min',
      image: '/static/DEFAULT_RECUERDOS/foto4.png',
      text: 'No todo fue simple, pero siempre hubo equipo. Este episodio trata de elegirnos una y otra vez.',
    },
    {
      id: 5,
      title: 'E05 - Luna Season Finale',
      tag: 'Final especial',
      duration: '18 min',
      image: '/static/DEFAULT_RECUERDOS/foto5.png',
      text: 'Un final que en realidad es un nuevo inicio: mas claro, mas fuerte y mas nuestro. Continuara.',
    },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function renderEpisodes() {
    const grid = $('episodesGrid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    episodes.forEach((episode) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'episode-card';
      btn.dataset.episodeId = String(episode.id);
      btn.innerHTML =
        `<img src="${episode.image}" alt="${episode.title}">` +
        `<strong>${episode.title}</strong>` +
        `<span>${episode.tag} · ${episode.duration}</span>`;
      btn.addEventListener('click', () => openEpisode(episode.id));
      frag.appendChild(btn);
    });
    grid.appendChild(frag);
  }

  function openEpisode(id) {
    const episode = episodes.find((item) => item.id === id);
    const modal = $('episodeModal');
    if (!episode || !modal) return;

    $('modalImage').src = episode.image;
    $('modalImage').alt = episode.title;
    $('modalTag').textContent = `${episode.tag} · ${episode.duration}`;
    $('modalTitle').textContent = episode.title;
    $('modalText').textContent = episode.text;

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
  }

  function wireModal() {
    const modal = $('episodeModal');
    const close = $('btnCloseEpisode');
    if (!modal || !close) return;
    close.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (event) => {
      const rect = modal.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) modal.close();
    });
  }

  function updateEnding() {
    const el = $('dynamicEnding');
    if (!el) return;
    const day = new Date().getDay();
    const endings = [
      'Final alternativo del domingo: pausa larga, abrazo largo, playlist larga.',
      'Final alternativo del lunes: contigo incluso el lunes tiene buena cinematografia.',
      'Final alternativo del martes: plan pequeno, amor enorme.',
      'Final alternativo del miercoles: mitad de semana, maxima nostalgia bonita.',
      'Final alternativo del jueves: se siente cerca otro capitulo brillante.',
      'Final alternativo del viernes: creditos con luces, musica y celebracion.',
      'Final alternativo del sabado: maraton oficial de recuerdos favoritos.',
    ];
    el.textContent = endings[day] || endings[0];
  }

  function wireActions() {
    $('btnPlayStory')?.addEventListener('click', () => openEpisode(1));
    $('btnShareSeries')?.addEventListener('click', async () => {
      const title = 'Luna Originals - Nuestra Serie';
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
      } catch (_) {}
      try {
        await navigator.clipboard.writeText(url);
        const btn = $('btnShareSeries');
        if (!btn) return;
        const original = btn.textContent;
        btn.textContent = 'Enlace copiado';
        setTimeout(() => {
          btn.textContent = original;
        }, 1400);
      } catch (_) {}
    });
  }

  function initNebulaCanvas() {
    const canvas = $('seriesNebula');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let pointerX = 0;
    let pointerY = 0;
    const stars = [];
    const STAR_COUNT = 140;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      if (stars.length) return;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 0.9 + 0.1,
          size: Math.random() * 1.8 + 0.3,
          alpha: Math.random() * 0.7 + 0.2,
          drift: (Math.random() - 0.5) * 0.08,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(6, 10, 24, 0.28)';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.drift;
        if (s.x > w + 2) s.x = -2;
        if (s.x < -2) s.x = w + 2;

        const px = s.x + pointerX * s.z * 0.02;
        const py = s.y + pointerY * s.z * 0.02;
        const alpha = Math.max(0.16, Math.min(0.95, s.alpha + Math.sin(Date.now() * 0.0016 + i) * 0.16));
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 240, 255, ${alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener(
      'pointermove',
      (event) => {
        pointerX = event.clientX - w / 2;
        pointerY = event.clientY - h / 2;
      },
      { passive: true }
    );

    resize();
    draw();
  }

  function initOrbitMotion() {
    const stage = $('orbitStage');
    if (!stage) return;
    const photos = Array.from(stage.querySelectorAll('.orbit-photo'));
    if (!photos.length) return;

    let cx = 0;
    let cy = 0;
    let rx = 0;
    let ry = 0;
    let magnetX = 0;
    let magnetY = 0;
    const nodes = photos.map((photo, idx) => ({
      el: photo,
      angle: (Math.PI * 2 * idx) / photos.length,
      speed: 0.0024 + idx * 0.00035,
    }));

    function refreshBounds() {
      const rect = stage.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
      rx = Math.max(84, rect.width * 0.34);
      ry = Math.max(72, rect.height * 0.29);
    }

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        const item = nodes[i];
        item.angle += item.speed;
        const x = cx + Math.cos(item.angle) * rx + magnetX * 10;
        const y = cy + Math.sin(item.angle) * ry + magnetY * 10;
        item.el.style.left = `${x}px`;
        item.el.style.top = `${y}px`;
        item.el.style.transform = 'translate(-50%, -50%)';
      }
      requestAnimationFrame(tick);
    }

    stage.addEventListener(
      'pointermove',
      (event) => {
        const rect = stage.getBoundingClientRect();
        const mx = (event.clientX - rect.left) / rect.width - 0.5;
        const my = (event.clientY - rect.top) / rect.height - 0.5;
        magnetX = Math.max(-1, Math.min(1, mx));
        magnetY = Math.max(-1, Math.min(1, my));
      },
      { passive: true }
    );
    stage.addEventListener('pointerleave', () => {
      magnetX = 0;
      magnetY = 0;
    });

    window.addEventListener('resize', refreshBounds);
    refreshBounds();
    tick();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderEpisodes();
    wireModal();
    wireActions();
    updateEnding();
    initNebulaCanvas();
    initOrbitMotion();
  });
})();
