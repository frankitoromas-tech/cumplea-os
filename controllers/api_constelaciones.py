"""
creador_constelaciones.py - Blueprint del Creador de Constelaciones.

- Lee el archivo primario via ServicioConstelacion (respeta el cifrado).
- Mantiene compatibilidad de lectura con el archivo legacy plaintext
  en `controllers/data/`.
- Valida y normaliza el payload para evitar coordenadas invalidas.
"""
from __future__ import annotations

import json
import logging
import math
from pathlib import Path

from flask import Blueprint, jsonify, request

from services.constelacion_service import ServicioConstelacion

logger = logging.getLogger(__name__)
creador_bp = Blueprint("creador", __name__)
_SERVICIO = ServicioConstelacion()
_LEGACY_FILE = Path(__file__).resolve().parent / "data" / "constelaciones_creadas.json"
_MAX_ESTRELLAS = 200
_MAX_NOMBRE_LEN = 80


def _leer_legacy() -> list:
    """
    Read the legacy plaintext file. Returns [] if missing or unparseable.
    Errors are logged so operators notice corruption instead of silently
    losing historical entries.
    """
    try:
        if not _LEGACY_FILE.exists():
            return []
        raw = json.loads(_LEGACY_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, list):
            return raw
        logger.warning("Legacy file %s is not a list (%s).", _LEGACY_FILE, type(raw).__name__)
    except json.JSONDecodeError:
        logger.exception("Legacy file %s is corrupt JSON.", _LEGACY_FILE)
    except OSError:
        logger.exception("Cannot read legacy file %s.", _LEGACY_FILE)
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
        if isinstance(x, bool) or isinstance(y, bool):
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
    Merge data from the primary (possibly encrypted) store and the legacy
    plaintext file, deduplicating identical entries.
    """
    historico: list[dict] = []
    seen: set[str] = set()

    for registro in _SERVICIO.leer_datos() + _leer_legacy():
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
    if not guardado:
        return (
            jsonify(
                {
                    "status": "error",
                    "mensaje": "No se pudo persistir la constelacion. Revisa los logs del servidor.",
                }
            ),
            500,
        )

    return jsonify(
        {
            "status": "ok",
            "guardado": True,
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
