/* F1370 · Actividades y paseos con inscripción y cupos (tarea 1.20 de PLAN_TAREAS_IGLESIA.md).
   Pastor: crea actividades, ve quién se inscribió y borra. Miembro: ve las próximas y se inscribe si hay lugar.
   Usa las funciones del SQL 33: pastor_actividad_* y miembro_actividad*. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  // Fecha legible en español (zona horaria del teléfono): «sáb 31 oct · 10:30».
  function cuando(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  // Valor de un campo datetime-local («2026-10-31T10:30») a ISO con zona horaria. Vacío → null.
  function aIso(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); }
  // Cuántos lugares quedan. Sin cupo → null (sin límite).
  const lugares = (a) => (a.cupo == null ? null : Math.max(0, a.cupo - (a.inscritos || 0)));
  function lugaresTexto(a) {
    const l = lugares(a);
    if (l === null) return 'Sin límite de lugares';
    if (l === 0) return 'Completo';
    return l + (l === 1 ? ' lugar libre' : ' lugares libres');
  }

  // ---- Pastor ----
  function actPastorHTML(a) {
    const nombres = (a.nombres || []).length ? '<small class="suave">Inscritos: ' + a.nombres.map(esc).join(', ') + '</small>' : '<small class="suave">Todavía nadie se ha inscrito.</small>';
    return '<div class="card ase-tarea"><div class="ase-cab"><b>' + esc(a.titulo) + '</b>' +
      '<button type="button" class="cp-mini" data-actborrar="' + esc(a.id) + '" aria-label="Borrar ' + esc(a.titulo) + '">Borrar</button></div>' +
      '<p class="suave ase-det">' + esc(cuando(a.inicio)) + (a.lugar ? ' · ' + esc(a.lugar) : '') + ' · ' + esc(lugaresTexto(a)) + '</p>' +
      (a.detalle ? '<p class="suave ase-det">' + esc(a.detalle) + '</p>' : '') + '<div>' + nombres + '</div></div>';
  }
  function formActHTML() {
    return '<div class="card tp-form ase-nueva"><h2 class="mi-sub">Nueva actividad</h2>' +
      '<label for="actTit">Nombre</label><input id="actTit" type="text" maxlength="80" placeholder="Ej.: Paseo al campo" autocomplete="off">' +
      '<label for="actCuando">Fecha y hora</label><input id="actCuando" type="datetime-local">' +
      '<label for="actLugar">Lugar (opcional)</label><input id="actLugar" type="text" maxlength="120" placeholder="Ej.: Parque de Calama">' +
      '<label for="actCupo">Cupo (opcional, déjalo vacío si no hay límite)</label><input id="actCupo" type="number" min="1" max="1000" inputmode="numeric">' +
      '<label for="actDet">Detalle (opcional)</label><textarea id="actDet" rows="2" maxlength="300" placeholder="Qué llevar, cómo llegar…"></textarea>' +
      '<p id="actErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn sec" id="actGuardar">Guardar actividad</button>' +
      '<p id="actMsg" class="suave" role="status" aria-live="polite"></p></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="actVolver">‹ Panel</button><h1 class="cp-titulo">Actividades y paseos</h1>' +
      '<p class="suave">Las próximas actividades y quién se inscribió.</p><p class="suave" id="actCarga">Cargando…</p><div id="actLista"></div>' + formActHTML();
    $('#actVolver').onclick = ctx.volver;

    async function cargar() {
      $('#actCarga').hidden = false;
      const r = await ctx.rpc('pastor_actividades_leer', p, {});
      $('#actCarga').hidden = true;
      const d = r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (!d || d.ok === false) { $('#actLista').innerHTML = '<p class="error" role="alert">No pudimos cargar las actividades. Revisa tu conexión.</p>'; return; }
      const lista = d.actividades || [];
      $('#actLista').innerHTML = lista.length ? lista.map(actPastorHTML).join('') : '<p class="suave">Todavía no hay actividades. Agrega la primera abajo.</p>';
      document.querySelectorAll('[data-actborrar]').forEach((b) => {
        b.onclick = async () => {
          if (!window.confirm('¿Borrar esta actividad? Se pierden las inscripciones.')) return;
          const x = await ctx.rpc('pastor_actividad_borrar', p, { p_id: b.getAttribute('data-actborrar') });
          const f = Array.isArray(x.data) ? x.data[0] : x.data;
          if (x.ok && f && f.ok) { await cargar(); } else { $('#actMsg').textContent = 'No se pudo borrar. Inténtalo de nuevo.'; }
        };
      });
    }

    $('#actGuardar').onclick = async () => {
      const tit = $('#actTit').value.replace(/\s+/g, ' ').trim(), iso = aIso($('#actCuando').value);
      const cupoTxt = $('#actCupo').value.trim(), er = $('#actErr'), msg = $('#actMsg');
      er.hidden = true; msg.textContent = '';
      if (!tit) { er.textContent = 'Escribe el nombre de la actividad.'; er.hidden = false; return; }
      if (!iso) { er.textContent = 'Elige la fecha y la hora.'; er.hidden = false; return; }
      const cupo = cupoTxt ? parseInt(cupoTxt, 10) : null;
      if (cupoTxt && (isNaN(cupo) || cupo < 1 || cupo > 1000)) { er.textContent = 'El cupo debe ser un número entre 1 y 1000.'; er.hidden = false; return; }
      const btn = $('#actGuardar'); btn.disabled = true;
      const r = await ctx.rpc('pastor_actividad_guardar', p, { p_titulo: tit, p_detalle: $('#actDet').value.trim() || null,
        p_lugar: $('#actLugar').value.trim() || null, p_inicio: iso, p_cupo: cupo });
      btn.disabled = false;
      const f = Array.isArray(r.data) ? r.data[0] : r.data;
      if (r.ok && f && f.ok) {
        ['#actTit', '#actCuando', '#actLugar', '#actCupo', '#actDet'].forEach((s) => { $(s).value = ''; });
        msg.textContent = 'Actividad guardada.'; await cargar();
      } else { er.textContent = 'No se pudo guardar la actividad. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
    };

    await cargar();
  }

  // ---- Miembro (dentro de «Mi servicio») ----
  function actMiembroHTML(a) {
    const l = lugares(a), lleno = l === 0 && !a.inscrito;
    const boton = a.inscrito
      ? '<button type="button" class="btn sec" data-inscribir="' + esc(a.id) + '" data-val="0" aria-pressed="true">✅ Inscrito (tocar para darte de baja)</button>'
      : '<button type="button" class="btn" data-inscribir="' + esc(a.id) + '" data-val="1" aria-pressed="false"' + (lleno ? ' disabled' : '') + '>' + (lleno ? 'Completo' : 'Inscribirme') + '</button>';
    return '<div class="card ase-tarea"><div class="ase-cab"><b>' + esc(a.titulo) + '</b></div>' +
      '<p class="suave ase-det">' + esc(cuando(a.inicio)) + (a.lugar ? ' · ' + esc(a.lugar) : '') + ' · ' + esc(lugaresTexto(a)) + '</p>' +
      (a.detalle ? '<p class="suave ase-det">' + esc(a.detalle) + '</p>' : '') + boton + '</div>';
  }
  // Oculta la sección si no hay actividades o si el SQL 33 aún no está corrido.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('miembro_actividades_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!d || d.ok === false || !(d.actividades || []).length) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Próximas actividades</h2>' + d.actividades.map(actMiembroHTML).join('');
    c.querySelectorAll('[data-inscribir]').forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        const x = await rpcRaw('miembro_actividad_inscribir', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.getAttribute('data-inscribir'), p_inscribir: b.getAttribute('data-val') === '1' });
        if (x && x.ok) { miembroMostrar(contenedorId, id, rpcRaw); return; }
        b.disabled = false;
        const motivo = x && x.data && (Array.isArray(x.data) ? x.data[0] : x.data);
        const aviso = document.createElement('p'); aviso.className = 'error'; aviso.setAttribute('role', 'alert');
        aviso.textContent = (motivo && motivo.motivo === 'sin-cupo') ? 'Ya no quedan lugares en esta actividad.' : 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.';
        c.appendChild(aviso);
      };
    });
  }

  window.TBActividades = { abrir, miembroMostrar, _t: { cuando, aIso, lugares, lugaresTexto, actPastorHTML, actMiembroHTML, formActHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBActividades;
})();
