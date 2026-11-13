// Service worker do Solário: guarda o app para funcionar offline.
const V = 'solario-v1';
const ASSETS = []; // preenchido por scripts/precache.mjs no build
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(SHELL);
    await Promise.allSettled(ASSETS.map((u) => c.add(u))); // um arquivo que falhe não derruba os demais
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return; // dados da nuvem nunca vêm do cache
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((x) => { const cp = x.clone(); caches.open(V).then((c) => c.put('/', cp)); return x; }).catch(() => caches.match('/', { ignoreVary: true })));
    return;
  }
  e.respondWith(caches.match(r, { ignoreVary: true }).then((hit) => hit || fetch(r).then((x) => {
    if (x.ok || x.type === 'opaque') { const cp = x.clone(); caches.open(V).then((c) => c.put(r, cp)); }
    return x;
  })));
});
