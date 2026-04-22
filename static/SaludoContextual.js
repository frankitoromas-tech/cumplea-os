/**
 * SaludoContextual.js — Saludo dinámico según hora del día
 * Clase independiente, no modifica script.js
 * Se inyecta en la pantalla de acceso (pantallaAuth)
 */
'use strict';

class SaludoContextual {
  constructor(contenedorId) {
    this.el = document.getElementById(contenedorId);
    this.intervalo = null;
  }

  async _cargarDatos() {
    try {
      const r = await fetch('/api/momento_dia');
      return await r.json();
    } catch (_) {
      return { momento:'día', emoji:'🌙', saludo:'Bienvenida, mi luna.' };
    }
  }

  _crearUI(datos) {
    if (!this.el) return;
    // Insertar un saludo contextual bonito en el contenedor destino
    const div = document.createElement('div');
    div.id = 'saludoContextual';
    div.style.cssText = `
      margin-bottom:18px; padding:14px 20px;
      background:rgba(255,255,255,.04);
      border:1px solid rgba(255,255,255,.08);
      border-radius:14px; font-style:italic;
      color:rgba(255,255,255,.7); font-size:1rem;
      font-family:'IM Fell English',serif;
      animation:fadeInSaludo .8s ease both;
    `;
    div.innerHTML = `${datos.emoji} <em>"${datos.saludo}"</em>`;
    // Insertar antes del input
    const inputEl = this.el.querySelector('.input-auth, #inputNombreAuth');
    if (inputEl) {
      inputEl.parentNode.insertBefore(div, inputEl);
    } else {
      this.el.prepend(div);
    }

    // Añadir keyframes si no existen
    if (!document.getElementById('ks-fade-saludo')) {
      const style = document.createElement('style');
      style.id = 'ks-fade-saludo';
      style.textContent = `
        @keyframes fadeInSaludo {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  async iniciar() {
    const datos = await this._cargarDatos();
    this._crearUI(datos);
    // Actualizar título de la pantalla auth con el emoji correcto
    const titulo = document.querySelector('#pantallaAuth h2');
    if (titulo) {
      titulo.textContent = `Seguridad Estelar ${datos.emoji}`;
    }
    return this;
  }
}

// Lanzar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const pantallaAuth = document.getElementById('pantallaAuth');
  if (pantallaAuth) {
    const saludo = new SaludoContextual('pantallaAuth');
    // Esperar hasta que pantallaAuth sea visible
    const obs = new MutationObserver(() => {
      if (!pantallaAuth.classList.contains('oculto')) {
        saludo.iniciar();
        obs.disconnect();
      }
    });
    obs.observe(pantallaAuth, { attributes:true, attributeFilter:['class'] });
  }
});