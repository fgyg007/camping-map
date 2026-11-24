const scope = self.registration.scope;
const prefix = `yebo-shell:${scope}:`;
const cacheName = prefix + version;
const entry = new URL('index.html', scope).href;
const assets = new Set(files.map(file => new URL(file, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assets].map(url => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const pageUrl = url.origin + url.pathname;
  const isEntry = request.mode === 'navigate' && (pageUrl === scope || pageUrl === entry);
  if (!isEntry && !assets.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(isEntry ? entry : url.href, { ignoreVary: true })) || fetch(request);
  })());
});
