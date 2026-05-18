"""
End-to-end smoke tests for the public surface and the admin gating.
"""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch


_ADMIN_TOKEN = "test-admin-token-please-rotate"


def _import_app():
    # Set admin token before importing the app so create_app() sees it.
    os.environ["ADMIN_TOKEN"] = _ADMIN_TOKEN
    from app import app

    return app


class APISmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = _import_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def _login_admin(self) -> None:
        response = self.client.post(
            "/admin/login",
            data={"token": _ADMIN_TOKEN},
            follow_redirects=False,
        )
        self.assertIn(response.status_code, (302, 303))

    def test_public_pages_render(self):
        for path in ["/", "/carta", "/universo", "/aurora", "/timeline"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)

    def test_admin_requires_login(self):
        response = self.client.get("/admin", follow_redirects=False)
        self.assertIn(response.status_code, (302, 303))
        self.assertIn("/admin/login", response.headers.get("Location", ""))

    def test_admin_login_then_access(self):
        self._login_admin()
        response = self.client.get("/admin")
        self.assertEqual(response.status_code, 200)

    def test_admin_logout_clears_cookie(self):
        self._login_admin()
        response = self.client.post("/admin/logout")
        self.assertEqual(response.status_code, 200)
        follow = self.client.get("/admin", follow_redirects=False)
        self.assertIn(follow.status_code, (302, 303))

    def test_healthcheck_endpoints(self):
        for path in ["/healthz", "/api/healthz"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn("application/json", response.content_type)
                self.assertEqual(response.get_json()["status"], "ok")

    def test_healthz_reports_admin_protected(self):
        response = self.client.get("/healthz")
        self.assertTrue(response.get_json().get("admin_protected"))

    def test_security_headers_exist(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Content-Type-Options", response.headers)
        self.assertIn("X-Frame-Options", response.headers)
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("X-Request-ID", response.headers)

    def test_api_has_no_store_cache_control(self):
        response = self.client.get("/api/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Cache-Control"), "no-store, max-age=0")

    def test_core_api_endpoints_are_available(self):
        for path in [
            "/api/estado",
            "/api/estadisticas_amor",
            "/api/countdown_detallado",
            "/api/visitas",
            "/api/momento_dia",
            "/api/frase_del_dia",
            "/api/poema",
            "/api/frase_aleatoria",
            "/api/poema/0",
            "/api/todas_frases",
            "/api/aurora_data",
            "/api/timeline",
            "/api/juego_corazones_config",
            "/api/capsula",
            "/api/constelaciones",
        ]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn("application/json", response.content_type)

    def test_verificar_nombre_valido(self):
        # AuthModule is side-effect free; no Telegram mock required.
        response = self.client.post("/api/verificar_nombre", json={"nombre": "luna"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["valido"])
        self.assertEqual(data["nombre_canonico"], "luyuromo")

    def test_verificar_nombre_invalido(self):
        response = self.client.post("/api/verificar_nombre", json={"nombre": "x"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["valido"])

    def test_guardar_constelacion_rechaza_payload_invalido(self):
        response = self.client.post(
            "/api/guardar_constelacion",
            json={"nombre": "demo", "puntos": [{"x": "NaN", "y": None}]},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["status"], "error")

    def test_capsula_incluye_fecha_apertura(self):
        response = self.client.get("/api/capsula")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("fecha_apertura", data)
        self.assertIn("estado", data)

    def test_admin_api_requires_token(self):
        response = self.client.post("/api/test_telegram")
        self.assertEqual(response.status_code, 401)

    def test_admin_api_accepts_bearer(self):
        with patch("controllers.api_mensajes.mensajes_module._telegram", return_value={"ok": True}):
            response = self.client.post(
                "/api/test_telegram",
                headers={"Authorization": f"Bearer {_ADMIN_TOKEN}"},
            )
        self.assertEqual(response.status_code, 200)

    def test_rate_limit_blocks_after_threshold(self):
        # The limiter is shared across tests; reset it so this case sees a
        # clean budget for /api/test_telegram (configured at 5 req/min).
        self.app.extensions["rate_limiter"]._events.clear()
        self._login_admin()
        with patch("controllers.api_mensajes.mensajes_module._telegram", return_value={"ok": True}):
            for _ in range(5):
                response = self.client.post("/api/test_telegram")
                self.assertEqual(response.status_code, 200)
            blocked = self.client.post("/api/test_telegram")
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.get_json()["status"], "error")


if __name__ == "__main__":
    unittest.main()
