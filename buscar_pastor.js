/* F1408 · Búsqueda del pastor (tarea 2.10): personas, etiquetas, encuestas y áreas del panel, en un solo campo.
   Avisos, cursos, prédicas y eventos se suman después (sus listas aún no tienen el mismo formato). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const nombreDe = (m) => String((m && (m.nombre_visible || m.nombre)) || 'Sin nombre');

  // Lógica pura: una palabra o varias; todas deben aparecer (sin tildes ni mayúsculas).
  function coincide(texto, consulta) {
    const palabras = norm(consulta).trim().split(/\s+/).filter(Boolean);
    if (!palabras.length) return false;
    const t = norm(texto);
    return palabras.every((w) => t.includes(w));
  }

  function bloque(titulo, filas) {
    if (!filas.length) return '';
    return '<h2 class="mi-sub">' + esc(titulo) + '</h2>' + filas.join('');
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="busVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Buscar</h1>' +
      '<p class="suave">Busca personas, etiquetas, encuestas, avisos, prédicas, agenda, actividades y áreas del panel.</p>' +
      '<div class="mie-buscar"><input id="busQ" type="search" placeholder="Nombre, etiqueta, encuesta o área" aria-label="Buscar en el panel" autocomplete="off"></div>' +
      '<div id="busRes" role="status"><p class="suave">Cargando…</p></div>';
    $('#busVolver').onclick = ctx.volver;

    // Avisos y prédicas devuelven filas (lista); el resto devuelve un objeto con su lista.
    const [mr, et, en, av, pr, ag, ac] = await Promise.all([
      ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }),
      ctx.rpc('pastor_etiquetas_listar', p),
      ctx.rpc('pastor_encuestas_listar', p),
      ctx.rpc('aviso_pastor_listar_v2', p),
      ctx.rpc('predica_pastor_listar', p),
      ctx.rpc('agenda_pastor_listar', p),
      ctx.rpc('pastor_actividades_leer', p, {})
    ]);
    const agenda = ag && ag.ok ? (ag.data || []) : [];
    const actividades = ((fila(ac) || {}).actividades) || [];
    const avisos = av && av.ok ? (av.data || []) : [];
    const predicas = pr && pr.ok ? (pr.data || []) : [];
    const personas = mr && mr.ok ? (mr.data || []) : [];
    const etiquetas = ((fila(et) || {}).etiquetas) || [];
    const encuestas = ((fila(en) || {}).encuestas) || [];
    const CP = window.TBCentroPastor;
    const areas = [];
    ((CP && CP._t && CP._t.AREAS) || []).forEach((g) => g[1].forEach((a) => areas.push({ key: a[0], icono: a[1], titulo: a[2], desc: a[3] })));

    const pintar = () => {
      const q = $('#busQ').value;
      if (!norm(q).trim()) { $('#busRes').innerHTML = '<p class="suave">Escribe una palabra para empezar.</p>'; return; }
      const pers = personas.filter((m) => coincide(nombreDe(m), q)).slice(0, 15)
        .map((m) => '<div class="cp-fila"><span class="cp-fila-t"><b>' + esc(nombreDe(m)) + '</b></span></div>');
      const etis = etiquetas.filter((e) => coincide(e.nombre, q))
        .map((e) => '<button type="button" class="cp-fila" data-bus-ir="eti"><span class="cp-fila-t"><b>' + esc(e.nombre) + '</b><small>' + e.personas + (e.personas === 1 ? ' persona' : ' personas') + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const encs = encuestas.filter((e) => coincide(e.pregunta, q))
        .map((e) => '<button type="button" class="cp-fila" data-bus-ir="enc"><span class="cp-fila-t"><b>' + esc(e.pregunta) + '</b><small>' + (e.abierta ? 'Abierta' : 'Cerrada') + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const ars = areas.filter((a) => coincide(a.titulo + ' ' + a.desc, q))
        .map((a) => '<button type="button" class="cp-fila" data-bus-ir="' + esc(a.key) + '"><span class="cp-ico" aria-hidden="true">' + a.icono + '</span><span class="cp-fila-t"><b>' + esc(a.titulo) + '</b><small>' + esc(a.desc) + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const avs = avisos.filter((a) => coincide((a.titulo || '') + ' ' + (a.texto || ''), q))
        .map((a) => '<button type="button" class="cp-fila" data-bus-ir="avi"><span class="cp-fila-t"><b>' + esc(a.titulo || 'Aviso') + '</b><small>' + esc(a.ministerio || 'Toda la iglesia') + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const prs = predicas.filter((x) => coincide((x.titulo || '') + ' ' + (x.pasaje || '') + ' ' + (x.resumen || ''), q))
        .map((x) => '<button type="button" class="cp-fila" data-bus-ir="mpre"><span class="cp-fila-t"><b>' + esc(x.titulo || 'Prédica') + '</b><small>' + esc(x.pasaje || '') + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const ags = agenda.filter((e) => coincide((e.titulo || '') + ' ' + (e.lugar || '') + ' ' + (e.ministerio || ''), q))
        .map((e) => '<button type="button" class="cp-fila" data-bus-ir="age"><span class="cp-fila-t"><b>' + esc(e.titulo) + '</b><small>' + esc((e.inicio ? new Date(e.inicio).toLocaleDateString('es-CL') : '') + (e.lugar ? ' · ' + e.lugar : '')) + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const acs = actividades.filter((a) => coincide((a.titulo || '') + ' ' + (a.lugar || ''), q))
        .map((a) => '<button type="button" class="cp-fila" data-bus-ir="act"><span class="cp-fila-t"><b>' + esc(a.titulo) + '</b><small>' + esc((a.inicio ? new Date(a.inicio).toLocaleDateString('es-CL') : '') + (a.lugar ? ' · ' + a.lugar : '')) + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>');
      const html = bloque('Personas', pers) + bloque('Etiquetas', etis) + bloque('Encuestas', encs) + bloque('Avisos', avs) + bloque('Prédicas', prs) + bloque('Agenda', ags) + bloque('Actividades', acs) + bloque('Áreas del panel', ars);
      $('#busRes').innerHTML = html || '<p class="suave">No encontramos nada con esa palabra. Prueba con otra.</p>';
      document.querySelectorAll('[data-bus-ir]').forEach((b) => b.onclick = () => ctx.abrir(b.getAttribute('data-bus-ir')));
    };
    $('#busQ').addEventListener('input', pintar);
    pintar();
  }

  window.TBBuscar = { abrir, _t: { coincide } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBBuscar;
})();
