/* aimR service worker: makes the installed app open and work offline.
 *  - Pages and their data: network first, cached copy when offline.
 *  - Hashed build files, icons and the OCR engine: cache first (they never change at a URL).
 * Bump VERSION to drop old caches after a breaking change. */
const VERSION = "aimr-v3";
const PAGES = ["/", "/home", "/semester", "/semester/finish", "/plan", "/plan/results", "/plan/target", "/plan/import", "/coach", "/onboarding", "/account"];
const IMMUTABLE = [/^\/_next\/static\//, /^\/ocr\//, /\.(?:png|svg|ico|woff2?)$/];

async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set(["/manifest.webmanifest", "/aimr-mark-white.svg", "/aimr-logo-horizontal-light.svg", "/icon-192.png"]);
  await Promise.all(
    PAGES.map(async (page) => {
      const res = await fetch(page, { cache: "no-cache" });
      if (!res.ok) return;
      await cache.put(page, res.clone());
      // Cache the scripts and styles each page needs, so it renders offline.
      const html = await res.text();
      for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(m[1]);
    }),
  );
  await cache.addAll([...assets]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (IMMUTABLE.some((re) => re.test(url.pathname))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Pages and router data: try the network, fall back to the cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreVary: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match(url.pathname)) || (await caches.match("/home")) || Response.error();
        return Response.error();
      }),
  );
});
