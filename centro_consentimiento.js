/* F1354 · Bienvenida y consentimiento al unirse (tarea 1.5 del PLAN_TAREAS_IGLESIA.md, CONSENTIMIENTO_AL_UNIRSE.md).
   Una sola pantalla, una sola vez por versión del texto. Obligatorias (sin marcar): términos y privacidad.
   Opcionales (marcadas, se pueden apagar): avisos, directorio, asistencia, avance en estudios y contacto.
   Orden al aceptar: 1) guardar las casillas elegidas, 2) registrar la aceptación. Si algo falla, no se registra nada a medias.
   Los textos legales viven en datos/terminos_uso.json (lugar de los Términos y Condiciones) y privacidad.html. */
(function () {
  'use strict';
  const VERSION = '2026-10-v1';          // debe coincidir con datos/terminos_uso.json: si cambia, todos aceptan de nuevo
  const CLAVE = 'tb_consentimiento', CLAVE_AVISOS = 'tb_consent_avisos';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const OPCIONES = [
    ['avisos', 'Recibir avisos y mensajes de mi iglesia', 'Puedes silenciar canales cuando quieras.'],
    ['directorio', 'Que mi teléfono, familia y cumpleaños aparezcan en el directorio de la iglesia', 'Tu pastor te encuentra y te cuida mejor.'],
    ['asistencia', 'Que mi asistencia a servicios y grupos sea visible para mi pastor', 'Así puede acompañarte si faltas.'],
    ['avance_estudios', 'Que mi avance en cursos y estudios sea visible para mi pastor', 'Ve hasta dónde vas, no tus notas privadas.'],
    ['contacto_app_wsp', 'Que mi pastor pueda contactarme por la app o por WhatsApp', 'Si lo apagas, tu teléfono no aparece en su ficha.'],
  ];
  const NUNCA = 'Nunca llegan a tu pastor: tu diario personal, tus notas de estudio, tu salud mental y las peticiones anónimas.';

  const localLeer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
  const aceptado = (id) => { const l = localLeer(); return !!(l && id && l.c === id.codigo && l.v === VERSION); };
  const localGuardar = (id) => { try { localStorage.setItem(CLAVE, JSON.stringify({ c: id.codigo, v: VERSION, f: new Date().toISOString() })); } catch (e) { /* sin almacenamiento */ } };

  let cache = null;
  async function cargarTerminos() {
    if (cache) return cache;
    const r = await fetch('datos/terminos_uso.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    cache = await r.json();
    return cache;
  }
  const terminosHTML = (t) => '<h2 class="cc-h2">' + esc(t.titulo) + '</h2><p class="suave"><small>Actualizado el ' + esc(t.actualizado) + '</small></p>' +
    (t.secciones || []).map((s) => '<h3 class="cc-h3">' + esc(s.t) + '</h3><p>' + esc(s.x) + '</p>').join('');

  function pantallaHTML(nombreIglesia, t) {
    return '<h1 class="cp-titulo">Te damos la bienvenida' + (nombreIglesia ? ' a ' + esc(nombreIglesia) : '') + '</h1>' +
      '<p>Antes de entrar, revisa cómo cuidamos tus datos. Lo haces <b>una sola vez</b> y puedes cambiar tus decisiones cuando quieras en «Mis permisos».</p>' +
      '<h2 class="cc-h2">Para entrar (obligatorio)</h2>' +
      '<label class="cc-fila"><input type="checkbox" class="cc-ck" id="ccTer" aria-describedby="ccErr"><span>Tengo 18 años o más y acepto los <b>Términos de uso</b>.</span></label>' +
      '<details class="cc-det"><summary>Leer los términos de uso</summary><div class="cc-txt">' + terminosHTML(t) + '</div></details>' +
      '<label class="cc-fila"><input type="checkbox" class="cc-ck" id="ccPri" aria-describedby="ccErr"><span>Entiendo qué datos ve mi pastor y acepto la <b>Política de privacidad</b>.</span></label>' +
      '<p class="cc-enl"><a href="privacidad.html" target="_blank" rel="noopener">Leer la política de privacidad completa</a></p>' +
      '<h2 class="cc-h2">Tú decides</h2><p class="suave">Vienen activadas para que tu pastor pueda cuidarte mejor. Apaga las que no quieras.</p>' +
      OPCIONES.map((o) => '<label class="cc-fila"><input type="checkbox" class="cc-ck" data-opc="' + o[0] + '" checked><span><b>' + esc(o[1]) + '</b><small>' + esc(o[2]) + '</small></span></label>').join('') +
      '<p class="suave cc-nota">' + esc(NUNCA) + '</p>' +
      '<p class="cc-err" id="ccErr" role="alert"></p>' +
      '<button type="button" class="btn" id="ccAceptar">Aceptar y continuar</button>' +
      '<button type="button" class="btn sec" id="ccAhoraNo">Ahora no</button>';
  }

  async function pantalla(id, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<p class="suave" id="ccCarga" role="status">Preparando tu bienvenida…</p>';
    let t;
    try { t = await cargarTerminos(); } catch (e) {
      pant.innerHTML = '<h1 class="cp-titulo">Te damos la bienvenida</h1><p class="suave">No pudimos cargar los términos. Revisa tu conexión e inténtalo de nuevo.</p>' +
        '<button type="button" class="btn" id="ccReintentar">Reintentar</button><button type="button" class="btn sec" id="ccAhoraNo">Ahora no</button>';
      $('#ccReintentar').onclick = () => pantalla(id, ctx); $('#ccAhoraNo').onclick = ctx.salir; return;
    }
    if (!$('#ccCarga')) return;   // la persona se fue a otra pantalla mientras cargaba
    pant.innerHTML = pantallaHTML(ctx.iglesia, t);
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
    $('#ccAhoraNo').onclick = ctx.salir;
    $('#ccAceptar').onclick = async () => {
      const err = $('#ccErr');
      if (!$('#ccTer').checked || !$('#ccPri').checked) {
        err.textContent = 'Para entrar, marca los términos de uso y la política de privacidad.';
        ($('#ccTer').checked ? $('#ccPri') : $('#ccTer')).focus(); return;
      }
      err.textContent = '';
      const v = {}; document.querySelectorAll('[data-opc]').forEach((c) => { v[c.getAttribute('data-opc')] = !!c.checked; });
      const b = $('#ccAceptar'); b.disabled = true; b.textContent = 'Guardando…';
      const falla = (m) => { b.disabled = false; b.textContent = 'Aceptar y continuar'; err.textContent = m; };
      const g = await ctx.rpc('miembro_permisos_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_directorio: v.directorio, p_asistencia: v.asistencia, p_avance_estudios: v.avance_estudios, p_contacto_app_wsp: v.contacto_app_wsp });
      const gf = g.ok && (Array.isArray(g.data) ? g.data[0] : g.data);
      if (!g.falta && !(gf && gf.ok)) return falla('No pudimos guardar tus decisiones. Revisa tu conexión e inténtalo de nuevo.');
      const a = await ctx.rpc('consentimiento_aceptar', { p_codigo: id.codigo, p_clave: id.clave, p_version: VERSION });
      const af = a.ok && (Array.isArray(a.data) ? a.data[0] : a.data);
      if (!a.falta && !(af && af.ok)) return falla('No pudimos registrar tu aceptación. Revisa tu conexión e inténtalo de nuevo.');
      try { localStorage.setItem(CLAVE_AVISOS, v.avisos ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      localGuardar(id);
      ctx.seguir();
    };
  }

  // Lectura de los términos desde «Mis permisos», sin pedir nada
  async function leer(ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="ccAtras">‹ Volver</button><p class="suave" id="ccCarga" role="status">Abriendo…</p>';
    $('#ccAtras').onclick = ctx.volver;
    try {
      const t = await cargarTerminos(); if (!$('#ccCarga')) return;
      pant.innerHTML = '<button type="button" class="volver" id="ccAtras">‹ Volver</button><div class="cc-txt">' + terminosHTML(t) + '</div><p class="cc-enl"><a href="privacidad.html" target="_blank" rel="noopener">Leer la política de privacidad</a></p>';
      $('#ccAtras').onclick = ctx.volver;
    } catch (e) { if ($('#ccCarga')) $('#ccCarga').textContent = 'No pudimos abrir los términos. Revisa tu conexión.'; }
  }

  window.TBConsentimiento = { VERSION, aceptado, pantalla, leer, _t: { OPCIONES, pantallaHTML, terminosHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBConsentimiento;
})();
