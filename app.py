"""
app.py - Flask entrypoint and application wiring.
"""
from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from threading import Lock

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

from services import metrics_service
from services.security_service import attach_request_id, require_admin_token
from services.visitas_service import ServicioVisitas

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


class _RequestIdLogFilter(logging.Filter):
    """Attach Flask's per-request ID to log records when available."""

    def filter(self, record: logging.LogRecord) -> bool:
        request_id = "-"
        try:
            from flask import has_request_context

            if has_request_context():
                request_id = getattr(g, "request_id", "-") or "-"
        except Exception:
            pass
        record.request_id = request_id
        return True


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

    log_filter = _RequestIdLogFilter()
    for handler in handlers:
        handler.addFilter(log_filter)

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s req=%(request_id)s :: %(message)s",
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


class _InMemoryRateLimiter:
    """
    Basic per-key sliding-window limiter.

    Suitable for single-process deployments. Under multi-worker Gunicorn the
    effective per-IP limit scales with the worker count; document accordingly
    or front the app with an upstream limiter (nginx/CDN) for hard caps.
    """

    def __init__(self, max_keys: int = 50_000) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._max_keys = max_keys

    def allow(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        retry_after = 1

        with self._lock:
            queue = self._events[key]
            while queue and queue[0] < cutoff:
                queue.popleft()

            if len(queue) >= max_requests:
                retry_after = max(int(window_seconds - (now - queue[0])), 1)
                return False, retry_after

            queue.append(now)

            if len(self._events) > self._max_keys:
                # Drop the oldest empty buckets to bound memory.
                for stale_key in [k for k, v in self._events.items() if not v][:1024]:
                    self._events.pop(stale_key, None)
            return True, retry_after


_DEFAULT_API_WRITE_LIMIT = (120, 60)  # 120 requests / 60 seconds
_API_LIMITS: dict[str, tuple[int, int]] = {
    "/api/verificar_nombre": (30, 60),
    "/verificar_nombre": (30, 60),
    "/api/responder": (8, 60),
    "/responder": (8, 60),
    "/api/notificar": (40, 60),
    "/notificar": (40, 60),
    "/api/test_telegram": (5, 60),
    "/test_telegram": (5, 60),
    "/api/guardar_constelacion": (12, 60),
}


def _default_csp_policy() -> str:
    # `unsafe-inline` is kept for scripts/styles because public templates still
    # embed both. /admin uses a stricter policy applied below.
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "media-src 'self' data: blob:; "
        "connect-src 'self'"
    )


def _admin_csp_policy() -> str:
    """Stricter policy for the admin surface: no inline scripts."""
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'none'; "
        "form-action 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "connect-src 'self'"
    )


def create_app() -> Flask:
    _configure_logging()

    app = Flask(__name__)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)  # type: ignore[assignment]
    app.json.ensure_ascii = False
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH_BYTES", str(256 * 1024)))
    _configure_cors(app)
    limiter = _InMemoryRateLimiter()
    app.extensions["rate_limiter"] = limiter

    visitas_service = ServicioVisitas()
    app.extensions["visitas_service"] = visitas_service

    # Blueprints
    from controllers.api_auth import auth_module
    from controllers.api_capsula import capsula_bp
    from controllers.api_constelaciones import creador_bp
    from controllers.api_contenido import contenido_module
    from controllers.api_efectos import efectos_module
    from controllers.api_estadisticas import estadisticas_module
    from controllers.api_mensajes import mensajes_module
    from controllers.api_regalo import regalo_module

    app.register_blueprint(auth_module.bp)
    app.register_blueprint(mensajes_module.bp)
    app.register_blueprint(estadisticas_module.bp)
    app.register_blueprint(regalo_module.bp)
    app.register_blueprint(contenido_module.bp)
    app.register_blueprint(efectos_module.bp)
    app.register_blueprint(creador_bp)
    app.register_blueprint(capsula_bp)

    @app.before_request
    def _attach_id():
        attach_request_id()

    @app.before_request
    def _apply_rate_limits():
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None
        if request.path not in _API_LIMITS and not request.path.startswith("/api/"):
            return None

        client_ip = request.remote_addr or "unknown"
        max_requests, window_seconds = _API_LIMITS.get(request.path, _DEFAULT_API_WRITE_LIMIT)
        allowed, retry_after = limiter.allow(
            key=f"{client_ip}:{request.path}",
            max_requests=max_requests,
            window_seconds=window_seconds,
        )
        if allowed:
            return None

        metrics_service.bump("rate_limit.denied")
        body = {
            "status": "error",
            "mensaje": "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
            "retry_after": retry_after,
        }
        return jsonify(body), 429, {"Retry-After": str(retry_after)}

    @app.after_request
    def _record_visit(response):
        if request.method == "GET" and request.path == "/" and 200 <= response.status_code < 400:
            try:
                visitas_service.registrar()
                metrics_service.bump("visits.home")
            except Exception:
                logging.getLogger(__name__).exception("visit counter failed")
        return response

    @app.after_request
    def _bump_status_counter(response):
        status_class = f"http.{response.status_code // 100}xx"
        metrics_service.bump(status_class)
        return response

    @app.after_request
    def _set_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")

        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers.setdefault("X-Request-ID", request_id)

        if request.is_secure:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        if request.path.startswith("/admin"):
            csp = os.getenv("ADMIN_CSP_POLICY", _admin_csp_policy()).strip()
        else:
            csp = os.getenv("CSP_POLICY", _default_csp_policy()).strip()
        if csp:
            response.headers.setdefault("Content-Security-Policy", csp)

        if request.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store, max-age=0")

        return response

    @app.errorhandler(413)
    def _too_large(_):
        return (
            jsonify(
                {
                    "status": "error",
                    "mensaje": "Carga util demasiado grande.",
                }
            ),
            413,
        )

    @app.get("/healthz")
    def healthz():
        return (
            jsonify(
                {
                    "status": "ok",
                    "encryption_enabled": bool(os.getenv("APP_ENCRYPTION_KEY")),
                    "admin_protected": bool(os.getenv("ADMIN_TOKEN")),
                }
            ),
            200,
        )

    @app.get("/api/healthz")
    def healthz_api():
        return jsonify({"status": "ok"}), 200

    @app.get("/api/healthz/details")
    @require_admin_token
    def healthz_details():
        from controllers.api_mensajes import mensajes_module as _mensajes

        snap = metrics_service.snapshot()
        snap.update(
            {
                "encryption_enabled": bool(os.getenv("APP_ENCRYPTION_KEY")),
                "admin_protected": bool(os.getenv("ADMIN_TOKEN")),
                "telegram": "conectado" if _mensajes._tg_ok() else "sin conexion",
                "visitas": visitas_service.leer(),
                "rate_limit_active_keys": len(limiter._events),
            }
        )
        return jsonify(snap), 200

    return app


app = create_app()


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
