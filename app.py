"""
=============================================================
  🌙 App de Cumpleaños - Backend Flask
  Autor: Frank  |  Para: Luyuromo
  Vercel-safe: sin escrituras de archivo en producción
=============================================================
"""
import os, json, logging, random
from datetime import datetime, date
from pathlib import Path

import requests
from flask import Flask, render_template, jsonify, request

# Cargar .env si existe
try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError:
    pass

# ── Logging (blindado para Vercel read-only filesystem) ──────
LOG_DIR = Path(__file__).parent / "logs"
_handlers = [logging.StreamHandler()]
try:
    LOG_DIR.mkdir(exist_ok=True)
    _handlers.insert(0, logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8"))
except OSError:
    pass  # Vercel filesystem es read-only
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(message)s",
                    handlers=_handlers)
logger = logging.getLogger(__name__)

# ── Flask ─────────────────────────────────────────────────────
app = Flask(__name__)

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

# ── Credenciales ──────────────────────────────────────────────
TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN",   "8651973448:AAHUDVOSurQb5r0X_OJzmPurvelTVrw_wbI")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "6724969320")
TELEGRAM_URL     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ── Fechas ────────────────────────────────────────────────────
FECHA_NACIMIENTO  = datetime(2003, 8, 30)
FECHA_INICIO_AMOR = date(2025, 10, 1)
FECHA_APERTURA    = datetime(2025, 8, 30, 0, 0, 0)

# ── Persistencia en memoria (Vercel-safe) ─────────────────────
# En Vercel cada request es stateless, así que visitas y mensajes
# se guardan SOLO en Telegram. En desarrollo local también se guarda en disco.
_DATA_DIR    = Path(__file__).parent / "data"
_BUZON_TXT   = Path(__file__).parent / "buzon_secreto.txt"

def _write_safe(path: Path, content: str):
    """Escribe un archivo; ignora silenciosamente en Vercel."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    except OSError:
        pass

def _append_safe(path: Path, line: str):
    """Agrega una línea al archivo; ignora en Vercel."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass

def _read_json_safe(path: Path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default

# ── Telegram ──────────────────────────────────────────────────
def _telegram(texto: str, silencioso: bool = False) -> dict:
    """Envía mensaje a Telegram con timeout y manejo de errores."""
    if not TELEGRAM_TOKEN or "PEGA" in TELEGRAM_TOKEN:
        return {"ok": False, "error": "Token no configurado"}
    try:
        r = requests.post(
            f"{TELEGRAM_URL}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": texto,
                  "parse_mode": "HTML", "disable_notification": silencioso},
            timeout=8,
        )
        data = r.json()
        if not data.get("ok"):
            logger.warning("Telegram error: %s", data.get("description"))
        return data
    except requests.exceptions.Timeout:
        logger.error("Telegram: timeout"); return {"ok": False, "error": "timeout"}
    except requests.exceptions.ConnectionError:
        logger.error("Telegram: sin conexión"); return {"ok": False, "error": "sin conexión"}
    except Exception as e:
        logger.exception("Telegram: %s", e); return {"ok": False, "error": str(e)}

# ── Clase Regalo (compatible 100% con frontend) ───────────────
class RegaloSorpresa:
    def __init__(self, destinatario, remitente, edad):
        self.destinatario = destinatario
        self.remitente    = remitente
        self.edad         = edad
        self.mensajes     = []

    def agregar_mensaje(self, m): self.mensajes.append(m)

    def empaquetar_regalo(self):
        dias = (datetime.now() - FECHA_NACIMIENTO).days
        return {
            "titulo":       f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "estadisticas": f"✨ Has completado {self.edad} órbitas al sol y has vivido exactamente {dias:,} días maravillosos en este universo. ✨",
            "mensajes":     self.mensajes,
            "firma":        f"Con mucho cariño, {self.remitente}",
        }

mi_regalo = RegaloSorpresa("Luyuromo", "Frank", 23)
mi_regalo.agregar_mensaje("Eres una persona increíble y te mereces lo mejor.")
mi_regalo.agregar_mensaje("Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad.")
mi_regalo.agregar_mensaje("Cada día contigo es el mejor día de mi vida. ¡Disfruta tu día al máximo!")

# ── Contenido romántico ───────────────────────────────────────
FRASES = [
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
    "Si pudiera volver a elegir, te elegiría a ti mil veces más.",
    "Eres el sueño del que nunca quiero despertar.",
    "Mi vida tiene más color desde que llegaste.",
    "Gracias por existir y por dejarme quererte.",
    "Cada segundo que pasa, te quiero un segundo más.",
    "Tú eres mi por siempre favorito.",
    "Eres la constelación que siempre busco en el cielo.",
    "Con tus ojos me basta para saber que existe la felicidad.",
    "El amor que siento por ti no cabe en palabras, pero lo intento cada día.",
]

POEMAS = [
    {"titulo": "Luna de mis Noches", "versos": [
        "Eres la luna que ilumina", "mis noches más profundas y oscuras,",
        "la que guía mis pasos sin brújula", "y convierte el frío en ternura.", "",
        "Eres el faro que no pide nada,", "que solo brilla por el placer de brillar,",
        "y yo, marinero de tu mirada,", "aprendo cada día a navegar.", "",
        "Gracias por existir, luna mía,", "por iluminar este rincón del mundo.",
        "Eres mi noche y eres mi día,", "eres lo más profundo y lo más fundo.",
    ]},
    {"titulo": "Órbitas", "versos": [
        "Completas hoy otra vuelta al sol,", "otra órbita perfecta alrededor de la luz.",
        "Yo soy el planeta que no puede alejarse,", "atrapado para siempre en tu gravitación.", "",
        "Cada año que pasas deja en ti", "una nueva galaxia de sabiduría.",
        "Y yo, privilegiado testigo del universo,", "te veo florecer con alegría.", "",
        "Feliz cumpleaños, viajera del cosmos,", "que este nuevo año traiga todo lo que mereces:",
        "amor sin límites, paz infinita", "y la certeza de que siempre te quiero.",
    ]},
    {"titulo": "Para Siempre, Contigo", "versos": [
        "No necesito el tiempo sin fin", "si ese tiempo lo paso a tu lado.",
        "No necesito el mundo entero", "si tú eres mi lugar favorito.", "",
        "Cumples años y yo también,", "porque sin ti no sé cómo contar.",
        "Cada día a tu lado es un regalo", "que no merezco y que no voy a soltar.", "",
        "Feliz cumpleaños, amor de mi vida.", "Que florezcan todos tus sueños.",
        "Que el universo te trate con la misma dulzura", "con que tú me tratas a mí cada día.",
    ]},
    {"titulo": "Carta a las Estrellas", "versos": [
        "Le escribí a las estrellas tu nombre", "para que el cielo supiera quién eres.",
        "Les conté de tu risa, de tu calma,", "y quedaron en silencio, sorprendidas.", "",
        "Porque hay cosas que incluso el universo", "no sabe cómo describir con exactitud:",
        "la manera en que me miras cuando hablas,", "la forma en que transformas mi solitud.", "",
        "Así que este cumpleaños quiero decirte", "lo que ni el cosmos puede contener:",
        "que eres la razón más hermosa del mundo", "y el motivo por el que quiero ser mejor.",
    ]},
]

# ── RUTAS ─────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/estado")
def estado_regalo():
    ahora = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"bloqueado": False})
    delta = FECHA_APERTURA - ahora
    return jsonify({"bloqueado": True, "segundos_faltantes": delta.total_seconds()})

@app.route("/api/abrir_regalo")
def abrir_regalo():
    return jsonify(mi_regalo.empaquetar_regalo())

@app.route("/api/responder", methods=["POST"])
def responder():
    datos   = request.get_json(silent=True) or {}
    mensaje = datos.get("mensaje", "").strip()
    if not mensaje:
        return jsonify({"status": "error"}), 400

    # Persistencia local (falla silenciosamente en Vercel)
    _append_safe(_BUZON_TXT, f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Luyuromo: {mensaje}\n")

    # Telegram (fuente principal de persistencia)
    texto_tg = (f"💌 <b>¡MENSAJE DE LUYUROMO!</b>\n\n"
                f"<i>«{mensaje}»</i>\n\n📅 {datetime.now():%d/%m/%Y %H:%M}")
    resultado = _telegram(texto_tg)
    logger.info("Mensaje | TG OK: %s | %.50s", resultado.get("ok"), mensaje)

    return jsonify({"status": "ok",
                    "respuesta": "¡Mensaje enviado a las estrellas (y a Frank)! 🚀",
                    "telegram": resultado.get("ok", False)})

@app.route("/api/salud")
def salud():
    tg = "❌ Sin configurar"
    try:
        r  = requests.get(f"{TELEGRAM_URL}/getMe", timeout=6)
        d  = r.json()
        tg = f"✅ @{d['result']['username']}" if d.get("ok") else f"❌ {d.get('description','?')}"
    except requests.exceptions.ConnectionError: tg = "❌ Sin internet"
    except requests.exceptions.Timeout:        tg = "⏱️ Timeout"
    except Exception as e:                     tg = f"❌ {e}"
    return jsonify({"servidor": "✅ OK", "telegram": tg, "timestamp": datetime.now().isoformat()})

@app.route("/api/test_telegram", methods=["POST"])
def test_telegram():
    r = _telegram("🔔 <b>Test OK</b>\nLa API está funcionando. 🎉")
    if r.get("ok"):
        return jsonify({"status": "ok", "mensaje": "✅ Telegram conectado"})
    return jsonify({"status": "error", "mensaje": "❌ Fallo", "detalle": r.get("error","?")}), 503

@app.route("/api/frase_del_dia")
def frase_del_dia():
    idx = date.today().timetuple().tm_yday % len(FRASES)
    return jsonify({"frase": FRASES[idx], "numero": idx+1, "total": len(FRASES)})

@app.route("/api/poema")
def poema_aleatorio():
    p = random.choice(POEMAS)
    return jsonify({"titulo": p["titulo"], "versos": p["versos"],
                    "texto": "\n".join(p["versos"])})

@app.route("/api/estadisticas_amor")
def estadisticas_amor():
    hoy  = date.today()
    dias = (datetime.now() - FECHA_NACIMIENTO).days
    edad = dias // 365
    juntos = (hoy - FECHA_INICIO_AMOR).days
    proximo = date(hoy.year, 8, 30)
    if proximo <= hoy: proximo = date(hoy.year+1, 8, 30)
    return jsonify({
        "edad_años":         edad,
        "dias_vividos":      f"{dias:,}",
        "horas_vividas":     f"{dias*24:,}",
        "latidos_estimados": f"{dias*24*60*72:,}",
        "semanas_vividas":   dias // 7,
        "dias_juntos":       f"{juntos:,}",
        "horas_juntos":      f"{juntos*24:,}",
        "orbitas_al_sol":    edad,
        "dias_para_cumple":  (proximo - hoy).days,
        "proximo_cumple":    proximo.isoformat() if (proximo-hoy).days>0 else "¡Hoy! 🎉",
    })

@app.route("/api/countdown_detallado")
def countdown_detallado():
    ahora = datetime.now()
    if ahora >= FECHA_APERTURA:
        return jsonify({"abierto": True})
    t   = int((FECHA_APERTURA - ahora).total_seconds())
    return jsonify({
        "abierto":       False,
        "dias":          t // 86400,
        "horas":         (t % 86400) // 3600,
        "minutos":       (t % 3600) // 60,
        "segundos":      t % 60,
        "total_segundos": t,
    })

@app.route("/api/constelacion_completada", methods=["POST"])
def constelacion_completada():
    """Notifica a Frank cuando ella completa el mini-juego de constelaciones."""
    _telegram("🌟 <b>¡Luyuromo completó la Constelación del Amor!</b>\n\n"
              "Conectó todas las estrellas y formó el corazón 💖", silencioso=True)
    return jsonify({"status": "ok", "mensaje": "¡Lo lograste! 🌟"})

@app.route("/admin")
def panel_admin():
    return render_template("admin.html")

if __name__ == "__main__":
    logger.info("🌙 Servidor iniciado")
    app.run(debug=True, host="0.0.0.0", port=5000)