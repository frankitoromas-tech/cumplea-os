"""
api/regalo.py
RegaloModule — hereda de ContenidoModule (herencia en cadena)
Gestiona la apertura del regalo y las páginas principales.
"""
from __future__ import annotations
from datetime import UTC, datetime
from pathlib import Path
import os
import re

from flask import current_app, make_response, render_template
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
    _FALLBACK_RECUERDOS = [
        "/static/DEFAULT_RECUERDOS/foto1.png",
        "/static/DEFAULT_RECUERDOS/foto2.png",
        "/static/DEFAULT_RECUERDOS/foto3.png",
        "/static/DEFAULT_RECUERDOS/foto4.png",
        "/static/DEFAULT_RECUERDOS/foto5.png",
    ]
    _PREVIEW_REV = (
        os.getenv("RAWLY_GIT_COMMIT_SHA")
        or os.getenv("RAILWAY_GIT_COMMIT_SHA")
        or os.getenv("VERCEL_GIT_COMMIT_SHA")
        or os.getenv("GIT_COMMIT_SHA")
        or datetime.now(UTC).strftime("local-%Y%m%d%H%M%S")
    )

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
        self.bp.route("/preview-lab"     )(self.preview)
        self.bp.route("/preview_lab"     )(self.preview)
        self.bp.route("/carta"           )(self.carta)
        self.bp.route("/series"          )(self.series)
        self.bp.route("/universo"        )(self.universo)
        self.bp.route("/api/abrir_regalo")(self.abrir_regalo)
        self.bp.route("/api/recuerdos_media")(self.recuerdos_media)
        self.bp.route("/api/build_info")(self.build_info)

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
    def _render_template_compat(self, *nombres: str, **context):
        """
        Render robusto ante diferencias de mayus/minus entre Windows y Linux.
        """
        for nombre in nombres:
            try:
                return render_template(nombre, **context)
            except TemplateNotFound:
                continue
        self.log.error("No se encontro ninguna plantilla valida: %s", nombres)
        return self._error("Plantilla no encontrada", 500)

    def _render_template_nocache(self, *nombres: str, **context):
        response = make_response(self._render_template_compat(*nombres, **context))
        response.headers["Cache-Control"] = "no-store, max-age=0"
        response.headers["Pragma"] = "no-cache"
        return response

    def index(self):
        return self._render_template_compat("index.html")

    def admin(self):
        return self._render_template_compat("admin.html")

    def preview(self):
        return self._render_template_nocache(
            "preview.html",
            preview_lab_rev=self._PREVIEW_REV,
        )

    def carta(self):
        return self._render_template_compat("carta.html")

    def series(self):
        return self._render_template_nocache("series.html")

    def universo(self):
        return self._render_template_nocache("universo.html")

    def abrir_regalo(self):
        return self._ok(self.empaquetar())

    @staticmethod
    def _orden_recuerdo(path: Path) -> tuple[int, str]:
        match = re.search(r"(\d+)", path.stem)
        if match:
            return int(match.group(1)), path.name.lower()
        return 10_000, path.name.lower()

    def _listar_recuerdos_media(self) -> list[str]:
        static_root = Path(current_app.static_folder or "static")
        recuerdos_root = static_root / "DEFAULT_RECUERDOS"
        extensiones = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

        if not recuerdos_root.exists() or not recuerdos_root.is_dir():
            return list(self._FALLBACK_RECUERDOS)

        archivos = [
            path
            for path in recuerdos_root.iterdir()
            if path.is_file() and path.suffix.lower() in extensiones
        ]
        archivos.sort(key=self._orden_recuerdo)

        urls = [f"/static/DEFAULT_RECUERDOS/{path.name}" for path in archivos]
        if not urls:
            return list(self._FALLBACK_RECUERDOS)
        return urls

    def recuerdos_media(self):
        recuerdos = self._listar_recuerdos_media()
        return self._ok(
            {
                "recuerdos": recuerdos,
                "total": len(recuerdos),
            }
        )

    def build_info(self):
        return self._ok(
            {
                "preview_lab_rev": self._PREVIEW_REV,
                "server_time": datetime.now(UTC).isoformat(),
            }
        )


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
