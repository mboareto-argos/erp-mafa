// Service worker do app instalável. Faz UMA coisa: sem internet, uma
// navegação mostra a tela "Sem conexão" em vez do erro do navegador.
// Não guarda páginas nem dados em cache — num ERP é melhor avisar que está
// offline do que mostrar estoque/financeiro desatualizado como se fosse atual.
const CACHE = 'erp-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      async () => (await caches.match(OFFLINE_URL)) ?? Response.error(),
    ),
  );
});
