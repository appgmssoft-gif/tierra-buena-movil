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
  // F1394 · Agregar una actividad al calendario del teléfono (archivo .ics). Día completo, porque la actividad no guarda hora.
  function icsEscapa(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsPliega(linea) { // máximo 75 caracteres por línea, según el formato
    const partes = []; let resto = linea;
    while (resto.length > 75) { partes.push(resto.slice(0, 75)); resto = ' ' + resto.slice(75); }
    partes.push(resto); return partes.join('\r\n');
  }
  function icsEvento(ev, ahora) {
    const ymd = String(ev.fecha).replace(/-/g, '');
    const siguiente = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)) + 1);
    const fin = siguiente.getFullYear() + String(siguiente.getMonth() + 1).padStart(2, '0') + String(siguiente.getDate()).padStart(2, '0');
    const sello = ahora.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return ['BEGIN:VEVENT', 'UID:' + icsEscapa(ev.id) + '@tierrabuena', 'DTSTAMP:' + sello,
      'DTSTART;VALUE=DATE:' + ymd, 'DTEND;VALUE=DATE:' + fin,
      'SUMMARY:' + icsEscapa(ev.titulo), 'DESCRIPTION:' + icsEscapa(ev.descripcion || ''),
      // F1409 · 3.4 Dos recordatorios: el día anterior a las 9:00 y el mismo día a las 8:00 (el evento es de día completo).
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscapa('Mañana: ' + ev.titulo), 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscapa('Hoy: ' + ev.titulo), 'TRIGGER:PT8H', 'END:VALARM',
      'END:VEVENT'].map(icsPliega).join('\r\n') + '\r\n';
  }
  function icsCalendario(eventos, nombre) {
    const ahora = new Date();
    return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Tierra Buena//ES\r\nCALSCALE:GREGORIAN\r\n' +
      icsPliega('X-WR-CALNAME:' + icsEscapa(nombre || 'Tierra Buena')) + '\r\n' +
      eventos.map((e) => icsEvento(e, ahora)).join('') + 'END:VCALENDAR\r\n';
  }
  function descargarArchivo(nombre, texto, tipo) {
    const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  // F1391 · Exportar a Excel (CSV con punto y coma, para Chile) y búsqueda sin tildes.
  function csvCelda(v) {
    let t = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // evita que Excel ejecute una fórmula escrita por alguien
    return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function csvTexto(filas) {
    return '\uFEFF' + filas.map((f) => f.map(csvCelda).join(';')).join('\r\n');
  }
  function descargarCSV(nombre, filas) {
    const blob = new Blob([csvTexto(filas)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }
  function sinTildes(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function actividadesFilas(sesiones) {
    return [['Fecha', 'Actividad', 'Tipo', 'Personas', 'Miembros', 'Visitas', 'Estado']].concat(
      sesiones.map((s) => [fechaCorta(s.fecha), s.nombre, TIPOS[s.tipo] || s.tipo, s.total || 0, s.miembros || 0, s.visitas || 0,
        s.vigente ? 'Activa' : (s.archivada ? 'Archivada' : 'Cerrada')]));
  }

  // F1388 · Limpiar el historial de QR: archiva lo pasado (los números se conservan) y borra lo que no tuvo asistencia.
  const LIMPIEZA_HTML = '<div class="card asi-limpieza"><b>Limpiar el historial</b>' +
    '<p class="suave">Las actividades pasadas se archivan: dejan de verse en la lista, pero sus números siguen en los indicadores. Las que no tuvieron ninguna asistencia se borran.</p>' +
    '<label for="asiDias">Limpiar actividades de hace más de</label><select id="asiDias">' +
    '<option value="30">30 días</option><option value="60" selected>60 días</option><option value="90">90 días</option><option value="180">180 días</option></select>' +
    '<button type="button" class="btn chico asi-peligro" id="asiLimpiar">Limpiar ahora</button></div>';
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
    if (!d.sesiones) return '<div class="asi-vacio"><b>Sin datos en este período</b><p class="suave">Cuando haya actividades con asistencia, aquí verás qué días y actividades reúnen más gente.</p></div>';
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
  // F1401 · Cuánto falta para que el QR se cierre (solo si faltan 15 minutos o menos).
  function cierraEnTexto(iso) {
    const mins = Math.round((new Date(iso) - Date.now()) / 60000);
    return mins > 0 && mins <= 15 ? ' · se cierra en ' + mins + ' min' : '';
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
    return '<article class="card asi-sesion" id="asi-ses-' + esc(s.id) + '" data-busqueda="' + esc(sinTildes(s.nombre)) + '"><h2>' + esc(s.nombre) + '</h2>' +
      '<p class="suave">' + esc(TIPOS[s.tipo] || 'Actividad') + ' · ' + fechaCorta(s.fecha) + ' · ' + (Number(s.total) || 0) + ' personas (' + (Number(s.miembros) || 0) + ' miembros y ' + (Number(s.visitas) || 0) + ' visitas) · <span class="asi-estado ' + (vigente ? 'on' : 'off') + '">' + esc(estado) + '</span></p>' +
      '<p class="asi-pase"><span class="suave">Código para tus miembros:</span> <b aria-label="Código de la sesión: ' + esc(s.pase.split('').join(' ')) + '">' + esc(s.pase) + '</b> ' +
        '<button type="button" class="btn chico sec" data-asi-copiar="' + esc(s.pase) + '">Copiar código</button> ' +
        '<button type="button" class="btn chico sec" data-asi-enlace="' + esc(s.pase) + '">Copiar enlace</button></p>' +
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
        '<button type="button" class="btn chico sec" data-asi-personalizar="' + esc(s.id) + '">Personalizar</button>' +
        '<button type="button" class="btn chico sec" data-asi-ics="' + esc(s.id) + '">Agregar al calendario</button>' +
        '<button type="button" class="btn chico sec" data-asi-archivar="' + esc(s.id) + '">Archivar</button>' +
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
      '<p><b>Personaliza cada actividad:</b> con «Personalizar» agregas eslogan, lugar, una imagen (enlace https) y un mensaje de bienvenida. Quien escanea lo ve al instante.</p>' +
      '<p><b>Dos pasos para confirmar:</b> antes del evento la persona puede confirmar. Su asistencia real queda el día del evento, al escanear el QR. Así ves cuántos confirmados llegaron.</p>' +
      '<p><b>Para aprender:</b> en «Qué funciona» ves el día y la actividad con más gente. Puedes descargar las actividades y las visitas en Excel.</p>' +
      '<p><b>Mantén el orden:</b> «Limpiar ahora» archiva lo pasado. Los números se conservan; solo se ocultan de la lista.</p>' +
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

  // F1400 · Recordar preferencias del pastor en este teléfono (si el navegador lo permite).
  const guardarPref = (clave, valor) => { try { localStorage.setItem(clave, String(valor)); } catch (e) { /* sin almacenamiento */ } };
  const leerPref = (clave) => { try { return localStorage.getItem(clave); } catch (e) { return null; } };
  let periodoIndicadores = Number(leerPref('tb_asi_periodo')) || 3;
  let ultimoPanel = 'hoy';
  // F1389 · Personas: con cuenta, sin cuenta y visitas por nombre.
  function personasHTML(x) {
    if (!x || !x.ok) return '<p class="suave">No pudimos cargar las personas. Revisa tu conexión.</p>';
    const visitas = (x.visitas || []).map((v) => '<li data-vis="' + esc(sinTildes(v.nombre + ' ' + v.apellido)) + '"><b>' + esc(v.nombre + ' ' + v.apellido) + '</b> · vino ' + v.veces +
      (v.veces === 1 ? ' vez' : ' veces') + ' · última ' + esc(fechaCorta(v.ultima)) + '</li>').join('');
    return '<ul class="asi-lista">' +
      '<li>Miembros con cuenta que marcaron: <b>' + x.con_cuenta + '</b></li>' +
      '<li>Miembros sin cuenta que marcaron: <b>' + x.sin_cuenta_miembros + '</b></li>' +
      '<li>Visitas (asistencias): <b>' + x.visitas_asistencias + '</b> · personas distintas: <b>' + x.visitas_distintas + '</b></li></ul>' +
      (visitas ? '<label for="asiBuscarVis">Buscar una visita por nombre</label><input id="asiBuscarVis" type="search" placeholder="Escribe un nombre">' +
        '<p class="suave" id="asiBuscarVisCuenta" role="status"></p>' +
        '<p class="suave">Visitas por nombre:</p><ul class="asi-lista" id="asiListaVis">' + visitas + '</ul>' +
        '<button type="button" class="btn chico sec" id="asiCsvVis">Descargar visitas (Excel)</button>' : '');
  }
  // F1387 · Frente al período anterior: subió o bajó, en porcentaje.
  function flecha(x, y) {
    if (!y && !x) return 'igual';
    if (!y) return 'más que antes';
    const q = Math.round((x - y) / y * 100);
    return q === 0 ? 'igual que antes' : (q > 0 ? 'subió ' : 'bajó ') + Math.abs(q) + '%';
  }
  function comparacionHTML(a, b) {
    return '<h3 class="mi-sub">Frente al período anterior</h3><ul class="asi-lista">' +
      '<li>Asistencias: <b>' + a.asistencias + '</b> (' + flecha(a.asistencias, b.asistencias) + ')</li>' +
      '<li>Visitas distintas: <b>' + a.visitantes_distintos + '</b> (' + flecha(a.visitantes_distintos, b.visitantes_distintos) + ')</li></ul>';
  }
  // F1385 · Visitas que no han vuelto (7 a 90 días): para llamarlas o escribirles.
  async function visitasSinVolver(p, ctx) {
    const d = fila(await ctx.rpc('pastor_visitas_sin_volver', p, { p_dias_min: 7, p_dias_max: 90 }));
    if (!d || !d.ok) return '<p class="suave">No pudimos cargar las visitas. Revisa tu conexión.</p>';
    const lista = d.visitas || [];
    if (!lista.length) return '<p class="suave">Por ahora no hay visitas pendientes de seguimiento. Así se ve cuando la gente vuelve.</p>';
    return '<p class="suave">Visitas que vinieron hace al menos una semana y no han vuelto. Un saludo a tiempo ayuda mucho.</p>' +
      '<ul class="asi-lista">' + lista.map((v) => '<li><b>' + esc(v.nombre + ' ' + v.apellido) + '</b> · ' +
        esc(fechaCorta(v.ultima)) + ' (hace ' + (Number(v.dias_sin_venir) || 0) + ' días)' +
        (Number(v.veces) > 1 ? ' · ' + v.veces + ' veces' : ' · vino una vez') +
        ' <button type="button" class="btn chico sec" data-visita-contactada="' + esc(v.clave) + '">Ya la contacté</button></li>').join('') + '</ul>';
  }
  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    pant.innerHTML = '<button type="button" class="volver" id="asiVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Asistencia</h1>' +
      '<p class="suave" id="asiMsg" role="status">Cargando la asistencia…</p>' +
      '<nav class="asi-tabs" role="tablist" aria-label="Secciones de asistencia">' +
      '<button type="button" class="asi-tab" role="tab" id="asiTab-hoy" data-tab="hoy" aria-controls="asiPanel-hoy">Hoy</button>' +
      '<button type="button" class="asi-tab" role="tab" id="asiTab-actividades" data-tab="actividades" aria-controls="asiPanel-actividades">Actividades</button>' +
      '<button type="button" class="asi-tab" role="tab" id="asiTab-personas" data-tab="personas" aria-controls="asiPanel-personas">Personas</button>' +
      '<button type="button" class="asi-tab" role="tab" id="asiTab-funciona" data-tab="funciona" aria-controls="asiPanel-funciona">Qué funciona</button>' +
      '<button type="button" class="asi-tab" role="tab" id="asiTab-ajustes" data-tab="ajustes" aria-controls="asiPanel-ajustes">Ajustes y ayuda</button>' +
      '</nav>' +
      '<section class="asi-panel" role="tabpanel" id="asiPanel-hoy" data-panel="hoy" aria-labelledby="asiTab-hoy"><div id="asiHoy" role="status" aria-live="polite"></div><div id="asiNueva"></div></section>' +
      '<section class="asi-panel" role="tabpanel" id="asiPanel-actividades" data-panel="actividades" aria-labelledby="asiTab-actividades" hidden><div id="asiDetalle"></div><div id="asiSesiones"></div></section>' +
      '<section class="asi-panel" role="tabpanel" id="asiPanel-personas" data-panel="personas" aria-labelledby="asiTab-personas" hidden><div id="asiPersonas"></div></section>' +
      '<section class="asi-panel" role="tabpanel" id="asiPanel-funciona" data-panel="funciona" aria-labelledby="asiTab-funciona" hidden><div id="asiIndicadores"></div><div id="asiTendencia"></div></section>' +
      '<section class="asi-panel" role="tabpanel" id="asiPanel-ajustes" data-panel="ajustes" aria-labelledby="asiTab-ajustes" hidden><div id="asiGuia"></div><div id="asiAjustes"></div></section>';
    $('#asiVolver').onclick = ctx.volver;

    // F1392 · Pestañas: una sección a la vez, con flechas del teclado. Recuerda la última que usaste.
    const TAB_IDS = ['hoy', 'actividades', 'personas', 'funciona', 'ajustes'];
    const mostrarPanel = (nombre, enfocar) => {
      if (TAB_IDS.indexOf(nombre) < 0) nombre = 'hoy';
      ultimoPanel = nombre;
      pant.querySelectorAll('.asi-panel').forEach((sec) => { sec.hidden = sec.getAttribute('data-panel') !== nombre; });
      pant.querySelectorAll('.asi-tab').forEach((b) => {
        const activo = b.getAttribute('data-tab') === nombre;
        b.setAttribute('aria-selected', activo ? 'true' : 'false');
        b.tabIndex = activo ? 0 : -1;
        if (activo && enfocar) b.focus();
      });
    };
    pant.querySelectorAll('.asi-tab').forEach((b) => {
      b.onclick = () => mostrarPanel(b.getAttribute('data-tab'), false);
      b.onkeydown = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const i = TAB_IDS.indexOf(b.getAttribute('data-tab'));
        const j = (i + (e.key === 'ArrowRight' ? 1 : TAB_IDS.length - 1)) % TAB_IDS.length;
        mostrarPanel(TAB_IDS[j], true);
      };
    });
    mostrarPanel(ultimoPanel, false);

    // F1389 · Editor de la actividad: personaliza y muestra quién vino y quién confirmó.
    const abrirDetalle = async (id) => {
      const d = fila(await ctx.rpc('pastor_actividad_detalle', p, { p_sesion: id }));
      const el = $('#asiDetalle');
      if (!d || !d.ok) { el.innerHTML = '<p class="suave">No pudimos abrir la actividad. Inténtalo de nuevo.</p>'; return; }
      const a = d.actividad;
      const lista = (titulo, arr) => '<p><b>' + titulo + ' (' + arr.length + ')</b></p>' +
        (arr.length ? '<ul class="asi-lista">' + arr.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="suave">Todavía nadie.</p>');
      el.innerHTML = '<div class="card asi-detalle"><h2 class="mi-sub">Personalizar: ' + esc(a.nombre) + '</h2>' +
        '<label for="adEslogan">Eslogan de la actividad</label><input id="adEslogan" maxlength="120" value="' + esc(a.eslogan || '') + '">' +
        '<label for="adLugar">Lugar</label><input id="adLugar" maxlength="120" value="' + esc(a.lugar || '') + '">' +
        '<label for="adDesc">Descripción</label><textarea id="adDesc" maxlength="600" rows="3">' + esc(a.descripcion || '') + '</textarea>' +
        '<label for="adImg">Imagen (enlace que empiece por https://)</label><input id="adImg" type="url" maxlength="500" placeholder="https://..." value="' + esc(a.imagen_url || '') + '">' +
        '<label for="adMsg">Mensaje de bienvenida para quien marca</label><input id="adMsg" maxlength="300" value="' + esc(a.mensaje_bienvenida || '') + '">' +
        '<label class="asi-check"><input type="checkbox" id="adMostrarApp"' + (a.mostrar_app ? ' checked' : '') + '> Mostrar a quien confirma la invitación a conocer la app</label>' +
        '<div class="asi-duracion"><button type="button" class="btn chico" id="adGuardar">Guardar cambios</button>' +
        '<button type="button" class="btn chico sec" id="adCerrar">Cerrar</button></div>' +
        '<h3 class="mi-sub">Quién vino</h3>' + lista('Miembros con cuenta', d.presentes_cuenta || []) + lista('Sin cuenta', d.presentes_sin_cuenta || []) +
        '<h3 class="mi-sub">Confirmaron antes</h3>' +
        '<p class="suave">Llegaron: <b>' + (d.confirmados_llegaron || 0) + '</b> · aún no llegan: <b>' + (d.confirmados_no_llegaron || 0) +
        '</b>. La asistencia real es la que se marca el día del evento con el QR.</p>' + lista('Confirmados', d.confirmados || []) + '</div>';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#adCerrar').onclick = () => { el.innerHTML = ''; };
      $('#adGuardar').onclick = async () => {
        const r = fila(await ctx.rpc('pastor_actividad_guardar', p, {
          p_sesion: id, p_eslogan: $('#adEslogan').value, p_lugar: $('#adLugar').value,
          p_descripcion: $('#adDesc').value, p_imagen: $('#adImg').value, p_mensaje: $('#adMsg').value,
          p_mostrar_app: $('#adMostrarApp').checked }));
        if (!r || !r.ok) {
          const msg = r && r.motivo === 'imagen' ? 'El enlace de la imagen debe empezar por https:// (y no pasar de 500 letras).'
            : r && r.motivo === 'largo' ? 'Uno de los textos es demasiado largo.'
            : 'No pudimos guardar los cambios. Inténtalo de nuevo.';
          aviso('asiMsg', msg); return;
        }
        await abrirDetalle(id);
        aviso('asiMsg', 'Cambios guardados. Así lo verá quien escanee el QR.');
      };
    };

    let ultimasVisitas = [];
    const refrescarIndicadores = async () => {
      const elCarga = $('#asiIndicadores');
      if (elCarga) elCarga.innerHTML = '<p class="suave">Cargando indicadores…</p>';
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (periodoIndicadores - 1), 1);
      const d = fila(await ctx.rpc('pastor_asistencia_indicadores', p, { p_desde: isoFecha(desde), p_hasta: isoFecha(hoy) }));
      const finPrev = new Date(hoy.getFullYear(), hoy.getMonth() - (periodoIndicadores - 1), 0);
      const desdePrev = new Date(hoy.getFullYear(), hoy.getMonth() - (2 * periodoIndicadores - 1), 1);
      const dPrev = fila(await ctx.rpc('pastor_asistencia_indicadores', p, { p_desde: isoFecha(desdePrev), p_hasta: isoFecha(finPrev) }));
      const dPer = fila(await ctx.rpc('pastor_personas_resumen', p, { p_desde: isoFecha(desde), p_hasta: isoFecha(hoy) }));
      ultimasVisitas = (dPer && dPer.visitas) || [];
      const el = $('#asiIndicadores'); if (!el) return;
      if (!d || !d.ok) { el.innerHTML = '<p class="suave">No pudimos cargar los indicadores. Revisa tu conexión.</p>'; return; }
      el.innerHTML = '<h2 class="mi-sub">Qué funciona y dónde trabajar más</h2><div class="card">' +
        '<label for="asiPeriodo">Período</label><select id="asiPeriodo">' +
        [3, 6, 12].map((m) => '<option value="' + m + '"' + (m === periodoIndicadores ? ' selected' : '') + '>Últimos ' + m + ' meses</option>').join('') +
        '</select>' + indicadoresHTML(d, periodoIndicadores) +
        (dPrev && dPrev.ok && d.ok ? comparacionHTML(d, dPrev) : '') + '</div>';
      const pe = $('#asiPersonas');
      if (pe) pe.innerHTML = '<h2 class="mi-sub">Personas</h2><div class="card">' + personasHTML(dPer) + '</div>' +
        '<h2 class="mi-sub">Visitas para dar seguimiento</h2><div class="card">' + (await visitasSinVolver(p, ctx)) + '</div>';
      $('#asiPeriodo').onchange = () => { periodoIndicadores = Number($('#asiPeriodo').value) || 3; guardarPref('tb_asi_periodo', periodoIndicadores); refrescarIndicadores(); };
      const buscar = $('#asiBuscarVis');
      if (buscar) buscar.oninput = () => {
        const q = sinTildes(buscar.value).trim();
        const visLis = document.querySelectorAll('[data-vis]'); let vis = 0;
        visLis.forEach((li) => { const ok = !q || li.getAttribute('data-vis').includes(q); li.hidden = !ok; if (ok) vis++; });
        const cuenta = $('#asiBuscarVisCuenta'); if (cuenta) cuenta.textContent = !q ? '' : (vis ? vis + (vis === 1 ? ' visita encontrada' : ' visitas encontradas') : 'No hay visitas con ese nombre.');
      };
      const csvVis = $('#asiCsvVis');
      if (csvVis) csvVis.onclick = () => descargarCSV('visitas-asistencia.csv',
        [['Nombre', 'Apellido', 'Veces que vino', 'Primera vez', 'Última vez']].concat(
          ultimasVisitas.map((v) => [v.nombre, v.apellido, v.veces, fechaCorta(v.primera), fechaCorta(v.ultima)])));
      document.querySelectorAll('[data-visita-contactada]').forEach((b) => b.onclick = async () => {
        const r = fila(await ctx.rpc('pastor_visita_contactada', p, { p_clave: b.getAttribute('data-visita-contactada') }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos guardar el seguimiento. Inténtalo de nuevo.'); return; }
        refrescarIndicadores();
      });
    };

    const cargar = async (mensaje) => {
      const d = fila(await ctx.rpc('pastor_asistencia_listar', p));
      // F1386 · Error visible con «Reintentar»; si es un tema de permisos, se dice claro.
      if (!d) {
        aviso('asiMsg', 'No pudimos cargar la asistencia. Revisa tu conexión y vuelve a intentarlo.');
        $('#asiMsg').insertAdjacentHTML('beforeend', ' <button type="button" class="btn chico sec" id="asiReintentar">Reintentar</button>');
        $('#asiReintentar').onclick = () => abrir(p, ctx);
        return;
      }
      if (d.ok === false) {
        aviso('asiMsg', d.motivo === 'sin-permiso' ? 'Tu clave de pastor no tiene permiso para ver la asistencia. Vuelve a entrar con tu cuenta de pastor.' : 'No pudimos cargar la asistencia (' + (d.motivo || 'error') + ').');
        return;
      }
      aviso('asiMsg', mensaje || '');
      const miembrosR = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
      const miembros = miembrosR && miembrosR.ok ? (miembrosR.data || []) : [];
      $('#asiNueva').innerHTML = '<div class="card"><b>Crear una actividad nueva</b>' +
        '<label for="asiNombre">Nombre</label><input id="asiNombre" type="text" maxlength="80" value="Culto del domingo">' +
        '<label for="asiTipo">Tipo de actividad</label><select id="asiTipo"><option value="culto" selected>Culto</option><option value="grupo">Grupo</option><option value="evento">Evento</option><option value="reunion">Reunión</option><option value="otra">Otra</option></select>' +
        '<label for="asiFecha">Fecha</label><input id="asiFecha" type="date" value="' + fechaHoy + '">' +
        '<button type="button" class="btn" id="asiCrear">Crear actividad y ver su QR</button></div>';
      { const t = leerPref('tb_asi_tipo'); if (t && $('#asiTipo')) $('#asiTipo').value = t; }
      if ($('#asiNombre')) $('#asiNombre').onfocus = (e) => e.target.select();
      $('#asiGuia').innerHTML = guiaHTML();
      $('#asiTendencia').innerHTML = '<h2 class="mi-sub">Asistencia de los últimos 12 meses</h2>' + tendenciaHTML(d.meses || []);
      refrescarIndicadores();
      const sesiones = d.sesiones || [];
      $('#asiSesiones').innerHTML = '<h2 class="mi-sub">Actividades recientes</h2>' +
        '<label for="asiBuscarAct">Buscar una actividad</label><input id="asiBuscarAct" type="search" placeholder="Escribe el nombre">' +
        '<p class="suave" id="asiBuscarActCuenta" role="status"></p>' +
        '<button type="button" class="btn chico sec" id="asiCsvAct">Descargar actividades (Excel)</button>' +
        (sesiones.length ? sesiones.map(sesionHTML).join('') : '<div class="asi-vacio"><b>Aún no hay actividades</b><p class="suave">Crea la primera en «Hoy» y comparte su QR.</p></div>') +
        (miembros.length && sesiones.length ? '<div class="card"><b>Marcar a una persona</b><p class="suave">Para quien no pudo escribir el código.</p>' +
          '<label for="asiMarcarSes">Sesión</label><select id="asiMarcarSes">' + sesiones.map((s) => '<option value="' + esc(s.id) + '">' + esc(fechaCorta(s.fecha) + ' · ' + s.nombre) + '</option>').join('') + '</select>' +
          '<label for="asiMarcarMie">Persona</label><select id="asiMarcarMie">' + miembros.map((m) => '<option value="' + esc(m.id) + '">' + esc(m.nombre) + '</option>').join('') + '</select>' +
          '<button type="button" class="btn chico sec" id="asiMarcar">Marcar como presente</button></div>' : '');

      $('#asiCrear').onclick = async () => {
        const nombre = $('#asiNombre').value, fecha = $('#asiFecha').value;
        const error = validarSesion(nombre, fecha);
        if (error) { aviso('asiMsg', error); $('#asiNombre').focus(); return; }
        const r = await ctx.rpc('pastor_asistencia_sesion_crear', p, { p_fecha: fecha, p_nombre: nombre.trim(), p_tipo: $('#asiTipo').value });
        const c = fila(r);
        if (!c || !c.ok) { aviso('asiMsg', (c && MOTIVOS[c.motivo]) || 'No pudimos crear la sesión. Revisa tu conexión e inténtalo de nuevo.'); return; }
        guardarPref('tb_asi_tipo', $('#asiTipo').value);
        cargar('Sesión creada. Comparte el código ' + c.pase + ' con tus miembros.');
      };
      document.querySelectorAll('[data-asi-imprimir]').forEach((b) => b.onclick = () => { document.body.classList.add('asi-imprimiendo'); window.print(); setTimeout(() => document.body.classList.remove('asi-imprimiendo'), 500); });
      // F1388 · Limpiar historial y archivar, con confirmación antes de cada acción.
      const bl = $('#asiLimpiar');
      if (bl) bl.onclick = async () => {
        const dias = Number($('#asiDias').value) || 60;
        if (!window.confirm('¿Limpiar las actividades de hace más de ' + dias + ' días? Las que no tuvieron asistencia se borran y las demás se archivan. Los números no se pierden.')) return;
        const r = fila(await ctx.rpc('pastor_asistencia_limpiar', p, { p_dias: dias }));
        if (!r || !r.ok) { aviso('asiMsg', r && r.motivo === 'sin-permiso' ? 'Tu clave de pastor no tiene permiso para limpiar el historial.' : 'No pudimos limpiar el historial. Inténtalo de nuevo.'); return; }
        cargar('Listo: ' + (r.archivadas || 0) + ' archivadas y ' + (r.borradas || 0) + ' borradas.');
      };
      document.querySelectorAll('[data-asi-archivar]').forEach((b) => b.onclick = async () => {
        if (!window.confirm('¿Archivar esta actividad? Dejará de verse y su QR se cerrará. Sus números se conservan.')) return;
        const r = fila(await ctx.rpc('pastor_asistencia_archivar', p, { p_sesion: b.getAttribute('data-asi-archivar'), p_archivar: true }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos archivar la actividad. Inténtalo de nuevo.'); return; }
        cargar('Actividad archivada.');
      });

      document.querySelectorAll('[data-asi-personalizar]').forEach((b) => b.onclick = () => abrirDetalle(b.getAttribute('data-asi-personalizar')));
      $('#asiCsvAct').onclick = () => descargarCSV('actividades-asistencia.csv', actividadesFilas(sesiones));
      const buscarAct = $('#asiBuscarAct');
      if (buscarAct) buscarAct.oninput = () => {
        const q = sinTildes(buscarAct.value).trim();
        let visibles = 0;
        document.querySelectorAll('.asi-sesion').forEach((art) => {
          const ok = !q || (art.getAttribute('data-busqueda') || '').includes(q);
          art.hidden = !ok; if (ok) visibles++;
        });
        $('#asiBuscarActCuenta').textContent = !q ? '' : (visibles
          ? visibles + (visibles === 1 ? ' actividad encontrada' : ' actividades encontradas')
          : 'No hay actividades con ese nombre.');
      };
      document.querySelectorAll('[data-asi-ics]').forEach((b) => b.onclick = () => {
        const x = sesiones.find((q) => q.id === b.getAttribute('data-asi-ics'));
        if (!x) return;
        descargarArchivo('actividad-' + x.fecha + '.ics',
          icsCalendario([{ id: x.id, titulo: x.nombre, fecha: x.fecha, descripcion: 'Actividad de la iglesia. Marca tu asistencia escaneando el QR.' }], 'Tierra Buena'),
          'text/calendar;charset=utf-8');
      });
      $('#asiAjustes').innerHTML = '<h2 class="mi-sub">Ajustes del historial</h2>' + LIMPIEZA_HTML;
      // F1397 · Mi plan y canje de códigos de regalo. La base de datos decide el plan; aquí solo se muestra.
      const lic = fila(await ctx.rpc('licencia_mia', p));
      const planTxt = !lic || !lic.ok ? 'No pudimos leer tu plan. Revisa tu conexión.'
        : lic.activa ? 'Tu plan: ' + (lic.plan === 'iglesia' ? 'Iglesia' : 'Plus') + ' · vence el ' + fechaCorta(String(lic.fin).slice(0, 10))
        : 'Tu plan: Gratis.';
      $('#asiAjustes').insertAdjacentHTML('afterbegin', '<div class="card asi-plan"><b>Mi plan</b><p class="suave">' + esc(planTxt) + '</p>' +
        '<label for="asiRegalo">¿Tienes un código de regalo?</label>' +
        '<input id="asiRegalo" type="text" maxlength="40" autocomplete="off" placeholder="TB-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX">' +
        '<button type="button" class="btn chico" id="asiCanjear">Canjear código</button>' +
        '<button type="button" class="btn chico sec" id="asiVerPlanes">Ver planes y precios</button><div id="asiPlanes" role="status" aria-live="polite"></div></div>');
      // F1399 · Planes y precios. Solo muestra la lista; el pago todavía no está habilitado.
      const precioCLP = (n) => '$' + Number(n).toLocaleString('es-CL');
      $('#asiVerPlanes').onclick = async () => {
        const r = fila(await ctx.rpc('precios_listar', {}));
        const el = $('#asiPlanes');
        if (!r || !r.ok || !Array.isArray(r.planes)) { el.innerHTML = '<p class="suave">No pudimos cargar los precios. Revisa tu conexión.</p>'; return; }
        el.innerHTML = '<ul class="asi-lista">' + r.planes.map((x) => '<li><b>' + esc(x.nombre) + '</b> · ' + precioCLP(x.precio_mensual) + ' al mes' +
          (x.precio_inicial < x.precio_mensual ? '<br><span class="suave">Primeros ' + x.meses_descuento + ' meses: ' + precioCLP(x.precio_inicial) + ' al mes</span>' : '') +
          '</li>').join('') + '</ul>' +
          '';
      };
      $('#asiCanjear').onclick = async () => {
        const r = fila(await ctx.rpc('licencia_canjear', p, { p_regalo: $('#asiRegalo').value }));
        if (!r || !r.ok) {
          const motivos = { 'codigo-no-valido': 'Ese código no es válido. Revisa que lo escribiste bien.',
            'codigo-usado': 'Ese código ya se usó.', 'codigo-vencido': 'Ese código venció.',
            'demasiados-intentos': 'Hiciste demasiados intentos. Espera 15 minutos.',
            'sin-permiso': 'Tu clave de pastor no tiene permiso para esta acción.' };
          aviso('asiMsg', motivos[r && r.motivo] || 'No pudimos canjear el código. Inténtalo de nuevo.');
          return;
        }
        cargar('Listo: tu plan ' + (r.plan === 'iglesia' ? 'Iglesia' : 'Plus') + ' quedó activo.');
      };
      const activas = sesiones.filter((x) => x.vigente);
      $('#asiHoy').innerHTML = '<div class="card asi-hoy"><b>Ahora mismo</b>' + (activas.length
        ? activas.map((x) => '<div class="asi-hoy-item"><span><b>' + esc(x.nombre) + '</b> · ' +
            (x.cierra_en ? 'activo hasta las ' + horaCorta(x.cierra_en) : 'activo') + ' · ' + (Number(x.total) || 0) + ' personas' + (x.cierra_en ? cierraEnTexto(x.cierra_en) : '') + '</span> ' +
            '<button type="button" class="btn chico sec" data-asi-extender="' + esc(x.id) + '">Activar 1 hora más</button> ' +
            '<button type="button" class="btn chico sec" data-asi-cerrar="' + esc(x.id) + '">Cerrar ahora</button> ' +
            '<button type="button" class="btn chico" data-ir-actividad="' + esc(x.id) + '">Ver su QR</button></div>').join('')
        : '<p class="suave">No hay ningún QR activo. Crea una actividad abajo y ábrela cuando empiece.</p>') +
        '</div><p class="suave asi-resumen">' + activas.length + (activas.length === 1 ? ' actividad activa' : ' actividades activas') +
        ' · ' + sesiones.length + ' en total. <button type="button" class="btn chico sec" id="asiActualizar">Actualizar</button></p>' +
        (sesiones.length ? '' : '<button type="button" class="btn chico" id="asiPrimera">Crear mi primera actividad</button>');
      document.querySelectorAll('[data-asi-extender]').forEach((b) => b.onclick = async () => {
        const r = fila(await ctx.rpc('pastor_asistencia_sesion_duracion', p, { p_sesion: b.getAttribute('data-asi-extender'), p_horas: 1 }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos activar el QR. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar('QR activo 1 hora más desde ahora.');
      });
      const actualizar = $('#asiActualizar');
      if (actualizar) actualizar.onclick = () => cargar('Lista actualizada.');
      document.querySelectorAll('[data-asi-copiar]').forEach((b) => b.onclick = async () => {
        const codigo = b.getAttribute('data-asi-copiar');
        try { await navigator.clipboard.writeText(codigo); aviso('asiMsg', 'Código ' + codigo + ' copiado.'); }
        catch (e) { aviso('asiMsg', 'Tu navegador no permite copiar. El código es ' + codigo + '.'); }
      });
      document.querySelectorAll('[data-asi-enlace]').forEach((b) => b.onclick = async () => {
        const url = urlDeSesion(b.getAttribute('data-asi-enlace'));
        try { await navigator.clipboard.writeText(url); aviso('asiMsg', 'Enlace copiado. Pégalo donde tus miembros lo vean.'); }
        catch (e) { aviso('asiMsg', 'Tu navegador no permite copiar. El enlace es ' + url); }
      });
      const bp = $('#asiPrimera');
      if (bp) bp.onclick = () => { const n = $('#asiNombre'); if (n) n.focus(); };
      document.querySelectorAll('[data-ir-actividad]').forEach((b) => b.onclick = () => {
        mostrarPanel('actividades', false);
        const tarjeta = document.getElementById('asi-ses-' + b.getAttribute('data-ir-actividad'));
        if (tarjeta) tarjeta.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

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
        if (!window.confirm('¿Cerrar el QR ahora? Las personas ya no podrán marcar con este código.')) return;
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

  window.TBAsistencia = { abrir, miembroMostrar, leerEnlace, pasePendiente, _t: { normPase, porcentajes, mesLargo, fechaCorta, validarSesion, urlDeSesion, qrSVG, indicadoresHTML, sesionHTML, csvCelda, csvTexto, sinTildes, actividadesFilas, icsCalendario, icsEscapa, icsPliega } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBAsistencia;
})();
