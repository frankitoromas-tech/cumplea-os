/* ══════════════════════════════════════════════════════════════
   preview-mode.js — Bypass cliente del bloqueo (solo para testing)
   ──────────────────────────────────────────────────────────────
   Activación: añade ?preview=1 a la URL (ej: http://localhost:5000/?preview=1)
   Lo que hace SOLO en cliente, sin tocar backend ni script.js:
     1. Oculta #pantallaBloqueo y #pantallaAuth (les añade .oculto)
     2. Muestra #contenedorPrincipal
     3. Llama a /api/abrir_regalo y popula #contenidoSorpresa con la
        respuesta del backend (igual que el flujo real al desbloquear)
     4. Muestra un banner discreto "MODO PREVIEW" arriba para que
        no confundas tu sesión real con la de prueba
   No deja rastro en sessionStorage ni en backend.
   ══════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('preview') !== '1') return;
  if (window.__previewMode) return;
  window.__previewMode = true;

  function go() {
    // 1) Esconder pantallas bloqueantes
    document.getElementById('pantallaBloqueo')?.classList.add('oculto');
    document.getElementById('pantallaAuth')?.classList.add('oculto');

    // 2) Mostrar contenedor principal
    const main = document.getElementById('contenedorPrincipal');
    if (main) main.classList.remove('oculto');

    // 3) Mostrar contenido sorpresa y poblarlo
    const sorpresa = document.getElementById('contenidoSorpresa');
    const intro    = document.getElementById('introAnimada');
    const boton    = document.getElementById('botonRegalo');
    if (sorpresa) sorpresa.classList.remove('oculto');
    // Mantener la intro visible los primeros 1.5s para que veas el efecto
    setTimeout(() => {
      intro?.style && (intro.style.display = 'none');
      boton?.style && (boton.style.display = 'none');
    }, 1500);

    // Llamar al endpoint real para tener el contenido real
    fetch('/api/abrir_regalo')
      .then(r => r.json())
      .then(payload => {
        const d = payload?.data || payload;
        if (!d) return;
        const t = document.getElementById('tituloMensaje');
        const e = document.getElementById('estadisticasAstro');
        const l = document.getElementById('listaMensajes');
        const f = document.getElementById('firmaMensaje');
        if (t) t.textContent = d.titulo || '';
        if (e) e.textContent = d.estadisticas || '';
        if (l && Array.isArray(d.mensajes)) {
          l.innerHTML = d.mensajes
            .map(m => `<p class="mensaje">${m}</p>`).join('');
        }
        if (f) {
          f.textContent = d.firma || '';
          f.classList.remove('oculto');
        }
        document.getElementById('collageMemorias')?.classList.remove('oculto');
        document.getElementById('buzonSecreto')?.classList.remove('oculto');
      })
      .catch(() => { /* sin red, igual se ve la estructura */ });

    // 4) Banner de aviso
    const banner = document.createElement('div');
    banner.id = 'previewBanner';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
      padding: '6px 14px', textAlign: 'center',
      background: 'linear-gradient(90deg, #ff6b81, #f5c842)',
      color: '#04071a', fontFamily: 'Cormorant Garamond, serif',
      fontWeight: '700', letterSpacing: '2px', fontSize: '.78rem',
      textTransform: 'uppercase',
      boxShadow: '0 2px 14px rgba(0,0,0,.35)',
    });
    banner.innerHTML = '✦ Modo preview · Bypass de bloqueo · ' +
      '<a href="' + location.pathname + '" style="color:#04071a;text-decoration:underline">salir</a> ✦';
    document.body.appendChild(banner);

    document.documentElement.dataset.previewMode = '1';
    console.info('[preview] activo. Capa inmersiva visible.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
