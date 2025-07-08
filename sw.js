const CACHE_NAME = 'pwa-cache-v2'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'assets/images/1',
  'assets/images/DNA.png',
  'assets/images/DNALOGO.png',
  'icons/base_run.svg',
  'icons/easy_run.svg',
  'icons/fartlek_run.svg',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  'icons/interval_run.svg',
  'icons/long_run.svg',
  'icons/rest_day.svg',
  'icons/tempo_run.svg'
  // Add other assets like fonts if locally hosted, or other images/icons if discovered
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // console.log('Opened cache and caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache files during install:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            // console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Ensure new SW takes control immediately
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We don't want to cache API calls to Google Sheets or other external resources here by default.
                // This example focuses on caching local static assets.
                // More sophisticated logic would be needed to differentiate.
                // For now, if it's not in urlsToCache initially, it won't be added dynamically unless specifically handled.
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetch failed; returning offline page instead.', error);
          // Optionally, return a custom offline fallback page if specific routes fail:
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html'); // You would need to create and cache offline.html
          // }
          // For now, just let the browser handle the error for non-cached resources.
        });
      })
  );
});
