"""
services/cartas_service.py - Sealed letters with timed unlock.

Frank creates letters from /admin with a (titulo, contenido, fecha_apertura).
Luna can only see a letter once `fecha_apertura <= now`. Until then she only
gets a teaser (titulo + cuenta regresiva).

Atomic writes inherit from ServicioBase; the file is encrypted at rest when
APP_ENCRYPTION_KEY is set (Fernet envelope).
"""
from __future__ import annotations

import logging
import secrets
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from services.base_service import ServicioBase

logger = logging.getLogger(__name__)

_MAX_TITULO = 120
_MAX_CONTENIDO = 4000
_MAX_AUTOR = 60
_MAX_CARTAS = 200  # belt-and-suspenders so a runaway form can't fill disk


@dataclass
class Carta:
    id: str
    titulo: str
    contenido: str
    fecha_apertura: str  # ISO 8601
    autor: str
    creado_en: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "titulo": self.titulo,
            "contenido": self.contenido,
            "fecha_apertura": self.fecha_apertura,
            "autor": self.autor,
            "creado_en": self.creado_en,
        }


def _strip_control(text: str, limit: int) -> str:
    cleaned = "".join(
        ch for ch in text if ch == "\n" or unicodedata.category(ch)[0] != "C"
    )
    return cleaned.strip()[:limit]


def _parse_iso(value: str) -> datetime:
    """
    Permissive ISO-8601 parser: accepts trailing Z (UTC) and naive strings.
    Raises ValueError on anything we cannot parse so the caller can 400.
    """
    raw = (value or "").strip()
    if not raw:
        raise ValueError("fecha_apertura requerida (ISO-8601).")
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    return datetime.fromisoformat(raw)


def _to_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone().replace(tzinfo=None)
    return dt


class ServicioCartas(ServicioBase):
    _MAX_CARTAS = _MAX_CARTAS

    def __init__(self):
        super().__init__("data/cartas.json")

    def crear(
        self,
        *,
        titulo: str,
        contenido: str,
        fecha_apertura: str,
        autor: str = "Frank",
    ) -> Carta:
        titulo_n = _strip_control(str(titulo or ""), _MAX_TITULO)
        contenido_n = _strip_control(str(contenido or ""), _MAX_CONTENIDO)
        autor_n = _strip_control(str(autor or "Frank"), _MAX_AUTOR) or "Frank"
        if not titulo_n:
            raise ValueError("titulo requerido")
        if not contenido_n:
            raise ValueError("contenido requerido")

        fecha_dt = _parse_iso(fecha_apertura)
        fecha_iso = _to_naive(fecha_dt).isoformat(timespec="seconds")

        nueva = Carta(
            id=secrets.token_urlsafe(8),
            titulo=titulo_n,
            contenido=contenido_n,
            fecha_apertura=fecha_iso,
            autor=autor_n,
            creado_en=datetime.now().isoformat(timespec="seconds"),
        )

        def add(current: Any) -> list:
            base = list(current) if isinstance(current, list) else []
            base.append(nueva.to_dict())
            return base[-self._MAX_CARTAS:]

        result = self.actualizar(add, default=[])
        if result is None:
            raise RuntimeError("No se pudo persistir la carta.")
        return nueva

    def borrar(self, carta_id: str) -> bool:
        carta_id = (carta_id or "").strip()
        if not carta_id:
            return False

        deleted = {"flag": False}

        def remove(current: Any) -> list:
            base = list(current) if isinstance(current, list) else []
            new = [c for c in base if c.get("id") != carta_id]
            deleted["flag"] = len(new) < len(base)
            return new

        result = self.actualizar(remove, default=[])
        return bool(result is not None and deleted["flag"])

    def listar_todas(self) -> list[dict]:
        datos = self.leer_datos()
        return [c for c in datos if isinstance(c, dict)]

    def listar_disponibles(self, *, ahora: datetime | None = None) -> list[dict]:
        ahora = ahora or datetime.now()
        disponibles = []
        for carta in self.listar_todas():
            try:
                fecha = _parse_iso(str(carta.get("fecha_apertura", "")))
            except ValueError:
                logger.warning("Carta %s con fecha invalida.", carta.get("id"))
                continue
            if _to_naive(fecha) <= ahora:
                disponibles.append(carta)
        return disponibles

    def proxima(self, *, ahora: datetime | None = None) -> dict | None:
        ahora = ahora or datetime.now()
        futuras = []
        for carta in self.listar_todas():
            try:
                fecha = _parse_iso(str(carta.get("fecha_apertura", "")))
            except ValueError:
                continue
            if _to_naive(fecha) > ahora:
                futuras.append((fecha, carta))
        if not futuras:
            return None
        futuras.sort(key=lambda pair: pair[0])
        return futuras[0][1]
