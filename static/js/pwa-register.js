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
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(function (err) {
        console.warn('[pwa] sw registration failed:', err);
      });
  });
})();
