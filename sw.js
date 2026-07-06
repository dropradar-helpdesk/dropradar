const CACHE_VERSION = "dropradar-pwa-v43";
const APP_CACHE = `${CACHE_VERSION}-app`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./legal.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/maskable.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./data/drops.json",
  "./data/source-registry.json",
  "./data/storage-blueprint.json",
  "./data/contact.json",
  "./data/app-config.public.json",
  "./data/app-config.sample.json",
  "./data/intake-candidates.generated.json",
  "./data/request-watchlist.sample.json",
  "./data/source-checks/manifest.json",
  "./data/source-checks/monitor-plan.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("dropradar-pwa-") && !key.startsWith(CACHE_VERSION))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(DATA_CACHE);
  const cacheKey = new Request(request.url);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
    return cached || caches.match(fallbackUrl);
  }
}

async function cacheFirst(request) {
  const cacheKey = new Request(request.url);
  const cached = await caches.match(cacheKey);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(APP_CACHE);
    await cache.put(cacheKey, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./offline.html"));
    return;
  }

  if (url.pathname.includes("/data/")) {
    event.respondWith(networkFirst(request, "./offline.html"));
    return;
  }

  event.respondWith(cacheFirst(request));
});
