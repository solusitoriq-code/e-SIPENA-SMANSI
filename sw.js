const SHELL_CACHE = 'esipena-shell-v15';
const RUNTIME_CACHE = 'esipena-runtime-v15';
const PDFJS_ORIGIN = 'https://cdn.jsdelivr.net';
const PDFJS_PATH_PREFIX = '/npm/pdfjs-dist@4.8.69/';
const MODEL_VIEWER_ORIGIN = 'https://ajax.googleapis.com';
const MODEL_VIEWER_PREFIX = '/ajax/libs/model-viewer/';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/print.css',
  './manifest.json',
  './data/esipena_data.json',
  './assets/images/logo-smansi.webp',
  './assets/icons/icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './js/admin-auth.js',
  './js/admin-book-modal.js',
  './js/admin-catalog-modals.js',
  './js/admin-catalog-views.js',
  './js/admin-curation-modal.js',
  './js/admin-service.js',
  './js/admin-views.js',
  './js/app.js',
  './js/audio.js',
  './js/barcode-scanner.js',
  './js/book-modal.js',
  './js/book-reader-ui.js',
  './js/community-views.js',
  './js/config.js',
  './js/data-service.js',
  './js/media-upload.js',
  './js/modal-helper.js',
  './js/model-3d-modal.js',
  './js/nav-controls.js',
  './js/pdf-cache.js',
  './js/pdf-slide-viewer.js',
  './js/public-views.js',
  './js/qr-helper.js',
  './js/service-helpers.js',
  './js/submission-service.js',
  './js/submission-views.js',
  './js/text-flipbook.js',
  './js/tracking-panel.js',
  './js/ui-utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
      caches.open(RUNTIME_CACHE).then((cache) =>
        Promise.allSettled([
          cache.add(`${PDFJS_ORIGIN}${PDFJS_PATH_PREFIX}build/pdf.min.mjs`),
          cache.add(`${PDFJS_ORIGIN}${PDFJS_PATH_PREFIX}build/pdf.worker.min.mjs`)
        ])
      )
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Runtime cache-first untuk modul PDF.js & model-viewer CDN agar tetap berfungsi saat offline
  if (
    (url.origin === PDFJS_ORIGIN && url.pathname.startsWith(PDFJS_PATH_PREFIX)) ||
    (url.origin === MODEL_VIEWER_ORIGIN && url.pathname.startsWith(MODEL_VIEWER_PREFIX))
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Biarkan proxy PDF /api/* dan skrip service worker langsung ke jaringan
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('/sw.js')) {
    return;
  }

  // Runtime cache-first untuk sampul, placeholder, model 3D, audio & gambar lokal (on-demand)
  if (
    url.pathname.includes('/assets/covers/') ||
    url.pathname.includes('/assets/images/') ||
    url.pathname.includes('/assets/icons/') ||
    url.pathname.includes('/assets/placeholders/') ||
    url.pathname.includes('/assets/3d_models/') ||
    url.pathname.includes('/assets/audios/')
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network-first untuk HTML, JS, CSS, dan dataset JSON agar pembaruan kode langsung aktif
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const isShellAsset =
            request.mode === 'navigate' ||
            url.pathname === '/' ||
            url.pathname.includes('/data/') ||
            /\.(?:html|css|js|json|webmanifest)$/i.test(url.pathname);
          const targetCache = isShellAsset ? SHELL_CACHE : RUNTIME_CACHE;
          const copy = response.clone();
          caches.open(targetCache).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((res) => {
          if (res) return res;
          return request.mode === 'navigate' ? caches.match('./index.html') : undefined;
        })
      )
  );
});
