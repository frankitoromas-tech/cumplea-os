"""
creador_constelaciones.py - Blueprint del Creador de Constelaciones.

Mejora profesional:
- Evita perder datos historicos repartidos entre `data/` y `controllers/data/`.
- Valida y normaliza payload para evitar coordenadas invalidas.
- Mantiene el guardado Vercel-safe (read-only filesystem).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from flask import Blueprint, jsonify, request

from services.constelacion_service import ServicioConstelacion

creador_bp = Blueprint("creador", __name__)
_SERVICIO = ServicioConstelacion()
_PRIMARY_FILE = _SERVICIO.ruta
_LEGACY_FILE = Path(__file__).resolve().parent / "data" / "constelaciones_creadas.json"
_MAX_ESTRELLAS = 200
_MAX_NOMBRE_LEN = 80


def _leer_lista_segura(path: Path) -> list:
    try:
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(raw, list):
                return raw
    except Exception:
        pass
    return []


def _normalizar_nombre(valor: object) -> str:
    nombre = str(valor or "").strip()
    if not nombre:
        return "Constelacion sin nombre"
    return nombre[:_MAX_NOMBRE_LEN]


def _normalizar_estrellas(valor: object) -> list[dict]:
    if not isinstance(valor, list):
        raise ValueError("`puntos` debe ser una lista de coordenadas.")

    estrellas: list[dict] = []
    for punto in valor[:_MAX_ESTRELLAS]:
        if not isinstance(punto, dict):
            continue
        x, y = punto.get("x"), punto.get("y")
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            continue
        x_num = float(x)
        y_num = float(y)
        if not (math.isfinite(x_num) and math.isfinite(y_num)):
            continue
        estrellas.append({"x": round(x_num, 3), "y": round(y_num, 3)})

    if len(estrellas) < 2:
        raise ValueError("La constelacion necesita al menos 2 estrellas validas.")
    return estrellas


def _normalizar_constelacion(raw: object) -> dict | None:
    if not isinstance(raw, dict):
        return None
    try:
        return {
            "nombre": _normalizar_nombre(raw.get("nombre")),
            "estrellas": _normalizar_estrellas(raw.get("estrellas", [])),
        }
    except ValueError:
        return None


def _cargar_historico() -> list[dict]:
    """
    Conserva compatibilidad con datos antiguos:
    - `data/constelaciones_creadas.json` (ruta actual)
    - `controllers/data/constelaciones_creadas.json` (ruta legacy)
    """
    historico: list[dict] = []
    seen: set[str] = set()

    for registro in _leer_lista_segura(_PRIMARY_FILE) + _leer_lista_segura(_LEGACY_FILE):
        normalizado = _normalizar_constelacion(registro)
        if not normalizado:
            continue
        firma = json.dumps(normalizado, ensure_ascii=False, sort_keys=True)
        if firma in seen:
            continue
        seen.add(firma)
        historico.append(normalizado)

    return historico


@creador_bp.route("/api/guardar_constelacion", methods=["POST"])
def guardar():
    datos = request.get_json(silent=True) or {}

    try:
        nueva_constelacion = {
            "nombre": _normalizar_nombre(datos.get("nombre")),
            "estrellas": _normalizar_estrellas(datos.get("puntos", [])),
        }
    except ValueError as exc:
        return jsonify({"status": "error", "mensaje": str(exc)}), 400

    historico = _cargar_historico()
    historico.append(nueva_constelacion)
    guardado = _SERVICIO.guardar_datos(historico)

    return jsonify(
        {
            "status": "ok",
            "guardado": guardado,
            "total": len(historico),
            "mensaje": (
                f"La constelacion '{nueva_constelacion['nombre']}' "
                "ha sido registrada en el universo."
            ),
        }
    )


@creador_bp.route("/api/constelaciones")
def listar():
    constelaciones = _cargar_historico()
    return jsonify({"constelaciones": constelaciones, "total": len(constelaciones)})
