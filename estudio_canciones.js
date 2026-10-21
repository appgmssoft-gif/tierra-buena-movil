/* F1320 · Estudio de canciones (móvil): elige una canción, mira sus estrofas como diapositivas
   con fondo y letra, y guarda cada estrofa como imagen. Las canciones de ejemplo son letras originales. */
(function () {
  const K = 'tb_estudio_canciones';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vibra = () => { try { if (window.TBApp && window.TBApp.vibra) window.TBApp.vibra(); } catch (e) { /* sin vibración */ } };
  const PALETAS = [
    { n: 'Cielo', f: '#1f3a5f', t: '#ffffff' },
    { n: 'Arena', f: '#f3e9d2', t: '#3b2f22' },
    { n: 'Bosque', f: '#24412f', t: '#f4f1e6' },
    { n: 'Atardecer', f: '#7a3b2e', t: '#fff3e6' },
    { n: 'Noche', f: '#15151d', t: '#f5f5f5' }
  ];
  const SEGS = [4, 6, 8];
  let ejemplos = null;
  let timer = null;
  let grab = null;   // grabación de video en curso (se descarta si se sale de la pantalla)
  let estado = null;

  function leer() {
    try { const d = JSON.parse(localStorage.getItem(K)); return Object.assign({ propias: [], paleta: 0, seg: 6 }, d || {}); }
    catch (e) { return { propias: [], paleta: 0, seg: 6 }; }
  }
  function guardar(d) { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) { /* sin espacio: sigue funcionando */ } }
  async function cargarEjemplos() {
    if (ejemplos) return ejemplos;
    try {
      const r = await fetch('datos/canciones_ejemplo.json');
      const j = await r.json();
      ejemplos = (j.biblioteca || []).map((c) => Object.assign({}, c, { ejemplo: true }));
    } catch (e) { ejemplos = []; }
    return ejemplos;
  }
  // Cada estrofa es un bloque separado por línea en blanco.
  function estrofas(letra) {
    return String(letra || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }
  // Nombre de archivo sin tildes ni símbolos: «Canción Nº 1» → «cancion-n-1».
  function slug(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cancion'; }
  function cancelarGrab() {
    if (!grab) return;
    grab.descartar = true;
    try { clearTimeout(grab.t); clearInterval(grab.tick); if (grab.rec && grab.rec.state !== 'inactive') grab.rec.stop(); } catch (e) { /* nada */ }
    grab = null;
  }
  function parar() { if (timer) { clearInterval(timer); timer = null; } cancelarGrab(); }
  function pantalla(html) {
    parar();
    const p = $('#pantalla'); if (!p) return;
    p.innerHTML = html;
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  }
  // Cada pantalla vuelve un nivel: canción → lista de canciones → Crear.
  let atrasFn = null;
  function volverA(txt, fn) { atrasFn = fn; return '<button type="button" class="volver" id="ecVCanciones">‹ ' + txt + '</button>'; }
  function enlazarVolver() { const b = $('#ecVCanciones'); if (b) b.onclick = () => { parar(); if (atrasFn) atrasFn(); }; }

  async function lista() {
    const d = leer();
    const ex = await cargarEjemplos();
    const fila = (c) => '<button type="button" class="ec-item" data-id="' + esc(c.id) + '" data-ej="' + (c.ejemplo ? 1 : 0) + '"><b>' + esc(c.titulo) + '</b><small>' + estrofas(c.letra).length + ' estrofas</small></button>';
    pantalla(volverA('Crear', () => { if (window.TBEstudioCreativo) window.TBEstudioCreativo.abrir(); }) +
      '<h1 class="ec-h">🎵 Estudio de canciones</h1>' +
      '<p class="ec-guia">Elige una canción y mira sus estrofas como diapositivas. Puedes guardar cada una como imagen para tu iglesia.</p>' +
      '<button type="button" class="ec-cat" id="ecNueva"><span class="ec-ci" aria-hidden="true">➕</span><b>Nueva canción</b><small>Escribe el título y la letra</small></button>' +
      (d.propias.length ? '<h2 class="ec-sub">Mis canciones</h2><div class="ec-lista">' + d.propias.map(fila).join('') + '</div>' : '') +
      (ex.length ? '<h2 class="ec-sub">Ejemplos para ver cómo queda</h2><div class="ec-lista">' + ex.map(fila).join('') + '</div>' : '<p class="ec-aviso-txt" role="status">Los ejemplos no se pudieron cargar. Conéctate a internet una vez y vuelve a intentar.</p>'));
    enlazarVolver();
    $('#ecNueva').onclick = () => { vibra(); formulario(null); };
    document.querySelectorAll('.ec-item[data-id]').forEach((b) => {
      b.onclick = () => {
        vibra();
        const c = b.dataset.ej === '1' ? ex.find((x) => x.id === b.dataset.id) : leer().propias.find((x) => x.id === b.dataset.id);
        if (c) detalle(c);
      };
    });
  }

  function detalle(c) {
    const n = estrofas(c.letra).length;
    pantalla(volverA('Canciones', lista) +
      '<h1 class="ec-h">' + esc(c.titulo) + '</h1>' +
      '<p class="ec-guia">' + n + ' estrofas. ' + (c.ejemplo ? 'Es un ejemplo; puedes verla y guardarla, pero no cambiarla.' : 'Tu canción.') + '</p>' +
      '<pre class="ec-letra">' + esc(c.letra) + '</pre>' +
      '<div class="ec-cats">' +
      '<button type="button" class="ec-cat" id="ecVideo"><span class="ec-ci" aria-hidden="true">🎬</span><b>Crear video</b><small>Un video con las estrofas y su tiempo</small></button>' +
      '<button type="button" class="ec-cat" id="ecVer"><span class="ec-ci" aria-hidden="true">▶️</span><b>Ver como diapositivas</b><small>Pasa las estrofas sola o a tu ritmo</small></button>' +
      '<button type="button" class="ec-cat" id="ecGuardar"><span class="ec-ci" aria-hidden="true">🖼️</span><b>Guardar estrofas como imagen</b><small>Una imagen por estrofa</small></button>' +
      (c.ejemplo ? '' :
        '<button type="button" class="ec-cat" id="ecEditar"><span class="ec-ci" aria-hidden="true">✏️</span><b>Editar</b><small>Cambiar título o letra</small></button>' +
        '<button type="button" class="ec-cat" id="ecQuitar"><span class="ec-ci" aria-hidden="true">🗑️</span><b>Quitar</b><small>Sacarla de mis canciones</small></button>' +
      '</div>'));
    enlazarVolver();
    $('#ecVer').onclick = () => { vibra(); presentar(c, 0); };
    $('#ecVideo').onclick = () => { vibra(); videoConfig(c); };
    $('#ecGuardar').onclick = () => { vibra(); exportar(c); };
    const ed = $('#ecEditar'); if (ed) ed.onclick = () => { vibra(); formulario(c); };
    const qu = $('#ecQuitar');
    if (qu) qu.onclick = () => {
      if (!confirm('¿Quitar «' + c.titulo + '» de tus canciones?')) return;
      const d = leer(); d.propias = d.propias.filter((x) => x.id !== c.id); guardar(d); lista();
    };
  }

  function formulario(c) {
    const edit = !!c;
    pantalla(volverA('Canciones', lista) +
      '<h1 class="ec-h">' + (edit ? 'Editar canción' : 'Nueva canción') + '</h1>' +
      '<p class="ec-guia">Solo el título es obligatorio. Separa cada estrofa y cada coro con una línea en blanco.</p>' +
      '<label class="ec-campo">Título<input id="ecTit" class="ea-input" maxlength="120" value="' + esc(c ? c.titulo : '') + '" placeholder="Título de la canción"></label>' +
      '<label class="ec-campo">Letra<textarea id="ecLet" class="ea-input" rows="10" placeholder="Verso 1&#10;Primera línea...&#10;&#10;Coro&#10;...">' + esc(c ? c.letra : '') + '</textarea></label>' +
      '<p class="ec-aviso-txt" id="ecErr" role="alert" hidden>Escribe un título para la canción.</p>' +
      '<button type="button" class="ec-cat" id="ecOk"><span class="ec-ci" aria-hidden="true">💾</span><b>Guardar canción</b><small>Queda en tu teléfono</small></button>');
    enlazarVolver();
    $('#ecOk').onclick = () => {
      const tit = $('#ecTit').value.trim().slice(0, 120);
      if (!tit) { $('#ecErr').hidden = false; $('#ecTit').focus(); return; }
      const d = leer(); const letra = $('#ecLet').value.trim();
      if (edit) { const x = d.propias.find((q) => q.id === c.id); if (x) { x.titulo = tit; x.letra = letra; } }
      else d.propias.push({ id: 'c' + Date.now().toString(36), titulo: tit, letra: letra });
      guardar(d); vibra(); lista();
    };
  }

  // Dibuja una estrofa en un canvas cuadrado (1080×1080) con el fondo elegido.
  function envolver(x, lineas, max) {
    const out = [];
    lineas.forEach((l) => {
      if (!l.trim()) { out.push(''); return; }
      let cur = '';
      l.split(' ').forEach((p) => {
        const t = cur ? cur + ' ' + p : p;
        if (x.measureText(t).width > max && cur) { out.push(cur); cur = p; } else cur = t;
      });
      out.push(cur);
    });
    return out;
  }
  function dibujar(cv, estrofa, titulo, pal, frac) {
    const W = 1080, H = 1080;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = pal.f; x.fillRect(0, 0, W, H);
    const lineas = estrofa.split('\n');
    let etiqueta = '';
    if (/^(verso|coro|puente|estrofa|final|bridge|chorus)/i.test(lineas[0].trim())) etiqueta = lineas.shift().trim();
    x.fillStyle = pal.t; x.textAlign = 'center'; x.textBaseline = 'middle';
    let size = 72, bloques = [];
    for (; size >= 32; size -= 4) {
      x.font = '600 ' + size + 'px Georgia, "Times New Roman", serif';
      bloques = envolver(x, lineas, W * 0.8);
      if (bloques.length * size * 1.35 <= H * 0.7) break;
    }
    let y = H / 2 - (bloques.length * size * 1.35) / 2 + size * 0.67;
    bloques.forEach((l) => { x.fillText(l, W / 2, y); y += size * 1.35; });
    if (etiqueta) { x.font = '700 34px system-ui, sans-serif'; x.globalAlpha = 0.75; x.fillText(etiqueta.toUpperCase(), W / 2, H * 0.16); x.globalAlpha = 1; }
    x.font = '400 30px system-ui, sans-serif'; x.globalAlpha = 0.6; x.fillText(titulo, W / 2, H * 0.9); x.globalAlpha = 1;
    // Barra de avance (solo en el video): cambia en cada cuadro y marca el tiempo de la estrofa.
    if (frac != null) { x.fillStyle = pal.t; x.globalAlpha = 0.5; x.fillRect(0, H - 14, W * Math.max(0, Math.min(1, frac)), 14); x.globalAlpha = 1; }
  }

  function presentar(c, i) {
    const ests = estrofas(c.letra);
    if (!ests.length) { pantalla(volverA('Canción', () => detalle(c)) + '<h1 class="ec-h">' + esc(c.titulo) + '</h1><p class="ec-guia">Esta canción aún no tiene letra. Edítala para agregarla.</p>'); enlazarVolver(); return; }
    const d = leer();
    estado = { c, ests, i: Math.max(0, Math.min(i, ests.length - 1)), pal: d.paleta || 0, seg: d.seg || 6, andando: false };
    pantalla(volverA('Canción', () => detalle(c)) +
      '<h1 class="ec-h">' + esc(c.titulo) + '</h1>' +
      '<canvas id="ecLienzo" class="ec-lienzo" role="img" aria-label="Diapositiva de la estrofa"></canvas>' +
      '<p class="ec-prog" id="ecProg" aria-live="polite"></p>' +
      '<div class="ec-ctl"><button type="button" class="ec-btn" id="ecAnt" aria-label="Estrofa anterior">‹</button>' +
      '<button type="button" class="ec-btn ec-play" id="ecPlay">▶ Reproducir</button>' +
      '<button type="button" class="ec-btn" id="ecSig" aria-label="Siguiente estrofa">›</button></div>' +
      '<h2 class="ec-sub">Fondo</h2><div class="chips" id="ecPal">' + PALETAS.map((p, k) => '<button type="button" class="chip' + (k === estado.pal ? ' on' : '') + '" data-p="' + k + '">' + p.n + '</button>').join('') + '</div>' +
      '<h2 class="ec-sub">Cada estrofa dura</h2><div class="chips" id="ecSeg">' + SEGS.map((s) => '<button type="button" class="chip' + (s === estado.seg ? ' on' : '') + '" data-s="' + s + '">' + s + ' s</button>').join('') + '</div>');
    enlazarVolver();
    pintar();
    $('#ecAnt').onclick = () => { parar(); estado.andando = false; irA(estado.i - 1); };
    $('#ecSig').onclick = () => { parar(); estado.andando = false; irA(estado.i + 1); };
    $('#ecPlay').onclick = () => { vibra(); alternar(); };
    document.querySelectorAll('#ecPal .chip').forEach((b) => { b.onclick = () => { vibra(); estado.pal = Number(b.dataset.p); const x = leer(); x.paleta = estado.pal; guardar(x); document.querySelectorAll('#ecPal .chip').forEach((o) => o.classList.toggle('on', o === b)); pintar(); }; });
    document.querySelectorAll('#ecSeg .chip').forEach((b) => { b.onclick = () => { vibra(); estado.seg = Number(b.dataset.s); const x = leer(); x.seg = estado.seg; guardar(x); document.querySelectorAll('#ecSeg .chip').forEach((o) => o.classList.toggle('on', o === b)); if (estado.andando) reiniciarTemporizador(); }; });
  }
  function pintar() {
    const cv = $('#ecLienzo'); if (!cv || !estado) return;
    dibujar(cv, estado.ests[estado.i], estado.c.titulo, PALETAS[estado.pal]);
    const p = $('#ecProg'); if (p) p.textContent = 'Estrofa ' + (estado.i + 1) + ' de ' + estado.ests.length;
  }
  function irA(i) {
    if (!estado) return;
    const n = estado.ests.length;
    estado.i = (i + n) % n;   // al final vuelve al inicio
    pintar();
  }
  function reiniciarTemporizador() {
    parar();
    if (!estado) return;
    timer = setInterval(() => { if (!$('#ecLienzo')) { parar(); return; } irA(estado.i + 1); }, estado.seg * 1000);
  }
  function alternar() {
    if (!estado) return;
    estado.andando = !estado.andando;
    const b = $('#ecPlay');
    if (estado.andando) { reiniciarTemporizador(); if (b) b.textContent = '❚❚ Pausa'; }
    else { parar(); if (b) b.textContent = '▶ Reproducir'; }
  }

  function exportar(c) {
    const ests = estrofas(c.letra);
    if (!ests.length) return;
    const pal = PALETAS[leer().paleta || 0];
    pantalla(volverA('Canción', () => detalle(c)) + '<h1 class="ec-h">' + esc(c.titulo) + '</h1><p class="ec-guia">Toca una estrofa para descargarla como imagen a tu teléfono. Desde ahí puedes compartirla con tu iglesia.</p><div class="ec-lista" id="ecImgs"></div>');
    enlazarVolver();
    const cont = $('#ecImgs');
    ests.forEach((e, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ec-item';
      b.innerHTML = '<b>Estrofa ' + (k + 1) + '</b><small>' + esc(e.split('\n')[0].slice(0, 40)) + '</small>';
      b.onclick = () => {
        vibra();
        const cv = document.createElement('canvas');
        dibujar(cv, e, c.titulo, pal);
        cv.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = slug(c.titulo) + '-' + (k + 1) + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }, 'image/png');
      };
      cont.appendChild(b);
    });
  }

  // ---------- Video de la canción (F1330): usa el mismo motor de escenas que el Estudio de videos ----------
  const TE = () => window.TBEstudioVideos;
  const TS = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  // Solo cuenta como etiqueta una línea corta tipo «Verso 1», «Coro», «Puente 2», «Coro x2».
  const LABEL = /^(verso|coro|puente|estrofa|final|bridge|chorus|intro|outro)(\s*\d+|\s*x\s*\d+)?\s*:?$/i;
  const aSeg = (m) => Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number('0.' + m[3]) : 0);
  // Parte la letra en bloques (estrofas). Acepta letra con tiempos tipo LRC: [0:12.50] Línea.
  function bloquesDeLetra(letra) {
    const raw = String(letra || '').replace(/\r/g, '').trim().split('\n');
    const sinTiempo = (l) => l.replace(TS, '').trim();
    const conTiempos = raw.filter((l) => /\[\d{1,2}:\d{2}/.test(l)).length;
    const sinBlancos = raw.every((l) => l.trim() !== '');
    let grupos = [];
    if (conTiempos && sinBlancos && raw.filter((l) => l.trim()).length > 1) {
      // Letra con tiempo por línea y sin líneas en blanco: cada línea es una escena (agrupadas si son muchas).
      const lineas = raw.filter((l) => sinTiempo(l)).map((l) => ({ t: (() => { TS.lastIndex = 0; const m = TS.exec(l); TS.lastIndex = 0; return m ? aSeg(m) : null; })(), texto: sinTiempo(l) }));
      const k = Math.max(1, Math.ceil(lineas.length / 40));
      for (let a = 0; a < lineas.length; a += k) {
        const ch = lineas.slice(a, a + k);
        grupos.push({ t: ch[0].t, lineas: ch.map((x) => x.texto) });
      }
    } else {
      let cur = null;
      raw.forEach((l) => {
        if (!l.trim()) { if (cur) grupos.push(cur); cur = null; return; }
        TS.lastIndex = 0; const m = TS.exec(l); TS.lastIndex = 0;
        if (!cur) cur = { t: m ? aSeg(m) : null, lineas: [] };
        if (cur.t == null && m) cur.t = aSeg(m);
        const txt = sinTiempo(l); if (txt) cur.lineas.push(txt);
      });
      if (cur) grupos.push(cur);
    }
    return grupos.filter((g) => g.lineas.length).map((g) => {
      const primera = g.lineas[0];
      const etiq = LABEL.test(primera) ? primera : '';
      const texto = (etiq ? g.lineas.slice(1) : g.lineas).join('\n');
      return { t: g.t, label: texto ? etiq : '', texto: texto || etiq };
    });
  }
  // Escenas de la canción con el diseño y la animación elegidos.
  function escenasDeCancion(c, o) {
    const bl = bloquesDeLetra(c.letra).slice(0, 40);
    const conTiempo = bl.length > 1 && bl.every((b) => b.t != null);
    return bl.map((b, i) => {
      let seg = o.seg;
      if (conTiempo) { const nx = bl[i + 1]; seg = nx ? Math.max(1.5, Math.min(30, Math.round((nx.t - b.t) * 2) / 2)) : o.seg; }
      return { id: 'c' + i + Date.now().toString(36), titulo: b.texto, subtitulo: b.label, seg: seg, pal: 0, lay: o.lay, est: o.est, anim: o.anim, tin: o.tin, fx: o.fx ? [o.fx] : [], sfx: '' };
    });
  }
  const opcion = (lista, sel) => lista.map((o) => '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[1] + '</option>').join('');
  function videoConfig(c) {
    const t = TE();
    const bl = bloquesDeLetra(c.letra);
    if (!t || !bl.length) {
      pantalla(volverA('Canción', () => detalle(c)) + '<h1 class="ec-h">' + esc(c.titulo) + '</h1><p class="ec-guia">Esta canción aún no tiene letra. Agrégala para crear el video.</p>');
      enlazarVolver(); return;
    }
    const conT = bl.length > 1 && bl.every((b) => b.t != null);
    pantalla(volverA('Canción', () => detalle(c)) +
      '<h1 class="ec-h">Video de «' + esc(c.titulo) + '»</h1>' +
      '<p class="ec-guia">' + bl.length + ' estrofas. ' + (conT ? 'La letra trae tiempos: cada estrofa dura lo que le toca en la canción.' : 'Cada estrofa dura lo que elijas abajo.') + '</p>' +
      '<label class="ec-campo">Diseño del texto<select class="ea-input" id="vcLay">' + opcion(t._t.DISENOS, 'centro') + '</select></label>' +
      '<label class="ec-campo">Movimiento del fondo<select class="ea-input" id="vcEst">' + opcion(t._t.FONDOS, 'aurora') + '</select></label>' +
      '<label class="ec-campo">Aparición del texto<select class="ea-input" id="vcAnim">' + opcion(t._t.ANIMS, 'enfoque') + '</select></label>' +
      '<label class="ec-campo">Cómo pasa a la siguiente<select class="ea-input" id="vcTin">' + opcion(t._t.TRANSICIONES, 'fade') + '</select></label>' +
      '<label class="ec-campo">Efecto<select class="ea-input" id="vcFx">' + [['', 'Ninguno']].concat(t._t.EFECTOS).map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></label>' +
      '<label class="ec-campo" id="vcSegL">Segundos por estrofa<select class="ea-input" id="vcSeg">' + [4, 6, 8].map((n) => '<option value="' + n + '"' + (n === 6 ? ' selected' : '') + '>' + n + ' s</option>').join('') + '</select></label>' +
      '<label class="ec-campo">Música de la canción (opcional)<input type="file" id="vcMusica" accept="audio/*"></label>' +
      '<label class="ec-campo">Volumen de la música: <output id="vcVolOut">60</output>%<input type="range" id="vcVol" min="0" max="100" step="5" value="60"></label>' +
      '<p class="ec-aviso-txt" id="vcErr" role="alert" hidden></p>' +
      '<button type="button" class="ec-cat" id="vcCrear"><span class="ec-ci" aria-hidden="true">🎬</span><b>Crear video</b><small>Se graba y se puede descargar</small></button>');
    enlazarVolver();
    const vol = $('#vcVol'); vol.oninput = () => { $('#vcVolOut').textContent = vol.value; };
    $('#vcCrear').onclick = () => {
      vibra();
      const o = { lay: $('#vcLay').value, est: $('#vcEst').value, anim: $('#vcAnim').value, tin: $('#vcTin').value, fx: $('#vcFx').value, seg: Number($('#vcSeg').value) || 6 };
      const escs = escenasDeCancion(c, o);
      const f = $('#vcMusica').files && $('#vcMusica').files[0];
      t.grabarEscenas(c.titulo, escs, { atras: () => detalle(c), archivo: f || null, volumen: Number(vol.value) });
    };
  }

  window.TBEstudioCanciones = { abrir: lista, _t: { estrofas, bloquesDeLetra, escenasDeCancion, PALETAS } };
})();
