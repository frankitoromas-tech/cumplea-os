"""
=============================================================
  🌙 app.py — Orquestador principal (Flask)
  Autor: Frank  |  Para: Luyuromo
  Ahora delega TODA la lógica a módulos en api/
  app.py solo inicializa y registra blueprints.
=============================================================
"""
import os, logging
from pathlib import Path
from flask import Flask

# ── dotenv opcional ──────────────────────────────────────────
try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass

# ── Logging ──────────────────────────────────────────────────
LOG_DIR   = Path(__file__).parent / "logs"
_handlers = [logging.StreamHandler()]
try:
    LOG_DIR.mkdir(exist_ok=True)
    _handlers.insert(0, logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8"))
except OSError:
    pass
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=_handlers)
logger = logging.getLogger(__name__)

# ── Flask app ────────────────────────────────────────────────
app = Flask(__name__)

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# ── Importar y registrar todos los módulos ───────────────────
from api.regalo     import regalo_module
from api.estadisticas import estadisticas_module
from api.mensajes    import mensajes_module
from api.efectos     import efectos_module
from capsula_api     import capsula_bp
from creador_constelaciones import creador_bp

app.register_blueprint(regalo_module.blueprint())
app.register_blueprint(estadisticas_module.blueprint())
app.register_blueprint(mensajes_module.blueprint())
app.register_blueprint(efectos_module.blueprint())
app.register_blueprint(capsula_bp)
app.register_blueprint(creador_bp)

# ── Compatibilidad: rutas que app.py solía definir directamente ──
# Las rutas principales ya están en los módulos.
# Solo dejamos el punto de entrada.

if __name__ == "__main__":
    logger.info("🌙 Servidor iniciado — arquitectura modular activa")
    app.run(debug=True, host="0.0.0.0", port=5000)