/* F1410 · Centro de notificaciones estilo Instagram (tarea 2.5) y horario de silencio (tarea 2.6).
   No necesita SQL nuevo: junta lo que ya le llega al miembro (avisos, encuestas, gracias y palabras de ánimo),
   cuenta como «nuevo» lo que es posterior a la última vez que abrió el centro, y guarda sus preferencias en el teléfono.
   Sin push por ahora: se ve cuando la persona abre la app. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const K_VISTO = 'tb_notif_visto', K_PREF = 'tb_notif_prefs';
  const TIPOS = { aviso: { t: 'Aviso', i: '📣' }, encuesta: { t: 'Encuesta', i: '🗳️' }, gracia: { t: 'Gracia', i: '🌷' }, animo: { t: 'Palabra de ánimo', i: '💛' } };
  const PREF_BASE = { tipos: { aviso: true, encuesta: true, gracia: true, animo: true }, silencio: { activo: false, desde: '22:00', hasta: '07:00' } };

  // ---------- Lógica pura (se prueba sin navegador) ----------
  function normalizar(tipo, lista, titulo) {
    return (lista || []).map((x) => ({ tipo, id: tipo + ':' + (x.id || ''), titulo: titulo(x), cuando: x.creado_en || x.creada_en || '' }))
      .filter((x) => x.cuando && !isNaN(new Date(x.cuando)));
  }
  function ordenar(items) { return items.slice().sort((a, b) => new Date(b.cuando) - new Date(a.cuando)).slice(0, 40); }
  function esHoy(iso, ahora) { const d = new Date(iso); return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth() && d.getDate() === ahora.getDate(); }
  function agrupar(items, ahora) { const hoy = [], antes = []; items.forEach((x) => (esHoy(x.cuando, ahora) ? hoy : antes).push(x)); return { hoy, antes }; }
  function nuevas(items, visto, prefs) {
    const v = visto ? new Date(visto) : new Date(0);
    return items.filter((x) => new Date(x.cuando) > v && tipoActivo(prefs, x.tipo)).length;
  }
  function tipoActivo(prefs, tipo) { return !(prefs && prefs.tipos && prefs.tipos[tipo] === false); }
  // Horario de silencio: «22:00» a «07:00» también cruza la medianoche. hora = «HH:MM».
  function minutos(h) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  function enSilencio(prefs, hora) {
    const s = prefs && prefs.silencio; if (!s || !s.activo) return false;
    const a = minutos(s.desde), b = minutos(s.hasta), h = minutos(hora);
    if (a === null || b === null || h === null) return false;
    return a <= b ? (h >= a && h < b) : (h >= a || h < b);
  }
  function prefsGuardadas() {
    try { const x = JSON.parse(localStorage.getItem(K_PREF) || 'null'); return x ? Object.assign({}, PREF_BASE, x, { tipos: Object.assign({}, PREF_BASE.tipos, x.tipos || {}), silencio: Object.assign({}, PREF_BASE.silencio, x.silencio || {}) }) : JSON.parse(JSON.stringify(PREF_BASE)); }
    catch (e) { return JSON.parse(JSON.stringify(PREF_BASE)); }
  }
  function guardarPrefs(p) { try { localStorage.setItem(K_PREF, JSON.stringify(p)); } catch (e) { /* sin espacio: se usan las de siempre */ } }
  const horaAhora = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

  // ---------- Datos: lo que ya le llega al miembro ----------
  async function reunir(id, rpcRaw) {
    const c = { codigo: id.codigo, clave: id.clave };
    const [a, e, g, n] = await Promise.all([
      rpcRaw('aviso_miembro_listar_v2', { p_codigo: c.codigo, p_clave: c.clave }),
      rpcRaw('miembro_encuestas_listar', { p_codigo: c.codigo, p_clave: c.clave }),
      rpcRaw('miembro_gracias_listar', { p_codigo: c.codigo, p_clave: c.clave }),
      rpcRaw('miembro_animos_listar', { p_codigo: c.codigo, p_clave: c.clave })
    ]);
    const avisos = a && a.ok ? (a.data || []) : [];
    const encuestas = e && e.ok && e.data && e.data.ok !== false ? (e.data.encuestas || []) : [];
    const gracias = g && g.ok && g.data && g.data.ok !== false ? (g.data.gracias || []).filter((x) => x.soy_quien_recibe) : [];
    const animos = n && n.ok && n.data && n.data.ok !== false ? (n.data.animos || []) : [];
    return ordenar([].concat(
      normalizar('aviso', avisos, (x) => x.titulo || 'Nuevo aviso'),
      normalizar('encuesta', encuestas, (x) => 'Nueva encuesta: ' + (x.pregunta || '')),
      normalizar('gracia', gracias, (x) => (x.de || 'Alguien') + ' te dio las gracias'),
      normalizar('animo', animos, (x) => x.texto || 'Te enviaron una palabra de ánimo')
    ));
  }

  // ---------- Pantalla ----------
  function panelHTML(items, prefs, ahora) {
    const g = agrupar(items.filter((x) => tipoActivo(prefs, x.tipo)), ahora);
    const fila = (x) => '<div class="ntf-fila"><span class="ntf-ico" aria-hidden="true">' + TIPOS[x.tipo].i + '</span><span class="ntf-tx"><b>' + esc(x.titulo) + '</b><small>' + esc(TIPOS[x.tipo].t) + ' · ' + esc(new Date(x.cuando).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })) + '</small></span></div>';
    const bloque = (t, l) => (l.length ? '<h3 class="ntf-cab">' + t + '</h3>' + l.map(fila).join('') : '');
    const cuerpo = (g.hoy.length || g.antes.length) ? bloque('Hoy', g.hoy) + bloque('Antes', g.antes) : '<p class="suave">Todo al día. Aquí aparecerá lo nuevo de tu iglesia.</p>';
    const tipos = Object.keys(TIPOS).map((k) => '<label class="ntf-op"><input type="checkbox" data-ntf-tipo="' + k + '"' + (prefs.tipos[k] !== false ? ' checked' : '') + '> ' + TIPOS[k].i + ' ' + TIPOS[k].t + '</label>').join('');
    return '<div class="ntf-panel" role="dialog" aria-label="Notificaciones"><div class="ntf-top"><b>Notificaciones</b><button type="button" class="btn chico sec" id="ntfCerrar">Cerrar</button></div>' +
      cuerpo +
      '<details class="ntf-ajustes"><summary>Ajustes de notificaciones</summary>' +
      '<p class="suave">Elige qué quieres ver.</p>' + tipos +
      '<label class="ntf-op"><input type="checkbox" id="ntfSilActivo"' + (prefs.silencio.activo ? ' checked' : '') + '> Horario de silencio</label>' +
      '<div class="ntf-horas"><label>Desde <input type="time" id="ntfDesde" value="' + esc(prefs.silencio.desde) + '"></label><label>Hasta <input type="time" id="ntfHasta" value="' + esc(prefs.silencio.hasta) + '"></label></div>' +
      '<p class="suave">En horario de silencio no se cuentan ni se muestran las novedades. Nada se borra.</p>' +
      '<button type="button" class="btn" id="ntfGuardar">Guardar ajustes</button></details></div>';
  }

  async function montar(id, rpcRaw) {
    const pant = document.getElementById('pantalla'); if (!pant || !id || document.getElementById('tbNotifBtn')) return;
    const boton = document.createElement('button');
    boton.type = 'button'; boton.id = 'tbNotifBtn'; boton.className = 'ntf-campana'; boton.setAttribute('aria-label', 'Notificaciones');
    boton.innerHTML = '<span aria-hidden="true">🔔</span><i class="ntf-punto" id="tbNotifPunto" hidden></i>';
    pant.insertBefore(boton, pant.firstChild);

    let items = [];
    const actualizarPunto = () => {
      const prefs = prefsGuardadas(), ahora = new Date();
      const n = enSilencio(prefs, horaAhora(ahora)) ? 0 : nuevas(items, localStorage.getItem(K_VISTO), prefs);
      const p = document.getElementById('tbNotifPunto'); if (p) p.hidden = n === 0;
      boton.setAttribute('aria-label', 'Notificaciones' + (n ? ', ' + n + ' nuevas' : ''));
    };
    try { items = await reunir(id, rpcRaw); } catch (e) { items = []; }
    actualizarPunto();

    boton.onclick = () => {
      const prefs = prefsGuardadas(), ahora = new Date();
      let caja = document.getElementById('tbNotifCaja');
      if (caja) { caja.remove(); return; }
      caja = document.createElement('div'); caja.id = 'tbNotifCaja'; caja.className = 'ntf-capa';
      caja.innerHTML = panelHTML(items, prefs, ahora);
      document.body.appendChild(caja);
      try { localStorage.setItem(K_VISTO, new Date().toISOString()); } catch (e) { /* sin copia */ }
      actualizarPunto();
      document.getElementById('ntfCerrar').onclick = () => caja.remove();
      document.getElementById('ntfGuardar').onclick = () => {
        const p = prefsGuardadas();
        caja.querySelectorAll('[data-ntf-tipo]').forEach((c) => { p.tipos[c.getAttribute('data-ntf-tipo')] = c.checked; });
        p.silencio.activo = document.getElementById('ntfSilActivo').checked;
        p.silencio.desde = document.getElementById('ntfDesde').value || '22:00';
        p.silencio.hasta = document.getElementById('ntfHasta').value || '07:00';
        guardarPrefs(p);
        caja.remove(); actualizarPunto();
      };
    };
  }

  window.TBNotif = { montar, _t: { normalizar, ordenar, agrupar, nuevas, enSilencio, minutos, tipoActivo } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBNotif;
})();
