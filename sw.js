/* ═══════════════════════════════════════════════════════
   SERVICE WORKER — Control de Planificación Familiar
   MINSAL El Salvador
   Versión: 1.0.0
═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'planif-familiar-v1';
const CACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Nunito:wght@300;400;500;600;700;800&display=swap'
];

/* ── INSTALL: pre-cachear recursos esenciales ── */
self.addEventListener('install', event => {
  console.log('[SW] Instalando v1…');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-cacheando assets…');
      return cache.addAll(CACHE_ASSETS).catch(err => {
        console.warn('[SW] Algunos assets no se pudieron cachear:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: limpiar caches antiguas ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activado. Limpiando caches antiguas…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando cache antigua:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: Cache-first para assets locales, Network-first para fuentes ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejar GET
  if (event.request.method !== 'GET') return;

  // Fuentes de Google: network-first con fallback a cache
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locales: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback: devolver el HTML principal
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
