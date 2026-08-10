const SHELL_CACHE = "semra-shell-v6";
const DATA_CACHE = "semra-data-v1";
const FONT_CACHE = "semra-fonts-v1";

const SHELL = [
  "/app/",
  "/app/index.html",
  "/app/main.js",
  "/app/user-view.js",
  "/app/install.js",
  "/app/manifest.json",
  "/app/icons/icon-192.png",
  "/app/icons/icon-512.png",
  "/app/icons/icon-192-maskable.png",
  "/app/icons/icon-512-maskable.png",
  "/app/icons/apple-touch-icon.png",
  "/app/icons/favicon-32.png",
  "/app/icons/badge-96.png",
  "/shared/styles.css",
  "/shared/times-data.js",
  "/shared/state.js",
  "/shared/notification-settings.js",
  "/shared/announcements.js",
];

/** GET paths safe to cache for offline (read models only). */
const API_CACHEABLE = new Set(["/api/times", "/api/announcements"]);

// ── Install & cache ──

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => prefetchApiData())
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) =>
                k !== SHELL_CACHE &&
                k !== DATA_CACHE &&
                k !== FONT_CACHE &&
                (k.startsWith("semra-") || k.startsWith("semra-pwa-")),
            )
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Best-effort seed of read APIs while online (install). */
async function prefetchApiData() {
  try {
    const cache = await caches.open(DATA_CACHE);
    await Promise.all(
      [...API_CACHEABLE].map(async (path) => {
        try {
          const res = await fetch(path, { credentials: "same-origin" });
          if (res.ok) await cache.put(path, res.clone());
        } catch (e) {
          /* offline during install — shell still works */
        }
      }),
    );
  } catch (e) {
    /* ignore */
  }
}

function isCacheableApiGet(request, url) {
  return (
    request.method === "GET" &&
    API_CACHEABLE.has(url.pathname) &&
    url.origin === self.location.origin
  );
}

async function networkFirstApi(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) {
      await cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstNavigate(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match("/app/index.html")) ||
      new Response("Offline", { status: 503, statusText: "Offline" })
    );
  }
}

/** Google Fonts (cross-origin) — cache-first so branded typefaces survive offline. */
async function cacheFirstFont(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    // Fonts may come back opaque (no-cors CSS) — still cacheable and servable.
    if (res && (res.ok || res.type === "opaque")) {
      await cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Google Fonts (cross-origin) — handle before the same-origin short-circuit
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirstFont(request));
    return;
  }

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Network-first for page navigations
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // Network-first + cache successful GETs for times & announcements
  if (isCacheableApiGet(request, url)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Other API (POST/PATCH/subscribe/etc.) — network only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Shell / static: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

// ── Push notifications ──

self.addEventListener("push", (event) => {
  let data = {
    title: "SEMRA",
    body: "New update from Suncity Estate Mosque.",
    url: "/app/",
    type: "committee",
  };
  try {
    const payload = event.data ? event.data.json() : null;
    if (payload) data = { ...data, ...payload };
  } catch (e) {
    /* use defaults */
  }

  // Adhan / Jumu'ah reminders stay on screen until dismissed; committee
  // messages and schedule updates auto-dismiss. Different tag groups keep
  // an announcement from replacing a prayer reminder (and vice-versa).
  const isAdhan = data.type === "adhan";
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/app/icons/icon-192.png",
      badge: "/app/icons/badge-96.png",
      tag: isAdhan ? "semra-adhan" : "semra-update",
      vibrate: [200, 100, 200],
      requireInteraction: isAdhan,
      data: { url: data.url || "/app/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/app/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/app") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    }),
  );
});
