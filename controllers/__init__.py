"""
controllers/__init__.py
Re-exporta las clases base desde api/ para que los controllers
puedan importar directamente desde su propio paquete si lo prefieren.
BUG FIX: antes tenía una copia completa de las clases base (código duplicado).
"""
from api import BaseModule, APIModule  # única fuente de verdad

__all__ = ["BaseModule", "APIModule"]