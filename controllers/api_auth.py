"""
controllers/api_auth.py — Verificación de nombre para acceder al regalo.

Endpoint público:
  POST /api/verificar_nombre  body={"nombre": "luna"}
  → {"valido": true, "nombre_canonico": "luyuromo", "mensaje": "..."}
  → {"valido": false, "mensaje": "..."}

Aliases válidos: luna, luyuromo, luyu (insensible a mayús/minús, espacios y acentos).

Diseño: idempotente. NO mantiene sesión en backend porque el estado debe
vivir en memoria del cliente (requisito Misión 1: F5 borra el estado).
"""
from __future__ import annotations
from flask import request
import unicodedata

from api import APIModule


def _normalizar(texto: str) -> str:
    """trim → sin acentos → minúsculas → sin espacios internos."""
    if not texto:
        return ""
    s = unicodedata.normalize("NFD", str(texto))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace(" ", "").lower().strip()


# Alias canónico (lo que envía el cliente al resto del sistema)
NOMBRE_CANONICO = "luyuromo"

# Conjunto de aliases aceptados — añade más aquí en el futuro
ALIASES_VALIDOS = frozenset({"luyuromo", "luna", "luyu"})


class AuthModule(APIModule):
    nombre = "auth"

    def _registrar_rutas(self):
        # Doble ruta para compatibilidad con cómo otros módulos del proyecto
        # registran sus endpoints (algunos usan /api/X, otros sin prefijo).
        self.bp.route("/api/verificar_nombre", methods=["POST"])(self.verificar_nombre)
        self.bp.route("/verificar_nombre",     methods=["POST"])(self.verificar_nombre)

    def verificar_nombre(self):
        try:
            data = request.get_json(silent=True) or {}
        except Exception:
            data = {}

        nombre_raw = (data.get("nombre") or "").strip()
        nombre_norm = _normalizar(nombre_raw)

        if nombre_norm in ALIASES_VALIDOS:
            return self._ok({
                "valido":          True,
                "nombre_canonico": NOMBRE_CANONICO,
                "alias_usado":     nombre_norm,
                "mensaje":         "✦ Las estrellas te reconocen ✦",
            })

        # Mensaje cariñoso si está vacío vs. nombre incorrecto
        if not nombre_norm:
            mensaje = "Susúrrame tu nombre, mi luna."
        elif len(nombre_norm) < 3:
            mensaje = "Necesito más letras para reconocerte."
        else:
            mensaje = "Ese nombre no abre la puerta. Prueba con tu nombre o tu apodo."

        return self._ok({
            "valido":  False,
            "mensaje": mensaje,
        })


auth_module = AuthModule()
