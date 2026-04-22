"""
api/mensajes.py
MensajesModule — hereda de APIModule
Todo lo relacionado con Telegram, buzón y notificaciones.
"""
from __future__ import annotations
import os
import logging
from datetime import datetime
from pathlib import Path
from flask import request
import requests as http_requests
from api import APIModule

logger = logging.getLogger(__name__)


class TelegramMixin:
    """
    Mixin reutilizable para enviar mensajes a Telegram.
    Se puede combinar con cualquier clase mediante herencia múltiple.
    """
    _tg_token   = os.getenv("TELEGRAM_TOKEN",   "8651973448:AAHUDVOSurQb5r0X_OJzmPurvelTVrw_wbI")
    _tg_chat_id = os.getenv("TELEGRAM_CHAT_ID", "6724969320")
    _tg_url     = f"https://api.telegram.org/bot{_tg_token}"

    def _telegram(self, texto: str, silencioso: bool = False) -> dict:
        if not self._tg_token or "PEGA" in self._tg_token:
            return {"ok": False, "error": "Token no configurado"}
        try:
            r = http_requests.post(
                f"{self._tg_url}/sendMessage",
                json={"chat_id": self._tg_chat_id, "text": texto,
                      "parse_mode": "HTML", "disable_notification": silencioso},
                timeout=8,
            )
            data = r.json()
            if not data.get("ok"):
                logger.warning("Telegram error: %s", data.get("description"))
            return data
        except http_requests.exceptions.Timeout:
            return {"ok": False, "error": "timeout"}
        except http_requests.exceptions.ConnectionError:
            return {"ok": False, "error": "sin conexión"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _tg_ok(self) -> bool:
        """Comprueba si el bot de Telegram está operativo."""
        try:
            r = http_requests.get(f"{self._tg_url}/getMe", timeout=6)
            return r.json().get("ok", False)
        except Exception:
            return False


class MensajesModule(TelegramMixin, APIModule):
    """
    Módulo de mensajes y notificaciones.
    Hereda de: TelegramMixin + APIModule → BaseModule.
    Herencia múltiple en acción: combina capacidades de Telegram con la API base.
    """
    nombre  = "mensajes"
    _BUZON  = Path(__file__).parent.parent / "buzon_secreto.txt"

    def _registrar_rutas(self):
        self.bp.route("/api/responder",      methods=["POST"])(self.responder)
        self.bp.route("/api/salud"                           )(self.salud)
        self.bp.route("/api/test_telegram",  methods=["POST"])(self.test_telegram)
        self.bp.route("/api/constelacion_completada", methods=["POST"])(self.constelacion_completada)
        self.bp.route("/api/notificar",      methods=["POST"])(self.notificar_evento)

    def _guardar_local(self, mensaje: str):
        """Persiste en archivo local (Vercel-safe)."""
        try:
            self._BUZON.parent.mkdir(parents=True, exist_ok=True)
            with open(self._BUZON, "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Luyuromo: {mensaje}\n")
        except OSError:
            pass  # Vercel: read-only filesystem

    # ── rutas ────────────────────────────────────────────────
    def responder(self):
        datos   = request.get_json(silent=True) or {}
        mensaje = datos.get("mensaje", "").strip()
        if not mensaje:
            return self._error("Mensaje vacío")
        self._guardar_local(mensaje)
        texto_tg = (f"💌 <b>¡MENSAJE DE LUYUROMO!</b>\n\n"
                    f"<i>«{mensaje}»</i>\n\n📅 {datetime.now():%d/%m/%Y %H:%M}")
        resultado = self._telegram(texto_tg)
        logger.info("Mensaje | TG OK: %s | %.50s", resultado.get("ok"), mensaje)
        return self._ok({"status": "ok",
                         "respuesta": "¡Mensaje enviado a las estrellas (y a Frank)! 🚀",
                         "telegram": resultado.get("ok", False)})

    def salud(self):
        tg_status = "✅ Conectado" if self._tg_ok() else "❌ Sin conexión"
        return self._ok({"servidor": "✅ OK", "telegram": tg_status,
                         "timestamp": datetime.now().isoformat()})

    def test_telegram(self):
        r = self._telegram("🔔 <b>Test OK</b>\nLa API funciona. 🎉")
        if r.get("ok"):
            return self._ok({"status": "ok", "mensaje": "✅ Telegram conectado"})
        return self._error(f"Fallo Telegram: {r.get('error','?')}", 503)

    def constelacion_completada(self):
        self._telegram("🌟 <b>¡Luyuromo completó la Constelación del Amor!</b>\n\n"
                       "Conectó todas las estrellas y formó el corazón 💖", silencioso=True)
        return self._ok({"status": "ok", "mensaje": "¡Lo lograste! 🌟"})

    def notificar_evento(self):
        """Nueva ruta: notificación genérica de eventos del frontend."""
        datos  = request.get_json(silent=True) or {}
        evento = datos.get("evento", "").strip()
        if not evento:
            return self._error("Evento vacío")
        EVENTOS_VALIDOS = {
            "juego_corazones": "💕 <b>¡Luyuromo jugó el juego de corazones!</b>",
            "konami":          "🎮 <b>¡Luyuromo encontró el código Konami!</b> ↑↑↓↓←→←→BA",
            "frank":           "💌 <b>¡Luyuromo escribió 'frank' en el teclado!</b>",
            "pastel_secreto":  "🎂 <b>¡Luyuromo descubrió el secreto del pastel!</b>",
            "aurora":          "🌌 <b>¡Luyuromo visitó la página Aurora!</b>",
            "timeline":        "📖 <b>¡Luyuromo vio la línea del tiempo!</b>",
        }
        texto = EVENTOS_VALIDOS.get(evento, f"✨ <b>Evento: {evento[:50]}</b>")
        self._telegram(texto, silencioso=True)
        return self._ok({"status": "ok", "evento": evento})


mensajes_module = MensajesModule()