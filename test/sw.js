
/* Moje AVANTI 1.5 – offline application shell */
const CACHE = 'moje-avanti-v15';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
const INDEX = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // The HTML shell is essential; optional resources must not block installation.
    const response = await fetch(INDEX, {cache: 'reload'});
    if (!response.ok) throw new Error('Cannot cache application shell');
    await cache.put(INDEX, response);
    await Promise.allSettled(SHELL.filter(path => path !== './index.html').map(async path => {
      const url = new URL(path, self.registration.scope).href;
      const res = await fetch(url, {cache: 'reload'});
      if (res.ok) await cache.put(url, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('moje-avanti-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' &&
    (url.pathname.endsWith('/test/') || url.pathname.endsWith('/test/index.html'))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const shell = await cache.match(INDEX);
      if (shell) return shell;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(INDEX, response.clone());
        return response;
      } catch (error) {
        return Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
