/* F1428 · Metas mensuales de la iglesia (5.4) y encuestas de clima anónimas (6.10) de PLAN_TAREAS_IGLESIA.md.
   Usa SQL 72: pastor_meta_iglesia_crear/avance/borrar, iglesia_metas_listar,
   pastor_clima_crear/listar/resultados/cerrar/borrar, miembro_clima_activas, miembro_clima_responder.
   Clima: respuestas sin nombre; el pastor no ve promedios con menos de 5 participantes.
   Sin ranking entre personas ni entre iglesias. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const MAX_METAS = 5;
  const MAX_PREGUNTAS = 5;

  function periodoActual(hoy) { const h = hoy || new Date(); return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0'); }
  function periodoTexto(hoy) { return (hoy || new Date()).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); }
  // Porcentaje sin pasarse de 100 y sin dividir por cero.
  function porcentaje(avance, meta) { return meta > 0 ? Math.min(100, Math.round((avance / meta) * 100)) : 0; }
  // Escala de respuesta: 1 = muy en desacuerdo … 5 = muy de acuerdo.
  const ESCALA = [[1, 'Muy en desacuerdo'], [2, 'En desacuerdo'], [3, 'Neutral'], [4, 'De acuerdo'], [5, 'Muy de acuerdo']];

  // ================= 5.4 Metas de la iglesia =================
  function metaHTML(m, pastor) {
    const pct = porcentaje(m.avance, m.meta_numero);
    return '<div class="card mi-meta-ig"><b>' + esc(m.titulo) + '</b><div class="mi-barra" role="img" aria-label="' + pct + ' por ciento"><i style="width:' + pct + '%"></i></div>' +
      '<p class="suave m0">' + esc(m.avance) + ' de ' + esc(m.meta_numero) + ' · ' + pct + ' %</p>' +
      (pastor ? '<div class="rl-acc"><label for="mi-av-' + esc(m.id) + '">Avance</label><input id="mi-av-' + esc(m.id) + '" type="number" min="0" max="100000" value="' + esc(m.avance) + '">' +
        '<button type="button" class="cp-mini" data-mi-av="' + esc(m.id) + '">Guardar avance</button> <button type="button" class="cp-mini cp-borrar" data-mi-borrar="' + esc(m.id) + '">Borrar</button></div>' : '') +
      '</div>';
  }

  async function abrirMetas(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const periodo = periodoActual();
    const error = (r) => (r && r.falta ? 'Esta función aún no está activada. Avisa a quien administra la app.' : 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="miVolver">‹ Panel</button><h1 class="cp-titulo">Metas de la iglesia</h1><p class="suave">Cargando…</p>';
      $('#miVolver').onclick = ctx.volver;
      const r = await ctx.rpc('iglesia_metas_listar', p, { p_periodo: periodo });
      const metas = lista(r) || [];
      pant.innerHTML = '<button type="button" class="volver" id="miVolver">‹ Panel</button><h1 class="cp-titulo">Metas de la iglesia</h1>' +
        '<p class="suave">Metas de ' + esc(periodoTexto()) + ' que toda la iglesia ve. Se miden con un número y se actualizan cuando avanzan.</p>' +
        (!r.ok ? '<p class="error" role="alert">' + esc(error(r)) + '</p>' : '') +
        '<h2 class="mi-sub">Nueva meta</h2><div class="card"><label for="miTitulo">Meta</label><input id="miTitulo" type="text" maxlength="120" placeholder="Ej.: Bautismos este mes">' +
        '<label for="miNum">Número que queremos llegar</label><input id="miNum" type="number" min="1" max="100000">' +
        '<p id="miErr" class="error" role="alert" hidden></p><button type="button" class="btn" id="miCrear"' + (metas.length >= MAX_METAS ? ' disabled' : '') + '>Agregar meta</button>' +
        (metas.length >= MAX_METAS ? '<p class="suave">Ya tienes ' + MAX_METAS + ' metas este mes.</p>' : '') + '</div>' +
        '<h2 class="mi-sub">Metas del mes</h2>' + (metas.length ? metas.map((m) => metaHTML(m, true)).join('') : '<p class="suave">Todavía no hay metas este mes.</p>') +
        '<p class="suave" id="miMsg" role="status" aria-live="polite"></p>';
      $('#miVolver').onclick = ctx.volver;
      $('#miCrear').onclick = async () => {
        const err = $('#miErr'); err.hidden = true;
        const titulo = $('#miTitulo').value.trim(), num = parseInt($('#miNum').value, 10);
        if (titulo.length < 3) { err.textContent = 'La meta debe tener al menos 3 letras.'; err.hidden = false; return; }
        if (!(num >= 1)) { err.textContent = 'Pon un número mayor que cero.'; err.hidden = false; return; }
        const g = await ctx.rpc('pastor_meta_iglesia_crear', p, { p_periodo: periodo, p_titulo: titulo, p_meta: num });
        if (g.ok && g.data && g.data.ok) return pintar();
        err.textContent = g.data && g.data.motivo === 'limite-5' ? 'Ya tienes ' + MAX_METAS + ' metas este mes.' : error(g); err.hidden = false;
      };
      document.querySelectorAll('[data-mi-av]').forEach((b) => {
        b.onclick = async () => {
          const id = b.getAttribute('data-mi-av'), v = parseInt(document.getElementById('mi-av-' + id).value, 10);
          if (!(v >= 0)) { $('#miMsg').textContent = 'El avance debe ser un número de 0 o más.'; return; }
          const g = await ctx.rpc('pastor_meta_iglesia_avance', p, { p_id: id, p_avance: v });
          if (g.ok && g.data && g.data.ok) pintar(); else $('#miMsg').textContent = error(g);
        };
      });
      document.querySelectorAll('[data-mi-borrar]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('¿Borrar esta meta?')) return;
          const g = await ctx.rpc('pastor_meta_iglesia_borrar', p, { p_id: b.getAttribute('data-mi-borrar') });
          if (g.ok && g.data && g.data.ok) pintar(); else $('#miMsg').textContent = error(g);
        };
      });
    };
    pintar();
  }

  // Vista de la persona: solo lectura de las metas de la iglesia del mes (dentro de Mi servicio).
  async function miembroMetas(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('iglesia_metas_listar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_periodo: periodoActual() });
    const metas = lista(r);
    if (!metas || !metas.length) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Metas de la iglesia este mes</h2>' + metas.map((m) => metaHTML(m, false)).join('');
  }

  // ================= 6.10 Clima anónimo =================
  function clima_resumen(res) {
    if (!res.muestran_promedios) return 'Hace falta que respondan al menos 5 personas para ver promedios. Así nadie se puede identificar.';
    return 'Promedios de 1 a 5 · ' + res.participantes + (res.participantes === 1 ? ' persona respondió' : ' personas respondieron');
  }

  async function abrirClima(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const error = (r) => (r && r.falta ? 'Esta función aún no está activada. Avisa a quien administra la app.' : 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="clVolver">‹ Panel</button><h1 class="cp-titulo">Encuesta de clima</h1><p class="suave">Cargando…</p>';
      $('#clVolver').onclick = ctx.volver;
      const r = await ctx.rpc('pastor_clima_listar', p);
      const encs = lista(r) || [];
      pant.innerHTML = '<button type="button" class="volver" id="clVolver">‹ Panel</button><h1 class="cp-titulo">Encuesta de clima</h1>' +
        '<p class="suave">Preguntas para conocer cómo se siente la iglesia. Las respuestas son anónimas: nadie ve quién respondió qué.</p>' +
        '<h2 class="mi-sub">Nueva encuesta</h2><div class="card"><label for="clTitulo">Título</label><input id="clTitulo" type="text" maxlength="120" placeholder="Ej.: Cómo nos sentimos este trimestre">' +
        '<p class="suave">Escribe de 1 a ' + MAX_PREGUNTAS + ' preguntas. Cada persona responde de 1 (muy en desacuerdo) a 5 (muy de acuerdo).</p>' +
        [1, 2, 3, 4, 5].map((n) => '<label for="clP' + n + '">Pregunta ' + n + (n === 1 ? '' : ' (opcional)') + '</label><input id="clP' + n + '" type="text" maxlength="140">').join('') +
        '<p id="clErr" class="error" role="alert" hidden></p><button type="button" class="btn" id="clCrear">Crear encuesta</button></div>' +
        '<h2 class="mi-sub">Encuestas</h2>' + (!r.ok ? '<p class="error" role="alert">' + esc(error(r)) + '</p>' : '') +
        (encs.length ? encs.map((e) => '<div class="card"><b>' + esc(e.titulo) + '</b> <small class="suave">' + (e.abierta ? 'Abierta' : 'Cerrada') + '</small>' +
          '<p class="suave m0">' + esc(e.participantes) + (e.participantes === 1 ? ' persona respondió' : ' personas respondieron') + '</p>' +
          '<div class="rl-acc"><button type="button" class="cp-mini" data-cl-ver="' + esc(e.id) + '">Ver resultados</button>' +
          (e.abierta ? ' <button type="button" class="cp-mini" data-cl-cerrar="' + esc(e.id) + '">Cerrar</button>' : '') +
          ' <button type="button" class="cp-mini cp-borrar" data-cl-borrar="' + esc(e.id) + '">Borrar</button></div><div id="clRes-' + esc(e.id) + '"></div></div>').join('')
          : '<p class="suave">Todavía no hay encuestas.</p>') +
        '<p class="suave" id="clMsg" role="status" aria-live="polite"></p>';
      $('#clVolver').onclick = ctx.volver;
      $('#clCrear').onclick = async () => {
        const err = $('#clErr'); err.hidden = true;
        const titulo = $('#clTitulo').value.trim();
        const preguntas = [1, 2, 3, 4, 5].map((n) => $('#clP' + n).value.trim()).filter(Boolean);
        if (titulo.length < 3) { err.textContent = 'El título debe tener al menos 3 letras.'; err.hidden = false; return; }
        if (!preguntas.length) { err.textContent = 'Escribe al menos una pregunta.'; err.hidden = false; return; }
        if (preguntas.some((x) => x.length < 3)) { err.textContent = 'Cada pregunta debe tener al menos 3 letras.'; err.hidden = false; return; }
        const g = await ctx.rpc('pastor_clima_crear', p, { p_titulo: titulo, p_preguntas: preguntas });
        if (g.ok && g.data && g.data.ok) return pintar();
        err.textContent = error(g); err.hidden = false;
      };
      document.querySelectorAll('[data-cl-ver]').forEach((b) => {
        b.onclick = async () => {
          const id = b.getAttribute('data-cl-ver'), caja = document.getElementById('clRes-' + id);
          caja.innerHTML = '<p class="suave">Cargando resultados…</p>';
          const g = await ctx.rpc('pastor_clima_resultados', p, { p_encuesta: id });
          const d = g.ok && g.data && g.data.ok ? g.data : null;
          if (!d) { caja.innerHTML = '<p class="error">' + esc(error(g)) + '</p>'; return; }
          caja.innerHTML = '<p class="suave">' + esc(clima_resumen(d)) + '</p>' + (d.muestran_promedios ? '<ul class="cp-lista">' +
            (d.preguntas || []).map((x) => '<li><span>' + esc(x.texto) + '</span> <b>' + esc(x.promedio) + '</b> <small class="suave">' + esc(x.respuestas) + ' respuestas</small></li>').join('') + '</ul>' : '');
        };
      });
      document.querySelectorAll('[data-cl-cerrar]').forEach((b) => {
        b.onclick = async () => { const g = await ctx.rpc('pastor_clima_cerrar', p, { p_encuesta: b.getAttribute('data-cl-cerrar') }); if (g.ok && g.data && g.data.ok) pintar(); else $('#clMsg').textContent = error(g); };
      });
      document.querySelectorAll('[data-cl-borrar]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('¿Borrar esta encuesta y todas sus respuestas?')) return;
          const g = await ctx.rpc('pastor_clima_borrar', p, { p_encuesta: b.getAttribute('data-cl-borrar') });
          if (g.ok && g.data && g.data.ok) pintar(); else $('#clMsg').textContent = error(g);
        };
      });
    };
    pintar();
  }

  // Vista de la persona: responder cada encuesta abierta una sola vez.
  async function miembroClima(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('miembro_clima_activas', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null });
    const encs = (lista(r) || []).filter((e) => !e.ya_respondio);
    if (!encs.length) { c.innerHTML = ''; return; }
    const pintar = (es) => {
      c.innerHTML = '<h2 class="mi-sub">Encuesta de la iglesia</h2>' + es.map((e) => {
        const preg = Array.isArray(e.preguntas) ? e.preguntas : [];
        return '<div class="card cl-form" data-cl-form="' + esc(e.id) + '"><b>' + esc(e.titulo) + '</b><p class="suave">Tu respuesta es anónima. Responde una sola vez.</p>' +
          preg.map((t, i) => '<fieldset class="cl-preg"><legend>' + esc(t) + '</legend>' + ESCALA.map(([v, txt]) =>
            '<label class="cl-op"><input type="radio" name="cl-' + esc(e.id) + '-' + i + '" value="' + v + '"> ' + esc(txt) + '</label>').join('') + '</fieldset>').join('') +
          '<p class="error" id="clm-err-' + esc(e.id) + '" role="alert" hidden></p><button type="button" class="btn" data-cl-enviar="' + esc(e.id) + '" data-n="' + preg.length + '">Enviar respuestas</button></div>';
      }).join('') + '<p class="suave" id="clmMsg" role="status" aria-live="polite"></p>';
      c.querySelectorAll('[data-cl-enviar]').forEach((b) => {
        b.onclick = async () => {
          const id2 = b.getAttribute('data-cl-enviar'), n = parseInt(b.getAttribute('data-n'), 10);
          const vals = []; for (let i = 0; i < n; i++) {
            const sel = c.querySelector('input[name="cl-' + id2 + '-' + i + '"]:checked'); if (!sel) break; vals.push(parseInt(sel.value, 10));
          }
          const err = document.getElementById('clm-err-' + id2); err.hidden = true;
          if (vals.length !== n) { err.textContent = 'Responde todas las preguntas antes de enviar.'; err.hidden = false; return; }
          const g = await rpcRaw('miembro_clima_responder', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_encuesta: id2, p_valores: vals });
          if (g && g.ok && g.data && g.data.ok) { const rest = es.filter((x) => x.id !== id2); es.splice(0, es.length, ...rest); if (es.length) pintar(es); else c.innerHTML = '<p class="suave">¡Gracias por responder!</p>'; return; }
          const motivo = g && g.data && g.data.motivo;
          err.textContent = motivo === 'ya-respondio' ? 'Ya respondiste esta encuesta. Gracias.' : motivo === 'cerrada' ? 'Esta encuesta ya se cerró.' : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
          err.hidden = false;
        };
      });
    };
    pintar(encs);
  }

  window.TBMetasIglesia = { abrir: abrirMetas, miembroMostrar: miembroMetas, _t: { porcentaje, periodoActual, MAX_METAS } };
  window.TBClima = { abrir: abrirClima, miembroMostrar: miembroClima, _t: { clima_resumen, ESCALA, MAX_PREGUNTAS } };
  if (typeof module !== 'undefined' && module.exports) module.exports = { TBMetasIglesia: window.TBMetasIglesia, TBClima: window.TBClima };
})();
