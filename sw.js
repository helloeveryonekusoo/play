// オフラインでも遊べるようにするService Worker。
// ページ本体は最新版を優先し（通信できなければ保存版）、画像やスクリプトは保存版を優先する。
// キャッシュの中身を作り直したいときは CACHE の番号を上げる。
const CACHE = 'orbit-duel-v2';
const CORE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // 音楽（BGM）はキャッシュしない。途中から読み込む要求（Range）に対応しておらず、iPhoneで再生できなくなるため。
  if (request.headers.has('range') || new URL(request.url).pathname.includes('/audio/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached ?? fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    })),
  );
});
