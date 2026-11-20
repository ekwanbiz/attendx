// Attendx service worker: membolehkan app dipasang di telefon.
// Fail app disimpan untuk dibuka dengan cepat; data kehadiran sentiasa diambil terus dari Supabase.
const CACHE = 'attendx-v1';
const FAIL = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/data.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FAIL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Rangkaian dahulu, cache jika tiada internet (hanya untuk fail app sendiri)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, salin)); return res; })
      .catch(() => caches.match(e.request))
  );
});
