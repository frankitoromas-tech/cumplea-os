/* ==========================================================================
   🎇 PARTE 1: LA FIESTA DE CUMPLEAÑOS (EFECTOS DINÁMICOS)
   ========================================================================== */

// 1.1 Fondo de Estrellas de Colores (Para la fiesta)
function crearFondoEstrellas() {
    const colores = ['#ff007f', '#ff1493', '#ffd700', '#ffea00']; 
    for (let i = 0; i < 150; i++) {
        let estrella = document.createElement('div'); 
        estrella.classList.add('estrella');
        let tamaño = Math.random() * 10 + 5; 
        estrella.style.width = `${tamaño}px`; 
        estrella.style.height = `${tamaño}px`;
        estrella.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        estrella.style.left = `${Math.random() * 100}vw`;
        estrella.style.top = `${Math.random() < 0.7 ? (Math.random() * 40) : (Math.random() * 100)}vh`;
        estrella.style.animation = `titilar ${Math.random() * 3 + 1.5}s infinite ease-in-out`;
        document.body.appendChild(estrella);
    }
}
crearFondoEstrellas();

// 1.2 Confeti Profesional 3D (Cuando sopla las velas)
function lanzarConfetiProfesional() {
    if (typeof confetti === 'undefined') return; // Seguridad si falla el internet
    var duration = 4 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff0a54', '#ff477e', '#ffd166', '#06d6a0'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff0a54', '#ff477e', '#ffd166', '#06d6a0'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

// 1.3 Velas Interactivas
function activarVelas() {
    let apagadas = 0; 
    let llamas = document.querySelectorAll('.llama');
    
    function apagar() {
        if (!this.classList.contains('apagada')) {
            this.classList.add('apagada'); 
            apagadas++;
            if (apagadas === llamas.length) { 
                document.getElementById('instruccionPastel').innerText = "¡Deseo Concedido! ✨"; 
                lanzarConfetiProfesional(); 
            }
        }
    }
    
    llamas.forEach(llama => {
        llama.addEventListener('mouseenter', apagar);
        llama.addEventListener('touchmove', apagar);
    });
}

// 1.4 Lluvia de Globos (¡Se pueden reventar!)
function crearLluviaDeGlobos() {
    const emojis = ['🎈', '🎊', '🎉', '🎁'];
    for (let i = 0; i < 45; i++) {
        let globo = document.createElement('div'); 
        globo.classList.add('globo');
        globo.innerText = emojis[Math.floor(Math.random() * emojis.length)]; 
        globo.style.left = `${Math.random() * 100}vw`;
        globo.style.animationDuration = `${Math.random() * 4 + 5}s`;
        globo.style.animationDelay = `${Math.random() * 5}s`;
        
        // Efecto al hacer clic
        globo.addEventListener('click', function() { 
            this.classList.add('globo-reventado'); 
            this.innerText = '💥'; 
            setTimeout(() => this.remove(), 300); 
        });
        document.body.appendChild(globo);
    }
}

// 1.5 Máquina de Escribir (Mensajes de amor)
function escribirMaquina(mensajes, contenedor, index = 0, callbackFinal = null) {
    if (index >= mensajes.length) { if (callbackFinal) callbackFinal(); return; }
    
    let parrafo = document.createElement('p'); 
    contenedor.appendChild(parrafo);
    let texto = "✨ " + mensajes[index]; 
    let i = 0;
    
    let cursor = document.createElement('span'); 
    cursor.classList.add('cursor-parpadeo'); 
    parrafo.appendChild(cursor);

    let intervalo = setInterval(() => {
        parrafo.innerText = texto.substring(0, i + 1); 
        parrafo.appendChild(cursor); 
        i++;
        if (i === texto.length) { 
            clearInterval(intervalo); 
            cursor.remove(); 
            setTimeout(() => { escribirMaquina(mensajes, contenedor, index + 1, callbackFinal); }, 600); 
        }
    }, 45); 
}


/* ==========================================================================
   ⚙️ PARTE 2: CONEXIÓN CON EL BACKEND (PYTHON)
   ========================================================================== */

// 2.1 Control del Reloj
fetch('/api/estado').then(res => res.json()).then(data => {
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
            } else { location.reload(); }
        }, 1000);
    }
}).catch(err => console.log("Modo desarrollo local activo."));

// 2.2 Botón de Abrir Regalo
document.getElementById('botonRegalo').addEventListener('click', function() {
    let boton = this; 
    boton.classList.add('abriendo-caja'); 
    document.querySelectorAll('.estrella').forEach(e => e.style.animation = 'none');
    
    let musica = document.getElementById('musicaFondo'); 
    if(musica) { musica.volume = 0.5; musica.play().catch(e => console.log("Audio bloqueado.")); }

    setTimeout(() => {
        boton.style.display = 'none'; 
        crearLluviaDeGlobos(); // ¡Lanzamos los globos!

        fetch('/api/abrir_regalo').then(res => res.json()).then(datos => mostrarFiesta(datos))
        .catch(() => {
            // Datos locales por seguridad
            mostrarFiesta({
                titulo: "¡Feliz Cumpleaños!", 
                estadisticas: "Eres la persona más brillante de mi universo.",
                mensajes: ["Espero que tengas un día increíble.", "Lleno de amor y paz."], 
                firma: "Con amor, Frank"
            });
        });
    }, 800);
});

// Función central para mostrar el contenido
function mostrarFiesta(datos) {
    document.getElementById('tituloMensaje').innerText = datos.titulo;
    document.getElementById('estadisticasAstro').innerText = datos.estadisticas; 
    
    let sorpresa = document.getElementById('contenidoSorpresa');
    sorpresa.classList.remove('oculto'); 
    sorpresa.classList.add('mostrar');
    
    activarVelas(); 
    const contenedorMensajes = document.getElementById('listaMensajes'); 
    contenedorMensajes.innerHTML = ''; 
    
    escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
        let firma = document.getElementById('firmaMensaje'); 
        firma.innerText = datos.firma;
        firma.classList.remove('oculto'); 
        firma.classList.add('mostrar'); 
        
        setTimeout(() => { 
            let buzon = document.getElementById('buzonSecreto'); 
            if(buzon) { buzon.classList.remove('oculto'); buzon.classList.add('mostrar'); } 
        }, 1000);
    });
}

// 2.3 Buzón Secreto
document.getElementById('btnEnviarSecreto').addEventListener('click', function() {
    let mensaje = document.getElementById('textoSecreto').value;
    if(mensaje.trim() === "") return; 
    
    fetch('/api/responder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensaje: mensaje }) })
    .then(res => res.json()).then(datos => { 
        document.getElementById('buzonSecreto').innerHTML = `<p style="color:#0fa; font-size:1.2rem; text-shadow: 0 0 10px #0fa;">${datos.respuesta}</p>`; 
    })
    .catch(() => { document.getElementById('buzonSecreto').innerHTML = `<p style="color:#0fa;">Mensaje guardado mágicamente.</p>`; });
});


/* ==========================================================================
   🌙 PARTE 3: EASTER EGG (LA ESCENA CINEMATOGRÁFICA)
   ========================================================================== */

// 3.1 El Indicio Mágico
function crearIndicioMágico() {
    let indicio = document.createElement('div'); 
    indicio.id = 'pistaSecreta';
    indicio.innerHTML = "✨ <i>Escribe en tu teclado el nombre de aquella que ilumina mis noches...</i>";
    
    let contenedor = document.getElementById('contenedorPrincipal');
    if (contenedor) { contenedor.appendChild(indicio); } else { document.body.appendChild(indicio); }
    
    setTimeout(() => { indicio.classList.add('pista-visible'); }, 8000);
}
crearIndicioMágico();

// 3.2 Escucha del Teclado
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

// 3.3 Efectos Extra de la Luna
function crearEstrellasCorazon() {
    const escenaLuna = document.getElementById('escenaLuna');
    for (let i = 0; i < 30; i++) {
        let corazon = document.createElement('div'); 
        corazon.classList.add('corazon-estrella'); 
        corazon.innerText = '🤍'; 
        corazon.style.fontSize = `${Math.random() * 1.5 + 0.5}rem`;
        corazon.style.left = `${Math.random() * 100}vw`; 
        corazon.style.top = `${Math.random() * 100}vh`;
        corazon.style.animation = `titilarCorazon ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 2}s infinite`;
        escenaLuna.appendChild(corazon);
    }
}

function crearLuciernaga() {
    if(document.getElementById('escenaLuna').style.display !== 'flex') return;
    let luciernaga = document.createElement('div');
    luciernaga.classList.add('luciernaga');
    luciernaga.style.left = `${Math.random() * 100}vw`;
    luciernaga.style.animationDuration = `${Math.random() * 4 + 4}s`;
    document.getElementById('escenaLuna').appendChild(luciernaga);
    setTimeout(() => luciernaga.remove(), 8000);
}

// 3.4 Interactividad de la Luna
document.getElementById('lunaInteractiva').addEventListener('click', function() {
    let onda = document.createElement('div');
    onda.classList.add('onda-luz');
    document.getElementById('contenedorLuna').appendChild(onda);
    setTimeout(() => onda.remove(), 1500); 
});

// 3.5 Polvo de Estrellas (Mouse)
document.addEventListener('mousemove', function(e) {
    if (document.getElementById('escenaLuna').style.display === 'flex') {
        let polvo = document.createElement('div'); 
        polvo.classList.add('polvo-estrellas');
        polvo.style.left = (e.clientX - 4) + 'px'; 
        polvo.style.top = (e.clientY - 4) + 'px';
        document.body.appendChild(polvo);
        setTimeout(() => polvo.remove(), 800);
    }
});

// 3.6 La Coreografía Final (GSAP)
function activarEasterEggLuna() {
    let pista = document.getElementById('pistaSecreta'); if(pista) pista.style.display = 'none';
    let contNormal = document.getElementById('contenedorPrincipal'); if (contNormal) contNormal.style.display = 'none';

    // Transición de audio
    let mFondo = document.getElementById('musicaFondo'); 
    if (mFondo) { 
        let fadeOut = setInterval(() => {
            if(mFondo.volume > 0.1) mFondo.volume -= 0.1;
            else { clearInterval(fadeOut); mFondo.pause(); mFondo.currentTime = 0; }
        }, 200);
    }
    let mLuna = document.getElementById('musicaLuna'); if (mLuna) { mLuna.volume = 0.6; mLuna.play().catch(e => console.log(e)); }

    // Activar Escena
    const escena = document.getElementById('escenaLuna');
    if(!escena) return;
    escena.style.display = 'flex';

    // Iniciar efectos ambientales
    crearEstrellasCorazon();
    setInterval(crearLuciernaga, 300);
    iniciarEfectosAvanzadosLuna();
    // Animación GSAP
    if(typeof gsap === 'undefined') {
        document.getElementById('planetaTierra').style.opacity = 0.6;
        document.querySelector('.nombre-luna-titulo').style.opacity = 1;
        return;
    }

    const tl = gsap.timeline();
    
    tl.to("#planetaTierra", { opacity: 0.6, bottom: "-40vh", duration: 4, ease: "power2.out" });
    tl.from(".luna-realista", { scale: 0, rotation: -45, duration: 3, ease: "back.out(1.5)" }, "-=2");
    tl.to(".nombre-luna-titulo", { opacity: 1, letterSpacing: "15px", duration: 3, ease: "power1.inOut" });

    let frases = [
        "Eres mi luna...", 
        "La que ilumina mis noches más oscuras.", 
        "Quien me guía con su luz inquebrantable.", 
        "Mi refugio y mi paz.",
        "Toca la luna para sentir su luz...",
        "Te amo."
    ];
    let contFrases = document.getElementById('frasesPoeticas'); 

    frases.forEach((frase) => {
        tl.call(() => { contFrases.innerText = frase; }); 
        tl.to(contFrases, { opacity: 1, y: -10, duration: 2, ease: "power1.out" }); 
        tl.to(contFrases, { opacity: 1, duration: 3.5 }); 
        tl.to(contFrases, { opacity: 0, y: -20, duration: 1.5, ease: "power1.in" }); 
    });
}
/* ==========================================================================
   ✨ 6. FUNCIONES DINÁMICAS AVANZADAS PARA LA LUNA (Efecto 3D y Cielo)
   ========================================================================== */

function iniciarEfectosAvanzadosLuna() {
    const escena = document.getElementById('escenaLuna');
    const luna = document.getElementById('contenedorLuna');
    const tierra = document.getElementById('planetaTierra');
    const nebulosa = document.querySelector('.nebulosa-fondo');

    // 6.1 Parallax Cósmico (Efecto 3D al mover el mouse)
    document.addEventListener('mousemove', (e) => {
        if (escena.style.display !== 'flex') return;
        
        // Calculamos el centro de la pantalla
        let xPos = (e.clientX / window.innerWidth - 0.5) * 30; 
        let yPos = (e.clientY / window.innerHeight - 0.5) * 30;

        // Movemos los elementos a distintas velocidades (GSAP hace que sea suave)
        if(typeof gsap !== 'undefined') {
            gsap.to(luna, { x: xPos * 2, y: yPos * 2, duration: 1, ease: "power2.out" });
            gsap.to(tierra, { x: xPos * 1, y: yPos * 1, duration: 1.5, ease: "power2.out" });
            gsap.to(nebulosa, { x: -xPos * 3, y: -yPos * 3, duration: 2, ease: "power1.out" });
        }
    });

    // 6.2 Lluvia de Estrellas Fugaces Automática (Cada 3 segundos)
    setInterval(() => {
        if (escena.style.display === 'flex') {
            let fugaz = document.createElement('div');
            fugaz.classList.add('estrella-fugaz-dinamica');
            // Nacen en la parte superior derecha
            fugaz.style.left = `${Math.random() * 50 + 50}vw`; 
            fugaz.style.top = `${Math.random() * 40}vh`;
            escena.appendChild(fugaz);
            setTimeout(() => fugaz.remove(), 1500);
        }
    }, 3000); 

    // 6.3 Crear Constelaciones al hacer clic en el cielo
    escena.addEventListener('click', (e) => {
        // Evitar que se cree una estrella si toca la luna (eso dispara el pulso de luz)
        if (e.target.id === 'lunaInteractiva') return;
        
        let estrella = document.createElement('div');
        estrella.classList.add('estrella-fija');
        estrella.style.left = `${e.clientX - 3}px`;
        estrella.style.top = `${e.clientY - 3}px`;
        escena.appendChild(estrella);
    });
}