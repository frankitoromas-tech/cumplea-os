"""
Tests for ServicioVisitas: atomic increment, daily buckets bounded.
"""
from __future__ import annotations

import os
import tempfile
import threading
import unittest

from services import crypto_service
from services.visitas_service import ServicioVisitas


class VisitasServiceTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._saved = os.environ.get("APP_DATA_DIR")
        os.environ["APP_DATA_DIR"] = self._tmp.name
        os.environ.pop("APP_ENCRYPTION_KEY", None)
        crypto_service.reset_data_cipher_cache()

    def tearDown(self):
        if self._saved is None:
            os.environ.pop("APP_DATA_DIR", None)
        else:
            os.environ["APP_DATA_DIR"] = self._saved
        self._tmp.cleanup()

    def test_first_read_returns_empty_skeleton(self):
        service = ServicioVisitas()
        self.assertEqual(service.leer(), {"total": 0, "por_dia": {}})

    def test_registrar_increments_total_and_today(self):
        service = ServicioVisitas()
        service.registrar(hoy="2026-05-17")
        service.registrar(hoy="2026-05-17")
        service.registrar(hoy="2026-05-18")
        data = service.leer()
        self.assertEqual(data["total"], 3)
        self.assertEqual(data["por_dia"]["2026-05-17"], 2)
        self.assertEqual(data["por_dia"]["2026-05-18"], 1)

    def test_concurrent_registrar_no_lost_updates(self):
        service = ServicioVisitas()
        errors: list[str] = []

        def hit(seed: int) -> None:
            try:
                for _ in range(25):
                    service.registrar(hoy=f"2026-05-{(seed % 28) + 1:02d}")
            except Exception as exc:
                errors.append(str(exc))

        threads = [threading.Thread(target=hit, args=(s,)) for s in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [])
        data = service.leer()
        self.assertEqual(data["total"], 4 * 25)

    def test_max_dias_bound(self):
        service = ServicioVisitas()
        service._MAX_DIAS = 5  # type: ignore[misc]
        for d in range(10):
            service.registrar(hoy=f"2026-01-{d + 1:02d}")
        data = service.leer()
        self.assertLessEqual(len(data["por_dia"]), 5)
        # Last days survive the eviction.
        self.assertIn("2026-01-10", data["por_dia"])


if __name__ == "__main__":
    unittest.main()
