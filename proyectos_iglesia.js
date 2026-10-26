// proyectos_iglesia.js · F1433 · Promesas 9 y 11: proyectos de la iglesia y servicios con voluntarios (SQL 77 y 83).
// Pastor: crear, editar, avance, estado, borrar; marcar un proyecto como servicio con cupo; ver voluntarios.
// Congregación: ver proyectos en curso y servicios; apuntarse o retirarse de un servicio.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const ESTADO = { activo: 'En marcha', pausado: 'Pausado', terminado: 'Terminado' };
  const fechaTxt = (f) => (f ? new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const rango = (p) => [fechaTxt(p.inicio), fechaTxt(p.fin)].filter(Boolean).join(' → ') || 'Sin fechas';
  const barra = (n) => '<div class="mi-barra" role="img" aria-label="' + n + ' por ciento"><i style="width:' + n + '%"></i></div>';
  const MOTIVO = {
    'sin-permiso': 'No tienes permiso para esto. Revisa tu sesión de pastor.',
    'titulo-invalido': 'El título debe tener entre 3 y 120 letras.',
    'texto-largo': 'La descripción o el responsable son demasiado largos.',
    'avance-invalido': 'El avance debe estar entre 0 y 100.',
    'estado-invalido': 'Elige un estado válido.',
    'fechas-invalidas': 'La fecha de término no puede ser antes de la de inicio.',
    'demasiados': 'Ya tienes 100 proyectos. Borra o termina alguno antes de agregar otro.',
    'no-existe': 'Ese proyecto ya no existe.',
    'cupo-invalido': 'El cupo debe ser un número entre 1 y 500.',
    'lleno': 'Este servicio ya no tiene cupos.',
  };

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let proyectos = [], servicios = [], editando = null;
    const cabecera = '<button type="button" class="volver" id="prVolver">‹ Panel</button><h1 class="cp-titulo">Proyectos de la iglesia</h1>';
    const formulario = (v0, esServ, cupo) => {
      const v = v0 || {};
      return '<div class="card"><label for="prTitulo">Proyecto</label><input id="prTitulo" type="text" maxlength="120" value="' + esc(v.titulo || '') + '" placeholder="Ej.: Renovar el salón de jóvenes">' +
        '<label for="prResp">Responsable</label><input id="prResp" type="text" maxlength="80" value="' + esc(v.responsable_texto || '') + '" placeholder="Nombre de la persona a cargo">' +
        '<label for="prDesc">Descripción (opcional)</label><textarea id="prDesc" maxlength="500">' + esc(v.descripcion || '') + '</textarea>' +
        '<label for="prIni">Inicio</label><input id="prIni" type="date" value="' + esc(v.inicio || '') + '">' +
        '<label for="prFin">Término</label><input id="prFin" type="date" value="' + esc(v.fin || '') + '">' +
        '<label for="prAv">Avance (0 a 100)</label><input id="prAv" type="number" min="0" max="100" value="' + esc(v.avance != null ? v.avance : 0) + '">' +
        '<label for="prEst">Estado</label><select id="prEst">' + Object.keys(ESTADO).map((k) => '<option value="' + k + '"' + ((v.estado || 'activo') === k ? ' selected' : '') + '>' + ESTADO[k] + '</option>').join('') + '</select>' +
        '<label><input type="checkbox" id="prEsServ"' + (esServ ? ' checked' : '') + '> Es un servicio a la comunidad (la congregación se puede apuntar)</label>' +
        '<label for="prCupo">Cupo de voluntarios (opcional)</label><input id="prCupo" type="number" min="1" max="500" value="' + esc(cupo || '') + '">' +
        '<p id="prErr" class="error" role="alert" hidden></p>' +
        '<button type="button" class="btn" id="prGuardar">' + (v0 ? 'Guardar cambios' : 'Agregar proyecto') + '</button>' +
        (v0 ? ' <button type="button" class="btn sec" id="prCancelar">Cancelar</button>' : '') + '</div>';
    };
    const tarjetaPastor = (x) => {
      const s = servicios.find((y) => y.id === x.id);
      return '<div class="card mi-meta-ig"><b>' + esc(x.titulo) + '</b>' +
        '<p class="suave m0">' + esc(x.responsable_texto || 'Sin responsable') + ' · ' + esc(rango(x)) + ' · ' + esc(ESTADO[x.estado] || x.estado) + '</p>' +
        barra(x.avance) + '<p class="suave m0">' + x.avance + ' %</p>' +
        (s ? '<p class="suave m0">Servicio · ' + s.inscritos + (s.cupo ? ' de ' + s.cupo : '') + ' voluntarios</p>' +
             '<button type="button" class="cp-mini" data-pr-vol="' + esc(x.id) + '">Ver voluntarios</button><div id="prv-' + esc(x.id) + '"></div>' : '') +
        '<div class="rl-acc"><button type="button" class="cp-mini" data-pr-edit="' + esc(x.id) + '">Editar</button> ' +
        '<button type="button" class="cp-mini" data-pr-borrar="' + esc(x.id) + '">Borrar</button></div></div>';
    };

    const pintar = async () => {
      pant.innerHTML = cabecera + '<p class="suave">Cargando…</p>';
      const [rp, rs] = await Promise.all([ctx.rpc('pastor_proyectos_listar', p, {}), ctx.rpc('pastor_servicios_listar', p, {})]);
      proyectos = lista(rp) || [];
      servicios = lista(rs) || [];
      const sub = editando ? proyectos.find((x) => x.id === editando) : null;
      const sv = sub ? servicios.find((y) => y.id === sub.id) : null;
      pant.innerHTML = cabecera +
        '<p class="suave">Cada proyecto tiene responsable, fechas y avance. Un servicio además deja que la congregación se apunte.</p>' +
        (!rp.ok ? '<p class="error" role="alert">No pudimos cargar los proyectos. Revisa tu conexión.</p>' : '') +
        '<h2 class="mi-sub">' + (sub ? 'Editar proyecto' : 'Nuevo proyecto') + '</h2>' + formulario(sub, !!sv, sv ? sv.cupo : null) +
        '<h2 class="mi-sub">Proyectos</h2>' + (proyectos.length ? proyectos.map(tarjetaPastor).join('') : '<p class="suave">Todavía no hay proyectos.</p>') +
        '<p class="suave" id="prMsg" role="status" aria-live="polite"></p>';
      $('#prVolver').onclick = ctx.volver;
      $('#prGuardar').onclick = guardar;
      const cancel = $('#prCancelar'); if (cancel) cancel.onclick = () => { editando = null; pintar(); };
      document.querySelectorAll('[data-pr-edit]').forEach((b) => { b.onclick = () => { editando = b.getAttribute('data-pr-edit'); pintar(); }; });
      document.querySelectorAll('[data-pr-borrar]').forEach((b) => { b.onclick = () => borrar(b.getAttribute('data-pr-borrar')); });
      document.querySelectorAll('[data-pr-vol]').forEach((b) => { b.onclick = () => verVoluntarios(b.getAttribute('data-pr-vol')); });
    };
    const error = (msg) => { const e = $('#prErr'); e.textContent = msg; e.hidden = false; };
    const guardar = async () => {
      const titulo = $('#prTitulo').value.trim();
      if (titulo.length < 3) return error('El título debe tener al menos 3 letras.');
      const av = parseInt($('#prAv').value, 10);
      if (isNaN(av) || av < 0 || av > 100) return error('El avance debe estar entre 0 y 100.');
      const esServ = $('#prEsServ').checked;
      const cupoTxt = $('#prCupo').value.trim();
      const cupo = cupoTxt === '' ? null : parseInt(cupoTxt, 10);
      if (esServ && cupo !== null && (isNaN(cupo) || cupo < 1 || cupo > 500)) return error('El cupo debe ser un número entre 1 y 500.');
      const row = lista(await ctx.rpc('pastor_proyecto_guardar', p, {
        p_id: editando, p_titulo: titulo, p_descripcion: $('#prDesc').value.trim() || null,
        p_responsable: $('#prResp').value.trim() || null, p_inicio: $('#prIni').value || null, p_fin: $('#prFin').value || null,
        p_avance: av, p_estado: $('#prEst').value }))?.[0];
      if (!row || !row.ok) return error(MOTIVO[row && row.motivo] || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
      const sv = lista(await ctx.rpc('pastor_servicio_guardar', p, { p_id: row.proyecto_id, p_es_servicio: esServ, p_cupo: esServ ? cupo : null }))?.[0];
      if (!sv || !sv.ok) return error(MOTIVO[sv && sv.motivo] || 'El proyecto se guardó, pero no se pudo marcar como servicio.');
      editando = null; await pintar(); const m = $('#prMsg'); if (m) m.textContent = 'Proyecto guardado.';
    };
    const borrar = async (id) => {
      if (!confirm('¿Borrar este proyecto?')) return;
      const row = lista(await ctx.rpc('pastor_proyecto_borrar', p, { p_id: id }))?.[0];
      if (!row || !row.ok) { const m = $('#prMsg'); if (m) m.textContent = MOTIVO[row && row.motivo] || 'No se pudo borrar.'; return; }
      if (editando === id) editando = null;
      await pintar();
    };
    const verVoluntarios = async (id) => {
      const box = document.getElementById('prv-' + id); if (!box) return;
      const r = lista(await ctx.rpc('pastor_servicio_voluntarios', p, { p_proyecto: id }));
      box.innerHTML = r && r.length ? '<ul class="suave">' + r.map((x) => '<li>' + esc(x.nombre) + '</li>').join('') + '</ul>' : '<p class="suave">Todavía nadie se ha apuntado.</p>';
    };
    await pintar();
  }

  // Congregación: proyectos en curso (solo lectura) y servicios (apuntarse).
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const [rp, rs] = await Promise.all([
      rpcRaw('iglesia_proyectos_listar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null }),
      rpcRaw('iglesia_servicios_listar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null }),
    ]);
    const proyectos = (lista(rp) || []).filter((x) => !(lista(rs) || []).some((y) => y.id === x.id));
    const servicios = lista(rs) || [];
    if (!proyectos.length && !servicios.length) { c.innerHTML = ''; return; }
    const proy = proyectos.map((p) =>
      '<div class="card mi-meta-ig"><b>' + esc(p.titulo) + '</b>' +
      '<p class="suave m0">' + esc(p.responsable_texto ? 'Responsable: ' + p.responsable_texto : 'Sin responsable') + ' · ' + esc(rango(p)) + '</p>' +
      barra(p.avance) + '<p class="suave m0">' + p.avance + ' % · ' + esc(ESTADO[p.estado] || p.estado) + '</p>' +
      (p.descripcion ? '<p class="m0">' + esc(p.descripcion) + '</p>' : '') + '</div>').join('');
    c.innerHTML = '<h2 class="mi-sub">Proyectos de la iglesia</h2>' + proy +
      (servicios.length ? '<h2 class="mi-sub">Servicios a la comunidad</h2>' + servicios.map((s) => {
        const lleno = s.cupo != null && s.inscritos >= s.cupo && !s.yo;
        return '<div class="card mi-meta-ig"><b>' + esc(s.titulo) + '</b>' +
          '<p class="suave m0">' + esc(s.responsable_texto ? 'Responsable: ' + s.responsable_texto : 'Sin responsable') + (s.fin ? ' · hasta ' + esc(fechaTxt(s.fin)) : '') + '</p>' +
          (s.descripcion ? '<p class="m0">' + esc(s.descripcion) + '</p>' : '') +
          '<p class="suave m0">' + s.inscritos + (s.cupo != null ? ' de ' + s.cupo : '') + ' apuntados</p>' +
          '<button type="button" class="btn ' + (s.yo ? 'sec' : '') + ' chico" data-sv="' + esc(s.id) + '" data-yo="' + (s.yo ? '1' : '0') + '"' + (lleno ? ' disabled' : '') + '>' +
          (s.yo ? 'Ya no me apunto' : lleno ? 'Sin cupos' : 'Me apunto') + '</button></div>';
      }).join('') + '<p class="suave" id="svMsg" role="status" aria-live="polite"></p>' : '');
    c.querySelectorAll('[data-sv]').forEach((b) => {
      b.onclick = async () => {
        const yo = b.getAttribute('data-yo') === '1';
        const r = await rpcRaw('miembro_servicio_inscribir', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_proyecto: b.getAttribute('data-sv'), p_inscribir: !yo });
        const row = lista(r);
        const f = row && row[0];
        if (!f || !f.ok) { const m = document.getElementById('svMsg'); if (m) m.textContent = MOTIVO[f && f.motivo] || 'No se pudo completar. Revisa tu conexión.'; return; }
        miembroMostrar(contenedorId, id, rpcRaw);
      };
    });
  }

  window.TBProyectosIglesia = { abrir, miembroMostrar };
})();
