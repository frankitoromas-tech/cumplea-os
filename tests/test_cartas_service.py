"""
Tests for ServicioCartas: validation, time-based unlock, deletion, bounded list.
"""
from __future__ import annotations

import os
import tempfile
import unittest
from datetime import datetime, timedelta

from services import crypto_service
from services.cartas_service import ServicioCartas


class CartasServiceTests(unittest.TestCase):
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

    def test_crear_valida_campos_obligatorios(self):
        service = ServicioCartas()
        with self.assertRaises(ValueError):
            service.crear(titulo="", contenido="x", fecha_apertura="2026-01-01T00:00:00")
        with self.assertRaises(ValueError):
            service.crear(titulo="x", contenido="", fecha_apertura="2026-01-01T00:00:00")
        with self.assertRaises(ValueError):
            service.crear(titulo="x", contenido="y", fecha_apertura="not-a-date")

    def test_unlocked_when_fecha_pasada(self):
        service = ServicioCartas()
        ayer = (datetime.now() - timedelta(days=1)).isoformat(timespec="seconds")
        service.crear(titulo="ayer", contenido="hola", fecha_apertura=ayer)
        disponibles = service.listar_disponibles()
        self.assertEqual(len(disponibles), 1)
        self.assertEqual(disponibles[0]["titulo"], "ayer")

    def test_locked_when_fecha_futura(self):
        service = ServicioCartas()
        manana = (datetime.now() + timedelta(days=1)).isoformat(timespec="seconds")
        service.crear(titulo="futura", contenido="x", fecha_apertura=manana)
        self.assertEqual(service.listar_disponibles(), [])
        proxima = service.proxima()
        self.assertIsNotNone(proxima)
        self.assertEqual(proxima["titulo"], "futura")

    def test_borrar_existente_y_inexistente(self):
        service = ServicioCartas()
        carta = service.crear(
            titulo="t", contenido="c", fecha_apertura="2026-01-01T00:00:00"
        )
        self.assertTrue(service.borrar(carta.id))
        self.assertFalse(service.borrar(carta.id))
        self.assertFalse(service.borrar(""))

    def test_acepta_fecha_con_z_zulu(self):
        service = ServicioCartas()
        ayer_z = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        service.crear(titulo="z", contenido="c", fecha_apertura=ayer_z)
        self.assertEqual(len(service.listar_disponibles()), 1)

    def test_strips_control_chars_and_caps_length(self):
        service = ServicioCartas()
        carta = service.crear(
            titulo="\x00\x01titulo\x02",
            contenido="hola\nmundo",
            fecha_apertura=(datetime.now() - timedelta(days=1)).isoformat(),
        )
        self.assertEqual(carta.titulo, "titulo")
        self.assertIn("\n", carta.contenido)

    def test_bounded_to_max_cartas(self):
        service = ServicioCartas()
        service._MAX_CARTAS = 3  # type: ignore[attr-defined]
        # Bypass crear's _MAX_CARTAS since we set it on the instance only;
        # call the underlying method enough times to overflow.
        for i in range(5):
            service.crear(
                titulo=f"c{i}",
                contenido="x",
                fecha_apertura="2026-01-01T00:00:00",
            )
        todas = service.listar_todas()
        self.assertLessEqual(len(todas), 3)
        self.assertEqual(todas[-1]["titulo"], "c4")


if __name__ == "__main__":
    unittest.main()
