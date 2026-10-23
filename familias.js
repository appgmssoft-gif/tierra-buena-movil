/* F1373 · Familias y relaciones (tarea 1.13) y datos cargados por el pastor (tarea 1.9) de PLAN_TAREAS_IGLESIA.md.
   Pastor: área «Familias» (pastor_familias_leer, pastor_familia_guardar, _borrar, _persona_agregar, _persona_quitar; SQL 36).
   Pastor: bloque en la ficha con la familia de la persona, la marca «Datos cargados por el pastor» y
   «Completar o corregir sus datos» (pastor_contacto_guardar y pastor_contacto_origen_leer; SQL 36).
   Miembro: «Mi familia» en Mi iglesia (miembro_familia_leer): solo nombres y relaciones, nunca teléfonos ni direcciones.
   Solo se envía lo que cambió. El servidor decide los permisos (directorio y teléfono); la pantalla solo lo anticipa. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const RELACIONES = [['pareja', 'Pareja'], ['hijo', 'Hijo o hija'], ['padre_madre', 'Padre o madre'], ['hermano', 'Hermano o hermana'], ['abuelo', 'Abuelo o abuela'], ['otro', 'Otro']];
  const REL = Object.fromEntries(RELACIONES);
  const MOTIVO = {
    'sin-permiso': 'Tu sesión de pastor ya no es válida. Vuelve a entrar en modo pastor.',
    'no-existe': 'Esa familia o persona ya no existe. Actualiza la pantalla.',
    'nombre-invalido': 'Escribe un nombre de 1 a 60 letras.',
    'limite': 'Llegaste al límite. Quita algo antes de agregar.',
    'relacion-invalida': 'Elige una relación.',
    'persona-invalida': 'Elige una persona o escribe su nombre.',
    'miembro-invalido': 'Esa persona no está en tu iglesia.',
    'ya-en-familia': 'Esa persona ya está en otra familia.',
    'sin-directorio': 'Esta persona no comparte su directorio, así que no puedes cambiar sus datos.',
    'sin-telefono': 'Esta persona no comparte su teléfono, así que no puedes cambiarlo.',
    'sin-cambios': 'No cambiaste nada.',
    'texto-largo': 'Algún texto es demasiado largo.',
    'telefono-invalido': 'Escribe un teléfono con 8 a 15 números.',
    'cumple-invalido': 'Revisa la fecha de nacimiento.'
  };
  const motivoTxt = (m) => MOTIVO[m] || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const aLista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : []);
  const hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const aviso = (id, t) => { const el = document.getElementById(id); if (el) { el.textContent = t || ''; el.hidden = !t; } };

  // ---------- Lógica pura (se prueba sin navegador) ----------
  // Compara lo que había con lo que escribió el pastor. Solo devuelve lo que cambió; null si no cambió nada.
  function cambios(orig, nuevo) {
    const o = {};
    ['telefono', 'direccion', 'familia'].forEach((k) => {
      const a = String(orig[k] || '').trim(), b = String(nuevo[k] || '').trim();
      if (a !== b) o[k] = b;                       // '' significa «borrar el dato»
    });
    if (nuevo.cumpleanos && nuevo.cumpleanos !== (orig.cumpleanos || '')) o.cumpleanos = nuevo.cumpleanos;   // vacío: no se borra una fecha
    return Object.keys(o).length ? o : null;
  }
  // Parámetros de pastor_contacto_guardar: null significa «no tocar».
  function paramsContacto(id, cam) {
    return {
      p_miembro: id,
      p_telefono: 'telefono' in cam ? cam.telefono : null,
      p_direccion: 'direccion' in cam ? cam.direccion : null,
      p_cumpleanos: cam.cumpleanos || null,
      p_familia: 'familia' in cam ? cam.familia : null
    };
  }
  // Busca en qué familia está la persona y quiénes son las demás.
  function familiaDe(fams, id) {
    for (const f of fams || []) {
      const per = f.personas || [];
      const yo = per.find((x) => x.miembro_id === id);
      if (yo) return { familia: f, persona: yo, otras: per.filter((x) => x !== yo) };
    }
    return null;
  }

  // ---------- Lectura de datos ----------
  async function leerFamilias(p, ctx) {
    const d = fila(await ctx.rpc('pastor_familias_leer', p));
    return d && d.ok ? (d.familias || []) : null;   // null = no se pudo leer
  }
  async function leerMiembros(p, ctx) {
    return aLista(await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' }))
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
  }

  // ---------- 1.13 Área «Familias» del pastor ----------
  function opcionesMiembros(miembros, fams) {
    const en = {};
    fams.forEach((f) => (f.personas || []).forEach((x) => { if (x.miembro_id) en[x.miembro_id] = f.nombre; }));
    return '<option value="">Persona sin cuenta (escribir nombre)</option>' + miembros.map((m) =>
      '<option value="' + esc(m.id) + '"' + (en[m.id] ? ' disabled' : '') + '>' + esc(m.nombre) +
      (en[m.id] ? ' · ya está en «' + esc(en[m.id]) + '»' : '') + '</option>').join('');
  }
  function familiaHTML(f, est) {
    const per = (f.personas || []).map((x) => '<li><span><b>' + esc(x.nombre) + '</b> · ' + esc(REL[x.relacion] || x.relacion) +
      (x.libre ? ' <small>(sin cuenta)</small>' : '') + '</span> ' +
      '<button type="button" class="cp-mini" data-f="quit" data-persona="' + esc(x.id) + '" aria-label="Quitar a ' + esc(x.nombre) + ' de ' + esc(f.nombre) + '">Quitar</button></li>').join('');
    let add = '';
    if (est.agregando === f.id) {
      add = '<div class="fam-add card"><label for="famMiem">Persona</label><select id="famMiem">' + opcionesMiembros(est.miembros, est.fam) + '</select>' +
        '<label for="famLibre">Nombre (solo si no tiene cuenta)</label><input id="famLibre" type="text" maxlength="60" autocomplete="off">' +
        '<label for="famRel">Relación con las demás personas</label><select id="famRel">' + RELACIONES.map(([k, t]) => '<option value="' + k + '">' + esc(t) + '</option>').join('') + '</select>' +
        '<p class="error" id="famErr" role="alert" hidden></p>' +
        '<button type="button" class="btn" data-f="addok" data-id="' + esc(f.id) + '">Agregar a la familia</button> ' +
        '<button type="button" class="btn sec" data-f="addno">Cancelar</button></div>';
    }
    const botones = '<div class="cp-acciones"><button type="button" class="cp-mini" data-f="add" data-id="' + esc(f.id) + '">Agregar persona</button> ' +
      '<button type="button" class="cp-mini" data-f="ren" data-id="' + esc(f.id) + '">Cambiar nombre</button> ' +
      '<button type="button" class="cp-mini" data-f="bor" data-id="' + esc(f.id) + '">Borrar familia</button></div>';
    return '<section class="card fam-card" aria-label="Familia ' + esc(f.nombre) + '"><h2 class="mi-sub">' + esc(f.nombre) + '</h2>' +
      (per ? '<ul class="cp-lista">' + per + '</ul>' : '<p class="suave">Todavía no hay personas en esta familia.</p>') +
      (est.agregando === f.id ? add : botones) + '</section>';
  }
  function pantallaHTML(est) {
    const editando = est.editando ? est.fam.find((f) => f.id === est.editando) : null;
    const form = '<div class="card"><label for="famNombre">' + (editando ? 'Nuevo nombre de la familia' : 'Nombre de la familia') + '</label>' +
      '<input id="famNombre" type="text" maxlength="60" autocomplete="off" value="' + esc(editando ? editando.nombre : '') + '">' +
      '<p class="error" id="famNErr" role="alert" hidden></p>' +
      '<button type="button" class="btn" data-f="' + (editando ? 'renok' : 'nueva') + '"' + (editando ? ' data-id="' + esc(editando.id) + '"' : '') + '>' +
      (editando ? 'Guardar nombre' : 'Crear familia') + '</button>' +
      (editando ? ' <button type="button" class="btn sec" data-f="cancelar">Cancelar</button>' : '') +
      '<p class="suave" id="famMsg" role="status" aria-live="polite"></p></div>';
    const lista = est.fam.length ? est.fam.map((f) => familiaHTML(f, est)).join('') : '<p class="suave">Aún no hay familias. Crea la primera arriba.</p>';
    return '<div id="famRaiz"><button type="button" class="volver" id="famVolver">‹ Panel</button><h1 class="cp-titulo">Familias</h1>' +
      '<p class="suave">Agrupa a las personas de cada familia y di cómo se relacionan. Un miembro solo puede estar en una familia. ' +
      'Los miembros ven solo los nombres y las relaciones.</p>' + form + lista + '</div>';
  }

  async function accion(e, p, ctx, est, repintar) {
    const b = e.target && e.target.closest ? e.target.closest('[data-f]') : null; if (!b) return;
    const a = b.getAttribute('data-f'), id = b.getAttribute('data-id'), per = b.getAttribute('data-persona');
    const recargar = async () => { const f = await leerFamilias(p, ctx); if (f) est.fam = f; repintar(); };
    if (a === 'cancelar') { est.editando = null; repintar(); return; }
    if (a === 'ren') { est.editando = id; repintar(); return; }
    if (a === 'add') { est.agregando = id; repintar(); return; }
    if (a === 'addno') { est.agregando = null; repintar(); return; }
    if (a === 'nueva' || a === 'renok') {
      const el = document.getElementById('famNombre');
      const d = fila(await ctx.rpc('pastor_familia_guardar', p, { p_nombre: el ? el.value : '', p_id: a === 'renok' ? id : null }));
      if (d && d.ok) { est.editando = null; await recargar(); } else aviso('famNErr', motivoTxt(d && d.motivo));
      return;
    }
    if (a === 'bor') {
      if (!confirm('¿Borrar esta familia? Las personas quedan sin familia, pero sus fichas no se borran.')) return;
      const d = fila(await ctx.rpc('pastor_familia_borrar', p, { p_id: id }));
      if (d && d.ok) { if (est.agregando === id) est.agregando = null; await recargar(); } else aviso('famMsg', motivoTxt(d && d.motivo));
      return;
    }
    if (a === 'quit') {
      if (!confirm('¿Quitar a esta persona de la familia?')) return;
      const d = fila(await ctx.rpc('pastor_familia_persona_quitar', p, { p_persona: per }));
      if (d && d.ok) await recargar(); else aviso('famMsg', motivoTxt(d && d.motivo));
      return;
    }
    if (a === 'addok') {
      const sel = document.getElementById('famMiem'), lib = document.getElementById('famLibre'), rel = document.getElementById('famRel');
      const miembro = sel && sel.value ? sel.value : null;
      const d = fila(await ctx.rpc('pastor_familia_persona_agregar', p, {
        p_familia: id, p_relacion: rel ? rel.value : '', p_miembro: miembro, p_nombre: miembro ? null : (lib ? lib.value : '')
      }));
      if (d && d.ok) { est.agregando = null; await recargar(); return; }
      aviso('famErr', d && d.motivo === 'ya-en-familia' && d.familia
        ? 'Esa persona ya está en la familia «' + d.familia + '».' : motivoTxt(d && d.motivo));
    }
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="famVolver">‹ Panel</button><h1 class="cp-titulo">Familias</h1><p class="suave" id="famCarga" role="status">Cargando las familias…</p>';
    $('#famVolver').onclick = ctx.volver;
    const fam = await leerFamilias(p, ctx);
    if (!$('#famCarga')) return;
    if (fam === null) {
      pant.innerHTML = '<button type="button" class="volver" id="famVolver">‹ Panel</button><h1 class="cp-titulo">Familias</h1>' +
        '<p class="error" role="alert">No pudimos cargar las familias. Revisa tu conexión e inténtalo de nuevo.</p>' +
        '<button type="button" class="btn sec" id="famReintentar">Reintentar</button>';
      $('#famVolver').onclick = ctx.volver; $('#famReintentar').onclick = () => abrir(p, ctx);
      return;
    }
    const est = { fam, miembros: await leerMiembros(p, ctx), editando: null, agregando: null };
    const pintar = () => {
      pant.innerHTML = pantallaHTML(est);
      $('#famVolver').onclick = ctx.volver;
      const raiz = $('#famRaiz'); if (raiz) raiz.onclick = (e) => accion(e, p, ctx, est, pintar);
    };
    pintar();
  }

  // ---------- 1.13 y 1.9 · Bloque en la ficha del miembro (pastor) ----------
  function fichaFamHTML(id, f, fams, origen) {
    let fam;
    const info = fams === null ? null : familiaDe(fams, id);
    if (fams === null) fam = '<p class="suave">No pudimos cargar su familia ahora.</p>';
    else if (!info) fam = '<p class="suave">Esta persona todavía no está en una familia. <button type="button" class="cp-mini" data-f="ir-fam">Ir a Familias</button></p>';
    else {
      const otras = info.otras.length
        ? '<ul class="cp-lista">' + info.otras.map((x) => '<li>' + esc(x.nombre) + ' · ' + esc(REL[x.relacion] || x.relacion) + '</li>').join('') + '</ul>'
        : '<p class="suave">Aún no hay otras personas registradas en esta familia.</p>';
      fam = '<h2 class="mi-sub">Familia</h2><p><b>' + esc(info.familia.nombre) + '</b> · ' + esc(REL[info.persona.relacion] || info.persona.relacion) + '</p>' + otras;
    }
    const marca = origen === 'pastor'
      ? '<p class="cp-nota" id="cpOrigen" role="status"><b>Datos cargados por el pastor.</b> La persona los verá en su tarjeta para revisarlos.</p>' : '';
    const boton = f.directorio !== false
      ? '<button type="button" class="btn sec" id="cpCompletar" data-f="completar">Completar o corregir sus datos</button>'
      : '<p class="suave cp-nota">Esta persona no comparte su directorio, así que no puedes cargar sus datos.</p>';
    return '<div class="cp-fam">' + marca + fam + boton + '<div id="cpDatos"></div></div>';
  }
  function datosHTML(f) {
    const sinTel = f.contacto_app_wsp === false;
    return '<div class="card" id="cpDatosForm"><h2 class="mi-sub">Completar o corregir sus datos</h2>' +
      '<p class="suave">Escribe solo lo que quieras cambiar. Lo que dejes igual no se toca. Después la persona lo verá en su tarjeta para revisarlo.</p>' +
      '<label for="cdTel">Teléfono</label><input id="cdTel" type="tel" inputmode="tel" maxlength="30" value="' + esc(sinTel ? '' : f.telefono || '') + '"' + (sinTel ? ' disabled' : '') + '>' +
      (sinTel ? '<p class="suave cp-nota">Esta persona no comparte su teléfono, así que no puedes cambiarlo.</p>' : '') +
      '<label for="cdCum">Fecha de nacimiento</label><input id="cdCum" type="date" max="' + hoyISO() + '" value="' + esc(f.cumpleanos ? String(f.cumpleanos).slice(0, 10) : '') + '">' +
      '<small class="suave">Solo se puede cambiar por otra fecha.</small>' +
      '<label for="cdFam">Familia (apellido)</label><input id="cdFam" type="text" maxlength="80" value="' + esc(f.familia || '') + '">' +
      '<label for="cdDir">Dirección</label><input id="cdDir" type="text" maxlength="200" value="' + esc(f.direccion || '') + '">' +
      '<p class="error" id="cdErr" role="alert" hidden></p>' +
      '<button type="button" class="btn" data-f="datos-ok">Guardar datos</button> <button type="button" class="btn sec" data-f="datos-no">Cancelar</button>' +
      '<p class="suave" id="cdMsg" role="status" aria-live="polite"></p></div>';
  }
  async function guardarDatos(p, ctx, id, f, alGuardar) {
    const v = (x) => { const el = document.getElementById(x); return el ? el.value : ''; };
    const orig = { telefono: f.telefono || '', direccion: f.direccion || '', familia: f.familia || '', cumpleanos: f.cumpleanos ? String(f.cumpleanos).slice(0, 10) : '' };
    const telEl = document.getElementById('cdTel');
    const nuevo = { telefono: telEl && !telEl.disabled ? telEl.value : orig.telefono, cumpleanos: v('cdCum'), familia: v('cdFam'), direccion: v('cdDir') };
    const cam = cambios(orig, nuevo);
    if (!cam) { aviso('cdMsg', motivoTxt('sin-cambios')); return; }
    const dig = String(cam.telefono || '').replace(/\D/g, '');
    if (cam.telefono && (dig.length < 8 || dig.length > 15)) { aviso('cdErr', motivoTxt('telefono-invalido')); return; }
    aviso('cdErr', ''); aviso('cdMsg', 'Guardando…');
    const d = fila(await ctx.rpc('pastor_contacto_guardar', p, paramsContacto(id, cam)));
    if (d && d.ok) { if (alGuardar) alGuardar(); return; }
    aviso('cdMsg', ''); aviso('cdErr', motivoTxt(d && d.motivo));
  }
  // Se llama desde la ficha (centro_pastor.js). alGuardar vuelve a dibujar la ficha con los datos nuevos.
  async function fichaBloque(p, ctx, id, f, alGuardar) {
    const c = document.getElementById('cpFam'); if (!c || !id || !f) return;
    const [fams, origenR] = await Promise.all([leerFamilias(p, ctx), ctx.rpc('pastor_contacto_origen_leer', p, { p_id: id })]);
    if (!document.getElementById('cpFam')) return;
    const od = fila(origenR);
    c.innerHTML = fichaFamHTML(id, f, fams, od && od.ok ? od.origen : null);
    c.onclick = (e) => {
      const b = e.target && e.target.closest ? e.target.closest('[data-f]') : null; if (!b) return;
      const a = b.getAttribute('data-f'), box = document.getElementById('cpDatos');
      if (a === 'completar' && box) box.innerHTML = datosHTML(f);
      else if (a === 'datos-no' && box) box.innerHTML = '';
      else if (a === 'datos-ok') guardarDatos(p, ctx, id, f, alGuardar);
      else if (a === 'ir-fam') abrir(p, ctx);
    };
  }

  // ---------- 1.13 · «Mi familia» del miembro (Mi iglesia) ----------
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('miembro_familia_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
    if (!d || d.ok === false || !d.familia) { c.innerHTML = ''; return; }
    const pers = (d.familia.personas || []).map((x) => '<li>' + esc(x.nombre) + ' · ' + esc(REL[x.relacion] || x.relacion) +
      (x.yo ? ' <small>(tú)</small>' : '') + '</li>').join('');
    c.innerHTML = '<h2 class="mi-sub">Mi familia</h2><div class="card fam-mi"><b>' + esc(d.familia.nombre) + '</b>' +
      '<p class="suave">Así están conectados. Solo se ven los nombres y las relaciones.</p><ul class="cp-lista">' + pers + '</ul></div>';
  }

  window.TBFamilias = { abrir, fichaBloque, miembroMostrar, _t: { cambios, paramsContacto, familiaDe, familiaHTML, pantallaHTML, fichaFamHTML, datosHTML, motivoTxt, RELACIONES, REL, MOTIVO } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBFamilias;
})();
