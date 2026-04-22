/* ══════════════════════════════════════════════════════════════
   🌙 Script Principal — Cumpleaños de Luyuromo
   Versión 3.1 — Bugs críticos corregidos, Estados seguros
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   UTILIDADES GLOBALES
   ────────────────────────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function showToast(msg, dur = 3500) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
function raf(fn) { requestAnimationFrame(fn); }

/* ══════════════════════════════════════════════════════════════
   1 · CANVAS DE PARTÍCULAS — Pantalla de Bloqueo
   ══════════════════════════════════════════════════════════════ */
class CanvasBloqueo {
  constructor(canvasId) {
    this.canvas = $(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.shooting  = [];
    this.running   = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._buildParticles();
  }

  resize() {
    if (!this.canvas) return;
    this.W = this.canvas.width  = window.innerWidth;
    this.H = this.canvas.height = window.innerHeight;
  }

  _buildParticles() {
    this.particles = [];
    const n = Math.min(200, Math.floor(this.W * this.H / 8000));
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: Math.random() * 1.5 + .3,
        a: Math.random(),
        da: (Math.random() * .004 + .001) * (Math.random() < .5 ? 1 : -1),
        hue: Math.random() * 60 + 200,   // azul-violeta
      });
    }
  }

  _spawnShooting() {
    if (Math.random() > .015) return;
    this.shooting.push({
      x: Math.random() * this.W * .8 + this.W * .2,
      y: Math.random() * this.H * .4,
      len: 0, maxLen: 120 + Math.random() * 100,
      speed: 8 + Math.random() * 6, life: 1,
    });
  }

  _drawNebulaBackground() {
    const g = this.ctx.createRadialGradient(
      this.W * .3, this.H * .3, 0,
      this.W * .3, this.H * .3, this.W * .6
    );
    g.addColorStop(0, 'rgba(80,0,100,.07)');
    g.addColorStop(1, 'transparent');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.W, this.H);

    const g2 = this.ctx.createRadialGradient(
      this.W * .7, this.H * .6, 0,
      this.W * .7, this.H * .6, this.W * .5
    );
    g2.addColorStop(0, 'rgba(0,40,120,.08)');
    g2.addColorStop(1, 'transparent');
    this.ctx.fillStyle = g2;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  frame() {
    if (!this.running) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this._drawNebulaBackground();

    // Partículas twinkling
    this.particles.forEach(p => {
      p.a = Math.max(.05, Math.min(1, p.a + p.da));
      if (p.a >= 1 || p.a <= .05) p.da *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},80%,90%,${p.a})`;
      ctx.fill();
    });

    // Estrellas fugaces
    this._spawnShooting();
    this.shooting = this.shooting.filter(s => s.life > 0);
    this.shooting.forEach(s => {
      s.len = Math.min(s.len + s.speed, s.maxLen);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(-Math.PI / 4);
      const g = ctx.createLinearGradient(0, 0, -s.len, 0);
      g.addColorStop(0, `rgba(255,255,255,${s.life})`);
      g.addColorStop(1, 'transparent');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-s.len, 0);
      ctx.stroke(); ctx.restore();
      s.x -= s.speed * .7; s.y += s.speed * .7;
      if (s.len >= s.maxLen) s.life -= .05;
    });

    raf(() => this.frame());
  }

  start() { this.running = true; this.frame(); }
  stop()  { this.running = false; }
}

/* ══════════════════════════════════════════════════════════════
   2 · FLIP COUNTER
   ══════════════════════════════════════════════════════════════ */
class FlipCounter {
  constructor() {
    this._prevValues = {};
  }

  _setDigito(prefijo, valor, pad) {
    const str = String(valor).padStart(pad, '0');
    for (let i = 0; i < str.length; i++) {
      const key  = `${prefijo}${i+1}`;
      const digit = str[i];
      const topEl = $(`${prefijo}-t${i > 0 ? i+1 : ''}`);
      const botEl = $(`${prefijo}-b${i > 0 ? i+1 : ''}`);

      const cardEl = topEl?.parentElement;
      if (!cardEl) continue;
      if (this._prevValues[key] !== digit) {
        this._prevValues[key] = digit;
        if (topEl) topEl.textContent = digit;
        if (botEl) botEl.textContent = digit;
        cardEl.classList.add('flipping');
        setTimeout(() => cardEl.classList.remove('flipping'), 600);
      }
    }
  }

  _updateGroup(idTop, idBot, digit) {
    const top = $(idTop);
    const bot = $(idBot);
    if (top && top.textContent !== digit) {
      const card = top.parentElement;
      top.textContent = digit;
      bot.textContent = digit;
      card.classList.remove('flipping');
      void card.offsetWidth; // reflow
      card.classList.add('flipping');
      setTimeout(() => card.classList.remove('flipping'), 600);
    }
  }

  update(dias, horas, minutos, segundos) {
    const d = String(dias).padStart(3,'0');
    const h = String(horas).padStart(2,'0');
    const m = String(minutos).padStart(2,'0');
    const s = String(segundos).padStart(2,'0');

    this._updateGroup('fd-t','fd-b',   d[0]);
    this._updateGroup('fd2-t','fd2-b', d[1]);
    this._updateGroup('fd3-t','fd3-b', d[2]);
    this._updateGroup('fh-t','fh-b',   h[0]);
    this._updateGroup('fh2-t','fh2-b', h[1]);
    this._updateGroup('fm-t','fm-b',   m[0]);
    this._updateGroup('fm2-t','fm2-b', m[1]);
    this._updateGroup('fs-t','fs-b',   s[0]);
    this._updateGroup('fs2-t','fs2-b', s[1]);
  }
}

/* ══════════════════════════════════════════════════════════════
   3 · MINI-JUEGO: CONSTELACIÓN DEL AMOR (Canvas)
   ══════════════════════════════════════════════════════════════ */
class JuegoConstelacion {
  constructor(canvasId) {
    this.canvas   = $(canvasId);
    if (!this.canvas) return;
    this.ctx      = this.canvas.getContext('2d');
    this.W        = this.canvas.width;
    this.H        = this.canvas.height;
    this.completado = false;
    this.siguienteIdx = 0;
    this.lineas   = [];
    this.animFrame = null;

    const pts = [
      [.50, .22], [.72, .14], [.88, .30], [.82, .50], [.62, .68],
      [.50, .82], [.38, .68], [.18, .50], [.12, .30], [.28, .14]
    ];

    this.estrellas = pts.map(([nx, ny], i) => ({
      x: nx * this.W, y: ny * this.H,
      r: 6, num: i + 1, tocada: false,
      parpadeoCiclo: Math.random() * Math.PI * 2,
    }));

    this._bindEvents();
    this._animate();
  }

  _bindEvents() {
    const handle = (e) => {
      if (this.completado) return;
      e.preventDefault();
      const rect  = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const scaleY = this.H / rect.height;
      const cx = e.type.includes('touch')
        ? (e.touches[0].clientX - rect.left) * scaleX
        : (e.clientX - rect.left) * scaleX;
      const cy = e.type.includes('touch')
        ? (e.touches[0].clientY - rect.top) * scaleY
        : (e.clientY - rect.top) * scaleY;
      this._checkClick(cx, cy);
    };
    this.canvas.addEventListener('click',     handle);
    this.canvas.addEventListener('touchstart', handle, { passive: false });
  }

  _checkClick(cx, cy) {
    const esperada = this.estrellas[this.siguienteIdx];
    if (!esperada) return;
    const dist = Math.hypot(cx - esperada.x, cy - esperada.y);
    if (dist < 28) {
      esperada.tocada = true;
      if (this.siguienteIdx > 0) {
        const prev = this.estrellas[this.siguienteIdx - 1];
        this.lineas.push({ x1: prev.x, y1: prev.y, x2: esperada.x, y2: esperada.y, alpha: 0 });
      }
      this.siguienteIdx++;
      const statusEl = $('juegoStatus');
      const numEl    = $('juegoNumActual');
      if (this.siguienteIdx < this.estrellas.length) {
        if (numEl) numEl.textContent = this.siguienteIdx + 1;
      } else {
        const last  = this.estrellas[this.estrellas.length - 1];
        const first = this.estrellas[0];
        this.lineas.push({ x1: last.x, y1: last.y, x2: first.x, y2: first.y, alpha: 0 });
        this.completado = true;
        if (statusEl) {
          statusEl.innerHTML = '💖 ¡Lo lograste! ¡Formaste el corazón!';
          statusEl.style.color = '#ff6b81';
          statusEl.style.fontSize = '1rem';
        }
        fetch('/api/constelacion_completada', { method: 'POST' }).catch(() => {});
        setTimeout(() => this._celebrar(), 800);
      }
    } else {
      esperada._error = 8;
    }
  }

  _celebrar() {
    if (typeof confetti === 'undefined') return;
    confetti({ particleCount: 80, spread: 100, origin: { y: .6 },
               colors: ['#ff6b81','#f5c842','#0afab0','#ffffff'] });
  }

  _animate() {
    const ctx = this.ctx;
    const t   = performance.now() / 1000;
    ctx.clearRect(0, 0, this.W, this.H);

    this.lineas.forEach(l => {
      l.alpha = Math.min(1, l.alpha + .04);
      ctx.save();
      ctx.globalAlpha = l.alpha;
      const grad = ctx.createLinearGradient(l.x1, l.y1, l.x2, l.y2);
      grad.addColorStop(0, '#ff6b81');
      grad.addColorStop(1, '#f5c842');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff6b81'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2);
      ctx.stroke(); ctx.restore();
    });

    this.estrellas.forEach((s, i) => {
      s.parpadeoCiclo += .04;
      const brillo = .5 + .5 * Math.sin(s.parpadeoCiclo);
      const siguiente = (i === this.siguienteIdx && !this.completado);
      const pulso = siguiente ? 1 + .4 * Math.sin(t * 5) : 1;

      if (siguiente) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3 * pulso, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,107,129,${.15 * brillo})`;
        ctx.fill();
      }

      if (s._error > 0) { s._error--; }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * pulso, 0, Math.PI*2);
      const color = s.tocada ? '#f5c842' : (siguiente ? '#ff6b81' : `rgba(200,220,255,${.4+.4*brillo})`);
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = s.tocada ? 16 : (siguiente ? 12 : 4);
      ctx.fill();

      ctx.save();
      ctx.font = `bold ${s.tocada ? 9 : 10}px "Playfair Display", serif`;
      ctx.fillStyle = s.tocada ? '#f5c842' : 'rgba(255,255,255,.7)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(s.num, s.x, s.y - s.r - 9);
      ctx.restore();
    });

    if (this.completado) {
      ctx.save();
      ctx.globalAlpha = .15 + .1 * Math.sin(t * 3);
      ctx.fillStyle = '#ff6b81';
      this.estrellas.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }

    this.animFrame = raf(() => this._animate());
  }

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
}

/* ══════════════════════════════════════════════════════════════
   4 · CANVAS AURA del botón de regalo
   ══════════════════════════════════════════════════════════════ */
function iniciarAuraRegalo() {
  const canvas = $('canvasRegalo');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 260;
  const H = canvas.offsetHeight || 140;
  canvas.width  = W;
  canvas.height = H;

  let t = 0;
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const phase = t + i * (Math.PI * 2 / 3);
      const x = W * .5 + Math.cos(phase) * 20;
      const y = H * .5 + Math.sin(phase * .7) * 12;
      const r = Math.min(W,H) * .4 + Math.sin(phase * .5) * 12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${340+i*30},90%,65%,.12)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    t += .018;
    raf(frame);
  }
  raf(frame);
}

/* ══════════════════════════════════════════════════════════════
   5 · INTRO CANVAS — estrellas que convergen al regalo
   ══════════════════════════════════════════════════════════════ */
function iniciarIntroCanvas() {
  const canvas = $('canvasIntro');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    W = canvas.width  = rect.width  || 400;
    H = canvas.height = rect.height || 200;
  };
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({length: 60}, () => ({
    x: Math.random() * 1000 - 100, y: Math.random() * 400 - 100,
    vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
    r: Math.random() * 1.5 + .3, a: Math.random(),
    da: (Math.random() * .008 + .002) * (Math.random()<.5?1:-1),
  }));

  function frame() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.a = Math.max(.05, Math.min(.9, s.a + s.da));
      if (s.a >= .9 || s.a <= .05) s.da *= -1;
      s.x = ((s.x + s.vx) % (W + 200) + W + 200) % (W + 200) - 100;
      s.y = ((s.y + s.vy) % (H + 200) + H + 200) % (H + 200) - 100;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(200,220,255,${s.a})`;
      ctx.fill();
    });
    raf(frame);
  }
  raf(frame);
}

/* ══════════════════════════════════════════════════════════════
   6 · FONDO DE ESTRELLAS (DOM, para la fiesta)
   ══════════════════════════════════════════════════════════════ */
function crearFondoEstrellas() {
  const colores = ['#ff007f','#ff1493','#ffd700','#ffea00','#ff6b81'];
  for (let i = 0; i < 100; i++) {
    const e = document.createElement('div');
    e.classList.add('estrella');
    const sz = Math.random() * 10 + 4;
    Object.assign(e.style, {
      width: `${sz}px`, height: `${sz}px`,
      backgroundColor: colores[Math.floor(Math.random() * colores.length)],
      left: `${Math.random()*100}vw`,
      top: `${Math.random()<.7 ? Math.random()*40 : Math.random()*100}vh`,
      animation: `titilar ${Math.random()*3+1.5}s ease-in-out ${Math.random()*2}s infinite`,
      position: 'fixed', zIndex: '-1',
    });
    document.body.appendChild(e);
  }
}

/* ══════════════════════════════════════════════════════════════
   7 · CONFETI, VELAS, GLOBOS
   ══════════════════════════════════════════════════════════════ */
function lanzarConfeti() {
  if (typeof confetti === 'undefined') return;
  const colors = ['#ff0a54','#ff477e','#ffd166','#06d6a0','#f5c842'];
  const end = Date.now() + 4500;
  (function frame() {
    confetti({ particleCount:5, angle:60,  spread:55, origin:{x:0}, colors });
    confetti({ particleCount:5, angle:120, spread:55, origin:{x:1}, colors });
    if (Date.now() < end) raf(frame);
  })();
}

function activarVelas() {
  let apagadas = 0;
  const llamas  = document.querySelectorAll('.llama');
  function apagar() {
    if (this.classList.contains('apagada')) return;
    this.classList.add('apagada');
    apagadas++;
    if (apagadas === llamas.length) {
      $('instruccionPastel').innerText = '¡Deseo Concedido! ✨';
      lanzarConfeti();
      showToast('🎂 ¡Deseo concedido! Que se cumpla...');
    }
  }
  llamas.forEach(l => {
    l.addEventListener('mouseenter',  apagar);
    l.addEventListener('touchstart',  apagar, { passive: true });
  });
}

function crearGlobos() {
  const emojis = ['🎈','🎊','🎉','🎁','💕','🌟'];
  for (let i = 0; i < 35; i++) {
    const g = document.createElement('div');
    g.classList.add('globo');
    g.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    Object.assign(g.style, {
      left: `${Math.random()*100}vw`,
      animationDuration: `${Math.random()*4+5}s`,
      animationDelay: `${Math.random()*5}s`,
      fontSize: `${Math.random()*1.5+2}rem`,
    });
    g.addEventListener('click', function() {
      this.classList.add('globo-reventado'); this.innerText = '💥';
      setTimeout(() => this.remove(), 350);
    });
    document.body.appendChild(g);
  }
}

/* ══════════════════════════════════════════════════════════════
   8 · MÁQUINA DE ESCRIBIR
   ══════════════════════════════════════════════════════════════ */
function escribirMaquina(mensajes, contenedor, idx = 0, callback = null) {
  if (idx >= mensajes.length) { if (callback) callback(); return; }
  const p   = document.createElement('p');
  contenedor.appendChild(p);
  const txt = '✨ ' + mensajes[idx];
  let i = 0;
  const cur = document.createElement('span');
  cur.classList.add('cursor-parpadeo');
  p.appendChild(cur);
  const iv = setInterval(() => {
    p.innerText = txt.substring(0, i+1);
    p.appendChild(cur); i++;
    if (i === txt.length) {
      clearInterval(iv); cur.remove();
      setTimeout(() => escribirMaquina(mensajes, contenedor, idx+1, callback), 700);
    }
  }, 42);
}

/* ══════════════════════════════════════════════════════════════
   9 · MOSTRAR FIESTA (función central)
   ══════════════════════════════════════════════════════════════ */
function mostrarFiesta(datos) {
  $('tituloMensaje').innerText    = datos.titulo;
  $('estadisticasAstro').innerText = datos.estadisticas;

  const sorpresa = $('contenidoSorpresa');
  sorpresa.classList.remove('oculto');
  sorpresa.classList.add('mostrar');

  activarVelas();
  const listaMsj = $('listaMensajes');
  listaMsj.innerHTML = '';

  // Cargar stats de amor debajo de estadisticasAstro
  fetch('/api/estadisticas_amor').then(r => r.json()).then(d => {
    const old = $('bloqueStatsAmor');
    if (old) old.remove();
    const grid = document.createElement('div');
    grid.id = 'bloqueStatsAmor'; grid.className = 'stats-amor-grid';
    [
      { icono:'🌙', valor: d.dias_vividos,    etiq: 'días vividos'    },
      { icono:'💓', valor: d.semanas_vividas, etiq: 'semanas de vida' },
      { icono:'💞', valor: d.dias_juntos,     etiq: 'días juntos'     },
      { icono:'🌍', valor: d.orbitas_al_sol,  etiq: 'órbitas al sol'  },
    ].forEach(s => {
      grid.insertAdjacentHTML('beforeend',
        `<div class="stat-tarjeta">
          <div class="icono">${s.icono}</div>
          <div class="valor">${s.valor}</div>
          <div class="etiq">${s.etiq}</div>
        </div>`);
    });
    $('estadisticasAstro').after(grid);
  }).catch(() => {});

  escribirMaquina(datos.mensajes, listaMsj, 0, () => {
    const firma = $('firmaMensaje');
    firma.innerText = datos.firma;
    firma.classList.remove('oculto'); firma.classList.add('mostrar');

    setTimeout(() => {
      const col = $('collageMemorias');
      if (col) { col.classList.remove('oculto'); col.classList.add('mostrar'); }

      setTimeout(() => {
        const buz = $('buzonSecreto');
        if (buz) { buz.classList.remove('oculto'); buz.classList.add('mostrar'); }

        setTimeout(() => {
          const pista = $('pistaSecreta');
          if (pista) pista.classList.add('pista-visible');
        }, 6000);
      }, 800);
    }, 1200);
  });
}

/* ══════════════════════════════════════════════════════════════
   10 · PANTALLA DE BLOQUEO
   ══════════════════════════════════════════════════════════════ */
let canvasBloqueo = null;
let juegoConstelacion = null;

function iniciarBloqueo(segundosTotales) {
  canvasBloqueo = new CanvasBloqueo('canvasBloqueo');
  canvasBloqueo.start();
  juegoConstelacion = new JuegoConstelacion('canvasJuego');

  const flip = new FlipCounter();
  let secs = Math.floor(segundosTotales);

  function tick() {
    if (secs <= 0) { location.reload(); return; }
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    flip.update(d, h, m, s);
    secs--;
    setTimeout(tick, 1000);
  }
  tick();
}

/* ══════════════════════════════════════════════════════════════
   11 · ESTADO — fetch inicial
   ══════════════════════════════════════════════════════════════ */
fetch('/api/estado')
  .then(r => r.json())
  .then(data => {
    if (data.bloqueado) {
      $('contenedorPrincipal').style.display = 'none';
      $('pantallaBloqueo').classList.remove('oculto');
      iniciarBloqueo(data.segundos_faltantes);
    } else {
      $('contenedorPrincipal').style.display = 'none'; // Ocultar regalo primero
      $('pantallaAuth').classList.remove('oculto');    // Mostrar pedir nombre

      $('btnVerificarAuth').addEventListener('click', function() {
        const inputNombre = $('inputNombreAuth').value.toLowerCase().trim();
        
        if (inputNombre === 'luyuromo') {
          $('pantallaAuth').classList.add('oculto');
          $('contenedorPrincipal').style.display = ''; // Revelar la fiesta
          
          crearFondoEstrellas();
          iniciarIntroCanvas();
          iniciarAuraRegalo();
          cargarFraseDia();
          showToast('✅ Identidad confirmada. Bienvenida, mi Luna.');
        } else {
          $('msgErrorAuth').style.display = 'block';
          $('inputNombreAuth').value = '';
          setTimeout(() => { $('msgErrorAuth').style.display = 'none'; }, 3000);
        }
      });

      $('inputNombreAuth').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
          event.preventDefault(); 
          $('btnVerificarAuth').click(); 
        }
      });
    }
  }) 
  .catch(() => {
    crearFondoEstrellas();
    iniciarIntroCanvas();
    iniciarAuraRegalo();
    cargarFraseDia();
  });

/* ══════════════════════════════════════════════════════════════
   12 · BUZÓN EN PANTALLA DE BLOQUEO
   ══════════════════════════════════════════════════════════════ */
$('btnEnviarBloqueo')?.addEventListener('click', function() {
  const input = $('textoSecretoBloqueo');
  const msg   = input.value.trim();
  if (!msg) { showToast('✍️ Escribe un mensaje primero...'); return; }
  this.innerText = 'Enviando... ✨'; this.disabled = true;
  fetch('/api/responder', { method:'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ mensaje: msg })
  })
  .then(r => r.json())
  .then(d  => { showToast('💌 ' + d.respuesta); input.value = ''; })
  .catch(() => { showToast('✨ Guardado mágicamente.'); input.value = ''; })
  .finally(() => { this.innerText = 'Enviar a las estrellas ✨'; this.disabled = false; });
});

/* ══════════════════════════════════════════════════════════════
   13 · ABRIR REGALO
   ══════════════════════════════════════════════════════════════ */
$('botonRegalo')?.addEventListener('click', function() {
  this.classList.add('abriendo-caja');

  const intro = $('introAnimada');
  if (intro) { intro.style.opacity = '0'; intro.style.transition = 'opacity .5s'; setTimeout(() => intro.remove(), 500); }

  const musica = $('musicaFondo');
  if (musica) { musica.volume = .5; musica.play().catch(() => {}); }

  crearGlobos();

  setTimeout(() => {
    this.style.display = 'none';
    fetch('/api/abrir_regalo')
      .then(r => r.json())
      .then(mostrarFiesta)
      .catch(() => mostrarFiesta({
        titulo: '¡Feliz Cumpleaños! 🎉',
        estadisticas: 'Eres la persona más brillante de mi universo.',
        mensajes: ['Eres increíble y te mereces lo mejor.', 'Que este año esté lleno de amor y alegría.'],
        firma: 'Con amor, Frank',
      }));
  }, 900);
}, { once: true });

/* ══════════════════════════════════════════════════════════════
   14 · BUZÓN SECRETO (fiesta)
   ══════════════════════════════════════════════════════════════ */
$('btnEnviarSecreto')?.addEventListener('click', function() {
  const input = $('textoSecreto');
  const msg   = input.value.trim();
  if (!msg) { showToast('✍️ Escribe un mensaje primero...'); return; }
  this.innerText = 'Enviando... ✨'; this.disabled = true;
  fetch('/api/responder', { method:'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ mensaje: msg })
  })
  .then(r => r.json())
  .then(d => {
    showToast('🌙 ' + d.respuesta);
    if (msg.toLowerCase().includes('luna')) setTimeout(activarEasterEggLuna, 600);
    input.value = '';
  })
  .catch(() => { showToast('✨ Mensaje guardado mágicamente.'); input.value = ''; })
  .finally(() => { this.innerText = 'Enviar a las estrellas ✨'; this.disabled = false; });
});

/* ══════════════════════════════════════════════════════════════
   15 · FRASE DEL DÍA
   ══════════════════════════════════════════════════════════════ */
async function cargarFraseDia() {
  try {
    const d = await (await fetch('/api/frase_del_dia')).json();
    let el = $('fraseDia');
    if (!el) {
      el = document.createElement('div'); el.id = 'fraseDia';
      $('contenedorPrincipal')?.prepend(el);
    }
    el.innerHTML = `✨ <em>"${d.frase}"</em>`;
    setTimeout(() => { el.style.opacity = '1'; }, 300);
  } catch(_) {}
}

/* ══════════════════════════════════════════════════════════════
   16 · EASTER EGG — DETECCIÓN POR TECLADO
   ══════════════════════════════════════════════════════════════ */
let entradaTeclado = '';
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // CORRECCIÓN: Usar toLowerCase() antes de validar para atrapar teclas en mayúscula
  const key = e.key.toLowerCase();
  
  if (key.length === 1 && key >= 'a' && key <= 'z') {
    entradaTeclado = (entradaTeclado + key).slice(-10); 
    
    if (entradaTeclado.endsWith('luna')) { 
        activarEasterEggLuna(); 
        entradaTeclado = ''; 
    }
    
    if (entradaTeclado.endsWith('frank')) { 
        showToast("✨ Él te ama más que a nada en el universo...", 4000);
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 60, spread: 90, colors: ['#4287f5', '#0afab0', '#ffffff'], origin: { y: 0.9 }});
        }
        entradaTeclado = ''; 
    }

    if (entradaTeclado.endsWith('amor')) {
        crearGlobos(); 
        showToast("💖 El amor está en el aire...");
        entradaTeclado = '';
    }
  }
});

/* ══════════════════════════════════════════════════════════════
   17 · EASTER EGG — ESCENA DE LA LUNA Y ESTADOS SEGUROS
   ══════════════════════════════════════════════════════════════ */
let easterEggActivo = false;
let canvasLunaAnim  = null;

// Objeto para memorizar en qué pantalla estábamos
let estadoPrevioEasterEgg = {
    bloqueo: false,
    auth: false,
    principal: false
};

function crearCorazonesLuna() {
  const escena = $('escenaLuna');
  for (let i = 0; i < 25; i++) {
    const c = document.createElement('div');
    c.classList.add('corazon-estrella');
    c.innerText = ['🤍','💙','🌙'][Math.floor(Math.random()*3)];
    Object.assign(c.style, {
      fontSize: `${Math.random()*1.5+.5}rem`,
      left: `${Math.random()*100}vw`, top: `${Math.random()*100}vh`,
      animation: `titilarCorazon ${Math.random()*3+2}s ease-in-out ${Math.random()*2}s infinite`,
    });
    escena.appendChild(c);
  }
}

function iniciarEfectosLuna() {
  const escena  = $('escenaLuna');
  const luna    = $('contenedorLuna');
  const tierra  = $('planetaTierra');
  const neb     = document.querySelector('.nebulosa-fondo');

  document.addEventListener('mousemove', e => {
    if (escena.style.display !== 'flex') return;
    const xP = (e.clientX / window.innerWidth  - .5) * 30;
    const yP = (e.clientY / window.innerHeight - .5) * 30;
    if (typeof gsap !== 'undefined') {
      gsap.to(luna,   { x: xP*2,  y: yP*2,  duration:1.2, ease:'power2.out' });
      gsap.to(tierra, { x: xP,    y: yP,    duration:1.8, ease:'power2.out' });
      gsap.to(neb,    { x:-xP*3,  y:-yP*3,  duration:2.5, ease:'power1.out' });
    }
  });

  document.addEventListener('mousemove', e => {
    if (escena.style.display !== 'flex' || Math.random() > .3) return;
    const p = document.createElement('div');
    p.classList.add('polvo-estrellas');
    Object.assign(p.style, { left: (e.clientX-3)+'px', top: (e.clientY-3)+'px' });
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  });

  setInterval(() => {
    if (escena.style.display !== 'flex') return;
    const f = document.createElement('div');
    f.classList.add('estrella-fugaz-din');
    Object.assign(f.style, {
      left: `${Math.random()*50+50}vw`,
      top:  `${Math.random()*40}vh`,
    });
    escena.appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }, 3500);

  escena.addEventListener('click', e => {
    if (e.target.closest('#lunaInteractiva') || e.target.id === 'btnCerrarLuna') return;
    const s = document.createElement('div');
    s.classList.add('estrella-fija');
    Object.assign(s.style, {
      left: `${e.clientX-2}px`, top: `${e.clientY-2}px`, position: 'fixed',
    });
    escena.appendChild(s);
  });
}

$('lunaInteractiva')?.addEventListener('click', function(e) {
  e.stopPropagation();
  const onda = document.createElement('div');
  onda.classList.add('onda-luz');
  $('contenedorLuna').appendChild(onda);
  setTimeout(() => onda.remove(), 1500);
  mostrarPoemaLuna();
});

// CORRECCIÓN: Al cerrar la Luna, retornamos EXCELENTEMENTE a la pantalla en que estábamos
$('btnCerrarLuna')?.addEventListener('click', () => {
  const escena = $('escenaLuna');
  const mLuna  = $('musicaLuna');
  
  if (typeof gsap !== 'undefined') {
    gsap.to(escena, { opacity:0, duration:1.2, ease:'power2.in',
      onComplete: () => { escena.style.display = 'none'; escena.style.opacity = ''; }
    });
  } else {
    escena.style.display = 'none';
  }
  
  if (mLuna) { mLuna.pause(); mLuna.currentTime = 0; }
  
  // RESTAURAR ESTADO PREVIO (Previene el bypass de bloqueo)
  const bloqueo = $('pantallaBloqueo');
  const auth = $('pantallaAuth');
  const principal = $('contenedorPrincipal');

  if (estadoPrevioEasterEgg.bloqueo && bloqueo) bloqueo.classList.remove('oculto');
  if (estadoPrevioEasterEgg.auth && auth) auth.classList.remove('oculto');
  if (estadoPrevioEasterEgg.principal && principal) principal.style.display = '';

  easterEggActivo = false;

  // Restaurar Música de fondo suavemente solo si estábamos en la fiesta principal
  const mF = $('musicaFondo');
  if (mF && estadoPrevioEasterEgg.principal) {
    mF.play().catch(()=>{});
    const iv = setInterval(() => {
      mF.volume = Math.min(0.5, mF.volume + 0.05);
      if(mF.volume >= 0.5) clearInterval(iv);
    }, 200);
  }
});

function activarEasterEggLuna() {
  if (easterEggActivo) return;
  easterEggActivo = true;

  // GUARDAR ESTADO ACTUAL
  const bloqueo = $('pantallaBloqueo');
  const auth = $('pantallaAuth');
  const principal = $('contenedorPrincipal');

  estadoPrevioEasterEgg.bloqueo = bloqueo && !bloqueo.classList.contains('oculto');
  estadoPrevioEasterEgg.auth = auth && !auth.classList.contains('oculto');
  estadoPrevioEasterEgg.principal = principal && principal.style.display !== 'none';

  // Ocultar de forma segura la pista secreta
  const pista = $('pistaSecreta');
  if (pista) pista.style.display = 'none';

  // OCULTAR LAS OTRAS PANTALLAS DE FORMA SEGURA
  if (bloqueo) bloqueo.classList.add('oculto');
  if (auth) auth.classList.add('oculto');
  if (principal) principal.style.display = 'none';

  // Fade-out música fondo
  const mF = $('musicaFondo');
  if (mF) {
    const iv = setInterval(() => {
      mF.volume = Math.max(0, mF.volume - .08);
      if (mF.volume <= 0) { clearInterval(iv); mF.pause(); } // mF.currentTime=0 removido para no reiniciar
    }, 180);
  }

  // Fade-in música luna
  const mL = $('musicaLuna');
  if (mL) {
    mL.volume = 0; mL.play().catch(() => {});
    const iv = setInterval(() => {
      mL.volume = Math.min(.6, mL.volume + .06);
      if (mL.volume >= .6) clearInterval(iv);
    }, 200);
  }

  const escena = $('escenaLuna');
  escena.style.display = 'flex';
  crearCorazonesLuna();
  iniciarEfectosLuna();

  if (typeof gsap === 'undefined') {
    $('planetaTierra').style.opacity = '.6';
    document.querySelector('.luna-realista').style.opacity = '1';
    document.querySelector('.nombre-luna-titulo').style.opacity = '1';
    return;
  }

  const tl = gsap.timeline();
  tl.to('#planetaTierra', { opacity:.55, bottom:'-38vh', duration:4, ease:'power2.out' })
    .fromTo('.luna-realista',
      { scale:0, opacity:0, rotation:-45 },
      { scale:1, opacity:1, rotation:0, duration:3, ease:'back.out(1.7)' }, '-=2.5')
    .to('.nombre-luna-titulo', {
      opacity:1, letterSpacing: window.innerWidth<768 ? '8px' : '18px',
      duration:3, ease:'power1.inOut'
    }, '-=1');

  const frases = [
    'Eres mi luna...',
    'La que ilumina mis noches más oscuras.',
    'Quien me guía con su luz inquebrantable.',
    'Mi refugio y mi paz.',
    'Cada vez que la miro, te veo a ti.',
    'Toca la luna para sentir su luz...',
    'Te amo.',
  ];

  // Null check agregado para las frases poeticas
  const cf = $('frasesPoeticas');
  if (cf) {
      frases.forEach(f => {
        tl.call(() => { cf.innerText = f; })
          .fromTo(cf, { opacity:0, y:25 }, { opacity:1, y:0, duration:2, ease:'power1.out' })
          .to(cf, { opacity:1, duration:4 })
          .to(cf, { opacity:0, y:-20, duration:1.5, ease:'power1.in' });
      });
  }
}

/* ══════════════════════════════════════════════════════════════
   18 · MODAL DE POEMA
   ══════════════════════════════════════════════════════════════ */
async function mostrarPoemaLuna() {
  try {
    const d = await (await fetch('/api/poema')).json();
    let modal = $('modalPoema');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'modalPoema';
      Object.assign(modal.style, {
        position:'fixed', inset:'0', zIndex:'99999',
        background:'rgba(2,4,10,.93)', display:'flex', flexDirection:'column',
        justifyContent:'center', alignItems:'center', padding:'30px',
        opacity:'0', transition:'opacity .8s ease', backdropFilter:'blur(14px)',
      });
      modal.innerHTML = `
        <div style="max-width:480px;width:100%;background:rgba(255,255,255,.04);
          border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:35px 30px;
          font-family:'IM Fell English',serif;text-align:center;">
          <h2 id="poemaTitulo" style="font-family:'Playfair Display',serif;color:#ff6b81;font-size:1.6rem;margin-bottom:18px;"></h2>
          <div id="poemaVersos" style="line-height:2.1;font-size:1.05rem;color:#f0e8ff;font-style:italic;"></div>
          <div style="margin-top:26px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button id="btnOtroPoema" style="background:rgba(255,107,129,.2);color:#ff6b81;border:1px solid rgba(255,107,129,.4);padding:10px 22px;border-radius:50px;cursor:pointer;font-family:'Playfair Display',serif;font-size:.95rem;transition:all .3s;">Otro poema ✨</button>
            <button id="btnCerrarPoema" style="background:rgba(255,255,255,.06);color:#cbd5e1;border:1px solid rgba(255,255,255,.1);padding:10px 22px;border-radius:50px;cursor:pointer;font-size:.9rem;transition:all .3s;">Cerrar</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      $('btnCerrarPoema').addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; }, 600);
      });
      $('btnOtroPoema').addEventListener('click', mostrarPoemaLuna);
    }
    $('poemaTitulo').innerText = d.titulo;
    $('poemaVersos').innerHTML = d.versos.map(v => v===''?'<br>':`<p style="margin:2px 0;">${v}</p>`).join('');
    modal.style.display = 'flex';
    setTimeout(() => { modal.style.opacity = '1'; }, 10);
  } catch(_) { showToast('🌙 Tu luz llega hasta mí...'); }
}

/* ══════════════════════════════════════════════════════════════
   19 · CURSOR PERSONALIZADO Y BURSTS
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const cur  = $('cursor');
  const ring = $('cursor-ring');
  let rx = 0, ry = 0;

  if (cur && ring) {
    document.addEventListener('mousemove', e => {
      cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
      rx += (e.clientX - rx) * .18; ry += (e.clientY - ry) * .18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    });
    document.addEventListener('mousedown', () => { cur.style.transform = 'translate(-50%,-50%) scale(.7)'; });
    document.addEventListener('mouseup',   () => { cur.style.transform = 'translate(-50%,-50%) scale(1)'; });
  }

  const EMOJIS = ['🎉','🌟','✨','💫','💕','🌙','🤍'];
  document.addEventListener('click', e => {
    if (['BUTTON','INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    const el = document.createElement('div'); el.className = 'burst';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
    const ang = Math.random() * Math.PI * 2, dst = 50 + Math.random() * 65;
    el.style.setProperty('--tx', Math.cos(ang)*dst + 'px');
    el.style.setProperty('--ty', Math.sin(ang)*dst + 'px');
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  });
});

/* ══════════════════════════════════════════════════════════════
   20 · BADGE DE VISITAS
   ══════════════════════════════════════════════════════════════ */
async function mostrarVisitas() {
  try {
    const d = await (await fetch('/api/visitas')).json();
    const b = document.createElement('div');
    Object.assign(b.style, {
      position:'fixed', bottom:'16px', right:'16px',
      background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
      borderRadius:'50px', padding:'6px 14px', fontSize:'.75rem', color:'#94a3b8',
      zIndex:'500', cursor:'default', backdropFilter:'blur(8px)',
    });
    b.innerHTML = `🌙 ${d.total} visitas`;
    b.title = `Hoy: ${d.hoy}`;
    document.body.appendChild(b);
  } catch(_) {}
}

setTimeout(() => {
  if (!$('pantallaBloqueo') || $('pantallaBloqueo').classList.contains('oculto')) {
    mostrarVisitas();
  }
}, 2000);