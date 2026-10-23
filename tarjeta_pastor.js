/* F1356 · Tarjeta del pastor (tarea 1.8 del PLAN_TAREAS_IGLESIA.md).
   El pastor escribe su cargo, su horario de atención y la dirección de su oficina.
   Se guarda dentro de la configuración de la iglesia (config_pastor_leer / config_pastor_guardar, SQL 26 ya corrido),
   en la clave «tarjeta_pastor». No hace falta SQL nuevo: el guardado fusiona y no toca el resto de la configuración.
   F1372: los miembros la ven en «Mi iglesia» con miembro_tarjeta_pastor_leer (SQL 35), que solo entrega cargo, horario y dirección. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const LIM = { cargo: 60, horario: 200, direccion: 120 };
  const CARGOS = ['Pastor', 'Pastora', 'Pastor principal'];

  // Quita espacios de más, recorta al límite y descarta lo vacío.
  function normalizar(d) {
    const o = {};
    Object.keys(LIM).forEach((k) => {
      const v = String((d && d[k]) == null ? '' : d[k]).replace(/\s+/g, ' ').trim().slice(0, LIM[k]);
      if (v) o[k] = v;
    });
    return o;
  }
  function vacia(t) { return !t || !Object.keys(t).length; }

  // Vista previa: lo que ven las personas de la iglesia en su pantalla «Mi iglesia».
  function previaHTML(t) {
    if (vacia(t)) return '<p class="suave tp-vacia">Aún no has escrito nada. Completa los datos de arriba y aquí verás tu tarjeta.</p>';
    const fila = (ic, tit, v) => (v ? '<div class="tp-fila"><span class="tp-ico" aria-hidden="true">' + ic + '</span><span class="tp-tx"><small>' + tit + '</small><b>' + esc(v) + '</b></span></div>' : '');
    return '<div class="tp-tarjeta">' + fila('🪪', 'Cargo', t.cargo) + fila('🕐', 'Horario de atención', t.horario) + fila('📍', 'Oficina', t.direccion) + '</div>';
  }

  function formHTML(t) {
    t = t || {};
    return '<button type="button" class="volver" id="tpVolver">‹ Panel</button><h1 class="cp-titulo">Mi tarjeta de pastor</h1>' +
      '<p class="suave">Tu cargo, cuándo puedes recibir a las personas y dónde está tu oficina.</p>' +
      '<div class="card tp-form">' +
      '<label for="tpCargo">Cargo</label>' +
      '<div class="cp-filtros" role="group" aria-label="Cargos frecuentes">' + CARGOS.map((c) => '<button type="button" class="cp-chip" data-tpc="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<input id="tpCargo" type="text" maxlength="' + LIM.cargo + '" value="' + esc(t.cargo || '') + '" placeholder="Ej.: Pastor principal" autocomplete="off">' +
      '<label for="tpHorario">Horario de atención</label>' +
      '<textarea id="tpHorario" rows="3" maxlength="' + LIM.horario + '" placeholder="Ej.: Martes y jueves de 10:00 a 13:00">' + esc(t.horario || '') + '</textarea>' +
      '<label for="tpDir">Dirección de la oficina</label>' +
      '<input id="tpDir" type="text" maxlength="' + LIM.direccion + '" value="' + esc(t.direccion || '') + '" placeholder="Ej.: Calle y número, ciudad" autocomplete="street-address">' +
      '<p id="tpErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn" id="tpGuardar">Guardar mi tarjeta</button>' +
      '<p id="tpMsg" class="suave" role="status" aria-live="polite"></p></div>' +
      '<h2 class="mi-sub">Vista previa</h2><div id="tpPrevia">' + previaHTML(normalizar(t)) + '</div>' +
      '<p class="suave tp-nota">Tus hermanos ven esta tarjeta en su pantalla «Mi iglesia», con el título «Tu pastor».</p>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="tpVolver">‹ Panel</button><h1 class="cp-titulo">Mi tarjeta de pastor</h1><p class="suave">Cargando…</p>';
    $('#tpVolver').onclick = ctx.volver;
    const r = await ctx.rpc('config_pastor_leer', p);
    if (!r.ok || r.data == null || typeof r.data !== 'object') {
      pant.innerHTML = '<button type="button" class="volver" id="tpVolver">‹ Panel</button><h1 class="cp-titulo">Mi tarjeta de pastor</h1><p class="error" role="alert">No pudimos cargar tu tarjeta. Revisa tu conexión e inténtalo de nuevo.</p>' +
        '<button type="button" class="btn sec" id="tpReintentar">Reintentar</button>';
      $('#tpVolver').onclick = ctx.volver; $('#tpReintentar').onclick = () => abrir(p, ctx);
      return;
    }
    const tarjeta = normalizar(r.data.tarjeta_pastor);
    pant.innerHTML = formHTML(tarjeta);
    $('#tpVolver').onclick = ctx.volver;
    const leer = () => normalizar({ cargo: $('#tpCargo').value, horario: $('#tpHorario').value, direccion: $('#tpDir').value });
    const refrescar = () => { $('#tpPrevia').innerHTML = previaHTML(leer()); $('#tpMsg').textContent = ''; };
    ['#tpCargo', '#tpHorario', '#tpDir'].forEach((s) => $(s).addEventListener('input', refrescar));
    document.querySelectorAll('[data-tpc]').forEach((b) => { b.onclick = () => { $('#tpCargo').value = b.getAttribute('data-tpc'); refrescar(); }; });
    $('#tpGuardar').onclick = async () => {
      const btn = $('#tpGuardar'), er = $('#tpErr'); er.hidden = true; btn.disabled = true;
      const g = await ctx.rpc('config_pastor_guardar', p, { p_config: { tarjeta_pastor: leer() } });
      btn.disabled = false;
      const fila = Array.isArray(g.data) ? g.data[0] : g.data;
      if (g.ok && fila && fila.ok) { $('#tpMsg').textContent = 'Guardado.'; }
      else { er.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
    };
  }

  // F1372 · Miembro: la tarjeta del pastor dentro de «Mi iglesia». Si el pastor no la llenó o el SQL 35 aún no está corrido, no aparece.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('miembro_tarjeta_pastor_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    const t = d && d.ok !== false ? normalizar(d.tarjeta) : null;
    if (!t || vacia(t)) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Tu pastor</h2>' + previaHTML(t);
  }

  window.TBTarjetaPastor = { abrir, miembroMostrar, _t: { normalizar, previaHTML, formHTML, LIM, vacia } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBTarjetaPastor;
})();
