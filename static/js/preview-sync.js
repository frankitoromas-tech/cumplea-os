/* preview-sync.js — Lógica compartida Preview Lab ↔ Home ↔ cápsula */
'use strict';

(function () {
  if (window.__previewSync) return;

  const PREVIEW_KEYS = ['preview', 'preview_client', 'preview_state', 'preview_open_at'];

  function normalizarFlag(raw) {
    const v = (raw || '').toString().trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'on' || v === 'yes';
  }

  function parsePreviewDate(raw) {
    if (!raw) return null;
    const parsed = new Date(String(raw).trim());
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function resolverPreview(search) {
    const params = search instanceof URLSearchParams
      ? search
      : new URLSearchParams(window.location.search);

    const previewBypass = normalizarFlag(params.get('preview'));
    const previewClient = normalizarFlag(params.get('preview_client'));
    const estadoRaw = (params.get('preview_state') || '').toString().trim().toLowerCase();
    const customDate = parsePreviewDate(params.get('preview_open_at'));

    let estadoCliente = null;
    let segundosCliente = 0;
    if (previewClient) {
      if (estadoRaw === 'open' || estadoRaw === 'abierto') {
        estadoCliente = 'open';
      } else if (estadoRaw === 'locked' || estadoRaw === 'bloqueado') {
        estadoCliente = 'locked';
        segundosCliente = 7 * 24 * 3600;
      } else if (customDate) {
        const diff = Math.ceil((customDate.getTime() - Date.now()) / 1000);
        if (diff > 0) {
          estadoCliente = 'locked';
          segundosCliente = diff;
        } else {
          estadoCliente = 'open';
        }
      } else {
        estadoCliente = 'open';
      }
    }

    return {
      previewBypass,
      previewClient,
      estadoCliente,
      segundosCliente,
      skipAuth: previewBypass || previewClient,
      params,
    };
  }

  function passthroughParams(extraKeys) {
    const page = new URLSearchParams(window.location.search);
    const out = new URLSearchParams();
    const keys = PREVIEW_KEYS.concat(extraKeys || []);
    keys.forEach((k) => {
      const v = page.get(k);
      if (v) out.set(k, v);
    });
    return out;
  }

  function buildApiUrl(path, extraKeys) {
    const q = passthroughParams(extraKeys);
    const query = q.toString();
    return query ? `${path}?${query}` : path;
  }

  function showPreviewBanner() {
    if (document.getElementById('previewBanner')) return;
    const banner = document.createElement("div");
    banner.id = 'previewBanner';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
      padding: '6px 14px', textAlign: 'center',
      background: 'linear-gradient(90deg, #ff6b81, #f5c842)',
      color: '#04071a', fontFamily: 'Cormorant Garamond, serif',
      fontWeight: '700', letterSpacing: '2px', fontSize: '.78rem',
      textTransform: 'uppercase',
      boxShadow: '0 2px 14px rgba(0,0,0,.35)',
    });
    const exit = new URLSearchParams(window.location.search);
    exit.delete('preview');
    const exitQs = exit.toString();
    const exitHref = window.location.pathname + (exitQs ? `?${exitQs}` : '');
    banner.innerHTML =
      '✦ Modo preview · Bypass visual · ' +
      `<a href="${exitHref}" style="color:#04071a;text-decoration:underline">salir</a> ✦`;
    document.body.appendChild(banner);
    document.documentElement.dataset.previewMode = '1';
  }

  window.__previewSync = {
    PREVIEW_KEYS,
    normalizarFlag,
    parsePreviewDate,
    resolverPreview,
    passthroughParams,
    buildApiUrl,
    showPreviewBanner,
  };
})();
