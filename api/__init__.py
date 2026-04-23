"""
api/__init__.py — Clases base del proyecto. ÚNICA fuente de verdad.
services/__init__.py y models/__init__.py deben importar desde aquí,
no duplicar este contenido.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from datetime import datetime, date
from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)


class BaseModule(ABC):
    nombre: str = "base"

    def __init__(self):
        self.log = logging.getLogger(f"app.{self.nombre}")
        self.bp  = Blueprint(self.nombre, __name__)
        self._registrar_rutas()

    @abstractmethod
    def _registrar_rutas(self) -> None: ...

    def blueprint(self) -> Blueprint:
        return self.bp

    def _ok(self, data: dict, code: int = 200):
        return jsonify(data), code

    def _error(self, msg: str, code: int = 400):
        return jsonify({"status": "error", "mensaje": msg}), code


class APIModule(BaseModule, ABC):
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
        # BUG FIX: devuelve date, no datetime → compatible con date.today()
        hoy = date.today()
        c   = date(hoy.year, self.FECHA_NACIMIENTO.month, self.FECHA_NACIMIENTO.day)
        return c if c > hoy else date(hoy.year + 1, c.month, c.day)