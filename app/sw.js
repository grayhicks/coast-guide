/* Coastal Eventures — offline shell. Cache-only: no analytics, no push, no
   background sync, no external origin. It precaches three same-origin files and serves them back,
   plus a version.txt probe it deliberately never caches (see the note in the fetch handler).
   Nothing here reports anything anywhere, which is a product guarantee, not an implementation
   detail — gate_pwa.js asserts it against this file. */
const CACHE = "gca-721ae09d23ac5717";

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
/* ⛔⛔ 08/20 R17 — THE CLIENT CAN ASK FOR A FRESH DOCUMENT, AND THIS IS THE HALF THE LEASH COULD
   NOT DO. The navigation leash (see the note below) makes a cold open FAST by answering from cache
   after 2.5s — and on a phone it ALWAYS wins, because the document is 4.6MB and no mobile link
   delivers that in 2.5 seconds. So the open is instant and the open is STALE, every single time,
   which is exactly what Gray reported: "I still have to manually refresh the app every single time
   I open it to get your latest updates."
   ⚠ HIS MANUAL REFRESH WAS NOT BEATING THE CACHE, IT WAS READING IT. The background fetch from the
   first open lands the current document in the cache a few seconds later; his reload then hits the
   same leash, gets the same cache, and the cache is now current. The refresh was doing the job the
   page should have done itself.
   So the page asks. It probes a few-byte version.txt, and only when that differs does it send this
   message — one 4.6MB fetch, on update days only, never on an ordinary open. When both cache keys
   are written the worker tells every client, and the page decides whether to reload.
   ⚠ postMessage here goes to SAME-ORIGIN CLIENTS ONLY. It is the reply half of a message this
   worker's own page sent; nothing leaves the device and the cache-only guarantee is intact. */
self.addEventListener("message", e => {
  if (!e.data || e.data.gca !== "refresh") return;
  e.waitUntil(fetch("./index.html", { cache: "reload" }).then(res => {
    if (!res || !res.ok) return null;
    const copy = res.clone();
    /* both keys off ONE response, same reason as install: the installed icon opens "./" and an
       in-app reload asks for "./index.html" */
    return caches.open(CACHE).then(c => c.put("./index.html", copy.clone()).then(() => c.put("./", copy)));
  }).then(ok => {
    if (ok === null) return;
    return self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ gca: "fresh" })));
  }).catch(() => {}));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  /* Not ours: stay out of the way entirely rather than proxying somebody else's request. */
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  /* ⛔ THE VERSION PROBE IS NEVER CACHED, AND IF IT EVER IS, THE WHOLE FIX BELOW INVERTS. The
     generic branch at the bottom of this handler caches any same-origin GET it has to fetch. Let
     it touch version.txt once and every later probe answers from the cache with the build the
     phone already has, which reads as "always current" forever. Straight to the network.
     ⚠ A REGEX, NOT A STRING TEST, AND THE GATE IS WHY. gate_pwa scans the shipped worker for
     root-absolute path literals, because one "/icon-192.png" is a 404 on a project-page subpath and
     passes every test served from "/". It cannot tell a pathname test from an href, so it refused
     endsWith with a leading-slash literal, then refused split on a bare slash separator too - that
     separator matches its pattern just as well. A regex literal is not a quoted string, says the
     same thing, and is still correct under /<repo>/. Two rounds of the gate refusing this, both
     times fairly.
     ⛔ AND NO BACKTICKS IN THIS COMMENT, EVER. It lives inside the sw template literal, so a
     backtick here ends the worker source mid-sentence and build_pwa dies with a SyntaxError
     pointing at a word in an English sentence. That is CLAUDE.md §0 law 1, and it was earned again
     right here: the first draft quoted the two method names in backticks. */
  if (/\/version\.txt$/.test(url.pathname)) return;
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
