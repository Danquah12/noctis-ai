// ============================================================================
// NOCTIS SOVEREIGN OFFLINE SERVICE WORKER (AIR-GAP RESILIENCE v4)
// Standard: W3C Service Workers & Cache API
// Security: Offline Data Containment & Zero-WAN Interception
// ============================================================================

const CACHE_NAME = "noctis-sovereign-v4";
// Only immutable static assets — NEVER cache dynamic HTML shells with ephemeral asset hashes
const STATIC_ASSETS = [
  "/favicon.svg",
  "/brand/dstrike-logo.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch((err) => {
      console.warn("[Noctis SW] Offline cache pre-population notice:", err);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Clinical API routes in offline mode: return sovereign air-gap response header
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            status: "SOVEREIGN_AIRGAP_ACTIVE",
            message: "Running in disconnected air-gapped clinical enclave. Local WebGPU and deterministic algorithms active.",
            timestamp: new Date().toISOString(),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "X-Noctis-Enclave-Mode": "AIRGAP_OFFLINE",
            },
          }
        );
      })
    );
    return;
  }

  // Cache-first only for static icons and brand images
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Navigation requests: ALWAYS network first to guarantee latest Vite hashed CSS and JS
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" }).catch(() => caches.match("/noctis"))
    );
  }
});
