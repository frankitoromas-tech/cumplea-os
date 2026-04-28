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
    """Mixin reutilizable para enviar mensajes a Telegram."""
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
            try:
                data = r.json()
            except Exception:
                return {"ok": False, "error": "respuesta no es JSON"}
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
            try:
                return r.json().get("ok", False)
            except Exception:
                return False
        except Exception:
            return False

class MensajesModule(TelegramMixin, APIModule):
    nombre  = "mensajes"
    _BUZON  = Path(__file__).parent.parent / "buzon_secreto.txt"

    def _registrar_rutas(self):
        # BUG FIX: el frontend fetch '/api/X' pero estaban registradas SIN /api/.
        # Ahora se registran ambas para máxima compatibilidad.
        for path, handler, methods in [
            ("responder",                self.responder,                ["POST"]),
            ("salud",                    self.salud,                    ["GET"]),
            ("test_telegram",            self.test_telegram,            ["POST"]),
            ("constelacion_completada",  self.constelacion_completada,  ["POST"]),
            ("notificar",                self.notificar_evento,         ["POST"]),
            ("verificar_nombre",         self.verificar_nombre,         ["POST"]),
        ]:
            self.bp.route(f"/{path}",     methods=methods, endpoint=f"{path}_alt")(handler)
            self.bp.route(f"/api/{path}", methods=methods, endpoint=path)(handler)

    def _guardar_local(self, mensaje: str):
        try:
            self._BUZON.parent.mkdir(parents=True, exist_ok=True)
            with open(self._BUZON, "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Luyuromo: {mensaje}\n")
        except OSError:
            pass

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

    def verificar_nombre(self):
        """
        Acepta 'luna', 'luyuromo' o 'luyu', insensible a mayúsculas,
        espacios y acentos. Notifica a Telegram en el primer acceso
        exitoso. Devuelve siempre 200 con {valido: bool, mensaje: str}
        para que el frontend pueda diferenciar visualmente sin manejar
        códigos HTTP de error.
        """
        import unicodedata
        datos = request.get_json(silent=True) or {}
        raw   = (datos.get("nombre") or "").strip()
        # Normalización: NFD → quitar acentos → minúsculas → quitar espacios
        s = unicodedata.normalize("NFD", str(raw))
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        nombre = s.replace(" ", "").lower()

        ALIASES = {"luna", "luyuromo", "luyu"}
        if nombre in ALIASES:
            self._telegram(
                f"🌙 <b>¡Acceso concedido!</b> Persona: {nombre} (raw: '{raw}')",
                silencioso=True,
            )
            return self._ok({
                "valido": True,
                "nombre_canonico": "luyuromo",
                "alias_usado": nombre,
                "mensaje": "¡Bienvenida, mi Luna! ✨",
            })

        # Mensaje cariñoso por longitud — el frontend lo mostrará
        if not nombre:
            mensaje = "Susúrrame tu nombre, mi luna."
        elif len(nombre) < 3:
            mensaje = "Necesito más letras para reconocerte."
        else:
            mensaje = "Ese nombre no abre la puerta. Prueba con tu nombre o tu apodo."
        return self._ok({"valido": False, "mensaje": mensaje})

mensajes_module = MensajesModule()