"""
app.py — Orquestador principal de Flask.
BUG FIX: eliminadas las rutas duplicadas (/,/carta,/universo,/aurora,/timeline)
que ya existen en regalo_module y efectos_module. Flask lanzaba AssertionError
en producción (DEBUG=False) por endpoints con el mismo nombre.
"""
import logging
from pathlib import Path

from flask import Flask
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Logging ─────────────────────────────────────────────────
_handlers = [logging.StreamHandler()]
try:
    Path("logs").mkdir(exist_ok=True)
    _handlers.insert(0, logging.FileHandler("logs/app.log", encoding="utf-8"))
except OSError:
    pass
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=_handlers,
)

# ── Aplicación ───────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Blueprints ───────────────────────────────────────────────
# Las rutas viven SOLO en cada módulo; app.py no define ninguna.
from controllers.api_mensajes       import mensajes_module
from controllers.api_estadisticas   import estadisticas_module
from controllers.api_regalo         import regalo_module      # registra /, /carta, /universo, /admin
from controllers.api_contenido      import contenido_module
from controllers.api_efectos        import efectos_module     # registra /aurora, /timeline
from controllers.api_constelaciones import creador_bp
from controllers.api_capsula        import capsula_bp
# NOTA: api_auth.py existe pero NO se registra para evitar duplicar
# /verificar_nombre que ya vive en api_mensajes (con notificación Telegram).
# Se conserva el archivo por si en el futuro se separa la auth en su módulo.

app.register_blueprint(mensajes_module.bp)
app.register_blueprint(estadisticas_module.bp)
app.register_blueprint(regalo_module.bp)
app.register_blueprint(contenido_module.bp)
app.register_blueprint(efectos_module.bp)
app.register_blueprint(creador_bp)
app.register_blueprint(capsula_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)