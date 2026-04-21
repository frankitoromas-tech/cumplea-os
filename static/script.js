/* ==========================================================================
   🎇 PARTE 1: LA FIESTA DE CUMPLEAÑOS
   ========================================================================== */

// 1.1 Estrellas de fondo
function crearFondoEstrellas() {
    const colores = ['#ff007f','#ff1493','#ffd700','#ffea00','#ff6b81'];
    for (let i = 0; i < 120; i++) {
        const estrella = document.createElement('div');
        estrella.classList.add('estrella');
        const tamaño = Math.random() * 10 + 4;
        Object.assign(estrella.style, {
            width: `${tamaño}px`, height: `${tamaño}px`,
            backgroundColor: colores[Math.floor(Math.random() * colores.length)],
            left: `${Math.random() * 100}vw`,
            top: `${Math.random() < 0.7 ? Math.random() * 40 : Math.random() * 100}vh`,
            animation: `titilar ${Math.random() * 3 + 1.5}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            position: 'fixed', zIndex: '-1'
        });
        document.body.appendChild(estrella);
    }
}
crearFondoEstrellas();

// 1.2 Confeti profesional
function lanzarConfetiProfesional() {
    if (typeof confetti === 'undefined') return;
    const colors = ['#ff0a54','#ff477e','#ffd166','#06d6a0','#f5c842'];
    const end = Date.now() + 4500;
    (function frame() {
        confetti({ particleCount: 5, angle: 60,  spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

// 1.3 Velas interactivas
function activarVelas() {
    let apagadas = 0;
    const llamas = document.querySelectorAll('.llama');

    function apagar() {
        if (!this.classList.contains('apagada')) {
            this.classList.add('apagada');
            apagadas++;
            if (apagadas === llamas.length) {
                document.getElementById('instruccionPastel').innerText = '¡Deseo Concedido! ✨';
                lanzarConfetiProfesional();
                showToast('🎂 ¡Deseo concedido! Que se cumpla...');
            }
        }
    }

    llamas.forEach(llama => {
        llama.addEventListener('mouseenter', apagar);
        llama.addEventListener('touchstart', apagar, { passive: true });
    });
}

// 1.4 Globos
function crearLluviaDeGlobos() {
    const emojis = ['🎈','🎊','🎉','🎁','💕','🌟'];
    for (let i = 0; i < 40; i++) {
        const globo = document.createElement('div');
        globo.classList.add('globo');
        globo.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        Object.assign(globo.style, {
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 4 + 5}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${Math.random() * 1.5 + 2}rem`
        });
        globo.addEventListener('click', function() {
            this.classList.add('globo-reventado');
            this.innerText = '💥';
            setTimeout(() => this.remove(), 350);
        });
        document.body.appendChild(globo);
    }
}

// 1.5 Máquina de escribir
function escribirMaquina(mensajes, contenedor, index = 0, callbackFinal = null) {
    if (index >= mensajes.length) { if (callbackFinal) callbackFinal(); return; }

    const parrafo = document.createElement('p');
    contenedor.appendChild(parrafo);
    const texto = '✨ ' + mensajes[index];
    let i = 0;

    const cursor = document.createElement('span');
    cursor.classList.add('cursor-parpadeo');
    parrafo.appendChild(cursor);

    const intervalo = setInterval(() => {
        parrafo.innerText = texto.substring(0, i + 1);
        parrafo.appendChild(cursor);
        i++;
        if (i === texto.length) {
            clearInterval(intervalo);
            cursor.remove();
            setTimeout(() => escribirMaquina(mensajes, contenedor, index + 1, callbackFinal), 700);
        }
    }, 42);
}


/* ==========================================================================
   ⚙️ PARTE 2: BACKEND (FLASK)
   ========================================================================== */

// 2.1 Reloj de cuenta regresiva
fetch('/api/estado')
    .then(res => res.json())
    .then(data => {
        if (data.bloqueado) {
            document.getElementById('contenedorPrincipal').style.display = 'none';
            document.getElementById('pantallaBloqueo').classList.remove('oculto');

            let segundos = Math.floor(data.segundos_faltantes);
            const reloj = document.getElementById('cuentaRegresiva');

            const tick = setInterval(() => {
                if (segundos > 0) {
                    segundos--;
                    const h = Math.floor(segundos / 3600);
                    const m = Math.floor((segundos % 3600) / 60);
                    const s = segundos % 60;
                    reloj.innerText =
                        `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                } else {
                    clearInterval(tick);
                    location.reload();
                }
            }, 1000);
        }
    })
    .catch(() => console.log('Modo desarrollo local activo.'));

// 2.2 Buzón en pantalla de bloqueo
document.getElementById('btnEnviarBloqueo')?.addEventListener('click', function() {
    const input = document.getElementById('textoSecretoBloqueo');
    const msg = input.value.trim();
    if (!msg) { showToast('✍️ Escribe un mensaje primero...'); return; }

    this.innerText = 'Enviando... ✨';
    this.disabled = true;

    fetch('/api/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msg })
    })
    .then(res => res.json())
    .then(datos => { showToast('💌 ' + datos.respuesta); input.value = ''; })
    .catch(() => { showToast('✨ Mensaje guardado mágicamente.'); input.value = ''; })
    .finally(() => { this.innerText = 'Enviar a las estrellas ✨'; this.disabled = false; });
});

// 2.3 Abrir el regalo
document.getElementById('botonRegalo').addEventListener('click', function() {
    this.classList.add('abriendo-caja');
    document.querySelectorAll('.estrella').forEach(e => e.style.animationPlayState = 'paused');

    const musica = document.getElementById('musicaFondo');
    if (musica) { musica.volume = 0.5; musica.play().catch(() => {}); }

    setTimeout(() => {
        this.style.display = 'none';
        crearLluviaDeGlobos();

        fetch('/api/abrir_regalo')
            .then(res => res.json())
            .then(datos => mostrarFiesta(datos))
            .catch(() => mostrarFiesta({
                titulo: '¡Feliz Cumpleaños!',
                estadisticas: 'Eres la persona más brillante de mi universo.',
                mensajes: ['Espero que tengas un día increíble.', 'Lleno de amor y paz.'],
                firma: 'Con amor, Frank'
            }));
    }, 850);
});

// Función central
function mostrarFiesta(datos) {
    document.getElementById('tituloMensaje').innerText = datos.titulo;
    document.getElementById('estadisticasAstro').innerText = datos.estadisticas;

    const sorpresa = document.getElementById('contenidoSorpresa');
    sorpresa.classList.remove('oculto');
    sorpresa.classList.add('mostrar');

    activarVelas();

    const contenedorMensajes = document.getElementById('listaMensajes');
    contenedorMensajes.innerHTML = '';

    escribirMaquina(datos.mensajes, contenedorMensajes, 0, () => {
        const firma = document.getElementById('firmaMensaje');
        firma.innerText = datos.firma;
        firma.classList.remove('oculto');
        firma.classList.add('mostrar');

        setTimeout(() => {
            const collage = document.getElementById('collageMemorias');
            if (collage) { collage.classList.remove('oculto'); collage.classList.add('mostrar'); }

            setTimeout(() => {
                const buzon = document.getElementById('buzonSecreto');
                if (buzon) { buzon.classList.remove('oculto'); buzon.classList.add('mostrar'); }

                // Mostrar pista del Easter Egg
                setTimeout(() => {
                    const pista = document.getElementById('pistaSecreta');
                    if (pista) pista.classList.add('pista-visible');
                }, 5000);
            }, 800);
        }, 1200);
    });
}

// 2.4 Buzón Secreto (fiesta)
document.getElementById('btnEnviarSecreto')?.addEventListener('click', function() {
    const input = document.getElementById('textoSecreto');
    const msg = input.value.trim();

    if (!msg) { showToast('✍️ Escribe un mensaje primero...'); return; }

    this.innerText = 'Enviando... ✨';
    this.disabled = true;

    fetch('/api/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msg })
    })
    .then(res => res.json())
    .then(datos => {
        showToast('🌙 ' + datos.respuesta);
        const normalized = msg.toLowerCase();
        if (normalized.includes('luna') || normalized.includes('easter')) {
            setTimeout(activarEasterEggLuna, 600);
        }
        input.value = '';
    })
    .catch(() => { showToast('✨ Mensaje guardado mágicamente.'); input.value = ''; })
    .finally(() => { this.innerText = 'Enviar a las estrellas ✨'; this.disabled = false; });
});


/* ==========================================================================
   🌙 PARTE 3: EASTER EGG – LA ESCENA CINEMATOGRÁFICA
   ========================================================================== */

// 3.1 Activar con teclado ("luna")
let entradaTeclado = '';
document.addEventListener('keydown', function(e) {
    const tecla = e.key.toLowerCase();
    if (tecla.length === 1 && tecla >= 'a' && tecla <= 'z') {
        entradaTeclado = (entradaTeclado + tecla).slice(-4);
        if (entradaTeclado === 'luna') {
            activarEasterEggLuna();
            entradaTeclado = '';
        }
    }
});

// 3.2 Efectos de corazones en la escena
function crearEstrellasCorazon() {
    const escena = document.getElementById('escenaLuna');
    for (let i = 0; i < 30; i++) {
        const corazon = document.createElement('div');
        corazon.classList.add('corazon-estrella');
        corazon.innerText = ['🤍','💙','🌙'][Math.floor(Math.random()*3)];
        Object.assign(corazon.style, {
            fontSize: `${Math.random() * 1.5 + 0.5}rem`,
            left: `${Math.random() * 100}vw`,
            top: `${Math.random() * 100}vh`,
            animation: `titilarCorazon ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 2}s infinite`
        });
        escena.appendChild(corazon);
    }
}

// 3.3 Luna interactiva (onda de luz al tocar)
document.getElementById('lunaInteractiva')?.addEventListener('click', function(e) {
    const onda = document.createElement('div');
    onda.classList.add('onda-luz');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    Object.assign(onda.style, { width: size + 'px', height: size + 'px' });
    document.getElementById('contenedorLuna').appendChild(onda);
    setTimeout(() => onda.remove(), 1500);
    showToast('🌙 Tu luz llega hasta mí...');
});

// 3.4 Polvo de estrellas al mover el mouse (solo en la escena luna)
document.addEventListener('mousemove', function(e) {
    const escena = document.getElementById('escenaLuna');
    if (escena.style.display !== 'flex') return;
    if (Math.random() > 0.35) return; // Limitar a 35% de frames

    const polvo = document.createElement('div');
    polvo.classList.add('polvo-estrellas');
    Object.assign(polvo.style, {
        left: (e.clientX - 3) + 'px',
        top: (e.clientY - 3) + 'px'
    });
    document.body.appendChild(polvo);
    setTimeout(() => polvo.remove(), 900);
});

// 3.5 Botón cerrar la escena luna
document.getElementById('btnCerrarLuna')?.addEventListener('click', function() {
    const escena = document.getElementById('escenaLuna');
    const musLuna = document.getElementById('musicaLuna');

    if (typeof gsap !== 'undefined') {
        gsap.to(escena, { opacity: 0, duration: 1.5, ease: 'power2.in', onComplete: () => {
            escena.style.display = 'none';
            escena.style.opacity = '';
        }});
    } else {
        escena.style.display = 'none';
    }

    if (musLuna) { musLuna.pause(); musLuna.currentTime = 0; }

    // Reactivar contenedor principal si existe
    const cont = document.getElementById('contenedorPrincipal');
    if (cont) cont.style.display = '';
});

// 3.6 Efectos avanzados de parallax en la luna
function iniciarEfectosAvanzadosLuna() {
    const escena = document.getElementById('escenaLuna');
    const luna = document.getElementById('contenedorLuna');
    const tierra = document.getElementById('planetaTierra');
    const nebulosa = document.querySelector('.nebulosa-fondo');

    // Parallax con el mouse
    document.addEventListener('mousemove', (e) => {
        if (escena.style.display !== 'flex') return;
        const xPos = (e.clientX / window.innerWidth - 0.5) * 30;
        const yPos = (e.clientY / window.innerHeight - 0.5) * 30;

        if (typeof gsap !== 'undefined') {
            gsap.to(luna,    { x: xPos * 2,  y: yPos * 2,  duration: 1.2, ease: 'power2.out' });
            gsap.to(tierra,  { x: xPos * 1,  y: yPos * 1,  duration: 1.8, ease: 'power2.out' });
            gsap.to(nebulosa,{ x: -xPos * 3, y: -yPos * 3, duration: 2.5, ease: 'power1.out' });
        }
    });

    // Estrellas fugaces periódicas
    setInterval(() => {
        if (escena.style.display !== 'flex') return;
        const fugaz = document.createElement('div');
        fugaz.classList.add('estrella-fugaz-dinamica');
        Object.assign(fugaz.style, {
            left: `${Math.random() * 50 + 50}vw`,
            top: `${Math.random() * 40}vh`
        });
        escena.appendChild(fugaz);
        setTimeout(() => fugaz.remove(), 1800);
    }, 3500);

    // Estrellas al hacer clic en la escena
    escena.addEventListener('click', (e) => {
        if (e.target.id === 'lunaInteractiva' || e.target.closest('#lunaInteractiva')) return;
        if (e.target.id === 'btnCerrarLuna') return;

        const estrella = document.createElement('div');
        estrella.classList.add('estrella-fija');
        Object.assign(estrella.style, {
            left: `${e.clientX - 2}px`,
            top: `${e.clientY - 2}px`,
            position: 'fixed'
        });
        escena.appendChild(estrella);
    });
}

// 3.7 La coreografía principal (GSAP)
let easterEggActivo = false;

function activarEasterEggLuna() {
    if (easterEggActivo) return;
    easterEggActivo = true;

    // Ocultar pista y contenedor principal
    const pista = document.getElementById('pistaSecreta');
    if (pista) pista.style.display = 'none';
    const contNormal = document.getElementById('contenedorPrincipal');
    if (contNormal) contNormal.style.display = 'none';

    // Fade-out de la música de fondo
    const mFondo = document.getElementById('musicaFondo');
    if (mFondo) {
        const fadeOut = setInterval(() => {
            if (mFondo.volume > 0.08) mFondo.volume = Math.max(0, mFondo.volume - 0.08);
            else { clearInterval(fadeOut); mFondo.pause(); mFondo.currentTime = 0; }
        }, 180);
    }

    // Música de la luna
    const mLuna = document.getElementById('musicaLuna');
    if (mLuna) {
        mLuna.volume = 0;
        mLuna.play().catch(() => {});
        const fadeIn = setInterval(() => {
            if (mLuna.volume < 0.55) mLuna.volume = Math.min(0.6, mLuna.volume + 0.06);
            else clearInterval(fadeIn);
        }, 200);
    }

    // Mostrar escena
    const escena = document.getElementById('escenaLuna');
    if (!escena) { console.error('No se encontró #escenaLuna'); return; }
    escena.style.display = 'flex';

    crearEstrellasCorazon();
    iniciarEfectosAvanzadosLuna();

    // GSAP Timeline
    if (typeof gsap === 'undefined') {
        // Fallback sin GSAP
        document.getElementById('planetaTierra').style.opacity = '0.6';
        document.querySelector('.luna-realista').style.opacity = '1';
        document.querySelector('.nombre-luna-titulo').style.opacity = '1';
        return;
    }

    const tl = gsap.timeline();

    // 1. Tierra sube desde abajo
    tl.to('#planetaTierra', {
        opacity: 0.55, bottom: '-38vh', duration: 4, ease: 'power2.out'
    });

    // 2. Luna aparece con escala y rotación
    tl.fromTo('.luna-realista',
        { scale: 0, opacity: 0, rotation: -45 },
        { scale: 1, opacity: 1, rotation: 0, duration: 3, ease: 'back.out(1.7)' },
        '-=2.5'
    );

    // 3. Título "LUNA" aparece con letra-espaciado
    tl.to('.nombre-luna-titulo', {
        opacity: 1,
        letterSpacing: window.innerWidth < 768 ? '8px' : '18px',
        duration: 3, ease: 'power1.inOut'
    }, '-=1');

    // 4. Frases poéticas
    const frases = [
        'Eres mi luna...',
        'La que ilumina mis noches más oscuras.',
        'Quien me guía con su luz inquebrantable.',
        'Mi refugio y mi paz.',
        'Cada vez que la miro, te veo a ti.',
        'Toca la luna para sentir su luz...',
        'Te amo.'
    ];

    const contFrases = document.getElementById('frasesPoeticas');
    frases.forEach((frase) => {
        tl.call(() => { contFrases.innerText = frase; });
        tl.fromTo(contFrases,
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 2, ease: 'power1.out' }
        );
        tl.to(contFrases, { opacity: 1, duration: 4 }); // pausa de lectura
        tl.to(contFrases, { opacity: 0, y: -20, duration: 1.5, ease: 'power1.in' });
    });
}


/* ==========================================================================
   ✨ PARTE 4: CURSOR, TOAST Y BURSTS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursor-ring');
    let ringX = 0, ringY = 0;

    if (cursor && ring) {
        document.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top  = e.clientY + 'px';

            // Efecto de seguimiento suave del anillo
            ringX += (e.clientX - ringX) * 0.18;
            ringY += (e.clientY - ringY) * 0.18;
            ring.style.left = ringX + 'px';
            ring.style.top  = ringY + 'px';
        });

        document.addEventListener('mousedown', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        });
        document.addEventListener('mouseup', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }

    // Partículas de emoji al hacer clic
    const BURST_EMOJIS = ['🎉','🌟','✨','💫','💕','🌙','🤍'];
    document.addEventListener('click', e => {
        const skip = ['BUTTON','INPUT','TEXTAREA'];
        if (skip.includes(e.target.tagName)) return;

        const el = document.createElement('div');
        el.className = 'burst';
        el.textContent = BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)];
        el.style.left = e.clientX + 'px';
        el.style.top  = e.clientY + 'px';

        const angle = Math.random() * Math.PI * 2;
        const dist  = 50 + Math.random() * 65;
        el.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
        el.style.setProperty('--ty', Math.sin(angle) * dist + 'px');

        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    });
});

// Toast de notificaciones
function showToast(msg, duration = 3500) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}