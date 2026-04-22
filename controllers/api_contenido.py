"""
api/contenido.py
ContenidoModule — hereda de APIModule
Gestiona frases románticas, poemas y datos del regalo.
"""
from __future__ import annotations
import random
from datetime import datetime
from flask import request
from api import APIModule


FRASES = [
    "Eres el poema que nunca supe que necesitaba escribir.",
    "En el universo infinito, elegirte a ti es mi decisión favorita.",
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
    {"titulo": "Gravitación", "versos": [
        "Newton dijo que los cuerpos se atraen", "en proporción a su masa y distancia.",
        "Pero nunca calculó lo que ocurre", "cuando uno de esos cuerpos eres tú.", "",
        "Mi órbita cambió el día que te conocí,", "sin fórmula que pueda describirlo,",
        "caí hacia ti con la naturalidad", "con que la luna cae hacia la tierra.", "",
        "Y aquí estoy, girando a tu alrededor,", "sin desear otra trayectoria.",
        "Porque en física del amor", "tú eres la fuerza más constante del universo.",
    ]},
]


class ContenidoModule(APIModule):
    """
    Módulo de contenido romántico.
    Hereda de APIModule → BaseModule.
    Rutas: /api/frase_del_dia, /api/poema, /api/frase_aleatoria, /api/poema/<n>
    """
    nombre = "contenido"

    def _registrar_rutas(self):
        self.bp.route("/api/frase_del_dia")(self.frase_del_dia)
        self.bp.route("/api/poema")(self.poema_aleatorio)
        self.bp.route("/api/frase_aleatoria")(self.frase_aleatoria)
        self.bp.route("/api/poema/<int:idx>")(self.poema_por_indice)
        self.bp.route("/api/todas_frases")(self.todas_las_frases)

    # ── rutas ────────────────────────────────────────────────
    def frase_del_dia(self):
        from datetime import date
        idx = date.today().timetuple().tm_yday % len(FRASES)
        return self._ok({"frase": FRASES[idx], "numero": idx+1, "total": len(FRASES)})

    def poema_aleatorio(self):
        p = random.choice(POEMAS)
        return self._ok({"titulo": p["titulo"], "versos": p["versos"],
                         "texto": "\n".join(p["versos"])})

    def frase_aleatoria(self):
        """Nueva ruta: frase completamente aleatoria (no determinista por día)."""
        frase = random.choice(FRASES)
        return self._ok({"frase": frase, "total": len(FRASES)})

    def poema_por_indice(self, idx):
        """Nueva ruta: obtener un poema específico por índice."""
        if 0 <= idx < len(POEMAS):
            p = POEMAS[idx]
            return self._ok({"titulo": p["titulo"], "versos": p["versos"],
                             "indice": idx, "total": len(POEMAS)})
        return self._error(f"Índice fuera de rango. Total poemas: {len(POEMAS)}", 404)

    def todas_las_frases(self):
        """Nueva ruta: devuelve todas las frases para el selector de frases."""
        return self._ok({"frases": FRASES, "total": len(FRASES)})


# Instancia lista para importar
contenido_module = ContenidoModule()