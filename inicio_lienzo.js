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
  let vivAbierto = false, vivMsg = '', vivSel = null;
  const g = (a) => '<g fill="none" stroke="#5c8f63" stroke-width="1.6" stroke-linecap="round">' + a + '</g>';
  const FLORES = {
    copihue: () => g('<path d="M19 2C14 3 12 5 12 9"/><path d="M12 6c-3 0-5-1-6-3"/>') + '<path d="M12 9c-3.4 0-5.4 3.2-6.4 7 2 1.3 3.6-.6 6.4-.6s4.4 1.9 6.4.6C17.4 12.2 15.4 9 12 9z" fill="#d6335a"/><path d="M12 10.5c-1.6 0-2.6 2-3.2 4 1-.6 2-.7 3.2-.7s2.2.1 3.2.7c-.6-2-1.6-4-3.2-4z" fill="#ef7f98"/><circle cx="12" cy="17" r="1" fill="#f6e08a"/>',
    ananuca: () => g('<path d="M12 23V11"/><path d="M12 20c-3-1-5-3-5-6M12 18c3-1 5-3 5-6"/>') + [0, 60, 120, 180, 240, 300].map((a) => '<ellipse cx="12" cy="5.2" rx="1.9" ry="4.2" transform="rotate(' + a + ' 12 9)" fill="#e2563a"/>').join('') + '<circle cx="12" cy="9" r="1.7" fill="#f6c86a"/>',
    pata_de_guanaco: () => g('<path d="M12 23v-7"/><path d="M12 21c-3 0-5-1-6-3M12 20c3 0 5-1 6-3"/>') + [[12, 6], [17, 10], [15, 15], [9, 15], [7, 10]].map((q) => '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="3.6" fill="#c783c9"/>').join('') + '<circle cx="12" cy="11" r="3.2" fill="#f6e08a"/><circle cx="12" cy="11" r="1.3" fill="#e0a73f"/>',
    lavanda: () => g('<path d="M12 23V8M7 23C7 16 6 12 5 8M17 23c0-7 1-11 2-15"/>') + [[12, 4], [12, 7.5], [12, 11], [5, 5.5], [5, 9], [19, 5.5], [19, 9]].map((q) => '<ellipse cx="' + q[0] + '" cy="' + q[1] + '" rx="2" ry="1.6" fill="#8a6ad1"/>').join('') + '<ellipse cx="12" cy="1.8" rx="1.3" ry="1.5" fill="#a58be0"/>'
  };
  const flor = (id, n) => '<svg viewBox="0 0 24 24" width="' + (n || 32) + '" height="' + (n || 32) + '" aria-hidden="true" focusable="false">' + (FLORES[id] ? FLORES[id]() : g('<path d="M12 23v-10"/>') + '<circle cx="12" cy="8" r="5" fill="#d98cb3"/>') + '</svg>';
  const AVES = { // c cuerpo, v pecho, a ala, p pico, l largo del pico, t cola (n normal, h horquilla, u parada), x detalle extra
    golondrina: { c: '#2c3e5e', v: '#f1efe6', a: '#1f2d47', p: '#222', l: 2, t: 'h' },
    chucao: { c: '#7a5233', v: '#c0652b', a: '#5e3d25', p: '#3a3a3a', l: 3, t: 'u' },
    queltehue: { c: '#8f99a5', v: '#f4f4f0', a: '#5b6672', p: '#d98a2b', l: 3.4, t: 'n', x: '<path d="M21.5 12.5c1.5 1.8 3.5 1.8 5 0-.6 3-4.4 3-5 0z" fill="#26262c"/>' },
    picaflor: { c: '#2fb58a', v: '#c9f0dd', a: '#1f8a68', p: '#222', l: 6.5, t: 'n', x: '<circle cx="24.6" cy="11.2" r="1.1" fill="#d6335a"/>' },
    condor: { c: '#2a2a31', v: '#2a2a31', a: '#17171c', p: '#cfc9b9', l: 3.2, t: 'n', x: '<path d="M20 11.5c2 2.2 5 2.2 7 0-1 3.4-6 3.4-7 0z" fill="#f2f2ee"/>', cab: '#b4533c', gr: 1.25 },
    gorrion: { c: '#a8794d', v: '#cfc7ba', a: '#7d5632', p: '#4a4038', l: 2.4, t: 'n', x: '<path d="M22 12c1.2 1.6 3 1.6 4 0-.5 2.6-3.5 2.6-4 0z" fill="#2e2a28"/>' }
  };
  const ave = (id, n) => { const q = AVES[id] || { c: '#555', v: '#ddd', a: '#333', p: '#333', l: 3, t: 'n' }, cola = q.t === 'h' ? '<path d="M9 12 0 6.5l4.2 5.5L0 18z"/>' : q.t === 'u' ? '<path d="M9.5 13 4 4l4.2 1.2 4.3 6.8z"/>' : '<path d="M9 12 1 9.2l1.2 6z"/>', gr = q.gr || 1;
    return '<svg viewBox="0 0 32 24" width="' + Math.round((n || 34) * gr) + '" height="' + Math.round((n || 34) * 0.75 * gr) + '" aria-hidden="true" focusable="false"><g fill="' + q.c + '">' + cola + '<ellipse cx="16" cy="13.5" rx="8.5" ry="5"/></g>'
      + '<ellipse cx="16.5" cy="15.8" rx="6.2" ry="2.7" fill="' + q.v + '"/><path d="M11.5 12.5C13.5 5 20 2.6 26 4c-3 3.4-5 8-9.5 11z" fill="' + q.a + '"/>'
      + '<circle cx="24.5" cy="10" r="3.6" fill="' + (q.cab || q.c) + '"/>' + (q.x || '') + '<path d="M27.6 9.2 ' + (27.6 + q.l) + ' 10.3 27.6 11.4z" fill="' + q.p + '"/><circle cx="25.5" cy="9.3" r=".75" fill="#101010"/></svg>'; };
  function vivEscena(est) {
    const v = est.vivero || {};
    return (v.plantas || []).map((q) => '<span class="il-planta s-' + esc(q.casilla) + '" aria-hidden="true">' + flor(q.id) + '</span>').join('')
      + (v.aves || []).slice(0, 2).map((a, i) => '<span class="il-ave n' + (i + 1) + '" aria-hidden="true">' + ave(a.id) + '</span>').join('');
  }
  // Vista previa: una pequeña escena de pasto (con la semilla plantada tres veces) o de rama (con el ave posada y volando).
  function vivVista(tipo, id) {
    const cielo = '<defs><linearGradient id="vvCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f4"/><stop offset="1" stop-color="#eef6e8"/></linearGradient></defs><rect width="320" height="150" fill="url(#vvCielo)"/><circle cx="276" cy="30" r="14" fill="#fbe8a6" opacity=".85"/>'
      + '<path d="M0 104c50-26 110-30 170-14 60 14 110 8 150-8v68H0z" fill="#a9cf9b"/><path d="M0 122c60-16 120-12 190-2 50 6 90 2 130-8v38H0z" fill="#86b97a"/>';
    if (tipo === 'semilla') return '<svg class="il-viv-svg" viewBox="0 0 320 150" role="img" aria-label="Vista previa: así se vería en tu pasto" focusable="false">' + cielo
      + [[64, 138, 2.6], [160, 142, 3.4], [256, 138, 2.6]].map((q, i) => '<g transform="translate(' + (q[0] - 12 * q[2]) + ' ' + (q[1] - 23 * q[2]) + ') scale(' + q[2] + ')" class="vv-sway vv-d' + i + '">' + (FLORES[id] ? FLORES[id]() : '') + '</g>').join('') + '</svg>';
    return '<svg class="il-viv-svg" viewBox="0 0 320 150" role="img" aria-label="Vista previa: así se vería junto a tu árbol" focusable="false">' + cielo
      + '<path d="M-10 92C60 84 120 80 190 70" fill="none" stroke="#7a5a3c" stroke-width="7" stroke-linecap="round"/><path d="M90 84c-10-14-26-18-40-16 8 10 22 18 40 16zM140 78c8-16 24-24 40-24-4 14-18 24-40 24z" fill="#5f9a62"/>'
      + '<g class="vv-posa" transform="translate(196 38) scale(2.6)">' + ave(id, 32).replace(/<svg[^>]*>/, '<g>').replace('</svg>', '</g>') + '</g>'
      + '<g class="vv-vuela" transform="translate(40 24) scale(1.3)">' + ave(id, 32).replace(/<svg[^>]*>/, '<g>').replace('</svg>', '</g>') + '</g></svg>';
  }
  function vivPanel(est) {
    const v = est.vivero || { desbloqueados: [], plantas: [], aves: [] }, saldo = (est.gotas && est.gotas.saldo) || 0, tengo = (c) => v.desbloqueados.indexOf(c) >= 0;
    const sem = CAT.orden_semillas || Object.keys(CAT.semillas || {}), aves = Object.keys(CAT.aves || {});
    const plantada = (id) => (v.plantas || []).some((q) => q.id === id), activa = (id) => (v.aves || []).some((a) => a.id === id);
    if (!vivSel || !((vivSel.tipo === 'ave' ? CAT.aves : CAT.semillas) || {})[vivSel.id]) { const p1 = sem.find((i) => !tengo('sem_' + i)); vivSel = p1 ? { tipo: 'semilla', id: p1 } : { tipo: 'semilla', id: sem[0] }; }
    const tile = (tipo, id) => { const it = (tipo === 'ave' ? CAT.aves : CAT.semillas)[id]; if (!it) return ''; const c = (tipo === 'ave' ? 'ave_' : 'sem_') + id, mio = tengo(c), sel = vivSel.tipo === tipo && vivSel.id === id;
      const est2 = mio ? (tipo === 'ave' ? (activa(id) ? 'Con tu árbol' : 'Tuyo') : (plantada(id) ? 'Plantada' : 'Tuya')) : '';
      return '<button type="button" class="il-viv-tile' + (sel ? ' sel' : '') + (mio ? ' mio' : '') + '" data-ac="ver" data-tipo="' + tipo + '" data-id="' + esc(id) + '" aria-pressed="' + sel + '"><span class="il-viv-arte">' + (tipo === 'ave' ? ave(id, 40) : flor(id, 42)) + '</span><b>' + esc(it.nombre) + '</b>'
        + (mio ? '<span class="il-viv-chip ok">' + est2 + '</span>' : '<span class="il-viv-chip">' + ic(IC.gota, 13) + it.precio + '</span>') + '</button>'; };
    const it = (vivSel.tipo === 'ave' ? CAT.aves : CAT.semillas)[vivSel.id], c = (vivSel.tipo === 'ave' ? 'ave_' : 'sem_') + vivSel.id, mio = tengo(c), falta = Math.max(0, it.precio - saldo), pct = Math.min(100, Math.round(100 * saldo / it.precio));
    let acc;
    if (!mio) acc = '<div class="il-viv-prog" aria-hidden="true"><svg viewBox="0 0 100 6" preserveAspectRatio="none" width="100%" height="8"><rect width="100" height="6" rx="3" class="pg-f"/><rect width="' + pct + '" height="6" rx="3" class="pg-v"/></svg></div><p class="il-viv-pre">' + (falta ? 'Llevas ' + saldo + ' de ' + it.precio + ' gotas. Faltan ' + falta + '.' : 'Ya tienes las gotas necesarias.') + '</p>'
      + '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="comprar" data-tipo="' + vivSel.tipo + '" data-id="' + esc(vivSel.id) + '"' + (falta ? ' disabled' : '') + '>' + (falta ? 'Aún faltan gotas' : 'Obtener por ' + it.precio + ' gotas') + '</button>';
    else if (vivSel.tipo === 'ave') acc = '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="ave" data-tipo="ave" data-id="' + esc(vivSel.id) + '">' + (activa(vivSel.id) ? 'Guardar el ave' : 'Llamar al árbol') + '</button>';
    else acc = plantada(vivSel.id) ? '<p class="il-viv-ok2">Ya está plantada en tu pasto.</p>' : '<button type="button" class="btn il-viv-bt il-viv-main" data-ac="plantar" data-tipo="semilla" data-id="' + esc(vivSel.id) + '">Plantar en mi pasto</button>';
    const nf = (v.plantas || []).length, na = (v.aves || []).length;
    return '<div class="il-viv-cab"><h3>Vivero</h3><span class="il-viv-saldo">' + ic(IC.gota, 16) + saldo + (saldo === 1 ? ' gota' : ' gotas') + '</span></div>'
      + '<p class="il-viv-ay">Las gotas se ganan leyendo la Palabra y cumpliendo acciones en Vida. No vencen. Toca una opción para verla antes de elegirla.</p>'
      + '<div class="il-viv-vista pop" id="ilVivVista">' + vivVista(vivSel.tipo, vivSel.id) + '</div>'
      + '<div class="il-viv-ficha"><h4>' + esc(it.nombre) + '</h4><p class="il-viv-dato">' + esc(it.dato || '') + '</p><p class="il-viv-frase">' + esc(it.mensaje || '') + '</p>' + acc + '</div>'
      + '<h4 class="il-viv-tit">Flores y semillas</h4><div class="il-viv-grid">' + sem.map((i) => tile('semilla', i)).join('') + '</div>'
      + '<h4 class="il-viv-tit">Aves</h4><div class="il-viv-grid">' + aves.map((i) => tile('ave', i)).join('') + '</div>'
      + '<p class="il-viv-jardin">Tu jardín: ' + nf + (nf === 1 ? ' flor' : ' flores') + ' y ' + na + (na === 1 ? ' ave' : ' aves') + ' (pueden acompañar al árbol hasta 2 a la vez).</p>'
      + '<p class="il-viv-est" role="status" aria-live="polite">' + esc(vivMsg) + '</p>';
  }
  const MOT = { 'faltan-gotas': 'Aún faltan gotas para esto.', 'sin-lugar': 'No queda lugar libre en el pasto.', 'maximo': 'Solo pueden estar 2 aves a la vez. Se puede guardar una para llamar a otra.', 'ya-tienes': 'Ya lo tienes.' };
  function ligarViv(cont, mi) {
    const T = window.TBInicio, bt = $('#ilVivBtn', cont), pn = $('#ilViv', cont); if (!bt || !pn) return;
    const pinta = () => { pn.innerHTML = vivPanel(T.cargar()); };
    const abre = (si) => { vivAbierto = si; pn.hidden = !si; bt.setAttribute('aria-expanded', String(si)); bt.innerHTML = ic(IC.hoja) + (si ? 'Cerrar el vivero' : 'Vivero'); if (si) { pinta(); if (!quieto()) { pn.classList.remove('entra'); void pn.offsetWidth; pn.classList.add('entra'); } try { pn.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { /* sin scroll */ } } };
    bt.onclick = () => { vivMsg = ''; abre(pn.hidden); };
    pn.onclick = (ev) => {
      const b = ev.target.closest('[data-ac]'); if (!b || b.disabled) return; const ac = b.getAttribute('data-ac'), tipo = b.getAttribute('data-tipo'), id = b.getAttribute('data-id'); let r;
      if (ac === 'ver') { vivSel = { tipo, id }; vivMsg = ''; pinta(); sonido('suave'); return; }
      if (ac === 'comprar') { r = T.comprar(tipo, id); if (r.ok) vivMsg = 'Listo: ya es tuyo.'; }
      else if (ac === 'plantar') { r = T.plantar(id); if (r.ok) vivMsg = 'Plantada en el pasto.'; }
      else { const act = (T.cargar().vivero.aves || []).some((a) => a.id === id); r = T.activarAve(id, !act); if (r.ok) vivMsg = act ? 'Se guardó el ave.' : 'El ave llegó al árbol.'; }
      if (!r.ok) { vivMsg = MOT[r.motivo] || 'No se pudo.'; pinta(); return; }
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
