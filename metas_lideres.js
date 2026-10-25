/* F1428 · Metas de líderes, parte del pastor (tareas 6.1 y 6.2 de PLAN_TAREAS_IGLESIA.md).
   El pastor pone metas a una persona para un mes, las marca cumplidas o no, o las borra.
   Usa SQL 69: pastor_meta_crear, pastor_metas_listar, pastor_meta_marcar, pastor_meta_borrar.
   Y pastor_miembros_listar (ya existente) para elegir a la persona.
   Sin ranking entre personas: la lista se agrupa por persona, sin ordenar por cumplimiento. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  // Últimos 6 meses (el actual primero), en formato AAAA-MM.
  function periodos(hoy) {
    const h = hoy || new Date();
    const out = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(h.getFullYear(), h.getMonth() - i, 1);
      const valor = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const texto = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      out.push([valor, texto]);
    }
    return out;
  }
  const esPeriodoValido = (v) => /^[0-9]{4}-[0-9]{2}$/.test(String(v || ''));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);

  // Agrupa metas por persona, con el orden alfabético del nombre (nunca por cumplimiento).
  function agrupar(metas) {
    const mapa = new Map();
    metas.forEach((m) => {
      const k = m.miembro_id;
      if (!mapa.has(k)) mapa.set(k, { id: k, nombre: m.miembro || 'Sin nombre', metas: [] });
      mapa.get(k).metas.push(m);
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  function resumenTexto(metas) {
    if (!metas.length) return 'Todavía no hay metas este mes.';
    const hechas = metas.filter((m) => m.cumplida).length;
    const personas = new Set(metas.map((m) => m.miembro_id)).size;
    return metas.length + (metas.length === 1 ? ' meta' : ' metas') + ' para ' + personas + (personas === 1 ? ' persona' : ' personas') +
      ' · ' + hechas + ' ' + (hechas === 1 ? 'cumplida' : 'cumplidas') + '. Son para acompañar, no para comparar.';
  }

  function pantallaHTML(state) {
    const { periodo, periodoTexto, miembros, metas } = state;
    const grupos = agrupar(metas);
    const opciones = periodos().map(([v, t]) => '<option value="' + v + '"' + (v === periodo ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
    const selMiembro = miembros
      ? '<select id="mgMiembro" aria-label="Persona"><option value="">Elige una persona</option>' +
        miembros.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.nombre) + (x.es_lider ? ' (líder)' : '') + '</option>').join('') + '</select>'
      : '<p class="error" role="alert">No pudimos cargar la lista de personas. Revisa tu conexión.</p>';
    const listaHTML = grupos.length
      ? grupos.map((g) => '<div class="card mg-persona"><b>' + esc(g.nombre) + '</b><ul class="cp-lista">' +
          g.metas.map((m) => '<li class="mg-meta' + (m.cumplida ? ' hecha' : '') + '"><span>' + (m.cumplida ? '✅ ' : '⬜ ') + esc(m.titulo) + '</span>' +
            '<span class="mg-btns"><button type="button" class="cp-mini" data-mg-marcar="' + esc(m.id) + '" data-val="' + (m.cumplida ? '0' : '1') + '">' +
            (m.cumplida ? 'Marcar pendiente' : 'Marcar cumplida') + '</button> ' +
            '<button type="button" class="cp-mini cp-borrar" data-mg-borrar="' + esc(m.id) + '">Borrar</button></span></li>').join('') +
          '</ul></div>').join('')
      : '<p class="suave">Todavía no hay metas en este mes.</p>';
    return '<button type="button" class="volver" id="mgVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Metas de líderes</h1>' +
      '<p class="suave">Metas sencillas para cada mes. Tú decides cuáles poner y cuáles se cumplen.</p>' +
      '<div class="card"><label for="mgPeriodo">Mes</label><select id="mgPeriodo">' + opciones + '</select></div>' +
      '<h2 class="mi-sub">Poner una meta</h2>' +
      '<div class="card"><label for="mgMiembro">Persona</label>' + selMiembro +
      '<label for="mgTitulo">Meta</label><input id="mgTitulo" type="text" maxlength="120" placeholder="Ej.: Visitar a 5 familias del grupo" autocomplete="off">' +
      '<p id="mgErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn" id="mgAgregar">Agregar meta</button></div>' +
      '<h2 class="mi-sub">Metas de ' + esc(periodoTexto) + '</h2>' +
      '<p class="suave" id="mgResumen">' + esc(resumenTexto(metas)) + '</p>' +
      listaHTML +
      '<h2 class="mi-sub">Tendencia de los últimos 6 meses</h2><p class="suave">Cuántas metas se cumplieron cada mes, en total. No se compara a las personas.</p><div id="mgTend"><p class="suave">Cargando tendencia…</p></div>' +
      '<p class="suave" id="mgMsg" role="status" aria-live="polite"></p>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const hoyPeriodo = periodos()[0];
    const state = { periodo: hoyPeriodo[0], periodoTexto: hoyPeriodo[1], miembros: null, metas: [] };

    const cargar = async () => {
      const [mr, metasR] = await Promise.all([
        ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }),
        ctx.rpc('pastor_metas_listar', p, { p_periodo: state.periodo }),
      ]);
      state.miembros = lista(mr) ? lista(mr).map((x) => ({ id: x.id, nombre: x.nombre, es_lider: !!x.es_lider })) : null;
      state.metas = lista(metasR) || [];
      state.metasFallo = !metasR.ok;
      const per = periodos().find((x) => x[0] === state.periodo);
      state.periodoTexto = per ? per[1] : state.periodo;
    };

    const msg = (t, error) => { const m = $('#mgMsg'); if (m) { m.textContent = t; m.className = error ? 'error' : 'suave'; } };
    const error = (r) => (r && r.falta ? 'Esta función aún no está activada. Avisa a quien administra la app.' : 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');

    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="mgVolver">‹ Panel</button><h1 class="cp-titulo">Metas de líderes</h1><p class="suave">Cargando…</p>';
      $('#mgVolver').onclick = ctx.volver;
      await cargar();
      pant.innerHTML = pantallaHTML(state);
      if (state.metasFallo) msg('No pudimos cargar las metas de este mes.', true);
      cargarTendencia();
      $('#mgVolver').onclick = ctx.volver;

      $('#mgPeriodo').onchange = () => { state.periodo = $('#mgPeriodo').value; if (esPeriodoValido(state.periodo)) pintar(); };

      $('#mgAgregar').onclick = async () => {
        const err = $('#mgErr'); err.hidden = true;
        const miembro = $('#mgMiembro') ? $('#mgMiembro').value : '';
        const titulo = $('#mgTitulo').value.trim();
        if (!miembro) { err.textContent = 'Elige una persona.'; err.hidden = false; return; }
        if (titulo.length < 3) { err.textContent = 'La meta debe tener al menos 3 letras.'; err.hidden = false; return; }
        const r = await ctx.rpc('pastor_meta_crear', p, { p_miembro: miembro, p_titulo: titulo, p_periodo: state.periodo });
        if (r.ok && r.data && r.data.ok) { pintar(); return; }
        err.textContent = r.data && r.data.motivo === 'sin-permiso' ? 'Tu clave de pastor no tiene permiso para esto.' : error(r);
        err.hidden = false;
      };

      document.querySelectorAll('[data-mg-marcar]').forEach((b) => {
        b.onclick = async () => {
          const r = await ctx.rpc('pastor_meta_marcar', p, { p_id: b.getAttribute('data-mg-marcar'), p_cumplida: b.getAttribute('data-val') === '1' });
          if (r.ok && r.data && r.data.ok) pintar(); else msg(error(r), true);
        };
      });
      document.querySelectorAll('[data-mg-borrar]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('¿Borrar esta meta?')) return;
          const r = await ctx.rpc('pastor_meta_borrar', p, { p_id: b.getAttribute('data-mg-borrar') });
          if (r.ok && r.data && r.data.ok) pintar(); else msg(error(r), true);
        };
      });
    };
    // F1428 · 6.5 Tendencia sin ranking: cuenta por mes, sin nombres.
    const cargarTendencia = async () => {
      const caja = $('#mgTend'); if (!caja) return;
      const meses = periodos();
      const datos = await Promise.all(meses.map((x) => ctx.rpc('pastor_metas_listar', p, { p_periodo: x[0] }).then((r) => ({ texto: x[1], metas: lista(r) }))));
      if (datos.every((d) => d.metas === null)) { caja.innerHTML = '<p class="suave">No pudimos cargar la tendencia. Revisa tu conexión.</p>'; return; }
      caja.innerHTML = '<ul class="cp-lista mg-tend">' + datos.slice().reverse().map((d) => {
        const total = d.metas ? d.metas.length : 0, hechas = d.metas ? d.metas.filter((m) => m.cumplida).length : 0;
        const pct = total ? Math.round((hechas / total) * 100) : 0;
        return '<li><span class="mg-tend-t">' + esc(d.texto) + '</span><span class="mg-bar" role="img" aria-label="' + hechas + ' de ' + total + ' cumplidas"><i style="width:' + pct + '%"></i></span><small class="suave">' +
          (total ? hechas + ' de ' + total + ' cumplidas' : 'sin metas') + '</small></li>';
      }).join('') + '</ul>';
    };
    pintar();
  }

  window.TBMetasLideres = { abrir, _t: { periodos, agrupar, resumenTexto, esPeriodoValido } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBMetasLideres;
})();
