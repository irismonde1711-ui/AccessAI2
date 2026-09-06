// Static assets only.
//
// This worker must never cache HTML documents or API responses. Caching the
// signed-in page previously served a stale shell after login, showing missing
// or wrong user details in the header. Navigations and /api/ requests are
// therefore passed straight through to the network, untouched.

const CACHE = "accessai2-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(request) {
  if (request.method !== "GET") return false;
  // Navigations carry the authenticated shell — never touch them.
  if (request.mode === "navigate") return false;
  if (request.destination === "document") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;

  return (
    url.pathname.startsWith("/_next/static/") ||
    ["style", "script", "font", "image"].includes(request.destination)
  );
}

self.addEventListener("fetch", (event) => {
  if (!isCacheableAsset(event.request)) return;

  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
