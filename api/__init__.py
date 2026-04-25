"""
api/__init__.py — ÚNICA fuente de verdad para las clases base.
Arquitectura: BaseModule (ABC) → APIModule (ABC) → subclases concretas.

BUG FIX: Este archivo tenía una versión vieja sin ABC, sin date, y con
FECHA_INICIO_REL en vez de FECHA_INICIO_AMOR. services/__init__.py y
models/__init__.py apuntan a este archivo y NO deben duplicarlo.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime, date
from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)


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
        """Cada subclase concreta declara sus rutas aquí."""

    def blueprint(self) -> Blueprint:
        return self.bp

    def _ok(self, data: dict, code: int = 200):
        return jsonify(data), code

    def _error(self, msg: str, code: int = 400):
        return jsonify({"status": "error", "mensaje": msg}), code


class APIModule(BaseModule, ABC):
    """
    Extiende BaseModule con utilidades de fecha/hora
    que comparten todos los módulos de la API.
    """
    FECHA_NACIMIENTO  = datetime(2003, 8, 30)
    FECHA_INICIO_AMOR = date(2025, 10, 1)
    FECHA_APERTURA    = datetime(2025, 8, 30, 0, 0, 0)

    def _edad(self) -> int:
        return (datetime.now() - self.FECHA_NACIMIENTO).days // 365

    def _dias_vividos(self) -> int:
        return (datetime.now() - self.FECHA_NACIMIENTO).days

    def _dias_juntos(self) -> int:
        return (date.today() - self.FECHA_INICIO_AMOR).days

    def _proximo_cumple(self) -> date:
        """
        BUG FIX: devuelve `date` (no `datetime`) para que sea compatible
        con date.today() en la resta (proximo - hoy).days.
        """
        hoy = date.today()
        c   = date(hoy.year, self.FECHA_NACIMIENTO.month, self.FECHA_NACIMIENTO.day)
        return c if c > hoy else date(hoy.year + 1, c.month, c.day)