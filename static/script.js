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
/* ==========================================================================
   🆕 PARTE 5: NUEVAS FUNCIONES DE LAS APIS PYTHON
   ========================================================================== */
 
// 5.1 — Frase romántica del día (se carga al inicio)
async function cargarFraseDia() {
    try {
        const res  = await fetch('/api/frase_del_dia');
        const data = await res.json();
 
        // Si ya existe un contenedor de frase, actualízalo
        let fraseCont = document.getElementById('fraseDia');
        if (!fraseCont) {
            fraseCont = document.createElement('div');
            fraseCont.id = 'fraseDia';
            fraseCont.style.cssText = `
                margin: 12px auto; max-width: 600px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,107,129,0.2);
                border-radius: 12px; padding: 14px 22px;
                font-family: 'IM Fell English', serif;
                font-style: italic; font-size: 1.05rem;
                color: #f0e8ff; opacity: 0;
                transition: opacity 1.5s ease;
                text-shadow: 0 0 8px rgba(255,107,129,0.3);
            `;
            const cont = document.getElementById('contenedorPrincipal');
            if (cont) cont.prepend(fraseCont);
        }
        fraseCont.innerHTML = `✨ <em>"${data.frase}"</em>`;
        setTimeout(() => { fraseCont.style.opacity = '1'; }, 300);
    } catch (_) { /* falla silenciosa */ }
}
 
// 5.2 — Estadísticas de amor (se inyectan en el contenido sorpresa)
async function cargarEstadisticasAmor() {
    try {
        const res  = await fetch('/api/estadisticas_amor');
        const data = await res.json();
 
        // Crear un bloque de stats visuales debajo de #estadisticasAstro
        const target = document.getElementById('estadisticasAstro');
        if (!target) return;
 
        const bloque = document.createElement('div');
        bloque.id = 'bloqueStatsAmor';
        bloque.style.cssText = `
            display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 14px; margin: 22px auto; max-width: 640px;
        `;
 
        const stats = [
            { icono: '🌙', valor: data.dias_vividos, etiqueta: 'días vividos' },
            { icono: '💓', valor: data.semanas_vividas, etiqueta: 'semanas de vida' },
            { icono: '💞', valor: data.dias_juntos, etiqueta: 'días juntos' },
            { icono: '🌍', valor: data.orbitas_al_sol, etiqueta: 'órbitas al sol' },
        ];
 
        stats.forEach(s => {
            const tarjeta = document.createElement('div');
            tarjeta.style.cssText = `
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,107,129,0.2);
                border-radius: 12px; padding: 14px 10px;
                text-align: center; font-family: 'Playfair Display', serif;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                cursor: default;
            `;
            tarjeta.innerHTML = `
                <div style="font-size:2rem;">${s.icono}</div>
                <div style="font-size:1.5rem;font-weight:bold;color:#f5c842;margin:4px 0;">${s.valor}</div>
                <div style="font-size:0.8rem;color:#cbd5e1;opacity:0.8;">${s.etiqueta}</div>
            `;
            tarjeta.addEventListener('mouseenter', () => {
                tarjeta.style.transform = 'translateY(-5px)';
                tarjeta.style.boxShadow = '0 10px 30px rgba(255,107,129,0.2)';
            });
            tarjeta.addEventListener('mouseleave', () => {
                tarjeta.style.transform = '';
                tarjeta.style.boxShadow = '';
            });
            bloque.appendChild(tarjeta);
        });
 
        target.after(bloque);
    } catch (_) { /* falla silenciosa */ }
}
 
// 5.3 — Poema al tocar la luna (reemplaza el toast genérico)
async function mostrarPoemaLuna() {
    try {
        const res  = await fetch('/api/poema');
        const data = await res.json();
 
        // Crear el modal del poema si no existe
        let modal = document.getElementById('modalPoema');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalPoema';
            modal.style.cssText = `
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(2,4,10,0.92);
                display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                padding: 30px; opacity: 0;
                transition: opacity 0.8s ease;
                backdrop-filter: blur(12px);
            `;
            modal.innerHTML = `
                <div id="poemaContenido" style="
                    max-width: 500px; width: 100%;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 18px; padding: 35px 32px;
                    font-family: 'IM Fell English', serif;
                    text-align: center; position: relative;
                ">
                    <h2 id="poema-titulo" style="font-family:'Playfair Display',serif;color:#ff6b81;font-size:1.6rem;margin-bottom:20px;"></h2>
                    <div id="poema-versos" style="line-height:2;font-size:1.05rem;color:#f0e8ff;font-style:italic;"></div>
                    <div style="margin-top:28px;">
                        <button id="btnOtroPoema" style="
                            background: rgba(255,107,129,0.2); color: #ff6b81;
                            border: 1px solid rgba(255,107,129,0.4);
                            padding: 10px 22px; border-radius: 50px;
                            cursor: pointer; font-family: 'Playfair Display',serif;
                            font-size: 0.95rem; margin-right: 10px;
                            transition: all 0.3s;
                        ">Otro poema ✨</button>
                        <button id="btnCerrarPoema" style="
                            background: rgba(255,255,255,0.06); color: #cbd5e1;
                            border: 1px solid rgba(255,255,255,0.1);
                            padding: 10px 22px; border-radius: 50px;
                            cursor: pointer; font-size: 0.9rem;
                            transition: all 0.3s;
                        ">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
 
            document.getElementById('btnCerrarPoema').addEventListener('click', () => {
                modal.style.opacity = '0';
                setTimeout(() => { modal.style.display = 'none'; }, 600);
            });
            document.getElementById('btnOtroPoema').addEventListener('click', mostrarPoemaLuna);
        }
 
        document.getElementById('poema-titulo').innerText = data.titulo;
        const versosDiv = document.getElementById('poema-versos');
        versosDiv.innerHTML = data.versos
            .map(v => v === '' ? '<br>' : `<p style="margin:2px 0;">${v}</p>`)
            .join('');
 
        modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 10);
    } catch (_) {
        showToast('🌙 Tu luz llega hasta mí...');
    }
}
 
// 5.4 — Contador de visitas discreto en la esquina
async function mostrarContadorVisitas() {
    try {
        const res  = await fetch('/api/visitas');
        const data = await res.json();
 
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: fixed; bottom: 16px; right: 16px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50px; padding: 6px 14px;
            font-size: 0.75rem; color: #94a3b8;
            z-index: 500; cursor: default;
            backdrop-filter: blur(8px);
            transition: opacity 0.3s;
        `;
        badge.title = `Visitas totales: ${data.total}`;
        badge.innerHTML = `🌙 ${data.total} visitas`;
        badge.addEventListener('mouseenter', () => { badge.style.opacity = '0.5'; });
        badge.addEventListener('mouseleave', () => { badge.style.opacity = '1'; });
        document.body.appendChild(badge);
    } catch (_) { /* falla silenciosa */ }
}
 
// 5.5 — Cuenta regresiva detallada (reemplaza la simple en pantalla de bloqueo)
async function iniciarCountdownDetallado() {
    const reloj = document.getElementById('cuentaRegresiva');
    if (!reloj) return;
 
    async function actualizar() {
        try {
            const res  = await fetch('/api/countdown_detallado');
            const data = await res.json();
            if (data.abierto) { location.reload(); return; }
            reloj.innerHTML = `
                <span style="font-size:0.6em;display:block;margin-bottom:4px;color:#ff6b81;">
                    ${data.frase}
                </span>
                ${String(data.dias).padStart(2,'0')}d
                ${String(data.horas).padStart(2,'0')}h
                ${String(data.minutos).padStart(2,'0')}m
                ${String(data.segundos).padStart(2,'0')}s
            `;
        } catch (_) {
            // fallback al modo simple (el original)
        }
    }
    actualizar();
    setInterval(actualizar, 1000);
}
 
// 5.6 — Sobreescribir click de la luna para mostrar el poema
const lunaBtn = document.getElementById('lunaInteractiva');
if (lunaBtn) {
    // Remover el listener anterior y poner el nuevo
    const nuevoLuna = lunaBtn.cloneNode(true);
    lunaBtn.parentNode.replaceChild(nuevoLuna, lunaBtn);
    nuevoLuna.addEventListener('click', function(e) {
        e.stopPropagation();
        // Onda de luz (efecto visual)
        const onda = document.createElement('div');
        onda.classList.add('onda-luz');
        document.getElementById('contenedorLuna').appendChild(onda);
        setTimeout(() => onda.remove(), 1500);
        // Mostrar poema
        mostrarPoemaLuna();
    });
}
 
// 5.7 — Inicialización de todo
window.addEventListener('load', () => {
    cargarFraseDia();
    mostrarContadorVisitas();
 
    // Si hay pantalla de bloqueo activa, usar countdown detallado
    const bloqueo = document.getElementById('pantallaBloqueo');
    if (bloqueo && !bloqueo.classList.contains('oculto')) {
        iniciarCountdownDetallado();
    }
});
 
// 5.8 — Cargar estadísticas cuando se abra el regalo
const btnOrig = document.getElementById('botonRegalo');
if (btnOrig) {
    btnOrig.addEventListener('click', function onceHandler() {
        setTimeout(cargarEstadisticasAmor, 4000); // después de la animación
        btnOrig.removeEventListener('click', onceHandler);
    }, { once: true });
}