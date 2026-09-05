// Service worker mínimo: hace la app instalable. Sin caché todavía (el modo offline está diferido por decisión).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
