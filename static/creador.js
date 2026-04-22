function iniciarCreadorConstelaciones() {
    const canvas = document.getElementById('canvasCreador');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let puntos = [];

    // Estilo del lienzo
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        puntos.push({x, y});
        dibujar();
    });

    function dibujar() {
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Limpiar
        
        // Dibujar líneas
        if (puntos.length > 1) {
            ctx.beginPath();
            ctx.moveTo(puntos[0].x, puntos[0].y);
            for (let i = 1; i < puntos.length; i++) {
                ctx.lineTo(puntos[i].x, puntos[i].y);
            }
            ctx.strokeStyle = 'rgba(255, 107, 129, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Dibujar estrellas
        puntos.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f5c842';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.fill();
        });
    }

    // Botón para guardar
    document.getElementById('btnGuardarConstelacion')?.addEventListener('click', () => {
        if (puntos.length < 3) {
            alert('¡Dibuja al menos 3 estrellas para formar una constelación!');
            return;
        }
        
        fetch('/api/guardar_constelacion', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nombre: "Constelación de Luyuromo", puntos: puntos })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.mensaje);
            puntos = []; // Limpiamos tras guardar
            dibujar();
        });
    });
}

document.addEventListener('DOMContentLoaded', iniciarCreadorConstelaciones);