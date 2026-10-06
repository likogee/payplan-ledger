const CACHE = 'payplan-ledger-v18';
const PRECACHE_URLS = ['./', './index.html', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function() {});
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  // CDN resources (Chart.js, jsPDF, html2canvas) — cache-first so the app
  // truly works offline after first load.
  if (req.url.indexOf('cdn.jsdelivr.net') !== -1) {
    e.respondWith(caches.match(req).then(function(hit) {
      return hit || fetch(req).then(function(res) {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return res;
      }).catch(function() { return hit; });
    }));
    return;
  }

  // Navigation requests — network-first with cache fallback to index.html.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function(res) {
      const clone = res.clone();
      caches.open(CACHE).then(function(c) { c.put(req, clone); });
      return res;
    }).catch(function() {
      return caches.match(req).then(function(hit) {
        return hit || caches.match('./index.html');
      });
    }));
    return;
  }

  // Everything else — cache-first with network fallback.
  e.respondWith(caches.match(req).then(function(hit) {
    return hit || fetch(req).then(function(res) {
      if (res && res.status === 200 && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, clone); });
      }
      return res;
    }).catch(function() { return hit; });
  }));
});