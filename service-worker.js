// serviceWorker.js
const CACHE_NAME = "v1.0.8";
const CACHE_ASSETS = [
  "./index.html",
  "./images/icon1.png",
  "manifest.json"
];

// Kurulum (Install)
self.addEventListener("install", () => {
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
});

// Fetch
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

