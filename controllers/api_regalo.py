"""
api/regalo.py
RegaloModule — hereda de ContenidoModule (herencia en cadena)
Gestiona la apertura del regalo y las páginas principales.
"""
from __future__ import annotations
from datetime import datetime
from flask import render_template
from jinja2 import TemplateNotFound
from controllers.api_contenido import ContenidoModule
from services.security_service import require_admin_session


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
        # BUG FIX: NO llamamos super()._registrar_rutas() porque ContenidoModule
        # ya está registrado en app.py como blueprint separado. Llamarlo aquí
        # generaba rutas duplicadas (/api/frase_del_dia, /api/poema, etc.).
        self.bp.route("/"                )(self.index)
        self.bp.route("/admin"           )(require_admin_session(self.admin))
        self.bp.route("/preview"         )(self.preview)
        self.bp.route("/carta"           )(self.carta)
        self.bp.route("/universo"        )(self.universo)
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
    def _render_template_compat(self, *nombres: str):
        """
        Render robusto ante diferencias de mayus/minus entre Windows y Linux.
        """
        for nombre in nombres:
            try:
                return render_template(nombre)
            except TemplateNotFound:
                continue
        self.log.error("No se encontro ninguna plantilla valida: %s", nombres)
        return self._error("Plantilla no encontrada", 500)

    def index(self):
        return self._render_template_compat("index.html")

    def admin(self):
        return self._render_template_compat("admin.html")

    def preview(self):
        return self._render_template_compat("preview.html")

    def carta(self):
        return self._render_template_compat("carta.html")

    def universo(self):
        return self._render_template_compat("universo.html")

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
