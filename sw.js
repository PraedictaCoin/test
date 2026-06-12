// PRAEDICTA Service Worker – offline support (v2)
const CACHE_NAME = 'praedicta-v2';

const ASSETS_TO_CACHE = [
  '/test/',
  '/test/index.html',
  '/test/js/config.js',
  '/test/js/state.js',
  '/test/js/dom.js',
  '/test/js/utils.js',
  '/test/js/market.js',
  '/test/js/render.js',
  '/test/js/profile.js',
  '/test/js/auth.js',
  '/test/js/events.js',
  '/test/js/admin.js',
  '/test/js/init.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service worker: caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Service worker: some assets failed to cache', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Never cache Supabase or Solana API requests – let them go to network
  if (event.request.url.includes('supabase.co') ||
      event.request.url.includes('solana.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if available, else fetch from network
      return cachedResponse || fetch(event.request).then(networkResponse => {
        // Cache successful responses for future offline use
        if (networkResponse.ok && event.request.url.startsWith('https://')) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});