# cumplea-os

Aplicacion Flask para una experiencia de cumpleanos con vistas inmersivas, APIs de contenido y minijuegos.

## Stack

- Python 3.11+
- Flask 3 / Flask-CORS
- Gunicorn (produccion)
- `cryptography` (cifrado en reposo, opcional)
- `itsdangerous` (cookies admin firmadas — viene con Flask)

## Estructura

- `app.py`: entrypoint, registro de blueprints, healthchecks, rate limiting y headers.
- `controllers/`: rutas HTTP y vistas (un blueprint por archivo).
- `services/`: persistencia JSON, cifrado y primitivas de seguridad HTTP.
- `api/`: clases base (`BaseModule`, `APIModule`).
- `templates/` / `static/`: HTML, JS, CSS, audio.
- `data/`: datos persistentes (volumen montable).
- `tests/`: suite con `unittest` (incluye smoke, crypto, persistencia y admin auth).

## Configuracion local

1. `cp .env.example .env`
2. Completar `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` (opcional, solo notificaciones).
3. Generar y completar `ADMIN_TOKEN` (obligatorio para acceder a `/admin`):

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. (Opcional) Generar `APP_ENCRYPTION_KEY` para cifrar `data/*.json` en reposo:

   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

Variables clave:

| Variable | Descripcion |
|---|---|
| `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` | Notificaciones a Telegram. |
| `ADMIN_TOKEN` | Sin este token configurado, `/admin` y `/api/test_telegram` devuelven 503. |
| `APP_ENCRYPTION_KEY` | Una o varias claves Fernet separadas por coma (la primera cifra, cualquiera descifra — habilita rotacion). |
| `APP_DATA_DIR` | Directorio base para persistencia JSON. |
| `FECHA_APERTURA_ISO` | Override de la fecha de apertura sin editar codigo (formato `YYYY-MM-DDTHH:MM:SS`). |
| `PREVIEW_MODE_ENABLED` | `=1` habilita `/preview` y los query params `?preview_state=open|locked` / `?preview_open_at=...`. |
| `CORS_ALLOWED_ORIGINS` | Lista CSV de origenes o `*` (default permisivo). |
| `MAX_CONTENT_LENGTH_BYTES` | Tamano maximo de request (default 256 KiB). |
| `LEGACY_PLAINTEXT_MESSAGE_LOG` | Si `=1`, escribe ademas en `buzon_secreto.txt`. |

## Ejecucion local

```bash
pip install -r requirements.txt
python app.py
```

App: <http://127.0.0.1:5000>

### Features destacadas

- **Cartas Selladas**: desde `/admin` puedes crear mensajes con fecha de apertura específica. Luna solo los ve cuando llega su momento. Persistencia atómica, cifrada en reposo si `APP_ENCRYPTION_KEY` está configurado.
- **Modo Serie (`/series`)**: vista cinematica con 3 temas (`net`, `galaxy`, `chocolate`) via `?series_theme=...`, episodios dinamicos y galeria orbital.
- **Galeria escalable**: `GET /api/recuerdos_media` lista automaticamente todas las imagenes de `static/DEFAULT_RECUERDOS`, sin hardcodear `foto1..foto5`.
- **Regalo del día**: `GET /api/regalo_diario` devuelve cada día un payload único (frase + verso + dato personal + paleta + emoji), determinista por fecha — el mismo día siempre produce el mismo regalo, distintos días garantizan variación.
- **PWA**: La app es instalable en móvil (Android/iOS) gracias al manifest y al service worker que cachea el app-shell para uso offline.
- **Contador de visitas real**: cada visita a `/` se persiste atómicamente (`ServicioBase.actualizar(callback)`).

Healthchecks:

- `GET /healthz` — incluye `encryption_enabled` y `admin_protected`.
- `GET /api/healthz` — minimal.
- `GET /api/healthz/details` *(admin)* — uptime, PID, contadores HTTP por clase de status, hits del contador de visitas, denegaciones de rate-limit, estado de Telegram.

## Acceso al panel admin

1. Visita `/admin`. Sin sesion, te redirige a `/admin/login`.
2. Pega tu `ADMIN_TOKEN`. El servidor responde con una cookie de sesion firmada (`HttpOnly`, `SameSite=Strict`, `Secure` cuando hay TLS) valida 8 horas.
3. `POST /admin/logout` para cerrar sesion.

Las APIs admin (`/api/salud`, `/api/test_telegram`) aceptan la cookie, un header `X-Admin-Token`, o `Authorization: Bearer <token>` — util para CI o scripts.

Panel de pruebas:

- `GET /preview` (ahora permite elegir destino: `/`, `/series`, `/universo`, etc. y tema de `series`)
- `GET /admin` (incluye acceso rapido a Preview Lab)

## Pruebas

```bash
python -m unittest discover -s tests -v
```

La suite (62 tests) cubre:

- Renderizado publico, healthchecks, CSP estricta en `/admin` (`test_api_smoke.py`).
- Contador de visitas: `GET /` incrementa el bucket del día.
- `/api/healthz/details` requiere admin y reporta counters/uptime.
- Rate limiting (`/api/test_telegram` topa a 5 req/min).
- Roundtrip y rotacion de claves Fernet (`test_crypto_service.py`).
- Persistencia: roundtrip plaintext y cifrado, JSON corrupto, fallo de filesystem, **escritura concurrente de 4 hilos sin corrupcion**, `actualizar(callback)` atómico (`test_base_service.py`, `test_visitas_service.py`).
- Admin: cookie firmada, rechazo de token erroneo, 503 si no configurado, tampering detectado (`test_admin_auth.py`).
- Telegram: retry en 5xx, honra `Retry-After` en 429, no reintenta en 4xx que no sea 429, da por vencido tras 3 intentos (`test_telegram_retry.py`).
- Cartas selladas: validación de campos, unlock por fecha (incluido formato Zulu), borrado, sanitización de control chars, límite de 200 cartas (`test_cartas_service.py`).
- Regalo diario: determinismo por día y forma del payload.
- PWA: manifest válido, service worker servido en root con `Service-Worker-Allowed`.

## Despliegue en Railway

`railway.json` y `gunicorn.conf.py` ya estan configurados. Pasos:

1. Crear el servicio y conectar el repo.
2. Variables de entorno obligatorias:
   - `ADMIN_TOKEN`
   - `APP_DATA_DIR=/app/data` (recomendado con volumen)
   - (Opcional) `GUNICORN_WORKERS=2` — en Railway el default ya se limita a 2 workers para evitar OOM
3. Variables opcionales pero recomendadas:
   - `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`
   - `APP_ENCRYPTION_KEY`
4. Adjuntar un volumen montado en `/app/data` para persistencia real.

## Seguridad

Defensa en profundidad:

- **Headers**: `HSTS` (en HTTPS), `CSP`, `X-Frame-Options: DENY`, `Cross-Origin-*-Policy`, `nosniff`, `Permissions-Policy`.
- **Rate limiting** in-memory por IP + path (sliding window). Para limites duros cross-worker usa un proxy/CDN delante.
- **Admin gating**: cookie firmada con `ADMIN_TOKEN`, comparada en tiempo constante. Sin token configurado, `/admin` queda apagado con 503.
- **Cifrado en reposo opcional**: envelope JSON Fernet con soporte `MultiFernet` para rotacion sin downtime.
- **Persistencia atomica**: escritura via temp file + `os.replace` + `fsync` + bloqueo cooperativo (threading.Lock por path + advisory file lock `fcntl`/`msvcrt`).
- **Logs correlacionados**: cada peticion recibe un `X-Request-ID` (incoming o generado) propagado a los logs y a la respuesta.

> Si en algun momento tu `TELEGRAM_TOKEN` aparecio en el repo (por ejemplo en `logs/app.log`), **rotalo en @BotFather inmediatamente** — un token filtrado debe considerarse comprometido.

## Preview de fecha de apertura

Con `PREVIEW_MODE_ENABLED=1`, puedes simular estados sin tocar codigo:

- `/?preview_state=open`
- `/?preview_state=locked`
- `/?preview_open_at=2026-08-30T00:00:00`
- `/?preview=1` (bypass visual cliente, para revisar UI rapido)
- `/series?series_theme=net|galaxy|chocolate`

El endpoint `GET /api/preview_estado` muestra la fecha base, la efectiva y el estado calculado.

Si ves el countdown cuando esperabas modo abierto:

- Entra por `GET /preview`, elige destino y modo, y usa `Bypass cliente (?preview=1)` para testear UI sin backend.
- Para `open/locked/custom`, confirma `PREVIEW_MODE_ENABLED=1` en tu `.env` y reinicia la app.
- Verifica estado real en `GET /api/preview_estado`.

## Auditoría de despliegue

Para auditar si el hosting realmente está sirviendo la última build (DNS/TCP/health/build-info):

```bash
python scripts/deploy_audit.py https://tu-dominio
```

Si `/api/build_info` falla o responde sin `preview_lab_rev`, estás viendo una instancia antigua o caída.

## Persistencia de datos

- Lectura principal: `data/<recurso>.json` (cifrado si hay key).
- Compatibilidad de lectura: `controllers/data/constelaciones_creadas.json` se sigue mergeando.
- Las escrituras son atomicas: el archivo final solo se sobrescribe cuando el temporal ya esta en disco.
- Para incrementos atomicos sobre el mismo archivo (p. ej. el contador de visitas) usa `ServicioBase.actualizar(callback)` — mantiene el lock por todo el ciclo read-modify-write.
