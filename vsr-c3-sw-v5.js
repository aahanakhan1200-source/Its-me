// VSR C3 — v5: network-first for navigations + cache version bump
// Cached old JS/HTML from v4 is the suspected cause of stale broken handlers.
// Bump CACHE → v5 and force clients to claim the new worker immediately.
const CACHE = 'vsr-c3-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Same-origin only
  if(url.origin !== location.origin){
    return; // let browser handle cross-origin (cloudflare beacon, etc.)
  }
  const isHTML = e.request.mode === 'navigate'
              || (e.request.headers.get('accept')||'').includes('text/html');
  if(isHTML){
    // Network-first for HTML/manifest root so users always get the latest build
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        if(res.ok){ caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{}); }
        return res;
      }).catch(()=> caches.match('./index.html'))
    );
    return;
  }
  // Cache-first for static assets (icons, etc.) with background refresh
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      if(res.ok){
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      }
      return res;
    }).catch(()=>{}))
  );
});
