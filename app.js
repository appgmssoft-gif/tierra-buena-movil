// app.js — F856 (MOV2a): esqueleto de la versión móvil/tablet de Tierra Buena.
// Reutiliza lo que el escritorio ya decidió para el miembro (docs/PLAN_MI_IGLESIA_MIEMBRO.md):
// identidad liviana con llave en el dispositivo, solicitud que aprueba el pastor, mismas funciones de Supabase.
// No usa nada de Electron. Sin cuentas ni contraseñas.
(function () {
  'use strict';
  const SUPABASE_URL = 'https://mxgvaspztajgzxfgtxfq.supabase.co';
  // Clave 'anon': pública por diseño (igual que en el escritorio). La seguridad la ponen las funciones/RLS de Supabase.
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z3Zhc3B6dGFqZ3p4Zmd0eGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODE5NzcsImV4cCI6MjEwNTI1Nzk3N30.JWk7cBOR-K4adeHcokcZY0B2WcmTDLmEpIsBMQqtFjY';
  const K_ID = 'tb_movil_identidad', K_SOL = 'tb_movil_solicitud', K_IG = 'tb_movil_iglesia';
  const SB = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    : null;

  const MOTIVOS = {
    'nombre-invalido': 'Escribe tu nombre (entre 2 y 40 letras).',
    'iglesia-no-existe': 'Todavía no encontramos esa iglesia. Revisa el código con tu pastor.',
    'iglesia-llena': 'Esa iglesia llegó a su límite de personas. Cuéntaselo a tu pastor.',
    'declaracion-falta': 'Marca que eres miembro de esta iglesia para que tu pastor pueda reconocerte.',
    'consentimiento-falta': 'Necesitamos tu permiso para que tu pastor y los líderes vean estos datos.',
    'demasiadas-pendientes': 'Esa iglesia tiene muchas solicitudes esperando. Avísale a tu pastor.',
    'ya-es-miembro': 'Ya eres parte de esa iglesia.',
    'llave-invalida': 'Esa llave no funciona. Cópiala completa desde tu otro dispositivo.',
    'sin-internet': 'Para esto necesitamos internet. Inténtalo de nuevo cuando tengas conexión.'
  };
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const borrar = (k) => { try { localStorage.removeItem(k); } catch (e) { /* nada */ } };

  async function rpc(fn, args) {
    if (!SB) return { ok: false, motivo: 'sin-internet' };
    try {
      const { data, error } = await SB.rpc(fn, args);
      if (error) return { ok: false, motivo: 'sin-internet' };
      return { ok: true, data: Array.isArray(data) ? data[0] : data };
    } catch (e) { return { ok: false, motivo: 'sin-internet' }; }
  }
  const llaveNueva = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');

  // ---------- Pantallas ----------
  const pronto = (ico, titulo, ayuda) => `<div class="card pronto" role="note"><div class="t"><span aria-hidden="true">${ico}</span>${titulo}<span class="etiqueta">Pronto</span></div><p class="suave m0t">${ayuda}</p></div>`;

  const activa = (ico, titulo, ayuda, ir) => `<button type="button" class="card" data-ir="${ir}"><div class="t"><span aria-hidden="true">${ico}</span>${titulo}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${ayuda}</p></button>`;

  // Igual que rpc() pero devuelve los datos tal cual (listas) y avisa si la función aún no existe en Supabase.
  async function rpcRaw(fn, args) {
    if (!SB) return { ok: false, error: 'sin-internet' };
    try {
      const { data, error } = await SB.rpc(fn, args);
      if (error) { const falta = error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''); return { ok: false, falta, error: falta ? 'falta' : 'sin-internet' }; }
      return { ok: true, data };
    } catch (e) { return { ok: false, error: 'sin-internet' }; }
  }
  const primera = (d) => (Array.isArray(d) ? d[0] : d);
  const fecha = (iso) => { try { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const TEXTO_ERR = { 'sin-internet': MOTIVOS['sin-internet'], falta: 'Esta parte todavía se está preparando. Vuelve a intentarlo pronto.', 'miembro-invalido': 'Necesitamos confirmar quién eres. Vuelve a Mi iglesia.', 'texto-invalido': 'Cuéntanos un poquito más: escribe entre 3 y 600 letras.', demasiadas: 'Llegaste al límite de hoy. Mañana podrás enviar más.', 'motivo-invalido': 'Cuéntale a tu pastor un poco más (entre 3 y 300 letras).', 'tipo-invalido': 'Elige qué tipo de visita necesitas.' };
  const errTxt = (e) => TEXTO_ERR[e] || 'Algo no salió como esperábamos. Inténtalo de nuevo en un momento.';
  const volver = () => `<button type="button" class="volver" id="volver">‹ Mi iglesia</button>`;
  const alVolver = () => { const b = $('#volver'); if (b) b.onclick = () => vistaIglesia(); };
  const msg = (t, ok) => { const e = $('#msg'); if (e) { e.textContent = t || ''; e.className = ok ? 'ok' : 'error'; e.hidden = !t; } };

  function vistaIglesia() {
    const id = leer(K_ID), sol = leer(K_SOL);
    if (id) return vistaMiembro(id);
    if (sol) return vistaPendiente(sol);
    return vistaUnirse();
  }

  function vistaUnirse() {
    $('#pantalla').innerHTML = `
      <h1>Mi iglesia</h1><div class="filete"></div>
      <p>Para unirte, escribe el código que te dio tu pastor. Tu pastor decidirá si te acepta.</p>
      <label for="cod">Código de tu iglesia</label>
      <input id="cod" type="text" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" inputmode="text" placeholder="Ej. AB12CD">
      <p id="err" class="error" role="alert" hidden></p>
      <button id="buscar" class="btn">Buscar mi iglesia</button>
      <div id="paso2"></div>
      <button id="llave" class="btn sec">Ya me uní en otro dispositivo</button>
      <div id="paso3"></div>`;
    $('#buscar').onclick = buscarIglesia;
    $('#llave').onclick = vistaLlave;
  }
  function error(msg) { const e = $('#err'); if (e) { e.textContent = msg; e.hidden = !msg; } }

  async function buscarIglesia() {
    const cod = $('#cod').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cod)) return error('El código tiene 6 letras o números.');
    error(''); const b = $('#buscar'); b.disabled = true; b.textContent = 'Buscando…';
    const r = await rpc('iglesia_perfil', { p_codigo: cod });
    b.disabled = false; b.textContent = 'Buscar mi iglesia';
    if (!r.ok) return error(MOTIVOS['sin-internet']);
    if (!r.data || !r.data.existe) return error(MOTIVOS['iglesia-no-existe']);
    $('#paso2').innerHTML = `
      <div class="card bienvenida sep16"><h2>${esc(r.data.nombre)}</h2>${r.data.eslogan ? `<p class="suave">${esc(r.data.eslogan)}</p>` : ''}</div>
      <label for="nom">¿Cómo te llamamos? (nombre visible)</label>
      <input id="nom" type="text" maxlength="40" autocomplete="given-name">
      <label for="nomc">Tu nombre completo (opcional, para tu pastor)</label>
      <input id="nomc" type="text" maxlength="80" autocomplete="name">
      <label for="nota">Algo que quieras contarle a tu pastor (opcional)</label>
      <textarea id="nota" rows="2" maxlength="200"></textarea>
      <label class="chk"><input id="decl" type="checkbox"><span>Soy miembro de esta iglesia.</span></label>
      <label class="chk"><input id="cons" type="checkbox"><span>Permito que mi pastor y los líderes vean estos datos.</span></label>
      <button id="enviar" class="btn">Pedir unirme</button>`;
    $('#enviar').onclick = () => enviarSolicitud(cod, r.data.nombre);
    $('#nom').focus();
  }

  async function enviarSolicitud(cod, nombreIglesia) {
    const nombre = $('#nom').value.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2 || nombre.length > 40) return error(MOTIVOS['nombre-invalido']);
    if (!$('#decl').checked) return error(MOTIVOS['declaracion-falta']);
    if (!$('#cons').checked) return error(MOTIVOS['consentimiento-falta']);
    error(''); const b = $('#enviar'); b.disabled = true; b.textContent = 'Enviando…';
    const clave = llaveNueva();
    const r = await rpc('miembro_solicitar', { p_codigo: cod, p_nombre: nombre, p_clave: clave, p_nombre_completo: $('#nomc').value.trim().slice(0, 80), p_declara: true, p_consiente: true, p_nota: $('#nota').value.trim().slice(0, 200) });
    if (!r.ok || !r.data || r.data.ok !== true) { b.disabled = false; b.textContent = 'Pedir unirme'; return error(MOTIVOS[(r.data && r.data.motivo) || r.motivo] || MOTIVOS['sin-internet']); }
    if (!guardar(K_SOL, { codigo: cod, nombre, clave, creadoEn: new Date().toISOString() })) return error('Este navegador no deja guardar datos. Sal del modo privado e inténtalo otra vez.');
    guardar(K_IG, { codigo: cod, nombre: nombreIglesia });
    vistaIglesia();
  }

  function vistaPendiente(sol) {
    const ig = leer(K_IG);
    $('#pantalla').innerHTML = `
      <h1>Mi iglesia</h1><div class="filete"></div>
      <div class="card bienvenida"><h2>Solicitud enviada</h2>
        <p>Hola, ${esc(sol.nombre)}. Tu pastor${ig ? ' de <b>' + esc(ig.nombre) + '</b>' : ''} tiene que aceptarte. Cuando lo haga, aquí se abre tu iglesia.</p></div>
      <p id="msg" class="suave" role="status"></p>
      <button id="rev" class="btn">Ver si ya me aceptaron</button>
      <button id="can" class="btn sec">Cancelar mi solicitud</button>`;
    $('#rev').onclick = async () => {
      const b = $('#rev'); b.disabled = true; b.textContent = 'Revisando…';
      const r = await rpc('miembro_estado', { p_codigo: sol.codigo, p_clave: sol.clave });
      b.disabled = false; b.textContent = 'Ver si ya me aceptaron';
      if (!r.ok) return ($('#msg').textContent = MOTIVOS['sin-internet']);
      const e = (r.data && r.data.estado) || 'ninguna';
      if (e === 'aprobado') { guardar(K_ID, { codigo: sol.codigo, nombre: r.data.nombre || sol.nombre, clave: sol.clave, creadoEn: new Date().toISOString() }); borrar(K_SOL); return vistaIglesia(); }
      if (e === 'rechazada' || e === 'ninguna') { borrar(K_SOL); borrar(K_IG); return vistaUnirse(); }
      $('#msg').textContent = 'Todavía está pendiente. Tu pastor lo verá pronto.';
    };
    $('#can').onclick = () => { if (confirm('¿Cancelar tu solicitud?')) { borrar(K_SOL); borrar(K_IG); vistaUnirse(); } };
  }

  function vistaMiembro(id) {
    const ig = leer(K_IG);
    $('#pantalla').innerHTML = `
      <h1>Mi iglesia</h1><div class="filete"></div>
      <div class="card bienvenida"><h2>Hola, ${esc(id.nombre)}</h2><p class="suave m0">${ig ? esc(ig.nombre) : 'Tu iglesia'}</p></div>
      <h2 class="sep">Pedir ayuda</h2>
      <div class="grid">${activa('🙏', 'Pedir oración', 'Cuéntale a tu pastor por qué orar.', 'oracion')}${activa('🤝', 'Pedir visita', 'Pide que tu pastor te visite.', 'visita')}</div>
      <h2 class="sep">Vivir con mi iglesia</h2>
      <div class="grid">${activa('🧱', 'Muro', 'Peticiones que tu pastor compartió, para orar juntos.', 'muro')}${pronto('🌟', 'Acción del mes', 'Lo que viviremos juntos este mes.')}</div>
      <button id="salir" class="btn sec sep28">Salir de mi iglesia</button>`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => (b.dataset.ir === 'oracion' ? vistaOracion(id) : b.dataset.ir === 'muro' ? vistaMuro(id) : vistaVisita(id))));
    $('#salir').onclick = async () => {
      if (!confirm('¿Salir de esta iglesia? Se borrará tu nombre en la iglesia y en este teléfono.')) return;
      await rpc('miembro_eliminar', { p_codigo: id.codigo, p_clave: id.clave });
      borrar(K_ID); borrar(K_SOL); borrar(K_IG); vistaUnirse();
    };
  }

  // ---------- Pedir oración (MOV2b) ----------
  const TIPOS_ORACION = { salud: '🩺 Salud', familia: '🏠 Familia', trabajo: '💼 Trabajo', animo: '🕊️ Ánimo', gratitud: '🙌 Gratitud', otro: '✨ Otro' };
  function vistaOracion(id) {
    $('#pantalla').innerHTML = `${volver()}<h1>Pedir oración</h1><div class="filete"></div>
      <p class="suave">Cuéntale a tu pastor por quién o por qué orar. Se borra sola a los 6 meses y tú puedes borrarla cuando quieras.</p>
      <label for="otxt">¿Por qué quieres que oremos?</label>
      <textarea id="otxt" rows="4" maxlength="600" placeholder="Ej. Por la salud de mi mamá, que esta semana entra al hospital."></textarea>
      <div id="ocont" class="suave der">0 / 600</div>
      <label for="otipo">¿Sobre qué es?</label>
      <select id="otipo">${Object.keys(TIPOS_ORACION).map((k) => `<option value="${k}"${k === 'otro' ? ' selected' : ''}>${TIPOS_ORACION[k]}</option>`).join('')}</select>
      <fieldset class="opciones"><legend>¿Quién puede verla?</legend>
        <label class="opcion"><input type="radio" name="oquien" value="pastor" checked><span><b>Solo mi pastor</b><br><small class="suave">Lo más privado. Ideal para temas personales o de salud.</small></span></label>
        <label class="opcion"><input type="radio" name="oquien" value="iglesia"><span><b>Toda mi iglesia</b><br><small class="suave">Tu pastor decide si la comparte. Nada se publica sin su permiso.</small></span></label>
      </fieldset>
      <label id="oanonf" class="chk" hidden><input id="oanon" type="checkbox"><span>Que no aparezca mi nombre cuando se comparta.</span></label>
      <p id="msg" role="alert" hidden></p>
      <button id="oenviar" class="btn">Enviar petición</button>
      <h2 class="sep">Mis peticiones</h2><div id="omias" aria-live="polite"><p class="suave">Cargando…</p></div>`;
    alVolver();
    const t = $('#otxt'); t.addEventListener('input', () => { $('#ocont').textContent = t.value.length + ' / 600'; });
    document.querySelectorAll('input[name=oquien]').forEach((r) => r.addEventListener('change', () => {
      const pub = document.querySelector('input[name=oquien]:checked').value === 'iglesia';
      $('#oanonf').hidden = !pub; if (!pub) $('#oanon').checked = false;
    }));
    $('#oenviar').onclick = async () => {
      const txt = t.value.trim(); if (txt.length < 3) { msg(errTxt('texto-invalido')); return t.focus(); }
      const pub = document.querySelector('input[name=oquien]:checked').value === 'iglesia';
      const base = { p_codigo: id.codigo, p_clave: id.clave, p_texto: txt, p_publica: pub, p_anonima: pub && $('#oanon').checked };
      const b = $('#oenviar'); b.disabled = true; b.textContent = 'Enviando…'; msg('');
      let r = await rpcRaw('peticion_enviar_v2', Object.assign({ p_tipo: $('#otipo').value }, base));
      if (!r.ok && r.falta) r = await rpcRaw('peticion_enviar', base);
      b.disabled = false; b.textContent = 'Enviar petición';
      if (!r.ok) return msg(errTxt(r.error));
      const f = primera(r.data); if (!f || f.ok !== true) return msg(errTxt(f && f.motivo));
      t.value = ''; $('#ocont').textContent = '0 / 600'; msg('Petición enviada. Tu pastor la va a ver.', true); oracionesMias(id);
    };
    oracionesMias(id);
  }
  async function oracionesMias(id) {
    const caja = $('#omias'); if (!caja) return;
    const args = { p_codigo: id.codigo, p_clave: id.clave };
    let r = await rpcRaw('peticion_mias_v2', args); if (!r.ok && r.falta) r = await rpcRaw('peticion_mias', args);
    if (!r.ok) { caja.innerHTML = `<p class="suave">${esc(errTxt(r.error))}</p>`; return; }
    const l = Array.isArray(r.data) ? r.data : [];
    if (!l.length) { caja.innerHTML = '<p class="suave">Todavía no has enviado ninguna petición.</p>'; return; }
    caja.innerHTML = l.map((p) => `<div class="card item"><p>${esc(p.texto)}</p>
      <p class="suave m0">${esc(fecha(p.creado_en))}${p.tipo && TIPOS_ORACION[p.tipo] ? ' · ' + esc(TIPOS_ORACION[p.tipo]) : ''} · ${p.publica ? 'Toda mi iglesia' : 'Solo mi pastor'} · <b>${p.respondida ? '🎉 Dios respondió' : p.estado === 'vista' ? '✅ Tu pastor ya la vio' : '📨 Enviada'}</b></p>
      <button type="button" class="btn sec chico" data-borrar="${esc(p.id)}">🗑️ Borrar</button></div>`).join('');
    caja.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('¿Borrar esta petición? Tu pastor ya no podrá verla en la app.')) return;
      const rb = await rpcRaw('peticion_borrar', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.borrar });
      if (!rb.ok) return msg(errTxt(rb.error)); oracionesMias(id);
    }));
  }

  // ---------- Muro (MOV2c) ----------
  // Misma logica que peticiones.js del escritorio: peticion_muro lista lo que el pastor compartio y
  // peticion_orando suma/quita mi "Estoy orando" (solo un contador, nadie ve quien oro).
  function vistaMuro(id) {
    $('#pantalla').innerHTML = `${volver()}<h1>Muro</h1><div class="filete"></div>
      <p class="suave">Peticiones que tu pastor compartió. Pulsa el botón para decir que estás orando.</p>
      <p id="msg" role="alert" hidden></p>
      <div id="muro" aria-live="polite"><p class="suave">Cargando…</p></div>`;
    alVolver();
    muroCargar(id);
  }
  async function muroCargar(id) {
    const caja = $('#muro'); if (!caja) return;
    const r = await rpcRaw('peticion_muro', { p_codigo: id.codigo, p_clave: id.clave });
    if (!r.ok) { caja.innerHTML = `<p class="suave">${esc(errTxt(r.error))}</p>`; return; }
    const l = Array.isArray(r.data) ? r.data : [];
    if (!l.length) { caja.innerHTML = '<div class="card muro-vacio"><p class="m0">🕊️</p><p class="suave m0t">Todavía no hay peticiones compartidas. Cuando tu pastor comparta una, la verás aquí para orar juntos.</p></div>'; return; }
    caja.innerHTML = l.map((p) => `<div class="card item muro-card">
      <div class="muro-cab"><span class="muro-ini" aria-hidden="true">${esc((p.nombre || '🙏').trim().charAt(0).toUpperCase())}</span><span><b>${esc(p.nombre || 'Alguien de tu iglesia')}</b><br><small class="suave">${esc(fecha(p.publicada_en))}${p.respondida ? ' · 🎉 Oración contestada' : ''}</small></span></div>
      <p class="muro-txt">${esc(p.texto)}</p>
      <button type="button" class="btn ${p.yo_oro ? '' : 'sec'} chico" data-orando="${esc(p.id)}" data-yo="${p.yo_oro ? '1' : '0'}" data-n="${Number(p.orando) || 0}">${muroEtiqueta(!!p.yo_oro, Number(p.orando) || 0)}</button></div>`).join('');
    caja.querySelectorAll('[data-orando]').forEach((b) => b.addEventListener('click', () => muroOrar(id, b)));
  }
  const muroEtiqueta = (yo, n) => '🙏 ' + (yo ? 'Estoy orando' : 'Voy a orar') + ' · ' + Math.max(0, n);
  function muroPintar(b, yo, n) {
    b.dataset.yo = yo ? '1' : '0'; b.dataset.n = String(Math.max(0, n));
    b.classList.toggle('sec', !yo); b.textContent = muroEtiqueta(yo, n);
  }
  async function muroOrar(id, b) {
    // Respuesta inmediata: el boton cambia al tiro y, si falla, vuelve atras.
    const yoAntes = b.dataset.yo === '1', nAntes = Number(b.dataset.n) || 0, quiere = !yoAntes;
    muroPintar(b, quiere, nAntes + (quiere ? 1 : -1)); b.disabled = true; msg('');
    const r = await rpcRaw('peticion_orando', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.orando, p_orando: quiere });
    const n = r.ok ? Number(primera(r.data)) : NaN;
    if (!r.ok || n < 0) { muroPintar(b, yoAntes, nAntes); msg(r.ok ? 'Esta petición ya no está en el muro.' : errTxt(r.error)); }
    else if (Number.isFinite(n)) muroPintar(b, quiere, n);   // el numero real que devolvio el servidor
    b.disabled = false;
  }

  // ---------- Pedir visita (MOV2b) ----------
  const TIPOS_VISITA = { hogar: 'Visita a mi hogar', enfermo: 'Visita a un enfermo', iglesia: 'Reunión en la iglesia', conversacion: 'Conversación personal', otro: 'Otro motivo' };
  const ESTADOS_VISITA = { solicitada: '📨 Enviada', aceptada: '✅ Tu pastor aceptó', agendada: '📅 Agendada', realizada: '🏁 Realizada', no_disponible: '🕊️ Por ahora tu pastor no puede' };
  function vistaVisita(id) {
    $('#pantalla').innerHTML = `${volver()}<h1>Pedir visita</h1><div class="filete"></div>
      <p class="suave">Pide que tu pastor te visite o conversar con él. Solo él lo ve: nunca se publica. Él decide si puede y cuándo, y te responde aquí.</p>
      <label for="vtipo">¿Qué necesitas?</label>
      <select id="vtipo">${Object.keys(TIPOS_VISITA).map((k) => `<option value="${k}">${esc(TIPOS_VISITA[k])}</option>`).join('')}</select>
      <label for="vmot">Cuéntale brevemente el motivo</label>
      <textarea id="vmot" rows="3" maxlength="300" placeholder="Ej. Mi papá está internado y quisiera que oráramos juntos."></textarea>
      <div id="vcont" class="suave der">0 / 300</div>
      <fieldset class="opciones"><legend>¿Es urgente?</legend>
        <label class="opcion"><input type="radio" name="vurg" value="normal" checked><span><b>Puede esperar</b></span></label>
        <label class="opcion"><input type="radio" name="vurg" value="urgente"><span><b>Es urgente</b></span></label>
      </fieldset>
      <label for="vhor">Días y horarios que te acomodan (opcional)</label>
      <input id="vhor" type="text" maxlength="200" placeholder="Ej. tardes de lunes a jueves">
      <label for="vtel">Teléfono para coordinar (opcional)</label>
      <input id="vtel" type="text" maxlength="30" inputmode="tel" placeholder="+56 9 1234 5678">
      <div id="vdirf"><label for="vdir">Dirección (opcional)</label>
        <input id="vdir" type="text" maxlength="200" placeholder="Calle, número, comuna"><p class="suave">Tu pastor solo verá la dirección cuando acepte visitarte.</p></div>
      <p id="msg" role="alert" hidden></p>
      <button id="venviar" class="btn">Enviar pedido</button>
      <h2 class="sep">Mis pedidos</h2><div id="vmias" aria-live="polite"><p class="suave">Cargando…</p></div>`;
    alVolver();
    const m = $('#vmot'); m.addEventListener('input', () => { $('#vcont').textContent = m.value.length + ' / 300'; });
    const aj = () => { $('#vdirf').hidden = !(['hogar', 'enfermo'].includes($('#vtipo').value)); }; $('#vtipo').addEventListener('change', aj); aj();
    $('#venviar').onclick = async () => {
      const mot = m.value.trim(); if (mot.length < 3) { msg(errTxt('motivo-invalido')); return m.focus(); }
      const tipo = $('#vtipo').value; const b = $('#venviar'); b.disabled = true; b.textContent = 'Enviando…'; msg('');
      const r = await rpcRaw('visita_enviar', { p_codigo: id.codigo, p_clave: id.clave, p_tipo: tipo, p_motivo: mot, p_urgencia: document.querySelector('input[name=vurg]:checked').value, p_horarios: $('#vhor').value, p_telefono: $('#vtel').value, p_direccion: ['hogar', 'enfermo'].includes(tipo) ? $('#vdir').value : '' });
      b.disabled = false; b.textContent = 'Enviar pedido';
      if (!r.ok) return msg(errTxt(r.error));
      const f = primera(r.data);
      if (!f || f.ok !== true) return msg(f && f.razon === 'demasiadas' ? 'Ya tienes 3 pedidos en camino. Cuando tu pastor responda alguno, podrás pedir otro.' : errTxt(f && f.razon));
      m.value = ''; $('#vcont').textContent = '0 / 300'; $('#vdir').value = ''; msg('Pedido enviado. Tu pastor lo va a ver.', true); visitasMias(id);
    };
    visitasMias(id);
  }
  async function visitasMias(id) {
    const caja = $('#vmias'); if (!caja) return;
    const r = await rpcRaw('visita_mias', { p_codigo: id.codigo, p_clave: id.clave });
    if (!r.ok) { caja.innerHTML = `<p class="suave">${esc(errTxt(r.error))}</p>`; return; }
    const l = Array.isArray(r.data) ? r.data : [];
    if (!l.length) { caja.innerHTML = '<p class="suave">Todavía no has pedido ninguna visita. Cuando lo hagas, verás aquí la respuesta de tu pastor.</p>'; return; }
    caja.innerHTML = l.map((v) => `<div class="card item"><p class="suave m0">${esc(TIPOS_VISITA[v.tipo] || 'Visita')}${v.urgencia === 'urgente' ? ' · <b>Urgente</b>' : ''} · ${esc(fecha(v.creado_en))}</p>
      <p>${esc(v.motivo)}</p><p class="m0"><b>${esc(ESTADOS_VISITA[v.estado] || v.estado)}</b>${v.cuando ? ' · 📅 ' + esc(v.cuando) : ''}</p>
      ${v.respuesta ? `<p class="resp">Mensaje de tu pastor: ${esc(v.respuesta)}</p>` : ''}
      <button type="button" class="btn sec chico" data-borrar="${esc(v.id)}">${v.estado === 'realizada' || v.estado === 'no_disponible' ? '🗑️ Borrar' : '✖ Cancelar pedido'}</button></div>`).join('');
    caja.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('¿Quitar este pedido? Tu pastor ya no lo verá en la app.')) return;
      const rb = await rpcRaw('visita_borrar', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.borrar });
      if (!rb.ok) return msg(errTxt(rb.error)); visitasMias(id);
    }));
  }

  function vistaLlave() {
    $('#paso3').innerHTML = `
      <label for="llv">Pega aquí tu llave (empieza con PULPITO-ID-)</label>
      <textarea id="llv" rows="3" autocapitalize="off" spellcheck="false"></textarea>
      <button id="usar" class="btn">Recuperar mi identidad</button>`;
    $('#usar').onclick = async () => {
      let d = null;
      try {
        const limpio = $('#llv').value.trim().replace(/\s+/g, '');
        if (!limpio.startsWith('PULPITO-ID-')) throw 0;
        d = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(limpio.slice(11)), (c) => c.charCodeAt(0))));
      } catch (e) { return error(MOTIVOS['llave-invalida']); }
      if (!d || !/^[A-Z0-9]{6}$/.test(d.c || '') || !/^[0-9a-f]{64}$/.test(d.k || '')) return error(MOTIVOS['llave-invalida']);
      const v = await rpc('miembro_validar', { p_codigo: d.c, p_clave: d.k });
      if (!v.ok) return error(MOTIVOS['sin-internet']);
      if (!v.data || v.data.valido !== true) return error(MOTIVOS['llave-invalida']);
      const p = await rpc('iglesia_perfil', { p_codigo: d.c });
      guardar(K_ID, { codigo: d.c, nombre: v.data.nombre, clave: d.k, creadoEn: new Date().toISOString() });
      guardar(K_IG, { codigo: d.c, nombre: (p.ok && p.data && p.data.nombre) || null });
      vistaIglesia();
    };
  }

  function vistaPalabra() {
    $('#pantalla').innerHTML = `<h1>Palabra</h1><div class="filete"></div>
      <div class="grid">${pronto('📖', 'Leer la Biblia', 'Capítulos para leer en el celular, aun sin internet.')}${pronto('✨', 'Versículo de hoy', 'Una frase para empezar el día.')}</div>`;
  }
  function vistaVida() {
    $('#pantalla').innerHTML = `<h1>Vivir lo que aprendemos</h1><div class="filete"></div>
      <h2>Con Dios y conmigo</h2><div class="grid">${pronto('🕊️', 'Mi oración', 'Tu diario y tus peticiones, solo para ti.')}${pronto('🌱', 'Mi crecimiento', 'Pequeños pasos de cada semana.')}</div>
      <h2 class="sep">Con los demás</h2><div class="grid">${pronto('💡', 'Ideas y proyectos', 'Ideas para servir a tu comunidad.')}</div>`;
  }

  // ---------- Navegación ----------
  const VISTAS = { iglesia: vistaIglesia, palabra: vistaPalabra, vida: vistaVida };
  function ir(tab) {
    document.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    VISTAS[tab](); window.scrollTo(0, 0); $('#pantalla').focus({ preventScroll: true });
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => ir(b.dataset.tab)));
  const red = () => { $('#sinRed').hidden = navigator.onLine; };
  window.addEventListener('online', red); window.addEventListener('offline', red); red();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { /* sin sw: igual funciona */ });
  ir('iglesia');
})();
