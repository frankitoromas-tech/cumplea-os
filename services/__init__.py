"""
services/__init__.py
Re-exporta las clases base desde api/ (fuente única de verdad).
BUG FIX: antes tenía una copia completa de BaseModule/APIModule duplicada.
"""
from api import BaseModule, APIModule

__all__ = ["BaseModule", "APIModule"]