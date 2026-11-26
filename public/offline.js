const root = new URL('./', self.location.href);
const cacheName = 'vision-shell:' + root.pathname;
const base = root.pathname;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('offline-assets.json', root), { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline manifest unavailable');
    const files = await response.json();
    const cache = await caches.open(cacheName);
    await cache.addAll(files.map(path => new Request(new URL(path, root), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== root.origin || !url.pathname.startsWith(base)) return;
  const shell = new URL('index.html', root);
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(async response => {
      if (response.ok) return response;
      return await (await caches.open(cacheName)).match(shell) || response;
    }).catch(async () => (await caches.open(cacheName)).match(shell)));
    return;
  }
  if (!url.pathname.startsWith(base + '_expo/') && !url.pathname.startsWith(base + 'assets/')) return;
  event.respondWith(caches.open(cacheName).then(async cache => await cache.match(request) || fetch(request)));
});
