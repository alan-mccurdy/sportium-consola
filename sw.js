// Service worker minimo para la PWA de SINELI: permite instalar la consola como app.
// Sin cache offline a proposito: la consola es una app en vivo (Supabase/n8n); servir
// versiones viejas desde cache causaria mas problemas de los que resuelve.
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(clients.claim()); });
self.addEventListener('fetch', function (e) { /* passthrough: siempre red */ });
