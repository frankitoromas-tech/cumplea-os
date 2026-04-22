/**
 * JuegoCorazones.js — Juego interactivo de atrapar corazones
 * Arquitectura: BaseJuego → JuegoCorazones
 * Se carga en index.html después de script.js (no lo modifica)
 */
'use strict';

/* ──────────────────────────────────────────────────────────────
   CLASE BASE: BaseJuego
   Provee el loop de animación, resize, y canvas compartido
   ────────────────────────────────────────────────────────────── */
class BaseJuego {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx     = this.canvas.getContext('2d');
    this.corriendo = false;
    this.animId    = null;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    if (!this.canvas) return;
    const rect       = this.canvas.getBoundingClientRect();
    this.W           = this.canvas.width  = rect.width  || 400;
    this.H           = this.canvas.height = rect.height || 400;
  }

  _loop() {
    if (!this.corriendo) return;
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(() => this._loop());
  }

  iniciar()  { this.corriendo = true;  this._loop(); }
  pausar()   { this.corriendo = false; cancelAnimationFrame(this.animId); }
  destruir() { this.pausar(); this.canvas = null; }

  /** Sobreescribir en subclase */
  update() {}
  draw()   { this.ctx.clearRect(0, 0, this.W, this.H); }
}


/* ──────────────────────────────────────────────────────────────
   CLASE HIJA: JuegoCorazones
   Hereda BaseJuego, añade lógica de atrapar corazones
   ────────────────────────────────────────────────────────────── */
class JuegoCorazones extends BaseJuego {
  constructor(canvasId, onPuntos, onFin) {
    super(canvasId);
    this.onPuntos = onPuntos || (() => {});
    this.onFin    = onFin    || (() => {});

    // Config (se puede sobrescribir con /api/juego_corazones_config)
    this.cfg = {
      velocidadInicial: 2.5,
      vidas:            3,
      puntosPorCorazon: 10,
      bonusCombo:       5,
      emojis:           ['💕','🤍','💙','🌙','✨','💫','💖'],
    };

    this.puntos      = 0;
    this.vidasRestantes = this.cfg.vidas;
    this.combo       = 0;
    this.nivel       = 1;
    this.corazones   = [];
    this.particulas  = [];
    this.juegoTerminado = false;
    this.mouseX = -999; this.mouseY = -999;
    this._bindEventos();
  }

  // Cargar config desde la API
  async cargarConfig() {
    try {
      const r = await fetch('/api/juego_corazones_config');
      const d = await r.json();
      this.cfg.velocidadInicial = d.velocidad_inicial ?? this.cfg.velocidadInicial;
      this.cfg.vidas            = d.vidas            ?? this.cfg.vidas;
      this.cfg.puntosPorCorazon = d.puntos_por_corazon ?? this.cfg.puntosPorCorazon;
      this.cfg.bonusCombo       = d.bonus_combo       ?? this.cfg.bonusCombo;
      this.cfg.emojis           = d.emojis            ?? this.cfg.emojis;
      this.vidasRestantes       = this.cfg.vidas;
    } catch (_) {}
    return this;
  }

  _bindEventos() {
    if (!this.canvas) return;
    const handler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scX  = this.W / rect.width;
      const scY  = this.H / rect.height;
      const cx   = e.type.includes('touch')
        ? (e.touches[0].clientX - rect.left) * scX
        : (e.clientX - rect.left) * scX;
      const cy   = e.type.includes('touch')
        ? (e.touches[0].clientY - rect.top) * scY
        : (e.clientY - rect.top) * scY;
      this._intentarAtrapar(cx, cy);
    };
    this.canvas.addEventListener('click',     handler);
    this.canvas.addEventListener('touchstart', handler, { passive: true });
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (this.W / rect.width);
      this.mouseY = (e.clientY - rect.top)  * (this.H / rect.height);
    });
  }

  _spawnCorazon() {
    const vel = (this.cfg.velocidadInicial + this.nivel * 0.4) * (0.8 + Math.random() * 0.5);
    this.corazones.push({
      x:      10 + Math.random() * (this.W - 20),
      y:     -30,
      vy:     vel,
      vx:     (Math.random() - 0.5) * 0.8,
      r:      20 + Math.random() * 18,
      emoji:  this.cfg.emojis[Math.floor(Math.random() * this.cfg.emojis.length)],
      rot:    (Math.random() - 0.5) * 0.1,
      angulo: 0,
    });
  }

  _intentarAtrapar(cx, cy) {
    if (this.juegoTerminado) return;
    for (let i = this.corazones.length - 1; i >= 0; i--) {
      const c = this.corazones[i];
      if (Math.hypot(cx - c.x, cy - c.y) < c.r + 10) {
        this.corazones.splice(i, 1);
        this.combo++;
        const bonus = this.combo >= 3 ? this.cfg.bonusCombo : 0;
        const ganados = this.cfg.puntosPorCorazon + bonus;
        this.puntos += ganados;
        this.onPuntos(this.puntos, this.combo, ganados);
        this._explotar(cx, cy, c.emoji);
        if (this.puntos >= this.nivel * 100) this.nivel++;
        break;
      }
    }
  }

  _explotar(x, y, emoji) {
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 / 8) * i;
      this.particulas.push({
        x, y, emoji,
        vx:   Math.cos(ang) * (2 + Math.random() * 3),
        vy:   Math.sin(ang) * (2 + Math.random() * 3) - 2,
        vida: 1,
        r:    10 + Math.random() * 8,
      });
    }
  }

  // ── update ────────────────────────────────────────────────
  update() {
    if (this.juegoTerminado) return;

    // Spawn según nivel
    const probSpawn = 0.025 + this.nivel * 0.008;
    if (Math.random() < probSpawn) this._spawnCorazon();

    // Mover corazones
    for (let i = this.corazones.length - 1; i >= 0; i--) {
      const c = this.corazones[i];
      c.y += c.vy; c.x += c.vx; c.angulo += c.rot;
      if (c.y > this.H + 30) {
        this.corazones.splice(i, 1);
        this.vidasRestantes--;
        this.combo = 0;
        if (this.vidasRestantes <= 0) {
          this.juegoTerminado = true;
          this.pausar();
          this.onFin(this.puntos);
        }
      }
    }

    // Actualizar partículas
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      p.vida -= 0.04;
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }
  }

  // ── draw ─────────────────────────────────────────────────
  draw() {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    // Fondo con gradiente
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H) * .7);
    bg.addColorStop(0, 'rgba(20,5,35,.95)');
    bg.addColorStop(1, 'rgba(4,7,26,1)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Vidas
    ctx.font = '18px serif';
    ctx.textAlign = 'left';
    ctx.fillText('❤️'.repeat(this.vidasRestantes), 10, 28);

    // Nivel
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(245,200,66,.8)';
    ctx.font = 'bold 14px "Playfair Display",serif';
    ctx.fillText(`Nivel ${this.nivel}`, W - 10, 28);

    // Corazones
    this.corazones.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angulo);
      ctx.font = `${c.r * 1.4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Brillo al pasar el mouse cerca
      const dist = Math.hypot(this.mouseX - c.x, this.mouseY - c.y);
      if (dist < 60) {
        ctx.shadowColor = 'rgba(255,107,129,.9)';
        ctx.shadowBlur  = 20;
      }
      ctx.fillText(c.emoji, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Partículas
    this.particulas.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.vida;
      ctx.font = `${p.r}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x, p.y);
      ctx.restore();
    });

    // Combo badge
    if (this.combo >= 3) {
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(245,200,66,${Math.min(1, (this.combo-2) * 0.2)})`;
      ctx.font = `bold ${14 + this.combo}px "Playfair Display",serif`;
      ctx.fillText(`¡COMBO x${this.combo}! 🔥`, W/2, H - 30);
    }

    // Pantalla de fin
    if (this.juegoTerminado) {
      ctx.fillStyle = 'rgba(4,7,26,.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b81';
      ctx.font = 'bold 22px "Playfair Display",serif';
      ctx.fillText('¡Juego terminado!', W/2, H/2 - 30);
      ctx.fillStyle = '#f5c842';
      ctx.font = '18px "Cormorant Garamond",serif';
      ctx.fillText(`Puntuación: ${this.puntos} ✨`, W/2, H/2 + 10);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.font = 'italic 14px "Cormorant Garamond",serif';
      ctx.fillText('Toca para jugar de nuevo', W/2, H/2 + 45);
    }
  }
}


/* ──────────────────────────────────────────────────────────────
   INICIALIZACIÓN DEL JUEGO en la página
   Espera a que #contenidoSorpresa sea visible
   ────────────────────────────────────────────────────────────── */
(function montarJuegoCorazones() {
  // Creamos el contenedor del juego dinámicamente
  function crearInterfazJuego(padre) {
    const wrapper = document.createElement('div');
    wrapper.id    = 'wrapperJuegoCorazones';
    wrapper.style.cssText = `
      margin:40px auto; max-width:420px; text-align:center;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.1);
      border-radius:20px; padding:20px;
      backdrop-filter:blur(12px);
    `;
    wrapper.innerHTML = `
      <h3 style="font-family:'Playfair Display',serif;color:#ff6b81;font-size:1.2rem;margin-bottom:6px;">
        🎮 Atrapa los Corazones
      </h3>
      <p style="font-size:.85rem;color:#94a3b8;font-style:italic;margin-bottom:12px;">
        Toca los corazones antes de que caigan. ¡3 fallos y termina!
      </p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 10px;">
        <span style="font-family:'Playfair Display',serif;color:#f5c842;font-size:1.1rem;">
          Puntos: <strong id="puntosJuego">0</strong>
        </span>
        <span id="comboDisplay" style="font-size:.8rem;color:rgba(255,255,255,.5);"></span>
      </div>
      <canvas id="canvasCorazones" width="380" height="320"
        style="display:block;margin:0 auto;border-radius:12px;
               background:rgba(4,7,26,.8);max-width:100%;cursor:crosshair;
               touch-action:none;"></canvas>
      <button id="btnReiniciarJuego" style="
        display:none;margin-top:12px;
        background:linear-gradient(135deg,#ff4757,#ff6b81);
        color:white;border:none;padding:10px 24px;border-radius:50px;
        font-family:'Playfair Display',serif;font-size:.95rem;cursor:pointer;">
        Jugar de nuevo ✨
      </button>
    `;
    padre.appendChild(wrapper);
    return wrapper;
  }

  function iniciarJuego() {
    const wrapper   = document.getElementById('wrapperJuegoCorazones');
    const puntosEl  = document.getElementById('puntosJuego');
    const comboEl   = document.getElementById('comboDisplay');
    const btnRei    = document.getElementById('btnReiniciarJuego');

    let juego = new JuegoCorazones(
      'canvasCorazones',
      (pts, combo, ganados) => {   // onPuntos
        puntosEl.textContent = pts;
        if (combo >= 3) {
          comboEl.textContent = `🔥 ¡Combo x${combo}!`;
          comboEl.style.color = '#f5c842';
        }
        if (typeof showToast === 'function') {
          if (combo === 5)  showToast('💕 ¡Combo x5! +' + ganados + ' pts', 2000);
          if (combo === 10) showToast('🌟 ¡COMBO x10! Increíble', 2500);
        }
      },
      (puntajeF) => {              // onFin
        btnRei.style.display = 'inline-block';
        // Notificar si puntuación es buena
        if (puntajeF >= 200) {
          fetch('/api/responder', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({mensaje: `🎮 ¡Luyuromo hizo ${puntajeF} puntos en el juego de corazones! 🏆`})
          }).catch(() => {});
        }
      }
    );

    juego.cargarConfig().then(() => juego.iniciar());

    btnRei.addEventListener('click', () => {
      btnRei.style.display = 'none';
      puntosEl.textContent = '0';
      comboEl.textContent  = '';
      juego.destruir();
      juego = new JuegoCorazones(
        'canvasCorazones',
        (pts, combo, ganados) => {
          puntosEl.textContent = pts;
          if (combo >= 3) { comboEl.textContent = `🔥 ¡Combo x${combo}!`; comboEl.style.color = '#f5c842'; }
        },
        (puntajeF) => { btnRei.style.display = 'inline-block'; }
      );
      juego.cargarConfig().then(() => juego.iniciar());
    });
  }

  // Esperar a que #collageMemorias se muestre (después de la animación principal)
  const obs = new MutationObserver(() => {
    const collage = document.getElementById('collageMemorias');
    if (collage && !collage.classList.contains('oculto')) {
      if (!document.getElementById('wrapperJuegoCorazones')) {
        const sorpresa = document.getElementById('contenidoSorpresa');
        if (sorpresa) {
          crearInterfazJuego(sorpresa);
          iniciarJuego();
        }
      }
      obs.disconnect();
    }
  });
  obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
})();