from flask import Blueprint, jsonify
from datetime import datetime

class BaseModule:
    FECHA_NACIMIENTO = datetime(2003, 8, 30) 
    FECHA_APERTURA = datetime(2025, 8, 30, 0, 0)

    def _ok(self, datos):
        return jsonify(datos), 200

    def _error(self, mensaje, code=400):
        return jsonify({"error": mensaje}), code

class APIModule(BaseModule):
    nombre = "base"
    def __init__(self):
        self.bp = Blueprint(self.nombre, __name__)
        self._registrar_rutas()

    def _registrar_rutas(self):
        pass