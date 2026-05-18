"""
services/metrics_service.py - Tiny in-process counters for the admin
healthz/details panel.

In-memory only and per-worker, so under multi-worker Gunicorn each worker
exposes its own snapshot. That's intentional: it stays dependency-free
and the surface is informational, not a billing meter.
"""
from __future__ import annotations

import os
import threading
import time
from collections import Counter
from typing import Any

_BOOTED_AT = time.time()
_lock = threading.Lock()
_counters: Counter[str] = Counter()


def bump(name: str, amount: int = 1) -> None:
    with _lock:
        _counters[name] += amount


def snapshot() -> dict[str, Any]:
    with _lock:
        counters = dict(_counters)
    return {
        "uptime_seconds": int(time.time() - _BOOTED_AT),
        "pid": os.getpid(),
        "counters": counters,
    }
