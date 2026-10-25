/* F1430 · Tableros y plan de trabajo por ministerio (tareas 5.2 y 5.3 de PLAN_TAREAS_IGLESIA.md).
   Tablero: tarjetas en columnas (por defecto Por hacer, En curso, Listo). Mover = elegir otra columna.
   Plan: objetivo del mes y acciones con casilla de hecha.
   Permisos (en SQL 74): ver y mover tarjetas, y marcar acciones, también el miembro del ministerio.
   Crear/editar columnas, objetivo y acciones, y borrar: pastor y líder.
   Usa SQL 74: tablero_leer, tablero_tarjeta_guardar, tablero_tarjeta_borrar, tablero_columnas_guardar,
   plan_leer, plan_objetivo_guardar, plan_accion_guardar, plan_accion_marcar, plan_accion_borrar.
   Responsable: el pastor lo asigna desde la lista de personas del ministerio (ministerio_pastor_personas). Líder y miembro lo ven.
   El juego del tablero usa window.TBTablero: por eso este módulo se llama TBMinisterioTablero. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const primera = (d) => (Array.isArray(d) ? d[0] : d);
  const MOTIVOS = {
    'sin-permiso': 'Tu clave no tiene permiso para esto.',
    'columna-invalida': 'Elige una columna de la lista.',
    'titulo-invalido': 'El título debe tener entre 2 y 120 letras.',
    'detalle-largo': 'El detalle es muy largo (máximo 400 letras).',
    'demasiadas': 'Este tablero ya tiene 200 tarjetas. Quita algunas para agregar más.',
    'columnas-invalidas': 'Las columnas deben ser entre 2 y 5, con nombres de 2 a 30 letras y sin repetir.',
    'columna-con-tarjetas': 'Esa columna tiene tarjetas. Muévelas antes de quitarla.',
    'objetivo-largo': 'El objetivo es muy largo (máximo 200 letras).',
    'texto-invalido': 'La acción debe tener entre 2 y 200 letras.',
    'demasiadas-acciones': 'Este mes ya tiene 30 acciones.',
    'no-existe': 'Ese elemento ya no está.',
  };
  const txtMotivo = (g, fallo) => (g && MOTIVOS[g.motivo]) || fallo || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
  const periodoActual = (h) => { const d = h || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const textoMes = (periodo) => { const [y, m] = periodo.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); };

  // A = { rpc(fn, args) } con los datos de quien usa la app ya puestos (codigo, clave o secreto).
  async function cargarTablero(A, ministerio) {
    const r = await A.rpc('tablero_leer', { p_ministerio: ministerio });
    const d = r && r.ok ? primera(r.data) : null;
    return d && d.ok ? d : null;
  }

  // Opciones del selector de responsable. personas = [{id, nombre}] o null si no hay lista (líder y miembro).
  function opcionesResp(personas, elegido) {
    return '<option value="">Sin responsable</option>' + personas.map((x) =>
      '<option value="' + esc(x.id) + '"' + (x.id === elegido ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('');
  }

  function tarjetaHTML(t, columnas, puede, personas) {
    const otras = columnas.filter((c) => c !== t.columna);
    return '<li class="tm-tarjeta" data-tarjeta="' + esc(t.id) + '"><p class="tm-titulo">' + esc(t.titulo) + '</p>' +
      (t.detalle ? '<p class="suave m0">' + esc(t.detalle) + '</p>' : '') +
      (personas ? '<label class="sr-solo" for="tmRp-' + esc(t.id) + '">Responsable</label><select class="tm-resp" id="tmRp-' + esc(t.id) + '" data-tm-resp="' + esc(t.id) + '">' + opcionesResp(personas, t.responsable_id) + '</select>'
        : (t.responsable ? '<small class="suave">Responsable: ' + esc(t.responsable) + '</small>' : '')) +
      '<div class="tm-acc">' +
      (otras.length ? '<label class="sr-solo" for="tmMv-' + esc(t.id) + '">Mover a</label><select id="tmMv-' + esc(t.id) + '" data-tm-mover="' + esc(t.id) + '"><option value="">Mover a…</option>' +
        otras.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</select>' : '') +
      (puede.borrar ? ' <button type="button" class="cp-mini cp-borrar" data-tm-borrar="' + esc(t.id) + '">Quitar</button>' : '') +
      '</div></li>';
  }

  function tableroHTML(d, puede, personas) {
    const cols = d.columnas || [];
    const tar = d.tarjetas || [];
    const columnasHTML = cols.map((c) => {
      const items = tar.filter((t) => t.columna === c);
      return '<section class="tm-col"><h3>' + esc(c) + ' <span class="suave">(' + items.length + ')</span></h3><ul class="tm-lista">' +
        (items.length ? items.map((t) => tarjetaHTML(t, cols, puede, personas)).join('') : '<li class="suave tm-vacio">Sin tarjetas</li>') +
        '</ul></section>';
    }).join('');
    const formTarjeta = '<div class="card tm-form"><h3 class="m0">Nueva tarjeta</h3>' +
      '<label for="tmNCol">Columna</label><select id="tmNCol">' + cols.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('') + '</select>' +
      '<label for="tmNTit">Qué hay que hacer</label><input id="tmNTit" type="text" maxlength="120" autocomplete="off" placeholder="Ej.: Preparar el culto de noviembre">' +
      '<label for="tmNDet">Detalle (opcional)</label><input id="tmNDet" type="text" maxlength="400" autocomplete="off">' +
      (personas ? '<label for="tmNResp">Responsable (opcional)</label><select id="tmNResp">' + opcionesResp(personas, '') + '</select>' : '') +
      '<p class="error" id="tmErr" role="alert" hidden></p><button type="button" class="btn" id="tmAgregar">Agregar tarjeta</button></div>';
    const editorCols = puede.columnas ? '<details class="pf-grupo mi-grupo"><summary>Cambiar las columnas</summary><div class="card">' +
      '<label for="tmCols">Columnas, separadas por coma (de 2 a 5)</label><input id="tmCols" type="text" value="' + esc(cols.join(', ')) + '" maxlength="200">' +
      '<button type="button" class="btn" id="tmColsBtn">Guardar columnas</button></div></details>' : '';
    return '<h2 class="mi-sub">Tablero</h2><div class="tm-tablero">' + columnasHTML + '</div>' +
      (puede.crear ? formTarjeta : '') + editorCols + '<p class="suave" id="tmMsg" role="status" aria-live="polite"></p>';
  }

  function planHTML(p, periodo, puede, personas) {
    const acc = p.acciones || [];
    const lista = acc.length ? acc.map((a) => '<li class="tm-accion' + (a.hecha ? ' hecha' : '') + '"><label class="tm-chk"><input type="checkbox" data-tm-hecha="' + esc(a.id) + '"' + (a.hecha ? ' checked' : '') + '> <span>' + esc(a.texto) + '</span></label>' +
      (personas ? '<select class="tm-resp" aria-label="Responsable de la acción" data-tm-accresp="' + esc(a.id) + '">' + opcionesResp(personas, a.responsable_id) + '</select>' : (a.responsable ? '<small class="suave">' + esc(a.responsable) + '</small>' : '')) +
      (puede.acciones ? ' <button type="button" class="cp-mini cp-borrar" data-tm-accion-borrar="' + esc(a.id) + '">Quitar</button>' : '') + '</li>').join('')
      : '<li class="suave">Todavía no hay acciones este mes.</li>';
    return '<h2 class="mi-sub">Plan de ' + esc(textoMes(periodo)) + '</h2><div class="card">' +
      (puede.acciones
        ? '<label for="tmObj">Objetivo del mes</label><textarea id="tmObj" maxlength="200" rows="2">' + esc(p.objetivo || '') + '</textarea><button type="button" class="btn" id="tmObjBtn">Guardar objetivo</button>'
        : (p.objetivo ? '<p><b>Objetivo:</b> ' + esc(p.objetivo) + '</p>' : '<p class="suave">Todavía no hay objetivo este mes.</p>')) +
      '<ul class="tm-acciones">' + lista + '</ul>' +
      (puede.acciones ? '<label for="tmAcc">Nueva acción</label><input id="tmAcc" type="text" maxlength="200" autocomplete="off" placeholder="Ej.: Visitar a 3 familias">' + (personas ? '<label for="tmAccResp">Responsable (opcional)</label><select id="tmAccResp">' + opcionesResp(personas, '') + '</select>' : '') + '<button type="button" class="btn" id="tmAccBtn">Agregar acción</button>' : '') +
      '</div>';
  }

  // Dibuja tablero y plan de un ministerio dentro de un contenedor.
  async function pintarMinisterio(c, A, ministerio, periodo) {
    c.innerHTML = '<p class="suave">Cargando…</p>';
    const [t, pl, personas] = await Promise.all([cargarTablero(A, ministerio.id), A.rpc('plan_leer', { p_ministerio: ministerio.id, p_periodo: periodo }).then((r) => (r && r.ok ? primera(r.data) : null)), A.personas ? A.personas(ministerio.id) : Promise.resolve(null)]);
    if (!t || !pl || !pl.ok) { c.innerHTML = '<p class="error" role="alert">No pudimos cargar este ministerio. Revisa tu conexión.</p>'; return; }
    const rol = t.rol;
    const puede = { crear: true, columnas: rol !== 'miembro', acciones: rol !== 'miembro', borrar: rol !== 'miembro' };
    c.innerHTML = '<div class="tm-cab"><h2 class="cp-titulo m0">' + esc(ministerio.nombre) + '</h2></div>' + tableroHTML(t, puede, personas) + planHTML(pl, periodo, puede, personas);
    const msg = (x, err) => { const m = $('#tmMsg'); if (m) { m.textContent = x; m.className = err ? 'error' : 'suave'; } };
    const recargar = () => pintarMinisterio(c, A, ministerio, periodo);

    c.querySelectorAll('[data-tm-mover]').forEach((sel) => {
      sel.onchange = async () => {
        if (!sel.value) return;
        const id = sel.getAttribute('data-tm-mover');
        const tar = (t.tarjetas || []).find((x) => x.id === id); if (!tar) return;
        const r = await A.rpc('tablero_tarjeta_guardar', { p_ministerio: ministerio.id, p_id: id, p_columna: sel.value, p_titulo: tar.titulo, p_detalle: tar.detalle || '', p_responsable: tar.responsable_id || null });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) recargar(); else { msg(txtMotivo(g), true); sel.value = ''; }
      };
    });
    c.querySelectorAll('[data-tm-resp]').forEach((sel) => {
      sel.onchange = async () => {
        const id = sel.getAttribute('data-tm-resp');
        const tar = (t.tarjetas || []).find((x) => x.id === id); if (!tar) return;
        const r = await A.rpc('tablero_tarjeta_guardar', { p_ministerio: ministerio.id, p_id: id, p_columna: tar.columna, p_titulo: tar.titulo, p_detalle: tar.detalle || '', p_responsable: sel.value || null });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) recargar(); else { msg(txtMotivo(g), true); recargar(); }
      };
    });
    c.querySelectorAll('[data-tm-accresp]').forEach((sel) => {
      sel.onchange = async () => {
        const id = sel.getAttribute('data-tm-accresp');
        const a = (pl.acciones || []).find((x) => x.id === id); if (!a) return;
        const r = await A.rpc('plan_accion_guardar', { p_ministerio: ministerio.id, p_periodo: periodo, p_id: id, p_texto: a.texto, p_responsable: sel.value || null });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) recargar(); else { msg(txtMotivo(g), true); recargar(); }
      };
    });
    c.querySelectorAll('[data-tm-borrar]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('¿Quitar esta tarjeta?')) return;
        const r = await A.rpc('tablero_tarjeta_borrar', { p_id: b.getAttribute('data-tm-borrar') });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) recargar(); else msg(txtMotivo(g), true);
      };
    });
    const agregar = $('#tmAgregar');
    if (agregar) agregar.onclick = async () => {
      const err = $('#tmErr'); err.hidden = true;
      const titulo = $('#tmNTit').value.trim();
      if (titulo.length < 2) { err.textContent = MOTIVOS['titulo-invalido']; err.hidden = false; return; }
      const r = await A.rpc('tablero_tarjeta_guardar', { p_ministerio: ministerio.id, p_id: null, p_columna: $('#tmNCol').value, p_titulo: titulo, p_detalle: $('#tmNDet').value.trim(), p_responsable: ($('#tmNResp') && $('#tmNResp').value) || null });
      const g = primera(r && r.data);
      if (r && r.ok && g && g.ok) recargar(); else { err.textContent = txtMotivo(g); err.hidden = false; }
    };
    const colsBtn = $('#tmColsBtn');
    if (colsBtn) colsBtn.onclick = async () => {
      const cols = $('#tmCols').value.split(',').map((x) => x.trim()).filter(Boolean);
      const r = await A.rpc('tablero_columnas_guardar', { p_ministerio: ministerio.id, p_columnas: cols });
      const g = primera(r && r.data);
      if (r && r.ok && g && g.ok) recargar(); else msg(txtMotivo(g), true);
    };
    c.querySelectorAll('[data-tm-hecha]').forEach((ck) => {
      ck.onchange = async () => {
        const r = await A.rpc('plan_accion_marcar', { p_ministerio: ministerio.id, p_id: ck.getAttribute('data-tm-hecha'), p_hecha: ck.checked });
        const g = primera(r && r.data);
        if (!(r && r.ok && g && g.ok)) { ck.checked = !ck.checked; msg(txtMotivo(g), true); } else ck.closest('.tm-accion').classList.toggle('hecha', ck.checked);
      };
    });
    const objBtn = $('#tmObjBtn');
    if (objBtn) objBtn.onclick = async () => {
      const r = await A.rpc('plan_objetivo_guardar', { p_ministerio: ministerio.id, p_periodo: periodo, p_objetivo: $('#tmObj').value.trim() });
      const g = primera(r && r.data);
      if (r && r.ok && g && g.ok) msg('Objetivo guardado.', false); else msg(txtMotivo(g), true);
    };
    const accBtn = $('#tmAccBtn');
    if (accBtn) accBtn.onclick = async () => {
      const texto = $('#tmAcc').value.trim();
      if (texto.length < 2) { msg(MOTIVOS['texto-invalido'], true); return; }
      const r = await A.rpc('plan_accion_guardar', { p_ministerio: ministerio.id, p_periodo: periodo, p_id: null, p_texto: texto, p_responsable: ($('#tmAccResp') && $('#tmAccResp').value) || null });
      const g = primera(r && r.data);
      if (r && r.ok && g && g.ok) recargar(); else msg(txtMotivo(g), true);
    };
    c.querySelectorAll('[data-tm-accion-borrar]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('¿Quitar esta acción?')) return;
        const r = await A.rpc('plan_accion_borrar', { p_ministerio: ministerio.id, p_id: b.getAttribute('data-tm-accion-borrar') });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) recargar(); else msg(txtMotivo(g), true);
      };
    });
  }

  // ----- Pastor: elige un ministerio -----
  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="tmVolver">‹ Panel</button><h1 class="cp-titulo">Tableros y planes</h1>' +
      '<p class="suave">Cada grupo con su tablero de tareas y su plan del mes.</p><div id="tmSel"><p class="suave">Cargando…</p></div><div id="tmCont"></div>';
    $('#tmVolver').onclick = ctx.volver;
    const r = await ctx.rpc('ministerio_pastor_listar', p, {});
    const mins = lista(r);
    if (!mins || !mins.length) { $('#tmSel').innerHTML = '<p class="suave">Primero crea un ministerio en «Ministerios y líderes».</p>'; return; }
    $('#tmSel').innerHTML = '<div class="card"><label for="tmMin">Ministerio</label><select id="tmMin">' +
      mins.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select></div>';
    const A = {
      rpc: (fn, args) => ctx.rpc(fn, p, Object.assign({ p_clave: null }, args)),
      personas: async (min) => { const rp = await ctx.rpc('ministerio_pastor_personas', p, { p_ministerio: min }); const l = lista(rp); return l ? l.map((x) => ({ id: x.miembro_id, nombre: x.nombre })) : []; },
    };
    const ir = () => { const m = mins.find((x) => x.id === $('#tmMin').value); if (m) pintarMinisterio($('#tmCont'), A, { id: m.id, nombre: m.nombre }, periodoActual()); };
    $('#tmMin').onchange = ir; ir();
  }

  // ----- Miembro: sus ministerios -----
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('miembro_mis_ministerios', { p_codigo: id.codigo, p_clave: id.clave });
    const mins = (lista(r) || []).filter((x) => x && x.id);
    if (!mins.length) { c.innerHTML = ''; return; }
    const A = (min) => ({ rpc: (fn, args) => rpcRaw(fn, Object.assign({ p_codigo: id.codigo, p_clave: id.clave, p_secreto: null }, args)) });
    c.innerHTML = '<h2 class="mi-sub">Tablero y plan de mis grupos</h2><details class="pf-grupo mi-grupo" open><summary>Ver el tablero de un grupo</summary>' +
      '<div class="card"><label for="tmMiMin">Grupo</label><select id="tmMiMin">' + mins.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select></div>' +
      '<div id="tmMiCont"></div></details>';
    const ir = () => { const m = mins.find((x) => x.id === $('#tmMiMin').value); if (m) pintarMinisterio($('#tmMiCont'), A(m), { id: m.id, nombre: m.nombre }, periodoActual()); };
    $('#tmMiMin').onchange = ir; ir();
  }

  window.TBMinisterioTablero = { abrir, miembroMostrar, _t: { MOTIVOS, periodoActual } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBMinisterioTablero;
})();
