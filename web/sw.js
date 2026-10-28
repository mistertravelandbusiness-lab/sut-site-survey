/* SUT Survey — service worker (cache app-shell pour usage terrain hors ligne) */
const CACHE = 'sut-v1';
const ASSETS = [
  './', './index.html', './manifest.json', './css/app.css',
  './vendor/supabase.js', './vendor/xlsx.full.min.js',
  './js/fields.js', './js/ui.js', './js/photos.js', './js/app.js',
  './js/report.js', './js/export.js', './js/admin.js',
  './img/icon-192.png', './img/icon-512.png',
  './img/examples/01-panorama.jpg', './img/examples/02-antenne.jpg',
  './img/examples/03-acces.jpg', './img/examples/04-local-technique.jpg',
  './img/examples/05-sol.jpg', './img/examples/06-village.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // jamais de cache pour Supabase / auth / storage
  if (url.hostname.endsWith('supabase.co')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
