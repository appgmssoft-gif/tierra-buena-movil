/* F1216 · Inicio: profundidad y decoración premium.
   Dibuja detrás del Inicio un paisaje de varios planos (cielo con luz, rayos, nubes, cordillera lejana, bruma, colinas,
   follaje de primer plano desenfocado, grano de papel y viñeta) para cada lugar y hora del día.
   Todo es SVG generado aquí (sin imágenes, sin atributo style: CSP). Solo anima transform y opacidad, en pocos grupos. */
(function () {
  'use strict';
  const W = 390, H = 844;

  // ---------- Azar con semilla: el paisaje se ve igual cada vez ----------
  function azar(sem) { let a = sem >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const f = (n) => Math.round(n * 10) / 10;

  // ---------- Hora del día: cielos claros y luminosos (el texto del Inicio es oscuro) ----------
  function franja() { const h = new Date().getHours(); return h < 5 ? 'noche' : h < 8 ? 'alba' : h < 12 ? 'manana' : h < 17 ? 'dia' : h < 20 ? 'tarde' : 'noche'; }
  const CIELO = {
    noche:  { a: '#8e9ad8', b: '#c9bdec', c: '#f3d6d0', luz: '#fff0d6', disco: '#fffaf0', luna: true,  rayo: .10 },
    alba:   { a: '#b9d2f0', b: '#f6cdb8', c: '#ffe6bd', luz: '#ffd391', disco: '#fff2c9', luna: false, rayo: .30 },
    manana: { a: '#a9d8f3', b: '#cfeaf5', c: '#fff3d3', luz: '#fff2bd', disco: '#fffbe6', luna: false, rayo: .26 },
    dia:    { a: '#a0d1f1', b: '#c4e4f4', c: '#f1f8ef', luz: '#fffbe3', disco: '#ffffff', luna: false, rayo: .22 },
    tarde:  { a: '#c2b9ea', b: '#f7c7a9', c: '#ffe0b3', luz: '#ffbe7d', disco: '#fff0cc', luna: false, rayo: .32 }
  };
  // Colores por lugar: lejos (claro, poco saturado) → cerca (oscuro, saturado): perspectiva aérea
  const LUGAR = {
    bosque:  { lejos: '#b4c4dc', medio: '#8fa9b8', cerro: '#6f9a82', c1: '#9cc98a', c2: '#80b574', c3: '#64a05e', suelo: '#4f8a55', follaje: '#27553b', follaje2: '#3a7a4d', bruma: '#ffffff' },
    desierto:{ lejos: '#e8c4a0', medio: '#dba982', cerro: '#cf9467', c1: '#e3b27a', c2: '#d29a62', c3: '#bd8350', suelo: '#a56b3b', follaje: '#5b4a2c', follaje2: '#7a6a3a', bruma: '#fff1dc' },
    cordillera: { lejos: '#c3d2e6', medio: '#9bb2cb', cerro: '#8ea3b6', c1: '#d9d09c', c2: '#c9be88', c3: '#b2a574', suelo: '#80775a', follaje: '#5a6440', follaje2: '#7a8750', bruma: '#ffffff' },   // F1231: altiplano, tonos fríos arriba y paja dorada abajo
    costa:   { lejos: '#b9d3e0', medio: '#8cc3d1', cerro: '#7aa9b4', c1: '#f0dcb4', c2: '#e6cb98', c3: '#d6b87c', suelo: '#bf9f64', follaje: '#5d7a4a', follaje2: '#86a063', bruma: '#ffffff' }
  };

  // ---------- Piezas ----------
  // Hoja alargada (pinada) como trazo: punta en (x,y) con ángulo a (rad), largo l, ancho w
  function hoja(x, y, a, l, w) {
    const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = x + Math.cos(a) * l * .5, my = y + Math.sin(a) * l * .5;
    return 'M' + f(x) + ' ' + f(y) + 'Q' + f(mx + nx) + ' ' + f(my + ny) + ' ' + f(ex) + ' ' + f(ey) + 'Q' + f(mx - nx) + ' ' + f(my - ny) + ' ' + f(x) + ' ' + f(y) + 'Z';
  }
  // Helecho: espina curva con hojuelas por pares que se achican hacia la punta
  function helecho(cx, cy, largo, ang, curva, n, ancho) {
    let d = ''; const px = [], py = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = ang + curva * t, r = largo * t; px.push(cx + Math.cos(ang) * r + Math.sin(ang) * curva * r * r / largo * .9); py.push(cy + Math.sin(ang) * r - Math.cos(ang) * curva * r * r / largo * .9); }
    for (let i = 1; i < n; i++) {
      const t = i / n, tam = ancho * (1 - t * .8) * (1 + .25 * Math.sin(t * 3)), a0 = Math.atan2(py[i + 1] - py[i - 1], px[i + 1] - px[i - 1]);
      d += hoja(px[i], py[i], a0 - 1.15, tam, tam * .20) + hoja(px[i], py[i], a0 + 1.15, tam, tam * .20);
    }
    let esp = 'M' + f(px[0]) + ' ' + f(py[0]); for (let i = 1; i <= n; i++) esp += 'L' + f(px[i]) + ' ' + f(py[i]);
    return { hojas: d, espina: esp };
  }
  // Mata de pasto largo (costa, desierto): hojas curvas desde un punto
  function pasto(cx, cy, n, alto, abre, sem) {
    const R = azar(sem); let d = '';
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (R() - .5) * abre, l = alto * (.6 + R() * .5), c = (R() - .5) * 24; const ex = cx + Math.cos(a) * l + c, ey = cy + Math.sin(a) * l; d += 'M' + f(cx - 2.2) + ' ' + f(cy) + 'Q' + f(cx + c * .2) + ' ' + f(cy - l * .6) + ' ' + f(ex) + ' ' + f(ey) + 'Q' + f(cx + c * .2 + 3) + ' ' + f(cy - l * .55) + ' ' + f(cx + 2.2) + ' ' + f(cy) + 'Z'; }
    return d;
  }
  // Hilera de copas de pino sobre una cresta (bosque lejano)
  function copas(y0, x0, x1, alto, paso, sem) {
    const R = azar(sem); let d = '';
    for (let x = x0; x < x1; x += paso * (.7 + R() * .6)) { const h = alto * (.6 + R() * .6), w = h * .34; d += 'M' + f(x) + ' ' + f(y0) + 'L' + f(x + w) + ' ' + f(y0) + 'L' + f(x) + ' ' + f(y0 - h) + 'L' + f(x - w) + ' ' + f(y0) + 'Z'; }
    return d;
  }
  // Brillos sobre el agua
  function destellos(cx, y0, y1, sem) {
    const R = azar(sem); let d = '';
    for (let y = y0; y < y1; y += 5 + R() * 4) { const t = (y - y0) / (y1 - y0), w = 6 + t * 70 * R(), x = cx + (R() - .5) * t * 40; d += '<rect class="ip-dest" x="' + f(x - w / 2) + '" y="' + f(y) + '" width="' + f(w) + '" height="1.6" rx=".8"/>'; }
    return d;
  }

  // ---------- Paisajes por lugar (viewBox 390×844) ----------
  // F1225 · Fase 3: lejanías con perspectiva aérea (más lejos = más pálido), luz de borde y siluetas con carácter.
  const cresta = (fn, x0, x1, base) => { let d = 'M' + x0 + ' ' + f(fn(x0)); for (let x = x0 + 6; x <= x1; x += 6) d += 'L' + x + ' ' + f(fn(x)); return d + 'L' + x1 + ' ' + base + 'L' + x0 + ' ' + base + 'Z'; };
  const filo = (fn, x0, x1) => { let d = 'M' + x0 + ' ' + f(fn(x0)); for (let x = x0 + 6; x <= x1; x += 6) d += 'L' + x + ' ' + f(fn(x)); return d; };
  function copasR(fn, x0, x1, sem, rmin, rmax, paso, c1, c2) {   // copas redondeadas (bosque nativo) con un toque de luz arriba a la izquierda
    const R = azar(sem); let a = '', b = '';
    for (let x = x0; x < x1; x += paso * (.6 + R() * .8)) { const r = rmin + R() * (rmax - rmin), y = fn(x) + r * .25;
      a += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r) + '" ry="' + f(r * 1.12) + '"/>'; b += '<ellipse cx="' + f(x - r * .3) + '" cy="' + f(y - r * .38) + '" rx="' + f(r * .5) + '" ry="' + f(r * .55) + '"/>'; }
    return '<g fill="' + c1 + '">' + a + '</g><g fill="' + c2 + '" opacity=".5">' + b + '</g>';
  }
  function ondas(x0, x1, y0, y1, n, sem, col, op) {   // marcas finas de arena o de agua
    const R = azar(sem); let d = '';
    for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), w = 14 + R() * 30; d += 'M' + f(x) + ' ' + f(y) + 'q' + f(w / 4) + ' -2.2 ' + f(w / 2) + ' 0t' + f(w / 2) + ' 0'; }
    return '<path fill="none" stroke="' + col + '" stroke-opacity="' + op + '" stroke-width="1" stroke-linecap="round" d="' + d + '"/>';
  }
  // F1228 · Fase 6: construcciones emblemáticas (faro, capilla chilota, iglesia de adobe). De noche sus luces se encienden.
  const luzV = (lit) => lit ? '#ffd77a' : '#62768e';
  function faro(x, y, k, fr) {
    const noche = fr === 'noche', lit = noche || fr === 'tarde' || fr === 'alba';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
      + '<defs><linearGradient id="ipHazL" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff4b8" stop-opacity=".6"/><stop offset="1" stop-color="#fff4b8" stop-opacity="0"/></linearGradient><linearGradient id="ipHazR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff4b8" stop-opacity=".6"/><stop offset="1" stop-color="#fff4b8" stop-opacity="0"/></linearGradient></defs>'
      + (noche ? '<g class="ip-haz" transform="translate(0 -54)"><path d="M0 0L-170-20L-170 20Z" fill="url(#ipHazL)"/><path d="M0 0L170-20L170 20Z" fill="url(#ipHazR)"/></g>' : '')
      + '<path d="M-36 6Q-10-4 12-2Q34-4 48 8Z" fill="#86a063"/>'
      + '<path d="M-32-9L-21-18L-10-9Z" fill="#c0392b"/><rect x="-30" y="-9" width="20" height="9" fill="#f7f4ee"/><rect x="-24" y="-6" width="4" height="6" fill="#7a4f2e"/><rect x="-18" y="-7" width="4" height="3.5" fill="' + luzV(lit) + '"/>'   // casa del farero
      + '<path d="M-9 0L-6-48H6L9 0Z" fill="#f7f4ee"/><path d="M3 0L6-48H6.2L9 0Z" fill="#b9a98f" opacity=".5"/><path d="M2.5-48L6-48L9 0L2.5 0Z" fill="#b9a98f" opacity=".35"/>'
      + '<path d="M-8.2-12H8.2L7.8-20H-7.8Z" fill="#c0392b"/><path d="M-7.1-34H7.1L6.7-42H-6.7Z" fill="#c0392b"/>'
      + '<rect x="-9.5" y="-50" width="19" height="2.4" rx=".6" fill="#3a3f4a"/><path d="M-8.5-50V-53M-4-50V-53M0-50V-53M4-50V-53M8.5-50V-53" stroke="#3a3f4a" stroke-width=".7"/>'
      + '<rect x="-4.6" y="-59" width="9.2" height="9" fill="' + (lit ? '#fff3b0' : '#cfe3ee') + '" stroke="#3a3f4a" stroke-width=".8"/><path d="M0-59V-50M-2.3-59V-50M2.3-59V-50" stroke="#3a3f4a" stroke-width=".5"/>'
      + '<path d="M-6.4-59Q0-70 6.4-59Z" fill="#c0392b"/><path d="M0-68.5V-72" stroke="#3a3f4a" stroke-width="1" stroke-linecap="round"/>'
      + (lit ? '<circle cx="0" cy="-54.5" r="' + (noche ? 22 : 13) + '" fill="url(#ipHalo)" opacity="' + (noche ? .95 : .6) + '"/>' : '') + '</g>';
  }
  const faroHeroe = () => { try { return !!(window.TBCasillas && window.TBCasillas.elegida('costa', 0) === 0); } catch (e) { return false; } };
  function capilla(x, y, k, fr) {
    const lit = fr === 'noche' || fr === 'tarde' || fr === 'alba', w = luzV(lit);
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
      + '<ellipse cx="2" cy="1.6" rx="27" ry="3.2" fill="#10200f" opacity=".22"/>'
      + '<path fill="#f1e4c8" d="M-18 0V-20L0-32L18-20V0Z"/><path fill="#b99a6c" opacity=".35" d="M7 0V-27L18-20V0Z"/>'
      + '<path fill="none" stroke="#b99a6c" stroke-opacity=".5" stroke-width=".6" d="M-18-4H18M-18-8H18M-18-12H18M-18-16H17M-12-20H12"/>'
      + '<path fill="none" stroke="#5a7fb5" stroke-width="1.5" stroke-linejoin="round" d="M-18 0V-20L0-32L18-20V0"/>'
      + '<rect x="-8" y="-45" width="16" height="45" fill="#f1e4c8"/><path fill="#b99a6c" opacity=".35" d="M3-45H8V0H3Z"/><path fill="none" stroke="#b99a6c" stroke-opacity=".5" stroke-width=".6" d="M-8-8H8M-8-12H8M-8-16H8M-8-20H8M-8-24H8M-8-28H8"/>'
      + '<path d="M-8 0V-45M8 0V-45" stroke="#5a7fb5" stroke-width="1.2"/>'
      + '<path d="M-3-39V-32Q0-29 3-32V-39Q0-42-3-39Z" fill="#3d3225"/><circle cx="0" cy="-34" r="1.4" fill="#c9a24a"/>'
      + '<path d="M-10-45L0-66L10-45Z" fill="#5a7fb5"/><path d="M0-66L10-45H3Z" fill="#2f4f80" opacity=".55"/><path d="M-10-45H10" stroke="#3f5f90" stroke-width="1"/>'
      + '<path d="M0-66V-74M-3-71.5H3" stroke="#6b4a2a" stroke-width="1.3" stroke-linecap="round"/>'
      + '<path d="M-3.2 0V-9Q0-13 3.2-9V0Z" fill="#7a4f2e"/><path d="M-3.2-9Q0-13 3.2-9" fill="none" stroke="#5a7fb5" stroke-width=".9"/>'
      + '<path d="M-14-6V-12Q-12-15-10-12V-6Z" fill="' + w + '"/><path d="M10-6V-12Q12-15 14-12V-6Z" fill="' + w + '"/>'
      + (lit ? '<circle cx="-12" cy="-9" r="9" fill="url(#ipHalo)" opacity=".8"/><circle cx="12" cy="-9" r="9" fill="url(#ipHalo)" opacity=".8"/>' : '') + '</g>';
  }
  function iglesiaAdobe(x, y, k, fr) {
    const lit = fr === 'noche' || fr === 'tarde' || fr === 'alba', w = luzV(lit);
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
      + '<ellipse cx="0" cy="1.6" rx="34" ry="3.2" fill="#4a2a10" opacity=".22"/>'
      + '<path d="M-40 0H-26V-5H-40Z" fill="#d8c29a"/>'
      + '<path d="M-22 0V-18Q-22-20-20-20H14Q16-20 16-18V0Z" fill="#f6ecd8"/><path d="M8 0V-20H16V0Z" fill="#a8825a" opacity=".42"/><path d="M-23-20H17V-22.4H-23Z" fill="#e6d3b0"/>'
      + '<path d="M-22 0V-44H-9V0Z" fill="#f6ecd8"/><path d="M-13 0V-44H-9V0Z" fill="#c9a878" opacity=".3"/><path d="M-23-44H-8V-46.4H-23Z" fill="#e6d3b0"/>'
      + '<path d="M-19-38V-31Q-15.5-27.5-12-31V-38Q-15.5-42-19-38Z" fill="#4a3a2a"/><path d="M-17.4-32.5Q-15.5-30-13.6-32.5Z" fill="#c9a24a"/><circle cx="-15.5" cy="-33" r="1.5" fill="#c9a24a"/>'
      + '<path d="M-15.5-46.4V-55M-19.5-52H-11.5" stroke="#6b4a2a" stroke-width="1.5" stroke-linecap="round"/>'
      + '<path d="M-3 0V-9Q0-13 3-9V0Z" fill="#6b4a2a"/><path d="M-4-9Q0-14 4-9" fill="none" stroke="#e6d3b0" stroke-width="1"/>'
      + '<rect x="8" y="-13" width="3.4" height="4.6" rx="1.2" fill="' + w + '"/><rect x="-6" y="-14" width="0" height="0"/>'
      + '<path d="M16 0H21.5L16-9Z" fill="#e6d3b0"/>'
      + '<path fill="none" stroke="#c9a878" stroke-opacity=".5" stroke-width=".6" d="M-22-6H16M-22-12H16M-22-30H-9M-22-24H-9"/>'
      + '<path d="M27 0Q28.5-10 26-17" fill="none" stroke="#6b4a2a" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="24" cy="-21" rx="10.5" ry="7" fill="#8a9a4a"/><ellipse cx="32" cy="-24" rx="9" ry="6.4" fill="#6f8a3c"/><ellipse cx="21" cy="-23" rx="5" ry="2.6" fill="#b8c878" opacity=".55"/>'
      + (lit ? '<circle cx="9.7" cy="-11" r="9" fill="url(#ipHalo)" opacity=".8"/>' : '') + '</g>';
  }

  function paisaje(lugar, p) {
    if (lugar === 'desierto') {
      const d1 = (x) => 340 - 14 * Math.sin(x / 48 + .4) - 6 * Math.sin(x / 19), d2 = (x) => 366 - 16 * Math.sin(x / 55 + 2.2) - 5 * Math.sin(x / 17 + 1);
      return '<defs><linearGradient id="ipMesa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d8b4"/><stop offset="1" stop-color="' + p.lejos + '"/></linearGradient>'
        + '<linearGradient id="ipDunaL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#6e3f1e" stop-opacity=".2"/></linearGradient></defs>'
        + '<path fill="#c9bccf" opacity=".78" d="M96 302Q146 278 173 238Q180 226 187 238Q216 278 266 302Z"/>'                                  // volcán lejano, azulado por la distancia
        + '<path fill="#8f7fa0" opacity=".2" d="M180 228Q216 278 266 302L204 302Z"/><path fill="#fff" opacity=".85" d="M169 247Q174 237 180 229Q186 237 191 247Q186 243 182 250Q178 244 175 251Q172 245 169 247Z"/>'
        + '<path fill="url(#ipMesa)" d="M0 322L0 300L40 296L58 268L128 266L146 296L214 300L236 282L300 280L322 298L390 302L390 322Z"/>'      // mesas lejanas con estratos
        + '<path fill="#b97c4c" opacity=".16" d="M104 266L128 266L146 296L118 296ZM272 280L300 280L322 298L288 298Z"/>'
        + '<path fill="none" stroke="' + p.medio + '" stroke-opacity=".4" stroke-width="1.1" d="M60 274H127M62 282H133M64 290H141M216 291H236M238 289H300M240 296H318"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round" d="M58 268L128 266M236 282L300 280"/>'
        + '<path fill="' + p.medio + '" d="' + cresta(d1, 0, 390, 372) + '"/><path fill="url(#ipDunaL)" d="' + cresta(d1, 0, 390, 372) + '"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" d="' + filo(d1, 0, 390) + '"/>'
        + iglesiaAdobe(96, f(d1(96)) + 3, 1.2, franja())
        + '<g class="ip-bruma b1"><rect x="-20" y="318" width="430" height="46" fill="url(#ipBruma)"/></g>'
        + '<path fill="' + p.cerro + '" d="' + cresta(d2, 0, 390, 430) + '"/><path fill="url(#ipDunaL)" d="' + cresta(d2, 0, 390, 430) + '"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" d="' + filo(d2, 0, 390) + '"/>'
        + ondas(10, 380, 336, 360, 7, 5, p.suelo, .2) + ondas(10, 380, 374, 420, 8, 9, p.suelo, .18)
        + '<g class="ip-bruma b2"><rect x="-20" y="372" width="430" height="52" fill="url(#ipBruma)"/></g>';
    }
    if (lugar === 'cordillera') {   // F1231 · Fase 2a: volcán nevado, dos cordones, bofedal y laguna altiplánica con reflejo
      return '<defs><linearGradient id=\"ipVolc\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#b3c4dc\"/><stop offset=\"1\" stop-color=\"#e4ecf4\"/></linearGradient>'
        + '<linearGradient id=\"ipNieve\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\"1\" stop-color=\"#d6e2f0\"/></linearGradient>'
        + '<linearGradient id=\"ipLaguna\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#b9dbe8\"/><stop offset=\"1\" stop-color=\"#6fa4c0\"/></linearGradient></defs>'
        + '<path fill=\"' + p.lejos + '\" opacity=\".55\" d=\"M0 330L0 262L30 238L58 252L96 214L126 240L160 226L196 262L230 246L262 270L330 252L360 232L390 248L390 330Z\"/>'   // cordón lejano, pálido
        + '<path fill=\"url(#ipVolc)\" d=\"M136 346L258 200Q274 168 290 152Q300 146 310 152Q326 168 342 200L462 346Z\"/>'   // volcán de cumbre truncada
        + '<path fill=\"#7d96b4\" opacity=\".3\" d=\"M310 152Q326 168 342 200L462 346L322 346Z\"/>'   // lado en sombra
        + '<path fill=\"none\" stroke=\"#6f87a6\" stroke-opacity=\".3\" stroke-width=\"1.1\" stroke-linecap=\"round\" d=\"M284 214L274 262M298 206L296 270M318 210L330 266M334 224L352 280\"/>'   // quebradas
        + '<path fill=\"url(#ipNieve)\" d=\"M258 200Q274 168 290 152Q300 146 310 152Q326 168 342 200L332 194L324 212L314 196L304 214L294 196L284 212L274 196L266 210Z\"/>'   // casquete de nieve
        + '<path fill=\"none\" stroke=\"#fff\" stroke-opacity=\".6\" stroke-width=\"1.4\" stroke-linecap=\"round\" d=\"M262 196L290 152L302 147\"/>'   // filo iluminado
        + '<path fill=\"' + p.medio + '\" d=\"M-10 346L-10 268L24 238L50 206L76 236L106 192L138 230L172 256L200 292L226 346Z\"/>'   // cordón cercano a la izquierda
        + '<path fill=\"#6f87a6\" opacity=\".28\" d=\"M106 192L138 230L172 256L200 292L226 346L150 346Z\"/>'
        + '<g fill=\"url(#ipNieve)\"><path d=\"M50 206L64 226L56 222L50 232L40 224Z\"/><path d=\"M106 192L120 214L112 210L106 220L96 210Z\"/></g>'
        + '<g class=\"ip-bruma b1\"><rect x=\"-20\" y=\"290\" width=\"430\" height=\"60\" fill=\"url(#ipBruma)\"/></g>'
        + '<path fill=\"#b9bd86\" opacity=\".9\" d=\"M0 350Q90 338 190 346T390 342V376H0Z\"/>'   // bofedal
        + '<path fill=\"url(#ipLaguna)\" d=\"M22 356Q70 342 134 346Q212 342 266 356Q214 372 134 370Q62 372 22 356Z\"/>'   // laguna
        + '<path fill=\"none\" stroke=\"#fff\" stroke-opacity=\".55\" stroke-width=\"1.2\" stroke-linecap=\"round\" d=\"M60 356H108M130 352H190M96 362H170M200 358H238\"/>'
        + '<path fill=\"none\" stroke=\"#fff\" stroke-opacity=\".4\" stroke-width=\"1\" d=\"M22 356Q70 342 134 346Q212 342 266 356\"/>'
        + '<g class=\"ip-bruma b2\"><rect x=\"-20\" y=\"346\" width=\"430\" height=\"44\" fill=\"url(#ipBruma)\"/></g>';
    }
    if (lugar === 'costa') {
      return '<defs><linearGradient id=\"ipHoriz\" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        + '<linearGradient id="ipRoca" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fb0b8"/><stop offset="1" stop-color="#5e707c"/></linearGradient></defs>'
        + '<path fill="' + p.lejos + '" opacity=".8" d="M0 318C60 304 110 296 170 306C220 314 262 322 310 330L0 330Z"/>'                                    // cabo lejano
        + '<path fill="' + p.lejos + '" opacity=".5" d="M240 330C280 318 330 312 390 316L390 332Z"/>'
        + '<rect x="0" y="322" width="390" height="150" fill="url(#ipMar)"/>'
        + '<rect x="0" y="322" width="390" height="34" fill="url(#ipHoriz)"/>'                                                                           // brillo del horizonte
        + '<path fill="url(#ipRoca)" d="M-10 336L-10 292Q10 272 38 280Q60 284 78 298Q96 310 118 336Z"/>'                                                  // acantilado con estratos
        + '<path fill="' + p.follaje2 + '" d="M-10 292Q10 272 38 280Q60 284 78 298Q60 292 40 290Q16 288 -10 300Z"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1" d="M-4 306H70M0 316H90M4 326H104"/>'
        + (faroHeroe() ? '' : faro(30, 279, 1.15, franja()))   // F1230: si la estructura elegida ya es el faro, no se dibuja otro de fondo
        + '<path fill="#6c808c" d="M300 334L303 308L309 298L315 310L319 334Z"/><path fill="#fff" opacity=".28" d="M303 308L309 298L310 334L303 334Z"/>'   // farellón
        + '<path fill="#6c808c" d="M326 334L328 318L333 311L338 320L341 334Z"/><ellipse cx="320" cy="334" rx="28" ry="3" fill="#fff" opacity=".6"/>'
        + '<ellipse cx="310" cy="338" rx="6" ry="14" fill="#35505e" opacity=".18"/>'
        + '<g fill="#fff" opacity=".9">' + destellos(268, 326, 430, 7) + '</g>'
        + '<path class="ip-ola o1" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" d="M0 392C30 386 60 398 90 392S150 386 180 392S240 398 270 392S330 386 390 392"/>'
        + '<path class="ip-ola o2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" d="M-10 420C20 412 52 426 84 418S146 410 178 418S244 426 276 418S340 410 400 418"/>'
        + ondas(10, 380, 340, 370, 9, 3, '#fff', .45) + ondas(10, 380, 372, 440, 8, 6, '#fff', .35)
        + '<g class="ip-bruma b1"><rect x="-20" y="306" width="430" height="34" fill="url(#ipBruma)"/></g>'
        + '<path fill="' + p.c1 + '" d="M0 458C60 440 120 452 190 446C260 440 330 436 390 448L390 520L0 520Z"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3" stroke-linecap="round" d="M0 458C60 440 120 452 190 446C260 440 330 436 390 448"/>';   // espuma en la orilla
    }
    const rB = (x) => 352 - 11 * Math.sin(x / 64 + 2.4) - 6 * Math.sin(x / 25 + .5), rA = (x) => 300 - 13 * Math.sin(x / 52 + .6) - 7 * Math.sin(x / 21 + 1.3);   // bosque: cordillera nevada en dos filas, cerros con copas redondas y niebla
    return '<defs><linearGradient id="ipMA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.lejos + '"/><stop offset="1" stop-color="#e2ebf3"/></linearGradient>'
      + '<linearGradient id="ipNieve" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d6e2f0"/></linearGradient></defs>'
      + '<path fill="' + p.lejos + '" opacity=".45" d="M0 304L40 262L84 284L150 236L206 272L248 244L312 270L360 246L390 262L390 330L0 330Z"/>'              // fila lejana, más pálida
      + '<path fill="url(#ipMA)" d="M0 330L0 262L34 236L52 214L66 228L92 196L118 156L136 176L152 168L176 204L202 232L226 190L254 150L272 120L296 158L312 146L340 190L364 214L390 204L390 330Z"/>'
      + '<g fill="#7d96b4" opacity=".35"><path d="M118 156L136 176L152 168L176 204L150 330L118 330Z"/><path d="M272 120L296 158L312 146L340 190L316 330L272 330Z"/></g>'   // lado en sombra
      + '<path fill="none" stroke="#6f87a6" stroke-opacity=".3" stroke-width="1.1" stroke-linecap="round" d="M126 178L131 216M137 178L146 232M284 160L289 212M297 160L307 228M254 152L246 196M106 178L100 214"/>'   // quebradas
      + '<path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M92 196L118 156M226 190L254 150L272 120"/>'   // filo iluminado
      + '<g fill="url(#ipNieve)"><path d="M118 156L136 176L128 172L122 182L112 172L104 178Z"/><path d="M272 120L296 158L286 152L278 164L268 150L256 158L254 150Z"/><path d="M92 196L104 206L96 204L90 212L80 204Z"/><path d="M226 190L238 206L230 202L224 212L214 204Z"/></g>'
      + '<g class="ip-bruma b1"><rect x="-20" y="236" width="430" height="70" fill="url(#ipBruma)"/></g>'
      + '<path fill="' + p.medio + '" d="' + cresta(rA, -6, 396, 400) + '"/>'
      + copasR(rA, -6, 396, 11, 6, 11, 9, p.cerro, '#a4cfa2')
      + '<g class="ip-bruma b2"><rect x="-20" y="288" width="430" height="64" fill="url(#ipBruma)"/></g>'
      + '<path fill="#6f9e86" d="' + cresta(rB, -6, 396, 430) + '"/>' + copasR(rB, -6, 396, 7, 9, 15, 11, '#4d8568', '#9cc9a0')   // segunda fila: cerros verdes más cerca
      + '<path fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2" d="' + filo(rB, -6, 396) + '"/>'
      + capilla(312, f(rB(312)) + 5, 1.2, franja());   // F1413 · sin árboles detrás de la capilla ni de las cabañas: la escena queda limpia
  }

  function colinas(lugar, p) {
    const rim = (d) => '<path fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.6" stroke-linecap="round" d="' + d + '"/>';
    const luz = (cx, cy, rx) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + f(rx * .14) + '" fill="' + p.bruma + '" opacity=".16" filter="url(#ipSuave)"/>';   // charco de luz sobre el pasto
    const cola = ' L390 ' + H + ' L0 ' + H + 'Z';
    if (lugar === 'costa') {
      const a = 'M0 506C80 488 160 500 240 494C310 490 356 496 390 500', b = 'M0 600C70 584 140 596 210 588C290 580 340 590 390 596';
      return '<path fill="url(#ipC2)" d="' + a + cola + '"/>' + rim(a) + ondas(10, 380, 520, 590, 8, 13, p.suelo, .22) + luz(120, 540, 100)
        + '<path fill="url(#ipC3)" d="' + b + cola + '"/>' + rim(b) + ondas(10, 380, 612, 700, 8, 17, p.suelo, .22);
    }
    const a = 'M0 392C60 366 130 378 200 372C270 366 330 372 390 382', b = 'M0 452C80 424 150 444 230 436C300 428 350 436 390 446', c = 'M0 540C70 516 150 532 230 524C300 516 350 526 390 534';
    return '<path fill="url(#ipC1)" d="' + a + cola + '"/>' + rim(a) + luz(260, 420, 120)
      + '<path fill="url(#ipC2)" d="' + b + cola + '"/>' + rim(b) + luz(110, 500, 110) + (lugar === 'desierto' ? ondas(10, 380, 462, 520, 8, 21, p.suelo, .2) : '')
      + '<path fill="url(#ipC3)" d="' + c + cola + '"/>' + rim(c) + luz(280, 590, 120);
  }

  // F1226 · Fase 4: suelo y primer plano. Piezas de detalle (flores, hongos, rocas, conchas) en los bordes; el centro queda libre para el árbol.
  const pet = (n, rx, ry, off, col, op) => { let o = ''; for (let i = 0; i < n; i++) o += '<ellipse cx="0" cy="' + -off + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + f(i * 360 / n) + ')" fill="' + col + '"' + (op ? ' opacity="' + op + '"' : '') + '/>'; return o; };
  const flor6 = (x, y, k, c1, c2, c3) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' + pet(6, 4.2, 8.5, 8, c1) + pet(6, 2, 5, 7, c2, .85) + '<circle r="3.4" fill="' + c3 + '"/><circle cx="-1" cy="-1" r="1.1" fill="#fff" opacity=".6"/></g>';
  const hojaF = (x, y, l, r, c) => '<path transform="translate(' + x + ' ' + y + ') rotate(' + r + ')" d="M0 0Q' + f(l * .3) + ' ' + f(-l * .22) + ' ' + l + ' 0Q' + f(l * .3) + ' ' + f(l * .2) + ' 0 0Z" fill="' + c + '"/>';
  const roca = (cx, cy, rx, ry, c1, c2, musgo) => '<g transform="translate(' + cx + ' ' + cy + ')">'
    + '<ellipse cx="' + f(rx * .1) + '" cy="1" rx="' + f(rx * 1.1) + '" ry="' + f(ry * .22) + '" fill="#10200f" opacity=".22"/>'
    + '<path fill="' + c1 + '" d="M' + -rx + ' 0C' + -rx + ' ' + f(-ry * 1.1) + ' ' + f(rx * .2) + ' ' + f(-ry * 1.5) + ' ' + f(rx * .8) + ' ' + f(-ry * .8) + 'C' + f(rx * 1.05) + ' ' + f(-ry * .4) + ' ' + rx + ' 0 ' + rx + ' 0Z"/>'
    + '<path fill="' + c2 + '" opacity=".45" d="M' + f(rx * .2) + ' 0C' + f(rx * .3) + ' ' + f(-ry * .9) + ' ' + f(rx * .7) + ' ' + f(-ry * .95) + ' ' + f(rx * .8) + ' ' + f(-ry * .8) + 'C' + f(rx * 1.05) + ' ' + f(-ry * .4) + ' ' + rx + ' 0 ' + rx + ' 0Z"/>'
    + '<ellipse cx="' + f(-rx * .35) + '" cy="' + f(-ry * .78) + '" rx="' + f(rx * .3) + '" ry="' + f(ry * .13) + '" fill="#fff" opacity=".4" transform="rotate(-18 ' + f(-rx * .35) + ' ' + f(-ry * .78) + ')"/>'
    + (musgo ? '<path fill="' + musgo + '" d="M' + f(-rx * .72) + ' ' + f(-ry * .5) + 'C' + f(-rx * .5) + ' ' + f(-ry * 1.38) + ' ' + f(rx * .3) + ' ' + f(-ry * 1.62) + ' ' + f(rx * .72) + ' ' + f(-ry * .95) + 'C' + f(rx * .3) + ' ' + f(-ry * 1.12) + ' ' + f(-rx * .3) + ' ' + f(-ry * 1.05) + ' ' + f(-rx * .72) + ' ' + f(-ry * .5) + 'Z"/>' : '') + '</g>';
  const tallo = (x0, y0, x1, y1, col, w) => '<path d=\"M' + x0 + ' ' + y0 + 'Q' + f(x0 + (x1 - x0) * .15) + ' ' + f((y0 + y1) / 2) + ' ' + x1 + ' ' + y1 + '\" fill=\"none\" stroke=\"' + col + '\" stroke-width=\"' + (w || 1.6) + '\" stroke-linecap=\"round\"/>';
  const hongo = (x, y, k) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M-2.4 0L-3.2-9Q0-11 3.2-9L2.4 0Z" fill="#efe3c8"/><path d="M-13-9Q-13-23 0-23Q13-23 13-9Q0-6-13-9Z" fill="#c8362f"/><path d="M-13-9Q0-6 13-9Q0-4-13-9Z" fill="#8f1f1c" opacity=".5"/><ellipse cx="-5" cy="-18" rx="4" ry="2" fill="#fff" opacity=".28"/><circle cx="-4" cy="-16" r="1.8" fill="#fff" opacity=".92"/><circle cx="4.5" cy="-14" r="1.4" fill="#fff" opacity=".92"/><circle cx="0" cy="-20" r="1.1" fill="#fff"/></g>';
  const concha = (x, y, k, r, c1, c2) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + k + ')"><path d="M0 0L-15-17Q-8-27 0-26Q8-27 15-17Z" fill="' + c1 + '"/><path d="M0 0L-15-17M0 0L-9-23M0 0L0-26M0 0L9-23M0 0L15-17" stroke="' + c2 + '" stroke-width="1" fill="none" opacity=".7"/><path d="M-5 0H5L3 3.4H-3Z" fill="' + c2 + '"/><path d="M-12-18Q0-23 12-18" stroke="#fff" stroke-opacity=".55" fill="none"/></g>';
  const estrellaMar = (x, y, k, r, c) => { let d = '', pts = ''; for (let i = 0; i < 10; i++) { const a = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? 6.5 : 17; d += (i ? 'L' : 'M') + f(Math.cos(a) * rr) + ' ' + f(Math.sin(a) * rr); }
    for (let i = 0; i < 5; i++) { const a = (i * 72 - 90) * Math.PI / 180; pts += '<circle cx="' + f(Math.cos(a) * 9) + '" cy="' + f(Math.sin(a) * 9) + '" r="1.1"/><circle cx="' + f(Math.cos(a) * 13) + '" cy="' + f(Math.sin(a) * 13) + '" r=".9"/>'; }
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + k + ')"><path d="' + d + 'Z" fill="' + c + '" stroke="#b5502f" stroke-width=".9" stroke-linejoin="round"/><g fill="#ffe3b8" opacity=".85">' + pts + '</g><circle r="2" fill="#ffe3b8"/></g>'; };
  const piedras = (x, y, sem, c1, c2) => { const R = azar(sem); let o = ''; for (let i = 0; i < 7; i++) { const dx = (R() - .5) * 46, dy = (R() - .5) * 16, rx = 3 + R() * 5; o += '<ellipse cx="' + f(x + dx) + '" cy="' + f(y + dy) + '" rx="' + f(rx) + '" ry="' + f(rx * .66) + '" fill="' + (i % 2 ? c1 : c2) + '"/><ellipse cx="' + f(x + dx - rx * .3) + '" cy="' + f(y + dy - rx * .25) + '" rx="' + f(rx * .4) + '" ry="' + f(rx * .2) + '" fill="#fff" opacity=".45"/>'; } return o; };
  const ananuca = (x, y, k) => '<g class="ip-fl" transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
    + hojaF(0, 0, 40, -128, '#78a04a') + hojaF(2, 0, 46, -98, '#6a9442') + hojaF(-2, 0, 36, -158, '#86ad54')
    + [[-16, -44, .85], [2, -62, 1.1], [17, -40, .8], [-5, -28, .65], [24, -57, .72]].map((q) => tallo(0, 0, q[0], q[1], '#6b8a3a', 1.5) + flor6(q[0], q[1], q[2], '#e8452c', '#f6a02a', '#3a1f12')).join('') + '</g>';
  const cactus = (x, y) => '<g transform="translate(' + x + ' ' + y + ')">'
    + '<path fill="#5a8a48" d="M-14 230V16Q-14 0 0 0Q14 0 14 16V230Z"/><path fill="#8ebd6a" opacity=".5" d="M-14 230V16Q-14 0 -6 0Q-9 40-8 230Z"/><path fill="#33602c" opacity=".35" d="M14 230V16Q14 0 6 0Q9 40 8 230Z"/>'
    + '<path fill="none" stroke="#3b6b34" stroke-opacity=".55" stroke-width="1.2" d="M-6 6V230M0 2V230M6 6V230"/>'
    + '<path fill="#5a8a48" d="M-14 150H-34Q-46 150 -46 138V104Q-46 94 -36 94Q-28 94 -28 104V130H-14Z"/><path fill="#8ebd6a" opacity=".45" d="M-46 138V104Q-46 94 -40 94Q-42 120-41 150H-34Q-46 150 -46 138Z"/>'
    + '<path fill="none" stroke="#e9d9a8" stroke-opacity=".7" stroke-width="1" stroke-linecap="round" d="M-9 22l-3-2M9 34l3-2M-9 58l-3-2M9 80l3-2M-9 104l-3-2M9 126l3-2M-9 150l-3-2M9 176l3-2M-9 200l-3-2"/>'
    + '<ellipse cx="0" cy="2" rx="9" ry="5" fill="#f08fb0"/><ellipse cx="0" cy="1" rx="5" ry="3" fill="#ffd0e0"/></g>';
  const llareta = (x, y, k) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><ellipse cx="2" cy="1" rx="22" ry="4" fill="#2a2a12" opacity=".2"/><path fill="#8d9f4a" d="M-22 0Q-24-16-8-20Q4-26 16-18Q26-12 22 0Z"/><path fill="#b4c266" d="M-18-4Q-18-14-6-17Q4-22 12-15Q4-14-2-8Q-10-4-18-4Z"/><g fill="#dfe79a" opacity=".85"><circle cx="-8" cy="-12" r="1.6"/><circle cx="2" cy="-16" r="1.5"/><circle cx="11" cy="-10" r="1.5"/><circle cx="-1" cy="-8" r="1.3"/></g></g>';
  const DES2 = '<defs><filter id="ipDes2" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation=".6"/></filter></defs>';
  function decor(lugar, p) {
    // F1413 · Inicio limpio: si la persona apagó la decoración, no se dibuja (rocas, hongos, flores decorativas).
    try { if (localStorage.getItem('tb_inicio_decor') === 'no') return ''; } catch (e) { /* sin guardar: se muestra */ }
    if (lugar === 'bosque') {   // F1285: decoración mínima bajo el tronco (una roca y dos hongos) para bajar el ruido visual
      return DES2 + '<g filter="url(#ipDes2)">' + roca(366, 748, 52, 32, '#7f8c82', '#4c5a52', '#6faa59') + hongo(322, 750, 1.2) + hongo(344, 754, .85) + '</g>';
    }
    if (lugar === 'desierto') {
      return DES2 + '<g filter="url(#ipDes2)">' + cactus(374, 560) + roca(64, 750, 40, 24, '#b07a4c', '#7a4a28') + roca(316, 752, 30, 17, '#bd8a5a', '#85532f')
        + ananuca(42, 744, 1) + ananuca(338, 742, .9) + ananuca(104, 756, .55) + piedras(190, 760, 5, '#c9a173', '#a77a4c') + '</g>';
    }
    if (lugar === 'cordillera') {   // F1231: rocas frías, llaretas (cojines de altura), una añañuca entre piedras
      return DES2 + '<g filter="url(#ipDes2)">' + roca(366, 748, 52, 32, '#8d939b', '#565d66', '#9aa85a') + roca(48, 750, 38, 22, '#9aa0a8', '#5f666f', '#a7b566')
        + llareta(318, 742, 1.25) + llareta(96, 756, .95) + llareta(204, 764, .7) + ananuca(332, 748, .62) + piedras(150, 766, 6, '#a9adb3', '#80858d') + '</g>';
    }
    return DES2 + '<g filter="url(#ipDes2)">'
      + '<path d="M-12 746Q36 724 98 738" fill="none" stroke="#8d7456" stroke-width="11" stroke-linecap="round"/><path d="M-10 742Q36 721 96 734" fill="none" stroke="#b8a07e" stroke-width="3" stroke-linecap="round" opacity=".7"/><circle cx="24" cy="735" r="2.6" fill="#6f5a40"/>'
      + roca(366, 748, 50, 30, '#7d8d94', '#46565f') + '<ellipse cx="350" cy="750" rx="44" ry="4" fill="#fff" opacity=".45"/>'
      + estrellaMar(52, 712, 1.1, -18, '#f08a4b') + estrellaMar(344, 700, .7, 30, '#e8704a') + concha(318, 730, 1.25, 14, '#f3dcc4', '#c9976b') + concha(104, 752, .85, -34, '#f6e4d2', '#d0a07a')
      + piedras(60, 758, 3, '#8f9aa0', '#c9c2b2') + piedras(220, 764, 8, '#a3a8aa', '#d6cfbf') + '</g>';
  }

  // Primer plano: follaje grande, oscuro y desenfocado que enmarca la pantalla (profundidad de campo)
  function primerPlano(lugar, p) {
    let g = '';
    if (lugar === 'bosque') {
      const A = helecho(-14, 800, 250, -1.02, .55, 14, 76), B = helecho(404, 810, 270, -2.14, -.5, 14, 80);
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + A.hojas + B.hojas + '"/></g>';
    } else if (lugar === 'desierto') {
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + pasto(26, 820, 16, 170, 1.9, 21) + pasto(372, 826, 18, 190, 1.9, 33) + '"/>'
        + '<path fill="' + p.follaje2 + '" opacity=".85" d="' + pasto(-4, 700, 10, 110, 1.4, 5) + pasto(396, 690, 10, 110, 1.4, 9) + '"/>'
        + '<ellipse cx="46" cy="846" rx="64" ry="22" fill="#8a5a33"/><ellipse cx="350" cy="848" rx="70" ry="24" fill="#8a5a33"/></g>';
    } else if (lugar === 'cordillera') {   // F1231: ichu (paja brava) dorada y rocas grises que enmarcan
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="#a99a56" d="' + pasto(22, 828, 22, 190, 1.7, 61) + pasto(372, 832, 22, 210, 1.7, 67) + '"/>'
        + '<path fill="' + p.follaje2 + '" opacity=".85" d="' + pasto(-6, 716, 12, 118, 1.3, 13) + pasto(398, 702, 12, 118, 1.3, 19) + '"/>'
        + '<ellipse cx="60" cy="850" rx="58" ry="20" fill="#6b6f78"/><ellipse cx="340" cy="852" rx="66" ry="22" fill="#5f636c"/></g>';
    } else {
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + pasto(20, 828, 20, 200, 1.6, 41) + pasto(372, 832, 22, 220, 1.6, 47) + '"/>'
        + '<path fill="' + p.follaje2 + '" opacity=".9" d="' + pasto(-6, 720, 12, 120, 1.3, 3) + pasto(398, 704, 12, 120, 1.3, 8) + '"/>'
        + '<ellipse cx="64" cy="850" rx="58" ry="20" fill="#7a6a58"/><ellipse cx="338" cy="852" rx="66" ry="22" fill="#6f6050"/></g>';
    }
    return g + decor(lugar, p);
  }

  // F1227 · Fase 5: vida y movimiento (gaviotas, luciérnagas, estrella fugaz, hojas y pétalos) y tinte según la hora.
  const gaviota = (x, y, k, cl) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><g class="ip-ave ' + cl + '"><path transform="translate(0 1.6)" d="M0 0Q6-8 12 0Q18-8 24 0" fill="none" stroke="#6f7f8f" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/><path d="M0 0Q6-8 12 0Q18-8 24 0" fill="none" stroke="#f6f9fb" stroke-width="2" stroke-linecap="round"/></g></g>';
  function vida(lugar, fr) {
    const noche = fr === 'noche', R = azar(lugar.length * 211 + 5); let o = '', bk = '';
    for (let i = 0; i < 9; i++) { const x = 15 + R() * 360, y = 380 + R() * 330, r = 7 + R() * 9; bk += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="#fff" opacity=".1"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/>'; }
    o += '<g class="ip-bok">' + bk + '</g>';
    if (noche) {
      for (let i = 0; i < 16; i++) o += '<g transform="translate(' + f(20 + R() * 350) + ' ' + f(380 + R() * 340) + ')"><g class="ip-lu l' + (i % 3 + 1) + '"><circle r="9" fill="url(#ipHalo)"/><circle r="1.7" fill="#fff6b0"/></g></g>';
      o += '<defs><linearGradient id="ipFug" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>'
        + '<g transform="translate(300 70)"><g class="ip-fug"><path d="M0 0L-64 24" stroke="url(#ipFug)" stroke-width="1.8" stroke-linecap="round"/><circle r="1.9" fill="#fff"/></g></g>';
      return o;
    }
    if (lugar === 'costa') o += gaviota(66, 300, 1.1, 'a1') + gaviota(104, 322, .75, 'a2') + gaviota(292, 276, .9, 'a3');
    else if (lugar === 'cordillera') o += gaviota(190, 118, 1.9, 'a1') + gaviota(240, 152, 1.1, 'a2');   // F1231: aves grandes que planean (cóndores), sin hojas
    else {
      const C = lugar === 'desierto' ? ['#e8452c', '#f6a02a', '#e8452c', '#f6a02a', '#ffd23c', '#e8452c'] : ['#d8a64a', '#7fb25a', '#c97a3a', '#d8a64a', '#7fb25a', '#e0b85c'];
      for (let i = 0; i < 6; i++) o += '<g transform="translate(' + f(24 + R() * 340) + ' ' + f(300 + R() * 160) + ')"><g class="ip-hc h' + (i + 1) + '">' + hojaF(0, 0, lugar === 'desierto' ? 7 : 11, 20 + i * 40, C[i]) + '</g></g>';
    }
    return o;
  }
  function tinte(fr) {   // un velo de color según la hora, muy suave para no quitar legibilidad al texto
    const t = { noche: ['#4e5bb0', .2], tarde: ['#ff9a5a', .1], alba: ['#ffb3c6', .09] }[fr];
    return t ? '<rect width="' + W + '" height="' + H + '" fill="' + t[0] + '" opacity="' + t[1] + '" class="ip-tinte ip-t-' + fr + '"/>' : '';
  }

  // Partículas en tres grupos (luciérnagas, polen, destellos de sal), cada grupo se mueve como una sola capa
  function particulas(lugar, noche) {
    const R = azar(lugar.length * 97 + 3), col = noche ? '#fff4b8' : (lugar === 'desierto' ? '#fff1c4' : lugar === 'costa' || lugar === 'cordillera' ? '#ffffff' : '#fff7c8');
    let out = '';
    for (let g = 1; g <= 3; g++) {
      let c = '';
      for (let i = 0; i < 7; i++) { const x = 20 + R() * 350, y = 300 + R() * 360, r = .9 + R() * 2.1; c += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 3.4) + '" opacity=".16"/>'; }
      out += '<g class="ip-part p' + g + '" fill="' + col + '">' + c + '</g>';
    }
    return out;
  }

  // F1223 · Fase 2 del cielo: nubes con volumen (cuerpo claro sobre una sombra tintada por la hora), cirros, estrellas y aves lejanas.
  const NUBE = {
    noche: ['#f2edff', '#b9b3dd'], alba: ['#fff5e6', '#f0c6bb'], manana: ['#ffffff', '#c8dcec'],
    dia: ['#ffffff', '#c1d8ec'], tarde: ['#fff1de', '#e8b6a6']
  };
  function nubes(fr) {
    const [luz, som] = NUBE[fr] || NUBE.dia;
    const cum = (x, y, k, op, cl) => '<g class="ip-nube ' + cl + '" opacity="' + op + '" filter="url(#ipNubeF)"><g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">'
      + '<path fill="' + som + '" d="M-74 10C-88 10-90-5-74-8-74-24-50-29-41-16-37-38-3-43 8-23 21-36 50-30 50-10 68-12 80-3 73 10Z"/>'
      + '<path fill="' + luz + '" d="M-72 3C-85 3-87-10-72-13-72-27-50-31-41-20-37-40-4-45 7-26 20-38 47-32 47-14 64-15 75-7 69 3Z"/>'
      + '<ellipse cx="-8" cy="-31" rx="16" ry="6" fill="#fff" opacity=".7"/></g></g>';
    const cirro = (d, w, op) => '<path d="' + d + '" fill="none" stroke="' + luz + '" stroke-width="' + w + '" stroke-linecap="round" opacity="' + op + '"/>';
    return '<g filter="url(#ipCirroF)">' + cirro('M-10 96C60 84 140 90 230 74', 4, .38) + cirro('M120 124C200 114 290 118 400 102', 3, .3) + cirro('M-20 150C40 144 90 146 150 138', 2.4, .28) + '</g>'
      + cum(62, 204, 1, .82, 'n1') + cum(262, 268, .78, .7, 'n2') + cum(336, 148, .56, .66, 'n3') + cum(150, 252, .5, .5, 'n4');
  }
  function estrellas(lugar) {
    const R = azar(lugar.length * 131 + 11); let a = '', b = '', c = '', br = '';
    for (let i = 0; i < 38; i++) {
      const x = 8 + R() * 372, y = 14 + R() * 250, r = .6 + R() * 1.1, e = '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/>';
      if (i % 3 === 0) a += e; else if (i % 3 === 1) b += e; else c += e;
      if (i % 9 === 0) br += '<g transform="translate(' + f(x) + ' ' + f(y) + ')"><path d="M0-5V5M-5 0H5" stroke="#fffbe8" stroke-width=".7" stroke-linecap="round" opacity=".8"/><circle r="6" fill="url(#ipHalo)" opacity=".5"/></g>';
    }
    return '<g class="ip-estr" fill="#fffdf2"><g class="t1">' + a + '</g><g class="t2">' + b + '</g><g class="t3">' + c + '</g>' + br + '</g>';
  }
  function aves() {
    const v = (x, y, k, cl) => '<g class="ip-ave ' + cl + '"><path transform="translate(' + x + ' ' + y + ') scale(' + k + ')" d="M0 0Q5-6 10 0Q15-6 20 0" fill="none" stroke="#4a5a6a" stroke-width="1.4" stroke-linecap="round" opacity=".6"/></g>';
    return v(58, 128, 1, 'a1') + v(86, 116, .7, 'a2') + v(300, 104, .8, 'a3');
  }

  function construir(lugar) {
    const fr = franja(), c = CIELO[fr], p = LUGAR[lugar] || LUGAR.bosque, sx = lugar === 'costa' ? 268 : lugar === 'bosque' ? 200 : lugar === 'cordillera' ? 96 : 292, sy = fr === 'noche' ? 188 : lugar === 'desierto' ? 300 : lugar === 'costa' ? 262 : lugar === 'cordillera' ? 176 : 192;   // F1223: de noche la luna sube y se ve sobre el paisaje
    const sc = lugar === 'desierto' ? 34 : 26, noche = fr === 'noche';
    let rayos = ''; [[-210, 560, 40], [-120, 640, 30], [-30, 700, 46], [60, 720, 28], [150, 700, 36]].forEach((q, i) => { rayos += '<path d="M' + sx + ' ' + sy + 'L' + (sx + q[0] - q[2]) + ' ' + q[1] + 'L' + (sx + q[0] + q[2]) + ' ' + q[1] + 'Z"/>'; });
    return '<svg class="ip-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
      + '<defs>'
      + '<linearGradient id="ipCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.a + '"/><stop offset=".42" stop-color="' + c.b + '"/><stop offset=".62" stop-color="' + c.c + '"/><stop offset="1" stop-color="' + c.c + '"/></linearGradient>'
      + '<radialGradient id="ipLuz" cx="' + sx / W + '" cy="' + sy / H + '" r=".62" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="' + c.luz + '" stop-opacity=".95"/><stop offset=".3" stop-color="' + c.luz + '" stop-opacity=".42"/><stop offset="1" stop-color="' + c.luz + '" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="ipRayo" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="' + c.luz + '" stop-opacity="' + c.rayo + '"/><stop offset="1" stop-color="' + c.luz + '" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="ipBruma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.bruma + '" stop-opacity="0"/><stop offset=".55" stop-color="' + p.bruma + '" stop-opacity=".62"/><stop offset="1" stop-color="' + p.bruma + '" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="ipMar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd6dc"/><stop offset=".5" stop-color="#6fb6c6"/><stop offset="1" stop-color="#4f9bb2"/></linearGradient>'
      + '<linearGradient id="ipC1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.c1 + '"/><stop offset="1" stop-color="' + p.c2 + '"/></linearGradient>'
      + '<linearGradient id="ipC2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.c2 + '"/><stop offset="1" stop-color="' + p.c3 + '"/></linearGradient>'
      + '<linearGradient id="ipC3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.c3 + '"/><stop offset="1" stop-color="' + p.suelo + '"/></linearGradient>'
      + '<radialGradient id="ipVig" cx=".5" cy=".45" r=".78"><stop offset=".55" stop-color="#1a1208" stop-opacity="0"/><stop offset="1" stop-color="#1a1208" stop-opacity=".34"/></radialGradient>'
      + '<linearGradient id="ipPie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14231a" stop-opacity="0"/><stop offset="1" stop-color="#14231a" stop-opacity=".14"/></linearGradient>'
      + '<filter id="ipDesenf" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.8"/></filter>'
      + '<radialGradient id="ipHalo"><stop offset="0" stop-color="' + c.luz + '" stop-opacity=".75"/><stop offset="1" stop-color="' + c.luz + '" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="ipDisco" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="' + c.disco + '"/><stop offset="1" stop-color="' + (c.luna ? '#e1d8ee' : c.luz) + '"/></radialGradient>'
      + '<filter id="ipNubeF" x="-15%" y="-40%" width="130%" height="180%"><feGaussianBlur stdDeviation="1.4"/></filter>'
      + '<filter id="ipCirroF" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter>'
      + '<filter id="ipSuave" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>'
      + '<filter id="ipRayoF" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>'
      + '</defs>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipCielo)"/>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipLuz)"/>'
      + '<g class="ip-rayos" fill="url(#ipRayo)" filter="url(#ipRayoF)">' + rayos + '</g>'
      + (noche ? estrellas(lugar) : '')
      + '<g class="ip-astro"><circle cx="' + sx + '" cy="' + sy + '" r="' + (sc * 4.2) + '" fill="url(#ipHalo)" opacity=".55"/><circle cx="' + sx + '" cy="' + sy + '" r="' + (sc * 1.9) + '" fill="url(#ipHalo)" opacity=".8"/><circle cx="' + sx + '" cy="' + sy + '" r="' + (sc * 1.35) + '" fill="none" stroke="' + c.luz + '" stroke-width="1.2" opacity=".5"/><circle cx="' + sx + '" cy="' + sy + '" r="' + sc + '" fill="url(#ipDisco)"/>' + (c.luna ? '<circle cx="' + (sx - 9) + '" cy="' + (sy - 6) + '" r="5.5" fill="#d9cfe6" opacity=".55"/><circle cx="' + (sx + 8) + '" cy="' + (sy + 8) + '" r="3.4" fill="#d9cfe6" opacity=".5"/><circle cx="' + (sx + 10) + '" cy="' + (sy - 10) + '" r="2.2" fill="#d9cfe6" opacity=".45"/>' : '') + '</g>'
      + nubes(fr) + (noche ? '' : aves())
      + paisaje(lugar, p)
      + colinas(lugar, p)
      + '<rect y="560" width="' + W + '" height="' + (H - 560) + '" fill="url(#ipPie)"/>'
      + particulas(lugar, c.luna)
      + vida(lugar, fr)
      + primerPlano(lugar, p)
      + tinte(fr)
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipVig)"/>'
      + '</svg>';
  }

  // ---------- Colocar el fondo dentro del Inicio ----------
  function lugarActual(sec) {
    const e = sec.querySelector('#ilEscena'); if (e && e.getAttribute('data-fondo') && LUGAR[e.getAttribute('data-fondo')]) return e.getAttribute('data-fondo');
    try { const s = window.TBInicio && window.TBInicio.cargar(); if (s && LUGAR[s.tematica]) return s.tematica; } catch (x) { /* sin estado */ }
    return 'bosque';
  }
  function poner() {
    const sec = document.getElementById('inicioLimpio'); if (!sec) return;
    const lugar = lugarActual(sec), clave = lugar + '|' + franja();
    let fondo = sec.querySelector(':scope > .ip-fondo');
    if (fondo && fondo.getAttribute('data-k') === clave) return;
    if (fondo) fondo.remove();
    fondo = document.createElement('div'); fondo.className = 'ip-fondo'; fondo.setAttribute('data-k', clave); fondo.setAttribute('aria-hidden', 'true');
    fondo.innerHTML = construir(lugar);
    sec.insertBefore(fondo, sec.firstChild);
    sec.classList.add('ip-con-fondo'); sec.setAttribute('data-lugar', lugar); sec.setAttribute('data-franja', franja());
  }
  let espera = 0;
  function pronto() { if (espera) return; espera = requestAnimationFrame(() => { espera = 0; try { poner(); } catch (e) { /* el Inicio sigue funcionando sin el fondo */ } }); }
  function iniciar() {
    const raiz = document.getElementById('pantalla') || document.body;
    new MutationObserver(pronto).observe(raiz, { childList: true, subtree: true });
    pronto();
    setInterval(pronto, 60000);   // cambia de cielo al cambiar la hora
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
  window.TBProfundidad = { poner, construir };
})();
