"""
Tests for request_guards and admin CSRF hardening.
"""
from __future__ import annotations

import os
import unittest

from flask import Flask, jsonify, request

from services.request_guards import honeypot_triggered, validate_write_origin
from services.security_service import mint_csrf_token, verify_csrf_token


class RequestGuardsTests(unittest.TestCase):
    def test_honeypot_detects_website_field(self):
        self.assertTrue(honeypot_triggered({"website": "http://spam.test"}))
        self.assertFalse(honeypot_triggered({"nombre": "luna"}))

    def test_origin_enforcement_blocks_foreign_origin(self):
        app = Flask(__name__)

        @app.before_request
        def guard():
            ok, _ = validate_write_origin()
            if not ok:
                return jsonify({"status": "error"}), 403

        @app.post("/api/ping")
        def ping():
            return jsonify({"ok": True})

        old = os.environ.get("ENFORCE_SAME_ORIGIN_WRITES")
        os.environ["ENFORCE_SAME_ORIGIN_WRITES"] = "1"
        try:
            client = app.test_client()
            blocked = client.post(
                "/api/ping",
                json={},
                headers={"Origin": "https://evil.example"},
            )
            self.assertEqual(blocked.status_code, 403)
            allowed = client.post("/api/ping", json={})
            self.assertEqual(allowed.status_code, 200)
        finally:
            if old is None:
                os.environ.pop("ENFORCE_SAME_ORIGIN_WRITES", None)
            else:
                os.environ["ENFORCE_SAME_ORIGIN_WRITES"] = old

    def test_csrf_roundtrip(self):
        old = os.environ.get("ADMIN_TOKEN")
        os.environ["ADMIN_TOKEN"] = "csrf-test-token"
        try:
            with Flask(__name__).test_request_context():
                token = mint_csrf_token()
            self.assertTrue(verify_csrf_token(token))
            self.assertFalse(verify_csrf_token("tampered"))
        finally:
            if old is None:
                os.environ.pop("ADMIN_TOKEN", None)
            else:
                os.environ["ADMIN_TOKEN"] = old


class AdminCsrfLoginTests(unittest.TestCase):
    def setUp(self):
        self._token = os.environ.get("ADMIN_TOKEN")
        os.environ["ADMIN_TOKEN"] = "login-csrf-token"
        from app import app

        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def tearDown(self):
        if self._token is None:
            os.environ.pop("ADMIN_TOKEN", None)
        else:
            os.environ["ADMIN_TOKEN"] = self._token

    def test_login_requires_csrf(self):
        response = self.client.post(
            "/admin/login",
            data={"token": "login-csrf-token"},
        )
        self.assertEqual(response.status_code, 403)

    def test_login_with_csrf_succeeds(self):
        form = self.client.get("/admin/login")
        body = form.get_data(as_text=True)
        import re

        match = re.search(r'name="csrf" value="([^"]+)"', body)
        self.assertIsNotNone(match)
        csrf = match.group(1)
        response = self.client.post(
            "/admin/login",
            data={"token": "login-csrf-token", "csrf": csrf},
            follow_redirects=False,
        )
        self.assertIn(response.status_code, (302, 303))


if __name__ == "__main__":
    unittest.main()
