const CACHE_NAME = "couple-app-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // 如果快取有，就回傳快取；否則去聯網抓取
      return response || fetch(event.request).catch(() => {
        // 如果連聯網抓取都失敗（例如斷網或 API 噴掉），至少不要報錯
        console.log("Fetch 失敗，可能是 API 連線問題");
      });
    })
  );
});