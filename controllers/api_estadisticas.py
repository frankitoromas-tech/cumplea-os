"""
controllers/api_estadisticas.py
EstadisticasModule — hereda de APIModule → BaseModule.
BUG FIX: (proximo - hoy).days fallaba con TypeError porque _proximo_cumple()
devolvía datetime y hoy era date. Ambos son ahora date.
"""
from __future__ import annotations
from datetime import datetime, date
from pathlib import Path
import json
import time

from api import APIModule


# ── TTL cache: 60s. Evita recalcular en cada petición ────────────
# Vercel cobra por tiempo de cómputo: este caché reduce la carga del
# endpoint estadisticas_amor a una llamada real por minuto.
def _ttl_cache(seconds: int = 60):
    def decorator(fn):
        cache: dict[tuple, tuple[object, float]] = {}
        def wrapper(*args, **kwargs):
            key = (id(args[0]) if args else 0,) + args[1:] + tuple(sorted(kwargs.items()))
            now = time.time()
            hit = cache.get(key)
            if hit and (now - hit[1]) < seconds:
                return hit[0]
            value = fn(*args, **kwargs)
            cache[key] = (value, now)
            return value
        wrapper._cache = cache  # acceso para tests / debug
        return wrapper
    return decorator


class EstadisticasModule(APIModule):
    nombre = "estadisticas"
    _DATA  = Path(__file__).parent.parent / "data"

    def _registrar_rutas(self):
        # BUG FIX: el frontend hace fetch('/api/estado') pero las rutas estaban
        # registradas SIN el prefijo /api/. Esto causaba 404 y el .catch del
        # frontend caía al fallback "asumir cumple" → countdown nunca aparecía.
        # Fix: registrar AMBAS variantes para máxima compatibilidad.
        for path, handler in [
            ("estado",             self.estado_regalo),
            ("estadisticas_amor",  self.estadisticas_amor),
            ("countdown_detallado",self.countdown_detallado),
            ("visitas",            self.visitas),
            ("momento_dia",        self.momento_del_dia),
        ]:
            self.bp.route(f"/{path}",     endpoint=f"{path}_alt")(handler)
            self.bp.route(f"/api/{path}", endpoint=path)(handler)

    # ── helpers ──────────────────────────────────────────────
    def _leer_visitas(self) -> dict:
        try:
            f = self._DATA / "visitas.json"
            if f.exists():
                return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            pass
        return {"total": 0, "por_dia": {}}

    # ── rutas ────────────────────────────────────────────────
    def estado_regalo(self):
        ahora = datetime.now()
        if ahora >= self.FECHA_APERTURA:
            return self._ok({"bloqueado": False})
        delta = self.FECHA_APERTURA - ahora
        return self._ok({"bloqueado": True, "segundos_faltantes": delta.total_seconds()})

    @_ttl_cache(seconds=60)
    def _calc_estadisticas(self) -> dict:
        """Cómputo pesado de estadísticas. Cacheado 60s."""
        hoy     = date.today()
        dias    = self._dias_vividos()
        edad    = self._edad()
        juntos  = self._dias_juntos()
        proximo = self._proximo_cumple()
        return {
            "edad_años":         edad,
            "dias_vividos":      f"{dias:,}",
            "horas_vividas":     f"{dias * 24:,}",
            "latidos_estimados": f"{dias * 24 * 60 * 72:,}",
            "semanas_vividas":   dias // 7,
            "dias_juntos":       f"{juntos:,}",
            "horas_juntos":      f"{juntos * 24:,}",
            "orbitas_al_sol":    edad,
            "dias_para_cumple":  (proximo - hoy).days,
            "proximo_cumple":    (proximo.isoformat()
                                  if (proximo - hoy).days > 0
                                  else "¡Hoy! 🎉"),
        }

    def estadisticas_amor(self):
        return self._ok(self._calc_estadisticas())

    def countdown_detallado(self):
        # No cacheamos: el contador necesita ser preciso al segundo
        ahora = datetime.now()
        if ahora >= self.FECHA_APERTURA:
            return self._ok({"abierto": True})
        t = int((self.FECHA_APERTURA - ahora).total_seconds())
        return self._ok({
            "abierto":        False,
            "dias":           t // 86400,
            "horas":          (t % 86400) // 3600,
            "minutos":        (t % 3600) // 60,
            "segundos":       t % 60,
            "total_segundos": t,
        })

    def visitas(self):
        data = self._leer_visitas()
        hoy  = date.today().isoformat()
        return self._ok({
            "total":   data.get("total", 0),
            "hoy":     data.get("por_dia", {}).get(hoy, 0),
            "por_dia": data.get("por_dia", {}),
        })

    def momento_del_dia(self):
        h = datetime.now().hour
        if   5  <= h < 12: momento, emoji = "mañana",    "🌅"
        elif 12 <= h < 18: momento, emoji = "tarde",     "☀️"
        elif 18 <= h < 22: momento, emoji = "noche",     "🌙"
        else:               momento, emoji = "madrugada", "⭐"
        saludos = {
            "mañana":    "Buenos días, mi luna. Que este día sea tan brillante como tú.",
            "tarde":     "Buenas tardes, amor. Espero que tu día esté siendo hermoso.",
            "noche":     "Buenas noches, mi cielo. Eres lo más bonito de mi día.",
            "madrugada": "¿Todavía despierta? Cuídate mucho, te quiero siempre.",
        }
        return self._ok({"momento": momento, "emoji": emoji,
                         "saludo": saludos[momento], "hora": h})


estadisticas_module = EstadisticasModule()