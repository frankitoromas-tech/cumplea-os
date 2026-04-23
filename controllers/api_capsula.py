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


@capsula_bp.route("/api/capsula")
def verificar_capsula():
    ahora = datetime.now()

    if ahora >= _FECHA_CAPSULA:
        return jsonify({
            "estado":     "abierta",
            "titulo":     "✨ La cápsula se ha abierto",
            "mensaje":    ("Quería dejarte este mensaje para recordarte que, "
                           "incluso semanas después de tu cumpleaños, "
                           "mi amor por ti sigue creciendo..."),
            "imagen_url": "/static/DEFAULT_RECUERDOS/foto_secreta.png",
        })

    diferencia = _FECHA_CAPSULA - ahora
    return jsonify({
        "estado":  "cerrada",
        "mensaje": f"Esta cápsula estelar se abrirá en {diferencia.days} días. Vuelve pronto.",
        "dias_restantes": diferencia.days,
    })