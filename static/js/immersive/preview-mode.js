/* preview-mode.js — Banner visual para ?preview=1 (flujo en script.js) */
'use strict';

(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('preview') !== '1') return;
  if (window.__previewMode) return;
  window.__previewMode = true;

  function go() {
    if (window.__previewSync?.showPreviewBanner) {
      window.__previewSync.showPreviewBanner();
    }
    console.info('[preview] bypass visual; flujo principal en script.js');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
