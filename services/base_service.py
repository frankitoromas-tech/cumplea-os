"""
services/base_service.py — Clase base para servicios de persistencia.
BUG FIX: guardar_datos() no tenía try/except → crash en Vercel (filesystem
read-only). Ahora es Vercel-safe y usa pathlib en lugar de os.path.
"""
from __future__ import annotations
import json
from pathlib import Path


class ServicioBase:
    """
    Clase base para servicios que persisten datos en JSON.
    Subclases solo necesitan pasar la ruta del archivo.
    """

    def __init__(self, ruta_archivo: str):
        self.ruta = Path(ruta_archivo)

    def leer_datos(self) -> list:
        """Lee el JSON; devuelve [] si no existe o está corrupto."""
        try:
            if self.ruta.exists():
                return json.loads(self.ruta.read_text(encoding="utf-8"))
        except Exception:
            pass
        return []

    def guardar_datos(self, datos: list) -> bool:
        """
        Guarda el JSON. Devuelve True si tuvo éxito, False si falló
        (p. ej. en Vercel con filesystem read-only).
        BUG FIX: antes no tenía try/except → crash en producción Vercel.
        """
        try:
            self.ruta.parent.mkdir(parents=True, exist_ok=True)
            self.ruta.write_text(
                json.dumps(datos, ensure_ascii=False, indent=4),
                encoding="utf-8",
            )
            return True
        except OSError:
            return False