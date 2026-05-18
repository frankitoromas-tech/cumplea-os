/* static/js/admin.js — Admin panel logic.
 * Loaded with a strict CSP (no inline scripts): every handler binds via
 * `data-action` on the button.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fetchJSON = (url, opts) =>
    fetch(url, { credentials: 'same-origin', ...(opts || {}) }).then((r) => r.json());

  function escapeText(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  const ACTIONS = {
    cargarSalud: async () => {
      const d = await fetchJSON('/api/salud');
      $('estadoServidor').innerHTML = `
        <div class="stat"><span>Servidor</span><span class="badge ok">${escapeText(d.servidor)}</span></div>
        <div class="stat"><span>Telegram</span><span class="valor" style="font-size:.85rem">${escapeText(d.telegram)}</span></div>
        <div class="stat"><span>Timestamp</span><span style="font-size:.8rem;color:#94a3b8">${escapeText(new Date(d.timestamp).toLocaleString('es'))}</span></div>`;
    },

    testTelegram: async () => {
      const btn = $('btnTg');
      btn.disabled = true;
      btn.innerText = 'Enviando...';
      try {
        const r = await fetch('/api/test_telegram', {
          method: 'POST',
          credentials: 'same-origin',
        });
        const d = await r.json();
        const cls = r.ok ? 'ok' : 'err';
        $('tgStatus').innerHTML = `<div class="badge ${cls}" style="display:block;margin-bottom:8px;">${escapeText(d.mensaje || d.error || '')}</div>`;
      } catch (_) {
        $('tgStatus').innerHTML = '<div class="badge err">Error de red</div>';
      }
      btn.disabled = false;
      btn.innerText = 'Enviar mensaje de prueba';
    },

    cargarVisitas: async () => {
      const d = await fetchJSON('/api/visitas');
      const porDia = Object.entries(d.por_dia || {}).slice(-5).reverse();
      let html =
        `<div class="stat"><span>Total</span><span class="valor">${escapeText(d.total)}</span></div>` +
        `<div class="stat"><span>Hoy</span><span class="valor">${escapeText(d.hoy)}</span></div>`;
      for (const [fecha, n] of porDia) {
        html += `<div class="stat"><span>${escapeText(fecha)}</span><span class="valor">${escapeText(n)}</span></div>`;
      }
      $('statsVisitas').innerHTML = html;
    },

    cargarAmor: async () => {
      const d = await fetchJSON('/api/estadisticas_amor');
      $('statsAmor').innerHTML = `
        <div class="stat"><span>Días vividos</span><span class="valor">${escapeText(d.dias_vividos)}</span></div>
        <div class="stat"><span>Semanas de vida</span><span class="valor">${escapeText(d.semanas_vividas)}</span></div>
        <div class="stat"><span>Días juntos</span><span class="valor">${escapeText(d.dias_juntos)}</span></div>
        <div class="stat"><span>Órbitas al sol</span><span class="valor">${escapeText(d.orbitas_al_sol)}</span></div>
        <div class="stat"><span>Próximo cumpleaños</span><span class="valor">${escapeText(d.dias_para_cumple)} días</span></div>`;
    },

    cargarFrase: async () => {
      const d = await fetchJSON('/api/frase_del_dia');
      $('fraseDia').textContent = `"${escapeText(d.frase)}"`;
    },

    cargarCapsula: async () => {
      const d = await fetchJSON('/api/capsula');
      const estado = d.estado === 'abierta'
        ? '<div class="badge ok">Abierta</div>'
        : `<div class="badge err">Cerrada — ${escapeText(d.dias_restantes ?? '?')} días</div>`;
      $('estadoCapsula').innerHTML =
        `<div class="stat"><span>Estado</span>${estado}</div>` +
        `<div class="stat" style="flex-direction:column;align-items:flex-start;gap:4px;"><span style="font-size:.85rem;color:#94a3b8;">${escapeText(d.mensaje)}</span></div>`;
    },

    cargarMetricas: async () => {
      const d = await fetchJSON('/api/healthz/details');
      const c = d.counters || {};
      const rows = [
        ['Uptime (s)', d.uptime_seconds ?? '-'],
        ['PID', d.pid ?? '-'],
        ['Telegram', d.telegram ?? '-'],
        ['Encryption', d.encryption_enabled ? 'on' : 'off'],
        ['Visitas (home)', c['visits.home'] ?? 0],
        ['Rate-limit denegados', c['rate_limit.denied'] ?? 0],
        ['HTTP 2xx', c['http.2xx'] ?? 0],
        ['HTTP 4xx', c['http.4xx'] ?? 0],
        ['HTTP 5xx', c['http.5xx'] ?? 0],
      ];
      $('metricas').innerHTML = rows
        .map(([k, v]) => `<div class="stat"><span>${escapeText(k)}</span><span class="valor">${escapeText(v)}</span></div>`)
        .join('');
    },
  };

  function bindActions() {
    document.querySelectorAll('button[data-action]').forEach((btn) => {
      const action = ACTIONS[btn.dataset.action];
      if (action) {
        btn.addEventListener('click', () => {
          action().catch((err) => console.error('[admin]', btn.dataset.action, err));
        });
      }
    });

    const logout = document.getElementById('btnLogout');
    if (logout) {
      logout.addEventListener('click', async () => {
        await fetch('/admin/logout', { method: 'POST', credentials: 'same-origin' });
        window.location.href = '/admin/login';
      });
    }
  }

  function autoload() {
    bindActions();
    ACTIONS.cargarSalud();
    ACTIONS.cargarVisitas();
    ACTIONS.cargarAmor();
    ACTIONS.cargarFrase();
    ACTIONS.cargarCapsula();
    ACTIONS.cargarMetricas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoload);
  } else {
    autoload();
  }
})();
