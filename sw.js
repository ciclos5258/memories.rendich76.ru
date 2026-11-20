/* ДОРОГА — офлайн-кэш. Работает только на http(s), локально просто не регистрируется. */

/* Поднимайте номер, когда меняете любой кэшируемый файл, кроме index.html
   (например, заменили картинку, но оставили то же имя). */
const VERSION = "v4";
const CACHE = "doroga-" + VERSION;

/* Без этих файлов сайт не работает офлайн — если хоть один не скачался, установка отменяется. */
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

/* Картинки записей. Кладём в кэш по возможности: если какой-то ещё нет в папке, это не ломает установку. */
const IMAGES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => "./img/s" + n + ".jpg");

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).then(() => Promise.allSettled(IMAGES.map((u) => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  /* страницу всегда пробуем взять из сети — правки видны сразу */
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  /* всё остальное — из кэша, с догрузкой (ошибки в кэш не кладём) */
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
