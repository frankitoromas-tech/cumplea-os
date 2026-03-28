// --- 1. ESTRELLAS Y CORAZONES ---
function crearFondoEstrellas() {
    const colores = ['#ff007f', '#ff1493', '#ffd700', '#ffea00']; 
    for (let i = 0; i < 150; i++) {
        let estrella = document.createElement('div'); estrella.classList.add('estrella');
        let tamaño = Math.random() * 10 + 5; estrella.style.width = `${tamaño}px`; estrella.style.height = `${tamaño}px`;
        estrella.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        estrella.style.left = `${Math.random() * 100}vw`;
        estrella.style.top = `${Math.random() < 0.7 ? (Math.random() * 40) : (Math.random() * 100)}vh`;
        estrella.style.animation = `titilar ${Math.random() * 3 + 1.5}s infinite ease-in-out`;
        document.body.appendChild(estrella);
    }
}
crearFondoEstrellas();

function crearEstrellasCorazon() {
    const escenaLuna = document.getElementById('escenaLuna');
    for (let i = 0; i < 40; i++) {
        let corazon = document.createElement('div'); corazon.classList.add('corazon-estrella'); corazon.innerText = '🤍'; 
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
        let confeti = document.createElement('div'); confeti.classList.add('confeti');
        confeti.style.left = Math.random() * 100 + 'vw'; confeti.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        confeti.style.animationDuration = (Math.random() * 2 + 2) + 's'; confeti.style.animationDelay = (Math.random() * 1) + 's';
        document.body.appendChild(confeti); setTimeout(() => confeti.remove(), 4000); 
    }
}

function activarVelas() {
    let apagadas = 0; let llamas = document.querySelectorAll('.llama');
    function apagar() {
        if (!this.classList.contains('apagada')) {
            this.classList.add('apagada'); apagadas++;
            if (apagadas === llamas.length) { document.getElementById('instruccionPastel').innerText = "¡Deseo Concedido! ✨"; lanzarConfeti(); }
        }
    }
    llamas.forEach(llama => { llama.addEventListener('mouseenter', apagar); llama.addEventListener('touchmove', apagar); });
}

// --- 3. GLOBOS Y MÁQUINA DE ESCRIBIR ---
function crearLluviaDeGlobos() {
    const emojis = ['🎈', '🎊', '🎉', '🎁'];
    for (let i = 0; i < 45; i++) {
        let globo = document.createElement('div'); globo.classList.add('globo');
        globo.innerText = emojis[Math.floor(Math.random() * emojis.length)]; globo.style.left = `${Math.random() * 100}vw`;
        globo.style.animation = `caer ${Math.random() * 4 + 5}s ${Math.random() * 5}s linear infinite`;
        globo.addEventListener('click', function() { this.classList.add('globo-reventado'); this.innerText = '💥'; setTimeout(() => this.remove(), 300); });
        document.body.appendChild(globo);
    }
}

function escribirMaquina(mensajes, contenedor, index = 0, callbackFinal = null) {
    if (index >= mensajes.length) { if (callbackFinal) callbackFinal(); return; }
    let parrafo = document.createElement('p'); contenedor.appendChild(parrafo);
    let texto = "✨ " + mensajes[index]; let i = 0;
    let cursor = document.createElement('span'); cursor.classList.add('cursor-parpadeo'); parrafo.appendChild(cursor);

    let intervalo = setInterval(() => {
        parrafo.innerText = texto.substring(0, i + 1); parrafo.appendChild(cursor); i++;
        if (i === texto.length) { clearInterval(intervalo); cursor.remove(); setTimeout(() => { escribirMaquina(mensajes, contenedor, index + 1, callbackFinal); }, 600); }
    }, 45); 
}

// --- 4. CONTROL DE TIEMPO CON PYTHON (NUEVO) ---
fetch('/api/estado')
    .then(res => res.json())
    .then(data => {
        if(data.bloqueado) {
            // Si está bloqueado: ocultamos el regalo y encendemos el reloj
            document.getElementById('contenedorPrincipal').style.display = 'none';
            document.getElementById('pantallaBloqueo').classList.remove('oculto');
            
            let segundos = Math.floor(data.segundos_faltantes);
            setInterval(() => {
                if(segundos > 0) {
                    segundos--;
                    let h = Math.floor(segundos / 3600);
                    let m = Math.floor((segundos % 3600) / 60);
                    let s = Math.floor(segundos % 60);
                    document.getElementById('cuentaRegresiva').innerText = 
                        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                } else {
                    location.reload(); // Recarga cuando llega a cero
                }
            }, 1000);
        } else {
            // Si YA es la fecha: Desaparecemos la pantalla negra a la fuerza
            document.getElementById('pantallaBloqueo').classList.add('oculto');
            document.getElementById('contenedorPrincipal').style.display = 'block';
        }
    })
    .catch(err => console.error("Error conectando con el servidor:", err));
// --- 5. EVENTO PRINCIPAL DEL REGALO ---
document.getElementById('botonRegalo').addEventListener('click', function() {
    let boton = this; boton.classList.add('abriendo-caja'); 
    document.querySelectorAll('.estrella').forEach(e => e.style.animation = 'none');
    let musica = document.getElementById('musicaFondo'); musica.volume = 0.5; musica.play().catch(e => console.log(e));

    setTimeout(() => {
        boton.style.display = 'none'; crearLluviaDeGlobos();

        fetch('/api/abrir_regalo')
            .then(res => res.json())
            .then(datos => {
                document.getElementById('tituloMensaje').innerText = datos.titulo;
                document.getElementById('estadisticasAstro').innerText = datos.estadisticas; // Muestra estadísticas de Python
                
                let sorpresa = document.getElementById('contenidoSorpresa');
                sorpresa.classList.remove('oculto'); sorpresa.classList.add('mostrar');

                activarVelas(); 
                const contenedorMensajes = document.getElementById('listaMensajes'); contenedorMensajes.innerHTML = ''; 

                escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
                    let firma = document.getElementById('firmaMensaje'); firma.innerText = datos.firma;
                    firma.classList.remove('oculto'); firma.classList.add('mostrar'); 
                    
                    // Mostramos el buzón secreto al final de todo
                    setTimeout(() => {
                        let buzon = document.getElementById('buzonSecreto');
                        buzon.classList.remove('oculto'); buzon.classList.add('mostrar');
                    }, 1000);
                });
            });
    }, 800);
});

// --- 6. ENVÍO AL BUZÓN SECRETO (NUEVO) ---
document.getElementById('btnEnviarSecreto').addEventListener('click', function() {
    let mensaje = document.getElementById('textoSecreto').value;
    if(mensaje.trim() === "") return; // No envía si está vacío

    fetch('/api/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: mensaje })
    })
    .then(res => res.json())
    .then(datos => {
        // Reemplaza el formulario con el mensaje de agradecimiento
        document.getElementById('buzonSecreto').innerHTML = `<p style="color:#0fa; font-size:1.2rem;">${datos.respuesta}</p>`;
    });
});

// --- 7. EASTER EGG LUNA Y POLVO DE ESTRELLAS ---
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
    let mFondo = document.getElementById('musicaFondo'); if (mFondo) { mFondo.pause(); mFondo.currentTime = 0; }
    let mLuna = document.getElementById('musicaLuna'); if (mLuna) { mLuna.volume = 0.5; mLuna.play().catch(e => console.log(e)); }

    let contNormal = document.getElementById('contenedorPrincipal'); if (contNormal) contNormal.style.display = 'none';
    document.querySelectorAll('.globo, .confeti').forEach(item => item.remove());

    let escena = document.getElementById('escenaLuna'); escena.classList.add('activar-luna'); 
    setTimeout(() => { escena.classList.add('animar-luna'); }, 100);
    setTimeout(() => { crearEstrellasCorazon(); }, 2000); 

    let frases = ["Eres mi luna...", "La que ilumina mis noches más oscuras.", "Quien me guía con su luz inquebrantable.", "Mi refugio y mi compañera de vida.", "Cada recuerdo a tu lado es una estrella más en mi universo.", "Gracias por hacer nuestra historia tan hermosa.", "Te amo."];
    let contFrases = document.getElementById('frasesPoeticas'); let idx = 0;

    setTimeout(() => { mostrarFrase(); }, 5000);
    function mostrarFrase() {
        if (idx >= frases.length) return; 
        contFrases.innerText = frases[idx]; contFrases.classList.add('visible'); 
        setTimeout(() => { contFrases.classList.remove('visible'); idx++; setTimeout(() => { mostrarFrase(); }, 1500); }, 4000); 
    }
}

function crearPolvoEstrellas(x, y) {
    let polvo = document.createElement('div'); polvo.classList.add('polvo-estrellas');
    polvo.style.left = (x - 3) + 'px'; polvo.style.top = (y - 3) + 'px'; document.body.appendChild(polvo);
    setTimeout(() => polvo.remove(), 1000);
}
document.addEventListener('mousemove', function(e) { if (document.getElementById('escenaLuna').classList.contains('activar-luna')) crearPolvoEstrellas(e.clientX, e.clientY); });
document.addEventListener('touchmove', function(e) { if (document.getElementById('escenaLuna').classList.contains('activar-luna')) crearPolvoEstrellas(e.touches[0].clientX, e.touches[0].clientY); });