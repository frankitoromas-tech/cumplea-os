from flask import Flask, render_template, jsonify, request
from datetime import datetime, timezone
from pathlib import Path
import os
import threading
import requests

app = Flask(__name__)

# --- Configuración por entorno (más segura que hardcodear secretos) ---
TELEGRAM_TOKEN = "8651973448:AAHUDVOSurQb5r0X_OJzmPurvelTVrw_wbI"
TELEGRAM_CHAT_ID = "6724969320"
MAX_MESSAGE_LENGTH = int(os.getenv("MAX_MESSAGE_LENGTH", "500"))
MESSAGE_COOLDOWN_SECONDS = int(os.getenv("MESSAGE_COOLDOWN_SECONDS", "15"))

# Configuración del tiempo
FECHA_NACIMIENTO = datetime(2004, 8, 30)
FECHA_APERTURA = datetime(2025, 8, 30, 0, 0, 0)

# Archivo de respaldo
BUZON_PATH = Path("buzon_secreto.txt")

# Control simple anti-spam en memoria (IP -> último timestamp)
LAST_MESSAGE_BY_IP = {}
LOCK = threading.Lock()


class RegaloSorpresa:
    def __init__(self, destinatario, remitente, edad):
        self.destinatario = destinatario
        self.remitente = remitente
        self.edad = edad
        self.mensajes = []

    def agregar_mensaje(self, mensaje):
        self.mensajes.append(mensaje)

    def empaquetar_regalo(self):
        dias_vividos = (datetime.now() - FECHA_NACIMIENTO).days
        return {
            "titulo": f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "estadisticas": (
                f"✨ Has completado {self.edad} órbitas al sol y has vivido exactamente "
                f"{dias_vividos} días maravillosos en este universo. ✨"
            ),
            "mensajes": self.mensajes,
            "firma": f"Con mucho cariño, {self.remitente}",
        }


mi_regalo = RegaloSorpresa(destinatario="Luyuromo", remitente="Frank", edad=23)
mi_regalo.agregar_mensaje("Eres una persona increíble y te mereces lo mejor.")
mi_regalo.agregar_mensaje(
    "Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad."
)
mi_regalo.agregar_mensaje("¡Disfruta tu día al máximo!")


def _normalizar_mensaje(mensaje: str) -> str:
    """Limpia espacios innecesarios y controla longitud."""
    limpio = " ".join((mensaje or "").split())
    return limpio[:MAX_MESSAGE_LENGTH]


def _puede_enviar(ip: str) -> tuple[bool, int]:
    """Valida cooldown por IP para evitar spam básico."""
    now_ts = int(datetime.now(tz=timezone.utc).timestamp())

    with LOCK:
        previous_ts = LAST_MESSAGE_BY_IP.get(ip)
        if previous_ts is None:
            LAST_MESSAGE_BY_IP[ip] = now_ts
            return True, 0

        elapsed = now_ts - previous_ts
        if elapsed >= MESSAGE_COOLDOWN_SECONDS:
            LAST_MESSAGE_BY_IP[ip] = now_ts
            return True, 0

        return False, MESSAGE_COOLDOWN_SECONDS - elapsed


def _guardar_respaldo(mensaje: str) -> None:
    timestamp = datetime.now(tz=timezone.utc).isoformat()
    with BUZON_PATH.open("a", encoding="utf-8") as archivo:
        archivo.write(f"[{timestamp}] Luyuromo dice: {mensaje}\n")


def _enviar_telegram(mensaje: str) -> bool:
    if not (TELEGRAM_TOKEN and TELEGRAM_CHAT_ID):
        return False

    url_api = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    texto_telegram = f"💌 ¡NUEVO MENSAJE DE LUYUROMO!\n\nElla dice:\n«{mensaje}»"

    try:
        response = requests.post(
            url_api,
            json={"chat_id": TELEGRAM_CHAT_ID, "text": texto_telegram},
            timeout=8,
        )
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print("Error enviando Telegram:", e)
        return False


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/estado")
def estado_regalo():
    ahora = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"bloqueado": False})

    faltan = FECHA_APERTURA - ahora
    return jsonify({"bloqueado": True, "segundos_faltantes": faltan.total_seconds()})


@app.route("/api/abrir_regalo")
def abrir_regalo():
    return jsonify(mi_regalo.empaquetar_regalo())


@app.route("/api/responder", methods=["POST"])
def responder():
    datos = request.get_json(silent=True) or {}
    mensaje = _normalizar_mensaje(datos.get("mensaje", ""))

    if not mensaje:
        return (
            jsonify(
                {
                    "status": "error",
                    "code": "EMPTY_MESSAGE",
                    "respuesta": "Tu mensaje está vacío.",
                }
            ),
            400,
        )

    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    permitido, segundos_restantes = _puede_enviar(ip)
    if not permitido:
        return (
            jsonify(
                {
                    "status": "error",
                    "code": "RATE_LIMIT",
                    "respuesta": (
                        f"Espera {segundos_restantes}s antes de enviar otro mensaje 💫"
                    ),
                }
            ),
            429,
        )

    _guardar_respaldo(mensaje)
    enviado_telegram = _enviar_telegram(mensaje)

    if enviado_telegram:
        respuesta = "¡Mensaje enviado a las estrellas (y a Frank)! 🚀"
    else:
        respuesta = "Mensaje guardado con éxito en el buzón secreto 💌"

    return jsonify({"status": "ok", "respuesta": respuesta})


@app.route("/api/salud")
def salud():
    """Endpoint simple para comprobar que el backend está vivo."""
    return jsonify(
        {
            "status": "ok",
            "timestamp_utc": datetime.now(tz=timezone.utc).isoformat(),
            "telegram_configurado": bool(TELEGRAM_TOKEN and TELEGRAM_CHAT_ID),
        }
    )


if __name__ == "__main__":
    app.run(debug=True)