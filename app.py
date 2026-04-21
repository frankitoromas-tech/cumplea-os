"""
=============================================================
  🌙 App de Cumpleaños - Backend Flask Mejorado
  Autor: Frank  |  Para: Luyuromo
=============================================================
"""

import os
import json
import logging
import random
from datetime import datetime, date
from pathlib import Path

import requests
from flask import Flask, render_template, jsonify, request

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─────────────────────────────────────────────
#  CONFIGURACIÓN DE LOGGING (BLINDADO PARA VERCEL)
# ─────────────────────────────────────────────
LOG_DIR = Path(__file__).parent / "logs"

try:
    LOG_DIR.mkdir(exist_ok=True)
    mis_handlers = [
        logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8"),
        logging.StreamHandler(),
    ]
except OSError:
    # Si Vercel bloquea la creación del archivo log, usamos solo la consola
    mis_handlers = [logging.StreamHandler()]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=mis_handlers,
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
#  FLASK APP
# ─────────────────────────────────────────────
app = Flask(__name__)

@app.after_request
def agregar_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# ─────────────────────────────────────────────
#  CREDENCIALES
# ─────────────────────────────────────────────
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN",   "8651973448:AAHUDVOSurQb5r0X_OJzmPurvelTVrw_wbI")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "6724969320")
TELEGRAM_URL     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ─────────────────────────────────────────────
#  CONFIGURACIÓN DE FECHAS
# ─────────────────────────────────────────────
FECHA_NACIMIENTO  = datetime(2003, 8, 30)
FECHA_INICIO_AMOR = date(2025, 10, 1)
FECHA_APERTURA    = datetime(2025, 8, 30, 0, 0, 0)

# ─────────────────────────────────────────────
#  ARCHIVOS DE DATOS PERSISTENTES (BLINDADO)
# ─────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"

try:
    DATA_DIR.mkdir(exist_ok=True)
except OSError:
    pass # Ignorar en Vercel

BUZON_TXT    = Path(__file__).parent / "buzon_secreto.txt"
VISITAS_JSON = DATA_DIR / "visitas.json"
MENSAJES_JSON = DATA_DIR / "mensajes.json"


# ─────────────────────────────────────────────
#  CLASE REGALO
# ─────────────────────────────────────────────
class RegaloSorpresa:
    def __init__(self, destinatario, remitente, edad):
        self.destinatario = destinatario
        self.remitente    = remitente
        self.edad         = edad
        self.mensajes     = []

    def agregar_mensaje(self, mensaje):
        self.mensajes.append(mensaje)

    def empaquetar_regalo(self):
        dias_vividos = (datetime.now() - FECHA_NACIMIENTO).days
        return {
            "titulo":       f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "estadisticas": (
                f"✨ Has completado {self.edad} órbitas al sol y has vivido "
                f"exactamente {dias_vividos:,} días maravillosos en este universo. ✨"
            ),
            "mensajes": self.mensajes,
            "firma":    f"Con mucho cariño, {self.remitente}",
        }


mi_regalo = RegaloSorpresa(destinatario="Luyuromo", remitente="Frank", edad=23)
mi_regalo.agregar_mensaje("Eres una persona increíble y te mereces lo mejor.")
mi_regalo.agregar_mensaje("Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad.")
mi_regalo.agregar_mensaje("Cada día contigo es el mejor día de mi vida. ¡Disfruta tu día al máximo!")


# ─────────────────────────────────────────────
#  FRASES Y POEMAS (Omitidos en esta visualización por espacio, pero TÚ DEBES DEJAR LOS TUYOS EXACTAMENTE IGUAL)
#  (HE INCLUIDO TODO EL BLOQUE PARA QUE SOLO COPIES Y PEGUES)
# ─────────────────────────────────────────────
FRASES_ROMANTICAS = [
    "Eres el poema que nunca supe que necesitaba escribir.",
    "En el universo infinito, elegirte a ti sigue siendo mi decisión favorita.",
    "Eres la razón por la que creo en la magia.",
    "Donde tú estás, ahí está mi hogar.",
    "Tus ojos contienen todos los océanos que jamás quiero explorar.",
    "Eres la luna de mis noches más oscuras y el sol de mis días.",
    "Gracias al universo por ponerte en mi camino.",
    "Amarte es lo más fácil que he hecho en la vida.",
    "Cada momento contigo es un recuerdo que atesoro para siempre.",
    "Eres infinitamente más hermosa que cualquier constelación.",
    "Si las estrellas contaran cuánto te quiero, el cielo quedaría sin espacio.",
    "Eres mi lugar favorito en el mundo entero.",
    "Tu sonrisa puede detener el tiempo. Lo he comprobado.",
    "Contigo aprendí que el amor no es un destino, es el camino.",
    "Eres todo lo que pedí sin saber exactamente qué pedir.",
    "Mi corazón aprendió a latir diferente desde que te conocí.",
    "Estar contigo es lo más parecido a volar que he sentido.",
    "Eres la historia que más quiero seguir leyendo.",
    "Te quiero con la misma intensidad con que el mar quiere a la luna.",
    "Cada día me enamoro de ti de una manera diferente.",
    "Eres la mejor parte de todos mis días.",
    "Con tus ojos me basta para saber que existe la felicidad.",
    "Si pudiera volver a elegir, te elegiría a ti mil veces más.",
    "Eres el sueño del que nunca quiero despertar.",
    "Mi vida tiene más color desde que llegaste.",
    "Eres la canción que no puedo sacudir de mi cabeza ni de mi corazón.",
    "Gracias por existir y por dejarme quererte.",
    "Cada segundo que pasa, te quiero un segundo más.",
    "El amor que siento por ti no cabe en palabras, pero lo intento cada día.",
    "Tú eres mi por siempre favorito.",
]

POEMAS = [
    {
        "titulo": "Luna de mis Noches",
        "versos": [
            "Eres la luna que ilumina",
            "mis noches más profundas y oscuras,",
            "la que guía mis pasos sin brújula",
            "y convierte el frío en ternura.",
            "",
            "Eres el faro que no pide nada,",
            "que solo brilla por el placer de brillar,",
            "y yo, marinero de tu mirada,",
            "aprendo cada día a navegar.",
            "",
            "Gracias por existir, luna mía,",
            "por iluminar este rincón del mundo.",
            "Eres mi noche y eres mi día,",
            "eres lo más profundo y lo más fundo.",
        ]
    },
    {
        "titulo": "Órbitas",
        "versos": [
            "Completas hoy otra vuelta al sol,",
            "otra órbita perfecta alrededor de la luz.",
            "Yo soy el planeta que no puede alejarse,",
            "atrapado para siempre en tu gravitación.",
            "",
            "Cada año que pasas deja en ti",
            "una nueva galaxia de sabiduría.",
            "Y yo, privilegiado testigo del universo,",
            "te veo florecer con alegría.",
            "",
            "Feliz cumpleaños, viajera del cosmos,",
            "que este nuevo año traiga todo lo que mereces:",
            "amor sin límites, paz infinita",
            "y la certeza de que siempre te quiero.",
        ]
    },
    {
        "titulo": "Carta a las Estrellas",
        "versos": [
            "Le escribí a las estrellas tu nombre",
            "para que el cielo supiera quién eres.",
            "Les conté de tu risa, de tu calma,",
            "y quedaron en silencio, sorprendidas.",
            "",
            "Porque hay cosas que incluso el universo",
            "no sabe cómo describir con exactitud:",
            "la manera en que me miras cuando hablas,",
            "la forma en que transformas mi solitud.",
            "",
            "Así que este cumpleaños quiero decirte",
            "lo que ni el cosmos puede contener:",
            "que eres la razón más hermosa del mundo",
            "y el motivo por el que quiero ser mejor.",
        ]
    },
    {
        "titulo": "Para Siempre, Contigo",
        "versos": [
            "No necesito el tiempo sin fin",
            "si ese tiempo lo paso a tu lado.",
            "No necesito el mundo entero",
            "si tú eres mi lugar favorito.",
            "",
            "Cumples años y yo también,",
            "porque sin ti no sé cómo contar.",
            "Cada día a tu lado es un regalo",
            "que no merezco y que no voy a soltar.",
            "",
            "Feliz cumpleaños, amor de mi vida.",
            "Que florezcan todos tus sueños.",
            "Que el universo te trate con la misma dulzura",
            "con que tú me tratas a mí cada día.",
        ]
    },
]


# ─────────────────────────────────────────────
#  UTILIDADES DE TELEGRAM
# ─────────────────────────────────────────────
def _enviar_telegram(texto: str, silencioso: bool = False) -> dict:
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN.startswith("PEGA"):
        return {"ok": False, "error": "Token no configurado"}

    payload = {
        "chat_id":              TELEGRAM_CHAT_ID,
        "text":                 texto,
        "parse_mode":           "HTML",
        "disable_notification": silencioso,
    }
    try:
        resp = requests.post(
            f"{TELEGRAM_URL}/sendMessage",
            json=payload,
            timeout=8,
        )
        data = resp.json()
        if not data.get("ok"):
            logger.warning("Telegram respondió con error: %s", data)
        return data
    except requests.exceptions.ConnectionError:
        logger.error("Telegram: sin conexión a internet")
        return {"ok": False, "error": "Sin conexión"}
    except requests.exceptions.Timeout:
        logger.error("Telegram: timeout al enviar mensaje")
        return {"ok": False, "error": "Timeout"}
    except Exception as exc:
        logger.exception("Telegram: error inesperado: %s", exc)
        return {"ok": False, "error": str(exc)}


def _leer_visitas() -> dict:
    if VISITAS_JSON.exists():
        try:
            return json.loads(VISITAS_JSON.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"total": 0, "por_dia": {}}


def _guardar_visitas(data: dict):
    try:
        VISITAS_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        # Vercel lanzará este error silenciosamente sin tumbar la app
        logger.warning("Vercel bloqueó guardar visitas.json: %s", exc)


def _leer_mensajes() -> list:
    if MENSAJES_JSON.exists():
        try:
            return json.loads(MENSAJES_JSON.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def _guardar_mensaje_json(mensaje: str):
    try:
        mensajes = _leer_mensajes()
        mensajes.append({
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mensaje": mensaje,
        })
        MENSAJES_JSON.write_text(json.dumps(mensajes, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as exc:
        # Vercel lanzará este error silenciosamente sin tumbar la app
        logger.warning("Vercel bloqueó guardar mensajes.json: %s", exc)


# ─────────────────────────────────────────────
#  RUTAS
# ─────────────────────────────────────────────
@app.route("/")
def index():
    visitas = _leer_visitas()
    visitas["total"] += 1
    hoy = date.today().isoformat()
    visitas["por_dia"][hoy] = visitas["por_dia"].get(hoy, 0) + 1
    _guardar_visitas(visitas)
    logger.info("Visita #%d registrada", visitas["total"])
    return render_template("index.html")


@app.route("/api/estado")
def estado_regalo():
    ahora = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"bloqueado": False})
    faltan = FECHA_APERTURA - ahora
    return jsonify({
        "bloqueado":          True,
        "segundos_faltantes": faltan.total_seconds(),
    })


@app.route("/api/abrir_regalo")
def abrir_regalo():
    return jsonify(mi_regalo.empaquetar_regalo())


@app.route("/api/responder", methods=["POST"])
def responder():
    datos   = request.get_json(silent=True) or {}
    mensaje = datos.get("mensaje", "").strip()

    if not mensaje:
        return jsonify({"status": "error", "detalle": "Mensaje vacío"}), 400

    # 1. Guardar en .txt 
    try:
        with open(BUZON_TXT, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Luyuromo dice: {mensaje}\n")
    except Exception as exc:
        logger.error("No se pudo escribir buzon_secreto.txt: %s", exc)

    # 2. Guardar en JSON estructurado (AHORA PROTEGIDO)
    _guardar_mensaje_json(mensaje)

    # 3. Enviar a Telegram
    texto_tg = (
        f"💌 <b>¡NUEVO MENSAJE DE LUYUROMO!</b>\n\n"
        f"Ella dice:\n<i>«{mensaje}»</i>\n\n"
        f"📅 {datetime.now():%d/%m/%Y %H:%M:%S}"
    )
    resultado_tg = _enviar_telegram(texto_tg)
    tg_ok = resultado_tg.get("ok", False)

    logger.info("Mensaje recibido | Telegram OK: %s | Mensaje: %.50s…", tg_ok, mensaje)

    return jsonify({
        "status":    "ok",
        "respuesta": "¡Mensaje enviado a las estrellas (y a Frank)! 🚀",
        "telegram":  tg_ok,
    })


@app.route("/api/salud")
def salud():
    tg_status = "desconocido"
    try:
        resp = requests.get(f"{TELEGRAM_URL}/getMe", timeout=6)
        data = resp.json()
        if data.get("ok"):
            bot_name = data["result"].get("username", "?")
            tg_status = f"✅ Conectado como @{bot_name}"
        else:
            tg_status = f"❌ Error: {data.get('description', 'desconocido')}"
    except Exception as exc:
        tg_status = f"❌ Excepción: {exc}"

    visitas = _leer_visitas()
    return jsonify({
        "servidor":  "✅ Flask corriendo",
        "telegram":  tg_status,
        "visitas_totales": visitas.get("total", 0),
        "mensajes_guardados": len(_leer_mensajes()),
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/test_telegram", methods=["POST"])
def test_telegram():
    texto = "🔔 <b>Test de conexión exitoso</b>\n\nLa API está funcionando correctamente. 🎉"
    resultado = _enviar_telegram(texto)
    if resultado.get("ok"):
        return jsonify({"status": "ok", "mensaje": "✅ Mensaje de prueba enviado a Telegram"})
    return jsonify({"status": "error", "mensaje": "❌ No se pudo enviar", "detalle": resultado.get("error")}), 503


@app.route("/api/frase_del_dia")
def frase_del_dia():
    dia_del_año = date.today().timetuple().tm_yday
    indice = dia_del_año % len(FRASES_ROMANTICAS)
    frase  = FRASES_ROMANTICAS[indice]
    return jsonify({"frase": frase, "numero": indice + 1, "total": len(FRASES_ROMANTICAS), "fecha": date.today().isoformat()})


@app.route("/api/poema")
def poema_aleatorio():
    p = random.choice(POEMAS)
    return jsonify({"titulo": p["titulo"], "versos": p["versos"], "texto": "\n".join(p["versos"]), "total_poemas": len(POEMAS)})


@app.route("/api/estadisticas_amor")
def estadisticas_amor():
    hoy     = date.today()
    ahora   = datetime.now()
    edad    = (hoy - FECHA_NACIMIENTO.date()).days // 365
    dias_vividos   = (ahora - FECHA_NACIMIENTO).days
    horas_vividas  = dias_vividos * 24
    latidos_vida   = horas_vividas * 60 * 72

    dias_juntos = (hoy - FECHA_INICIO_AMOR).days
    horas_juntos = dias_juntos * 24

    try:
        proximo_cumple = date(hoy.year, 8, 30)
        if proximo_cumple <= hoy:
            proximo_cumple = date(hoy.year + 1, 8, 30)
        dias_para_cumple = (proximo_cumple - hoy).days
    except Exception:
        dias_para_cumple = 0

    return jsonify({
        "edad_años":         edad,
        "dias_vividos":      f"{dias_vividos:,}",
        "horas_vividas":     f"{horas_vividas:,}",
        "latidos_estimados": f"{latidos_vida:,}",
        "dias_juntos":       f"{dias_juntos:,}",
        "horas_juntos":      f"{horas_juntos:,}",
        "dias_para_cumple":  dias_para_cumple,
        "proximo_cumple":    proximo_cumple.isoformat() if dias_para_cumple > 0 else "¡Hoy es tu cumpleaños! 🎉",
        "orbitas_al_sol":    edad,
        "semanas_vividas":   dias_vividos // 7,
    })


@app.route("/api/visitas")
def contador_visitas():
    visitas = _leer_visitas()
    hoy     = date.today().isoformat()
    return jsonify({"total": visitas.get("total", 0), "hoy": visitas.get("por_dia", {}).get(hoy, 0), "por_dia": visitas.get("por_dia", {})})


@app.route("/api/mensajes_guardados")
def mensajes_guardados():
    mensajes = _leer_mensajes()
    return jsonify({"total": len(mensajes), "primer_mensaje": mensajes[0]["fecha"] if mensajes else None, "ultimo_mensaje": mensajes[-1]["fecha"] if mensajes else None})


@app.route("/api/countdown_detallado")
def countdown_detallado():
    ahora  = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"abierto": True, "mensaje": "¡Ya es tu cumpleaños! 🎉"})

    delta    = FECHA_APERTURA - ahora
    total_s  = int(delta.total_seconds())
    dias     = delta.days
    horas    = (total_s % 86400) // 3600
    minutos  = (total_s % 3600) // 60
    segundos = total_s % 60

    return jsonify({"abierto": False, "dias": dias, "horas": horas, "minutos": minutos, "segundos": segundos, "total_segundos": total_s, "frase": f"Faltan {dias} días, {horas}h, {minutos}m y {segundos}s para tu sorpresa 🌙"})

@app.route("/admin")
def panel_admin():
    return render_template("admin.html")

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)