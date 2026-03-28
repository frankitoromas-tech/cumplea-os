// --- 1. FONDO DE ESTRELLAS ---
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

// --- 2. LLUVIA DE GLOBOS INTERACTIVOS ---
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
        
        // Magia para reventar globos
        globo.addEventListener('click', function() {
            this.classList.add('globo-reventado');
            this.innerText = '💥'; 
            setTimeout(() => this.remove(), 300); 
        });

        document.body.appendChild(globo);
    }
}

// --- 3. EFECTO MÁQUINA DE ESCRIBIR ---
function escribirMaquina(mensajes, contenedor, indexMensaje = 0, callbackFinal = null) {
    if (indexMensaje >= mensajes.length) {
        if (callbackFinal) callbackFinal();
        return;
    }

    let parrafo = document.createElement('p');
    contenedor.appendChild(parrafo);
    
    let textoCompleto = "✨ " + mensajes[indexMensaje];
    let indexLetra = 0;

    let cursor = document.createElement('span');
    cursor.classList.add('cursor-parpadeo');
    parrafo.appendChild(cursor);

    let intervalo = setInterval(() => {
        parrafo.innerText = textoCompleto.substring(0, indexLetra + 1);
        parrafo.appendChild(cursor);
        indexLetra++;

        if (indexLetra === textoCompleto.length) {
            clearInterval(intervalo);
            cursor.remove(); 
            setTimeout(() => {
                escribirMaquina(mensajes, contenedor, indexMensaje + 1, callbackFinal);
            }, 600);
        }
    }, 45); 
}

// --- 4. EVENTO PRINCIPAL DEL REGALO ---
document.getElementById('botonRegalo').addEventListener('click', function() {
    let boton = this;
    boton.classList.add('abriendo-caja'); // Animación de la caja

    let estrellas = document.querySelectorAll('.estrella');
    estrellas.forEach(estrella => estrella.style.animation = 'none');

    let musica = document.getElementById('musicaFondo');
    musica.volume = 0.5;
    musica.play().catch(e => console.log("Autoplay bloqueado", e));

    setTimeout(() => {
        boton.style.display = 'none';
        crearLluviaDeGlobos();

        fetch('/api/abrir_regalo')
            .then(respuesta => respuesta.json())
            .then(datos => {
                document.getElementById('tituloMensaje').innerText = datos.titulo;
                
                let sorpresa = document.getElementById('contenidoSorpresa');
                sorpresa.classList.remove('oculto');
                sorpresa.classList.add('mostrar');

                const contenedorMensajes = document.getElementById('listaMensajes');
                contenedorMensajes.innerHTML = ''; 

                escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
                    let firma = document.getElementById('firmaMensaje');
                    firma.innerText = datos.firma;
                    firma.classList.remove('oculto');
                    firma.classList.add('mostrar'); 
                });
            })
            .catch(error => console.error('Error:', error));
    }, 800);
});

// --- 5. CÓDIGO SECRETO (EASTER EGG 'LUNA') ---
let entradaTeclado = "";

document.addEventListener('keydown', function(evento) {
    let tecla = evento.key.toLowerCase();
    
    if (tecla.length === 1 && tecla >= 'a' && tecla <= 'z') {
        entradaTeclado += tecla;
        
        if (entradaTeclado.length > 4) {
            entradaTeclado = entradaTeclado.substring(entradaTeclado.length - 4);
        }
        
        if (entradaTeclado === "luna") {
            activarEasterEggLuna();
            entradaTeclado = ""; 
        }
    }
});
// Función para crear el fondo de estrellas con forma de corazón
function crearEstrellasCorazon() {
    const cantidadCorazones = 40; // Cuántos corazones quieres que aparezcan
    const escenaLuna = document.getElementById('escenaLuna');

    for (let i = 0; i < cantidadCorazones; i++) {
        let corazon = document.createElement('div');
        corazon.classList.add('corazon-estrella');
        corazon.innerText = '🤍'; // Puedes cambiarlo por '💖' o '✨' si prefieres
        
        // Tamaño aleatorio para que se vea más natural
        let tamaño = Math.random() * 1.5 + 0.5; 
        corazon.style.fontSize = `${tamaño}rem`;
        
        // Posición aleatoria por toda la pantalla
        corazon.style.left = `${Math.random() * 100}vw`;
        corazon.style.top = `${Math.random() * 100}vh`;
        
        // Cada corazón parpadea a una velocidad ligeramente diferente
        let duracionAnimacion = Math.random() * 3 + 2; // Entre 2 y 5 segundos
        let retraso = Math.random() * 2; // No empiezan todos al mismo tiempo
        corazon.style.animation = `titilarCorazon ${duracionAnimacion}s ease-in-out ${retraso}s infinite`;
        
        // Los metemos dentro de la escena de la luna
        escenaLuna.appendChild(corazon);
    }
}
function activarEasterEggLuna() {
    console.log("¡Easter Egg 'Luna' activado! 🌕");

    let musica = document.getElementById('musicaFondo');
    musica.pause();
    musica.currentTime = 0; 

    // Ocultamos el regalo normal
    let contenedorNormal = document.querySelector('.contenedor');
    contenedorNormal.style.display = 'none';

    // Limpiamos los globos por si estaban cayendo
    let globos = document.querySelectorAll('.globo');
    globos.forEach(globo => globo.remove());

    // Activamos la escena
    let escenaLuna = document.getElementById('escenaLuna');
    escenaLuna.classList.add('activar-luna'); 
    
    setTimeout(() => {
        escenaLuna.classList.add('animar-luna'); 
    }, 100);

}
function activarEasterEggLuna() {
    console.log("¡Easter Egg 'Luna' activado! 🌕");

    let musica = document.getElementById('musicaFondo');
    musica.pause();
    musica.currentTime = 0; 

    // Ocultamos el regalo normal y limpiamos globos
    let contenedorNormal = document.querySelector('.contenedor');
    contenedorNormal.style.display = 'none';
    let globos = document.querySelectorAll('.globo');
    globos.forEach(globo => globo.remove());

    // Activamos la escena espacial
    let escenaLuna = document.getElementById('escenaLuna');
    escenaLuna.classList.add('activar-luna'); 
    
    // Animamos la luna
    setTimeout(() => {
        escenaLuna.classList.add('animar-luna'); 
    }, 100);
    // (Tu código anterior dentro de la función)
    setTimeout(() => {
        escenaLuna.classList.add('animar-luna'); 
    }, 100);

    // NUEVO: Activamos los corazones de fondo para que aparezcan suavemente
    setTimeout(() => {
        crearEstrellasCorazon();
    }, 2000); // Aparecen 2 segundos después de teclear, mientras la luna se acomoda

    // --- MAGIA DE LA POESÍA ---
    // (El resto de tu código de las frases se mantiene igual...)

    // --- MAGIA DE LA POESÍA ---
    // Aquí puedes editar las frases como tú quieras
    let frases = [
        "Eres mi luna...",
        "La que ilumina mis noches más oscuras.",
        "Quien me guía con su luz inquebrantable.",
        "Mi refugio y mi compañera de vida.",
        "Cada recuerdo a tu lado es una estrella más en mi universo.",
        "Gracias por hacer nuestra historia tan hermosa.",
        "Te amo."
    ];

    let contenedorFrases = document.getElementById('frasesPoeticas');
    let indexFrase = 0;

    // Esperamos 5 segundos a que la Luna termine de cruzarse para empezar a hablar
    setTimeout(() => {
        mostrarSiguienteFrase();
    }, 5000);

    function mostrarSiguienteFrase() {
        if (indexFrase >= frases.length) return; // Si ya no hay frases, termina

        // Colocamos el texto de la frase actual
        contenedorFrases.innerText = frases[indexFrase];
        
        // La hacemos aparecer (fade in)
        contenedorFrases.classList.add('visible'); 

        // La dejamos visible en pantalla por 4 segundos
        setTimeout(() => {
            // La hacemos desaparecer (fade out)
            contenedorFrases.classList.remove('visible'); 
            indexFrase++;
            
            // Pausa en total oscuridad de 1.5 segundos antes de mostrar la siguiente
            setTimeout(() => {
                mostrarSiguienteFrase();
            }, 1500); 
            
        }, 4000); 
    }
}
