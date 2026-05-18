"""
controllers/api_mensajes.py
MensajesModule - Telegram notifications and secret mailbox endpoints.

Name verification was moved to controllers/api_auth.py to keep the auth
surface free of side effects (no spammable Telegram calls per attempt).
"""
from __future__ import annotations

import logging
import os
import random
import time
from datetime import datetime
from html import escape
from pathlib import Path
from threading import Lock

import requests as http_requests
from flask import request

from api import APIModule
from services.buzon_service import ServicioBuzon
from services.security_service import require_admin_token

logger = logging.getLogger(__name__)


class TelegramMixin:
    """Reusable helpers to send Telegram messages safely."""

    _TG_HEALTH_TTL = 30.0  # seconds
    _TG_MAX_ATTEMPTS = 3
    _TG_BACKOFF_BASE = 0.4  # seconds — first retry waits ~[0.4, 0.8) s

    def __init__(self) -> None:
        self._tg_health_state: tuple[bool, float] = (False, 0.0)
        self._tg_health_lock = Lock()

    # Resolve lazily so tests / runtime env changes are observed.
    @property
    def _tg_token(self) -> str:
        return os.getenv("TELEGRAM_TOKEN", "")

    @property
    def _tg_chat_id(self) -> str:
        return os.getenv("TELEGRAM_CHAT_ID", "")

    @property
    def _tg_url(self) -> str:
        return f"https://api.telegram.org/bot{self._tg_token}"

    def _telegram(self, texto: str, silencioso: bool = False) -> dict:
        token = self._tg_token
        if not token or "PEGA" in token:
            return {"ok": False, "error": "Token no configurado"}
        if not self._tg_chat_id:
            return {"ok": False, "error": "Chat ID no configurado"}

        payload = {
            "chat_id": self._tg_chat_id,
            "text": texto,
            "parse_mode": "HTML",
            "disable_notification": silencioso,
        }
        last_error = "unknown"
        for attempt in range(1, self._TG_MAX_ATTEMPTS + 1):
            try:
                response = http_requests.post(
                    f"{self._tg_url}/sendMessage",
                    json=payload,
                    timeout=8,
                )
                # Honor Telegram's Retry-After on rate-limit responses.
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "1") or "1")
                    last_error = f"rate_limited(429,retry={retry_after}s)"
                    logger.warning("Telegram 429; attempt=%s retry_after=%s", attempt, retry_after)
                    if attempt < self._TG_MAX_ATTEMPTS:
                        time.sleep(min(retry_after, 5))
                        continue
                    return {"ok": False, "error": last_error}

                # 5xx → transient; retry with backoff. Other non-2xx → bail.
                if response.status_code >= 500:
                    last_error = f"upstream_{response.status_code}"
                    logger.warning(
                        "Telegram %s on attempt %s", response.status_code, attempt
                    )
                elif response.status_code >= 400:
                    try:
                        data = response.json()
                    except ValueError:
                        data = {"ok": False, "description": f"http_{response.status_code}"}
                    logger.warning("Telegram error: %s", data.get("description"))
                    return data
                else:
                    data = response.json()
                    if not data.get("ok"):
                        logger.warning("Telegram error: %s", data.get("description"))
                    return data

            except http_requests.exceptions.Timeout:
                last_error = "timeout"
                logger.warning("Telegram timeout on attempt %s", attempt)
            except http_requests.exceptions.ConnectionError:
                last_error = "sin conexion"
                logger.warning("Telegram connection error on attempt %s", attempt)
            except Exception as exc:
                logger.exception("Telegram call failed: %s", exc)
                return {"ok": False, "error": "internal"}

            if attempt < self._TG_MAX_ATTEMPTS:
                # Exponential backoff with jitter, capped at 4s.
                delay = min(self._TG_BACKOFF_BASE * (2 ** (attempt - 1)), 4.0)
                time.sleep(delay + random.uniform(0, delay))

        return {"ok": False, "error": last_error}

    def _tg_ok(self) -> bool:
        """Cached liveness probe: avoids burning quota on every /api/salud."""
        now = time.monotonic()
        with self._tg_health_lock:
            ok, last = self._tg_health_state
            if (now - last) < self._TG_HEALTH_TTL and last > 0:
                return ok

        try:
            response = http_requests.get(f"{self._tg_url}/getMe", timeout=6)
            ok = bool(response.json().get("ok", False))
        except Exception:
            ok = False

        with self._tg_health_lock:
            self._tg_health_state = (ok, now)
        return ok


class MensajesModule(TelegramMixin, APIModule):
    nombre = "mensajes"
    _MAX_MENSAJE_CHARS = 500

    def __init__(self):
        TelegramMixin.__init__(self)
        self._buzon = ServicioBuzon()
        self._legacy_plaintext = os.getenv("LEGACY_PLAINTEXT_MESSAGE_LOG", "0") == "1"
        self._legacy_path = Path(__file__).resolve().parent.parent / "buzon_secreto.txt"
        APIModule.__init__(self)

    def _registrar_rutas(self):
        routes = [
            ("responder", self.responder, ["POST"], False),
            ("salud", self.salud, ["GET"], True),
            ("test_telegram", self.test_telegram, ["POST"], True),
            ("constelacion_completada", self.constelacion_completada, ["POST"], False),
            ("notificar", self.notificar_evento, ["POST"], False),
        ]
        for path, handler, methods, admin_only in routes:
            view = require_admin_token(handler) if admin_only else handler
            self.bp.route(f"/{path}", methods=methods, endpoint=f"{path}_alt")(view)
            self.bp.route(f"/api/{path}", methods=methods, endpoint=path)(view)

    def _guardar_local(self, mensaje: str):
        limpio = " ".join(mensaje.splitlines()).strip()
        if not limpio:
            return

        guardado = self._buzon.guardar_mensaje(limpio)
        if not guardado:
            logger.warning("No se pudo guardar mensaje en almacenamiento persistente.")

        # Optional fallback for manual legacy audits.
        if self._legacy_plaintext:
            try:
                self._legacy_path.parent.mkdir(parents=True, exist_ok=True)
                with self._legacy_path.open("a", encoding="utf-8") as handle:
                    handle.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Luyuromo: {limpio}\n")
            except OSError:
                logger.warning("No se pudo guardar mensaje en log legacy.")

    def responder(self):
        datos = request.get_json(silent=True) or {}
        mensaje = (datos.get("mensaje") or "").strip()
        if not mensaje:
            return self._error("Mensaje vacio")
        if len(mensaje) > self._MAX_MENSAJE_CHARS:
            return self._error(
                f"Mensaje demasiado largo. Maximo: {self._MAX_MENSAJE_CHARS} caracteres."
            )

        self._guardar_local(mensaje)
        mensaje_safe = escape(mensaje)
        texto_tg = (
            "<b>MENSAJE DE LUYUROMO</b>\n\n"
            f"<i>{mensaje_safe}</i>\n\n"
            f"{datetime.now():%d/%m/%Y %H:%M}"
        )
        resultado = self._telegram(texto_tg)
        logger.info(
            "Mensaje recibido. telegram_ok=%s length=%s",
            resultado.get("ok"),
            len(mensaje),
        )
        return self._ok(
            {
                "status": "ok",
                "respuesta": "Mensaje enviado.",
                "telegram": resultado.get("ok", False),
            }
        )

    def salud(self):
        tg_status = "conectado" if self._tg_ok() else "sin conexion"
        return self._ok(
            {
                "servidor": "ok",
                "telegram": tg_status,
                "timestamp": datetime.now().isoformat(),
            }
        )

    def test_telegram(self):
        result = self._telegram("<b>Test OK</b>\nAPI funcionando.")
        if result.get("ok"):
            return self._ok({"status": "ok", "mensaje": "Telegram conectado"})
        return self._error(f"Fallo Telegram: {result.get('error', '?')}", 503)

    def constelacion_completada(self):
        self._telegram(
            "<b>Constelacion completada</b>\nSe completo la constelacion del amor.",
            silencioso=True,
        )
        return self._ok({"status": "ok", "mensaje": "Logro registrado"})

    def notificar_evento(self):
        datos = request.get_json(silent=True) or {}
        evento = (datos.get("evento") or "").strip()
        if not evento:
            return self._error("Evento vacio")

        eventos_validos = {
            "juego_corazones": "<b>Evento</b>: Juego de corazones.",
            "konami": "<b>Evento</b>: Codigo Konami.",
            "frank": "<b>Evento</b>: Palabra frank detectada.",
            "pastel_secreto": "<b>Evento</b>: Pastel secreto descubierto.",
            "aurora": "<b>Evento</b>: Visita a Aurora.",
            "timeline": "<b>Evento</b>: Visita a timeline.",
        }
        texto = eventos_validos.get(evento, f"<b>Evento</b>: {escape(evento[:50])}")
        self._telegram(texto, silencioso=True)
        return self._ok({"status": "ok", "evento": evento})


mensajes_module = MensajesModule()
