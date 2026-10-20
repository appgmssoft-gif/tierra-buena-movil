// disenos.js - F1307 · Diseños para compartir (Fase 4, equivalente a las plantillas de estudio y prédica del escritorio).
// Una pantalla con vista previa en vivo: 3 formatos (tarjeta, cuadrada, historia) y 8 estilos; comparte la imagen, la guarda o imprime la hoja con el mismo estilo.
// Sirve para estudios, prédicas y apuntes de prédicas. Todo se dibuja en el teléfono (canvas), sin internet y con las tipografías del sistema.
// CSP: sin atributo style en el HTML (los colores se pasan con setProperty).
'use strict';
(function () {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const App = () => window.TBApp || {};
  const vibra = () => { try { if (App().vibra) App().vibra(); } catch (e) { /* sin vibración */ } };
  const cortar = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

  const TEMAS = [
    { id: 'papel', n: 'Papel', bg: ['#f6efdf', '#eadfc4'], ink: '#2b2218', soft: '#6b5d45', acc: '#3f5d3a', caja: 'rgba(63,93,58,0.09)', deco: 'colinas', col: ['#a9c79f', '#86ad7c', '#5f8a58'], pie: '#f6efdf', serif: true },
    { id: 'tierra', n: 'Tierra Buena', bg: ['#38593d', '#1f3622'], ink: '#f6efdf', soft: '#cfdcc4', acc: '#e0b95a', caja: 'rgba(255,255,255,0.09)', deco: 'colinas', col: ['#4f7650', '#3f6340', '#2f4c30'], pie: '#e9f0df', serif: true },
    { id: 'noche', n: 'Noche', bg: ['#1d2845', '#0d1325'], ink: '#f1ead6', soft: '#aeb6cf', acc: '#e3b857', caja: 'rgba(255,255,255,0.07)', deco: 'estrellas', pie: '#aeb6cf', serif: true },
    { id: 'amanecer', n: 'Amanecer', bg: ['#fde9cc', '#f2b48a'], ink: '#3a2414', soft: '#7a4e2f', acc: '#b5482a', caja: 'rgba(255,255,255,0.38)', deco: 'rayos', pie: '#7a4e2f', serif: true },
    { id: 'cielo', n: 'Cielo', bg: ['#e6f2fc', '#b9d8f2'], ink: '#13304d', soft: '#41607f', acc: '#1f6fb2', caja: 'rgba(255,255,255,0.6)', deco: 'circulos', pie: '#41607f', serif: false },
    { id: 'clasico', n: 'Clásico', bg: ['#fbf6ea', '#f6eed9'], ink: '#2a1b18', soft: '#6a4a42', acc: '#7a2535', caja: 'rgba(122,37,53,0.06)', deco: 'marco', pie: '#6a4a42', serif: true },
    { id: 'minimo', n: 'Minimal', bg: ['#ffffff', '#ffffff'], ink: '#111111', soft: '#6a6a6a', acc: '#111111', caja: 'rgba(0,0,0,0.045)', deco: 'lineas', pie: '#6a6a6a', serif: false },
    { id: 'carbon', n: 'Carbón', bg: ['#2c2d30', '#1a1b1d'], ink: '#f4f1ea', soft: '#a9a79f', acc: '#ff8a3d', caja: 'rgba(255,255,255,0.06)', deco: 'lineas', pie: '#a9a79f', serif: false }
  ];
  const FORMATOS = [['tarjeta', '🗒️', 'Tarjeta', 'Todo el contenido'], ['cuadrada', '⬜', 'Cuadrada', 'Una frase fuerte'], ['historia', '📱', 'Historia', 'Vertical, para estados']];
  const SERIF = 'Georgia, "Times New Roman", serif', SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const fam = (T) => (T.serif ? SERIF : SANS);

  // ---------- Contenido ----------
  const tituloDe = (it, tipo) => (tipo === 'e' ? (it.topic || it.passage) : tipo === 'a' ? it.titulo : (it.title || it.baseText)) || 'Sin título';
  const bloquesCompletos = (it, tipo) => {
    if (tipo === 'a') return [['Notas', it.notas], ['Lo que me llevo', it.llevo], ['Para orar', it.orar]].filter((b) => String(b[1] || '').trim());
    const V = window.TBPredicas && window.TBPredicas._v, out = [];
    if (V && V.pasosDe) V.pasosDe(tipo, it).forEach((s) => s.campos.forEach((c) => { const v = String(it[c.id] || '').trim(); if (v && c.id !== 'series') out.push([s.unico ? s.t : c.et, v]); }));
    return out;
  };
  const contenido = (it, tipo) => {
    const L = { tipoEt: tipo === 'e' ? 'ESTUDIO BÍBLICO' : tipo === 'a' ? 'APUNTES DE PRÉDICA' : 'PRÉDICA', titulo: tituloDe(it, tipo), sub: tipo === 'e' ? it.passage : tipo === 'a' ? it.pasaje : it.baseText, bloques: [], frase: '' };
    if (tipo === 'p') { [['Idea principal', 'centralTruth'], ['Punto I', 'point1'], ['Punto II', 'point2'], ['Punto III', 'point3'], ['Llamado', 'call']].forEach((x) => { if (String(it[x[1]] || '').trim()) L.bloques.push([x[0], cortar(it[x[1]], 190)]); }); L.frase = it.centralTruth || it.call || ''; }
    else if (tipo === 'a') { [['Lo que me llevo', 'llevo'], ['Para orar', 'orar'], ['Notas', 'notas']].forEach((x) => { if (String(it[x[1]] || '').trim()) L.bloques.push([x[0], cortar(it[x[1]], 190)]); }); L.frase = it.llevo || ''; }
    else { bloquesCompletos(it, 'e').forEach((b) => { if (L.bloques.length < 6) L.bloques.push([b[0], cortar(b[1], 190)]); }); L.frase = it.applyAnswers || it.interpretTheology || ''; }
    if (!String(L.frase).trim() && L.bloques.length) L.frase = L.bloques[0][1];
    L.frase = cortar(L.frase, 260); return L;
  };

  // ---------- Dibujo ----------
  const nuevoLienzo = (W, H) => { const c = document.createElement('canvas'); c.width = W; if (H) c.height = H; return c; };
  const envolver = (x, t, font, an) => { x.font = font; const out = []; let ln = ''; String(t || '').replace(/\s+/g, ' ').trim().split(' ').forEach((w) => { if (!w) return; const q = ln ? ln + ' ' + w : w; if (x.measureText(q).width > an && ln) { out.push(ln); ln = w; } else ln = q; }); if (ln) out.push(ln); return out; };
  const cajaR = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const azar = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const letras = (x, v) => { try { x.letterSpacing = v; } catch (e) { /* sin soporte */ } };

  function fondo(x, W, H, T) {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (T.deco === 'colinas') {
      T.col.forEach((col, i) => { const base = H - (130 - i * 38), alto = 70 + i * 6; x.beginPath(); x.moveTo(0, H); x.lineTo(0, base); x.bezierCurveTo(W * 0.25, base - alto * (i % 2 ? 0.2 : 1), W * 0.55, base + alto * (i % 2 ? 1 : 0.1), W, base - alto * 0.3); x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill(); });
    } else if (T.deco === 'estrellas') {
      const r = azar(7); for (let i = 0; i < 80; i++) { x.globalAlpha = 0.25 + r() * 0.6; x.fillStyle = '#fff'; x.beginPath(); x.arc(r() * W, r() * H * 0.55, 1 + r() * 2.4, 0, 6.2832); x.fill(); } x.globalAlpha = 1;
      x.fillStyle = 'rgba(227,184,87,0.9)'; x.beginPath(); x.arc(W - 150, 150, 46, 0, 6.2832); x.fill(); x.fillStyle = T.bg[0]; x.beginPath(); x.arc(W - 130, 138, 40, 0, 6.2832); x.fill();
    } else if (T.deco === 'rayos') {
      x.save(); x.translate(W / 2, -40); for (let i = 0; i < 18; i++) { x.rotate(6.2832 / 36); x.fillStyle = 'rgba(255,255,255,0.16)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(-60, H); x.lineTo(60, H); x.closePath(); x.fill(); } x.restore();
      x.fillStyle = 'rgba(255,214,120,0.75)'; x.beginPath(); x.arc(W / 2, -30, 150, 0, 6.2832); x.fill();
    } else if (T.deco === 'circulos') {
      [[W * 0.9, H * 0.08, 230], [W * 0.05, H * 0.55, 170], [W * 0.85, H * 0.95, 260]].forEach((c) => { x.fillStyle = 'rgba(255,255,255,0.45)'; x.beginPath(); x.arc(c[0], c[1], c[2], 0, 6.2832); x.fill(); });
    } else if (T.deco === 'marco') {
      x.strokeStyle = T.acc; x.lineWidth = 4; x.strokeRect(34, 34, W - 68, H - 68); x.lineWidth = 1.5; x.strokeRect(50, 50, W - 100, H - 100);
      [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]].forEach((p) => { x.fillStyle = T.acc; x.beginPath(); x.arc(p[0], p[1], 9, 0, 6.2832); x.fill(); });
    } else if (T.deco === 'lineas') { x.fillStyle = T.acc; x.fillRect(84, 74, 120, 10); x.globalAlpha = 0.25; x.fillRect(84, H - 110, W - 168, 2); x.globalAlpha = 1; }
  }
  function pie(x, W, H, T) { x.font = '26px ' + SANS; x.fillStyle = T.pie; x.textAlign = 'center'; letras(x, '2px'); x.fillText('HECHO CON TIERRA BUENA', W / 2, H - (T.deco === 'colinas' ? 44 : T.deco === 'marco' ? 78 : 56)); letras(x, '0px'); x.textAlign = 'left'; }
  const etiqueta = (x, t, X, Y, T) => { x.font = 'bold 26px ' + SANS; x.fillStyle = T.acc; letras(x, '4px'); x.fillText(t, X, Y); letras(x, '0px'); };
  const reserva = (T) => (T.deco === 'colinas' ? 250 : T.deco === 'marco' ? 190 : 150);

  function ajustar(x, t, estilo, f, max, min, an, alto, lh) {
    let s = max, ln = []; for (; s >= min; s -= 4) { ln = envolver(x, t, estilo + ' ' + s + 'px ' + f, an); if (ln.length * s * lh <= alto) return { s, ln }; } return { s: min, ln: envolver(x, t, estilo + ' ' + min + 'px ' + f, an).slice(0, Math.max(1, Math.floor(alto / (min * lh)))) };
  }

  function dibujarTarjeta(L, T) {
    const W = 1080, M = 84, c = nuevoLienzo(W), x = c.getContext('2d'), F = fam(T);
    const pasada = (dib) => {
      let y = 160; if (dib) etiqueta(x, L.tipoEt, M, y, T); y += 70;
      envolver(x, L.titulo, 'bold 68px ' + F, W - 2 * M).forEach((s) => { if (dib) { x.font = 'bold 68px ' + F; x.fillStyle = T.ink; x.fillText(s, M, y); } y += 82; });
      if (L.sub) { envolver(x, L.sub, 'italic 38px ' + F, W - 2 * M).forEach((s) => { if (dib) { x.font = 'italic 38px ' + F; x.fillStyle = T.soft; x.fillText(s, M, y); } y += 54; }); }
      y += 22; if (dib) { x.fillStyle = T.acc; x.fillRect(M, y, 110, 6); } y += 56;
      L.bloques.forEach((b) => {
        const ln = envolver(x, b[1], '36px ' + F, W - 2 * M - 70), h = 44 + 18 + ln.length * 52 + 26;
        if (dib) { x.fillStyle = T.caja; cajaR(x, M, y, W - 2 * M, h, 24); x.fill(); x.fillStyle = T.acc; cajaR(x, M, y + 18, 8, h - 36, 4); x.fill(); etiqueta(x, String(b[0]).toUpperCase(), M + 38, y + 50, T); x.font = '36px ' + F; x.fillStyle = T.ink; ln.forEach((s, i) => x.fillText(s, M + 38, y + 44 + 18 + 40 + i * 52)); }
        y += h + 26;
      });
      return y + reserva(T) - 40;
    };
    c.height = pasada(false); fondo(x, W, c.height, T); x.textBaseline = 'alphabetic'; pasada(true); pie(x, W, c.height, T); return c;
  }

  function dibujarFicha(L, T, modo) {
    const W = 1080, H = modo === 'cuadrada' ? 1080 : 1920, M = 90, c = nuevoLienzo(W, H), x = c.getContext('2d'), F = fam(T), an = W - 2 * M;
    fondo(x, W, H, T); x.textBaseline = 'alphabetic'; let y = modo === 'cuadrada' ? 140 : 250; etiqueta(x, L.tipoEt, M, y, T); y += 40;
    const tt = ajustar(x, L.titulo, 'bold', F, modo === 'cuadrada' ? 76 : 92, 44, an, modo === 'cuadrada' ? 270 : 420, 1.16);
    y += tt.s; x.font = 'bold ' + tt.s + 'px ' + F; x.fillStyle = T.ink; tt.ln.forEach((s, i) => { x.fillText(s, M, y + i * tt.s * 1.16); }); y += (tt.ln.length - 1) * tt.s * 1.16 + 24;
    if (L.sub) { const st = envolver(x, L.sub, 'italic 40px ' + F, an).slice(0, 2); x.font = 'italic 40px ' + F; x.fillStyle = T.soft; st.forEach((s, i) => x.fillText(s, M, y + 30 + i * 56)); y += 30 + st.length * 56; }
    y += 30; x.fillStyle = T.acc; x.fillRect(M, y, 110, 6); y += 60;
    const piso = H - reserva(T);
    if (L.frase) {
      const alto = modo === 'cuadrada' ? piso - y : Math.min(520, piso - y - 40), q = ajustar(x, L.frase, 'italic', F, modo === 'cuadrada' ? 64 : 52, 30, an - 20, Math.max(120, alto - 70), 1.36);
      x.globalAlpha = 0.5; x.font = 'bold 170px ' + SERIF; x.fillStyle = T.acc; x.fillText('\u201C', M - 6, y + 90); x.globalAlpha = 1;
      x.font = 'italic ' + q.s + 'px ' + F; x.fillStyle = T.ink; q.ln.forEach((s, i) => x.fillText(s, M + 14, y + 90 + 30 + i * q.s * 1.36)); y += 90 + 30 + q.ln.length * q.s * 1.36 + 10;
    }
    if (modo === 'historia') {
      const bl = L.bloques.filter((b) => b[1] !== L.frase).slice(0, 4);
      for (const b of bl) {
        const ln = envolver(x, cortar(b[1], 110), '38px ' + F, an - 70).slice(0, 3), h = 44 + 18 + ln.length * 52 + 24; if (y + h > piso) break;
        x.fillStyle = T.caja; cajaR(x, M, y, an, h, 24); x.fill(); x.fillStyle = T.acc; cajaR(x, M, y + 18, 8, h - 36, 4); x.fill(); etiqueta(x, String(b[0]).toUpperCase(), M + 38, y + 50, T); x.font = '38px ' + F; x.fillStyle = T.ink; ln.forEach((s, i) => x.fillText(s, M + 38, y + 44 + 18 + 40 + i * 52)); y += h + 22;
      }
    }
    pie(x, W, H, T); return c;
  }
  const dibujar = (L, T, fmt) => (fmt === 'tarjeta' ? dibujarTarjeta(L, T) : dibujarFicha(L, T, fmt));

  // ---------- Impresión con el mismo estilo ----------
  function imprimir(it, tipo, T) {
    let c = document.getElementById('ppPrint'); if (c) c.remove(); c = document.createElement('div'); c.id = 'ppPrint'; c.className = 'pd';
    c.style.setProperty('--pd-bg', T.bg[0]); c.style.setProperty('--pd-ink', T.ink); c.style.setProperty('--pd-soft', T.soft); c.style.setProperty('--pd-acc', T.acc); c.style.setProperty('--pd-caja', T.caja); c.style.setProperty('--pd-fam', fam(T));
    const L = contenido(it, tipo);
    c.innerHTML = '<p class="pd-tag">' + esc(L.tipoEt) + '</p><h1>' + esc(L.titulo) + '</h1>' + (L.sub ? '<p class="pp-pr-sub">' + esc(L.sub) + '</p>' : '') + bloquesCompletos(it, tipo).map((b) => '<h2>' + esc(b[0]) + '</h2><p>' + esc(b[1]).replace(/\n/g, '<br>') + '</p>').join('') + '<p class="pp-pr-pie">Hecho con Tierra Buena</p>';
    document.body.appendChild(c); const fin = () => { c.remove(); window.removeEventListener('afterprint', fin); }; window.addEventListener('afterprint', fin);
    try { window.print(); } catch (e) { fin(); return false; } return true;
  }

  // ---------- Pantalla ----------
  const guardado = () => { try { const v = JSON.parse(localStorage.getItem('tb_pp_diseno') || '{}'); return { tema: TEMAS.some((t) => t.id === v.tema) ? v.tema : 'papel', fmt: FORMATOS.some((f) => f[0] === v.fmt) ? v.fmt : 'tarjeta' }; } catch (e) { return { tema: 'papel', fmt: 'tarjeta' }; } };
  const tam = () => { try { const n = Number(localStorage.getItem('tb_pp_tam')); return n >= 0 && n <= 3 ? n : 1; } catch (e) { return 1; } };

  function abrir(tipo, it, volver) {
    const p = $('#pantalla'); if (!p) return; const L = contenido(it, tipo), sel = guardado(); let cv = null;
    p.innerHTML = '<div class="pp pd-pant pp-tam' + tam() + '"><button type="button" class="volver" id="pdAtras">‹ Volver</button><h1 class="pp-h">🎨 Diseñar y compartir</h1><p class="pp-guia">Elige cómo se ve y compártelo. Se arma en tu teléfono.</p>' +
      '<div class="pd-prev" id="pdPrev"><canvas id="pdC" class="pd-canvas" aria-label="Vista previa del diseño"></canvas></div>' +
      '<h2 class="pp-sub">Formato</h2><div class="pd-fmts" id="pdFmts" role="group" aria-label="Formato"></div>' +
      '<h2 class="pp-sub">Estilo</h2><div class="pd-temas" id="pdTemas" role="group" aria-label="Estilo"></div><p class="pd-nom suave" id="pdNom"></p>' +
      '<div class="pd-acc"><button type="button" class="btn" id="pdComp">Compartir imagen</button><button type="button" class="btn sec" id="pdGuardar">Guardar en el teléfono</button><button type="button" class="btn sec" id="pdPdf">Imprimir o guardar como PDF con este estilo</button></div><p id="pdMsg" class="suave pp-nota" role="status"></p></div>';
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    $('#pdAtras').onclick = () => { if (typeof volver === 'function') volver(); else if (window.TBPredicas && window.TBPredicas.abrir) window.TBPredicas.abrir(); };
    const msg = (t) => { const m = $('#pdMsg'); if (m) m.textContent = t; };
    const T = () => TEMAS.find((t) => t.id === sel.tema) || TEMAS[0];
    const pintarOpc = () => {
      const f = $('#pdFmts'), t = $('#pdTemas'); if (!f || !t) return;
      f.innerHTML = FORMATOS.map((o) => '<button type="button" class="pd-fmt' + (sel.fmt === o[0] ? ' on' : '') + '" data-f="' + o[0] + '" aria-pressed="' + (sel.fmt === o[0]) + '"><span aria-hidden="true">' + o[1] + '</span><b>' + esc(o[2]) + '</b><small>' + esc(o[3]) + '</small></button>').join('');
      t.innerHTML = TEMAS.map((o) => '<button type="button" class="pd-tema' + (sel.tema === o.id ? ' on' : '') + '" data-t="' + o.id + '" aria-pressed="' + (sel.tema === o.id) + '" aria-label="Estilo ' + esc(o.n) + '"><i class="pd-sw" data-a="' + o.bg[0] + '" data-b="' + o.bg[1] + '" data-c="' + o.acc + '"></i><span>' + esc(o.n) + '</span></button>').join('');
      t.querySelectorAll('.pd-sw').forEach((s) => { s.style.setProperty('--a', s.dataset.a); s.style.setProperty('--b', s.dataset.b); s.style.setProperty('--c', s.dataset.c); });
      f.querySelectorAll('.pd-fmt').forEach((b) => { b.onclick = () => { vibra(); sel.fmt = b.dataset.f; redibujar(); }; });
      t.querySelectorAll('.pd-tema').forEach((b) => { b.onclick = () => { vibra(); sel.tema = b.dataset.t; redibujar(); }; });
      const n = $('#pdNom'); if (n) n.textContent = T().n + ' · ' + (FORMATOS.find((o) => o[0] === sel.fmt) || FORMATOS[0])[2];
    };
    const redibujar = () => {
      try { localStorage.setItem('tb_pp_diseno', JSON.stringify(sel)); } catch (e) { /* nada */ }
      pintarOpc(); const dst = $('#pdC'); if (!dst) return;
      try { cv = dibujar(L, T(), sel.fmt); dst.width = cv.width; dst.height = cv.height; dst.getContext('2d').drawImage(cv, 0, 0); msg(''); } catch (e) { cv = null; msg('No pude dibujar el diseño en este teléfono.'); }
    };
    redibujar();
    const blob = () => new Promise((ok) => { try { if (!cv) { ok(null); return; } cv.toBlob((b) => ok(b), 'image/png'); } catch (e) { ok(null); } });
    $('#pdComp').onclick = async () => {
      vibra(); msg('Preparando la imagen…'); const b = await blob(); if (!b) { msg('No se pudo crear la imagen.'); return; }
      const f = new File([b], 'tierra-buena-' + sel.tema + '.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: L.titulo }); msg(''); return; } } catch (e) { if (e && e.name === 'AbortError') { msg(''); return; } }
      msg('Este teléfono no deja compartir imágenes desde aquí: usa «Guardar en el teléfono».');
    };
    $('#pdGuardar').onclick = async () => {
      vibra(); const b = await blob(); if (!b) { msg('No se pudo crear la imagen.'); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'tierra-buena-' + sel.tema + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); msg('Imagen guardada en tus descargas.');
    };
    $('#pdPdf').onclick = () => { vibra(); if (!imprimir(it, tipo, T())) msg('No se pudo abrir la impresión desde aquí.'); };
  }

  const api = { abrir, _t: { TEMAS, contenido, dibujar, bloquesCompletos } };
  if (typeof window !== 'undefined') window.TBDisenos = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
