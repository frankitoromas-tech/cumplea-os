# cumplea-os

Aplicacion Flask para una experiencia de cumpleanos con vistas inmersivas, APIs de contenido y minijuegos.

## Stack

- Python 3.11+
- Flask 3
- Flask-CORS
- Requests
- Gunicorn

## Estructura

- `app.py`: entrypoint, registro de blueprints y healthchecks.
- `controllers/`: rutas HTTP y vistas.
- `services/`: persistencia JSON y utilidades de datos.
- `api/`: clases base (`BaseModule`, `APIModule`).
- `templates/`: vistas HTML.
- `static/`: JS/CSS/assets.
- `data/`: datos persistentes.
- `tests/`: smoke tests (`unittest`).

## Configuracion local

1. Copiar `.env.example` como `.env`.
2. Completar credenciales de Telegram (si quieres notificaciones).

Variables clave:

- `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`
- `CORS_ALLOWED_ORIGINS` (por defecto `*`)
- `APP_DATA_DIR` (directorio base para persistencia JSON)
- `FECHA_APERTURA_ISO` (override de apertura sin editar codigo)
- `PREVIEW_MODE_ENABLED=1` (permite simulaciones por query params)
- `APP_ENCRYPTION_KEY` (cifra datos sensibles en disco con Fernet)
- `MAX_CONTENT_LENGTH_BYTES` (limita tamano de request)
- `LEGACY_PLAINTEXT_MESSAGE_LOG=0` (evita logs sensibles en texto plano)

## Ejecucion local

```bash
pip install -r requirements.txt
python app.py
```

App local: `http://127.0.0.1:5000`

Healthchecks:

- `GET /healthz`
- `GET /api/healthz`

Panel de pruebas:

- `GET /preview`
- `GET /admin` (incluye acceso rapido a Preview Lab)

## Pruebas

```bash
python -m unittest discover -s tests -v
```

## Despliegue en Railway

Este repo ya incluye configuracion lista para Railway:

- `railway.json`: builder, start command, healthcheck, restart policy.
- `gunicorn.conf.py`: tuning de workers/threads/timeouts.

Pasos:

1. Crear servicio en Railway y conectar el repo.
2. Definir variables de entorno:
   - `TELEGRAM_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `APP_DATA_DIR=/app/data` (recomendado con volumen)
3. Adjuntar un volumen y montarlo en `/app/data` para persistencia real.
4. Deploy.

## Seguridad

- Headers de seguridad HTTP activados (`HSTS`, `CSP`, `X-Frame-Options`, `nosniff`, etc.).
- Rate limiting en endpoints sensibles para reducir abuso automatizado.
- Cifrado opcional de datos persistidos (mensajes/JSON) con `APP_ENCRYPTION_KEY`.
- Datos sensibles removidos del versionado (`.env`, mensajes y JSON runtime).

Generar clave de cifrado:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Nota: si una credencial estuvo en el repo publico en el pasado, debes rotarla en el proveedor
correspondiente (por ejemplo Telegram token/chat id).

## Preview de fecha de apertura

Con `PREVIEW_MODE_ENABLED=1`, puedes simular estados sin tocar codigo:

- `/?preview_state=open`
- `/?preview_state=locked`
- `/?preview_open_at=2026-08-30T00:00:00`
- `/?preview=1` (bypass visual cliente, para revisar UI rapido)

El endpoint `GET /api/preview_estado` muestra la fecha base, la efectiva y el estado calculado.

Si ves el countdown cuando esperabas modo abierto:

- Entra por `GET /preview` y elige `Bypass cliente (?preview=1)` para testear UI sin backend.
- Para `open/locked/custom`, confirma `PREVIEW_MODE_ENABLED=1` en tu `.env` y reinicia la app.
- Verifica estado real en `GET /api/preview_estado`.

## Persistencia de datos

- Se mantiene compatibilidad de lectura para constelaciones en ruta legacy:
  - `controllers/data/constelaciones_creadas.json`
- La ruta principal actual se consolida en:
  - `data/constelaciones_creadas.json`
