"""
controllers/api_capsula.py - Capsula del tiempo.
"""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from services.preview_service import resolve_from_request_args

capsula_bp = Blueprint("capsula", __name__)

_IMAGEN_CAPSULA = "/static/DEFAULT_RECUERDOS/foto5.png"
_MENSAJE_ABIERTA = (
    "Queria dejarte este mensaje para recordarte que, "
    "incluso semanas despues de tu cumpleanos, "
    "mi amor por ti sigue creciendo..."
)


@capsula_bp.route("/api/capsula")
def verificar_capsula():
    ahora = datetime.now()
    resolved = resolve_from_request_args(request.args)
    apertura = resolved.apertura
    diferencia = apertura - ahora

    if not resolved.bloqueado:
        return jsonify(
            {
                "estado": "abierta",
                "titulo": "La capsula se ha abierto",
                "mensaje": _MENSAJE_ABIERTA,
                "fecha_apertura": apertura.isoformat(),
                "fuente_apertura": resolved.fuente,
                "capa_efectiva": resolved.capa,
                "imagen_url": _IMAGEN_CAPSULA,
            }
        )

    return jsonify(
        {
            "estado": "cerrada",
            "mensaje": f"Esta capsula estelar se abrira en {diferencia.days} dias. Vuelve pronto.",
            "fecha_apertura": apertura.isoformat(),
            "fuente_apertura": resolved.fuente,
            "capa_efectiva": resolved.capa,
            "dias_restantes": diferencia.days,
            "segundos_restantes": resolved.segundos_faltantes,
        }
    )
