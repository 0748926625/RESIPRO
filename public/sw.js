// Deliberately minimal caching strategy (§26, §40): this app is not offline-capable for
// anything data-driven. Only immutable, hashed build assets are cached; every navigation
// still goes to the network first, falling back to a static "you're offline" page rather
// than pretending stale content is current. Booking/payment/availability data is never
// cached here.
const SHELL_CACHE = "residence-pro-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Mutations (POST/Server Actions/etc.) must always hit the network directly.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Hashed, content-addressed Next.js build assets never change under a given URL, so
  // cache-first is safe and speeds up repeat visits.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Page navigations: always try the network first. Only fall back to the offline page
  // when there is truly no connection — never serve a stale cached page, since every
  // page in this app renders per-user, per-session data.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Everything else (API routes, Supabase requests, RSC payloads) is left untouched and
  // goes straight to the network.
});
