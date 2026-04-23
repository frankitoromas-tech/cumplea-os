import os, logging
from pathlib import Path
from flask import Flask
from flask_cors import CORS

try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass

# Logging
_handlers = [logging.StreamHandler()]
try:
    Path("logs").mkdir(exist_ok=True)
    _handlers.insert(0, logging.FileHandler("logs/app.log", encoding="utf-8"))
except OSError:
    pass
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=_handlers)

app = Flask(__name__)
CORS(app)

# Blueprints — las rutas viven SOLO en cada módulo, nunca aquí
from controllers.api_mensajes      import mensajes_module
from controllers.api_estadisticas  import estadisticas_module
from controllers.api_regalo        import regalo_module      # tiene /, /carta, /universo, /admin
from controllers.api_contenido     import contenido_module
from controllers.api_efectos       import efectos_module     # tiene /aurora, /timeline
from controllers.api_constelaciones import creador_bp
from controllers.api_capsula       import capsula_bp

app.register_blueprint(mensajes_module.bp)
app.register_blueprint(estadisticas_module.bp)
app.register_blueprint(regalo_module.bp)
app.register_blueprint(contenido_module.bp)
app.register_blueprint(efectos_module.bp)
app.register_blueprint(creador_bp)
app.register_blueprint(capsula_bp)

# BUG FIX: eliminadas las rutas duplicadas que estaban aquí
# (/, /aurora, /timeline, /carta, /universo las registran los módulos)

if __name__ == "__main__":
    app.run(debug=True, port=5000)