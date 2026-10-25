/* F1428 · Salud de la iglesia (tareas 6.8 y 6.9 de PLAN_TAREAS_IGLESIA.md). Sin SQL nuevo.
   Muestra, en lenguaje simple, cómo va la iglesia en el período elegido y compara con el período anterior.
   Usa solo funciones que ya existen: pastor_miembros_listar, visita_pastor_listar, peticion_pastor_listar(_v2),
   pastor_asistencia_indicadores. Si una falla, esa tarjeta dice qué pasó y las demás siguen.
   Reporte: descarga CSV (abre en Excel) con los mismos números, con protección contra fórmulas.
   No compara iglesias entre sí ni hace rankings (principio del producto). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const PERIODOS = [[1, '1 mes'], [3, '3 meses'], [12, '12 meses']];
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // Rangos: el período actual termina hoy; el anterior tiene la misma duración justo antes.
  function rangos(meses, hoy) {
    const h = hoy || new Date();
    const desde = new Date(h.getFullYear(), h.getMonth() - (meses - 1), 1);
    const finPrev = new Date(desde.getFullYear(), desde.getMonth(), 0);
    const desdePrev = new Date(h.getFullYear(), h.getMonth() - (2 * meses - 1), 1);
    return { desde: iso(desde), hasta: iso(h), desdePrev: iso(desdePrev), hastePrev: iso(finPrev) };
  }
  // Lista segura: acepta la respuesta de la base o un arreglo directo.
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);

  // Comparación en lenguaje claro: «sube», «baja» o «igual», sin juzgar.
  function tendencia(actual, antes) {
    if (antes == null || actual == null) return '';
    if (actual === antes) return 'igual que antes';
    const pct = antes ? Math.round(((actual - antes) / antes) * 100) : null;
    return actual > antes ? 'subió' + (pct != null ? ' ' + pct + ' %' : '') : 'bajó' + (pct != null ? ' ' + Math.abs(pct) + ' %' : '');
  }

  // Reúne todos los números del período. Cada parte es independiente: si una falla, queda en null.
  async function calcular(p, ctx, meses) {
    const r = rangos(meses);
    const [mie, vis, ora, asi, asiPrev] = await Promise.all([
      ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }),
      ctx.rpc('visita_pastor_listar', p),
      ctx.rpc('peticion_pastor_listar_v2', p).then((x) => (x.ok || !x.falta ? x : ctx.rpc('peticion_pastor_listar', p))),
      ctx.rpc('pastor_asistencia_indicadores', p, { p_desde: r.desde, p_hasta: r.hasta }),
      ctx.rpc('pastor_asistencia_indicadores', p, { p_desde: r.desdePrev, p_hasta: r.hastePrev }),
    ]);
    const miembros = lista(mie);
    const visitas = lista(vis);
    const peticiones = lista(ora);
    const dAsi = asi && asi.ok ? (Array.isArray(asi.data) ? asi.data[0] : asi.data) : null;
    const dPrev = asiPrev && asiPrev.ok ? (Array.isArray(asiPrev.data) ? asiPrev.data[0] : asiPrev.data) : null;
    return {
      meses,
      personas: miembros ? { total: miembros.length, lideres: miembros.filter((m) => m.es_lider).length,
        conTelefono: miembros.filter((m) => String(m.telefono || '').trim()).length } : null,
      visitasPendientes: visitas ? visitas.filter((v) => v.estado === 'solicitada').length : null,
      oracionesAbiertas: peticiones ? peticiones.length : null,
      sesiones: dAsi && dAsi.ok !== false ? Number(dAsi.sesiones || 0) : null,
      asistencias: dAsi && dAsi.ok !== false ? Number(dAsi.asistencias || 0) : null,
      asistenciasAntes: dPrev && dPrev.ok !== false ? Number(dPrev.asistencias || 0) : null,
      fallas: [mie, vis, ora, asi].filter((x) => !x || !x.ok).length,
    };
  }

  // Tarjeta de un número. «valor» null = todavía no hay datos de esa parte.
  function tarjeta(titulo, valor, nota, ico) {
    const v = valor == null ? '<span class="suave">sin datos</span>' : '<b class="sh-num">' + esc(valor) + '</b>';
    return '<div class="sh-card"><span class="sh-ico" aria-hidden="true">' + ico + '</span><span class="sh-t">' + esc(titulo) + '</span>' +
      '<span class="sh-v">' + v + '</span>' + (nota ? '<small class="suave">' + esc(nota) + '</small>' : '') + '</div>';
  }

  function pantallaHTML(n, meses, antes) {
    const pl = n.personas;
    const asistNota = n.sesiones == null ? 'No pudimos cargar la asistencia. Revisa tu conexión.'
      : (n.sesiones === 0 ? 'Todavía no hay actividades con asistencia en este período.'
        : n.sesiones + (n.sesiones === 1 ? ' actividad' : ' actividades') + ' · ' + tendencia(n.asistencias, n.asistenciasAntes) + ' que el período anterior');
    return '<button type="button" class="volver" id="shVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Salud de la iglesia</h1>' +
      '<p class="suave">Cómo va tu iglesia en los últimos ' + esc(PERIODOS.find((x) => x[0] === meses)[1]) + '. Son números para acompañar, no para comparar con otras iglesias.</p>' +
      '<div class="sh-filtros" role="radiogroup" aria-label="Período">' + PERIODOS.map((x) =>
        '<button type="button" role="radio" class="cp-chip' + (x[0] === meses ? ' on' : '') + '" aria-checked="' + (x[0] === meses) + '" data-m="' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div>' +
      '<div class="sh-grid">' +
      tarjeta('Personas en la iglesia', pl ? pl.total : null, pl ? pl.lideres + ' líderes · ' + pl.conTelefono + ' con teléfono' : '', '👥') +
      tarjeta('Visitas por atender', n.visitasPendientes, n.visitasPendientes === 0 ? 'Ninguna pendiente' : 'Pedidas y aún sin respuesta', '🏠') +
      tarjeta('Peticiones de oración', n.oracionesAbiertas, 'Registradas en la app', '🙏') +
      tarjeta('Asistencia del período', n.asistencias, asistNota, '✅') +
      '</div>' +
      (n.fallas ? '<p class="error" role="alert">Algunos datos no cargaron (' + n.fallas + '). Los demás se muestran igual. Reintenta más tarde.</p>' : '') +
      '<div class="card sh-rep"><h2 class="mi-sub">Reporte para la junta o para tus líderes</h2>' +
      '<p class="suave">Descarga los números de este período en un archivo que se abre con Excel.</p>' +
      '<button type="button" class="btn sec" id="shBajar">⬇ Descargar reporte del período</button>' +
      '<p class="suave" id="shMsg" role="status" aria-live="polite"></p></div>';
  }

  // Protección contra fórmulas de Excel (igual que en el resto de la app).
  function celda(v) {
    let t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    if (/^[=+\-@]/.test(t) && !/^\+\d[\d ]*$/.test(t)) t = "'" + t;
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function csvReporte(n, meses) {
    const filas = [['Indicador', 'Valor', 'Período']];
    const per = PERIODOS.find((x) => x[0] === meses)[1];
    const add = (k, v) => filas.push([k, v == null ? 'sin datos' : v, per]);
    add('Personas en la iglesia', n.personas && n.personas.total);
    add('Líderes', n.personas && n.personas.lideres);
    add('Personas con teléfono', n.personas && n.personas.conTelefono);
    add('Visitas por atender', n.visitasPendientes);
    add('Peticiones de oración', n.oracionesAbiertas);
    add('Actividades con asistencia', n.sesiones);
    add('Asistencias', n.asistencias);
    add('Asistencias del período anterior', n.asistenciasAntes);
    return '\uFEFF' + filas.map((f) => f.map(celda).join(';')).join('\r\n') + '\r\n';
  }
  function bajar(texto, nombre) {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let meses = 1;
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="shVolver">‹ Panel</button><h1 class="cp-titulo">Salud de la iglesia</h1><p class="suave">Cargando…</p>';
      $('#shVolver').onclick = ctx.volver;
      const n = await calcular(p, ctx, meses);
      pant.innerHTML = pantallaHTML(n, meses);
      $('#shVolver').onclick = ctx.volver;
      document.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { meses = Number(b.getAttribute('data-m')); pintar(); }; });
      $('#shBajar').onclick = () => {
        bajar(csvReporte(n, meses), 'reporte-iglesia-' + iso(new Date()) + '.csv');
        $('#shMsg').textContent = 'Listo: el archivo se descargó.';
      };
    };
    pintar();
  }

  window.TBSaludIglesia = { abrir, _t: { rangos, tendencia, celda, csvReporte, PERIODOS } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBSaludIglesia;
})();
