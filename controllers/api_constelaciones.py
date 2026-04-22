"""
creador_constelaciones.py — Blueprint del Creador de Constelaciones
Bug fix: escrituras de archivo ahora son Vercel-safe (try/except OSError)
"""
from flask import Blueprint, request, jsonify
import json
import os
from pathlib import Path

creador_bp = Blueprint('creador', __name__)
ARCHIVO_CONSTELACIONES = Path(__file__).parent / 'data' / 'constelaciones_creadas.json'

def _leer_constelaciones():
    """Lee el archivo de constelaciones de forma segura."""
    try:
        if ARCHIVO_CONSTELACIONES.exists():
            return json.loads(ARCHIVO_CONSTELACIONES.read_text(encoding='utf-8'))
    except Exception:
        pass
    return []

def _guardar_constelaciones(lista):
    """Guarda constelaciones — falla silenciosamente en Vercel (read-only fs)."""
    try:
        ARCHIVO_CONSTELACIONES.parent.mkdir(parents=True, exist_ok=True)
        ARCHIVO_CONSTELACIONES.write_text(
            json.dumps(lista, ensure_ascii=False, indent=4), encoding='utf-8'
        )
        return True
    except OSError:
        return False  # En Vercel: guardado solo en memoria de la sesión

@creador_bp.route('/api/guardar_constelacion', methods=['POST'])
def guardar():
    datos  = request.get_json(silent=True) or {}
    nombre = datos.get('nombre', 'Constelación sin nombre')
    puntos = datos.get('puntos', [])

    historico = _leer_constelaciones()
    historico.append({"nombre": nombre, "estrellas": puntos})
    guardado = _guardar_constelaciones(historico)

    return jsonify({
        "status":   "ok",
        "guardado": guardado,
        "mensaje":  f"La constelación '{nombre}' ha sido registrada en el universo."
    })

@creador_bp.route('/api/constelaciones')
def listar():
    """Nueva ruta: devuelve todas las constelaciones guardadas."""
    return jsonify({"constelaciones": _leer_constelaciones()})