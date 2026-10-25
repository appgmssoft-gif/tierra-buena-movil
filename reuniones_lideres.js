/* F1428 · Reuniones pastor-líderes (tareas 6.6 y 6.7 de PLAN_TAREAS_IGLESIA.md).
   Pastor: crea la reunión con hasta 3 fechas, ve cuántos votaron cada fecha (no quién), elige la fecha final
   y escribe el acta con acuerdos (cada uno con su responsable).
   Líder: vota la fecha que le sirve desde su propia vista (miembroMostrar).
   Usa SQL 71: pastor_reunion_crear, lider_reuniones_listar, lider_reunion_votar, pastor_reunion_confirmar,
   pastor_reunion_acta, pastor_reunion_borrar.
   Sin ranking de personas: solo conteos por fecha. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const MAX_ACUERDOS = 20;

  // Fecha corta en español de Chile, para mostrar. Entrada: texto ISO o Date.
  function fechaTexto(f) {
    const d = f instanceof Date ? f : new Date(f);
    if (isNaN(d)) return 'Fecha sin definir';
    return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' +
      d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  // Valor de un campo datetime-local («AAAA-MM-DDTHH:MM») a ISO. Devuelve null si está vacío o es inválido.
  function aIso(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString();
  }
  // Acuerdos válidos: texto de 3 a 200 letras; responsable opcional (máx. 60). Máximo 20.
  function limpiarAcuerdos(lst) {
    return (lst || []).map((a) => ({ texto: String(a.texto || '').replace(/\s+/g, ' ').trim().slice(0, 200), responsable: String(a.responsable || '').replace(/\s+/g, ' ').trim().slice(0, 60) }))
      .filter((a) => a.texto.length >= 3).slice(0, MAX_ACUERDOS);
  }
  // Cuenta de votos por fecha, sin nombres. El que más votos tenga se marca «la más votada», sin juzgar a nadie.
  function resumenVotos(opciones) {
    const total = (opciones || []).reduce((s, o) => s + (o.votos || 0), 0);
    return { total, lider: (opciones || []).slice().sort((a, b) => (b.votos || 0) - (a.votos || 0))[0] || null };
  }

  function formularioCrear() {
    return '<h2 class="mi-sub">Nueva reunión</h2><div class="card">' +
      '<label for="rlTitulo">Título</label><input id="rlTitulo" type="text" maxlength="120" placeholder="Ej.: Reunión de líderes de noviembre" autocomplete="off">' +
      '<label for="rlDetalle">Para qué es (opcional)</label><input id="rlDetalle" type="text" maxlength="400" placeholder="Ej.: Revisar el culto especial">' +
      '<p class="suave">Propón hasta 3 fechas. Los líderes votan la que les sirve.</p>' +
      [1, 2, 3].map((n) => '<label for="rlF' + n + '">Fecha ' + n + (n === 1 ? '' : ' (opcional)') + '</label><input id="rlF' + n + '" type="datetime-local">').join('') +
      '<p id="rlErr" class="error" role="alert" hidden></p><button type="button" class="btn" id="rlCrear">Crear reunión</button></div>';
  }

  function reunionHTML(r) {
    const res = resumenVotos(r.opciones);
    const estado = r.estado === 'cerrada' ? 'Con acta' : r.estado === 'confirmada' ? 'Fecha confirmada' : 'Encuesta abierta';
    const opciones = (r.opciones || []).map((o) => {
      const marcada = r.fecha_elegida && new Date(r.fecha_elegida).getTime() === new Date(o.fecha).getTime();
      return '<li class="rl-op' + (marcada ? ' elegida' : '') + '"><span>' + esc(fechaTexto(o.fecha)) + '</span><small class="suave">' +
        (o.votos || 0) + (o.votos === 1 ? ' voto' : ' votos') + '</small>' +
        (r.estado === 'encuesta' ? ' <button type="button" class="cp-mini" data-rl-elegir="' + esc(r.id) + '" data-rl-op="' + esc(o.id) + '">Elegir esta fecha</button>' : '') + '</li>';
    }).join('');
    const acuerdos = (r.acuerdos || []).map((a) => '<li>' + esc(a.texto) + (a.responsable ? ' <small class="suave">· ' + esc(a.responsable) + '</small>' : '') + '</li>').join('');
    return '<div class="card rl-reunion"><b>' + esc(r.titulo) + '</b> <small class="suave">' + esc(estado) + '</small>' +
      (r.detalle ? '<p class="suave m0">' + esc(r.detalle) + '</p>' : '') +
      '<ul class="cp-lista rl-ops">' + opciones + '</ul>' +
      (res.total ? '<p class="suave">' + res.total + (res.total === 1 ? ' voto en total' : ' votos en total') + '</p>' : '<p class="suave">Todavía nadie votó.</p>') +
      (r.estado !== 'encuesta' && r.fecha_elegida ? '<p><b>Fecha:</b> ' + esc(fechaTexto(r.fecha_elegida)) + '</p>' : '') +
      (acuerdos ? '<h3 class="mi-sub">Acuerdos</h3><ul class="cp-lista">' + acuerdos + '</ul>' : '') +
      (r.acta_texto ? '<p class="suave">' + esc(r.acta_texto) + '</p>' : '') +
      '<div class="rl-acc"><button type="button" class="cp-mini" data-rl-acta="' + esc(r.id) + '">' + (r.acta_texto || acuerdos ? 'Editar acta' : 'Escribir acta') + '</button> ' +
      '<button type="button" class="cp-mini cp-borrar" data-rl-borrar="' + esc(r.id) + '">Borrar</button></div>' +
      '<div id="rlActa-' + esc(r.id) + '"></div></div>';
  }

  // Formulario del acta: texto y acuerdos (cada uno con su responsable).
  function actaHTML(r) {
    const base = (r.acuerdos && r.acuerdos.length ? r.acuerdos : [{ texto: '', responsable: '' }]);
    return '<div class="card rl-acta"><label for="rlActaTxt-' + esc(r.id) + '">Resumen de la reunión</label>' +
      '<textarea id="rlActaTxt-' + esc(r.id) + '" maxlength="2000" rows="4">' + esc(r.acta_texto || '') + '</textarea>' +
      '<h3 class="mi-sub">Acuerdos</h3><div id="rlAcu-' + esc(r.id) + '">' +
      base.map((a) => '<div class="rl-acu"><input type="text" maxlength="200" placeholder="Acuerdo" value="' + esc(a.texto) + '" data-acu-t>' +
        '<input type="text" maxlength="60" placeholder="Responsable" value="' + esc(a.responsable) + '" data-acu-r></div>').join('') +
      '</div><button type="button" class="cp-mini" data-rl-mas="' + esc(r.id) + '">+ Agregar acuerdo</button>' +
      '<p id="rlActaMsg-' + esc(r.id) + '" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn" data-rl-guardar-acta="' + esc(r.id) + '">Guardar acta</button></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let reuniones = [];
    let fallo = false;
    const error = (r) => (r && r.falta ? 'Esta función aún no está activada. Avisa a quien administra la app.' : 'No se pudo completar. Revisa tu conexión e inténtalo de nuevo.');

    const cargar = async () => {
      const r = await ctx.rpc('lider_reuniones_listar', p);
      reuniones = lista(r) || []; fallo = !r.ok;
    };
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="rlVolver">‹ Panel</button><h1 class="cp-titulo">Reuniones de líderes</h1><p class="suave">Cargando…</p>';
      $('#rlVolver').onclick = ctx.volver;
      await cargar();
      pant.innerHTML = '<button type="button" class="volver" id="rlVolver">‹ Panel</button><h1 class="cp-titulo">Reuniones de líderes</h1>' +
        '<p class="suave">Propón fechas, deja que los líderes voten y guarda el acta con los acuerdos y sus responsables.</p>' +
        formularioCrear() +
        '<h2 class="mi-sub">Reuniones</h2>' +
        (fallo ? '<p class="error" role="alert">No pudimos cargar las reuniones. Revisa tu conexión.</p>' : '') +
        (reuniones.length ? reuniones.map(reunionHTML).join('') : '<p class="suave">Todavía no hay reuniones. Crea la primera arriba.</p>') +
        '<p class="suave" id="rlMsg" role="status" aria-live="polite"></p>';
      $('#rlVolver').onclick = ctx.volver;
      conectar();
    };

    const conectar = () => {
      $('#rlCrear').onclick = async () => {
        const err = $('#rlErr'); err.hidden = true;
        const titulo = $('#rlTitulo').value.trim();
        const fechas = [1, 2, 3].map((n) => aIso($('#rlF' + n).value)).filter(Boolean);
        if (titulo.length < 3) { err.textContent = 'El título debe tener al menos 3 letras.'; err.hidden = false; return; }
        if (!fechas.length) { err.textContent = 'Propón al menos una fecha.'; err.hidden = false; return; }
        const r = await ctx.rpc('pastor_reunion_crear', p, { p_titulo: titulo, p_detalle: $('#rlDetalle').value.trim(), p_fechas: fechas });
        if (r.ok && r.data && r.data.ok) return pintar();
        err.textContent = r.data && r.data.motivo === 'sin-permiso' ? 'Tu clave de pastor no tiene permiso para esto.' : error(r);
        err.hidden = false;
      };
      document.querySelectorAll('[data-rl-elegir]').forEach((b) => {
        b.onclick = async () => {
          const r = await ctx.rpc('pastor_reunion_confirmar', p, { p_reunion: b.getAttribute('data-rl-elegir'), p_opcion: b.getAttribute('data-rl-op') });
          if (r.ok && r.data && r.data.ok) pintar(); else $('#rlMsg').textContent = error(r);
        };
      });
      document.querySelectorAll('[data-rl-borrar]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm('¿Borrar esta reunión? Se pierden sus votos y su acta.')) return;
          const r = await ctx.rpc('pastor_reunion_borrar', p, { p_reunion: b.getAttribute('data-rl-borrar') });
          if (r.ok && r.data && r.data.ok) pintar(); else $('#rlMsg').textContent = error(r);
        };
      });
      document.querySelectorAll('[data-rl-acta]').forEach((b) => {
        b.onclick = () => {
          const id = b.getAttribute('data-rl-acta');
          const r = reuniones.find((x) => x.id === id); const caja = document.getElementById('rlActa-' + id);
          if (!r || !caja) return;
          caja.innerHTML = actaHTML(r);
          document.querySelector('[data-rl-mas="' + id + '"]').onclick = () => {
            const cont = document.getElementById('rlAcu-' + id);
            if (cont.querySelectorAll('.rl-acu').length >= MAX_ACUERDOS) return;
            const fila = document.createElement('div'); fila.className = 'rl-acu';
            fila.innerHTML = '<input type="text" maxlength="200" placeholder="Acuerdo" data-acu-t><input type="text" maxlength="60" placeholder="Responsable" data-acu-r>';
            cont.appendChild(fila);
          };
          document.querySelector('[data-rl-guardar-acta="' + id + '"]').onclick = async () => {
            const msg = document.getElementById('rlActaMsg-' + id); msg.hidden = true;
            const filas = Array.from(document.querySelectorAll('#rlAcu-' + id + ' .rl-acu')).map((f) => ({
              texto: f.querySelector('[data-acu-t]').value, responsable: f.querySelector('[data-acu-r]').value }));
            const acuerdos = limpiarAcuerdos(filas);
            const texto = document.getElementById('rlActaTxt-' + id).value.trim();
            const g = await ctx.rpc('pastor_reunion_acta', p, { p_reunion: id, p_texto: texto, p_acuerdos: acuerdos });
            if (g.ok && g.data && g.data.ok) return pintar();
            msg.textContent = error(g); msg.hidden = false;
          };
        };
      });
    };
    pintar();
  }

  // Vista del líder (dentro de «Mi servicio»): solo votar. Quien no es líder no ve nada.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('lider_reuniones_listar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null });
    const reuniones = lista(r) || [];
    const abiertas = reuniones.filter((x) => x.estado === 'encuesta');
    if (!abiertas.length) { c.innerHTML = ''; return; }
    const pintar = (rs) => {
      c.innerHTML = '<h2 class="mi-sub">Reuniones de líderes</h2>' + rs.filter((x) => x.estado === 'encuesta').map((x) =>
        '<div class="card rl-reunion"><b>' + esc(x.titulo) + '</b>' + (x.detalle ? '<p class="suave m0">' + esc(x.detalle) + '</p>' : '') +
        '<p class="suave">Elige la fecha que te sirve. Puedes cambiarla hasta que el pastor la confirme.</p><ul class="cp-lista">' +
        (x.opciones || []).map((o) => '<li class="rl-op' + (x.mi_voto === o.id ? ' elegida' : '') + '"><span>' + esc(fechaTexto(o.fecha)) + '</span>' +
          '<button type="button" class="cp-mini" data-rlm-voto="' + esc(x.id) + '" data-rlm-op="' + esc(o.id) + '" aria-pressed="' + (x.mi_voto === o.id) + '">' +
          (x.mi_voto === o.id ? 'Mi voto' : 'Votar esta') + '</button></li>').join('') +
        '</ul></div>').join('') + '<p class="suave" id="rlmMsg" role="status" aria-live="polite"></p>';
      c.querySelectorAll('[data-rlm-voto]').forEach((b) => {
        b.onclick = async () => {
          const g = await rpcRaw('lider_reunion_votar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_reunion: b.getAttribute('data-rlm-voto'), p_opcion: b.getAttribute('data-rlm-op') });
          if (g && g.ok && g.data && g.data.ok) {
            const nuevo = reuniones.map((x) => (x.id === b.getAttribute('data-rlm-voto') ? Object.assign({}, x, { mi_voto: b.getAttribute('data-rlm-op') }) : x));
            reuniones.splice(0, reuniones.length, ...nuevo); pintar(reuniones);
          } else { const m = document.getElementById('rlmMsg'); if (m) m.textContent = 'No se pudo guardar tu voto. Inténtalo de nuevo.'; }
        };
      });
    };
    pintar(reuniones);
  }

  window.TBReunionesLideres = { abrir, miembroMostrar, _t: { fechaTexto, aIso, limpiarAcuerdos, resumenVotos, MAX_ACUERDOS } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBReunionesLideres;
})();
