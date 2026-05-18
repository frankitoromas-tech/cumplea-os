"""
services/constelacion_service.py
BUG FIX: estaba completamente vacío. Implementa la persistencia
de constelaciones usando ServicioBase.
"""
from __future__ import annotations
from services.base_service import ServicioBase


class ServicioConstelacion(ServicioBase):
    """Gestiona la persistencia de constelaciones creadas."""

    def __init__(self):
        super().__init__("data/constelaciones_creadas.json")

    def guardar_constelacion(self, nombre: str, estrellas: list) -> bool:
        registro = {"nombre": nombre, "estrellas": estrellas}

        def append(current):
            datos = list(current) if isinstance(current, list) else []
            datos.append(registro)
            return datos

        return self.actualizar(append, default=[]) is not None

    def listar(self) -> list:
        return self.leer_datos()