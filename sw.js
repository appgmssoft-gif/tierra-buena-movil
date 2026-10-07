// sw.js — F856 (MOV2a). Guarda solo la «cáscara» de la app para que abra sin internet.
// Nunca guarda llamadas a Supabase: lo que viene de la nube siempre se pide en vivo.
const V = 'tb-movil-f947';
const CASCARA = ['./', './index.html', './app.css', './app.js', './extras.css', './extras.js', './identidad.css', './identidad.js', './fechas.js', './rendimiento.css', './rendimiento.js', './resguardo.js', './inicio_estado.js', './inicio_lienzo.js', './suscripcion.js', './datos/suscripcion.json', './inicio_lienzo.css', './datos/inicio_catalogo.json', './sonido.js', './vendor/supabase.js', './manifest.webmanifest', './accion_mes.json', './datos/fabulas.json', './datos/juego_raices.json', './datos/canciones_ejemplo.json', './datos/musica_reflexiones.json', './datos/juntos_catalogo.json', './fonts/literata-latin-wght-normal.woff2', './fonts/fraunces-latin-wght-normal.woff2', './fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CASCARA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && /^tb-movil-/.test(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // Supabase y todo lo externo: directo a internet
  // F906: lo que casi no cambia (fuentes, íconos, Biblia, datos, librería) sale primero de la copia = abre al instante; se refresca en segundo plano
  if (/\/(fonts\/|icon-|biblia\/|datos\/|vendor\/)/.test(u.pathname)) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => {
      const red = fetch(e.request).then((x) => { if (x && x.ok) { const k = x.clone(); caches.open(V).then((c) => c.put(e.request, k)); } return x; }).catch(() => r);
      return r || red;
    }));
    return;
  }
  // El resto (código de la app): internet primero, pero si tarda más de 2,5 s (conexión lenta) se usa la copia guardada
  e.respondWith(new Promise((res) => {
    let listo = false;
    const copia = () => caches.match(e.request, { ignoreSearch: true }).then((r) => { if (r && !listo) { listo = true; res(r); } return r; });
    const t = setTimeout(copia, 2500);
    fetch(e.request).then((r) => { clearTimeout(t); if (r && r.ok) { const k = r.clone(); caches.open(V).then((c) => c.put(e.request, k)); } if (!listo) { listo = true; res(r); } }).catch(() => { clearTimeout(t); copia().then((r) => { if (!r && !listo) { listo = true; res(Response.error()); } }); });
  }));
});
