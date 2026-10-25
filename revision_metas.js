/* F1429 · Revisión mensual de metas (tarea 6.4 de PLAN_TAREAS_IGLESIA.md).
   Miembro con metas: al empezar el mes revisa las metas del mes anterior con 3 preguntas por meta:
   ¿se cumplió?, ¿qué ayudó? y ¿qué lo impidió y qué cambia? Solo ve y guarda SUS revisiones.
   Pastor: ve solo conteos por mes (cumplidas, parciales, no). Sin nombres, sin notas, sin ranking.
   Usa SQL 73: revision_mis_listar, revision_meta_guardar, pastor_revisiones_resumen.
   Lee las metas con lider_mis_metas (SQL 70) para el miembro. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const primera = (d) => (Array.isArray(d) ? d[0] : d);
  const OPCIONES = [['si', 'Sí, se cumplió'], ['parcial', 'Un poco'], ['no', 'No se cumplió']];

  // Mes anterior en formato AAAA-MM (la revisión es del mes que terminó).
  function mesAnterior(hoy) {
    const h = hoy || new Date(); const d = new Date(h.getFullYear(), h.getMonth() - 1, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }
  // Últimos 6 meses (el actual primero), como en metas_lideres.js.
  function periodos(hoy) {
    const h = hoy || new Date(); const out = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(h.getFullYear(), h.getMonth() - i, 1);
      out.push([d.getFullYear() + '-' + pad(d.getMonth() + 1), d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })]);
    }
    return out;
  }
  const textoMes = (periodo) => { const [y, m] = periodo.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); };
  const esPeriodo = (v) => /^[0-9]{4}-[0-9]{2}$/.test(String(v || ''));

  // ----- Miembro -----
  function filaMeta(m, rev) {
    const val = rev ? rev.cumplio : '';
    const radios = OPCIONES.map(([v, t]) => '<label class="rv-op"><input type="radio" name="rv-' + esc(m.id) + '" value="' + v + '"' + (val === v ? ' checked' : '') + '> <span>' + t + '</span></label>').join('');
    return '<li class="rv-item' + (rev ? ' rv-lista' : '') + '" data-rv-meta="' + esc(m.id) + '">' +
      '<p class="rv-titulo">' + esc(m.titulo) + (rev ? ' <span class="rv-ok" aria-label="Revisada">✓ revisada</span>' : '') + '</p>' +
      '<fieldset class="rv-opc"><legend>¿Se cumplió?</legend>' + radios + '</fieldset>' +
      '<label for="rvA-' + esc(m.id) + '">¿Qué ayudó?</label>' +
      '<textarea id="rvA-' + esc(m.id) + '" maxlength="280" rows="2" placeholder="Ej.: El grupo oró por el tema">' + esc(rev ? rev.que_ayudo || '' : '') + '</textarea>' +
      '<label for="rvI-' + esc(m.id) + '">¿Qué lo impidió y qué cambia el próximo mes?</label>' +
      '<textarea id="rvI-' + esc(m.id) + '" maxlength="280" rows="2" placeholder="Ej.: Tuve poco tiempo; este mes lo hago los martes">' + esc(rev ? rev.que_impidio || '' : '') + '</textarea>' +
      '</li>';
  }

  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const periodo = mesAnterior();
    const [rm, rr] = await Promise.all([
      rpcRaw('lider_mis_metas', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_periodo: periodo }),
      rpcRaw('revision_mis_listar', { p_codigo: id.codigo, p_clave: id.clave, p_periodo: periodo }),
    ]);
    const metas = lista(rm);
    if (!metas || !metas.length) { c.innerHTML = ''; return; }
    const revs = new Map((lista(rr) || []).map((x) => [x.meta_id, x]));
    const pendientes = metas.filter((m) => !revs.has(m.id)).length;
    c.innerHTML = '<h2 class="mi-sub">Revisar ' + esc(textoMes(periodo)) + '</h2>' +
      '<div class="card rv-card"><p class="suave m0">' + (pendientes
        ? 'Un momento para mirar cómo te fue. Son 3 preguntas por meta, y puedes escribir poco.'
        : 'Ya revisaste todas tus metas de este mes. ¡Gracias por cuidar lo que te encargaron!') + '</p>' +
      '<ul class="rv-lista-wrap">' + metas.map((m) => filaMeta(m, revs.get(m.id))).join('') + '</ul>' +
      '<p class="suave" id="rvMsg" role="status" aria-live="polite"></p>' +
      '<button type="button" class="btn" id="rvGuardar">Guardar revisión</button></div>';

    const msg = (t, err) => { const m = document.getElementById('rvMsg'); if (m) { m.textContent = t; m.className = err ? 'error' : 'suave'; } };
    document.getElementById('rvGuardar').onclick = async () => {
      const items = Array.from(c.querySelectorAll('[data-rv-meta]'));
      const marcadas = items.filter((li) => li.querySelector('input[type="radio"]:checked'));
      if (!marcadas.length) { msg('Elige si se cumplió al menos una meta.', true); return; }
      let guardadas = 0, fallos = 0;
      for (const li of marcadas) {
        const meta = li.getAttribute('data-rv-meta');
        const cumplio = li.querySelector('input[type="radio"]:checked').value;
        const ayudo = li.querySelector('#rvA-' + meta).value;
        const impidio = li.querySelector('#rvI-' + meta).value;
        const r = await rpcRaw('revision_meta_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_meta: meta, p_periodo: periodo, p_cumplio: cumplio, p_ayudo: ayudo, p_impidio: impidio });
        const g = primera(r && r.data);
        if (r && r.ok && g && g.ok) guardadas++; else fallos++;
      }
      if (fallos) msg('Guardamos ' + guardadas + ' y no pudimos guardar ' + fallos + '. Revisa tu conexión e inténtalo de nuevo.', true);
      else { msg('Listo. Guardamos ' + guardadas + (guardadas === 1 ? ' revisión.' : ' revisiones.'), false); }
    };
  }

  // Mes siguiente de un periodo AAAA-MM.
  function siguientePeriodo(periodo) {
    const [y, m] = periodo.split('-').map(Number); const d = new Date(y, m, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  // Pasa al mes siguiente las metas pendientes del mes elegido. Lo decide el pastor con un toque;
  // no duplica metas que ya estén cargadas en el mes siguiente.
  async function planSiguiente(ctx, p, periodo) {
    const msg = (t, err) => { const m = $('#rvPlanMsg'); if (m) { m.textContent = t; m.className = err ? 'error' : 'suave'; } };
    const btn = $('#rvPlanBtn'); if (btn) btn.disabled = true;
    const sig = siguientePeriodo(periodo);
    const [ro, rd] = await Promise.all([ctx.rpc('pastor_metas_listar', p, { p_periodo: periodo }), ctx.rpc('pastor_metas_listar', p, { p_periodo: sig })]);
    const origen = lista(ro), destino = lista(rd);
    if (btn) btn.disabled = false;
    if (!origen || !destino) { msg('No pudimos leer las metas. Revisa tu conexión e inténtalo de nuevo.', true); return; }
    const pendientes = origen.filter((m) => !m.cumplida);
    if (!pendientes.length) { msg('No hay metas pendientes en ' + textoMes(periodo) + '. No hay nada que pasar.', false); return; }
    const ya = new Set(destino.map((m) => m.miembro_id + '|' + m.titulo));
    let cargadas = 0, saltadas = 0, fallos = 0;
    if (btn) btn.disabled = true;
    for (const m of pendientes) {
      const clave = m.miembro_id + '|' + m.titulo;
      if (ya.has(clave)) { saltadas++; continue; }
      const r = await ctx.rpc('pastor_meta_crear', p, { p_miembro: m.miembro_id, p_titulo: m.titulo, p_periodo: sig });
      if (r && r.ok && r.data && r.data.ok) { cargadas++; ya.add(clave); } else { fallos++; }
    }
    if (btn) btn.disabled = false;
    let texto = 'Pasamos ' + cargadas + (cargadas === 1 ? ' meta' : ' metas') + ' a ' + textoMes(sig) + '.';
    if (saltadas) texto += ' Ya estaban cargadas ' + saltadas + '.';
    if (fallos) texto += ' No se pudieron pasar ' + fallos + '. Puede que alguna persona ya tenga el máximo de metas del mes.';
    msg(texto, fallos > 0 && !cargadas);
  }

  // ----- Pastor: solo conteos -----
  function barra(n, total) { const pct = total ? Math.round((n / total) * 100) : 0; return '<span class="mg-bar" role="img" aria-label="' + n + ' de ' + total + '"><i style="width:' + pct + '%"></i></span>'; }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const meses = periodos();
    const estado = { periodo: mesAnterior() };
    if (!esPeriodo(estado.periodo)) estado.periodo = meses[0][0];

    const pintar = async () => {
      const texto = (meses.find((x) => x[0] === estado.periodo) || [estado.periodo, estado.periodo])[1];
      pant.innerHTML = '<button type="button" class="volver" id="rvVolver">‹ Panel</button><h1 class="cp-titulo">Revisión de metas</h1>' +
        '<p class="suave">Cómo se cumplieron las metas de cada mes, en números. Son para acompañar, no para comparar personas.</p>' +
        '<div class="card"><label for="rvPeriodo">Mes</label><select id="rvPeriodo">' +
        meses.map(([v, t]) => '<option value="' + v + '"' + (v === estado.periodo ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
        '</select></div><h2 class="mi-sub">Resultados de ' + esc(texto) + '</h2><div id="rvResumen"><p class="suave">Cargando…</p></div>' +
        '<h2 class="mi-sub">Plan del mes siguiente</h2><div class="card"><p class="suave m0">Pasa a ' + esc(textoMes(siguientePeriodo(estado.periodo))) + ' las metas que quedaron pendientes en ' + esc(texto) + '. Solo se hace cuando tú lo decides, y no repite metas que ya estén cargadas.</p>' +
        '<button type="button" class="btn" id="rvPlanBtn">Pasar metas pendientes</button><p class="suave" id="rvPlanMsg" role="status" aria-live="polite"></p></div>' +
        '<p class="suave" id="rvMsgP" role="status" aria-live="polite"></p>';
      $('#rvVolver').onclick = ctx.volver;
      $('#rvPeriodo').onchange = () => { estado.periodo = $('#rvPeriodo').value; if (esPeriodo(estado.periodo)) pintar(); };

      const btnPlan = $('#rvPlanBtn'); if (btnPlan) btnPlan.onclick = () => planSiguiente(ctx, p, estado.periodo);
      const r = await ctx.rpc('pastor_revisiones_resumen', p, { p_periodo: estado.periodo });
      const caja = $('#rvResumen'); if (!caja) return;
      const filas = lista(r);
      if (!filas) { caja.innerHTML = '<p class="error" role="alert">No pudimos cargar los resultados. Revisa tu conexión.</p>'; return; }
      const cuenta = { si: 0, parcial: 0, no: 0 };
      filas.forEach((f) => { if (cuenta[f.cumplio] !== undefined) cuenta[f.cumplio] = Number(f.cantidad) || 0; });
      const total = cuenta.si + cuenta.parcial + cuenta.no;
      if (!total) { caja.innerHTML = '<div class="card"><p class="suave m0">Todavía nadie ha hecho la revisión de este mes.</p></div>'; return; }
      caja.innerHTML = '<div class="card"><ul class="cp-lista mg-tend">' +
        [['si', 'Cumplidas'], ['parcial', 'Parciales'], ['no', 'No cumplidas']].map(([k, t]) =>
          '<li><span class="mg-tend-t">' + t + '</span>' + barra(cuenta[k], total) + '<small class="suave">' + cuenta[k] + ' de ' + total + '</small></li>').join('') +
        '</ul><p class="suave m0t">Solo se muestran números: no se ven nombres ni notas.</p></div>';
    };
    await pintar();
  }

  window.TBRevisionMetas = { abrir, miembroMostrar, _t: { mesAnterior, periodos, esPeriodo, siguientePeriodo } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBRevisionMetas;
})();
