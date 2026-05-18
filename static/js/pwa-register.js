/* Tiny PWA bootstrap: registers the service worker if the browser supports it.
 * No-op on insecure origins (http://) other than localhost; that's a browser
 * requirement, not something we want to log noisily.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return;
  }
  window.addEventListener('load', function () {
    const params = new URLSearchParams(location.search);
    if (params.get('sw_reset') === '1') {
      Promise.resolve()
        .then(function () {
          return navigator.serviceWorker.getRegistrations();
        })
        .then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        })
        .then(function () {
          if (!('caches' in window)) return;
          return caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          });
        })
        .finally(function () {
          params.delete('sw_reset');
          var qs = params.toString();
          var next = location.pathname + (qs ? ('?' + qs) : '') + location.hash;
          location.replace(next);
        });
      return;
    }

    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;

    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (registration) {
        registration.update().catch(function () {});
      })
      .catch(function (err) {
        console.warn('[pwa] sw registration failed:', err);
      });
  });
})();
