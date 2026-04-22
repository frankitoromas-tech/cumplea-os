"""
api/estadisticas.py
EstadisticasModule — hereda de APIModule
Estadísticas de amor, countdown detallado, visitas.
"""
from __future__ import annotations
from datetime import datetime, date
from pathlib import Path
import json
from api import APIModule


class EstadisticasModule(APIModule):
    """
    Módulo de estadísticas.
    Hereda de APIModule → BaseModule.
    Rutas: /api/estadisticas_amor, /api/countdown_detallado, /api/visitas, /api/estado
    """
    nombre = "estadisticas"
    _DATA  = Path(__file__).parent.parent / "data"

    def _registrar_rutas(self):
        self.bp.route("/api/estadisticas_amor")(self.estadisticas_amor)
        self.bp.route("/api/countdown_detallado")(self.countdown_detallado)
        self.bp.route("/api/visitas")(self.visitas)
        self.bp.route("/api/estado")(self.estado_regalo)
        self.bp.route("/api/momento_dia")(self.momento_del_dia)

    # ── helpers privados ────────────────────────────────────
    def _leer_visitas(self) -> dict:
        try:
            f = self._DATA / "visitas.json"
            if f.exists():
                return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            pass
        return {"total": 0, "por_dia": {}}

    def _registrar_visita(self):
        data = self._leer_visitas()
        data["total"] = data.get("total", 0) + 1
        hoy = date.today().isoformat()
        data["por_dia"] = data.get("por_dia", {})
        data["por_dia"][hoy] = data["por_dia"].get(hoy, 0) + 1
        try:
            self._DATA.mkdir(exist_ok=True)
            (self._DATA / "visitas.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass
        return data

    # ── rutas ────────────────────────────────────────────────
    def estado_regalo(self):
        """Compatible 100% con el fetch existente en script.js."""
        ahora = datetime.now()
        if ahora >= self.FECHA_APERTURA:
            return self._ok({"bloqueado": False})
        delta = self.FECHA_APERTURA - ahora
        return self._ok({"bloqueado": True, "segundos_faltantes": delta.total_seconds()})

    def estadisticas_amor(self):
        hoy    = date.today()
        dias   = self._dias_vividos()
        edad   = self._edad()
        juntos = self._dias_juntos()
        proximo = self._proximo_cumple()
        return self._ok({
            "edad_años":         edad,
            "dias_vividos":      f"{dias:,}",
            "horas_vividas":     f"{dias*24:,}",
            "latidos_estimados": f"{dias*24*60*72:,}",
            "semanas_vividas":   dias // 7,
            "dias_juntos":       f"{juntos:,}",
            "horas_juntos":      f"{juntos*24:,}",
            "orbitas_al_sol":    edad,
            "dias_para_cumple":  (proximo - hoy).days,
            "proximo_cumple":    proximo.isoformat() if (proximo-hoy).days > 0 else "¡Hoy! 🎉",
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
        """Nueva ruta: saludo contextual según la hora."""
        h = datetime.now().hour
        if 5  <= h < 12: momento, emoji = "mañana",  "🌅"
        elif 12 <= h < 18: momento, emoji = "tarde",  "☀️"
        elif 18 <= h < 22: momento, emoji = "noche",  "🌙"
        else:              momento, emoji = "madrugada", "⭐"
        saludos = {
            "mañana":    "Buenos días, mi luna. Que este día sea tan brillante como tú.",
            "tarde":     "Buenas tardes, amor. Espero que tu día esté siendo hermoso.",
            "noche":     "Buenas noches, mi cielo. Eres lo más bonito de mi día.",
            "madrugada": "¿Todavía despierta? Cuídate mucho, te quiero siempre.",
        }
        return self._ok({"momento": momento, "emoji": emoji,
                         "saludo": saludos[momento], "hora": h})


estadisticas_module = EstadisticasModule()