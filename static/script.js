// 1. Fondo de Estrellas (Se mantiene igual)
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
crearFondoEstrellas();

// 2. Lluvia de Globos INTERACTIVOS
function crearLluviaDeGlobos() {
    const cantidadGlobos = 45;
    const emojisGlobos = ['🎈', '🎊', '🎉', '🎁'];
    
    for (let i = 0; i < cantidadGlobos; i++) {
        let globo = document.createElement('div');
        globo.classList.add('globo');
        globo.innerText = emojisGlobos[Math.floor(Math.random() * emojisGlobos.length)];
        globo.style.left = `${Math.random() * 100}vw`;
        
        let duracionCaida = Math.random() * 4 + 5; 
        let retrasoCaida = Math.random() * 5; 
        globo.style.animation = `caer ${duracionCaida}s ${retrasoCaida}s linear infinite`;
        
        // ¡LA MAGIA DE REVENTAR GLOBOS!
        globo.addEventListener('click', function() {
            this.classList.add('globo-reventado');
            this.innerText = '💥'; // Cambia el emoji al reventar
            setTimeout(() => this.remove(), 300); // Lo borra después de la animación
        });

        document.body.appendChild(globo);
    }
}

// 3. Efecto Máquina de Escribir Recursivo
function escribirMaquina(mensajes, contenedor, indexMensaje = 0, callbackFinal = null) {
    if (indexMensaje >= mensajes.length) {
        if (callbackFinal) callbackFinal();
        return;
    }

    let parrafo = document.createElement('p');
    contenedor.appendChild(parrafo);
    
    let textoCompleto = "✨ " + mensajes[indexMensaje];
    let indexLetra = 0;

    // Añadimos un cursor temporal
    let cursor = document.createElement('span');
    cursor.classList.add('cursor-parpadeo');
    parrafo.appendChild(cursor);

    let intervalo = setInterval(() => {
        // Actualizamos el texto y mantenemos el cursor al final
        parrafo.innerText = textoCompleto.substring(0, indexLetra + 1);
        parrafo.appendChild(cursor);
        indexLetra++;

        if (indexLetra === textoCompleto.length) {
            clearInterval(intervalo);
            cursor.remove(); // Quitamos el cursor de esta línea
            
            // Pausa breve antes de escribir la siguiente línea
            setTimeout(() => {
                escribirMaquina(mensajes, contenedor, indexMensaje + 1, callbackFinal);
            }, 600);
        }
    }, 45); // Velocidad de escritura (45ms por letra)
}

// 4. Evento Principal al hacer clic en el regalo
document.getElementById('botonRegalo').addEventListener('click', function() {
    let boton = this;
    
    // Animación 3D de la caja abriéndose
    boton.classList.add('abriendo-caja');

    // Reproducir música
    let musica = document.getElementById('musicaFondo');
    musica.volume = 0.5;
    musica.play().catch(e => console.log("Autoplay bloqueado", e));

    // Esperamos 800ms a que termine la animación de la caja antes de ocultarla
    setTimeout(() => {
        boton.style.display = 'none';
        crearLluviaDeGlobos();

        // Traemos los datos de Python
        fetch('/api/abrir_regalo')
            .then(respuesta => respuesta.json())
            .then(datos => {
                document.getElementById('tituloMensaje').innerText = datos.titulo;
                
                let sorpresa = document.getElementById('contenidoSorpresa');
                sorpresa.classList.remove('oculto');
                sorpresa.classList.add('mostrar');

                // Iniciamos la máquina de escribir
                const contenedorMensajes = document.getElementById('listaMensajes');
                contenedorMensajes.innerHTML = ''; 

                escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
                    // Cuando termina de escribir todos los mensajes, revelamos la firma
                    let firma = document.getElementById('firmaMensaje');
                    firma.innerText = datos.firma;
                    firma.classList.remove('oculto');
                    firma.classList.add('mostrar'); // Reutilizamos la animación de aparecer
                });
            })
            .catch(error => console.error('Error:', error));
    }, 800);
});