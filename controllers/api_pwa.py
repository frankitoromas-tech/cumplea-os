"""
controllers/api_pwa.py - Progressive Web App glue.

Serves the manifest and the service worker so the site can be installed
on Luna's phone like a native app and works offline for the static shell.
"""
from __future__ import annotations

from flask import Blueprint, Response, jsonify, send_from_directory, url_for

pwa_bp = Blueprint("pwa", __name__)

_MANIFEST = {
    "name": "Para mi Luna",
    "short_name": "Luna",
    "description": "Un regalo de cumpleanos para Luyuromo.",
    "lang": "es",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#04071a",
    "theme_color": "#04071a",
    "icons": [
        {
            "src": "/static/DEFAULT_RECUERDOS/foto5.png",
            "sizes": "any",
            "type": "image/png",
            "purpose": "any",
        }
    ],
}


@pwa_bp.get("/manifest.webmanifest")
def manifest():
    response = jsonify(_MANIFEST)
    response.headers["Content-Type"] = "application/manifest+json; charset=utf-8"
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@pwa_bp.get("/sw.js")
def service_worker():
    # The worker file must be served from the site root so its scope
    # covers the whole app; that's why this is a Flask route rather than
    # a plain static file.
    body = _SW_TEMPLATE.format(home=url_for("regalo.index"))
    response = Response(body, mimetype="application/javascript; charset=utf-8")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


# Service worker source. Caches the app shell on install and serves from cache
# first for static assets so the app opens instantly and works offline. API
# calls always go to the network so dynamic content stays fresh.
_SW_TEMPLATE = """\
const CACHE = 'cumpleaos-shell-v2';
const SHELL = [
  '{home}',
  '/static/styless.css',
  '/static/css/immersive.css',
  '/static/script.js',
  '/static/DEFAULT_RECUERDOS/foto5.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {{
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {{}}))
  );
  self.skipWaiting();
}});

self.addEventListener('activate', (event) => {{
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
}});

self.addEventListener('fetch', (event) => {{
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Always-fresh for APIs and admin.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {{
    return;
  }}

  event.respondWith(
    caches.match(req).then((hit) => {{
      if (hit) return hit;
      return fetch(req)
        .then((res) => {{
          if (res && res.status === 200 && res.type === 'basic') {{
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {{}});
          }}
          return res;
        }})
        .catch(() => caches.match('{home}'));
    }})
  );
}});
"""


@pwa_bp.get("/static/<path:filename>")
def _placeholder_static(filename):  # pragma: no cover - never hit, Flask serves first
    return send_from_directory("static", filename)
