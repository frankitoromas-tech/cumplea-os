"""
app.py - Flask entrypoint and application wiring.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def _configure_logging() -> None:
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    handlers: list[logging.Handler] = [logging.StreamHandler()]
    try:
        log_dir = Path(os.getenv("LOG_DIR", "logs"))
        log_dir.mkdir(parents=True, exist_ok=True)
        handlers.insert(0, logging.FileHandler(log_dir / "app.log", encoding="utf-8"))
    except OSError:
        # Non-fatal in read-only filesystems or restricted runtimes.
        pass

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
        handlers=handlers,
        force=True,
    )


def _configure_cors(app: Flask) -> None:
    allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*").strip()
    if not allowed_origins or allowed_origins == "*":
        CORS(app)
        return

    origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]
    CORS(app, resources={r"/*": {"origins": origins}})


def create_app() -> Flask:
    _configure_logging()

    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)  # type: ignore[assignment]
    app.json.ensure_ascii = False
    _configure_cors(app)

    # Blueprints
    from controllers.api_capsula import capsula_bp
    from controllers.api_constelaciones import creador_bp
    from controllers.api_contenido import contenido_module
    from controllers.api_efectos import efectos_module
    from controllers.api_estadisticas import estadisticas_module
    from controllers.api_mensajes import mensajes_module
    from controllers.api_regalo import regalo_module

    app.register_blueprint(mensajes_module.bp)
    app.register_blueprint(estadisticas_module.bp)
    app.register_blueprint(regalo_module.bp)
    app.register_blueprint(contenido_module.bp)
    app.register_blueprint(efectos_module.bp)
    app.register_blueprint(creador_bp)
    app.register_blueprint(capsula_bp)

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"}), 200

    @app.get("/api/healthz")
    def healthz_api():
        return jsonify({"status": "ok"}), 200

    return app


app = create_app()


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
