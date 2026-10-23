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
    $('#cpFicha').innerHTML = fichaHTML(f) + '<div id="cpFam"></div><div id="cpHist"><p class="suave" role="status">Revisando su historial…</p></div>' + hitoFormHTML();
    conectarHitoForm(p, ctx, id);
    cargarHistorial(p, ctx, id);
    // F1373 · 1.13 familia y 1.9 datos del pastor (familias.js). Si el SQL 36 no está, no se muestra nada.
    if (window.TBFamilias) window.TBFamilias.fichaBloque(p, ctx, id, f, () => abrirFicha(p, ctx, id, volverLista));
  }

  // ---- F1362 · 1.14 Historial del miembro (pastor_historial_leer, SQL 28). Sin datos, no se inventa nada. ----
  const TIPO_HITO = { integracion: 'Integración', bautismo: 'Bautismo', curso: 'Curso' };
  const fechaLarga = (f) => { const d = new Date(String(f).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const TIPO_VISITA = { hogar: 'Visita al hogar', enfermo: 'Enfermo', iglesia: 'Visita a la iglesia', conversacion: 'Conversación', otro: 'Otro' };
  const ESTADO_VISITA = { solicitada: 'Pedida', aceptada: 'Aceptada', agendada: 'Agendada', realizada: 'Realizada', no_disponible: 'No disponible' };
  const BIEN_PASOS = [['contacto', 'Primer contacto'], ['visita', 'Visita'], ['grupo', 'Grupo'], ['oracion', 'Oración']];
  function historialHTML(h) {
    const hitos = (h.hitos || []).map((x) => '<li><b>' + esc(TIPO_HITO[x.tipo] || x.tipo) + '</b> · ' + esc(fechaLarga(x.fecha)) + (x.detalle ? '<small>' + esc(x.detalle) + '</small>' : '') +
      ' <button type="button" class="cp-mini cp-borrar" data-hid="' + esc(x.id) + '" aria-label="Borrar el hito de ' + esc(TIPO_HITO[x.tipo] || x.tipo) + ' del ' + esc(fechaLarga(x.fecha)) + '">Borrar</button></li>').join('');
    const vis = (h.visitas || []).map((x) => '<li><b>' + esc(TIPO_VISITA[x.tipo] || x.tipo) + '</b> · ' + esc(ESTADO_VISITA[x.estado] || x.estado) + ' · ' + esc(fechaLarga(x.creado_en))  + '</li>').join('');
    const serv = (h.servicios || []).map((x) => '<li><b>' + esc(x.titulo) + '</b> · ' + esc(fechaLarga(x.inicio)) + '</li>').join('');
    const bien = h.bienvenida ? '<ul class="cp-lista">' + BIEN_PASOS.map(([k, t]) => '<li>' + (h.bienvenida[k] ? '✅ ' : '○ ') + esc(t) + '</li>').join('') + '</ul>' : '';
    return '<h2 class="mi-sub">Integración, bautismo y cursos</h2>' + (hitos ? '<ul class="cp-lista">' + hitos + '</ul>' : '<p class="suave">Todavía no registrado.</p>') +
      '<h2 class="mi-sub">Últimos servicios</h2>' + (serv ? '<ul class="cp-lista">' + serv + '</ul>' : '<p class="suave">Todavía no tiene servicios asignados.</p>') +
      '<h2 class="mi-sub">Bienvenida</h2>' + (bien || '<p class="suave">Todavía no ha comenzado la bienvenida.</p>') +
      '<h2 class="mi-sub">Visitas pedidas</h2>' + (vis ? '<ul class="cp-lista">' + vis + '</ul>' : '<p class="suave">Todavía no ha pedido visitas.</p>');
  }
  // F1366 · 1.15 Historial del miembro para Excel: hitos, servicios y visitas en una sola lista (sin motivo ni dirección).
  let ultimoHistorial = null;
  const soloDia = (f) => String(f || '').slice(0, 10);
  function filasHistorial(h) {
    if (!h) return [];
    const hitos = (h.hitos || []).map((x) => ({ tipo: TIPO_HITO[x.tipo] || x.tipo, fecha: soloDia(x.fecha), detalle: x.detalle || '', estado: '' }));
    const serv = (h.servicios || []).map((x) => ({ tipo: 'Servicio', fecha: soloDia(x.inicio), detalle: x.titulo || '', estado: '' }));
    const vis = (h.visitas || []).map((x) => ({ tipo: 'Visita', fecha: soloDia(x.creado_en), detalle: TIPO_VISITA[x.tipo] || x.tipo || '', estado: ESTADO_VISITA[x.estado] || x.estado || '' }));
    return hitos.concat(serv, vis);
  }
  const COLS_HIST = [['Tipo', (x) => x.tipo], ['Fecha', (x) => x.fecha], ['Detalle', (x) => x.detalle], ['Estado', (x) => x.estado]];

  async function cargarHistorial(p, ctx, id) {
    const r = await ctx.rpc('pastor_historial_leer', p, { p_miembro: id });
    const caja = $('#cpHist'); if (!caja) return;
    if (!r.ok || !r.data) { caja.innerHTML = '<p class="suave" role="status">No pudimos cargar el historial. Revisa tu conexión e inténtalo de nuevo.</p>'; return; }
    const h = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!h || h.ok === false) { caja.innerHTML = '<p class="suave" role="status">No pudimos cargar el historial de esta persona.</p>'; return; }
    caja.innerHTML = historialHTML(h);
    ultimoHistorial = h;
    const filas = filasHistorial(h);
    if (filas.length) {
      caja.insertAdjacentHTML('beforeend', botonExportar('cpHistExp', 'cpHistExpMsg', 'Descargar historial para Excel', 'Hitos, servicios y visitas (sin el motivo ni la dirección de las visitas).'));
      conectarExportar('cpHistExp', 'cpHistExpMsg', () => filasHistorial(ultimoHistorial), COLS_HIST, 'historial-miembro', ['registro', 'registros']);
    }
    conectarBorrar(p, ctx, id);
  }

  // F1364 · 1.14 Borrar un hito (pastor_hito_borrar, SQL 29). Pide confirmación; si falla, lo dice y no pierde nada.
  function conectarBorrar(p, ctx, id) {
    document.querySelectorAll('[data-hid]').forEach((b) => {
      b.onclick = async () => {
        if (!window.confirm('¿Borrar este hito? No se puede deshacer.')) return;
        b.disabled = true;
        const g = await ctx.rpc('pastor_hito_borrar', p, { p_hito: b.getAttribute('data-hid') });
        const fila = Array.isArray(g.data) ? g.data[0] : g.data;
        if (g.ok && fila && fila.ok) { cargarHistorial(p, ctx, id); return; }
        b.disabled = false;
        const er = $('#chErr');
        if (er) { er.textContent = 'No se pudo borrar el hito. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
      };
    });
  }

  // ---- F1363 · 1.14 Registrar un hito (pastor_hito_guardar, SQL 28). Solo el pastor registra y borra; la persona no edita. ----
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  function hitoFormHTML() {
    const tipos = Object.keys(TIPO_HITO);
    return '<div class="card tp-form cp-hito-form"><h2 class="mi-sub">Registrar un hito</h2>' +
      '<label for="chFecha">Tipo</label>' +
      '<div class="cp-filtros" role="group" aria-label="Tipo de hito">' +
      tipos.map((k, i) => '<button type="button" class="cp-chip' + (i === 0 ? ' on' : '') + '" data-chtipo="' + k + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + esc(TIPO_HITO[k]) + '</button>').join('') + '</div>' +
      '<label for="chFecha">Fecha</label><input id="chFecha" type="date" value="' + hoyISO() + '" max="' + hoyISO() + '">' +
      '<label for="chDet">Detalle (opcional)</label><textarea id="chDet" rows="2" maxlength="160" placeholder="Ej.: Bautizado en el río, junto a su familia"></textarea>' +
      '<p id="chErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn sec" id="chGuardar">Guardar hito</button>' +
      '<p id="chMsg" class="suave" role="status" aria-live="polite"></p></div>';
  }
  function conectarHitoForm(p, ctx, id) {
    const chips = document.querySelectorAll('[data-chtipo]'); let tipo = chips.length ? chips[0].getAttribute('data-chtipo') : 'integracion';
    chips.forEach((b) => {
      b.onclick = () => {
        tipo = b.getAttribute('data-chtipo');
        chips.forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      };
    });
    const btn = $('#chGuardar'); if (!btn) return;
    btn.onclick = async () => {
      const er = $('#chErr'), msg = $('#chMsg'), fecha = $('#chFecha').value;
      er.hidden = true; msg.textContent = '';
      if (!fecha) { er.textContent = 'Elige una fecha.'; er.hidden = false; return; }
      btn.disabled = true;
      const detalle = $('#chDet').value.replace(/\s+/g, ' ').trim().slice(0, 160);
      const g = await ctx.rpc('pastor_hito_guardar', p, { p_miembro: id, p_tipo: tipo, p_fecha: fecha, p_detalle: detalle || null });
      btn.disabled = false;
      const fila = Array.isArray(g.data) ? g.data[0] : g.data;
      if (g.ok && fila && fila.ok) { msg.textContent = 'Hito guardado.'; $('#chDet').value = ''; cargarHistorial(p, ctx, id); }
      else { er.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
    };
  }

  // ---- F1360/F1361 · 1.15 Descargar listas para Excel (CSV con «;» y tildes correctas) ----
  // celdaCSV y csvGenerico son la base compartida: cualquier lista nueva (miembros, oraciones, visitas…)
  // pasa por aquí, así la protección contra fórmulas de Excel no se repite ni se olvida en una lista nueva.
  function celdaCSV(v) {
    let t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    // Seguridad: Excel ejecuta como fórmula lo que parte con = + - @ ; los teléfonos (+56…) son la única excepción.
    if (/^[=+\-@]/.test(t) && !/^\+\d[\d ]*$/.test(t)) t = "'" + t;
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  // columnas: [[título, (fila)=>valor], …]. Siempre BOM + «;» + CRLF para que Excel abra bien tildes y columnas.
  function csvGenerico(columnas, lista) {
    const fila = (x) => columnas.map((c) => celdaCSV(c[1](x))).join(';');
    return '\uFEFF' + [columnas.map((c) => c[0]).join(';')].concat((lista || []).map(fila)).join('\r\n') + '\r\n';
  }
  const COLS_CSV = [['Nombre', (x) => x.nombre], ['Líder', (x) => (x.es_lider ? 'Sí' : 'No')], ['Ministerios', (x) => x.ministerios],
    ['Familia', (x) => x.familia], ['Teléfono', (x) => x.telefono], ['Cumpleaños', (x) => cumple(x.cumpleanos)], ['Dirección', (x) => x.direccion]];
  const csvMiembros = (lista) => csvGenerico(COLS_CSV, lista);
  function descargarCSV(texto, nombre) {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }
  // Botón «Descargar para Excel» reutilizable: misma pinta y mismo manejo de errores en cualquier lista del pastor.
  function botonExportar(id, msgId, etiqueta, nota) {
    return '<button type="button" class="btn sec cp-exp" id="' + id + '">⬇ ' + esc(etiqueta) + '</button>' +
      '<p class="suave cp-exp-nota" id="' + msgId + '" role="status" aria-live="polite">' + esc(nota || '') + '</p>';
  }
  function conectarExportar(id, msgId, obtenerLista, columnas, prefijo, nombres) {
    const uno = (nombres && nombres[0]) || 'registro', varios = (nombres && nombres[1]) || 'registros';
    const b = $('#' + id), msg = $('#' + msgId); if (!b || !msg) return;
    b.onclick = () => {
      const lista = obtenerLista();
      if (!lista.length) { msg.textContent = 'No hay nadie en la lista para descargar.'; return; }
      try {
        descargarCSV(csvGenerico(columnas, lista), prefijo + '-' + new Date().toISOString().slice(0, 10) + '.csv');
        msg.textContent = 'Listo: se descargó la lista de ' + lista.length + ' ' + (lista.length === 1 ? uno : varios) + '. Ábrela con Excel.';
      } catch (e) { msg.textContent = 'No se pudo descargar en este teléfono. Inténtalo de nuevo.'; }
    };
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
      '<div class="mie-buscar"><input id="mieQ" type="search" placeholder="Buscar miembro" aria-label="Buscar miembro por nombre, ministerio o familia" autocomplete="off"></div>' +
      (nLid ? '<div class="cp-filtros"><button type="button" class="cp-chip" id="cpLid" aria-pressed="false">Solo líderes (' + nLid + ')</button></div>' : '') +
      '<button type="button" class="btn sec cp-exp" id="cpExp">⬇ Descargar lista para Excel</button><p class="suave cp-exp-nota" id="cpExpMsg" role="status" aria-live="polite">Incluye solo lo que cada persona decidió compartir.</p>' +
      '<div id="cpLista" aria-live="polite"></div>';
    $('#cpVolver').onclick = ctx.volver;
    conectarExportar('cpExp', 'cpExpMsg', () => filtrar(todos, $('#mieQ').value, soloLideres), COLS_CSV, 'miembros-iglesia', ['persona', 'personas']);
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
    const [rm, rv, rs, ro, rvi, ra] = await Promise.all([
      seguro(() => ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' })),
      seguro(() => ctx.rpc('miembros_pastor_listar', p)),
      seguro(() => ctx.rpc('solicitud_pastor_listar', p)),
      seguro(() => ctx.rpc('peticion_pastor_listar_v2', p)).then((r) => (r.ok ? r : seguro(() => ctx.rpc('peticion_pastor_listar', p)))),
      seguro(() => ctx.rpc('visita_pastor_listar', p)),
      seguro(() => ctx.rpc('pastor_aniversarios_leer', p, { p_dias: 30 })),
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
    // F1372 · aniversarios de bautismo y de llegada (SQL 35). Si aún no está corrido, no se muestra nada.
    const da = ra && ra.ok && ra.data && (Array.isArray(ra.data) ? ra.data[0] : ra.data);
    if (da && da.ok !== false && window.TBCelebraciones) h += window.TBCelebraciones.resumenHTML(da.aniversarios, rm.ok ? rm.data : [], new Date());
    h += '<button type="button" class="btn sec" data-cpk="mie">Ver a todos los miembros</button>';
    $('#cpVision').innerHTML = h;
    document.querySelectorAll('[data-cpk]').forEach((b) => { b.onclick = () => ctx.abrir(b.getAttribute('data-cpk')); });
  }

  // ---- F1352 · 1.4 Menú del pastor con todas las áreas ----
  const AREAS = [
    ['Hoy', [['vigl', '🏛️', 'Tu iglesia hoy', 'Personas, cumpleaños y lo que pide atención'],
      ['rsem', '📊', 'Resumen semanal', 'Los últimos 7 días en un solo lugar'],
      ['vis', '🏠', 'Visitas', 'Quién pide que lo visites'],
      ['ora', '🤲', 'Oraciones', 'Peticiones recibidas'],
      ['sol', '🙋', 'Solicitudes', 'Quién quiere unirse a tu iglesia']]],
    ['Personas', [['mie', '👥', 'Miembros', 'Buscar, ver la ficha, escribir por WhatsApp o llamar'],
      ['fam', '👪', 'Familias', 'Agrupa a las personas de cada familia y cómo se relacionan'],
      ['bien', '🌱', 'Bienvenida', 'Primeras 4 semanas de quien llega'],
      ['cel', '🎉', 'Celebraciones', 'Cumpleaños y aniversarios de bautismo y de llegada'],
      ['disp', '🕐', 'Disponibilidad', 'Quiénes pueden servir'],
      ['min', '🕍', 'Ministerios y líderes', 'Grupos, personas y líderes']]],
    ['Comunicación', [['chat', '💬', 'Chat', 'Iglesia, pastor y líderes, y conversaciones'],
      ['avi', '📣', 'Avisos', 'Para todos o un grupo'],
      ['bol', '🗞️', 'Boletín de la semana', 'Avisos y agenda, listo para compartir'],
      ['mpre', '🎙️', 'Mis prédicas', 'Graba tu mensaje, guárdalo y escúchalo']]],
    ['Agenda y organización', [['age', '📅', 'Agenda', 'Actividades y reuniones'],
      ['mcal', '🗓', 'Mi calendario', 'Visitas, reuniones y descanso. Solo tú lo ves'],
      ['aseo', '🧹', 'Aseo y tareas', 'Quién hace cada tarea cada semana'],
      ['cul', '📖', 'Plantillas de culto', 'El orden del culto, con tiempos y responsable de cada bloque'],
      ['act', '🏕️', 'Actividades y paseos', 'Próximas actividades, inscripciones y cupos'],
      ['asi', '✅', 'Asistencia', 'Sesiones, código para tus miembros y asistencia de 12 meses'],
      ['form', '📋', 'Formularios e inscripciones', 'Retiros, bautismos y cursos: quién responde']]],
    ['Datos de la iglesia', [['tar', '🪪', 'Mi tarjeta de pastor', 'Cargo, horario de atención y dirección de tu oficina'],
      ['imp', '📥', 'Importar personas', 'Sube tu lista desde una planilla CSV y revísala antes de guardar'],
      ['impl', '🗂️', 'Personas de la planilla', 'Personas sin cuenta y cuáles ya vinculaste con su cuenta'],
      ['dat', '📝', 'Datos y código', 'Nombre, eslogan y código de tu iglesia'],
      ['cfg', '⚙️', 'Configuración de la iglesia', 'Elige cómo trabaja tu iglesia: culto, grupos, cursos y metas']]]
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

  window.TBCentroPastor = {
    miembros, vision, menu,
    // F1361 · 1.15 «otras listas»: Oraciones y Visitas usan estos mismos bloques desde app.js (pOraciones/pVisitas),
    // así la lógica de CSV (BOM, «;», protección contra fórmulas) vive en un solo lugar.
    exportar: { csvGenerico, descargarCSV, botonExportar, conectarExportar },
    _t: { historialHTML, filasHistorial, hitoFormHTML, conectarHitoForm, conectarBorrar, csvMiembros, celdaCSV, csvGenerico, proximosCumples, menuHTML, AREAS, wspCumple, cuando, telefonoWsp, telefonoLlamar, enlaceWsp, filtrar, fichaHTML, filaHTML, cumple }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBCentroPastor;
})();
