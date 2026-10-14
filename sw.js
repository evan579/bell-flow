// Bell Flow service worker: keeps the app working offline.
// Bump VERSION whenever any app file changes so phones pick up the update.
// Other apps share this github.io origin, so this worker only ever touches caches named bell-flow-*.
const VERSION = 'bell-flow-v4';
const FONTS = 'bell-flow-fonts';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('bell-flow-') && k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache on first use so the type works offline afterwards.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        } catch (err) {
          return Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Opening the app: serve the saved copy instantly, even with no signal.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req))
  );
});
