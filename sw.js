// sw.js — F856 (MOV2a), F1144. Guarda solo la «cáscara» de la app para que abra sin internet.
// Nunca guarda llamadas a Supabase: lo que viene de la nube siempre se pide en vivo.
const V = 'tb-movil-f1199';
const CASCARA = ['./', './index.html', './qa.js', './qa.css', './manifest-dev.webmanifest', './privacidad.html', './privacidad.css', './app.css', './app.js', './extras.css', './extras.js', './vivero_slots.js', './identidad.css', './identidad.js', './fechas.js', './rendimiento.css', './rendimiento.js', './resguardo.js', './movimiento.js', './inicio_estado.js', './inicio_lienzo.js', './suscripcion.js', './datos/suscripcion.json', './inicio_lienzo.css', './datos/inicio_catalogo.json', './sonido.js', './tablero.js', './tablero.css', './vendor/supabase.js', './manifest.webmanifest', './accion_mes.json', './datos/fabulas.json', './datos/juego_raices.json', './datos/juego_sopa.json', './datos/juego_curiosidades.json', './datos/canciones_ejemplo.json', './datos/musica_reflexiones.json', './datos/juntos_catalogo.json', './fonts/literata-latin-wght-normal.woff2', './fonts/fraunces-latin-wght-normal.woff2', './fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2', './img/planes/yo.webp', './img/planes/calma.webp', './img/planes/gratitud.webp', './img/planes/animo.webp', './img/planes/sermon.webp', './img/planes/juan.webp', './img/planes/prov.webp', './img/planes/marcos.webp', './img/planes/lucas.webp', './img/planes/hechos.webp', './img/planes/romanos.webp', './img/planes/genesis.webp', './img/planes/efesios.webp', './img/planes/familia.webp', './img/planes/finanzas.webp', './img/planes/mente.webp', './img/jardin/dia1-luz.webp', './img/jardin/dia2-cielos.webp', './img/jardin/dia3-tierra.webp', './img/jardin/dia4-luminarias.webp', './img/jardin/dia5-aves-peces.webp', './img/jardin/dia6-animales.webp', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './img/tablero/atajo.svg', './img/tablero/cofre.svg', './img/tablero/escudo.svg', './img/tablero/ladron.svg', './img/tablero/meta.svg', './img/tablero/pausa.svg', './img/tablero/pregunta.svg', './img/tablero/relampago.svg', './img/tablero/remolino.svg', './img/tablero/rocio.svg', './img/tablero/salida.svg', './img/tablero/tormenta.svg', './img/tablero/deco/arbol.svg', './img/tablero/deco/ave.svg', './img/tablero/deco/cactus.svg', './img/tablero/deco/cangrejo.svg', './img/tablero/deco/concha.svg', './img/tablero/deco/flor.svg', './img/tablero/deco/hongo.svg', './img/tablero/deco/llama.svg', './img/tablero/deco/mariposa.svg', './img/tablero/deco/moai.svg', './img/tablero/deco/montana.svg', './img/tablero/deco/ola.svg', './img/tablero/deco/pez.svg', './img/tablero/deco/sol.svg', './img/piezas/brote.svg', './img/piezas/condor.svg', './img/piezas/guanaco.svg', './img/piezas/zorro.svg', './img/tablero/ui/dado.svg', './datos/aprender_cursos.json', './datos/salud_mental_que_es.json', './datos/salud_mental_herramientas.json', './datos/mente_en_juego.json', './datos/crecimiento_ideas.json', './datos/jardin_creacion.json', './img/tablero/deco/oveja.svg', './img/tablero/ui/tapa_cofre.svg', './img/tablero/arreo.svg', './img/tablero/puerta.svg', './img/tablero/memoria.svg', './img/tablero/cosecha.svg'];
// F1163: cada archivo se guarda por separado. Antes, addAll() dejaba sin instalar el service worker si UN archivo faltaba (sin offline ni actualizaciones).
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => Promise.all(CASCARA.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting())); });
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
