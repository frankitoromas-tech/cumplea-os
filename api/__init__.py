from flask import Blueprint, jsonify
from datetime import datetime

class BaseModule:
    # --- AJUSTA ESTAS FECHAS ---
    FECHA_NACIMIENTO = datetime(2003, 8, 30)  # Fecha de Luna
    FECHA_APERTURA   = datetime(2025, 8, 30, 0, 0)
    FECHA_INICIO_REL = datetime(2025, 10, 15) # Cuando empezaron

    def _ok(self, datos):
        return jsonify(datos), 200

    def _error(self, mensaje, code=400):
        return jsonify({"error": mensaje}), code

    def _dias_vividos(self):
        return (datetime.now() - self.FECHA_NACIMIENTO).days

    def _edad(self):
        return self._dias_vividos() // 365

    def _dias_juntos(self):
        return (datetime.now() - self.FECHA_INICIO_REL).days

    def _proximo_cumple(self):
        hoy = datetime.now()
        proximo = datetime(hoy.year, self.FECHA_NACIMIENTO.month, self.FECHA_NACIMIENTO.day)
        if proximo < hoy:
            proximo = datetime(hoy.year + 1, self.FECHA_NACIMIENTO.month, self.FECHA_NACIMIENTO.day)
        return proximo

class APIModule(BaseModule):
    nombre = "base"
    def __init__(self):
        self.bp = Blueprint(self.nombre, __name__)
        self._registrar_rutas()

    def _registrar_rutas(self):
        pass