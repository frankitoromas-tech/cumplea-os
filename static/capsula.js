// Función aislada que no interfiere con tu script.js
function inicializarCapsula() {
    const contenedor = document.getElementById('capsulaTiempoContenedor');
    if (!contenedor) return;

    const btn = document.createElement('button');
    btn.className = 'caja-regalo'; // Reutilizamos tus estilos
    btn.style.padding = '10px 20px';
    btn.style.marginTop = '20px';
    btn.innerText = 'Desenterrar Cápsula del Tiempo 📦';
    
    const respuestaDiv = document.createElement('div');
    respuestaDiv.style.marginTop = '15px';
    respuestaDiv.style.fontStyle = 'italic';

    const pageParams = new URLSearchParams(window.location.search);
    const passthrough = new URLSearchParams();
    ['preview_state', 'preview_open_at', 'preview_client'].forEach((k) => {
        const v = pageParams.get(k);
        if (v) passthrough.set(k, v);
    });
    const capsulaUrl = passthrough.toString()
        ? `/api/capsula?${passthrough.toString()}`
        : '/api/capsula';

    const previewClient = ['1', 'true', 'on', 'yes']
        .includes((pageParams.get('preview_client') || '').toLowerCase());

    function resolverCapsulaCliente() {
        if (!previewClient) return null;
        const estado = (pageParams.get('preview_state') || '').trim().toLowerCase();
        const customRaw = (pageParams.get('preview_open_at') || '').trim();
        if (estado === 'open' || estado === 'abierta') {
            return { estado: 'abierta', titulo: 'Cápsula en modo preview', mensaje: 'Vista previa forzada: cápsula abierta.' };
        }
        if (estado === 'locked' || estado === 'cerrada') {
            return { estado: 'cerrada', mensaje: 'Vista previa forzada: cápsula cerrada.' };
        }
        if (customRaw) {
            const t = new Date(customRaw).getTime();
            if (!Number.isNaN(t) && Date.now() < t) {
                return { estado: 'cerrada', mensaje: 'Vista previa custom: cápsula aún cerrada.' };
            }
            return { estado: 'abierta', titulo: 'Cápsula en modo preview', mensaje: 'Vista previa custom: cápsula abierta.' };
        }
        return { estado: 'abierta', titulo: 'Cápsula en modo preview', mensaje: 'Vista previa cliente activa.' };
    }

    btn.addEventListener('click', () => {
        btn.innerText = 'Consultando a las estrellas...';
        btn.disabled = true;

        const localPreview = resolverCapsulaCliente();
        if (localPreview) {
            if (localPreview.estado === 'abierta') {
                respuestaDiv.innerHTML = `
                    <h3 style="color: #ff6b81; font-family: 'Playfair Display', serif;">${localPreview.titulo}</h3>
                    <p style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px;">${localPreview.mensaje}</p>
                `;
            } else {
                respuestaDiv.innerHTML = `<p style="color: #94a3b8;">🔒 ${localPreview.mensaje}</p>`;
            }
            btn.innerText = 'Cápsula revisada ✨';
            return;
        }

        fetch(capsulaUrl)
            .then(res => res.json())
            .then(data => {
                if (data.estado === 'abierta') {
                    respuestaDiv.innerHTML = `
                        <h3 style="color: #ff6b81; font-family: 'Playfair Display', serif;">${data.titulo}</h3>
                        <p style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px;">${data.mensaje}</p>
                    `;
                } else {
                    respuestaDiv.innerHTML = `<p style="color: #94a3b8;">🔒 ${data.mensaje}</p>`;
                }
                btn.innerText = 'Cápsula revisada ✨';
            })
            .catch(() => {
                respuestaDiv.innerText = 'Hubo una interferencia espacial. Intenta luego.';
                btn.disabled = false;
            });
    });

    contenedor.appendChild(btn);
    contenedor.appendChild(respuestaDiv);
}

// Se ejecuta solo cuando la página ha cargado
document.addEventListener('DOMContentLoaded', inicializarCapsula);
