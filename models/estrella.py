"""
models/estrella.py
BUG FIX: estaba completamente vacío. Define el modelo Estrella
usado por el creador de constelaciones.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict


@dataclass
class Estrella:
    """Representa una estrella en una constelación dibujada por Luyuromo."""
    x: float
    y: float

    def to_dict(self) -> dict:
        return asdict(self)