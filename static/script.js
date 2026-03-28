// --- 1. FONDO DE ESTRELLAS Y CORAZONES ---
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

function crearEstrellasCorazon() {
    const cantidadCorazones = 40; 
    const escenaLuna = document.getElementById('escenaLuna');

    for (let i = 0; i < cantidadCorazones; i++) {
        let corazon = document.createElement('div');
        corazon.classList.add('corazon-estrella');
        corazon.innerText = '🤍'; 
        let tamaño = Math.random() * 1.5 + 0.5; 
        corazon.style.fontSize = `${tamaño}rem`;
        corazon.style.left = `${Math.random() * 100}vw`;
        corazon.style.top = `${Math.random() * 100}vh`;
        let duracionAnimacion = Math.random() * 3 + 2; 
        let retraso = Math.random() * 2; 
        corazon.style.animation = `titilarCorazon ${duracionAnimacion}s ease-in-out ${retraso}s infinite`;
        escenaLuna.appendChild(corazon);
    }
}

// --- 2. LLUVIA DE GLOBOS ---
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
        
        // Explotar al hacer clic
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
    boton.classList.add('abriendo-caja'); 

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

// --- 5. EASTER EGG LUNA Y POESÍA ---
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

function activarEasterEggLuna() {
    console.log("¡Easter Egg 'Luna' activado! 🌕");

    // Cambiar música
    let musicaFondo = document.getElementById('musicaFondo');
    if (musicaFondo) {
        musicaFondo.pause();
        musicaFondo.currentTime = 0; 
    }
    
    let musicaLuna = document.getElementById('musicaLuna');
    if (musicaLuna) {
        musicaLuna.volume = 0.5;
        musicaLuna.play().catch(e => console.log("Autoplay bloqueado", e));
    }

    // Ocultar caja y limpiar globos
    let contenedorNormal = document.querySelector('.contenedor');
    if (contenedorNormal) contenedorNormal.style.display = 'none';
    
    let globos = document.querySelectorAll('.globo');
    globos.forEach(globo => globo.remove());

    // Mostrar escena
    let escenaLuna = document.getElementById('escenaLuna');
    escenaLuna.classList.add('activar-luna'); 
    
    setTimeout(() => {
        escenaLuna.classList.add('animar-luna'); 
    }, 100);

    setTimeout(() => {
        crearEstrellasCorazon();
    }, 2000); 

    // Poesía
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

    setTimeout(() => {
        mostrarSiguienteFrase();
    }, 5000);

    function mostrarSiguienteFrase() {
        if (indexFrase >= frases.length) return; 

        contenedorFrases.innerText = frases[indexFrase];
        contenedorFrases.classList.add('visible'); 

        setTimeout(() => {
            contenedorFrases.classList.remove('visible'); 
            indexFrase++;
            setTimeout(() => {
                mostrarSiguienteFrase();
            }, 1500); 
        }, 4000); 
    }
}