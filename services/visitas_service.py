"""
services/visitas_service.py - Visit counter persistence.

Stores a tiny dict:
    {"total": int, "por_dia": {"YYYY-MM-DD": int}}

`registrar()` is atomic thanks to ServicioBase locking; safe under
multiple Gunicorn workers.
"""
from __future__ import annotations

from datetime import date

from services.base_service import ServicioBase


class ServicioVisitas(ServicioBase):
    _MAX_DIAS = 365  # keep at most one year of daily buckets

    def __init__(self):
        super().__init__("data/visitas.json")

    def _empty(self) -> dict:
        return {"total": 0, "por_dia": {}}

    def leer(self) -> dict:
        return self.leer_dict(default=self._empty())

    def registrar(self, hoy: str | None = None) -> dict:
        """
        Atomically increment today's bucket and the running total.
        Returns the post-increment snapshot.
        """
        hoy_resolved = hoy or date.today().isoformat()

        def bump(current: dict | None) -> dict:
            data = dict(current) if isinstance(current, dict) else self._empty()
            data["total"] = int(data.get("total", 0)) + 1
            por_dia = dict(data.get("por_dia", {}))
            por_dia[hoy_resolved] = int(por_dia.get(hoy_resolved, 0)) + 1

            if len(por_dia) > self._MAX_DIAS:
                for stale in sorted(por_dia)[: len(por_dia) - self._MAX_DIAS]:
                    por_dia.pop(stale, None)

            data["por_dia"] = por_dia
            return data

        result = self.actualizar(bump, default=self._empty())
        return result if isinstance(result, dict) else self._empty()
