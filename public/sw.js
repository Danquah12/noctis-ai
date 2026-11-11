// ============================================================================
// NOCTIS SOVEREIGN SERVICE WORKER SELF-HEAL & CACHE PURGE
// Standard: W3C Service Workers
// Instantly unregisters and evicts stale asset caches to guarantee live CSS
// ============================================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener("fetch", () => {
  // Never intercept requests: always forward to live network
});
