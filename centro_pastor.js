/* F1351/F1352 · Centro del pastor, fase 1 (tareas 1.1, 1.2, 1.3, 1.4 y 1.19 del PLAN_TAREAS_IGLESIA.md).
   F1352: 1.1 «Visión de la iglesia» (personas, atención hoy), 1.4 «Todas las áreas» (menú con buscador), 1.19 cumpleaños próximos.
   1.2 Buscador de miembros: un solo campo (nombre, ministerio o familia) sobre pastor_miembros_listar.
   1.3 Ficha del miembro con WhatsApp y llamar (pastor_ficha_leer). Respeta las casillas del miembro:
   si no compartió su teléfono, no se muestra nada ni se inventa. «Escribir en la app» llega con 2.1 (SQL).
   app.js solo llama a TBCentroPastor.miembros(p, ctx); si la función nueva no está en la base, devuelve false
   y app.js usa la lista de siempre. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
  const TOPE = 25;

  // Teléfono → solo números con prefijo de país. Chile por defecto (56): 9 dígitos que empiezan en 9, u 8 dígitos.
  function telefonoWsp(t) {
    let d = String(t || '').replace(/\D/g, '');
    if (!d) return '';
    d = d.replace(/^00/, '');
    if (d.length === 9 && d.charAt(0) === '9') return '56' + d;
    if (d.length === 8) return '569' + d;
    if (d.length === 10 && d.charAt(0) === '0') return '56' + d.slice(1);
    return d.length >= 10 ? d : '';
  }
  const telefonoLlamar = (t) => { const w = telefonoWsp(t); return w ? '+' + w : ''; };
  const enlaceWsp = (tel, nombre) => {
    const n = telefonoWsp(tel); if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent('Hola ' + primerNombre(nombre) + ', ¿cómo estás? Te escribo de la iglesia.');
  };

  // Busca por nombre, ministerio o familia, sin importar tildes ni mayúsculas. Cada palabra debe aparecer.
  function filtrar(lista, q, soloLideres) {
    const pal = norm(q).split(/\s+/).filter(Boolean);
    return lista.filter((x) => {
      if (soloLideres && !x.es_lider) return false;
      if (!pal.length) return true;
      const pajar = norm([x.nombre, x.ministerios, x.familia].join(' '));
      return pal.every((w) => pajar.includes(w));
    });
  }

  function cumple(f) {
    if (!f) return '';
    const m = String(f).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return parseInt(m[3], 10) + ' de ' + meses[parseInt(m[2], 10) - 1];
  }

  function filaHTML(x, ctx) {
    const sub = [x.ministerios, x.familia ? 'Familia ' + x.familia : ''].filter(Boolean).join(' · ');
    const av = ctx.avatar ? ctx.avatar(x.nombre, { g: String(x.nombre || '').length % 8, e: '' }, false).replace('class="avatar', 'class="avatar mini') : '';
    return '<button type="button" class="cp-fila" data-cpid="' + esc(x.id) + '">' + av +
      '<span class="cp-fila-t"><b>' + esc(x.nombre) + '</b>' + (x.es_lider ? ' <span class="cp-lider">Líder</span>' : '') +
      (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><span class="cp-ir" aria-hidden="true">›</span></button>';
  }

  function fichaHTML(f) {
    const nom = esc(f.nombre), wsp = f.telefono ? enlaceWsp(f.telefono, f.nombre) : '', tel = f.telefono ? telefonoLlamar(f.telefono) : '';
    let acc = '';
    if (wsp) acc += '<a class="btn cp-wsp" id="cpWsp" href="' + esc(wsp) + '" target="_blank" rel="noopener">Enviar WhatsApp</a>';
    if (tel) acc += '<a class="btn sec cp-llamar" id="cpLlamar" href="tel:' + esc(tel) + '">Llamar</a>';
    if (!acc) acc = '<p class="suave cp-nota" id="cpSinTel">' + (f.directorio === false || f.contacto_app_wsp === false
      ? 'Esta persona decidió no compartir su teléfono. Puedes hablarle en persona o por la iglesia.' : 'Todavía no hay un teléfono guardado para esta persona.') + '</p>';
    const filas = [];
    if (f.ministerios) filas.push(['Ministerios', f.ministerios + (f.es_lider ? ' (líder)' : '')]);
    if (f.familia) filas.push(['Familia', f.familia]);
    if (f.cumpleanos) filas.push(['Cumpleaños', cumple(f.cumpleanos)]);
    if (f.direccion) filas.push(['Dirección', f.direccion]);
    const datos = filas.length ? '<dl class="cp-datos">' + filas.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl>'
      : '<p class="suave">Esta persona aún no ha completado su tarjeta de contacto.</p>';
    return '<h1 class="cp-nombre">' + nom + '</h1>' + datos + '<div class="cp-acciones">' + acc + '</div>';
  }

  async function abrirFicha(p, ctx, id, volverLista) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="cpAtras">‹ Miembros</button><p class="suave" id="cpCarga">Abriendo la ficha…</p><div id="cpFicha"></div>';
    $('#cpAtras').onclick = volverLista;
    const r = await ctx.rpc('pastor_ficha_leer', p, { p_id: id });
    const c = $('#cpCarga'); if (!c) return;
    const f = r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!f) { c.textContent = 'No pudimos abrir esta ficha. Revisa tu conexión e inténtalo de nuevo.'; return; }
    c.hidden = true;
    $('#cpFicha').innerHTML = fichaHTML(f);
  }

  async function miembros(p, ctx) {
    const r = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
    if (!r.ok) return false;   // SQL 26 sin correr o sin conexión: app.js usa la lista de siempre
    const todos = (r.data || []).slice();
    const pant = $('#pantalla'); if (!pant) return true;
    let tope = TOPE, soloLideres = false;
    const nLid = todos.filter((x) => x.es_lider).length;
    pant.innerHTML = '<button type="button" class="volver" id="cpVolver">‹ Panel</button><h1 class="cp-titulo">Miembros</h1>' +
      '<p class="suave" id="cpConteo"></p>' +
      '<div class="mie-buscar"><input id="mieQ" type="search" placeholder="Nombre, ministerio o familia" aria-label="Buscar miembro por nombre, ministerio o familia" autocomplete="off"></div>' +
      (nLid ? '<div class="cp-filtros"><button type="button" class="cp-chip" id="cpLid" aria-pressed="false">Solo líderes (' + nLid + ')</button></div>' : '') +
      '<div id="cpLista" aria-live="polite"></div>';
    $('#cpVolver').onclick = ctx.volver;
    const volverLista = () => miembros(p, ctx);
    const pinta = () => {
      const lista = filtrar(todos, $('#mieQ').value, soloLideres);
      $('#cpConteo').textContent = todos.length + (todos.length === 1 ? ' persona en tu iglesia' : ' personas en tu iglesia') + (lista.length !== todos.length ? ' · ' + lista.length + ' coinciden' : '');
      let h = lista.slice(0, tope).map((x) => filaHTML(x, ctx)).join('');
      if (!lista.length) h = '<p class="suave">' + (todos.length ? 'No hay nadie con eso. Prueba con otro nombre, ministerio o familia.' : 'Aquí verás a quienes se unan a tu iglesia.') + '</p>';
      if (lista.length > tope) h += '<button type="button" class="btn sec" id="cpMas">Mostrar más (' + (lista.length - tope) + ' más)</button>';
      $('#cpLista').innerHTML = h;
      document.querySelectorAll('[data-cpid]').forEach((b) => { b.onclick = () => abrirFicha(p, ctx, b.getAttribute('data-cpid'), volverLista); });
      const mas = $('#cpMas'); if (mas) mas.onclick = () => { tope += TOPE; pinta(); };
    };
    $('#mieQ').addEventListener('input', () => { tope = TOPE; pinta(); });
    const lid = $('#cpLid'); if (lid) lid.onclick = () => { soloLideres = !soloLideres; lid.setAttribute('aria-pressed', String(soloLideres)); lid.classList.toggle('on', soloLideres); tope = TOPE; pinta(); };
    pinta();
    return true;
  }

  // ---- F1352 · 1.19 Cumpleaños próximos (solo de quienes comparten su directorio) ----
  const MIL = 86400000;
  function proximosCumples(lista, hoy, dias) {
    const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), out = [];
    (lista || []).forEach((x) => {
      const m = String(x.cumpleanos || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return;
      let f = new Date(h0.getFullYear(), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      if (f < h0) f = new Date(h0.getFullYear() + 1, parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      const d = Math.round((f - h0) / MIL);
      if (d <= dias) out.push({ x, dias: d });
    });
    return out.sort((a, b) => a.dias - b.dias || String(a.x.nombre).localeCompare(String(b.x.nombre), 'es'));
  }
  const cuando = (d) => (d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'En ' + d + ' días');
  const wspCumple = (tel, nombre) => {
    const n = telefonoWsp(tel); if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent('¡Feliz cumpleaños, ' + primerNombre(nombre) + '! Dios te bendiga en este nuevo año de vida.');
  };

  // ---- F1352 · 1.1 Visión de la iglesia ----
  const pl = (n, a, b) => (n === 1 ? a : b);
  async function vision(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="cpVolver">‹ Panel</button><h1 class="cp-titulo">Tu iglesia hoy</h1><p class="suave" id="cpCarga" role="status">Revisando tu iglesia…</p><div id="cpVision"></div>';
    $('#cpVolver').onclick = ctx.volver;
    const seguro = (f) => f().catch(() => ({ ok: false }));
    const [rm, rv, rs, ro, rvi] = await Promise.all([
      seguro(() => ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' })),
      seguro(() => ctx.rpc('miembros_pastor_listar', p)),
      seguro(() => ctx.rpc('solicitud_pastor_listar', p)),
      seguro(() => ctx.rpc('peticion_pastor_listar_v2', p)).then((r) => (r.ok ? r : seguro(() => ctx.rpc('peticion_pastor_listar', p)))),
      seguro(() => ctx.rpc('visita_pastor_listar', p)),
    ]);
    const c = $('#cpCarga'); if (!c) return;
    c.hidden = true;
    const miembros = rm.ok ? (rm.data || []) : (rv.ok ? (rv.data || []).map((x) => ({ id: x.id, nombre: x.nombre_visible })) : null);
    let h = '';
    if (miembros) {
      const lid = miembros.filter((x) => x.es_lider).length, hace30 = Date.now() - 30 * MIL;
      const nuevos = rv.ok ? (rv.data || []).filter((x) => x.creado_en && new Date(x.creado_en).getTime() >= hace30).length : null;
      h += '<div class="cp-cifras"><div class="cp-cifra"><b>' + miembros.length + '</b><span>' + pl(miembros.length, 'persona', 'personas') + '</span></div>' +
        (rm.ok ? '<div class="cp-cifra"><b>' + lid + '</b><span>' + pl(lid, 'líder', 'líderes') + '</span></div>' : '') +
        (nuevos !== null ? '<div class="cp-cifra"><b>' + nuevos + '</b><span>' + pl(nuevos, 'llegó este mes', 'llegaron este mes') + '</span></div>' : '') + '</div>';
    } else h += '<p class="suave">No pudimos cargar a tus miembros. Revisa tu conexión.</p>';
    const nSol = rs.ok ? (rs.data || []).length : null, nOra = ro.ok ? (ro.data || []).length : null;
    const nVis = rvi.ok ? (rvi.data || []).filter((v) => v.estado === 'solicitada').length : null;
    const fila = (k, ico, t, n, uno, varios) => '<button type="button" class="cp-fila" data-cpk="' + k + '"><span class="cp-ico" aria-hidden="true">' + ico + '</span><span class="cp-fila-t"><b>' + t + '</b><small>' +
      (n === null ? 'No se pudo revisar ahora' : n === 0 ? 'Nada pendiente' : n + ' ' + pl(n, uno, varios)) + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>';
    h += '<h2 class="mi-sub">Para atender hoy</h2>' + fila('vis', '🏠', 'Visitas', nVis, 'visita pedida', 'visitas pedidas') +
      fila('ora', '🤲', 'Oraciones', nOra, 'oración recibida', 'oraciones recibidas') + fila('sol', '🙋', 'Solicitudes de unión', nSol, 'persona esperando', 'personas esperando');
    const cum = rm.ok ? proximosCumples(rm.data, new Date(), 30) : [];
    h += '<h2 class="mi-sub">Cumpleaños de los próximos 30 días</h2>';
    if (!rm.ok) h += '<p class="suave">Aparecerán cuando tus miembros completen su tarjeta de contacto.</p>';
    else if (!cum.length) h += '<p class="suave">Nadie ha compartido un cumpleaños en este periodo. Cada persona decide si lo comparte.</p>';
    else h += cum.slice(0, 10).map((o) => { const w = wspCumple(o.x.telefono, o.x.nombre);
      return '<div class="cp-fila cp-cumple"><span class="cp-ico" aria-hidden="true">🎂</span><span class="cp-fila-t"><b>' + esc(o.x.nombre) + '</b><small>' + cuando(o.dias) + ' · ' + esc(cumple(o.x.cumpleanos)) + '</small></span>' +
        (w ? '<a class="cp-mini" href="' + esc(w) + '" target="_blank" rel="noopener" aria-label="Saludar a ' + esc(o.x.nombre) + ' por WhatsApp">Saludar</a>' : '') + '</div>'; }).join('');
    h += '<button type="button" class="btn sec" data-cpk="mie">Ver a todos los miembros</button>';
    $('#cpVision').innerHTML = h;
    document.querySelectorAll('[data-cpk]').forEach((b) => { b.onclick = () => ctx.abrir(b.getAttribute('data-cpk')); });
  }

  // ---- F1352 · 1.4 Menú del pastor con todas las áreas ----
  const AREAS = [
    ['Hoy', [['vigl', '🏛️', 'Tu iglesia hoy', 'Personas, cumpleaños y lo que pide atención'],
      ['rsem', '🗞️', 'Resumen semanal', 'Los últimos 7 días en un solo lugar'],
      ['vis', '🏠', 'Visitas', 'Quién pide que lo visites'],
      ['ora', '🤲', 'Oraciones', 'Peticiones recibidas'],
      ['sol', '🙋', 'Solicitudes', 'Quién quiere unirse a tu iglesia']]],
    ['Personas', [['mie', '👥', 'Miembros', 'Buscar, ver la ficha, escribir por WhatsApp o llamar'],
      ['bien', '🌱', 'Bienvenida', 'Primeras 4 semanas de quien llega'],
      ['disp', '🕐', 'Disponibilidad', 'Quiénes pueden servir'],
      ['min', '🕍', 'Ministerios y líderes', 'Grupos, personas y líderes'],
      ['tar', '🪪', 'Mi tarjeta de pastor', 'Cargo, horario de atención y dirección de tu oficina']]],
    ['Comunicación', [['chat', '💬', 'Chat', 'Iglesia, pastor y líderes, y conversaciones'],
      ['avi', '📣', 'Avisos', 'Para todos o un grupo'],
      ['bol', '🗞️', 'Boletín de la semana', 'Avisos y agenda, listo para compartir'],
      ['mpre', '🎙️', 'Mis prédicas', 'Graba tu mensaje, guárdalo y escúchalo']]],
    ['Agenda y organización', [['age', '📅', 'Agenda', 'Actividades y reuniones'], ['mcal', '🗓', 'Mi calendario', 'Visitas, reuniones y descanso. Solo tú lo ves'], ['dat', '📝', 'Datos y código', 'Nombre, eslogan y código de tu iglesia']]],
  ];
  function menuHTML(q) {
    const w = norm(q).split(/\s+/).filter(Boolean); let h = '', n = 0;
    AREAS.forEach((g) => {
      const it = g[1].filter((a) => w.every((t) => norm(a[2] + ' ' + a[3]).includes(t)));
      if (!it.length) return; n += it.length;
      h += '<h2 class="mi-sub">' + esc(g[0]) + '</h2>' + it.map((a) => '<button type="button" class="cp-fila" data-cpk="' + a[0] + '">' +
        '<span class="cp-ico" aria-hidden="true">' + a[1] + '</span><span class="cp-fila-t"><b>' + esc(a[2]) + '</b><small>' + esc(a[3]) + '</small></span>' +
        '<span class="cp-ir" aria-hidden="true">›</span></button>').join('');
    });
    return n ? h : '<p class="suave">No encontramos esa área. Prueba con otra palabra.</p>';
  }
  function menu(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="cpVolver">‹ Panel</button><h1 class="cp-titulo">Todas las áreas</h1><p class="suave">Todo lo que puedes hacer como pastor, en un solo lugar.</p>' +
      '<div class="mie-buscar"><input id="mieQ" type="search" placeholder="Buscar un área" aria-label="Buscar un área del panel" autocomplete="off"></div><div id="cpMenu"></div>';
    $('#cpVolver').onclick = ctx.volver;
    const pinta = () => { $('#cpMenu').innerHTML = menuHTML($('#mieQ').value); document.querySelectorAll('[data-cpk]').forEach((b) => { b.onclick = () => ctx.abrir(b.getAttribute('data-cpk')); }); };
    $('#mieQ').addEventListener('input', pinta);
    pinta();
  }

  window.TBCentroPastor = { miembros, vision, menu, _t: { proximosCumples, menuHTML, AREAS, wspCumple, cuando, telefonoWsp, telefonoLlamar, enlaceWsp, filtrar, fichaHTML, filaHTML, cumple } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBCentroPastor;
})();
