/**
 * OpenGame Studio — Service Worker
 *
 * Strategy:
 *   • App shell (HTML, CSS, JS, icons)  →  Cache-first (fast loads)
 *   • API calls (/api/*)                →  Network-only (always fresh)
 *   • Game files (/games/*)             →  Stale-while-revalidate
 */

const CACHE_VERSION = 'opengame-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: always go to the network, never cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) {
    return; // fall through to default browser fetch
  }

  // Generated game assets: stale-while-revalidate
  if (url.pathname.startsWith('/games/')) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        return cached ?? networkFetch;
      }),
    );
    return;
  }

  // App shell: cache-first with network fallback
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && request.method === 'GET') {
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        // Offline fallback: return the cached index.html for navigation requests
        if (request.mode === 'navigate') {
          return cache.match('/index.html') ?? Response.error();
        }
        return Response.error();
      }
    }),
  );
});
