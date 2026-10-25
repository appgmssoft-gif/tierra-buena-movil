/* F1429 · Archivos por ministerio (tarea 6.11 de PLAN_TAREAS_IGLESIA.md).
   Enlaces a documentos y carpetas de cada ministerio (solo https://).
   Pastor: agrega y borra en cualquier ministerio. Líder: agrega y borra en SU ministerio.
   Miembro: ve los de sus ministerios (y los agrega si lidera uno).
   Usa SQL 73: archivo_listar, archivo_guardar, archivo_borrar. Ministerios: ministerio_pastor_listar (pastor), miembro_mis_ministerios (miembro). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const primera = (d) => (Array.isArray(d) ? d[0] : d);
  const TEXTO_MOTIVO = {
    'sin-permiso': 'Tu clave no tiene permiso para esto.',
    'titulo-invalido': 'El título debe tener entre 2 y 80 letras.',
    'enlace-invalido': 'El enlace debe empezar con https:// (por ejemplo, https://drive.google.com/...).',
    'demasiados': 'Este ministerio ya tiene 200 archivos. Borra alguno para agregar más.',
    'no-existe': 'Ese archivo ya no está.',
  };
  const esEnlaceSeguro = (u) => /^https:\/\/\S{4,}$/.test(String(u || '').trim()) && String(u).trim().length <= 500;

  // Lista agrupada por ministerio (sin ranking ni números).
  function listaHTML(items, pastor) {
    if (!items || !items.length) return '<p class="suave">Todavía no hay archivos aquí.</p>';
    const grupos = new Map();
    items.forEach((a) => { if (!grupos.has(a.ministerio)) grupos.set(a.ministerio, []); grupos.get(a.ministerio).push(a); });
    return Array.from(grupos.entries()).map(([nombre, arr]) =>
      '<div class="card arc-grupo"><b>' + esc(nombre) + '</b><ul class="cp-lista arc-lista">' +
      arr.map((a) => '<li class="arc-item"><div class="arc-txt"><a href="' + esc(a.enlace) + '" target="_blank" rel="noopener noreferrer">' + esc(a.titulo) + '</a>' +
        (a.nota ? '<small class="suave">' + esc(a.nota) + '</small>' : '') + '</div>' +
        (a.puede_borrar ? '<button type="button" class="cp-mini cp-borrar" data-arc-borrar="' + esc(a.id) + '">Borrar</button>' : '') + '</li>').join('') +
      '</ul></div>').join('');
  }

  function formHTML(opciones, idSel) {
    return '<div class="card arc-form"><label for="' + idSel + '">Ministerio</label><select id="' + idSel + '">' +
      opciones.map((o) => '<option value="' + esc(o.id) + '">' + esc(o.nombre) + '</option>').join('') + '</select>' +
      '<label for="' + idSel + 'T">Título</label><input id="' + idSel + 'T" type="text" maxlength="80" placeholder="Ej.: Plan de lectura de noviembre" autocomplete="off">' +
      '<label for="' + idSel + 'E">Enlace (https)</label><input id="' + idSel + 'E" type="url" maxlength="500" placeholder="https://..." autocomplete="off">' +
      '<label for="' + idSel + 'N">Nota (opcional)</label><input id="' + idSel + 'N" type="text" maxlength="200" autocomplete="off">' +
      '<p class="error" id="' + idSel + 'Err" role="alert" hidden></p>' +
      '<button type="button" class="btn" id="' + idSel + 'Btn">Agregar archivo</button></div>';
  }

  // ----- Pastor -----
  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="arcVolver">‹ Panel</button><h1 class="cp-titulo">Archivos por ministerio</h1>' +
        '<p class="suave">Enlaces a documentos y carpetas de cada grupo, en un solo lugar.</p>' +
        '<div id="arcForm"><p class="suave">Cargando…</p></div><h2 class="mi-sub">Archivos</h2><div id="arcLista"><p class="suave">Cargando…</p></div>';
      $('#arcVolver').onclick = ctx.volver;
      const [rm, ra] = await Promise.all([ctx.rpc('ministerio_pastor_listar', p, {}), ctx.rpc('archivo_listar', p, { p_clave: null })]);
      const ministerios = lista(rm) || [];
      const archivos = lista(ra);
      $('#arcForm').innerHTML = ministerios.length ? formHTML(ministerios, 'arcMin') : '<p class="suave">Primero crea un ministerio en «Ministerios y líderes».</p>';
      $('#arcLista').innerHTML = archivos === null ? '<p class="error" role="alert">No pudimos cargar los archivos. Revisa tu conexión.</p>' : listaHTML(archivos, true);
      if (ministerios.length) conectarForm(ctx, p, null, pintar);
      conectarBorrar(ctx, p, null, pintar);
    };
    await pintar();
  }

  // Conecta el formulario de agregar. p = {codigo, secreto} (pastor) o null.
  function conectarForm(ctx, p, miembro, alTerminar) {
    const btn = $('#arcMinBtn'); if (!btn) return;
    btn.onclick = async () => {
      const err = $('#arcMinErr'); err.hidden = true;
      const titulo = $('#arcMinT').value.trim(), enlace = $('#arcMinE').value.trim(), nota = $('#arcMinN').value.trim();
      const min = $('#arcMin').value;
      if (titulo.length < 2) { err.textContent = TEXTO_MOTIVO['titulo-invalido']; err.hidden = false; return; }
      if (!esEnlaceSeguro(enlace)) { err.textContent = TEXTO_MOTIVO['enlace-invalido']; err.hidden = false; return; }
      const args = { p_ministerio: min, p_titulo: titulo, p_enlace: enlace, p_nota: nota, p_clave: miembro ? miembro.clave : null };
      const r = miembro ? await miembro.rpcRaw('archivo_guardar', Object.assign({ p_codigo: miembro.codigo, p_secreto: null }, args))
                        : await ctx.rpc('archivo_guardar', p, args);
      const g = primera(r && r.data);
      if (r && r.ok && g && g.ok) { alTerminar(); return; }
      err.textContent = (g && TEXTO_MOTIVO[g.motivo]) || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
      err.hidden = false;
    };
  }

  // Conecta los botones Borrar. Pastor: p. Miembro: miembro = {codigo, clave, rpcRaw}.
  function conectarBorrar(ctx, p, miembro, alTerminar) {
    document.querySelectorAll('[data-arc-borrar]').forEach((b) => {
      b.onclick = async () => {
        if (!confirm('¿Quitar este archivo? Los demás no se afectan.')) return;
        const id = b.getAttribute('data-arc-borrar');
        const r = miembro ? await miembro.rpcRaw('archivo_borrar', { p_codigo: miembro.codigo, p_secreto: null, p_clave: miembro.clave, p_id: id })
                          : await ctx.rpc('archivo_borrar', p, { p_clave: null, p_id: id });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) alTerminar();
        else { const m = $('#arcMsg'); if (m) { m.textContent = (g && TEXTO_MOTIVO[g.motivo]) || 'No se pudo quitar. Revisa tu conexión.'; } }
      };
    });
  }

  // ----- Miembro -----
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const pintar = async () => {
      const [ra, rmm] = await Promise.all([
        rpcRaw('archivo_listar', { p_codigo: id.codigo, p_secreto: null, p_clave: id.clave }),
        rpcRaw('miembro_mis_ministerios', { p_codigo: id.codigo, p_clave: id.clave }),
      ]);
      const archivos = lista(ra) || [];
      const lidero = (lista(rmm) || []).filter((x) => x.es_lider && x.id).map((x) => ({ id: x.id, nombre: x.nombre }));
      if (!archivos.length && !lidero.length) { c.innerHTML = ''; return; }
      c.innerHTML = '<h2 class="mi-sub">Archivos de mis grupos</h2>' + listaHTML(archivos, false) +
        '<p class="suave" id="arcMsg" role="status" aria-live="polite"></p>' +
        (lidero.length ? '<details class="pf-grupo mi-grupo"><summary>Agregar un archivo a mi grupo</summary>' + formHTML(lidero, 'arcMin') + '</details>' : '');
      const miembro = { codigo: id.codigo, clave: id.clave, rpcRaw };
      if (lidero.length) conectarForm(null, null, miembro, pintar);
      conectarBorrar(null, null, miembro, pintar);
    };
    await pintar();
  }

  window.TBArchivos = { abrir, miembroMostrar, _t: { esEnlaceSeguro, TEXTO_MOTIVO } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBArchivos;
})();
