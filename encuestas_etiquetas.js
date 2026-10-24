/* F1408 · Encuestas (tarea 2.4) y etiquetas con personas para enviar a grupos (tarea 2.8).
   Pastor: crear encuestas, ver conteos por opción (nunca quién votó qué), abrir/cerrar y borrar;
   crear, renombrar y borrar etiquetas; ver y editar las personas de cada etiqueta.
   Miembro: votar en las encuestas de su iglesia dentro de «Mi servicio».
   Usa SQL 58 (pastor_encuesta_*, miembro_encuesta*) y SQL 59 (pastor_etiqueta*, pastor_segmento_leer). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const MIN_OPC = 2, MAX_OPC = 6, MAX_PREG = 200, MAX_OPC_TEXTO = 80, MAX_ETI = 40;
  const MOTIVOS = {
    'sin-permiso': 'Tu clave ya no sirve. Vuelve a entrar.',
    'no-encontrada': 'No la encontramos. Puede que ya se haya borrado.',
    'datos-invalidos': 'Revisa los datos e intenta de nuevo.',
    'nombre-repetido': 'Ya tienes una etiqueta con ese nombre.',
    'cerrada': 'Esta encuesta ya está cerrada.',
    'opcion-invalida': 'Esa opción no existe.'
  };

  // ---------- Lógica pura (se prueba sin navegador) ----------
  // Del cuadro de texto a la lista de opciones: una por línea, sin vacías.
  function limpiarOpciones(texto) {
    return String(texto || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  // Devuelve el primer problema en español claro, o null si la encuesta está bien.
  function validarEncuesta(pregunta, opciones) {
    const p = String(pregunta || '').trim();
    if (p.length < 2) return 'Escribe la pregunta (al menos 2 letras).';
    if (p.length > MAX_PREG) return 'La pregunta es demasiado larga (máximo 200 letras).';
    if (opciones.length < MIN_OPC) return 'Escribe al menos 2 opciones, una por línea.';
    if (opciones.length > MAX_OPC) return 'Puedes poner hasta 6 opciones.';
    if (opciones.some((o) => o.length > MAX_OPC_TEXTO)) return 'Cada opción tiene máximo 80 letras.';
    if (new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length) return 'Hay opciones repetidas.';
    return null;
  }
  function porcentaje(votos, total) {
    return total > 0 ? Math.round((votos * 100) / total) : 0;
  }
  function validarEtiqueta(nombre) {
    const n = String(nombre || '').trim();
    if (!n) return 'Escribe un nombre para la etiqueta.';
    if (n.length > MAX_ETI) return 'El nombre es demasiado largo (máximo 40 letras).';
    return null;
  }
  function textoMotivo(r) {
    const m = r && r.motivo;
    return (m && MOTIVOS[m]) || 'No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.';
  }
  const nombreDe = (m) => String((m && (m.nombre_visible || m.nombre)) || 'Sin nombre');

  // ---------- Pastor: encuestas ----------
  function encuestasHTML(lista) {
    if (!lista.length) return '<p class="suave">Todavía no hay encuestas. Crea la primera: tus miembros votarán desde Mi servicio.</p>';
    return lista.map((e) => {
      const total = e.total || 0;
      const conteos = e.conteos || [];
      const filas = (e.opciones || []).map((texto, i) => {
        const c = conteos.find((x) => x.opcion === i);
        const v = c ? c.votos : 0;
        const pct = porcentaje(v, total);
        return '<div class="enc-fila"><span>' + esc(texto) + '</span><span class="suave">' + v + ' · ' + pct + '%</span>' +
          '<progress class="enc-barra" max="100" value="' + pct + '" aria-label="' + esc(texto) + ': ' + pct + ' por ciento"></progress></div>';
      }).join('');
      return '<section class="enc-caja"><h2 class="mi-sub">' + esc(e.pregunta) + '</h2>' +
        '<p class="suave">' + (e.abierta ? 'Abierta' : 'Cerrada') + ' · ' + total + (total === 1 ? ' voto' : ' votos') + '</p>' +
        filas +
        '<div class="enc-acc"><button type="button" class="btn sec" data-enc-toggle="' + esc(e.id) + '" data-abierta="' + (e.abierta ? '1' : '0') + '">' +
        (e.abierta ? 'Cerrar votación' : 'Volver a abrir') + '</button> ' +
        '<button type="button" class="btn sec" data-enc-borrar="' + esc(e.id) + '">Borrar</button></div></section>';
    }).join('');
  }

  async function abrirEncuestas(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let mensaje = '';
    let cargar = null;
    const formulario = () => {
      pant.innerHTML = '<button type="button" class="volver" id="encAtras">‹ Encuestas</button>' +
        '<h1 class="cp-titulo">Nueva encuesta</h1>' +
        '<label class="cp-campo">Pregunta<input id="encPreg" type="text" maxlength="200" autocomplete="off"></label>' +
        '<label class="cp-campo">Opciones (una por línea, de 2 a 6)<textarea id="encOpc" rows="6" maxlength="600"></textarea></label>' +
        '<p class="suave" id="encErr" role="alert" hidden></p>' +
        '<button type="button" class="btn" id="encGuardar">Publicar encuesta</button>';
      $('#encAtras').onclick = () => cargar();
      $('#encGuardar').onclick = async () => {
        const preg = $('#encPreg').value;
        const opc = limpiarOpciones($('#encOpc').value);
        const err = validarEncuesta(preg, opc);
        const el = $('#encErr');
        el.hidden = !err; el.textContent = err || '';
        if (err) return;
        const g = fila(await ctx.rpc('pastor_encuesta_crear', p, { p_pregunta: preg.trim(), p_opciones: opc }));
        if (g && g.ok) { mensaje = 'Encuesta publicada. Tus miembros la verán en Mi servicio.'; cargar(); }
        else { el.hidden = false; el.textContent = textoMotivo(g); }
      };
    };
    cargar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="encVolver">‹ Panel</button>' +
        '<h1 class="cp-titulo">Encuestas</h1>' +
        '<p class="suave">Pregunta a tu iglesia y mira los resultados. Solo ves los conteos: nunca quién votó qué.</p>' +
        '<p class="suave" id="encMsg" role="status">' + esc(mensaje) + '</p>' +
        '<button type="button" class="btn" id="encNueva">+ Nueva encuesta</button>' +
        '<div id="encLista"><p class="suave" role="status">Cargando…</p></div>';
      mensaje = '';
      $('#encVolver').onclick = ctx.volver;
      $('#encNueva').onclick = formulario;
      const d = fila(await ctx.rpc('pastor_encuestas_listar', p));
      if (!d || d.ok === false) { $('#encLista').innerHTML = '<p class="suave">No pudimos cargar las encuestas. Revisa tu conexión y vuelve a intentarlo.</p>'; return; }
      $('#encLista').innerHTML = encuestasHTML(d.encuestas || []);
      document.querySelectorAll('[data-enc-toggle]').forEach((b) => b.onclick = async () => {
        const nueva = b.getAttribute('data-abierta') !== '1';
        const g = fila(await ctx.rpc('pastor_encuesta_cerrar', p, { p_id: b.getAttribute('data-enc-toggle'), p_abierta: nueva }));
        mensaje = g && g.ok ? (nueva ? 'Votación abierta de nuevo.' : 'Votación cerrada. Los resultados quedan guardados.') : textoMotivo(g);
        cargar();
      });
      document.querySelectorAll('[data-enc-borrar]').forEach((b) => b.onclick = async () => {
        if (!window.confirm('¿Borrar esta encuesta y todos sus votos? No se puede deshacer.')) return;
        const g = fila(await ctx.rpc('pastor_encuesta_borrar', p, { p_id: b.getAttribute('data-enc-borrar') }));
        mensaje = g && g.ok ? 'Encuesta borrada.' : textoMotivo(g);
        cargar();
      });
    };
    cargar();
  }

  // ---------- Pastor: etiquetas y segmentos ----------
  async function abrirEtiquetas(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    let mensaje = '';
    let cargar = null;

    const segmento = async (id, nombre, msg) => {
      pant.innerHTML = '<button type="button" class="volver" id="etAtras">‹ Etiquetas</button>' +
        '<h1 class="cp-titulo">' + esc(nombre) + '</h1>' +
        '<p class="suave" id="etSegMsg" role="status">' + esc(msg || '') + '</p>' +
        '<div id="etPersonas"><p class="suave">Cargando…</p></div>' +
        '<h2 class="mi-sub">Agregar personas</h2>' +
        '<div class="mie-buscar"><input id="etBuscar" type="search" placeholder="Buscar una persona" aria-label="Buscar una persona" autocomplete="off"></div>' +
        '<div id="etAgregar"></div>' +
        '<button type="button" class="btn" id="etAgregarOk">Agregar las marcadas</button>';
      $('#etAtras').onclick = () => cargar();

      const s = fila(await ctx.rpc('pastor_segmento_leer', p, { p_etiqueta: id }));
      const en = (s && s.personas) || [];
      const dentro = new Set(en.map((x) => String(x.id)));
      // F1408 · 2.9 Envío a un grupo: un toque por persona (WhatsApp abre con el mensaje listo y lo envías tú).
      // El teléfono sale de la ficha (pastor_ficha_leer), que ya respeta lo que cada persona decidió compartir.
      const CP = window.TBCentroPastor;
      const enlace = (CP && CP._t && CP._t.enlaceWsp) ? CP._t.enlaceWsp : null;
      const fichas = await Promise.all(en.map((x) => ctx.rpc('pastor_ficha_leer', p, { p_id: x.id }).then(fila)));
      $('#etPersonas').innerHTML = en.length
        ? '<p class="suave">Toca «WhatsApp» en cada persona: se abre el mensaje listo y lo envías tú.</p>' +
          en.map((x, i) => {
            const f = fichas[i] || {};
            const wsp = (enlace && f.telefono) ? enlace(f.telefono, x.nombre) : '';
            const accion = wsp
              ? '<a class="btn cp-wsp" target="_blank" rel="noopener" href="' + esc(wsp) + '">WhatsApp</a>'
              : '<small class="suave">Sin teléfono para compartir</small>';
            return '<div class="cp-fila"><span class="cp-fila-t"><b>' + esc(x.nombre) + '</b></span>' + accion +
              ' <button type="button" class="btn sec" data-et-quitar="' + esc(x.id) + '">Quitar</button></div>';
          }).join('')
        : '<p class="suave">Aún no hay personas en esta etiqueta.</p>';
      document.querySelectorAll('[data-et-quitar]').forEach((b) => b.onclick = async () => {
        const g = fila(await ctx.rpc('pastor_etiqueta_asignar', p, { p_etiqueta: id, p_miembros: [b.getAttribute('data-et-quitar')], p_quitar: true }));
        segmento(id, nombre, g && g.ok ? 'Persona quitada del grupo.' : textoMotivo(g));
      });

      const mr = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
      const todas = mr && mr.ok ? (mr.data || []) : [];
      const disponibles = todas.filter((m) => !dentro.has(String(m.id)));
      const pintarAgregar = () => {
        const q = ($('#etBuscar').value || '').trim().toLowerCase();
        const lista = disponibles.filter((m) => nombreDe(m).toLowerCase().includes(q));
        $('#etAgregar').innerHTML = lista.length
          ? lista.map((m) => '<label class="cp-fila et-marca"><input type="checkbox" value="' + esc(m.id) + '"> <span>' + esc(nombreDe(m)) + '</span></label>').join('')
          : '<p class="suave">No hay personas para agregar.</p>';
      };
      $('#etBuscar').addEventListener('input', pintarAgregar);
      pintarAgregar();
      $('#etAgregarOk').onclick = async () => {
        const marcadas = Array.from(document.querySelectorAll('#etAgregar input[type=checkbox]:checked')).map((c) => c.value);
        if (!marcadas.length) { $('#etSegMsg').textContent = 'Marca al menos una persona.'; return; }
        const g = fila(await ctx.rpc('pastor_etiqueta_asignar', p, { p_etiqueta: id, p_miembros: marcadas, p_quitar: false }));
        segmento(id, nombre, g && g.ok ? 'Personas agregadas al grupo.' : textoMotivo(g));
      };
    };

    cargar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="etVolver">‹ Panel</button>' +
        '<h1 class="cp-titulo">Etiquetas y grupos</h1>' +
        '<p class="suave">Agrupa personas (por ejemplo «Jóvenes» o «Célula Norte») para enviarles mensajes a todas juntas.</p>' +
        '<p class="suave" id="etMsg" role="status">' + esc(mensaje) + '</p>' +
        '<div class="cp-campo"><label for="etNueva">Nueva etiqueta</label>' +
        '<div class="et-nueva"><input id="etNueva" type="text" maxlength="40" autocomplete="off"><button type="button" class="btn" id="etCrear">Crear</button></div></div>' +
        '<div id="etLista"><p class="suave" role="status">Cargando…</p></div>';
      mensaje = '';
      $('#etVolver').onclick = ctx.volver;
      $('#etCrear').onclick = async () => {
        const nombre = $('#etNueva').value;
        const err = validarEtiqueta(nombre);
        if (err) { mensaje = err; return cargar(); }
        const g = fila(await ctx.rpc('pastor_etiqueta_guardar', p, { p_id: null, p_nombre: nombre.trim() }));
        mensaje = g && g.ok ? 'Etiqueta creada.' : textoMotivo(g);
        cargar();
      };
      const d = fila(await ctx.rpc('pastor_etiquetas_listar', p));
      if (!d || d.ok === false) { $('#etLista').innerHTML = '<p class="suave">No pudimos cargar las etiquetas. Revisa tu conexión.</p>'; return; }
      const lista = d.etiquetas || [];
      $('#etLista').innerHTML = lista.length
        ? lista.map((e) => '<div class="cp-fila et-fila"><span class="cp-fila-t"><b>' + esc(e.nombre) + '</b><small>' + e.personas + (e.personas === 1 ? ' persona' : ' personas') + '</small></span>' +
            '<button type="button" class="btn sec" data-et-ver="' + esc(e.id) + '" data-et-nombre="' + esc(e.nombre) + '">Ver y editar</button> ' +
            '<button type="button" class="btn sec" data-et-renom="' + esc(e.id) + '" data-et-nombre="' + esc(e.nombre) + '">Renombrar</button> ' +
            '<button type="button" class="btn sec" data-et-borrar="' + esc(e.id) + '">Borrar</button></div>').join('')
        : '<p class="suave">Todavía no hay etiquetas. Crea una arriba.</p>';
      document.querySelectorAll('[data-et-ver]').forEach((b) => b.onclick = () => segmento(b.getAttribute('data-et-ver'), b.getAttribute('data-et-nombre'), ''));
      document.querySelectorAll('[data-et-renom]').forEach((b) => b.onclick = async () => {
        const nuevo = window.prompt('Nuevo nombre para la etiqueta:', b.getAttribute('data-et-nombre') || '');
        if (nuevo == null) return;
        const err = validarEtiqueta(nuevo);
        if (err) { mensaje = err; return cargar(); }
        const g = fila(await ctx.rpc('pastor_etiqueta_guardar', p, { p_id: b.getAttribute('data-et-renom'), p_nombre: nuevo.trim() }));
        mensaje = g && g.ok ? 'Etiqueta renombrada.' : textoMotivo(g);
        cargar();
      });
      document.querySelectorAll('[data-et-borrar]').forEach((b) => b.onclick = async () => {
        if (!window.confirm('¿Borrar esta etiqueta? Las personas no se borran; solo dejan de estar en este grupo.')) return;
        const g = fila(await ctx.rpc('pastor_etiqueta_borrar', p, { p_id: b.getAttribute('data-et-borrar') }));
        mensaje = g && g.ok ? 'Etiqueta borrada.' : textoMotivo(g);
        cargar();
      });
    };
    cargar();
  }

  // ---------- Miembro: votar ----------
  function miembroHTML(lista, aviso) {
    return '<h2 class="mi-sub">Encuestas de tu iglesia</h2>' + (aviso ? '<p class="suave" role="status">' + esc(aviso) + '</p>' : '') +
      lista.map((e) => {
        const opc = (e.opciones || []).map((t, i) => '<button type="button" class="btn sec enc-opc" data-enc-voto="' + esc(e.id) +
          '" data-enc-opc="' + i + '" aria-pressed="' + (e.mi_voto === i ? 'true' : 'false') + '"' + (e.abierta ? '' : ' disabled') + '>' +
          (e.mi_voto === i ? '✓ ' : '') + esc(t) + '</button>').join('');
        const nota = !e.abierta ? '<p class="suave">Votación cerrada.</p>'
          : (e.mi_voto != null ? '<p class="suave">Puedes cambiar tu voto mientras esté abierta.</p>' : '');
        return '<section class="enc-caja"><p><b>' + esc(e.pregunta) + '</b></p>' + nota +
          '<div class="enc-opciones">' + opc + '</div></section>';
      }).join('');
  }
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const pintar = async (aviso) => {
      const r = await rpcRaw('miembro_encuestas_listar', { p_codigo: id.codigo, p_clave: id.clave });
      const d = r && r.ok ? r.data : null;
      const lista = d && d.ok !== false ? (d.encuestas || []) : [];
      c.innerHTML = lista.length ? miembroHTML(lista, aviso) : '';
      c.querySelectorAll('[data-enc-voto]').forEach((b) => b.onclick = async () => {
        b.disabled = true;
        const g = await rpcRaw('miembro_encuesta_votar', { p_codigo: id.codigo, p_clave: id.clave,
          p_id: b.getAttribute('data-enc-voto'), p_opcion: parseInt(b.getAttribute('data-enc-opc'), 10) });
        const ok = g && g.ok && g.data && g.data.ok;
        const motivo = g && g.data && g.data.motivo;
        pintar(ok ? 'Tu voto quedó guardado.' : (MOTIVOS[motivo] || 'No se pudo guardar tu voto. Intenta de nuevo.'));
      });
    };
    await pintar('');
  }

  window.TBEncuestas = { abrir: abrirEncuestas, miembroMostrar, _t: { limpiarOpciones, validarEncuesta, porcentaje, validarEtiqueta } };
  window.TBEtiquetas = { abrir: abrirEtiquetas };
  if (typeof module !== 'undefined' && module.exports) module.exports = { encuestas: window.TBEncuestas, etiquetas: window.TBEtiquetas };
})();
