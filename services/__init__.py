"""
api/__init__.py
Clases base para todos los módulos del backend.
Arquitectura: BaseModule → APIModule → (subclases especializadas)
"""
from __future__ import annotations
import logging
import random
from abc import ABC, abstractmethod
from datetime import datetime, date
from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
#  CLASE BASE: BaseModule
#  Toda funcionalidad del proyecto hereda de aquí
# ─────────────────────────────────────────────────────────────
class BaseModule(ABC):
    """
    Clase base abstracta para todos los módulos de la app.
    Provee: nombre, logger, blueprint Flask y hook de registro.
    """
    nombre: str = "base"

    def __init__(self):
        self.log = logging.getLogger(f"app.{self.nombre}")
        self.bp  = Blueprint(self.nombre, __name__)
        self._registrar_rutas()

    @abstractmethod
    def _registrar_rutas(self) -> None:
        """Cada subclase declara sus rutas aquí."""

    def blueprint(self) -> Blueprint:
        return self.bp

    def _ok(self, data: dict, code: int = 200):
        return jsonify(data), code

    def _error(self, msg: str, code: int = 400):
        return jsonify({"status": "error", "mensaje": msg}), code


# ─────────────────────────────────────────────────────────────
#  CLASE INTERMEDIA: APIModule
#  Agrega utilidades de fecha y configuración compartida
# ─────────────────────────────────────────────────────────────
class APIModule(BaseModule, ABC):
    """
    Extiende BaseModule con utilidades de fecha/hora
    que comparten todos los módulos de la API.
    """
    FECHA_NACIMIENTO  = datetime(2003, 8, 30)
    FECHA_INICIO_AMOR = date(2025, 10, 1)
    FECHA_APERTURA    = datetime(2026, 8, 30, 0, 0, 0)

    def _edad(self) -> int:
        return (datetime.now() - self.FECHA_NACIMIENTO).days // 365

    def _dias_vividos(self) -> int:
        return (datetime.now() - self.FECHA_NACIMIENTO).days

    def _dias_juntos(self) -> int:
        return (date.today() - self.FECHA_INICIO_AMOR).days

    def _proximo_cumple(self) -> date:
        hoy = date.today()
        c   = date(hoy.year, 8, 30)
        return c if c > hoy else date(hoy.year + 1, 8, 30)