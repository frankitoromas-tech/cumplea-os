"""
services/base_service.py — Clase base para servicios de persistencia.
BUG FIX: guardar_datos() no tenía try/except → crash en Vercel (filesystem
read-only). Ahora es Vercel-safe y usa pathlib en lugar de os.path.
"""
from __future__ import annotations
import json
import os
from pathlib import Path


class ServicioBase:
    """
    Clase base para servicios que persisten datos en JSON.
    Subclases solo necesitan pasar la ruta del archivo.
    """

    def __init__(self, ruta_archivo: str):
        ruta = Path(ruta_archivo)
        if ruta.is_absolute():
            self.ruta = ruta
            return

        base_data_dir = Path(os.getenv("APP_DATA_DIR", "."))
        self.ruta = base_data_dir / ruta

    def leer_datos(self) -> list:
        """Lee el JSON; devuelve [] si no existe o está corrupto."""
        try:
            if self.ruta.exists():
                payload = json.loads(self.ruta.read_text(encoding="utf-8"))
                if isinstance(payload, list):
                    return payload
        except Exception:
            pass
        return []

    def guardar_datos(self, datos: list) -> bool:
        """
        Guarda el JSON. Devuelve True si tuvo éxito, False si falló
        (p. ej. en Vercel con filesystem read-only).
        BUG FIX: antes no tenía try/except → crash en producción Vercel.
        """
        if not isinstance(datos, list):
            return False

        try:
            self.ruta.parent.mkdir(parents=True, exist_ok=True)
            payload = json.dumps(datos, ensure_ascii=False, indent=4)
            temporal = self.ruta.with_name(f".{self.ruta.name}.tmp")
            temporal.write_text(payload, encoding="utf-8")
            temporal.replace(self.ruta)  # escritura atómica cuando el FS lo permite
            return True
        except OSError:
            return False
