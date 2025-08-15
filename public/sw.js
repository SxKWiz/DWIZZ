// Minimal service worker to prevent fetch errors
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // For now, just let all requests pass through normally
  // This prevents the "Failed to fetch" errors
  return;
});