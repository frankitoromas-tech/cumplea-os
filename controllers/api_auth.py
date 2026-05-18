"""
controllers/api_auth.py - Verificacion de nombre + flujo de admin login.

Public endpoints:
  POST /api/verificar_nombre body={"nombre": "luna"}
    -> {"valido": true,  "nombre_canonico": "luyuromo", "mensaje": "..."}
    -> {"valido": false, "mensaje": "..."}

Admin endpoints:
  GET  /admin/login          -> tiny login form (rendered inline)
  POST /admin/login          -> mints signed cookie, redirects to /admin
  POST /admin/logout         -> clears cookie

Side-effect-free name verification by design: no Telegram call per attempt
so the surface cannot be used to spam notifications.
"""
from __future__ import annotations

import logging
import unicodedata
from html import escape

from flask import make_response, request

from api import APIModule
from services.security_service import (
    _check_token,  # type: ignore[attr-defined]
    _expected_admin_token,  # type: ignore[attr-defined]
    _provided_admin_token,  # type: ignore[attr-defined]
    clear_admin_cookie,
    make_admin_login_response,
    mint_csrf_token,
    verify_csrf_token,
)

logger = logging.getLogger(__name__)


def _normalizar(texto: str) -> str:
    if not texto:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace(" ", "").lower().strip()


NOMBRE_CANONICO = "luyuromo"
ALIASES_VALIDOS = frozenset({"luyuromo", "luna", "luyu"})


_LOGIN_TEMPLATE = """<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Admin · Login</title>
  <meta name="robots" content="noindex,nofollow">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{{font-family:system-ui,sans-serif;background:#080c1e;color:#f0e8ff;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}}
    .card{{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
           border-radius:14px;padding:28px;max-width:340px;width:100%}}
    h1{{font-size:1.2rem;margin:0 0 14px;color:#ff6b81}}
    label{{font-size:.9rem;display:block;margin-bottom:6px;color:#94a3b8}}
    input{{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);
           background:rgba(0,0,0,.35);color:#fff;font-size:1rem;box-sizing:border-box}}
    button{{margin-top:14px;width:100%;padding:11px;border:none;border-radius:8px;
            background:linear-gradient(135deg,#ff4757,#ff6b81);color:#fff;font-weight:600;
            cursor:pointer}}
    .err{{color:#ff6b81;font-size:.9rem;margin-top:10px}}
  </style>
</head>
<body>
  <form class="card" method="post" action="/admin/login">
    <h1>Panel admin</h1>
    <input type="hidden" name="csrf" value="{csrf}">
    <label for="t">Admin token</label>
    <input id="t" name="token" type="password" autocomplete="off" autofocus required>
    <button type="submit">Entrar</button>
    {error}
  </form>
</body>
</html>"""


class AuthModule(APIModule):
    nombre = "auth"

    def _registrar_rutas(self):
        self.bp.route("/api/verificar_nombre", methods=["POST"])(self.verificar_nombre)
        self.bp.route("/verificar_nombre", methods=["POST"], endpoint="verificar_nombre_alt")(
            self.verificar_nombre
        )
        self.bp.route("/admin/login", methods=["GET"], endpoint="admin_login_form")(
            self.admin_login_form
        )
        self.bp.route("/admin/login", methods=["POST"], endpoint="admin_login_submit")(
            self.admin_login_submit
        )
        self.bp.route("/admin/logout", methods=["POST"], endpoint="admin_logout")(
            self.admin_logout
        )

    def verificar_nombre(self):
        data = request.get_json(silent=True) or {}
        nombre_raw = (data.get("nombre") or "").strip()
        nombre_norm = _normalizar(nombre_raw)

        if nombre_norm in ALIASES_VALIDOS:
            logger.info("Auth ok alias=%s ip=%s", nombre_norm, request.remote_addr or "?")
            return self._ok(
                {
                    "valido": True,
                    "nombre_canonico": NOMBRE_CANONICO,
                    "alias_usado": nombre_norm,
                    "mensaje": "Bienvenida, mi Luna.",
                }
            )

        if not nombre_norm:
            mensaje = "Susurrame tu nombre, mi luna."
        elif len(nombre_norm) < 3:
            mensaje = "Necesito mas letras para reconocerte."
        else:
            mensaje = "Ese nombre no abre la puerta."

        logger.info(
            "Auth deny ip=%s length=%s", request.remote_addr or "?", len(nombre_norm)
        )
        return self._ok({"valido": False, "mensaje": mensaje})

    # ── Admin login flow ────────────────────────────────────
    def _render_login(self, error: str = "") -> tuple[str, int]:
        error_html = f'<div class="err">{escape(error)}</div>' if error else ""
        try:
            csrf = mint_csrf_token()
        except RuntimeError:
            csrf = ""
        return _LOGIN_TEMPLATE.format(error=error_html, csrf=escape(csrf)), 200

    def admin_login_form(self):
        if not _expected_admin_token():
            return (
                "<h1>Admin desactivado</h1>"
                "<p>Configura <code>ADMIN_TOKEN</code> en el entorno.</p>",
                503,
            )
        body, status = self._render_login()
        response = make_response(body, status)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        return response

    def admin_login_submit(self):
        expected = _expected_admin_token()
        if not expected:
            return (
                "<h1>Admin desactivado</h1>"
                "<p>Configura <code>ADMIN_TOKEN</code> en el entorno.</p>",
                503,
            )
        csrf = (request.form.get("csrf") or "").strip()
        if not verify_csrf_token(csrf):
            logger.warning("Admin login CSRF failed from %s", request.remote_addr or "unknown")
            body, _ = self._render_login("Sesion expirada. Recarga e intenta de nuevo.")
            response = make_response(body, 403)
            response.headers["Content-Type"] = "text/html; charset=utf-8"
            return response

        provided = (request.form.get("token") or _provided_admin_token() or "").strip()
        if not _check_token(provided, expected):
            logger.warning(
                "Admin login failed from %s", request.remote_addr or "unknown"
            )
            body, _ = self._render_login("Token invalido.")
            response = make_response(body, 401)
            response.headers["Content-Type"] = "text/html; charset=utf-8"
            return response
        logger.info("Admin login ok from %s", request.remote_addr or "unknown")
        return make_admin_login_response("/admin")

    def admin_logout(self):
        response = make_response({"status": "ok"}, 200)
        return clear_admin_cookie(response)


auth_module = AuthModule()
