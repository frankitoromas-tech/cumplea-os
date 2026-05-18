"""
Tests for services/crypto_service.DataCipher: single-key, rotation, and
robustness against malformed keys.
"""
from __future__ import annotations

import os
import unittest

from cryptography.fernet import Fernet

from services import crypto_service


class CryptoServiceTests(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.get("APP_ENCRYPTION_KEY")
        crypto_service.reset_data_cipher_cache()

    def tearDown(self):
        if self._saved is None:
            os.environ.pop("APP_ENCRYPTION_KEY", None)
        else:
            os.environ["APP_ENCRYPTION_KEY"] = self._saved
        crypto_service.reset_data_cipher_cache()

    def test_disabled_without_env(self):
        os.environ.pop("APP_ENCRYPTION_KEY", None)
        cipher = crypto_service.DataCipher()
        self.assertFalse(cipher.enabled)
        with self.assertRaises(RuntimeError):
            cipher.encrypt_json({"a": 1})

    def test_roundtrip_single_key(self):
        os.environ["APP_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
        cipher = crypto_service.DataCipher()
        self.assertTrue(cipher.enabled)
        token = cipher.encrypt_json({"hola": "mundo", "n": 42})
        self.assertNotIn("hola", token)
        self.assertEqual(cipher.decrypt_json(token), {"hola": "mundo", "n": 42})

    def test_rotation_old_token_decryptable_with_new_primary(self):
        old_key = Fernet.generate_key().decode()
        new_key = Fernet.generate_key().decode()

        # Phase 1: encrypt with the OLD key only.
        os.environ["APP_ENCRYPTION_KEY"] = old_key
        old_cipher = crypto_service.DataCipher()
        token = old_cipher.encrypt_json([{"item": 1}])

        # Phase 2: rotate. NEW is now primary, OLD is kept for decryption.
        os.environ["APP_ENCRYPTION_KEY"] = f"{new_key},{old_key}"
        rotated = crypto_service.DataCipher()
        self.assertEqual(rotated.decrypt_json(token), [{"item": 1}])

        # New writes use the new primary; old cipher cannot decrypt them.
        new_token = rotated.encrypt_json([{"item": 2}])
        with self.assertRaises(Exception):
            old_cipher.decrypt_json(new_token)

    def test_invalid_key_disables_cleanly(self):
        os.environ["APP_ENCRYPTION_KEY"] = "not-a-valid-key"
        cipher = crypto_service.DataCipher()
        self.assertFalse(cipher.enabled)

    def test_mix_of_valid_and_invalid_keeps_valid(self):
        valid = Fernet.generate_key().decode()
        os.environ["APP_ENCRYPTION_KEY"] = f"not-valid,{valid}"
        cipher = crypto_service.DataCipher()
        self.assertTrue(cipher.enabled)
        cipher.decrypt_json(cipher.encrypt_json("ok"))


if __name__ == "__main__":
    unittest.main()
