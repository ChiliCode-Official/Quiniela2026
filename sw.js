const CACHE_NAME = 'quiniela-cache-v19';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Excluir llamadas de la API de Google Apps Script y peticiones que no sean GET
  if (event.request.url.includes('script.google.com') || event.request.method !== 'GET') {
    return; // Ir directamente a la red sin interceptar ni almacenar en caché
  }

  const urlObj = new URL(event.request.url);
  const isRoot = urlObj.pathname === '/' || urlObj.pathname.endsWith('/index.html') || urlObj.pathname.endsWith('/');
  
  const isStaticAsset = isRoot || urlsToCache.some(url => {
    const assetName = url.replace('./', '');
    return assetName && urlObj.pathname.endsWith(assetName);
  });

  if (isStaticAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});
