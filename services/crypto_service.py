"""
services/crypto_service.py - Optional encryption helpers for sensitive data.

Enable by setting APP_ENCRYPTION_KEY to one or more Fernet keys separated
by commas. When multiple keys are provided the first is used for encryption
and any of them can decrypt — enabling key rotation without downtime.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)


def _parse_keys(raw: str) -> list[str]:
    parts = [chunk.strip() for chunk in raw.split(",")]
    return [chunk for chunk in parts if chunk]


class DataCipher:
    """
    Fernet/MultiFernet-backed serializer for encrypting JSON payloads at rest.
    """

    def __init__(self) -> None:
        self.enabled = False
        self._fernet: Any = None
        raw = (os.getenv("APP_ENCRYPTION_KEY") or "").strip()
        if not raw:
            return

        try:
            from cryptography.fernet import Fernet, MultiFernet
        except Exception as exc:
            logger.error("Encryption disabled: cryptography package unavailable (%s).", exc)
            return

        keys = _parse_keys(raw)
        valid_fernets: list[Any] = []
        for key in keys:
            try:
                base64.urlsafe_b64decode(key.encode("utf-8"))
                valid_fernets.append(Fernet(key.encode("utf-8")))
            except Exception as exc:
                logger.error("Encryption: skipping invalid APP_ENCRYPTION_KEY entry (%s).", exc)

        if not valid_fernets:
            logger.error("Encryption disabled: no usable APP_ENCRYPTION_KEY entries.")
            return

        self._fernet = valid_fernets[0] if len(valid_fernets) == 1 else MultiFernet(valid_fernets)
        self.enabled = True

    def encrypt_json(self, value: Any) -> str:
        if not self.enabled or self._fernet is None:
            raise RuntimeError("DataCipher is not enabled.")
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return self._fernet.encrypt(raw).decode("utf-8")

    def decrypt_json(self, token: str) -> Any:
        if not self.enabled or self._fernet is None:
            raise RuntimeError("DataCipher is not enabled.")
        plain = self._fernet.decrypt(token.encode("utf-8")).decode("utf-8")
        return json.loads(plain)


@lru_cache(maxsize=1)
def get_data_cipher() -> DataCipher:
    return DataCipher()


def reset_data_cipher_cache() -> None:
    """Test helper: drop the memoized cipher so a new env can take effect."""
    get_data_cipher.cache_clear()
