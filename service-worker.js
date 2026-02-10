// service-worker.js

const CACHE_NAME = "psa-cache-v23";

// Cache the app shell + key files.
// Keep this list small and stable. Views are cached on first visit.
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./assets/styles.css",
  "./assets/app.js",
  "./assets/router.js",
  "./assets/storage.js",
  "./assets/auth.js",
  "./assets/onboarding.js",
  "./assets/ai.js",
  "./assets/views.js",
  "./assets/chatbot.js",
  "./assets/nav.js",
  "./assets/theme.js",
  "./views/quiz.html",


  "./views/login.html",
  "./views/onboarding.html",
  "./views/dashboard.html",
  "./views/info.html",
  "./views/tracker.html",
  "./views/settings.html",

  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Network-first for HTML (so updates come through), cache-first for everything else.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Treat navigations AND any *.html request as HTML
  const isHTML =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // Network-first for HTML so updated views show immediately
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match("./index.html"))
        )
    );
    return;
  }

// Stale-while-revalidate for static assets (fast + updates)
event.respondWith(
  caches.match(req).then((cached) => {
    const fetchPromise = fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => cached);

    // Return cached immediately if available, but update cache in background
    return cached || fetchPromise;
  })
);
});


