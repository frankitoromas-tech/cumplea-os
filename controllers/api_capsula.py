"""
controllers/api_capsula.py — Cápsula del Tiempo.
BUG FIX: fecha_apertura estaba en 2025 (ya pasada), por lo que la cápsula
siempre devolvía estado "abierta". Actualizada a 2026-08-30 para que
se abra junto con el cumpleaños.
"""
from flask import Blueprint, jsonify
from datetime import datetime

capsula_bp = Blueprint("capsula", __name__)

# ── Fecha en que se abre la cápsula ─────────────────────────
# BUG FIX: era datetime(2025, 8, 30) → ya había pasado → siempre "abierta"
_FECHA_CAPSULA = datetime(2026, 8, 30, 0, 0)
_IMAGEN_CAPSULA = "/static/DEFAULT_RECUERDOS/foto5.png"


@capsula_bp.route("/api/capsula")
def verificar_capsula():
    ahora = datetime.now()
    diferencia = _FECHA_CAPSULA - ahora

    if ahora >= _FECHA_CAPSULA:
        return jsonify({
            "estado":     "abierta",
            "titulo":     "✨ La cápsula se ha abierto",
            "mensaje":    ("Quería dejarte este mensaje para recordarte que, "
                           "incluso semanas después de tu cumpleaños, "
                           "mi amor por ti sigue creciendo..."),
            "fecha_apertura": _FECHA_CAPSULA.isoformat(),
            "imagen_url": _IMAGEN_CAPSULA,
        })

    return jsonify({
        "estado":  "cerrada",
        "mensaje": f"Esta cápsula estelar se abrirá en {diferencia.days} días. Vuelve pronto.",
        "fecha_apertura": _FECHA_CAPSULA.isoformat(),
        "dias_restantes": diferencia.days,
        "segundos_restantes": max(int(diferencia.total_seconds()), 0),
    })
