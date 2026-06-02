// PRAEDICTA Service Worker – offline support
const CACHE_NAME = 'praedicta-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/lib/index.iife.min.js'
];

// Install event – pre-cache critical assets
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

// Activate event – clean up old caches
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

// Fetch event – serve from cache, falling back to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Don't cache Supabase API calls or Solana RPC
  if (event.request.url.includes('supabase.co') || 
      event.request.url.includes('solana.com')) {
    return; // Let these go to network
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(networkResponse => {
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