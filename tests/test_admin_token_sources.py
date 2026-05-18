"""
Admin token resolution: env, file, and test mode.
"""
from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from services.security_service import _expected_admin_token, admin_panel_enabled


class AdminTokenSourcesTests(unittest.TestCase):
    def test_env_token(self):
        old = os.environ.get("ADMIN_TOKEN")
        os.environ["ADMIN_TOKEN"] = "from-env"
        try:
            self.assertEqual(_expected_admin_token(), "from-env")
            self.assertTrue(admin_panel_enabled())
        finally:
            if old is None:
                os.environ.pop("ADMIN_TOKEN", None)
            else:
                os.environ["ADMIN_TOKEN"] = old

    def test_file_token(self):
        with tempfile.TemporaryDirectory() as tmp:
            token_path = Path(tmp) / "admin_token"
            token_path.write_text("from-file\n", encoding="utf-8")
            old_env = {
                k: os.environ.pop(k, None)
                for k in ("ADMIN_TOKEN", "APP_DATA_DIR", "ENABLE_TEST_ADMIN", "TEST_ADMIN_TOKEN")
            }
            try:
                os.environ["APP_DATA_DIR"] = tmp
                self.assertEqual(_expected_admin_token(), "from-file")
            finally:
                for k, v in old_env.items():
                    if v is None:
                        os.environ.pop(k, None)
                    else:
                        os.environ[k] = v

    def test_enable_test_admin(self):
        old = {
            k: os.environ.pop(k, None)
            for k in ("ADMIN_TOKEN", "ENABLE_TEST_ADMIN", "TEST_ADMIN_TOKEN", "APP_DATA_DIR")
        }
        try:
            os.environ["ENABLE_TEST_ADMIN"] = "1"
            os.environ["TEST_ADMIN_TOKEN"] = "test-only"
            self.assertEqual(_expected_admin_token(), "test-only")
        finally:
            for k, v in old.items():
                if v is None:
                    os.environ.pop(k, None)
                else:
                    os.environ[k] = v


if __name__ == "__main__":
    unittest.main()
