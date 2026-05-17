import unittest
from unittest.mock import patch

from app import app


class APISmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        cls.client = app.test_client()

    def test_public_pages_render(self):
        for path in ["/", "/admin", "/carta", "/universo", "/aurora", "/timeline"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)

    def test_healthcheck_endpoints(self):
        for path in ["/healthz", "/api/healthz"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn("application/json", response.content_type)
                self.assertEqual(response.get_json()["status"], "ok")

    def test_security_headers_exist(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Content-Type-Options", response.headers)
        self.assertIn("X-Frame-Options", response.headers)
        self.assertIn("Content-Security-Policy", response.headers)

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
        with patch("controllers.api_mensajes.mensajes_module._telegram", return_value={"ok": True}):
            response = self.client.post("/api/verificar_nombre", json={"nombre": "luna"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data["valido"])
        self.assertEqual(data["nombre_canonico"], "luyuromo")

    def test_verificar_nombre_invalido(self):
        response = self.client.post("/api/verificar_nombre", json={"nombre": "x"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertFalse(data["valido"])

    def test_guardar_constelacion_rechaza_payload_invalido(self):
        response = self.client.post(
            "/api/guardar_constelacion",
            json={"nombre": "demo", "puntos": [{"x": "NaN", "y": None}]},
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data["status"], "error")

    def test_capsula_incluye_fecha_apertura(self):
        response = self.client.get("/api/capsula")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("fecha_apertura", data)
        self.assertIn("estado", data)

    def test_rate_limit_blocks_after_threshold(self):
        with patch("controllers.api_mensajes.mensajes_module._telegram", return_value={"ok": True}):
            for _ in range(5):
                response = self.client.post("/api/test_telegram")
                self.assertEqual(response.status_code, 200)
            blocked = self.client.post("/api/test_telegram")
        self.assertEqual(blocked.status_code, 429)
        data = blocked.get_json()
        self.assertEqual(data["status"], "error")


if __name__ == "__main__":
    unittest.main()
