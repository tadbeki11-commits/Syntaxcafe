// Minimal service worker for PWA installability.
// No offline caching — requests pass straight through to the network.
// Chrome/Android require a service worker with a fetch handler before
// they will show the "Install app" prompt.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: let the browser handle the request normally.
});
