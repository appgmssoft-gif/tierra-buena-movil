// clases.js · F1433 · Promesa 14: clases y escuela dominical (SQL 82). Un ministerio marcado como clase tiene horario y profesor.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const MOTIVO = { 'sin-permiso': 'No tienes permiso para esto. Revisa tu sesión de pastor.', 'horario-largo': 'El horario es demasiado largo (máximo 80 letras).', 'no-existe': 'Ese ministerio ya no existe.' };

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const cabecera = '<button type="button" class="volver" id="claVolver">‹ Panel</button><h1 class="cp-titulo">Clases y escuela dominical</h1>';
    const pintar = async () => {
      pant.innerHTML = cabecera + '<p class="suave">Cargando…</p>';
      const r = await ctx.rpc('pastor_clases_listar', p, {});
      const todos = lista(r);
      if (!todos) { pant.innerHTML = cabecera + '<p class="error" role="alert">No pudimos cargar las clases. Revisa tu conexión.</p>'; $('#claVolver').onclick = ctx.volver; return; }
      const clases = todos.filter((x) => x.tipo === 'clase');
      pant.innerHTML = cabecera +
        '<p class="suave">Marca un ministerio como clase, ponle su horario. Su profesor es el líder del ministerio y sus alumnos son sus miembros.</p>' +
        '<h2 class="mi-sub">Configurar</h2><div class="card">' +
        '<label for="claMin">Ministerio</label><select id="claMin">' + todos.map((x) => '<option value="' + esc(x.id) + '" data-tipo="' + esc(x.tipo) + '" data-horario="' + esc(x.horario || '') + '">' + esc(x.nombre) + '</option>').join('') + '</select>' +
        '<label><input type="checkbox" id="claEs"> Es una clase de escuela dominical</label>' +
        '<label for="claHor">Horario</label><input id="claHor" type="text" maxlength="80" placeholder="Ej.: Domingos 10:00">' +
        '<p id="claErr" class="error" role="alert" hidden></p>' +
        '<button type="button" class="btn" id="claGuardar">Guardar</button></div>' +
        '<h2 class="mi-sub">Clases de la iglesia</h2>' +
        (clases.length ? clases.map((x) => '<div class="card mi-meta-ig"><b>' + esc(x.nombre) + '</b>' +
          '<p class="suave m0">' + esc(x.horario || 'Sin horario') + ' · ' + esc(x.profesores ? 'Profesor: ' + x.profesores : 'Sin profesor') + ' · ' + x.alumnos + ' alumnos</p></div>').join('')
          : '<p class="suave">Todavía no hay clases. Marca un ministerio como clase para verla aquí.</p>') +
        '<p class="suave" id="claMsg" role="status" aria-live="polite"></p>';
      $('#claVolver').onclick = ctx.volver;
      const cargarForm = () => {
        const op = $('#claMin').selectedOptions[0]; if (!op) return;
        $('#claEs').checked = op.getAttribute('data-tipo') === 'clase';
        $('#claHor').value = op.getAttribute('data-horario') || '';
      };
      $('#claMin').onchange = cargarForm; cargarForm();
      $('#claGuardar').onclick = async () => {
        const err = $('#claErr'), msg = $('#claMsg'); err.hidden = true; msg.textContent = '';
        const row = lista(await ctx.rpc('pastor_clase_guardar', p, { p_ministerio: $('#claMin').value, p_es_clase: $('#claEs').checked, p_horario: $('#claHor').value.trim() || null }))?.[0];
        if (!row || !row.ok) { err.textContent = MOTIVO[row && row.motivo] || 'No se pudo guardar. Revisa tu conexión.'; err.hidden = false; return; }
        await pintar(); const m = $('#claMsg'); if (m) m.textContent = 'Guardado.';
      };
    };
    await pintar();
  }


  // Miembros: horario y profesor de las clases de su iglesia (solo lectura, SQL 84).
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('miembro_clases_listar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null });
    const clases = lista(r);
    if (!clases || !clases.length) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Escuela dominical y clases</h2>' + clases.map((x) =>
      '<div class="card mi-meta-ig"><b>' + esc(x.nombre) + '</b>' +
      '<p class="suave m0">' + esc(x.horario || 'Sin horario') + (x.profesores ? ' · Profesor: ' + esc(x.profesores) : '') + '</p>' +
      (x.yo_estoy ? '<p class="m0">Tú estás en esta clase.</p>' : '') + '</div>').join('');
  }

  window.TBClases = { abrir, miembroMostrar };
})();
