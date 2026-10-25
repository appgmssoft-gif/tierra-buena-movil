/* F1432 · Chat: responder a un mensaje (hilos), punto de «mensajes nuevos» y silenciar un espacio (tarea 2.3).
   Responder usa el SQL 76 (chat_mensaje_responder y chat_mensajes_listar_hilo). El punto de mensajes nuevos usa la parte 4
   del mismo SQL (chat_canales_actividad). Si el SQL 76 aún no está corrido, el chat sigue igual que siempre: no aparece
   el botón «Responder» ni el punto, y nada se rompe.
   Silenciar un espacio se guarda SOLO en este teléfono (sin SQL): quita el punto de mensajes nuevos y baja el espacio al final de la lista.
   Depende de: app.js (lo llama desde vistaChat). Sin atributos style en el HTML (política de seguridad). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K_SIL = 'tb_movil_chat_silenciados', K_VISTO = 'tb_movil_chat_visto';
  const DIAS_SIN_REGISTRO = 3;   // si nunca abriste un espacio, solo cuenta como nuevo lo de los últimos 3 días
  const LARGO_CITA = 120;

  // ---------- Lógica pura (se prueba sin navegador) ----------
  function extracto(texto, n) {
    const t = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim(), max = n || LARGO_CITA;
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }
  // Un espacio tiene punto de mensajes nuevos si el último mensaje no es tuyo, es posterior a tu última visita y el espacio no está silenciado.
  function hayNuevo(canalId, actividad, visto, silenciados, ahora) {
    const id = String(canalId);
    if ((silenciados || []).indexOf(id) >= 0) return false;
    const a = actividad && actividad[id];
    if (!a || a.es_mio || !a.ultimo_en) return false;
    const ult = new Date(a.ultimo_en); if (isNaN(ult)) return false;
    const v = visto && visto[id] ? new Date(visto[id]) : null;
    if (v && !isNaN(v)) return ult > v;
    return (ahora || new Date()) - ult < DIAS_SIN_REGISTRO * 86400000;
  }
  // Los espacios silenciados bajan al final; el resto conserva su orden.
  function ordenar(canales, silenciados) {
    const s = silenciados || [], l = (canales || []).slice();
    return l.filter((c) => s.indexOf(String(c.id)) < 0).concat(l.filter((c) => s.indexOf(String(c.id)) >= 0));
  }
  function actividadPorCanal(filas) {
    const o = {}; (filas || []).forEach((f) => { if (f && f.canal_id) o[String(f.canal_id)] = { ultimo_en: f.ultimo_en, es_mio: !!f.es_mio }; });
    return o;
  }
  function citaHTML(m) {
    if (!m || !m.responde_a) return '';
    const quien = m.respuesta_a_autor ? esc(m.respuesta_a_autor) : 'un mensaje';
    const texto = m.respuesta_a_texto == null
      ? '<em>Mensaje que ya no se puede ver.</em>' : esc(extracto(m.respuesta_a_texto));
    return '<blockquote class="ch-cita"><b>En respuesta a ' + quien + '</b><span>' + texto + '</span></blockquote>';
  }
  function botonResponderHTML(m) {
    if (!m || !m.id) return '';
    return '<button type="button" class="btn sec chico ch-resp-btn" data-resp="' + esc(m.id) + '" aria-label="Responder a ' + esc(m.autor_nombre || 'este mensaje') + '">↩ Responder</button>';
  }
  function respondiendoHTML(m) {
    if (!m) return '';
    return '<div class="ch-resp-caja"><span class="ch-resp-txt"><b>Respondiendo a ' + esc(m.autor_nombre || 'un mensaje') + '</b><small>' + esc(extracto(m.texto, 90)) + '</small></span>' +
      '<button type="button" class="btn sec chico" id="chRespCancelar" aria-label="Cancelar la respuesta">Cancelar</button></div>';
  }
  function marcaListaHTML(nuevo, silenciado) {
    return (nuevo ? ' <span class="ch-punto" role="img" aria-label="Mensajes nuevos"></span>' : '') +
           (silenciado ? ' <span class="ch-silencio" role="img" aria-label="Espacio silenciado">🔕</span>' : '');
  }
  function botonSilencioHTML(silenciado) {
    return '<button type="button" class="btn sec chico ch-sil-btn" id="chSilenciar" aria-pressed="' + (silenciado ? 'true' : 'false') + '">' + (silenciado ? '🔔 Dejar de silenciar' : '🔕 Silenciar este espacio') + '</button>';
  }

  // ---------- Guardado en este teléfono ----------
  const leer = (k, base) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? base : v; } catch (e) { return base; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio: queda como estaba */ } };
  function silenciados() { const a = leer(K_SIL, []); return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : []; }
  function esSilenciado(id) { return silenciados().indexOf(String(id)) >= 0; }
  function alternarSilencio(id) {
    const s = silenciados(), i = s.indexOf(String(id));
    if (i >= 0) s.splice(i, 1); else s.push(String(id));
    guardar(K_SIL, s.slice(-200));
    return i < 0;
  }
  function vistos() { const o = leer(K_VISTO, {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function marcarVisto(id) { const o = vistos(); o[String(id)] = new Date().toISOString(); const k = Object.keys(o); if (k.length > 200) delete o[k[0]]; guardar(K_VISTO, o); }

  // ---------- ¿Está corrido el SQL 76? Se aprende con la primera respuesta y se recuerda mientras la app esté abierta. ----------
  let hilos = null, actividadOk = null;
  const api = {
    hilosOk: () => hilos === true,
    hilosEstado: () => hilos,
    ponerHilos: (v) => { hilos = v; },
    actividadEstado: () => actividadOk,
    ponerActividad: (v) => { actividadOk = v; },
    silenciados, esSilenciado, alternarSilencio, vistos, marcarVisto,
    hayNuevo, ordenar, actividadPorCanal, citaHTML, botonResponderHTML, respondiendoHTML, marcaListaHTML, botonSilencioHTML, extracto,
    _t: { extracto, hayNuevo, ordenar, actividadPorCanal, citaHTML, botonResponderHTML, respondiendoHTML, marcaListaHTML, botonSilencioHTML, K_SIL, K_VISTO, DIAS_SIN_REGISTRO, LARGO_CITA }
  };
  window.TBChatHilos = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
