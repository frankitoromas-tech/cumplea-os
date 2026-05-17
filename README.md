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

## Ejecucion local

```bash
pip install -r requirements.txt
python app.py
```

App local: `http://127.0.0.1:5000`

Healthchecks:

- `GET /healthz`
- `GET /api/healthz`

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

## Persistencia de datos

- Se mantiene compatibilidad de lectura para constelaciones en ruta legacy:
  - `controllers/data/constelaciones_creadas.json`
- La ruta principal actual se consolida en:
  - `data/constelaciones_creadas.json`
