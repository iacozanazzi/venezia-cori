/* ════════════════════════════════════════════════════════════════════
   Service Worker — Venezia Cori
   Strategia: stale-while-revalidate per i file del sito (parte subito
   anche senza rete, si aggiorna in background). Le chiamate a Supabase
   NON passano di qui: l'offline dei dati lo gestisce api.js con la
   cache in localStorage.
   ════════════════════════════════════════════════════════════════════ */
const CACHE = 'venezia-cori-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/vendor/supabase.min.js',
  '/js/supabase-config.js',
  '/js/chants-data.js',
  '/js/api.js',
  '/js/app.js',
  '/js/cookie.js',
  '/js/anim.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo GET e solo risorse del nostro sito o font Google.
  // Supabase e tutto il resto passano dritti alla rete.
  const isOwn   = url.origin === self.location.origin;
  const isFont  = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (e.request.method !== 'GET' || (!isOwn && !isFont)) return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fresh = fetch(e.request)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);   // offline: resta sulla copia in cache
      return cached || fresh;
    })
  );
});
