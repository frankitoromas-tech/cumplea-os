"""
models/mensaje.py
BUG FIX: estaba completamente vacío. Ahora define MensajeCapsula
para que services/capsula_service.py pueda importarlo si lo necesita.
"""
from __future__ import annotations
from datetime import datetime


class MensajeCapsula:
    """Modelo de un mensaje de cápsula del tiempo."""

    def __init__(self, contenido: str, fecha_apertura: str):
        self.contenido      = contenido
        self.fecha_apertura = fecha_apertura
        self.creado_en      = datetime.now().isoformat()

    def to_dict(self) -> dict:
        return {
            "contenido":      self.contenido,
            "fecha_apertura": self.fecha_apertura,
            "creado_en":      self.creado_en,
        }