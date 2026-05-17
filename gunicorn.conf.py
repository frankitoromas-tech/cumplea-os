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


bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Keep sensible defaults while allowing full override from environment variables.
workers = _int_env("GUNICORN_WORKERS", max((multiprocessing.cpu_count() * 2) + 1, 2))
threads = _int_env("GUNICORN_THREADS", 2)
timeout = _int_env("GUNICORN_TIMEOUT", 120)
graceful_timeout = _int_env("GUNICORN_GRACEFUL_TIMEOUT", 30)
keepalive = _int_env("GUNICORN_KEEPALIVE", 5)

accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
