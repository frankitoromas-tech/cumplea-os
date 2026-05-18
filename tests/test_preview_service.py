"""
Tests for unified preview date resolution (Preview Lab ↔ APIs).
"""
from __future__ import annotations

import os
import unittest
from datetime import datetime, timedelta

from services.preview_service import preview_mode_enabled, resolve_apertura


class PreviewServiceTests(unittest.TestCase):
    def test_real_when_no_flags(self):
        base = datetime(2026, 8, 30)
        resolved = resolve_apertura(
            datetime(2026, 5, 1),
            base_apertura=base,
        )
        self.assertEqual(resolved.capa, "real")
        self.assertTrue(resolved.bloqueado)

    def test_backend_open_when_preview_enabled(self):
        old = os.environ.get("PREVIEW_MODE_ENABLED")
        os.environ["PREVIEW_MODE_ENABLED"] = "1"
        try:
            resolved = resolve_apertura(
                datetime(2026, 5, 1),
                preview_state="open",
            )
            self.assertEqual(resolved.capa, "backend")
            self.assertFalse(resolved.bloqueado)
            self.assertEqual(resolved.fuente, "preview-open")
        finally:
            if old is None:
                os.environ.pop("PREVIEW_MODE_ENABLED", None)
            else:
                os.environ["PREVIEW_MODE_ENABLED"] = old

    def test_client_locked_without_backend_flag(self):
        old = os.environ.get("PREVIEW_MODE_ENABLED")
        os.environ["PREVIEW_MODE_ENABLED"] = "0"
        try:
            resolved = resolve_apertura(
                datetime(2026, 5, 1),
                preview_state="locked",
                preview_client="1",
            )
            self.assertEqual(resolved.capa, "client")
            self.assertTrue(resolved.bloqueado)
            self.assertGreater(resolved.segundos_faltantes, 0)
        finally:
            if old is None:
                os.environ.pop("PREVIEW_MODE_ENABLED", None)
            else:
                os.environ["PREVIEW_MODE_ENABLED"] = old

    def test_client_takes_priority_over_backend(self):
        old = os.environ.get("PREVIEW_MODE_ENABLED")
        os.environ["PREVIEW_MODE_ENABLED"] = "1"
        try:
            resolved = resolve_apertura(
                datetime(2026, 5, 1),
                preview_state="open",
                preview_client="1",
            )
            self.assertEqual(resolved.capa, "client")
            self.assertFalse(resolved.bloqueado)
        finally:
            if old is None:
                os.environ.pop("PREVIEW_MODE_ENABLED", None)
            else:
                os.environ["PREVIEW_MODE_ENABLED"] = old

    def test_custom_open_at_past(self):
        old = os.environ.get("PREVIEW_MODE_ENABLED")
        os.environ["PREVIEW_MODE_ENABLED"] = "1"
        try:
            past = (datetime.now() - timedelta(days=1)).isoformat(timespec="seconds")
            resolved = resolve_apertura(preview_open_at=past)
            self.assertFalse(resolved.bloqueado)
        finally:
            if old is None:
                os.environ.pop("PREVIEW_MODE_ENABLED", None)
            else:
                os.environ["PREVIEW_MODE_ENABLED"] = old


if __name__ == "__main__":
    unittest.main()
