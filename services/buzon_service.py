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
        mensajes = self.leer_datos()
        mensajes.append({
            "fecha":   datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "mensaje": texto,
        })
        return self.guardar_datos(mensajes)

    def total_mensajes(self) -> int:
        return len(self.leer_datos())