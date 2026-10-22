// Service worker de 404Bank: lo justo para que la app se instale y abra rápido.
// Guarda solo los archivos de la app (/assets, con nombre versionado) y la pantalla sin conexión.
// Nunca guarda la API ni Clerk: un banco no muestra saldos viejos sin conexión.
const CACHE = '404bank-v1';
const SIN_CONEXION = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([SIN_CONEXION, '/web-app-manifest-192x192.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Backend, Clerk y fuentes van directo a la red, sin pasar por acá.
  if (url.origin !== self.location.origin) return;

  // Páginas: siempre de la red (así cada deploy se ve al toque); sin conexión, la pantalla de aviso.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(SIN_CONEXION)));
    return;
  }

  // JS y CSS de Vite: el nombre cambia con cada build, así que se pueden guardar para siempre.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((guardado) => guardado || fetch(request).then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return respuesta;
      }))
    );
  }
});
