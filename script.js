document.getElementById('botonRegalo').addEventListener('click', function() {
    // 1. Ocultamos el botón de la caja
    this.style.display = 'none';

    // 2. Llamamos a nuestra ruta de Python (Flask)
    fetch('/api/abrir_regalo')
        .then(respuesta => respuesta.json())
        .then(datos => {
            // 3. Inyectamos los datos del objeto de Python en el HTML
            document.getElementById('tituloMensaje').innerText = datos.titulo;
            
            const contenedorMensajes = document.getElementById('listaMensajes');
            datos.mensajes.forEach(mensaje => {
                let parrafo = document.createElement('p');
                parrafo.innerText = "✨ " + mensaje;
                contenedorMensajes.appendChild(parrafo);
            });

            document.getElementById('firmaMensaje').innerText = datos.firma;
            
            // 4. Mostramos el div con la animación CSS
            let sorpresa = document.getElementById('contenidoSorpresa');
            sorpresa.classList.remove('oculto');
            sorpresa.classList.add('mostrar');
        })
        .catch(error => {
            console.error('Hubo un error al abrir el regalo:', error);
        });
        // Función para generar el fondo de estrellas basado en tu imagen
function crearFondoEstrellas() {
    const cantidadEstrellas = 150;
    // Colores basados en tu imagen de referencia: Rosados y Amarillos
    const colores = ['#ff007f', '#ff1493', '#ffd700', '#ffea00']; 
    
    for (let i = 0; i < cantidadEstrellas; i++) {
        let estrella = document.createElement('div');
        estrella.classList.add('estrella');
        
        // Tamaño aleatorio entre 5px y 15px
        let tamaño = Math.random() * 10 + 5; 
        estrella.style.width = `${tamaño}px`;
        estrella.style.height = `${tamaño}px`;
        
        // Color aleatorio de la paleta
        estrella.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        
        // Posición aleatoria en la pantalla
        estrella.style.left = `${Math.random() * 100}vw`;
        
        // Concentramos más estrellas en la parte superior, como en tu imagen
        let posTop = Math.random() < 0.7 ? (Math.random() * 40) : (Math.random() * 100);
        estrella.style.top = `${posTop}vh`;
        
        // Velocidad de titileo aleatoria
        let duracionAnimacion = Math.random() * 3 + 1.5;
        estrella.style.animation = `titilar ${duracionAnimacion}s infinite ease-in-out`;
        
        document.body.appendChild(estrella);
    }
}

// Ejecutamos la función al cargar la página
crearFondoEstrellas();
});