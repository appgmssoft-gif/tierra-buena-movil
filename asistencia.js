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
  function urlDeSesion(pase) {
    try { return location.origin + location.pathname + '?asistencia=' + pase; } catch (e) { return '?asistencia=' + pase; }
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
    'sesion-cerrada': 'Esa sesión ya está cerrada. Pídele al pastor que la abra.',
    'sin-acceso': 'No pudimos confirmar tu cuenta. Vuelve a entrar e inténtalo de nuevo.',
    fecha: 'La fecha debe estar dentro del último año o en los próximos 30 días.',
  };

  function sesionHTML(s) {
    const nombres = (s.con_nombre || []);
    const otros = Number(s.sin_nombre) || 0;
    return '<article class="card asi-sesion"><h2>' + esc(s.nombre) + '</h2>' +
      '<p class="suave">' + fechaCorta(s.fecha) + ' · ' + (Number(s.total) || 0) + ' asistencias' + (s.abierta ? '' : ' · cerrada') + '</p>' +
      '<p class="asi-pase"><span class="suave">Código para tus miembros:</span> <b aria-label="Código de la sesión: ' + esc(s.pase.split('').join(' ')) + '">' + esc(s.pase) + '</b></p>' +
      '<p class="suave">Tus miembros lo escriben en «Mi servicio» → «Registrar mi asistencia».</p>' +
      (nombres.length ? '<p><b>Presentes:</b> ' + nombres.map(esc).join(', ') + '</p>' : '') +
      (otros ? '<p class="suave">' + otros + (otros === 1 ? ' persona más, sin nombre visible (no compartió su asistencia).' : ' personas más, sin nombre visible (no compartieron su asistencia).') + '</p>' : '') +
      (s.abierta ? '<div class="asi-qr-bloque">' + qrSVG(urlDeSesion(s.pase)) +
        '<div class="asi-qr-acc"><p class="suave">Muestra este QR o compártelo. Cada miembro lo escanea con la cámara de su teléfono.</p>' +
        '<a class="btn chico" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Marca tu asistencia en «' + s.nombre + '» (' + fechaCorta(s.fecha) + '): ' + urlDeSesion(s.pase)) + '">Compartir por WhatsApp</a>' +
        '<button type="button" class="btn chico sec" data-asi-imprimir="' + esc(s.id) + '">Imprimir el QR</button></div>' +
        '<div class="asi-print" aria-hidden="true"><h2>' + esc(s.nombre) + '</h2><p>' + fechaCorta(s.fecha) + '</p>' + qrSVG(urlDeSesion(s.pase)) +
        '<p>Escanea el código para marcar tu asistencia</p><p>Código: ' + esc(s.pase) + '</p></div></div>' : '') +
      '<div class="asi-acc"><button type="button" class="btn chico sec" data-asi-estado="' + esc(s.id) + '" data-abierta="' + (s.abierta ? '1' : '0') + '">' + (s.abierta ? 'Cerrar sesión' : 'Abrir sesión') + '</button></div></article>';
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

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    pant.innerHTML = '<button type="button" class="volver" id="asiVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Asistencia</h1>' +
      '<p class="suave" id="asiMsg" role="status">Cargando la asistencia…</p>' +
      '<div id="asiNueva"></div><div id="asiTendencia"></div><div id="asiSesiones"></div>';
    $('#asiVolver').onclick = ctx.volver;

    const cargar = async (mensaje) => {
      const d = fila(await ctx.rpc('pastor_asistencia_listar', p));
      if (!d) { aviso('asiMsg', 'No pudimos cargar la asistencia. Revisa tu conexión y vuelve a intentarlo.'); return; }
      aviso('asiMsg', mensaje || '');
      const miembrosR = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
      const miembros = miembrosR && miembrosR.ok ? (miembrosR.data || []) : [];
      $('#asiNueva').innerHTML = '<div class="card"><b>Abrir una sesión nueva</b>' +
        '<label for="asiNombre">Nombre</label><input id="asiNombre" type="text" maxlength="80" value="Culto del domingo">' +
        '<label for="asiFecha">Fecha</label><input id="asiFecha" type="date" value="' + fechaHoy + '">' +
        '<button type="button" class="btn" id="asiCrear">Crear sesión y ver su código</button></div>';
      $('#asiTendencia').innerHTML = '<h2 class="mi-sub">Asistencia de los últimos 12 meses</h2>' + tendenciaHTML(d.meses || []);
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
        const r = await ctx.rpc('pastor_asistencia_sesion_crear', p, { p_fecha: fecha, p_nombre: nombre.trim() });
        const c = fila(r);
        if (!c || !c.ok) { aviso('asiMsg', (c && MOTIVOS[c.motivo]) || 'No pudimos crear la sesión. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar('Sesión creada. Comparte el código ' + c.pase + ' con tus miembros.');
      };
      document.querySelectorAll('[data-asi-imprimir]').forEach((b) => b.onclick = () => { document.body.classList.add('asi-imprimiendo'); window.print(); setTimeout(() => document.body.classList.remove('asi-imprimiendo'), 500); });
      document.querySelectorAll('[data-asi-estado]').forEach((b) => b.onclick = async () => {
        const abierta = b.getAttribute('data-abierta') === '1';
        const r = fila(await ctx.rpc('pastor_asistencia_sesion_estado', p, { p_sesion: b.getAttribute('data-asi-estado'), p_abierta: !abierta }));
        if (!r || !r.ok) { aviso('asiMsg', 'No pudimos cambiar la sesión. Revisa tu conexión e inténtalo de nuevo.'); return; }
        cargar(abierta ? 'Sesión cerrada. Ya no acepta códigos.' : 'Sesión abierta de nuevo.');
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

  window.TBAsistencia = { abrir, miembroMostrar, leerEnlace, pasePendiente, _t: { normPase, porcentajes, mesLargo, fechaCorta, validarSesion, urlDeSesion, qrSVG } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBAsistencia;
})();
