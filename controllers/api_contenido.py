"""
api/contenido.py
ContenidoModule — hereda de APIModule
Gestiona frases románticas, poemas y datos del regalo.
"""
from __future__ import annotations
import random
from datetime import date, datetime
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


_PALETAS_DIA = [
    {"nombre": "amanecer",  "primario": "#ff8fa3", "acento": "#ffd6a5"},
    {"nombre": "luna",      "primario": "#a0c4ff", "acento": "#bdb2ff"},
    {"nombre": "aurora",    "primario": "#74c69d", "acento": "#90e0ef"},
    {"nombre": "nebulosa",  "primario": "#cdb4db", "acento": "#ffc8dd"},
    {"nombre": "atardecer", "primario": "#f4978e", "acento": "#f8edeb"},
    {"nombre": "constelacion", "primario": "#f5c842", "acento": "#ff6b81"},
]

_EMOJIS_DIA = ["🌙", "✨", "💫", "🌟", "💖", "🌌", "🌠", "🪐", "💞"]


class ContenidoModule(APIModule):
    """
    Módulo de contenido romántico.
    Hereda de APIModule → BaseModule.
    """
    nombre = "contenido"

    def _registrar_rutas(self):
        self.bp.route("/api/frase_del_dia")(self.frase_del_dia)
        self.bp.route("/api/poema")(self.poema_aleatorio)
        self.bp.route("/api/frase_aleatoria")(self.frase_aleatoria)
        self.bp.route("/api/poema/<int:idx>")(self.poema_por_indice)
        self.bp.route("/api/todas_frases")(self.todas_las_frases)
        self.bp.route("/api/regalo_diario")(self.regalo_diario)

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

    def regalo_diario(self):
        """
        Daily deterministic gift: every day produces a unique payload that
        combines a phrase, a short poem stanza, a daily fact and a palette.
        Same day -> same result (seeded). Different day -> guaranteed
        rotation thanks to the prime-stride indexing.
        """
        hoy = date.today()
        seed = hoy.toordinal()
        # `random.Random(seed)` keeps the global RNG untouched.
        rng = random.Random(seed)

        # Use prime strides so consecutive days don't repeat the same
        # phrase / poem even when the lists are short.
        frase_idx = (seed * 7) % len(FRASES)
        poema = POEMAS[(seed * 11) % len(POEMAS)]
        verso_idx = (seed * 13) % max(len(poema["versos"]), 1)
        verso = poema["versos"][verso_idx] or poema["versos"][0]
        paleta = _PALETAS_DIA[(seed * 5) % len(_PALETAS_DIA)]
        emoji = _EMOJIS_DIA[(seed * 17) % len(_EMOJIS_DIA)]

        dias_vividos = self._dias_vividos()
        dias_juntos = self._dias_juntos()
        proximo = self._proximo_cumple()
        dias_para_cumple = (proximo - hoy).days

        # Pick one of several voice templates so the daily payload varies
        # in tone too, not just data.
        plantillas = [
            "Hoy es el dia {ord} en que el universo nos deja seguir.",
            "{dias_juntos} dias juntos, y todavia te elijo.",
            "Faltan {dias_para_cumple} dias para tu vuelta al sol numero 23.",
            "Una orbita mas, una galaxia entera de razones para quererte.",
            "Cada noche cuento {dias_vividos} dias y todavia me parecen pocos.",
        ]
        plantilla = rng.choice(plantillas)
        dato = plantilla.format(
            ord=dias_vividos,
            dias_juntos=dias_juntos,
            dias_para_cumple=max(dias_para_cumple, 0),
            dias_vividos=dias_vividos,
        )

        return self._ok(
            {
                "fecha": hoy.isoformat(),
                "frase": FRASES[frase_idx],
                "verso": verso,
                "poema_titulo": poema["titulo"],
                "dato_del_dia": dato,
                "emoji": emoji,
                "paleta": paleta,
            }
        )


# Instancia lista para importar
contenido_module = ContenidoModule()