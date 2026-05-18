"""
controllers/api_cartas.py - Public + admin endpoints for sealed letters.

Public:
  GET  /api/cartas              -> {disponibles: [...], proxima_en_segundos|null}
  GET  /api/cartas/<id>         -> 200 if unlocked, 404 if not (or unknown)

Admin (X-Admin-Token / cookie):
  POST   /admin/api/cartas      -> create
  DELETE /admin/api/cartas/<id> -> remove
  GET    /admin/api/cartas      -> list all (including locked)
"""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request

from services.cartas_service import ServicioCartas, _parse_iso, _to_naive
from services.security_service import require_admin_token

cartas_bp = Blueprint("cartas", __name__)
_SERVICIO = ServicioCartas()


def _public_view(carta: dict) -> dict:
    return {
        "id": carta.get("id"),
        "titulo": carta.get("titulo"),
        "contenido": carta.get("contenido"),
        "fecha_apertura": carta.get("fecha_apertura"),
        "autor": carta.get("autor", "Frank"),
    }


@cartas_bp.get("/api/cartas")
def listar_publicas():
    ahora = datetime.now()
    disponibles = [_public_view(c) for c in _SERVICIO.listar_disponibles(ahora=ahora)]
    proxima = _SERVICIO.proxima(ahora=ahora)
    proxima_en = None
    if proxima:
        try:
            delta = _to_naive(_parse_iso(str(proxima["fecha_apertura"]))) - ahora
            proxima_en = max(int(delta.total_seconds()), 0)
        except ValueError:
            proxima_en = None
    return jsonify(
        {
            "disponibles": disponibles,
            "total_disponibles": len(disponibles),
            "proxima_en_segundos": proxima_en,
            "proxima_titulo": proxima.get("titulo") if proxima else None,
        }
    )


@cartas_bp.get("/api/cartas/<carta_id>")
def carta_individual(carta_id: str):
    for carta in _SERVICIO.listar_disponibles():
        if carta.get("id") == carta_id:
            return jsonify(_public_view(carta))
    return jsonify({"status": "error", "mensaje": "Carta no disponible."}), 404


@cartas_bp.post("/admin/api/cartas")
@require_admin_token
def crear_carta():
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    try:
        carta = _SERVICIO.crear(
            titulo=data.get("titulo", ""),
            contenido=data.get("contenido", ""),
            fecha_apertura=data.get("fecha_apertura", ""),
            autor=data.get("autor", "Frank"),
        )
    except ValueError as exc:
        return jsonify({"status": "error", "mensaje": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"status": "error", "mensaje": str(exc)}), 500
    return jsonify({"status": "ok", "carta": carta.to_dict()}), 201


@cartas_bp.delete("/admin/api/cartas/<carta_id>")
@require_admin_token
def borrar_carta(carta_id: str):
    if _SERVICIO.borrar(carta_id):
        return jsonify({"status": "ok"}), 200
    return jsonify({"status": "error", "mensaje": "No encontrada."}), 404


@cartas_bp.get("/admin/api/cartas")
@require_admin_token
def listar_admin():
    return jsonify({"cartas": _SERVICIO.listar_todas()})
