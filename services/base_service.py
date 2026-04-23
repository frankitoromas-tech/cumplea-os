import json
import os

import json
from pathlib import Path

class ServicioBase:
    def __init__(self, ruta_archivo: str):
        self.ruta = Path(ruta_archivo)

    def leer_datos(self) -> list:
        try:
            if self.ruta.exists():
                return json.loads(self.ruta.read_text(encoding="utf-8"))
        except Exception:
            pass
        return []

    def guardar_datos(self, datos: list) -> bool:
        # BUG FIX: try/except para Vercel (filesystem read-only)
        try:
            self.ruta.parent.mkdir(parents=True, exist_ok=True)
            self.ruta.write_text(
                json.dumps(datos, ensure_ascii=False, indent=4), encoding="utf-8"
            )
            return True
        except OSError:
            return False