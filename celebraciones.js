/* F1372 · Celebraciones: cumpleaños y aniversarios (tarea 1.19 de PLAN_TAREAS_IGLESIA.md).
   Pastor: ve los cumpleaños y los aniversarios de bautismo y de integración de los próximos 60 días, con «Saludar» por WhatsApp.
   Líder: en «Mi servicio» ve las celebraciones de las personas de SU ministerio (lo calcula el SQL 35, que nunca entrega
   teléfono, dirección ni año de nacimiento, y solo incluye a quien comparte su directorio).
   Usa las funciones del SQL 35: pastor_aniversarios_leer y lider_celebraciones_leer. Los cumpleaños del pastor
   siguen saliendo de pastor_miembros_listar (SQL 26). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const MIL = 86400000;
  const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  const ICONO = { cumple: '🎂', bautismo: '💧', integracion: '🤝' };
  const cuando = (d) => (d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'En ' + d + ' días');
  // «5 años de bautismo», «1 año en la iglesia», «Cumpleaños».
  function detalle(c) {
    if (c.tipo === 'cumple') return 'Cumpleaños';
    const n = parseInt(c.anios, 10);
    const a = (isNaN(n) || n < 1) ? '' : n + (n === 1 ? ' año' : ' años');
    return a + (c.tipo === 'bautismo' ? ' de bautismo' : ' en la iglesia');
  }
  // Fecha «YYYY-MM-DD» → «12 nov». Si no es válida, vacío.
  function diaMes(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
  }
  // Cumpleaños (de pastor_miembros_listar) → misma forma que los aniversarios, dentro de «dias» días.
  function cumpleaniosAFilas(lista, hoy, dias) {
    const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), out = [];
    (lista || []).forEach((x) => {
      const m = String(x.cumpleanos || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return;
      const mes = parseInt(m[2], 10) - 1, dia = parseInt(m[3], 10);
      let f = new Date(h0.getFullYear(), mes, dia);
      if (f < h0) f = new Date(h0.getFullYear() + 1, mes, dia);
      const d = Math.round((f - h0) / MIL);
      if (d <= dias) out.push({ miembro_id: x.id, nombre: x.nombre, tipo: 'cumple', dias: d,
        fecha: f.getFullYear() + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0'), telefono: x.telefono || null });
    });
    return out;
  }
  // Une cumpleaños y aniversarios, agrega el teléfono (por id) y ordena por cercanía y nombre.
  function unir(cumples, anivs, miembros) {
    const tel = {}; (miembros || []).forEach((x) => { if (x && x.id && x.telefono) tel[x.id] = x.telefono; });
    const a = (anivs || []).map((x) => Object.assign({}, x, { telefono: tel[x.miembro_id] || null }));
    return (cumples || []).concat(a).sort((p, q) => p.dias - q.dias || String(p.nombre).localeCompare(String(q.nombre), 'es'));
  }
  const filtrar = (lista, f) => (lista || []).filter((c) => f === 'todos' || (f === 'cumple' ? c.tipo === 'cumple' : c.tipo !== 'cumple'));

  function telWsp(t) {
    const cp = window.TBCentroPastor && window.TBCentroPastor._t;
    return cp && cp.telefonoWsp ? cp.telefonoWsp(t) : '';
  }
  function mensaje(c) {
    const n = primerNombre(c.nombre);
    if (c.tipo === 'cumple') return '¡Feliz cumpleaños, ' + n + '! Dios te bendiga en este nuevo año de vida.';
    if (c.tipo === 'bautismo') return '¡' + n + ', hoy y estos días recordamos tu bautismo! Qué alegría verte caminar con Dios.';
    return '¡' + n + ', gracias por ser parte de nuestra iglesia! Dios te bendiga.';
  }
  function enlaceSaludo(c) {
    const n = telWsp(c.telefono); if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(mensaje(c));
  }

  // Una fila. «saludar» solo para el pastor (el líder no recibe teléfonos).
  function filaHTML(c, saludar) {
    const w = saludar ? enlaceSaludo(c) : '';
    const ministerio = c.ministerio ? ' · ' + esc(c.ministerio) : '';
    return '<div class="cp-fila cp-cumple"><span class="cp-ico" aria-hidden="true">' + (ICONO[c.tipo] || '🎉') + '</span>' +
      '<span class="cp-fila-t"><b>' + esc(c.nombre) + '</b><small>' + esc(cuando(c.dias)) + ' · ' + esc(diaMes(c.fecha)) + ' · ' + esc(detalle(c)) + ministerio + '</small></span>' +
      (w ? '<a class="cp-mini" href="' + esc(w) + '" target="_blank" rel="noopener" aria-label="Saludar a ' + esc(c.nombre) + ' por WhatsApp">Saludar</a>' : '') + '</div>';
  }
  function listaHTML(lista, saludar, vacio) {
    return lista.length ? lista.map((c) => filaHTML(c, saludar)).join('') : '<p class="suave">' + esc(vacio) + '</p>';
  }

  // ---- Pastor ----
  const FILTROS = [['todos', 'Todo'], ['cumple', 'Cumpleaños'], ['aniv', 'Aniversarios']];
  const VACIO = { todos: 'No hay celebraciones en los próximos 60 días.', cumple: 'Nadie ha compartido un cumpleaños en este periodo. Cada persona decide si lo comparte.',
    aniv: 'Aún no hay aniversarios. Se calculan con los hitos de bautismo e integración que registras en la ficha de cada persona.' };

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="celVolver">‹ Panel</button><h1 class="cp-titulo">Celebraciones</h1>' +
      '<p class="suave">Cumpleaños y aniversarios de bautismo y de llegada a la iglesia, en los próximos 60 días.</p>' +
      '<p class="suave" id="celCarga" role="status">Buscando celebraciones…</p>' +
      '<div class="cp-filtros" id="celFiltros" role="group" aria-label="Qué celebraciones ver" hidden></div><div id="celLista"></div>';
    $('#celVolver').onclick = ctx.volver;
    const seguro = (f) => f().catch(() => ({ ok: false }));
    const [rm, ra] = await Promise.all([
      seguro(() => ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' })),
      seguro(() => ctx.rpc('pastor_aniversarios_leer', p, { p_dias: 60 })),
    ]);
    const c = $('#celCarga'); if (!c) return;
    c.hidden = true;
    const d = ra.ok && ra.data && (Array.isArray(ra.data) ? ra.data[0] : ra.data);
    const anivs = d && d.ok !== false ? (d.aniversarios || []) : null;
    const miembros = rm.ok ? (rm.data || []) : null;
    if (anivs === null && miembros === null) { $('#celLista').innerHTML = '<p class="error" role="alert">No pudimos cargar las celebraciones. Revisa tu conexión.</p>'; return; }
    const todo = unir(miembros ? cumpleaniosAFilas(miembros, new Date(), 60) : [], anivs || [], miembros || []);
    let filtro = 'todos';
    const aviso = anivs === null ? '<p class="suave">Los aniversarios aún no están disponibles. Falta activar la actualización del servidor.</p>' : '';
    function pinta() {
      $('#celFiltros').hidden = false;
      $('#celFiltros').innerHTML = FILTROS.map((f) => '<button type="button" class="cp-chip' + (filtro === f[0] ? ' on' : '') + '" data-celf="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + '</button>').join('');
      $('#celLista').innerHTML = aviso + listaHTML(filtrar(todo, filtro), true, VACIO[filtro]);
      document.querySelectorAll('[data-celf]').forEach((b) => { b.onclick = () => { filtro = b.getAttribute('data-celf'); pinta(); }; });
    }
    pinta();
  }

  // Bloque corto para «Tu iglesia hoy»: lo más próximo (30 días). Devuelve HTML (vacío si no hay nada que mostrar).
  function resumenHTML(anivs, miembros, hoy) {
    const lista = unir([], anivs || [], miembros || []).filter((c) => c.dias <= 30).slice(0, 5);
    if (!lista.length) return '';
    return '<h2 class="mi-sub">Aniversarios de los próximos 30 días</h2>' + lista.map((c) => filaHTML(c, true)).join('') +
      '<button type="button" class="btn sec" data-cpk="cel">Ver todas las celebraciones</button>';
  }

  // ---- Líder (dentro de «Mi servicio») ----
  // Se oculta si la persona no es líder, si no hay celebraciones o si el SQL 35 aún no está corrido.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('lider_celebraciones_leer', { p_codigo: id.codigo, p_clave: id.clave, p_dias: 30 });
    const d = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    const lista = d && d.ok !== false && d.lider ? (d.celebraciones || []) : [];
    if (!lista.length) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Celebraciones en tu ministerio</h2>' +
      '<p class="suave m0t">Para que acompañes a tu equipo. Solo ves a quienes comparten su directorio.</p>' + lista.map((x) => filaHTML(x, false)).join('');
  }

  window.TBCelebraciones = { abrir, miembroMostrar, resumenHTML, _t: { cuando, detalle, diaMes, cumpleaniosAFilas, unir, filtrar, filaHTML, listaHTML, mensaje, enlaceSaludo, resumenHTML, VACIO } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBCelebraciones;
})();
