// --- 1. FONDO DE ESTRELLAS Y CORAZONES ---
function crearFondoEstrellas() {
    const cantidadEstrellas = 150;
    const colores = ['#ff007f', '#ff1493', '#ffd700', '#ffea00']; 
    for (let i = 0; i < cantidadEstrellas; i++) {
        let estrella = document.createElement('div');
        estrella.classList.add('estrella');
        let tamaño = Math.random() * 10 + 5; 
        estrella.style.width = `${tamaño}px`; estrella.style.height = `${tamaño}px`;
        estrella.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        estrella.style.left = `${Math.random() * 100}vw`;
        let posTop = Math.random() < 0.7 ? (Math.random() * 40) : (Math.random() * 100);
        estrella.style.top = `${posTop}vh`;
        estrella.style.animation = `titilar ${Math.random() * 3 + 1.5}s infinite ease-in-out`;
        document.body.appendChild(estrella);
    }
}
crearFondoEstrellas();

function crearEstrellasCorazon() {
    const escenaLuna = document.getElementById('escenaLuna');
    for (let i = 0; i < 40; i++) {
        let corazon = document.createElement('div');
        corazon.classList.add('corazon-estrella');
        corazon.innerText = '🤍'; 
        corazon.style.fontSize = `${Math.random() * 1.5 + 0.5}rem`;
        corazon.style.left = `${Math.random() * 100}vw`; corazon.style.top = `${Math.random() * 100}vh`;
        corazon.style.animation = `titilarCorazon ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 2}s infinite`;
        escenaLuna.appendChild(corazon);
    }
}

// --- 2. JUEGO DE VELAS Y CONFETI ---
function lanzarConfeti() {
    const colores = ['#ff0a54', '#ff477e', '#ffd166', '#06d6a0', '#118ab2', '#ffcc00'];
    for(let i=0; i < 80; i++) {
        let confeti = document.createElement('div');
        confeti.classList.add('confeti');
        confeti.style.left = Math.random() * 100 + 'vw';
        confeti.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        confeti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confeti.style.animationDelay = (Math.random() * 1) + 's';
        document.body.appendChild(confeti);
        setTimeout(() => confeti.remove(), 4000); // Limpia el confeti después de caer
    }
}

function activarVelas() {
    let velasApagadas = 0;
    let llamas = document.querySelectorAll('.llama');
    
    // Función que apaga la vela al detectarla
    function apagar(evento) {
        if (!this.classList.contains('apagada')) {
            this.classList.add('apagada');
            velasApagadas++;
            if (velasApagadas === llamas.length) {
                document.getElementById('instruccionPastel').innerText = "¡Deseo Concedido! ✨";
                lanzarConfeti();
            }
        }
    }
    
    // Escucha el mouse en PC y el dedo en celular
    llamas.forEach(llama => {
        llama.addEventListener('mouseenter', apagar);
        llama.addEventListener('touchmove', apagar);
    });
}

// --- 3. GLOBOS Y MÁQUINA DE ESCRIBIR ---
function crearLluviaDeGlobos() {
    const emojisGlobos = ['🎈', '🎊', '🎉', '🎁'];
    for (let i = 0; i < 45; i++) {
        let globo = document.createElement('div');
        globo.classList.add('globo');
        globo.innerText = emojisGlobos[Math.floor(Math.random() * emojisGlobos.length)];
        globo.style.left = `${Math.random() * 100}vw`;
        globo.style.animation = `caer ${Math.random() * 4 + 5}s ${Math.random() * 5}s linear infinite`;
        globo.addEventListener('click', function() {
            this.classList.add('globo-reventado');
            this.innerText = '💥'; 
            setTimeout(() => this.remove(), 300); 
        });
        document.body.appendChild(globo);
    }
}

function escribirMaquina(mensajes, contenedor, indexMensaje = 0, callbackFinal = null) {
    if (indexMensaje >= mensajes.length) {
        if (callbackFinal) callbackFinal();
        return;
    }
    let parrafo = document.createElement('p'); contenedor.appendChild(parrafo);
    let textoCompleto = "✨ " + mensajes[indexMensaje];
    let indexLetra = 0;
    let cursor = document.createElement('span'); cursor.classList.add('cursor-parpadeo'); parrafo.appendChild(cursor);

    let intervalo = setInterval(() => {
        parrafo.innerText = textoCompleto.substring(0, indexLetra + 1); parrafo.appendChild(cursor);
        indexLetra++;
        if (indexLetra === textoCompleto.length) {
            clearInterval(intervalo); cursor.remove(); 
            setTimeout(() => { escribirMaquina(mensajes, contenedor, indexMensaje + 1, callbackFinal); }, 600);
        }
    }, 45); 
}

// --- 4. EVENTO PRINCIPAL DEL REGALO ---
document.getElementById('botonRegalo').addEventListener('click', function() {
    let boton = this;
    boton.classList.add('abriendo-caja'); 
    document.querySelectorAll('.estrella').forEach(estrella => estrella.style.animation = 'none');

    let musica = document.getElementById('musicaFondo');
    musica.volume = 0.5; musica.play().catch(e => console.log("Autoplay bloqueado", e));

    setTimeout(() => {
        boton.style.display = 'none';
        crearLluviaDeGlobos();

        fetch('/api/abrir_regalo')
            .then(respuesta => respuesta.json())
            .then(datos => {
                document.getElementById('tituloMensaje').innerText = datos.titulo;
                let sorpresa = document.getElementById('contenidoSorpresa');
                sorpresa.classList.remove('oculto'); sorpresa.classList.add('mostrar');

                activarVelas(); // Encendemos el juego de las velas
                
                const contenedorMensajes = document.getElementById('listaMensajes');
                contenedorMensajes.innerHTML = ''; 

                escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
                    let firma = document.getElementById('firmaMensaje');
                    firma.innerText = datos.firma;
                    firma.classList.remove('oculto'); firma.classList.add('mostrar'); 
                });
            })
            .catch(error => console.error('Error:', error));
    }, 800);
});

// --- 5. EASTER EGG LUNA Y POLVO DE ESTRELLAS ---
let entradaTeclado = "";
document.addEventListener('keydown', function(evento) {
    let tecla = evento.key.toLowerCase();
    if (tecla.length === 1 && tecla >= 'a' && tecla <= 'z') {
        entradaTeclado += tecla;
        if (entradaTeclado.length > 4) entradaTeclado = entradaTeclado.substring(entradaTeclado.length - 4);
        if (entradaTeclado === "luna") { activarEasterEggLuna(); entradaTeclado = ""; }
    }
});

function activarEasterEggLuna() {
    let musicaFondo = document.getElementById('musicaFondo');
    if (musicaFondo) { musicaFondo.pause(); musicaFondo.currentTime = 0; }
    
    let musicaLuna = document.getElementById('musicaLuna');
    if (musicaLuna) { musicaLuna.volume = 0.5; musicaLuna.play().catch(e => console.log("Autoplay", e)); }

    let contenedorNormal = document.querySelector('.contenedor');
    if (contenedorNormal) contenedorNormal.style.display = 'none';
    document.querySelectorAll('.globo, .confeti').forEach(item => item.remove());

    let escenaLuna = document.getElementById('escenaLuna');
    escenaLuna.classList.add('activar-luna'); 
    
    setTimeout(() => { escenaLuna.classList.add('animar-luna'); }, 100);
    setTimeout(() => { crearEstrellasCorazon(); }, 2000); 

    let frases = [
        "Eres mi luna...", "La que ilumina mis noches más oscuras.", "Quien me guía con su luz inquebrantable.",
        "Mi refugio y mi compañera de vida.", "Cada recuerdo a tu lado es una estrella más en mi universo.",
        "Gracias por hacer nuestra historia tan hermosa.", "Te amo."
    ];
    let contenedorFrases = document.getElementById('frasesPoeticas');
    let indexFrase = 0;

    setTimeout(() => { mostrarSiguienteFrase(); }, 5000);

    function mostrarSiguienteFrase() {
        if (indexFrase >= frases.length) return; 
        contenedorFrases.innerText = frases[indexFrase];
        contenedorFrases.classList.add('visible'); 
        setTimeout(() => {
            contenedorFrases.classList.remove('visible'); 
            indexFrase++;
            setTimeout(() => { mostrarSiguienteFrase(); }, 1500); 
        }, 4000); 
    }
}

// --- 6. RASTRO DE POLVO DE ESTRELLAS EN LA NEBULOSA ---
function crearPolvoEstrellas(x, y) {
    let polvo = document.createElement('div');
    polvo.classList.add('polvo-estrellas');
    polvo.style.left = (x - 3) + 'px'; // Centrado en el puntero
    polvo.style.top = (y - 3) + 'px';
    document.body.appendChild(polvo);
    setTimeout(() => polvo.remove(), 1000);
}

// Solo dibuja el rastro si el Easter Egg está activado
document.addEventListener('mousemove', function(e) {
    if (document.getElementById('escenaLuna').classList.contains('activar-luna')) {
        crearPolvoEstrellas(e.clientX, e.clientY);
    }
});
document.addEventListener('touchmove', function(e) {
    if (document.getElementById('escenaLuna').classList.contains('activar-luna')) {
        let touch = e.touches[0];
        crearPolvoEstrellas(touch.clientX, touch.clientY);
    }
});