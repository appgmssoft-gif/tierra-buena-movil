/* F1315 · Estudio creativo (móvil): hojas, bosquejos, credenciales y fondos especiales con las plantillas del escritorio.
   Se dibuja en el teléfono (canvas), sin conexión después de la primera vez, y se descarga o comparte como imagen. */
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const vibra = () => { try { if (A().vibra) A().vibra(); } catch (e) { /* sin vibración */ } };
  const W = 1400, H = 990, SVG_W = 2970; // mismo lienzo que el escritorio (A4 apaisado)
  const K_GUARDADOS = 'tb_estudio_creativo';
  const SERIF = 'Georgia, "Times New Roman", serif', SANS = 'Arial, Helvetica, sans-serif';
  const CATS = [
    { id: 'estudios', n: 'Estudios', i: '📖', f: 'plantillas_estudios.json', a: 'Hojas para estudiar un pasaje, con el método que prefieras.' },
    { id: 'predicas', n: 'Prédicas', i: '🎙️', f: 'plantillas_predicas.json', a: 'Bosquejos y tarjetas para llevar al atril.' },
    { id: 'miembros', n: 'Miembros', i: '🪪', f: 'plantillas_miembros.json', a: 'Credenciales, bienvenidas y fichas de la iglesia.' },
  ];
  const FORMATOS = { oia: 'Observar · Interpretar · Aplicar', soap: 'SOAP', preguntas: 'Preguntas', libre: 'Libre', express: 'Express', palabras: 'Palabras clave', personaje: 'Personaje', contexto: 'Contexto', grupo: 'Grupo pequeño', mapa: 'Mapa', linea: 'Línea de tiempo', infografia: 'Infografía', bosquejo: 'Bosquejo' };

  const cache = {}, imgs = {};
  const traer = async (c) => {
    if (!cache[c.id]) {
      const r = await fetch('datos/estudio/' + c.f, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cache[c.id] = (await r.json()).filter((x) => x && x.url);
    }
    return cache[c.id];
  };
  const cargarImg = (url) => new Promise((ok, no) => {
    if (imgs[url]) return ok(imgs[url]);
    const im = new Image();
    im.onload = () => { imgs[url] = im; ok(im); };
    im.onerror = () => no(new Error('imagen'));
    im.src = url;
  });
  const pantalla = (html) => { const p = $('#pantalla'); if (!p) return; p.innerHTML = html; try { window.scrollTo(0, 0); } catch (e) { /* nada */ } };
  const volver = (txt) => '<button type="button" class="volver" id="ecVolver">‹ ' + esc(txt) + '</button>';
  const guardados = () => { try { return JSON.parse(localStorage.getItem(K_GUARDADOS) || '[]'); } catch (e) { return []; } };
  const guardar = (d) => {
    try {
      const otros = guardados().filter((x) => !(x.id === d.id && x.cat === d.cat && x.titulo === d.titulo));
      localStorage.setItem(K_GUARDADOS, JSON.stringify([d].concat(otros).slice(0, 12)));
      return true;
    } catch (e) { return false; }
  };

  // ---------- Dibujo (mismo criterio que el escritorio: el texto va en la zona de la plantilla) ----------
  function lineas(ctx, txt, maxW) {
    const out = [];
    String(txt).split(/\n/).forEach((par) => {
      let ln = '';
      par.split(/\s+/).filter(Boolean).forEach((p) => {
        const prueba = ln ? ln + ' ' + p : p;
        if (ln && ctx.measureText(prueba).width > maxW) { out.push(ln); ln = p; } else { ln = prueba; }
      });
      out.push(ln);
    });
    return out;
  }
  function dibujar(ctx, t, img, d) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    const k = W / SVG_W, z = t.zona || { left: 200, width: 2570, top: 260 }, tinta = t.tinta || {};
    const x = z.left * k, w = z.width * k, fin = H - 110 * k;
    let y = z.top * k;
    const bloque = (txt, s1, s2, color, peso) => {
      txt = String(txt || '').trim();
      if (!txt || y >= fin) return;
      let s = s1 * k, L;
      const medir = () => { ctx.font = peso + ' ' + s + 'px ' + SERIF; return lineas(ctx, txt, w); };
      L = medir();
      while (s > s2 * k && L.length * s * 1.28 > fin - y) { s -= 2; L = medir(); }
      const cabe = Math.max(1, Math.floor((fin - y) / (s * 1.28)));
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      L.slice(0, cabe).forEach((ln, i) => ctx.fillText(ln, x, y + i * s * 1.28));
      y += Math.min(L.length, cabe) * s * 1.28 + 36 * k;
    };
    bloque(d.titulo, 150, 70, tinta.tema || tinta.pasaje || '#1d2330', 'bold');
    bloque(d.pasaje, 80, 44, tinta.pasaje || tinta.tema || '#0f3d32', 'normal');
    bloque(d.texto, 64, 34, tinta.cuerpo || '#231c15', 'normal');
    if (d.pie) {
      ctx.font = (30 * k) + 'px ' + SANS; ctx.fillStyle = tinta.cuerpo || '#231c15';
      ctx.globalAlpha = 0.75; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(d.pie, W / 2, H - 50 * k); ctx.globalAlpha = 1;
    }
  }

  // ---------- Pantallas ----------
  function vistaHub() {
    const g = guardados();
    pantalla(volver('Estudio y Prédicas') + '<h1 class="ec-h">🎨 Estudio creativo</h1>' +
      '<p class="ec-guia">Elige una plantilla, escribe lo que quieres decir y compártela como imagen. Todo se hace en tu teléfono.</p>' +
      '<div class="ec-cats">' + CATS.map((c) => '<button type="button" class="ec-cat" data-c="' + c.id + '"><span class="ec-ci" aria-hidden="true">' + c.i + '</span><b>' + esc(c.n) + '</b><small>' + esc(c.a) + '</small></button>').join('') + '</div>' +
      (g.length ? '<h2 class="ec-sub">Mis diseños guardados</h2><div class="ec-lista">' + g.slice(0, 6).map((d, i) => '<button type="button" class="ec-item" data-g="' + i + '"><b>' + esc(d.titulo) + '</b><small>' + esc(d.fecha) + '</small></button>').join('') + '</div>' : ''));
    $('#ecVolver').onclick = () => A().ir('palabra');
    document.querySelectorAll('.ec-cat').forEach((b) => { b.onclick = () => { vibra(); vistaCategoria(CATS.find((c) => c.id === b.dataset.c)); }; });
    document.querySelectorAll('.ec-item').forEach((b) => { b.onclick = () => { vibra(); const d = g[Number(b.dataset.g)]; if (d) abrirPlantilla(d.cat, d.id, d.campos); }; });
  }

  async function vistaCategoria(c) {
    pantalla(volver('Estudio creativo') + '<h1 class="ec-h">' + c.i + ' ' + esc(c.n) + '</h1><p class="ec-guia">' + esc(c.a) + '</p><div id="ecFiltro"></div><div id="ecGrid" class="ec-grid" aria-live="polite"><p class="suave">Cargando…</p></div>');
    $('#ecVolver').onclick = vistaHub;
    let lista;
    try { lista = await traer(c); } catch (e) { $('#ecGrid').innerHTML = '<p class="suave">No se pudo cargar. Conéctate a internet una vez y quedará en tu teléfono.</p>'; return; }
    const formatos = [...new Set(lista.map((x) => x.formato).filter(Boolean))];
    const pinta = (f) => {
      const hits = lista.filter((x) => !f || x.formato === f);
      $('#ecGrid').innerHTML = hits.map((x) => '<button type="button" class="ec-tile" data-id="' + esc(x.id) + '"><img src="' + esc(x.url) + '" alt="" loading="lazy"><b>' + esc(x.titulo) + '</b></button>').join('') || '<p class="suave">No hay plantillas en este grupo.</p>';
      document.querySelectorAll('.ec-tile').forEach((b) => { b.onclick = () => { vibra(); abrirPlantilla(c.id, b.dataset.id, null); }; });
    };
    if (formatos.length) {
      $('#ecFiltro').innerHTML = '<div class="ec-chips" role="group" aria-label="Tipo de hoja"><button type="button" class="ec-chip on" data-f="">Todas</button>' + formatos.map((f) => '<button type="button" class="ec-chip" data-f="' + esc(f) + '">' + esc(FORMATOS[f] || f) + '</button>').join('') + '</div>';
      document.querySelectorAll('.ec-chip').forEach((b) => { b.onclick = () => { vibra(); document.querySelectorAll('.ec-chip').forEach((o) => o.classList.toggle('on', o === b)); pinta(b.dataset.f); }; });
    }
    pinta('');
  }

  async function abrirPlantilla(catId, tplId, previos) {
    const c = CATS.find((x) => x.id === catId);
    if (!c) return vistaHub();
    let lista, t, img;
    try { lista = await traer(c); t = lista.find((x) => x.id === tplId); img = t && await cargarImg(t.url); } catch (e) { /* se avisa abajo */ }
    if (!t || !img) { pantalla(volver('Estudio creativo') + '<p class="suave">No se pudo abrir esta plantilla. Conéctate a internet una vez y vuelve a intentar.</p>'); $('#ecVolver').onclick = vistaHub; return; }
    const base = Object.assign({ titulo: '', pasaje: '', texto: '', pie: 'Tierra Buena' }, previos || {});
    pantalla(volver(c.n) +
      '<h1 class="ec-h">' + esc(t.titulo) + '</h1>' +
      '<div class="ec-ed">' +
        '<div class="ec-vista"><button type="button" class="btn sec ec-cerrar" id="ecCerrar" aria-expanded="true">Cerrar vista grande</button><canvas id="ecLienzo" width="' + W + '" height="' + H + '" aria-label="Vista previa del diseño"></canvas></div>' +
        '<div class="ec-campos">' +
          '<label class="ec-lb">Título<input id="ecF_titulo" class="ec-in" maxlength="80" autocomplete="off" placeholder="Ej.: Un Dios que sostiene" value="' + esc(base.titulo) + '"></label>' +
          '<label class="ec-lb">Pasaje<input id="ecF_pasaje" class="ec-in" maxlength="60" autocomplete="off" placeholder="Ej.: Salmo 23" value="' + esc(base.pasaje) + '"></label>' +
          '<label class="ec-lb">Texto<textarea id="ecF_texto" class="ec-in ec-area" rows="6" maxlength="900" placeholder="Escribe aquí lo que quieres compartir">' + esc(base.texto) + '</textarea></label>' +
          '<label class="ec-lb">Pie de página<input id="ecF_pie" class="ec-in" maxlength="60" autocomplete="off" value="' + esc(base.pie) + '"></label>' +
          '<div class="ec-acc">' +
            '<button type="button" class="btn" id="ecBajar">Descargar imagen</button>' +
            '<button type="button" class="btn sec" id="ecCompartir">Compartir</button>' +
            '<button type="button" class="btn sec" id="ecGuardar">Guardar diseño</button>' +
            '<button type="button" class="btn sec" id="ecGrande" aria-expanded="false">Ver grande</button>' +
          '</div>' +
          '<p id="ecMsg" class="suave ec-msg" role="status"></p>' +
        '</div>' +
      '</div>');
    $('#ecVolver').onclick = () => vistaCategoria(c);
    const cv = $('#ecLienzo'), ctx = cv.getContext('2d');
    const leer = () => ({ titulo: $('#ecF_titulo').value.trim(), pasaje: $('#ecF_pasaje').value.trim(), texto: $('#ecF_texto').value.trim(), pie: $('#ecF_pie').value.trim() });
    const msg = (m) => { const e = $('#ecMsg'); if (e) e.textContent = m; };
    let turno = 0;
    const repintar = () => { cancelAnimationFrame(turno); turno = requestAnimationFrame(() => dibujar(ctx, t, img, leer())); };
    ['titulo', 'pasaje', 'texto', 'pie'].forEach((k) => { $('#ecF_' + k).oninput = repintar; });
    dibujar(ctx, t, img, leer());
    const nombre = 'tierra-buena-' + String(t.id).replace(/[^a-z0-9_-]/gi, '-') + '.png';
    const aPng = () => new Promise((ok, no) => { try { cv.toBlob((b) => (b ? ok(b) : no(new Error('png'))), 'image/png'); } catch (e) { no(e); } });
    $('#ecBajar').onclick = async () => {
      vibra();
      try {
        const b = await aPng(), u = URL.createObjectURL(b), a = document.createElement('a');
        a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        msg('Imagen lista. Búscala en tus descargas.');
      } catch (e) { msg('No se pudo crear la imagen. Intenta de nuevo.'); }
    };
    $('#ecCompartir').onclick = async () => {
      vibra();
      try {
        const b = await aPng(), f = new File([b], nombre, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: leer().titulo || t.titulo }); msg('Compartido.'); }
        else { $('#ecBajar').click(); msg('Tu teléfono no comparte imágenes desde aquí. La descargamos.'); }
      } catch (e) { if (!e || e.name !== 'AbortError') msg('No se pudo compartir. Prueba con Descargar imagen.'); }
    };
    const grande = (abrir) => {
      const v = $('.ec-vista');
      v.classList.toggle('grande', abrir);
      $('#ecGrande').textContent = abrir ? 'Cerrar vista grande' : 'Ver grande';
      $('#ecGrande').setAttribute('aria-expanded', String(abrir));
      try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    };
    $('#ecGrande').onclick = () => { vibra(); grande(!$('.ec-vista').classList.contains('grande')); };
    $('#ecCerrar').onclick = () => { vibra(); grande(false); };
    $('#ecGuardar').onclick = () => {
      vibra();
      const d = leer();
      const ok = guardar({ id: t.id, cat: c.id, titulo: d.titulo || t.titulo, campos: d, fecha: new Date().toLocaleDateString('es-CL') });
      msg(ok ? 'Guardado en Mis diseños.' : 'No se pudo guardar en este teléfono.');
    };
  }

  window.TBEstudioCreativo = { abrir: vistaHub };
})();
