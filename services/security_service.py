"""
services/security_service.py - Reusable HTTP security primitives.

Provides:
- `require_admin_token`: gates a JSON Flask handler behind `ADMIN_TOKEN`.
- `require_admin_session`: gates an HTML view via a signed cookie minted
  by /admin/login (token in URL is bookmark-friendly but the cookie keeps
  it out of logs once exchanged).
- `mint_admin_cookie` / `verify_admin_cookie`: helpers used by the login
  flow.
- `attach_request_id`: per-request opaque ID for log correlation.
"""
from __future__ import annotations

import hmac
import logging
import os
import secrets
from functools import wraps
from typing import Callable

from flask import g, jsonify, make_response, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

logger = logging.getLogger(__name__)

ADMIN_COOKIE = "admin_session"
ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours
_ADMIN_HEADER = "X-Admin-Token"
_ADMIN_QUERY = "admin_token"
_SIGNER_SALT = "cumpleaos-admin-v1"
_CSRF_SALT = "cumpleaos-csrf-v1"
_CSRF_MAX_AGE = 60 * 30  # 30 minutes


def _expected_admin_token() -> str:
    return (os.getenv("ADMIN_TOKEN") or "").strip()


def _provided_admin_token() -> str:
    header = request.headers.get(_ADMIN_HEADER, "").strip()
    if header:
        return header
    auth = request.headers.get("Authorization", "").strip()
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return (request.args.get(_ADMIN_QUERY) or "").strip()


def _signer() -> URLSafeTimedSerializer | None:
    expected = _expected_admin_token()
    if not expected:
        return None
    return URLSafeTimedSerializer(secret_key=expected, salt=_SIGNER_SALT)


def mint_csrf_token() -> str:
    """Short-lived token for POST /admin/login (double-submit)."""
    signer = _signer()
    if signer is None:
        raise RuntimeError("ADMIN_TOKEN no configurado.")
    return signer.dumps({"csrf": True})


def verify_csrf_token(value: str) -> bool:
    signer = _signer()
    if signer is None or not value:
        return False
    try:
        payload = signer.loads(value, max_age=_CSRF_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return False
    return bool(payload.get("csrf"))


def mint_admin_cookie() -> str:
    signer = _signer()
    if signer is None:
        raise RuntimeError("ADMIN_TOKEN no configurado.")
    return signer.dumps({"admin": True})


def verify_admin_cookie(value: str) -> bool:
    signer = _signer()
    if signer is None or not value:
        return False
    try:
        payload = signer.loads(value, max_age=ADMIN_COOKIE_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return False
    return bool(payload.get("admin"))


def _check_token(provided: str, expected: str) -> bool:
    return bool(provided) and hmac.compare_digest(provided, expected)


def require_admin_token(view: Callable):
    """
    Reject the request with 401/403 unless a valid token is presented via
    `X-Admin-Token` header, `Authorization: Bearer`, query string, or the
    signed admin cookie. Use for JSON endpoints.

    If `ADMIN_TOKEN` is unset, the handler hard-fails with 503 to avoid
    leaving an unauthenticated admin surface.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        expected = _expected_admin_token()
        if not expected:
            logger.error(
                "Admin endpoint %s blocked: ADMIN_TOKEN no configurado.", request.path
            )
            return (
                jsonify(
                    {
                        "status": "error",
                        "mensaje": "Admin disabled (ADMIN_TOKEN no configurado).",
                    }
                ),
                503,
            )

        cookie = request.cookies.get(ADMIN_COOKIE, "")
        if verify_admin_cookie(cookie):
            return view(*args, **kwargs)

        if (os.getenv("ADMIN_TOKEN_QUERY_ALLOWED") or "0").strip() != "1":
            if request.args.get(_ADMIN_QUERY):
                logger.warning(
                    "Admin token via query string rejected on %s from %s.",
                    request.path,
                    request.remote_addr or "unknown",
                )
                return (
                    jsonify(
                        {
                            "status": "error",
                            "mensaje": "Usa el header X-Admin-Token o la cookie de sesion.",
                        }
                    ),
                    403,
                )

        provided = _provided_admin_token()
        if not provided:
            return (
                jsonify({"status": "error", "mensaje": "Token requerido."}),
                401,
                {"WWW-Authenticate": 'Bearer realm="admin"'},
            )
        if not _check_token(provided, expected):
            logger.warning(
                "Admin auth failed for %s from %s.",
                request.path,
                request.remote_addr or "unknown",
            )
            return jsonify({"status": "error", "mensaje": "Token invalido."}), 403

        return view(*args, **kwargs)

    return wrapper


def require_admin_session(view: Callable):
    """
    Gate an HTML view behind the signed admin cookie. Redirects to a small
    login form when missing. Use for `/admin` (renders a template).
    """
    from flask import redirect

    @wraps(view)
    def wrapper(*args, **kwargs):
        if not _expected_admin_token():
            return (
                "<h1>Admin desactivado</h1>"
                "<p>Configura <code>ADMIN_TOKEN</code> en el entorno.</p>"
            ), 503

        cookie = request.cookies.get(ADMIN_COOKIE, "")
        if verify_admin_cookie(cookie):
            return view(*args, **kwargs)

        # Path-based redirect so the helper works in apps that didn't mount
        # the AuthModule blueprint (e.g. isolated unit tests).
        return redirect("/admin/login")

    return wrapper


def make_admin_login_response(target: str):
    """Build the redirect+cookie response after a successful login."""
    from flask import redirect

    response = make_response(redirect(target))
    response.set_cookie(
        ADMIN_COOKIE,
        mint_admin_cookie(),
        max_age=ADMIN_COOKIE_MAX_AGE,
        httponly=True,
        samesite="Strict",
        secure=request.is_secure,
        path="/",
    )
    return response


def clear_admin_cookie(response):
    response.delete_cookie(ADMIN_COOKIE, path="/")
    return response


def new_request_id() -> str:
    return secrets.token_urlsafe(12)


def attach_request_id() -> None:
    incoming = request.headers.get("X-Request-ID", "").strip()
    g.request_id = incoming[:64] if incoming else new_request_id()
