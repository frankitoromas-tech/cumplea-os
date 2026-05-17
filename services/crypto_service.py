"""
services/crypto_service.py - Optional encryption helpers for sensitive data.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)


class DataCipher:
    """
    Fernet-backed serializer for encrypting JSON payloads at rest.

    Enable by setting APP_ENCRYPTION_KEY to a valid Fernet key.
    """

    def __init__(self) -> None:
        self.enabled = False
        self._fernet = None
        raw_key = (os.getenv("APP_ENCRYPTION_KEY") or "").strip()
        if not raw_key:
            return

        try:
            from cryptography.fernet import Fernet
        except Exception as exc:
            logger.error("Encryption disabled: cryptography package unavailable (%s).", exc)
            return

        try:
            # Validate key format early.
            base64.urlsafe_b64decode(raw_key.encode("utf-8"))
            self._fernet = Fernet(raw_key.encode("utf-8"))
            self.enabled = True
        except Exception as exc:
            logger.error("Encryption disabled: invalid APP_ENCRYPTION_KEY (%s).", exc)
            self._fernet = None
            self.enabled = False

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

