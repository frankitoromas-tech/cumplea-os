"""
End-to-end smoke tests for the public surface and the admin gating.
"""
from __future__ import annotations

import os
import tempfile
import unittest
from unittest.mock import patch


_ADMIN_TOKEN = "test-admin-token-please-rotate"
_DATA_DIR: tempfile.TemporaryDirectory | None = None


def _import_app():
    # Set admin token + isolated data dir before importing the app so
    # create_app() sees them. Visits write to disk, hence the temp dir.
    global _DATA_DIR
    _DATA_DIR = tempfile.TemporaryDirectory()
    os.environ["ADMIN_TOKEN"] = _ADMIN_TOKEN
    os.environ["APP_DATA_DIR"] = _DATA_DIR.name
    from app import app

    return app


class APISmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = _import_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def _login_admin(self) -> None:
        import re

        form = self.client.get("/admin/login")
        body = form.get_data(as_text=True)
        match = re.search(r'name="csrf" value="([^"]+)"', body)
        self.assertIsNotNone(match, "CSRF token missing from login form")
        response = self.client.post(
            "/admin/login",
            data={"token": _ADMIN_TOKEN, "csrf": match.group(1)},
            follow_redirects=False,
        )
        self.assertIn(response.status_code, (302, 303))

    def test_public_pages_render(self):
        # /admin redirects to /admin/login (covered by test_admin_requires_login)
        # so it's not part of the public-render list.
        for path in ["/", "/preview", "/preview-lab", "/preview-lab/", "/carta", "/series", "/universo", "/camino", "/aurora", "/timeline"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)

    def test_favicon_not_404(self):
        response = self.client.get("/favicon.ico")
        self.assertEqual(response.status_code, 200)
        self.assertIn("svg", response.mimetype)

    def test_preview_family_pages_no_store(self):
        for path in ["/preview", "/preview-lab", "/series", "/universo"]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers.get("Cache-Control"), "no-store, max-age=0")

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

    def test_admin_csp_is_stricter(self):
        self._login_admin()
        response = self.client.get("/admin")
        self.assertEqual(response.status_code, 200)
        csp = response.headers.get("Content-Security-Policy", "")
        self.assertIn("script-src 'self'", csp)
        self.assertNotIn("'unsafe-inline' https://cdnjs", csp)

    def test_healthz_details_requires_admin(self):
        response = self.client.get("/api/healthz/details")
        self.assertEqual(response.status_code, 401)

    def test_healthz_details_with_admin_returns_counters(self):
        response = self.client.get(
            "/api/healthz/details",
            headers={"X-Admin-Token": _ADMIN_TOKEN},
        )
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertIn("uptime_seconds", body)
        self.assertIn("counters", body)
        self.assertIn("visitas", body)

    def test_home_visit_is_counted(self):
        before = self.app.extensions["visitas_service"].leer().get("total", 0)
        self.client.get("/")
        after = self.app.extensions["visitas_service"].leer().get("total", 0)
        self.assertEqual(after, before + 1)

    def test_regalo_diario_is_deterministic_per_day(self):
        first = self.client.get("/api/regalo_diario").get_json()
        second = self.client.get("/api/regalo_diario").get_json()
        self.assertEqual(first, second)
        for key in ("fecha", "frase", "verso", "poema_titulo", "dato_del_dia", "emoji", "paleta"):
            self.assertIn(key, first)

    def test_pwa_manifest_served(self):
        response = self.client.get("/manifest.webmanifest")
        self.assertEqual(response.status_code, 200)
        self.assertIn("manifest", response.headers.get("Content-Type", ""))
        body = response.get_json()
        self.assertEqual(body["name"], "Para mi Luna")
        self.assertEqual(body["start_url"], "/")

    def test_service_worker_served_with_root_scope(self):
        response = self.client.get("/sw.js")
        self.assertEqual(response.status_code, 200)
        self.assertIn("javascript", response.headers.get("Content-Type", ""))
        self.assertEqual(response.headers.get("Service-Worker-Allowed"), "/")
        self.assertIn("self.skipWaiting", response.get_data(as_text=True))

    def test_cartas_admin_create_then_public_lists(self):
        from datetime import datetime, timedelta

        ayer = (datetime.now() - timedelta(hours=1)).isoformat(timespec="seconds")
        create = self.client.post(
            "/admin/api/cartas",
            headers={"X-Admin-Token": _ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"titulo": "Smoke", "contenido": "hola Luna", "fecha_apertura": ayer},
        )
        self.assertEqual(create.status_code, 201)
        carta_id = create.get_json()["carta"]["id"]

        publicas = self.client.get("/api/cartas").get_json()
        ids = [c["id"] for c in publicas["disponibles"]]
        self.assertIn(carta_id, ids)

        individual = self.client.get(f"/api/cartas/{carta_id}")
        self.assertEqual(individual.status_code, 200)
        self.assertEqual(individual.get_json()["titulo"], "Smoke")

        delete = self.client.delete(
            f"/admin/api/cartas/{carta_id}",
            headers={"X-Admin-Token": _ADMIN_TOKEN},
        )
        self.assertEqual(delete.status_code, 200)

    def test_cartas_admin_create_requires_token(self):
        response = self.client.post(
            "/admin/api/cartas",
            json={"titulo": "x", "contenido": "y", "fecha_apertura": "2026-01-01T00:00:00"},
        )
        self.assertEqual(response.status_code, 401)

    def test_cartas_locked_returns_404_individual(self):
        from datetime import datetime, timedelta

        future = (datetime.now() + timedelta(days=2)).isoformat(timespec="seconds")
        create = self.client.post(
            "/admin/api/cartas",
            headers={"X-Admin-Token": _ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"titulo": "sellada", "contenido": "x", "fecha_apertura": future},
        )
        carta_id = create.get_json()["carta"]["id"]
        single = self.client.get(f"/api/cartas/{carta_id}")
        self.assertEqual(single.status_code, 404)
        publicas = self.client.get("/api/cartas").get_json()
        self.assertNotIn(carta_id, [c["id"] for c in publicas["disponibles"]])
        self.assertIsNotNone(publicas.get("proxima_en_segundos"))

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

    def test_permissions_policy_allows_microphone(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        policy = response.headers.get("Permissions-Policy", "")
        self.assertIn("microphone=(self)", policy)

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
            "/api/regalo_diario",
            "/api/aurora_data",
            "/api/timeline",
            "/api/juego_corazones_config",
            "/api/capsula",
            "/api/constelaciones",
            "/api/cartas",
            "/api/preview_estado",
            "/api/recuerdos_media",
            "/api/build_info",
        ]:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertIn("application/json", response.content_type)

    def test_recuerdos_media_payload_shape(self):
        response = self.client.get("/api/recuerdos_media")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("recuerdos", data)
        self.assertIn("total", data)
        self.assertIsInstance(data["recuerdos"], list)
        self.assertGreaterEqual(len(data["recuerdos"]), 1)
        self.assertTrue(all(str(item).startswith("/static/") for item in data["recuerdos"]))

    def test_build_info_payload_shape(self):
        response = self.client.get("/api/build_info")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("preview_lab_rev", data)
        self.assertIn("server_time", data)

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

    def test_preview_estado_open_and_locked(self):
        with patch.dict(os.environ, {"PREVIEW_MODE_ENABLED": "1"}):
            r_open = self.client.get("/api/estado?preview_state=open")
            r_locked = self.client.get("/api/estado?preview_state=locked")
        self.assertEqual(r_open.status_code, 200)
        self.assertEqual(r_locked.status_code, 200)
        self.assertFalse(r_open.get_json()["bloqueado"])
        self.assertTrue(r_locked.get_json()["bloqueado"])

    def test_preview_lab_sets_cookie_and_enables_backend(self):
        old = os.environ.get("PREVIEW_MODE_ENABLED")
        os.environ["PREVIEW_MODE_ENABLED"] = "0"
        try:
            lab = self.client.get("/preview-lab")
            self.assertEqual(lab.status_code, 200)
            self.assertIn("preview_lab_session", lab.headers.get("Set-Cookie", ""))

            estado = self.client.get("/api/preview_estado?preview_state=open")
            self.assertEqual(estado.status_code, 200)
            data = estado.get_json()
            self.assertTrue(data.get("preview_lab_session"))
            self.assertTrue(data.get("preview_mode_enabled"))
            self.assertEqual(data.get("capa_efectiva"), "backend")
            self.assertFalse(data.get("bloqueado"))
        finally:
            if old is None:
                os.environ.pop("PREVIEW_MODE_ENABLED", None)
            else:
                os.environ["PREVIEW_MODE_ENABLED"] = old

    def test_preview_estado_expone_fallback_cliente_efectivo(self):
        with patch.dict(os.environ, {"PREVIEW_MODE_ENABLED": "0"}):
            response = self.client.get("/api/preview_estado?preview_state=locked&preview_client=1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertFalse(data["preview_mode_enabled"])
        self.assertTrue(data["preview_client_fallback_active"])
        self.assertEqual(data["capa_efectiva"], "client")
        self.assertTrue(data["bloqueado"])
        self.assertIn("backend", data)
        self.assertIn("bloqueado", data["backend"])


if __name__ == "__main__":
    unittest.main()
