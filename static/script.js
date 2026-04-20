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

// --- 4. CONTROL DE TIEMPO ---
fetch('/api/estado')
    .then(res => res.json())
    .then(data => {
        if(data.bloqueado) {
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
                    location.reload();
                }
            }, 1000);
        } else {
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
                document.getElementById('estadisticasAstro').innerText = datos.estadisticas; 
                
                let sorpresa = document.getElementById('contenidoSorpresa');
                sorpresa.classList.remove('oculto'); sorpresa.classList.add('mostrar');

                activarVelas(); 
                const contenedorMensajes = document.getElementById('listaMensajes'); contenedorMensajes.innerHTML = ''; 

                escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
                    let firma = document.getElementById('firmaMensaje'); firma.innerText = datos.firma;
                    firma.classList.remove('oculto'); firma.classList.add('mostrar'); 
                    
                    setTimeout(() => {
                        let buzon = document.getElementById('buzonSecreto');
                        buzon.classList.remove('oculto'); buzon.classList.add('mostrar');
                    }, 1000);
                });
            });
    }, 800);
});

// --- 6. ENVÍO AL BUZÓN SECRETO ---
document.getElementById('btnEnviarSecreto').addEventListener('click', function() {
    let mensaje = document.getElementById('textoSecreto').value;
    if(mensaje.trim() === "") return; 

    fetch('/api/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: mensaje })
    })
    .then(res => res.json())
    .then(datos => {
        document.getElementById('buzonSecreto').innerHTML = `<p style="color:#0fa; font-size:1.2rem; text-shadow: 0 0 10px #0fa;">${datos.respuesta}</p>`;
    });
});

// --- 7. EASTER EGG LUNA Y POLVO DE ESTRELLAS (RENOVADO) ---

// 7.1 Generar el Indicio visual dinámicamente debajo del botón
function crearIndicioMágico() {
    let indicio = document.createElement('div');
    indicio.id = 'pistaSecreta';
    indicio.innerHTML = "✨ <i>Escribe en tu teclado el nombre de aquella que ilumina mis noches más oscuras...</i>";
    
    // Lo metemos dentro del contenedor principal, justo debajo del botón
    let contenedor = document.getElementById('contenedorPrincipal');
    if (contenedor) {
        contenedor.appendChild(indicio);
    } else {
        document.body.appendChild(indicio);
    }
    
    // Aparece suavemente después de 8 segundos de cargar la página
    setTimeout(() => {
        indicio.classList.add('pista-visible');
    }, 8000);
}
crearIndicioMágico();

// 7.2 Lógica del teclado
let entradaTeclado = "";
document.addEventListener('keydown', function(evento) {
    let tecla = evento.key.toLowerCase();
    if (tecla.length === 1 && tecla >= 'a' && tecla <= 'z') {
        entradaTeclado += tecla;
        if (entradaTeclado.length > 4) entradaTeclado = entradaTeclado.substring(entradaTeclado.length - 4);
        if (entradaTeclado === "luna") { 
            activarEasterEggLuna(); 
            entradaTeclado = ""; 
        }
    }
});

// 7.3 La Escena Cinematográfica con GSAP
function activarEasterEggLuna() {
    let pista = document.getElementById('pistaSecreta');
    if(pista) pista.style.opacity = '0';

    // Transición de audios
    let mFondo = document.getElementById('musicaFondo'); 
    if (mFondo) { 
        let fadeOut = setInterval(() => {
            if(mFondo.volume > 0.1) mFondo.volume -= 0.1;
            else { clearInterval(fadeOut); mFondo.pause(); mFondo.currentTime = 0; }
        }, 200);
    }
    let mLuna = document.getElementById('musicaLuna'); 
    if (mLuna) { mLuna.volume = 0.6; mLuna.play().catch(e => console.log(e)); }

    // Limpiar pantalla principal
    let contNormal = document.getElementById('contenedorPrincipal'); 
    if (contNormal) contNormal.style.display = 'none';
    document.querySelectorAll('.globo, .confeti').forEach(item => item.remove());

    let escena = document.getElementById('escenaLuna'); 
    escena.classList.add('activar-luna'); 
    setInterval(crearEstrellaFugaz, 2500); 

    // ---- MAGIA GSAP: LA COREOGRAFÍA ----
    // Creamos una línea de tiempo (Timeline)
    const tl = gsap.timeline();

    // 1. La luna entra majestuosamente al centro
    tl.to("#planetaLuna", {
        left: "50%", 
        xPercent: -50, 
        scale: 1, 
        duration: 4, 
        ease: "power2.out"
    });

    // 2. Aparece el nombre brillando suavemente
    tl.to(".nombre-luna", {
        opacity: 1,
        y: -20,
        duration: 3,
        ease: "power1.inOut"
    }, "-=1.5"); // El "-=1.5" hace que empiece 1.5 segundos antes de que termine la luna de moverse

    // 3. Secuencia de frases (Aparecen, se leen, y se desvanecen)
    let frases = [
        "Eres mi luna...", 
        "La que ilumina mis noches más oscuras.", 
        "Mi refugio y compañera de vida.", 
        "Gracias por hacer nuestra historia tan hermosa.", 
        "Te amo."
    ];
    let contFrases = document.getElementById('frasesPoeticas'); 

    frases.forEach((frase, i) => {
        // Actualizamos el texto instantáneamente
        tl.call(() => { contFrases.innerText = frase; });
        
        // La frase aparece lentamente (Fade In)
        tl.to(contFrases, { opacity: 1, y: -10, duration: 2, ease: "power1.out" });
        
        // Tiempo en pantalla para leerla (Delay)
        tl.to(contFrases, { opacity: 1, duration: 2.5 }); // Pausa de lectura
        
        // La frase desaparece lentamente (Fade Out)
        tl.to(contFrases, { opacity: 0, y: -20, duration: 1.5, ease: "power1.in" });
    });
}

// 7.4 Efectos visuales de la Luna
function crearEstrellaFugaz() {
    if (!document.getElementById('escenaLuna').classList.contains('activar-luna')) return;
    let estrella = document.createElement('div');
    estrella.classList.add('estrella-fugaz');
    estrella.style.top = Math.random() * 30 + 'vh';
    estrella.style.left = Math.random() * 100 + 'vw';
    document.getElementById('escenaLuna').appendChild(estrella);
    setTimeout(() => estrella.remove(), 2000);
}

function crearPolvoEstrellas(x, y) {
    let polvo = document.createElement('div'); polvo.classList.add('polvo-estrellas');
    polvo.style.left = (x - 3) + 'px'; polvo.style.top = (y - 3) + 'px'; document.body.appendChild(polvo);
    setTimeout(() => polvo.remove(), 800);
}
document.addEventListener('mousemove', function(e) { if (document.getElementById('escenaLuna').classList.contains('activar-luna')) crearPolvoEstrellas(e.clientX, e.clientY); });
document.addEventListener('touchmove', function(e) { if (document.getElementById('escenaLuna').classList.contains('activar-luna')) crearPolvoEstrellas(e.touches[0].clientX, e.touches[0].clientY); });