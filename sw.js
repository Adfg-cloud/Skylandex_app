const CACHE_NAME = 'skylandex-v1';
const CORE_FILES = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Al instalar, guardamos los archivos propios de la app (el "esqueleto").
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// Al activar, borramos cachés de versiones antiguas si las hubiera.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia:
// - Para la propia app (HTML/manifest/iconos): cache primero, con red de respaldo.
// - Para todo lo demás (p.ej. las imágenes que pegas por URL): red primero,
//   y si no hay conexión, lo que haya en caché de una visita anterior.
//   Cada imagen que se carga con éxito se va guardando sola para la próxima vez.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isCore = CORE_FILES.some((f) => event.request.url.endsWith(f.replace('./', '')));

  if (isCore) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
