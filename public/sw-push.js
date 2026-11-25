/* Noctis Global Web Push Service Worker ($0 Worldwide Incoming Call Notification)
 * Intentionally does NOT intercept fetch requests or cache assets.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Incoming Noctis Internet Call" };
  }
  const title = data.title || "Incoming Noctis Call";
  const body = data.body || "Tap Answer Call to connect for $0";
  const url = data.url || "/noctis";
  const roomId = data.roomId || String(Date.now());
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/brand/dstrike-logo.png",
      badge: "/brand/dstrike-logo.png",
      tag: "noctis-call-" + roomId,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 180, 300, 180, 300],
      data: { url, roomId },
      actions: [
        { action: "answer", title: "Answer Call" },
        { action: "dismiss", title: "Dismiss" },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = (event.notification.data && event.notification.data.url) || "/noctis";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        try {
          if (client.url.indexOf(self.location.origin) === 0 && "focus" in client) {
            return client.navigate(targetUrl).then((naved) => (naved || client).focus());
          }
        } catch {
          /* open new window fallback */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
