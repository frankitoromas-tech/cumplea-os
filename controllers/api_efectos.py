"""
api/efectos.py
EfectosModule — hereda de APIModule
Datos para páginas especiales: aurora, timeline, juego corazones.
"""
from __future__ import annotations
import random
from datetime import datetime
from flask import render_template
from api import APIModule


# Datos de la línea del tiempo
MOMENTOS_TIMELINE = [
    {"fecha": "Octubre 2025",   "icono": "🌟", "titulo": "El primer día",
     "descripcion": "El día que el universo decidió que nuestros caminos debían cruzarse. Desde ese momento, nada volvió a ser igual."},
    {"fecha": "Noviembre 2025", "icono": "💬", "titulo": "Las primeras conversaciones",
     "descripcion": "Horas y horas hablando de todo y de nada. Descubriendo que teníamos más en común de lo que imaginábamos."},
    {"fecha": "Diciembre 2025", "icono": "💕", "titulo": "El primer 'te quiero'",
     "descripcion": "Esas palabras que cambian todo. Las dije con el corazón en la garganta, y tú las recibiste con esa sonrisa que paraliza el tiempo."},
    {"fecha": "Enero 2026",     "icono": "🌙", "titulo": "Noches de Luna",
     "descripcion": "Mirando la luna juntos, prometiendo que no importa la distancia, siempre estaríamos bajo el mismo cielo."},
    {"fecha": "Febrero 2026",   "icono": "🌹", "titulo": "El día del amor",
     "descripcion": "No necesitamos una fecha especial para celebrar lo nuestro, pero es bonito tener una excusa para hacerlo más grande."},
    {"fecha": "Agosto 2026",    "icono": "🎂", "titulo": "Tu cumpleaños",
     "descripcion": "El día que celebramos 23 órbitas al sol de la persona más importante de mi universo. Este regalo es para ti."},
]

# Frases para la aurora
FRASES_AURORA = [
    "Como la aurora boreal, tú apareces en mi vida con colores que nunca esperé.",
    "Los colores más bellos del cielo se quedan cortos ante los de tus ojos.",
    "Eres la luz que baila en la oscuridad de la noche.",
    "El universo pinta con luz para que podamos entender lo que es la belleza.",
    "Y yo, que creí haber visto todo, aún no había visto nada hasta verte a ti.",
]


class EfectosModule(APIModule):
    """
    Módulo de efectos y páginas especiales.
    Hereda de APIModule → BaseModule.
    """
    nombre = "efectos"

    def _registrar_rutas(self):
        self.bp.route("/aurora"         )(self.vista_aurora)
        self.bp.route("/timeline"       )(self.vista_timeline)
        self.bp.route("/api/aurora_data")(self.aurora_data)
        self.bp.route("/api/timeline"   )(self.timeline_data)
        self.bp.route("/api/juego_corazones_config")(self.juego_corazones_config)

    # ── rutas ────────────────────────────────────────────────
    def vista_aurora(self):
        return render_template("aurora.html")

    def vista_timeline(self):
        return render_template("timeline.html")

    def aurora_data(self):
        """Datos dinámicos para la página aurora."""
        h = datetime.now().hour
        paleta = {
            "madrugada": ["#0d1b2a", "#1b4332", "#40916c", "#74c69d"],
            "mañana":    ["#023e8a", "#0077b6", "#00b4d8", "#90e0ef"],
            "tarde":     ["#370617", "#6a040f", "#d00000", "#e85d04"],
            "noche":     ["#03071e", "#370617", "#6a040f", "#7400b8"],
        }
        if   5  <= h < 12: momento = "mañana"
        elif 12 <= h < 18: momento = "tarde"
        elif 18 <= h < 22: momento = "noche"
        else:               momento = "madrugada"
        return self._ok({
            "frase":    random.choice(FRASES_AURORA),
            "colores":  paleta[momento],
            "momento":  momento,
        })

    def timeline_data(self):
        """Devuelve los momentos de la línea del tiempo."""
        return self._ok({"momentos": MOMENTOS_TIMELINE, "total": len(MOMENTOS_TIMELINE)})

    def juego_corazones_config(self):
        """Config del juego de corazones que se muestra en index."""
        return self._ok({
            "velocidad_inicial": 2.5,
            "vidas": 3,
            "puntos_por_corazon": 10,
            "bonus_combo": 5,
            "emojis": ["💕", "🤍", "💙", "🌙", "✨", "💫", "💖"],
        })


efectos_module = EfectosModule()