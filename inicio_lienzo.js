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
  const FORMA = { araucaria: 'paraguas', canelo: 'redondo', quillay: 'redondo', roble: 'redondo', cerezo: 'redondo', alerce: 'cono', sauce: 'cascada', palma_chilena: 'palma', jacaranda: 'florido' };
  const MALEZA = { hoja_seca: 'hoja seca', trebol_gris: 'trébol marchito', hierba_seca: 'hierba seca' };
  // Casillas del paisaje lejano: [x, y, escala] dentro del lienzo de 360 x 420.
  const FONDO = { 'fondo-1': [52, 296, 0.30], 'fondo-2': [110, 290, 0.26], 'fondo-3': [258, 292, 0.28], 'fondo-4': [312, 298, 0.32], 'fondo-5': [2, 300, 0.34], 'fondo-6': [356, 296, 0.30] };

  // ---------- Arte: árbol por etapas (SVG por capas; las clases dan el color en inicio_lienzo.css) ----------
  const p = (cls, d) => '<path class="' + cls + '" d="' + d + '"/>';
  const ci = (cls, x, y, r) => '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  const el = (cls, x, y, rx, ry, rot) => '<ellipse class="' + cls + '" cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"' + (rot ? ' transform="rotate(' + rot + ' ' + x + ' ' + y + ')"' : '') + '/>';

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
  function frondoso(forma, especie) {
    if (forma === 'paraguas') {
      return p('tr-t t10', 'M0 0 C-3 -60 3 -120 0 -168') + p('tr-t t3', 'M0 -58 L-15 -66') + p('tr-t t3', 'M0 -78 L15 -86') + p('tr-t t3', 'M0 -98 L-13 -104')
        + p('tr-t t4', 'M0 -150 C-24 -152 -44 -160 -60 -176') + p('tr-t t4', 'M0 -150 C24 -152 44 -160 60 -176') + p('tr-t t3', 'M0 -162 C-8 -172 -14 -182 -16 -192')
        + el('tr-h', 0, -182, 58, 14) + el('tr-h2', -30, -190, 34, 10, -8) + el('tr-h2', 30, -190, 34, 10, 8) + el('tr-h', -58, -176, 22, 8, -24) + el('tr-h', 58, -176, 22, 8, 24) + el('tr-h', 0, -198, 30, 8);
    }
    if (forma === 'cono') {
      return p('tr-t t8', 'M0 0 C-2 -50 2 -100 0 -150') + el('tr-h', 0, -84, 58, 16) + el('tr-h2', 0, -92, 40, 8) + el('tr-h', 0, -108, 46, 14) + el('tr-h2', 0, -116, 30, 7) + el('tr-h', 0, -130, 34, 12) + el('tr-h', 0, -150, 22, 10) + el('tr-h2', 0, -164, 10, 8);
    }
    if (forma === 'palma') {
      return p('tr-t t10', 'M0 0 C-4 -50 4 -100 0 -140') + p('tr-t t4', 'M0 -140 C-30 -160 -54 -150 -70 -128') + p('tr-t t4', 'M0 -140 C30 -160 54 -150 70 -128') + p('tr-t t4', 'M0 -140 C-24 -176 -52 -176 -64 -160')
        + p('tr-t t4', 'M0 -140 C24 -176 52 -176 64 -160') + p('tr-t t4', 'M0 -140 C-6 -172 -4 -190 0 -198') + p('tr-t t3', 'M0 -140 C-40 -138 -62 -122 -74 -100') + p('tr-t t3', 'M0 -140 C40 -138 62 -122 74 -100');
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
    if (forma === 'cascada') {
      let h = ''; for (let x = -46; x <= 46; x += 11.5) h += '<path class="tr-hebra" d="M' + x + ' -116 C' + (x + 5) + ' -92 ' + (x - 5) + ' -72 ' + (x + 2) + ' -44"/>';
      return tronco + ci('tr-h', 0, -126, 40) + ci('tr-h', -30, -112, 26) + ci('tr-h', 30, -112, 26) + h;
    }
    return tronco + copa;
  }
  // Árbol de una especie en una etapa: dibujo con la base en (0,0). Si la especie o la etapa no se conocen, se usa el brote (nunca se rompe la pantalla).
  function arbol(especie, etapa) {
    const f = FORMA[especie] || 'redondo';
    const cuerpo = etapa === 'frondoso' ? frondoso(f, especie) : etapa === 'ramas' ? ramas(f) : etapa === 'raiz' ? raiz() : brote();
    return '<g class="arbol esp-' + esc(especie || 'x') + '">' + cuerpo + '</g>';
  }
  function malezaIcono(tipo) {
    const s = d => '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
    if (tipo === 'trebol_gris') return s('<path d="M12 21v-8"/><circle cx="8.5" cy="9" r="3.5"/><circle cx="15.5" cy="9" r="3.5"/><circle cx="12" cy="5.5" r="3.5"/>');
    if (tipo === 'hierba_seca') return s('<path d="M6 21c0-5-1-9-3-13M11 21c0-6 0-10 1-15M16 21c0-5 1-8 4-11M20 21c0-3 1-5 2-6"/>');
    return s('<path d="M4 18C2 9 9 3 20 3c1 9-4 16-14 16z"/><path d="M5 19c4-4 9-8 13-13"/>');
  }

  // ---------- Escena (colinas + árbol + paisaje) ----------
  const COL = { c1: 'M-300 300 C-120 255 40 270 150 290 S 330 268 660 286 L660 420 L-300 420Z', c2: 'M-300 332 C-100 296 60 320 190 322 S 380 300 660 326 L660 420 L-300 420Z', c3: 'M-300 374 C-120 336 80 348 190 344 S 400 336 660 362 L660 420 L-300 420Z' };
  // F931 · I4: gotas de rocío. Se ven hasta `visibles_max` (8) en el pasto; el resto se agrupa en una gota grande «+n». No vencen.
  function gotasHTML(est) {
    const pe = (est.gotas && est.gotas.pendientes) || [], mx = (CAT && CAT.economia && CAT.economia.visibles_max) || 8, ver = pe.slice(0, mx), mas = pe.length - ver.length;
    return ver.map((g) => '<button type="button" class="il-gota s-' + esc(g.casilla) + '" data-id="' + esc(g.id) + '" aria-label="Gota de rocío. Toca para recogerla">' + ic(IC.gota, 24) + '</button>').join('')
      + (mas > 0 ? '<button type="button" class="il-gota il-gota-grupo" data-id="todas" aria-label="Recoger ' + pe.length + ' gotas de rocío">' + ic(IC.gota, 30) + '<b>+' + mas + '</b></button>' : '');
  }
  function gotasTexto(est) { const g = est.gotas || {}, n = (g.pendientes || []).length; return (g.saldo || g.total || n) ? ic(IC.gota, 16) + (g.saldo || 0) + (g.saldo === 1 ? ' gota guardada' : ' gotas guardadas') + (n ? ' · ' + n + ' por recoger' : '') : ''; }
  // F933: el Vivero con contenido visual. Cada semilla y ave tiene su dibujo, hay una vista previa grande de lo que se obtiene y el avance hacia su precio.
  // Todo se anima con transform/opacity y se queda quieto en «reducir movimiento»/Ahorro. Sin atributo style (CSP): los tamaños salen de clases y de atributos SVG.
  let vivAbierto = false, vivMsg = '', vivSel = null, vivTab = 'flores';
  const g = (a, col) => '<g fill="none" stroke="' + (col || '#5c8f63') + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + a + '</g>';
  // F936: cada flor se dibuja en su propia caja (w×h) con la altura real relativa: la lavanda es una mata alta, la pata de guanaco una alfombra baja.
  const DIM = { copihue: [34, 56], ananuca: [30, 44], pata_de_guanaco: [46, 24], lavanda: [28, 56] };
  const pet = (cx, cy, r, col, n) => Array.from({ length: n || 5 }, (_, i) => { const a = (i * 360 / (n || 5)) * Math.PI / 180; return '<circle cx="' + (cx + Math.sin(a) * r * 0.62).toFixed(1) + '" cy="' + (cy - Math.cos(a) * r * 0.62).toFixed(1) + '" r="' + (r * 0.5).toFixed(1) + '" fill="' + col + '"/>'; }).join('');
  const campana = (x, y, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M0 0C-4 2-7 8-8 14Q-4 16 0 14Q4 16 8 14C7 8 4 2 0 0z" fill="#c8264a"/><path d="M0 3C-2 6-3 10-3.4 13Q0 14.2 3.4 13C3 10 2 6 0 3z" fill="#e8627f"/><path d="M-8 14Q-4 16 0 14Q4 16 8 14" fill="none" stroke="#f6d3da" stroke-width="1.1"/><circle cx="-1.6" cy="16.6" r=".8" fill="#f1d36a"/><circle cx="0" cy="17.6" r=".8" fill="#f1d36a"/><circle cx="1.6" cy="16.6" r=".8" fill="#f1d36a"/></g>';
  const trompeta = (a) => '<g transform="rotate(' + a + ' 15 15)"><path d="M14.2 15 11.4 3.6Q15 1 18.6 3.6L15.8 15z" fill="#d93a2b"/><ellipse cx="15" cy="3.6" rx="3.1" ry="1.5" fill="#f4c34a"/><path d="M15 3.4V.4M13.4 3.2 12.4 .8M16.6 3.2 17.6 .8" stroke="#f3e2a0" stroke-width=".7" stroke-linecap="round"/></g>';
  const espiga = (x, y0, n, paso, c1, c2) => Array.from({ length: n }, (_, i) => { const y = y0 + i * paso, k = 1 - Math.max(0, (n - 3 - i)) * 0 , w = i < 2 ? 1.5 : 2.2; return '<ellipse cx="' + (x + (i % 2 ? 1.5 : -1.5)) + '" cy="' + y + '" rx="' + w + '" ry="1.8" fill="' + (i % 2 ? c1 : c2) + '"/>'; }).join('');
  const FLORES = {
    copihue: () => g('<path d="M10 56C13 47 8 41 12 33S18 21 14 6"/><path d="M13 20C19 16 24 17 24 21M12 38C8 36 6 38 6 40"/>', '#6a8f58') + '<g fill="#4f8a55"><ellipse cx="16" cy="44" rx="3.6" ry="1.9" transform="rotate(-30 16 44)"/><ellipse cx="8" cy="30" rx="3.4" ry="1.8" transform="rotate(25 8 30)"/><ellipse cx="17" cy="28" rx="3.4" ry="1.8" transform="rotate(-25 17 28)"/><ellipse cx="11" cy="14" rx="3.2" ry="1.7" transform="rotate(30 11 14)"/><ellipse cx="17" cy="9" rx="3.2" ry="1.7" transform="rotate(-30 17 9)"/></g>' + campana(24, 21, 1) + campana(6, 40, .85),
    ananuca: () => g('<path d="M15 44C10 40 7 36 4 28M15 44C20 40 23 36 26 28M15 44C14 38 13 34 12 30"/>', '#6b9a58') + g('<path d="M15 44V15"/>', '#86a259').replace('1.5', '2.2') + [-56, -22, 12, 46].map(trompeta).join('') + '<circle cx="15" cy="15" r="1.6" fill="#b92a1f"/>',
    pata_de_guanaco: () => '<path d="M23 24C14 24 6 22 1 20c7-3 15-2 22 0 7-2 15-3 22 0-4 2-12 4-22 4z" fill="#86aa80"/><path d="M8 22c4-2 9-2 15-1M38 22c-4-2-9-2-15-1" stroke="#6d9568" stroke-width=".8" fill="none"/>' + g('<path d="M8 20 8 13M15 20 15 8M23 20V5M31 20 31 9M38 20 38 13M12 21 12 17M27 21 27 14M19 21 19 13M34 21 34 18"/>', '#6d9568') + [[8, 12, '#c9429a'], [15, 7, '#d46ab4'], [23, 4, '#c9429a'], [31, 8, '#d46ab4'], [38, 12, '#c9429a'], [12, 16, '#b8328a'], [27, 13, '#d46ab4'], [19, 12, '#b8328a'], [34, 17, '#c9429a']].map((q) => pet(q[0], q[1], 5, q[2]) + '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="1" fill="#f6e08a"/>').join(''),
    lavanda: () => g('<path d="M14 56C10 50 7 46 4 40M14 56C17 50 20 46 24 40M14 56c-1-6-1-11-1-16"/>', '#7a9a78') + g('<path d="M14 56V13M8 56C8 42 6 32 5 20M20 56C20 42 22 33 23 24"/>', '#6f9366') + espiga(14, 3, 8, 3.1, '#a583e3', '#8a63cf') + espiga(5, 10, 5, 2.9, '#a583e3', '#8a63cf') + espiga(23, 13, 5, 2.9, '#a583e3', '#8a63cf')
  };
  const flor = (id, k) => { const d = DIM[id] || [24, 24], s = k || 1; return '<svg viewBox="0 0 ' + d[0] + ' ' + d[1] + '" width="' + Math.round(d[0] * s) + '" height="' + Math.round(d[1] * s) + '" aria-hidden="true" focusable="false">' + (FLORES[id] ? FLORES[id]() : g('<path d="M12 23v-10"/>') + '<circle cx="12" cy="8" r="5" fill="#d98cb3"/>') + '</svg>'; };
  // F936: cada ave es un dibujo distinto, a su tamaño real relativo (w = ancho en px en el paisaje) y con su lugar propio: cielo, rama, suelo o junto a las flores.
  const ojo = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r=".85" fill="#101010"/>';
  const patas = (xs, y0, y1, col) => '<g stroke="' + col + '" stroke-width="1.2" stroke-linecap="round" fill="none">' + xs.map((x) => '<path d="M' + x + ' ' + y0 + 'V' + y1 + 'M' + (x - 2) + ' ' + y1 + 'h4"/>').join('') + '</g>';
  const AVES = {
    golondrina: { vb: [48, 36], w: 34, lugar: 'rama', t: 'Unos 15 cm', dib: () => '<path d="M14 21 0 29l6 .6zM15 23 4 35l7-4z" fill="#1d2f57"/><path d="M12 21C14 14 24 12 32 14c4 1 6 4 5 7-1 3-5 5-10 5-6 0-12-1-15-5z" fill="#243b6b"/><path d="M19 24c4 2.4 11 2.4 15-1-1 3.6-5 5-10 4.4-3-.4-5-1.6-5-3.4z" fill="#efe4cf"/><path d="M22 14C17 8 12 6 5 7c6 4 11 8 19 11z" fill="#17274a"/><circle cx="33" cy="16" r="5" fill="#243b6b"/><path d="M34 18.4c2 2.4 4.8 2.4 6.4.4-.8 2.8-5.8 3.6-6.4-.4zM36.4 12.4c1.5.4 2.7 1.2 3.1 2.5-1.7-.2-2.9-.8-3.1-2.5z" fill="#b8552f"/><path d="M38.4 15.2 43 16.4l-4.6 1z" fill="#1c1c1c"/>' + ojo(35.2, 14.8) + patas([24, 28], 26, 32, '#5b4a44') },
    chucao: { vb: [48, 36], w: 36, lugar: 'suelo', t: 'Unos 19 cm', dib: () => '<path d="M13 20 4 5l5.2-.6L17 17z" fill="#4b3220"/><ellipse cx="22" cy="22" rx="11" ry="9" fill="#5a3d28"/><ellipse cx="21" cy="28" rx="8" ry="4" fill="#9a8c80"/><ellipse cx="28.5" cy="24" rx="6.5" ry="6" fill="#c4662b"/><path d="M14 20C16 14 26 14 30 19c-4 5-12 6-16 1z" fill="#46301f"/><circle cx="33" cy="15" r="6" fill="#5a3d28"/><path d="M29.5 11.2Q34 8.6 39 11.8" fill="none" stroke="#f4f1ea" stroke-width="1.5" stroke-linecap="round"/><path d="M38.6 14.4 44 16.2l-5.4 1.6z" fill="#35302c"/>' + ojo(35.2, 13.8) + patas([22, 27], 31, 35, '#8a6a5a') },
    queltehue: { vb: [44, 48], w: 46, lugar: 'suelo', t: 'Unos 35 cm; de patas largas', dib: () => '<path d="M10 22 1 26l2-6z" fill="#23252b"/><ellipse cx="20" cy="22" rx="12" ry="7" transform="rotate(-6 20 22)" fill="#8e9399"/><ellipse cx="21" cy="26" rx="9" ry="4" fill="#f4f4f1"/><path d="M12 20c6-4 14-3 17 1-5 3-12 4-17-1z" fill="#6d747b"/><path d="M26 19c3 0 5 2 5.4 6-2.2 1-5 .4-7-1z" fill="#23252b"/><path d="M29 18C31 15 32 13 32 11" stroke="#f1f1ee" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="34" cy="11" r="5" fill="#9aa0a6"/><ellipse cx="36" cy="13" rx="3" ry="2.6" fill="#f6f6f2"/><path d="M30.4 8.4Q24 2.6 21.4 4.4 26 5 30 10z" fill="#1c1d22"/><path d="M38.6 11 44 12.6 38.6 14z" fill="#d65a4a"/><path d="M42.2 11.9 44 12.6l-1.8.7z" fill="#222"/>' + ojo(35.4, 10.2) + patas([19, 24], 28, 46, '#cf4f48') },
    picaflor: { vb: [48, 36], w: 25, lugar: 'flor', t: 'Unos 11 cm; el más pequeño', dib: () => '<g class="av-ala"><ellipse cx="20" cy="9.5" rx="11" ry="4" transform="rotate(-38 20 9.5)" fill="#bfe3d4" opacity=".65"/><ellipse cx="25" cy="8" rx="8" ry="3" transform="rotate(-62 25 8)" fill="#9fd0bd" opacity=".5"/></g><g transform="rotate(-14 22 20)"><path d="M12 20 2 14l1 7-1 6z" fill="#1e7a55"/><ellipse cx="22" cy="20" rx="10.5" ry="4.6" fill="#2f9d6e"/><ellipse cx="22" cy="22.2" rx="8" ry="2.4" fill="#c4ebd6"/></g><circle cx="33" cy="18.5" r="4.4" fill="#2f9d6e"/><path d="M29 16.6c.8-3.4 7.2-3.4 8 .2-2-.9-6-.9-8-.2z" fill="#e8541f"/><path d="M37 19.2 47.4 20.8" stroke="#1f1f1f" stroke-width="1" stroke-linecap="round"/>' + ojo(34.4, 17.8) },
    condor: { vb: [120, 44], w: 112, lugar: 'cielo', t: 'Más de 1 m de alto; alas de unos 3,3 m', dib: () => { const ala = '<path d="M58 20C44 14 24 12 4 16l-2 2 3 2-3 3 5 1-2 4 6-.4-1 4C28 30 46 28 58 26z" fill="#1d1d22"/><path d="M40 18C32 16 22 16 11 18c10 2.4 21 4 29 4z" fill="#f1f1ec"/><path d="M4 16 2 18M5 20 2 23M7 24 5 28M11 28 10 32" stroke="#0f0f13" stroke-width=".8"/>'; return ala + '<g transform="translate(120 0) scale(-1 1)">' + ala + '</g><path d="M56.6 30 55.6 42h8.8l-1-12z" fill="#1d1d22"/><ellipse cx="60" cy="24" rx="5.2" ry="8.6" fill="#1d1d22"/><ellipse cx="60" cy="14.4" rx="5.4" ry="2.4" fill="#f4f4f0"/><circle cx="60" cy="10.4" r="3.5" fill="#b0553e"/><path d="M58.6 12.4 60 15.2l1.4-2.8z" fill="#d9d2c0"/><circle cx="58.6" cy="9.8" r=".6" fill="#111"/><circle cx="61.4" cy="9.8" r=".6" fill="#111"/>'; } },
    gorrion: { vb: [48, 36], w: 28, lugar: 'rama', t: 'Unos 15 cm', dib: () => '<path d="M12 22 1 27l1-5 1-2z" fill="#7d5632"/><ellipse cx="22" cy="22" rx="11.5" ry="7.5" fill="#a8794d"/><ellipse cx="24" cy="27" rx="8" ry="3.6" fill="#d4cbbb"/><path d="M12 20C16 14 28 15 31 21c-5 4-14 4-19-1z" fill="#7b4f2b"/><path d="M19 17.6 26 18.4" stroke="#f1ead9" stroke-width="1" stroke-linecap="round"/><circle cx="33" cy="16" r="5.4" fill="#8c8f93"/><path d="M29 14Q32 11.4 36 13 33 13.6 29 16z" fill="#7b3f1d"/><ellipse cx="35.4" cy="17.2" rx="2.6" ry="2" fill="#e6dccb"/><path d="M35 19.4c2 .2 3.2 1 3.4 3-1.6 1-3.4.6-4.4-.8z" fill="#232020"/><path d="M38 15.4 42.6 17 38 18.6z" fill="#4a4038"/>' + ojo(35.8, 14.6) + patas([23, 28], 28, 33, '#a4776a') }
  };
  const TAM = { copihue: 'Enredadera de varios metros; flor de unos 7 cm', ananuca: 'Tallo de unos 35 cm', pata_de_guanaco: 'Alfombra baja, de unos 20 cm', lavanda: 'Mata de unos 60 cm' };
  const LUGAR = { cielo: 'Vuela alto, sobre las montañas', rama: 'Se posa en las ramas', suelo: 'Anda por el suelo, entre el pasto', flor: 'Se queda en el aire, junto a las flores' };
  const ave = (id, w) => { const q = AVES[id] || { vb: [48, 36], w: 30, dib: () => '' }, ww = Math.round(w || q.w); return '<svg viewBox="0 0 ' + q.vb[0] + ' ' + q.vb[1] + '" width="' + ww + '" height="' + Math.round(ww * q.vb[1] / q.vb[0]) + '" aria-hidden="true" focusable="false">' + q.dib() + '</svg>'; };
  const aveG = (id, k) => { const q = AVES[id]; return '<g transform="scale(' + ((q.w * k) / q.vb[0]).toFixed(3) + ')">' + q.dib() + '</g>'; };
  function vivEscena(est) {
    const v = est.vivero || {};
    return (v.plantas || []).map((q) => '<span class="il-planta p-' + esc(q.id) + ' s-' + esc(q.casilla) + '" aria-hidden="true">' + flor(q.id, 0.9) + '</span>').join('')
      + (v.aves || []).slice(0, 2).map((a, i) => '<span class="il-ave n' + (i + 1) + ' a-' + esc(a.id) + ' l-' + esc((AVES[a.id] || {}).lugar || 'rama') + '" aria-hidden="true">' + ave(a.id) + '</span>').join('');
  }
  // Vista previa (320×120): pasto con la flor a su altura real, o el lugar propio del ave (cielo, rama, suelo o junto a una flor).
  function vivVista(tipo, id) {
    const W = 320, H = 120, pasto = '<path d="M0 88c50-16 110-18 170-8 60 10 110 6 150-6v46H0z" fill="#a9cf9b"/><path d="M0 104c60-12 120-8 190 0 50 5 90 2 130-6v22H0z" fill="#86b97a"/>';
    const cielo = (mont) => '<defs><linearGradient id="vvCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (mont ? '#bcdcf0' : '#cfe6f4') + '"/><stop offset="1" stop-color="#eef6e8"/></linearGradient></defs><rect width="' + W + '" height="' + H + '" fill="url(#vvCielo)"/><circle cx="280" cy="24" r="12" fill="#fbe8a6" opacity=".85"/>';
    const abre = '<svg class="il-viv-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Vista previa: así se vería en tu paisaje" focusable="false">';
    if (tipo === 'semilla') {
      const d = DIM[id] || [24, 24], k = id === 'pata_de_guanaco' ? 2 : 1.7, pos = id === 'copihue' ? [[160, 1.15]] : id === 'pata_de_guanaco' ? [[70, 1], [160, 1.2], [252, .95]] : [[70, .95], [160, 1.12], [252, .9]];
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
  function vivPanel(est) {
    const v = est.vivero || { desbloqueados: [], plantas: [], aves: [] }, saldo = (est.gotas && est.gotas.saldo) || 0, tengo = (c) => v.desbloqueados.indexOf(c) >= 0;
    const sem = CAT.orden_semillas || Object.keys(CAT.semillas || {}), aves = Object.keys(CAT.aves || {});
    const plantada = (id) => (v.plantas || []).some((q) => q.id === id), activa = (id) => (v.aves || []).some((a) => a.id === id);
    if (!vivSel || !((vivSel.tipo === 'ave' ? CAT.aves : CAT.semillas) || {})[vivSel.id]) { const p1 = sem.find((i) => !tengo('sem_' + i)); vivSel = p1 ? { tipo: 'semilla', id: p1 } : { tipo: 'semilla', id: sem[0] }; }
    vivTab = vivSel.tipo === 'ave' ? 'aves' : 'flores';
    const tile = (tipo, id) => { const it = (tipo === 'ave' ? CAT.aves : CAT.semillas)[id]; if (!it) return ''; const c = (tipo === 'ave' ? 'ave_' : 'sem_') + id, mio = tengo(c), sel = vivSel.tipo === tipo && vivSel.id === id;
      const est2 = mio ? (tipo === 'ave' ? (activa(id) ? 'Con tu árbol' : 'Tuyo') : (plantada(id) ? 'Plantada' : 'Tuya')) : '';
      const arte = tipo === 'ave' ? ave(id, Math.min(104, Math.round((AVES[id] || { w: 30 }).w * 1.5))) : flor(id, 1.05);
      return '<button type="button" class="il-viv-tile' + (sel ? ' sel' : '') + (mio ? ' mio' : '') + '" role="listitem" data-ac="ver" data-tipo="' + tipo + '" data-id="' + esc(id) + '" aria-pressed="' + sel + '"><span class="il-viv-arte">' + arte + '</span><b>' + esc(it.nombre) + '</b>'
        + (mio ? '<span class="il-viv-chip ok">' + est2 + '</span>' : '<span class="il-viv-chip">' + ic(IC.gota, 13) + it.precio + '</span>') + '</button>'; };
    const it = (vivSel.tipo === 'ave' ? CAT.aves : CAT.semillas)[vivSel.id], c = (vivSel.tipo === 'ave' ? 'ave_' : 'sem_') + vivSel.id, mio = tengo(c), falta = Math.max(0, it.precio - saldo), pct = Math.min(100, Math.round(100 * saldo / it.precio));
    let acc;
    if (!mio) acc = '<div class="il-viv-prog" aria-hidden="true"><svg viewBox="0 0 100 6" preserveAspectRatio="none" width="100%" height="8"><rect width="100" height="6" rx="3" class="pg-f"/><rect width="' + pct + '" height="6" rx="3" class="pg-v"/></svg></div><p class="il-viv-pre">' + (falta ? 'Llevas ' + saldo + ' de ' + it.precio + ' gotas. Faltan ' + falta + '.' : 'Ya tienes las gotas necesarias.') + '</p>'
      + '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="comprar" data-tipo="' + vivSel.tipo + '" data-id="' + esc(vivSel.id) + '"' + (falta ? ' disabled' : '') + '>' + (falta ? 'Aún faltan gotas' : 'Obtener por ' + it.precio + ' gotas') + '</button>';
    else if (vivSel.tipo === 'ave') acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="ave" data-tipo="ave" data-id="' + esc(vivSel.id) + '">' + (activa(vivSel.id) ? 'Guardar el ave' : 'Llamar al árbol') + '</button>';
    else acc = plantada(vivSel.id) ? '<p class="il-viv-ok2">Ya está plantada en tu pasto.</p>' : '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="plantar" data-tipo="semilla" data-id="' + esc(vivSel.id) + '">Plantar en mi pasto</button>';
    const nf = (v.plantas || []).length, na = (v.aves || []).length, esAve = vivSel.tipo === 'ave', rasgo = esAve ? ((AVES[vivSel.id] || {}).t || '') + ' · ' + (LUGAR[(AVES[vivSel.id] || {}).lugar] || '') : (TAM[vivSel.id] || '');
    return '<div class="il-viv-cab"><h3>Vivero</h3><span class="il-viv-saldo">' + ic(IC.gota, 16) + saldo + (saldo === 1 ? ' gota' : ' gotas') + '</span></div>'
      + '<p class="il-viv-ay">Las gotas se ganan leyendo la Palabra y cumpliendo acciones en Vida. No vencen.</p>'
      + '<div class="il-viv-tabs" role="group" aria-label="Tipo de elemento"><button type="button" class="il-viv-tab' + (esAve ? '' : ' on') + '" data-ac="tab" data-id="flores" aria-pressed="' + !esAve + '">Flores (' + sem.length + ')</button><button type="button" class="il-viv-tab' + (esAve ? ' on' : '') + '" data-ac="tab" data-id="aves" aria-pressed="' + esAve + '">Aves (' + aves.length + ')</button></div>'
      + '<div class="il-viv-car" role="list" aria-label="Desliza para ver más">' + (esAve ? aves : sem).map((i) => tile(esAve ? 'ave' : 'semilla', i)).join('') + '</div>'
      + '<div class="il-viv-vista pop" id="ilVivVista">' + vivVista(vivSel.tipo, vivSel.id) + '</div>'
      + '<div class="il-viv-ficha"><h4>' + esc(it.nombre) + '</h4><p class="il-viv-rasgo">' + esc(rasgo) + '</p><p class="il-viv-dato">' + esc(it.dato || '') + '</p><p class="il-viv-frase">' + esc(it.mensaje || '') + '</p>' + acc + '</div>'
      + '<p class="il-viv-jardin">Tu jardín: ' + nf + (nf === 1 ? ' flor' : ' flores') + ' y ' + na + (na === 1 ? ' ave' : ' aves') + ' (hasta 2 aves a la vez).</p>'
      + '<p class="il-viv-est" role="status" aria-live="polite">' + esc(vivMsg) + '</p>';
  }
  const MOT = { 'faltan-gotas': 'Aún faltan gotas para esto.', 'sin-lugar': 'No queda lugar libre en el pasto.', 'maximo': 'Solo pueden estar 2 aves a la vez. Se puede guardar una para llamar a otra.', 'ya-tienes': 'Ya lo tienes.' };
  function ligarViv(cont, mi) {
    const T = window.TBInicio, bt = $('#ilVivBtn', cont), pn = $('#ilViv', cont); if (!bt || !pn) return;
    const pinta = (conservar) => { const car = $('.il-viv-car', pn), sl = car ? car.scrollLeft : 0; pn.innerHTML = vivPanel(T.cargar()); const c2 = $('.il-viv-car', pn); if (c2 && conservar) c2.scrollLeft = sl; };
    const abre = (si) => { vivAbierto = si; pn.hidden = !si; bt.setAttribute('aria-expanded', String(si)); bt.innerHTML = ic(IC.hoja) + (si ? 'Cerrar el vivero' : 'Vivero'); if (si) { pinta(true); if (!quieto()) { pn.classList.remove('entra'); void pn.offsetWidth; pn.classList.add('entra'); } try { pn.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) { /* sin scroll */ } } };
    bt.onclick = () => { vivMsg = ''; abre(pn.hidden); };
    pn.onclick = (ev) => {
      const b = ev.target.closest('[data-ac]'); if (!b || b.disabled) return; const ac = b.getAttribute('data-ac'), tipo = b.getAttribute('data-tipo'), id = b.getAttribute('data-id'); let r;
      if (ac === 'tab') { const e = T.cargar(), v = e.vivero || { desbloqueados: [] }, lista = id === 'aves' ? Object.keys(CAT.aves || {}) : (CAT.orden_semillas || Object.keys(CAT.semillas || {})), pre = id === 'aves' ? 'ave_' : 'sem_', p1 = lista.find((i) => v.desbloqueados.indexOf(pre + i) < 0) || lista[0]; vivSel = { tipo: id === 'aves' ? 'ave' : 'semilla', id: p1 }; vivMsg = ''; pinta(false); sonido('suave'); return; }
      if (ac === 'ver') { vivSel = { tipo, id }; vivMsg = ''; pinta(true); sonido('suave'); try { const s = $('.il-viv-tile.sel', pn); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' }); } catch (e) { /* sin scroll */ } return; }
      if (ac === 'comprar') { r = T.comprar(tipo, id); if (r.ok) vivMsg = 'Listo: ya es tuyo.'; }
      else if (ac === 'plantar') { r = T.plantar(id); if (r.ok) vivMsg = 'Plantada en el pasto.'; }
      else { const act = (T.cargar().vivero.aves || []).some((a) => a.id === id); r = T.activarAve(id, !act); if (r.ok) vivMsg = act ? 'Se guardó el ave.' : 'El ave llegó al árbol.'; }
      if (!r.ok) { vivMsg = MOT[r.motivo] || 'No se pudo.'; pinta(true); return; }
      sonido(ac === 'ave' ? 'suave' : 'semilla'); vivAbierto = true; pintar(cont, mi, { repinta: true });
    };
    if (vivAbierto) abre(true);
  }
  function escena(est) {
    const c = est.ciclo, et = ETAPAS[window.TBInicio ? window.TBInicio.etapa(c.diasCuidado) : 'brote'] ? window.TBInicio.etapa(c.diasCuidado) : 'brote';
    const fondo = (est.paisaje || []).map((q) => { const s = FONDO[q.casilla]; return s ? '<g transform="translate(' + s[0] + ' ' + s[1] + ') scale(' + s[2] + ')">' + arbol(q.especie, 'frondoso') + '</g>' : ''; }).join('');
    const mal = (est.maleza || []).map((m) => '<button type="button" class="il-maleza s-' + esc(m.casilla) + '" data-id="' + esc(m.id) + '" aria-label="Quitar maleza (' + esc(MALEZA[m.tipo] || 'maleza') + '). Toca para limpiarla">' + malezaIcono(m.tipo) + '</button>').join('');
    return '<div class="il-escena' + ((est.maleza || []).length ? ' apagado' : '') + '" id="ilEscena">'
      + '<svg class="il-svg" viewBox="0 110 360 310" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">'
      + '<defs><linearGradient id="ilDeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="dg-a"/><stop offset=".78" class="dg-a"/><stop offset="1" class="dg-b"/></linearGradient>'
      + '<mask id="ilMasc" maskUnits="userSpaceOnUse" x="-300" y="110" width="960" height="310"><rect x="-300" y="110" width="960" height="310" fill="url(#ilDeg)"/></mask></defs><g mask="url(#ilMasc)">'
      + '<g class="cap cap1"><path class="col c1" d="' + COL.c1 + '"/>' + fondo + '</g>'
      + '<g class="cap cap2"><path class="col c2" d="' + COL.c2 + '"/></g>'
      + '<g class="cap cap3"><path class="col c3" d="' + COL.c3 + '"/></g></g>'
      + '<g class="cap cap3"><g class="mundo" transform="translate(180 344)">' + arbol(c.especie, et) + '</g></g></svg>'
      + '<i class="il-anillo" id="ilAnillo" aria-hidden="true"></i>'
      + '<button type="button" class="il-resp" id="ilResp" aria-label="Respirar con tu árbol. Toca para una pausa de unos 30 segundos"></button>' + mal + gotasHTML(est) + vivEscena(est) + '</div>';
  }

  // ---------- Textos ----------
  function estadoTxt(est, r) {
    const c = est.ciclo, e = window.TBInicio.etapa(c.diasCuidado), dia = 'Día ' + c.diasCuidado + ' de 30 · ' + (ETAPAS[e] || 'Brote');
    if (r && r.cicloNuevo) { const s = CAT && CAT.especies && CAT.especies[c.especie]; return 'Empieza un árbol nuevo' + (s ? ': ' + s.nombre : '') + '. El anterior ya forma parte del paisaje.'; }
    if (est.maleza.length) return 'Hay maleza en el pasto. Puedes tocarla para quitarla; así tu árbol sigue creciendo.';
    if (c.cerrado) return 'Día 30 de 30 · Tu árbol está completo. Mañana empieza uno nuevo.';
    if (r && r.diaNuevo) return 'Hoy tu árbol creció un día más. ' + dia;
    return dia;
  }
  function nombreArbol(est) { const s = CAT && CAT.especies && CAT.especies[est.ciclo.especie]; return s ? esc(s.nombre) + (s.otro ? ' <span>· ' + esc(s.otro) + '</span>' : '') : 'Tu árbol'; }

  // ---------- Primera semilla ----------
  function vistaEleccion(cont, mi) {
    if (cont.parentNode && cont.parentNode.classList) cont.parentNode.classList.add('il-eligiendo');
    const ids = (CAT.primera_eleccion || []).filter((i) => CAT.especies && CAT.especies[i]);
    cont.innerHTML = '<div class="il-elige"><h2>Elige el árbol que vas a cuidar</h2>'
      + '<p class="il-elige-sub">Crece un poco cada día que entras. Si faltas un día, no pasa nada: solo espera y sigue después.</p>'
      + '<div class="il-semillas" role="radiogroup" aria-label="Árboles para elegir">' + ids.map((i) => { const s = CAT.especies[i];
        return '<button type="button" class="il-semilla" role="radio" aria-checked="false" data-id="' + esc(i) + '"><svg class="il-mini" viewBox="-72 -215 144 240" aria-hidden="true" focusable="false">' + arbol(i, 'frondoso') + '</svg>'
          + '<span class="il-sem-tx"><b>' + esc(s.nombre) + '</b><em>' + esc(s.otro || '') + '</em><small>' + esc(s.mensaje) + '</small></span></button>'; }).join('') + '</div>'
      + '<button type="button" class="btn il-plantar" id="ilPlantar" disabled>Elige un árbol para continuar</button></div>';
    let sel = '';
    const bots = Array.prototype.slice.call(cont.querySelectorAll('.il-semilla')), pl = $('#ilPlantar', cont);
    bots.forEach((b) => { b.onclick = () => { sel = b.getAttribute('data-id'); bots.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.classList.toggle('on', on); }); pl.disabled = false; pl.textContent = 'Plantar ' + CAT.especies[sel].nombre; sonido('suave'); }; });
    pl.onclick = () => { if (!sel || !window.TBInicio.elegirPrimera(sel)) return; sonido('semilla'); window.TBInicio.visita(); pintar(cont, mi, { plantado: true }); };
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
      + '<button type="button" class="il-btn-msg" id="ilVivBtn" aria-expanded="false" aria-controls="ilViv">' + ic(IC.hoja) + 'Vivero</button></div>'
      + '<div class="il-msg" id="ilMsg" hidden></div><section class="il-viv" id="ilViv" aria-label="Vivero" hidden></section></div>';
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
        if (!x.quedan) { estado.textContent = 'Listo. Tu árbol sigue creciendo. ' + 'Día ' + est.ciclo.diasCuidado + ' de 30'; if (x.diaNuevo) later(() => pintar(cont, mi, { repinta: true, r: { diaNuevo: true } }), quieto() ? 0 : 700); }
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
    const mb = $('#ilMsgBtn', cont), mc = $('#ilMsg', cont);
    const ICM = { arbol: IC.hoja, planeta: IC.mundo, vida: IC.brote }, ETQ = { arbol: 'Del árbol · para admirarlo', planeta: 'Para el planeta · para respetarlo', vida: 'Para crecer · personas y sociedad' };
    const fecha = () => { try { const t = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); } catch (e) { return 'Hoy'; } };
    const pinta = () => {
      const m = T.mensajeActual(0); if (!m || !m.items || !m.items.length) { mc.textContent = 'Este árbol aún no tiene mensajes.'; return; }
      const tarj = m.items.map((x, i) => '<article class="il-mc il-mc-' + x.clave + ' d' + i + '"><header>' + ic(ICM[x.clave] || IC.hoja, 20) + '<span>' + esc(ETQ[x.clave] || x.titulo) + '</span></header>'
        + (x.clave === 'vida' && x.titulo ? '<p class="il-tema">' + esc(x.titulo) + '</p>' : '') + '<p class="il-vida">' + esc(x.texto) + '</p>'
        + (typeof navigator !== 'undefined' && navigator.share ? '<button type="button" class="il-mini" data-i="' + i + '" aria-label="Compartir este mensaje">' + ic(IC.compartir, 16) + 'Compartir</button>' : '') + '</article>').join('');
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

  const api = { montar, soltar, arbol, escena, estadoTxt, ETAPAS, FORMA, FONDO, config(c) { CAT = c; } };
  if (typeof window !== 'undefined') window.TBLienzo = api; if (typeof module !== 'undefined') module.exports = api;
})();
