/* F1378 · Asistencia con pase por sesión y tendencias por mes (tarea 1.12 de PLAN_TAREAS_IGLESIA.md).
   Pastor: sesiones, pase para compartir, marcar personas y tendencia de 12 meses (SQL 39).
   Miembro: «Mi asistencia» dentro de Mi servicio: escribir el pase de la sesión y ver su propio resumen.
   Los nombres solo se muestran a quien lo permitió (permiso «asistencia»). Todo se pide con la llave de la persona. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const aviso = (id, t) => { const el = document.getElementById(id); if (el) { el.textContent = t || ''; el.hidden = !t; } };
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // ---------- Lógica pura (se prueba sin navegador) ----------
  // Un pase válido son 8 letras o números. Acepta espacios y minúsculas, y lo deja en mayúsculas.
  function normPase(s) {
    const t = String(s == null ? '' : s).replace(/\s+/g, '').toUpperCase();
    return /^[A-Z0-9]{8}$/.test(t) ? t : null;
  }
  // Ancho en porcentaje de cada barra, relativo al valor mayor (mínimo 0; nunca pasa de 100).
  function porcentajes(valores) {
    const max = Math.max(0, ...valores.map((v) => Number(v) || 0));
    return valores.map((v) => (max === 0 ? 0 : Math.round(((Number(v) || 0) / max) * 100)));
  }
  // «octubre 2026» a partir de «2026-10».
  function mesLargo(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})$/); if (!m) return String(iso);
    return MESES[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }
  // Fecha corta para una sesión: «25 oct».
  function fechaCorta(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return String(iso);
    return parseInt(m[3], 10) + ' ' + MESES[parseInt(m[2], 10) - 1].slice(0, 3);
  }
  // Valida el nombre de una sesión antes de enviarlo.
  function validarSesion(nombre, fecha) {
    const n = String(nombre || '').trim();
    if (!n) return 'Ponle un nombre a la sesión, por ejemplo «Culto del domingo».';
    if (n.length > 80) return 'El nombre es demasiado largo (máximo 80 letras).';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) return 'Elige la fecha de la sesión.';
    return null;
  }

  // Enlace que el QR lleva: la misma dirección donde está la app, con el código de la sesión.
  // F1383 · El QR lleva a la página de entrada (sin cuenta).
  function urlDeSesion(pase) {
    try { return new URL('entrada.html?p=' + pase, location.href).href; } catch (e) { return 'entrada.html?p=' + pase; }
  }
  // QR en SVG con fondo blanco y módulos negros (se lee bien con cualquier tema y con poca luz).
  function qrSVG(texto) {
    const Q = window.TBQRCode; if (!Q) return '';
    const qr = new Q.QRCode(-1, Q.QRErrorCorrectLevel.M); qr.addData(texto); qr.make();
    const n = qr.getModuleCount(), quieta = 4, tam = n + quieta * 2;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + quieta) + ' ' + (r + quieta) + 'h1v1h-1z';
    return '<svg class="asi-qr" viewBox="0 0 ' + tam + ' ' + tam + '" role="img" aria-label="Código QR para marcar tu asistencia" shape-rendering="crispEdges">' +
      '<rect width="' + tam + '" height="' + tam + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  // Enlace que trae el pase desde el QR: se guarda en esta sesión del navegador hasta que el miembro lo registre.
  const CLAVE_PASE = 'tb_pase_pendiente';
  function leerEnlace() {
    try {
      const pase = normPase(new URLSearchParams(String(location.search || '').slice(1)).get('asistencia'));
      if (pase) {
        sessionStorage.setItem(CLAVE_PASE, pase);
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) { /* sin enlace de asistencia */ }
  }
  function pasePendiente() {
    try { return normPase(sessionStorage.getItem(CLAVE_PASE)); } catch (e) { return null; }
  }
  function limpiarPase() {
    try { sessionStorage.removeItem(CLAVE_PASE); } catch (e) { /* nada */ }
  }

  // ---------- Pastor ----------
  const MOTIVOS = {
    'codigo-no-valido': 'Ese código no corresponde a una sesión de tu iglesia. Revísalo e inténtalo de nuevo.',
    'sesion-cerrada': 'Esa sesión ya no acepta códigos. Pídele al pastor que vuelva a activar el QR.',
    'sin-acceso': 'No pudimos confirmar tu cuenta. Vuelve a entrar e inténtalo de nuevo.',
    fecha: 'La fecha debe estar dentro del último año o en los próximos 30 días.',
    horas: 'Elige entre 1 y 48 horas.',
  };

  // F1383 · Etiquetas y helpers de indicadores.
  const TIPOS = { culto: 'Culto', grupo: 'Grupo', evento: 'Evento', reunion: 'Reunión', otra: 'Otra' };
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  function isoFecha(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function barrasHTML(items, etiqueta, valor, sufijo) {
    const max = Math.max(1, ...items.map((x) => Number(valor(x)) || 0));
    return '<ul class="asi-barras">' + items.map((x) => {
      const v = Number(valor(x)) || 0;
      return '<li><span class="asi-mes">' + esc(etiqueta(x)) + '</span>' +
        '<span class="asi-barra" aria-hidden="true"><span style="width:' + Math.round(v / max * 100) + '%"></span></span>' +
        '<span class="asi-num">' + v + '</span><span class="suave asi-ses">' + esc(sufijo(x)) + '</span></li>';
    }).join('') + '</ul>';
  }
  // Frases claras para el pastor: qué día convoca más, qué actividad y dónde conviene mirar.
  function indicadoresHTML(d, meses) {
    if (!d.sesiones) return '<p class="suave">Todavía no hay actividades en este período. Cuando registres asistencia, aquí verás qué días y actividades reúnen más gente.</p>';
    const dias = (d.por_dia || []).map((x) => Object.assign({}, x, { nombre: DIAS[x.dia] || '' }));
    const orden = dias.slice().sort((a, b) => b.promedio - a.promedio);
    const mejor = orden[0], peor = orden[orden.length - 1];
    const acts = (d.por_actividad || []).slice(0, 5);
    const tipos = d.por_tipo || [];
    let html = '<p>En los últimos ' + meses + ' meses hubo ' + d.sesiones + (d.sesiones === 1 ? ' actividad' : ' actividades') +
      ' y ' + d.asistencias + ' asistencias en total.</p>';
    if (mejor) html += '<p>El día que más gente reúne es el <b>' + esc(mejor.nombre.toLowerCase()) + '</b>, con un promedio de ' + mejor.promedio + ' personas.</p>';
    if (d.visitas === 0) html += '<p class="suave">Todavía no hay visitas registradas en este período.</p>';
    else html += '<p>Llegaron ' + d.visitantes_distintos + (d.visitantes_distintos === 1 ? ' visita' : ' visitas') + ': ' + d.visitantes_nuevos + (d.visitantes_nuevos === 1 ? ' nueva' : ' nuevas') + ' y ' + d.visitantes_que_volvieron + (d.visitantes_que_volvieron === 1 ? ' que volvió' : ' que volvieron') + ' más de una vez.</p>';
    html += '<h3 class="mi-sub">Asistencia por día de la semana</h3>' + barrasHTML(dias, (x) => x.nombre, (x) => x.promedio, (x) => 'prom. · ' + x.sesiones + (x.sesiones === 1 ? ' vez' : ' veces'));
    if (tipos.length > 1) html += '<h3 class="mi-sub">Por tipo de actividad</h3>' + barrasHTML(tipos, (x) => TIPOS[x.tipo] || x.tipo, (x) => x.promedio, (x) => 'prom. · ' + x.sesiones + (x.sesiones === 1 ? ' vez' : ' veces'));
    html += '<h3 class="mi-sub">Actividades con más asistencia</h3>' + barrasHTML(acts, (x) => x.nombre, (x) => x.promedio, (x) => 'prom. · ' + x.veces + (x.veces === 1 ? ' vez' : ' veces'));
    if (mejor && peor && mejor !== peor && peor.sesiones > 0 && peor.promedio < mejor.promedio / 2) {
      html += '<p class="asi-mirar"><b>Para mirar:</b> el ' + esc(peor.nombre.toLowerCase()) + ' reúne bastante menos gente (' + peor.promedio + ' en promedio). Puedes revisar si conviene cambiar el horario, la actividad o la forma de invitar.</p>';
    }
    return html;
  }

  // F1381 · Hora de cierre del QR: la decide el pastor (por defecto 2 horas, de 1 a 48).
  const HORAS_RAPIDAS = [1, 2, 4, 8, 12, 24];
  function horaCorta(iso) {
    try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  function estaVigente(s) {
    if (typeof s.vigente === 'boolean') return s.vigente;
    return !!s.abierta;
  }
  function selectorHoras(id, actual) {
    const opciones = HORAS_RAPIDAS.map((h) => '<option value="' + h + '"' + (h === actual ? ' selected' : '') + '>' + h + (h === 1 ? ' hora' : ' horas') + '</option>').join('');
    return '<label for="' + id + '">Cuánto tiempo queda activo el QR</label>' +
      '<select id="' + id + '">' + opciones + '<option value="otra">Otra cantidad…</option></select>' +
      '<input id="' + id + 'Otra" type="number" min="1" max="48" inputmode="numeric" placeholder="Horas (1 a 48)" hidden>';
  }
  function sesionHTML(s) {
    const nombres = (s.con_nombre || []);
    const otros = Number(s.sin_nombre) || 0;
    const vigente = estaVigente(s);
    const idSel = 'asiH_' + s.id;
    const hasta = (vigente && s.cierra_en) ? 'Activo hasta las ' + horaCorta(s.cierra_en) : '';
    const estado = vigente ? (hasta || 'Activo') : 'Cerrado';
    return '<article class="card asi-sesion"><h2>' + esc(s.nombre) + '</h2>' +
      '<p class="suave">' + esc(TIPOS[s.tipo] || 'Actividad') + ' · ' + fechaCorta(s.fecha) + ' · ' + (Number(s.total) || 0) + ' personas (' + (Number(s.miembros) || 0) + ' miembros y ' + (Number(s.visitas) || 0) + ' visitas) · <span class="asi-estado ' + (vigente ? 'on' : 'off') + '">' + esc(estado) + '</span></p>' +
      '<p class="asi-pase"><span class="suave">Código para tus miembros:</span> <b aria-label="Código de la sesión: ' + esc(s.pase.split('').join(' ')) + '">' + esc(s.pase) + '</b></p>' +
      '<p class="suave">Las personas escanean el QR de la entrada o escriben el código en «Mi servicio» → «Registrar mi asistencia».</p>' +
      (nombres.length ? '<p><b>Presentes:</b> ' + nombres.map(esc).join(', ') + '</p>' : '') +
      (otros ? '<p class="suave">' + otros + (otros === 1 ? ' persona más, sin nombre visible (no compartió su asistencia).' : ' personas más, sin nombre visible (no compartieron su asistencia).') + '</p>' : '') +
      (vigente ? '<div class="asi-qr-bloque">' + qrSVG(urlDeSesion(s.pase)) +
        '<div class="asi-qr-acc"><p class="suave">Muestra este QR o compártelo. Cada miembro lo escanea con la cámara de su teléfono.</p>' +
        '<a class="btn chico" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Marca tu asistencia en «' + s.nombre + '» (' + fechaCorta(s.fecha) + '): ' + urlDeSesion(s.pase)) + '">Compartir por WhatsApp</a>' +
        '<button type="button" class="btn chico sec" data-asi-imprimir="' + esc(s.id) + '">Imprimir el QR</button></div>' +
        '<div class="asi-print" aria-hidden="true"><h2>' + esc(s.nombre) + '</h2><p>' + fechaCorta(s.fecha) + '</p>' + qrSVG(urlDeSesion(s.pase)) +
        '<p>Escanea el código para marcar tu asistencia</p><p>Código: ' + esc(s.pase) + '</p>' + (s.cierra_en ? '<p>Válido hasta las ' + horaCorta(s.cierra_en) + '</p>' : '') + '</div></div>' : '') +
      '<div class="asi-duracion">' + selectorHoras(idSel, 2) +
        '<button type="button" class="btn chico" data-asi-duracion="' + esc(s.id) + '" data-sel="' + idSel + '">' + (vigente ? 'Cambiar el tiempo del QR' : 'Activar el QR') + '</button>' +
        (vigente ? '<button type="button" class="btn chico sec" data-asi-cerrar="' + esc(s.id) + '">Cerrar ahora</button>' : '') +
        '</div></article>';
  }

  // Guía para el pastor: cómo usarlo y qué trae. Es una ayuda; el pastor decide cómo usarla en su iglesia.
  function guiaHTML() {
    return '<details class="card asi-guia"><summary><b>Cómo usar el QR en tu iglesia</b></summary>' +
      '<p class="suave">Cada iglesia lo usa a su manera. Estas son sugerencias, no reglas.</p>' +
      '<p><b>Cómo se usa:</b> crea la sesión del culto, deja el QR activo el tiempo que quieras (por defecto 2 horas) e imprímelo o muéstralo en la pantalla de la entrada. Cada persona lo escanea con la cámara y queda marcada.</p>' +
      '<p><b>Para quién sirve:</b> para quien usa poco el teléfono, el pastor puede marcar a mano desde la lista de abajo. Quien no tiene la app no puede marcar con el QR; en ese caso el pastor le marca a mano.</p>' +
      '<p><b>Qué trae:</b> dejas de pasar lista en papel, ves cuántas personas vinieron y cómo cambia la asistencia mes a mes. Así puedes notar a quien hace tiempo no viene y acercarte a esa persona.</p>' +
      '<p><b>Un consejo:</b> cierra el QR al terminar el culto, o déjalo vencer solo. Así el código de un domingo no sirve el lunes.</p>' +
      '</details>';
  }

  function tendenciaHTML(meses) {
    if (!meses.length) return '<p class="suave">Todavía no hay asistencias en los últimos 12 meses.</p>';
    const pct = porcentajes(meses.map((m) => m.asistencias));
    return '<ul class="asi-barras" aria-label="Asistencias por mes">' + meses.map((m, i) =>
      '<li><span class="asi-mes">' + esc(mesLargo(m.mes)) + '</span>' +
      '<span class="asi-barra" aria-hidden="true"><span style="width:' + pct[i] + '%"></span></span>' +
      '<span class="asi-num">' + (Number(m.asistencias) || 0) + '</span>' +
      '<span class="suave asi-ses">(' + (Number(m.sesiones) || 0) + (m.sesiones === 1 ? ' sesión' : ' sesiones') + ')</span></li>'
    ).join('') + '</ul>';
  }

  let periodoIndicadores = 3;
  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    pant.innerHTML = '<button type="button" class="volver" id="asiVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Asistencia</h1>' +
      '<p class="suave" id="asiMsg" role="status">Cargando la asistencia…</p>' +
      '<div id="asiNueva"></div><div id="asiGuia"></div><div id="asiTendencia"></div><div id="asiIndicadores"></div><div id="asiSesiones"></div>';
    $('#asiVolver').onclick = ctx.volver;

    const refrescarIndicadores = async () => {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (periodoIndicadores - 1), 1);
      const d = fila(await ctx.rpc('pastor_asistencia_indicadores', p, { p_desde: isoFecha(desde), p_hasta: isoFecha(hoy) }));
      const el = $('#asiIndicadores'); if (!el) return;
      if (!d || !d.ok) { el.innerHTML = '<p class="suave">No pudimos cargar los indicadores. Revisa tu conexión.</p>'; return; }
      el.innerHTML = '<h2 class="mi-sub">Qué funciona y dónde trabajar más</h2><div class="card">' +
        '<label for="asiPeriodo">Período</label><select id="asiPeriodo">' +
        [3, 6, 12].map((m) => '<option value="' + m + '"' + (m === periodoIndicadores ? ' selected' : '') + '>Últimos ' + m + ' meses</option>').join('') +
        '</select>' + indicadoresHTML(d, periodoIndicadores) + '</div>';
      $('#asiPeriodo').onchange = () => { periodoIndicadores = Number($('#asiPeriodo').value) || 3; refrescarIndicadores(); };
    };

    const cargar = async (mensaje) => {
      const d = fila(await ctx.rpc('pastor_asistencia_listar', p));
      if (!d) { aviso('asiMsg', 'No pudimos cargar la asistencia. Revisa tu conexión y vuelve a intentarlo.'); return; }
      aviso('asiMsg', mensaje || '');
      const miembrosR = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
      const miembros = miembrosR && miembrosR.ok ? (miembrosR.data || []) : [];
      $('#asiNueva').innerHTML = '<div class="card"><b>Abrir una sesión nueva</b>' +
        '<label for="asiNombre">Nombre</label><input id="asiNombre" type="text" maxlength="80" value="Culto del domingo">' +
        '<label for="asiTipo">Tipo de actividad</label><select id="asiTipo"><option value="culto" selected>Culto</option><option value="grupo">Grupo</option><option value="evento">Evento</option><option value="reunion">Reunión</option><option value="otra">Otra</option></select>' +
        '<label for="asiFecha">Fecha</label><input id="asiFecha" type="date" value="' + fechaHoy + '">' +
        '<button type="button" class="btn" id="asiCrear">Crear sesión y ver su código</button></div>';
      $('#asiGuia').innerHTML = guiaHTML();
      $('#asiTendencia').innerHTML = '<h2 class="mi-sub">Asistencia de los últimos 12 meses</h2>' + tendenciaHTML(d.meses || []);
      refrescarIndicadores();
      const sesiones = d.sesiones || [];
      $('#asiSesiones').innerHTML = '<h2 class="mi-sub">Sesiones recientes</h2>' +
        (sesiones.length ? sesiones.map(sesionHTML).join('') : '<p class="suave">Todavía no hay sesiones. Crea la primera arriba.</p>') +
        (miembros.length && sesiones.length ? '<div class="card"><b>Marcar a una persona</b><p class="suave">Para quien no pudo escribir el código.</p>' +
          '<label for="asiMarcarSes">Sesión</label><select id="asiMarcarSes">' + sesiones.map((s) => '<option value="' + esc(s.id) + '">' + esc(fechaCorta(s.fecha) + ' · ' + s.nombre) + '</option>').join('') + '</select>' +
          '<label for="asiMarcarMie">Persona</label><select id="asiMarcarMie">' + miembros.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select>' +
          '<button type="button" class="btn chico sec" id="asiMarcar">Marcar como presente</button></div>' : '');

      $('#asiCrear').onclick = async () => {
        const nombre = $('#asiNombre').value, fecha = $('#asiFecha').value;
        const error = validarSesion(nombre, fecha);
        if (error) { aviso('asiMsg', error); return; }
        const r = await ctx.rpc('pastor_asistencia_sesion_crear', p, { p_fecha: fecha, p_nombre: nombre.trim(), p_tipo: $('#asiTipo').value });
        const c = fila(r);
        if (!c || !c.ok) { aviso('asiMsg', (c && MOTIVOS[c.motivo]) || 'No pudimos crear la sesión. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar('Sesión creada. Comparte el código ' + c.pase + ' con tus miembros.');
      };
      document.querySelectorAll('[data-asi-imprimir]').forEach((b) => b.onclick = () => { document.body.classList.add('asi-imprimiendo'); window.print(); setTimeout(() => document.body.classList.remove('asi-imprimiendo'), 500); });
      // Elegir horas: «Otra cantidad» muestra el campo numérico.
      document.querySelectorAll('[data-asi-duracion]').forEach((b) => {
        const sel = document.getElementById(b.getAttribute('data-sel'));
        const otra = document.getElementById(b.getAttribute('data-sel') + 'Otra');
        if (sel && otra) sel.onchange = () => { otra.hidden = sel.value !== 'otra'; if (!otra.hidden) otra.focus(); };
        b.onclick = async () => {
          const elegido = sel ? sel.value : '2';
          const horas = elegido === 'otra' ? Number(otra && otra.value) : Number(elegido);
          if (!Number.isInteger(horas) || horas < 1 || horas > 48) { aviso('asiMsg', MOTIVOS.horas); return; }
          const r = fila(await ctx.rpc('pastor_asistencia_sesion_duracion', p, { p_sesion: b.getAttribute('data-asi-duracion'), p_horas: horas }));
          if (!r || !r.ok) { aviso('asiMsg', 'No pudimos cambiar el tiempo del QR. Revisa tu conexión e inténtalo de nuevo.'); return; }
          cargar('Listo. El QR queda activo ' + horas + (horas === 1 ? ' hora' : ' horas') + ' desde ahora.');
        };
      });
      document.querySelectorAll('[data-asi-cerrar]').forEach((b) => b.onclick = async () => {
        const r = fila(await ctx.rpc('pastor_asistencia_sesion_estado', p, { p_sesion: b.getAttribute('data-asi-cerrar'), p_abierta: false }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos cerrar el QR. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar('QR cerrado. Ya no acepta códigos.');
      });
      const marcar = $('#asiMarcar');
      if (marcar) marcar.onclick = async () => {
        const r = fila(await ctx.rpc('pastor_asistencia_marcar', p, { p_sesion: $('#asiMarcarSes').value, p_miembro: $('#asiMarcarMie').value, p_marcar: true }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos marcar a esa persona. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar('Persona marcada como presente.');
      };
    };
    cargar();
  }

  // ---------- Miembro («Mi servicio» → Mi asistencia) ----------
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const traido = pasePendiente();
    const pintar = (d, mensaje) => {
      const ult = (d && d.ultimas) || [];
      c.innerHTML = '<div class="card asi-miembro"><b>Mi asistencia</b>' +
        (traido && !mensaje ? '<p class="asi-aviso">Llegaste con el código de la sesión. Revísalo y toca el botón para registrar tu asistencia.</p>' : '') +
        '<p class="suave">Este mes asististe a ' + (Number(d && d.mes) || 0) + (Number(d && d.mes) === 1 ? ' sesión.' : ' sesiones.') + '</p>' +
        '<label for="asiPaseMiembro">Código de la sesión</label>' +
        '<input id="asiPaseMiembro" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="Ej.: AB12CD34" value="' + esc(traido || '') + '">' +
        '<button type="button" class="btn chico" id="asiRegistrar">Registrar mi asistencia</button>' +
        '<p class="suave" id="asiMiMsg" role="status">' + esc(mensaje || '') + '</p>' +
        (ult.length ? '<p class="suave">Últimas sesiones: ' + ult.map((u) => esc(fechaCorta(u.fecha) + ' · ' + u.nombre)).join(' · ') + '</p>' : '') +
        '</div>';
      $('#asiRegistrar').onclick = async () => {
        const pase = normPase($('#asiPaseMiembro').value);
        if (!pase) { aviso('asiMiMsg', 'El código tiene 8 letras o números. Revísalo e inténtalo de nuevo.'); return; }
        $('#asiRegistrar').disabled = true;
        const r = await rpcRaw('miembro_asistencia_registrar', { p_codigo: id.codigo, p_clave: id.clave, p_pase: pase });
        const d2 = fila(r);
        if (!d2 || !d2.ok) {
          $('#asiRegistrar').disabled = false;
          aviso('asiMiMsg', (d2 && MOTIVOS[d2.motivo]) || 'No pudimos registrar tu asistencia. Revisa tu conexión e inténtalo de nuevo.');
          return;
        }
        const resumen = await rpcRaw('miembro_asistencia_leer', { p_codigo: id.codigo, p_clave: id.clave });
        limpiarPase();
        pintar(fila(resumen), d2.ya ? 'Ya estaba registrada tu asistencia en «' + d2.nombre + '».' : 'Listo: quedó registrada tu asistencia en «' + d2.nombre + '».');
      };
    };
    const r = await rpcRaw('miembro_asistencia_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = fila(r);
    if (!d || !d.ok) { c.innerHTML = ''; return; }
    pintar(d, '');
  }

  window.TBAsistencia = { abrir, miembroMostrar, leerEnlace, pasePendiente, _t: { normPase, porcentajes, mesLargo, fechaCorta, validarSesion, urlDeSesion, qrSVG, indicadoresHTML, sesionHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBAsistencia;
})();
