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
    noche:  { a: '#aab6ea', b: '#d8cdf2', c: '#ffdccd', luz: '#fff0d6', disco: '#fffaf0', luna: true,  rayo: .10 },
    alba:   { a: '#b9d2f0', b: '#f6cdb8', c: '#ffe6bd', luz: '#ffd391', disco: '#fff2c9', luna: false, rayo: .30 },
    manana: { a: '#a9d8f3', b: '#cfeaf5', c: '#fff3d3', luz: '#fff2bd', disco: '#fffbe6', luna: false, rayo: .26 },
    dia:    { a: '#a0d1f1', b: '#c4e4f4', c: '#f1f8ef', luz: '#fffbe3', disco: '#ffffff', luna: false, rayo: .22 },
    tarde:  { a: '#c2b9ea', b: '#f7c7a9', c: '#ffe0b3', luz: '#ffbe7d', disco: '#fff0cc', luna: false, rayo: .32 }
  };
  // Colores por lugar: lejos (claro, poco saturado) → cerca (oscuro, saturado): perspectiva aérea
  const LUGAR = {
    bosque:  { lejos: '#b4c4dc', medio: '#8fa9b8', cerro: '#6f9a82', c1: '#9cc98a', c2: '#80b574', c3: '#64a05e', suelo: '#4f8a55', follaje: '#27553b', follaje2: '#3a7a4d', bruma: '#ffffff' },
    desierto:{ lejos: '#e8c4a0', medio: '#dba982', cerro: '#cf9467', c1: '#e3b27a', c2: '#d29a62', c3: '#bd8350', suelo: '#a56b3b', follaje: '#5b4a2c', follaje2: '#7a6a3a', bruma: '#fff1dc' },
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
  function paisaje(lugar, p) {
    if (lugar === 'desierto') {
      return ''
        + '<path fill="' + p.lejos + '" d="M0 322 L0 300 L40 296 L58 268 L128 266 L146 296 L214 300 L236 282 L300 280 L322 298 L390 302 L390 322Z"/>'      // mesas lejanas
        + '<path fill="' + p.medio + '" d="M0 340 C50 322 96 312 150 326 C206 340 250 318 300 314 C340 311 366 322 390 330 L390 372 L0 372Z"/>'
        + '<g class="ip-bruma b1"><rect x="-20" y="318" width="430" height="46" fill="url(#ipBruma)"/></g>'
        + '<path fill="' + p.cerro + '" d="M0 372 C40 350 100 346 160 364 C220 382 270 352 330 348 C358 346 376 352 390 358 L390 430 L0 430Z"/>'
        + '<path fill="#fff" opacity=".22" d="M160 364 C220 382 270 352 330 348 L330 352 C270 358 220 392 160 370Z"/>'                                    // lado iluminado de la duna
        + '<g class="ip-bruma b2"><rect x="-20" y="372" width="430" height="52" fill="url(#ipBruma)"/></g>';
    }
    if (lugar === 'costa') {
      return ''
        + '<path fill="' + p.lejos + '" opacity=".8" d="M0 318 C60 304 110 296 170 306 C220 314 262 322 310 330 L0 330Z"/>'                           // cabo lejano
        + '<rect x="0" y="322" width="390" height="150" fill="url(#ipMar)"/>'
        + '<g fill="#fff" opacity=".9">' + destellos(268, 326, 430, 7) + '</g>'
        + '<path class="ip-ola o1" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" d="M0 392 C30 386 60 398 90 392 S150 386 180 392 S240 398 270 392 S330 386 390 392"/>'
        + '<path class="ip-ola o2" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.8" d="M-10 420 C20 412 52 426 84 418 S146 410 178 418 S244 426 276 418 S340 410 400 418"/>'
        + '<g class="ip-bruma b1"><rect x="-20" y="306" width="430" height="34" fill="url(#ipBruma)"/></g>'
        + '<path fill="' + p.c1 + '" d="M0 458 C60 440 120 452 190 446 C260 440 330 436 390 448 L390 520 L0 520Z"/>'
        + '<path fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3" stroke-linecap="round" d="M0 458 C60 440 120 452 190 446 C260 440 330 436 390 448"/>'; // espuma en la orilla
    }
    return ''   // bosque: cordillera nevada, pewenes, niebla
      + '<path fill="' + p.lejos + '" d="M0 330 L0 262 L34 236 L52 214 L66 228 L92 196 L118 156 L136 176 L152 168 L176 204 L202 232 L226 190 L254 150 L272 120 L296 158 L312 146 L340 190 L364 214 L390 204 L390 330Z"/>'
      + '<g fill="#fff" opacity=".92"><path d="M118 156 L136 176 L128 172 L122 182 L112 172 L104 178Z"/><path d="M272 120 L296 158 L286 152 L278 164 L268 150 L256 158 L254 150Z"/><path d="M92 196 L104 206 L96 204 L90 212 L80 204Z"/><path d="M226 190 L238 206 L230 202 L224 212 L214 204Z"/></g>'
      + '<g fill="#7d96b4" opacity=".35"><path d="M118 156 L136 176 L152 168 L176 204 L150 330 L118 330Z"/><path d="M272 120 L296 158 L312 146 L340 190 L316 330 L272 330Z"/></g>'   // lado en sombra
      + '<g class="ip-bruma b1"><rect x="-20" y="236" width="430" height="70" fill="url(#ipBruma)"/></g>'
      + '<path fill="' + p.medio + '" d="M0 330 C40 296 90 288 140 304 C190 320 232 286 290 282 C330 280 362 296 390 310 L390 380 L0 380Z"/>'
      + '<path fill="' + p.cerro + '" d="' + copas(318, -6, 400, 24, 9, 11) + '"/>'
      + '<g class="ip-bruma b2"><rect x="-20" y="288" width="430" height="64" fill="url(#ipBruma)"/></g>';
  }

  function colinas(lugar, p) {
    if (lugar === 'costa') {
      return ''
        + '<path fill="url(#ipC2)" d="M0 506 C80 488 160 500 240 494 C310 490 356 496 390 500 L390 ' + H + ' L0 ' + H + 'Z"/>'
        + '<path fill="url(#ipC3)" d="M0 600 C70 584 140 596 210 588 C290 580 340 590 390 596 L390 ' + H + ' L0 ' + H + 'Z"/>';
    }
    return '<path fill="url(#ipC1)" d="M0 392 C60 366 130 378 200 372 C270 366 330 372 390 382 L390 ' + H + ' L0 ' + H + 'Z"/>'
      + '<path fill="url(#ipC2)" d="M0 452 C80 424 150 444 230 436 C300 428 350 436 390 446 L390 ' + H + ' L0 ' + H + 'Z"/>'
      + '<path fill="url(#ipC3)" d="M0 540 C70 516 150 532 230 524 C300 516 350 526 390 534 L390 ' + H + ' L0 ' + H + 'Z"/>';
  }

  // Primer plano: follaje grande, oscuro y desenfocado que enmarca la pantalla (profundidad de campo)
  function primerPlano(lugar, p) {
    let g = '';
    if (lugar === 'bosque') {
      const A = helecho(-14, 800, 250, -1.02, .55, 14, 76), B = helecho(404, 810, 270, -2.14, -.5, 14, 80), C = helecho(-20, 620, 170, -0.55, .5, 11, 54), D = helecho(410, 600, 160, -2.6, -.5, 11, 52);
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + A.hojas + B.hojas + '"/><path fill="' + p.follaje2 + '" opacity=".9" d="' + C.hojas + D.hojas + '"/></g>';
    } else if (lugar === 'desierto') {
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + pasto(26, 820, 16, 170, 1.9, 21) + pasto(372, 826, 18, 190, 1.9, 33) + '"/>'
        + '<path fill="' + p.follaje2 + '" opacity=".85" d="' + pasto(-4, 700, 10, 110, 1.4, 5) + pasto(396, 690, 10, 110, 1.4, 9) + '"/>'
        + '<ellipse cx="46" cy="846" rx="64" ry="22" fill="#8a5a33"/><ellipse cx="350" cy="848" rx="70" ry="24" fill="#8a5a33"/></g>';
    } else {
      g = '<g class="ip-fp" filter="url(#ipDesenf)"><path fill="' + p.follaje + '" d="' + pasto(20, 828, 20, 200, 1.6, 41) + pasto(372, 832, 22, 220, 1.6, 47) + '"/>'
        + '<path fill="' + p.follaje2 + '" opacity=".9" d="' + pasto(-6, 720, 12, 120, 1.3, 3) + pasto(398, 704, 12, 120, 1.3, 8) + '"/>'
        + '<ellipse cx="64" cy="850" rx="58" ry="20" fill="#7a6a58"/><ellipse cx="338" cy="852" rx="66" ry="22" fill="#6f6050"/></g>';
    }
    return g;
  }

  // Partículas en tres grupos (luciérnagas, polen, destellos de sal), cada grupo se mueve como una sola capa
  function particulas(lugar, noche) {
    const R = azar(lugar.length * 97 + 3), col = noche ? '#fff4b8' : (lugar === 'desierto' ? '#fff1c4' : lugar === 'costa' ? '#ffffff' : '#fff7c8');
    let out = '';
    for (let g = 1; g <= 3; g++) {
      let c = '';
      for (let i = 0; i < 7; i++) { const x = 20 + R() * 350, y = 300 + R() * 360, r = .9 + R() * 2.1; c += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '"/><circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r * 3.4) + '" opacity=".16"/>'; }
      out += '<g class="ip-part p' + g + '" fill="' + col + '">' + c + '</g>';
    }
    return out;
  }

  function nubes() {
    const nube = (x, y, k) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><ellipse cx="0" cy="0" rx="62" ry="13"/><ellipse cx="-26" cy="-9" rx="30" ry="14"/><ellipse cx="14" cy="-14" rx="34" ry="16"/><ellipse cx="42" cy="-4" rx="26" ry="10"/></g>';
    return '<g class="ip-nube n1" fill="#fff" opacity=".62" filter="url(#ipSuave)">' + nube(70, 196, 1) + '</g>'
      + '<g class="ip-nube n2" fill="#fff" opacity=".5" filter="url(#ipSuave)">' + nube(250, 262, .8) + '</g>'
      + '<g class="ip-nube n3" fill="#fff" opacity=".42" filter="url(#ipSuave)">' + nube(330, 150, .6) + '</g>';
  }

  function construir(lugar) {
    const fr = franja(), c = CIELO[fr], p = LUGAR[lugar] || LUGAR.bosque, sx = lugar === 'costa' ? 268 : lugar === 'bosque' ? 200 : 292, sy = lugar === 'desierto' ? 300 : lugar === 'costa' ? 262 : 192;
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
      + '<filter id="ipSuave" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>'
      + '<filter id="ipRayoF" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14"/></filter>'
      + '<filter id="ipGrano" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .2  0 0 0 0 .15  0 0 0 0 .1  0 0 0 .55 -.18"/></filter>'
      + '</defs>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipCielo)"/>'
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipLuz)"/>'
      + '<g class="ip-rayos" fill="url(#ipRayo)" filter="url(#ipRayoF)">' + rayos + '</g>'
      + '<g class="ip-astro"><circle cx="' + sx + '" cy="' + sy + '" r="' + (sc * 1.9) + '" fill="' + c.luz + '" opacity=".35"/><circle cx="' + sx + '" cy="' + sy + '" r="' + sc + '" fill="' + c.disco + '"/>' + (c.luna ? '<circle cx="' + (sx - 9) + '" cy="' + (sy - 6) + '" r="5" fill="#e9dfcf" opacity=".6"/><circle cx="' + (sx + 8) + '" cy="' + (sy + 8) + '" r="3.2" fill="#e9dfcf" opacity=".55"/>' : '') + '</g>'
      + nubes()
      + paisaje(lugar, p)
      + colinas(lugar, p)
      + '<rect y="560" width="' + W + '" height="' + (H - 560) + '" fill="url(#ipPie)"/>'
      + particulas(lugar, c.luna)
      + primerPlano(lugar, p)
      + '<rect width="' + W + '" height="' + H + '" fill="url(#ipVig)"/>'
      + '<rect width="' + W + '" height="' + H + '" filter="url(#ipGrano)" opacity=".5" class="ip-grano"/>'
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
  window.TBProfundidad = { poner };
})();
