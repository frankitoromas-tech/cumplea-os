"""
controllers/api_estadisticas.py
EstadisticasModule — hereda de APIModule → BaseModule.
BUG FIX: (proximo - hoy).days fallaba con TypeError porque _proximo_cumple()
devolvía datetime y hoy era date. Ambos son ahora date.
"""
from __future__ import annotations
import time
from datetime import datetime, date

from flask import request

from api import APIModule
from services.preview_service import preview_mode_enabled, resolve_from_request_args
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

    # ── Preview Mode (delegado a services/preview_service.py) ──
    def _resolve_preview(self):
        return resolve_from_request_args(request.args)

    # ── rutas ────────────────────────────────────────────────
    def estado_regalo(self):
        resolved = self._resolve_preview()
        if not resolved.bloqueado:
            return self._ok(
                {
                    "bloqueado": False,
                    "fecha_apertura": resolved.apertura.isoformat(),
                    "fuente_apertura": resolved.fuente,
                    "capa_efectiva": resolved.capa,
                }
            )
        return self._ok(
            {
                "bloqueado": True,
                "segundos_faltantes": resolved.segundos_faltantes,
                "fecha_apertura": resolved.apertura.isoformat(),
                "fuente_apertura": resolved.fuente,
                "capa_efectiva": resolved.capa,
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
        resolved = self._resolve_preview()
        apertura = resolved.apertura
        fuente = resolved.fuente
        if not resolved.bloqueado:
            return self._ok({"abierto": True, "fecha_apertura": apertura.isoformat(), "fuente_apertura": fuente})
        t = resolved.segundos_faltantes
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
        from services.preview_service import flag_true, resolve_apertura

        ahora = datetime.now()
        base = self._fecha_apertura_configurada()
        efectivo = resolve_from_request_args(request.args)

        backend = resolve_apertura(
            ahora,
            preview_state=request.args.get("preview_state"),
            preview_open_at=request.args.get("preview_open_at"),
            preview_client=None,
        )
        usa_fallback_cliente = efectivo.capa == "client"

        return self._ok(
            {
                "preview_mode_enabled": preview_mode_enabled(),
                "preview_client_requested": flag_true(request.args.get("preview_client")),
                "preview_client_fallback_active": usa_fallback_cliente,
                "now": ahora.isoformat(),
                "fecha_apertura_base": base.isoformat(),
                "fecha_apertura_efectiva": efectivo.apertura.isoformat(),
                "fuente_apertura": efectivo.fuente,
                "bloqueado": efectivo.bloqueado,
                "segundos_faltantes": efectivo.segundos_faltantes,
                "capa_efectiva": efectivo.capa,
                "backend": {
                    "fecha_apertura_efectiva": backend.apertura.isoformat(),
                    "fuente_apertura": backend.fuente,
                    "bloqueado": backend.bloqueado,
                    "segundos_faltantes": backend.segundos_faltantes,
                },
                "uso": {
                    "estado_open": "/api/estado?preview_state=open",
                    "estado_locked": "/api/estado?preview_state=locked",
                    "estado_custom": "/api/estado?preview_open_at=2026-08-30T00:00:00",
                    "bypass_cliente": "/?preview=1",
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
