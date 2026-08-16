/* US Wildlife Explorer — offline service worker (dependency-free).
 *
 * National parks have little/no cell signal, and the wildlife data is a
 * static client-side cache, so the app can run fully offline once visited.
 *
 * Strategy (deliberately conservative — a stale SPA is worse than no SW):
 *   • Navigations  → network-first, fall back to cached shell. Online users
 *     always get the freshest app; offline users still get a working app.
 *   • Same-origin GET assets (Vite-hashed JS/CSS/img + the wildlife tier
 *     chunks) → cache-first. Filenames are content-hashed, so a new build
 *     yields new URLs; old entries are purged on version bump.
 *   • /api/* (eBird/NPS/iNat proxies, ai-funfact) → never cached: always
 *     live, never served stale.
 *   • Cross-origin (map tiles, photos) → passthrough (browser HTTP cache).
 */
const VERSION = 'v1';
const CORE = `wm-core-${VERSION}`;
const RUNTIME = `wm-runtime-${VERSION}`;
// us-states.json is precached (not just runtime-cached) so state outlines work
// offline even for a user who never opened a state map while online. It's
// static geography, so a cache-first copy never goes stale. Deliberately NOT
// bumping VERSION for this: install re-runs addAll on any changed sw.js, while
// a bump would purge the multi-MB wildlife tier chunks and re-download them.
const CORE_URLS = ['/', '/manifest.webmanifest', '/icon.svg', '/us-states.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE).then((c) => c.addAll(CORE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;   // tiles, photos → passthrough
  if (url.pathname.startsWith('/api/')) return;       // proxies → always live

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const c = await caches.open(CORE);
        c.put('/', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('/')) || (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  // Hashed/immutable assets + wildlife tier chunks: cache-first.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const resp = await fetch(request);
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const c = await caches.open(RUNTIME);
        c.put(request, resp.clone());
      }
      return resp;
    } catch {
      return cached || Response.error();
    }
  })());
});

// Lets a freshly-installed SW take over without a manual reload loop.
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
