// entrada.js · F1384 · Marcar asistencia desde el QR de la entrada, sin cuenta. Rápido: fecha y hora automáticas,
// se recuerda el nombre en este teléfono, y al terminar una bendición y un botón para conocer la app.
(function () {
  'use strict';
  const URL_BASE = 'https://mxgvaspztajgzxfgtxfq.supabase.co';
  const CLAVE_PUBLICA = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z3Zhc3B6dGFqZ3p4Zmd0eGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODE5NzcsImV4cCI6MjEwNTI1Nzk3N30.JWk7cBOR-K4adeHcokcZY0B2WcmTDLmEpIsBMQqtFjY';
  const CLAVE_RECUERDO = 'tb_entrada_persona';
  const BENDICION = 'Jehová te bendiga, y te guarde.';
  const CITA = 'Números 6:24 (RVR1960)';
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const MENSAJES = {
    'codigo-no-valido': 'Este código no corresponde a una actividad. Pide al pastor un QR nuevo.',
    'sesion-cerrada': 'Esta actividad ya no acepta registros. Si crees que es un error, avisa al pastor.',
    'nombre': 'Escribe tu nombre y tu apellido (hasta 60 letras cada uno).',
    'tipo': 'Elige si eres miembro o visita.',
    'lleno': 'Esta actividad llegó al máximo de registros. Avisa al pastor.',
    'ya-paso': 'Esta actividad ya pasó. Si quieres marcar asistencia, escanea el QR el día del evento.',
    'muy-lejos': 'Aún es muy temprano para confirmar. Vuelve a escanear unos días antes.',
  };

  async function rpc(fn, cuerpo) {
    const r = await fetch(URL_BASE + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CLAVE_PUBLICA, Authorization: 'Bearer ' + CLAVE_PUBLICA },
      body: JSON.stringify(cuerpo),
    });
    if (!r.ok) throw new Error('rpc ' + fn + ' ' + r.status);
    return r.json();
  }

  function pase() {
    const q = new URLSearchParams(location.search);
    return String(q.get('p') || q.get('asistencia') || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  }

  // Fecha y hora automáticas: el teléfono las pone solo, sin escribir nada.
  function ahoraTexto() {
    const d = new Date();
    const dia = d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return 'Hoy, ' + dia + ' · ' + hora;
  }
  function pintarAhora() { const el = $('entAhora'); if (el) el.textContent = ahoraTexto(); }

  function recordado() {
    try { return JSON.parse(localStorage.getItem(CLAVE_RECUERDO) || 'null') || {}; } catch (e) { return {}; }
  }
  function recordar(nombre, apellido) {
    try { localStorage.setItem(CLAVE_RECUERDO, JSON.stringify({ nombre, apellido })); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  // F1389 · Lo que el pastor personalizó: eslogan, lugar, descripción e imagen (solo enlaces https).
  function detalleHTML(info) {
    const img = info.imagen_url && /^https:\/\//i.test(info.imagen_url)
      ? '<img class="ent-img" src="' + esc(info.imagen_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
    return img + '<p class="ent-act"><b>' + esc(info.nombre) + '</b>' +
      (info.eslogan ? '<br><i>' + esc(info.eslogan) + '</i>' : '') +
      (info.lugar ? '<br><span>Lugar: ' + esc(info.lugar) + '</span>' : '') +
      '<br><span id="entAhora"></span>' +
      (info.cierra_en ? '<br><span class="ent-cierre">Se cierra a las ' + horaEnt(info.cierra_en) + '</span>' : '') +
      (info.descripcion ? '<br><span class="ent-desc">' + esc(info.descripcion) + '</span>' : '') + '</p>';
  }

  function mostrarAviso(texto) { const a = $('entAviso'); a.textContent = texto || ''; a.hidden = !texto; }

  function formularioHTML(info) {
    return detalleHTML(info) +
      '<form id="entForm" novalidate>' +
      '<label for="entNombre">Tu nombre</label><input id="entNombre" name="nombre" autocomplete="given-name" maxlength="60" required autofocus placeholder="Ej: Ana">' +
      '<label for="entApellido">Tu apellido</label><input id="entApellido" name="apellido" autocomplete="family-name" maxlength="60" required placeholder="Ej: Pérez">' +
      '<p class="ent-pregunta" id="entTipoTitulo">¿Eres miembro o visita?</p>' +
      '<div class="ent-tipos" role="group" aria-labelledby="entTipoTitulo">' +
      '<button type="button" class="ent-tipo" data-tipo="miembro" aria-pressed="false"><b>Soy miembro</b><span>Ya formo parte de la iglesia</span></button>' +
      '<button type="button" class="ent-tipo" data-tipo="visita" aria-pressed="false"><b>Soy visita</b><span>Es mi primera vez o recién llegué</span></button>' +
      '</div><p id="entAviso" class="ent-aviso" role="alert" hidden></p>' +
      '<button type="submit" class="ent-enviar">Marcar mi asistencia</button></form>' +
      '<p class="ent-privado">Tu nombre solo lo usa el pastor para contar la asistencia. Quedas registrado al instante, sin cuenta ni claves.</p>';
  }

  // F1401 · Nombres bien escritos: espacios limpios y mayúscula inicial en cada palabra.
  function nombreBien(t) {
    return String(t || '').trim().replace(/\s+/g, ' ').toLowerCase()
      .replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }

  function conectarFormulario(codigo, modo, sinRecuerdo) {
    const fn = modo === 'confirmar' ? 'asistencia_confirmar' : 'asistencia_registrar_persona';
    let tipo = '';
    const previo = sinRecuerdo ? {} : recordado();
    if (previo.nombre) $('entNombre').value = previo.nombre;
    if (previo.apellido) $('entApellido').value = previo.apellido;
    pintarAhora();
    $('entNombre').oninput = () => mostrarAviso('');
    $('entApellido').oninput = () => mostrarAviso('');
    const reloj = setInterval(pintarAhora, 30000);
    document.querySelectorAll('.ent-tipo').forEach((b) => b.onclick = () => {
      tipo = b.getAttribute('data-tipo');
      document.querySelectorAll('.ent-tipo').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      mostrarAviso('');
      if (!$('entNombre').value.trim()) { $('entNombre').focus(); return; }
      if (!$('entApellido').value.trim()) { $('entApellido').focus(); return; }
      $('entForm').requestSubmit ? $('entForm').requestSubmit() : null;
    });
    $('entForm').onsubmit = async (e) => {
      e.preventDefault();
      const nombre = nombreBien($('entNombre').value), apellido = nombreBien($('entApellido').value);
      if (!nombre || !apellido) { mostrarAviso(MENSAJES.nombre); return; }
      if (!/^[\p{L} '\-]+$/u.test(nombre + ' ' + apellido)) { mostrarAviso('Usa solo letras en tu nombre y apellido.'); return; }
      if (!tipo) { mostrarAviso(MENSAJES.tipo); return; }
      const boton = document.querySelector('.ent-enviar'); boton.disabled = true; boton.textContent = 'Guardando…';
      try {
        const r = await rpc(fn, { p_pase: codigo, p_nombre: nombre, p_apellido: apellido, p_tipo: tipo });
        if (!r || !r.ok) {
          boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
          mostrarAviso(MENSAJES[r && r.motivo] || 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
          return;
        }
        clearInterval(reloj);
        recordar(nombre, apellido);
        if (modo === 'confirmar') confirmadoHTML(r); else exito(r);
      } catch (err) {
        boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
        mostrarAviso('No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
      }
    };
  }

  // Gracias y bendición al terminar, y un botón suave para conocer la app.
  function exito(r) {
    const nombre = esc(r.nombre);
    $('entCuerpo').innerHTML = '<div class="ent-ok" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h1>' + (r.ya ? 'Ya tenías tu asistencia marcada, ' + nombre : '¡Gracias, ' + nombre + '!') + '</h1>' +
      '<p class="ent-gracias">' + (r.ya ? 'No hace falta hacer nada más.' : 'Tu asistencia a «' + esc(r.actividad) + '» quedó registrada.') + '</p>' +
      (r.ya ? '' : '<p class="ent-privado">Registrado a las ' + horaEnt(new Date().toISOString()) + '</p>') +
      '<blockquote class="ent-bendicion"><p>' + esc(BENDICION) + '</p><cite>' + esc(CITA) + '</cite></blockquote>' +
      (infoActual && infoActual.mensaje_bienvenida ? '<p class="ent-bien">' + esc(infoActual.mensaje_bienvenida) + '</p>' : '') +
      (r.tipo === 'visita' ? '<p class="ent-bien">Qué bueno tenerte aquí. Esperamos verte de nuevo.</p>' : '') +
      '<button type="button" class="ent-probar" id="entOtra">Registrar a otra persona</button>' +
      '<a class="ent-probar" href="./">Conocer la app Tierra Buena</a>' +
      '<p class="ent-privado">Puedes cerrar esta página cuando quieras.</p>';
    $('entOtra').onclick = () => { $('entCuerpo').innerHTML = '<h1>Marca tu asistencia</h1>' + formularioHTML(infoActual); conectarFormulario(codigoActual, 'registrar', true); };
  }

  // F1389 · Confirmación anticipada: «Quedas confirmado».
  function confirmadoHTML(r) {
    // Dos etapas: confirmar antes (paso 1, hecho) y marcar el día del evento con el QR (paso 2, asistencia real).
    const app = infoActual && infoActual.mostrar_app
      ? '<div class="ent-app"><p><b>¿Quieres conocer la app Tierra Buena?</b></p><p>Ahí puedes ver tus actividades y mantenerte al día con tu iglesia.</p><a class="ent-probar" href="./">Probar la app</a></div>'
      : '';
    $('entCuerpo').innerHTML = '<div class="ent-ok" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h1>' + (r.ya ? 'Ya estabas confirmado' : '¡Quedas confirmado, ' + esc(r.nombre) + '!') + '</h1>' +
      '<p class="ent-gracias">Te esperamos en «' + esc(r.actividad) + '» el ' + esc(fechaLarga(r.fecha)) + '.</p>' +
      '<div class="ent-paso"><p><b>Paso 1 de 2 · Hecho:</b> confirmaste tu asistencia.</p>' +
      '<p><b>Paso 2 de 2 · El día del evento:</b> escanea el QR de la entrada para confirmar que llegaste. Esa es tu asistencia real.</p></div>' + app;
  }

  function mensajeCentral(texto) { $('entCuerpo').innerHTML = '<p class="ent-cerrado">' + esc(texto) + '</p>'; }

  // F1385 · Quien ya tiene la app: la página lee la misma identidad que guarda la app (solo lectura) y marca con un toque.
  function identidadGuardada() {
    try {
      const id = JSON.parse(localStorage.getItem('tb_movil_identidad') || 'null');
      if (id && id.codigo && id.clave && id.nombre) return id;
    } catch (e) { /* sin identidad */ }
    return null;
  }

  function pantallaYo(info, yo, codigo) {
    const primero = esc(String(yo.nombre).trim().split(/\s+/)[0]);
    $('entCuerpo').innerHTML = '<h1>Hola, ' + primero + '</h1>' +
      detalleHTML(info) +
      '<button type="button" class="ent-enviar" id="entYo">Marcar mi asistencia</button>' +
      '<p class="ent-aviso" id="entAviso" role="alert" hidden></p>' +
      '<p class="ent-cambio"><button type="button" class="enlace" id="entNoSoy">No soy yo, quiero escribir mi nombre</button></p>' +
      '<p class="ent-privado">Tus datos ya están en la app: no tienes que escribir nada.</p>';
    pintarAhora();
    $('entNoSoy').onclick = () => { $('entCuerpo').innerHTML = '<h1>Marca tu asistencia</h1>' + formularioHTML(info); conectarFormulario(codigo); };
    $('entYo').onclick = async () => {
      const boton = $('entYo'); boton.disabled = true; boton.textContent = 'Guardando…';
      try {
        const r = await rpc('miembro_asistencia_registrar', { p_codigo: yo.codigo, p_clave: yo.clave, p_pase: codigo });
        if (!r || !r.ok) {
          boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
          mostrarAviso(r && r.motivo === 'sin-acceso' ? 'No pudimos confirmar tu cuenta. Escribe tu nombre abajo.' : (MENSAJES[r && r.motivo] || 'No pudimos guardar. Inténtalo de nuevo.'));
          return;
        }
        exito({ ok: true, ya: r.ya, nombre: String(yo.nombre).trim().split(/\s+/)[0], actividad: info.nombre, tipo: 'miembro' });
      } catch (err) {
        boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
        mostrarAviso('No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
      }
    };
  }

  let infoActual = null;
  let codigoActual = null;
  // F1401 · Hora de cierre del QR, para que la persona sepa hasta cuándo puede marcar.
  function horaEnt(iso) { try { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  async function iniciar() {
    const codigo = pase();
    codigoActual = codigo;
    if (!codigo || codigo.length !== 8) { mensajeCentral(MENSAJES['codigo-no-valido']); return; }
    try {
      const info = await rpc('asistencia_pase_info', { p_pase: codigo });
      if (!info || !info.ok) { mensajeCentral(MENSAJES[info && info.motivo] || MENSAJES['codigo-no-valido']); return; }
      infoActual = info;
      if (!info.vigente) {
        if (info.proxima) {
          $('entCuerpo').innerHTML = '<h1>Confirma tu asistencia</h1>' + formularioHTML(info);
          conectarFormulario(codigo, 'confirmar');
          return;
        }
        mensajeCentral(MENSAJES['sesion-cerrada']); return;
      }
      const yo = identidadGuardada();
      if (yo) { pantallaYo(info, yo, codigo); return; }
      $('entCuerpo').innerHTML = '<h1>Marca tu asistencia</h1>' + formularioHTML(info);
      conectarFormulario(codigo);
    } catch (err) {
      $('entCuerpo').innerHTML = '<p class="ent-cerrado">No pudimos conectar. Revisa tu conexión.</p><button type="button" class="ent-enviar" id="entReintentar">Volver a intentar</button>';
      $('entReintentar').onclick = () => iniciar();
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
