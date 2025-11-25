/* global importScripts */
// Delegate push handling to Pusher Beams
importScripts("https://js.pusher.com/beams/service-worker.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

