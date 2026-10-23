// entrada.js · F1383 · Marcar asistencia desde el QR de la entrada, sin cuenta.
// Pide solo nombre, apellido y si es miembro o visita. Se conecta a Supabase con las funciones públicas del SQL 41.
(function () {
  'use strict';
  const URL_BASE = 'https://mxgvaspztajgzxfgtxfq.supabase.co';
  const CLAVE_PUBLICA = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z3Zhc3B6dGFqZ3p4Zmd0eGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODE5NzcsImV4cCI6MjEwNTI1Nzk3N30.JWk7cBOR-K4adeHcokcZY0B2WcmTDLmEpIsBMQqtFjY';
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

  function fechaLarga(iso) {
    try { return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return iso; }
  }

  function mostrarAviso(texto) { const a = $('entAviso'); a.textContent = texto || ''; a.hidden = !texto; }

  function formularioHTML(info) {
    return '<p class="ent-act">' + esc(info.nombre) + '<br><span>' + esc(fechaLarga(info.fecha)) + '</span></p>' +
      '<form id="entForm" novalidate>' +
      '<label for="entNombre">Tu nombre</label><input id="entNombre" name="nombre" autocomplete="given-name" maxlength="60" required>' +
      '<label for="entApellido">Tu apellido</label><input id="entApellido" name="apellido" autocomplete="family-name" maxlength="60" required>' +
      '<p class="ent-pregunta" id="entTipoTitulo">¿Eres miembro o visita?</p>' +
      '<div class="ent-tipos" role="group" aria-labelledby="entTipoTitulo">' +
      '<button type="button" class="ent-tipo" data-tipo="miembro" aria-pressed="false"><b>Soy miembro</b><span>Ya formo parte de la iglesia</span></button>' +
      '<button type="button" class="ent-tipo" data-tipo="visita" aria-pressed="false"><b>Soy visita</b><span>Es mi primera vez o recién llegué</span></button>' +
      '</div><p id="entAviso" class="ent-aviso" role="alert" hidden></p>' +
      '<button type="submit" class="ent-enviar">Marcar mi asistencia</button></form>' +
      '<p class="ent-privado">Tu nombre solo lo usa el pastor para contar la asistencia. No se comparte con nadie más.</p>';
  }

  function conectarFormulario(codigo) {
    let tipo = '';
    document.querySelectorAll('.ent-tipo').forEach((b) => b.onclick = () => {
      tipo = b.getAttribute('data-tipo');
      document.querySelectorAll('.ent-tipo').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      mostrarAviso('');
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
        exito(r);
      } catch (err) {
        boton.disabled = false; boton.textContent = 'Marcar mi asistencia';
        mostrarAviso('No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');
      }
    };
  }

  function exito(r) {
    $('entCuerpo').innerHTML = '<div class="ent-ok" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h1>' + (r.ya ? 'Ya habías marcado tu asistencia' : '¡Listo, ' + esc(r.nombre) + '!') + '</h1>' +
      '<p>' + (r.ya ? 'No hace falta hacer nada más.' : 'Tu asistencia a «' + esc(r.actividad) + '» quedó registrada.') + '</p>' +
      (r.tipo === 'visita' ? '<p class="ent-bien">Qué bueno tenerte aquí. El pastor te dará la bienvenida.</p>' : '');
  }

  function mensajeCentral(texto) { $('entCuerpo').innerHTML = '<p class="ent-cerrado">' + esc(texto) + '</p>'; }

  async function iniciar() {
    const codigo = pase();
    if (!codigo || codigo.length !== 8) { mensajeCentral(MENSAJES['codigo-no-valido']); return; }
    try {
      const info = await rpc('asistencia_pase_info', { p_pase: codigo });
      if (!info || !info.ok) { mensajeCentral(MENSAJES[info && info.motivo] || MENSAJES['codigo-no-valido']); return; }
      if (!info.vigente) { mensajeCentral(MENSAJES['sesion-cerrada']); return; }
      $('entCuerpo').innerHTML = '<h1>Marca tu asistencia</h1>' + formularioHTML(info);
      conectarFormulario(codigo);
    } catch (err) {
      mensajeCentral('No pudimos conectar. Revisa tu conexión y vuelve a escanear el código.');
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
