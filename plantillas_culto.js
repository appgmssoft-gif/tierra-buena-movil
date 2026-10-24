/* F1377 · Plantillas de culto con tiempos y responsable por bloque (tarea 1.17 de PLAN_TAREAS_IGLESIA.md), lado del pastor.
   Usa las funciones del SQL 38: pastor_plantillas_listar, pastor_plantilla_guardar, pastor_plantilla_borrar
   y pastor_miembros_listar (SQL 26). Sin datos extra de las personas. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const aviso = (id, t) => { const el = document.getElementById(id); if (el) { el.textContent = t || ''; el.hidden = !t; } };
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const MAX_BLOQUES = 40, MAX_PLANTILLAS = 30, LIBRE = '_libre';

  // ---------- Lógica pura (se prueba sin navegador) ----------
  function totalMinutos(bloques) {
    return bloques.reduce((s, b) => s + (parseInt(b.minutos, 10) || 0), 0);
  }
  // «45 min» o «1 h 20 min». Así se lee mejor en la pantalla.
  function formatoMin(n) {
    if (n < 60) return n + ' min';
    const h = Math.floor(n / 60), m = n % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }
  // Devuelve el primer error en español claro, o null si está bien.
  function validar(plantilla) {
    const nombre = String(plantilla.nombre || '').trim();
    if (!nombre) return 'Ponle un nombre a la plantilla.';
    if (nombre.length > 80) return 'El nombre es demasiado largo (máximo 80 letras).';
    if (!plantilla.bloques.length) return 'Agrega al menos un bloque al culto.';
    if (plantilla.bloques.length > MAX_BLOQUES) return 'Un culto puede tener hasta ' + MAX_BLOQUES + ' bloques.';
    for (let i = 0; i < plantilla.bloques.length; i++) {
      const b = plantilla.bloques[i], n = i + 1;
      if (!String(b.titulo || '').trim()) return 'El bloque ' + n + ' necesita un título.';
      if (String(b.titulo).trim().length > 80) return 'El título del bloque ' + n + ' es demasiado largo (máximo 80 letras).';
      const min = parseInt(b.minutos, 10);
      if (isNaN(min) || min < 0 || min > 300) return 'Los minutos del bloque ' + n + ' deben estar entre 0 y 300.';
    }
    return null;
  }
  // Mueve un bloque una posición (d = -1 sube, 1 baja). No sale de los límites.
  function mover(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return arr;
    const c = arr.slice();
    const tmp = c[i]; c[i] = c[j]; c[j] = tmp;
    return c;
  }
  // Forma que espera el SQL: minutos como texto de dígitos, y solo una forma de responsable.
  function bloquesDePayload(bloques) {
    return bloques.map((b) => {
      const conCuenta = !!b.miembro;
      return {
        titulo: String(b.titulo || '').trim(),
        minutos: String(parseInt(b.minutos, 10) || 0),
        miembro: conCuenta ? b.miembro : '',
        responsable: conCuenta ? '' : String(b.responsable || '').trim(),
        notas: String(b.notas || '').trim(),
      };
    });
  }
  const BLOQUES_INICIO = [
    { titulo: 'Bienvenida', minutos: 5, miembro: '', responsable: '', notas: '' },
    { titulo: 'Alabanza', minutos: 20, miembro: '', responsable: '', notas: '' },
    { titulo: 'Palabra', minutos: 35, miembro: '', responsable: '', notas: '' },
  ];

  // ---------- Pantallas ----------
  function listaHTML(plantillas) {
    if (!plantillas.length) {
      return '<p class="suave">Todavía no tienes plantillas. Crea una con los bloques de tu culto: cada uno con su tiempo y su responsable.</p>';
    }
    return plantillas.map((pl) => {
      const bl = pl.bloques || [];
      const tot = totalMinutos(bl.map((b) => ({ minutos: b.minutos })));
      return '<article class="card pl-item"><h2>' + esc(pl.nombre) + '</h2>' +
        '<p class="suave">' + bl.length + ' bloques · ' + formatoMin(tot) + '</p>' +
        (pl.detalle ? '<p>' + esc(pl.detalle) + '</p>' : '') +
        '<button type="button" class="btn chico sec" data-pl-editar="' + esc(pl.id) + '">Editar plantilla</button></article>';
    }).join('');
  }

  function bloqueHTML(b, i, miembros, total) {
    const libre = !b.miembro && !!b.responsable;
    const opciones = '<option value="">Sin responsable</option>' +
      miembros.map((m) => '<option value="' + esc(m.id) + '"' + (b.miembro === m.id ? ' selected' : '') + '>' + esc(m.nombre) + '</option>').join('') +
      '<option value="' + LIBRE + '"' + (libre ? ' selected' : '') + '>Otra persona (escribir nombre)</option>';
    return '<fieldset class="pl-bloque"><legend>Bloque ' + (i + 1) + '</legend>' +
      '<label for="pl-t' + i + '">Título</label><input id="pl-t' + i + '" type="text" maxlength="80" value="' + esc(b.titulo) + '">' +
      '<label for="pl-m' + i + '">Minutos</label><input id="pl-m' + i + '" type="number" min="0" max="300" inputmode="numeric" value="' + esc(b.minutos) + '">' +
      '<label for="pl-r' + i + '">Responsable</label><select id="pl-r' + i + '">' + opciones + '</select>' +
      '<label for="pl-l' + i + '" class="suave"' + (libre ? '' : ' hidden') + '>Nombre de la persona</label>' +
      '<input id="pl-l' + i + '" type="text" maxlength="80"' + (libre ? '' : ' hidden') + ' value="' + esc(libre ? b.responsable : '') + '">' +
      '<label for="pl-n' + i + '">Notas (opcional)</label><input id="pl-n' + i + '" type="text" maxlength="300" value="' + esc(b.notas) + '">' +
      '<div class="pl-acciones">' +
      '<button type="button" class="btn chico sec" data-subir="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir el bloque ' + (i + 1) + '">↑ Subir</button>' +
      '<button type="button" class="btn chico sec" data-bajar="' + i + '"' + (i === total - 1 ? ' disabled' : '') + ' aria-label="Bajar el bloque ' + (i + 1) + '">↓ Bajar</button>' +
      '<button type="button" class="btn chico sec" data-quitar="' + i + '" aria-label="Quitar el bloque ' + (i + 1) + '">Quitar</button>' +
      '</div></fieldset>';
  }

  function editorHTML(est, miembros) {
    const tot = totalMinutos(est.bloques);
    return '<label for="pl-nombre">Nombre de la plantilla</label>' +
      '<input id="pl-nombre" type="text" maxlength="80" placeholder="Ej.: Culto de domingo" value="' + esc(est.nombre) + '">' +
      '<label for="pl-detalle">Descripción (opcional)</label>' +
      '<textarea id="pl-detalle" maxlength="300" rows="2">' + esc(est.detalle) + '</textarea>' +
      '<h2 class="pl-h">Bloques del culto</h2>' +
      '<p class="suave" id="pl-total" role="status">Duración total: ' + formatoMin(tot) + '</p>' +
      est.bloques.map((b, i) => bloqueHTML(b, i, miembros, est.bloques.length)).join('') +
      '<button type="button" class="btn chico sec" id="plAgregar"' + (est.bloques.length >= MAX_BLOQUES ? ' disabled' : '') + '>+ Agregar bloque</button>' +
      '<p class="suave" id="plMsg" role="alert" hidden></p>' +
      '<button type="button" class="btn" id="plGuardar">Guardar plantilla</button>' +
      (est.id ? '<button type="button" class="btn chico sec" id="plPublicar">Usar como programa del domingo</button>' : '') +
      (est.id ? '<button type="button" class="btn chico sec" id="plBorrar">Borrar esta plantilla</button>' : '');
  }

  // Lee lo que el pastor escribió en pantalla antes de cambiar la lista (subir, bajar, quitar, agregar).
  function sincronizar(est) {
    est.nombre = ($('#pl-nombre') || {}).value || '';
    est.detalle = ($('#pl-detalle') || {}).value || '';
    est.bloques = est.bloques.map((b, i) => {
      const sel = $('#pl-r' + i), lib = $('#pl-l' + i);
      const r = sel ? sel.value : '';
      return {
        titulo: ($('#pl-t' + i) || {}).value || '',
        minutos: ($('#pl-m' + i) || {}).value || '',
        miembro: r && r !== LIBRE ? r : '',
        responsable: r === LIBRE && lib ? lib.value : '',
        notas: ($('#pl-n' + i) || {}).value || '',
      };
    });
    return est;
  }

  const MOTIVOS = {
    limite: 'Ya tienes ' + MAX_PLANTILLAS + ' plantillas. Borra una para crear otra.',
    'responsable-no-encontrado': 'Una de las personas elegidas ya no está en tu iglesia. Cambia el responsable e inténtalo de nuevo.',
    'no-encontrada': 'Esta plantilla ya no existe. Vuelve a la lista y revisa.',
  };

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let mensaje = '';
    const cargarLista = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="plVolver">‹ Panel</button>' +
        '<h1 class="cp-titulo">Plantillas de culto</h1>' +
        '<p class="suave" id="plListaMsg" role="status">' + esc(mensaje) + '</p>' +
        '<button type="button" class="btn" id="plNueva">+ Nueva plantilla</button>' +
        '<div id="plLista"><p class="suave" role="status">Cargando…</p></div>';
      mensaje = '';
      $('#plVolver').onclick = ctx.volver;
      $('#plNueva').onclick = () => abrirEditor(null);
      const d = fila(await ctx.rpc('pastor_plantillas_listar', p));
      if (!d) { $('#plLista').innerHTML = '<p class="suave">No pudimos cargar tus plantillas. Revisa tu conexión y vuelve a intentarlo.</p>'; return; }
      const plantillas = d.plantillas || [];
      $('#plLista').innerHTML = listaHTML(plantillas);
      $('#plLista').querySelectorAll('[data-pl-editar]').forEach((b) => b.onclick = () => {
        const id = b.getAttribute('data-pl-editar');
        const pl = plantillas.find((x) => String(x.id) === id);
        if (pl) abrirEditor(pl);
      });
    };

    const abrirEditor = async (pl) => {
      const est = pl
        ? { id: pl.id, nombre: pl.nombre, detalle: pl.detalle || '', bloques: (pl.bloques || []).map((b) => ({
            titulo: b.titulo, minutos: b.minutos, miembro: b.responsable_miembro || '',
            responsable: b.responsable_miembro ? '' : (b.responsable || ''), notas: b.notas || '' })) }
        : { id: null, nombre: '', detalle: '', bloques: BLOQUES_INICIO.map((b) => Object.assign({}, b)) };
      const mr = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
      const miembros = mr && mr.ok ? (mr.data || []) : [];
      const pintar = () => {
        pant.innerHTML = '<button type="button" class="volver" id="plAtras">‹ Plantillas</button>' +
          '<h1 class="cp-titulo">' + (est.id ? 'Editar plantilla' : 'Nueva plantilla') + '</h1>' +
          '<div id="plForm">' + editorHTML(est, miembros) + '</div>';
        conectar();
      };
      const conectar = () => {
        $('#plAtras').onclick = () => cargarLista();
        $('#plAgregar') && ($('#plAgregar').onclick = () => { sincronizar(est); est.bloques.push({ titulo: '', minutos: 10, miembro: '', responsable: '', notas: '' }); pintar(); });
        document.querySelectorAll('[data-quitar]').forEach((b) => b.onclick = () => {
          sincronizar(est); est.bloques.splice(parseInt(b.getAttribute('data-quitar'), 10), 1); pintar();
        });
        document.querySelectorAll('[data-subir]').forEach((b) => b.onclick = () => {
          sincronizar(est); est.bloques = mover(est.bloques, parseInt(b.getAttribute('data-subir'), 10), -1); pintar();
        });
        document.querySelectorAll('[data-bajar]').forEach((b) => b.onclick = () => {
          sincronizar(est); est.bloques = mover(est.bloques, parseInt(b.getAttribute('data-bajar'), 10), 1); pintar();
        });
        document.querySelectorAll('[id^="pl-r"]').forEach((s) => s.onchange = () => {
          const i = s.id.replace('pl-r', '');
          const lib = $('#pl-l' + i); if (lib) { lib.hidden = s.value !== LIBRE; const lbl = document.querySelector('label[for="pl-l' + i + '"]'); if (lbl) lbl.hidden = s.value !== LIBRE; }
          sincronizar(est); $('#pl-total').textContent = 'Duración total: ' + formatoMin(totalMinutos(est.bloques));
        });
        document.querySelectorAll('[id^="pl-m"]').forEach((s) => s.oninput = () => {
          sincronizar(est); $('#pl-total').textContent = 'Duración total: ' + formatoMin(totalMinutos(est.bloques));
        });
        $('#plGuardar').onclick = () => guardar();
        $('#plBorrar') && ($('#plBorrar').onclick = () => borrar());
        $('#plPublicar') && ($('#plPublicar').onclick = () => publicar());
      };

      const guardar = async () => {
        sincronizar(est);
        const error = validar(est);
        if (error) { aviso('plMsg', error); return; }
        const b = $('#plGuardar'); b.disabled = true; aviso('plMsg', 'Guardando…');
        const r = await ctx.rpc('pastor_plantilla_guardar', p, {
          p_id: est.id, p_nombre: est.nombre.trim(), p_detalle: est.detalle.trim() || null,
          p_bloques: bloquesDePayload(est.bloques),
        });
        const d = fila(r);
        if (!d || !d.ok) {
          b.disabled = false;
          aviso('plMsg', r && r.falta ? 'Esta función se activa pronto en tu iglesia. Tu trabajo sigue aquí.'
            : (d && MOTIVOS[d.motivo]) || 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo. Tu trabajo sigue aquí.');
          return;
        }
        mensaje = 'Plantilla guardada.';
        cargarLista();
      };

      const publicar = async () => {
        if (!window.confirm('¿Usar esta plantilla como el programa del domingo? Los miembros verán este orden en Mi servicio y reemplaza el que estaba publicado.')) return;
        const d = fila(await ctx.rpc('pastor_plantilla_publicar', p, { p_id: est.id, p_publicar: true }));
        if (!d || !d.ok) { aviso('plMsg', (d && MOTIVOS[d.motivo]) || 'No pudimos publicarla. Revisa tu conexión e inténtalo de nuevo.'); return; }
        mensaje = 'Listo: los miembros ya ven este programa en Mi servicio.';
        cargarLista();
      };
      const borrar = async () => {
        if (!window.confirm('¿Borrar esta plantilla? Sus bloques también se borran. Esto no se puede deshacer.')) return;
        const d = fila(await ctx.rpc('pastor_plantilla_borrar', p, { p_id: est.id }));
        if (!d || !d.ok) { aviso('plMsg', (d && MOTIVOS[d.motivo]) || 'No pudimos borrar. Revisa tu conexión e inténtalo de nuevo.'); return; }
        mensaje = 'Plantilla borrada.';
        cargarLista();
      };

      pintar();
    };

    cargarLista();
  }

  window.TBPlantillasCulto = { abrir, _t: { totalMinutos, formatoMin, validar, mover, bloquesDePayload, MAX_BLOQUES } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBPlantillasCulto;
})();
