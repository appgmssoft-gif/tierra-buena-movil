/* F1353 · Lado del miembro del Centro del pastor (tareas 1.6 y 1.7 del PLAN_TAREAS_IGLESIA.md).
   1.6 «Mis permisos»: cuatro casillas que la persona enciende o apaga cuando quiera (miembro_permisos_leer y _guardar).
   1.7 «Mi tarjeta de contacto»: teléfono, cumpleaños, familia y dirección (miembro_contacto_guardar).
   Si la base aún no tiene miembro_contacto_leer (SQL 27), la tarjeta se rellena con lo guardado en este teléfono.
   Todo se pide con la llave de la persona (id.codigo, id.clave). Nunca se muestra nada que no sea suyo. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const CLAVE_LOCAL = 'tb_miembro_contacto';
  const PERMISOS = [
    ['directorio', 'Mi teléfono, dirección, cumpleaños y familia aparecen en el directorio', 'Tu pastor te encuentra y sabe cómo cuidarte. Tu nombre siempre lo ve tu pastor.'],
    ['asistencia', 'Mi asistencia a servicios y grupos es visible para mi pastor', 'Así tu pastor nota si faltas y puede acompañarte.'],
    ['avance_estudios', 'Mi avance en cursos y estudios es visible para mi pastor', 'Tu pastor ve hasta dónde vas, no tus notas privadas.'],
    ['contacto_app_wsp', 'Mi pastor puede contactarme por la app o por WhatsApp', 'Si lo apagas, tu teléfono deja de aparecer en su ficha.'],
  ];
  const NUNCA = 'Nunca llegan a tu pastor: tu diario personal, tus notas de estudio, tu salud mental y las peticiones anónimas.';

  // ---------- 1.6 Mis permisos ----------
  function permisosHTML(v) {
    return '<button type="button" class="volver" id="cmAtras">‹ Volver</button><h1 class="cp-titulo">Mis permisos</h1>' +
      '<p class="suave">Tú decides qué ve tu pastor. Puedes cambiarlo cuando quieras y se aplica de inmediato.</p>' +
      '<div class="cm-lista">' + PERMISOS.map((p) => '<label class="cm-fila"><span class="cm-tx"><b>' + esc(p[1]) + '</b><small>' + esc(p[2]) + '</small></span>' +
        '<input type="checkbox" role="switch" class="cm-sw" data-perm="' + p[0] + '"' + (v[p[0]] !== false ? ' checked' : '') + '></label>').join('') + '</div>' +
      '<p class="suave cp-nota" id="cmEstado" role="status" aria-live="polite"></p><p class="suave cp-nota">' + esc(NUNCA) + '</p>' +
      '<button type="button" class="btn sec" id="cmTerminos">Ver términos de uso y privacidad</button>';
  }
  const leerPerms = () => { const v = {}; document.querySelectorAll('[data-perm]').forEach((c) => { v[c.getAttribute('data-perm')] = !!c.checked; }); return v; };

  async function permisos(id, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="cmAtras">‹ Volver</button><h1 class="cp-titulo">Mis permisos</h1><p class="suave" id="cmCarga" role="status">Cargando tus permisos…</p>';
    $('#cmAtras').onclick = ctx.volver;
    const r = await ctx.rpc('miembro_permisos_leer', { p_codigo: id.codigo, p_clave: id.clave });
    if (!$('#cmCarga')) return;
    const f = r.ok && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!f) { $('#cmCarga').textContent = r.falta ? 'Esta función se activa pronto en tu iglesia.' : 'No pudimos cargar tus permisos. Revisa tu conexión e inténtalo de nuevo.'; return; }
    pant.innerHTML = permisosHTML(f);
    $('#cmAtras').onclick = ctx.volver;
    $('#cmTerminos').onclick = () => { if (window.TBConsentimiento) window.TBConsentimiento.leer({ volver: () => permisos(id, ctx) }); };
    document.querySelectorAll('[data-perm]').forEach((c) => {
      c.onchange = async () => {
        const est = $('#cmEstado'), v = leerPerms(); c.disabled = true; if (est) est.textContent = 'Guardando…';
        const g = await ctx.rpc('miembro_permisos_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_directorio: v.directorio, p_asistencia: v.asistencia, p_avance_estudios: v.avance_estudios, p_contacto_app_wsp: v.contacto_app_wsp });
        const fila = g.ok && (Array.isArray(g.data) ? g.data[0] : g.data);
        c.disabled = false;
        if (fila && fila.ok) { if (est) est.textContent = 'Guardado ✓'; return; }
        c.checked = !c.checked;   // no se guardó: la casilla vuelve a como estaba, para no mostrar algo falso
        if (est) est.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
      };
    });
  }

  // ---------- 1.7 Mi tarjeta de contacto ----------
  const limpiaTel = (t) => String(t || '').replace(/[^\d+\s()-]/g, '').trim();
  function validarContacto(c, hoy) {
    const e = {}, dig = String(c.telefono || '').replace(/\D/g, '');
    if (c.telefono && (dig.length < 8 || dig.length > 15)) e.telefono = 'Escribe un teléfono con 8 a 15 números.';
    if (c.cumpleanos) {
      const m = String(c.cumpleanos).match(/^(\d{4})-(\d{2})-(\d{2})$/), d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      if (!d || d.getMonth() !== +m[2] - 1 || d.getFullYear() < 1900 || d > hoy) e.cumpleanos = 'Revisa tu fecha de nacimiento.';
    }
    if (String(c.familia || '').length > 80) e.familia = 'Máximo 80 letras.';
    if (String(c.direccion || '').length > 200) e.direccion = 'Máximo 200 letras.';
    return e;
  }
  function campo(id, et, ayuda, input) {
    return '<div class="cm-campo"><label for="' + id + '">' + esc(et) + '</label>' + input + '<small id="' + id + 'A">' + esc(ayuda) + '</small><small class="cm-err" id="' + id + 'E" role="alert"></small></div>';
  }
  function tarjetaHTML(c) {
    return '<button type="button" class="volver" id="cmAtras">‹ Volver</button><h1 class="cp-titulo">Mi tarjeta de contacto</h1>' +
      '<p class="suave">Todo es opcional. Tu pastor lo ve solo si lo permites en «Mis permisos».</p>' +
      campo('cmTel', 'Teléfono', 'Para que tu pastor te escriba o te llame.', '<input id="cmTel" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" aria-describedby="cmTelA cmTelE" value="' + esc(c.telefono) + '">') +
      campo('cmCum', 'Fecha de nacimiento', 'Para saludarte en tu cumpleaños.', '<input id="cmCum" type="date" autocomplete="bday" aria-describedby="cmCumA cmCumE" value="' + esc(c.cumpleanos) + '">') +
      campo('cmFam', 'Familia', 'Por ejemplo, el apellido con el que te conocen. Ayuda a ubicar a tu familia.', '<input id="cmFam" type="text" maxlength="80" aria-describedby="cmFamA cmFamE" value="' + esc(c.familia) + '">') +
      campo('cmDir', 'Dirección', 'Solo si quieres recibir visitas en tu casa.', '<input id="cmDir" type="text" maxlength="200" autocomplete="street-address" aria-describedby="cmDirA cmDirE" value="' + esc(c.direccion) + '">') +
      '<button type="button" class="btn" id="cmGuardar">Guardar mi tarjeta</button><p class="suave cp-nota" id="cmEstado" role="status" aria-live="polite"></p>';
  }
  const localLeer = () => { try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '{}') || {}; } catch (e) { return {}; } };
  const localGuardar = (c) => { try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ } };

  async function tarjeta(id, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="cmAtras">‹ Volver</button><h1 class="cp-titulo">Mi tarjeta de contacto</h1><p class="suave" id="cmCarga" role="status">Abriendo tu tarjeta…</p>';
    $('#cmAtras').onclick = ctx.volver;
    let c = localLeer();
    const r = await ctx.rpc('miembro_contacto_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const f = r.ok && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (f) c = { telefono: f.telefono || '', cumpleanos: f.cumpleanos || '', familia: f.familia || '', direccion: f.direccion || '' };
    if (!$('#cmCarga')) return;
    pant.innerHTML = tarjetaHTML(c);
    $('#cmAtras').onclick = ctx.volver;
    $('#cmGuardar').onclick = async () => {
      const v = { telefono: limpiaTel($('#cmTel').value), cumpleanos: $('#cmCum').value || '', familia: $('#cmFam').value.trim(), direccion: $('#cmDir').value.trim() };
      const er = validarContacto(v, new Date()), est = $('#cmEstado');
      [['telefono', 'cmTel'], ['cumpleanos', 'cmCum'], ['familia', 'cmFam'], ['direccion', 'cmDir']].forEach((k) => { const e = $('#' + k[1] + 'E'); if (e) e.textContent = er[k[0]] || ''; });
      const mal = Object.keys(er)[0]; if (mal) { est.textContent = 'Revisa lo marcado y vuelve a guardar.'; const q = { telefono: '#cmTel', cumpleanos: '#cmCum', familia: '#cmFam', direccion: '#cmDir' }[mal]; if ($(q)) $(q).focus(); return; }
      const b = $('#cmGuardar'); b.disabled = true; est.textContent = 'Guardando…';
      const g = await ctx.rpc('miembro_contacto_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_telefono: v.telefono, p_direccion: v.direccion, p_cumpleanos: v.cumpleanos || null, p_familia: v.familia });
      const fila = g.ok && (Array.isArray(g.data) ? g.data[0] : g.data);
      b.disabled = false;
      if (fila && fila.ok) { localGuardar(v); est.textContent = 'Tu tarjeta quedó guardada ✓'; return; }
      est.textContent = g.falta ? 'Esta función se activa pronto en tu iglesia.' : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
    };
  }

  window.TBCentroMiembro = { permisos, tarjeta, _t: { PERMISOS, permisosHTML, tarjetaHTML, validarContacto, limpiaTel } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBCentroMiembro;
})();
