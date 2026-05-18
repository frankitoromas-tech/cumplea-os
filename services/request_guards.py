"""
services/request_guards.py — Cross-cutting HTTP guards for write endpoints.

Used as decorators or called from app.before_request. Designed to fail
closed in production while staying off by default in local/test runs.
"""
from __future__ import annotations

import logging
import os
from functools import wraps
from typing import Callable
from urllib.parse import urlparse

from flask import jsonify, request

logger = logging.getLogger(__name__)

_HONEYPOT_FIELDS = frozenset({"website", "url", "company", "_gotcha", "hp_field"})


def _allowed_cors_origins() -> set[str] | None:
    raw = (os.getenv("CORS_ALLOWED_ORIGINS") or "*").strip()
    if not raw or raw == "*":
        return None
    return {origin.strip() for origin in raw.split(",") if origin.strip()}


def _origin_enforcement_enabled() -> bool:
    return (os.getenv("ENFORCE_SAME_ORIGIN_WRITES") or "0").strip() == "1"


def validate_write_origin() -> tuple[bool, str]:
    """
  For mutating requests, optionally require Origin/Referer to match this host
  or an entry in CORS_ALLOWED_ORIGINS.
  """
    if not _origin_enforcement_enabled():
        return True, ""
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return True, ""

    allowed = _allowed_cors_origins()
    host_url = request.host_url.rstrip("/")
    origin = (request.headers.get("Origin") or "").strip()

    if origin:
        if allowed is not None:
            return origin in allowed, "origin"
        if origin.rstrip("/") == host_url:
            return True, ""
        logger.warning(
            "Blocked cross-origin write: origin=%s host=%s path=%s",
            origin,
            host_url,
            request.path,
        )
        return False, "origin"

    referer = (request.headers.get("Referer") or "").strip()
    if referer:
        try:
            ref_origin = f"{urlparse(referer).scheme}://{urlparse(referer).netloc}"
        except ValueError:
            return False, "referer"
        if allowed is not None:
            return ref_origin in allowed, "referer"
        if ref_origin.rstrip("/") == host_url:
            return True, ""
        logger.warning(
            "Blocked cross-site write: referer=%s host=%s path=%s",
            referer,
            host_url,
            request.path,
        )
        return False, "referer"

    # No Origin/Referer (curl, some clients) — allow for API tooling.
    return True, ""


def honeypot_triggered(payload: dict | None) -> bool:
    if not isinstance(payload, dict):
        return False
    for field in _HONEYPOT_FIELDS:
        value = payload.get(field)
        if value is not None and str(value).strip():
            return True
    return False


def require_json_body(view: Callable):
    """Reject non-JSON POST/PUT/PATCH bodies on API routes (415)."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if request.method in {"POST", "PUT", "PATCH"}:
            ct = (request.content_type or "").split(";")[0].strip().lower()
            if ct and ct != "application/json":
                return (
                    jsonify(
                        {
                            "status": "error",
                            "mensaje": "Content-Type debe ser application/json.",
                        }
                    ),
                    415,
                )
        return view(*args, **kwargs)

    return wrapper


def reject_honeypot(view: Callable):
    """
    If a bot fills a hidden field, return a benign 200 without running the handler.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        data = request.get_json(silent=True) or {}
        if honeypot_triggered(data):
            logger.info("Honeypot triggered on %s from %s", request.path, request.remote_addr)
            return jsonify({"status": "ok"}), 200
        return view(*args, **kwargs)

    return wrapper
