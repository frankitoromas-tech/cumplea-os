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

    btn.addEventListener('click', () => {
        btn.innerText = 'Consultando a las estrellas...';
        btn.disabled = true;

        fetch('/api/capsula')
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