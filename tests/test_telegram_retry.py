"""
Tests for TelegramMixin retry/backoff behavior. We patch the underlying
requests calls and the sleep to keep the suite fast.
"""
from __future__ import annotations

import os
import unittest
from unittest.mock import MagicMock, patch


class TelegramRetryTests(unittest.TestCase):
    def setUp(self):
        os.environ["TELEGRAM_TOKEN"] = "test:abc"
        os.environ["TELEGRAM_CHAT_ID"] = "42"
        from controllers.api_mensajes import MensajesModule

        self.mod = MensajesModule.__new__(MensajesModule)
        # Initialize just the mixin state we need.
        from controllers.api_mensajes import TelegramMixin

        TelegramMixin.__init__(self.mod)

    def _response(self, status: int, payload: dict | None = None, headers: dict | None = None):
        r = MagicMock()
        r.status_code = status
        r.headers = headers or {}
        r.json.return_value = payload or {"ok": status < 400}
        return r

    def test_first_attempt_succeeds_no_retry(self):
        with patch("controllers.api_mensajes.http_requests.post", return_value=self._response(200, {"ok": True})) as mock_post:
            with patch("controllers.api_mensajes.time.sleep") as mock_sleep:
                result = self.mod._telegram("hi")
        self.assertTrue(result.get("ok"))
        self.assertEqual(mock_post.call_count, 1)
        mock_sleep.assert_not_called()

    def test_recovers_after_500(self):
        responses = [self._response(500), self._response(200, {"ok": True})]
        with patch("controllers.api_mensajes.http_requests.post", side_effect=responses) as mock_post:
            with patch("controllers.api_mensajes.time.sleep"):
                result = self.mod._telegram("hi")
        self.assertTrue(result.get("ok"))
        self.assertEqual(mock_post.call_count, 2)

    def test_honors_retry_after_on_429(self):
        responses = [
            self._response(429, headers={"Retry-After": "2"}),
            self._response(200, {"ok": True}),
        ]
        with patch("controllers.api_mensajes.http_requests.post", side_effect=responses):
            with patch("controllers.api_mensajes.time.sleep") as mock_sleep:
                result = self.mod._telegram("hi")
        self.assertTrue(result.get("ok"))
        # First sleep must respect the upstream Retry-After value.
        self.assertEqual(mock_sleep.call_args_list[0].args[0], 2)

    def test_gives_up_after_max_attempts(self):
        from controllers.api_mensajes import http_requests as http

        with patch(
            "controllers.api_mensajes.http_requests.post",
            side_effect=http.exceptions.Timeout(),
        ) as mock_post:
            with patch("controllers.api_mensajes.time.sleep"):
                result = self.mod._telegram("hi")
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("error"), "timeout")
        self.assertEqual(mock_post.call_count, 3)

    def test_4xx_other_than_429_does_not_retry(self):
        with patch(
            "controllers.api_mensajes.http_requests.post",
            return_value=self._response(400, {"ok": False, "description": "bad chat id"}),
        ) as mock_post:
            with patch("controllers.api_mensajes.time.sleep") as mock_sleep:
                result = self.mod._telegram("hi")
        self.assertFalse(result.get("ok"))
        self.assertEqual(mock_post.call_count, 1)
        mock_sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
