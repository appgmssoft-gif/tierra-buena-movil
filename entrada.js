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

  function mostrarAviso(texto) { const a = $('entAviso'); a.textContent = texto || ''; a.hidden = !texto; }

  function formularioHTML(info) {
    return '<p class="ent-act">' + esc(info.nombre) + '<br><span id="entAhora"></span></p>' +
      '<form id="entForm" novalidate>' +
      '<label for="entNombre">Tu nombre</label><input id="entNombre" name="nombre" autocomplete="given-name" maxlength="60" required autofocus>' +
      '<label for="entApellido">Tu apellido</label><input id="entApellido" name="apellido" autocomplete="family-name" maxlength="60" required>' +
      '<p class="ent-pregunta" id="entTipoTitulo">¿Eres miembro o visita?</p>' +
      '<div class="ent-tipos" role="group" aria-labelledby="entTipoTitulo">' +
      '<button type="button" class="ent-tipo" data-tipo="miembro" aria-pressed="false"><b>Soy miembro</b><span>Ya formo parte de la iglesia</span></button>' +
      '<button type="button" class="ent-tipo" data-tipo="visita" aria-pressed="false"><b>Soy visita</b><span>Es mi primera vez o recién llegué</span></button>' +
      '</div><p id="entAviso" class="ent-aviso" role="alert" hidden></p>' +
      '<button type="submit" class="ent-enviar">Marcar mi asistencia</button></form>' +
      '<p class="ent-privado">Tu nombre solo lo usa el pastor para contar la asistencia. Quedas registrado al instante, sin cuenta ni claves.</p>';
  }

  function conectarFormulario(codigo) {
    let tipo = '';
    const previo = recordado();
    if (previo.nombre) $('entNombre').value = previo.nombre;
    if (previo.apellido) $('entApellido').value = previo.apellido;
    pintarAhora();
    const reloj = setInterval(pintarAhora, 30000);
    document.querySelectorAll('.ent-tipo').forEach((b) => b.onclick = () => {
      tipo = b.getAttribute('data-tipo');
      document.querySelectorAll('.ent-tipo').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      mostrarAviso('');
      if ($('entNombre').value.trim() && $('entApellido').value.trim()) $('entForm').requestSubmit ? $('entForm').requestSubmit() : null;
    });
    $('entForm').onsubmit = async (e) => {
      e.preventDefault();
      const nombre = $('entNombre').value.trim(), apellido = $('entApellido').value.trim();
      if (!nombre || !apellido) { mostrarAviso(MENSAJES.nombre); return; }
      if (!tipo) { mostrarAviso(MENSAJES.tipo); return; }
      const boton = document.querySelector('.ent-enviar'); boton.disabled = true; boton.textContent = 'Guardando…';
      try {
        const r = await rpc('asistencia_registrar_persona', { p_pase: codigo, p_nombre: nombre, p_apellido: apellido, p_tipo: tipo });
        if (!r || !r.ok) {
          boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
          mostrarAviso(MENSAJES[r && r.motivo] || 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
          return;
        }
        clearInterval(reloj);
        recordar(nombre, apellido);
        exito(r);
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
      '<blockquote class="ent-bendicion"><p>' + esc(BENDICION) + '</p><cite>' + esc(CITA) + '</cite></blockquote>' +
      (r.tipo === 'visita' ? '<p class="ent-bien">Qué bueno tenerte aquí. Esperamos verte de nuevo.</p>' : '') +
      '<a class="ent-probar" href="./">Conocer la app Tierra Buena</a>' +
      '<p class="ent-privado">Puedes cerrar esta página cuando quieras.</p>';
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
      '<p class="ent-act">' + esc(info.nombre) + '<br><span id="entAhora"></span></p>' +
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

  async function iniciar() {
    const codigo = pase();
    if (!codigo || codigo.length !== 8) { mensajeCentral(MENSAJES['codigo-no-valido']); return; }
    try {
      const info = await rpc('asistencia_pase_info', { p_pase: codigo });
      if (!info || !info.ok) { mensajeCentral(MENSAJES[info && info.motivo] || MENSAJES['codigo-no-valido']); return; }
      if (!info.vigente) { mensajeCentral(MENSAJES['sesion-cerrada']); return; }
      const yo = identidadGuardada();
      if (yo) { pantallaYo(info, yo, codigo); return; }
      $('entCuerpo').innerHTML = '<h1>Marca tu asistencia</h1>' + formularioHTML(info);
      conectarFormulario(codigo);
    } catch (err) {
      mensajeCentral('No pudimos conectar. Revisa tu conexión y vuelve a escanear el código.');
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
