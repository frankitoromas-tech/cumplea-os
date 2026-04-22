/**
 * NavigadorPaginas.js — Barra de navegación flotante entre páginas
 * Clase: NavigadorPaginas (independiente, no toca script.js)
 * Aparece después de abrir el regalo.
 */
'use strict';

class NavigadorPaginas {
  constructor() {
    this.paginas = [
      { href:'/carta',     emoji:'💌', label:'Carta',    tooltip:'Una carta escrita para ti' },
      { href:'/universo',  emoji:'🌌', label:'Universo', tooltip:'Nuestro sistema solar' },
      { href:'/aurora',    emoji:'🌠', label:'Aurora',   tooltip:'La aurora boreal interactiva' },
      { href:'/timeline',  emoji:'📖', label:'Historia', tooltip:'Nuestra línea del tiempo' },
    ];
    this.visible   = false;
    this.container = null;
  }

  _crearHTML() {
    const nav = document.createElement('div');
    nav.id = 'navFlotante';
    nav.style.cssText = `
      position:fixed; bottom:24px; left:50%;
      transform:translateX(-50%) translateY(100px);
      z-index:500; display:flex; gap:10px;
      background:rgba(4,7,26,.85);
      border:1px solid rgba(255,255,255,.1);
      border-radius:50px; padding:8px 14px;
      backdrop-filter:blur(16px);
      box-shadow:0 8px 40px rgba(0,0,0,.4);
      transition:transform .5s cubic-bezier(.34,1.56,.64,1), opacity .4s ease;
      opacity:0;
    `;

    this.paginas.forEach(p => {
      const a = document.createElement('a');
      a.href  = p.href;
      a.title = p.tooltip;
      a.target = '_blank';
      a.rel    = 'noopener';
      a.style.cssText = `
        display:inline-flex; flex-direction:column; align-items:center;
        gap:2px; text-decoration:none; padding:6px 14px; border-radius:40px;
        color:rgba(255,255,255,.7); font-family:'Playfair Display',serif;
        font-size:.75rem; transition:all .3s ease; white-space:nowrap;
      `;
      a.innerHTML = `<span style="font-size:1.3rem;">${p.emoji}</span><span>${p.label}</span>`;
      a.addEventListener('mouseenter', () => {
        a.style.background = 'rgba(255,107,129,.15)';
        a.style.color = 'white';
        a.style.transform = 'translateY(-4px)';
      });
      a.addEventListener('mouseleave', () => {
        a.style.background = '';
        a.style.color = 'rgba(255,255,255,.7)';
        a.style.transform = '';
      });
      nav.appendChild(a);
    });

    return nav;
  }

  mostrar() {
    if (this.visible) return;
    this.container = this._crearHTML();
    document.body.appendChild(this.container);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.container.style.transform = 'translateX(-50%) translateY(0)';
        this.container.style.opacity   = '1';
      });
    });
    this.visible = true;
  }

  ocultar() {
    if (!this.container) return;
    this.container.style.transform = 'translateX(-50%) translateY(100px)';
    this.container.style.opacity   = '0';
    setTimeout(() => { this.container?.remove(); this.container = null; }, 500);
    this.visible = false;
  }
}

// Inicializar y mostrar cuando se revele la firma del regalo
(function iniciarNavegador() {
  const nav = new NavigadorPaginas();
  const obs = new MutationObserver(() => {
    const firma = document.getElementById('firmaMensaje');
    if (firma && !firma.classList.contains('oculto')) {
      setTimeout(() => nav.mostrar(), 2000);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { attributes:true, subtree:true, attributeFilter:['class'] });
})();