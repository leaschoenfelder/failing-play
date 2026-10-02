// Keeps a copy of the game so it opens without Wi-Fi. Written by scripts/site.mjs.
const CACHE = 'failing-ba0d261849be';
const FILES = ["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];

// Saved straight from the internet, past the browser's own short-term memory:
// GitHub lets browsers reuse a file for ten minutes, which would save the old one.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
    ),
  );
  self.clients.claim();
});

// The page itself: the newest from the internet if it answers within three
// seconds, otherwise the saved copy. Everything else: the saved copy first.
// "no-cache" asks GitHub every time whether the page has changed (a quick
// "no" when it hasn't), instead of trusting a copy up to ten minutes old.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(
      Promise.race([
        fetch(request.url, { cache: 'no-cache' }).then((response) => {
          // Mid-upload GitHub can briefly answer "not found": keep the saved copy then.
          if (!response.ok) throw new Error(response.status);
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('index.html', copy));
          return response;
        }),
        new Promise((_, fail) => setTimeout(fail, 3000)),
      ]).catch(() => caches.match('index.html')),
    );
    return;
  }
  event.respondWith(caches.match(request).then((saved) => saved || fetch(request)));
});
