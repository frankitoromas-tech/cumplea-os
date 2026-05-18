"""
gunicorn.conf.py - Production defaults for container platforms.
"""
from __future__ import annotations

import multiprocessing
import os


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _running_on_railway() -> bool:
    return bool(
        (os.getenv("RAILWAY_ENVIRONMENT") or "").strip()
        or (os.getenv("RAILWAY_SERVICE_NAME") or "").strip()
        or (os.getenv("RAILWAY_PROJECT_NAME") or "").strip()
    )


def default_worker_count() -> int:
    """
    Pick a safe worker count for small containers.

    Railway (and similar PaaS) often expose the host CPU count, not the
    container quota. The naive ``(cpu * 2) + 1`` formula can spawn dozens
    of workers, each importing the full Flask app → OOM or healthcheck
    timeout before ``/healthz`` answers.
    """
    explicit = (os.getenv("GUNICORN_WORKERS") or "").strip()
    if explicit:
        return max(_int_env("GUNICORN_WORKERS", 2), 1)

    web = (os.getenv("WEB_CONCURRENCY") or "").strip()
    if web:
        return max(_int_env("WEB_CONCURRENCY", 2), 1)

    cpu = multiprocessing.cpu_count()
    computed = max((cpu * 2) + 1, 2)
    cap = _int_env("GUNICORN_WORKERS_MAX", 4)
    if _running_on_railway():
        cap = min(cap, _int_env("RAILWAY_GUNICORN_WORKERS_MAX", 2))
    return max(min(computed, cap), 1)


bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

workers = default_worker_count()
threads = _int_env("GUNICORN_THREADS", 2)
timeout = _int_env("GUNICORN_TIMEOUT", 120)
graceful_timeout = _int_env("GUNICORN_GRACEFUL_TIMEOUT", 30)
keepalive = _int_env("GUNICORN_KEEPALIVE", 5)

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")


def when_ready(server) -> None:  # noqa: ANN001 — gunicorn hook signature
    print(
        f"[gunicorn] ready bind={bind} workers={workers} threads={threads} "
        f"railway={_running_on_railway()}",
        flush=True,
    )
