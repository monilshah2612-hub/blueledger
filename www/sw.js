// Offline support for the web version. Network first, so updates show up as soon as you are online.
var CACHE = 'blueledger-v1.3';
var FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/styles.css', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/core.js', 'js/views.js', 'js/forms.js', 'js/more.js', 'js/firebase-config.js', 'js/firebase.bundle.js', 'js/sync.js', 'js/boot.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;   // never touch calls to the sync server
  e.respondWith(fetch(r).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
});
