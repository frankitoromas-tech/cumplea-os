"""Gunicorn worker defaults for Railway / small containers."""
from __future__ import annotations

import importlib.util
import os
import sys
import unittest
from pathlib import Path

_CONF_PATH = Path(__file__).resolve().parents[1] / "gunicorn.conf.py"


class GunicornConfigTests(unittest.TestCase):
    def _reload(self, **env: str) -> object:
        for key in (
            "GUNICORN_WORKERS",
            "WEB_CONCURRENCY",
            "GUNICORN_WORKERS_MAX",
            "RAILWAY_GUNICORN_WORKERS_MAX",
            "RAILWAY_ENVIRONMENT",
            "RAILWAY_SERVICE_NAME",
            "RAILWAY_PROJECT_NAME",
        ):
            os.environ.pop(key, None)
        os.environ.update(env)
        name = "gunicorn_conf_under_test"
        spec = importlib.util.spec_from_file_location(name, _CONF_PATH)
        if spec is None or spec.loader is None:
            raise RuntimeError("cannot load gunicorn.conf.py")
        mod = importlib.util.module_from_spec(spec)
        sys.modules[name] = mod
        spec.loader.exec_module(mod)
        return mod

    def test_explicit_workers_override(self):
        conf = self._reload(GUNICORN_WORKERS="3")
        self.assertEqual(conf.workers, 3)

    def test_railway_caps_workers(self):
        conf = self._reload(RAILWAY_ENVIRONMENT="production")
        self.assertLessEqual(conf.workers, 1)

    def test_web_concurrency_capped_on_railway(self):
        conf = self._reload(RAILWAY_ENVIRONMENT="production", WEB_CONCURRENCY="32")
        self.assertEqual(conf.workers, 1)

    def test_default_worker_count_function(self):
        conf = self._reload()
        self.assertGreaterEqual(conf.default_worker_count(), 1)


if __name__ == "__main__":
    unittest.main()
