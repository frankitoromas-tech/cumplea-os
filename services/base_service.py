"""
services/base_service.py - Base class for JSON persistence services.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from services.crypto_service import get_data_cipher


class ServicioBase:
    """
    Base class for services that persist data in JSON files.
    """

    def __init__(self, ruta_archivo: str):
        ruta = Path(ruta_archivo)
        if ruta.is_absolute():
            self.ruta = ruta
        else:
            base_data_dir = Path(os.getenv("APP_DATA_DIR", "."))
            self.ruta = base_data_dir / ruta
        self._cipher = get_data_cipher()

    def leer_datos(self) -> list:
        """
        Read data and return a list.
        Supports:
        - plaintext list format (legacy/current)
        - encrypted envelope format
        """
        try:
            if not self.ruta.exists():
                return []

            payload = json.loads(self.ruta.read_text(encoding="utf-8"))
            if isinstance(payload, list):
                return payload

            if isinstance(payload, dict) and payload.get("encrypted") is True:
                if not self._cipher.enabled:
                    return []
                token = payload.get("data")
                if not isinstance(token, str):
                    return []
                clear = self._cipher.decrypt_json(token)
                if isinstance(clear, list):
                    return clear
        except Exception:
            pass
        return []

    def guardar_datos(self, datos: list) -> bool:
        """
        Persist list data.
        - Returns True on success.
        - Returns False on filesystem or encryption errors.
        """
        if not isinstance(datos, list):
            return False

        try:
            self.ruta.parent.mkdir(parents=True, exist_ok=True)

            if self._cipher.enabled:
                payload_data: object = {
                    "encrypted": True,
                    "alg": "fernet",
                    "v": 1,
                    "data": self._cipher.encrypt_json(datos),
                }
            else:
                payload_data = datos

            payload = json.dumps(payload_data, ensure_ascii=False, indent=4)
            temporal = self.ruta.with_name(f".{self.ruta.name}.tmp")
            temporal.write_text(payload, encoding="utf-8")
            temporal.replace(self.ruta)
            return True
        except (OSError, RuntimeError):
            return False
