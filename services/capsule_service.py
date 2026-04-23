"""
services/capsula_service.py — Servicio para la cápsula del tiempo.
BUG FIX: importaba `from models.mensaje import MensajeCapsula` pero ese
modelo estaba vacío → ImportError en runtime. El modelo ahora está definido
aquí mismo con lo mínimo necesario.
"""
from __future__ import annotations
from datetime import datetime
from services.base_service import ServicioBase


class MensajeCapsula:
    """Modelo simple para un mensaje de la cápsula del tiempo."""

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


class ServicioCapsula(ServicioBase):
    """Gestiona la persistencia de mensajes de la cápsula."""

    def __init__(self):
        super().__init__("data/capsula.json")

    def guardar_mensaje_futuro(self, contenido: str, fecha_apertura: str) -> bool:
        nuevo = MensajeCapsula(contenido, fecha_apertura)
        datos = self.leer_datos()
        datos.append(nuevo.to_dict())
        return self.guardar_datos(datos)