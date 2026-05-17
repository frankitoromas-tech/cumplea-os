"""
controllers/api_mensajes.py
MensajesModule - Telegram notifications and secret mailbox endpoints.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime
from html import escape
from pathlib import Path

import requests as http_requests
from flask import request

from api import APIModule
from services.buzon_service import ServicioBuzon

logger = logging.getLogger(__name__)


class TelegramMixin:
    """Reusable helpers to send Telegram messages safely."""

    _tg_token = os.getenv("TELEGRAM_TOKEN", "")
    _tg_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    _tg_url = f"https://api.telegram.org/bot{_tg_token}"

    def _telegram(self, texto: str, silencioso: bool = False) -> dict:
        if not self._tg_token or "PEGA" in self._tg_token:
            return {"ok": False, "error": "Token no configurado"}
        if not self._tg_chat_id:
            return {"ok": False, "error": "Chat ID no configurado"}
        try:
            response = http_requests.post(
                f"{self._tg_url}/sendMessage",
                json={
                    "chat_id": self._tg_chat_id,
                    "text": texto,
                    "parse_mode": "HTML",
                    "disable_notification": silencioso,
                },
                timeout=8,
            )
            data = response.json()
            if not data.get("ok"):
                logger.warning("Telegram error: %s", data.get("description"))
            return data
        except http_requests.exceptions.Timeout:
            return {"ok": False, "error": "timeout"}
        except http_requests.exceptions.ConnectionError:
            return {"ok": False, "error": "sin conexion"}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def _tg_ok(self) -> bool:
        try:
            response = http_requests.get(f"{self._tg_url}/getMe", timeout=6)
            return bool(response.json().get("ok", False))
        except Exception:
            return False


class MensajesModule(TelegramMixin, APIModule):
    nombre = "mensajes"
    _MAX_MENSAJE_CHARS = 500

    def __init__(self):
        self._buzon = ServicioBuzon()
        self._legacy_plaintext = os.getenv("LEGACY_PLAINTEXT_MESSAGE_LOG", "0") == "1"
        self._legacy_path = Path(__file__).resolve().parent.parent / "buzon_secreto.txt"
        super().__init__()

    def _registrar_rutas(self):
        routes = [
            ("responder", self.responder, ["POST"]),
            ("salud", self.salud, ["GET"]),
            ("test_telegram", self.test_telegram, ["POST"]),
            ("constelacion_completada", self.constelacion_completada, ["POST"]),
            ("notificar", self.notificar_evento, ["POST"]),
            ("verificar_nombre", self.verificar_nombre, ["POST"]),
        ]
        for path, handler, methods in routes:
            self.bp.route(f"/{path}", methods=methods, endpoint=f"{path}_alt")(handler)
            self.bp.route(f"/api/{path}", methods=methods, endpoint=path)(handler)

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

    def verificar_nombre(self):
        import unicodedata

        datos = request.get_json(silent=True) or {}
        raw = (datos.get("nombre") or "").strip()

        normalizado = unicodedata.normalize("NFD", str(raw))
        normalizado = "".join(
            ch for ch in normalizado if unicodedata.category(ch) != "Mn"
        )
        nombre = normalizado.replace(" ", "").lower()

        aliases = {"luna", "luyuromo", "luyu"}
        if nombre in aliases:
            self._telegram(
                f"<b>Acceso concedido</b>: alias {escape(nombre)}",
                silencioso=True,
            )
            return self._ok(
                {
                    "valido": True,
                    "nombre_canonico": "luyuromo",
                    "alias_usado": nombre,
                    "mensaje": "Bienvenida, mi Luna.",
                }
            )

        if not nombre:
            mensaje = "Susurrame tu nombre, mi luna."
        elif len(nombre) < 3:
            mensaje = "Necesito mas letras para reconocerte."
        else:
            mensaje = "Ese nombre no abre la puerta."
        return self._ok({"valido": False, "mensaje": mensaje})


mensajes_module = MensajesModule()

