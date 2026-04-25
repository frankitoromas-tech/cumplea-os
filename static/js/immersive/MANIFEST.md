# Capa Inmersiva — Manifest

> Stack frontend que añade audio, animación, profundidad 3D y experiencias mágicas
> al regalo de Luna sin tocar la lógica base del proyecto Flask.
>
> Si alguna vez Frank quiere desactivar TODO lo de aquí: borra el `<script>` de
> `boot.js` en `templates/index.html` y de `boot-lite.js` en los demás templates.
> Cero efecto sobre la lógica del bloqueo, auth, easter eggs originales o backend.

## Arquitectura general

```
templates/index.html        → carga boot.js
templates/{aurora,timeline,carta,universo}.html → carga boot-lite.js
static/css/immersive.css    → única hoja de estilos
static/js/immersive/        → todos los módulos (este directorio)
```

Cada módulo es un IIFE que se autoinicializa y se registra en `window.__nombreModulo`.
Si una dependencia (CDN, Three.js, Tone.js, etc.) no está disponible, **el módulo
debe fallar en silencio** sin romper a sus vecinos.

## Mapa de módulos

### Bootstrap

| Archivo            | Carga | Función |
|--------------------|-------|---------|
| `boot.js`          | `index.html` | Bootloader principal: CDNs en paralelo + 19 módulos locales |
| `boot-lite.js`     | resto | Bootloader reducido para subpáginas (sin Three/Lenis) |
| `error-boundary.js`| ambos | Captura errores globales y muestra banner si críticos |
| `preview-mode.js`  | `index` | `?preview=1` bypassa el bloqueo (solo para testing) |

### Audio

| Archivo            | Función |
|--------------------|---------|
| `audio-engine.js`  | Motor central: Howler + crossfade + mute + fallback automático |
| `synth-sfx.js`     | Sintetizador Web Audio para hover/click/reveal/transition |
| `synth-music.js`   | Compositor procedural Tone.js: 4 canciones con estructura completa |
| `lyric-sync.js`    | Karaoke sincronizado a `synthmusic:beat` |

### Visual / 3D

| Archivo                    | Función |
|----------------------------|---------|
| `bg-particles.js`          | Three.js — 1500 partículas reactivas al audio (analyser) |
| `cake-3d.js`               | Pastel 3D real con velas que se apagan al soplar |
| `memory-universe.js`       | Galaxia navegable de las polaroids |
| `cinema-mode.js`           | Click polaroid → fullscreen con nav ←/→ |
| `cinema-polaroid.js`       | DEPRECADO — stub, reemplazado por cinema-mode |
| `cursor-trail.js`          | Estela del cursor reactiva al audio |
| `tilt-cards.js`            | CSS 3D al cursor en .marco-foto/.caja-regalo/.tl-card |
| `audio-reactive-luna.js`   | #lunaInteractiva respira con el bajo |
| `scroll-engine.js`         | Lenis + GSAP ScrollTrigger + reveals/parallax/pin |

### Sentimiento

| Archivo                | Función |
|------------------------|---------|
| `shared-heartbeat.js`  | CSS vars `--heartbeat` a 76 BPM (latido humano) |
| `magnetic-cursor.js`   | Botones que atraen el cursor cuando está cerca |
| `page-transitions.js`  | Fade-to-black / View Transitions API entre rutas |
| `luyuromo-mode.js`     | EE: escribe "luyuromo" → modo noche estrellada |
| `more-easter-eggs.js`  | EE: "te amo", triple-luna, long-press en polaroids |

### Diagnóstico

| Archivo            | Función |
|--------------------|---------|
| `debug-hud.js`     | **Shift+D** muestra panel en vivo: FPS, audio, bandas |

## Eventos custom expuestos

```
synthmusic:start    detail:{ key }
synthmusic:beat     detail:{ key, measure, section }
synthmusic:stop     detail:{ key }
immersive:audio-unlocked
immersive:ready
immersive:ready-lite
```

## Globals expuestos en `window.__*`

```
__immersiveAudio    .sfx() .section() .stop() .toggleMute() .isMuted()
__synthSfx          .play(name)
__synthMusic        .play() .stop() .stopAll() .setMasterDb() .isPlaying() .currentMeasure()
__immersiveBg       .readBands() .hasAnalyser() .canvas .renderer .scene .camera
__immersiveScroll   .lenis() .refresh()
__immersiveTilt     .scan()
__cinemaMode
__cake3D
__memoryUniverse    .open() .close()
__lyricSync         .show() .clear() .setLyrics()
__heartbeat         .pause() .resume() .bpm
__cursorTrail
__audioReactiveLuna
__luyuromoMode
__moreEasterEggs    .triggers.lluviaCorazones .triggers.revelarLuna
__previewMode
__debugHud          .toggle()
__errorBoundary     .report() .forceBanner() .silence(re)
```

## Cosas que NO se pueden tocar (memoria del proyecto)

- `script.js` — solo el fix del countdown drift en líneas 576-595 con permiso del autor.
- `EasterEggManager.js` — usado como base para nuevos EE pero NO modificado.
- `controllers/`, `services/`, `models/`, `app.py` — backend Flask intacto.
- La lógica del 30/08/2026 vive en `script.js iniciarBloqueo` + `controllers/api_estadisticas.py estado_regalo`.

## Convenciones

- Todos los módulos respetan `prefers-reduced-motion`.
- Todos los módulos chequean `pantallaBloqueo`/`pantallaAuth` antes de mostrarse.
- Todos los módulos son singletons (early return si `window.__<modulo>`).
- Estilos se inyectan **en JS** cuando son específicos del módulo, **en immersive.css** cuando son compartidos o de tematización.
- Los assets opcionales (MP3 de música/SFX) son fallback-safe: si no existen, los sintetizadores procedurales toman el relevo.

## CDNs externos (en orden de criticidad)

1. **Howler 2.2.4** — `https://cdn.jsdelivr.net/npm/howler@2.2.4/`
2. **Lenis 1.1.13** — `https://cdn.jsdelivr.net/npm/lenis@1.1.13/`
3. **GSAP ScrollTrigger 3.12.5** — `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/`
4. **Three.js r160** — `https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/`
5. **Tone.js 14.8.49** — `https://cdn.jsdelivr.net/npm/tone@14.8.49/` (lazy, solo si la música procedural se invoca)

GSAP base ya viene en `index.html` línea 203.
