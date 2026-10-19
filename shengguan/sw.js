const ROOT = new URL("./", self.location.href);
const PREFIX = "tongyou-pages-" + encodeURIComponent(ROOT.pathname) + "-";
const CACHE = PREFIX + "1039aa2cc3ecb124";
const ASSETS = ["./art/jade-courtyard-v1.webp","./art/lantern-duet-v2.webp","./assets/index-BsunEirC.js","./assets/index-CNb6LRm-.css","./favicon.svg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest"].map(path => new URL(path, ROOT).href);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("index.html", ROOT).href)));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
