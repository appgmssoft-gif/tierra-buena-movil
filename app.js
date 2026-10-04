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

  // ---------- Entrada (F865): portada con 3 caminos claros + instalar ----------
  let promptInstalar = null;
  if (window.addEventListener) window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; document.querySelectorAll('[data-instalar-box]').forEach(pintarInstalar); });
  if (window.addEventListener) window.addEventListener('appinstalled', () => { promptInstalar = null; document.querySelectorAll('[data-instalar-box]').forEach(pintarInstalar); });
  const yaInstalada = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator || {}).standalone === true;
  const NAV = () => (typeof navigator !== 'undefined' && navigator) || {};
  const esIOS = () => /iphone|ipad|ipod/i.test(NAV().userAgent || '') || (NAV().platform === 'MacIntel' && NAV().maxTouchPoints > 1);
  function pintarInstalar(box) {
    if (!box) return;
    if (yaInstalada()) { box.innerHTML = ''; return; }
    if (promptInstalar) {
      box.innerHTML = `<button type="button" class="btn sec" id="instalarYa">📲 Instalar en este ${/ipad|tablet/i.test(NAV().userAgent || '') ? 'dispositivo' : 'teléfono'}</button>`;
      $('#instalarYa').onclick = async () => { try { promptInstalar.prompt(); await promptInstalar.userChoice; } catch (e) { /* nada */ } promptInstalar = null; pintarInstalar(box); };
    } else if (esIOS()) {
      box.innerHTML = `<div class="card ayuda"><b>📲 Dejarla como app:</b> toca <b>Compartir</b> ⬆️ (abajo en Safari) y luego <b>«Agregar a pantalla de inicio»</b>.</div>`;
    } else {
      box.innerHTML = `<p class="suave">📲 Para dejarla como app: menú ⋮ del navegador → <b>«Instalar app»</b> o «Agregar a pantalla de inicio».</p>`;
    }
  }
  const bloqueInstalar = () => '<div data-instalar-box class="sep16"></div>';
  const codigoDeEnlace = () => { try { const q = new URLSearchParams(location.search.slice(1) || location.hash.replace(/^#\??/, '')); const c = (q.get('c') || q.get('codigo') || '').toUpperCase(); return /^[A-Z0-9]{6}$/.test(c) ? c : ''; } catch (e) { return ''; } };

  function vistaUnirse() {
    if (codigoDeEnlace()) return vistaCodigo();            // vino de un enlace con el código de su iglesia
    $('#pantalla').innerHTML = `
      <h1>Bienvenido a Tierra Buena</h1><div class="filete"></div>
      <p>Elige cómo quieres entrar. No necesitas contraseña: tu pastor te acepta y este dispositivo guarda tu llave.</p>
      <div class="grid">
        ${activa('⛪', 'Tengo el código de mi iglesia', 'Tu pastor te lo da. Son 6 letras o números.', 'codigo')}
        ${activa('🔑', 'Ya me uní en otro dispositivo', 'Pega tu llave y entras sin pedir permiso de nuevo.', 'llave')}
        ${activa('📖', 'Solo quiero leer y orar', 'Biblia, versículo del día y Vida y servicio, sin unirte.', 'solo')}
      </div>
      ${bloqueInstalar()}`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ codigo: vistaCodigo, llave: vistaLlave, solo: () => ir('palabra') }[b.dataset.ir]())));
    pintarInstalar($('[data-instalar-box]'));
  }

  function vistaCodigo() {
    const pre = codigoDeEnlace();
    $('#pantalla').innerHTML = `
      <button type="button" class="volver" id="atras">‹ Entrar</button>
      <h1>Mi iglesia</h1><div class="filete"></div>
      <p>Escribe el código que te dio tu pastor. Tu pastor decidirá si te acepta.</p>
      <label for="cod">Código de tu iglesia</label>
      <input id="cod" type="text" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" inputmode="text" placeholder="Ej. AB12CD" value="${esc(pre)}">
      <p id="err" class="error" role="alert" hidden></p>
      <button id="buscar" class="btn">Buscar mi iglesia</button>
      <div id="paso2"></div>`;
    $('#atras').onclick = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ } vistaUnirse(); };
    $('#buscar').onclick = buscarIglesia;
    if (pre) buscarIglesia(); else $('#cod').focus();
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
      <div class="grid">${activa('🧱', 'Muro', 'Peticiones que tu pastor compartió, para orar juntos.', 'muro')}${activa('🌟', 'Acción del mes', 'Lo que viviremos juntos este mes.', 'accion')}</div>
      <h2 class="sep">Mi dispositivo</h2>
      <div class="card"><div class="t"><span aria-hidden="true">🔑</span>Pasar mi iglesia a otro dispositivo</div>
        <p class="suave m0t">Copia tu llave y pégala en tu otro teléfono o tablet, en «Ya me uní en otro dispositivo». Guárdala como una contraseña: quien la tenga entra como tú.</p>
        <button type="button" class="btn sec" id="verLlave">Mostrar mi llave</button>
        <div id="llaveBox" hidden><textarea id="llaveTxt" rows="3" readonly spellcheck="false"></textarea><button type="button" class="btn" id="copiarLlave">📋 Copiar mi llave</button><p id="llaveMsg" class="ok" role="status"></p></div></div>
      ${bloqueInstalar()}
      <button id="salir" class="btn sec sep28">Salir de mi iglesia</button>`;
    pintarInstalar($('[data-instalar-box]'));
    $('#verLlave').onclick = () => {
      let t = ''; try { t = 'PULPITO-ID-' + btoa(JSON.stringify({ c: id.codigo, k: id.clave })); } catch (e) { t = ''; }
      $('#llaveTxt').value = t; $('#llaveBox').hidden = false; $('#verLlave').hidden = true; $('#llaveTxt').focus(); $('#llaveTxt').select();
    };
    $('#copiarLlave').onclick = async () => {
      const t = $('#llaveTxt'); t.select();
      try { await navigator.clipboard.writeText(t.value); $('#llaveMsg').textContent = 'Llave copiada. Ahora pégala en tu otro dispositivo.'; }
      catch (e) { try { document.execCommand('copy'); $('#llaveMsg').textContent = 'Llave copiada.'; } catch (e2) { $('#llaveMsg').textContent = 'Mantén presionado el recuadro y elige «Copiar».'; } }
    };
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ oracion: vistaOracion, muro: vistaMuro, accion: vistaAccion, visita: vistaVisita }[b.dataset.ir] || vistaVisita)(id)));
    $('#salir').onclick = async () => {
      if (!confirm('¿Salir de esta iglesia? Se borrará tu nombre en la iglesia y en este teléfono.')) return;
      await rpc('miembro_eliminar', { p_codigo: id.codigo, p_clave: id.clave });
      borrar(K_ID); borrar(K_SOL); borrar(K_IG); try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ } vistaUnirse();
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
      ${p.aprobada ? `<button type="button" class="btn sec chico" data-contestada="${esc(p.id)}" data-valor="${p.respondida ? '0' : '1'}">${p.respondida ? 'Quitar «contestada»' : '🎉 Marcar como contestada'}</button>` : ''}
      <button type="button" class="btn sec chico" data-borrar="${esc(p.id)}">🗑️ Borrar</button>
      ${p.respondida && p.respuesta !== undefined ? `<div class="respuesta"><label for="resp_${esc(p.id)}"><b>🎉 Cómo respondió Dios</b> <span class="suave">(solo lo ves tú)</span></label><textarea id="resp_${esc(p.id)}" rows="2" maxlength="400" placeholder="Si quieres, escribe aquí cómo viste la respuesta.">${esc(p.respuesta || '')}</textarea><button type="button" class="btn sec chico" data-guardarresp="${esc(p.id)}">Guardar</button></div>` : ''}</div>`).join('');
    caja.querySelectorAll('[data-contestada]').forEach((b) => b.addEventListener('click', async () => {
      const rr = await rpcRaw('peticion_respondida', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.contestada, p_valor: b.dataset.valor === '1' });
      if (!rr.ok) return msg(errTxt(rr.error)); msg(''); oracionesMias(id);
    }));
    caja.querySelectorAll('[data-guardarresp]').forEach((b) => b.addEventListener('click', async () => {
      const t = $('#resp_' + b.dataset.guardarresp);
      const rg = await rpcRaw('peticion_respuesta', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.guardarresp, p_texto: t ? t.value : '' });
      if (!rg.ok || primera(rg.data) === false) return msg(errTxt(rg.error || 'error')); msg('Guardado.', true);
    }));
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

  // ---------- Acción del mes (MOV2d) ----------
  // Igual que accion-mes.js del escritorio: el tema lo define el pastor (accion_mes_iglesia_leer); si no hay,
  // se usa el catalogo general de 12 meses (accion_mes.json). Mis acciones y "como me fue" quedan SOLO en este
  // telefono (sin cuenta); la copia al diario personal llega cuando exista "Mi crecimiento" en el movil.
  const K_ACC = 'tb_movil_accion_mes', K_ACCIG = 'tb_movil_accion_iglesia';
  const claveMes = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const accTodas = () => { const l = leer(K_ACC); return Array.isArray(l) ? l : []; };
  const accGuardar = (l) => guardar(K_ACC, l.slice(-200));
  async function temaDelMes(id) {
    const r = await rpcRaw('accion_mes_iglesia_leer', { p_codigo: id.codigo });
    if (r.ok) {
      const f = primera(r.data);
      if (f && f.tema) { const t = { tema: f.tema, descripcion: f.descripcion || '', referencia: f.referencia || '', formas: f.formas || [], iglesia: true }; guardar(K_ACCIG, t); return t; }
      borrar(K_ACCIG);   // el pastor no tiene una definida: manda el catalogo general
    } else { const copia = leer(K_ACCIG); if (copia && copia.tema) return copia; }   // sin internet: la ultima copia
    try {
      const res = await fetch('accion_mes.json'); const cat = await res.json();
      const m = cat && cat[String(new Date().getMonth() + 1)];
      return m ? { tema: m.tema, descripcion: m.descripcion || '', referencia: m.referencia || '', formas: m.formas || [], iglesia: false } : null;
    } catch (e) { return null; }
  }
  function vistaAccion(id) {
    $('#pantalla').innerHTML = `${volver()}<h1>Acción del mes</h1><div class="filete"></div>
      <div id="amtema"><p class="suave">Cargando…</p></div>
      <h2 class="sep">Mis acciones de este mes</h2>
      <p id="msg" role="alert" hidden></p>
      <div id="amlista" aria-live="polite"></div>
      <button type="button" id="amagregar" class="btn sec" hidden>+ Agregar otra acción</button>
      <div id="amform" hidden>
        <label for="amnuevo">Ponle un título corto a tu acción</label>
        <input id="amnuevo" type="text" maxlength="80" placeholder="Ej. Visitar a una vecina">
        <button type="button" id="amok" class="btn">Guardar acción</button>
      </div>`;
    alVolver();
    accionCargar(id);
  }
  async function accionCargar(id) {
    const t = await temaDelMes(id); const caja = $('#amtema'); if (!caja) return;
    if (!t) { caja.innerHTML = `<p class="suave">${esc(errTxt('sin-internet'))}</p>`; return; }
    const mes = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    caja.innerHTML = `<div class="card"><p class="suave m0 mayus">${esc(mes)}${t.iglesia ? ' · 🌟 Esto es lo que vive tu iglesia' : ''}</p>
      <h2 class="m0t">${esc(t.tema)}</h2><p>${esc(t.descripcion)}</p>
      ${t.referencia ? `<p class="m0"><b>📖 Para leer:</b> ${esc(t.referencia)}</p>` : ''}
      ${t.formas.length ? `<h3 class="sep">Formas de vivirla</h3><ul class="formas">${t.formas.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}</div>`;
    // La accion por defecto (vivir el tema del mes) se crea sola, una vez por mes.
    const clave = claveMes(); let todas = accTodas();
    if (!todas.some((x) => x.mes === clave && x.esDefault)) { todas.push({ id: 'a' + Date.now().toString(36), mes: clave, titulo: t.tema, comoMeFue: '', esDefault: true, fecha: new Date().toISOString() }); accGuardar(todas); }
    $('#amagregar').hidden = false;
    $('#amagregar').onclick = () => { const f = $('#amform'); f.hidden = !f.hidden; if (!f.hidden) $('#amnuevo').focus(); };
    $('#amok').onclick = () => {
      const titulo = $('#amnuevo').value.trim();
      if (!titulo) return msg('Ponle un título corto a tu acción para poder guardarla.');
      const l = accTodas(); l.push({ id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), mes: claveMes(), titulo: titulo.slice(0, 80), comoMeFue: '', esDefault: false, fecha: new Date().toISOString() });
      accGuardar(l); $('#amnuevo').value = ''; $('#amform').hidden = true; msg(''); accionPintar();
    };
    accionPintar();
  }
  function accionPintar() {
    const caja = $('#amlista'); if (!caja) return;
    const mias = accTodas().filter((x) => x.mes === claveMes()).sort((a, b) => (!!b.esDefault - !!a.esDefault) || (new Date(a.fecha) - new Date(b.fecha)));
    caja.innerHTML = mias.map((a) => `<div class="card item"><div class="fila"><b>${a.esDefault ? '🌟 ' : '✚ '}${esc(a.titulo)}</b>${a.esDefault ? '' : `<button type="button" class="btn sec chico" data-amdel="${esc(a.id)}" aria-label="Eliminar acción">🗑️</button>`}</div>
      <label class="suave" for="amt_${esc(a.id)}">¿Cómo te fue con esto? Cuéntalo en pocas palabras.</label>
      <textarea id="amt_${esc(a.id)}" rows="3" maxlength="600" placeholder="Escribe cómo te fue…">${esc(a.comoMeFue || '')}</textarea>
      <button type="button" class="btn chico" data-amsave="${esc(a.id)}">✍️ Guardar cómo me fue</button></div>`).join('');
    caja.querySelectorAll('[data-amsave]').forEach((b) => b.addEventListener('click', () => {
      const texto = ($('#amt_' + b.dataset.amsave).value || '').trim();
      if (!texto) return msg('Cuéntanos algo antes de guardar, aunque sea breve.');
      const l = accTodas(); const it = l.find((x) => x.id === b.dataset.amsave); if (!it) return;
      it.comoMeFue = texto.slice(0, 600); accGuardar(l); msg('Guardado en este teléfono.', true);
    }));
    caja.querySelectorAll('[data-amdel]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta acción?')) return;
      accGuardar(accTodas().filter((x) => x.id !== b.dataset.amdel)); msg(''); accionPintar();
    }));
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
    $('#pantalla').innerHTML = `
      <button type="button" class="volver" id="atras">‹ Entrar</button>
      <h1>Entrar con mi llave</h1><div class="filete"></div>
      <p>En tu otro dispositivo, abre <b>Mi iglesia</b> → «Pasar mi iglesia a otro dispositivo», copia la llave y pégala aquí.</p>
      <label for="llv">Tu llave (empieza con PULPITO-ID-)</label>
      <textarea id="llv" rows="3" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
      <button id="pegar" class="btn sec" hidden>📋 Pegar desde el portapapeles</button>
      <p id="err" class="error" role="alert" hidden></p>
      <button id="usar" class="btn">Recuperar mi identidad</button>`;
    $('#atras').onclick = vistaUnirse;
    if (navigator.clipboard && navigator.clipboard.readText) {
      $('#pegar').hidden = false;
      $('#pegar').onclick = async () => { try { $('#llv').value = (await navigator.clipboard.readText()).trim(); } catch (e) { error('No pude leer el portapapeles. Mantén presionado el recuadro y elige «Pegar».'); } };
    }
    $('#usar').onclick = async () => {
      let d = null; error('');
      try {
        const limpio = $('#llv').value.trim().replace(/\s+/g, '');
        if (!limpio.startsWith('PULPITO-ID-')) throw 0;
        d = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(limpio.slice(11)), (c) => c.charCodeAt(0))));
      } catch (e) { return error(MOTIVOS['llave-invalida']); }
      if (!d || !/^[A-Z0-9]{6}$/.test(d.c || '') || !/^[0-9a-f]{64}$/.test(d.k || '')) return error(MOTIVOS['llave-invalida']);
      const bu = $('#usar'); bu.disabled = true; bu.textContent = 'Revisando…';
      const v = await rpc('miembro_validar', { p_codigo: d.c, p_clave: d.k });
      bu.disabled = false; bu.textContent = 'Recuperar mi identidad';
      if (!v.ok) return error(MOTIVOS['sin-internet']);
      if (!v.data || v.data.valido !== true) return error(MOTIVOS['llave-invalida']);
      const p = await rpc('iglesia_perfil', { p_codigo: d.c });
      guardar(K_ID, { codigo: d.c, nombre: v.data.nombre, clave: d.k, creadoEn: new Date().toISOString() });
      guardar(K_IG, { codigo: d.c, nombre: (p.ok && p.data && p.data.nombre) || null });
      vistaIglesia();
    };
  }

  // ---------- Palabra (MOV3): Biblia RV1909 por libro + versiculo de hoy ----------
  // Los libros viven en biblia/<COD>.json (herramientas/generar-biblia-movil.js). Se bajan de a uno y quedan
  // guardados por el service worker: lo que ya leiste abre sin internet.
  const LIBROS = [['GEN','Génesis',50],['EXO','Éxodo',40],['LEV','Levítico',27],['NUM','Números',36],['DEU','Deuteronomio',34],['JOS','Josué',24],['JDG','Jueces',21],['RUT','Rut',4],['1SA','1 Samuel',31],['2SA','2 Samuel',24],['1KI','1 Reyes',22],['2KI','2 Reyes',25],['1CH','1 Crónicas',29],['2CH','2 Crónicas',36],['EZR','Esdras',10],['NEH','Nehemías',13],['EST','Ester',10],['JOB','Job',42],['PSA','Salmos',150],['PRO','Proverbios',31],['ECC','Eclesiastés',12],['SNG','Cantares',8],['ISA','Isaías',66],['JER','Jeremías',52],['LAM','Lamentaciones',5],['EZK','Ezequiel',48],['DAN','Daniel',12],['HOS','Oseas',14],['JOL','Joel',3],['AMO','Amós',9],['OBA','Abdías',1],['JON','Jonás',4],['MIC','Miqueas',7],['NAM','Nahúm',3],['HAB','Habacuc',3],['ZEP','Sofonías',3],['HAG','Hageo',2],['ZEC','Zacarías',14],['MAL','Malaquías',4],['MAT','Mateo',28],['MRK','Marcos',16],['LUK','Lucas',24],['JHN','Juan',21],['ACT','Hechos',28],['ROM','Romanos',16],['1CO','1 Corintios',16],['2CO','2 Corintios',13],['GAL','Gálatas',6],['EPH','Efesios',6],['PHP','Filipenses',4],['COL','Colosenses',4],['1TH','1 Tesalonicenses',5],['2TH','2 Tesalonicenses',3],['1TI','1 Timoteo',6],['2TI','2 Timoteo',4],['TIT','Tito',3],['PHM','Filemón',1],['HEB','Hebreos',13],['JAS','Santiago',5],['1PE','1 Pedro',5],['2PE','2 Pedro',3],['1JN','1 Juan',5],['2JN','2 Juan',1],['3JN','3 Juan',1],['JUD','Judas',1],['REV','Apocalipsis',22]];
  const K_BIB = 'tb_movil_biblia_ultimo', K_BIBTAM = 'tb_movil_biblia_tam';
  const libroInfo = (cod) => LIBROS.find((l) => l[0] === cod);
  const bibCache = {};
  async function libroCargar(cod) {
    if (bibCache[cod]) return bibCache[cod];
    const r = await fetch('biblia/' + cod + '.json'); if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json(); if (!Array.isArray(d)) throw new Error('formato'); return (bibCache[cod] = d);
  }
  const SIN_LIBRO = 'No pudimos abrir este libro. Revisa tu internet: lo que ya leíste antes se abre sin conexión.';
  function vistaPalabra() {
    const ult = leer(K_BIB), inf = ult && libroInfo(ult.cod);
    $('#pantalla').innerHTML = `<h1>Palabra</h1><div class="filete"></div>
      <div class="grid">${inf ? activa('▶️', 'Seguir leyendo', esc(inf[1]) + ' ' + Number(ult.cap) + ' · donde te quedaste', 'seguir') : ''}${activa('📖', 'Leer la Biblia', 'Reina-Valera 1909. Los libros que lees quedan para leer sin internet.', 'biblia')}${activa('✨', 'Versículo de hoy', 'Una frase para empezar el día.', 'versiculo')}</div>`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ir;
      if (k === 'biblia') vistaBiblia(); else if (k === 'versiculo') vistaVersiculo(); else if (k === 'seguir' && inf) vistaCapitulo(ult.cod, Number(ult.cap));
    }));
  }
  const volverA = (txt, fn) => { const b = $('#volver'); if (b) { b.textContent = '‹ ' + txt; b.onclick = fn; } };
  function vistaBiblia() {
    const fila = (l) => `<button type="button" class="libro" data-libro="${l[0]}">${esc(l[1])}</button>`;
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Palabra</button><h1>Biblia</h1><div class="filete"></div>
      <h2>Antiguo Testamento</h2><div class="libros">${LIBROS.slice(0, 39).map(fila).join('')}</div>
      <h2 class="sep">Nuevo Testamento</h2><div class="libros">${LIBROS.slice(39).map(fila).join('')}</div>
      <p class="suave sep">Reina-Valera 1909 · Dominio público</p>`;
    volverA('Palabra', vistaPalabra);
    document.querySelectorAll('[data-libro]').forEach((b) => b.addEventListener('click', () => vistaLibro(b.dataset.libro)));
  }
  function vistaLibro(cod) {
    const inf = libroInfo(cod); if (!inf) return vistaBiblia();
    let c = ''; for (let i = 1; i <= inf[2]; i++) c += `<button type="button" class="cap" data-cap="${i}">${i}</button>`;
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Biblia</button><h1>${esc(inf[1])}</h1><div class="filete"></div>
      <p class="suave">${inf[2] === 1 ? 'Tiene un solo capítulo.' : 'Elige un capítulo.'}</p><div class="caps">${c}</div>`;
    volverA('Biblia', vistaBiblia);
    document.querySelectorAll('[data-cap]').forEach((b) => b.addEventListener('click', () => vistaCapitulo(cod, Number(b.dataset.cap))));
  }
  async function vistaCapitulo(cod, cap) {
    const inf = libroInfo(cod); if (!inf) return vistaBiblia();
    cap = Math.min(Math.max(1, Number(cap) || 1), inf[2]);
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ ${esc(inf[1])}</button><h1>${esc(inf[1])} ${cap}</h1><div class="filete"></div><p class="suave" id="bibmsg">Cargando…</p>`;
    volverA(inf[1], () => vistaLibro(cod));
    let libro; try { libro = await libroCargar(cod); } catch (e) { const m = $('#bibmsg'); if (m) m.textContent = SIN_LIBRO; return; }
    const versos = libro[cap - 1]; const m = $('#bibmsg'); if (!versos || !m) return;
    guardar(K_BIB, { cod, cap });
    const tam = Math.min(30, Math.max(16, Number(leer(K_BIBTAM)) || 18));
    const idx = LIBROS.findIndex((l) => l[0] === cod);
    const ant = cap > 1 ? [cod, cap - 1] : (idx > 0 ? [LIBROS[idx - 1][0], LIBROS[idx - 1][2]] : null);
    const sig = cap < inf[2] ? [cod, cap + 1] : (idx < LIBROS.length - 1 ? [LIBROS[idx + 1][0], 1] : null);
    const nombre = (x) => libroInfo(x[0])[1] + ' ' + x[1];
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ ${esc(inf[1])}</button><h1>${esc(inf[1])} ${cap}</h1><div class="filete"></div>
      <div class="tamano" role="group" aria-label="Tamaño de la letra"><button type="button" class="btn sec chico" id="menos" aria-label="Letra más chica">A−</button><button type="button" class="btn sec chico" id="mas" aria-label="Letra más grande">A+</button></div>
      <div class="lectura" id="lectura" style="font-size:${tam}px">${versos.map((t, i) => `<p class="vers"><sup>${i + 1}</sup> ${esc(t)}</p>`).join('')}</div>
      <div class="navcap">${ant ? `<button type="button" class="btn sec chico" id="ant">‹ ${esc(nombre(ant))}</button>` : '<span></span>'}${sig ? `<button type="button" class="btn chico" id="sig">${esc(nombre(sig))} ›</button>` : ''}</div>`;
    volverA(inf[1], () => vistaLibro(cod));
    const cambiarTam = (d) => { const n = Math.min(30, Math.max(16, (Number(leer(K_BIBTAM)) || 18) + d)); guardar(K_BIBTAM, n); $('#lectura').style.fontSize = n + 'px'; };
    $('#menos').onclick = () => cambiarTam(-2); $('#mas').onclick = () => cambiarTam(2);
    if (ant) $('#ant').onclick = () => vistaCapitulo(ant[0], ant[1]);
    if (sig) $('#sig').onclick = () => vistaCapitulo(sig[0], sig[1]);
    window.scrollTo(0, 0);
  }
  // Una cita distinta cada dia del año (estable durante el dia), las mismas que usa el escritorio.
  const VERSICULOS = ['JHN.3.16', 'PSA.23.1', 'PHP.4.13', 'JER.29.11', 'ROM.8.28', 'ISA.41.10', 'PRO.3.5', 'PSA.121.1', 'MAT.11.28', 'JOS.1.9', 'PSA.46.1', 'ROM.12.2', 'GAL.5.22', 'MAT.6.33', 'PRO.16.3', 'ISA.40.31', 'PSA.119.105', '1CO.13.4', 'EPH.2.8', 'HEB.11.1', 'JAS.1.5', '1PE.5.7', 'PSA.37.4', 'LAM.3.22', 'MIC.6.8', 'COL.3.23', 'JHN.14.6', 'PSA.27.1', 'MAT.5.16', '2TI.1.7', 'ROM.5.8'];
  function versiculoDeHoy(hoy) {
    const dia = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
    const [cod, cap, v] = VERSICULOS[dia % VERSICULOS.length].split('.'); return { cod, cap: Number(cap), v: Number(v) };
  }
  async function vistaVersiculo() {
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Palabra</button><h1>Versículo de hoy</h1><div class="filete"></div><div id="vhoy"><p class="suave">Cargando…</p></div>`;
    volverA('Palabra', vistaPalabra);
    const r = versiculoDeHoy(new Date()), inf = libroInfo(r.cod); let texto = '';
    try { texto = ((await libroCargar(r.cod))[r.cap - 1] || [])[r.v - 1] || ''; } catch (e) { texto = ''; }
    const caja = $('#vhoy'); if (!caja) return;
    if (!texto) { caja.innerHTML = `<div class="card"><p>«Jehová es mi pastor; nada me faltará.»</p><p class="suave m0">Salmos 23:1</p></div><p class="suave">${esc(SIN_LIBRO)}</p>`; return; }
    const cita = inf[1] + ' ' + r.cap + ':' + r.v;
    caja.innerHTML = `<div class="card versiculo"><p class="vgrande">«${esc(texto)}»</p><p class="suave m0"><b>${esc(cita)}</b></p></div>
      <button type="button" class="btn" id="vcomp">Compartir</button><button type="button" class="btn sec" id="vleer">Leer el capítulo</button>`;
    $('#vleer').onclick = () => vistaCapitulo(r.cod, r.cap);
    $('#vcomp').onclick = async () => {
      const t = '«' + texto + '» — ' + cita;
      try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); $('#vcomp').textContent = 'Copiado ✓'; } } catch (e) { /* se cerro el menu de compartir */ }
    };
  }
  // ---------- Vida y servicio (MOV4) ----------
  // Todo lo personal (diario de oracion, pasos de crecimiento, ideas favoritas) queda SOLO en este telefono.
  // Los textos de ideas viven en datos/*.json (copias de src/data/crecimiento_ideas.json y servicio_ideas.json).
  const K_MIORACION = 'tb_movil_mi_oracion', K_CREC = 'tb_movil_crecimiento', K_FAV = 'tb_movil_ideas_fav';
  const lista = (k) => { const l = leer(k); return Array.isArray(l) ? l : []; };
  const nuevoId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const cabecera = (titulo, atras) => `<button type="button" class="volver" id="volver">‹ ${esc(atras)}</button><h1>${esc(titulo)}</h1><div class="filete"></div>`;
  const datosCache = {};
  async function datoCargar(nombre) {
    if (datosCache[nombre]) return datosCache[nombre];
    const r = await fetch('datos/' + nombre + '.json'); if (!r.ok) throw new Error('http ' + r.status);
    return (datosCache[nombre] = await r.json());
  }
  const SIN_DATOS = 'No pudimos abrir esto. Revisa tu internet: lo que ya abriste antes se ve sin conexión.';
  const semanaClave = (d = new Date()) => {   // semana ISO (lunes a domingo): 2026-S40
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-S' + String(Math.ceil(((t - ini) / 86400000 + 1) / 7)).padStart(2, '0');
  };
  function vistaVida() {
    $('#pantalla').innerHTML = `<h1>Vivir lo que aprendemos</h1><div class="filete"></div>
      <h2>Con Dios y conmigo</h2><div class="grid">${activa('🕊️', 'Mi oración', 'Tu diario de peticiones, solo para ti.', 'mioracion')}${activa('🌱', 'Mi crecimiento', 'Pequeños pasos de cada semana.', 'crecimiento')}${activa('🧠', 'Salud mental', 'Respirar, un chequeo y dónde pedir ayuda.', 'salud')}</div>
      <h2 class="sep">Con los demás</h2><div class="grid">${activa('💡', 'Ideas y proyectos', 'Ideas para servir a tu comunidad.', 'ideas')}${activa('🧰', 'Proyectos listos', 'Ya pensados: lugar, presupuesto y personas.', 'proyectos')}</div>
      <h2 class="sep">Para aprender</h2><div class="grid">${activa('🎓', 'Aprender', 'Cursos gratuitos en internet para servir mejor, con tu avance.', 'aprender')}</div>`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ mioracion: vistaMiOracion, crecimiento: vistaCrecimiento, ideas: vistaIdeas, salud: vistaSalud, proyectos: vistaProyectos, aprender: vistaAprender }[b.dataset.ir] || vistaVida)()));
  }

  // --- Mi oración: diario personal (no se envia a nadie) ---
  function vistaMiOracion() {
    $('#pantalla').innerHTML = `${cabecera('Mi oración', 'Vivir lo que aprendemos')}
      <p class="suave">Escribe lo que quieras pedirle a Dios. Esto queda solo en tu teléfono; nadie más lo ve.</p>
      <p id="msg" role="alert" hidden></p>
      <label for="motxt">¿Por qué quieres orar?</label><textarea id="motxt" rows="3" maxlength="600" placeholder="Escribe aquí tu petición…"></textarea>
      <button type="button" class="btn" id="moadd">Guardar en mi diario</button><div id="molista" aria-live="polite"></div>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    $('#moadd').onclick = () => {
      const t = $('#motxt').value.trim(); if (!t) return msg('Escribe algo antes de guardar.');
      const l = lista(K_MIORACION); l.push({ id: nuevoId(), texto: t.slice(0, 600), fecha: new Date().toISOString(), contestada: false, respuesta: '' });
      guardar(K_MIORACION, l.slice(-300)); $('#motxt').value = ''; msg(''); miOracionPintar();
    };
    miOracionPintar();
  }
  function miOracionPintar() {
    const caja = $('#molista'); if (!caja) return;
    const l = lista(K_MIORACION).slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    if (!l.length) { caja.innerHTML = '<p class="suave sep">Todavía no hay nada en tu diario.</p>'; return; }
    caja.innerHTML = l.map((p) => `<div class="card item"><p class="m0">${esc(p.texto)}</p>
      <p class="suave m0">${esc(fecha(p.fecha))}${p.contestada ? ' · 🎉 Dios respondió' : ''}</p>
      <button type="button" class="btn sec chico" data-mocont="${esc(p.id)}">${p.contestada ? 'Quitar «contestada»' : '🎉 Marcar como contestada'}</button>
      <button type="button" class="btn sec chico" data-model="${esc(p.id)}">🗑️ Borrar</button>
      ${p.contestada ? `<div class="respuesta"><label for="mor_${esc(p.id)}"><b>🎉 Cómo respondió Dios</b></label><textarea id="mor_${esc(p.id)}" rows="2" maxlength="400" placeholder="Si quieres, escribe cómo viste la respuesta.">${esc(p.respuesta || '')}</textarea><button type="button" class="btn sec chico" data-mogr="${esc(p.id)}">Guardar</button></div>` : ''}</div>`).join('');
    const cambiar = (id, f) => { const todas = lista(K_MIORACION); const it = todas.find((x) => x.id === id); if (it) { f(it); guardar(K_MIORACION, todas); } };
    caja.querySelectorAll('[data-mocont]').forEach((b) => b.addEventListener('click', () => { cambiar(b.dataset.mocont, (it) => { it.contestada = !it.contestada; }); msg(''); miOracionPintar(); }));
    caja.querySelectorAll('[data-mogr]').forEach((b) => b.addEventListener('click', () => { const t = $('#mor_' + b.dataset.mogr); cambiar(b.dataset.mogr, (it) => { it.respuesta = (t ? t.value : '').trim().slice(0, 400); }); msg('Guardado en este teléfono.', true); }));
    caja.querySelectorAll('[data-model]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('¿Borrar esta petición de tu diario?')) return;
      guardar(K_MIORACION, lista(K_MIORACION).filter((x) => x.id !== b.dataset.model)); msg(''); miOracionPintar();
    }));
  }

  // --- Mi crecimiento: una idea pequeña por semana ---
  const AREAS = [['amor_propio', '💛', 'Cuidarme'], ['medio_ambiente', '🌎', 'Cuidar lo creado'], ['devocional', '🕯️', 'Mi tiempo con Dios']];
  async function vistaCrecimiento() {
    const sem = semanaClave(), todos = lista(K_CREC), actual = todos.find((x) => x.sem === sem);
    const antes = todos.filter((x) => x.sem !== sem).sort((a, b) => b.sem.localeCompare(a.sem)).slice(0, 6);
    $('#pantalla').innerHTML = `${cabecera('Mi crecimiento', 'Vivir lo que aprendemos')}
      <h2>Mi paso de esta semana</h2><p id="msg" role="alert" hidden></p>
      ${actual ? `<div class="card item"><p class="m0"><b>${esc(actual.icono || '🌱')} ${esc(actual.titulo)}</b></p>
          <label for="crnota">¿Cómo te fue con esto? Cuéntalo en pocas palabras.</label><textarea id="crnota" rows="3" maxlength="600" placeholder="Escribe cómo te fue…">${esc(actual.nota || '')}</textarea>
          <button type="button" class="btn chico" id="crsave">✍️ Guardar cómo me fue</button></div>`
        : '<p class="suave">Todavía no elegiste un paso para esta semana. Elige una idea abajo y pruébala con calma: uno pequeño basta.</p>'}
      <h2 class="sep">${actual ? 'Cambiar mi paso' : 'Elegir una idea'}</h2>
      <div class="grid">${AREAS.map((a) => activa(a[1], a[2], 'Ideas sencillas para empezar.', a[0])).join('')}</div>
      ${antes.length ? `<h2 class="sep">Mis pasos anteriores</h2>${antes.map((x) => `<div class="card item"><p class="m0"><b>${esc(x.icono || '🌱')} ${esc(x.titulo)}</b></p><p class="suave m0">Semana ${esc(x.sem.replace('-S', ' · S'))}</p>${x.nota ? `<p class="m0t">${esc(x.nota)}</p>` : ''}</div>`).join('')}` : ''}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => vistaAreaCrec(b.dataset.ir)));
    if (actual) $('#crsave').onclick = () => {
      const t = $('#crnota').value.trim(); if (!t) return msg('Cuéntanos algo antes de guardar, aunque sea breve.');
      const l = lista(K_CREC); const it = l.find((x) => x.sem === sem); if (it) { it.nota = t.slice(0, 600); guardar(K_CREC, l); msg('Guardado en este teléfono.', true); }
    };
  }
  async function vistaAreaCrec(area) {
    const inf = AREAS.find((a) => a[0] === area); if (!inf) return vistaCrecimiento();
    $('#pantalla').innerHTML = `${cabecera(inf[2], 'Mi crecimiento')}<p class="suave" id="armsg">Cargando…</p>`;
    volverA('Mi crecimiento', vistaCrecimiento);
    let d; try { d = (await datoCargar('crecimiento_ideas'))[area]; } catch (e) { d = null; }
    const m = $('#armsg'); if (!m) return; if (!d) { m.textContent = SIN_DATOS; return; }
    $('#pantalla').innerHTML = `${cabecera(inf[2], 'Mi crecimiento')}<p>${esc(d.intro)}</p><p class="suave">${esc(d.aviso)}</p>
      <div class="grid">${d.ideas.map((i) => `<button type="button" class="card" data-idea="${esc(i.id)}"><div class="t"><span aria-hidden="true">${esc(i.icono)}</span>${esc(i.titulo)}<span class="flecha" aria-hidden="true">›</span></div></button>`).join('')}</div>`;
    volverA('Mi crecimiento', vistaCrecimiento);
    document.querySelectorAll('[data-idea]').forEach((b) => b.addEventListener('click', () => vistaIdeaCrec(area, d.ideas.find((i) => i.id === b.dataset.idea))));
  }
  function vistaIdeaCrec(area, i) {
    if (!i) return vistaAreaCrec(area);
    $('#pantalla').innerHTML = `${cabecera(i.titulo, 'Atrás')}<p id="msg" role="alert" hidden></p>
      <div class="card"><p class="m0t">${esc(i.resumen)}</p><ul class="formas">${(i.puntos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${i.versiculo ? `<p class="suave"><b>📖 Para leer:</b> ${esc(i.versiculo)}</p>` : ''}</div>
      <button type="button" class="btn" id="probar">🌱 Probar esta semana</button>`;
    volverA('Atrás', () => vistaAreaCrec(area));
    $('#probar').onclick = () => {
      const sem = semanaClave(), l = lista(K_CREC).filter((x) => x.sem !== sem);
      l.push({ sem, area, ideaId: i.id, icono: i.icono, titulo: i.titulo, nota: '' }); guardar(K_CREC, l.slice(-60)); vistaCrecimiento();
    };
  }

  // --- Ideas y proyectos para servir ---
  let ideasFiltro = 'todas';
  async function vistaIdeas() {
    $('#pantalla').innerHTML = `${cabecera('Ideas y proyectos', 'Vivir lo que aprendemos')}<p class="suave" id="idmsg">Cargando…</p>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    let d; try { d = await datoCargar('servicio_ideas'); } catch (e) { d = null; }
    const m = $('#idmsg'); if (!m) return; if (!d) { m.textContent = SIN_DATOS; return; }
    const fav = lista(K_FAV);
    const chips = [['todas', '', 'Todas'], ['fav', '⭐', 'Mis ideas']].concat(d.categorias.map((c) => [c.id, c.icono, c.label]));
    const ideas = d.ideas.filter((i) => ideasFiltro === 'todas' || (ideasFiltro === 'fav' ? fav.includes(i.id) : i.categoria === ideasFiltro));
    $('#pantalla').innerHTML = `${cabecera('Ideas y proyectos', 'Vivir lo que aprendemos')}
      <p class="suave">Ideas para servir a tu comunidad. Toca una para ver cómo empezar.</p>
      <div class="chips" role="group" aria-label="Filtrar por tema">${chips.map((c) => `<button type="button" class="chip${ideasFiltro === c[0] ? ' on' : ''}" data-filtro="${esc(c[0])}" aria-pressed="${ideasFiltro === c[0]}">${c[1] ? esc(c[1]) + ' ' : ''}${esc(c[2])}</button>`).join('')}</div>
      ${ideas.length ? ideas.map((i) => `<button type="button" class="card item" data-ideaserv="${esc(i.id)}"><div class="t"><span aria-hidden="true">${esc(i.icono)}</span>${esc(i.titulo)}${fav.includes(i.id) ? ' ⭐' : ''}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${esc(i.personas)} · ${esc(i.costo)}</p></button>`).join('') : '<p class="suave sep">Todavía no marcaste ninguna idea con ⭐.</p>'}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => { ideasFiltro = b.dataset.filtro; vistaIdeas(); }));
    document.querySelectorAll('[data-ideaserv]').forEach((b) => b.addEventListener('click', () => vistaIdeaServ(d.ideas.find((i) => i.id === b.dataset.ideaserv))));
  }
  function vistaIdeaServ(i) {
    if (!i) return vistaIdeas();
    const marcada = () => lista(K_FAV).includes(i.id);
    $('#pantalla').innerHTML = `${cabecera(i.titulo, 'Ideas y proyectos')}
      <div class="card"><p class="m0t">${esc(i.queEs)}</p><h3 class="sep">Cómo empezar</h3><ol class="formas">${(i.comoEmpezar || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <p class="suave"><b>👥 Personas:</b> ${esc(i.personas)} · <b>💰 Costo:</b> ${esc(i.costo)}</p></div>
      <button type="button" class="btn sec" id="fav"></button>`;
    volverA('Ideas y proyectos', vistaIdeas);
    const pintar = () => { $('#fav').textContent = marcada() ? '⭐ Quitar de mis ideas' : '☆ Me interesa'; };
    $('#fav').onclick = () => { const l = lista(K_FAV).filter((x) => x !== i.id); if (!marcada()) l.push(i.id); guardar(K_FAV, l); pintar(); };
    pintar();
  }

  // ---------- Salud mental y Proyectos listos (MOV5) ----------
  // Textos de datos/salud_mental_*.json y datos/servicio_proyectos_listos.json (copias de src/data/). El chequeo NO se guarda.
  const telDe = (n) => 'tel:' + String(n).split(',')[0].replace(/[^\d*#]/g, '').replace(/\*/g, '%2A');
  const lineasAyuda = (a) => `<div class="card ayuda"><p class="m0"><b>🆘 ${esc(a.urgente)}</b></p><ul class="lineas">${(a.lineas || []).map((l) => `<li><a class="btn chico tel" href="${telDe(l.numero)}">📞 ${esc(l.numero)}</a> <b>${esc(l.nombre)}</b><br><span class="suave">${esc(l.detalle)}</span></li>`).join('')}</ul><p class="suave m0">${esc(a.otroPais || '')}</p></div>`;
  let respSesion = 0;
  async function vistaSalud() {
    respSesion++;
    $('#pantalla').innerHTML = `${cabecera('Salud mental', 'Vivir lo que aprendemos')}<p class="suave" id="smmsg">Cargando…</p>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    let q, h; try { q = await datoCargar('salud_mental_que_es'); h = await datoCargar('salud_mental_herramientas'); } catch (e) { q = null; }
    const m = $('#smmsg'); if (!m) return; if (!q || !h) { m.textContent = SIN_DATOS; return; }
    $('#pantalla').innerHTML = `${cabecera('Salud mental', 'Vivir lo que aprendemos')}<p class="suave">${esc(q.aviso)}</p>
      ${lineasAyuda(q.ayuda)}
      <h2 class="sep">Para cuidarme</h2><div class="grid">${activa('🫁', esc(h.respiracion.titulo), 'Para volver a la calma.', 'respirar')}${activa('📝', esc(h.chequeo.titulo), 'No se guarda nada.', 'chequeo')}</div>
      <h2 class="sep">Para entender</h2><div class="grid">${q.tarjetas.map((t) => activa(esc(t.icono), esc(t.titulo), esc(t.resumen), 'sm_' + t.id)).join('')}</div>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ir;
      if (k === 'respirar') vistaRespirar(h.respiracion); else if (k === 'chequeo') vistaChequeo(h.chequeo, q.ayuda);
      else vistaTarjetaSalud(q.tarjetas.find((t) => 'sm_' + t.id === k), q.ayuda);
    }));
  }
  function vistaTarjetaSalud(t, ayuda) {
    if (!t) return vistaSalud();
    $('#pantalla').innerHTML = `${cabecera(t.titulo, 'Salud mental')}<div class="card"><p class="m0t">${esc(t.resumen)}</p><ul class="formas">${(t.puntos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${t.paraPensar ? `<p class="sep"><b>💭 Para pensar:</b> ${esc(t.paraPensar)}</p>` : ''}</div>${t.mostrarLineas ? lineasAyuda(ayuda) : ''}`;
    volverA('Salud mental', vistaSalud);
  }
  function vistaRespirar(r) {
    const mi = ++respSesion;
    $('#pantalla').innerHTML = `${cabecera(r.titulo, 'Salud mental')}<p>${esc(r.intro)}</p>
      <div class="aro" id="aro" aria-hidden="true"></div><p class="grande" id="rtxt" role="status" aria-live="polite">Cuando quieras, pulsa Empezar.</p><p class="suave" id="rcont"></p>
      <button type="button" class="btn" id="rini">Empezar</button>`;
    volverA('Salud mental', () => { respSesion++; vistaSalud(); });
    $('#rini').onclick = async () => {
      const yo = ++respSesion; $('#rini').hidden = true;
      const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
      for (let n = 1; n <= r.rondas; n++) for (const f of r.fases) {
        const txt = $('#rtxt'), aro = $('#aro'); if (yo !== respSesion || !txt || !aro) return;   // saliste de esta pantalla
        txt.textContent = f.texto; $('#rcont').textContent = 'Ronda ' + n + ' de ' + r.rondas;
        aro.style.transitionDuration = f.segundos + 's'; aro.className = 'aro ' + f.id;
        await esperar(f.segundos * 1000);
      }
      if (yo !== respSesion || !$('#rtxt')) return;
      $('#rtxt').textContent = 'Listo.'; $('#rcont').textContent = r.fin; $('#aro').className = 'aro'; $('#rini').textContent = 'Repetir'; $('#rini').hidden = false;
    };
  }
  function vistaChequeo(c, ayuda) {
    $('#pantalla').innerHTML = `${cabecera(c.titulo, 'Salud mental')}<p>${esc(c.intro)}</p><p id="msg" role="alert" hidden></p>
      ${c.preguntas.map((q, i) => `<fieldset class="preg"><legend>${i + 1}. ${esc(q)}</legend>${c.opciones.map((o, j) => `<label class="opc"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}
      <button type="button" class="btn" id="cver">Ver mi resultado</button><div id="cres" aria-live="polite"></div>`;
    volverA('Salud mental', vistaSalud);
    $('#cver').onclick = () => {
      let total = 0;
      for (let i = 0; i < c.preguntas.length; i++) { const e = document.querySelector('input[name="q' + i + '"]:checked'); if (!e) return msg('Responde todas las preguntas para ver tu resultado.'); total += Number(e.value) || 0; }
      msg(''); const res = c.resultados.find((x) => total <= x.hasta) || c.resultados[c.resultados.length - 1];
      $('#cres').innerHTML = `<div class="card sep"><h2 class="m0">${esc(res.titulo)}</h2><p>${esc(res.texto)}</p><p class="suave m0">Esto orienta, no es un diagnóstico, y no se guardó.</p></div>${res.ayuda ? lineasAyuda(ayuda) : ''}`;
    };
  }

  // --- Proyectos listos (ideas ya pensadas: lugar, presupuesto y personas) ---
  let proyFiltro = 'todas';
  const LUGARES = { iglesia: 'En la iglesia', publico: 'En un lugar público', casa: 'En casa' };
  const PRESUPUESTOS = { sin: 'Sin costo', bajo: 'Presupuesto bajo', medio: 'Presupuesto medio' };
  // ---------- Aprender (F866): cursos gratuitos en internet + mi avance (solo en este teléfono) ----------
  const K_APR = 'tb_movil_aprender';
  const ESTADOS_APR = [['pendiente', '⚪', 'Sin iniciar'], ['en_progreso', '▶️', 'En progreso'], ['completado', '✅', 'Completado']];
  let aprFiltro = 'todas';
  const aprMapa = () => { const m = leer(K_APR); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; };
  const aprEstado = (id) => { const e = aprMapa()[id]; return ESTADOS_APR.some((x) => x[0] === e) ? e : 'pendiente'; };
  const urlSegura = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; } };
  async function vistaAprender() {
    $('#pantalla').innerHTML = `${cabecera('Aprender', 'Vivir lo que aprendemos')}<p class="suave" id="aprmsg">Cargando…</p>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    let d; try { d = await datoCargar('aprender_cursos'); } catch (e) { d = null; }
    const m = $('#aprmsg'); if (!m) return; if (!d || !Array.isArray(d.categorias)) { m.textContent = SIN_DATOS; return; }
    const todos = d.categorias.reduce((n, c) => n + c.cursos.length, 0);
    const hechos = d.categorias.reduce((n, c) => n + c.cursos.filter((x) => aprEstado(x.id) === 'completado').length, 0);
    const enCurso = d.categorias.reduce((n, c) => n + c.cursos.filter((x) => aprEstado(x.id) === 'en_progreso').length, 0);
    const chips = [['todas', '', 'Todos']].concat(d.categorias.map((c) => [c.id, c.icon, c.titulo]));
    if (!chips.some((c) => c[0] === aprFiltro)) aprFiltro = 'todas';
    const cats = d.categorias.filter((c) => aprFiltro === 'todas' || c.id === aprFiltro);
    $('#pantalla').innerHTML = `${cabecera('Aprender', 'Vivir lo que aprendemos')}
      <p class="suave">Cursos gratuitos de otras organizaciones. Se abren en tu navegador; aquí solo anotas tu avance (queda en este teléfono).</p>
      <div class="card bienvenida"><b>${hechos} de ${todos}</b> completados${enCurso ? ' · ' + enCurso + ' en progreso' : ''}</div>
      <div class="chips" role="group" aria-label="Filtrar por tema">${chips.map((c) => `<button type="button" class="chip${aprFiltro === c[0] ? ' on' : ''}" data-afiltro="${esc(c[0])}" aria-pressed="${aprFiltro === c[0]}">${c[1] ? esc(c[1]) + ' ' : ''}${esc(c[2])}</button>`).join('')}</div>
      ${cats.map((c) => `<h2 class="sep">${esc(c.icon)} ${esc(c.titulo)}</h2><p class="suave m0">${esc(c.subtitulo)}</p>` + c.cursos.map((x) => { const e = ESTADOS_APR.find((z) => z[0] === aprEstado(x.id)); return `<button type="button" class="card item" data-curso="${esc(x.id)}"><div class="t"><span aria-hidden="true">${e[1]}</span>${esc(x.titulo)}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${esc(x.proveedor)} · ${esc(e[2])}</p></button>`; }).join('')).join('')}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-afiltro]').forEach((b) => b.addEventListener('click', () => { aprFiltro = b.dataset.afiltro; vistaAprender(); }));
    document.querySelectorAll('[data-curso]').forEach((b) => b.addEventListener('click', () => vistaCurso(d, b.dataset.curso)));
  }
  function vistaCurso(d, id) {
    let cur = null; d.categorias.forEach((c) => c.cursos.forEach((x) => { if (x.id === id) cur = x; }));
    if (!cur) return vistaAprender();
    const url = urlSegura(cur.url), est = aprEstado(id);
    $('#pantalla').innerHTML = `${cabecera(cur.titulo, 'Aprender')}
      <p class="suave">${esc(cur.proveedor)} · ${esc(cur.costo)}</p>
      <div class="card"><p class="m0t">${esc(cur.queEs)}</p><h2 class="sep16">¿Cómo me ayuda?</h2><p>${esc(cur.comoAyuda)}</p>
        ${(cur.ejemplos || []).length ? `<h2>Para ponerlo en práctica</h2><ul class="formas">${cur.ejemplos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
      ${url ? `<a class="btn" id="abrircurso" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Abrir el curso ↗</a><p class="suave">Se abre en otra pestaña, en el sitio de ${esc(cur.proveedor)}. Allí puede pedirte crear una cuenta.</p>` : ''}
      <fieldset class="opciones"><legend>Mi avance</legend>
        ${ESTADOS_APR.map((e) => `<label class="opcion"><input type="radio" name="aest" value="${e[0]}"${est === e[0] ? ' checked' : ''}><span>${e[1]} ${e[2]}</span></label>`).join('')}</fieldset>
      <p id="amsg" class="ok" role="status"></p>`;
    volverA('Aprender', vistaAprender);
    document.querySelectorAll('input[name=aest]').forEach((r) => r.addEventListener('change', () => {
      const m = aprMapa(); if (r.value === 'pendiente') delete m[id]; else m[id] = r.value;
      const ok = guardar(K_APR, m); const t = $('#amsg'); if (t) { t.textContent = ok ? 'Guardado en este teléfono.' : 'Este navegador no deja guardar datos.'; t.className = ok ? 'ok' : 'error'; }
    }));
  }

  async function vistaProyectos() {
    $('#pantalla').innerHTML = `${cabecera('Proyectos listos', 'Vivir lo que aprendemos')}<p class="suave" id="pymsg">Cargando…</p>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    let d, cat; try { d = await datoCargar('servicio_proyectos_listos'); cat = await datoCargar('servicio_ideas'); } catch (e) { d = null; }
    const m = $('#pymsg'); if (!m) return; if (!d || !cat) { m.textContent = SIN_DATOS; return; }
    const chips = [['todas', '', 'Todos']].concat(cat.categorias.map((c) => [c.id, c.icono, c.label]));
    const l = d.proyectos.filter((p) => proyFiltro === 'todas' || p.area === proyFiltro);
    $('#pantalla').innerHTML = `${cabecera('Proyectos listos', 'Vivir lo que aprendemos')}
      <p class="suave">Ya decidimos el lugar y el presupuesto; solo falta que lo hagas con tu iglesia. Toca uno para verlo.</p>
      <div class="chips" role="group" aria-label="Filtrar por tema">${chips.map((c) => `<button type="button" class="chip${proyFiltro === c[0] ? ' on' : ''}" data-pfiltro="${esc(c[0])}" aria-pressed="${proyFiltro === c[0]}">${c[1] ? esc(c[1]) + ' ' : ''}${esc(c[2])}</button>`).join('')}</div>
      ${l.map((p) => `<button type="button" class="card item" data-proy="${esc(p.id)}"><div class="t"><span aria-hidden="true">${esc(p.icono)}</span>${esc(p.titulo)}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${esc(LUGARES[p.lugar] || p.lugar)} · ${esc(PRESUPUESTOS[p.presupuesto] || p.presupuesto)}</p></button>`).join('')}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-pfiltro]').forEach((b) => b.addEventListener('click', () => { proyFiltro = b.dataset.pfiltro; vistaProyectos(); }));
    document.querySelectorAll('[data-proy]').forEach((b) => b.addEventListener('click', () => vistaProyecto(d.proyectos.find((p) => p.id === b.dataset.proy))));
  }
  function vistaProyecto(p) {
    if (!p) return vistaProyectos();
    $('#pantalla').innerHTML = `${cabecera(p.titulo, 'Proyectos listos')}<div class="card"><p class="m0t">${esc(p.resumen)}</p>
      <p><b>📍 Dónde:</b> ${esc(LUGARES[p.lugar] || p.lugar)}<br><b>💰 Dinero:</b> ${esc(PRESUPUESTOS[p.presupuesto] || p.presupuesto)}<br><b>👥 Personas sugeridas:</b> ${Number(p.personasSugeridas) || ''}</p>
      ${p.versiculo ? `<p class="suave m0">${esc(p.versiculo)}</p>` : ''}</div>`;
    volverA('Proyectos listos', vistaProyectos);
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
