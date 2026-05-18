"""
services/buzon_service.py
BUG FIX: estaba completamente vacío. Implementa la persistencia
del buzón secreto usando ServicioBase.
"""
from __future__ import annotations
from datetime import datetime
from services.base_service import ServicioBase


class ServicioBuzon(ServicioBase):
    """Gestiona la persistencia de mensajes del buzón secreto."""

    def __init__(self):
        super().__init__("data/mensajes.json")

    def guardar_mensaje(self, texto: str) -> bool:
        entrada = {
            "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mensaje": texto,
        }

        def append(current):
            mensajes = list(current) if isinstance(current, list) else []
            mensajes.append(entrada)
            return mensajes

        return self.actualizar(append, default=[]) is not None

    def total_mensajes(self) -> int:
        return len(self.leer_datos())