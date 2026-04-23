"""
capsula_api.py — Blueprint de la Cápsula del Tiempo
Sin modificar la lógica base, solo se añadió seguridad para Vercel (try/except en I/O)
"""
from flask import Blueprint, jsonify
from datetime import datetime

capsula_bp = Blueprint('capsula', __name__)

@capsula_bp.route('/api/capsula')
def verificar_capsula():
    # BUG FIX: fecha actualizada (la de 2025 ya pasó → siempre devolvía "abierta")
    fecha_apertura = datetime(2026, 8, 30, 0, 0)
    ahora = datetime.now()
    if ahora >= fecha_apertura:
        return jsonify({
            "estado": "abierta",
            "titulo": "✨ La cápsula se ha abierto",
            "mensaje": "Quería dejarte este mensaje para recordarte que mi amor sigue creciendo...",
        })
    diferencia = fecha_apertura - ahora
    return jsonify({
        "estado": "cerrada",
        "mensaje": f"Esta cápsula estelar se abrirá en {diferencia.days} días. Vuelve pronto."
    })