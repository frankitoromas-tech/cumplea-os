// Función para generar el fondo de estrellas (La sacamos afuera para que inicie de inmediato)
function crearFondoEstrellas() {
    const cantidadEstrellas = 150;
    const colores = ['#ff007f', '#ff1493', '#ffd700', '#ffea00']; 
    for (let i = 0; i < cantidadEstrellas; i++) {
        let estrella = document.createElement('div');
        estrella.classList.add('estrella');
        let tamaño = Math.random() * 10 + 5; 
        estrella.style.width = `${tamaño}px`;
        estrella.style.height = `${tamaño}px`;
        estrella.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        estrella.style.left = `${Math.random() * 100}vw`;
        let posTop = Math.random() < 0.7 ? (Math.random() * 40) : (Math.random() * 100);
        estrella.style.top = `${posTop}vh`;
        let duracionAnimacion = Math.random() * 3 + 1.5;
        estrella.style.animation = `titilar ${duracionAnimacion}s infinite ease-in-out`;
        document.body.appendChild(estrella);
    }
}
crearFondoEstrellas(); // Encendemos las estrellas al cargar la página

// Función para crear la lluvia de globos
function crearLluviaDeGlobos() {
    const cantidadGlobos = 40;
    const emojisGlobos = ['🎈', '🎊', '🎉', '🎁'];
    
    for (let i = 0; i < cantidadGlobos; i++) {
        let globo = document.createElement('div');
        globo.classList.add('globo');
        globo.innerText = emojisGlobos[Math.floor(Math.random() * emojisGlobos.length)];
        
        // Posición horizontal aleatoria
        globo.style.left = `${Math.random() * 100}vw`;
        
        // Cada globo cae a diferente velocidad y con distinto retraso
        let duracionCaida = Math.random() * 3 + 4; // Entre 4 y 7 segundos
        let retrasoCaida = Math.random() * 5; // Retraso de 0 a 5 segundos para que no caigan todos de golpe
        
        globo.style.animation = `caer ${duracionCaida}s ${retrasoCaida}s linear infinite`;
        
        document.body.appendChild(globo);
    }
}

// Evento cuando se hace clic en la caja de regalo
document.getElementById('botonRegalo').addEventListener('click', function() {
    // 1. Ocultamos el botón de la caja
    this.style.display = 'none';

    // 2. REPRODUCIR LA MÚSICA DE FONDO
    let musica = document.getElementById('musicaFondo');
    musica.volume = 0.5; // Volumen al 50%
    musica.play().catch(e => console.log("El navegador bloqueó el autoplay", e));

    // 3. ACTIVAR LOS GLOBOS
    crearLluviaDeGlobos();

    // 4. Llamamos a nuestra ruta de Python (Flask)
    fetch('/api/abrir_regalo')
        .then(respuesta => respuesta.json())
        .then(datos => {
            // Inyectamos los datos del objeto
            document.getElementById('tituloMensaje').innerText = datos.titulo;
            
            const contenedorMensajes = document.getElementById('listaMensajes');
            contenedorMensajes.innerHTML = ''; // Limpiamos por seguridad
            datos.mensajes.forEach(mensaje => {
                let parrafo = document.createElement('p');
                parrafo.innerText = "✨ " + mensaje;
                contenedorMensajes.appendChild(parrafo);
            });

            document.getElementById('firmaMensaje').innerText = datos.firma;
            
            // Mostramos el div con la animación CSS
            let sorpresa = document.getElementById('contenidoSorpresa');
            sorpresa.classList.remove('oculto');
            sorpresa.classList.add('mostrar');
        })
        .catch(error => {
            console.error('Hubo un error al abrir el regalo:', error);
        });
});