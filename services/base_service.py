import json
import os

class ServicioBase:
    def __init__(self, ruta_archivo):
        self.ruta_archivo = ruta_archivo

    def leer_datos(self):
        if not os.path.exists(self.ruta_archivo):
            return []
        with open(self.ruta_archivo, 'r') as f:
            return json.load(f)

    def guardar_datos(self, datos):
        with open(self.ruta_archivo, 'w') as f:
            json.dump(datos, f, indent=4)