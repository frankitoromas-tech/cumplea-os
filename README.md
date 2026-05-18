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
| `CORS_ALLOWED_ORIGINS` | Lista CSV de origenes o `*` (default permisivo). |
| `MAX_CONTENT_LENGTH_BYTES` | Tamano maximo de request (default 256 KiB). |
| `LEGACY_PLAINTEXT_MESSAGE_LOG` | Si `=1`, escribe ademas en `buzon_secreto.txt`. |

## Ejecucion local

```bash
pip install -r requirements.txt
python app.py
```

App: <http://127.0.0.1:5000>

Healthchecks:

- `GET /healthz` — incluye `encryption_enabled` y `admin_protected`.
- `GET /api/healthz` — minimal.

## Acceso al panel admin

1. Visita `/admin`. Sin sesion, te redirige a `/admin/login`.
2. Pega tu `ADMIN_TOKEN`. El servidor responde con una cookie de sesion firmada (`HttpOnly`, `SameSite=Strict`, `Secure` cuando hay TLS) valida 8 horas.
3. `POST /admin/logout` para cerrar sesion.

Las APIs admin (`/api/salud`, `/api/test_telegram`) aceptan la cookie, un header `X-Admin-Token`, o `Authorization: Bearer <token>` — util para CI o scripts.

## Pruebas

```bash
python -m unittest discover -s tests -v
```

La suite cubre:

- Renderizado publico y healthchecks (`test_api_smoke.py`).
- Rate limiting (`/api/test_telegram` topa a 5 req/min).
- Roundtrip y rotacion de claves Fernet (`test_crypto_service.py`).
- Persistencia: roundtrip plaintext y cifrado, JSON corrupto, fallo de filesystem, **escritura concurrente de 4 hilos sin corrupcion** (`test_base_service.py`).
- Admin: cookie firmada, rechazo de token erroneo, 503 si no configurado, tampering detectado (`test_admin_auth.py`).

## Despliegue en Railway

`railway.json` y `gunicorn.conf.py` ya estan configurados. Pasos:

1. Crear el servicio y conectar el repo.
2. Variables de entorno obligatorias:
   - `ADMIN_TOKEN`
   - `APP_DATA_DIR=/app/data` (recomendado con volumen)
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

## Persistencia de datos

- Lectura principal: `data/<recurso>.json` (cifrado si hay key).
- Compatibilidad de lectura: `controllers/data/constelaciones_creadas.json` se sigue mergeando.
- Las escrituras son atomicas: el archivo final solo se sobrescribe cuando el temporal ya esta en disco.
