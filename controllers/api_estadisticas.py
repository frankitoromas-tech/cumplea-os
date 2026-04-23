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

from api import APIModule


class EstadisticasModule(APIModule):
    nombre = "estadisticas"
    _DATA  = Path(__file__).parent.parent / "data"

    def _registrar_rutas(self):
        self.bp.route("/api/estado"              )(self.estado_regalo)
        self.bp.route("/api/estadisticas_amor"   )(self.estadisticas_amor)
        self.bp.route("/api/countdown_detallado" )(self.countdown_detallado)
        self.bp.route("/api/visitas"             )(self.visitas)
        self.bp.route("/api/momento_dia"         )(self.momento_del_dia)

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

    def estadisticas_amor(self):
        hoy     = date.today()          # date
        dias    = self._dias_vividos()
        edad    = self._edad()
        juntos  = self._dias_juntos()
        proximo = self._proximo_cumple()  # BUG FIX: ahora devuelve date

        return self._ok({
            "edad_años":         edad,
            "dias_vividos":      f"{dias:,}",
            "horas_vividas":     f"{dias * 24:,}",
            "latidos_estimados": f"{dias * 24 * 60 * 72:,}",
            "semanas_vividas":   dias // 7,
            "dias_juntos":       f"{juntos:,}",
            "horas_juntos":      f"{juntos * 24:,}",
            "orbitas_al_sol":    edad,
            # BUG FIX: proximo (date) - hoy (date) → resta válida
            "dias_para_cumple":  (proximo - hoy).days,
            "proximo_cumple":    (proximo.isoformat()
                                  if (proximo - hoy).days > 0
                                  else "¡Hoy! 🎉"),
        })

    def countdown_detallado(self):
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