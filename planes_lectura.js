// planes_lectura.js · F1433 · Promesa 15: planes de lectura con resultados de la congregación (SQL 85).
// Miembro: envía cuántos días lleva de cada plan (sin nombres). Pastor: ve totales por plan; sin datos si son menos de 5.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);

  // planes: [{ id, n, dias, total }] tomados de la app (dias = días leídos por esta persona).
  async function sincronizar(id, rpcRaw, planes) {
    if (!id || !id.codigo || !id.clave || !Array.isArray(planes)) return;
    for (const pl of planes) {
      if (!pl.dias) continue;   // solo envía los planes que ya empezó
      await rpcRaw('miembro_plan_avance_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_plan: pl.id, p_dias: pl.dias });
    }
  }

  async function abrir(p, ctx, planes) {
    const pant = $('#pantalla'); if (!pant) return;
    const cabecera = '<button type="button" class="volver" id="plVolver">‹ Panel</button><h1 class="cp-titulo">Planes de lectura de la iglesia</h1>';
    pant.innerHTML = cabecera + '<p class="suave">Cargando…</p>';
    const r = await ctx.rpc('pastor_planes_congregacion', p, {});
    const filas = lista(r);
    const nombre = (id) => { const pl = (planes || []).find((x) => x.id === id); return pl ? pl.n : id; };
    const total = (id) => { const pl = (planes || []).find((x) => x.id === id); return pl ? pl.total : null; };
    pant.innerHTML = cabecera +
      '<p class="suave">Cuántas personas de tu iglesia leen cada plan y cuánto llevan en promedio. Solo se muestra un plan con 5 personas o más, para proteger a todos.</p>' +
      (!r.ok ? '<p class="error" role="alert">No pudimos cargar el resumen. Revisa tu conexión.</p>' : '') +
      (filas && filas.length
        ? filas.map((f) => '<div class="card mi-meta-ig"><b>' + esc(nombre(f.plan_id)) + '</b>' +
            '<p class="suave m0">' + f.personas + ' personas leen este plan' + (f.dias_promedio != null ? ' · promedio ' + f.dias_promedio + ' de ' + (total(f.plan_id) || '?') + ' días' : '') + '</p></div>').join('')
        : '<p class="suave">Todavía no hay suficientes personas en un mismo plan para mostrar resultados.</p>');
    $('#plVolver').onclick = ctx.volver;
  }

  window.TBPlanesLectura = { sincronizar, abrir };
})();
