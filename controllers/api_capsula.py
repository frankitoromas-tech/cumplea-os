"""
controllers/api_capsula.py - Capsula del tiempo.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from api import APIModule

capsula_bp = Blueprint("capsula", __name__)

_IMAGEN_CAPSULA = "/static/DEFAULT_RECUERDOS/foto5.png"
_MENSAJE_ABIERTA = (
    "Queria dejarte este mensaje para recordarte que, "
    "incluso semanas despues de tu cumpleanos, "
    "mi amor por ti sigue creciendo..."
)


def _preview_habilitado() -> bool:
    return (os.getenv("PREVIEW_MODE_ENABLED") or "").strip() == "1"


def _parse_iso_datetime(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone().replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


def _fecha_capsula_efectiva() -> tuple[datetime, str]:
    base = APIModule._fecha_apertura_configurada()
    if not _preview_habilitado():
        return base, "real"

    estado_preview = (request.args.get("preview_state") or "").strip().lower()
    if estado_preview in {"open", "abierta"}:
        return datetime.now() - timedelta(seconds=3), "preview-open"
    if estado_preview in {"locked", "bloqueada"}:
        return datetime.now() + timedelta(days=7), "preview-locked"

    custom = _parse_iso_datetime((request.args.get("preview_open_at") or "").strip())
    if custom:
        return custom, "preview-custom"

    return base, "real"


@capsula_bp.route("/api/capsula")
def verificar_capsula():
    ahora = datetime.now()
    apertura, fuente = _fecha_capsula_efectiva()
    diferencia = apertura - ahora

    if ahora >= apertura:
        return jsonify(
            {
                "estado": "abierta",
                "titulo": "La capsula se ha abierto",
                "mensaje": _MENSAJE_ABIERTA,
                "fecha_apertura": apertura.isoformat(),
                "fuente_apertura": fuente,
                "imagen_url": _IMAGEN_CAPSULA,
            }
        )

    return jsonify(
        {
            "estado": "cerrada",
            "mensaje": f"Esta capsula estelar se abrira en {diferencia.days} dias. Vuelve pronto.",
            "fecha_apertura": apertura.isoformat(),
            "fuente_apertura": fuente,
            "dias_restantes": diferencia.days,
            "segundos_restantes": max(int(diferencia.total_seconds()), 0),
        }
    )
