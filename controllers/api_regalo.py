"""
api/regalo.py
RegaloModule — hereda de ContenidoModule (herencia en cadena)
Gestiona la apertura del regalo y las páginas principales.
"""
from __future__ import annotations
from datetime import datetime
from flask import render_template
from api.contenido import ContenidoModule


class RegaloBase(ContenidoModule):
    """
    Clase base del regalo. Extiende ContenidoModule para reutilizar
    frases y poemas, y añade la lógica del regalo en sí.
    Demuestra herencia en cadena: RegaloBase → ContenidoModule → APIModule → BaseModule
    """
    nombre         = "regalo_base"
    destinatario   = "Luyuromo"
    remitente      = "Frank"
    edad           = 23
    _mensajes_list = []

    def __init__(self):
        super().__init__()
        self._init_mensajes()

    def _init_mensajes(self):
        """Subclases pueden sobreescribir esto para personalizar mensajes."""
        self._mensajes_list = [
            "Eres una persona increíble y te mereces lo mejor.",
            "Que este nuevo año de vida esté lleno de éxitos y mucha felicidad.",
            "Cada día contigo es el mejor día de mi vida. ¡Disfruta tu día al máximo!",
        ]

    def _registrar_rutas(self):
        # Heredamos las rutas de ContenidoModule y añadimos las propias
        super()._registrar_rutas()
        self.bp.route("/"             )(self.index)
        self.bp.route("/admin"        )(self.admin)
        self.bp.route("/carta"        )(self.carta)
        self.bp.route("/universo"     )(self.universo)
        self.bp.route("/api/abrir_regalo")(self.abrir_regalo)

    def empaquetar(self) -> dict:
        dias = (datetime.now() - self.FECHA_NACIMIENTO).days
        return {
            "titulo":       f"¡Feliz Cumpleaños número {self.edad}, {self.destinatario}! 🎉",
            "estadisticas": f"✨ Has completado {self.edad} órbitas al sol y has vivido "
                            f"exactamente {dias:,} días maravillosos en este universo. ✨",
            "mensajes":     self._mensajes_list,
            "firma":        f"Con mucho cariño, {self.remitente}",
        }

    # ── rutas ────────────────────────────────────────────────
    def index(self):
        return render_template("index.html")

    def admin(self):
        return render_template("admin.html")

    def carta(self):
        return render_template("carta.html")

    def universo(self):
        return render_template("universo.html")

    def abrir_regalo(self):
        return self._ok(self.empaquetar())


class RegaloLuyuromo(RegaloBase):
    """
    Clase hija concreta, personalizada para Luyuromo.
    Herencia completa: RegaloLuyuromo → RegaloBase → ContenidoModule → APIModule → BaseModule
    Solo sobreescribe _init_mensajes para personalizar el contenido.
    """
    nombre       = "regalo"
    destinatario = "Luyuromo"
    remitente    = "Frank"
    edad         = 23

    def _init_mensajes(self):
        self._mensajes_list = [
            "Eres una persona increíble y te mereces lo mejor.",
            "Que este nuevo año de vida esté lleno de éxitos, código sin bugs y mucha felicidad.",
            "Cada día contigo es el mejor día de mi vida. ¡Disfruta tu día al máximo!",
        ]


regalo_module = RegaloLuyuromo()