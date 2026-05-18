"""
controllers/api_estadisticas.py
EstadisticasModule — hereda de APIModule → BaseModule.
BUG FIX: (proximo - hoy).days fallaba con TypeError porque _proximo_cumple()
devolvía datetime y hoy era date. Ambos son ahora date.
"""
from __future__ import annotations
import os
import time
from datetime import datetime, date, timedelta

from flask import request

from api import APIModule
from services.visitas_service import ServicioVisitas


# ── TTL cache acotado ───────────────────────────────────────────
# Evita recalcular en cada peticion. El tamano se acota para que la
# memoria no crezca indefinidamente bajo trafico adversarial.
def _ttl_cache(seconds: int = 60, max_entries: int = 64):
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
            if len(cache) > max_entries:
                # Drop the oldest entry by insertion order.
                oldest_key = next(iter(cache))
                if oldest_key != key:
                    cache.pop(oldest_key, None)
            return value
        wrapper._cache = cache  # acceso para tests / debug
        wrapper._ttl_reset = lambda: cache.clear()
        return wrapper
    return decorator


class EstadisticasModule(APIModule):
    nombre = "estadisticas"

    def __init__(self):
        self._visitas = ServicioVisitas()
        super().__init__()

    def _registrar_rutas(self):
        for path, handler in [
            ("estado",             self.estado_regalo),
            ("estadisticas_amor",  self.estadisticas_amor),
            ("countdown_detallado",self.countdown_detallado),
            ("visitas",            self.visitas),
            ("momento_dia",        self.momento_del_dia),
            ("preview_estado",     self.preview_estado),
        ]:
            self.bp.route(f"/{path}",     endpoint=f"{path}_alt")(handler)
            self.bp.route(f"/api/{path}", endpoint=path)(handler)

    # ── Preview Mode helpers ─────────────────────────────────
    @staticmethod
    def _preview_habilitado() -> bool:
        return (os.getenv("PREVIEW_MODE_ENABLED") or "").strip() == "1"

    @staticmethod
    def _parse_iso_datetime(raw: str) -> datetime | None:
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone().replace(tzinfo=None)
            return parsed
        except ValueError:
            return None

    def _fecha_apertura_efectiva(self) -> tuple[datetime, str]:
        base = self._fecha_apertura_configurada()
        if not self._preview_habilitado():
            return base, "real"

        estado_preview = (request.args.get("preview_state") or "").strip().lower()
        if estado_preview in {"open", "abierto"}:
            return datetime.now() - timedelta(seconds=3), "preview-open"
        if estado_preview in {"locked", "bloqueado"}:
            return datetime.now() + timedelta(days=7), "preview-locked"

        fecha_preview = self._parse_iso_datetime(
            (request.args.get("preview_open_at") or "").strip()
        )
        if fecha_preview:
            return fecha_preview, "preview-custom"

        return base, "real"

    # ── rutas ────────────────────────────────────────────────
    def estado_regalo(self):
        ahora = datetime.now()
        apertura, fuente = self._fecha_apertura_efectiva()
        if ahora >= apertura:
            return self._ok(
                {
                    "bloqueado": False,
                    "fecha_apertura": apertura.isoformat(),
                    "fuente_apertura": fuente,
                }
            )
        delta = apertura - ahora
        return self._ok(
            {
                "bloqueado": True,
                "segundos_faltantes": delta.total_seconds(),
                "fecha_apertura": apertura.isoformat(),
                "fuente_apertura": fuente,
            }
        )

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
        apertura, fuente = self._fecha_apertura_efectiva()
        if ahora >= apertura:
            return self._ok({"abierto": True, "fecha_apertura": apertura.isoformat(), "fuente_apertura": fuente})
        t = int((apertura - ahora).total_seconds())
        return self._ok({
            "abierto":        False,
            "dias":           t // 86400,
            "horas":          (t % 86400) // 3600,
            "minutos":        (t % 3600) // 60,
            "segundos":       t % 60,
            "total_segundos": t,
            "fecha_apertura": apertura.isoformat(),
            "fuente_apertura": fuente,
        })

    def preview_estado(self):
        ahora = datetime.now()
        base = self._fecha_apertura_configurada()
        apertura, fuente = self._fecha_apertura_efectiva()
        bloqueado = ahora < apertura
        return self._ok(
            {
                "preview_mode_enabled": self._preview_habilitado(),
                "now": ahora.isoformat(),
                "fecha_apertura_base": base.isoformat(),
                "fecha_apertura_efectiva": apertura.isoformat(),
                "fuente_apertura": fuente,
                "bloqueado": bloqueado,
                "segundos_faltantes": max(int((apertura - ahora).total_seconds()), 0),
                "uso": {
                    "estado_open": "/api/estado?preview_state=open",
                    "estado_locked": "/api/estado?preview_state=locked",
                    "estado_custom": "/api/estado?preview_open_at=2026-08-30T00:00:00",
                },
            }
        )

    def visitas(self):
        data = self._visitas.leer()
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
