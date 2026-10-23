/* F1371 · Formularios e inscripciones (tarea 1.21 de PLAN_TAREAS_IGLESIA.md): retiros, bautismos, cursos.
   Pastor: crea el formulario (con cupo y fecha de cierre opcionales), ve las respuestas y las descarga para Excel.
   Miembro: ve los formularios abiertos y responde una vez (puede cambiar su respuesta mientras esté abierto).
   Usa el SQL 34: pastor_formulario* y miembro_formulario*. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  function fechaCorta(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function aIso(v) { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); }
  // Estado legible: cerrado, abierto con lugares, o lleno.
  function estado(f) {
    if (f.abierto === false || (f.cierra && new Date(f.cierra) <= new Date())) return 'Cerrado';
    if (f.cupo != null && (f.inscritos || (f.respuestas || []).length) >= f.cupo) return 'Completo';
    return 'Abierto';
  }

  // ---- Pastor ----
  function formPastorHTML(f) {
    const n = (f.respuestas || []).length;
    const lista = n ? '<ul class="cp-lista">' + f.respuestas.map((r) =>
      '<li><b>' + esc(r.nombre) + '</b>' + (r.respuesta ? ' · ' + esc(r.respuesta) : '') + '</li>').join('') + '</ul>'
      : '<p class="suave">Todavía no hay respuestas.</p>';
    return '<div class="card ase-tarea"><div class="ase-cab"><b>' + esc(f.titulo) + '</b>' +
      '<button type="button" class="cp-mini" data-fborrar="' + esc(f.id) + '" aria-label="Borrar ' + esc(f.titulo) + '">Borrar</button></div>' +
      '<p class="suave ase-det">' + esc(estado(f)) + ' · ' + n + (n === 1 ? ' respuesta' : ' respuestas') +
      (f.cupo != null ? ' de ' + f.cupo : '') + (f.cierra ? ' · cierra el ' + esc(fechaCorta(f.cierra)) : '') + '</p>' +
      (f.descripcion ? '<p class="suave ase-det">' + esc(f.descripcion) + '</p>' : '') +
      (f.pregunta ? '<p class="suave ase-det"><i>Pregunta: ' + esc(f.pregunta) + '</i></p>' : '') +
      lista + (n ? '<div id="fexp-' + esc(f.id) + '-wrap"></div>' : '') + '</div>';
  }
  function formNuevoHTML() {
    return '<div class="card tp-form ase-nueva"><h2 class="mi-sub">Nuevo formulario</h2>' +
      '<label for="fTit">Nombre</label><input id="fTit" type="text" maxlength="80" placeholder="Ej.: Retiro de jóvenes" autocomplete="off">' +
      '<label for="fDesc">Descripción (opcional)</label><textarea id="fDesc" rows="2" maxlength="400" placeholder="Qué es, cuándo y dónde"></textarea>' +
      '<label for="fPreg">Pregunta extra (opcional)</label><input id="fPreg" type="text" maxlength="200" placeholder="Ej.: ¿Tienes alguna alergia?">' +
      '<label for="fCierra">Cierra el (opcional)</label><input id="fCierra" type="datetime-local">' +
      '<label for="fCupo">Cupo (opcional)</label><input id="fCupo" type="number" min="1" max="1000" inputmode="numeric">' +
      '<p id="fErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn sec" id="fGuardar">Guardar formulario</button>' +
      '<p id="fMsg" class="suave" role="status" aria-live="polite"></p></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="fVolver">‹ Panel</button><h1 class="cp-titulo">Formularios e inscripciones</h1>' +
      '<p class="suave">Retiros, bautismos y cursos: quién responde y cuántos lugares quedan.</p><p class="suave" id="fCarga">Cargando…</p><div id="fLista"></div>' + formNuevoHTML();
    $('#fVolver').onclick = ctx.volver;

    async function cargar() {
      $('#fCarga').hidden = false;
      const r = await ctx.rpc('pastor_formularios_leer', p, {});
      $('#fCarga').hidden = true;
      const d = r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (!d || d.ok === false) { $('#fLista').innerHTML = '<p class="error" role="alert">No pudimos cargar los formularios. Revisa tu conexión.</p>'; return; }
      const lista = d.formularios || [];
      $('#fLista').innerHTML = lista.length ? lista.map(formPastorHTML).join('') : '<p class="suave">Todavía no hay formularios. Crea el primero abajo.</p>';
      lista.forEach((f) => {
        const w = document.getElementById('fexp-' + f.id + '-wrap');
        if (!w || !window.TBCentroPastor) return;
        const cols = [['Nombre', (x) => x.nombre], ['Respuesta', (x) => x.respuesta || ''], ['Fecha', (x) => fechaCorta(x.creado_en)]];
        w.innerHTML = window.TBCentroPastor.exportar.botonExportar('fexpb-' + f.id, 'fexpm-' + f.id, 'Descargar respuestas para Excel', '');
        window.TBCentroPastor.exportar.conectarExportar('fexpb-' + f.id, 'fexpm-' + f.id, () => f.respuestas || [], cols, 'formulario-' + String(f.titulo).replace(/[^\w]+/g, '-').slice(0, 30), ['respuesta', 'respuestas']);
      });
      document.querySelectorAll('[data-fborrar]').forEach((b) => {
        b.onclick = async () => {
          if (!window.confirm('¿Borrar este formulario? Se pierden las respuestas.')) return;
          const x = await ctx.rpc('pastor_formulario_borrar', p, { p_id: b.getAttribute('data-fborrar') });
          const f2 = Array.isArray(x.data) ? x.data[0] : x.data;
          if (x.ok && f2 && f2.ok) { await cargar(); } else { $('#fMsg').textContent = 'No se pudo borrar. Inténtalo de nuevo.'; }
        };
      });
    }

    $('#fGuardar').onclick = async () => {
      const tit = $('#fTit').value.replace(/\s+/g, ' ').trim(), er = $('#fErr'), msg = $('#fMsg');
      er.hidden = true; msg.textContent = '';
      if (!tit) { er.textContent = 'Escribe el nombre del formulario.'; er.hidden = false; return; }
      const cupoTxt = $('#fCupo').value.trim(), cupo = cupoTxt ? parseInt(cupoTxt, 10) : null;
      if (cupoTxt && (isNaN(cupo) || cupo < 1 || cupo > 1000)) { er.textContent = 'El cupo debe ser un número entre 1 y 1000.'; er.hidden = false; return; }
      const btn = $('#fGuardar'); btn.disabled = true;
      const r = await ctx.rpc('pastor_formulario_guardar', p, { p_titulo: tit, p_descripcion: $('#fDesc').value.trim() || null,
        p_pregunta: $('#fPreg').value.trim() || null, p_cierra: aIso($('#fCierra').value), p_cupo: cupo });
      btn.disabled = false;
      const f = Array.isArray(r.data) ? r.data[0] : r.data;
      if (r.ok && f && f.ok) {
        ['#fTit', '#fDesc', '#fPreg', '#fCierra', '#fCupo'].forEach((s) => { $(s).value = ''; });
        msg.textContent = 'Formulario guardado.'; await cargar();
      } else { er.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
    };

    await cargar();
  }

  // ---- Miembro (dentro de «Mi servicio») ----
  function formMiembroHTML(f) {
    const cerrado = f.cierra && new Date(f.cierra) <= new Date();
    const lleno = f.cupo != null && (f.inscritos || 0) >= f.cupo && !f.respondido;
    let h = '<div class="card ase-tarea"><div class="ase-cab"><b>' + esc(f.titulo) + '</b></div>';
    if (f.descripcion) h += '<p class="suave ase-det">' + esc(f.descripcion) + '</p>';
    if (f.cierra) h += '<p class="suave ase-det">Cierra el ' + esc(fechaCorta(f.cierra)) + '</p>';
    if (f.respondido) {
      h += '<p class="ase-hecha">✅ Ya respondiste' + (f.respuesta ? ': ' + esc(f.respuesta) : '') + '</p>';
    }
    if (cerrado) return h + '<p class="suave">Este formulario ya cerró.</p></div>';
    if (lleno) return h + '<p class="suave">Completo: ya no quedan lugares.</p></div>';
    h += (f.pregunta ? '<label for="fr-' + esc(f.id) + '">' + esc(f.pregunta) + '</label><input id="fr-' + esc(f.id) + '" type="text" maxlength="500" value="' + esc(f.respuesta || '') + '">' : '');
    h += '<button type="button" class="btn" data-fresp="' + esc(f.id) + '">' + (f.respondido ? 'Guardar cambios' : 'Inscribirme') + '</button>';
    return h + '</div>';
  }
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('miembro_formularios_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!d || d.ok === false || !(d.formularios || []).length) { c.innerHTML = ''; return; }
    c.innerHTML = '<h2 class="mi-sub">Inscripciones abiertas</h2>' + d.formularios.map(formMiembroHTML).join('');
    c.querySelectorAll('[data-fresp]').forEach((b) => {
      b.onclick = async () => {
        const campo = document.getElementById('fr-' + b.getAttribute('data-fresp'));
        b.disabled = true;
        const x = await rpcRaw('miembro_formulario_responder', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.getAttribute('data-fresp'), p_respuesta: campo ? campo.value : null });
        if (x && x.ok) { miembroMostrar(contenedorId, id, rpcRaw); return; }
        b.disabled = false;
        const motivo = x && x.data && (Array.isArray(x.data) ? x.data[0] : x.data);
        const txt = motivo && motivo.motivo === 'sin-cupo' ? 'Ya no quedan lugares.' : motivo && motivo.motivo === 'cerrado' ? 'Este formulario ya cerró.' : 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.';
        const aviso = document.createElement('p'); aviso.className = 'error'; aviso.setAttribute('role', 'alert'); aviso.textContent = txt;
        c.appendChild(aviso);
      };
    });
  }

  window.TBFormularios = { abrir, miembroMostrar, _t: { estado, aIso, formPastorHTML, formMiembroHTML, formNuevoHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBFormularios;
})();
