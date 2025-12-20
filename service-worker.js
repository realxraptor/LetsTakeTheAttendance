// serviceWorker.js
const CACHE_NAME = "V2.7";
const CACHE_ASSETS = [
  "./",
  "./game.js",
  "./firebaseinit.js",
  "./service-worker.js",
  "./manifest.json",
  "./images/icon1.png"
];

// Kurulum (Install)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktifleştirme (Activate)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - CORRECTED
self.addEventListener("fetch", (e) => {
  // 1. If the request is NOT a GET request (e.g., POST, PUT, DELETE),
  // simply fetch it from the network and do not cache it.
  if (e.request.method !== "GET") {
    e.respondWith(fetch(e.request));
    return;
  }

  // 2. Also, ignore chrome-extension schemes or other non-http protocols if necessary
  if (!e.request.url.startsWith('http')) {
     return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // Only cache GET requests (already filtered above, but good to be safe)
          cache.put(e.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Offline: return cached version
        return caches.match(e.request);
      })
  );
});