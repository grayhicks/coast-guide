/* Next Up — offline shell. Cache-only: no analytics, no push, no
   background sync, no external origin. It precaches three same-origin files and serves them back.
   Nothing here reports anything anywhere, which is a product guarantee, not an implementation
   detail — gate_pwa.js asserts it against this file. */
const CACHE = "gca-08e8ee6696d4f646";
const SHELL = ["./", "./index.html", "./app.webmanifest"];

self.addEventListener("install", e => {
  /* skipWaiting so a returning user gets the new build on the next open rather than the one after */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  /* Not ours: stay out of the way entirely rather than proxying somebody else's request. */
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)
      .then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match("./index.html")))
  );
});
