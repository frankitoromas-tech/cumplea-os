/**
 * EasterEggManager.js — Gestión centralizada de Easter Eggs
 * Clases: EasterEggBase → EasterEggTeclado, EasterEggClic, EasterEggKonami
 * No modifica script.js
 */
'use strict';

/* ──────────────────────────────────────────────────────────────
   CLASE BASE: EasterEggBase
   ────────────────────────────────────────────────────────────── */
class EasterEggBase {
  constructor(nombre) {
    this.nombre   = nombre;
    this.activo   = false;
    this.usado    = false;
    this.cooldown = 8000; // ms entre activaciones
    this._lastActivacion = 0;
  }

  puedeActivar() {
    return !this.activo && (Date.now() - this._lastActivacion > this.cooldown);
  }

  activar() {
    if (!this.puedeActivar()) return false;
    this.activo = true;
    this._lastActivacion = Date.now();
    this._ejecutar();
    return true;
  }

  _ejecutar() { /* sobreescribir */ }

  _notificar(evento) {
    fetch('/api/notificar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({evento})
    }).catch(()=>{});
  }

  _particulas(emojis, cantidad = 20, duracion = 2500) {
    for (let i = 0; i < cantidad; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.style.cssText = `
          position:fixed;
          left:${Math.random()*100}vw;
          top:${-5+Math.random()*30}vh;
          font-size:${1+Math.random()*2}rem;
          pointer-events:none; z-index:9988;
          animation:konamiCaer ${1.5+Math.random()*2}s ease forwards;
          animation-delay:${Math.random()*.4}s;
        `;
        p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
        document.body.appendChild(p);
        setTimeout(() => p.remove(), duracion);
      }, i * 60);
    }
  }
}


/* ──────────────────────────────────────────────────────────────
   CLASE HIJA: EasterEggTeclado — detecta palabras escritas
   ────────────────────────────────────────────────────────────── */
class EasterEggTeclado extends EasterEggBase {
  constructor(nombre, palabraSecreta, callback) {
    super(nombre);
    this.palabraSecreta = palabraSecreta.toLowerCase();
    this.callback       = callback;
    this._buffer        = '';
    this._bindTeclado();
  }

  _bindTeclado() {
    document.addEventListener('keydown', e => {
      if (e.key.length !== 1 || e.key < 'a' || e.key > 'z') return;
      this._buffer = (this._buffer + e.key.toLowerCase()).slice(-this.palabraSecreta.length);
      if (this._buffer === this.palabraSecreta) {
        this._buffer = '';
        this.activar();
      }
    });
  }

  _ejecutar() {
    this.callback?.();
    setTimeout(() => { this.activo = false; }, this.cooldown);
  }
}


/* ──────────────────────────────────────────────────────────────
   CLASE HIJA: EasterEggKonami
   ────────────────────────────────────────────────────────────── */
class EasterEggKonami extends EasterEggBase {
  constructor() {
    super('konami');
    this.cooldown = 15000;
    this._seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                 'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    this._buf = [];
    this._bindTeclado();
  }

  _bindTeclado() {
    document.addEventListener('keydown', e => {
      this._buf.push(e.key);
      if (this._buf.length > this._seq.length) this._buf.shift();
      if (this._buf.join(',') === this._seq.join(',')) {
        this._buf = [];
        this.activar();
      }
    });
  }

  _ejecutar() {
    // Lluvia masiva de emojis
    this._particulas(['🌙','💕','✨','💫','🌟','🎉','🤍','💙','⭐','🎊'], 70, 5000);
    // Flash de luz
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.06);z-index:9987;pointer-events:none;animation:aparecer .3s ease reverse both;';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
    // Toast
    if (typeof showToast === 'function') showToast('🌟 ¡CÓDIGO KONAMI! ↑↑↓↓←→←→BA 🌟', 4500);
    this._notificar('konami');
    setTimeout(() => { this.activo = false; }, this.cooldown);
  }
}


/* ──────────────────────────────────────────────────────────────
   CLASE HIJA: EasterEggClic — detecta clics múltiples en un elemento
   ────────────────────────────────────────────────────────────── */
class EasterEggClic extends EasterEggBase {
  constructor(nombre, selectorElemento, clicsNecesarios, callback) {
    super(nombre);
    this.selectorElemento = selectorElemento;
    this.clicsNecesarios  = clicsNecesarios;
    this.callback         = callback;
    this._clics           = 0;
    this._resetTimer      = null;
    this._bindClic();
  }

  _bindClic() {
    document.addEventListener('click', e => {
      if (!e.target.closest(this.selectorElemento)) return;
      this._clics++;
      clearTimeout(this._resetTimer);
      this._resetTimer = setTimeout(() => { this._clics = 0; }, 3000);
      if (this._clics >= this.clicsNecesarios) {
        this._clics = 0;
        this.activar();
      }
    });
  }

  _ejecutar() {
    this.callback?.();
    setTimeout(() => { this.activo = false; }, this.cooldown);
  }
}


/* ──────────────────────────────────────────────────────────────
   REGISTRO DE TODOS LOS EASTER EGGS NUEVOS
   (los de script.js siguen funcionando sin tocarse)
   ────────────────────────────────────────────────────────────── */
(function registrarEasterEggs() {
  // EE: Escribir "frank"
  new EasterEggTeclado('frank', 'frank', () => {
    if (typeof window._activarEEFrank === 'function') window._activarEEFrank();
    fetch('/api/notificar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({evento:'frank'})
    }).catch(()=>{});
  });

  // EE: Escribir "amor"
  new EasterEggTeclado('amor', 'amor', () => {
    const emojis = ['💕','💖','💗','💓','💞','🌹','🤍'];
    // Crear lluvia de emojis de amor
    for (let i = 0; i < 25; i++) {
      setTimeout(() => {
        const p = document.createElement('div');
        p.style.cssText = `
          position:fixed;
          left:${Math.random()*100}vw;
          top:${Math.random()*100}vh;
          font-size:${1.5+Math.random()*2}rem;
          pointer-events:none; z-index:9985;
          opacity:0;
          animation:fadeInLlovizna ${.5+Math.random()*.5}s ease forwards,
                    fadeOutLlovizna 1s ease ${.8+Math.random()}s forwards;
        `;
        p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 2500);
      }, i * 80);
    }
    if (typeof showToast === 'function') showToast('💕 ¡Amor detectado! 💕', 3000);

    // Añadir keyframes si no existen
    if (!document.getElementById('ks-llovizna')) {
      const s = document.createElement('style');
      s.id = 'ks-llovizna';
      s.textContent = `
        @keyframes fadeInLlovizna  { from{opacity:0;transform:scale(0)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeOutLlovizna { from{opacity:1} to{opacity:0;transform:translateY(20px)} }
      `;
      document.head.appendChild(s);
    }
  });

  // EE: Escribir "estrella"
  new EasterEggTeclado('estrella', 'estrella', () => {
    if (typeof showToast === 'function') showToast('🌟 ¡Eres mi estrella favorita! 🌟', 4000);
    // Explotar estrellas desde el centro
    for (let i = 0; i < 30; i++) {
      const ang = (Math.PI * 2 / 30) * i;
      const vel = 3 + Math.random() * 5;
      const star = document.createElement('div');
      star.style.cssText = `
        position:fixed; left:50vw; top:50vh;
        font-size:${1+Math.random()}rem;
        pointer-events:none; z-index:9985;
        --vx:${Math.cos(ang)*vel*20}px;
        --vy:${Math.sin(ang)*vel*20}px;
        animation:explotarEstrella 1.5s ease forwards;
        animation-delay:${Math.random()*.2}s;
      `;
      star.textContent = ['⭐','🌟','✨','💫'][Math.floor(Math.random()*4)];
      document.body.appendChild(star);
      setTimeout(() => star.remove(), 2000);
    }
    if (!document.getElementById('ks-estrella')) {
      const s = document.createElement('style');
      s.id = 'ks-estrella';
      s.textContent = `
        @keyframes explotarEstrella {
          0%  { opacity:1; transform:translate(0,0) scale(1); }
          100%{ opacity:0; transform:translate(var(--vx),var(--vy)) scale(.3); }
        }
      `;
      document.head.appendChild(s);
    }
  });

  // EE Konami
  new EasterEggKonami();

  // EE: 7 clics en el pastel
  new EasterEggClic('pastel7', '.pastel-animado', 7, () => {
    const el = document.getElementById('eePastelMsg');
    if (el) {
      el.classList.add('visible');
      setTimeout(() => el.classList.remove('visible'), 4500);
    }
    if (typeof confetti !== 'undefined') {
      confetti({ particleCount:130, spread:200, origin:{y:.6},
                 colors:['#ff6b81','#f5c842','#0afab0','#fff','#ff4757'] });
    }
    if (typeof showToast === 'function') showToast('🎂 ¡7 clics! ¡Pastel secreto! 🎂', 4000);
    fetch('/api/notificar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({evento:'pastel_secreto'})
    }).catch(()=>{});
  });
})();