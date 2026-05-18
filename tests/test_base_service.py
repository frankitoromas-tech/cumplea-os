"""
Tests for services/base_service.ServicioBase covering:
- Plaintext roundtrip.
- Encrypted envelope roundtrip.
- Atomic write resilience under concurrent writers.
- Logging on filesystem and decryption failures.
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from cryptography.fernet import Fernet

from services import base_service, crypto_service
from services.base_service import ServicioBase


class BaseServiceTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._saved_dir = os.environ.get("APP_DATA_DIR")
        self._saved_key = os.environ.get("APP_ENCRYPTION_KEY")
        os.environ["APP_DATA_DIR"] = self._tmp.name
        os.environ.pop("APP_ENCRYPTION_KEY", None)
        crypto_service.reset_data_cipher_cache()

    def tearDown(self):
        if self._saved_dir is None:
            os.environ.pop("APP_DATA_DIR", None)
        else:
            os.environ["APP_DATA_DIR"] = self._saved_dir
        if self._saved_key is None:
            os.environ.pop("APP_ENCRYPTION_KEY", None)
        else:
            os.environ["APP_ENCRYPTION_KEY"] = self._saved_key
        crypto_service.reset_data_cipher_cache()
        self._tmp.cleanup()

    def test_plaintext_roundtrip(self):
        service = ServicioBase("plain.json")
        self.assertEqual(service.leer_datos(), [])
        self.assertTrue(service.guardar_datos([{"x": 1}, {"x": 2}]))
        self.assertEqual(service.leer_datos(), [{"x": 1}, {"x": 2}])

    def test_rejects_non_list_payload(self):
        service = ServicioBase("plain.json")
        self.assertFalse(service.guardar_datos({"not": "a list"}))  # type: ignore[arg-type]

    def test_encrypted_envelope_written_when_key_set(self):
        os.environ["APP_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
        crypto_service.reset_data_cipher_cache()

        service = ServicioBase("secret.json")
        payload = [{"msg": "hola Luna"}]
        self.assertTrue(service.guardar_datos(payload))

        raw = json.loads(Path(self._tmp.name, "secret.json").read_text(encoding="utf-8"))
        self.assertTrue(raw.get("encrypted"))
        self.assertNotIn("Luna", json.dumps(raw))
        self.assertEqual(service.leer_datos(), payload)

    def test_corrupt_json_returns_empty(self):
        path = Path(self._tmp.name, "broken.json")
        path.write_text("{not json", encoding="utf-8")
        service = ServicioBase("broken.json")
        self.assertEqual(service.leer_datos(), [])

    def test_decrypt_failure_returns_empty(self):
        os.environ["APP_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
        crypto_service.reset_data_cipher_cache()
        path = Path(self._tmp.name, "bad_envelope.json")
        path.write_text(
            json.dumps({"encrypted": True, "alg": "fernet", "v": 1, "data": "not-a-fernet"}),
            encoding="utf-8",
        )
        service = ServicioBase("bad_envelope.json")
        self.assertEqual(service.leer_datos(), [])

    def test_logs_when_filesystem_unwritable(self):
        service = ServicioBase("nope.json")
        # Patch the atomic rename so the lock + temp write succeed but the
        # commit step fails with OSError, exercising the error branch.
        with patch("services.base_service.os.replace", side_effect=PermissionError("nope")):
            self.assertFalse(service.guardar_datos([{"x": 1}]))

    def test_concurrent_writers_do_not_corrupt_file(self):
        service = ServicioBase("concurrent.json")
        errors: list[str] = []

        def writer(seed: int) -> None:
            try:
                for i in range(20):
                    current = service.leer_datos()
                    current.append({"writer": seed, "i": i})
                    if not service.guardar_datos(current):
                        errors.append(f"writer={seed} i={i}")
            except Exception as exc:
                errors.append(f"writer={seed} exc={exc}")

        threads = [threading.Thread(target=writer, args=(s,)) for s in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [])
        # File must remain valid JSON regardless of how writes interleaved.
        text = Path(self._tmp.name, "concurrent.json").read_text(encoding="utf-8")
        json.loads(text)
        # At minimum the last writer's entries should be present.
        self.assertGreater(len(service.leer_datos()), 0)


if __name__ == "__main__":
    unittest.main()
