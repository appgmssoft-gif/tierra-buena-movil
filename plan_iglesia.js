// plan_iglesia.js · F1433 · Promesa 10: plan de trabajo de toda la iglesia, por mes (SQL 78 y 79).
// Pastor: objetivo del mes y acciones con responsable (marcar, quitar). Congregación: solo lectura.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const periodo = (h) => { const d = h || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const mesTxt = () => new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const MOTIVO = {
    'sin-permiso': 'No tienes permiso para esto. Revisa tu sesión de pastor.',
    'texto-invalido': 'La acción debe tener entre 2 y 200 letras.',
    'texto-largo': 'El objetivo es demasiado largo (máximo 200 letras).',
    'responsable-invalido': 'Esa persona no es parte de tu iglesia.',
    'demasiadas': 'Ya hay 30 acciones este mes.',
    'no-existe': 'Esa acción ya no existe.',
    'periodo-invalido': 'El mes no es válido.',
  };

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const per = periodo();
    const cabecera = '<button type="button" class="volver" id="pinVolver">‹ Panel</button><h1 class="cp-titulo">Plan de la iglesia</h1>';
    let plan = { objetivo: '', acciones: [] }, miembros = [];

    const acciones = () => plan.acciones.length
      ? plan.acciones.map((a) => '<label class="card mi-meta-ig" style="display:flex;gap:10px;align-items:flex-start">' +
          '<input type="checkbox" data-pin-hecha="' + esc(a.id) + '"' + (a.hecha ? ' checked' : '') + ' aria-label="Hecha: ' + esc(a.texto) + '">' +
          '<span style="flex:1"><span' + (a.hecha ? ' style="text-decoration:line-through"' : '') + '>' + esc(a.texto) + '</span>' +
          '<br><span class="suave">' + esc(a.responsable ? 'Responsable: ' + a.responsable : 'Sin responsable') + '</span></span>' +
          '<button type="button" class="cp-mini" data-pin-quitar="' + esc(a.id) + '">Quitar</button></label>').join('')
      : '<p class="suave">Todavía no hay acciones este mes.</p>';

    const pintar = async () => {
      pant.innerHTML = cabecera + '<p class="suave">Plan de ' + esc(mesTxt()) + '. Lo ve toda la iglesia.</p><p class="suave">Cargando…</p>';
      const [rp, rm] = await Promise.all([
        ctx.rpc('iglesia_plan_leer', p, { p_clave: null, p_periodo: per }),
        ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }),
      ]);
      const fila = (lista(rp) || [])[0] || {};
      plan = { objetivo: fila.objetivo || '', acciones: Array.isArray(fila.acciones) ? fila.acciones : [] };
      miembros = lista(rm) || [];
      pant.innerHTML = cabecera +
        '<p class="suave">Plan de ' + esc(mesTxt()) + '. Lo ve toda la iglesia.</p>' +
        (!rp.ok ? '<p class="error" role="alert">No pudimos cargar el plan. Revisa tu conexión.</p>' : '') +
        '<h2 class="mi-sub">Objetivo del mes</h2><div class="card">' +
        '<label for="pinObj">¿Qué queremos lograr este mes?</label><textarea id="pinObj" maxlength="200">' + esc(plan.objetivo) + '</textarea>' +
        '<button type="button" class="btn" id="pinGuardarObj">Guardar objetivo</button></div>' +
        '<h2 class="mi-sub">Nueva acción</h2><div class="card">' +
        '<label for="pinTexto">Acción</label><input id="pinTexto" type="text" maxlength="200" placeholder="Ej.: Visitar a las familias nuevas">' +
        '<label for="pinResp">Responsable</label><select id="pinResp"><option value="">Sin responsable</option>' +
        miembros.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select>' +
        '<p id="pinErr" class="error" role="alert" hidden></p>' +
        '<button type="button" class="btn" id="pinAgregar">Agregar acción</button></div>' +
        '<h2 class="mi-sub">Acciones del mes</h2>' + acciones() +
        '<p class="suave" id="pinMsg" role="status" aria-live="polite"></p>';
      $('#pinVolver').onclick = ctx.volver;
      $('#pinGuardarObj').onclick = guardarObjetivo;
      $('#pinAgregar').onclick = agregar;
      document.querySelectorAll('[data-pin-hecha]').forEach((c) => { c.onchange = () => marcar(c.getAttribute('data-pin-hecha'), c.checked); });
      document.querySelectorAll('[data-pin-quitar]').forEach((b) => { b.onclick = () => quitar(b.getAttribute('data-pin-quitar')); });
    };
    const msg = (t) => { const m = $('#pinMsg'); if (m) m.textContent = t; };
    const guardarObjetivo = async () => {
      const r = lista(await ctx.rpc('pastor_plan_iglesia_guardar', p, { p_periodo: per, p_objetivo: $('#pinObj').value.trim() || null }));
      const row = r && r[0];
      if (!row || !row.ok) return msg(MOTIVO[row && row.motivo] || 'No se pudo guardar el objetivo.');
      plan.objetivo = $('#pinObj').value.trim(); msg('Objetivo guardado.');
    };
    const agregar = async () => {
      const err = $('#pinErr'); err.hidden = true;
      const texto = $('#pinTexto').value.trim();
      if (texto.length < 2) { err.textContent = 'La acción debe tener al menos 2 letras.'; err.hidden = false; return; }
      const row = lista(await ctx.rpc('pastor_plan_iglesia_accion', p, { p_periodo: per, p_accion: null, p_texto: texto, p_responsable: $('#pinResp').value || null, p_hecha: false, p_borrar: false }))?.[0];
      if (!row || !row.ok) { err.textContent = MOTIVO[row && row.motivo] || 'No se pudo agregar. Revisa tu conexión.'; err.hidden = false; return; }
      await pintar(); msg('Acción agregada.');
    };
    const marcar = async (id, hecha) => {
      const a = plan.acciones.find((x) => x.id === id); if (!a) return;
      const row = lista(await ctx.rpc('pastor_plan_iglesia_accion', p, { p_periodo: per, p_accion: id, p_texto: a.texto, p_responsable: a.responsable_id || null, p_hecha: hecha, p_borrar: false }))?.[0];
      if (!row || !row.ok) { msg(MOTIVO[row && row.motivo] || 'No se pudo marcar.'); return pintar(); }
      a.hecha = hecha; msg(hecha ? 'Marcada como hecha.' : 'Desmarcada.');
    };
    const quitar = async (id) => {
      if (!confirm('¿Quitar esta acción del plan?')) return;
      const row = lista(await ctx.rpc('pastor_plan_iglesia_accion', p, { p_periodo: per, p_accion: id, p_texto: null, p_responsable: null, p_hecha: null, p_borrar: true }))?.[0];
      if (!row || !row.ok) return msg(MOTIVO[row && row.motivo] || 'No se pudo quitar.');
      await pintar(); msg('Acción quitada.');
    };
    await pintar();
  }

  // Congregación: solo lectura.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('iglesia_plan_leer', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_periodo: periodo() });
    const fila = (lista(r) || [])[0];
    const acc = fila && Array.isArray(fila.acciones) ? fila.acciones : [];
    if (!fila || (!fila.objetivo && !acc.length)) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Plan de la iglesia este mes</h2>' +
      (fila.objetivo ? '<p class="card m0">' + esc(fila.objetivo) + '</p>' : '') +
      acc.map((a) => '<div class="card mi-meta-ig"><span' + (a.hecha ? ' style="text-decoration:line-through"' : '') + '>' + esc(a.texto) + '</span>' +
        '<p class="suave m0">' + (a.hecha ? 'Hecha' : 'Pendiente') + (a.responsable ? ' · ' + esc(a.responsable) : '') + '</p></div>').join('');
  }

  window.TBPlanIglesia = { abrir, miembroMostrar };
})();
