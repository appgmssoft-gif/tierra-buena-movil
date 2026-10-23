/* F1368 · Aseo y tareas recurrentes (tarea 1.18 de PLAN_TAREAS_IGLESIA.md), lado del pastor.
   El pastor crea las tareas de la iglesia y asigna, cada semana, quién la hace.
   Usa las funciones del SQL 32: pastor_aseo_* y pastor_miembros_listar. Sin datos extra de las personas. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  // Lunes de la semana de una fecha (la semana empieza el lunes). Devuelve «AAAA-MM-DD».
  function lunesDe(d) {
    const f = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (f.getDay() + 6) % 7;            // lunes = 0 … domingo = 6
    f.setDate(f.getDate() - diff);
    return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0');
  }
  // Texto de la semana: «Semana del 19 de octubre».
  function tituloSemana(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return 'Semana del ' + parseInt(m[3], 10) + ' de ' + meses[parseInt(m[2], 10) - 1];
  }
  // Mueve la semana N días (negativo para atrás), siempre como lunes.
  function moverSemana(iso, dias) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return iso;
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10) + dias);
    return lunesDe(d);
  }

  // Una tarea con su persona (desplegable) y su estado. Solo el pastor cambia la persona; el miembro marca «hecha».
  function tareaHTML(t, miembros) {
    const opts = '<option value="">Sin asignar</option>' + miembros.map((x) =>
      '<option value="' + esc(x.id) + '"' + (x.id === t.miembro_id ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('');
    const estado = !t.miembro_id ? '<small class="suave">Sin asignar</small>'
      : (t.hecha ? '<small class="ase-hecha">✅ Hecha</small>' : '<small class="suave">○ Pendiente</small>');
    return '<div class="card ase-tarea" data-tarea="' + esc(t.tarea_id) + '">' +
      '<div class="ase-cab"><b>' + esc(t.titulo) + '</b>' +
      '<button type="button" class="cp-mini ase-borrar" data-borrar="' + esc(t.tarea_id) + '" aria-label="Borrar la tarea ' + esc(t.titulo) + '">Borrar</button></div>' +
      (t.detalle ? '<p class="suave ase-det">' + esc(t.detalle) + '</p>' : '') +
      '<label for="ase-' + esc(t.tarea_id) + '">¿Quién la hace esta semana?</label>' +
      '<select id="ase-' + esc(t.tarea_id) + '" data-asignar="' + esc(t.tarea_id) + '">' + opts + '</select>' +
      '<div>' + estado + '</div></div>';
  }

  function formTareaHTML() {
    return '<div class="card tp-form ase-nueva"><h2 class="mi-sub">Agregar una tarea</h2>' +
      '<label for="aseTit">Tarea</label><input id="aseTit" type="text" maxlength="80" placeholder="Ej.: Limpiar el salón" autocomplete="off">' +
      '<label for="aseDet">Detalle (opcional)</label><textarea id="aseDet" rows="2" maxlength="200" placeholder="Ej.: Barrer, ordenar sillas y sacar la basura"></textarea>' +
      '<p id="aseErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn sec" id="aseGuardar">Guardar tarea</button>' +
      '<p id="aseMsg" class="suave" role="status" aria-live="polite"></p></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let semana = lunesDe(new Date());
    pant.innerHTML = '<button type="button" class="volver" id="aseVolver">‹ Panel</button><h1 class="cp-titulo">Aseo y tareas</h1>' +
      '<p class="suave">Quién hace cada tarea esta semana. Cada semana empieza de nuevo.</p>' +
      '<div class="cp-filtros"><button type="button" class="cp-chip" id="asePrev">‹ Semana anterior</button><button type="button" class="cp-chip" id="aseHoy">Esta semana</button><button type="button" class="cp-chip" id="aseNext">Semana siguiente ›</button></div>' +
      '<h2 class="mi-sub" id="aseSem" role="status" aria-live="polite"></h2><p class="suave" id="aseCarga">Cargando…</p><div id="aseLista"></div>' +
      formTareaHTML();
    $('#aseVolver').onclick = ctx.volver;

    async function cargar() {
      $('#aseSem').textContent = tituloSemana(semana);
      $('#aseCarga').hidden = false;
      const [rs, rm] = await Promise.all([
        ctx.rpc('pastor_aseo_semana_leer', p, { p_semana: semana }),
        ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }),
      ]);
      $('#aseCarga').hidden = true;
      const sem = rs.ok && rs.data && (Array.isArray(rs.data) ? rs.data[0] : rs.data);
      if (!sem || sem.ok === false) {
        $('#aseLista').innerHTML = '<p class="error" role="alert">No pudimos cargar las tareas. Revisa tu conexión e inténtalo de nuevo.</p>';
        return;
      }
      const miembros = rm.ok ? (rm.data || []).map((x) => ({ id: x.id, nombre: x.nombre })) : [];
      const tareas = sem.tareas || [];
      $('#aseLista').innerHTML = tareas.length
        ? tareas.map((t) => tareaHTML(t, miembros)).join('')
        : '<p class="suave">Todavía no hay tareas. Agrega la primera abajo.</p>';
      document.querySelectorAll('[data-asignar]').forEach((s) => {
        s.onchange = async () => {
          const r = await ctx.rpc('pastor_aseo_asignar', p, { p_tarea: s.getAttribute('data-asignar'), p_semana: semana, p_miembro: s.value || null });
          const f = Array.isArray(r.data) ? r.data[0] : r.data;
          if (!(r.ok && f && f.ok)) { $('#aseMsg').textContent = 'No se pudo asignar. Revisa tu conexión e inténtalo de nuevo.'; }
          await cargar();
        };
      });
      document.querySelectorAll('[data-borrar]').forEach((b) => {
        b.onclick = async () => {
          if (!window.confirm('¿Borrar esta tarea? Se quita de todas las semanas.')) return;
          const r = await ctx.rpc('pastor_aseo_tarea_borrar', p, { p_tarea: b.getAttribute('data-borrar') });
          const f = Array.isArray(r.data) ? r.data[0] : r.data;
          if (r.ok && f && f.ok) { await cargar(); } else { $('#aseMsg').textContent = 'No se pudo borrar la tarea. Inténtalo de nuevo.'; }
        };
      });
    }

    $('#asePrev').onclick = () => { semana = moverSemana(semana, -7); cargar(); };
    $('#aseNext').onclick = () => { semana = moverSemana(semana, 7); cargar(); };
    $('#aseHoy').onclick = () => { semana = lunesDe(new Date()); cargar(); };

    $('#aseGuardar').onclick = async () => {
      const titulo = $('#aseTit').value.replace(/\s+/g, ' ').trim(), er = $('#aseErr'), msg = $('#aseMsg');
      er.hidden = true; msg.textContent = '';
      if (!titulo) { er.textContent = 'Escribe el nombre de la tarea.'; er.hidden = false; return; }
      const btn = $('#aseGuardar'); btn.disabled = true;
      const r = await ctx.rpc('pastor_aseo_tarea_guardar', p, { p_titulo: titulo, p_detalle: $('#aseDet').value.trim() || null });
      btn.disabled = false;
      const f = Array.isArray(r.data) ? r.data[0] : r.data;
      if (r.ok && f && f.ok) { $('#aseTit').value = ''; $('#aseDet').value = ''; msg.textContent = 'Tarea guardada.'; await cargar(); }
      else { er.textContent = 'No se pudo guardar la tarea. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
    };

    await cargar();
  }

  // ---- Lado del miembro (dentro de «Mi servicio»). Solo muestra sus tareas de esta semana. ----
  // Si no tiene tareas, o el SQL 32 aún no está corrido, la sección no aparece: el miembro no ve nada roto.
  function miembroTareasHTML(sem) {
    return '<h2 class="mi-sub">Mis tareas de aseo</h2>' + sem.tareas.map((t) =>
      '<div class="card ase-tarea"><div class="ase-cab"><b>' + esc(t.titulo) + '</b></div>' +
      (t.detalle ? '<p class="suave ase-det">' + esc(t.detalle) + '</p>' : '') +
      '<button type="button" class="btn ' + (t.hecha ? 'sec' : '') + ' ase-marcar" data-marcar="' + esc(t.tarea_id) + '" data-hecha="' + (t.hecha ? '1' : '0') + '" aria-pressed="' + (t.hecha ? 'true' : 'false') + '">' +
      (t.hecha ? '✅ Hecha (tocar para desmarcar)' : 'Marcar como hecha') + '</button></div>').join('');
  }
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const semana = lunesDe(new Date());
    const r = await rpcRaw('miembro_aseo_semana_leer', { p_codigo: id.codigo, p_clave: id.clave, p_semana: semana });
    const sem = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!sem || sem.ok === false || !(sem.tareas || []).length) { c.innerHTML = ''; return; }
    c.innerHTML = miembroTareasHTML(sem);
    c.querySelectorAll('[data-marcar]').forEach((b) => {
      b.onclick = async () => {
        const hecha = b.getAttribute('data-hecha') !== '1';
        b.disabled = true;
        const m = await rpcRaw('miembro_aseo_marcar', { p_codigo: id.codigo, p_clave: id.clave, p_tarea: b.getAttribute('data-marcar'), p_semana: semana, p_hecha: hecha });
        if (m && m.ok) { miembroMostrar(contenedorId, id, rpcRaw); return; }
        b.disabled = false;
        const aviso = document.createElement('p'); aviso.className = 'error'; aviso.setAttribute('role', 'alert');
        aviso.textContent = 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.';
        c.appendChild(aviso);
      };
    });
  }

  window.TBAseo = { abrir, miembroMostrar, _t: { lunesDe, tituloSemana, moverSemana, tareaHTML, formTareaHTML, miembroTareasHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBAseo;
})();
