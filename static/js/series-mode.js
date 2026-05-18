'use strict';

(function () {
  const FALLBACK_PHOTOS = [
    '/static/DEFAULT_RECUERDOS/foto1.png',
    '/static/DEFAULT_RECUERDOS/foto2.png',
    '/static/DEFAULT_RECUERDOS/foto3.png',
    '/static/DEFAULT_RECUERDOS/foto4.png',
    '/static/DEFAULT_RECUERDOS/foto5.png',
  ];

  const THEMES = {
    net: {
      label: 'NET',
      eyebrow: 'Edicion especial',
      title: 'Nuestra historia, temporada infinita',
      summary: 'Version cinematica del viaje contigo: capitulos, recuerdos orbitando y un final desbloqueable que cambia cada dia.',
      genre: 'Romance',
      chipMode: 'Modo NET',
      episodePrefix: 'Conexion',
      starCount: 140,
      fog: 'rgba(6, 10, 24, 0.28)',
      starColor: '226, 240, 255',
      endingDay: [
        'Final de domingo: pausa larga, abrazo largo y playlist larga.',
        'Final de lunes: contigo incluso el lunes tiene buena fotografia.',
        'Final de martes: plan pequeno, amor enorme.',
        'Final de miercoles: mitad de semana, maxima nostalgia bonita.',
        'Final de jueves: ya se siente cerca otro capitulo brillante.',
        'Final de viernes: creditos con luces, musica y celebracion.',
        'Final de sabado: maraton oficial de recuerdos favoritos.',
      ],
    },
    galaxy: {
      label: 'Galaxy',
      eyebrow: 'Modo galactico',
      title: 'Mapa estelar de Lima a Medellin',
      summary: 'Un viaje inmersivo entre constelaciones y recuerdos. Cada foto es una parada en nuestra ruta interplanetaria.',
      genre: 'Sci-Fi romantico',
      chipMode: 'Modo Galaxy',
      episodePrefix: 'Constelacion',
      starCount: 230,
      fog: 'rgba(4, 7, 22, 0.22)',
      starColor: '190, 225, 255',
      endingDay: [
        'Bitacora domingo: rumbo estable, corazon encendido.',
        'Bitacora lunes: la gravedad siempre apunta hacia ti.',
        'Bitacora martes: distancia fisica, sincronizacion perfecta.',
        'Bitacora miercoles: coordenadas seguras para volver a casa.',
        'Bitacora jueves: el universo entero cabe en un abrazo.',
        'Bitacora viernes: anillo de luz y promesa renovada.',
        'Bitacora sabado: noche abierta para otra orbita juntos.',
      ],
    },
    chocolate: {
      label: 'Chocolate',
      eyebrow: 'Caja premium',
      title: 'Coleccion de momentos sabor chocolate',
      summary: 'Una seleccion dulce y elegante: cada recuerdo abre una pieza nueva, con notas personales y un cierre perfecto.',
      genre: 'Romance gourmet',
      chipMode: 'Modo Chocolate',
      episodePrefix: 'Bombon',
      starCount: 90,
      fog: 'rgba(25, 16, 10, 0.24)',
      starColor: '255, 222, 198',
      endingDay: [
        'Nota domingo: cacao suave y una promesa firme.',
        'Nota lunes: energia de chocolate y sonrisa tuya.',
        'Nota martes: cucharada de calma para los dos.',
        'Nota miercoles: equilibrio exacto entre ternura y locura.',
        'Nota jueves: bouquet de recuerdos para repetir.',
        'Nota viernes: cierre brillante con sabor eterno.',
        'Nota sabado: sobremesa larga, historia infinita.',
      ],
    },
  };

  const EPISODE_BEATS = [
    'Todo inicio con una chispa y una intuicion hermosa.',
    'Entre bromas y planes, construimos un idioma propio.',
    'Lo simple se volvio memorable porque estabas tu.',
    'En los dias intensos, elegimos avanzar como equipo.',
    'Cada foto guarda una version de nosotros que sigue creciendo.',
    'El viaje tuvo pausas, pero nunca perdio direccion.',
    'Aprendimos a celebrar lo pequeno con intensidad grande.',
    'La distancia nunca le gano al compromiso.',
    'Seguimos escribiendo una temporada que no se agota.',
  ];

  const EPISODE_TAGS = ['Inicio', 'Complicidad', 'Aventura', 'Lealtad', 'Recuerdo', 'Ruta', 'Risas', 'Promesa', 'Final'];
  const CHOCO_MESSAGES = [
    'Una pieza para la primera risa del dia.',
    'Una pieza para los planes que aun no contamos.',
    'Una pieza para cuando te extrano en silencio.',
    'Una pieza para la paciencia que nos cuida.',
    'Una pieza para celebrar cada pequeno avance.',
    'Una pieza para los viajes Lima - Medellin.',
    'Una pieza para la version mas valiente de nosotros.',
    'Una pieza para cerrar el dia con paz.',
  ];

  const state = {
    themeName: 'net',
    theme: THEMES.net,
    photos: FALLBACK_PHOTOS.slice(),
    episodes: [],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function parseThemeName() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('series_theme') || params.get('theme') || 'net').toLowerCase().trim();
    return Object.prototype.hasOwnProperty.call(THEMES, raw) ? raw : 'net';
  }

  function buildThemeUrl(themeName) {
    const url = new URL(window.location.href);
    url.searchParams.set('series_theme', themeName);
    return `${url.pathname}?${url.searchParams.toString()}${url.hash || ''}`;
  }

  function applyTheme() {
    document.body.dataset.seriesTheme = state.themeName;
    const chips = document.querySelectorAll('[data-theme-link]');
    chips.forEach((link) => {
      const targetTheme = link.dataset.themeLink || '';
      link.classList.toggle('is-active', targetTheme === state.themeName);
      link.setAttribute('href', buildThemeUrl(targetTheme));
    });
  }

  async function loadPhotos() {
    try {
      const response = await fetch('/api/recuerdos_media', { cache: 'no-store' });
      if (!response.ok) throw new Error(`recuerdos_media ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.recuerdos)) return FALLBACK_PHOTOS.slice();
      const clean = data.recuerdos
        .map((item) => String(item || '').trim())
        .filter((item) => item.startsWith('/static/'));
      return clean.length ? clean : FALLBACK_PHOTOS.slice();
    } catch (_) {
      return FALLBACK_PHOTOS.slice();
    }
  }

  function buildEpisodes() {
    const photos = state.photos.length ? state.photos : FALLBACK_PHOTOS;
    const targetCount = Math.max(5, Math.min(photos.length, 24));
    const generated = [];

    for (let i = 0; i < targetCount; i++) {
      const photo = photos[i % photos.length];
      const episodeNumber = String(i + 1).padStart(2, '0');
      const beat = EPISODE_BEATS[i % EPISODE_BEATS.length];
      const tag = EPISODE_TAGS[i % EPISODE_TAGS.length];
      const duration = `${10 + (i % 8)} min`;
      generated.push({
        id: i + 1,
        title: `E${episodeNumber} - ${state.theme.episodePrefix} ${i + 1}`,
        tag,
        duration,
        image: photo,
        text: `${beat} Esta escena pertenece al modo ${state.theme.label}.`,
      });
    }
    state.episodes = generated;
  }

  function renderHero() {
    const heroCover = $('heroCover');
    if (heroCover) {
      heroCover.src = state.photos[Math.min(state.photos.length - 1, 4)] || FALLBACK_PHOTOS[FALLBACK_PHOTOS.length - 1];
      heroCover.alt = `Portada modo ${state.theme.label}`;
    }
    $('heroEyebrow').textContent = state.theme.eyebrow;
    $('heroTitle').textContent = state.theme.title;
    $('heroSummary').textContent = state.theme.summary;
    $('chipGenre').textContent = state.theme.genre;
    $('chipEpisodes').textContent = `${state.episodes.length} episodios`;
    $('chipMode').textContent = state.theme.chipMode;
  }

  function renderEpisodes() {
    const grid = $('episodesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const fragment = document.createDocumentFragment();
    state.episodes.forEach((episode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-card';
      button.dataset.episodeId = String(episode.id);
      button.innerHTML =
        `<img src="${episode.image}" alt="${episode.title}">` +
        `<strong>${episode.title}</strong>` +
        `<span>${episode.tag} · ${episode.duration}</span>`;
      button.addEventListener('click', () => openEpisode(episode.id));
      fragment.appendChild(button);
    });
    grid.appendChild(fragment);
  }

  function openEpisode(id) {
    const episode = state.episodes.find((item) => item.id === id);
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

    close.addEventListener('click', () => {
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    });

    modal.addEventListener('click', (event) => {
      const rect = modal.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (!outside) return;
      if (typeof modal.close === 'function') modal.close();
      else modal.removeAttribute('open');
    });
  }

  function updateEnding() {
    const node = $('dynamicEnding');
    if (!node) return;
    const day = new Date().getDay();
    node.textContent = state.theme.endingDay[day] || state.theme.endingDay[0];
  }

  function wireActions() {
    $('btnPlayStory')?.addEventListener('click', () => openEpisode(1));
    $('btnShareSeries')?.addEventListener('click', async () => {
      const title = `Luna Originals - ${state.theme.label}`;
      const url = window.location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
      } catch (_) {}
      try {
        await navigator.clipboard.writeText(url);
        const button = $('btnShareSeries');
        if (!button) return;
        const original = button.textContent;
        button.textContent = 'Enlace copiado';
        setTimeout(() => {
          button.textContent = original;
        }, 1400);
      } catch (_) {}
    });
  }

  function initNebulaCanvas() {
    const canvas = $('seriesNebula');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;
    const stars = [];
    const starCount = state.theme.starCount;
    const starColor = state.theme.starColor;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars.length = 0;
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 0.9 + 0.1,
          size: Math.random() * 1.8 + 0.3,
          alpha: Math.random() * 0.7 + 0.2,
          drift: (Math.random() - 0.5) * (state.themeName === 'galaxy' ? 0.18 : 0.1),
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = state.theme.fog;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.x += star.drift;
        if (star.x > width + 2) star.x = -2;
        if (star.x < -2) star.x = width + 2;

        const px = star.x + pointerX * star.z * 0.025;
        const py = star.y + pointerY * star.z * 0.025;
        const alpha = Math.max(0.16, Math.min(0.95, star.alpha + Math.sin(Date.now() * 0.0015 + i) * 0.16));
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColor}, ${alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener(
      'pointermove',
      (event) => {
        pointerX = event.clientX - width / 2;
        pointerY = event.clientY - height / 2;
      },
      { passive: true }
    );

    resize();
    draw();
  }

  function renderOrbitPhotos() {
    const layer = $('orbitPhotosLayer');
    if (!layer) return;
    layer.innerHTML = '';

    const limit = Math.max(5, Math.min(12, state.photos.length));
    const photos = state.photos.slice(0, limit);
    const fragment = document.createDocumentFragment();
    photos.forEach((src, idx) => {
      const img = document.createElement('img');
      img.className = 'orbit-photo';
      img.src = src;
      img.alt = `Recuerdo ${idx + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      fragment.appendChild(img);
    });
    layer.appendChild(fragment);
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
      speed: 0.0019 + idx * 0.00027,
      depth: 0.82 + (idx % 4) * 0.11,
    }));

    function refreshBounds() {
      const rect = stage.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
      rx = Math.max(84, rect.width * 0.35);
      ry = Math.max(72, rect.height * 0.29);
    }

    function tick() {
      for (let i = 0; i < nodes.length; i++) {
        const item = nodes[i];
        item.angle += item.speed;
        const x = cx + Math.cos(item.angle) * rx + magnetX * 10;
        const y = cy + Math.sin(item.angle) * ry + magnetY * 10;
        const scale = 0.78 + (Math.sin(item.angle) + 1) * 0.16 + (item.depth - 0.82) * 0.12;
        item.el.style.left = `${x}px`;
        item.el.style.top = `${y}px`;
        item.el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        item.el.style.zIndex = String(10 + Math.round((Math.sin(item.angle) + 1) * 10));
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

  function renderChocolateBox() {
    const box = $('chocoBox');
    const grid = $('chocoGrid');
    if (!box || !grid) return;

    if (state.themeName !== 'chocolate') {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    grid.innerHTML = '';

    const count = Math.max(6, Math.min(12, state.photos.length));
    const photos = state.photos.slice(0, count);
    const fragment = document.createDocumentFragment();

    photos.forEach((src, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choco-piece';
      button.setAttribute('aria-label', `Chocolate ${idx + 1}`);
      button.innerHTML =
        `<span class="choco-front"><img src="${src}" alt="Recuerdo ${idx + 1}"></span>` +
        `<span class="choco-back">${CHOCO_MESSAGES[idx % CHOCO_MESSAGES.length]}</span>`;
      button.addEventListener('click', () => button.classList.toggle('is-open'));
      fragment.appendChild(button);
    });

    grid.appendChild(fragment);
  }

  async function init() {
    state.themeName = parseThemeName();
    state.theme = THEMES[state.themeName] || THEMES.net;
    applyTheme();

    state.photos = await loadPhotos();
    buildEpisodes();
    renderHero();
    renderEpisodes();
    renderOrbitPhotos();
    renderChocolateBox();

    wireModal();
    wireActions();
    updateEnding();
    initNebulaCanvas();
    initOrbitMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init().catch((err) => console.error('[series]', err));
    });
  } else {
    init().catch((err) => console.error('[series]', err));
  }
})();
