// sw.js — F856 (MOV2a). Guarda solo la «cáscara» de la app para que abra sin internet.
// Nunca guarda llamadas a Supabase: lo que viene de la nube siempre se pide en vivo.
const V = 'tb-movil-f883';
const CASCARA = ['./', './index.html', './app.css', './app.js', './vendor/supabase.js', './manifest.webmanifest', './accion_mes.json', './datos/fabulas.json', './datos/canciones_ejemplo.json', './datos/musica_reflexiones.json', './fonts/literata-latin-wght-normal.woff2', './fonts/fraunces-latin-wght-normal.woff2', './fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CASCARA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase y todo lo externo: directo a internet
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(V).then((c) => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))));
});
