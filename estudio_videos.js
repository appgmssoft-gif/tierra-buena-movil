/* F1325 · Estudio de videos (móvil): un video es una lista de escenas. Cada escena tiene título,
   subtítulo, segundos y fondo de color. Se puede ver y grabar como video (webm o mp4 según el navegador).
   Sigue el modelo de escenas del escritorio (videos.js, etapa 1: título, subtítulo, duración y fondo). */
(function () {
  const K = 'tb_estudio_videos';
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
  const SEG_MIN = 2, SEG_MAX = 20;
  const MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let grab = null;     // grabación en curso
  let vista = null;    // vista previa en curso
  let atrasFn = null;

  function leer() {
    try { const d = JSON.parse(localStorage.getItem(K)); return Object.assign({ videos: [] }, d || {}); }
    catch (e) { return { videos: [] }; }
  }
  function guardar(d) { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) { /* sin espacio */ } }
  function nuevoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function slug(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video'; }
  function duracion(v) { return (v.escenas || []).reduce((a, e) => a + (Number(e.seg) || 0), 0); }
  function mimeVideo() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  }

  function cancelar() {
    if (vista) { try { vista.stop(); } catch (e) { /* nada */ } vista = null; }
    if (grab) {
      grab.descartar = true;
      try { if (grab.handle) grab.handle.stop(); if (grab.rec && grab.rec.state !== 'inactive') grab.rec.stop(); } catch (e) { /* nada */ }
      grab = null;
    }
  }
  function pantalla(html) {
    cancelar();
    const p = $('#pantalla'); if (!p) return;
    p.innerHTML = html;
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  }
  function volverA(txt, fn) { atrasFn = fn; return '<button type="button" class="volver" id="evVolver">‹ ' + txt + '</button>'; }
  function enlazarVolver() { const b = $('#evVolver'); if (b) b.onclick = () => { cancelar(); if (atrasFn) atrasFn(); }; }

  // Dibuja una escena: título grande y subtítulo debajo, centrados, con barra de avance abajo.
  function envolver(x, texto, max) {
    const out = []; let cur = '';
    String(texto || '').split(' ').forEach((p) => {
      const t = cur ? cur + ' ' + p : p;
      if (x.measureText(t).width > max && cur) { out.push(cur); cur = p; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }
  function dibujar(cv, escena, pal, frac) {
    const W = 1080, H = 1080;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = pal.f; x.fillRect(0, 0, W, H);
    x.fillStyle = pal.t; x.textAlign = 'center'; x.textBaseline = 'middle';
    let tam = 110, lineasT = [];
    for (; tam >= 40; tam -= 6) {
      x.font = '700 ' + tam + 'px Georgia, "Times New Roman", serif';
      lineasT = envolver(x, escena.titulo, W * 0.84);
      if (lineasT.length * tam * 1.2 <= H * 0.5) break;
    }
    let tamS = 52, lineasS = [];
    if (escena.subtitulo) {
      for (; tamS >= 26; tamS -= 4) {
        x.font = '400 ' + tamS + 'px system-ui, sans-serif';
        lineasS = envolver(x, escena.subtitulo, W * 0.8);
        if (lineasS.length * tamS * 1.3 <= H * 0.3) break;
      }
    }
    const altoT = lineasT.length * tam * 1.2, altoS = lineasS.length ? 40 + lineasS.length * tamS * 1.3 : 0;
    let y = H / 2 - (altoT + altoS) / 2 + tam * 0.6;
    x.font = '700 ' + tam + 'px Georgia, "Times New Roman", serif';
    lineasT.forEach((l) => { x.fillText(l, W / 2, y); y += tam * 1.2; });
    if (lineasS.length) {
      y += 40 - tam * 0.2 + tamS * 0.6;
      x.font = '400 ' + tamS + 'px system-ui, sans-serif';
      x.globalAlpha = 0.85;
      lineasS.forEach((l) => { x.fillText(l, W / 2, y); y += tamS * 1.3; });
      x.globalAlpha = 1;
    }
    if (frac != null) { x.globalAlpha = 0.5; x.fillRect(0, H - 14, W * Math.max(0, Math.min(1, frac)), 14); x.globalAlpha = 1; }
  }

  // Reproduce las escenas en el canvas, una por una. Devuelve un control para detenerlas.
  function reproducir(cv, escenas, pal, track, alTerminar) {
    const ctl = { stop: () => { clearInterval(ctl.tick); }, tick: null };
    let idx = 0, inicio = Date.now();
    const cuadro = (f) => {
      dibujar(cv, escenas[idx], pal, f);
      try { if (track && track.requestFrame) track.requestFrame(); } catch (e) { /* nada */ }
    };
    const avisar = () => { const p = $('#evProg'); if (p) p.textContent = 'Escena ' + (idx + 1) + ' de ' + escenas.length + ' · ' + escenas[idx].titulo; };
    cuadro(0); avisar();
    ctl.tick = setInterval(() => {
      if (Date.now() - inicio >= (Number(escenas[idx].seg) || SEG_MIN) * 1000) {
        idx++;
        if (idx >= escenas.length) { clearInterval(ctl.tick); if (alTerminar) alTerminar(); return; }
        inicio = Date.now(); avisar();
      }
      cuadro(Math.min(1, (Date.now() - inicio) / ((Number(escenas[idx].seg) || SEG_MIN) * 1000)));
    }, 100);
    return ctl;
  }

  function lista() {
    const d = leer();
    pantalla(volverA('Crear', () => { if (window.TBEstudioCreativo) window.TBEstudioCreativo.abrir(); }) +
      '<h1 class="ec-h">🎬 Estudio de videos</h1>' +
      '<p class="ec-guia">Un video son escenas: cada una tiene título, subtítulo, fondo y el tiempo que dura.</p>' +
      '<button type="button" class="ec-cat" id="evNuevo"><span class="ec-ci" aria-hidden="true">➕</span><b>Nuevo video</b><small>Agrega sus escenas</small></button>' +
      (d.videos.length
        ? '<h2 class="ec-sub">Mis videos</h2><div class="ec-lista">' + d.videos.map((v) => '<button type="button" class="ec-item" data-id="' + esc(v.id) + '"><b>' + esc(v.titulo) + '</b><small>' + v.escenas.length + (v.escenas.length === 1 ? ' escena' : ' escenas') + ' · ' + duracion(v) + ' s</small></button>').join('') + '</div>'
        : '<p class="ec-guia">Aún no tienes videos.</p>'));
    enlazarVolver();
    $('#evNuevo').onclick = () => { vibra(); formulario(null); };
    document.querySelectorAll('.ec-item[data-id]').forEach((b) => {
      b.onclick = () => { vibra(); const v = leer().videos.find((x) => x.id === b.dataset.id); if (v) detalle(v); };
    });
  }

  function detalle(v) {
    const n = v.escenas.length;
    pantalla(volverA('Videos', lista) +
      '<h1 class="ec-h">' + esc(v.titulo) + '</h1>' +
      '<p class="ec-guia">' + n + (n === 1 ? ' escena' : ' escenas') + ' · ' + duracion(v) + ' s en total.</p>' +
      '<ol class="ev-lista">' + v.escenas.map((e) => '<li><b>' + esc(e.titulo) + '</b>' + (e.subtitulo ? '<span>' + esc(e.subtitulo) + '</span>' : '') + '<small>' + e.seg + ' s</small></li>').join('') + '</ol>' +
      '<div class="ec-cats">' + (n ? '<button type="button" class="ec-cat" id="evVer"><span class="ec-ci" aria-hidden="true">▶️</span><b>Ver</b><small>Pasa las escenas en la pantalla</small></button>' +
        '<button type="button" class="ec-cat" id="evGrabar"><span class="ec-ci" aria-hidden="true">🎬</span><b>Crear video</b><small>Se graba y se puede descargar</small></button>' : '') +
      '<button type="button" class="ec-cat" id="evEditar"><span class="ec-ci" aria-hidden="true">✏️</span><b>Editar</b><small>Títulos, tiempos y fondos</small></button>' +
      '<button type="button" class="ec-cat" id="evQuitar"><span class="ec-ci" aria-hidden="true">🗑️</span><b>Quitar</b><small>Sacarlo de mis videos</small></button></div>');
    enlazarVolver();
    const ver = $('#evVer'); if (ver) ver.onclick = () => { vibra(); ver_(v); };
    const gr = $('#evGrabar'); if (gr) gr.onclick = () => { vibra(); grabar(v); };
    $('#evEditar').onclick = () => { vibra(); formulario(v); };
    $('#evQuitar').onclick = () => {
      if (!confirm('¿Quitar «' + v.titulo + '» de tus videos?')) return;
      const d = leer(); d.videos = d.videos.filter((x) => x.id !== v.id); guardar(d); lista();
    };
  }

  function ver_(v) {
    const pal = PALETAS[0];
    pantalla(volverA('Video', () => detalle(v)) + '<h1 class="ec-h">' + esc(v.titulo) + '</h1>' +
      '<canvas id="evLienzo" class="ec-lienzo" role="img" aria-label="Vista previa del video"></canvas>' +
      '<p class="ec-prog" id="evProg" aria-live="polite"></p>');
    enlazarVolver();
    vista = reproducir($('#evLienzo'), v.escenas, PALETAS[v.paleta || 0] || pal, null, () => {
      vista = null; const p = $('#evProg'); if (p) p.textContent = 'Fin de la vista previa.';
    });
  }

  function grabar(v) {
    const mime = mimeVideo();
    const cab = volverA('Video', () => detalle(v)) + '<h1 class="ec-h">' + esc(v.titulo) + '</h1>';
    if (!mime || !document.createElement('canvas').captureStream) {
      pantalla(cab + '<p class="ec-guia">Tu navegador no puede crear video. Usa «Ver» para pasar las escenas en la pantalla.</p>');
      enlazarVolver(); return;
    }
    pantalla(cab +
      '<p class="ec-guia">Se graba un video de ' + v.escenas.length + ' escenas, ' + duracion(v) + ' s en total. Deja esta pantalla abierta hasta que termine.</p>' +
      '<canvas id="evLienzo" class="ec-lienzo" role="img" aria-label="Vista previa del video"></canvas>' +
      '<p class="ec-prog" id="evProg" aria-live="polite">Preparando…</p><div id="evResul"></div>');
    enlazarVolver();
    const cv = $('#evLienzo');
    const stream = cv.captureStream(30);
    const track = stream.getVideoTracks()[0];
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3000000 });
    const g = { rec: rec, handle: null, descartar: false };
    grab = g;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (grab === g) grab = null;
      if (g.descartar) return;
      const ext = mime.indexOf('video/mp4') === 0 ? 'mp4' : 'webm';
      const url = URL.createObjectURL(new Blob(chunks, { type: mime.split(';')[0] }));
      const p = $('#evProg'); if (p) p.textContent = 'Listo. Puedes verlo y descargarlo.';
      const r = $('#evResul');
      if (r) r.innerHTML = '<video class="ec-video" controls playsinline src="' + url + '"></video>' +
        '<button type="button" class="ec-cat" id="evBajar"><span class="ec-ci" aria-hidden="true">⬇️</span><b>Descargar video</b><small>Se guarda en tu teléfono</small></button>';
      const b = $('#evBajar');
      if (b) b.onclick = () => { vibra(); const a = document.createElement('a'); a.href = url; a.download = slug(v.titulo) + '.' + ext; document.body.appendChild(a); a.click(); a.remove(); };
    };
    rec.start(500);
    g.handle = reproducir(cv, v.escenas, PALETAS[v.paleta || 0] || PALETAS[0], track, () => { try { rec.stop(); } catch (e) { /* nada */ } });
  }

  function formulario(v) {
    const edit = !!v;
    const b = v ? JSON.parse(JSON.stringify(v)) : { id: nuevoId('v'), titulo: '', paleta: 0, escenas: [{ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }] };
    const volverDe = () => (edit ? detalle(v) : lista());
    const pintarForm = (err) => {
      pantalla(volverA(edit ? 'Video' : 'Videos', volverDe) +
        '<h1 class="ec-h">' + (edit ? 'Editar video' : 'Nuevo video') + '</h1>' +
        '<label class="ec-campo">Título del video<input id="evTit" class="ea-input" maxlength="120" value="' + esc(b.titulo) + '" placeholder="Ej.: Bienvenida"></label>' +
        '<h2 class="ec-sub">Escenas</h2>' +
        b.escenas.map((e, i) =>
          '<div class="ev-esc"><b>Escena ' + (i + 1) + '</b>' +
          '<label class="ec-campo">Título<input class="ea-input" maxlength="80" data-k="titulo" data-i="' + i + '" value="' + esc(e.titulo) + '" placeholder="Título de la escena"></label>' +
          '<label class="ec-campo">Subtítulo (opcional)<input class="ea-input" maxlength="120" data-k="subtitulo" data-i="' + i + '" value="' + esc(e.subtitulo) + '"></label>' +
          '<div class="ev-fila"><label class="ec-campo">Segundos<input class="ea-input" type="number" min="' + SEG_MIN + '" max="' + SEG_MAX + '" step="1" data-k="seg" data-i="' + i + '" value="' + e.seg + '"></label>' +
          '<label class="ec-campo">Fondo<select class="ea-input" data-k="pal" data-i="' + i + '">' + PALETAS.map((p, k) => '<option value="' + k + '"' + (k === (e.pal || 0) ? ' selected' : '') + '>' + p.n + '</option>').join('') + '</select></label></div>' +
          '<div class="ev-btns"><button type="button" class="chip" data-mv="-1" data-i="' + i + '" aria-label="Subir escena">▲</button><button type="button" class="chip" data-mv="1" data-i="' + i + '" aria-label="Bajar escena">▼</button><button type="button" class="chip" data-del="' + i + '">Quitar</button></div></div>'
        ).join('') +
        '<button type="button" class="ec-cat" id="evAdd"><span class="ec-ci" aria-hidden="true">➕</span><b>Agregar escena</b><small>Hasta 40 escenas</small></button>' +
        '<p class="ec-aviso-txt" id="evErr" role="alert"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>' +
        '<button type="button" class="ec-cat" id="evOk"><span class="ec-ci" aria-hidden="true">💾</span><b>Guardar video</b><small>Queda en tu teléfono</small></button>');
      enlazarVolver();
      const leerForm = () => {
        const t = $('#evTit'); if (t) b.titulo = t.value.trim().slice(0, 120);
        document.querySelectorAll('#pantalla [data-k][data-i]').forEach((el) => {
          const i = Number(el.dataset.i), k = el.dataset.k; const e = b.escenas[i]; if (!e) return;
          if (k === 'seg') e.seg = Math.max(SEG_MIN, Math.min(SEG_MAX, Math.round(Number(el.value)) || SEG_MIN));
          else if (k === 'pal') e.pal = Number(el.value) || 0;
          else e[k] = el.value.trim().slice(0, k === 'titulo' ? 80 : 120);
        });
      };
      $('#evAdd').onclick = () => { vibra(); leerForm(); if (b.escenas.length >= 40) return; b.escenas.push({ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }); pintarForm(); };
      document.querySelectorAll('[data-del]').forEach((el) => { el.onclick = () => { vibra(); leerForm(); b.escenas.splice(Number(el.dataset.del), 1); if (!b.escenas.length) b.escenas.push({ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }); pintarForm(); }; });
      document.querySelectorAll('[data-mv]').forEach((el) => { el.onclick = () => { vibra(); leerForm(); const i = Number(el.dataset.i), j = i + Number(el.dataset.mv); if (j < 0 || j >= b.escenas.length) return; const t = b.escenas[i]; b.escenas[i] = b.escenas[j]; b.escenas[j] = t; pintarForm(); }; });
      $('#evOk').onclick = () => {
        leerForm();
        if (!b.titulo) return pintarForm('Escribe el título del video.');
        if (b.escenas.some((e) => !e.titulo)) return pintarForm('Cada escena necesita un título.');
        const d = leer();
        if (edit) { const i = d.videos.findIndex((x) => x.id === b.id); if (i >= 0) d.videos[i] = b; }
        else d.videos.push(b);
        guardar(d); vibra();
        detalle(b);
      };
    };
    pintarForm('');
  }

  window.TBEstudioVideos = { abrir: lista, _t: { dibujar, reproducir, duracion, envolver } };
})();
