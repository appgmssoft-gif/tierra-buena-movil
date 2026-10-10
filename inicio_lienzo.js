// inicio_lienzo.js - F928 · I2 «El lienzo». PANTALLA del Inicio «Tierra Buena»: colinas en 3 capas, árbol en 4 etapas, elección de la primera semilla,
// respiración desde el tronco, maleza (versión simple; la pulida es I3) y mensaje del árbol. La lógica está en inicio_estado.js (TBInicio).
// Presupuesto de batería (plan §3): en reposo NO corre nada. Solo hay trabajo mientras se toca (paralaje) o se respira (3 ciclos). Todo se anima con transform/opacity.
// CSP: sin atributo style en el HTML; las posiciones salen de clases (inicio_lienzo.css) y las variables, de style.setProperty.
'use strict';
(function () {
  const H = typeof document !== 'undefined' ? document.documentElement : null;
  const KGUIA = 'tb_inicio_guia', KPANT = 'tb_inicio_pantalla', DIEZ_MIN = 600000;
  let CAT = null, cargando = null, gen = 0, timers = [], vela = null, resp = null, raf = 0;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  // Íconos de línea con el mismo estilo del resto de la app (cuadrícula 24, trazo 1.8, extremos redondos).
  const IC = { hoja: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5-6.7 3-1.2 5.5-2.3 7-5.3"/>', libro: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>', gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>', mundo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.5 3.2 3.5 14.8 0 18M12 3c-3.5 3.2-3.5 14.8 0 18"/>', brote: '<path d="M12 21v-9"/><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z"/><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z"/>', compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>' };
  const ic = (d, n) => '<svg class="il-ic" viewBox="0 0 24 24" width="' + (n || 18) + '" height="' + (n || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
  const quieto = () => { try { return H.getAttribute('data-anim') === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin guardar */ } };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const sonido = (n, a) => { try { if (window.TBSonido && typeof window.TBSonido[n] === 'function') window.TBSonido[n](a); } catch (e) { /* sin sonido */ } };

  const ETAPAS = { brote: 'Brote', raiz: 'Echando raíces', ramas: 'Creciendo ramas', frondoso: 'Frondoso' };
  const FORMA = { chanar: 'paraguas', araucaria: 'pewen', canelo: 'redondo', quillay: 'redondo', roble: 'redondo', cerezo: 'redondo', alerce: 'cono', sauce: 'cascada', palma_chilena: 'palma', jacaranda: 'florido', peumo: 'redondo', maiten: 'cascada' };
  const MALEZA = { hoja_seca: 'hoja seca', trebol_gris: 'trébol marchito', hierba_seca: 'hierba seca' };
  // Casillas del paisaje lejano: [x, y, escala] dentro del lienzo de 360 x 420.
  const FONDO = { 'fondo-1': [52, 296, 0.30], 'fondo-2': [110, 290, 0.26], 'fondo-3': [258, 292, 0.28], 'fondo-4': [312, 298, 0.32], 'fondo-5': [2, 300, 0.34], 'fondo-6': [356, 296, 0.30] };

  // ---------- Arte: árbol por etapas (SVG por capas; las clases dan el color en inicio_lienzo.css) ----------
  const p = (cls, d) => '<path class="' + cls + '" d="' + d + '"/>';
  const ci = (cls, x, y, r) => '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  const el = (cls, x, y, rx, ry, rot) => '<ellipse class="' + cls + '" cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"' + (rot ? ' transform="rotate(' + rot + ' ' + x + ' ' + y + ')"' : '') + '/>';

  // F1067 · Suelo por hábitat: cada hábitat tiene su propio suelo (solo lo que le corresponde) y crece por días hasta un ambiente completo.
  // Posiciones fijas (SLOTS_DIA): a los lados y delante del árbol, nunca sobre el tronco ni la copa.
  const SLOTS_DIA = [[14, 338], [346, 338], [70, 334], [120, 392], [44, 350], [316, 350], [262, 362], [296, 334], [96, 362], [26, 372], [334, 372], [290, 330], [236, 396], [150, 404], [210, 386], [6, 344]];
  // Formato: [día en que aparece, id (dibujo de FLORES o de ESP), índice de SLOTS_DIA, escala]
  const PAISAJE_HAB = {
    bosque: [[2, 'helechos', 0, 0.9], [3, 'piedras', 1, 0.8], [4, 'copihue', 2, 0.9], [5, 'helechos', 4, 0.8], [6, 'chilco', 5, 0.8], [7, 'pasto_alto', 8, 0.9], [9, 'copihue', 3, 0.85], [10, 'piedras', 7, 0.7], [11, 'helechos', 9, 0.9], [12, 'chilco', 11, 0.8], [13, 'pasto_alto', 12, 0.95], [15, 'helechos', 14, 0.8]],
    desierto: [],   // F1089: el desierto respira: sin decoración de suelo
    costa: [[2, 'piedras', 0, 0.6]],   // F1089: la playa solo lleva una piedra suave; conchas y gaviota ya son rasgos
    cordillera: [[2, 'piedras', 0, 0.9], [3, 'llareta', 1, 0.8], [4, 'piedras', 2, 0.8], [5, 'chachacoma', 4, 0.9], [7, 'llareta', 5, 0.9], [8, 'ananuca', 6, 0.8], [9, 'piedras', 7, 0.7], [11, 'chachacoma', 9, 0.9], [12, 'llareta', 10, 0.8], [13, 'piedras', 11, 0.7], [14, 'chachacoma', 13, 0.8], [15, 'llareta', 12, 0.9]],
    jardin: [[2, 'pasto_alto', 0, 0.9], [3, 'lavanda', 1, 0.7], [4, 'bonsai', 2, 0.7], [5, 'lavanda', 4, 0.8], [6, 'bambu', 5, 0.7], [8, 'lavanda', 6, 0.9], [9, 'bonsai', 7, 0.7], [10, 'bambu', 9, 0.7], [12, 'pasto_alto', 13, 0.9], [13, 'lavanda', 10, 0.8], [15, 'bonsai', 14, 0.9]],
    general: [[2, 'pasto_alto', 0, 0.9], [4, 'piedras', 2, 0.8], [7, 'pasto_alto', 4, 0.8], [10, 'piedras', 7, 0.7], [13, 'pasto_alto', 9, 0.9]]
  };
  // Dibujo con la base en (0,0): ESP (60×40) o FLORES (caja DIM)
  function sueloDibujo(id) {
    if (ESP[id]) return '<g transform="translate(-30 -40)">' + ESP[id] + '</g>';
    if (FLORES[id]) { const d = DIM[id] || [24, 24]; return '<g transform="translate(' + (-d[0] / 2) + ' ' + (-d[1]) + ')">' + FLORES[id]() + '</g>'; }
    return '';
  }
  // F1076 · Los días del suelo se leen sobre 30 días (el doble de la escala anterior). Sin repetir los rasgos y como máximo 3 elementos: no se sobrecarga el inicio.
  const RASGO_SLOTS = [[44, 350], [316, 350], [210, 386]];
  const RASGO_SLOTS_DESIERTO = [[56, 338], [276, 360], [150, 404]];   // F1090: más espacio entre rasgos   // F1089: el desierto con espacio entre sus rasgos
  // F1083 · Sombreado automático en dos tonos: cada figura rellena recibe una copia más oscura desplazada abajo-derecha (luz arriba-izquierda).
  // Se aplica a los dibujos de rasgos y suelo sin reescribirlos a mano.
  function oscurecer(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
  function sombrear(svg) {
    return svg.replace(/<(path|ellipse|circle|rect)([^>]*?)fill="(#[0-9a-fA-F]{6})"([^>]*?)\/>/g, (m, tag, a1, col, a2) => {
      const sombra = oscurecer(col, 0.72), tr = /transform="([^"]*)"/.exec(a1 + a2);
      const dx = ' translate(0.9 1.3)';
      const copia = tr ? m.replace(tr[0], 'transform="' + tr[1] + dx + '"') : '<' + tag + a1 + 'transform="' + dx.trim() + '"' + a2.replace(/^/, '') .replace('', '') ;
      const sombraTag = tr ? copia.replace('fill="' + col + '"', 'fill="' + sombra + '"') : ('<' + tag + a1 + ' fill="' + sombra + '" transform="' + dx.trim() + '"' + a2 + '/>');
      return sombraTag + m;
    });
  }
  function rasgoDibujo(id) {
    if (AVES[id] && AVES[id].dib) return '<g transform="translate(' + (-AVES[id].vb[0] / 2) + ' ' + (-AVES[id].vb[1]) + ')">' + sombrear(AVES[id].dib()) + '</g>';
    return sombrear(sueloDibujo(id));
  }
  function rasgosEscena(est) {
    const hab = est.tematica, ids = (((CAT && CAT.tematicas) || {})[hab] || {}).rasgos_ids || [], d = est.habDias || 0;
    if (!hab || !ids.length) return '';
    return ids.map((id, k) => {
      const ini = 10 * k + 1; if (d < ini) return '';
      const xy = (est.tematica === 'costa' && k === 2) ? [250, 214] : (est.tematica === 'desierto' ? RASGO_SLOTS_DESIERTO[k] : RASGO_SLOTS[k]), dd = Math.min(10, d - ini + 1);   // F1088: la gaviota vuela sobre el mar
      const esAnimal = !!AVES[id] || ['guanaco', 'zorro', 'gaviota'].indexOf(id) >= 0;
      if (!esAnimal) {   // plantas: crecen dentro de su bloque
        const f = Math.min(1, dd / 10), s = (0.9 * (0.5 + 0.5 * f)).toFixed(2);
        return '<g class="ras-it" transform="translate(' + xy[0] + ' ' + xy[1] + ') scale(' + s + ')">' + rasgoDibujo(id) + '</g>';
      }
      // F1084 · Animales por etapas dentro de su bloque: bebé (días 1-3), joven (4-7), adulto con su pequeña familia (8-10)
      const tam = AVES[id] ? 1.7 : 1.35, adulto = rasgoDibujo(id);
      if (dd <= 3) return '<g class="ras-it ras-bebe" transform="translate(' + xy[0] + ' ' + xy[1] + ') scale(' + (tam * 0.5).toFixed(2) + ')">' + adulto + '</g>';
      if (dd <= 7) return '<g class="ras-it ras-joven" transform="translate(' + xy[0] + ' ' + xy[1] + ') scale(' + (tam * 0.75).toFixed(2) + ')">' + adulto + '</g>';
      const cria = '<g transform="translate(-34 0) scale(0.42)">' + adulto + '</g><g transform="translate(34 0) scale(0.42)">' + adulto + '</g>';
      return '<g class="ras-it ras-familia" transform="translate(' + xy[0] + ' ' + xy[1] + ') scale(' + tam.toFixed(2) + ')">' + cria + adulto + '</g>';
    }).join('');
  }
  function paisajeDelDia(dias, hab) {
    const rs = (((CAT && CAT.tematicas) || {})[hab] || {}).rasgos_ids || [];
    // F1088: decoración fuera de los lugares de los rasgos
    const L = (PAISAJE_HAB[hab] || PAISAJE_HAB.general).filter((it) => rs.indexOf(it[1]) < 0 && [4, 5, 14].indexOf(it[2]) < 0).slice(0, 2), d = Math.max(0, Math.floor(dias || 0)); let g = '';   // F1087: menos es más: como máximo 3 decoraciones de suelo
    L.forEach((it) => {
      if (d < it[0] * 2) return;
      const xy = SLOTS_DIA[it[2]], k = (it[3] * (0.55 + 0.45 * Math.min(1, (d - it[0] * 2 + 1) / 6))).toFixed(2);
      g += '<g class="pa-it" transform="translate(' + xy[0] + ' ' + xy[1] + ') scale(' + k + ')">' + sueloDibujo(it[1]) + '</g>';
    });
    return g;
  }

  function brote() { return p('tr-t t3', 'M0 0 C0 -10 1 -20 0 -30') + p('tr-h', 'M0 -26 C-14 -30 -22 -22 -24 -14 C-12 -12 -4 -16 0 -26Z') + p('tr-h2', 'M0 -30 C12 -38 24 -32 26 -24 C14 -20 4 -22 0 -30Z'); }
  function raiz() {
    return '<g class="tr-raices">' + p('tr-t t2', 'M0 0 C-6 10 -14 14 -24 22') + p('tr-t t2', 'M0 0 C0 12 2 20 0 32') + p('tr-t t2', 'M0 0 C6 10 14 14 24 20') + p('tr-t t1', 'M-6 8 C-12 14 -14 20 -12 26') + '</g>'
      + p('tr-t t4', 'M0 0 C-1 -18 2 -36 0 -56') + p('tr-h', 'M0 -22 C-16 -26 -26 -18 -28 -8 C-14 -6 -4 -10 0 -22Z') + p('tr-h2', 'M0 -34 C14 -42 28 -36 30 -26 C16 -22 4 -26 0 -34Z')
      + p('tr-h', 'M0 -48 C-12 -58 -24 -54 -26 -44 C-14 -40 -4 -42 0 -48Z') + p('tr-h2', 'M0 -56 C8 -68 20 -66 22 -58 C14 -50 4 -52 0 -56Z');
  }
  function ramas(forma) {
    if (forma === 'paraguas') {
      return p('tr-t t8', 'M0 0 C-2 -40 2 -80 0 -124') + p('tr-t t4', 'M0 -70 C-14 -72 -24 -78 -32 -88') + p('tr-t t4', 'M0 -70 C14 -72 24 -78 32 -88') + p('tr-t t3', 'M0 -98 C-12 -100 -20 -106 -26 -114') + p('tr-t t3', 'M0 -98 C12 -100 20 -106 26 -114')
        + el('tr-h', -34, -92, 12, 5, -20) + el('tr-h', 34, -92, 12, 5, 20) + el('tr-h', -28, -118, 10, 4, -20) + el('tr-h', 28, -118, 10, 4, 20) + el('tr-h2', 0, -130, 13, 5);
    }
    return p('tr-t t8', 'M0 0 C-3 -30 3 -62 0 -96') + p('tr-t t4', 'M0 -58 C-14 -66 -26 -76 -34 -90') + p('tr-t t4', 'M0 -70 C14 -80 26 -88 36 -104') + p('tr-t t3', 'M0 -86 C-6 -100 -10 -110 -14 -122')
      + ci('tr-h', -34, -96, 11) + ci('tr-h', 36, -110, 12) + ci('tr-h2', -14, -128, 10) + ci('tr-h', 0, -104, 9) + ci('tr-h2', 20, -96, 8);
  }
  // F1066 · Pewén (araucaria) como la especie real: tronco largo y recto, ramas gruesas en verticilos que se curvan hacia arriba
  // y, en cada punta, una mata densa de hojas punzantes. Entre verticilos se ve el tronco: no es un pino de pisos continuos.
  function pewenPuas(x0, y0, x1, y1, s) {   // F1079 · Hojas en punta pegadas a la rama, a lo largo de la curva
    const c1x = x0 + (x1 - x0) * 0.5, c1y = y0 + 5, c2x = x1 - s * 12, c2y = y1 + 9; let g = '';
    for (let k = 1; k <= 6; k++) {
      const t = k / 7, mt = 1 - t;
      const bx = mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1, by = mt * mt * mt * y0 + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y1;
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      for (const side of [-1, 1]) {
        const ox = bx + nx * side * 4, oy = by + ny * side * 4;
        const tx = ox + ux * 8 + nx * side * 5, ty = oy + uy * 8 + ny * side * 5;
        g += p(side > 0 ? 'tr-h' : 'tr-h2', 'M' + ox.toFixed(1) + ' ' + oy.toFixed(1) + ' L' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ' L' + (ox + ux * 3).toFixed(1) + ' ' + (oy + uy * 3).toFixed(1) + 'Z');
      }
    }
    return g;
  }
  function pewenBrazo(x0, y0, x1, y1, w) {
    const s = x1 < 0 ? -1 : 1, mx = x0 + (x1 - x0) * 0.5;
    return p('tr-ram t' + w, 'M' + x0 + ' ' + y0 + ' C' + mx.toFixed(1) + ' ' + (y0 + 5) + ' ' + (x1 - s * 12).toFixed(1) + ' ' + (y1 + 9).toFixed(1) + ' ' + x1 + ' ' + y1);
  }
  function pewenMata(x, y, r, s) {                          // mata de follaje densa, alargada en la dirección de la rama (sin púas)
    const a = s === 0 ? 0 : -s * 24;
    // F1081 · Sombreado en dos tonos con luz constante (arriba a la izquierda): sombra abajo-derecha, masa media y brillo arriba-izquierda
    // F1081 · Textura en puntas: hojas agudas en el borde de la mata, con ángulos variados (procedural, no a mano)
    let puntas = '';
    for (let k = 0; k < 11; k++) {
      const th = k * 0.571 + (s > 0 ? 0.13 : 0.31), ex = Math.cos(th) * r * 1.02, ey = Math.sin(th) * r * 0.68;
      const bx = x + ex * 0.94, by = y + ey * 0.94, tx = x + ex * 1.16, ty = y + ey * 1.16 - r * 0.04;
      const nx = -(ty - by) * 0.22, ny = (tx - bx) * 0.22;
      puntas += p(k % 3 === 0 ? 'tr-h3' : (k % 2 ? 'tr-h2' : 'tr-h'), 'M' + (bx + nx).toFixed(1) + ' ' + (by + ny).toFixed(1) + ' L' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ' L' + (bx - nx).toFixed(1) + ' ' + (by - ny).toFixed(1) + 'Z');
    }
    return puntas + el('tr-sombra', x + r * 0.12, y + r * 0.16, r * 1.04, r * 0.68, a) + el('tr-h', x, y, r * 1.0, r * 0.66, a)
      + el('tr-h2', x - r * 0.14, y - r * 0.16, r * 0.72, r * 0.4, a) + el('tr-h3', x - r * 0.32, y - r * 0.28, r * 0.3, r * 0.18, a);
  }
  function pewen(n) {
    const m = Math.max(2, Math.min(6, n));
    let g = '<path d="M0 0 C-3 -60 3 -130 0 -200" fill="none" stroke="#5f7a3a" stroke-width="12" stroke-linecap="round"/><path d="M-4 -6 C-6 -60 -2 -120 -4 -186" fill="none" stroke="#84a05a" stroke-width="4" stroke-linecap="round"/>';   // F1090: tronco verde explícito
    for (let y = -12; y > -190; y -= 14) g += p('tr-h2', 'M-5 ' + y + ' L-11 ' + (y - 5) + ' L-4 ' + (y - 7) + 'Z M5 ' + (y - 4) + ' L11 ' + (y - 9) + ' L4 ' + (y - 11) + 'Z');   // F1088: bordes en punta del tronco verde
    for (let i = 0; i < m; i++) {
      const t = m === 1 ? 0 : i / (m - 1), y = -40 - t * 126, L = 62 - t * 22, yt = y - 10 - t * 10, r = 15 - t * 3;
      g += p('tr-t t1', 'M-5 ' + (y + 1).toFixed(1) + ' q5 -2.5 10 0');                    // cicatriz del verticilo en la corteza
      g += '<ellipse cx="0" cy="' + (y + 2).toFixed(1) + '" rx="6" ry="3.5" fill="#8a6040"/>';   // F1079: nudo del verticilo
      for (const s of [-1, 1]) {
        g += pewenBrazo(0, y, s * L, yt, 6) + pewenPuas(0, y, s * L, yt, s) + pewenMata(s * L, yt, r, s);                 // rama gruesa con hojas en punta
        g += pewenBrazo(0, y + 5, s * L * 0.5, y + 24, 3) + pewenMata(s * L * 0.5, y + 24, 9 - t * 1.5, s);   // rama baja, colgante
      }
    }
    // piñas (conos) sobre las ramas altas
    const pinas = [[-40, -184], [40, -184]].map((q) => { const x = q[0], y = q[1];
      return '<path d="M' + x + ' ' + (y - 10) + ' C' + (x + 7) + ' ' + (y - 6) + ' ' + (x + 6) + ' ' + (y + 7) + ' ' + x + ' ' + (y + 11) + ' C' + (x - 6) + ' ' + (y + 7) + ' ' + (x - 7) + ' ' + (y - 6) + ' ' + x + ' ' + (y - 10) + 'Z" fill="#7a5230"/>'
        + '<path d="M' + (x - 4) + ' ' + (y - 4) + ' L' + (x + 4) + ' ' + (y - 4) + 'M' + (x - 5) + ' ' + (y + 1) + ' L' + (x + 5) + ' ' + (y + 1) + 'M' + (x - 3) + ' ' + (y + 6) + ' L' + (x + 3) + ' ' + (y + 6) + '" stroke="#4f3320" stroke-width="0.9" fill="none"/>'; }).join('');
    // copa superior: ancha y plana, formada por varias matas juntas
    return g + pinas + el('tr-h', 0, -186, 30, 12) + el('tr-h2', -10, -193, 16, 8) + el('tr-h2', 12, -195, 14, 7)
      + el('tr-h', -22, -176, 13, 7, -20) + el('tr-h', 22, -176, 13, 7, 20);
  }
  function frondoso(forma, especie, dias) {
    // F1058/F1059/F1066 · Pewén: copa en verticilos (ver pewen()); gana verticilos con los días.
    if (forma === 'pewen') return pewen(Math.round(Math.max(4, dias || 11) / 3));
    if (forma === 'paraguas') {
      return p('tr-t t10', 'M0 0 C-3 -60 3 -120 0 -168') + p('tr-t t3', 'M0 -58 L-15 -66') + p('tr-t t3', 'M0 -78 L15 -86') + p('tr-t t3', 'M0 -98 L-13 -104')
        + p('tr-t t4', 'M0 -150 C-24 -152 -44 -160 -60 -176') + p('tr-t t4', 'M0 -150 C24 -152 44 -160 60 -176') + p('tr-t t3', 'M0 -162 C-8 -172 -14 -182 -16 -192')
        + el('tr-h', 0, -182, 58, 14) + el('tr-h2', -30, -190, 34, 10, -8) + el('tr-h2', 30, -190, 34, 10, 8) + el('tr-h', -58, -176, 22, 8, -24) + el('tr-h', 58, -176, 22, 8, 24) + el('tr-h', 0, -198, 30, 8);
    }
    if (forma === 'cono') {
      return p('tr-t t8', 'M0 0 C-2 -50 2 -100 0 -150') + el('tr-h', 0, -84, 58, 16) + el('tr-h2', 0, -92, 40, 8) + el('tr-h', 0, -108, 46, 14) + el('tr-h2', 0, -116, 30, 7) + el('tr-h', 0, -130, 34, 12) + el('tr-h', 0, -150, 22, 10) + el('tr-h2', 0, -164, 10, 8);
    }
    if (forma === 'palma') {   // F1077 · Palma chilena: tronco grueso con anillos y una corona de frondas anchas que se arquean (formas rellenas, no líneas)
      let g = p('tr-t t10', 'M0 0 C-3 -50 3 -100 0 -140');
      for (let y = -18; y > -134; y -= 17) g += p('tr-t t1', 'M-6 ' + y + ' q6 -2.5 12 0');
      for (let i = 0; i < 9; i++) {   // F1080 · Cada fronda: un eje arqueado con hojuelas a ambos lados (como la palma chilena)
        const a = (-80 + i * 20) * Math.PI / 180, len = i % 2 ? 66 : 78;
        const tx = Math.sin(a) * len, ty = -140 - Math.cos(a) * len * 0.5 + len * 0.52, cx = Math.sin(a) * len * 0.5, cy = -140 - Math.cos(a) * len * 0.95;   // F1082: frondas que caen en arco, como la palma real
        g += p('tr-ram t2', 'M0 -140 Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1));
        for (let k = 1; k <= 9; k++) {
          const t = k / 10, mt = 1 - t;
          const bx = mt * mt * 0 + 2 * mt * t * cx + t * t * tx, by = mt * mt * -140 + 2 * mt * t * cy + t * t * ty;
          const dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
          const sz = 9 * (1 - t * 0.55);
          for (const side of [-1, 1]) {
            const ex = bx + nx * side * sz, ey = by + ny * side * sz;
            g += p(side > 0 ? 'tr-h' : 'tr-h2', 'M' + bx.toFixed(1) + ' ' + by.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + (bx + ux * 4).toFixed(1) + ' ' + (by + uy * 4).toFixed(1) + 'Z');
          }
        }
      }
      return g + ci('tr-h3', 0, -142, 8);
    }
    if (forma === 'florido') {   // F930: copa ancha y suelta con tres colores (lila, rosa y violeta) y pétalos que caen
      return p('tr-t t10', 'M0 0 C-4 -28 5 -58 0 -88') + p('tr-t t4', 'M0 -56 C-18 -66 -34 -78 -44 -96') + p('tr-t t4', 'M0 -66 C18 -78 34 -88 46 -104') + p('tr-t t3', 'M0 -84 C-6 -98 -8 -110 -12 -124')
        + ci('tr-h', 0, -126, 38) + ci('tr-h', -42, -104, 26) + ci('tr-h', 44, -108, 27) + ci('tr-h', -20, -152, 24) + ci('tr-h', 24, -150, 24) + ci('tr-h', -64, -120, 15) + ci('tr-h', 66, -122, 15)
        + ci('tr-h2', -14, -132, 17) + ci('tr-h2', 30, -118, 14) + ci('tr-h2', -44, -112, 11) + ci('tr-h2', 6, -160, 11) + ci('tr-h2', 58, -134, 9)
        + ci('tr-h3', 10, -140, 8) + ci('tr-h3', -34, -128, 7) + ci('tr-h3', 40, -100, 7) + ci('tr-h3', -8, -112, 6) + ci('tr-h3', 20, -166, 6) + ci('tr-h3', -56, -102, 5)
        + ci('tr-h3', -26, 4, 3) + ci('tr-h2', 22, 8, 3) + ci('tr-h3', 40, 2, 2.5) + ci('tr-h2', -44, 6, 2.5);
    }
    if (especie === 'canelo') return p('tr-t t10', 'M0 0 C-2 -40 3 -80 0 -118') + p('tr-t t4', 'M0 -80 C-14 -90 -24 -102 -28 -116') + p('tr-t t4', 'M0 -92 C14 -102 24 -112 28 -126')
      + ci('tr-h', 0, -140, 34) + ci('tr-h', -22, -118, 25) + ci('tr-h', 24, -120, 25) + ci('tr-h', -10, -168, 23) + ci('tr-h', 12, -166, 23) + ci('tr-h', 0, -190, 15) + ci('tr-h2', -8, -146, 14) + ci('tr-h2', 16, -128, 10) + ci('tr-h2', 2, -176, 8);
    if (especie === 'quillay') return p('tr-t t10', 'M0 0 C-3 -24 3 -48 0 -72') + p('tr-t t4', 'M0 -46 C-18 -54 -34 -64 -46 -80') + p('tr-t t4', 'M0 -54 C18 -62 34 -70 48 -84')
      + ci('tr-h', 0, -104, 38) + ci('tr-h', -46, -92, 28) + ci('tr-h', 46, -94, 28) + ci('tr-h', -22, -128, 26) + ci('tr-h', 24, -128, 26) + ci('tr-h', -68, -84, 16) + ci('tr-h', 68, -86, 16) + ci('tr-h2', -10, -112, 15) + ci('tr-h2', 36, -104, 11) + ci('tr-h2', -50, -98, 9) + ci('tr-h2', 8, -136, 9);
    const tronco = p('tr-t t10', 'M0 0 C-2 -30 3 -60 0 -92') + p('tr-t t4', 'M0 -62 C-16 -72 -28 -84 -36 -98') + p('tr-t t4', 'M0 -72 C16 -82 28 -90 38 -104');
    const copa = ci('tr-h', 0, -122, 44) + ci('tr-h', -34, -102, 30) + ci('tr-h', 34, -104, 31) + ci('tr-h', -18, -144, 28) + ci('tr-h', 20, -142, 28) + ci('tr-h2', -12, -130, 16) + ci('tr-h2', 26, -114, 12) + ci('tr-h2', -34, -112, 10) + ci('tr-h2', 6, -156, 10);
    if (especie === 'canelo') return p('tr-t t8', 'M0 0 C-2 -40 3 -80 0 -118') + ci('tr-h', 0, -134, 36) + ci('tr-h', -24, -110, 26) + ci('tr-h', 24, -112, 26) + ci('tr-h', -10, -160, 24) + ci('tr-h', 12, -158, 24) + ci('tr-h', 0, -182, 15) + ci('tr-h2', -8, -140, 14) + ci('tr-h2', 18, -118, 10) + ci('tr-h2', 6, -166, 8);
    if (especie === 'quillay') return p('tr-t t10', 'M0 0 C-2 -20 3 -40 0 -66') + p('tr-t t4', 'M0 -44 C-20 -52 -36 -62 -48 -76') + p('tr-t t4', 'M0 -48 C20 -58 38 -66 50 -80') + ci('tr-h', 0, -100, 40) + ci('tr-h', -44, -90, 30) + ci('tr-h', 44, -92, 30) + ci('tr-h', -22, -124, 28) + ci('tr-h', 24, -124, 28) + ci('tr-h', -64, -84, 18) + ci('tr-h', 64, -86, 18) + ci('tr-h2', -10, -112, 16) + ci('tr-h2', 36, -100, 12) + ci('tr-h2', -46, -98, 10);
    // F977 · Peumo (copa densa y compacta, con frutos oscuros) y maitén (copa ancha con ramas que caen en curva)
    if (especie === 'peumo') return tronco + ci('tr-h', 0, -128, 38) + ci('tr-h', -26, -112, 30) + ci('tr-h', 26, -112, 30) + ci('tr-h', -14, -158, 26) + ci('tr-h', 16, -156, 24) + ci('tr-h', 0, -184, 16) + ci('tr-h2', -8, -134, 14) + ci('tr-h2', 18, -116, 10) + ci('tr-h2', -20, -162, 9)
      + [[-20, -120], [8, -146], [24, -124], [-6, -102], [12, -168]].map((q) => '<circle class="tr-h3" cx="' + q[0] + '" cy="' + q[1] + '" r="2.6"/>').join('');
    if (especie === 'maiten') { let h = ''; for (let x = -56; x <= 56; x += 14) { const s = x < 0 ? -1 : 1; h += '<path class="tr-hebra" d="M' + x + ' -104 C' + (x + 8 * s) + ' -84 ' + (x + 14 * s) + ' -62 ' + (x + 4 * s) + ' -40"/>' + ci('tr-h2', x + 4 * s, -40, 4.2); } return tronco + ci('tr-h', 0, -118, 34) + ci('tr-h', -34, -104, 28) + ci('tr-h', 34, -104, 28) + ci('tr-h', -54, -96, 20) + ci('tr-h', 54, -96, 20) + h; }
  if (forma === 'cascada') {
      let h = ''; for (let x = -46; x <= 46; x += 11.5) h += '<path class="tr-hebra" d="M' + x + ' -116 C' + (x + 5) + ' -92 ' + (x - 5) + ' -72 ' + (x + 2) + ' -44"/>';
      return tronco + ci('tr-h', 0, -126, 40) + ci('tr-h', -30, -112, 26) + ci('tr-h', 30, -112, 26) + h;
    }
    return tronco + copa;
  }
  // Árbol de una especie en una etapa: dibujo con la base en (0,0). Si la especie o la etapa no se conocen, se usa el brote (nunca se rompe la pantalla).
  function arbol(especie, etapa, dias) {
    const f = FORMA[especie] || 'redondo';
    const cuerpo = etapa === 'frondoso' ? frondoso(f, especie, dias) : (etapa === 'ramas' && f === 'pewen') ? frondoso('pewen', especie, 8) : etapa === 'ramas' ? ramas(f) : etapa === 'raiz' ? raiz() : brote();
    const bellotas = especie === 'roble' && etapa === 'frondoso' ? '<g fill="#b07a3e" stroke="#7a5024" stroke-width=".5">' + [[-30,-132],[-16,-120],[-2,-112],[14,-118],[28,-130],[-22,-150],[20,-152]].map((q) => '<ellipse cx="' + q[0] + '" cy="' + q[1] + '" rx="2.2" ry="2.8"/>').join('') + '</g>' : '';
    const flores = especie === 'canelo' && etapa === 'frondoso' ? '<g fill="#fbfbf4" stroke="#c9d6b8" stroke-width=".5">' + [[-22,-150],[-8,-168],[12,-160],[24,-142],[-30,-132],[2,-138],[-16,-150],[18,-172]].map((q) => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="2.6"/>').join('') + '</g>' : '';
    const espinas = especie === 'chanar' ? '<g fill="none" stroke="#5a4a2a" stroke-width="1.6" stroke-linecap="round">' + [[-3, -66], [3, -92], [-3, -132], [3, -156]].map((q) => '<path d="M' + q[0] + ' ' + q[1] + ' l' + (q[0] < 0 ? -6 : 6) + ' -3"/>').join('') + '</g>' : '';
    return '<g class="arbol esp-' + esc(especie || 'x') + '">' + cuerpo + flores + bellotas + espinas + '</g>';
  }
  function malezaIcono(tipo) {
    const s = d => '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
    if (tipo === 'trebol_gris') return s('<path d="M12 21v-8"/><circle cx="8.5" cy="9" r="3.5"/><circle cx="15.5" cy="9" r="3.5"/><circle cx="12" cy="5.5" r="3.5"/>');
    if (tipo === 'hierba_seca') return s('<path d="M6 21c0-5-1-9-3-13M11 21c0-6 0-10 1-15M16 21c0-5 1-8 4-11M20 21c0-3 1-5 2-6"/>');
    return s('<path d="M4 18C2 9 9 3 20 3c1 9-4 16-14 16z"/><path d="M5 19c4-4 9-8 13-13"/>');
  }


  // ---------- F937 · Paisaje y clima elegibles (se guardan en este teléfono; no tocan la cuenta ni SYNC_CLAVES) ----------
  const KFONDO = 'tb_inicio_fondo', KCLIMA = 'tb_inicio_clima';
  const FONDOS = [['colinas', 'Colinas'], ['lago', 'Lago'], ['rio', 'Río'], ['bosque', 'Bosque nativo'], ['montanas', 'Cordillera'], ['volcan', 'Volcán nevado'], ['costa', 'Costa del Pacífico'], ['desierto', 'Desierto florido']];
  const CLIMAS = [['natural', 'Según la estación'], ['despejado', 'Despejado'], ['nublado', 'Nublado'], ['lluvia', 'Lluvia suave'], ['estrellas', 'Noche estrellada'], ['nieve', 'Nieve'], ['arcoiris', 'Arcoíris']];
  const abierto = (tipo, id) => { try { return !!(window.TBInicio && window.TBInicio.tiene(tipo, id)); } catch (e) { return false; } };
  const elegido = (k, lista, def, tipo) => { const v = lsGet(k); return lista.some((x) => x[0] === v) && abierto(tipo, v) ? v : def; };
  const fondoActual = () => elegido(KFONDO, FONDOS, 'colinas', 'lugar'), climaActual = () => elegido(KCLIMA, CLIMAS, 'natural', 'clima');
  const nube = (x, y, k) => '<g class="nu" transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><ellipse cx="0" cy="0" rx="30" ry="9"/><ellipse cx="-14" cy="-6" rx="14" ry="9"/><ellipse cx="6" cy="-10" rx="17" ry="11"/><ellipse cx="20" cy="-4" rx="12" ry="7"/></g>';
  // Detrás de las colinas (cielo y lejanía)
  function atras(f) {
    if (f === 'montanas') return '<g class="pa-mont"><path class="mo m2" d="M-60 292 L10 214 L52 252 L104 196 L170 276 L228 208 L284 262 L330 220 L430 292Z"/><path class="mo m1" d="M-40 296 L40 206 L84 256 L140 168 L206 270 L262 190 L318 258 L372 204 L440 296Z"/>'
      + '<path class="nv" d="M140 168 L124 188 L134 184 L142 194 L150 184 L158 188Z"/><path class="nv" d="M262 190 L248 208 L256 204 L264 212 L272 204 L278 208Z"/><path class="nv" d="M40 206 L28 222 L36 219 L42 226 L48 219 L54 222Z"/></g>';
    if (f === 'volcan') return '<g class="pa-volc"><path class="mo m2" d="M-60 292 L30 232 L90 262 L150 226 L210 278 L330 236 L430 292Z"/><path class="mo m1" d="M196 292 L258 196 C264 184 276 184 282 196 L346 292Z"/><path class="nv" d="M250 210 L258 196 C264 184 276 184 282 196 L290 212 C280 204 272 214 266 206 C260 214 254 206 250 210Z"/><ellipse class="humo" cx="272" cy="176" rx="9" ry="5"/><ellipse class="humo" cx="280" cy="164" rx="12" ry="6"/><ellipse class="humo" cx="292" cy="152" rx="15" ry="7"/></g>';
    if (f === 'bosque') {   // F1078 · Bosque nativo: una franja de copas en dos tonos, sin conos (los conos parecían pinos). Posiciones fijas.
      let g = '<g class="pa-bosque">';
      // F1088: el bosque ya no lleva fondo de árboles (pedido del usuario)
      return g + '</g>';
    }
    if (f === 'desierto') return '<g class="pa-desierto" aria-hidden="true">'   // F1056 · Desierto: dunas, una mesa lejana y dos cactus (fondo propio, no vacío)
      + '<path class="mo m2" fill="#ecd29c" d="M-60 300 C20 262 80 270 130 286 S240 258 300 276 S380 262 430 290 L430 330 L-60 330Z"/>'
      + '<path d="M30 290 L46 252 Q52 242 66 242 L110 242 Q122 242 128 252 L140 290Z" fill="#cf9f63"/><path d="M46 252 Q52 242 66 242 L110 242 Q122 242 128 252 L120 256 L56 256Z" fill="#e2b47a"/>'
      + '<path class="mo m1" fill="#dcb374" d="M-60 312 C40 290 110 298 170 306 S300 288 360 300 S410 306 430 302 L430 340 L-60 340Z"/></g>';   // F1089: sin cactus repetidos de fondo
    if (f === 'costa') return '<g class="pa-mar"><path class="mar" d="M-300 240 C-170 226 -60 252 60 238 S250 224 380 242 S560 254 700 236 L700 306 L-300 306Z"/><path class="ola" d="M24 258 q9 -4 18 0 t18 0 M168 266 q9 -4 18 0 t18 0 M296 252 q9 -4 18 0 t18 0 M92 282 q9 -4 18 0 t18 0"/></g>';   // F1089: mar con oleaje irregular, sin velero
    return '';
  }
  function cielo(c) {
    if (c === 'estrellas') { let g = '<rect class="noche" x="-300" y="110" width="960" height="200" fill="url(#ilNoche)"/><g class="estr">'; for (let i = 0; i < 26; i++) g += '<circle cx="' + (6 + ((i * 53) % 350)) + '" cy="' + (128 + ((i * 37) % 120)) + '" r="' + (i % 4 === 0 ? 1.5 : 1) + '"/>'; return g + '</g>'; }
    if (c === 'arcoiris') { const col = ['#e5484d', '#f2a03a', '#f2d64a', '#5cc98a', '#4f9fd8', '#8a6ad6']; return '<g class="arco">' + col.map((k, i) => '<path d="M' + (150 - i * 5) + ' 296 A' + (95 - i * 5) + ' ' + (95 - i * 5) + ' 0 0 1 ' + (340 + i * 5 - 0) + ' 296" fill="none" stroke="' + k + '" stroke-width="4.5"/>').join('') + '</g>'; }
    return '';
  }
  // Sobre las colinas (agua y flores)
  function frente(f) {
    if (f === 'costa') return '<g class="cap cap3"><path d="M-20 330 C80 322 200 334 380 326 L380 420 L-20 420Z" fill="#e6cf9c"/>'
      + '<path d="M-20 372 C100 364 220 376 380 368 L380 420 L-20 420Z" fill="#d6b77e"/>'   // F1085 · arena en sombra abajo (luz arriba)
      + '<path d="M-20 330 C80 322 200 334 380 326" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>'   // espuma de la marea
      + '<path d="M40 352 q8 -3 16 0 M190 360 q8 -3 16 0 M300 344 q8 -3 16 0 M110 392 q8 -3 16 0" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>'   // ondas de arena (brillos)
      + '</g>';
    if (f === 'lago') return '<g class="cap cap2"><path class="agua" d="M-20 318 C50 306 150 312 200 311 S330 306 400 318 L400 342 C300 334 100 337 -20 342Z"/><path class="brillo" d="M40 322 h34 M120 328 h44 M230 321 h40 M300 330 h30"/><path class="junco" d="M24 342 l-2 -16 M30 342 l2 -13 M338 340 l-2 -16 M344 340 l3 -12"/></g>';
    if (f === 'rio') return '<g class="cap cap3"><path class="agua" d="M262 296 C250 316 292 326 272 348 C254 370 332 390 318 424 L376 424 C388 390 322 372 338 348 C354 328 304 316 314 296Z"/><path class="brillo" d="M280 320 h14 M296 352 h18 M318 392 h20"/></g>';
    if (f === 'desierto') return '';   // F1090: sin puntos de color sueltos en el fondo
    return '';
  }
  // F978 · Clima «Según la estación» (Chile, hemisferio sur): cada estación tiene su cielo. Usa climas ya conocidos; no regala ninguno.
  const CLIMA_ESTACION = { verano: 'despejado', otono: 'nublado', invierno: 'lluvia', primavera: 'despejado' };
  const estacionChile = (f) => { const m = (f || new Date()).getMonth() + 1; return (m === 12 || m <= 2) ? 'verano' : m <= 5 ? 'otono' : m <= 8 ? 'invierno' : 'primavera'; };
  const climaReal = (c) => (c === 'natural' ? CLIMA_ESTACION[estacionChile()] : c);
  // Clima: sol, luna, nubes y caída suave. Solo se mueve con transform/opacity y se detiene con «reducir movimiento».
  function climaSvg(c0) {
    const c = climaReal(c0);
    if (c0 === 'natural' && c === 'despejado' && (() => { const h = new Date().getHours(); return h >= 20 || h < 6; })()) return ''; // F990: de noche el modo natural no repite la luna del fondo
    const noche = (() => { const h = new Date().getHours(); return h >= 20 || h < 6; })();
    if (c === 'despejado') return noche ? '<g class="cl-luna"><circle cx="292" cy="168" r="15"/><circle class="hu" cx="299" cy="164" r="13"/></g>' : '<g class="cl-sol"><circle class="ha" cx="292" cy="168" r="30"/><circle cx="292" cy="168" r="15"/></g>';
    if (c === 'estrellas') return '<g class="cl-luna"><circle cx="60" cy="160" r="13"/><circle class="hu" cx="66" cy="156" r="11"/></g>';
    if (c === 'arcoiris') return '<g class="cl-nubes">' + nube(300, 150, .9) + nube(70, 172, 1) + '</g>';
    if (c === 'nublado') return '<g class="cl-nubes">' + nube(70, 160, 1.3) + nube(250, 176, 1.1) + nube(170, 140, .9) + '</g>';
    let g = '<g class="cl-nubes oscuro">' + nube(60, 150, 1.4) + nube(180, 138, 1.2) + nube(290, 156, 1.3) + '</g>';
    if (c === 'lluvia') { g += '<g class="cl-ll">'; for (let i = 0; i < 18; i++) g += '<line x1="' + (10 + i * 20) + '" y1="' + (170 + (i % 4) * 8) + '" x2="' + (7 + i * 20) + '" y2="' + (182 + (i % 4) * 8) + '"/>'; g += '</g>'; }
    if (c === 'nieve') { g += '<g class="cl-ni">'; for (let i = 0; i < 20; i++) g += '<circle cx="' + (12 + i * 18) + '" cy="' + (172 + (i % 5) * 9) + '" r="' + (1.6 + (i % 3) * .5) + '"/>'; g += '</g>'; }
    return g;
  }
  function paisajeHoja(alCambiar) {
    const T = window.TBInicio, K = (CAT && CAT) || {}, saldo = () => { try { return T.cargar().gotas.saldo; } catch (e) { return 0; } };
    const h = document.createElement('div'); h.className = 'hoja'; h.id = 'hojaPaisaje'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); h.setAttribute('aria-label', 'Tu paisaje');
    const fila = (lista, act, k, tipo) => '<div class="apar-fila pa-fila" role="group">' + lista.map((x) => {
      const a = abierto(tipo, x[0]), it = (K[tipo === 'lugar' ? 'lugares' : 'climas'] || {})[x[0]] || {};
      return '<button type="button" class="apar-op pa-op' + (act === x[0] ? ' on' : '') + (a ? '' : ' bloq') + '" data-pk="' + k + '" data-pt="' + tipo + '" data-pv="' + x[0] + '" aria-pressed="' + (act === x[0]) + '">' + x[1] + (a ? '' : '<small>' + (it.precio || '') + ' gotas</small>') + '</button>'; }).join('') + '</div>';
    const pinta = () => { h.innerHTML = '<div class="hoja-in"><div class="hoja-asa" aria-hidden="true"></div><h3>Tu paisaje</h3><p class="suave">Elige dónde crece tu árbol y cómo está el cielo. Lo nuevo se desbloquea con tus gotas de rocío: ahora tienes <b>' + saldo() + '</b>.</p>'
      + '<h4 class="apar-t">El lugar</h4>' + fila(FONDOS, fondoActual(), 'f', 'lugar') + '<h4 class="apar-t">El clima</h4>' + fila(CLIMAS, climaActual(), 'c', 'clima') + '<div class="pa-compra" id="paCompra" aria-live="polite"></div><button type="button" class="btn" id="paOk">Listo</button></div>'; ligar(); };
    const cerrar = () => { try { h.remove(); } catch (e) { /* ya cerrada */ } };
    function ligar() {
      Array.prototype.forEach.call(h.querySelectorAll('.pa-op'), (b) => b.addEventListener('click', () => {
        const tipo = b.getAttribute('data-pt'), id = b.getAttribute('data-pv'), cj = $('#paCompra', h);
        if (!abierto(tipo, id)) {                                   // bloqueado: se ofrece desbloquear con gotas
          const it = (K[tipo === 'lugar' ? 'lugares' : 'climas'] || {})[id] || {}, ok = saldo() >= (it.precio || 0);
          cj.innerHTML = '<p><b>' + esc(it.nombre || id) + '</b> · ' + esc(it.dato || '') + '</p><p class="suave">' + (ok ? 'Cuesta ' + it.precio + ' gotas.' : 'Cuesta ' + it.precio + ' gotas y tienes ' + saldo() + '. Las gotas se ganan leyendo, haciendo una acción de Vida, completando un día de plan o marcando una oración contestada.') + '</p>' + (ok ? '<button type="button" class="btn chico" id="paDesb">Desbloquear</button>' : '');
          const d = $('#paDesb', h); if (d) d.onclick = () => { const r = T.comprar(tipo, id); if (!r.ok) return; sonido('semilla'); lsSet(tipo === 'lugar' ? KFONDO : KCLIMA, id); pinta(); if (alCambiar) alCambiar(); };
          return;
        }
        lsSet(b.getAttribute('data-pk') === 'f' ? KFONDO : KCLIMA, id); pinta(); if (alCambiar) alCambiar();
      }));
      $('#paOk', h).onclick = cerrar;
    }
    h.addEventListener('click', (e) => { if (e.target === h) cerrar(); });
    document.body.appendChild(h); pinta();
  }

  // ---------- Escena (colinas + árbol + paisaje) ----------
  const COL = { c1: 'M-300 300 C-120 255 40 270 150 290 S 330 268 660 286 L660 420 L-300 420Z', c2: 'M-300 332 C-100 296 60 320 190 322 S 380 300 660 326 L660 420 L-300 420Z', c3: 'M-300 374 C-120 336 80 348 190 344 S 400 336 660 362 L660 420 L-300 420Z' };
  // F931 · I4: gotas de rocío. Se ven hasta `visibles_max` (8) en el pasto; el resto se agrupa en una gota grande «+n». No vencen.
  function gotasHTML(est) {
    const pe = (est.gotas && est.gotas.pendientes) || [], mx = (CAT && CAT.economia && CAT.economia.visibles_max) || 8, ver = pe.slice(0, mx), mas = pe.length - ver.length;
    return ver.map((g) => '<button type="button" class="il-gota s-' + esc(g.casilla) + '" data-id="' + esc(g.id) + '" aria-label="Gota de rocío. Toca para recogerla">' + ic(IC.gota, 24) + '</button>').join('')
      + (mas > 0 ? '<button type="button" class="il-gota il-gota-grupo" data-id="todas" aria-label="Recoger ' + pe.length + ' gotas de rocío">' + ic(IC.gota, 30) + '<b>+' + mas + '</b></button>' : '');
  }
  function gotasTexto(est) { return gotasTexto0(est); }   // F1070: sin frutos
  function gotasTexto0(est) { const g = est.gotas || {}, n = (g.pendientes || []).length; return (g.saldo || g.total || n) ? ic(IC.gota, 16) + (g.saldo || 0) + (g.saldo === 1 ? ' gota guardada' : ' gotas guardadas') + (n ? ' · ' + n + ' por recoger' : '') : ''; }
  // F933: el Vivero con contenido visual. Cada semilla y ave tiene su dibujo, hay una vista previa grande de lo que se obtiene y el avance hacia su precio.
  // Todo se anima con transform/opacity y se queda quieto en «reducir movimiento»/Ahorro. Sin atributo style (CSP): los tamaños salen de clases y de atributos SVG.
  let vivAbierto = false, vivMsg = '', vivSel = null, vivTab = 'flores';
  const g = (a, col) => '<g fill="none" stroke="' + (col || '#5c8f63') + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + a + '</g>';
  // F936: cada flor se dibuja en su propia caja (w×h) con la altura real relativa: la lavanda es una mata alta, la pata de guanaco una alfombra baja.
  const DIM = { copihue: [34, 56], ananuca: [30, 44], pata_de_guanaco: [46, 24], lavanda: [28, 56], pasto_alto: [34, 40], bambu: [34, 70], flor_de_loto: [44, 34], bonsai: [44, 44], planta_fantasma: [30, 40], welwitschia: [62, 26], dracaena_cinnabari: [58, 60], orquidea_subterranea: [40, 34], secuoya_roja: [34, 70], rafflesia: [48, 28], llareta: [56, 40], chagual: [44, 70], notro: [40, 64], chilco: [40, 46], ulmo: [46, 60], garra_de_leon: [40, 40], chachacoma: [36, 40] };
  const KV = { pasto_alto: 2.2, bambu: 1.4, flor_de_loto: 2.4, bonsai: 2.2, planta_fantasma: 2.4, welwitschia: 2.4, dracaena_cinnabari: 1.4, orquidea_subterranea: 2.6, secuoya_roja: 1.3, rafflesia: 2.8 }, SOLO = ['bonsai', 'welwitschia', 'dracaena_cinnabari', 'secuoya_roja', 'rafflesia', 'bambu'];   // F961: escala y cuántas copias en la vista previa
  const pet = (cx, cy, r, col, n) => Array.from({ length: n || 5 }, (_, i) => { const a = (i * 360 / (n || 5)) * Math.PI / 180; return '<circle cx="' + (cx + Math.sin(a) * r * 0.62).toFixed(1) + '" cy="' + (cy - Math.cos(a) * r * 0.62).toFixed(1) + '" r="' + (r * 0.5).toFixed(1) + '" fill="' + col + '"/>'; }).join('');
  const campana = (x, y, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0 0C-4 2-7 8-8 14Q-4 16 0 14Q4 16 8 14C7 8 4 2 0 0z" fill="#c8264a"/><path d="M0 3C-2 6-3 10-3.4 13Q0 14.2 3.4 13C3 10 2 6 0 3z" fill="#e8627f"/><path d="M-8 14Q-4 16 0 14Q4 16 8 14" fill="none" stroke="#f6d3da" stroke-width="1.1"/><circle cx="-1.6" cy="16.6" r=".8" fill="#f1d36a"/><circle cx="0" cy="17.6" r=".8" fill="#f1d36a"/><circle cx="1.6" cy="16.6" r=".8" fill="#f1d36a"/></g>';
  const trompeta = (a) => '<g transform="rotate(' + a + ' 15 15)"><path d="M14.2 15 11.4 3.6Q15 1 18.6 3.6L15.8 15z" fill="#d93a2b"/><ellipse cx="15" cy="3.6" rx="3.1" ry="1.5" fill="#f4c34a"/><path d="M15 3.4V.4M13.4 3.2 12.4 .8M16.6 3.2 17.6 .8" stroke="#f3e2a0" stroke-width=".7" stroke-linecap="round"/></g>';
  const espiga = (x, y0, n, paso, c1, c2) => Array.from({ length: n }, (_, i) => { const y = y0 + i * paso, k = 1 - Math.max(0, (n - 3 - i)) * 0 , w = i < 2 ? 1.5 : 2.2; return '<ellipse cx="' + (x + (i % 2 ? 1.5 : -1.5)) + '" cy="' + y + '" rx="' + w + '" ry="1.8" fill="' + (i % 2 ? c1 : c2) + '"/>'; }).join('');
  const FLORES = {
    copihue: () => g('<path d="M10 56C13 47 8 41 12 33S18 21 14 6"/><path d="M13 20C19 16 24 17 24 21M12 38C8 36 6 38 6 40"/>', '#6a8f58') + '<g fill="#4f8a55"><ellipse cx="16" cy="44" rx="3.6" ry="1.9" transform="rotate(-30 16 44)"/><ellipse cx="8" cy="30" rx="3.4" ry="1.8" transform="rotate(25 8 30)"/><ellipse cx="17" cy="28" rx="3.4" ry="1.8" transform="rotate(-25 17 28)"/><ellipse cx="11" cy="14" rx="3.2" ry="1.7" transform="rotate(30 11 14)"/><ellipse cx="17" cy="9" rx="3.2" ry="1.7" transform="rotate(-30 17 9)"/></g>' + campana(24, 21, 1) + campana(6, 40, .85),
    ananuca: () => g('<path d="M15 44C10 40 7 36 4 28M15 44C20 40 23 36 26 28M15 44C14 38 13 34 12 30"/>', '#6b9a58') + g('<path d="M15 44V15"/>', '#86a259').replace('1.5', '2.2') + [-56, -22, 12, 46].map(trompeta).join('') + '<circle cx="15" cy="15" r="1.6" fill="#b92a1f"/>',
    pata_de_guanaco: () => '<path d="M23 24C14 24 6 22 1 20c7-3 15-2 22 0 7-2 15-3 22 0-4 2-12 4-22 4z" fill="#86aa80"/><path d="M8 22c4-2 9-2 15-1M38 22c-4-2-9-2-15-1" stroke="#6d9568" stroke-width=".8" fill="none"/>' + g('<path d="M8 20 8 13M15 20 15 8M23 20V5M31 20 31 9M38 20 38 13M12 21 12 17M27 21 27 14M19 21 19 13M34 21 34 18"/>', '#6d9568') + [[8, 12, '#c9429a'], [15, 7, '#d46ab4'], [23, 4, '#c9429a'], [31, 8, '#d46ab4'], [38, 12, '#c9429a'], [12, 16, '#b8328a'], [27, 13, '#d46ab4'], [19, 12, '#b8328a'], [34, 17, '#c9429a']].map((q) => pet(q[0], q[1], 5, q[2]) + '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1" fill="#f6e08a"/>').join(''),
    lavanda: () => g('<path d="M14 56C10 50 7 46 4 40M14 56C17 50 20 46 24 40M14 56c-1-6-1-11-1-16"/>', '#7a9a78') + g('<path d="M14 56V13M8 56C8 42 6 32 5 20M20 56C20 42 22 33 23 24"/>', '#6f9366') + espiga(14, 3, 8, 3.1, '#a583e3', '#8a63cf') + espiga(5, 10, 5, 2.9, '#a583e3', '#8a63cf') + espiga(23, 13, 5, 2.9, '#a583e3', '#8a63cf'),
    pasto_alto: () => '<path d="M1.4 40 Q3.2 25.7 0.0 14.0 Q5.5 25.7 6.6 40Z" fill="#86b56a"/><path d="M6.2 40 Q8.4 21.3 6.0 6.0 Q10.9 21.3 11.8 40Z" fill="#6fa563"/><path d="M11.0 40 Q13.6 18.0 12.0 0.0 Q16.3 18.0 17.0 40Z" fill="#5f9a58"/><path d="M16.2 40 Q19.6 20.2 22.0 4.0 Q22.1 20.2 21.8 40Z" fill="#6fa563"/><path d="M21.4 40 Q25.2 23.5 30.0 10.0 Q27.5 23.5 26.6 40Z" fill="#86b56a"/><path d="M26.0 40 Q29.4 19.1 31.0 2.0 Q32.1 19.1 32.0 40Z" fill="#5f9a58"/><path d="M31.6 40 Q32.8 26.8 28.0 16.0 Q35.0 26.8 36.4 40Z" fill="#92c47e"/><path d="M10.0 40 Q10.8 27.9 6.0 18.0 Q12.6 27.9 14.0 40Z" fill="#a4d08a"/><path d="M24.0 40 Q27.4 29.0 33.0 20.0 Q29.2 29.0 28.0 40Z" fill="#a4d08a"/><ellipse cx="7" cy="36" rx="3" ry="1.2" fill="#8a6a3c" opacity=".6"/><ellipse cx="26" cy="38" rx="4" ry="1.4" fill="#4f8048" opacity=".5"/><g fill="#c9b06a"><ellipse cx="14" cy="1.2" rx="1.1" ry="2.6"/><ellipse cx="29" cy="2.8" rx="1" ry="2.2"/><ellipse cx="34" cy="16.5" rx="1" ry="2"/></g>',
    bambu: () => (() => { const lf = (x, y, a, k) => '<path d="M0 0Q4.5 -2.6 10 0Q4.5 2.6 0 0z" transform="translate(' + x + ' ' + y + ') rotate(' + a + ') scale(' + (k || 1) + ')" fill="#6fa563" stroke="#4f8a45" stroke-width=".4"/>'; return '<g transform="translate(0 6)"><g fill="#86b35e" stroke="#5d8a40" stroke-width=".6"><rect x="7" y="4" width="4.6" height="60" rx="2.2"/><rect x="17" y="14" width="4.2" height="50" rx="2"/><rect x="26" y="26" width="3.6" height="38" rx="1.8"/></g><path d="M7 18h4.6M7 34h4.6M7 50h4.6M17 26h4.2M17 40h4.2M17 54h4.2M26 38h3.6M26 52h3.6" stroke="#4d7a35" stroke-width="1.3"/><path d="M11.6 30C16 28 19 26 22 22M17 36C13 34 10 30 8 28M26 44C23 42 21 40 20 38" fill="none" stroke="#6c9a4a" stroke-width=".9"/>' + lf(9, 5, -50) + lf(9, 5, -5) + lf(9, 5, 40) + lf(19, 15, -45) + lf(19, 15, 0, .9) + lf(19, 15, 45) + lf(22, 21, -20, .9) + lf(8, 28, 190, .9) + lf(28, 27, -35, .9) + lf(28, 27, 25, .9) + lf(20, 38, 190, .8) + '</g>'; })(),
    flor_de_loto: () => '<ellipse cx="22" cy="31" rx="21" ry="3.2" fill="#7bb8c9" opacity=".55"/><ellipse cx="11" cy="29" rx="9" ry="3.4" fill="#5f9a62"/><ellipse cx="34" cy="29.5" rx="8" ry="3" fill="#6fa563"/>' + [-58, -30, 0, 30, 58].map((a) => '<ellipse cx="22" cy="15" rx="4.2" ry="10" transform="rotate(' + a + ' 22 25)" fill="#f6bfd6" stroke="#e48fb4" stroke-width=".7"/>').join('') + '<ellipse cx="22" cy="17" rx="3.4" ry="8.5" fill="#fbd3e3" stroke="#e48fb4" stroke-width=".6"/><circle cx="22" cy="22" r="2.2" fill="#f4d467"/>',
    bonsai: () => '<path d="M18 42 C17 34 22 28 21 22 C20 17 25 13 27 8 L29.2 8.4 C27.4 14 24.5 18 25.6 23 C26.6 28 21.6 33 22.6 42Z" fill="#7a5230"/><path d="M21 27 C15 25 12 21 9 18 L10.6 16.8 C14 19 18 22.6 22.5 24.5Z" fill="#7a5230"/><path d="M26 16 C30 16 33 15 35 13 L35.5 14.6 C33 17 30 18 26 18Z" fill="#7a5230"/><ellipse cx="10" cy="15" rx="7" ry="4.6" fill="#3f7f48"/><ellipse cx="26" cy="8" rx="8.4" ry="5" fill="#3f7f48"/><ellipse cx="34" cy="16" rx="6" ry="4" fill="#3f7f48"/><ellipse cx="16" cy="6.5" rx="5" ry="3.2" fill="#3f7f48"/><ellipse cx="8" cy="13.4" rx="3.6" ry="1.9" fill="#66ab6c"/><ellipse cx="24" cy="6.2" rx="4.4" ry="2" fill="#66ab6c"/><ellipse cx="33" cy="14.4" rx="3" ry="1.7" fill="#66ab6c"/><ellipse cx="14.5" cy="5" rx="2.6" ry="1.3" fill="#66ab6c"/><path d="M9 40 H35 L33 44 H11Z" fill="#b5653f"/><rect x="7" y="38.2" width="30" height="3" rx="1.2" fill="#c97a52"/><ellipse cx="22" cy="38.2" rx="13" ry="1.2" fill="#4a2e1a"/>',
    planta_fantasma: () => (() => { const bl = (x, y) => '<g transform="translate(' + x + ' ' + y + ')"><path d="M-3.6 -1.4C-3.6 -4 3.6 -4 3.6 -1.4C3.8 2 4.4 4 5 5.4C2.4 6.6 -2.4 6.6 -5 5.4C-4.4 4 -3.8 2 -3.6 -1.4z" fill="#fbf8f1" stroke="#b9b09b" stroke-width=".8"/><path d="M-3 5.2C-1.4 6.4 1.4 6.4 3 5.2" stroke="#e2a8a0" stroke-width="1.2" fill="none"/><circle cx="0" cy="3.4" r=".9" fill="#e7b94a"/></g>'; const tallo = (d) => '<path d="' + d + '" fill="none" stroke="#b9b09b" stroke-width="4.6" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#fbf8f1" stroke-width="3" stroke-linecap="round"/>'; return '<ellipse cx="15" cy="38.6" rx="14" ry="2.6" fill="#5e4c39"/><path d="M4 38l3-2 2 2M20 38l3-3 3 3" stroke="#8a6d4b" stroke-width="1.4" fill="none"/>' + tallo('M8 37C8 29 7 21 9 14C10 10 14 9 15 12') + tallo('M16 37C16 28 17 18 18.5 9C19 5 23 4 24 7') + tallo('M23 37C23 32 24 29 22.5 24') + '<g fill="#ece4d3" stroke="#b9b09b" stroke-width=".4"><path d="M7 30l-3 -1.4 2.4 3zM17.4 26l3 -1.6 -2.2 3.2zM9 22l-3 -1 2.6 2.6zM18 17l3 -1 -2.4 2.6zM22.4 31l2.8 -1.2 -2 2.8z"/></g>' + bl(15, 14.5) + bl(24, 9.5) + bl(22, 26.5); })(),
    welwitschia: () => (() => { const cinta = (m) => { const X = (v) => m ? 56 - v : v; return ['M' + X(24) + ' 19C' + X(16) + ' 23 ' + X(8) + ' 23 ' + X(3) + ' 20C' + X(1) + ' 18 ' + X(2) + ' 15 ' + X(5) + ' 15', 'M' + X(24) + ' 16C' + X(15) + ' 17 ' + X(9) + ' 14 ' + X(5) + ' 10', 'M' + X(25) + ' 21C' + X(17) + ' 25 ' + X(10) + ' 25 ' + X(6) + ' 24'].map((d, i) => '<path d="' + d + '" fill="none" stroke="' + ['#8f9f5e', '#a8b56f', '#7c8c4f'][i] + '" stroke-width="' + [5.5, 4.2, 4][i] + '" stroke-linecap="round"/>').join('') + '<path d="M' + X(20) + ' 20C' + X(14) + ' 22 ' + X(9) + ' 22 ' + X(5) + ' 20M' + X(19) + ' 17C' + X(14) + ' 17 ' + X(10) + ' 15 ' + X(7) + ' 12" stroke="#5f6e3a" stroke-width=".6" fill="none"/>'; }; return '<g transform="translate(3 0)"><ellipse cx="28" cy="24" rx="26" ry="1.6" fill="#000" opacity=".1"/>' + cinta(false) + cinta(true) + '<path d="M17 22C16 14 21 10 28 10S40 14 39 22z" fill="#7a5c3e"/><path d="M20 20C20 15 23 12.5 28 12.5" stroke="#5e4530" stroke-width=".8" fill="none"/><path d="M33 21C34 17 33 14 31 12.5M26 21V15" stroke="#5e4530" stroke-width=".7" fill="none"/><ellipse cx="28" cy="10.6" rx="9" ry="2.6" fill="#947451"/><g fill="#c0533c" stroke="#8e3a2a" stroke-width=".4"><ellipse cx="24" cy="7.6" rx="1.6" ry="2.6"/><ellipse cx="28" cy="6.6" rx="1.7" ry="2.8"/><ellipse cx="32" cy="7.6" rx="1.6" ry="2.6"/></g></g>'; })(),
    dracaena_cinnabari: () => '<g transform="translate(7 0)"><path d="M18 60C19 52 20.5 44 20 36h5c0 8 1.4 16 3 24z" fill="#8c7b6a"/><path d="M20.6 56c.4-6 .8-12 .6-18M24 58c0-6 .4-12 1-18" stroke="#6f6052" stroke-width=".8" fill="none"/><path d="M22 38C15 33 10 28 6 24M22 38C20 30 16 25 14 19M22 38C24 30 28 25 31 19M22 38C29 33 34 29 38 24" fill="none" stroke="#8c7b6a" stroke-width="3.2" stroke-linecap="round"/>' + [[5, 23], [13, 17], [31, 17], [39, 23], [22, 14]].map((q) => '<g transform="translate(' + q[0] + ' ' + q[1] + ')" fill="#5f9a62" stroke="#437a47" stroke-width=".4">' + [-65, -35, -10, 15, 40, 65].map((a) => '<ellipse cx="0" cy="-5.5" rx="1.5" ry="6.4" transform="rotate(' + a + ')"/>').join('') + '</g>').join('') + '<path d="M22.4 56c.3-5 .6-9 .4-15" stroke="#b9453a" stroke-width="1.5" fill="none" opacity=".75"/><circle cx="22.8" cy="44" r="1.1" fill="#b9453a"/></g>',
    orquidea_subterranea: () => '<path d="M0 14C8 12 14 15 22 13S34 13 40 14V34H0z" fill="#8a6a4a"/><path d="M0 25C10 23 20 27 40 24V34H0z" fill="#755838"/><path d="M0 14C8 12 14 15 22 13S34 13 40 14" fill="none" stroke="#a98562" stroke-width="1.4"/><g fill="#6f533a"><circle cx="6" cy="20" r="1.2"/><circle cx="33" cy="21" r="1.3"/><circle cx="26" cy="29" r="1.1"/><circle cx="10" cy="30" r="1"/></g><path d="M3 13C3 10 2 9 1 7M5 13C5.4 10 6.4 9 7.4 8M36 13C36 10 35 9 34 7.4M38 13C38.4 11 39 10 39.6 9" stroke="#6fa563" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M6 30C12 27 17 28 20 21C21 18 20.4 16 20 14M14 28C13 25 12 23 11 21M26 25C29 24 31 22 31 15" fill="none" stroke="#f3e6d2" stroke-width="2.6" stroke-linecap="round"/><path d="M4 33c4-2 8-1 12-3M30 33c3-2 6-3 9-3" stroke="#c9b08a" stroke-width=".6" fill="none"/><g fill="#f6dccd" stroke="#c27f6e" stroke-width=".7"><circle cx="17" cy="13" r="2.6"/><circle cx="21.5" cy="10.6" r="2.7"/><circle cx="24.6" cy="13.4" r="2.6"/><circle cx="20.5" cy="14.6" r="2.4"/><circle cx="11" cy="15" r="2.2"/><circle cx="31" cy="14.6" r="2.2"/></g><g fill="#a8483f"><circle cx="17" cy="13" r=".9"/><circle cx="21.5" cy="10.6" r="1"/><circle cx="24.6" cy="13.4" r=".9"/><circle cx="20.5" cy="14.6" r=".8"/><circle cx="11" cy="15" r=".8"/><circle cx="31" cy="14.6" r=".8"/></g>',
    secuoya_roja: () => '<path d="M9 70C11.5 62 12.6 50 13.6 34h6.8C21.4 50 22.5 62 25 70z" fill="#a3583a"/><path d="M13 68C14 56 14.6 46 15.2 34M17 68V34M21 68C20.4 56 19.8 46 19.2 34" stroke="#82442c" stroke-width=".9" fill="none"/><path d="M17 1L22 11 19.6 11 25 21 22 21 28.5 32 25.4 32 31 41H3L8.6 32 5.5 32 12 21 9 21 14.4 11 12 11z" fill="#3f7a4c" stroke="#2f6040" stroke-width=".5"/><path d="M17 1L12 11 14.4 11 9 21 12 21 5.5 32 8.6 32 3 41H17z" fill="#5a9a62" opacity=".75"/>',
    rafflesia: () => '<g transform="translate(0 8) scale(1 .6)">' + [0, 72, 144, 216, 288].map((a) => '<g transform="rotate(' + a + ' 24 17)"><ellipse cx="24" cy="9" rx="8.4" ry="8" fill="#b8402f"/><circle cx="21.5" cy="7" r="1.1" fill="#f1d9c4"/><circle cx="26" cy="10" r="1.1" fill="#f1d9c4"/><circle cx="24" cy="4.5" r=".9" fill="#f1d9c4"/></g>').join('') + '<ellipse cx="24" cy="17" rx="6.4" ry="6" fill="#7a2a1f"/><ellipse cx="24" cy="17" rx="4" ry="3.6" fill="#4d1a14"/></g>',
    llareta: () => '<ellipse cx="28" cy="37" rx="27" ry="4" fill="#2f4a33" opacity=".3"/><path d="M3 36C1 24 11 12 28 11C45 12 55 24 53 36C40 39 16 39 3 36Z" fill="#5f9d52"/>'+'<g fill="#86c16c"><ellipse cx="14" cy="22" rx="5" ry="3.4"/><ellipse cx="30" cy="18" rx="5.6" ry="3.6"/><ellipse cx="43" cy="26" rx="4.6" ry="3.2"/><ellipse cx="22" cy="30" rx="5" ry="3.2"/><ellipse cx="38" cy="33" rx="4.4" ry="2.8"/></g>'+'<g fill="#467f3f"><ellipse cx="8" cy="31" rx="3" ry="2"/><ellipse cx="48" cy="34" rx="3" ry="2"/><ellipse cx="30" cy="36" rx="4" ry="2"/></g>'+'<g fill="#e8c24a"><circle cx="20" cy="14" r=".9"/><circle cx="36" cy="14" r=".9"/><circle cx="27" cy="24" r=".8"/></g>',
    chagual: () => '<g fill="#9aa894" stroke="#6f7d6a" stroke-width=".4"><path d="M22 62L3 42L7 40L22 56Z"/><path d="M22 62L41 42L37 40L22 56Z"/><path d="M22 62L8 36L12 35L22 56Z"/><path d="M22 62L36 36L32 35L22 56Z"/><path d="M22 62L14 30L18 30L22 56Z"/><path d="M22 62L30 30L26 30L22 56Z"/></g>'+'<path d="M22 58V8" stroke="#7d8a72" stroke-width="1.8" stroke-linecap="round"/>'+'<g fill="#f0d24a" stroke="#c9a92e" stroke-width=".3"><circle cx="22" cy="8" r="2.2"/><circle cx="17" cy="14" r="2"/><circle cx="27" cy="14" r="2"/><circle cx="18" cy="22" r="1.8"/><circle cx="26" cy="22" r="1.8"/><circle cx="22" cy="30" r="1.6"/></g>',
    notro: () => '<path d="M20 64C20 52 19 40 20 26" stroke="#7a5a3c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M20 40C15 34 12 30 9 22M20 34C25 29 28 24 31 16M20 28C18 22 17 18 16 12" stroke="#7a5a3c" stroke-width="1.6" fill="none" stroke-linecap="round"/><g fill="#3f7a4c"><ellipse cx="9" cy="46" rx="5" ry="2.6"/><ellipse cx="30" cy="46" rx="5" ry="2.6"/><ellipse cx="11" cy="56" rx="4" ry="2.2"/><ellipse cx="29" cy="56" rx="4" ry="2.2"/></g><g><rect x="10" y="18" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-30 10 18)"/><rect x="12" y="18" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-12 12 18)"/><rect x="8" y="20" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-50 8 20)"/><rect x="15" y="15" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(6 15 15)"/><rect x="27" y="20" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(30 27 20)"/><rect x="30" y="20" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(12 30 20)"/><rect x="25" y="14" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(44 25 14)"/><rect x="19" y="10" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-6 19 10)"/><rect x="17" y="21" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-24 17 21)"/><rect x="24" y="27" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(20 24 27)"/><rect x="29" y="30" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(46 29 30)"/><rect x="9" y="30" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-40 9 30)"/><rect x="13" y="31" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-14 13 31)"/><rect x="19" y="33" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(8 19 33)"/><rect x="25" y="34" width="2.6" height="6.4" rx="1.3" fill="#d8322a" transform="rotate(-18 25 34)"/></g>',
    chilco: () => '<path d="M5 47 C9 36 13 27 21 20 C27 15 33 13 41 15" stroke="#6b4c30" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12 33 C18 29 24 28 31 30" stroke="#6b4c30" stroke-width="1.3" fill="none" stroke-linecap="round"/><g fill="#4f8a55"><ellipse cx="14" cy="27" rx="3.4" ry="1.8" transform="rotate(-32 14 27)"/><ellipse cx="23" cy="18" rx="3.4" ry="1.8" transform="rotate(-28 23 18)"/><ellipse cx="33" cy="14" rx="3.4" ry="1.8" transform="rotate(-18 33 14)"/><ellipse cx="38" cy="20" rx="3" ry="1.6" transform="rotate(14 38 20)"/><ellipse cx="22" cy="34" rx="3.2" ry="1.7" transform="rotate(-10 22 34)"/></g><g fill="#c8323e" opacity=".9"><ellipse cx="10" cy="39" rx="2.6" ry="3.6"/><ellipse cx="20" cy="30" rx="2.6" ry="3.6"/><ellipse cx="31" cy="22" rx="2.6" ry="3.6"/><ellipse cx="38" cy="18" rx="2.4" ry="3.4"/></g><g fill="#7b3f8f"><path d="M10 41 c-2 3 -1 6 1.6 6.2 c2.6 -.2 3.2 -3 1.8 -5.4z"/><path d="M20 32 c-2 3 -1 6 1.6 6.2 c2.6 -.2 3.2 -3 1.8 -5.4z"/><path d="M31 24 c-2 3 -1 6 1.6 6.2 c2.6 -.2 3.2 -3 1.8 -5.4z"/><path d="M38 20 c-2 2.6 -1 5.2 1.4 5.4 c2.2 -.2 2.8 -2.6 1.5 -4.6z"/></g><g stroke="#f2c14e" stroke-width=".7"><path d="M10 47v-3M20 37v-2M31 29v-2M38 25v-2"/></g>',
    ulmo: () => '<rect x="20" y="36" width="4" height="24" fill="#7a5a3c"/><ellipse cx="22" cy="22" rx="20" ry="17" fill="#2f6b44"/><ellipse cx="14" cy="14" rx="9" ry="7" fill="#3f7f52"/><ellipse cx="30" cy="18" rx="8" ry="6" fill="#3f7f52"/><g fill="#fbfbf5" stroke="#c9d6b8" stroke-width=".4"><circle cx="10" cy="20" r="2.2"/><circle cx="18" cy="10" r="2.2"/><circle cx="28" cy="8" r="2.2"/><circle cx="36" cy="16" r="2.2"/><circle cx="22" cy="26" r="2.2"/><circle cx="32" cy="28" r="2.2"/><circle cx="14" cy="30" r="2.2"/><circle cx="40" cy="26" r="2"/></g><g fill="#f2c94c"><circle cx="10" cy="20" r=".7"/><circle cx="18" cy="10" r=".7"/><circle cx="28" cy="8" r=".7"/><circle cx="36" cy="16" r=".7"/><circle cx="22" cy="26" r=".7"/><circle cx="32" cy="28" r=".7"/><circle cx="14" cy="30" r=".7"/></g>',
    garra_de_leon: () => '<path d="M20 40C18 34 19 30 20 26" stroke="#4f7a4a" stroke-width="1.4" fill="none"/><path d="M20 38C10 36 6 30 4 22C10 26 16 30 20 34ZM20 38C30 36 34 30 36 22C30 26 24 30 20 34Z" fill="#4f8a55"/><g fill="#c8322a" stroke="#8e2019" stroke-width=".4"><ellipse cx="14" cy="14" rx="4" ry="3" transform="rotate(-25 14 14)"/><ellipse cx="22" cy="10" rx="4" ry="3"/><ellipse cx="28" cy="15" rx="4" ry="3" transform="rotate(25 28 15)"/><ellipse cx="17" cy="20" rx="4" ry="3" transform="rotate(-10 17 20)"/><ellipse cx="25" cy="21" rx="4" ry="3" transform="rotate(12 25 21)"/><ellipse cx="21" cy="26" rx="4" ry="3"/></g><g fill="#7a1c17"><circle cx="14" cy="14" r=".7"/><circle cx="22" cy="10" r=".7"/><circle cx="28" cy="15" r=".7"/><circle cx="17" cy="20" r=".7"/><circle cx="25" cy="21" r=".7"/><circle cx="21" cy="26" r=".7"/></g>',
    chachacoma: () => '<path d="M4 38C10 30 26 30 32 38Z" fill="#8ea38f"/><path d="M6 36C12 26 28 26 30 36" fill="#a5b5a3"/><path d="M18 34V12M14 34V16M22 34V14" stroke="#7d8e72" stroke-width="1.4" fill="none" stroke-linecap="round"/><g fill="#f0c94a" stroke="#c79c2a" stroke-width=".4"><ellipse cx="18" cy="10" rx="3.2" ry="2.6"/><ellipse cx="14" cy="14" rx="2.8" ry="2.4" transform="rotate(-30 14 14)"/><ellipse cx="22" cy="12" rx="2.8" ry="2.4" transform="rotate(25 22 12)"/></g><circle cx="18" cy="10" r="1.2" fill="#b4801e"/><circle cx="14" cy="14" r=".9" fill="#b4801e"/><circle cx="22" cy="12" r=".9" fill="#b4801e"/>'
  };
  const flor = (id, k) => { const d = DIM[id] || [24, 24], s = k || 1; return '<svg viewBox="0 0 ' + d[0] + ' ' + d[1] + '" width="' + Math.round(d[0] * s) + '" height="' + Math.round(d[1] * s) + '" aria-hidden="true" focusable="false">' + (FLORES[id] ? FLORES[id]() : g('<path d="M12 23v-10"/>') + '<circle cx="12" cy="8" r="5" fill="#d98cb3"/>') + '</svg>'; };
  // F936: cada ave es un dibujo distinto, a su tamaño real relativo (w = ancho en px en el paisaje) y con su lugar propio: cielo, rama, suelo o junto a las flores.
  const ojo = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r=".85" fill="#101010"/>';
  const patas = (xs, y0, y1, col) => '<g stroke="' + col + '" stroke-width="1.2" stroke-linecap="round" fill="none">' + xs.map((x) => '<path d="M' + x + ' ' + y0 + 'V' + y1 + 'M' + (x - 2) + ' ' + y1 + 'h4"/>').join('') + '</g>';
  // F976 · Aves de Tierra Buena: dibujo propio y uniforme. Dos tonos por cuerpo, ojo con brillo y una marca que la identifica a tamaño pequeño.
  // F976 · Aves de Tierra Buena: dibujo propio y uniforme. Dos tonos por cuerpo, ojo con brillo y una marca que la identifica a tamaño pequeño.
  const AVES = {
    golondrina: { vb: [48, 36], w: 34, lugar: 'rama', t: 'De 12 a 14 cm', habitat: null, dib: () => '<path d="M14 21 0 30l5.5-1.2L2 33l12-6.5z" fill="#1c3462"/><path d="M26 19C17 9 8 6 1 7c8 5 14 9 19 14z" fill="#1c3462"/><path d="M26 17C19 12 12 10 5 10c6 3.6 11 7 16 9z" fill="#2c4d86" opacity=".7"/><ellipse cx="23" cy="20" rx="11" ry="6.4" transform="rotate(-8 23 20)" fill="#2c4d86"/><path d="M13 23c4 4.4 12 5.2 20-1.6-1.2 4.4-5.2 6.2-10.2 6-4.4-.4-7.6-2-9.8-4.4z" fill="#f2e7d2"/><circle cx="34" cy="14.6" r="5.2" fill="#2c4d86"/><ellipse cx="36.4" cy="18.6" rx="3" ry="2.2" fill="#f2e7d2"/><path d="M38.5 13.8 43 15 38.5 16.2z" fill="#1a1a1a"/>' + ojo(35.2, 13.6) + '<path d="M22 27v3.4M26 27.4v3" stroke="#6e6556" stroke-width="1" stroke-linecap="round"/>' },
    chucao: { vb: [48, 36], w: 36, lugar: 'suelo', t: 'Unos 19 cm', dib: () => '<path d="M13 19 8 3.5l4.6-.8 5 16.2z" fill="#4b2d18"/><path d="M14 22c7-7 15-7 19-1-3 7-12 9-19 1z" fill="#6a4026"/><ellipse cx="22.5" cy="23" rx="10.5" ry="7.8" fill="#6a4026"/><ellipse cx="21.5" cy="26.6" rx="7.4" ry="4.2" fill="#c98a52"/><path d="M14.5 20.5c3.2-3.2 8.5-3.8 12-1.4-3.4 2.4-8.6 2.6-12 1.4z" fill="#4c2c18" opacity=".7"/><circle cx="32.2" cy="15" r="6" fill="#5e3a22"/><path d="M29.4 12.6c1.8-1.4 4.6-1.4 6.2.2" stroke="#e4c08f" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M36.8 14.4 41 15.6 36.8 16.8z" fill="#2a2019"/>' + ojo(33.6, 14.4) + '<path d="M20.5 30.4v3M24.5 30.4v3" stroke="#7a6a5a" stroke-width="1.1" stroke-linecap="round"/>' },
    queltehue: { vb: [44, 48], w: 46, lugar: 'suelo', t: 'Unos 35 cm; de patas largas', dib: () => '<path d="M19.5 31v13.4M23.6 31v13.4" stroke="#d9675a" stroke-width="1.5" stroke-linecap="round"/><path d="M17 44.6h4.4M21.8 44.6h4.4" stroke="#d9675a" stroke-width="1.4" stroke-linecap="round"/><path d="M11 25 2.5 29.5l5.6.8L6 33z" fill="#3a3d42"/><ellipse cx="21" cy="24" rx="12" ry="7.4" transform="rotate(-6 21 24)" fill="#8d9298"/><path d="M10.5 23.5c5.6-4.6 13.4-4.2 17.4 1.4-4.6 3.4-12.2 4.4-17.4-1.4z" fill="#6c7279"/><ellipse cx="22.4" cy="29" rx="9.4" ry="4.4" fill="#f7f5ef"/><path d="M26.4 19.4c3 2 5.2 5.6 4.4 9.2-2.8-.4-5.2-2.4-6.2-5.6z" fill="#1d1d22"/><circle cx="31.2" cy="12.2" r="5.6" fill="#f7f5ef"/><path d="M25.8 11.4C27.6 6.6 34.4 5.6 36.8 10.4c-2.2-1-4.8-1-6.6-.2z" fill="#1d1d22"/><circle cx="35.4" cy="13.2" r="1.3" fill="#d6432f"/><path d="M35.6 11.4 41.2 12.2 35.8 13.6z" fill="#2a2a2e"/>' + ojo(32.8, 11.6) },
    picaflor: { vb: [48, 36], w: 25, lugar: 'flor', t: 'Unos 11 cm; de las aves más pequeñas de Chile', dib: () => '<g class="av-ala"><ellipse cx="18" cy="8" rx="12" ry="4.2" transform="rotate(-40 18 8)" fill="#d4f1e3" opacity=".75"/><ellipse cx="25" cy="7" rx="9" ry="3" transform="rotate(-66 25 7)" fill="#b4e3cc" opacity=".6"/></g>'+ '<path d="M16 20 4 27.5 6.2 22.6 2 19.4 9 20.6z" fill="#2a7a52"/><ellipse cx="25" cy="20.5" rx="10" ry="6" transform="rotate(-14 25 20.5)" fill="#3fa470"/><ellipse cx="22.5" cy="23.6" rx="7" ry="3" transform="rotate(-14 22.5 23.6)" fill="#c9e8d4" opacity=".8"/><circle cx="35" cy="14.6" r="5" fill="#2f8a5c"/><path d="M33.4 11.8 c2 -1.4 4.2 -.9 4.8 .7 c-2.1 .5 -3.8 .4 -4.8 -.7z" fill="#c8323e"/><path d="M39.4 14.2 L48 11.8" stroke="#1a1a1a" stroke-width="1.1" stroke-linecap="round"/>' + ojo(35.6, 13.8) },
    condor: { vb: [120, 44], w: 112, lugar: 'cielo', t: 'Más de 1 m de alto; alas de unos 3,3 m', dib: () => { const ala = '<path d="M55.5 19.5C44 13.6 24 11.4 3 13.2l1.8 2.6-2.6 1.6 2.8 1.6-2 2 3.2.9-1.4 1.8 3.4.1C24 22.2 40 27.6 56 30z" fill="#1f2024"/><path d="M38.6 16.8C32 15.8 25.4 15.8 19.4 17c6.2 1.6 12.6 3.6 19.2 5.2z" fill="#eeeee8"/>'; return '<g class="av-ala">' + ala + '</g><g transform="matrix(-1 0 0 1 120 0)"><g class="av-ala">' + ala + '</g></g><path d="M58 31 53.4 42l6.6-3.8 6.6 3.8L62 31z" fill="#1f2024"/><ellipse cx="60" cy="25.5" rx="7.2" ry="9.4" fill="#25262b"/><path d="M54.6 16.4c2.2 4.2 8.6 4.2 10.8 0l1.4 3.6c-3.6 3.8-13.6 3.8-17.4 0z" fill="#f1f1ec"/><circle cx="60" cy="11.4" r="3.9" fill="#c8553b"/><path d="M59 14.8h2v2.6h-2z" fill="#a9432e"/>' + ojo(61.4, 10.8); } },
    gorrion: { vb: [48, 36], w: 28, lugar: 'rama', t: 'Unos 15 cm', dib: () => '<path d="M12 22 1.6 27.4 2.6 23 1 21 12 19.4z" fill="#6b4424"/><ellipse cx="23" cy="21.6" rx="11" ry="7.4" fill="#a7794a"/><ellipse cx="24" cy="26.6" rx="8" ry="3.8" fill="#d7cbb4"/><path d="M12.6 20.4c4.4-4.2 11.4-4.2 15.6-.2-4.2 3.6-11.4 3.8-15.6.2z" fill="#7e5632"/><path d="M16 17.4l4 1.4M20.6 15.6l3.6 1.2M15 22.8l3.4 1" stroke="#5c3a20" stroke-width="1" stroke-linecap="round"/><circle cx="32.6" cy="14.6" r="5.4" fill="#8c9097"/><ellipse cx="32.2" cy="18.2" rx="3.6" ry="2.7" fill="#efe5cf"/><path d="M29.4 20.2c1.8 3 5.4 3.2 7.2.2-1.8 1.4-5.4 1.2-7.2-.2z" fill="#232323"/><path d="M37.2 13.6 42 14.8 37.2 17z" fill="#3b3b3b"/>' + ojo(34.2, 13.8) },
  };
  const TAM = { copihue: 'Enredadera de varios metros; flor de unos 7 cm', ananuca: 'Tallo de unos 35 cm', pata_de_guanaco: 'Alfombra baja, de unos 20 cm', lavanda: 'Mata de unos 60 cm', pasto_alto: 'Mata de pasto de unos 50 cm', bambu: 'Cañas de varios metros; crece muy rápido', flor_de_loto: 'Flor sobre el agua, de unos 20 cm', bonsai: 'Árbol en miniatura, de 20 a 60 cm', planta_fantasma: 'Tallitos blancos de unos 15 cm', welwitschia: 'Planta baja y ancha, de hasta 2 m de ancho', dracaena_cinnabari: 'Árbol de hasta 10 m, copa en paraguas', orquidea_subterranea: 'Florece bajo la tierra', secuoya_roja: 'Árbol gigante de más de 100 m', rafflesia: 'Flor de hasta 1 m de ancho', llareta: 'Cojín bajo y denso, de unos 40 cm', chagual: 'Roseta de hojas espinosas y espiga de hasta 2 m', notro: 'Árbol de 5 a 10 m con flores rojas', chilco: 'Arbusto de 1 a 2 m con flores colgantes', ulmo: 'Árbol de hasta 12 m con flores blancas', garra_de_leon: 'Globo de flores rojas, de unos 10 cm', chachacoma: 'Mata baja con flores amarillas' };
  const LUGAR = { cielo: 'Vuela alto, sobre las montañas', rama: 'Se posa en las ramas', suelo: 'Anda por el suelo, entre el pasto', flor: 'Se queda en el aire, junto a las flores' };
  const ave = (id, w) => { const q = AVES[id] || { vb: [48, 36], w: 30, dib: () => '' }, ww = Math.round(w || q.w); return '<svg viewBox="0 0 ' + q.vb[0] + ' ' + q.vb[1] + '" width="' + ww + '" height="' + Math.round(ww * q.vb[1] / q.vb[0]) + '" aria-hidden="true" focusable="false">' + q.dib() + '</svg>'; };
  const aveG = (id, k) => { const q = AVES[id]; return '<g transform="scale(' + ((q.w * k) / q.vb[0]).toFixed(3) + ')">' + q.dib() + '</g>'; };
  // F959 · Contenido especial de «Tu paisaje» (se compra con frutos en el Vivero; cada uno vive en su paisaje). Cada dibujo ocupa una caja de 60×40 con la base abajo al centro.
  const FRUTO = '<svg class="il-fr" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><circle cx="12" cy="14" r="7" fill="#e8893a" stroke="#a9551a" stroke-width="1.2"/><path d="M12 7c0-3 2-4 4.5-4 0 3-1.8 4-4.5 4z" fill="#5fae6c"/></svg>';
  const FRUTO_S = FRUTO.replace('width="26" height="26"', 'width="14" height="14"');
  const ESP = {
    nenufares: '<ellipse cx="14" cy="34" rx="12" ry="4" fill="#4f9a5e"/><ellipse cx="42" cy="31" rx="10" ry="3.5" fill="#5fae6c"/><ellipse cx="28" cy="37" rx="9" ry="3" fill="#468f56"/><circle cx="42" cy="27.5" r="3.2" fill="#f4b6c8"/><circle cx="42" cy="27.5" r="1.2" fill="#f6dd7a"/>',
    cisne: '<ellipse cx="28" cy="33" rx="15" ry="6.5" fill="#f6f6f2"/><path d="M38 31C47 29 47 15 41 13" fill="none" stroke="#2b2b30" stroke-width="4" stroke-linecap="round"/><circle cx="41" cy="12" r="3.4" fill="#2b2b30"/><path d="M43.6 12 L49 14 L43.6 15Z" fill="#d94a4a"/><path d="M14 33 C8 31 8 27 12 27" fill="none" stroke="#e8e8e2" stroke-width="3" stroke-linecap="round"/>',
    piedras: '<ellipse cx="18" cy="35" rx="14" ry="5" fill="#8d9296"/><ellipse cx="38" cy="33" rx="11" ry="6" fill="#a2a8ac"/><ellipse cx="30" cy="37" rx="9" ry="3.5" fill="#777c80"/><path d="M12 33 q4 -3 8 0" stroke="#b9bfc3" stroke-width="1.5" fill="none"/>',
    sauce: '<path d="M30 40 L30 17" stroke="#6b4a2f" stroke-width="3.2" stroke-linecap="round"/><path d="M30 13C10 12 7 33 11 39M30 13C50 12 53 33 49 39M30 13C21 17 19 31 21 39M30 13C39 17 41 31 39 39" fill="none" stroke="#6fae5a" stroke-width="3" stroke-linecap="round"/>',
    helechos: '<path d="M30 40 Q19.0 29.1 8.0 26.9" fill="none" stroke="#4f8a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="24.2" cy="36.7" rx="3.4" ry="1.4" fill="#4f8a55" transform="rotate(28 24.2 36.7)"/><ellipse cx="30.3" cy="36.7" rx="3.4" ry="1.4" fill="#6aa86b" transform="rotate(-28 30.3 36.7)"/><ellipse cx="21.7" cy="34.5" rx="3.1" ry="1.3" fill="#4f8a55" transform="rotate(28 21.7 34.5)"/><ellipse cx="27.3" cy="34.5" rx="3.1" ry="1.3" fill="#6aa86b" transform="rotate(-28 27.3 34.5)"/><ellipse cx="19.2" cy="32.5" rx="2.9" ry="1.2" fill="#4f8a55" transform="rotate(28 19.2 32.5)"/><ellipse cx="24.3" cy="32.5" rx="2.9" ry="1.2" fill="#6aa86b" transform="rotate(-28 24.3 32.5)"/><ellipse cx="16.6" cy="30.8" rx="2.6" ry="1.1" fill="#4f8a55" transform="rotate(28 16.6 30.8)"/><ellipse cx="21.3" cy="30.8" rx="2.6" ry="1.1" fill="#6aa86b" transform="rotate(-28 21.3 30.8)"/><ellipse cx="14.1" cy="29.3" rx="2.4" ry="1.0" fill="#4f8a55" transform="rotate(28 14.1 29.3)"/><ellipse cx="18.3" cy="29.3" rx="2.4" ry="1.0" fill="#6aa86b" transform="rotate(-28 18.3 29.3)"/><ellipse cx="11.6" cy="28.1" rx="2.1" ry="0.9" fill="#4f8a55" transform="rotate(28 11.6 28.1)"/><ellipse cx="15.4" cy="28.1" rx="2.1" ry="0.9" fill="#6aa86b" transform="rotate(-28 15.4 28.1)"/><ellipse cx="9.0" cy="27.2" rx="1.9" ry="0.8" fill="#4f8a55" transform="rotate(28 9.0 27.2)"/><ellipse cx="12.4" cy="27.2" rx="1.9" ry="0.8" fill="#6aa86b" transform="rotate(-28 12.4 27.2)"/><path d="M30 40 Q23.5 24.7 17.0 18.6" fill="none" stroke="#4f8a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="25.4" cy="35.7" rx="3.4" ry="1.4" fill="#4f8a55" transform="rotate(28 25.4 35.7)"/><ellipse cx="31.4" cy="35.7" rx="3.4" ry="1.4" fill="#6aa86b" transform="rotate(-28 31.4 35.7)"/><ellipse cx="24.0" cy="32.3" rx="3.1" ry="1.3" fill="#4f8a55" transform="rotate(28 24.0 32.3)"/><ellipse cx="29.5" cy="32.3" rx="3.1" ry="1.3" fill="#6aa86b" transform="rotate(-28 29.5 32.3)"/><ellipse cx="22.6" cy="29.3" rx="2.9" ry="1.2" fill="#4f8a55" transform="rotate(28 22.6 29.3)"/><ellipse cx="27.7" cy="29.3" rx="2.9" ry="1.2" fill="#6aa86b" transform="rotate(-28 27.7 29.3)"/><ellipse cx="21.2" cy="26.5" rx="2.6" ry="1.1" fill="#4f8a55" transform="rotate(28 21.2 26.5)"/><ellipse cx="25.8" cy="26.5" rx="2.6" ry="1.1" fill="#6aa86b" transform="rotate(-28 25.8 26.5)"/><ellipse cx="19.7" cy="24.0" rx="2.4" ry="1.0" fill="#4f8a55" transform="rotate(28 19.7 24.0)"/><ellipse cx="24.0" cy="24.0" rx="2.4" ry="1.0" fill="#6aa86b" transform="rotate(-28 24.0 24.0)"/><ellipse cx="18.3" cy="21.8" rx="2.1" ry="0.9" fill="#4f8a55" transform="rotate(28 18.3 21.8)"/><ellipse cx="22.2" cy="21.8" rx="2.1" ry="0.9" fill="#6aa86b" transform="rotate(-28 22.2 21.8)"/><ellipse cx="16.9" cy="19.9" rx="1.9" ry="0.8" fill="#4f8a55" transform="rotate(28 16.9 19.9)"/><ellipse cx="20.3" cy="19.9" rx="1.9" ry="0.8" fill="#6aa86b" transform="rotate(-28 20.3 19.9)"/><path d="M30 40 Q30.0 21.0 30.0 11.5" fill="none" stroke="#4f8a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="27.0" cy="34.7" rx="3.4" ry="1.4" fill="#4f8a55" transform="rotate(28 27.0 34.7)"/><ellipse cx="33.0" cy="34.7" rx="3.4" ry="1.4" fill="#6aa86b" transform="rotate(-28 33.0 34.7)"/><ellipse cx="27.2" cy="30.5" rx="3.1" ry="1.3" fill="#4f8a55" transform="rotate(28 27.2 30.5)"/><ellipse cx="32.8" cy="30.5" rx="3.1" ry="1.3" fill="#6aa86b" transform="rotate(-28 32.8 30.5)"/><ellipse cx="27.4" cy="26.5" rx="2.9" ry="1.2" fill="#4f8a55" transform="rotate(28 27.4 26.5)"/><ellipse cx="32.6" cy="26.5" rx="2.9" ry="1.2" fill="#6aa86b" transform="rotate(-28 32.6 26.5)"/><ellipse cx="27.7" cy="22.9" rx="2.6" ry="1.1" fill="#4f8a55" transform="rotate(28 27.7 22.9)"/><ellipse cx="32.3" cy="22.9" rx="2.6" ry="1.1" fill="#6aa86b" transform="rotate(-28 32.3 22.9)"/><ellipse cx="27.9" cy="19.5" rx="2.4" ry="1.0" fill="#4f8a55" transform="rotate(28 27.9 19.5)"/><ellipse cx="32.1" cy="19.5" rx="2.4" ry="1.0" fill="#6aa86b" transform="rotate(-28 32.1 19.5)"/><ellipse cx="28.1" cy="16.4" rx="2.1" ry="0.9" fill="#4f8a55" transform="rotate(28 28.1 16.4)"/><ellipse cx="31.9" cy="16.4" rx="2.1" ry="0.9" fill="#6aa86b" transform="rotate(-28 31.9 16.4)"/><ellipse cx="28.3" cy="13.6" rx="1.9" ry="0.8" fill="#4f8a55" transform="rotate(28 28.3 13.6)"/><ellipse cx="31.7" cy="13.6" rx="1.9" ry="0.8" fill="#6aa86b" transform="rotate(-28 31.7 13.6)"/><path d="M30 40 Q36.5 24.7 43.0 18.6" fill="none" stroke="#4f8a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="28.6" cy="35.7" rx="3.4" ry="1.4" fill="#4f8a55" transform="rotate(28 28.6 35.7)"/><ellipse cx="34.6" cy="35.7" rx="3.4" ry="1.4" fill="#6aa86b" transform="rotate(-28 34.6 35.7)"/><ellipse cx="30.5" cy="32.3" rx="3.1" ry="1.3" fill="#4f8a55" transform="rotate(28 30.5 32.3)"/><ellipse cx="36.0" cy="32.3" rx="3.1" ry="1.3" fill="#6aa86b" transform="rotate(-28 36.0 32.3)"/><ellipse cx="32.3" cy="29.3" rx="2.9" ry="1.2" fill="#4f8a55" transform="rotate(28 32.3 29.3)"/><ellipse cx="37.4" cy="29.3" rx="2.9" ry="1.2" fill="#6aa86b" transform="rotate(-28 37.4 29.3)"/><ellipse cx="34.2" cy="26.5" rx="2.6" ry="1.1" fill="#4f8a55" transform="rotate(28 34.2 26.5)"/><ellipse cx="38.8" cy="26.5" rx="2.6" ry="1.1" fill="#6aa86b" transform="rotate(-28 38.8 26.5)"/><ellipse cx="36.0" cy="24.0" rx="2.4" ry="1.0" fill="#4f8a55" transform="rotate(28 36.0 24.0)"/><ellipse cx="40.3" cy="24.0" rx="2.4" ry="1.0" fill="#6aa86b" transform="rotate(-28 40.3 24.0)"/><ellipse cx="37.8" cy="21.8" rx="2.1" ry="0.9" fill="#4f8a55" transform="rotate(28 37.8 21.8)"/><ellipse cx="41.7" cy="21.8" rx="2.1" ry="0.9" fill="#6aa86b" transform="rotate(-28 41.7 21.8)"/><ellipse cx="39.7" cy="19.9" rx="1.9" ry="0.8" fill="#4f8a55" transform="rotate(28 39.7 19.9)"/><ellipse cx="43.1" cy="19.9" rx="1.9" ry="0.8" fill="#6aa86b" transform="rotate(-28 43.1 19.9)"/><path d="M30 40 Q41.0 29.1 52.0 26.9" fill="none" stroke="#4f8a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="29.7" cy="36.7" rx="3.4" ry="1.4" fill="#4f8a55" transform="rotate(28 29.7 36.7)"/><ellipse cx="35.8" cy="36.7" rx="3.4" ry="1.4" fill="#6aa86b" transform="rotate(-28 35.8 36.7)"/><ellipse cx="32.7" cy="34.5" rx="3.1" ry="1.3" fill="#4f8a55" transform="rotate(28 32.7 34.5)"/><ellipse cx="38.3" cy="34.5" rx="3.1" ry="1.3" fill="#6aa86b" transform="rotate(-28 38.3 34.5)"/><ellipse cx="35.7" cy="32.5" rx="2.9" ry="1.2" fill="#4f8a55" transform="rotate(28 35.7 32.5)"/><ellipse cx="40.8" cy="32.5" rx="2.9" ry="1.2" fill="#6aa86b" transform="rotate(-28 40.8 32.5)"/><ellipse cx="38.7" cy="30.8" rx="2.6" ry="1.1" fill="#4f8a55" transform="rotate(28 38.7 30.8)"/><ellipse cx="43.4" cy="30.8" rx="2.6" ry="1.1" fill="#6aa86b" transform="rotate(-28 43.4 30.8)"/><ellipse cx="41.7" cy="29.3" rx="2.4" ry="1.0" fill="#4f8a55" transform="rotate(28 41.7 29.3)"/><ellipse cx="45.9" cy="29.3" rx="2.4" ry="1.0" fill="#6aa86b" transform="rotate(-28 45.9 29.3)"/><ellipse cx="44.6" cy="28.1" rx="2.1" ry="0.9" fill="#4f8a55" transform="rotate(28 44.6 28.1)"/><ellipse cx="48.4" cy="28.1" rx="2.1" ry="0.9" fill="#6aa86b" transform="rotate(-28 48.4 28.1)"/><ellipse cx="47.6" cy="27.2" rx="1.9" ry="0.8" fill="#4f8a55" transform="rotate(28 47.6 27.2)"/><ellipse cx="51.0" cy="27.2" rx="1.9" ry="0.8" fill="#6aa86b" transform="rotate(-28 51.0 27.2)"/>',
    tronco: '<rect x="5" y="27" width="50" height="12" rx="6" fill="#7a5233"/><ellipse cx="11" cy="33" rx="2.6" ry="5.2" fill="#a47a4d"/><path d="M30 27q4-9 9 0z" fill="#d9573f"/><path d="M42 27q3-6 7 0z" fill="#e8c06a"/><path d="M16 28q6-3 12 0" stroke="#5f7a3a" stroke-width="2" fill="none"/>',
    huemul: '<ellipse cx="26" cy="27" rx="12" ry="6.6" fill="#9c7a55"/><ellipse cx="26" cy="29.6" rx="9.5" ry="3" fill="#d2bb96"/><path d="M16 31 15.4 39M20.6 31.4 20.8 39M30 31.4 31 39M34 30 35 39" stroke="#6e4f30" stroke-width="1.7" stroke-linecap="round"/><path d="M10.6 22.6c-2.8.2-3.6 2.4-2.6 4.4" stroke="#d2bb96" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M33 24C36.6 18.6 38.2 14.4 40.4 11.2" stroke="#9c7a55" stroke-width="5.4" stroke-linecap="round" fill="none"/><path d="M40.4 5 39.4 1.2M42.4 5.4 43.6 1.6" stroke="#5a4030" stroke-width=".9" stroke-linecap="round"/><path d="M39.6 6.8 38.4 3.4 41.4 5.2z" fill="#7a5a3c"/><ellipse cx="43.6" cy="10.2" rx="4.4" ry="3.1" fill="#8a6743"/><path d="M45.8 8.4 48.8 10.8 46.6 11.6z" fill="#4b3524"/><circle cx="47.6" cy="10.8" r=".9" fill="#222"/><circle cx="42.4" cy="8.8" r=".6" fill="#222"/>',
    guanaco: '<ellipse cx="24" cy="28" rx="13" ry="6" fill="#c4905a"/><ellipse cx="34" cy="29" rx="3.6" ry="3.6" fill="#f3e6d2"/><path d="M33 25 C37 19 38 14 41 10" stroke="#c4905a" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M15 32 L14 39 M19 33 L19 39 M29 33 L30 39 M33 32 L34 39" stroke="#9a6a3e" stroke-width="1.8" stroke-linecap="round"/><path d="M11 26 Q8 25 9 29" stroke="#9a6a3e" stroke-width="1.2" fill="none" stroke-linecap="round"/><ellipse cx="44" cy="10" rx="4.4" ry="3.2" fill="#c4905a"/><path d="M42 8 L41 3 L44.5 6.6z" fill="#a8743f"/><ellipse cx="47.4" cy="11" rx="1.6" ry="1.2" fill="#8a5e36"/><circle cx="45" cy="9" r=".6" fill="#222"/>',
    flores_altura: '<path d="M12 40V24M24 40V18M36 40V22M48 40V28" stroke="#4d8f58" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="22" r="4" fill="#9b6fd6"/><circle cx="24" cy="16" r="4.6" fill="#f2d64a"/><circle cx="36" cy="20" r="4" fill="#e8798f"/><circle cx="48" cy="26" r="3.6" fill="#9b6fd6"/>',
    rocas_volcanicas: '<path d="M4 40L10 24L22 20L30 30L36 18L50 26L56 40Z" fill="#3e3a3d"/><path d="M10 24L22 20L18 32ZM36 18L50 26L40 30Z" fill="#59535a"/><path d="M26 38l4-6 4 6z" fill="#c4532d"/>',
    araucarias: '<path d="M16 40V15M42 40V22" stroke="#5a3d2a" stroke-width="2.6" stroke-linecap="round"/><path d="M4 14C10 7 22 7 28 14C22 11 10 11 4 14ZM30 21C35 15 49 15 54 21C48 18 36 18 30 21Z" fill="#3f7a46" stroke="#3f7a46" stroke-width="2" stroke-linejoin="round"/>',
    gaviota: '<path d="M26 20 C19 14 11 10 3 9 C9 13 15 18 24 22Z" fill="#aebdc8"/><path d="M3 9 C6 8.5 8 9.5 9.5 11 C7 11.5 5 10.8 3 9Z" fill="#2b2f36"/><path d="M34 20 C41 14 49 10 57 9 C51 13 45 18 36 22Z" fill="#aebdc8"/><path d="M57 9 C54 8.5 52 9.5 50.5 11 C52.5 11.5 55 10.8 57 9Z" fill="#2b2f36"/><path d="M22 22 L18 25 L22 24Z" fill="#dfe6ec"/><ellipse cx="30" cy="22" rx="8" ry="3.2" fill="#fbfbfa" stroke="#b8c4cc" stroke-width=".5"/><circle cx="38" cy="20" r="2.8" fill="#fbfbfa" stroke="#b8c4cc" stroke-width=".5"/><path d="M40.5 19.6 L44 21 L40.5 21.4Z" fill="#f0b43a"/><circle cx="38.6" cy="19.4" r=".5" fill="#222"/>',
    conchas: '<path d="M30 36 L5.6 27.1 L6.6 24.6 L8.0 22.2 L9.5 20.0 L11.3 17.9 L13.3 16.1 L15.5 14.4 L17.8 13.0 L20.3 11.9 L22.8 11.0 L25.5 10.4 L28.2 10.1 L30.9 10.0 L33.6 10.3 L36.3 10.8 L38.9 11.6 L41.4 12.6 L43.8 14.0 L46.0 15.5 L48.1 17.3 L49.9 19.3 L51.6 21.5 L53.0 23.8 L54.1 26.3 Z" fill="#e9a79a"/><path d="M30 36 L30.0 10.0 L32.7 10.1 L35.4 10.6 L38.0 11.3 L40.6 12.2 L43.0 13.5 L45.3 15.0 L47.4 16.7 L49.3 18.6 L51.0 20.7 L52.5 23.0 L53.8 25.4 Z" fill="#c9776b"/><path d="M30 36 L7.3 25.4" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L10.3 20.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L14.3 16.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L19.0 13.5" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L24.4 11.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L30.0 11.0" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L35.6 11.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L41.0 13.5" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L45.7 16.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L49.7 20.6" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M30 36 L52.7 25.4" stroke="#a85d52" stroke-width="0.9" fill="none"/><path d="M26 37 L34 37" stroke="#7a4a40" stroke-width="1.6" stroke-linecap="round"/>',
    cactus: '<rect x="22" y="10" width="16" height="30" rx="8" fill="#4f8a55"/><path d="M26 16v22M30 13v25M34 16v22" stroke="#3a6e44" stroke-width="1.1" fill="none"/><path d="M22 28h-6q-3 0-3-3v-7q0-2.5 2.5-2.5t2.5 2.5v6h4.5z" fill="#4f8a55"/><path d="M38 30h5q3 0 3-3v-8q0-2.5-2.5-2.5T41 19v7h-3z" fill="#4f8a55"/><circle cx="30" cy="9" r="2.4" fill="#f2c94c"/>',
    zorro: '<path d="M14 22 C6 19 3 14 6 11 C10 13 13 17 16 22Z" fill="#d8752f"/><path d="M6 11 C4 12 4 14 5 15 C6 13 7 12 6 11Z" fill="#f6ead8"/><ellipse cx="28" cy="24" rx="13" ry="5.5" fill="#d8752f"/><ellipse cx="28" cy="27" rx="10" ry="2.2" fill="#f2dcc0"/><path d="M18 28 L17 36 M22 29 L22 36 M32 29 L33 36 M36 28 L37 36" stroke="#4a2a1a" stroke-width="1.8" stroke-linecap="round"/><path d="M38 20 C40 16 43 15 46 16 L53 18 C54 19 53 20 51 20 L46 21 C43 23 40 23 38 22Z" fill="#d8752f"/><path d="M44 20 L49 20.5 L46 21.8Z" fill="#f6ead8"/><path d="M41 17 L42 12 L44 16Z" fill="#c4621f"/><path d="M43.5 16 L45.5 11 L46.5 15Z" fill="#b25a1c"/><circle cx="53.5" cy="18.8" r=".9" fill="#222"/><circle cx="45" cy="18" r=".5" fill="#222"/>',
  };
  const espSvg = (id, w) => '<svg viewBox="0 0 60 40" width="' + (w || 64) + '" height="' + Math.round((w || 64) * 2 / 3) + '" aria-hidden="true" focusable="false">' + (ESP[id] || '') + '</svg>';
  function especialesEscena(est, fo) {                       // lo comprado que corresponde al paisaje elegido
    const v = (est.vivero && est.vivero.desbloqueados) || [], E = (CAT && CAT.especiales) || {};
    return Object.keys(E).filter((id) => E[id].lugar === fo && v.indexOf('esp_' + id) >= 0 && ESP[id]).map((id) => { const q = E[id], k = +q.k || 1; return '<g class="esp-it" transform="translate(' + (q.x - 30 * k) + ' ' + (q.y - 40 * k) + ') scale(' + k + ')">' + ESP[id] + '</g>'; }).join('');
  }
  const vis = (tipo, id, est) => !window.TBInicio || window.TBInicio.visibleEn(tipo, id, est.tematica);   // F1067
  function vivEscena(est) {
    const v = est.vivero || {};
    return (v.plantas || []).filter((q) => vis('semilla', q.id, est)).map((q) => '<span class="il-planta p-' + esc(q.id) + ' s-' + esc(q.casilla) + '" aria-hidden="true">' + flor(q.id, 0.9) + '</span>').join('')
      + (v.aves || []).filter((a) => vis('ave', a.id, est)).slice(0, 2).map((a, i) => '<span class="il-ave n' + (i + 1) + ' a-' + esc(a.id) + ' l-' + esc((AVES[a.id] || {}).lugar || 'rama') + '" aria-hidden="true">' + ave(a.id) + '</span>').join('')
      // F1055 · luciérnagas encendidas: seis luces que flotan en el cielo (la animación se apaga con movimiento reducido o en modo ahorro)
      + ((v.ambientes || []).indexOf('luciernagas') >= 0 && vis('ambiente', 'luciernagas', est) ? '<span class="il-luci-grupo" aria-hidden="true"><i class="il-luci k1"></i><i class="il-luci k2"></i><i class="il-luci k3"></i><i class="il-luci k4"></i><i class="il-luci k5"></i><i class="il-luci k6"></i></span>' : '');
  }
  // Vista previa (320×120): pasto con la flor a su altura real, o el lugar propio del ave (cielo, rama, suelo o junto a una flor).
  function vivVista(tipo, id) {
    const W = 320, H = 120, pasto = '<path d="M0 88c50-16 110-18 170-8 60 10 110 6 150-6v46H0z" fill="#a9cf9b"/><path d="M0 104c60-12 120-8 190 0 50 5 90 2 130-6v22H0z" fill="#86b97a"/>' + hierbaTB(0, 320, 98, 70, 5);
    const cielo = (mont) => '<defs><linearGradient id="vvCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (mont ? '#bcdcf0' : '#cfe6f4') + '"/><stop offset="1" stop-color="#eef6e8"/></linearGradient></defs><rect width="' + W + '" height="' + H + '" fill="url(#vvCielo)"/><circle cx="280" cy="24" r="12" fill="#fbe8a6" opacity=".85"/>';
    const abre = '<svg class="il-viv-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Vista previa: así se vería en tu paisaje" focusable="false">';
    if (tipo === 'semilla') {
      const d = DIM[id] || [24, 24], k = KV[id] || (id === 'pata_de_guanaco' ? 2 : 1.7), pos = (SOLO.indexOf(id) >= 0 || id === 'copihue') ? [[160, id === 'copihue' ? 1.15 : 1]] : id === 'pata_de_guanaco' ? [[70, 1], [160, 1.2], [252, .95]] : [[70, .95], [160, 1.12], [252, .9]];
      const tronco = id === 'copihue' ? '<path d="M150 112 154 8h18l-4 104z" fill="#7a5a3c"/><path d="M154 40h18M153 80h16" stroke="#654a30" stroke-width="1.6"/>' : '';
      return abre + cielo(false) + pasto + tronco + pos.map((q, i) => '<g transform="translate(' + Math.round(q[0] - d[0] * k * q[1] / 2) + ' ' + Math.round(110 - d[1] * k * q[1]) + ') scale(' + (k * q[1]).toFixed(2) + ')"><g class="vv-sway vv-d' + i + '">' + (FLORES[id] ? FLORES[id]() : '') + '</g></g>').join('') + '</svg>';
    }
    const q = AVES[id] || AVES.gorrion, k = 1.9, bw = q.w * k, bh = bw * q.vb[1] / q.vb[0], L = q.lugar;
    const pon = (x, y, cls) => '<g transform="translate(' + Math.round(x) + ' ' + Math.round(y) + ')"><g class="' + cls + '">' + aveG(id, k) + '</g></g>';
    if (L === 'cielo') return abre + cielo(true) + '<path d="M0 96 40 62l26 22 34-40 42 46 30-24 44 38 40-30 64 40v6H0z" fill="#8fa5b8"/><path d="M100 44l12 14h-24zM226 60l10 10h-20z" fill="#f2f6f8"/>' + pasto.replace('M0 88', 'M0 100') + pon(160 - bw / 2, 22, 'vv-planea') + '</svg>';
    if (L === 'suelo') return abre + cielo(false) + pasto + '<path d="M40 112c6-14 4-24 10-36 4 12 6 22 4 36zM262 112c-2-12 2-24 8-32 2 10 4 22 2 32z" fill="#5f9a62"/>' + pon(160 - bw / 2, 106 - bh, 'vv-salta') + '</svg>';
    if (L === 'flor') return abre + cielo(false) + pasto + '<g transform="translate(212 ' + (110 - 56 * 1.6) + ') scale(1.6)">' + FLORES.copihue() + '</g><g transform="translate(84 ' + (110 - 56 * 1.3) + ') scale(1.3)">' + FLORES.copihue() + '</g>' + pon(150 - bw / 2, 26, 'vv-flota') + '</svg>';
    return abre + cielo(false) + pasto + '<path d="M-10 70C60 62 120 60 190 52" fill="none" stroke="#7a5a3c" stroke-width="7" stroke-linecap="round"/><path d="M90 64c-10-14-26-18-40-16 8 10 22 18 40 16zM140 58c8-16 24-24 40-24-4 14-18 24-40 24zM30 66c-6-10-16-12-26-8 6 8 16 12 26 8z" fill="#5f9a62"/>' + pon(150 - bw / 2, 61 - bh, 'vv-posa') + '</svg>';
  }
  // F975 · Vivero por temáticas: cada planta y ave se agrupa por su hábitat. Sin hábitat = «Generales».
  let vivGrupo = null;
  const nomGrupo = (g) => (g === 'general' ? 'Generales' : ((CAT.tematicas || {})[g] || {}).nombre || g);
  const listaDe = (tipo) => (tipo === 'ave' ? Object.keys(CAT.aves || {}) : (CAT.orden_semillas || Object.keys(CAT.semillas || {})));
  const DIAS = () => (CAT && CAT.ciclo && CAT.ciclo.dias) || 30;   // F1059: la duración del ciclo viene del catálogo
  const catDe = (t) => (t === 'ave' ? CAT.aves : t === 'ambiente' ? CAT.ambientes : CAT.semillas) || {};   // F1055: catálogo según el tipo de decoración
  const enGrupo = (tipo, id, g) => { const it = catDe(tipo)[id] || {}, h = it.habitat && it.habitat.length ? it.habitat : ['general']; return h.indexOf(g) >= 0; };
  const gruposCon = (tipo) => ['general'].concat(Object.keys(CAT.tematicas || {})).filter((g) => listaDe(tipo).some((i) => enGrupo(tipo, i, g)));
  function tabsViv(on, n) {                                  // F975 · cuatro pestañas: plantas, aves, otros y cómo ganar gotas
    const t = (id, txt) => '<button type="button" class="il-viv-tab' + (on === id ? ' on' : '') + '" data-ac="tab" data-id="' + id + '" aria-pressed="' + (on === id) + '">' + txt + '</button>';
    return '<div class="il-viv-tabs" role="group" aria-label="Qué mirar en el vivero">' + t('flores', 'Plantas') + t('aves', 'Aves') + t('paisaje', 'Ambiental') + '</div>';
  }
  // F1010 · Miniatura de cada hábitat como se ve en su día 30 (identidad propia; sin copiar otra app).
  function habThumb(g) {
    const P = { bosque: ['#cfe6d6', '#4f8a55', '#2f6b3f', '#c4604a'], desierto: ['#f6e2b3', '#e2b872', '#d1a05a', '#6aa86b'], cordillera: ['#d9e8f2', '#9fb4c7', '#8aa98a', '#fbe8a6'], costa: ['#cfe9ee', '#7fb9c8', '#e8d3a6', '#c4604a'], jardin: ['#f1f7ea', '#7cc08a', '#4f8a55', '#d86a9a'] };
    const [cielo, c1, c2, acento] = P[g] || P.bosque;
    let d = '<rect width="160" height="96" fill="' + cielo + '"/><circle cx="128" cy="24" r="11" fill="#fbe8a6"/><path d="M0 64C40 46 80 56 120 48S150 46 160 52V96H0Z" fill="' + c1 + '"/><path d="M0 78C50 66 110 74 160 66V96H0Z" fill="' + c2 + '"/>';
    if (g === 'cordillera') d += '<path d="M10 60 50 18 90 60Z M60 60 100 14 150 60Z" fill="' + c1 + '"/><path d="M50 18 40 34 60 30Z M100 14 90 32 110 30Z" fill="#ffffff"/>';
    else if (g === 'desierto') d += '<rect x="66" y="40" width="7" height="26" rx="3" fill="' + c2 + '"/><circle cx="42" cy="66" r="3" fill="' + acento + '"/><circle cx="96" cy="70" r="3" fill="' + acento + '"/>';
    else if (g === 'costa') d += '<rect x="0" y="80" width="160" height="16" fill="' + c1 + '"/><path d="M20 84h30M90 88h40" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".7"/>';
    else if (g === 'jardin') d += [34, 58, 84, 112, 134].map((x, i) => '<path d="M' + x + ' 82V54" stroke="#4f8a55" stroke-width="2"/><ellipse cx="' + x + '" cy="' + (46 + (i % 2) * 4) + '" rx="3.2" ry="9" fill="' + (i % 2 ? '#a583e3' : '#8a63cf') + '"/>').join('');
    else d += '<circle cx="46" cy="44" r="14" fill="' + c2 + '"/><circle cx="110" cy="40" r="16" fill="' + c2 + '"/><rect x="44" y="52" width="4" height="18" fill="#7a5a3c"/><rect x="108" y="52" width="4" height="18" fill="#7a5a3c"/><circle cx="48" cy="40" r="3" fill="' + acento + '"/>';
    return '<svg class="viv-thumb" viewBox="0 0 160 96" aria-hidden="true" focusable="false">' + d + '</svg>';
  }
  function vivPanel(est) {
    if (vivSel && vivSel.tipo === 'esp') return vivPanelEsp(est);
    if (vivSel && vivSel.tipo === 'gotas') return vivPanelGotas(est);
    const v = est.vivero || { desbloqueados: [], plantas: [], aves: [] }, saldo = (est.gotas && est.gotas.saldo) || 0, tengo = (c) => v.desbloqueados.indexOf(c) >= 0;
    const sem = listaDe('semilla'), aves = listaDe('ave');
    const plantada = (id) => (v.plantas || []).some((q) => q.id === id), activa = (id) => (v.aves || []).some((a) => a.id === id), ambActiva = (id) => (v.ambientes || []).indexOf(id) >= 0;
    if (!vivSel || !catDe(vivSel.tipo)[vivSel.id]) { const p1 = sem.find((i) => !tengo('sem_' + i)); vivSel = p1 ? { tipo: 'semilla', id: p1 } : { tipo: 'semilla', id: sem[0] }; }
    const amb = vivTab === 'paisaje';
    if (!amb) vivTab = vivSel.tipo === 'ave' ? 'aves' : 'flores';
    if (!amb && vivSel.tipo === 'ambiente') vivSel = { tipo: 'semilla', id: sem[0] };   // F1055: fuera de «Ambiental», una semilla o ave
    let tipoV = vivSel.tipo === 'ave' ? 'ave' : vivSel.tipo === 'ambiente' ? 'ambiente' : 'semilla', habs = Object.keys(CAT.tematicas || {});
    if (!vivGrupo || habs.indexOf(vivGrupo) < 0) vivGrupo = est.tematica && habs.indexOf(est.tematica) >= 0 ? est.tematica : habs[0];
    if (amb && vivSel.tipo !== 'ambiente') { const a1 = Object.keys(CAT.ambientes || {}).find((i) => enGrupo('ambiente', i, vivGrupo)); if (a1) { vivSel = { tipo: 'ambiente', id: a1 }; tipoV = 'ambiente'; } }
    if (!enGrupo(tipoV, vivSel.id, vivGrupo)) { const pick = (tipoV === 'ambiente' ? Object.keys(CAT.ambientes || {}) : listaDe(tipoV)).filter((i) => enGrupo(tipoV, i, vivGrupo))[0]; if (pick) vivSel = { tipo: tipoV, id: pick }; }
    const tile = (tipo, id) => { const it = catDe(tipo)[id]; if (!it) return ''; const c = (tipo === 'ave' ? 'ave_' : tipo === 'ambiente' ? 'amb_' : 'sem_') + id, mio = tengo(c), sel = vivSel.tipo === tipo && vivSel.id === id;
      const est2 = mio ? (tipo === 'ave' ? (activa(id) ? 'Con tu árbol' : 'Tuya') : tipo === 'ambiente' ? (ambActiva(id) ? 'Encendidas' : 'Tuya') : (plantada(id) ? 'Plantada' : 'Tuya')) : '';
      const arte = tipo === 'ave' ? ave(id, Math.min(104, Math.round((AVES[id] || { w: 30 }).w * 1.5))) : tipo === 'ambiente' ? '<span class="il-luci-mini" aria-hidden="true"></span>' : flor(id, 1.05);
      return '<button type="button" class="il-viv-tile' + (sel ? ' sel' : '') + (mio ? ' mio' : '') + '" role="listitem" data-ac="ver" data-tipo="' + tipo + '" data-id="' + esc(id) + '" aria-pressed="' + sel + '"><span class="il-viv-arte">' + arte + '</span><b>' + esc(it.nombre) + '</b>'
        + (mio ? '<span class="il-viv-chip ok">' + est2 + '</span>' : '<span class="il-viv-chip">' + ic(IC.gota, 13) + it.precio + '</span>') + '</button>'; };
    const it = catDe(vivSel.tipo)[vivSel.id], c = (vivSel.tipo === 'ave' ? 'ave_' : vivSel.tipo === 'ambiente' ? 'amb_' : 'sem_') + vivSel.id, mio = tengo(c), falta = Math.max(0, it.precio - saldo), pct = Math.min(100, Math.round(100 * saldo / it.precio));
    let acc;
    if (!mio) acc = '<p class="suave m0">' + (falta ? 'Te faltan ' + falta + ' gotas.' : 'Ya tienes las gotas necesarias.') + '</p><button type="button" class="btn il-viv-bt il-viv-main" data-ac="comprar" data-tipo="' + vivSel.tipo + '" data-id="' + esc(vivSel.id) + '"' + (falta ? ' disabled' : '') + '>' + (falta ? 'Aún faltan gotas' : 'Obtener por ' + it.precio + ' gotas') + '</button>';
    else if (vivSel.tipo === 'ambiente') acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="ambiente" data-tipo="ambiente" data-id="' + esc(vivSel.id) + '">' + (ambActiva(vivSel.id) ? 'Apagar las luciérnagas' : 'Encender las luciérnagas') + '</button>';
    else if (vivSel.tipo === 'ave') acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="ave" data-tipo="ave" data-id="' + esc(vivSel.id) + '">' + (activa(vivSel.id) ? 'Guardar el ave' : 'Llamar al árbol') + '</button>';
    else {
      const hs = it.habitat || [], hOk = !hs.length || hs.indexOf(est.tematica) >= 0, hOwn = hs.filter((h) => tengo('tem_' + h))[0];
      if (plantada(vivSel.id)) acc = '<p class="il-viv-ok2">Ya está plantada en tu pasto.</p>';
      else if (hOk) acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="plantar" data-tipo="semilla" data-id="' + esc(vivSel.id) + '">Plantar en mi jardín</button>';
      else if (hOwn) acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="fondoyplantar" data-tipo="semilla" data-id="' + esc(vivSel.id) + '" data-h="' + esc(hOwn) + '">Poner «' + esc(nomHab(hOwn)) + '» de fondo y plantar</button>';
      else acc = '<p class="il-viv-pre">Esta planta es del hábitat «' + esc(nomHab(hs[0])) + '». Obtenlo primero en el Vivero.</p>';
    }
    const lista = amb ? Object.keys(CAT.ambientes || {}).filter((i) => enGrupo('ambiente', i, vivGrupo)) : (vivTab === 'aves' ? aves : sem).filter((i) => enGrupo(tipoV, i, vivGrupo));
    const haba = habs.map((g) => {
      const tiene = tengo('tem_' + g), act = g === est.tematica, precio = ((CAT.tematicas || {})[g] || {}).precio || 0;
      const nota = act ? '[Activo]' : tiene ? '' : precio + ' gotas';
      return '<button type="button" class="viv-hab' + (act ? ' on' : '') + '" data-ac="' + (tiene ? 'habitat' : 'comprar-tema') + '" data-id="' + esc(g) + '" aria-pressed="' + act + '">' + habThumb(g) + '<b>' + esc(nomGrupo(g)) + '</b><span>' + esc(nota) + '</span></button>';
    }).join('');
    const pill = (id, txt) => '<button type="button" class="viv-pill' + (vivTab === id ? ' on' : '') + '" data-ac="tab" data-id="' + id + '" aria-pressed="' + (vivTab === id) + '">' + txt + '</button>';
    const hab = vivGrupo, fondoOk = tengo('tem_' + hab), fondoAct = est.tematica === hab;
    const linFondo = !fondoOk ? '' : fondoAct ? '<p class="il-viv-ok2">Tu jardín es <b>' + esc(nomHab(hab)) + '</b>. Lo que plantes y llames aquí se queda aquí.</p>' : '<button type="button" class="btn sec" data-ac="fondo" data-id="' + esc(hab) + '">Poner este fondo en mi jardín</button>';
    const pillsG = '<button type="button" class="il-viv-saldo il-viv-saldo-bt" data-ac="tab" data-id="gotas" aria-label="Ver cómo ganar gotas">' + ic(IC.gota, 16) + saldo + (saldo === 1 ? ' gota' : ' gotas') + '</button>'
    return '<div class="il-viv-cab viv-top"><h3 class="viv-titulo">Vivero</h3><div class="viv-pills">' + pillsG + '</div></div>'
      + '<h4 class="viv-paso">1. Elige tu entorno (Hábitat)</h4><div class="viv-habitats" role="group" aria-label="Hábitats del Vivero">' + haba + '</div>' + linFondo
      + '<h4 class="viv-paso">2. Decoraciones para este entorno</h4><div class="viv-filtros" role="group" aria-label="Tipo de decoración">' + pill('flores', 'Plantas') + pill('aves', 'Aves') + pill('paisaje', 'Ambiental') + '</div>'
      + '<div class="il-viv-car viv-grid" role="list" aria-label="Decoraciones del entorno">' + lista.map((i) => tile(tipoV, i)).join('') + '</div>'
      + (amb && !lista.length ? '<p class="viv-vacio">Pronto habrá decoraciones para este espacio.</p>' : '<div class="il-viv-ficha viv-accion"><h4>' + esc(it.nombre) + '</h4><p class="il-viv-rasgo">' + esc(vivSel.tipo === 'ave' ? ((AVES[vivSel.id] || {}).t || '') : vivSel.tipo === 'ambiente' ? ((catDe('ambiente')[vivSel.id] || {}).t || '') : (TAM[vivSel.id] || '')) + '</p>' + acc + '</div>')
      + '<p class="il-viv-est" role="status" aria-live="polite">' + esc(vivMsg) + '</p>';
  }
  // F1011 · Obtener gotas, como la captura: se abre desde la píldora de gotas del Vivero y vuelve con la misma píldora (lo que ya ganaste queda guardado).
  function vivPanelGotas(est) {
    const saldo = (est.gotas && est.gotas.saldo) || 0, ori = (CAT.economia && CAT.economia.origenes) || {}, hoyG = (est.gotas && est.gotas.hoy) || {};
    let tri = null; try { tri = window.TBInicio.triviaHoy(); } catch (e) { tri = null; }
    const gotasDe = (k) => (ori[k] || {}).gotas || 0;
    const hoyDe = (k) => { const tope = (ori[k] || {}).tope_dia || 0; return Math.min(hoyG[k] || 0, tope) + ' de ' + tope + ' gotas'; };
    const CATS = [
      { k: 'lectura', t: 'Lectura bíblica', n: 'Lectura bíblica', d: 'Lee un capítulo con calma y a tu ritmo.', bt: 'Ir a leer', to: 'lectura' },
      { k: 'vida', t: 'Prácticas', n: 'Prácticas de vida', d: 'Haz un paso diario de «Vivir lo que aprendemos».', bt: 'Ir a Vida', to: 'vida' },
    ];
    const tarjeta = (c) => '<article class="og-card"><header class="og-h"><span>' + esc(c.t) + '</span><em>+' + gotasDe(c.k) + (gotasDe(c.k) === 1 ? ' gota' : ' gotas') + '</em></header><b>' + esc(c.n) + '</b><p>' + esc(c.d) + '</p><small class="og-hoy">' + ic(IC.gota, 13) + ' Hoy: ' + hoyDe(c.k) + '</small><button type="button" class="btn og-bt" data-ac="ira" data-id="' + c.to + '">' + esc(c.bt) + '</button></article>';
    const trivia = '<section class="og-trivia"><div><b>Trivia de hoy</b><em>+' + gotasDe('trivia') + (gotasDe('trivia') === 1 ? ' gota' : ' gotas') + '</em><p>' + (tri && tri.resuelta ? 'Ya respondiste la trivia de hoy.' : 'Responde la trivia del día.') + '</p></div><button type="button" class="btn og-bt og-jugar" data-ac="ira" data-id="trivia"' + (tri && tri.resuelta ? ' disabled' : '') + '>Jugar</button></section>';
    return '<div class="og-top"><button type="button" class="btn sec og-volver" data-ac="tab" data-id="flores">← Volver al Vivero</button><button type="button" class="il-viv-saldo il-viv-saldo-bt" data-ac="tab" data-id="flores" aria-label="Guardar y volver al Vivero">' + ic(IC.gota, 16) + saldo + (saldo === 1 ? ' gota' : ' gotas') + '</button></div>'
      + '<h3 class="og-titulo">Obtener gotas</h3><p class="og-sub">Nutre tu entorno completando tus prácticas diarias. Cada actividad tiene un límite de hoy.</p>'
      + '<div class="og-grid">' + CATS.map(tarjeta).join('') + '</div>' + trivia
      + '<p class="il-viv-est" role="status" aria-live="polite">' + esc(vivMsg) + '</p>';
  }
  // F967 · Ilustraciones de cada temática (paisaje de 320×96). Dan identidad visual a las tarjetas del vivero.
  const TEMA_ARTE = {
    cordillera: '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="taCo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3ef"/><stop offset="1" stop-color="#f1f5f2"/></linearGradient></defs><rect width="320" height="96" fill="url(#taCo)"/><path d="M0 74 L44 34 L76 56 L118 14 L160 58 L196 22 L244 60 L282 26 L320 52 V96 H0Z" fill="#7d8c9a"/><path d="M118 14 L104 32 L118 28 L130 34 Z M196 22 L184 38 L196 34 L208 40 Z M282 26 L270 42 L282 38 L294 44 Z" fill="#f7fbfd"/><path d="M0 84 C60 78 120 82 180 80 S280 84 320 80 V96 H0Z" fill="#8fb88a"/><g fill="#4f8a55"><ellipse cx="44" cy="82" rx="7" ry="4"/><ellipse cx="226" cy="80" rx="6" ry="3.4"/></g><g fill="#c9dcc0"><circle cx="262" cy="84" r="2"/><circle cx="90" cy="86" r="1.8"/></g></svg>',
    costa: '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="taCs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6ecf6"/><stop offset="1" stop-color="#f4f8f0"/></linearGradient></defs><rect width="320" height="96" fill="url(#taCs)"/><circle cx="58" cy="20" r="9" fill="#f7d98a"/><path d="M0 52 H320 V66 H0Z" fill="#7bb8c9"/><path d="M0 60 q16 -4 32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0 t32 0" fill="none" stroke="#e9f6fb" stroke-width="2"/><path d="M0 70 C80 62 160 74 240 66 S300 66 320 64 V96 H0Z" fill="#e8d3a6"/><path d="M226 96 C232 80 250 72 270 74 C300 76 320 84 320 96Z" fill="#7a6e62"/><path d="M250 92 C254 84 264 80 276 82 C264 86 258 90 250 92Z" fill="#94877a"/><g fill="#5f9a62"><ellipse cx="100" cy="82" rx="6" ry="3"/><ellipse cx="128" cy="84" rx="5" ry="2.6"/></g><g fill="#c25b3c"><path d="M98 80 q-2 -6 0 -10 q2 4 0 10z"/></g></svg>',
    bosque: '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="taBo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f4"/><stop offset="1" stop-color="#eef6e8"/></linearGradient></defs><rect width="320" height="96" fill="url(#taBo)"/><path d="M0 58 C40 34 80 40 120 30 S200 36 240 26 S300 34 320 30 V96 H0Z" fill="#8fb88a"/><g fill="#4f8a55"><ellipse cx="42" cy="48" rx="20" ry="16"/><ellipse cx="78" cy="44" rx="16" ry="14"/><ellipse cx="236" cy="46" rx="20" ry="16"/><ellipse cx="272" cy="42" rx="16" ry="14"/><ellipse cx="304" cy="50" rx="14" ry="12"/></g><g fill="#2f6040"><ellipse cx="128" cy="40" rx="11" ry="20"/><ellipse cx="160" cy="34" rx="13" ry="24"/><ellipse cx="192" cy="42" rx="11" ry="18"/></g><g fill="#7a5a3c"><rect x="40" y="62" width="4" height="22"/><rect x="77" y="58" width="4" height="26"/><rect x="235" y="62" width="4" height="22"/><rect x="271" y="58" width="4" height="26"/><rect x="158" y="56" width="4" height="30"/></g><path d="M0 84 C80 78 160 82 240 80 S300 82 320 80 V96 H0Z" fill="#6f9e68"/><g fill="#d98cb3"><circle cx="100" cy="82" r="2"/><circle cx="210" cy="84" r="2"/></g></svg>',
    desierto: '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="taDe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7dcb0"/><stop offset="1" stop-color="#fbeed6"/></linearGradient></defs><rect width="320" height="96" fill="url(#taDe)"/><circle cx="268" cy="22" r="11" fill="#f5c46a" opacity=".9"/><path d="M0 62 C60 46 120 56 170 48 S270 52 320 44 V96 H0Z" fill="#e6b97a"/><path d="M0 80 C90 70 170 78 250 72 S300 74 320 70 V96 H0Z" fill="#d4a062"/><g fill="#c25b3c"><path d="M52 72 q-4 -10 0 -18 q4 8 0 18z"/><path d="M58 72 q4 -8 10 -10 q-6 6 -10 10z"/></g><g fill="#e7749a"><circle cx="110" cy="66" r="3.4"/><circle cx="118" cy="64" r="3.2"/><circle cx="126" cy="67" r="3.4"/></g><g stroke="#3f7a4c" stroke-width="2.2" stroke-linecap="round"><path d="M110 72 V80"/><path d="M118 70 V80"/><path d="M126 73 V80"/></g><g fill="#5f9a62"><rect x="220" y="58" width="6" height="22" rx="3"/><rect x="226" y="62" width="4" height="10" rx="2"/><rect x="210" y="64" width="4" height="8" rx="2"/></g></svg>',
    jardin: '<svg viewBox="0 0 320 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="taJa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8efe4"/><stop offset="1" stop-color="#f1f7e6"/></linearGradient></defs><rect width="320" height="96" fill="url(#taJa)"/><circle cx="46" cy="22" r="10" fill="#fbe8a6"/><path d="M0 60 C60 42 110 52 160 44 S260 50 320 40 V96 H0Z" fill="#9cc78d"/><ellipse cx="180" cy="80" rx="72" ry="9" fill="#7bb8c9" opacity=".6"/><g fill="#5f9a62"><ellipse cx="150" cy="78" rx="12" ry="3.4"/><ellipse cx="200" cy="79" rx="10" ry="3"/></g><g fill="#f6bfd6" stroke="#e48fb4" stroke-width=".6"><ellipse cx="176" cy="70" rx="3.6" ry="8" transform="rotate(-30 176 78)"/><ellipse cx="176" cy="68" rx="3.6" ry="8.5"/><ellipse cx="184" cy="70" rx="3.6" ry="8" transform="rotate(30 184 78)"/></g><g fill="#6aa86b" stroke="#4f8a45" stroke-width=".4"><rect x="268" y="40" width="5" height="42" rx="2.4" fill="#86b35e"/><rect x="278" y="34" width="4.4" height="48" rx="2.2" fill="#74a352"/><ellipse cx="274" cy="44" rx="6" ry="1.8" transform="rotate(-25 274 44)"/><ellipse cx="282" cy="40" rx="5" ry="1.6" transform="rotate(20 282 40)"/></g><g fill="#7a5fd0"><ellipse cx="60" cy="62" rx="4" ry="14"/><ellipse cx="72" cy="64" rx="4" ry="12"/></g><g fill="#a583e3"><ellipse cx="66" cy="56" rx="3.4" ry="11"/></g></svg>'
  };
  function temasHTML(est) {                                 // F965 · temáticas del vivero: se compran con gotas y cambian el fondo y las plantas permitidas
    const TM = (CAT && CAT.tematicas) || {}, ids = Object.keys(TM), v = est.vivero || { desbloqueados: [] }, saldo = (est.gotas && est.gotas.saldo) || 0;
    if (!ids.length) return '';
    return '<div class="il-tem"><h4 class="il-tem-h">Temáticas</h4>' + ids.map((id) => {
      const t = TM[id], mio = v.desbloqueados.indexOf('tem_' + id) >= 0, act = est.tematica === id;
      const bt = act ? '<span class="il-viv-chip ok">En uso</span>' : mio ? '<button type="button" class="il-tem-bt" data-ac="tema-usar" data-id="' + esc(id) + '">Usar esta temática</button>'
        : '<button type="button" class="il-tem-bt sec" data-ac="tema-comprar" data-id="' + esc(id) + '"' + (saldo < t.precio ? ' disabled' : '') + '>' + (saldo < t.precio ? 'Faltan ' + (t.precio - saldo) + ' gotas' : 'Obtener por ' + t.precio + ' gotas') + '</button>';
      return '<article class="il-tem-card' + (act ? ' act' : '') + '"><div class="il-tem-arte">' + (TEMA_ARTE[id] || '') + '</div><b>' + esc(t.nombre) + '</b><p>' + esc(t.mensaje) + '</p><p class="il-tem-dato">' + esc(t.dato) + '</p>' + bt + '</article>';
    }).join('') + '</div>';
  }
  function vivPanelEsp(est) {                                // F959 · pestaña «Paisaje»: contenido especial que se paga con frutos
    const v = est.vivero || { desbloqueados: [] }, E = (CAT && CAT.especiales) || {}, L = (CAT && CAT.lugares) || {}, orden = Object.keys(L), ids = Object.keys(E).filter((k) => !est.tematica || E[k].lugar === est.tematica).sort((a, b) => orden.indexOf(E[a].lugar) - orden.indexOf(E[b].lugar));   // F1086: la tienda muestra solo lo de tu hábitat activo
    const tengo = (id) => v.desbloqueados.indexOf('esp_' + id) >= 0, lugarOk = (l) => v.desbloqueados.indexOf('lug_' + l) >= 0, nom = (l) => (L[l] && L[l].nombre) || l;
    const saldoG = (est.gotas && est.gotas.saldo) || 0;   // F1070: los paisajes se pagan con gotas
    if (!E[vivSel.id]) vivSel = { tipo: 'esp', id: ids[0] };
    const tile = (id) => { const q = E[id], mio = tengo(id), sel = vivSel.id === id, cerr = !mio && !lugarOk(q.lugar);
      return '<button type="button" class="il-viv-tile' + (sel ? ' sel' : '') + (mio ? ' mio' : '') + '" role="listitem" data-ac="ver" data-tipo="esp" data-id="' + esc(id) + '" aria-pressed="' + sel + '"><span class="il-viv-arte">' + espSvg(id, 78) + '</span><b>' + esc(q.nombre) + '</b><small>' + esc(nom(q.lugar)) + '</small>'
        + (mio ? '<span class="il-viv-chip ok">Tuyo</span>' : '<span class="il-viv-chip">' + ic(IC.gota, 13) + q.precio + (cerr ? ' · falta el lugar' : '') + '</span>') + '</button>'; };
    const q = E[vivSel.id], mio = tengo(vivSel.id), falta = Math.max(0, q.precio - saldoG); let acc;
    if (mio) acc = '<p class="il-viv-ok2">Ya es tuyo. Se ve cuando eliges «' + esc(nom(q.lugar)) + '» en Tu paisaje.</p>';
    else if (!lugarOk(q.lugar)) acc = '<p class="il-viv-pre">Primero necesitas el paisaje «' + esc(nom(q.lugar)) + '». Se obtiene en «Tu paisaje», con gotas.</p>';
    else acc = '<p class="il-viv-pre">' + (falta ? 'Te faltan ' + falta + ' gotas.' : 'Ya tienes las gotas necesarias.') + '</p><button type="button" class="btn il-viv-bt il-viv-main" data-ac="comprar" data-tipo="esp" data-id="' + esc(vivSel.id) + '"' + (falta ? ' disabled' : '') + '>' + (falta ? 'Aún faltan gotas' : 'Obtener por ' + q.precio + ' gotas') + '</button>';
    return '<div class="il-viv-cab"><h3>Vivero</h3><span class="il-viv-saldo">' + ic(IC.gota, 16) + saldoG + (saldoG === 1 ? ' gota' : ' gotas') + '</span></div>'
      + '<p class="il-viv-ay">Cada paisaje se compra con gotas. Lo que obtengas se ve en tu Inicio.</p>'
      + tabsViv('paisaje', { flores: listaDe('semilla').length, aves: listaDe('ave').length, otros: ids.length })
      + temasHTML(est) + '<div class="il-viv-car" role="list" aria-label="Desliza para ver más">' + ids.map(tile).join('') + '</div>'
      + '<div class="il-viv-vista pop" id="ilVivVista"><div class="il-viv-esp">' + espSvg(vivSel.id, 150) + '</div></div>'
      + '<div class="il-viv-ficha"><h4>' + esc(q.nombre) + '</h4><p class="il-viv-rasgo">' + esc(nom(q.lugar)) + '</p><p class="il-viv-dato">' + esc(q.dato || '') + '</p>' + acc + '</div>'
      + '<p class="il-viv-est" role="status" aria-live="polite">' + esc(vivMsg) + '</p>';
  }
  const MOT = { 'otra-tematica': 'Primero obtén el hábitat de esta planta.', 'no-desbloqueada': 'Primero obtén esta temática.', 'faltan-frutos': 'Aún faltan frutos para esto.', 'falta-lugar': 'Primero hace falta ese paisaje.', 'faltan-gotas': 'Aún faltan gotas para esto.', 'sin-lugar': 'No queda lugar libre en el pasto.', 'maximo': 'Solo pueden estar 2 aves a la vez. Se puede guardar una para llamar a otra.', 'ya-tienes': 'Ya lo tienes.' };
  const nomHab = (h) => ((CAT && CAT.tematicas && CAT.tematicas[h]) || {}).nombre || h;
  // F1067 · Cámara: el escenario se acerca al punto donde se plantó o llamó un ave, y vuelve. Con «reducir movimiento» no se mueve.
  function camara(cont, sel) {
    const es = $('#ilEscena', cont), el = es && $(sel, es); if (!el || quieto()) return;
    const eb = es.getBoundingClientRect(), b = el.getBoundingClientRect(); if (!eb.width) return;
    es.style.setProperty('--ox', (((b.left + b.width / 2 - eb.left) / eb.width) * 100).toFixed(1) + '%');
    es.style.setProperty('--oy', (((b.top + b.height / 2 - eb.top) / eb.height) * 100).toFixed(1) + '%');
    es.classList.remove('camara'); void es.offsetWidth; es.classList.add('camara');
    try { es.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* sin desplazamiento */ }
    later(() => es.classList.remove('camara'), 1900);
  }
  function ligarViv(cont, mi) {
    const T = window.TBInicio, bt = $('#ilVivBtn', cont), pn = $('#ilViv', cont); if (!bt || !pn) return;
    const pinta = (conservar) => { const car = $('.il-viv-car', pn), sl = car ? car.scrollLeft : 0; pn.innerHTML = vivPanel(T.cargar()); const c2 = $('.il-viv-car', pn); if (c2 && conservar) c2.scrollLeft = sl; };
    const abre = (si) => { vivAbierto = si; pn.hidden = !si; bt.setAttribute('aria-expanded', String(si)); bt.innerHTML = ic(IC.hoja) + (si ? 'Cerrar el vivero' : 'Vivero'); if (si) { pinta(true); if (!quieto()) { pn.classList.remove('entra'); void pn.offsetWidth; pn.classList.add('entra'); } try { pn.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) { /* sin scroll */ } } };
    bt.onclick = () => { vivMsg = ''; abre(pn.hidden); };
    pn.onclick = (ev) => {
      const b = ev.target.closest('[data-ac]'); if (!b || b.disabled) return; const ac = b.getAttribute('data-ac'), tipo = b.getAttribute('data-tipo'), id = b.getAttribute('data-id'); let r;
      if (ac === 'fondo') { const r = window.TBInicio.elegirTematica(id); if (!r.ok) { vivMsg = 'No se pudo cambiar el fondo.'; pinta(true); return; } vivMsg = 'Tu jardín ahora es el de ' + nomHab(id) + '.'; sonido('suave'); pintar(cont, mi, { repinta: true }); return; }
      // F1066: tocar un hábitat solo lo muestra; el fondo cambia únicamente con el botón «Poner este fondo»
      if (ac === 'habitat') { vivGrupo = id; vivMsg = ''; pinta(false); sonido('suave'); try { const act = $('.viv-hab.on', pn); if (act && act.scrollIntoView) act.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); } catch (e) { /* sin desplazamiento */ } return; }
      if (ac === 'comprar-tema') { vivGrupo = id; const r = window.TBInicio.comprar('tema', id); if (r && r.ok) { vivMsg = '¡Hábitat desbloqueado! Ya puedes activarlo.'; sonido('logro'); } else { const m = { 'sin-gotas': 'Te faltan gotas para este hábitat. Toca «Ganar gotas» para sumar.', 'ya-tienes': 'Ya tienes este hábitat.' }; vivMsg = m[r && r.motivo] || 'No se pudo desbloquear ahora.'; } pinta(false); return; }
      if (ac === 'tab' && id === 'gotas') { vivSel = { tipo: 'gotas', id: 'gotas' }; vivMsg = ''; pinta(false); sonido('suave'); return; }
      if (ac === 'grupo') { vivGrupo = id; const tp = vivSel && vivSel.tipo === 'ave' ? 'ave' : 'semilla', p = listaDe(tp).filter((i) => enGrupo(tp, i, id))[0]; if (p) vivSel = { tipo: tp, id: p }; vivMsg = ''; pinta(false); sonido('suave'); return; }
      if (ac === 'ira') { if (id === 'trivia') { abre(false); const tt = $('#ilTriBtn', cont); if (tt) { tt.click(); try { tt.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'center' }); } catch (e) { /* sin scroll */ } } return; } try { if (window.TBApp && window.TBApp.irA) window.TBApp.irA(id); } catch (e) { /* sin ir */ } return; }
      if (ac === 'tab' && id === 'paisaje') { vivTab = 'paisaje'; vivMsg = ''; pinta(false); sonido('suave'); return; }
      if (ac === 'tab') { const e = T.cargar(), v = e.vivero || { desbloqueados: [] }, lista = id === 'aves' ? Object.keys(CAT.aves || {}) : (CAT.orden_semillas || Object.keys(CAT.semillas || {})), pre = id === 'aves' ? 'ave_' : 'sem_', p1 = lista.find((i) => v.desbloqueados.indexOf(pre + i) < 0) || lista[0]; vivSel = { tipo: id === 'aves' ? 'ave' : 'semilla', id: p1 }; vivTab = id === 'aves' ? 'aves' : 'flores'; vivMsg = ''; pinta(false); sonido('suave'); return; }
      if (ac === 'ver') { vivSel = { tipo, id }; vivMsg = ''; pinta(true); sonido('suave'); try { const s = $('.il-viv-tile.sel', pn); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); } catch (e) { /* sin scroll */ } return; }
      if (ac === 'tema-comprar') { r = T.comprar('tema', id); if (r.ok) vivMsg = 'Listo: ya tienes esta temática. Úsala para cambiar el paisaje.'; }
      else if (ac === 'tema-usar') { r = T.elegirTematica(id); if (r.ok) { vivMsg = 'Temática activa.'; try { pintar(cont, mi, { repinta: true }); } catch (er) { /* sin repintar */ } return; } }
      else if (ac === 'comprar') { r = tipo === 'esp' ? T.comprarEspecial(id) : T.comprar(tipo, id); if (r.ok) vivMsg = tipo === 'esp' ? 'Listo: ya está en tu paisaje.' : 'Listo: ya es tuyo.'; }
      else if (ac === 'plantar') { r = T.plantar(id); if (r.ok) vivMsg = 'Plantada en el pasto.'; }
      else if (ac === 'fondoyplantar') { const r1 = T.elegirTematica(b.getAttribute('data-h')); r = r1.ok ? T.plantar(id) : r1; if (r.ok) vivMsg = 'Plantada. Tu jardín ahora es el de ' + nomHab(b.getAttribute('data-h')) + '.'; }
      else if (ac === 'ambiente') { const act = ((T.cargar().vivero.ambientes) || []).indexOf(id) >= 0; r = T.activarAmbiente(id, !act); if (r.ok) vivMsg = act ? 'Las luciérnagas se apagaron.' : 'Las luciérnagas llegaron a tu paisaje.'; }
      else { const act = (T.cargar().vivero.aves || []).some((a) => a.id === id); r = T.activarAve(id, !act); if (r.ok) vivMsg = act ? 'Se guardó el ave.' : 'El ave llegó al árbol.'; }
      if (!r.ok) { vivMsg = MOT[r.motivo] || 'No se pudo.'; pinta(true); return; }
      sonido(ac === 'ave' ? 'suave' : 'semilla'); vivAbierto = true; pintar(cont, mi, { repinta: true });
      // F1067 · La cámara acompaña la acción: se acerca a lo que se plantó o llamó
      if (ac === 'plantar' || ac === 'fondoyplantar') camara(cont, '.il-planta.p-' + id);
      else if (ac === 'ave' && (T.cargar().vivero.aves || []).some((a) => a.id === id)) camara(cont, '.il-ave.a-' + id);
    };
    if (vivAbierto) abre(true);
  }
  // F999 · Hierba: mechones con varios verdes sobre el suelo (determinista: el mismo dibujo siempre).
  function hierbaTB(x0, x1, yb, n, seed) {
    let k = seed || 11; const r = () => (k = (k * 9301 + 49297) % 233280) / 233280;
    const tonos = ['#5f9a62', '#7cb36f', '#4f8a55', '#94c27f'];
    let g = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), y = yb + r() * 7, h = 6 + r() * 11, lean = (r() - 0.5) * 9, col = tonos[Math.floor(r() * tonos.length)];
      g += '<path d="M' + (x - 1.3).toFixed(1) + ' ' + y.toFixed(1) + ' Q' + (x + lean * 0.3).toFixed(1) + ' ' + (y - h * 0.55).toFixed(1) + ' ' + (x + lean).toFixed(1) + ' ' + (y - h).toFixed(1) + ' Q' + (x + lean * 0.3 + 1.3).toFixed(1) + ' ' + (y - h * 0.55).toFixed(1) + ' ' + (x + 1.3).toFixed(1) + ' ' + y.toFixed(1) + 'Z" fill="' + col + '"/>';
    }
    return g;
  }
  // F1015 · Hojas de la copa: aparecen una por una cada día, en posiciones fijas (siempre igual), con tres verdes.
  function hojasTB(n, etapa) {
    // Copa de cada etapa: centro y radio. Las hojas caen dentro de la copa, nunca en el aire.
    const COPA = { brote: [0, -34, 14, 4], raiz: [0, -70, 30, 12], ramas: [0, -112, 50, 26], frondoso: [0, -150, 74, 42] }[etapa] || [0, -150, 74, 42];
    const [cx, cy, R, tope] = COPA; n = Math.min(n, tope);
    let g = ''; const tonos = ['#5f9a62', '#7cb36f', '#4f8a55'];
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / tope), x = cx + Math.cos(a) * r * 1.05, y = cy + Math.sin(a) * r * 0.9;
      const s = 4 + (i % 4), rot = (i * 47) % 180;
      g += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + s + '" ry="' + (s * 0.5).toFixed(1) + '" transform="rotate(' + rot + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" fill="' + tonos[i % 3] + '"/>';
    }
    return g;
  }
  function escena(est) {
    const c = est.ciclo, et = ETAPAS[window.TBInicio ? window.TBInicio.etapa(c.diasCuidado) : 'brote'] ? window.TBInicio.etapa(c.diasCuidado) : 'brote';
    const pais = est.paisaje || [], nPais = window.TBInicio.entornoVisible(pais.length, c.diasCuidado), escAv = window.TBInicio.avanceDiario(c.diasCuidado).escala;
  const fondo = pais.slice(0, nPais).map((q) => { const s = FONDO[q.casilla]; return s ? '<g transform="translate(' + s[0] + ' ' + s[1] + ') scale(' + (s[2] * escAv) + ')">' + arbol(q.especie, 'frondoso') + '</g>' : ''; }).join('');
    const mal = (est.maleza || []).map((m) => '<button type="button" class="il-maleza s-' + esc(m.casilla) + '" data-id="' + esc(m.id) + '" aria-label="Quitar maleza (' + esc(MALEZA[m.tipo] || 'maleza') + '). Toca para limpiarla">' + malezaIcono(m.tipo) + '</button>').join('');
    const TM = est.tematica && CAT && CAT.tematicas && CAT.tematicas[est.tematica], fo = (TM && TM.fondo) || fondoActual(), cl = climaReal(climaActual());   // F965: la temática cambia el fondo
    return '<div class="il-escena' + ((est.maleza || []).length ? ' apagado' : '') + '" id="ilEscena" data-fondo="' + fo + '" data-clima="' + cl + '">'
      + '<svg class="il-svg" viewBox="0 110 360 310" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">'
      + '<defs><linearGradient id="ilNoche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1330" stop-opacity="0"/><stop offset=".45" stop-color="#0b1330" stop-opacity=".62"/><stop offset="1" stop-color="#0b1330" stop-opacity=".4"/></linearGradient><linearGradient id="ilDeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="dg-a"/><stop offset=".78" class="dg-a"/><stop offset="1" class="dg-b"/></linearGradient>'
      + '<mask id="ilMasc" maskUnits="userSpaceOnUse" x="-300" y="110" width="960" height="310"><rect x="-300" y="110" width="960" height="310" fill="url(#ilDeg)"/></mask></defs><g mask="url(#ilMasc)">'
      + '<g class="cap cap0">' + cielo(cl) + atras(fo) + '</g><g class="cap cap1"><path class="col c1" d="' + COL.c1 + '"/>' + fondo + '</g>'
      + '<g class="cap cap2"><path class="col c2" d="' + COL.c2 + '"/></g>'
      + '<g class="cap cap3"><path class="col c3" d="' + COL.c3 + '"/></g></g>'
      + '<g mask="url(#ilMasc)">' + frente(fo) + '</g><g class="esp">' + especialesEscena(est, fo) + '</g><g class="pa-dia">' + paisajeDelDia(est.habDias || 0, est.tematica) + rasgosEscena(est) + '</g><g class="cap cap3"><g class="mundo" transform="translate(180 344) scale(' + window.TBInicio.avanceDiario(c.diasCuidado).escala + ')">' + (est.tematica === 'desierto' ? '<g transform="translate(158 -44) scale(0.9)">' + sueloDibujo('cactus') + '</g>' : est.tematica === 'costa' ? '' : arbol(c.especie, et, c.diasCuidado) + hojasTB(window.TBInicio.avanceDiario(c.diasCuidado).hojas, et)) + '</g></g>' + '<g class="tb-hierba" aria-hidden="true">' + (est.tematica === 'desierto' || est.tematica === 'costa' ? '' : hierbaTB(0, 360, 392, 90, 17)) + '</g><g class="clima">' + climaSvg(cl) + '</g></svg>'
      + '<i class="il-anillo" id="ilAnillo" aria-hidden="true"></i>'
      + '<button type="button" class="il-resp" id="ilResp" aria-label="Respirar con tu árbol. Toca para una pausa de unos 30 segundos"></button>' + mal + gotasHTML(est)  + vivEscena(est) + '</div>';
  }

  // ---------- Textos ----------
  function estadoTxt(est, r) {
    const c = est.ciclo, e = window.TBInicio.etapa(c.diasCuidado), av = window.TBInicio.avanceDiario(c.diasCuidado), dia = 'Día ' + c.diasCuidado + ' de ' + DIAS() + ' · ' + (ETAPAS[e] || 'Brote') + ' · ' + Math.round(av.fraccion * 100) + '% de la etapa';
    if (r && r.cicloNuevo) { const s = CAT && CAT.especies && CAT.especies[c.especie]; return 'Empieza un árbol nuevo' + (s ? ': ' + s.nombre : '') + '. El anterior ya forma parte del paisaje.'; }
    if (est.maleza.length) return 'Hay maleza en el pasto. Puedes tocarla para quitarla; así tu árbol sigue creciendo.';
    if (c.cerrado) return 'Tu árbol está completo. Tu lugar va en el día ' + (est.habDias || 0) + ' de 30.';   // F1090: el árbol madura en 10 días
    if (r && r.diaNuevo) return 'Hoy tu árbol creció un día más. ' + dia;
    return dia;
  }
  function nombreArbol(est) { if (est.tematica === 'costa') return esc((CAT.tematicas.costa || {}).nombre || 'Costa del Pacífico');   // F1090: en la playa no se dibuja árbol
    const s = CAT && CAT.especies && CAT.especies[est.ciclo.especie]; return s ? esc(s.nombre) + (s.otro ? ' <span>· ' + esc(s.otro) + '</span>' : '') : 'Tu árbol'; }

  // ---------- Primera semilla ----------
  // F1076 · Tarjeta de lugar: paisaje del hábitat + su árbol emblemático encima, para reconocerlo de inmediato
  function lugarIlustracion(h) {
    const base = habThumb(h), t = (CAT.tematicas || {})[h] || {}, em = t.arbol;
    if (h === 'desierto') return base.replace('</svg>', '<g transform="translate(80 92) scale(0.5)">' + sueloDibujo('cactus') + '</g></svg>');   // F1088: el cactus es el emblema visible del desierto
    if (h === 'costa' || !em || !(CAT.especies || {})[em]) return base;
    return base.replace('</svg>', '<g transform="translate(80 94) scale(0.2)">' + arbol(em, 'frondoso') + '</g></svg>');
  }
  function vistaEleccion(cont, mi) {   // F1074: primero se elige el lugar (hábitat); su árbol emblemático es el primero
    if (cont.parentNode && cont.parentNode.classList) cont.parentNode.classList.add('il-eligiendo');
    const hs = ['bosque', 'desierto', 'costa'].filter((h) => CAT.tematicas && CAT.tematicas[h]);
    cont.innerHTML = '<div class="il-elige"><h2>Elige el lugar de tu jardín</h2>'
      + '<p class="il-elige-sub">Cada lugar tiene su árbol y sus rasgos. Lo que plantes aquí se queda aquí.</p>'
      + '<div class="il-semillas" role="radiogroup" aria-label="Lugares para elegir">' + hs.map((h) => { const t = CAT.tematicas[h], s = CAT.especies[t.arbol];
        return '<button type="button" class="il-semilla il-lugar" role="radio" aria-checked="false" data-id="' + esc(h) + '">' + lugarIlustracion(h)
          + '<span class="il-sem-tx"><b>' + esc(t.nombre) + '</b><em>Árbol: ' + esc(s ? s.nombre : 'ninguno') + '</em><small>Rasgos: ' + esc((t.rasgos || []).join(', ')) + '</small></span></button>'; }).join('') + '</div>'
      + '<button type="button" class="btn il-plantar" id="ilPlantar" disabled>Elige un lugar para continuar</button></div>';
    let sel = '';
    const bots = Array.prototype.slice.call(cont.querySelectorAll('.il-semilla')), pl = $('#ilPlantar', cont);
    bots.forEach((b) => { b.onclick = () => { sel = b.getAttribute('data-id'); bots.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.classList.toggle('on', on); }); pl.disabled = false; pl.textContent = 'Empezar en ' + CAT.tematicas[sel].nombre; }; });
    pl.onclick = () => { if (!sel || !window.TBInicio.elegirHabitatInicial(sel)) return; sonido('semilla'); window.TBInicio.visita(); pintar(cont, mi, { plantado: true }); };
  }

  // ---------- Jardín ----------
  function pintar(cont, mi, extra) {
    if (mi !== gen || !cont.isConnected) return;
    const T = window.TBInicio; let r = (extra && extra.r) || {};
    if (!extra || (!extra.plantado && !extra.repinta)) { r = T.visita(); if (r.eligiendo) return vistaEleccion(cont, mi); }
    const est = T.cargar(); if (est.eligiendo) return vistaEleccion(cont, mi);
    if (cont.parentNode && cont.parentNode.classList) cont.parentNode.classList.remove('il-eligiendo');
    const guia = lsGet(KGUIA) !== '1';
    cont.innerHTML = escena(est) + '<div class="il-datos"><p class="il-nombre" id="ilNombre">' + nombreArbol(est) + '</p><p class="il-estado" id="ilEstado" role="status" aria-live="polite">' + esc(estadoTxt(est, r)) + '</p>'
      + '<p class="il-gotas" id="ilGotas" aria-live="polite">' + gotasTexto(est) + '</p>'
      + (guia ? '<p class="il-guia" id="ilGuia">Toca el tronco para respirar un momento.</p>' : '')
      + '<div class="il-fila"><button type="button" class="il-btn-msg" id="ilMsgBtn" aria-expanded="false" aria-controls="ilMsg">' + ic(IC.libro) + 'Mensajes de hoy</button>'
      + '<button type="button" class="il-btn-msg" id="ilTriBtn" aria-expanded="false" aria-controls="ilTri"></button>'
      + '<button type="button" class="il-btn-msg" id="ilVivBtn" aria-expanded="false" aria-controls="ilViv">' + ic(IC.hoja) + 'Vivero</button></div>'
      + '<div class="il-msg" id="ilMsg" hidden></div><div class="il-msg il-tri" id="ilTri" hidden></div><section class="il-viv" id="ilViv" aria-label="Vivero" hidden></section></div>';
    const esc0 = $('#ilEscena', cont);
    if (r.panoramica && !quieto()) { esc0.classList.add('pano'); later(() => esc0.classList.remove('pano'), 3000); } else if ((extra && extra.plantado) && !quieto()) { esc0.classList.add('brota'); later(() => esc0.classList.remove('brota'), 1800); }
    esc0.classList.add('entra'); later(() => esc0.classList.remove('entra'), 1400);
    paralaje(esc0); ligar(cont, mi); pantalla();
  }

  function paralaje(esc0) {                                   // el fondo se mueve apenas mientras se arrastra el dedo; al soltar vuelve solo (transición CSS). Sin dedo, no hay trabajo.
    if (quieto()) return; let nx = 0;
    const mover = () => { raf = 0; esc0.style.setProperty('--px', nx.toFixed(3)); };
    const sigue = (ev) => { const b = esc0.getBoundingClientRect(); if (!b.width) return; nx = Math.max(-1, Math.min(1, ((ev.clientX - b.left) / b.width - 0.5) * 2)); esc0.classList.add('mueve'); if (!raf) raf = requestAnimationFrame(mover); };
    const suelta = () => { nx = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } esc0.style.setProperty('--px', '0'); later(() => esc0.classList.remove('mueve'), 900); };
    esc0.addEventListener('pointermove', sigue, { passive: true }); esc0.addEventListener('pointerleave', suelta); esc0.addEventListener('pointerup', suelta); esc0.addEventListener('pointercancel', suelta);
  }

  // F930 (I3): chispas de luz al limpiar una maleza. Máximo 6 partículas, solo transform/opacity, se quitan solas; sin ellas con «reducir movimiento» o modo Ahorro.
  function luces(b) {
    if (quieto() || H.getAttribute('data-eco') === '2') return;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('i'), a = (i / 6) * Math.PI * 2 + 0.4, d = 26 + (i % 3) * 8;
      s.className = 'il-luz'; s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * d - 14) + 'px');
      b.appendChild(s); later(() => { try { s.remove(); } catch (e) { /* ya quitada */ } }, 900);
    }
  }

  function ligar(cont, mi) {
    const T = window.TBInicio, estado = $('#ilEstado', cont);
    const rb = $('#ilResp', cont); if (rb) rb.onclick = () => respirar(cont);
    Array.prototype.forEach.call(cont.querySelectorAll('.il-maleza'), (b) => {
      b.onclick = () => {
        const x = T.sanar(b.getAttribute('data-id')); if (!x.ok) return; sonido('sana');
        luces(b); b.classList.add('sana'); later(() => { try { b.remove(); } catch (e) { /* ya quitada */ } }, quieto() ? 0 : 450);
        if (!x.quedan) { const es = $('#ilEscena', cont); if (es) { es.classList.remove('apagado'); if (!quieto()) { es.classList.add('brilla'); later(() => es.classList.remove('brilla'), 1800); } } }
        const est = T.cargar();
        if (!x.quedan) { estado.textContent = 'Listo. Tu árbol sigue creciendo. ' + 'Día ' + est.ciclo.diasCuidado + ' de ' + DIAS(); if (x.diaNuevo) later(() => pintar(cont, mi, { repinta: true, r: { diaNuevo: true } }), quieto() ? 0 : 700); }
      };
    });
    Array.prototype.forEach.call(cont.querySelectorAll('.il-gota'), (b) => {
      b.onclick = () => {
        const id = b.getAttribute('data-id'), n = T.recolectar(id); if (!n) return; sonido('gota'); luces(b);
        const quita = (x) => { x.classList.add('recoge'); later(() => { try { x.remove(); } catch (e) { /* ya quitada */ } }, quieto() ? 0 : 400); };
        if (id === 'todas') Array.prototype.forEach.call(cont.querySelectorAll('.il-gota'), quita); else quita(b);
        const g = $('#ilGotas', cont); if (g) g.innerHTML = gotasTexto(T.cargar());
      };
    });
    ligarViv(cont, mi);
    const tb = $('#ilTriBtn', cont), tc = $('#ilTri', cont);                   // F961 · Trivia diaria de naturaleza
    if (tb && tc) {
      const marca = () => { const t = T.triviaHoy(); tb.classList.toggle('nuevo', !!t && !t.resuelta); tb.innerHTML = ic(IC.mundo) + (t && t.resuelta ? 'Trivia de hoy · lista' : 'Trivia del día · +' + (t ? t.gotas : 3) + ' gotas'); };
      const pintaTri = (anim) => {
        const t = T.triviaHoy(); if (!t) { tc.innerHTML = '<p class="il-tri-ay">Por ahora no hay pregunta. Vuelve mañana.</p>'; return; }
        const ops = t.opciones.map((o, i) => { let cl = 'il-tri-op'; if (t.resuelta) { if (i === t.correcta) cl += ' ok'; else if (i === t.elegida) cl += ' mal'; } return '<button type="button" class="' + cl + '" data-i="' + i + '"' + (t.resuelta ? ' disabled' : '') + '><i aria-hidden="true">' + 'ABC'.charAt(i) + '</i><span>' + esc(o) + '</span></button>'; }).join('');
        const res = t.resuelta ? '<p class="il-tri-res ' + (t.ok ? 'ok' : 'mal') + '" role="status">' + (t.ok ? '¡Correcto! Ganaste ' + t.gotas + ' gotas.' : 'Casi. La respuesta correcta quedó marcada en verde.') + '</p><p class="il-tri-exp">' + esc(t.explicacion) + '</p><p class="il-manana">Mañana, otra pregunta de naturaleza.</p>'
          : '<p class="il-tri-ay">Una pregunta por día para todos. Si aciertas, ganas ' + t.gotas + ' gotas; si no, aprendes algo y mañana hay otra.</p>';
        tc.innerHTML = '<article class="il-mc il-mc-trivia"><header>' + ic(IC.mundo, 20) + '<span>Trivia del día · naturaleza</span></header><p class="il-tri-q">' + esc(t.pregunta) + '</p><div class="il-tri-ops" role="group" aria-label="Opciones de respuesta">' + ops + '</div>' + res + '</article>';
        if (anim) { tc.classList.remove('entra'); void tc.offsetWidth; tc.classList.add('entra'); }
        Array.prototype.forEach.call(tc.querySelectorAll('.il-tri-op'), (b) => {
          b.onclick = () => {
            const r = T.responderTrivia(+b.getAttribute('data-i')); if (!r.ok) return; sonido(r.acierto ? 'exito' : 'suave'); pintaTri(false);
            const bo = $('.il-tri-op.ok', tc); if (bo && r.acierto) { bo.classList.add('pop'); luces(bo); const ar = $('.il-mc-trivia', tc); if (ar) luces(ar); }
            const g = $('#ilGotas', cont); if (g) g.innerHTML = gotasTexto(T.cargar()); marca();
          };
        });
      };
      marca();
      tb.onclick = () => { const abre = tc.hidden; tc.hidden = !abre; tb.setAttribute('aria-expanded', String(abre)); if (abre) pintaTri(true); };
    }
    const mb = $('#ilMsgBtn', cont), mc = $('#ilMsg', cont);
    const ICM = { arbol: IC.hoja, planeta: IC.mundo, vida: IC.brote }, ETQ = { arbol: 'Del árbol · para admirarlo', planeta: 'Para el planeta · para respetarlo', vida: 'Para crecer · personas y sociedad' };
    const fecha = () => { try { const t = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); } catch (e) { return 'Hoy'; } };
    const pinta = () => {
      const m = T.mensajeActual(0); if (!m || !m.items || !m.items.length) { mc.textContent = 'Este árbol aún no tiene mensajes.'; return; }
      const tarj = m.items.map((x, i) => '<article class="il-mc il-mc-' + x.clave + ' d' + i + '"><header>' + ic(ICM[x.clave] || IC.hoja, 20) + '<span>' + esc(ETQ[x.clave] || x.titulo) + '</span></header>'
        + (x.clave === 'vida' && x.titulo ? '<p class="il-tema">' + esc(x.titulo) + '</p>' : '') + '<p class="il-vida">' + esc(x.texto) + '</p>'
        + '</article>').join('');
      mc.innerHTML = '<div class="il-msg-cab"><h3>' + esc(m.titulo) + '</h3><p class="il-fecha">' + esc(fecha()) + ' · tres mensajes de hoy</p></div>' + tarj
        + '<p class="il-como">' + esc(m.como || 'Cuidar este árbol se parece a cuidarnos: un poco cada día, con paciencia y sin exigencias.') + '</p><p class="il-manana">Mañana se abren tres mensajes nuevos.</p>';
      Array.prototype.forEach.call(mc.querySelectorAll('.il-mini'), (b) => { b.onclick = () => { const x = m.items[+b.getAttribute('data-i')]; try { navigator.share({ title: m.titulo, text: x.texto }); } catch (e) { /* no compartido */ } }; });
    };
    mb.onclick = () => {
      const abre = mc.hidden; mc.hidden = !abre; mb.setAttribute('aria-expanded', String(abre)); mb.innerHTML = ic(IC.libro) + (abre ? 'Cerrar los mensajes' : 'Mensajes de hoy');
      if (abre) { pinta(); mc.classList.remove('entra'); void mc.offsetWidth; mc.classList.add('entra'); }
    };
  }

  // ---------- Respirar (se toca el tronco): 3 ciclos de 4 s al inhalar y 6 s al exhalar ----------
  function respirar(cont) {
    const an = $('#ilAnillo', cont), tx = $('#ilEstado', cont), rb = $('#ilResp', cont); if (!an || !tx) return;
    if (resp) { resp.forEach(clearTimeout); resp = null; an.className = 'il-anillo'; tx.textContent = 'Pausa terminada. Puedes volver cuando quieras.'; return; }
    lsSet(KGUIA, '1'); const g = $('#ilGuia', cont); if (g) g.remove();
    resp = []; let t = 0; const mover = !quieto();
    const paso = (txt, cls, ms, ent) => { const id = setTimeout(() => { tx.textContent = txt; if (mover) an.className = 'il-anillo ' + cls; sonido('respira', ent); }, t); resp.push(id); t += ms; };
    for (let i = 0; i < 3; i++) { paso('Inhala despacio…', 'in', 4000, true); paso('Exhala despacio…', 'ex', 6000, false); }
    resp.push(setTimeout(() => { an.className = 'il-anillo'; resp = null; tx.textContent = 'Gracias por esta pausa.'; if (rb) rb.focus({ preventScroll: true }); }, t));
    tx.textContent = 'Toca de nuevo el árbol si quieres terminar antes.';
  }

  // ---------- Pantalla encendida (opcional, apagada por defecto; se activa en «Efectos y sonido») ----------
  function pantalla() {
    if (lsGet(KPANT) !== '1' || vela || !navigator.wakeLock || (H && H.getAttribute('data-eco') === '2')) return;
    const pedir = () => navigator.wakeLock.request('screen').then((w) => { vela = w; later(liberar, DIEZ_MIN); }).catch(() => { /* sin pantalla encendida */ });
    if (navigator.getBattery) navigator.getBattery().then((b) => { if (!(b && !b.charging && b.level < 0.2)) pedir(); }).catch(pedir); else pedir();
  }
  function liberar() { if (vela) { try { vela.release(); } catch (e) { /* ya liberada */ } vela = null; } }

  // ---------- Entrada y salida ----------
  function catalogo() {
    if (CAT) return Promise.resolve(CAT);
    if (!cargando) cargando = fetch('datos/inicio_catalogo.json').then((r) => { if (!r.ok) throw new Error('catalogo'); return r.json(); }).then((c) => { CAT = c; return c; }).catch(() => { cargando = null; return null; });
    return cargando;
  }
  function soltar() { gen++; timers.forEach(clearTimeout); timers = []; if (resp) { resp.forEach(clearTimeout); resp = null; } if (raf) { cancelAnimationFrame(raf); raf = 0; } liberar(); }
  function montar(cont) {
    if (!cont || !window.TBInicio) return; soltar(); const mi = gen;
    cont.innerHTML = '<p class="il-carga">Preparando tu jardín…</p>';
    catalogo().then((c) => {
      if (mi !== gen || !cont.isConnected) return;
      if (!c) { cont.innerHTML = '<p class="il-carga">Tu jardín no pudo cargar ahora. Se intentará de nuevo la próxima vez que entres.</p>'; return; }
      try { window.TBInicio.config({ catalogo: c }); pintar(cont, mi); } catch (e) { cont.innerHTML = '<p class="il-carga">Tu jardín no pudo cargar ahora. Se intentará de nuevo la próxima vez que entres.</p>'; }
    });
  }

  const api = { paisajeHoja, montar, soltar, arbol, escena, estadoTxt, ETAPAS, FORMA, FONDO, paisaje: paisajeDelDia, paisajeHab: PAISAJE_HAB, slotsDia: SLOTS_DIA, config(c) { CAT = c; } };
  if (typeof window !== 'undefined') window.TBLienzo = api; if (typeof module !== 'undefined') module.exports = api;
})();
