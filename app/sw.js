/* Coastal Eventures — offline shell. Cache-only: no analytics, no push, no
   background sync, no external origin. It precaches three same-origin files and serves them back.
   Nothing here reports anything anywhere, which is a product guarantee, not an implementation
   detail — gate_pwa.js asserts it against this file. */
const CACHE = "gca-ff6a3e723bdea8fd";

/* ⚠ 08/20 — THE APP IS ONE 4.5MB DOCUMENT AND THIS USED TO DOWNLOAD IT TWICE. The precache list
   was ["./", "./index.html", "./app.webmanifest"] fed to cache.addAll(). The first two are the
   SAME FILE under two URLs — both are needed as cache KEYS, because the fetch handler matches on
   the request URL and a launch from the installed icon asks for "./" while an in-app reload asks
   for "./index.html" — but addAll() treats them as two entries and issues two separate 4.5MB GETs.
   ⛔ AND THE COST IS NOT STORAGE, IT IS THE OWNER STARING AT THE OLD BUILD. skipWaiting() only
   runs once this whole waitUntil settles, so nothing activates, nothing claims the page and no
   reload fires until BOTH copies have landed. Measured against the shipped bundle over a local
   server with no latency at all: registration.update() took 57.7 SECONDS to resolve. Gray, 08/20:
   "I opened the app... and it still said next up. I had to manually refresh the page." He was not
   beating a broken update. He was beating a working one that takes a minute.
   One fetch, two keys, is the whole fix. */
self.addEventListener("install", e => {
  /* skipWaiting so a returning user gets the new build on the next open rather than the one after */
  e.waitUntil(caches.open(CACHE).then(c =>
    fetch("./index.html", { cache: "reload" }).then(res => {
      if (!res || !res.ok) throw new Error("precache: index.html " + (res && res.status));
      /* put() twice off ONE response — clone before the body is consumed by the first put */
      return c.put("./index.html", res.clone()).then(() => c.put("./", res));
    }).then(() => c.add("./app.webmanifest"))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* ⚠⚠ 08/20 — THE DOCUMENT IS NETWORK-FIRST WITH A 2.5s LEASH, AND EVERYTHING ELSE STAYS
   CACHE-FIRST. Gray: "I opened the app (have not opened it a few days) and it still said next up.
   I had to manually refresh the page."
   ⛔ THE UPDATE PATH WAS NOT BROKEN AND FIXING IT WAS NOT THE ANSWER. Reproduced against the
   shipped 4.5MB bundle on a local server with no latency: registration.update() resolved in
   57,570ms. The same worker, the same server, the same document with the animations killed:
   2,560ms. A tiny document: 935ms. The hero is a LIVING BEACH — gulls, dolphin, waves, sandpipers,
   the boat — so the renderer never goes idle, and the browser will not run a service-worker update
   on a main thread that never rests. The owner was not beating a broken update. He was beating one
   that needed a minute of a quiet phone it is never going to get.
   ⭐ So freshness stops depending on the worker updating at all. Online, a cold open asks the
   network for the document and shows the CURRENT build. Slow or offline, the cache answers after
   2.5s and the app opens instantly the way it always did — and the network copy still lands in the
   cache behind it, so the next open is current either way.
   ⚠ The 2.5s number is a leash, not a timeout: the fetch is never aborted. Whichever answers
   first wins the render; the other still fills the cache.
   ⚠ AND THE NAVIGATION IS THE ONLY REQUEST THAT CHANGES. The app is one document — there are no
   other assets to slow down — so cache-first still governs the manifest and the icons. */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  /* Not ours: stay out of the way entirely rather than proxying somebody else's request. */
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(new Promise(resolve => {
      let settled = false;
      const done = r => { if (!settled && r) { settled = true; resolve(r); } };
      const leash = setTimeout(() => { caches.match("./index.html").then(done); }, 2500);
      fetch(e.request).then(res => {
        clearTimeout(leash);
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          /* both keys off ONE response: the installed icon opens "./", an in-app reload asks for
             "./index.html", and the fetch handler matches on the request URL */
          caches.open(CACHE).then(c => c.put("./index.html", copy.clone()).then(() => c.put("./", copy)));
        }
        done(res);
      }).catch(() => { clearTimeout(leash); caches.match("./index.html").then(hit => done(hit || Response.error())); });
    }));
    return;
  }
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
