// Placeholder service worker — prevents 404 from browser/PWA extensions looking for /sw.js
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});
