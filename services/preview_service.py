"""
services/preview_service.py — Fuente única de verdad para Preview Lab.

Usado por /api/estado, /api/preview_estado, /api/capsula y countdown
para que backend y panel de preview siempre calculen la misma fecha.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timedelta

from api import APIModule


@dataclass(frozen=True)
class PreviewResolution:
    apertura: datetime
    fuente: str
    bloqueado: bool
    segundos_faltantes: int
    capa: str  # real | backend | client


def preview_mode_enabled() -> bool:
    return (os.getenv("PREVIEW_MODE_ENABLED") or "").strip() == "1"


def flag_true(raw: str | None) -> bool:
    value = (raw or "").strip().lower()
    return value in {"1", "true", "on", "yes"}


def parse_iso_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).strip().replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone().replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


def _client_apertura(
    ahora: datetime,
    *,
    preview_state: str,
    preview_open_at: str | None,
) -> tuple[datetime, str]:
    estado = (preview_state or "").strip().lower()
    fecha_custom = parse_iso_datetime(preview_open_at)

    if estado in {"open", "abierto"}:
        return ahora - timedelta(seconds=3), "preview-client-open"
    if estado in {"locked", "bloqueado"}:
        return ahora + timedelta(days=7), "preview-client-locked"
    if fecha_custom:
        return fecha_custom, "preview-client-custom"
    return ahora - timedelta(seconds=3), "preview-client-default-open"


def _backend_apertura(
    ahora: datetime,
    *,
    preview_state: str,
    preview_open_at: str | None,
    base: datetime,
) -> tuple[datetime, str] | None:
    estado = (preview_state or "").strip().lower()
    fecha_custom = parse_iso_datetime(preview_open_at)

    if estado in {"open", "abierto"}:
        return ahora - timedelta(seconds=3), "preview-open"
    if estado in {"locked", "bloqueado"}:
        return ahora + timedelta(days=7), "preview-locked"
    if fecha_custom:
        return fecha_custom, "preview-custom"
    return None


def resolve_apertura(
    ahora: datetime | None = None,
    *,
    preview_state: str | None = None,
    preview_open_at: str | None = None,
    preview_client: str | None = None,
    base_apertura: datetime | None = None,
) -> PreviewResolution:
    """
    Resuelve la fecha de apertura efectiva.

    Prioridad (igual que Preview Lab + script.js):
      1. preview_client=1 → capa cliente (sin PREVIEW_MODE_ENABLED)
      2. PREVIEW_MODE_ENABLED + preview_state / preview_open_at → backend
      3. Fecha real configurada en APIModule
    """
    ahora = ahora or datetime.now()
    base = base_apertura or APIModule._fecha_apertura_configurada()
    estado = (preview_state or "").strip().lower()
    open_at = (preview_open_at or "").strip() or None

    if flag_true(preview_client):
        apertura, fuente = _client_apertura(
            ahora, preview_state=estado, preview_open_at=open_at
        )
        capa = "client"
    elif preview_mode_enabled():
        simulated = _backend_apertura(
            ahora, preview_state=estado, preview_open_at=open_at, base=base
        )
        if simulated:
            apertura, fuente = simulated
            capa = "backend"
        else:
            apertura, fuente = base, "real"
            capa = "real"
    else:
        apertura, fuente = base, "real"
        capa = "real"

    bloqueado = ahora < apertura
    segundos = max(int((apertura - ahora).total_seconds()), 0)
    return PreviewResolution(
        apertura=apertura,
        fuente=fuente,
        bloqueado=bloqueado,
        segundos_faltantes=segundos,
        capa=capa,
    )


def resolve_from_request_args(args) -> PreviewResolution:
    """Convenience wrapper for Flask request.args / ImmutableMultiDict."""
    return resolve_apertura(
        preview_state=args.get("preview_state"),
        preview_open_at=args.get("preview_open_at"),
        preview_client=args.get("preview_client"),
    )
