// app.js — F856 (MOV2a): esqueleto de la versión móvil/tablet de Tierra Buena.
// Reutiliza lo que ya se decidió para el miembro (plan archivado en compartido/archivo_NO_LEER.zip):
// identidad liviana con llave en el dispositivo, solicitud que aprueba el pastor, mismas funciones de Supabase.
// No usa nada de Electron. F868-F869: se puede entrar con correo y contraseña (Supabase Auth, igual que el escritorio); sin cuenta sigue valiendo el código + llave.
(function () {
  'use strict';
  const SUPABASE_URL = 'https://mxgvaspztajgzxfgtxfq.supabase.co';
  // Clave 'anon': pública por diseño (igual que en el escritorio). La seguridad la ponen las funciones/RLS de Supabase.
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z3Zhc3B6dGFqZ3p4Zmd0eGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODE5NzcsImV4cCI6MjEwNTI1Nzk3N30.JWk7cBOR-K4adeHcokcZY0B2WcmTDLmEpIsBMQqtFjY';
  const K_ID = 'tb_movil_identidad', K_SOL = 'tb_movil_solicitud', K_IG = 'tb_movil_iglesia', K_CUENTA = 'tb_movil_cuenta';
  const SB = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
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
    'sin-internet': 'Para esto necesitamos internet. Inténtalo de nuevo cuando tengas conexión.',
    'correo-invalido': 'Ese correo parece incompleto. Revísalo, por favor.',
    'clave-corta': 'La contraseña debe tener al menos 8 caracteres.',
    'claves-distintas': 'Las dos contraseñas son distintas. Vuelve a escribirlas con calma.',
    credenciales: 'Correo o contraseña incorrectos. Si tu cuenta es del computador y aún no la usas aquí, toca «Crear cuenta» con el mismo correo y contraseña.',
    'sin-confirmar': 'Falta confirmar tu correo: abre el mensaje que te enviamos y toca el enlace. Después vuelve aquí y entra.',
    'ya-existe': 'Ese correo ya tiene una cuenta. Toca «Entrar» y escribe tu contraseña.',
    'clave-debil': 'Esa contraseña es muy fácil de adivinar. Prueba con una más larga o con números y letras.',
    demasiados: 'Hubo muchos intentos seguidos. Espera unos minutos y vuelve a probar.',
    'correo-no-sale': 'Tu cuenta no se pudo crear porque el servidor no logró enviar el correo de confirmación (el envío de correos tiene un límite por hora). Espera una hora y vuelve a intentarlo, o avisa a quien administra la app.',
    'registro-cerrado': 'Por ahora no se pueden crear cuentas nuevas. Avisa a quien administra la app.',
    'correo-rechazado': 'No pudimos usar ese correo. Revisa que esté bien escrito o prueba con otro.'
  };
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return false; } syncMarcar(k); if (k === 'tb_movil_cuenta' || k === 'tb_movil_identidad' || k === 'tb_movil_pastor') marcaDentro(); return true; };
  const borrar = (k) => { try { localStorage.removeItem(k); } catch (e) { /* nada */ } if (k === 'tb_movil_cuenta' || k === 'tb_movil_identidad' || k === 'tb_movil_pastor') marcaDentro(); };
  // F903: «Mi código» y el botón de efectos solo aparecen después del primer ingreso (con cuenta); en el inicio de sesión no estorban.
  const haySesion = () => !!leer('tb_movil_cuenta');   // F936: sin sesión iniciada no se ve ninguna sección
  const marcaDentro = () => { try { document.documentElement.setAttribute('data-sesion', haySesion() ? '1' : '0'); } catch (e) { /* nada */ } try { document.documentElement.setAttribute('data-dentro', (leer('tb_movil_cuenta') || leer('tb_movil_identidad') || leer('tb_movil_pastor')) ? '1' : '0'); } catch (e) { /* nada */ } };
  marcaDentro();

  async function rpc(fn, args) {
    if (!SB) return { ok: false, motivo: 'sin-internet' };
    try {
      const { data, error } = await SB.rpc(fn, args);
      if (error) return { ok: false, motivo: 'sin-internet' };
      return { ok: true, data: Array.isArray(data) ? data[0] : data };
    } catch (e) { return { ok: false, motivo: 'sin-internet' }; }
  }
  const llaveNueva = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');


  // ---------- F872 · Avances por cuenta (nube) ----------
  // Lo personal (oración, crecimiento, ideas, cursos, lectura, acción del mes) se guarda en el teléfono Y en la cuenta
  // (tabla public.avances_cuenta, solo la ve su dueño: docs/sql/SQL_AVANCES_CUENTA.sql). Sin sesión o sin la tabla, todo sigue local.
  const SYNC_CLAVES = ['tb_movil_planvida', 'tb_movil_mi_oracion', 'tb_movil_crecimiento', 'tb_movil_ideas_fav', 'tb_movil_aprender', 'tb_movil_biblia_ultimo', 'tb_movil_accion_mes', 'tb_movil_perfil', 'tb_movil_racha', 'tb_movil_biblia_res', 'tb_movil_canciones_mias', 'tb_movil_canciones_fav', 'tb_movil_biblia_col', 'tb_movil_biblia_notas', 'tb_movil_biblia_marc', 'tb_movil_leidos', 'tb_movil_planes', 'tb_inicio_v1', 'tb_movil_juegos', 'tb_movil_disponibilidad', 'tb_movil_acciones', 'tb_inicio_fondo', 'tb_inicio_clima'];   // F946: + Inicio (árbol, gotas, vivero), juegos, «Hoy lo hago», paisaje y clima
  const K_SYNC = 'tb_movil_sync';
  const sync = { estado: 'local', cuando: null, timer: null, ocupado: false };   // estado: local | ok | pendiente | falta | error
  const metaLeer = () => { const m = leer(K_SYNC); return m && typeof m === 'object' ? { dueno: m.dueno || null, t: m.t || {}, d: m.d || {}, off: m.off === true } : { dueno: null, t: {}, d: {}, off: false }; };
  const metaGuardar = (m) => { try { localStorage.setItem(K_SYNC, JSON.stringify(m)); } catch (e) { /* nada */ } };
  const crudoGuardar = (k, v) => { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* nada */ } };
  function syncMarcar(k) {
    if (SYNC_CLAVES.indexOf(k) < 0 || !leer(K_CUENTA) || metaLeer().off) return;
    const m = metaLeer(); m.d[k] = true; metaGuardar(m);
    sync.estado = 'pendiente'; syncPintar();
    clearTimeout(sync.timer); sync.timer = setTimeout(syncSubir, 1500);
  }
  // F946: el Inicio, los paisajes y otros módulos guardan directo en el teléfono; resguardo.js avisa y aquí se marcan para subir a la cuenta (lo que baja de la nube no se vuelve a subir).
  try { window.addEventListener('tb-guardado', (ev) => { if (!sync.bajando && ev && ev.detail) syncMarcar(ev.detail); }); } catch (e) { /* sin eventos */ }
  async function syncUsuario() {
    if (!hayAuth() || !SB.from || !SB.auth.getSession) return null;
    try { const r = await SB.auth.getSession(); return (r && r.data && r.data.session && r.data.session.user) || null; } catch (e) { return null; }
  }
  const tablaFalta = (er) => !!er && (er.code === '42P01' || er.code === 'PGRST205' || /avances_cuenta/i.test(er.message || '') && /not find|does not exist/i.test(er.message || ''));
  async function syncSubir() {
    if (sync.ocupado) { clearTimeout(sync.timer); sync.timer = setTimeout(syncSubir, 1500); return; }
    const u = await syncUsuario(); if (!u || metaLeer().off) { sync.estado = 'local'; return syncPintar(); }
    sync.ocupado = true;
    try {
      const m = metaLeer(); let fallo = false;
      for (const k of SYNC_CLAVES) {
        if (!m.d[k]) continue;
        const v = leer(k);
        try {
          if (v === null) { const r = await SB.from('avances_cuenta').delete().eq('user_id', u.id).eq('clave', k); if (r.error) throw r.error; delete m.t[k]; }
          else { const r = await SB.from('avances_cuenta').upsert({ user_id: u.id, clave: k, valor: v }, { onConflict: 'user_id,clave' }).select('actualizado'); if (r.error) throw r.error; const f = Array.isArray(r.data) ? r.data[0] : r.data; if (f && f.actualizado) m.t[k] = f.actualizado; }
          delete m.d[k];
        } catch (er) { fallo = true; if (tablaFalta(er)) { sync.estado = 'falta'; break; } }
      }
      m.dueno = u.id; metaGuardar(m);
      if (sync.estado !== 'falta') { sync.estado = fallo ? 'error' : 'ok'; if (!fallo) sync.cuando = new Date(); }
    } finally { sync.ocupado = false; syncPintar(); }
  }
  const mezclaLista = (loc, rem) => {            // dos listas con id: se juntan (gana lo local si el id se repite)
    if (!Array.isArray(loc) || !Array.isArray(rem) || !loc.concat(rem).every((x) => x && typeof x === 'object' && x.id)) return loc;
    const ids = new Set(loc.map((x) => x.id)); return loc.concat(rem.filter((x) => !ids.has(x.id)));
  };
  // F946: si el teléfono y la nube tienen avances distintos, se juntan y NUNCA se pierde lo ganado (gana el que tiene más avance; las listas se unen por id).
  const mayor = (a, b) => ((+a || 0) >= (+b || 0) ? a : b);
  function mezclaAvance(k, loc, rem) {
    try {
      if (k === 'tb_inicio_v1' && loc && rem && typeof loc === 'object' && typeof rem === 'object') {
        const pt = (x) => [(x.gotas && x.gotas.total) || 0, (x.ciclo && x.ciclo.n) || 0, (x.ciclo && x.ciclo.diasCuidado) || 0];
        const a = pt(loc), b = pt(rem); let gana = loc, otro = rem; for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) { if (b[i] > a[i]) { gana = rem; otro = loc; } break; } }
        const r = JSON.parse(JSON.stringify(gana)); r.vivero = r.vivero || { desbloqueados: [], plantas: [], aves: [] };
        const o = otro.vivero || {}, v = r.vivero;
        v.desbloqueados = Array.from(new Set([].concat(v.desbloqueados || [], o.desbloqueados || [])));
        ['plantas', 'aves'].forEach((g) => { v[g] = mezclaLista(v[g] || [], o[g] || []); });
        if (gana.gotas && otro.gotas) r.gotas.total = Math.max(+gana.gotas.total || 0, +otro.gotas.total || 0);
        { const cg = gana.cosechas || {}, co = otro.cosechas || {}; r.cosechas = { total: Math.max(+cg.total || 0, +co.total || 0), pend: Array.isArray(cg.pend) ? cg.pend : [], ult: Object.assign({}, co.ult || {}, cg.ult || {}) }; }   // F959: los frutos recogidos nunca se pierden
        return r;
      }
      if (k === 'tb_movil_juegos' && loc && rem && typeof loc === 'object' && typeof rem === 'object') {
        const r = { n: Math.max(+loc.n || 0, +rem.n || 0), p: {} }, pl = loc.p || {}, pr = rem.p || {};
        Object.keys(Object.assign({}, pl, pr)).forEach((id) => { const x = pl[id] || {}, y = pr[id] || {}; r.p[id] = { n: Math.max(+x.n || 0, +y.n || 0), mejor: Math.max(+x.mejor || 0, +y.mejor || 0) }; });
        return r;
      }
      if (k === 'tb_inicio_fondo' || k === 'tb_inicio_clima') return loc;
    } catch (e) { /* si algo no cuadra, se conserva lo del teléfono */ }
    return mezclaLista(loc, rem);
  }
  async function syncBajar(user) {
    if (!user || !hayAuth() || !SB.from || metaLeer().off) return;
    let filas;
    try { const r = await SB.from('avances_cuenta').select('clave,valor,actualizado'); if (r.error) throw r.error; filas = r.data || []; }
    catch (er) { sync.estado = tablaFalta(er) ? 'falta' : 'error'; return syncPintar(); }
    const m = metaLeer(), otraCuenta = !!m.dueno && m.dueno !== user.id;
    sync.bajando = true;
    try {
    for (const k of SYNC_CLAVES) {
      const rem = filas.find((f) => f.clave === k), loc = leer(k);
      if (otraCuenta) { crudoGuardar(k, rem ? rem.valor : null); delete m.d[k]; if (rem) m.t[k] = rem.actualizado; else delete m.t[k]; continue; }   // lo del teléfono era de otra persona: manda la nube de esta cuenta
      const sucioLocal = loc !== null && (!m.t[k] || m.d[k]);
      if (!rem) { if (loc !== null) m.d[k] = true; continue; }
      const remNuevo = !m.t[k] || new Date(rem.actualizado) > new Date(m.t[k]);
      if (sucioLocal) { if (remNuevo) { crudoGuardar(k, mezclaAvance(k, loc, rem.valor)); } m.d[k] = true; }
      else if (remNuevo || loc === null) { crudoGuardar(k, rem.valor); m.t[k] = rem.actualizado; delete m.d[k]; }
    }
    } finally { sync.bajando = false; }
    m.dueno = user.id; metaGuardar(m);
    sync.estado = 'ok'; sync.cuando = new Date(); syncPintar();
    await syncSubir();
  }
  async function syncInicio() { const u = await syncUsuario(); if (u && leer(K_CUENTA)) syncBajar(u); }
  async function syncCerrar() {                  // antes de cerrar sesión: sube lo pendiente y, si quedó todo en la nube, limpia el teléfono
    try { await Promise.race([syncSubir(), new Promise((r) => setTimeout(r, 4000))]); } catch (e) { /* sin red */ }
    const m = metaLeer(); if (m.off || SYNC_CLAVES.some((k) => m.d[k]) || sync.estado === 'falta' || sync.estado === 'error') return false;
    SYNC_CLAVES.forEach((k) => crudoGuardar(k, null)); crudoGuardar(K_SYNC, null); return true;
  }
  function syncTexto() {
    if (!leer(K_CUENTA)) return '';
    const e = sync.estado;
    return e === 'ok' ? '☁️ Tus avances están guardados en tu cuenta' : e === 'pendiente' ? '☁️ Guardando tus avances…' : e === 'falta' ? '☁️ La copia en la nube aún no está activa; tus notas quedan en este teléfono' : e === 'error' ? '☁️ Sin conexión: se guardarán en tu cuenta cuando vuelva internet' : '';
  }
  function syncPintar() { const el = $('#sincEstado'); if (el) el.textContent = syncTexto(); }
  if (window.addEventListener) window.addEventListener('online', () => { if (leer(K_CUENTA)) syncSubir(); });

  // ---------- Pantallas ----------
  const pronto = (ico, titulo, ayuda) => `<div class="card pronto" role="note"><div class="t"><span aria-hidden="true">${ico}</span>${titulo}<span class="etiqueta">Pronto</span></div><p class="suave m0t">${ayuda}</p></div>`;

  // F881: íconos de línea propios (un solo estilo, hereda color). Los emojis de las tarjetas se traducen aquí;
  // si un emoji no está en la tabla se muestra tal cual. Nada de style="" (la política de seguridad no lo permite).
  const SV = {
    lugar: '<path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mas: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    ciclo: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    libro: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    chispas: '<path d="M9.9 15.5a2 2 0 0 0-1.4-1.4l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/><path d="M20 3v4M22 5h-4"/>',
    rollo: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
    brote: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    corazon: '<path d="M12 20s-7.6-4.5-9.3-9.1C1.6 7.6 3.5 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.3 0 5.2 3.1 4.1 6.4C19.6 15.5 12 20 12 20z"/>',
    iglesia: '<path d="M10 9h4M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.6a1 1 0 0 0-.6-.9l-4.5-2.3a2 2 0 0 0-1.8 0L6.6 4.7A1 1 0 0 0 6 5.6V22"/><path d="m18 7 3.4 1.7a1 1 0 0 1 .6.9V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.6a1 1 0 0 1 .6-.9L6 7"/>',
    llave: '<path d="M2.6 17.4a2 2 0 0 0-.6 1.4V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.2a2 2 0 0 0 1.4-.6l.8-.8a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".6"/>',
    correo: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
    candado: '<rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    altavoz: '<path d="M3 10v4h3.5L11 18V6L6.5 10H3z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    calendario: '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18"/>',
    foco: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    birrete: '<path d="M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.6 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0z"/><path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    estrella: '<path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2.1 2.1 0 0 0 1.6 1.2l5.2.7a.5.5 0 0 1 .3.9l-3.7 3.6a2.1 2.1 0 0 0-.6 1.9l.9 5.1a.5.5 0 0 1-.8.6l-4.6-2.4a2.1 2.1 0 0 0-2 0l-4.6 2.4a.5.5 0 0 1-.8-.6l.9-5.1a2.1 2.1 0 0 0-.6-1.9L2.2 9.8a.5.5 0 0 1 .3-.9l5.1-.7A2.1 2.1 0 0 0 9.200 7z"/>',
    ayuda: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.500z"/>',
    pluma: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.600a2 2 0 0 1-.9.500l-2.900.8a.5.5 0 0 1-.6-.6l.8-2.900a2 2 0 0 1 .5-.9z"/>',
    gente: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.100a4 4 0 0 1 0 7.800"/>',
    mente: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.500 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    viento: '<path d="M12.800 19.600A2 2 0 1 0 14 16H2"/><path d="M17.500 8a2.500 2.500 0 1 1 2 4H2"/><path d="M9.800 4.400A2 2 0 1 1 11 8H2"/>',
    bloques: '<rect x="3" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="14" width="7" height="7" rx="1.500"/><rect x="3" y="14" width="7" height="7" rx="1.500"/>',
    llave2: '<path d="M14.700 6.300a1 1 0 0 0 0 1.400l1.600 1.600a1 1 0 0 0 1.400 0l3.800-3.800a6 6 0 0 1-7.900 7.900l-6.900 6.900a2.100 2.100 0 0 1-3-3l6.900-6.900a6 6 0 0 1 7.900-7.900z"/>',
    paloma: '<path d="M16 7h.01"/><path d="M3.400 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.300-2.300L2 20"/><path d="m20 7 2 .5-2 .5M10 18v3M14 17.800V21M7 18a6 6 0 0 0 3.800-10.600"/>',
    llama: '<path d="M8.500 14.500A2.500 2.500 0 0 0 11 12c0-1.400-.5-2-1-3-1.100-2.100-.2-4.100 2-6 .5 2.500 2 4.900 4 6.500 2 1.600 3 3.500 3 5.500a7 7 0 1 1-14 0c0-1.200.4-2.300 1-3a2.500 2.500 0 0 0 2.500 2.500z"/>',
    hoja: '<path d="M11 20A7 7 0 0 1 9.800 6.100C15.500 5 17 4.500 19 2c1 2 2 4.200 2 8 0 5.500-4.800 10-10 10z"/><path d="M2 21c0-3 1.900-5.500 5-6.700 3-1.200 5.500-2.300 7-5.300"/>',
    marcador: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    imagen: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    copiar: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trofeo: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1.2 1.2C7.8 18.7 7 20.2 7 22M14 14.7V17c0 .6.5 1 1.2 1.2 1 .5 1.8 2 1.8 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>',
    nota: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    papelera: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    luna: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>'
  };
  SV.pausa = '<path d="M8 5v14M16 5v14"/>'; SV.audifonos = '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/>'; SV.texto = '<path d="M4 19 9.500 5 15 19M6 14h7M17 12h3M18.500 12v7"/>';
  const EMO = { '📖': 'libro', '✨': 'chispas', '📜': 'rollo', '🌱': 'brote', '🙏': 'corazon', '🕍': 'iglesia', '⛪': 'iglesia', '🔑': 'llave', '✉': 'correo', '🔒': 'candado', '📣': 'altavoz', '📅': 'calendario', '💡': 'foco', '🎓': 'birrete', '🌟': 'estrella', '❓': 'ayuda', '▶': 'play', '📝': 'pluma', '🤝': 'gente', '🧠': 'mente', '🫁': 'viento', '🧱': 'bloques', '🧰': 'llave2', '🕊': 'paloma', '🌿': 'hoja', '🔖': 'marcador', '🗓': 'calendario', '🏆': 'trofeo', '🖼': 'imagen', '🎵': 'nota', '🎶': 'nota', '🎉': 'chispas', '🗑': 'papelera', '✓': 'check', '🤲': 'manos', '✍': 'pluma', '🔎': 'lupa', '🌅': 'amanecer', '🔀': 'baraja', '📜': 'rollo' };
  // F942: pictogramas a color (más fáciles de reconocer para personas mayores). Si una clave no está aquí, sigue el ícono de línea.
  // Íconos a color de Tierra Buena: contorno café común, tierra/brote/ámbar y un detalle de brote que los une
  const PICTO = {
    libro: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M2.5 7C6 5.5 9.5 6 12 8.5v12C9.5 18.5 6 18.5 2.5 20z" fill="#4f8a5b"/><path d="M21.5 7C18 5.5 14.5 6 12 8.5v12c2.5-2 6-2 9.5-.5z" fill="#f6ecd2"/><path d="M12 8.5V4.5" fill="none"/><path d="M12 5.5C12 3.5 10.3 2.5 8.5 2.8c0 2 1.4 3 3.5 2.7z" fill="#7cc08a"/><path d="M12 4.8c0-2 1.7-3 3.5-2.7 0 2-1.4 3-3.5 2.7z" fill="#4f8a5b"/></g>',
    corazon: '<path d="M12 20s-7.6-4.5-9.3-9.1C1.6 7.6 3.5 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3.1 1.6-1.9 3.1-3.1 5.2-3.1 3.3 0 5.2 3.1 4.1 6.4C19.6 15.5 12 20 12 20z"/>',
    iglesia: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><rect x="4.500" y="11.500" width="15" height="9.500" fill="#f6ecd2"/><path d="M3 12 12 5.500l9 6.500z" fill="#c4604a"/><path d="M12 1.500v4M10.300 3h3.400" fill="none" stroke-width="1.500"/><path d="M10 21v-3.800a2 2 0 0 1 4 0V21z" fill="#8b5a2b"/><circle cx="7.600" cy="16" r="1.300" fill="#e9b949"/><circle cx="16.400" cy="16" r="1.300" fill="#e9b949"/></g>',
    gente: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><circle cx="8" cy="8" r="3.200" fill="#e0a96d"/><path d="M2 21c0-4 2.500-6 6-6s6 2 6 6z" fill="#4f8a5b"/><circle cx="17" cy="9" r="2.800" fill="#f1c58b"/><path d="M13.800 21c0-3.500 1.500-5 3.200-5s5 1.500 5 5z" fill="#e9b949"/></g>',
    calendario: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4.500" width="18" height="16.500" rx="2.500" fill="#f6ecd2"/><path d="M3 7a2.500 2.500 0 0 1 2.500-2.500h13A2.500 2.500 0 0 1 21 7v3H3z" fill="#c4604a"/><path d="M8 2.500v3.500M16 2.500v3.500" fill="none" stroke-width="1.600"/><path d="M12 19c-3.500 0-4.800-2.300-4.800-4.300 2.600 0 4.800 1 4.800 4.300zM12 19c0-3 2-4.400 4.800-4.400 0 2.300-1.600 4.400-4.800 4.400z" fill="#4f8a5b"/></g>',
    altavoz: '<path d="M3 10v4h3.5L11 18V6L6.5 10H3z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    brote: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M4.500 21c0-3.300 3.400-5 7.500-5s7.500 1.700 7.500 5z" fill="#8b5a2b"/><path d="M12 16v-5" fill="none" stroke-width="1.600"/><path d="M12 12.500C12 8 8.500 5.500 4 6c0 4.500 3 7 8 6.500z" fill="#7cc08a"/><path d="M12 10.500c0-4 3-6.500 8-6.500 0 4.500-3 7-8 6.500z" fill="#4f8a5b"/></g>',
    trofeo: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#e9b949"/><path d="M7 5H4.300A2.700 2.700 0 0 0 7.200 9.300M17 5h2.700a2.700 2.700 0 0 1-2.900 4.300" fill="none"/><path d="M10.500 14h3v3.500h-3z" fill="#b8893a"/><path d="M7.500 21v-1.700a1.800 1.800 0 0 1 1.800-1.800h5.400a1.800 1.800 0 0 1 1.800 1.800V21z" fill="#8b5a2b"/><path d="M12 5.500c-1.800 0-2.500 1.300-2.500 2.600 1.700 0 2.500-1 2.500-2.600zM12 5.500c1.800 0 2.500 1.300 2.500 2.600-1.700 0-2.500-1-2.500-2.600z" fill="#4f8a5b" stroke-width=".8"/></g>',
    llama: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2c1 4 6.500 6.500 6.500 12a6.500 6.500 0 0 1-13 0c0-2.700 1.300-4.300 2.700-5.800.2 1.800 1 2.800 2 3C10 8.500 11 5 12 2z" fill="#e8772a"/><path d="M12 11.500c.9 2 3 3 3 5.500a3 3 0 0 1-6 0c0-1.700 1.600-3 3-5.500z" fill="#f5c542"/></g>',
    nota: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M9 17V5.500l11-2.300V15" fill="none" stroke-width="2"/><path d="M9 7.500l11-2.300" fill="none" stroke-width="2"/><circle cx="6.500" cy="17.500" r="3.200" fill="#7a55b0"/><circle cx="17.500" cy="15.500" r="3.200" fill="#7a55b0"/></g>',
    foco: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.500a6.500 6.500 0 0 0-3.600 11.900c.7.600 1.100 1.300 1.100 2.100h5c0-.8.400-1.500 1.100-2.100A6.500 6.500 0 0 0 12 2.500z" fill="#f5c542"/><path d="M12 14v-3.500" fill="none"/><path d="M12 11.500c0-2.200-1.600-3-3-2.800 0 2 1.300 3 3 2.800zM12 11.500c0-2.200 1.600-3 3-2.800 0 2-1.300 3-3 2.800z" fill="#4f8a5b" stroke-width=".8"/><path d="M9.500 18.500h5v1.500a1.500 1.500 0 0 1-1.500 1.500h-2A1.500 1.500 0 0 1 9.500 20z" fill="#b8893a"/></g>',
    hoja: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M11 20.500A7.500 7.500 0 0 1 9.500 6C15.500 5 17 4.500 19.500 2c1 2 2 4.300 2 8 0 5.800-5 10.500-10.500 10.500z" fill="#4f8a5b"/><path d="M3 21.500c1-4.500 4.500-8 9.500-10.500" fill="none"/></g>',
    pluma: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M20.500 3C13 3 7.500 7.500 6.500 14.500L5 19.500l4.500-1.500C16.500 17 21 11 20.500 3z" fill="#f6ecd2"/><path d="M5 19.500c3-5 6.500-8.500 11-11" fill="none"/><path d="M5 19.500l-1.500 2" fill="none" stroke="#4a7fb0" stroke-width="1.800"/></g>',
    estrella: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M12 2.500l2.900 6.100 6.600.8-4.900 4.600 1.300 6.600L12 17.300l-5.900 3.300 1.300-6.600-4.900-4.600 6.600-.8z" fill="#e9b949"/><path d="M9.500 9.200l1.300-2.600" fill="none" stroke="#f6ecd2" stroke-width="1.300"/></g>',
    manos: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M2.500 11c2.500 0 4 1 5.500 2.600l4 2.400 4-2.400C17.500 12 19 11 21.500 11v1.600c-1 4.400-5 7.400-9.500 7.400s-8.500-3-9.500-7.400z" fill="#e0a96d"/><path d="M12 9.500V6.500" fill="none"/><path d="M12 7c0-2.200-1.800-3.300-3.800-3 0 2.200 1.600 3.300 3.800 3z" fill="#7cc08a"/><path d="M12 6.400c0-2.200 1.800-3.300 3.800-3 0 2.200-1.600 3.300-3.800 3z" fill="#4f8a5b"/></g>',
    lupa: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M14.500 14.500L20.500 20.500" fill="none" stroke="#a8743f" stroke-width="2.800"/><circle cx="10" cy="10" r="6.500" fill="#f6ecd2"/><path d="M7.500 12.500c0-3 2-4.500 5-4.500 0 3-2 4.500-5 4.500z" fill="#7cc08a"/></g>',
    amanecer: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M5.500 16.500a6.500 6.500 0 0 1 13 0z" fill="#f2b84b"/><path d="M2 16.500h20" fill="none"/><path d="M12 5V3M5 8.500L3.600 7.100M19 8.500l1.400-1.400" fill="none"/><path d="M5 20h14" fill="none" stroke="#4f8a5b"/></g>',
    baraja: '<g stroke="#5a3d24" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><rect x="4" y="5" width="11" height="15" rx="2" fill="#f6ecd2" transform="rotate(-10 9.500 12.500)"/><rect x="9" y="4" width="11" height="15" rx="2" fill="#4f8a5b" transform="rotate(8 14.500 11.500)"/><path d="M14.500 14c0-2.400 1.800-3.600 3.800-3.200 0 2.400-1.600 3.600-3.800 3.200z" fill="#f6ecd2"/></g>',
    compartir: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"6\" cy=\"12\" r=\"3\" fill=\"#4f8a5b\"/><circle cx=\"18\" cy=\"6\" r=\"3\" fill=\"#f6ecd2\"/><circle cx=\"18\" cy=\"18\" r=\"3\" fill=\"#f6ecd2\"/><path d=\"M8.6 10.6 15.4 7.4M8.6 13.4l6.8 3.2\" fill=\"none\"/></g>",
    x: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#f6ecd2\"/><path d=\"M8.5 8.5l7 7M15.5 8.5l-7 7\" fill=\"none\" stroke=\"#c4604a\" stroke-width=\"2\"/></g>",
    escudo: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M12 2.8 19.5 5.6v5.7c0 4.6-3.2 8.3-7.5 9.9C7.7 19.6 4.5 15.9 4.5 11.3V5.6z\" fill=\"#4f8a5b\"/><path d=\"M12 19.5V11\" fill=\"none\" stroke=\"#f6ecd2\" stroke-width=\"1.4\"/><path d=\"M12 13.5c-2.6 0-4-1.6-4-3.8 2.6 0 4 1.6 4 3.8zM12 11.2c0-2.5 1.9-4 4.2-3.9-.1 2.4-1.9 3.9-4.2 3.9z\" fill=\"#f6ecd2\"/></g>",
    chispas: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z\" fill=\"#f6ecd2\"/><path d=\"M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z\" fill=\"#c4604a\"/><path d=\"M5.5 16.5l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z\" fill=\"#7cc08a\"/></g>",
    texto: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><rect x=\"4.5\" y=\"3.5\" width=\"15\" height=\"17\" rx=\"2\" fill=\"#f6ecd2\"/><path d=\"M7.5 8h9M7.5 11.5h9M7.5 15h5.5\" fill=\"none\"/><rect x=\"14\" y=\"13.5\" width=\"3.5\" height=\"4\" rx=\".8\" fill=\"#4f8a5b\"/></g>",
    audifonos: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M4.5 14v-2a7.5 7.5 0 0 1 15 0v2\" fill=\"none\" stroke-width=\"1.6\"/><rect x=\"3.2\" y=\"13.5\" width=\"4.3\" height=\"7\" rx=\"1.8\" fill=\"#4f8a5b\"/><rect x=\"16.5\" y=\"13.5\" width=\"4.3\" height=\"7\" rx=\"1.8\" fill=\"#4f8a5b\"/></g>",
    check: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#4f8a5b\"/><path d=\"M7.5 12.4l3 3 6-6.4\" fill=\"none\" stroke=\"#f6ecd2\" stroke-width=\"2.1\"/></g>",
    play: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#4f8a5b\"/><path d=\"M10 8.5v7l5.8-3.5z\" fill=\"#f6ecd2\"/></g>",
    papelera: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M5.5 7.5h13l-1.1 12.2a1.5 1.5 0 0 1-1.5 1.3H8.1a1.5 1.5 0 0 1-1.5-1.3z\" fill=\"#c4604a\"/><path d=\"M4 6.2h16M9.5 6.2V4.6h5v1.6\" fill=\"#f6ecd2\"/><path d=\"M10 11v6M14 11v6\" fill=\"none\" stroke=\"#f6ecd2\" stroke-width=\"1.3\"/></g>",
    marcador: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M6.5 3.5h11v17L12 16.5l-5.5 4z\" fill=\"#4f8a5b\"/><path d=\"M9.5 7.5c1.5-1 3.5-1 5 0\" fill=\"none\" stroke=\"#f6ecd2\" stroke-width=\"1.3\"/></g>",
    mas: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#4f8a5b\"/><path d=\"M12 7.5v9M7.5 12h9\" fill=\"none\" stroke=\"#f6ecd2\" stroke-width=\"2\"/></g>",
    correo: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2\" fill=\"#f6ecd2\"/><path d=\"M3.8 6.6 12 13l8.2-6.4\" fill=\"none\"/><path d=\"M3.8 17.2l5.6-5M20.2 17.2l-5.6-5\" fill=\"none\" stroke=\"#4f8a5b\" stroke-width=\"1\"/></g>",
    bloques: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><rect x=\"3.5\" y=\"13.5\" width=\"8\" height=\"6.5\" rx=\"1.5\" fill=\"#c4604a\"/><rect x=\"12.5\" y=\"13.5\" width=\"8\" height=\"6.5\" rx=\"1.5\" fill=\"#f6ecd2\"/><rect x=\"7.5\" y=\"5.5\" width=\"9\" height=\"6.5\" rx=\"1.5\" fill=\"#4f8a5b\"/></g>",
    persona: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"8\" r=\"4\" fill=\"#f6ecd2\"/><path d=\"M4.5 20.5c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2z\" fill=\"#4f8a5b\"/></g>",
    paloma: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M3.5 14.5 7.5 12.8 7.5 16.2z\" fill=\"#c4604a\"/><ellipse cx=\"11.2\" cy=\"13.5\" rx=\"6.6\" ry=\"4.6\" fill=\"#f6ecd2\"/><circle cx=\"16.8\" cy=\"9.2\" r=\"2.9\" fill=\"#f6ecd2\"/><path d=\"M19.5 9l2.2.9-2.2 1z\" fill=\"#c4604a\"/><path d=\"M7.2 12.6c2.3-3.6 5.5-4.2 8.6-2.4-2.4 1.5-4.2 3.5-4.6 6.4\" fill=\"#4f8a5b\"/></g>",
    reloj: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"#f6ecd2\"/><path d=\"M12 7.5V12l3 2\" fill=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"#4f8a5b\"/></g>",
    telefono: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><rect x=\"6.5\" y=\"2.8\" width=\"11\" height=\"18.4\" rx=\"2.4\" fill=\"#4f8a5b\"/><rect x=\"8.5\" y=\"5.6\" width=\"7\" height=\"11.2\" rx=\".8\" fill=\"#f6ecd2\"/><circle cx=\"12\" cy=\"19\" r=\".9\" fill=\"#f6ecd2\"/></g>",
    lugar: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z\" fill=\"#c4604a\"/><circle cx=\"12\" cy=\"10.5\" r=\"2.5\" fill=\"#f6ecd2\"/></g>",
    copiar: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#f6ecd2\"/><path d=\"M5 15.5V6.5a2 2 0 0 1 2-2h8\" fill=\"none\" stroke=\"#4f8a5b\" stroke-width=\"2\"/></g>",
    ciclo: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M19.5 9.5A8 8 0 0 0 5.2 8.2M4.5 14.5a8 8 0 0 0 14.3 1.3\" fill=\"none\" stroke=\"#4f8a5b\" stroke-width=\"2\"/><path d=\"M19.5 4.8v4.8h-4.8M4.5 19.2v-4.8h4.8\" fill=\"none\" stroke=\"#c4604a\" stroke-width=\"2\"/></g>",
    ajustes: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M4 7h16M4 17h16\" fill=\"none\" stroke=\"#4f8a5b\" stroke-width=\"1.8\"/><circle cx=\"9\" cy=\"7\" r=\"2.6\" fill=\"#f6ecd2\"/><circle cx=\"15.5\" cy=\"17\" r=\"2.6\" fill=\"#c4604a\"/></g>",
    campana: "<g stroke=\"#5a3d24\" stroke-width=\"1.2\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><path d=\"M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z\" fill=\"#f6ecd2\"/><path d=\"M10 20.5a2.2 2.2 0 0 0 4 0\" fill=\"#4f8a5b\"/><circle cx=\"12\" cy=\"4.6\" r=\"1.4\" fill=\"#c4604a\"/></g>",
  };
  const svg = (k, tam) => PICTO[k] ? `<svg class="ic ic-color" viewBox="0 0 24 24" width="${tam || 24}" height="${tam || 24}" aria-hidden="true" focusable="false">${PICTO[k]}</svg>` : (SV[k] ? `<svg class="ic" viewBox="0 0 24 24" width="${tam || 24}" height="${tam || 24}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SV[k]}</svg>` : '');
  // F987 · Banda de identidad: escena de Tierra Buena (cielo, sol, colinas y brote). Va en Perfil y en Mi iglesia (pastor). SVG en línea, sin imágenes externas.
  // F989 · Banda de identidad con escena según el lugar: camino (Perfil), comunidad (Mi iglesia y miembro), crecer (Vida). SVG en línea.
  const BANDA_BASE = '<rect width="320" height="110" fill="#e4f0f6"/><rect width="320" height="70" fill="#f1f7ea"/>';
  const BANDA_COLINAS = '<path d="M0 72C60 52 110 60 160 56S270 48 320 62V110H0Z" fill="#a9cf9b"/><path d="M0 88C80 74 150 84 230 76S290 78 320 82V110H0Z" fill="#6aa86b"/>';
  const BANDA_CRECER = (() => { let g = '<circle cx="282" cy="26" r="11" fill="#fbe8a6"/><rect x="0" y="86" width="320" height="24" fill="#6aa86b"/>'; [[52, 16], [104, 26], [160, 38], [216, 48], [268, 30]].forEach(([x, h]) => { const y1 = 88 - h * 0.6, y2 = 88 - h * 0.7; g += '<path d="M' + x + ' 88V' + (88 - h) + '" stroke="#4f8a55" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="' + (x - 6) + '" cy="' + y1 + '" rx="6" ry="3.2" transform="rotate(-30 ' + (x - 6) + ' ' + y1 + ')" fill="#7cc08a"/><ellipse cx="' + (x + 6) + '" cy="' + y2 + '" rx="6" ry="3.2" transform="rotate(30 ' + (x + 6) + ' ' + y2 + ')" fill="#7cc08a"/><circle cx="' + x + '" cy="' + (88 - h) + '" r="3" fill="#4f8a55"/>'; }); return g; })();
  const BANDA_ESCENAS = { union: '<circle cx="160" cy="40" r="70" fill="#fff6d6" opacity=".35"/><circle cx="160" cy="36" r="26" fill="#5f9a62"/><circle cx="138" cy="46" r="16" fill="#7cb36f"/><circle cx="182" cy="46" r="16" fill="#7cb36f"/><rect x="157" y="56" width="6" height="24" rx="2" fill="#7a5a3c"/><circle cx="52" cy="84" r="6" fill="#e8b58c"/><path d="M42 110 Q42 92 52 92 Q62 92 62 110Z" fill="#c4604a"/><circle cx="100" cy="84" r="6" fill="#e8b58c"/><path d="M90 110 Q90 92 100 92 Q110 92 110 110Z" fill="#7a5a3c"/><circle cx="220" cy="84" r="6" fill="#e8b58c"/><path d="M210 110 Q210 92 220 92 Q230 92 230 110Z" fill="#4f8a55"/><circle cx="268" cy="84" r="6" fill="#e8b58c"/><path d="M258 110 Q258 92 268 92 Q278 92 278 110Z" fill="#c98a5e"/><path d="M62 100 Q81 96 90 100 M110 100 Q160 94 210 100" stroke="#e8b58c" stroke-width="3" fill="none" stroke-linecap="round"/>', pastor: '<circle cx="640" cy="210" r="250" fill="#fff6d6" opacity=".4"/><path d="M520 720 610 430 670 430 760 720Z" fill="#e8d3a6"/><path d="M640 430V250" stroke="#5a3d24" stroke-width="10" stroke-linecap="round"/><path d="M600 250h80" stroke="#5a3d24" stroke-width="8" stroke-linecap="round"/><rect x="620" y="200" width="40" height="50" rx="8" fill="#fbe8a6" stroke="#5a3d24" stroke-width="4"/><circle cx="640" cy="225" r="110" fill="#fbe8a6" opacity=".22"/>', palabra: '<circle cx="250" cy="34" r="14" fill="#fbe8a6"/><path d="M160 96C138 84 118 82 96 86V52C118 48 140 50 160 60Z" fill="#f6ecd2" stroke="#5a3d24" stroke-width="1.4" stroke-linejoin="round"/><path d="M160 96C182 84 202 82 224 86V52C202 48 180 50 160 60Z" fill="#f6ecd2" stroke="#5a3d24" stroke-width="1.4" stroke-linejoin="round"/><path d="M160 60V96" stroke="#5a3d24" stroke-width="1.4"/><path d="M104 62c10 0 19 1 30 6M184 68c11-5 20-6 30-6" stroke="#c4604a" stroke-width="1.2" fill="none" stroke-linecap="round"/><g transform="translate(152 40) scale(.6)">' + PICTO.brote + '</g>', camino: '<circle cx="200" cy="52" r="16" fill="#fbe8a6"/><path d="M140 110 192 66 202 66 178 110Z" fill="#e8d3a6"/><rect x="58" y="60" width="5" height="24" fill="#7a5a3c"/><circle cx="60" cy="52" r="13" fill="#4f8a55"/><circle cx="50" cy="58" r="9" fill="#4f8a55"/><circle cx="71" cy="58" r="9" fill="#4f8a55"/>', comunidad: '<rect x="155" y="14" width="10" height="16" fill="#f6ecd2"/><path d="M153 14 160 4 167 14Z" fill="#c4604a"/><path d="M122 56 160 28 198 56Z" fill="#c4604a"/><rect x="128" y="54" width="64" height="40" fill="#f6ecd2"/><rect x="152" y="74" width="16" height="20" fill="#7a5a3c"/><circle cx="160" cy="64" r="4" fill="#fbe8a6"/><rect x="77" y="70" width="5" height="18" fill="#7a5a3c"/><circle cx="80" cy="66" r="16" fill="#4f8a55"/><rect x="238" y="72" width="5" height="16" fill="#7a5a3c"/><circle cx="240" cy="68" r="14" fill="#4f8a55"/>', crecer: BANDA_CRECER };
  const bandaTB = (tipo) => { const t = BANDA_ESCENAS[tipo] ? tipo : 'camino'; return '<svg class="tb-banda" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + BANDA_BASE + (t === 'crecer' ? '' : BANDA_COLINAS) + BANDA_ESCENAS[t] + '</svg>'; };
  const icono = (e, tam) => { const k = EMO[String(e).replace(/\uFE0F/g, '')]; return k ? svg(k, tam) : e; };
  const activa = (ico, titulo, ayuda, ir) => `<button type="button" class="card" data-ir="${ir}"><div class="t"><span aria-hidden="true">${icono(ico)}</span>${titulo}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${ayuda}</p></button>`;


  // F882: chispas de celebración en cualquier botón (se quitan solas; respeta «reducir movimiento»).
  function confeti(ancla) {
    if (!ancla || !document.body || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const r = ancla.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, col = ['cf-a', 'cf-b', 'cf-c', 'cf-d'];
    for (let i = 0; i < 16; i++) {
      const e = document.createElement('i'), a = (i / 16) * Math.PI * 2 + Math.random() * .6, d = 40 + Math.random() * 64;
      e.className = 'cf-pt ' + col[i % 4]; e.style.left = cx + 'px'; e.style.top = cy + 'px';
      e.style.setProperty('--dx', Math.cos(a) * d + 'px'); e.style.setProperty('--dy', Math.sin(a) * d - 18 + 'px');
      document.body.appendChild(e); setTimeout(() => e.remove(), 900);
    }
  }

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

  // ---------- Cuenta con correo y contraseña (F868) ----------
  // Misma cuenta de Supabase Auth que usa el escritorio. La contraseña se escribe siempre y NUNCA se guarda; en este teléfono
  // solo queda la sesión (token) hasta «Cerrar sesión». Su iglesia (código + llave) viaja en los datos privados de la cuenta
  // (user_metadata.tb_iglesia): así, en otro teléfono, basta entrar con el correo y no hay que copiar la llave a mano.
  const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MIN_CLAVE = 8;
  let ultimoErrAuth = '';                          // F873: dato técnico del último fallo de cuenta, para quien ayude a resolver
  function motivoAuth(e) {
    const t = String((e && e.message) || ''), st = e && e.status;
    ultimoErrAuth = [st, e && e.code, t].filter(Boolean).join(' · ').slice(0, 160);
    if (/invalid login|invalid credentials/i.test(t)) return 'credenciales';
    const cod = String((e && e.code) || '');
    if (/sending.*(confirmation|email|mail)|error sending|smtp/i.test(t) || cod === 'unexpected_failure' || st >= 500) return 'correo-no-sale';   // F875: antes caía en «Falta confirmar tu correo» aunque la cuenta NO se había creado
    if (cod === 'signup_disabled' || /signups? (not allowed|are disabled|disabled)/i.test(t)) return 'registro-cerrado';
    if (cod === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(t)) return 'correo-rechazado';
    if (cod === 'email_not_confirmed' || /not confirmed/i.test(t)) return 'sin-confirmar';
    if (st === 429 || cod === 'over_email_send_rate_limit' || /rate limit|too many|security purposes/i.test(t)) return 'demasiados';
    if (cod === 'user_already_exists' || /already registered|already been registered/i.test(t)) return 'ya-existe';
    if (cod === 'weak_password' || /weak|password should|pwned/i.test(t)) return 'clave-debil';
    if (/fetch|network|failed to/i.test(t)) return 'sin-internet';
    return 'otro';
  }
  const hayAuth = () => !!(SB && SB.auth);
  async function cuentaEntrar(correo, clave) {
    if (!hayAuth()) return { ok: false, motivo: 'sin-internet' };
    try {
      const { data, error } = await SB.auth.signInWithPassword({ email: correo, password: clave });
      if (error) return { ok: false, motivo: motivoAuth(error) };
      return data && data.user ? { ok: true, user: data.user } : { ok: false, motivo: 'otro' };
    } catch (e) { return { ok: false, motivo: 'sin-internet' }; }
  }
  async function cuentaCrear(correo, clave) {
    if (!hayAuth()) return { ok: false, motivo: 'sin-internet' };
    try {
      const { data, error } = await SB.auth.signUp({ email: correo, password: clave, options: { emailRedirectTo: URL_VUELTA() } });
      if (error) return { ok: false, motivo: motivoAuth(error) };
      const u = data && data.user;
      if (u && Array.isArray(u.identities) && u.identities.length === 0) return { ok: false, motivo: 'ya-existe' };   // Supabase no revela correos ya usados: llega «vacío»
      if (data && data.session && u) return { ok: true, user: u };
      return { ok: true, confirmar: true };                                                                            // la cuenta pide confirmar el correo antes de entrar
    } catch (e) { return { ok: false, motivo: 'sin-internet' }; }
  }
  const iglesiaDeCuenta = (user) => {
    const m = user && user.user_metadata && user.user_metadata.tb_iglesia;
    return m && /^[A-Z0-9]{6}$/.test(m.c || '') && /^[0-9a-f]{64}$/.test(m.k || '') ? { codigo: m.c, clave: m.k } : null;
  };
  async function iglesiaAcuenta(id) {              // guarda (o borra, si id es null) la iglesia en los datos privados de la cuenta
    if (!hayAuth() || !leer(K_CUENTA)) return false;
    try { const { error } = await SB.auth.updateUser({ data: { tb_iglesia: id ? { c: id.codigo, k: id.clave } : null } }); return !error; } catch (e) { return false; }
  }
  async function restaurarIglesia(c, k) {          // misma comprobación que «Entrar con mi llave»
    const v = await rpc('miembro_validar', { p_codigo: c, p_clave: k });
    if (!v.ok) return { ok: false, motivo: 'sin-internet' };
    if (!v.data || v.data.valido !== true) return { ok: false, motivo: 'llave-invalida' };
    const p = await rpc('iglesia_perfil', { p_codigo: c });
    guardar(K_ID, { codigo: c, nombre: v.data.nombre, clave: k, creadoEn: new Date().toISOString() });
    guardar(K_IG, { codigo: c, nombre: (p.ok && p.data && p.data.nombre) || null });
    borrar(K_SOL);
    return { ok: true };
  }
  async function despuesDeCuenta(user) {
    guardar(K_CUENTA, { correo: user.email || '' }); marcaDentro();
    try { if (hayAuth() && SB.rpc) await SB.rpc('cuenta_registrar', { p_plataforma: 'movil' }); } catch (e) { /* F879: el registro es un extra; no frena la entrada */ }
    await syncBajar(user);                          // F872: trae los avances de la cuenta (y sube los de este teléfono si la cuenta está vacía)
    const local = leer(K_ID), enCuenta = iglesiaDeCuenta(user);
    if (enCuenta && !(local && local.codigo === enCuenta.codigo && local.clave === enCuenta.clave)) {
      if (local && typeof confirm === 'function' && !confirm('Tu cuenta ya tiene una iglesia guardada. ¿Usarla en lugar de la que está ahora en este teléfono?')) { await iglesiaAcuenta(local); return vistaIglesia(); }
      const r = await restaurarIglesia(enCuenta.codigo, enCuenta.clave);
      if (r.ok) return vistaIglesia();
      if (local) { await iglesiaAcuenta(local); return vistaIglesia(); }
      return vistaUnirse();                         // la iglesia guardada ya no sirve (por ejemplo, la persona salió de ella)
    }
    if (local && !enCuenta) await iglesiaAcuenta(local);
    return vistaIglesia();
  }
  async function cerrarSesionCuenta() {
    await syncCerrar();                             // F872: lo pendiente viaja a la cuenta antes de salir
    try { if (hayAuth()) await SB.auth.signOut(); } catch (e) { /* sin red: igual se cierra aquí */ }
    borrar(K_CUENTA); borrar('tb_movil_juntos_cache'); borrar(K_ID); borrar(K_SOL); borrar(K_IG); marcaDentro();
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ }
    vistaUnirse();
  }
  // F998 · Eliminar mi cuenta y mis datos (requisito de las tiendas). Pide escribir ELIMINAR. Borra en línea si el servicio está activo y siempre borra este teléfono.
  async function eliminarCuentaTodo() {
    const txt = prompt('Esto borra tu cuenta, tus notas, tus peticiones y todo lo guardado en este teléfono. No se puede deshacer.\n\nPara confirmar, escribe ELIMINAR:');
    if (String(txt || '').trim().toUpperCase() !== 'ELIMINAR') { alert('No se eliminó nada.'); return; }
    let enLinea = 'no-aplica';
    if (hayAuth()) {
      const r = await rpc('eliminar_mi_cuenta', {});
      const d = r && r.data !== undefined ? r.data : r;
      if (d && d.ok) enLinea = 'ok';
      else if (d && d.mensaje === 'aal2') { alert('Primero confirma con tu segundo paso de seguridad y vuelve a intentarlo.'); return; }
      else enLinea = (r && r.motivo) || (d && d.mensaje) || 'pendiente';
    }
    try { if (hayAuth()) await SB.auth.signOut(); } catch (e) { /* sin red: igual se borra aquí */ }
    try { Object.keys(localStorage).filter((k) => k.indexOf('tb_') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ }
    try { sessionStorage.clear(); } catch (e) { /* nada */ }
    alert(enLinea === 'ok' ? 'Tu cuenta y tus datos se eliminaron.' : 'Se borraron los datos de este teléfono y tu sesión. La eliminación en línea todavía no está activa: avisa al equipo para completarla.');
    vistaUnirse();
  }
  const copiaTexto = () => {   // F955: «Copia de seguridad» visible para la persona (la hace resguardo.js)
    try { const i = window.TBResguardo && window.TBResguardo.info && window.TBResguardo.info(); if (!i || !i.fecha) return 'Copia de seguridad: aún no hay una en este teléfono.'; const d = new Date(i.fecha); return 'Copia de seguridad en este teléfono: ' + d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + '.'; } catch (e) { return ''; }
  };
  const cuentaBarra = () => { const c = leer(K_CUENTA); return c ? `<p class="suave" id="cuentaBarra">Sesión iniciada: <b>${esc(c.correo)}</b> · <button type="button" class="enlace" id="cuentaSalir">Cerrar sesión</button><br><span id="sincEstado" class="sinc">${esc(syncTexto())}</span><br><span id="copiaEstado" class="sinc">${esc(copiaTexto())}</span></p>` : ''; };
  // ---------- F873 · Revisar la conexión con las cuentas y reenviar el correo de confirmación ----------
  async function diagnosticoNube() {
    const L = [], cab = { apikey: SUPABASE_ANON_KEY };
    let st = null;
    try {
      const r = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: cab });
      if (!r.ok) { L.push(['mal', 'El servicio de cuentas tiene un problema en este momento (código ' + r.status + '). Avisa a quien administra la app.']); return L; }
      st = await r.json(); L.push(['bien', 'Tu conexión con las cuentas funciona bien.']);
    } catch (e) { L.push(['mal', navigator.onLine ? 'No logramos conectar con las cuentas. Revisa tu internet; si todo está bien, avisa a quien administra la app.' : 'Tu teléfono no tiene internet en este momento.']); return L; }
    if (st.external && st.external.email === false) L.push(['mal', 'Entrar con correo está apagado. Avisa a quien administra la app.']);
    else L.push(['bien', 'El ingreso con correo está activo.']);
    if (st.disable_signup) L.push(['mal', 'Crear cuentas nuevas está apagado. Avisa a quien administra la app.']);
    else L.push(['bien', 'Se pueden crear cuentas nuevas.']);
    L.push(st.mailer_autoconfirm ? ['bien', 'Las cuentas nuevas entran de inmediato.'] : ['aviso', 'Las cuentas nuevas piden confirmar el correo: el mensaje puede tardar o ir a «spam». Si no llega, espera un rato y revisa «spam».']);
    try {
      const t = await fetch(SUPABASE_URL + '/rest/v1/avances_cuenta?select=clave&limit=1', { headers: cab });
      L.push(t.status === 404 ? ['aviso', 'La copia de tus avances en la nube aún no está activada. Por ahora tus notas se guardan solo en este teléfono.'] : ['bien', 'La copia de avances en la nube está lista.']);
    } catch (e) { /* ya se avisó arriba */ }
    return L;
  }
  const pintarDiag = (L, caja) => { caja.innerHTML = L.map((x) => `<p class="diag-${x[0]}"><span aria-hidden="true">${x[0] === 'bien' ? '✓' : x[0] === 'mal' ? '✕' : '!'}</span> ${esc(x[1])}</p>`).join(''); caja.hidden = false; };
  async function reenviarConfirmacion(correo) {
    if (!hayAuth() || !SB.auth.resend) return { ok: false, motivo: 'sin-internet' };
    try { const { error } = await SB.auth.resend({ type: 'signup', email: correo, options: { emailRedirectTo: URL_VUELTA() } }); return error ? { ok: false, motivo: motivoAuth(error) } : { ok: true }; }
    catch (e) { return { ok: false, motivo: 'sin-internet' }; }
  }
  function vistaCuenta(modo) {
    const crear = modo === 'crear';
    $('#pantalla').innerHTML = `
      <button type="button" class="volver" id="atras">‹ Entrar</button>
      <div class="cuenta-ico" aria-hidden="true">${crear ? svg('brote', 40) : svg('correo', 40)}</div>
      <h1>${crear ? 'Crear mi cuenta' : 'Entrar con mi correo'}</h1><div class="filete"></div>
      <div class="chips" role="group" aria-label="Elegir">
        <button type="button" class="chip${crear ? '' : ' on'}" data-modo="entrar" aria-pressed="${!crear}">Entrar</button>
        <button type="button" class="chip${crear ? ' on' : ''}" data-modo="crear" aria-pressed="${crear}">Crear cuenta</button>
      </div>
      <p class="suave">${crear ? 'Si ya usas Tierra Buena en el computador, escribe el mismo correo y la misma contraseña.' : 'Usa el correo y la contraseña de tu cuenta.'}</p>
      <label for="cco">Correo</label>
      <input id="cco" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" maxlength="120">
      <label for="ccl">Contraseña</label>
      <span class="clave"><input id="ccl" type="password" autocomplete="${crear ? 'new-password' : 'current-password'}" maxlength="128"><button type="button" class="ver" data-ver="ccl,ccl2" aria-pressed="false">Ver</button></span>
      ${crear ? '<div class="fuerza" aria-hidden="true"><i id="ccf" data-f="0"></i></div><p class="suave fuerza-txt" id="ccft">Mínimo 8 caracteres. Una frase corta con números es mejor que una palabra sola.</p><label for="ccl2">Repite la contraseña</label><input id="ccl2" type="password" autocomplete="new-password" maxlength="128">' : ''}
      <p id="err" class="error" role="alert" hidden></p><p id="tecnico" class="tecnico" hidden></p>
      <p id="msg" class="ok" role="status" hidden></p>
      <button id="ccgo" class="btn">${crear ? 'Crear mi cuenta' : 'Entrar'}</button>
      ${crear ? '' : '<p class="m0t"><button type="button" class="enlace" id="ccolvido">¿Olvidaste tu contraseña?</button></p>'}
      <p id="ccreenv" class="m0t" hidden><button type="button" class="enlace" id="ccreenvbtn">Reenviar el correo de confirmación</button></p>
      <p class="m0t"><button type="button" class="enlace" id="ccdiag">¿No funciona? Revisar la conexión</button></p><div id="diag" class="diag" role="status" hidden></div>`;
    document.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => {      // «Ver / Ocultar» la contraseña
      const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Ocultar' : 'Ver';
      b.dataset.ver.split(',').forEach((id) => { const e = document.getElementById(id); if (e) e.type = on ? 'text' : 'password'; });
    }));
    const fz = $('#ccf');
    if (fz) $('#ccl').addEventListener('input', () => {                                              // barra de fuerza de la contraseña
      const v = $('#ccl').value; let n = 0;
      if (v.length >= 8) n++; if (v.length >= 12) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v)) n++;
      const f = !v ? 0 : v.length < 8 ? 1 : Math.min(4, Math.max(2, n - 1));
      fz.dataset.f = String(f); $('#ccft').textContent = ['Mínimo 8 caracteres. Una frase corta con números es mejor que una palabra sola.', 'Muy corta todavía.', 'Aceptable. Puedes hacerla más larga.', 'Buena.', 'Muy buena.'][f];
    });
    $('#ccdiag').onclick = async () => { const c = $('#diag'); c.hidden = false; c.innerHTML = '<p class="suave">Revisando…</p>'; pintarDiag(await diagnosticoNube(), c); };
    $('#ccreenvbtn').onclick = async () => {
      const correo = $('#cco').value.trim().toLowerCase(); if (!CORREO_RE.test(correo)) return error(MOTIVOS['correo-invalido']);
      const r = await reenviarConfirmacion(correo); if (r.ok) { error(''); msg('Listo, te mandamos otro correo. Revisa también la carpeta de spam.', true); } else error(MOTIVOS[r.motivo] || 'No pudimos reenviarlo. Inténtalo en unos minutos.');
    };
    $('#atras').onclick = vistaUnirse;
    const ol = $('#ccolvido'); if (ol) ol.onclick = () => vistaOlvide($('#cco').value.trim());
    document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => vistaCuenta(b.dataset.modo)));
    const enviar = async () => {
      const correo = $('#cco').value.trim().toLowerCase(), clave = $('#ccl').value;
      error(''); msg('');
      if (!CORREO_RE.test(correo)) return error(MOTIVOS['correo-invalido']);
      if (crear && clave.length < MIN_CLAVE) return error(MOTIVOS['clave-corta']);
      if (!crear && !clave) return error('Escribe tu contraseña para entrar.');
      if (crear && clave !== $('#ccl2').value) return error(MOTIVOS['claves-distintas']);
      const b = $('#ccgo'); b.disabled = true; b.textContent = crear ? 'Creando…' : 'Entrando…';
      let r = crear ? await cuentaCrear(correo, clave) : await cuentaEntrar(correo, clave);
      // F878: cuenta unica. Si la cuenta nunca llego a la nube (se creo solo en el escritorio), se activa aqui con el mismo correo y clave.
      // Si el correo ya existe con otra clave, Supabase lo avisa ('ya-existe') y se muestra «contrasena incorrecta».
      if (!crear && !r.ok && r.motivo === 'credenciales' && typeof confirm === 'function' &&
          confirm('No encontramos esa cuenta en la nube. Si ya la usas en el computador, podemos activarla aqui con el mismo correo y contrasena. ¿Activarla ahora?')) {
        const r2 = await cuentaCrear(correo, clave);
        if (r2.ok) r = r2; else if (r2.motivo !== 'ya-existe') r = r2;
      }
      b.disabled = false; b.textContent = crear ? 'Crear mi cuenta' : 'Entrar';
      if (!r.ok) {
        error(MOTIVOS[r.motivo] || 'No pudimos entrar. Revisa tus datos e inténtalo otra vez.');
        const tc = $('#tecnico'); if (tc) { tc.textContent = ultimoErrAuth ? 'Para quien te ayude: ' + ultimoErrAuth : ''; tc.hidden = !ultimoErrAuth; }
        if ($('#ccreenv')) $('#ccreenv').hidden = r.motivo !== 'sin-confirmar';
        return;
      }
      if ($('#tecnico')) $('#tecnico').hidden = true;
      if (r.confirmar) { if ($('#ccreenv')) $('#ccreenv').hidden = false; $('#ccl').value = ''; if ($('#ccl2')) $('#ccl2').value = ''; return msg('Te enviamos un correo para confirmar tu dirección. Toca el enlace del mensaje y luego vuelve aquí a «Entrar».', true); }
      $('#ccl').value = ''; if ($('#ccl2')) $('#ccl2').value = '';
      await despuesDeCuenta(r.user);
    };
    $('#ccgo').onclick = enviar;
    ['#cco', '#ccl', '#ccl2'].forEach((q) => { const e = $(q); if (e && e.addEventListener) e.addEventListener('keydown', (ev) => { if (ev && ev.key === 'Enter') enviar(); }); });
    $('#cco').focus();
  }

  // ---------- Olvidé mi contraseña (F869) ----------
  // Supabase manda un enlace al correo; al tocarlo vuelve a esta página y avisa PASSWORD_RECOVERY: ahí se pide la contraseña nueva.
  // Requiere en Supabase (Authentication → URL Configuration): «Site URL» = la dirección de esta página (GitHub Pages).
  const URL_VUELTA = () => { try { return location.origin + location.pathname; } catch (e) { return undefined; } };
  function vistaOlvide(correo) {
    $('#pantalla').innerHTML = `
      <button type="button" class="volver" id="atras">‹ Entrar</button>
      <h1>Recuperar mi contraseña</h1><div class="filete"></div>
      <p>Escribe el correo de tu cuenta. Te enviamos un enlace para elegir una contraseña nueva.</p>
      <label for="cco">Correo</label>
      <input id="cco" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" maxlength="120" value="${esc(correo || '')}">
      <p id="err" class="error" role="alert" hidden></p>
      <p id="msg" class="ok" role="status" hidden></p>
      <button id="ccgo" class="btn">Enviarme el enlace</button>`;
    $('#atras').onclick = () => vistaCuenta('entrar');
    $('#ccgo').onclick = async () => {
      const c = $('#cco').value.trim().toLowerCase(); error(''); msg('');
      if (!CORREO_RE.test(c)) return error(MOTIVOS['correo-invalido']);
      if (!hayAuth() || !SB.auth.resetPasswordForEmail) return error(MOTIVOS['sin-internet']);
      const b = $('#ccgo'); b.disabled = true; b.textContent = 'Enviando…';
      let r; try { r = await SB.auth.resetPasswordForEmail(c, { redirectTo: URL_VUELTA() }); } catch (e) { r = { error: { message: 'Failed to fetch' } }; }
      b.disabled = false; b.textContent = 'Enviarme el enlace';
      const m = r && r.error ? motivoAuth(r.error) : '';
      if (m === 'sin-internet' || m === 'demasiados') return error(MOTIVOS[m]);
      msg('Si ese correo tiene una cuenta, te enviamos un enlace. Revisa tu bandeja (y la carpeta de spam), tócalo y vuelve aquí.', true);   // misma respuesta exista o no la cuenta
    };
    $('#cco').focus();
  }
  function vistaNuevaClave() {
    $('#pantalla').innerHTML = `
      <h1>Elige tu contraseña nueva</h1><div class="filete"></div>
      <p class="suave">Mínimo 8 caracteres. Anótala en un lugar seguro.</p>
      <label for="ccl">Contraseña nueva</label>
      <input id="ccl" type="password" autocomplete="new-password" maxlength="128">
      <label for="ccl2">Repite la contraseña</label>
      <input id="ccl2" type="password" autocomplete="new-password" maxlength="128">
      <p id="err" class="error" role="alert" hidden></p>
      <button id="ccgo" class="btn">Guardar contraseña</button>`;
    $('#ccgo').onclick = async () => {
      const a = $('#ccl').value; error('');
      if (a.length < MIN_CLAVE) return error(MOTIVOS['clave-corta']);
      if (a !== $('#ccl2').value) return error(MOTIVOS['claves-distintas']);
      const b = $('#ccgo'); b.disabled = true; b.textContent = 'Guardando…';
      let r; try { r = await SB.auth.updateUser({ password: a }); } catch (e) { r = { error: { message: 'Failed to fetch' } }; }
      b.disabled = false; b.textContent = 'Guardar contraseña';
      if (r && r.error) return error(MOTIVOS[motivoAuth(r.error)] || 'No pudimos guardar la contraseña. El enlace pudo haber vencido: pide otro.');
      $('#ccl').value = ''; $('#ccl2').value = '';
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ }
      if (r && r.data && r.data.user) return despuesDeCuenta(r.data.user);
      vistaCuenta('entrar');
    };
    $('#ccl').focus();
  }
  // Enlaces que vuelven del correo (confirmar cuenta o recuperar contraseña).
  let vinoDeEnlace = false; try { vinoDeEnlace = /access_token=|type=recovery|type=signup/.test(location.hash || ''); } catch (e) { /* nada */ }
  if (hayAuth() && SB.auth.onAuthStateChange) SB.auth.onAuthStateChange((ev, ses) => {
    if (ev === 'PASSWORD_RECOVERY') { vinoDeEnlace = false; setTimeout(vistaNuevaClave, 0); return; }
    if (ev === 'SIGNED_IN' && vinoDeEnlace && ses && ses.user && !leer(K_CUENTA)) { vinoDeEnlace = false; setTimeout(() => { try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ } despuesDeCuenta(ses.user); }, 0); }
  });

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
      box.innerHTML = `<button type="button" class="btn sec" id="instalarYa">${svg('telefono', 20)} Instalar en este ${/ipad|tablet/i.test(NAV().userAgent || '') ? 'dispositivo' : 'teléfono'}</button>`;
      $('#instalarYa').onclick = async () => { try { promptInstalar.prompt(); await promptInstalar.userChoice; } catch (e) { /* nada */ } promptInstalar = null; pintarInstalar(box); };
    } else if (esIOS()) {
      box.innerHTML = `<div class="card ayuda"><b>📲 Dejarla como app:</b> toca <b>Compartir</b> ⬆️ (abajo en Safari) y luego <b>«Agregar a pantalla de inicio»</b>.</div>`;
    } else {
      box.innerHTML = `<p class="suave">📲 Para dejarla como app: menú ⋮ del navegador → <b>«Instalar app»</b> o «Agregar a pantalla de inicio».</p>`;
    }
  }
  async function instalarUnToque() {                       // F898: un solo botón; si el navegador no deja instalar directo, muestra los pasos de SU teléfono
    if (promptInstalar && !yaInstalada()) { try { promptInstalar.prompt(); await promptInstalar.userChoice; } catch (e) { /* nada */ } promptInstalar = null; document.querySelectorAll('[data-instalar-box]').forEach(pintarInstalar); return; }
    vistaInstalar();
  }
  function vistaInstalar() {
    const ya = yaInstalada(), ios = esIOS();
    const p = ya ? ['Ya tienes Tierra Buena instalada. Ábrela desde el ícono de tu pantalla de inicio.'] : ios
      ? ['1. Abre esta página en Safari (si estás en otro navegador, copia el enlace y pégalo en Safari).', '2. Toca el botón Compartir: el cuadrado con la flecha hacia arriba.', '3. Elige «Agregar a pantalla de inicio» y toca «Agregar».']
      : ['1. Toca el menú ⋮ de tu navegador (arriba a la derecha).', '2. Elige «Instalar app» o «Agregar a pantalla de inicio».', '3. Confirma. El ícono de Tierra Buena aparece junto a tus otras apps.'];
    textoPantalla('Instalar la app', p.concat(ya ? [] : ['Después, mantén tocado el ícono para ir directo a tu versículo, a la Biblia o a tus fechas importantes.']), '');
  }
  const instalarChip = () => { try { if (yaInstalada() || localStorage.getItem('tb_movil_inst_no') === String(new Date().getMonth())) return ''; } catch (e) { return ''; } return `<span class="hoy-inst"><button type="button" class="hoy-fecha" data-ir="inst">${svg('compartir', 16)}<span><b>Instalar la app</b> · un toque</span></button><button type="button" class="hoy-inst-x" data-ir="instno" aria-label="Ahora no">${svg('x', 14)}</button></span>`; };
  const bloqueInstalar = () => '<div data-instalar-box class="sep16"></div>';
  const codigoDeEnlace = () => { try { const q = new URLSearchParams(location.search.slice(1) || location.hash.replace(/^#\??/, '')); const c = (q.get('c') || q.get('codigo') || '').toUpperCase(); return /^[A-Z0-9]{6}$/.test(c) ? c : ''; } catch (e) { return ''; } };

  // ---------- F885: el código de la iglesia vive en un ícono arriba (ya no es una opción del inicio de sesión) ----------
  let codigoPrevio = '';
  const icoCodigoHTML = () => `<button type="button" class="ico-cod" id="icoCodigo" aria-label="Tengo el código de mi iglesia"><span class="ico-cod-in">${svg('iglesia', 22)}</span><span class="ico-cod-t">Mi código</span></button>`;
  const icoPastorHTML = () => `<button type="button" class="ico-cod ico-pas" id="icoPastor" aria-label="Soy pastor"><span class="ico-cod-in">${svg('escudo', 22)}</span><span class="ico-cod-t">Soy pastor</span></button>`;
  const ligaCodigo = () => { const b = $('#icoCodigo'); if (b) b.onclick = () => { vibra(); codigoHoja(); }; const q = $('#icoPastor'); if (q) q.onclick = () => { vibra(); pastorHoja(); }; };
  const abrirJuntos = () => { try { if (window.TBJuntos) window.TBJuntos.abrir(); } catch (e) { /* sin Juntos */ } };
  function irACodigo(cod) { if (!haySesion()) return puerta(); try { onbParar(); entrandoPon(false); } catch (e) { /* nada */ } codigoPrevio = /^[A-Z0-9]{6}$/.test(cod || '') ? cod : ''; vistaCodigo(); }
  function codigoHoja() {
    if (!haySesion()) return puerta();                                  // hoja inferior: se escribe el código y se sigue al paso normal de unirse
    const h = nuevoEl(`<div class="hoja" id="hojaCodigo" role="dialog" aria-modal="true" aria-label="Código de mi iglesia"><div class="hoja-in hoja-cod"><div class="hoja-asa" aria-hidden="true"></div><div class="hoja-cod-ic" aria-hidden="true">${svg('iglesia', 30)}</div><h3>El código de tu iglesia</h3><p class="suave">Tu pastor te lo da. Son 6 letras o números.</p><input id="codHoja" class="cod-in" type="text" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" inputmode="text" placeholder="AB12CD" aria-label="Código de 6 letras o números"><div class="cod-pts" id="codPts" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><p id="codErr" class="error" role="alert" hidden></p><div class="hoja-bt"><button type="button" class="btn" id="codSig">Buscar mi iglesia</button><button type="button" class="btn sec" id="codX">Ahora no</button></div></div></div>`);
    if (!h) return irACodigo('');                          // si la hoja no se puede mostrar, va directo a la pantalla del código
    document.body.appendChild(h);
    const inp = $('#codHoja'), cerrar = () => { try { h.remove(); } catch (e) { /* nada */ } };
    const limpiar = () => { const v = String(inp.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); if (inp.value !== v) inp.value = v; document.querySelectorAll('#codPts i').forEach((d, i) => clase(d, 'on', i < v.length)); const e = $('#codErr'); if (e) e.hidden = true; return v; };
    const seguir = () => {
      const v = limpiar();
      if (!/^[A-Z0-9]{6}$/.test(v)) { const e = $('#codErr'); if (e) { e.textContent = 'El código tiene 6 letras o números.'; e.hidden = false; } clase(inp, 'sacude', false); void (inp.offsetWidth); clase(inp, 'sacude', true); vibra(); return; }
      cerrar(); irACodigo(v);
    };
    inp.addEventListener('input', limpiar);
    inp.addEventListener('keydown', (e) => { if (e && e.key === 'Enter') seguir(); });
    $('#codSig').onclick = seguir; $('#codX').onclick = cerrar;
    h.addEventListener('click', (e) => { if (e && e.target === h) cerrar(); });
    setTimeout(() => { try { inp.focus(); } catch (e) { /* nada */ } }, 150);
  }

  // F936 · Sesión obligatoria: sin cuenta iniciada solo se ve esta puerta (entrar o crear cuenta). El inicio de sesión en sí no cambia: solo se abre desde aquí.
  function puerta() {
    entrandoPon(false); try { onbParar(); } catch (e) { /* nada */ }
    $('#pantalla').innerHTML = `
      <div class="hero hero-viva"><span class="hv-caja" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="hero-ico" aria-hidden="true">${svg('hoja', 38)}</div><h1>Bienvenido a Tierra Buena</h1>
      <p>Para ver la Palabra, tu iglesia y tu jardín, primero inicia sesión con tu correo. Es gratis y toma un minuto.</p></div>
      <div class="grid grid-ent">
        ${activa('✉️', 'Entrar con mi correo', 'Si ya tienes cuenta, aquí entras. Es la misma del computador.', 'cuenta')}
        ${activa('🌱', 'Crear mi cuenta', 'Si es tu primera vez, la creas aquí con tu correo.', 'crear')}
      </div>
      ${bloqueInstalar()}`;
    pantEntra('adelante');
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => vistaCuenta(b.dataset.ir === 'crear' ? 'crear' : 'entrar')));
    pintarInstalar($('[data-instalar-box]'));
  }
  function vistaUnirse() {
    if (!leer(K_CUENTA)) return puerta();                  // F936: sin sesión, solo la puerta
    if (codigoDeEnlace()) return vistaCodigo();            // vino de un enlace con el código de su iglesia
    const conCuenta = !!leer(K_CUENTA);
    $('#pantalla').innerHTML = `
      <div class="ent-top">${icoPastorHTML()}${icoCodigoHTML()}</div>
      <div class="hero hero-viva"><span class="hv-caja" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="hero-ico" aria-hidden="true">${svg('iglesia', 38)}</div><h1>Tu iglesia te espera</h1>
      <p>¿Eres miembro? Toca <b>Mi código</b>. ¿Cuidas una iglesia? Toca <b>Soy pastor</b>.</p></div>
      ${cuentaBarra()}
      <div id="tbEjem" class="tb-ejem-caja"></div>
      ${bloqueInstalar()}`;
    ligaCodigo(); pantEntra('adelante');
    try { if (window.TBEjemplos && $('#tbEjem')) window.TBEjemplos.pintar($('#tbEjem'), 'ambos'); } catch (e) { /* sin ejemplos */ }
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ cuenta: () => vistaCuenta('entrar'), codigo: () => codigoHoja(), pastor: () => vistaPastorEntrar(), solo: () => ir('palabra') }[b.dataset.ir]())));
    const so = $('#cuentaSalir'); if (so) so.onclick = cerrarSesionCuenta;
    pintarInstalar($('[data-instalar-box]'));
  }

  function vistaCodigo() {
    const pre = codigoDeEnlace() || codigoPrevio; codigoPrevio = '';
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
      if (e === 'aprobado') { const nuevo = { codigo: sol.codigo, nombre: r.data.nombre || sol.nombre, clave: sol.clave, creadoEn: new Date().toISOString() }; guardar(K_ID, nuevo); borrar(K_SOL); iglesiaAcuenta(nuevo); return vistaIglesia(); }
      if (e === 'rechazada' || e === 'ninguna') { borrar(K_SOL); borrar(K_IG); return vistaUnirse(); }
      $('#msg').textContent = 'Todavía está pendiente. Tu pastor lo verá pronto.';
    };
    $('#can').onclick = () => { if (confirm('¿Cancelar tu solicitud?')) { borrar(K_SOL); borrar(K_IG); vistaUnirse(); } };
  }

  // F1034 · Mi servicio: cuándo puede servir el miembro. Por ahora solo lo ve él; se comparte con el pastor cuando existan las tablas de turnos (SQL pendiente de confirmación).
  const K_DISP = 'tb_movil_disponibilidad';
  const DISP_OPC = [['entre', 'Entre semana'], ['fin', 'Fines de semana'], ['manana', 'Mañanas'], ['tarde', 'Tardes'], ['noche', 'Noches']];
  const dispLeer = () => { const v = leer(K_DISP); return Array.isArray(v) ? v.filter((x) => DISP_OPC.some((o) => o[0] === x)) : []; };
  function vistaMiembro(id) {
    const ig = leer(K_IG);
    $('#pantalla').innerHTML = `
      ${bandaTB('union')}<p class="area-tag area-tag-miembro">Tu comunidad</p><section class="saludo"><div class="perfil-aura" aria-hidden="true"></div>${avatarHTML(id.nombre, perfilLeer(), false)}<div><p class="suave m0">${saludoHora()}</p><h1>Hola, ${esc(id.nombre)}</h1><p class="suave m0">⛪ ${ig ? esc(ig.nombre) : 'Tu iglesia'}</p></div></section>
      <h2 class="sep">Pedir ayuda</h2>
      <div class="grid">${activa('🙏', 'Pedir oración', 'Cuéntale a tu pastor por qué orar.', 'oracion')}${activa('🤝', 'Pedir visita', 'Pide que tu pastor te visite.', 'visita')}</div>
      <h2 class="sep">Vivir con mi iglesia</h2>
      <div class="grid">${activa('📅', 'Agenda', 'Actividades de tu iglesia y de tus grupos.', 'agenda')}${activa('📣', 'Avisos', 'Mensajes de tu pastor y de los líderes.', 'avisos')}${activa('🕍', 'Mis ministerios', 'Los grupos donde sirves y quién los lidera.', 'ministerios')}${activa('🧱', 'Muro', 'Peticiones que tu pastor compartió, para orar juntos.', 'muro')}${activa('🌟', 'Acción del mes', 'Lo que viviremos juntos este mes.', 'accion')}${activa('🤲', 'Juntos hacemos el bien', 'Ideas y movimientos para servir con tu iglesia.', 'juntos')}</div>
      
      <h2 class="sep">Mis turnos</h2><div class="card" id="misTurnos"><p class="suave m0">Cargando tus turnos…</p></div>
      <div id="turLider"></div>
      <h2 class="sep">Quién sirve</h2><div class="card" id="quienSirve"><p class="suave m0">Cargando el rol de la iglesia…</p></div>
      <h2 class="sep">Conversar</h2><div class="lista"><button type="button" class="fila" data-chat="1"><span class="fila-txt">Chat de mi iglesia<small>Bendecir, unirnos y organizar. Sin conflictos en público.</small></span><span class="flecha" aria-hidden="true">›</span></button></div>
      <h2 class="sep">Mi servicio</h2>
      <div class="card"><b>¿Cuándo puedes servir?</b><p class="suave m0t">Marca lo que te sirve. Por ahora solo lo ves tú.</p>
        <div class="chips" role="group" aria-label="Mi disponibilidad">${DISP_OPC.map(([k, t]) => `<button type="button" class="chip${dispLeer().indexOf(k) >= 0 ? ' on' : ''}" data-disp="${k}" aria-pressed="${dispLeer().indexOf(k) >= 0}">${t}</button>`).join('')}</div>
        <p class="suave m0t" id="dispMsg" aria-live="polite"></p></div>
      <div id="tbEjem" class="tb-ejem-caja"></div>
      <section class="card cuidar-pastor"><b>Cuidar a tu pastor</b><p class="suave m0t">Tu pastor también es una persona. Estas son formas concretas de acompañarlo:</p><ul class="ayuda-pasos"><li>Ora por él y por su familia, por su nombre.</li><li>Agradécele con una palabra sincera, en persona o por escrito.</li><li>Respeta sus días de descanso: no todo es urgente.</li><li>Ofrece una ayuda concreta: un servicio, transporte o una compra para el aseo.</li><li>Si ves una carga que no puede con todo, dile que cuentas con él.</li></ul></section><h2 class="sep">Mis cosas</h2>
      <div class="grid">${activa('🕊️', 'Mi oración', 'Tu diario. Solo lo ves tú.', 'mioracion')}${activa('🌱', 'Mi crecimiento', 'Un paso por semana. Solo lo ves tú.', 'crec')}${activa('🔒', 'Mi privacidad', 'Qué ve tu pastor, descargar o borrar tus datos.', 'privacidad')}${activa('❓', 'Ayuda', 'Respuestas cortas a lo que más se pregunta.', 'ayuda')}</div>
      <h2 class="sep">Mi cuenta</h2>
      ${leer(K_CUENTA)
        ? `<div class="card"><div class="t"><span aria-hidden="true">✉️</span>Sesión iniciada</div><p class="suave m0t">${esc(leer(K_CUENTA).correo)}. Tu iglesia queda guardada en tu cuenta: en otro teléfono entras solo con tu correo y contraseña.</p><button type="button" class="btn sec" id="cuentaSalir">Cerrar sesión</button></div>`
        : `<div class="card"><div class="t"><span aria-hidden="true">✉️</span>Guardar mi iglesia con mi correo</div><p class="suave m0t">Crea una cuenta (o entra con la que ya tienes) y tu iglesia te sigue a cualquier teléfono, sin copiar llaves.</p><button type="button" class="btn sec" id="cuentaIr">Entrar o crear cuenta</button></div>`}
      <h2 class="sep">Mi dispositivo</h2>
      <div class="card"><div class="t"><span aria-hidden="true">🔑</span>Pasar mi iglesia a otro dispositivo</div>
        <p class="suave m0t">Copia tu llave y pégala en tu otro teléfono o tablet, en Perfil → «Recuperar mi iglesia». Guárdala como una contraseña: quien la tenga entra como tú.</p>
        <button type="button" class="btn sec" id="verLlave">Mostrar mi llave</button>
        <div id="llaveBox" hidden><textarea id="llaveTxt" rows="3" readonly spellcheck="false"></textarea><button type="button" class="btn" id="copiarLlave">📋 Copiar mi llave</button><p id="llaveMsg" class="ok" role="status"></p></div></div>
      ${bloqueInstalar()}
      <button id="salir" class="btn sec sep28">Salir de mi iglesia</button>`;
    pintarInstalar($('[data-instalar-box]'));
    try { if (window.TBEjemplos && $('#tbEjem')) window.TBEjemplos.pintar($('#tbEjem'), 'miembro'); } catch (e) { /* sin ejemplos */ }
    const cs = $('#cuentaSalir'); if (cs) cs.onclick = () => { if (confirm('¿Cerrar sesión? Tu iglesia sigue guardada en tu cuenta; para volver a entrar necesitarás tu correo y contraseña. Tus notas personales (oración, crecimiento) quedan guardadas en tu cuenta y vuelven cuando entres.')) cerrarSesionCuenta(); };
    const ci = $('#cuentaIr'); if (ci) ci.onclick = () => vistaCuenta('entrar');
    $('#verLlave').onclick = () => {
      let t = ''; try { t = 'PULPITO-ID-' + btoa(JSON.stringify({ c: id.codigo, k: id.clave })); } catch (e) { t = ''; }
      $('#llaveTxt').value = t; $('#llaveBox').hidden = false; $('#verLlave').hidden = true; $('#llaveTxt').focus(); $('#llaveTxt').select();
    };
    $('#copiarLlave').onclick = async () => {
      const t = $('#llaveTxt'); t.select();
      try { await navigator.clipboard.writeText(t.value); $('#llaveMsg').textContent = 'Llave copiada. Ahora pégala en tu otro dispositivo.'; }
      catch (e) { try { document.execCommand('copy'); $('#llaveMsg').textContent = 'Llave copiada.'; } catch (e2) { $('#llaveMsg').textContent = 'Mantén presionado el recuadro y elige «Copiar».'; } }
    };
    // F1038 · Mis turnos: los servicios que el pastor me asignó en los próximos 14 días.
    (async () => {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const r = await rpcRaw('turno_miembro_listar', { p_codigo: id.codigo, p_clave: id.clave, p_desde: hoy.toISOString(), p_hasta: new Date(hoy.getTime() + 14 * 86400000).toISOString() });
      const c = $('#misTurnos'); if (!c) return;
      if (!r.ok) { c.innerHTML = '<p class="suave m0">No pudimos cargar tus turnos. Revisa tu conexión.</p>'; return; }
      const filas = r.data || [];
      c.innerHTML = filas.length ? filas.map((t) => { const d = new Date(t.inicio); return '<p class="m0 t2"><b>' + esc(d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + esc(d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })) + '</b><br>' + esc(t.titulo) + '</p>'; }).join('<hr class="sep16">') : '<p class="suave m0">Por ahora no tienes turnos asignados en las próximas dos semanas.</p>';
    })();
    document.querySelectorAll('[data-chat]').forEach((b) => b.addEventListener('click', () => vistaChat({ rol: 'miembro', codigo: id.codigo, clave: id.clave, nombre: id.nombre })));
    // F1045 · Rol de la iglesia: quién sirve en los próximos 30 días (lo ve cualquier miembro). Requiere 19_SQL_F1045_ROL_IGLESIA.sql.
    (async () => {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const r = await rpcRaw('turno_iglesia_listar', { p_codigo: id.codigo, p_clave: id.clave, p_desde: hoy.toISOString(), p_hasta: new Date(hoy.getTime() + 30 * 86400000).toISOString() });
      const c = $('#quienSirve'); if (!c) return;
      if (!r.ok) { c.innerHTML = '<p class="suave m0">Por ahora no pudimos cargar el rol. Revisa tu conexión.</p>'; return; }
      const filas = r.data || [];
      if (!filas.length) { c.innerHTML = '<p class="suave m0">Todavía no hay servicios asignados en los próximos 30 días.</p>'; return; }
      let dia = '', html = '';
      filas.forEach((t) => {
        const d = new Date(t.inicio), clave = d.toDateString();
        if (clave !== dia) { dia = clave; html += '<p class="m0 t2 rol-dia"><b>' + esc(d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })) + '</b></p>'; }
        html += '<p class="m0 suave">' + esc(d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })) + ' · ' + esc(t.titulo) + ': <b>' + esc(t.miembro) + '</b>' + (t.ministerio ? ' <small>(' + esc(t.ministerio) + ')</small>' : '') + '</p>';
      });
      c.innerHTML = html;
    })();
    // F1039 · Si lidero un ministerio, veo «Turnos de mi ministerio» para asignar a mi gente.
    misMinisterios(id).then((r) => {
      const c = $('#turLider'); if (!c || !r.ok) return;
      const ls = r.lista.filter((x) => x.es_lider && x.id);
      if (!ls.length) return;
      c.innerHTML = '<h2 class="sep">Turnos de mi ministerio</h2><div class="lista">' + ls.map((x) => '<button type="button" class="fila" data-tlid="' + esc(x.id) + '" data-tlnom="' + esc(x.nombre) + '"><span class="fila-txt">' + esc(x.nombre) + '<small>Asignar y revisar los turnos de este grupo</small></span><span class="flecha" aria-hidden="true">›</span></button>').join('') + '</div>';
      c.querySelectorAll('[data-tlid]').forEach((b) => b.addEventListener('click', () => vistaTurnosLider(id, { id: b.dataset.tlid, nombre: b.dataset.tlnom })));
    });
    document.querySelectorAll('[data-disp]').forEach((b) => b.addEventListener('click', () => {
      const act = dispLeer(), k = b.dataset.disp, nuevo = act.indexOf(k) >= 0 ? act.filter((x) => x !== k) : act.concat([k]);
      guardar(K_DISP, nuevo); vibra(); try { rpcRaw('disponibilidad_guardar', { p_codigo: id.codigo, p_clave: id.clave, p_franjas: nuevo }).catch(() => { /* sin red: queda en el teléfono */ }); } catch (e) { /* sin red */ } b.classList.toggle('on', nuevo.indexOf(k) >= 0); b.setAttribute('aria-pressed', String(nuevo.indexOf(k) >= 0));
      const m = $('#dispMsg'); if (m) m.textContent = nuevo.length ? 'Guardado en tu cuenta.' : 'Puedes marcar cuando quieras.';
    }));
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ juntos: abrirJuntos, oracion: vistaOracion, agenda: (i) => vistaAgenda(modoMiembro(i)), avisos: (i) => vistaAvisos(modoMiembro(i)), ministerios: vistaMinisterios, muro: vistaMuro, accion: vistaAccion, visita: vistaVisita, mioracion: () => vistaMiOracion(), crec: () => vistaCrecimiento(), privacidad: vistaPrivacidad, ayuda: () => vistaAyuda(id) }[b.dataset.ir] || vistaVisita)(id)));
    $('#salir').onclick = async () => {
      if (!confirm('¿Salir de esta iglesia? Se borrará tu nombre en la iglesia y en este teléfono.')) return;
      await rpc('miembro_eliminar', { p_codigo: id.codigo, p_clave: id.clave });
      await iglesiaAcuenta(null);
      borrar(K_ID); borrar('tb_movil_juntos_cache'); borrar(K_SOL); borrar(K_IG); try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada */ } vistaUnirse();
    };
  }

  // ---------- F874 · Mi privacidad y Ayuda (plan M2 y M12) ----------
  const QUIEN = { yo: ['Solo yo', 'quien-yo'], pastor: ['Tu pastor', 'quien-pastor'], iglesia: ['Tu iglesia si tu pastor lo comparte', 'quien-iglesia'] };
  const PRIV_FILAS = [
    ['👤', 'Tu nombre en la iglesia', 'pastor', 'Es lo único que tu pastor sabe de ti por unirte. No pedimos teléfono ni dirección.'],
    ['🙏', 'Peticiones de oración', 'iglesia', 'Las ve tu pastor. Llegan al muro solo si él las comparte, y tú decides si va tu nombre.'],
    ['🤝', 'Pedidos de visita', 'pastor', 'Solo tu pastor. Nunca van al muro.'],
    ['🕊️', 'Mi oración y Mi crecimiento', 'yo', 'Tu diario. No lo ve tu pastor ni nadie de tu iglesia.'],
    ['🌟', 'Cómo te fue en la Acción del mes', 'yo', 'Lo escribes tú y queda solo contigo.'],
    ['📖', 'Lectura, ideas favoritas y cursos', 'yo', 'Tu avance es tuyo.']
  ];
  function misDatosArmar(id, peticiones) {
    const d = { generado: new Date().toISOString(), nombre: id.nombre || null, iglesia: (leer(K_IG) || {}).nombre || null, cuenta: (leer(K_CUENTA) || {}).correo || null, avances: {}, peticiones: peticiones || [] };
    SYNC_CLAVES.forEach((k) => { const v = leer(k); if (v !== null) d.avances[k] = v; });
    return d;   // la llave de la iglesia NO se incluye: es como una contraseña
  }
  async function descargarMisDatos(id) {
    let pet = [];
    const args = { p_codigo: id.codigo, p_clave: id.clave };
    let r = await rpcRaw('peticion_mias_v2', args); if (!r.ok && r.falta) r = await rpcRaw('peticion_mias', args);
    if (r.ok && Array.isArray(r.data)) pet = r.data.map((p) => ({ texto: p.texto, tipo: p.tipo || null, creado_en: p.creado_en, estado: p.estado, publica: !!p.publica, respondida: !!p.respondida, respuesta: p.respuesta || null }));
    const txt = JSON.stringify(misDatosArmar(id, pet), null, 2);
    try {
      const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'tierra-buena-mis-datos-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { ok: true, n: pet.length, sinInternet: !r.ok };
    } catch (e) { try { await navigator.clipboard.writeText(txt); return { ok: true, copiado: true, n: pet.length, sinInternet: !r.ok }; } catch (e2) { return { ok: false }; } }
  }
  async function nubeBorrar() {
    const u = await syncUsuario(); if (!u) return false;
    try { const r = await SB.from('avances_cuenta').delete().eq('user_id', u.id); return !r.error; } catch (e) { return false; }
  }
  function vistaPrivacidad(id) {
    const cuenta = !!leer(K_CUENTA), off = metaLeer().off;
    $('#pantalla').innerHTML = `${volver()}<h1>Mi privacidad</h1><div class="filete"></div>
      <p class="suave">Tus datos son tuyos. Así de claro: qué ve cada persona y qué puedes hacer tú.</p>
      <p class="suave"><a href="privacidad.html" target="_blank" rel="noopener">Leer la política de privacidad completa</a></p>
      <h2 class="sep">Qué ve cada persona</h2>
      <div class="quien-lista">${PRIV_FILAS.map((f) => `<div class="card quien"><span class="quien-ico" aria-hidden="true">${f[0]}</span><div><b>${esc(f[1])}</b><span class="quien-chip ${QUIEN[f[2]][1]}">${esc(QUIEN[f[2]][0])}</span><p class="suave m0t">${esc(f[3])}</p></div></div>`).join('')}</div>
      <h2 class="sep">Lo que puedes hacer</h2>
      ${cuenta ? `<div class="card"><div class="interruptor-fila"><div><b>Guardar mis avances en mi cuenta</b><p class="suave m0t" id="nubeTxt">${off ? 'Apagado: tus notas quedan solo en este teléfono.' : 'Encendido: las ves igual en tu otro teléfono o tablet.'}</p></div><button type="button" class="interruptor" id="nubeSw" role="switch" aria-checked="${!off}" aria-label="Guardar mis avances en mi cuenta"><i></i></button></div></div>` : ''}
      <div class="card"><div class="t"><span aria-hidden="true">📥</span>Descargar mis datos</div><p class="suave m0t">Un archivo con tu nombre, tus notas y tus peticiones. Sin tu llave.</p><button type="button" class="btn sec" id="privBaja">Descargar</button><p id="privMsg" class="ok" role="status" hidden></p></div>
      <div class="card"><div class="t"><span aria-hidden="true">🗑️</span>Eliminar mi cuenta</div><p class="suave m0t">Borra tu cuenta, tus notas, tus peticiones y todo lo guardado en este teléfono. No se puede deshacer.</p><button type="button" class="btn sec" id="eliminarCuentaBtn">Eliminar mi cuenta y mis datos</button></div>
      <div class="card"><div class="t"><span aria-hidden="true">🚪</span>Salir de mi iglesia</div><p class="suave m0t">Se borra tu nombre de la lista de tu iglesia y de este teléfono. Puedes volver a unirte con el código cuando quieras. Está al final de «Mi iglesia».</p></div>`;
    alVolver();
    const ec = $('#eliminarCuentaBtn'); if (ec) ec.onclick = eliminarCuentaTodo;
    const sw = $('#nubeSw');
    if (sw) sw.onclick = async () => {
      const m = metaLeer(), apagar = !m.off, pm = $('#privMsg');
      if (apagar) {
        const borrar2 = confirm('¿Apagar la copia en tu cuenta? Tus notas seguirán en este teléfono.\n\nAceptar = apagar y BORRAR lo que ya está en la nube.\nCancelar = no cambiar nada.');
        if (!borrar2) return;
        if (!(await nubeBorrar())) { pm.hidden = false; pm.textContent = 'No pudimos borrar lo de la nube ahora (revisa tu internet). No cambié nada.'; return; }
        m.off = true; m.d = {}; m.t = {}; metaGuardar(m); sync.estado = 'local';
      } else { m.off = false; metaGuardar(m); syncInicio(); }
      sw.setAttribute('aria-checked', String(!apagar));
      $('#nubeTxt').textContent = apagar ? 'Apagado: tus notas quedan solo en este teléfono.' : 'Encendido: las ves igual en tu otro teléfono o tablet.';
      pm.hidden = false; pm.textContent = apagar ? 'Listo: borré tus avances de la nube.' : 'Listo: tus avances vuelven a guardarse en tu cuenta.';
    };
    $('#privBaja').onclick = async () => {
      const b = $('#privBaja'), pm = $('#privMsg'); b.disabled = true; b.textContent = 'Preparando…';
      const r = await descargarMisDatos(id); b.disabled = false; b.textContent = 'Descargar';
      pm.hidden = false; pm.textContent = !r.ok ? 'No pudimos preparar el archivo en este teléfono.' : (r.copiado ? 'Copié tus datos al portapapeles.' : 'Listo, el archivo quedó en tus descargas.') + (r.sinInternet ? ' Sin internet no pude incluir tus peticiones enviadas.' : '');
    };
  }
  const AYUDA = [
    ['⛪', '¿Cómo me uno a mi iglesia?', 'Pídele a tu pastor el código de 6 letras o números. Toca «Mi código» (el ícono de la iglesia, arriba en Mi iglesia), escríbelo, pon tu nombre y espera: tu pastor aprueba la solicitud y listo.'],
    ['📲', '¿Cómo uso mi cuenta en otro teléfono o en el computador?', 'Entra con el mismo correo y contraseña. Tu iglesia y tus avances te siguen solos. Si no tienes cuenta, créala en «Entrar con mi correo y contraseña».'],
    ['🔒', '¿Qué ve mi pastor de mí?', 'Tu nombre, tus peticiones de oración y tus pedidos de visita. Tu diario, tu crecimiento y tus avances no los ve nadie de tu iglesia.', 'privacidad'],
    ['📴', '¿Qué sirve sin internet?', 'La Biblia que ya abriste, el versículo, tu diario, tu crecimiento y los cursos que ya viste. Pedir oración o visita y el muro necesitan internet.'],
    ['🔑', 'Olvidé mi contraseña', 'En «Entrar con mi correo» toca «¿Olvidaste tu contraseña?». Te llega un correo con un enlace; revisa también «spam».'],
    ['🛠️', 'No puedo entrar o crear mi cuenta', 'En esa pantalla toca «¿No funciona? Revisar la conexión»: te dice qué falla. Si el correo de confirmación no llega, usa «Reenviar el correo de confirmación».'],
    ['🗑️', '¿Cómo borro mis datos?', 'En «Mi privacidad» puedes descargarlos, apagar y borrar la copia de tu cuenta, o salir de la iglesia para borrar tu nombre de su lista.', 'privacidad']
  ];
  function vistaAyuda(id) {
    $('#pantalla').innerHTML = `${volver()}<h1>Ayuda</h1><div class="filete"></div>
      <p class="suave">Toca una pregunta para ver la respuesta.</p>
      <div class="ayuda-lista">${AYUDA.map((a, i) => `<details class="card ayuda-it"><summary><span aria-hidden="true">${a[0]}</span>${esc(a[1])}</summary><p>${esc(a[2])}</p>${a[3] ? `<button type="button" class="btn sec chico" data-ayuda-ir="${a[3]}">Abrir «Mi privacidad»</button>` : ''}</details>`).join('')}</div>`;
    alVolver();
    document.querySelectorAll('[data-ayuda-ir]').forEach((b) => b.addEventListener('click', () => vistaPrivacidad(id)));
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
      ${p.aprobada ? `<button type="button" class="btn sec chico" data-contestada="${esc(p.id)}" data-valor="${p.respondida ? '0' : '1'}">${p.respondida ? 'Quitar «contestada»' : svg('chispas', 16) + ' Marcar como contestada'}</button>` : ''}
      <button type="button" class="btn sec chico" data-borrar="${esc(p.id)}">🗑️ Borrar</button>
      ${p.respondida && p.respuesta !== undefined ? `<div class="respuesta"><label for="resp_${esc(p.id)}"><b>${svg('chispas', 16)} Cómo respondió Dios</b> <span class="suave">(solo lo ves tú)</span></label><textarea id="resp_${esc(p.id)}" rows="2" maxlength="400" placeholder="Si quieres, escribe aquí cómo viste la respuesta.">${esc(p.respuesta || '')}</textarea><button type="button" class="btn sec chico" data-guardarresp="${esc(p.id)}">Guardar</button></div>` : ''}</div>`).join('');
    // F1049 · Estado de mi petición según mi pastor (recibida, en oración, atendida). Requiere 22_SQL_F1049_ESTADO_PETICION_MIEMBRO.sql.
    const ESTADO_MI_PET = { recibida: 'Tu pastor la recibió', en_oracion: 'Tu pastor la está orando', atendida: 'Tu pastor la atendió' };
    const qs = await rpcRaw('peticion_estado_miembro', { p_codigo: id.codigo, p_clave: id.clave, p_ids: l.map((x) => x.id).filter(Boolean) });
    const estPet = {}; if (qs.ok) (qs.data || []).forEach((e) => { estPet[e.peticion_id] = e.estado; });
    caja.querySelectorAll('.card.item').forEach((c, i) => {
      const x = l[i]; if (!x || !estPet[x.id]) return;
      const linea = document.createElement('p'); linea.className = 'suave m0t pet-est'; linea.textContent = '🙏 ' + ESTADO_MI_PET[estPet[x.id]];
      c.appendChild(linea);
    });
    caja.querySelectorAll('[data-contestada]').forEach((b) => b.addEventListener('click', async () => {
      const rr = await rpcRaw('peticion_respondida', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.contestada, p_valor: b.dataset.valor === '1' });
      if (!rr.ok) return msg(errTxt(rr.error)); msg(''); if (b.dataset.valor === '1') gotaGanar('oracion'); oracionesMias(id);
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
    if (quiere) { b.classList.add('latido'); setTimeout(() => b.classList.remove('latido'), 700); confeti(b); }
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
      <div class="cr-acc"><button type="button" class="btn ${a.hecho ? 'sec' : ''} chico" data-amhecho="${esc(a.id)}" aria-pressed="${!!a.hecho}">${a.hecho ? '✓ Hecho este mes (quitar)' : 'Lo hice este mes'}</button><button type="button" class="btn sec chico" data-amsave="${esc(a.id)}">Guardar nota</button></div></div>`).join('');
    caja.querySelectorAll('[data-amsave]').forEach((b) => b.addEventListener('click', () => {
      const texto = ($('#amt_' + b.dataset.amsave).value || '').trim();
      const l = accTodas(); const it = l.find((x) => x.id === b.dataset.amsave); if (!it) return;
      if (!texto) return msg(it.comoMeFue ? 'Tu nota anterior sigue guardada. Escribe algo nuevo para cambiarla.' : 'Puedes escribir una nota cuando quieras.', false);
      it.comoMeFue = texto.slice(0, 600); accGuardar(l); msg('Guardado en este teléfono.', true);
    }));
    caja.querySelectorAll('[data-amhecho]').forEach((b) => b.addEventListener('click', () => {
      const l = accTodas(); const it = l.find((x) => x.id === b.dataset.amhecho); if (!it) return;
      it.hecho = !it.hecho; accGuardar(l); vibra(); accionPintar();
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
      <button type="button" class="volver" id="atras">‹ Perfil</button>
      <h1>Recuperar mi iglesia</h1><div class="filete"></div>
      <p>En tu otro teléfono, abre <b>Perfil</b> → «Pasar mi iglesia a otro dispositivo», copia la llave y pégala aquí. (Si tienes cuenta con correo, no la necesitas: tu iglesia te sigue sola.)</p>
      <label for="llv">Tu llave (empieza con PULPITO-ID-)</label>
      <textarea id="llv" rows="3" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
      <button id="pegar" class="btn sec" hidden>📋 Pegar desde el portapapeles</button>
      <p id="err" class="error" role="alert" hidden></p>
      <button id="usar" class="btn">Recuperar mi identidad</button>`;
    $('#atras').onclick = () => ir('perfil'); pantEntra('adelante');
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
      iglesiaAcuenta({ codigo: d.c, clave: d.k });
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
  async function libroCargar(cod, ver) {                    // F899: sin «ver» siempre es la Reina-Valera 1909 (versículo del día, notas, etc. no cambian); el lector pasa la versión elegida
    if (ver && ver !== 'rv') return libroExtra(cod, ver);
    if (bibCache[cod]) return bibCache[cod];
    const r = await fetch('biblia/' + cod + '.json'); if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json(); if (!Array.isArray(d)) throw new Error('formato'); return (bibCache[cod] = d);
  }
  // ---------- F899 · Más versiones de la Biblia (Free Use Bible API de AO Lab: textos libres, sin llaves). Se bajan por libro y quedan guardadas para leer sin internet ----------
  const HAO = 'https://bible.helloao.org/api/', K_VER = 'tb_movil_biblia_ver';
  const VERSIONES = [
    { id: 'rv', c: 'RV1909', n: 'Reina-Valera 1909', l: 'es', lic: 'Dominio público' },
    { id: 'vbl', c: 'VBL', n: 'Versión Biblia Libre', l: 'es', lic: 'Texto libre', cand: ['spa_vbl', 'spaVBL', 'SPAVBL'], re: /biblia libre|free bible/i, len: 'spa' },
  ];   // F900: la Biblia de Tierra Buena es solo en español (se quitaron las versiones en inglés); las demás versiones en español se descubren solas (verEspanolDescubrir)
  const K_VERES = 'tb_movil_ver_es';
  (function verEspanolCache() {                              // F900: versiones en español ya descubiertas (quedan guardadas en el teléfono)
    try { (JSON.parse(localStorage.getItem(K_VERES) || '[]') || []).forEach((t) => { if (t && t.id && !VERSIONES.some((x) => x.api === t.id)) VERSIONES.push({ id: 'es_' + t.id, c: String(t.c || t.id).slice(0, 12), n: String(t.n || t.id), l: 'es', lic: String(t.lic || 'Texto libre'), api: t.id }); });
    } catch (e) { /* sin copia */ }
    try { caches.open('tb-biblias').then((c) => c.keys().then((ks) => ks.forEach((k) => { if (/\/biblia\/(BSB|ENGWEBP|ENGKJV|KJV|eng_[^/]*)\//.test(k.url)) c.delete(k); }))).catch(() => { /* nada */ }); } catch (e) { /* nada */ }   // limpia lo que se había bajado en inglés
  })();
  async function verEspanolDescubrir() {                       // pide la lista de la API y suma toda Biblia COMPLETA en español (66 libros)
    try {
      const d = await (await fetch(HAO + 'available_translations.json')).json(), lista = [];
      (d.translations || []).forEach((t) => { if (t && t.language === 'spa' && t.numberOfBooks === 66 && t.id && !VERSIONES.some((x) => x.api === t.id || x.cand && x.cand.indexOf(t.id) >= 0) && !/1909|libre/i.test((t.englishName || '') + ' ' + (t.name || '') + ' ' + t.id)) lista.push({ id: t.id, c: String(t.shortName || t.id).slice(0, 12), n: t.name || t.englishName || t.id, lic: t.licenseUrl ? 'Texto libre' : 'Texto libre' }); });
      localStorage.setItem(K_VERES, JSON.stringify(lista.slice(0, 6)));
      lista.slice(0, 6).forEach((t) => { if (!VERSIONES.some((x) => x.api === t.id)) VERSIONES.push({ id: 'es_' + t.id, c: t.c, n: String(t.n), l: 'es', lic: t.lic, api: t.id }); });
      return true;
    } catch (e) { return false; }
  }
  const verDe = (id) => VERSIONES.find((x) => x.id === id) || VERSIONES[0];
  const verActual = () => { try { const v = localStorage.getItem(K_VER); return VERSIONES.some((x) => x.id === v) ? v : 'rv'; } catch (e) { return 'rv'; } };
  const verLista = (d) => (Array.isArray(d) ? d : (d && d.books) || []);
  async function verApiId(v) {
    if (v.api) return v.api;
    const k = 'tb_movil_apiid_' + v.id; try { const g = localStorage.getItem(k); if (g) return g; } catch (e) { /* sin guardado */ }
    const guarda = (id) => { try { localStorage.setItem(k, id); } catch (e) { /* nada */ } return id; };
    for (const id of v.cand || []) { try { const r = await fetch(HAO + id + '/books.json'); if (r.ok && verLista(await r.json()).length >= 66) return guarda(id); } catch (e) { /* siguiente */ } }
    const d = await (await fetch(HAO + 'available_translations.json')).json();
    const t = (d.translations || []).find((x) => x.language === v.len && v.re.test((x.englishName || '') + ' ' + (x.name || '')) && x.numberOfBooks === 66);
    if (!t) throw new Error('sin-version'); return guarda(t.id);
  }
  const extraMem = {};
  async function libroExtra(cod, verId) {
    const k = verId + ':' + cod; if (extraMem[k]) return extraMem[k];
    const api = await verApiId(verDe(verId)), clave = new Request('https://tb.local/biblia/' + api + '/' + cod + '.json');
    let c = null; try { c = await caches.open('tb-biblias'); const h = await c.match(clave); if (h) return (extraMem[k] = await h.json()); } catch (e) { c = null; }
    const i = LIBROS.findIndex((l) => l[0] === cod), b = verLista(await (await fetch(HAO + api + '/books.json')).json())[i];
    if (i < 0 || !b) throw new Error('sin-libro');
    const n = LIBROS[i][2], out = new Array(n); let sig = 0;
    const trabajo = async () => { while (sig < n) { const ch = ++sig, r = await fetch(HAO + api + '/' + b.id + '/' + ch + '.simple.json'); if (!r.ok) throw new Error('http ' + r.status); const d = await r.json(), vs = []; ((d.chapter && d.chapter.content) || []).forEach((it) => { if (it && it.type === 'verse') vs[Number(it.number) - 1] = String(it.text || '').trim(); }); out[ch - 1] = Array.from(vs, (x) => x || ''); } };
    await Promise.all([1, 2, 3, 4, 5, 6].map(trabajo));
    try { if (c) await c.put(clave, new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })); } catch (e) { /* sin copia */ }
    return (extraMem[k] = out);
  }
  const verChip = () => { const v = verDe(verActual()); return `<button type="button" class="ver-chip" id="verChip" aria-label="Cambiar la versión de la Biblia">${svg('hoja', 16)}<span><b>${esc(v.c)}</b> · ${esc(v.n)}</span><i>Cambiar</i></button>`; };
  const verCredito = () => { const v = verDe(verActual()); return `<p class="suave sep">${esc(v.n)} · ${esc(v.lic)}${v.id === 'rv' ? '' : ' · Fuente: Free Use Bible API (AO Lab)'}</p>`; };
  function verElegir(volver) {
    const a = verActual();
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Biblia</button><h1>Versión de la Biblia</h1><div class="filete"></div>
      <p class="suave">Todas las versiones están en español, y el audio lee la que elijas. Las que no son la Reina-Valera se bajan al abrir cada libro, solo la primera vez, y luego se leen sin internet.</p>
      <div class="ver-lista">${VERSIONES.map((v) => `<button type="button" class="ver-op${v.id === a ? ' on' : ''}" data-ver="${v.id}"><b>${esc(v.c)}</b><span>${esc(v.n)}<small>Español · ${esc(v.lic)}</small></span></button>`).join('')}</div>`;
    volverA('Biblia', volver);
    const atar = () => document.querySelectorAll('[data-ver]').forEach((b) => { b.onclick = () => { try { localStorage.setItem(K_VER, b.dataset.ver); } catch (e) { /* nada */ } if (aud.on && aud.ver !== b.dataset.ver) audParar(); try { if (window.TBSonido) TBSonido.toque(); } catch (e) { /* sin sonido */ } volver(); }; });   // F900: si estaba escuchando otra versión, se detiene (el audio siempre lee la versión elegida)
    atar();
    verEspanolDescubrir().then((ok) => { const l = document.querySelector('.ver-lista'); if (!ok || !l) return; const a2 = verActual(); l.innerHTML = VERSIONES.map((v) => `<button type="button" class="ver-op${v.id === a2 ? ' on' : ''}" data-ver="${v.id}"><b>${esc(v.c)}</b><span>${esc(v.n)}<small>Español · ${esc(v.lic)}</small></span></button>`).join(''); atar(); });
    window.scrollTo(0, 0);
  }
  const verChipBind = (volver) => { const b = $('#verChip'); if (b) b.onclick = () => verElegir(volver); };
  const SIN_LIBRO = 'No pudimos abrir este libro. Revisa tu internet: lo que ya leíste antes se abre sin conexión.';
  // F881: racha de lectura (días seguidos en que abriste un capítulo). Solo vive en el teléfono.
  const K_RACHA = 'tb_movil_racha';
  const diaTxt = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function rachaMarcar() {                                  // F898: «racha con gracia» (como la reparación de racha de Glorify): un día sin leer no la rompe, una vez por semana
    try {
      const hoy = new Date(), ayer = new Date(hoy.getTime() - 86400000), antes = new Date(hoy.getTime() - 2 * 86400000), r = leer(K_RACHA) || { u: '', n: 0 };
      if (r.u === diaTxt(hoy)) return;
      const graciaLibre = !r.g || (Date.now() - Number(r.g)) > 7 * 86400000;
      if (r.u === diaTxt(ayer)) guardar(K_RACHA, { u: diaTxt(hoy), n: (Number(r.n) || 0) + 1, g: r.g });
      else if (r.u === diaTxt(antes) && graciaLibre) guardar(K_RACHA, { u: diaTxt(hoy), n: (Number(r.n) || 0) + 1, g: Date.now() });
      else guardar(K_RACHA, { u: diaTxt(hoy), n: 1, g: r.g });
    } catch (e) { /* sin racha */ }
  }
  function rachaActual() {
    const r = leer(K_RACHA); if (!r || !r.u) return 0;
    const hoy = new Date(), ayer = new Date(hoy.getTime() - 86400000), antes = new Date(hoy.getTime() - 2 * 86400000);
    const graciaLibre = !r.g || (Date.now() - Number(r.g)) > 7 * 86400000;
    return (r.u === diaTxt(hoy) || r.u === diaTxt(ayer) || (r.u === diaTxt(antes) && graciaLibre)) ? Number(r.n) || 0 : 0;   // si faltó más de un día, vuelve a empezar
  }
  // Portada viva: el cielo cambia con la hora (amanecer, día, atardecer, noche) y respira con calma.
  function faseDelDia(h) { return h >= 5 && h < 9 ? 'amanecer' : h >= 9 && h < 17 ? 'dia' : h >= 17 && h < 20 ? 'atardecer' : 'noche'; }
  function escenaHoy(fase) {
    const alto = fase === 'dia';
    const x = alto ? 316 : 322, y = alto ? 92 : 150;
    const astro = fase === 'noche'
      ? '<g class="h-astro"><circle class="h-halo" cx="314" cy="92" r="64"/><path class="h-luna" transform="translate(290 68) scale(2)" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></g>'
      : `<g class="h-astro"><circle class="h-halo" cx="${x}" cy="${y}" r="70"/><circle class="h-sol" cx="${x}" cy="${y}" r="26"/></g>`;
    const estrellas = fase === 'noche' ? [[44,40],[96,96],[150,34],[204,78],[258,28],[300,170],[360,40],[64,170],[372,130],[176,150],[120,210],[330,230]].map((p, i) => `<circle class="h-est" cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 1.6 : 2.4}"/>`).join('') : '';
    const nubes = fase === 'noche' ? '' : '<g class="h-nube n1"><ellipse cx="80" cy="70" rx="40" ry="12"/><ellipse cx="108" cy="62" rx="26" ry="11"/></g><g class="h-nube n2"><ellipse cx="220" cy="150" rx="34" ry="10"/><ellipse cx="244" cy="143" rx="20" ry="9"/></g>';
    return `<svg class="hoy-escena" viewBox="0 0 400 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${estrellas}${astro}${nubes}<path class="h-col1" d="M0 336 Q90 296 190 326 T400 308 V420 H0z"/><path class="h-col2" d="M0 372 Q110 344 220 366 T400 352 V420 H0z"/></svg>`;
  }
  // F944 · JUEGOS (fase A): entrada común. Cada juego se enchufa aquí con su vista y llama a juegoTerminar(id, aciertos, total).
  const K_JUEGOS = 'tb_movil_juegos';
  const JUEGOS = [
    ['raices', '📖', 'Raíces', 'Preguntas sobre lo que leíste, con el versículo que explica la respuesta.'],
    ['brotes', '✍️', 'Brotes', 'Completa el versículo y llévalo en la memoria. Usa los que tú resaltaste.'],
    ['sopa', '🔎', 'Sopa del Vivero', 'Letras grandes, sin tiempo y con pistas gratis.']
  ];
  const JUEGOS_LISTOS = { raices: (v) => vistaRaices(v), brotes: (v) => vistaBrotes(v), sopa: (v) => vistaSopa(v) };   // id -> función que abre el juego (cada fase nueva se registra aquí)
  function juegoTerminar(id, aciertos, total) {   // guarda la partida y da una gota de rocío por jugar (con tope diario)
    const j = leer(K_JUEGOS) || { n: 0, p: {} }; j.n = (j.n || 0) + 1; j.p = j.p || {};
    const q = j.p[id] || { n: 0, mejor: 0 }; q.n++; q.mejor = Math.max(q.mejor, Number(aciertos) || 0); j.p[id] = q; guardar(K_JUEGOS, j);
    if (aciertos > 0) gotaGanar('juego'); return q;
  }
  // F945 · «RAÍCES» (juego B): preguntas con el versículo que explica la respuesta. Reto del día = 5 fijas por fecha; «Otras 5» = al azar.
  function raicesElegir(bank, diario) {
    let sem = 0; const f = diario ? hoyTxt() : String(Date.now()); for (let i = 0; i < f.length; i++) sem = (sem * 31 + f.charCodeAt(i)) >>> 0;
    const azar = () => { sem = (sem * 1664525 + 1013904223) >>> 0; return sem / 4294967296; };
    const ult = leer(K_BIB), a = bank.slice().sort(() => azar() - 0.5);
    const del = ult ? a.filter((q) => q.cod === ult.cod) : [];   // primero las del libro que leíste por última vez
    return del.slice(0, 2).concat(a.filter((q) => !del.slice(0, 2).includes(q))).slice(0, 5);
  }
  // F947 · Texto de los juegos: separa palabras pegadas y arregla espacios (la Biblia y las preguntas llegan de distintas fuentes).
  const limpiaTexto = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2').replace(/([,;:.!?»)])(?=[A-Za-zÁÉÍÓÚáéíóúñ¿¡«(])/g, '$1 ').trim();
  const JU_HERO = (n) => `<svg class="ju-hero" viewBox="0 0 320 96" aria-hidden="true" focusable="false"><path class="ju-suelo" d="M0 70 Q80 58 160 68 T320 62 V96 H0z"/><g class="ju-raiz"><path d="M160 68 C150 78 138 82 124 90 M160 68 C162 80 170 86 176 94 M160 68 C172 76 188 80 204 88"/></g><g class="ju-planta"><path class="ju-tallo" d="M160 68 V${Math.max(22, 62 - n * 8)}"/><path class="ju-hoja h1" d="M160 ${Math.max(40, 62 - n * 5)} c-18-2-28-12-30-24 18 0 30 8 30 24z"/><path class="ju-hoja h2" d="M160 ${Math.max(34, 54 - n * 5)} c18-2 28-12 30-24-18 0-30 8-30 24z"/>${n >= 3 ? '<circle class="ju-flor" cx="160" cy="18" r="7"/><circle class="ju-flor2" cx="160" cy="18" r="3"/>' : ''}</g></svg>`;
  function juegoCorrer(cfg) {   // motor común de preguntas con opciones: cfg = { id, titulo, volver, items: [{ p, o, c, ver: async () => ({ html }) }], otra }
    const son = (n) => { try { if (window.TBSonido && window.TBSonido[n]) window.TBSonido[n](); } catch (e) { /* sin sonido */ } };
    const qs = cfg.items; let i = 0, ac = 0; const marcas = [];
    const pregunta = () => {
      const q = qs[i], ord = q.o.map((t, k) => k).sort(() => Math.random() - 0.5);
      const prog = qs.map((x, k) => `<i class="ju-h${k < i ? (marcas[k] ? ' bien' : ' mal') : k === i ? ' ahora' : ''}"></i>`).join('');
      $('#pantalla').innerHTML = `${cabecera(cfg.titulo, 'Juegos')}<div class="ju"><div class="ju-prog" role="img" aria-label="Pregunta ${i + 1} de ${qs.length}">${prog}</div>
        <p class="ju-cuenta">Pregunta ${i + 1} de ${qs.length}</p><h2 class="ju-p">${esc(limpiaTexto(q.p))}</h2>
        <div class="ju-ops">${ord.map((k, n) => `<button type="button" class="ju-op" data-k="${k}"><span class="ju-l" aria-hidden="true">${'ABCD'[n]}</span><span class="ju-t">${esc(limpiaTexto(q.o[k]))}</span></button>`).join('')}</div><div id="rzRes"></div></div>`;
      volverA('Juegos', cfg.volver);
      document.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', async () => {
        const bien = Number(b.dataset.k) === q.c; if (bien) ac++; marcas[i] = bien; son(bien ? 'logro' : 'suave');
        document.querySelectorAll('[data-k]').forEach((x) => { x.disabled = true; if (Number(x.dataset.k) === q.c) x.classList.add('ok'); else if (x === b) x.classList.add('mal'); });
        $('#rzRes').innerHTML = `<p class="ju-vered ${bien ? 'ok' : ''}"><b>${bien ? 'Correcto.' : 'Casi. La respuesta correcta está marcada.'}</b></p><div class="ju-ver" id="rzVer"><span class="esqueleto"></span></div>
          <button type="button" class="ju-sig" id="rzSig">${i + 1 < qs.length ? 'Siguiente' : 'Ver resultado'} <span aria-hidden="true">›</span></button>`;
        $('#rzSig').onclick = () => { i++; if (i < qs.length) pregunta(); else fin(); }; $('#rzSig').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        try { const r = await q.ver(), el = $('#rzVer'); if (el) el.innerHTML = r.html; } catch (e) { const el = $('#rzVer'); if (el) el.innerHTML = '<p class="suave m0">Sin internet: no se pudo mostrar el versículo.</p>'; }
      }));
    };
    const fin = () => {
      juegoTerminar(cfg.id, ac, qs.length); son('logro');
      $('#pantalla').innerHTML = `${cabecera(cfg.titulo, 'Juegos')}<div class="ju">${JU_HERO(ac)}<h2 class="ju-fin">${ac} de ${qs.length}</h2><p class="suave">${ac >= 4 ? 'Muy buen repaso de la Palabra.' : ac >= 2 ? 'Buen avance. Cada repaso deja algo.' : 'Lo importante es volver a leer. Puedes intentarlo otra vez.'}${ac > 0 ? ' Una gota de rocío te espera en el Inicio.' : ''}</p>
        <button type="button" class="ju-sig" id="rzOtra">Jugar otra vez <span aria-hidden="true">›</span></button></div>`;
      volverA('Juegos', cfg.volver); $('#rzOtra').onclick = () => cfg.otra();
    };
    pregunta();
  }
  const juVerHtml = (txt, ref, resaltar) => { const t = esc(limpiaTexto(txt)); return `<blockquote class="ju-bq">«${resaltar ? t.replace(new RegExp('(' + esc(resaltar).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>') : t}»</blockquote><p class="ju-ref">${esc(ref)}</p>`; };
  async function vistaRaices(volver) {
    let bank; try { bank = (await datoCargar('juego_raices')).preguntas; } catch (e) { $('#pantalla').innerHTML = `${cabecera('Raíces', 'Juegos')}<p class="suave">${SIN_DATOS}</p>`; volverA('Juegos', volver); return; }
    const jugar = (qs) => juegoCorrer({ id: 'raices', titulo: 'Raíces', volver, otra: () => jugar(raicesElegir(bank, false)), items: qs.map((q) => ({ p: q.p, o: q.o, c: q.c, ver: async () => {
      const inf = libroInfo(q.cod), ref = `${inf ? inf[1] : q.cod} ${q.cap}:${q.v}`; let t = ''; try { const lib = await libroCargar(q.cod, verActual()); t = lib[q.cap - 1] && lib[q.cap - 1][q.v - 1]; } catch (e) { /* sin internet */ }
      return { html: t ? juVerHtml(t, ref) : `<p class="ju-ref">${esc(ref)}</p>` }; } })) });
    $('#pantalla').innerHTML = `${cabecera('Raíces', 'Juegos')}<div class="ju">${JU_HERO(2)}<p class="suave">Cinco preguntas. Después de cada respuesta aparece el versículo que la explica.</p>
      <button type="button" class="ju-modo" id="rzDia"><span class="ju-mi" aria-hidden="true">${svg('amanecer', 26)}</span><span><b>Reto de hoy</b><small>Las mismas cinco preguntas durante todo el día.</small></span><span class="flecha" aria-hidden="true">›</span></button>
      <button type="button" class="ju-modo" id="rzMas"><span class="ju-mi" aria-hidden="true">${svg('baraja', 26)}</span><span><b>Otras cinco</b><small>Preguntas distintas cada vez.</small></span><span class="flecha" aria-hidden="true">›</span></button></div>`;
    volverA('Juegos', volver); $('#rzDia').onclick = () => jugar(raicesElegir(bank, true)); $('#rzMas').onclick = () => jugar(raicesElegir(bank, false));
  }
  // F947 · «BROTES» (juego C): completa el versículo. Usa los versículos que resaltaste y, si faltan, los del día.
  async function vistaBrotes(volver) {
    $('#pantalla').innerHTML = `${cabecera('Brotes', 'Juegos')}<div class="ju">${JU_HERO(1)}<p class="suave">Preparando versículos…</p></div>`; volverA('Juegos', volver);
    const jugar = async () => {
      const mios = []; const rs = rg(K_RES); Object.keys(rs).forEach((k) => { const [c, cap] = k.split('.'); (rs[k] || []).forEach((v) => mios.push(c + '.' + cap + '.' + v)); });
      const mezcla = (a) => a.slice().sort(() => Math.random() - 0.5), pool = mezcla(mios).slice(0, 6).concat(mezcla(VERSICULOS)).filter((x, k, a) => a.indexOf(x) === k).slice(0, 12);
      const vs = [];
      for (const r of pool) { if (vs.length >= 8) break; const [c, cap, v] = r.split('.'); try { const lib = await libroCargar(c); const t = limpiaTexto((lib[cap - 1] || [])[v - 1] || ''); if (t.split(' ').length >= 6) vs.push({ c, cap: +cap, v: +v, t, mio: mios.indexOf(r) >= 0 }); } catch (e) { break; } }
      if (vs.length < 4) { $('#pantalla').innerHTML = `${cabecera('Brotes', 'Juegos')}<div class="ju"><p class="suave">Brotes necesita abrir la Biblia al menos una vez con internet para tener los versículos. Puedes volver cuando la hayas leído.</p></div>`; volverA('Juegos', volver); return; }
      const palabras = (t) => (t.match(/[A-Za-záéíóúñÁÉÍÓÚÑ]{5,}/g) || []);
      const todas = vs.reduce((a, x) => a.concat(palabras(x.t)), []);
      const items = vs.slice(0, 5).map((x) => {
        const cand = palabras(x.t).filter((w) => w.toLowerCase() !== x.t.split(' ')[0].toLowerCase()); const clave = cand.sort((a, b) => b.length - a.length)[Math.floor(Math.random() * Math.min(3, cand.length))] || cand[0];
        const malas = mezcla(todas.filter((w) => w.toLowerCase() !== clave.toLowerCase() && !x.t.toLowerCase().includes(w.toLowerCase()))).filter((w, k, a) => a.findIndex((z) => z.toLowerCase() === w.toLowerCase()) === k).slice(0, 3);
        const o = [clave].concat(malas); const inf = libroInfo(x.c), ref = `${inf ? inf[1] : x.c} ${x.cap}:${x.v}`;
        return { p: x.t.replace(new RegExp('\\b' + clave + '\\b'), '______'), o, c: 0, ver: async () => ({ html: juVerHtml(x.t, ref + (x.mio ? ' · uno de tus resaltes' : ''), clave) }) };
      }).filter((q) => q.o.length >= 3);
      if (items.length < 3) { $('#pantalla').innerHTML = `${cabecera('Brotes', 'Juegos')}<div class="ju"><p class="suave">No se pudieron armar las preguntas. Intenta de nuevo en un momento.</p></div>`; volverA('Juegos', volver); return; }
      juegoCorrer({ id: 'brotes', titulo: 'Brotes', volver, items, otra: () => vistaBrotes(volver) });
    };
    jugar();
  }
  // F953 · «SOPA DEL VIVERO» (juego D): sopa de letras grande, 8x8, solo de izquierda a derecha y de arriba hacia abajo, sin tiempo, con pistas gratis.
  function sopaArmar(palabras) {   // devuelve { g: matriz de letras, pos: {PALABRA: {f, c, dir}} }
    const N = 8, L = 'ABCDEFGHIJLMNOPQRSTUVXYZ', g = Array.from({ length: N }, () => Array(N).fill('')), pos = {};
    const azar = (n) => Math.floor(Math.random() * n);
    palabras.slice().sort((a, b) => b.length - a.length).forEach((w) => {
      for (let intento = 0; intento < 200; intento++) {
        const dir = azar(2), f = azar(dir ? N - w.length + 1 : N), c = azar(dir ? N : N - w.length + 1); let ok = true;
        for (let k = 0; k < w.length; k++) { const x = g[f + (dir ? k : 0)][c + (dir ? 0 : k)]; if (x && x !== w[k]) { ok = false; break; } }
        if (!ok) continue;
        for (let k = 0; k < w.length; k++) g[f + (dir ? k : 0)][c + (dir ? 0 : k)] = w[k];
        pos[w] = { f, c, dir }; return;
      }
    });
    for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) if (!g[f][c]) g[f][c] = L[azar(L.length)];
    return { g, pos };
  }
  async function vistaSopa(volver) {
    let datos; try { datos = await datoCargar('juego_sopa'); } catch (e) { $('#pantalla').innerHTML = `${cabecera('Sopa del Vivero', 'Juegos')}<p class="suave">${SIN_DATOS}</p>`; volverA('Juegos', volver); return; }
    const son = (n) => { try { if (window.TBSonido && window.TBSonido[n]) window.TBSonido[n](); } catch (e) { /* sin sonido */ } };
    const menu = () => {
      $('#pantalla').innerHTML = `${cabecera('Sopa del Vivero', 'Juegos')}<div class="ju">${JU_HERO(3)}<p class="suave">Elige un tema. Las palabras están de izquierda a derecha o de arriba hacia abajo. No hay tiempo y las pistas son gratis.</p>
        ${datos.temas.map((t) => `<button type="button" class="ju-modo" data-tema="${esc(t.id)}"><span><b>${esc(t.titulo)}</b><small>${esc(t.ayuda)}</small></span><span class="flecha" aria-hidden="true">›</span></button>`).join('')}</div>`;
      volverA('Juegos', volver);
      document.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => jugar(datos.temas.find((t) => t.id === b.dataset.tema))));
    };
    const jugar = (tema) => {
      const lista = tema.palabras.slice().sort(() => Math.random() - 0.5).slice(0, 5); let tab = sopaArmar(lista); for (let r = 0; r < 20 && lista.some((w) => !tab.pos[w]); r++) tab = sopaArmar(lista);
      const { g, pos } = tab, N = g.length;
      const halladas = new Set(), ok = new Set(); let ini = null, pista = null, aviso = 'Toca la primera letra de una palabra y luego la última.';
      const celdasDe = (w) => { const p = pos[w], r = []; for (let k = 0; k < w.length; k++) r.push((p.f + (p.dir ? k : 0)) * N + p.c + (p.dir ? 0 : k)); return r; };
      const pintar = () => {
        $('#pantalla').innerHTML = `${cabecera('Sopa del Vivero', 'Juegos')}<div class="ju"><h2 class="ju-p">${esc(tema.titulo)}</h2>
          <div class="so-lista" aria-label="Palabras por encontrar">${lista.map((w) => `<span class="so-pal${halladas.has(w) ? ' hecha' : ''}">${w}</span>`).join('')}</div>
          <div class="so-grid" role="grid" aria-label="Sopa de letras">${g.map((fila, f) => fila.map((l, c) => { const i = f * N + c; return `<button type="button" role="gridcell" class="so-c${ok.has(i) ? ' ok' : ''}${ini === i ? ' sel' : ''}${pista === i ? ' pista' : ''}" data-i="${i}" aria-label="${l}, fila ${f + 1}, columna ${c + 1}">${l}</button>`; }).join('')).join('')}</div>
          <p class="so-aviso" role="status" aria-live="polite">${esc(aviso)}</p>
          <button type="button" class="ju-sig" id="soPista">Pista gratis <span aria-hidden="true">›</span></button></div>`;
        volverA('Juegos', menu);
        document.querySelectorAll('.so-c').forEach((b) => b.addEventListener('click', () => tocar(Number(b.dataset.i))));
        $('#soPista').onclick = () => { const w = lista.find((x) => !halladas.has(x)); if (!w) return; pista = celdasDe(w)[0]; ini = null; aviso = 'La palabra «' + w + '» empieza en la letra marcada.'; pintar(); };
      };
      const tocar = (i) => {
        pista = null;
        if (ini === null) { ini = i; aviso = 'Ahora toca la última letra de la palabra.'; pintar(); return; }
        const a = ini, f1 = Math.floor(a / N), c1 = a % N, f2 = Math.floor(i / N), c2 = i % N; ini = null;
        let w = null;
        if (f1 === f2 && c2 >= c1) w = g[f1].slice(c1, c2 + 1).join('');
        else if (c1 === c2 && f2 >= f1) w = g.slice(f1, f2 + 1).map((r) => r[c1]).join('');
        if (w && lista.includes(w) && !halladas.has(w)) {
          halladas.add(w); celdasDe(w).forEach((x) => ok.add(x)); son('logro'); aviso = '¡Encontraste «' + w + '»!';
          if (halladas.size === lista.length) { fin(); return; }
        } else { son('suave'); aviso = 'Esas letras no forman una palabra de la lista. Puedes intentar de nuevo.'; }
        pintar();
      };
      const fin = () => {
        juegoTerminar('sopa', lista.length, lista.length);
        $('#pantalla').innerHTML = `${cabecera('Sopa del Vivero', 'Juegos')}<div class="ju">${JU_HERO(5)}<h2 class="ju-fin">Encontraste las ${lista.length} palabras</h2><p class="suave">${lista.map((w) => esc(w)).join(' · ')}</p>
          <button type="button" class="ju-sig" id="soOtra">Jugar otra vez <span aria-hidden="true">›</span></button></div>`;
        volverA('Juegos', menu); $('#soOtra').onclick = () => jugar(tema);
      };
      pintar();
    };
    menu();
  }
  function vistaJuegos() {
    const j = leer(K_JUEGOS) || { n: 0 };
    $('#pantalla').innerHTML = `${cabecera('Juegos', 'Palabra')}<p class="suave">Juegos pensados para lo que lees y vives aquí. Jugar da gotas de rocío para tu Inicio; no hay anuncios ni monedas.</p>
      ${j.n ? `<p class="suave">Partidas jugadas: ${Number(j.n)}</p>` : ''}
      <div class="grid">${JUEGOS.map((g) => JUEGOS_LISTOS[g[0]]
        ? `<button type="button" class="card" data-juego="${g[0]}"><div class="t"><span aria-hidden="true">${icono(g[1])}</span>${g[2]}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${g[3]}</p></button>`
        : `<div class="card pronto"><div class="t"><span aria-hidden="true">${icono(g[1])}</span>${g[2]}</div><p class="suave m0t">${g[3]} <b>Muy pronto.</b></p></div>`).join('')}</div>`;
    volverA('Palabra', vistaPalabra);
    document.querySelectorAll('[data-juego]').forEach((b) => b.addEventListener('click', () => { const f = JUEGOS_LISTOS[b.dataset.juego]; if (f) f(vistaJuegos); }));
  }

  function vistaPalabra() {
    const ult = leer(K_BIB), inf = ult && libroInfo(ult.cod);
    let planAct = null; try { for (const pl of PLANES) { const e = planEstado(pl.id); if (e && e.h.length < PD(pl).length) { planAct = { pl, n: e.h.length }; break; } } } catch (e) { planAct = null; }   // F915: plan en curso (si hay)
    const hora = new Date().getHours(), fase = faseDelDia(hora), saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const id = leer(K_ID), nom = perfilLeer().n ? perfilLeer().n.split(/\s+/)[0] : (id && id.nombre ? String(id.nombre).trim().split(/\s+/)[0] : ''), racha = rachaActual();
    $('#pantalla').innerHTML = `${bandaTB('palabra')}<div class="hoy fase-${fase}">${escenaHoy(fase)}<p class="hoy-saludo">${esc(saludo)}${nom ? ', ' + esc(nom) : ''}</p>
      <h1>Hoy</h1><div class="hoy-verso" id="hoyVerso"><span class="esqueleto"></span><span class="esqueleto corto"></span></div>
      ${racha ? `<p class="hoy-racha">${svg('llama', 18)}<span>${racha === 1 ? '1 día leyendo la Palabra' : racha + ' días seguidos leyendo la Palabra'}</span></p>` : ''}${fechaCercanaChip()}${instalarChip()}</div>
      <h2 class="sep">Tu Palabra</h2>
      <div class="grid">${(planAct ? activa('🗓', 'Mi plan: ' + esc(planAct.pl.n || 'lectura'), 'Día ' + (planAct.n + 1) + ' de ' + planAct.pl.dias.length + ' · sigue donde ibas.', 'plan') : activa('🗓', 'Plan de lectura', 'Elige uno y lee un poquito cada día, con tu avance.', 'planes')).replace('class="card"', 'class="card tbplan"')}${inf ? activa('▶️', 'Seguir leyendo', esc(inf[1]) + ' ' + Number(ult.cap) + ' · donde te quedaste', 'seguir') : ''}${activa('📖', 'Leer la Biblia', 'Biblia en español: elige tu versión. Los libros que lees quedan para leer sin internet.', 'biblia')}${activa('🔖', 'Mi Biblia', 'Tus resaltes, notas y versículos guardados.', 'mibiblia')}${activa('✨', 'Versículo de hoy', 'Una frase para empezar el día.', 'versiculo')}${activa('📜', 'Fábula del mes', 'Un relato corto para practicar, capítulo a capítulo.', 'fabula')}${activa('🌱', 'Juegos', 'Repasa la Palabra jugando: sin anuncios, sin monedas y sin internet.', 'juegos')}</div>`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ir;
      if (k === 'hacer') vistaHacer(); else if (k === 'juegos') vistaJuegos(); else if (k === 'biblia') vistaBiblia(); else if (k === 'versiculo') vistaVersiculo(); else if (k === 'fabula') vistaFabula(); else if (k === 'mibiblia') vistaMiBiblia(); else if (k === 'planes') vistaPlanes(); else if (k === 'plan' && planAct) vistaPlan(planAct.pl.id); else if (k === 'cal') vistaCalendario(); else if (k === 'inst') instalarUnToque(); else if (k === 'instno') { try { localStorage.setItem('tb_movil_inst_no', String(new Date().getMonth())); } catch (e) { /* nada */ } b.closest('.hoy-inst').remove(); } else if (k === 'seguir' && inf) vistaCapitulo(ult.cod, Number(ult.cap));
    }));
    // F871: el versículo del día aparece arriba, en «Hoy» (si no hay internet ni copia guardada, la zona se oculta sola).
    (async () => {
      const caja = $('#hoyVerso'); if (!caja) return;
      try {
        const r = versiculoDeHoy(new Date()), i2 = libroInfo(r.cod);
        const t = ((await libroCargar(r.cod))[r.cap - 1] || [])[r.v - 1] || '';
        if (!$('#hoyVerso')) return;
        if (!t) { caja.hidden = true; return; }
        caja.innerHTML = `<p class="hoy-texto">«${esc(t)}»</p><p class="hoy-cita">${esc(i2[1] + ' ' + r.cap + ':' + r.v)}</p>`;
        caja.classList.add('listo');
        caja.onclick = () => vistaVersiculo();
      } catch (e) { if ($('#hoyVerso')) $('#hoyVerso').hidden = true; }
    })();
  }
  const volverA = (txt, fn) => { const b = $('#volver'); if (b) { b.textContent = '‹ ' + txt; b.onclick = fn; } };
  function vistaBiblia() {
    const fila = (l) => `<button type="button" class="libro" data-libro="${l[0]}">${esc(l[1])}</button>`;
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Palabra</button>${portadaBiblia(verDe(verActual()))}<h1>Biblia</h1><div class="filete"></div>${verChip()}
      <input type="text" id="buscaLibro" class="busca-libro" placeholder="Buscar un libro…" aria-label="Buscar un libro" autocomplete="off" enterkeyhint="search">
      <h2>Antiguo Testamento</h2><div class="libros">${LIBROS.slice(0, 39).map(fila).join('')}</div>
      <h2 class="sep">Nuevo Testamento</h2><div class="libros">${LIBROS.slice(39).map(fila).join('')}</div>
      ${verCredito()}`;
    volverA('Palabra', vistaPalabra); verChipBind(vistaBiblia);
    document.querySelectorAll('[data-libro]').forEach((b) => b.addEventListener('click', () => vistaLibro(b.dataset.libro)));
    try {
      const norm = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      $('#buscaLibro').addEventListener('input', (e) => { const q = norm(e.target.value.trim()); document.querySelectorAll('[data-libro]').forEach((b) => { b.hidden = !!q && norm(b.textContent).indexOf(q) < 0; }); });
    } catch (e) { /* sin filtro */ }
  }
  function vistaLibro(cod) {
    const inf = libroInfo(cod); if (!inf) return vistaBiblia();
    let c = ''; for (let i = 1; i <= inf[2]; i++) c += `<button type="button" class="cap" data-cap="${i}">${i}</button>`;
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ Biblia</button><h1>${esc(inf[1])}</h1><div class="filete"></div>
      <p class="suave">${inf[2] === 1 ? 'Tiene un solo capítulo.' : 'Elige un capítulo.'}</p><div class="caps">${c}</div>`;
    volverA('Biblia', vistaBiblia);
    document.querySelectorAll('[data-cap]').forEach((b) => b.addEventListener('click', () => vistaCapitulo(cod, Number(b.dataset.cap))));
  }
  // F880: lector de primer nivel. Tocar un versículo lo selecciona (resaltar, copiar, compartir), deslizar cambia de
  // capítulo, una barra fina muestra cuánto llevas leído. Todo con CSSOM (la política de seguridad no permite style="").
  const K_RES = 'tb_movil_biblia_res', K_RESCOL = 'tb_movil_biblia_col', K_NOTAS = 'tb_movil_biblia_notas', K_MARC = 'tb_movil_biblia_marc', K_LEIDOS = 'tb_movil_leidos', K_PLANES = 'tb_movil_planes';
  const nuevoEl = (html) => { try { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; } catch (e) { return null; } };
  function toastBib(msg) {
    try {
      let t = $('#toastBib'); if (!t) { t = nuevoEl('<div id="toastBib" class="toast-bib" role="status" aria-live="polite"></div>'); if (!t) return; document.body.appendChild(t); }
      t.textContent = msg; t.classList.add('on'); clearTimeout(toastBib.t); toastBib.t = setTimeout(() => t.classList.remove('on'), 1700);
    } catch (e) { /* sin aviso */ }
  }
  const citaVersos = (nombre, cap, vs) => {
    const o = vs.slice().sort((x, y) => x - y), partes = []; let i = 0;
    while (i < o.length) { let j = i; while (j + 1 < o.length && o[j + 1] === o[j] + 1) j++; partes.push(j > i ? o[i] + '-' + o[j] : String(o[i])); i = j + 1; }
    return nombre + ' ' + cap + ':' + partes.join(',');
  };
  let lec = null;   // estado del capítulo abierto (para el panel de selección y el deslizar)
  const COL_NOM = ['amarillo', 'verde', 'azul', 'rosa'];
  const kv = (v) => lec.cod + '.' + lec.cap + '.' + v;
  const selOrd = () => [...lec.sel].sort((x, y) => x - y);
  function lecPanel() {
    try {
      let p = $('#lecAcc'); const n = lec ? lec.sel.size : 0;
      if (!n) { if (p) p.classList.remove('on'); return; }
      if (!p) {
        const bt = (id, ic, tx) => `<button type="button" id="${id}" class="lec-b">${svg(ic, 20)}<span>${tx}</span></button>`;
        p = nuevoEl(`<div id="lecAcc" class="lec-acc" role="toolbar" aria-label="Versículos elegidos"><div class="lec-col" role="group" aria-label="Resaltar con color">${[0, 1, 2, 3].map((i) => `<button type="button" class="col-dot rc${i}" data-rc="${i}" aria-label="Resaltar ${COL_NOM[i]}"></button>`).join('')}<button type="button" class="col-dot quita" id="aQuita" aria-label="Quitar resalte">${svg('x', 14)}</button><button type="button" id="aX" class="col-x" aria-label="Quitar la selección">${svg('x', 18)}</button></div><div class="lec-fil">${bt('aNota', 'pluma', 'Nota')}${bt('aMarc', 'marcador', 'Guardar')}${bt('aImg', 'imagen', 'Imagen')}${bt('aCop', 'copiar', 'Copiar')}${bt('aCom', 'compartir', 'Enviar')}</div></div>`);
        if (!p) return; document.body.appendChild(p);
        $('#aX').onclick = () => lecLimpiar();
        const poner = (ci) => {
          const rs = leer(K_RES) || {}, cs = leer(K_RESCOL) || {}, k = lec.cod + '.' + lec.cap, ya = new Set(rs[k] || []), vs = selOrd();
          const igual = vs.every((v) => ya.has(v) && (Number(cs[kv(v)]) || 0) === ci);
          vs.forEach((v) => { if (igual) { ya.delete(v); delete cs[kv(v)]; } else { ya.add(v); if (ci) cs[kv(v)] = ci; else delete cs[kv(v)]; } });
          if (ya.size) rs[k] = [...ya].sort((x, y) => x - y); else delete rs[k];
          guardar(K_RES, rs); guardar(K_RESCOL, cs); lecPintar(); toastBib(igual ? 'Resalte quitado' : 'Resaltado'); lecLimpiar();
        };
        document.querySelectorAll('[data-rc]').forEach((b) => b.addEventListener('click', () => { vibra(); poner(Number(b.dataset.rc)); }));
        $('#aQuita').onclick = () => {
          const rs = leer(K_RES) || {}, cs = leer(K_RESCOL) || {}, k = lec.cod + '.' + lec.cap, ya = new Set(rs[k] || []);
          selOrd().forEach((v) => { ya.delete(v); delete cs[kv(v)]; }); if (ya.size) rs[k] = [...ya].sort((x, y) => x - y); else delete rs[k];
          guardar(K_RES, rs); guardar(K_RESCOL, cs); lecPintar(); toastBib('Resalte quitado'); lecLimpiar();
        };
        $('#aNota').onclick = () => lecNota();
        $('#aMarc').onclick = () => {
          const vs = selOrd(), inf = libroInfo(lec.cod); let l = lista(K_MARC); const ya = vs.every((v) => l.some((x) => x.k === kv(v)));
          if (ya) l = l.filter((x) => !vs.some((v) => x.k === kv(v)));
          else vs.forEach((v) => { if (!l.some((x) => x.k === kv(v))) l.push({ k: kv(v), c: inf[1] + ' ' + lec.cap + ':' + v, t: String(lec.versos[v - 1] || '').slice(0, 160), f: new Date().toISOString() }); });
          guardar(K_MARC, l.slice(-200)); lecPintar(); toastBib(ya ? 'Marcador quitado' : 'Guardado en Mi Biblia'); if (!ya) confeti($('#aMarc')); lecLimpiar();
        };
        $('#aImg').onclick = async () => { const t = lecTexto().split('\n— '); await versoImagen(t[0].replace(/[«»]/g, ''), (t[1] || '').replace(' (Reina-Valera 1909)', '')); lecLimpiar(); };
        $('#aCop').onclick = async () => { const t = lecTexto(); try { await navigator.clipboard.writeText(t); toastBib('Copiado'); } catch (e) { toastBib('No pude copiar'); } lecLimpiar(); };
        $('#aCom').onclick = async () => { const t = lecTexto(); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toastBib('Copiado'); } } catch (e) { /* se cerró el menú */ } lecLimpiar(); };
      }
      const ya = new Set(((leer(K_MARC) && lista(K_MARC)) || []).map((x) => x.k));
      $('#aMarc').lastChild.textContent = selOrd().every((v) => ya.has(kv(v))) ? 'Quitar' : 'Guardar';
      p.classList.add('on');
    } catch (e) { /* sin panel */ }
  }
  // Hoja inferior para escribir una nota sobre los versículos elegidos (se guarda en el primero).
  function lecNota() {
    try {
      const vs = selOrd(), inf = libroInfo(lec.cod), k = kv(vs[0]), notas = leer(K_NOTAS) || {}, cita = citaVersos(inf[1], lec.cap, vs);
      const h = nuevoEl(`<div class="hoja" id="hojaNota" role="dialog" aria-modal="true" aria-label="Nota"><div class="hoja-in"><h3>${esc(cita)}</h3><textarea id="notaTxt" rows="5" maxlength="800" placeholder="¿Qué te dice este pasaje? ¿Qué vas a hacer con él?"></textarea><div class="hoja-bt"><button type="button" class="btn" id="notaOk">Guardar nota</button>${notas[k] ? '<button type="button" class="btn sec" id="notaDel">Borrar</button>' : ''}<button type="button" class="btn sec" id="notaX">Cancelar</button></div></div></div>`);
      if (!h) return; document.body.appendChild(h); $('#notaTxt').value = notas[k] ? notas[k].t : ''; try { $('#notaTxt').focus(); } catch (e) { /* nada */ }
      const cerrar = () => { try { h.remove(); } catch (e) { /* nada */ } };
      $('#notaX').onclick = cerrar;
      $('#notaOk').onclick = () => { const t = $('#notaTxt').value.trim(); const n2 = leer(K_NOTAS) || {}; if (t) n2[k] = { t: t.slice(0, 800), c: cita, f: new Date().toISOString() }; else delete n2[k]; guardar(K_NOTAS, n2); cerrar(); lecPintar(); lecLimpiar(); toastBib(t ? 'Nota guardada' : 'Nota borrada'); };
      const d = $('#notaDel'); if (d) d.onclick = () => { const n2 = leer(K_NOTAS) || {}; delete n2[k]; guardar(K_NOTAS, n2); cerrar(); lecPintar(); lecLimpiar(); toastBib('Nota borrada'); };
    } catch (e) { /* sin nota */ }
  }
  // Imagen del versículo para compartir (como YouVersion): lienzo con los colores del tema elegido.
  async function versoImagen(texto, cita) {
    try {
      const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
      const cs = getComputedStyle(document.documentElement), v = (n, d) => (cs.getPropertyValue(n).trim() || d);
      const papel = v('--papel', '#faf5ea'), tinta = v('--tinta', '#2b2218'), oro = v('--oro', '#b8893a'), verde = v('--verde', '#3f5d3a');
      try { await document.fonts.load('600 60px "TB Lectura"'); await document.fonts.load('700 40px "TB Titulo"'); } catch (e) { /* fuentes del sistema */ }
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, papel); g.addColorStop(1, papel); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const halo = (x, y, r, col, a) => { const q = c.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = q; c.fillRect(0, 0, W, H); c.globalAlpha = 1; };
      halo(180, 140, 760, oro, .42); halo(960, 1200, 820, verde, .32);
      c.strokeStyle = oro; c.globalAlpha = .55; c.lineWidth = 3; c.strokeRect(54, 54, W - 108, H - 108); c.globalAlpha = 1;
      c.fillStyle = oro; c.font = '700 220px "TB Titulo", Georgia, serif'; c.fillText('“', 110, 300);
      let tam = texto.length > 260 ? 46 : texto.length > 160 ? 56 : 68; let lineas;
      const parte = () => { c.font = '600 ' + tam + 'px "TB Lectura", Georgia, serif'; const ps = texto.split(' '), L = []; let ln = ''; ps.forEach((w) => { const t = ln ? ln + ' ' + w : w; if (c.measureText(t).width > W - 260 && ln) { L.push(ln); ln = w; } else ln = t; }); if (ln) L.push(ln); return L; };
      lineas = parte(); while (lineas.length * tam * 1.38 > 760 && tam > 30) { tam -= 4; lineas = parte(); }
      const alto = lineas.length * tam * 1.38, y0 = Math.max(380, (H - alto) / 2 - 20);
      c.fillStyle = tinta; lineas.forEach((l, i) => c.fillText(l, 130, y0 + i * tam * 1.38));
      c.fillStyle = oro; c.font = '700 44px "TB Titulo", Georgia, serif'; c.fillText(cita, 130, y0 + alto + 70);
      c.fillStyle = tinta; c.globalAlpha = .6; c.font = '500 30px "TB Texto", system-ui, sans-serif'; c.fillText('Reina-Valera 1909  ·  Tierra Buena', 130, H - 110); c.globalAlpha = 1;
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png')); if (!blob) throw new Error('sin imagen');
      const f = new File([blob], 'versiculo.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], text: cita }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'versiculo.png'; document.body.appendChild(a); a.click(); a.remove(); toastBib('Imagen guardada');
    } catch (e) { toastBib('No pude crear la imagen'); }
  }
  function lecTexto() {
    const vs = [...lec.sel].sort((x, y) => x - y), inf = libroInfo(lec.cod);
    return vs.map((v) => '«' + lec.versos[v - 1] + '»').join(' ') + '\n— ' + citaVersos(inf[1], lec.cap, vs) + ' (Reina-Valera 1909)';
  }
  function lecPintar() {
    if (!lec) return; const rs = (leer(K_RES) || {})[lec.cod + '.' + lec.cap] || [], cs = leer(K_RESCOL) || {}, ns = leer(K_NOTAS) || {}, mk = new Set(lista(K_MARC).map((x) => x.k));
    document.querySelectorAll('.vers').forEach((p) => {
      const v = Number(p.dataset.v), k = kv(v), c = Number(cs[k]) || 0;
      p.classList.toggle('res', rs.indexOf(v) >= 0); [0, 1, 2, 3].forEach((i) => p.classList.toggle('rc' + i, rs.indexOf(v) >= 0 && c === i));
      p.classList.toggle('con-nota', !!ns[k]); p.classList.toggle('marc', mk.has(k));
      p.classList.toggle('sel', lec.sel.has(v)); p.setAttribute('aria-pressed', lec.sel.has(v) ? 'true' : 'false');
    });
  }
  function lecLimpiar() { if (lec) lec.sel.clear(); lecPintar(); lecPanel(); }
  let lecEscucha = false;
  function lecGlobal() {   // una sola vez: progreso de lectura y limpieza al salir del capítulo
    if (lecEscucha) return; lecEscucha = true;
    window.addEventListener('scroll', () => {
      try {
        const bar = $('#lecProg'); if (!bar) return;
        const h = document.documentElement.scrollHeight - window.innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0) + ')';
      } catch (e) { /* sin progreso */ }
    }, { passive: true });
    try { new MutationObserver(() => { if (!$('#lectura')) { lec = null; const p = $('#lecAcc'); if (p) p.classList.remove('on'); } }).observe($('#pantalla'), { childList: true }); } catch (e) { /* sin observador */ }
  }
  // ---------- F890 · Apariencia simple y escuchar la Biblia (lo mejor de Bible Patch y La Biblia) ----------
  // Apariencia: una sola hoja con tres cosas (tema, letra, tamaño). Se ofrece sola la primera vez que se abre un capítulo.
  // Escuchar: la voz del teléfono lee el capítulo; un mini reproductor queda abajo y sigue aunque cambies de pestaña.
  const K_APAR = 'tb_movil_lector_apar';
  const APAR_T = [['nieve', '🌅 Amanecer'], ['pergamino', '🌾 Tierra buena'], ['medianoche', '🌙 Noche en calma']];   // F904: nombres propios de Tierra Buena
  function aparienciaHoja(primera) {
    const q = perfilLeer(), tam = () => Math.min(30, Math.max(16, Number(leer(K_BIBTAM)) || 18));
    const h = nuevoEl(`<div class="hoja" id="hojaApar" role="dialog" aria-modal="true" aria-label="Cómo te gusta leer"><div class="hoja-in hoja-apar"><div class="hoja-asa" aria-hidden="true"></div>
      <h3>${primera ? 'Prepara tu rincón de lectura' : 'Tu rincón de lectura'}</h3><p class="suave">${primera ? 'Como quien elige su lugar bajo un árbol. Lo puedes cambiar cuando quieras desde «Aa».' : 'Se ve al instante.'}</p>
      <h4 class="apar-t">La hora de tu lectura</h4><p class="suave m0">Solo cambia esta página; el tema de tu app no se toca.</p><div class="apar-fila" role="group" aria-label="La hora de tu lectura">${APAR_T.map((t) => `<button type="button" class="apar-op apar-t-${t[0]}${q.tl === t[0] ? ' on' : ''}" data-aparT="${t[0]}" aria-pressed="${q.tl === t[0]}">${t[1]}</button>`).join('')}</div>
      <h4 class="apar-t">Tamaño de letra</h4><div class="apar-fila" role="group" aria-label="Tamaño de letra"><button type="button" class="apar-op${(q.z || 'n') === 'n' ? ' on' : ''}" data-aparZ="n" aria-pressed="${(q.z || 'n') === 'n'}">Normal</button><button type="button" class="apar-op${q.z === 'g' ? ' on' : ''}" data-aparZ="g" aria-pressed="${q.z === 'g'}">Grande</button><button type="button" class="apar-op${q.z === 'm' ? ' on' : ''}" data-aparZ="m" aria-pressed="${q.z === 'm'}">Muy grande</button></div><h4 class="apar-t">La voz de la página</h4><div class="apar-fila" role="group" aria-label="La voz de la página"><button type="button" class="apar-op apar-serif${q.f !== 'sans' ? ' on' : ''}" data-aparF="serif" aria-pressed="${q.f !== 'sans'}">Como una carta</button><button type="button" class="apar-op apar-sans${q.f === 'sans' ? ' on' : ''}" data-aparF="sans" aria-pressed="${q.f === 'sans'}">Como un camino</button></div>
      <h4 class="apar-t">Qué tan cerca la quieres</h4><div class="apar-tam"><button type="button" class="btn sec chico" id="aparMenos" aria-label="Letra más chica">A−</button><p class="apar-muestra lectura" id="aparMuestra">En el principio creó Dios los cielos y la tierra.</p><button type="button" class="btn sec chico" id="aparMas" aria-label="Letra más grande">A+</button></div>
      <button type="button" class="btn" id="aparOk">Listo</button></div></div>`);
    if (!h) return; document.body.appendChild(h);
    const muestra = () => { try { $('#aparMuestra').style.fontSize = tam() + 'px'; const l = $('#lectura'); if (l) l.style.fontSize = tam() + 'px'; } catch (e) { /* sin muestra */ } };
    muestra();
    h.querySelectorAll('[data-aparT]').forEach((b) => b.addEventListener('click', () => { vibra(); perfilGuardar({ tl: b.dataset.aparT }); temaLectura(); h.querySelectorAll('[data-aparT]').forEach((x) => { clase(x, 'on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }));
    h.querySelectorAll('[data-aparZ]').forEach((b) => b.addEventListener('click', () => { vibra(); perfilGuardar({ z: b.dataset.aparZ }); ajusteAplicar(); h.querySelectorAll('[data-aparZ]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }); }));
    h.querySelectorAll('[data-aparF]').forEach((b) => b.addEventListener('click', () => { vibra(); perfilGuardar({ f: b.dataset.aparF }); ajusteAplicar(); h.querySelectorAll('[data-aparF]').forEach((x) => { clase(x, 'on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }));
    $('#aparMenos').onclick = () => { guardar(K_BIBTAM, Math.max(16, tam() - 2)); muestra(); };
    $('#aparMas').onclick = () => { guardar(K_BIBTAM, Math.min(30, tam() + 2)); muestra(); };
    const cerrar = () => { try { h.remove(); } catch (e) { /* nada */ } };
    $('#aparOk').onclick = cerrar; h.addEventListener('click', (e) => { if (e && e.target === h) cerrar(); });
  }
  const aud = { on: false, pausa: false, cod: '', cap: 0, i: 0, vel: 1, libro: null, ver: 'rv' };
  const audOk = () => { try { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { return false; } };
  function audMini() {                                    // el mini reproductor vive en el cuerpo de la página: no se borra al cambiar de pestaña
    let m = $('#audMini');
    if (!aud.on) { if (m) m.remove(); return; }
    if (!m) { m = nuevoEl('<div class="aud-mini" id="audMini" role="region" aria-label="Escuchando la Biblia"></div>'); if (!m) return; document.body.appendChild(m); }
    const inf = libroInfo(aud.cod);
    m.innerHTML = `<button type="button" class="aud-tit" id="audIr" aria-label="Abrir el capítulo"><small>Escuchando</small><b>${esc(inf ? inf[1] : '')} ${aud.cap}</b></button>
      <button type="button" class="aud-b" id="audPP" aria-label="${aud.pausa ? 'Seguir' : 'Pausar'}">${svg(aud.pausa ? 'play' : 'pausa', 22)}</button>
      <button type="button" class="aud-b aud-vel" id="audVel" aria-label="Velocidad">${aud.vel === 1 ? '1×' : String(aud.vel).replace('.', ',') + '×'}</button>
      <button type="button" class="aud-b" id="audX" aria-label="Dejar de escuchar">${svg('x', 20)}</button>`;
    $('#audIr').onclick = () => vistaCapitulo(aud.cod, aud.cap);
    $('#audPP').onclick = () => { vibra(); if (aud.pausa) { aud.pausa = false; try { speechSynthesis.resume(); if (!speechSynthesis.speaking) audDecir(); } catch (e) { /* nada */ } } else { aud.pausa = true; try { speechSynthesis.pause(); } catch (e) { /* nada */ } } audMini(); };
    $('#audVel').onclick = () => { aud.vel = aud.vel === 1 ? 1.2 : aud.vel === 1.2 ? 0.85 : 1; try { speechSynthesis.cancel(); } catch (e) { /* nada */ } audDecir(); audMini(); };
    $('#audX').onclick = audParar;
  }
  function audMarca() { try { document.querySelectorAll('.vers').forEach((p) => clase(p, 'oyendo', aud.on && lec && lec.cod === aud.cod && lec.cap === aud.cap && Number(p.dataset.v) === aud.i + 1)); const o = document.querySelector('.vers.oyendo'); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* sin resaltado */ } }
  function audParar() { aud.on = false; aud.pausa = false; try { speechSynthesis.cancel(); } catch (e) { /* nada */ } audMini(); audMarca(); const b = $('#audBtn'); if (b) clase(b, 'on', false); }
  function audDecir() {
    if (!aud.on || !aud.libro) return;
    const versos = aud.libro[aud.cap - 1];
    if (!versos || aud.i >= versos.length) return audSiguiente();
    const u = new SpeechSynthesisUtterance(String(versos[aud.i])); u.lang = 'es-ES'; u.rate = aud.vel;
    try { const vs = (speechSynthesis.getVoices() || []).filter((x) => /^es/i.test(x.lang)), v = ['es-CL', 'es-419', 'es-US', 'es-MX', 'es-AR'].map((c) => vs.find((x) => x.lang.replace('_', '-') === c)).find(Boolean) || vs[0]; if (v) { u.voice = v; u.lang = v.lang; } } catch (e) { /* voz por defecto */ }   // F900: voz en español latino si el teléfono la tiene; nunca en inglés
    const i = aud.i;
    u.onend = () => { if (aud.on && !aud.pausa && aud.i === i) { aud.i++; audDecir(); } };
    u.onerror = (e) => { if (e && (e.error === 'canceled' || e.error === 'interrupted')) return; audParar(); toastBib('No se pudo reproducir el audio'); };
    try { speechSynthesis.speak(u); } catch (e) { audParar(); }
    temaLectura(); audMarca();
  }
  async function audSiguiente() {                         // al terminar el capítulo sigue con el que viene (como un audiolibro)
    const idx = LIBROS.findIndex((l) => l[0] === aud.cod), inf = libroInfo(aud.cod);
    let cod = aud.cod, cap = aud.cap + 1;
    if (cap > inf[2]) { if (idx >= LIBROS.length - 1) return audParar(); cod = LIBROS[idx + 1][0]; cap = 1; }
    await audEmpezar(cod, cap, 0, true);
  }
  async function audEmpezar(cod, cap, desde, seguido) {
    if (!audOk()) { toastBib('Tu teléfono no tiene voz para leer en voz alta'); return; }
    try { speechSynthesis.cancel(); } catch (e) { /* nada */ }
    const vAud = verActual();                                   // F900: el audio lee la MISMA versión que se ve en pantalla
    try { aud.libro = await libroCargar(cod, vAud); } catch (e) { toastBib(SIN_LIBRO); return; }
    aud.ver = vAud; aud.on = true; aud.pausa = false; aud.cod = cod; aud.cap = cap; aud.i = desde || 0;
    audMini(); audDecir();
    const b = $('#audBtn'); if (b) clase(b, 'on', true);
  }
  async function vistaCapitulo(cod, cap, dir) {
    const inf = libroInfo(cod); if (!inf) return vistaBiblia();
    cap = Math.min(Math.max(1, Number(cap) || 1), inf[2]);
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ ${esc(inf[1])}</button><h1>${esc(inf[1])} ${cap}</h1><div class="filete"></div><p class="suave" id="bibmsg"><span class="esq-claro"></span><span class="esq-claro"></span><span class="esq-claro corto"></span><span class="esq-claro"></span><span class="esq-claro corto"></span></p>`;
    volverA(inf[1], () => vistaLibro(cod));
    const va = verActual(), m0 = $('#bibmsg'); if (m0 && va !== 'rv') m0.textContent = 'Bajando ' + verDe(va).c + '… (solo la primera vez)';
    let libro; try { libro = await libroCargar(cod, va); } catch (e) { const m = $('#bibmsg'); if (m) m.textContent = SIN_LIBRO; return; }
    const versos = libro[cap - 1]; const m = $('#bibmsg'); if (!versos || !m) return;
    guardar(K_BIB, { cod, cap }); rachaMarcar(); leidoMarcar(cod, cap); planAuto(cod, cap);
    const tam = Math.min(30, Math.max(16, Number(leer(K_BIBTAM)) || 18));
    const idx = LIBROS.findIndex((l) => l[0] === cod);
    const ant = cap > 1 ? [cod, cap - 1] : (idx > 0 ? [LIBROS[idx - 1][0], LIBROS[idx - 1][2]] : null);
    const sig = cap < inf[2] ? [cod, cap + 1] : (idx < LIBROS.length - 1 ? [LIBROS[idx + 1][0], 1] : null);
    const nombre = (x) => libroInfo(x[0])[1] + ' ' + x[1];
    $('#pantalla').innerHTML = `<i class="lec-prog" id="lecProg" aria-hidden="true"></i><button type="button" class="volver" id="volver">‹ ${esc(inf[1])}</button><h1>${esc(inf[1])} ${cap}</h1><div class="filete"></div>${verChip()}
      <div class="tamano" role="group" aria-label="Tamaño de la letra"><button type="button" class="btn sec chico" id="menos" aria-label="Letra más chica">A−</button><button type="button" class="btn sec chico" id="mas" aria-label="Letra más grande">A+</button><button type="button" class="btn sec chico" id="aparBtn" aria-label="Apariencia de la lectura">${svg('texto', 20)} Aa</button><button type="button" class="btn sec chico${aud.on && aud.cod === cod && aud.cap === cap ? ' on' : ''}" id="audBtn" aria-label="Escuchar este capítulo">${svg('audifonos', 20)} Escuchar</button></div>
      <p class="lec-pista suave">Toca un versículo: resáltalo con color, escribe una nota, guárdalo o hazle una imagen.</p>
      <div class="lectura ${dir ? 'desde-' + dir : ''}" id="lectura">${versos.map((t, i) => `<p class="vers" data-v="${i + 1}" role="button" tabindex="0" aria-pressed="false"><sup>${i + 1}</sup> ${esc(t)}</p>`).join('')}</div>
      <div class="card hac-lector"><b>¿Qué harás con lo que leíste?</b><p class="suave m0t">Leer es el principio. Llévalo a una acción pequeña.</p><button type="button" class="btn chico" id="hacerBtn">${svg('chispas', 18)} Llevarlo a la acción</button></div>
      <div class="navcap">${ant ? `<button type="button" class="btn sec chico" id="ant">‹ ${esc(nombre(ant))}</button>` : '<span></span>'}${sig ? `<button type="button" class="btn chico" id="sig">${esc(nombre(sig))} ›</button>` : ''}</div>`;
    volverA(inf[1], () => vistaLibro(cod)); verChipBind(() => vistaCapitulo(cod, cap));
    lec = { cod, cap, versos, sel: new Set() };
    try { $('#lectura').style.fontSize = tam + 'px'; } catch (e) { /* sin estilo */ }
    const cambiarTam = (d) => { const n = Math.min(30, Math.max(16, (Number(leer(K_BIBTAM)) || 18) + d)); guardar(K_BIBTAM, n); $('#lectura').style.fontSize = n + 'px'; };
    $('#menos').onclick = () => cambiarTam(-2); $('#mas').onclick = () => cambiarTam(2);
    $('#hacerBtn').onclick = () => vistaHacer({ ref: inf[1] + ' ' + cap }, () => vistaCapitulo(cod, cap));
    $('#aparBtn').onclick = () => aparienciaHoja(false);
    $('#audBtn').onclick = () => { vibra(); if (aud.on && aud.cod === cod && aud.cap === cap) audParar(); else audEmpezar(cod, cap, 0); };
    if (!leer(K_APAR)) { guardar(K_APAR, 1); setTimeout(() => aparienciaHoja(true), 500); }   // primera vez en la Biblia: ofrece elegir fondo, letra y tamaño
    audMarca();
    const ir = (x, d) => { vibra(); vistaCapitulo(x[0], x[1], d); };
    if (ant) $('#ant').onclick = () => ir(ant, 'izq'); if (sig) $('#sig').onclick = () => ir(sig, 'der');
    try {
      lecGlobal();
      const lect = $('#lectura');
      const alternar = (p) => { const v = Number(p.dataset.v); if (lec.sel.has(v)) lec.sel.delete(v); else lec.sel.add(v); vibra(); lecPintar(); lecPanel(); };
      lect.addEventListener('click', (e) => { const p = e.target && e.target.closest && e.target.closest('.vers'); if (p) alternar(p); });
      lect.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('vers')) { e.preventDefault(); alternar(e.target); } });
      let x0 = 0, y0 = 0, t0 = 0;   // deslizar: izquierda = siguiente, derecha = anterior (solo gestos largos y horizontales)
      lect.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
      lect.addEventListener('touchend', (e) => { const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Date.now() - t0 > 600 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * .6) return; if (dx < 0 && sig) ir(sig, 'der'); else if (dx > 0 && ant) ir(ant, 'izq'); }, { passive: true });
      lecPintar();
    } catch (e) { /* sin gestos */ }
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
      <button type="button" class="btn" id="vcomp">Compartir</button><button type="button" class="btn sec" id="vimg">Crear imagen para compartir</button><button type="button" class="btn sec" id="vleer">Leer el capítulo</button>`;
    $('#vleer').onclick = () => vistaCapitulo(r.cod, r.cap);
    $('#vimg').onclick = () => versoImagen(texto, cita);
    $('#vcomp').onclick = async () => {
      const t = '«' + texto + '» — ' + cita;
      try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); $('#vcomp').textContent = 'Copiado ✓'; } } catch (e) { /* se cerro el menu de compartir */ }
    };
  }
  // ---------- Vida y servicio (MOV4) ----------
  // Todo lo personal (diario de oracion, pasos de crecimiento, ideas favoritas) queda SOLO en este telefono.
  // Los textos de ideas de crecimiento viven en datos/crecimiento_ideas.json. Las ideas y proyectos para servir viven en Juntos (datos/juntos_catalogo.json, F923).
  const K_MIORACION = 'tb_movil_mi_oracion', K_CREC = 'tb_movil_crecimiento';
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
    $('#pantalla').innerHTML = `${bandaTB('crecer')}<h1>Vivir lo que aprendemos</h1><div class="filete"></div><div class="grid vida-ayuda">${activa('🙏', 'Ayuda y contactos', 'Emergencias, líneas de apoyo, cuidados y tu iglesia.', 'ayuda')}</div>
      <div class="grid">${activa('✨', 'Hoy lo hago', 'Un paso pequeño hoy. Intentarlo ya cuenta.', 'hacer')}</div>
      <h2 class="sep">Planes de vida</h2><div class="grid">${activa('🌱', 'Planes de vida', 'Un tema a la vez para crecer como persona.', 'planvida')}</div><h2 class="sep">Con Dios y conmigo</h2><div class="grid">${activa('🕊️', 'Mi oración', 'Tu diario de peticiones, solo para ti.', 'mioracion')}${activa('🎵', 'Música', 'Letras para cantar y para leer en el culto.', 'musica')}${activa('🌱', 'Mi crecimiento', 'Pequeños pasos de cada semana.', 'crecimiento')}${activa('🧠', 'Salud mental', 'Respirar, un chequeo y dónde pedir ayuda.', 'salud')}</div>
      <h2 class="sep">Para aprender</h2><div class="grid">${activa('🎓', 'Aprender', 'Cursos gratuitos en internet para servir mejor, con tu avance.', 'aprender')}</div>`;
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ({ hacer: () => vistaHacer(), planvida: () => seguro(vistaPlanesVida), ayuda: vistaAyuda, juntos: vistaJuntosVida, musica: vistaMusica, mioracion: vistaMiOracion, crecimiento: vistaCrecimiento, salud: vistaSalud, aprender: vistaAprender }[b.dataset.ir] || vistaVida)()));
  }

  // ---------- F891 · «Hoy lo hago»: la Palabra se vive ----------
  // Principios de Tierra Buena: (1) accionar, no quedarse con lo aprendido; (2) mejorar la sociedad desde la acción de cada persona;
  // (3) ver lo que falta en otros sirve para saber cómo ayudarlos, nunca para hablar mal; (5) compartir lo que hacemos y animar a intentarlo.
  // Todo queda en este teléfono; compartir es una elección de la persona (nunca se sube nada solo).
  const K_HACER = 'tb_movil_acciones';
  const HAC_TIPOS = [['yo', 'Mejorar yo', 'corazon'], ['otros', 'Ayudar a alguien', 'gente'], ['sociedad', 'Mi comunidad', 'iglesia']];
  const HAC_IDEAS = {
    yo: ['Pedir perdón a alguien', 'Dejar un mal hábito por hoy', 'Orar 5 minutos en silencio', 'Dormir a mi hora'],
    otros: ['Llamar a alguien que está solo', 'Escuchar sin interrumpir', 'Llevarle comida a un vecino', 'Ofrecer mi ayuda en la iglesia'],
    sociedad: ['Recoger basura de mi calle', 'Visitar a un adulto mayor', 'Donar ropa que no uso', 'Cuidar un espacio de todos']
  };
  const hacLista = () => { const l = leer(K_HACER); return Array.isArray(l) ? l : []; };
  const hacGuardar = (l) => guardar(K_HACER, l.slice(-300));
  const nHechas = () => hacLista().filter((x) => x.est === 'hecho' || x.est === 'intente').length;
  const hacTexto = (x) => (x.est === 'intente' ? 'Hoy lo intenté: ' : 'Hoy lo hice: ') + x.t + ' 🌱\nEmpecemos por nosotros. #TierraBuena';
  function vistaHacer(pre, atras) {
    const todas = hacLista(), mes = claveMes();
    const pend = todas.filter((x) => x.est === 'pend'), fin = todas.filter((x) => x.est !== 'pend').reverse().slice(0, 8);
    const delMes = todas.filter((x) => x.est !== 'pend' && String(x.fin || '').slice(0, 7) === mes);
    let tipo = (pre && pre.tipo) || 'otros';
    const volverFn = atras || vistaVida;
    $('#pantalla').innerHTML = `<button type="button" class="volver" id="volver">‹ ${atras ? 'Volver' : 'Vida'}</button><section class="hac-hero"><span class="hac-h-a" aria-hidden="true"></span><span class="hac-h-b" aria-hidden="true"></span><p class="hac-sello">Un paso a la vez</p><h1>Hoy lo hago</h1>
        <p class="hac-lema">Leer es el principio. Aquí damos el paso: algo pequeño, hoy, que mejora tu vida y la de los demás. Intentarlo ya cuenta.</p></section>
      <div class="stats hac-stats"><div class="stat"><span class="stat-ic">${svg('check', 22)}</span><b>${delMes.length}</b><small>pasos este mes</small></div><div class="stat"><span class="stat-ic">${svg('trofeo', 22)}</span><b>${nHechas()}</b><small>en total</small></div></div>
      <div class="card hac-nueva"><h3 class="m0">${pre && pre.ref ? 'Lo que leí en ' + esc(pre.ref) + ': ¿qué haré?' : '¿Qué vas a hacer hoy?'}</h3>
        <div class="chips hac-tipos" role="group" aria-label="Tipo de acción">${HAC_TIPOS.map((t) => `<button type="button" class="chip${t[0] === tipo ? ' on' : ''}" data-tipo="${t[0]}" aria-pressed="${t[0] === tipo}">${esc(t[1])}</button>`).join('')}</div>
        <div class="hac-ideas" id="hacIdeas"></div>
        <label for="hacTxt" class="sr">Mi acción</label><input id="hacTxt" type="text" maxlength="140" placeholder="Algo pequeño y concreto" autocomplete="off" value="${esc((pre && pre.texto) || '')}">
        <button type="button" class="btn" id="hacOk">Me comprometo</button></div>
      <h2 class="sep">Mis compromisos</h2><div id="hacPend">${pend.length ? pend.map((x) => `<div class="card item hac-pend"><p class="m0">${esc(x.t)}</p>${x.nec ? `<small class="suave">Necesita: ${esc(x.nec)}</small>` : ''}<div class="hac-fila"><button type="button" class="btn chico" data-hec="${esc(x.id)}">Lo hice</button><button type="button" class="btn sec chico" data-int="${esc(x.id)}">Lo intenté</button><button type="button" class="enlace" data-quitar="${esc(x.id)}">Quitar</button></div></div>`).join('') : '<p class="suave">Aún no tienes ninguno. Elige uno arriba y empieza.</p>'}</div>
      <div class="card hac-mirar"><h3 class="m0">${svg('foco', 20)} Mirar para ayudar</h3>
        <p class="suave m0t">Ver lo que falta a nuestro alrededor sirve para saber cómo ayudar, no para hablar mal de nadie. Escribe la necesidad, <b>sin nombres</b>.</p>
        <button type="button" class="btn sec" id="hacMirar">Quiero ayudar con algo que noté</button><div id="hacMirarForm" hidden>
          <label for="mQue">¿Qué necesidad noté?</label><input id="mQue" type="text" maxlength="120" autocomplete="off" placeholder="Ej. Un vecino mayor vive solo">
          <label for="mNec">¿Qué necesita?</label><input id="mNec" type="text" maxlength="120" autocomplete="off" placeholder="Ej. Compañía y alguien que le haga las compras">
          <label for="mYo">¿Qué puedo hacer yo?</label><input id="mYo" type="text" maxlength="140" autocomplete="off" placeholder="Ej. Visitarlo el sábado y llevarle pan">
          <button type="button" class="btn" id="mOk">Comprometerme a ayudar</button></div></div>
      ${fin.length ? `<h2 class="sep">Lo que ya hice</h2><div id="hacFin">${fin.map((x) => `<div class="card item hac-fin"><span class="hac-sello ${x.est}">${x.est === 'hecho' ? 'Lo hice' : 'Lo intenté'}</span><p class="m0t">${esc(x.t)}</p><div class="hac-fila"><small class="suave">${esc(fecha(x.fin))}</small><button type="button" class="btn sec chico" data-comp="${esc(x.id)}">${svg('compartir', 18)} Compartir</button></div></div>`).join('')}</div>` : ''}`;
    volverA(atras ? 'Volver' : 'Vida', volverFn);
    const pintaIdeas = () => { const c = $('#hacIdeas'); if (!c) return; c.innerHTML = (HAC_IDEAS[tipo] || []).map((t) => `<button type="button" class="chip suave-chip" data-idea="${esc(t)}">${esc(t)}</button>`).join(''); c.querySelectorAll('[data-idea]').forEach((b) => b.addEventListener('click', () => { $('#hacTxt').value = b.dataset.idea; vibra(); })); };
    pintaIdeas();
    document.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; vibra(); document.querySelectorAll('[data-tipo]').forEach((x) => { clase(x, 'on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); pintaIdeas(); }));
    const nueva = (t, tp, ref) => { const l = hacLista(); l.push({ id: 'h' + Date.now().toString(36) + Math.floor(Math.random() * 1e3), t: String(t).trim().slice(0, 140), tipo: tp, ref: ref || '', ini: new Date().toISOString(), est: 'pend' }); hacGuardar(l); };
    $('#hacOk').onclick = () => { const t = $('#hacTxt').value.trim(); if (!t) { toastBib('Escribe qué vas a hacer'); return; } nueva(t, tipo, pre && pre.ref); vibra(); confeti($('#hacOk')); toastBib('Compromiso guardado. ¡Tú puedes!'); setTimeout(() => vistaHacer(null, atras), 700); };
    $('#hacMirar').onclick = () => { $('#hacMirarForm').hidden = false; $('#hacMirar').hidden = true; try { $('#mQue').focus(); } catch (e) { /* nada */ } };
    $('#mOk').onclick = () => { const q = $('#mQue').value.trim(), n = $('#mNec').value.trim(), y = $('#mYo').value.trim(); if (!y) { toastBib('Cuéntanos qué puedes hacer tú'); return; } nueva(y, 'mirar', ''); const l = hacLista(), u = l[l.length - 1]; if (u) { u.vi = q.slice(0, 120); u.nec = n.slice(0, 120); hacGuardar(l); } toastBib('Mirar para ayudar: ¡gracias por actuar!'); setTimeout(() => vistaHacer(null, atras), 600); };
    const cierra = (id, est) => { const l = hacLista(), x = l.find((y) => y.id === id); if (!x) return; x.est = est; x.fin = new Date().toISOString(); hacGuardar(l); };
    document.querySelectorAll('[data-hec]').forEach((b) => b.addEventListener('click', () => { cierra(b.dataset.hec, 'hecho'); gotaGanar('vida'); vibra(); confeti(b); toastBib('¡Lo hiciste! Así se mejora el mundo'); setTimeout(() => vistaHacer(null, atras), 800); }));
    document.querySelectorAll('[data-int]').forEach((b) => b.addEventListener('click', () => { cierra(b.dataset.int, 'intente'); vibra(); toastBib('Intentarlo ya es avanzar. Sigue.'); setTimeout(() => vistaHacer(null, atras), 700); }));
    document.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => { hacGuardar(hacLista().filter((x) => x.id !== b.dataset.quitar)); vistaHacer(null, atras); }));
    document.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', async () => { const x = hacLista().find((y) => y.id === b.dataset.comp); if (!x) return; const t = hacTexto(x); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toastBib('Copiado: pégalo donde quieras animar a otros'); } } catch (e) { /* se cerró el menú */ } }));
  }


  // ---------- Música (F882) ----------
  // Letras para cantar o leer en el culto. Las de ejemplo son ORIGINALES (sin derechos de terceros); cada persona puede
  // agregar las suyas (quedan en su teléfono y viajan con su cuenta). Pantalla encendida, letra grande y desplazamiento suave.
  const K_CMIAS = 'tb_movil_canciones_mias', K_CFAV = 'tb_movil_canciones_fav', K_CTAM = 'tb_movil_cancion_tam';
  const esTitulo = (l) => /^(verso|coro|puente|pre-?coro|estribillo|intro|final|interludio)\b/i.test(l.trim()) && l.trim().length <= 24;
  const letraHtml = (t) => String(t || '').split(/\n{2,}/).map((b) => {
    const ls = b.split('\n').filter((x) => x.trim()); if (!ls.length) return '';
    const cab = esTitulo(ls[0]) ? `<h3 class="can-sec">${esc(ls.shift())}</h3>` : '';
    return `<div class="can-bloque">${cab}${ls.map((x) => `<p>${esc(x)}</p>`).join('')}</div>`;
  }).join('');
  let musicaSel = 'canciones';
  async function vistaMusica() {
    respSesion++;
    $('#pantalla').innerHTML = `${cabecera('Música', 'Vivir lo que aprendemos')}<p class="suave" id="mumsg">Cargando…</p>`;
    volverA('Vivir lo que aprendemos', vistaVida);
    let c, r; try { c = await datoCargar('canciones_ejemplo'); r = await datoCargar('musica_reflexiones'); } catch (e) { c = null; }
    const m = $('#mumsg'); if (!m) return; if (!c || !r) { m.textContent = SIN_DATOS; return; }
    const fav = new Set(lista(K_CFAV)), mias = lista(K_CMIAS);
    const todas = mias.map((x) => ({ id: x.id, titulo: x.titulo, letra: x.letra, mia: true })).concat((c.biblioteca || []).map((x) => ({ id: x.id, titulo: String(x.titulo).replace(/^Ejemplo \d+\s—\s/, ''), letra: x.letra })));
    todas.sort((a, b) => (fav.has(b.id) ? 1 : 0) - (fav.has(a.id) ? 1 : 0));
    const pestanas = [['canciones', 'Canciones'], ['reflex', 'Para músicos']];
    let cuerpo;
    if (musicaSel === 'reflex') cuerpo = (r.tarjetas || []).map((t) => `<details class="card ayuda-it"><summary><span aria-hidden="true">${icono(t.icono)}</span> ${esc(t.titulo)}</summary><p class="m0t">${esc(t.resumen)}</p><ul class="formas">${(t.puntos || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${t.paraPensar ? `<p class="sep"><b>Para pensar:</b> ${esc(t.paraPensar)}</p>` : ''}</details>`).join('');
    else cuerpo = `<div class="grid">${todas.map((x) => `<button type="button" class="card can-fila" data-can="${esc(x.id)}"><div class="t"><span aria-hidden="true">${svg('nota')}</span>${esc(x.titulo)}${fav.has(x.id) ? `<span class="etiqueta">${svg('estrella', 14)}</span>` : ''}<span class="flecha" aria-hidden="true">›</span></div>${x.mia ? '<p class="suave m0t">Tu canción</p>' : ''}</button>`).join('')}</div>
      <button type="button" class="btn sec sep" id="canNueva">+ Agregar mi canción</button>
      <p class="suave sep">Las letras de ejemplo son originales y se pueden usar libremente. Si agregas canciones de otros autores, revisa que tu iglesia tenga la licencia (por ejemplo CCLI).</p>`;
    $('#pantalla').innerHTML = `${cabecera('Música', 'Vivir lo que aprendemos')}
      <div class="chips" role="group" aria-label="Sección">${pestanas.map((x) => `<button type="button" class="chip${musicaSel === x[0] ? ' on' : ''}" data-mus="${x[0]}" aria-pressed="${musicaSel === x[0]}">${x[1]}</button>`).join('')}</div>${cuerpo}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-mus]').forEach((b) => b.addEventListener('click', () => { musicaSel = b.dataset.mus; vistaMusica(); }));
    document.querySelectorAll('[data-can]').forEach((b) => b.addEventListener('click', () => vistaCancion(todas.find((x) => x.id === b.dataset.can))));
    const nv = $('#canNueva'); if (nv) nv.onclick = () => vistaCancionNueva();
  }
  function vistaCancionNueva() {
    $('#pantalla').innerHTML = `${cabecera('Agregar mi canción', 'Música')}
      <p id="msg" role="alert" hidden></p>
      <label for="cnt">Título</label><input id="cnt" type="text" maxlength="80" placeholder="Ej. Mi canción de gratitud">
      <label for="cnl">Letra (deja una línea en blanco entre estrofas; puedes escribir «Verso 1», «Coro»…)</label><textarea id="cnl" rows="10" maxlength="6000"></textarea>
      <button type="button" class="btn" id="cng">Guardar canción</button>`;
    volverA('Música', vistaMusica);
    $('#cng').onclick = () => {
      const t = $('#cnt').value.trim(), l = $('#cnl').value.trim(); if (!t || !l) return msg('Escribe el título y la letra.');
      const m = lista(K_CMIAS); m.push({ id: nuevoId(), titulo: t.slice(0, 80), letra: l.slice(0, 6000) }); guardar(K_CMIAS, m.slice(-60)); musicaSel = 'canciones'; vistaMusica();
    };
  }
  let canTimer = null, canLuz = null;
  function canParar() { if (canTimer) { clearInterval(canTimer); canTimer = null; } if (canLuz) { try { canLuz.release(); } catch (e) { /* nada */ } canLuz = null; } }
  function vistaCancion(x) {
    if (!x) return vistaMusica();
    canParar();
    const fav = new Set(lista(K_CFAV)); let tam = Number(leer(K_CTAM)) || 20; tam = Math.min(34, Math.max(14, tam));
    $('#pantalla').innerHTML = `${cabecera(x.titulo, 'Música')}
      <div class="can-barra" role="group" aria-label="Opciones de la letra">
        <button type="button" class="chip" id="cMenos" aria-label="Letra más pequeña">A−</button><button type="button" class="chip" id="cMas" aria-label="Letra más grande">A+</button>
        <button type="button" class="chip" id="cAuto" aria-pressed="false">${svg('play', 14)} Desplazar</button>
        <button type="button" class="chip${fav.has(x.id) ? ' on' : ''}" id="cFav" aria-pressed="${fav.has(x.id)}">${svg('estrella', 14)} Favorita</button>
      </div>
      <div class="can-letra can-t${tam}" id="canLetra">${letraHtml(x.letra)}</div>
      ${x.mia ? '<button type="button" class="btn sec sep" id="cBorrar">Borrar mi canción</button>' : ''}`;
    volverA('Música', () => { canParar(); vistaMusica(); });
    const fijar = (n) => { tam = Math.min(34, Math.max(14, n)); guardar(K_CTAM, tam); $('#canLetra').className = 'can-letra can-t' + tam; };
    $('#cMenos').onclick = () => fijar(tam - 2); $('#cMas').onclick = () => fijar(tam + 2);
    $('#cFav').onclick = () => { const f = new Set(lista(K_CFAV)), on = !f.has(x.id); if (on) f.add(x.id); else f.delete(x.id); guardar(K_CFAV, [...f]); $('#cFav').classList.toggle('on', on); $('#cFav').setAttribute('aria-pressed', String(on)); if (on) confeti($('#cFav')); };
    $('#cAuto').onclick = async () => {
      const b = $('#cAuto'), on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on);
      if (!on) return canParar();
      try { if (navigator.wakeLock) canLuz = await navigator.wakeLock.request('screen'); } catch (e) { /* sin pantalla encendida */ }
      canTimer = setInterval(() => { window.scrollBy(0, 1); }, 60);
    };
    const bo = $('#cBorrar'); if (bo) bo.onclick = () => { if (!confirm('¿Borrar esta canción?')) return; guardar(K_CMIAS, lista(K_CMIAS).filter((y) => y.id !== x.id)); canParar(); vistaMusica(); };
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
      <p class="suave m0">${esc(fecha(p.fecha))}${p.contestada ? ' · Dios respondió' : ''}</p>
      <button type="button" class="btn sec chico" data-mocont="${esc(p.id)}">${p.contestada ? 'Quitar «contestada»' : '🎉 Marcar como contestada'}</button>
      <button type="button" class="btn sec chico" data-model="${esc(p.id)}">${svg('papelera', 16)} Borrar</button>
      ${p.contestada ? `<div class="respuesta"><label for="mor_${esc(p.id)}"><b>🎉 Cómo respondió Dios</b></label><textarea id="mor_${esc(p.id)}" rows="2" maxlength="400" placeholder="Si quieres, escribe cómo viste la respuesta.">${esc(p.respuesta || '')}</textarea><button type="button" class="btn sec chico" data-mogr="${esc(p.id)}">Guardar</button></div>` : ''}</div>`).join('');
    const cambiar = (id, f) => { const todas = lista(K_MIORACION); const it = todas.find((x) => x.id === id); if (it) { f(it); guardar(K_MIORACION, todas); } };
    caja.querySelectorAll('[data-mocont]').forEach((b) => b.addEventListener('click', () => { cambiar(b.dataset.mocont, (it) => { it.contestada = !it.contestada; }); msg(''); miOracionPintar(); if (lista(K_MIORACION).find((x) => x.id === b.dataset.mocont && x.contestada)) { const nb = document.querySelector('[data-mocont="' + b.dataset.mocont + '"]'); confeti(nb); } }));
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
    const idAcc = leer(K_ID), accMes = idAcc && idAcc.codigo ? accTodas().filter((x) => x.mes === claveMes()).sort((x, y) => (!!y.esDefault - !!x.esDefault) || (new Date(x.fecha) - new Date(y.fecha))) : null;
    const cardAccion = idAcc && idAcc.codigo ? `<h2 class="sep">Mi acción de este mes</h2><div class="card item">
        ${accMes.length ? accMes.map((x) => `<p class="m0"><b>${x.esDefault ? '🌟' : '✚'} ${esc(x.titulo)}</b></p><p class="suave m0t">${x.comoMeFue ? esc(x.comoMeFue.length > 90 ? x.comoMeFue.slice(0, 90) + '…' : x.comoMeFue) : 'Aún no cuentas cómo te fue.'}</p>`).join('') : '<p class="suave m0">Este mes todavía no abres la Acción del mes de tu iglesia.</p>'}
        <button type="button" class="btn sec chico" id="cracc">${accMes.length ? 'Contar cómo me fue' : 'Abrir la Acción del mes'} ›</button></div>` : '';
    $('#pantalla').innerHTML = `${cabecera('Mi crecimiento', 'Vivir lo que aprendemos')}
      <h2>Mi paso de esta semana</h2><p id="msg" role="alert" hidden></p>
      <p class="suave m0">${todos.filter((x) => x.hecho).length ? 'Semanas con un paso cumplido: ' + todos.filter((x) => x.hecho).length + '. Un paso a la vez.' : 'Un paso pequeño basta. No hay prisa.'}</p>
      ${actual ? `<div class="card item"><p class="m0"><b>${esc(actual.icono || '🌱')} ${esc(actual.titulo)}</b></p>
          <label for="crnota">¿Cómo te fue con esto? Cuéntalo en pocas palabras.</label><textarea id="crnota" rows="3" maxlength="600" placeholder="Escribe cómo te fue…">${esc(actual.nota || '')}</textarea>
          <div class="cr-acc"><button type="button" class="btn ${actual.hecho ? 'sec' : ''} chico" id="crhecho" aria-pressed="${!!actual.hecho}">${actual.hecho ? '✓ Hecho esta semana (quitar)' : 'Lo hice esta semana'}</button><button type="button" class="btn sec chico" id="crsave">Guardar nota</button></div></div>`
        : '<p class="suave">Todavía no elegiste un paso para esta semana. Elige una idea abajo y pruébala con calma: uno pequeño basta.</p>'}
      ${cardAccion}
      <h2 class="sep">${actual ? 'Cambiar mi paso' : 'Elegir una idea'}</h2>
      <div class="grid">${AREAS.map((a) => activa(a[1], a[2], 'Ideas sencillas para empezar.', a[0])).join('')}</div>
      ${antes.length ? `<h2 class="sep">Mis pasos anteriores</h2>${antes.map((x) => `<div class="card item"><p class="m0"><b>${esc(x.icono || '🌱')} ${esc(x.titulo)}</b></p><p class="suave m0">Semana ${esc(x.sem.replace('-S', ' · S'))}</p>${x.nota ? `<p class="m0t">${esc(x.nota)}</p>` : ''}</div>`).join('')}` : ''}`;
    volverA('Vivir lo que aprendemos', vistaVida);
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => vistaAreaCrec(b.dataset.ir)));
    if (cardAccion) $('#cracc').onclick = () => vistaAccion(leer(K_ID));
    if (actual) $('#crsave').onclick = () => {
      const t = $('#crnota').value.trim();
      const l = lista(K_CREC); const it = l.find((x) => x.sem === sem); if (!it) return;
      if (!t) return msg(it.nota ? 'Tu nota anterior sigue guardada. Escribe algo nuevo para cambiarla.' : 'Puedes escribir una nota cuando quieras.', false);
      it.nota = t.slice(0, 600); guardar(K_CREC, l); msg('Guardado en este teléfono.', true);
    };
    if (actual) $('#crhecho').onclick = () => {
      const l = lista(K_CREC); const it = l.find((x) => x.sem === sem);
      if (it) { it.hecho = !it.hecho; guardar(K_CREC, l); vibra(); vistaCrecimiento(); }
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

  // ---------- Salud mental (MOV5) ----------
  // Textos de datos/salud_mental_*.json (copias de src/data/). El chequeo NO se guarda.
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



  // ---------- F883 · Mi Biblia, planes de lectura, logros ----------
  const hoyTxt = () => diaTxt(new Date());
  // F931 (I4): leer un capítulo o cumplir una acción de Vida da gotas de rocío en el Inicio (con topes diarios; sin Inicio o sin árbol elegido no pasa nada).
  function gotaGanar(origen) { try { if (window.TBInicio && !window.TBInicio.cargar().eligiendo && window.TBInicio.ganar(origen)) toastBib('Una gota de rocío te espera en el Inicio'); } catch (e) { /* sin Inicio */ } }
  function leidoMarcar(cod, cap) { const l = leer(K_LEIDOS) || {}; if (l[cod + '.' + cap] === hoyTxt()) return; l[cod + '.' + cap] = hoyTxt(); guardar(K_LEIDOS, l); gotaGanar('lectura'); }
  const nLeidos = () => Object.keys(leer(K_LEIDOS) || {}).length;
  const leidosHoy = () => Object.values(leer(K_LEIDOS) || {}).filter((d) => d === hoyTxt()).length;
  const rg = (k) => { const o = leer(k); return o && typeof o === 'object' ? o : {}; };
  const nResaltes = () => Object.values(rg(K_RES)).reduce((t, a) => t + (Array.isArray(a) ? a.length : 0), 0);
  const rango = (cod, a, b) => { const r = []; for (let i = a; i <= b; i++) r.push([cod, i]); return r; };
  // F995 · Planes de vida (crecer como persona, sin Biblia) y portada de la Biblia.
  const K_PLANVIDA = 'tb_movil_planvida';
  const PLAN_VIDA = [
    { id: 'yo', n: 'Mi relación conmigo', d: '7 días para conocerte, entenderte y tratarte con cariño', ctx: 'Tu relación contigo es la base de todas las demás. Cada día trae una idea breve, una acción pequeña y una pregunta para pensar.', aviso: 'Este plan acompaña; no reemplaza a un profesional. Si piensas en hacerte daño o en no seguir viviendo, busca ayuda de inmediato (Ayuda y contactos). En Mi crecimiento, sección Salud Mental, hay más apoyo.', dias: [
      { t: 'Conocerte', r: 'Tu valor no depende de lo que produces hoy. Conocerte empieza por observar tus pensamientos sin juzgarlos.', a: 'Dedica cinco minutos en silencio a observar tus pensamientos, recordando que tu valor no depende de tu productividad de hoy.', p: '¿Qué pensamiento se repite cuando te evalúas, y cómo cambiaría si te miraras con la misma paciencia con que miras a alguien que quieres?', v: 'Salmo 139:1-3', f: 'Kristin Neff, 2023 (autocompasión frente a autoestima que depende del rendimiento)', h: 'No aplica' },
      { t: 'Entenderte', r: 'Nombrar lo que sientes con precisión, sin juzgarlo, ayuda a entenderte. Las emociones difíciles son respuestas humanas, no prueba de debilidad.', a: 'Escribe en un papel la emoción más intensa de esta semana y ponle un nombre claro, sin decidir si es buena o mala.', p: '¿Cómo te ayuda reconocer tu propia fragilidad para acompañar mejor a quienes te rodean?', v: 'Hebreos 4:15', f: 'Kristin Neff, 2023 (humanidad compartida); Henri Nouwen, El sanador herido', h: 'Si las emociones intensas dificultan tu vida diaria por más de dos semanas, habla con un profesional.' },
      { t: 'Valorarte', r: 'Tu valor no depende del éxito ni de la comparación. Como persona creada a imagen de Dios, tienes un valor que no cambia según tu rendimiento.', a: 'Identifica un área donde te comparas con otros y agradece a Dios por tu propio ritmo.', p: '¿Qué pasaría con tu paz interior si hoy dejaras de competir para demostrar que eres suficiente?', v: 'Génesis 1:27', f: 'Kristin Neff, 2023; Henri Nouwen, Life of the Beloved', h: 'No aplica' },
      { t: 'Cuidarte', r: 'Descanso, movimiento y alimentación protegen la salud emocional. Cuidar el cuerpo también es una forma de cuidar la vida que Dios te dio.', a: 'Haz hoy un cambio pequeño: una caminata de quince minutos o acostarte media hora antes.', p: '¿Qué hábito diario está gastando tu energía y cómo podrías ajustarlo esta semana, con realismo?', v: '1 Corintios 6:19', f: 'Organización Mundial de la Salud, directrices sobre actividad física, descanso y salud mental', h: 'Si tienes dolor físico persistente o problemas severos para dormir, consulta a un médico. Antes de un ejercicio intenso, consulta a tu médico.' },
      { t: 'Tratarte con cariño', r: 'La voz interna suele ser más dura que la de un buen amigo. Esa dureza no motiva; la amabilidad hacia uno mismo ayuda a aprender y a seguir adelante.', a: 'Ante tu próximo error, háblate con las mismas palabras de ánimo y paciencia que usarías con un buen amigo.', p: '¿Por qué suele ser más fácil perdonar a un ser querido que perdonarte a ti mismo por una falta parecida?', v: 'Efesios 4:32', f: 'Kristin Neff, 2023 (autoamabilidad frente a autocrítica)', h: 'Si tu voz interna incluye ideas persistentes de hacerte daño o de que el mundo estaría mejor sin ti, busca ayuda de inmediato (Ayuda y contactos).' },
      { t: 'Sobrellevar los días difíciles', r: 'La resiliencia no es la ausencia de dolor, sino la capacidad de adaptarte con flexibilidad. Pasar días oscuros no es fracasar.', a: 'Escoge un versículo o frase de consuelo y léela en voz alta en el momento de mayor cansancio del día.', p: '¿Qué recursos personales, comunitarios o espirituales te han ayudado a recuperarte en el pasado?', v: 'Salmo 46:1', f: 'George Bonanno, investigación sobre resiliencia y flexibilidad regulatoria (cita exacta por verificar)', h: 'Si la desesperanza te impide hacer tareas básicas como comer, asearte o cuidar a tu familia, busca ayuda profesional hoy.' },
      { t: 'Cuando hay pérdida', r: 'Una pérdida pide tiempo, y no hay un plazo correcto para el duelo. No existen etapas obligatorias: cada persona atraviesa el dolor a su manera.', a: 'Realiza un acto simbólico y privado, como encender una vela o escribir una carta de gratitud por lo que perdiste.', p: '¿De qué manera la gratitud por lo compartido puede, con el tiempo, darte fuerza para seguir adelante?', v: 'Mateo 5:4', f: 'George Bonanno, investigación longitudinal sobre el duelo', h: 'Si el dolor te paraliza más de un año después de la pérdida, busca apoyo profesional.' },
    ] },
    {id: "familia",n: "Mi relación con mi familia",d: "7 días para cuidar los vínculos del hogar",ctx: "La familia es el primer lugar donde aprendemos a amar, a pedir perdón y a sostenernos. Cada día trae una idea breve y una acción pequeña.",aviso: "Este plan acompaña; no reemplaza a un profesional. Si hay violencia, abuso o miedo en tu hogar, tu seguridad es lo primero: busca ayuda de inmediato (Ayuda y contactos).",dias: [{t: "El cimiento del afecto",r: "Las relaciones duraderas se nutren de aprecio concreto. Notar lo bueno de quien está cerca fortalece el vínculo.",a: "Dile a alguien de tu familia una cualidad concreta que admiras de su carácter, no solo algo que hizo por ti.",p: "¿Qué virtud de alguien de tu familia has dejado de ver por costumbre?",v: "1 Tesalonicenses 5:11",f: "John Gottman, Siete principios para hacer que el matrimonio funcione (1999)",h: "No aplica"},{t: "Comunicar sin herir",r: "Hablar desde lo que uno siente y necesita suele abrir la conversación; atacar a la persona suele cerrarla.",a: "Antes de una queja, di «yo siento…» en lugar de «tú siempre…». Evita las palabras «siempre» y «nunca».",p: "¿Qué tono de voz usas cuando estás más molesto? ¿Refleja lo que sientes de verdad?",v: "Proverbios 15:1",f: "John Gottman (identificación de los cuatro jinetes de la crítica relacional, 1999)",h: "Si las discusiones incluyen insultos o humillaciones constantes, busca orientación profesional."},{t: "Ser refugio seguro",r: "Los niños y las personas que dependen de nosotros se sienten seguros cuando la presencia es atenta y predecible.",a: "Dedica quince minutos de atención plena a alguien de tu familia, sin celular.",p: "¿Cómo puede tu atención compensar el poco tiempo que tienes?",v: "Salmo 103:13",f: "John Bowlby, teoría del apego; Papa Francisco, Amoris laetitia",h: "Si el agotamiento te impide cuidar a tu familia, consulta a un profesional de salud."},{t: "Honra y límites",r: "Respetar a los padres y a los hermanos no obliga a tolerar el daño. Los límites claros y compasivos hacen posible el respeto mutuo.",a: "Escribe un límite compasivo que necesitas en tu familia y piensa cómo lo dirías con respeto.",p: "¿En qué relación familiar necesitas un límite claro y con cariño?",v: "Romanos 12:10",f: "Murray Bowen, diferenciación del yo; Dietrich Bonhoeffer, Vida en comunidad",h: "Si hay control abusivo o negligencia severa, busca apoyo profesional y protección."},{t: "Los intentos de reparación",r: "En un conflicto, un gesto amable o una disculpa son invitaciones a bajar la tensión. Aceptarlas cuida el hogar.",a: "Hoy, si alguien te ofrece una disculpa o un gesto de paz, acéptalo sin reproches añadidos.",p: "¿Qué orgullo te impide aceptar una oferta de paz?",v: "Colosenses 3:13",f: "John Gottman (reparación en el conflicto, 1999)",h: "No aplica"},{t: "Reconciliar y perdonar",r: "El perdón no niega el daño ni obliga a quedarse en peligro. Libera el corazón del resentimiento y, cuando es seguro, abre la puerta a restaurar la relación.",a: "Ora por alguien de tu familia con quien hay distancia, pidiendo libertad del resentimiento.",p: "¿Qué historia que te cuentas sobre el pasado impide el primer paso hacia la paz?",v: "Mateo 6:14-15",f: "Desmond Tutu, El libro del perdón",h: "Si el conflicto incluye violencia o peligro, prioriza tu seguridad y busca apoyo profesional."},{t: "Rituales que unen",r: "Las familias fuertes tienen costumbres que dan identidad: una comida sin pantallas, una oración breve, una tradición de fin de semana.",a: "Propón un ritual sencillo para esta semana, como compartir una bebida caliente o una oración de gratitud antes de salir.",p: "¿Qué costumbre familiar te da más sentido de pertenencia?",v: "Deuteronomio 6:6-7",f: "John Gottman (sentido compartido en la familia, 1999)",h: "No aplica"}]},
    {id: "finanzas",n: "Mejorar mis finanzas",d: "7 días para ordenar tu dinero con sabiduría",ctx: "El dinero es una herramienta para cuidar a tu familia y servir a otros. Estos días te ayudan a verlo con claridad, sin promesas de enriquecimiento.",aviso: "Esta es educación financiera general. No reemplaza a un profesional. Para recomendaciones de inversión o de deudas, acude a un asesor autorizado; en Chile, los servicios de inversión están regulados por la CMF.",dias: [{t: "La realidad frente al presupuesto",r: "Sin conocer en qué se va el dinero, el estrés crece y se escapan gastos. Mirar los números rompe la negación.",a: "Revisa tus cuentas del último mes y clasifica los gastos en: vivienda y alimentación, deudas, y gastos opcionales.",p: "¿Refleja tu gasto tus prioridades reales?",v: "Lucas 14:28",f: "Richard Thaler (Premio Nobel de Economía 2017), contabilidad mental",h: "Si no logras cubrir alimentación y vivienda cada mes, busca orientación social o financiera."},{t: "La deuda que esclaviza",r: "La deuda de consumo puede comprometer años de tu libertad. Ordenarla por tasa de interés ayuda a decidir.",a: "Lista tus deudas de la tasa más alta a la más baja, y destina cualquier excedente a la primera.",p: "¿Qué compra impulsiva generó una deuda que podrías haber evitado?",v: "Proverbios 22:7",f: "Richard Thaler (fungibilidad del dinero, 1999)",h: "En insolvencia total, consulta a un abogado o asesor en renegociación de deudas."},{t: "Automatizar el ahorro",r: "La inercia y el sesgo hacia el presente hacen que ahorrar cueste. Automatizar la transferencia lo hace posible sin esfuerzo diario.",a: "Configura una transferencia automática a una cuenta separada el día que recibes tus ingresos, aunque sea un monto pequeño.",p: "¿Qué temor o excusa te ha impedido apartar primero una parte de tus ingresos?",v: "Proverbios 21:20",f: "Richard Thaler y Shlomo Benartzi, programa Save More Tomorrow",h: "No aplica"},{t: "Entender la inversión",r: "El ahorro protege el dinero a corto plazo; la inversión busca crecer en el largo plazo asumiendo un riesgo medido. Todo esto requiere educación y paciencia.",a: "Dedica diez minutos a aprender un concepto: la diferencia entre interés simple y compuesto, en una fuente confiable.",p: "¿Qué tienes en común la paciencia del carácter con la paciencia financiera?",v: "Mateo 25:27",f: "Educación financiera general; Ley Fintec (Ley 21.521) en Chile",h: "Antes de invertir sumas importantes, consulta a un asesor autorizado por la CMF."},{t: "Generosidad con alegría",r: "Dar con intención a los necesitados y a la comunidad fortalece la alegría y rompe el poder de la avaricia.",a: "Aparta hoy un monto fijo para una causa o persona en necesidad, y entrégalo sin ruido.",p: "¿Cuándo fue la última vez que dar te trajo alegría verdadera?",v: "2 Corintios 9:7",f: "John Wesley, Sermones sobre la riqueza",h: "No aplica"},{t: "Un fondo para la emergencia",r: "Las emergencias de empleo, salud o accidentes son parte de la vida. Un fondo de emergencia da paz y evita deudas urgentes.",a: "Calcula un mes de gastos básicos y fija ese monto como primera meta de tu fondo.",p: "¿Cómo cambiaría tu reacción ante una crisis si tuvieras esa reserva?",v: "Proverbios 27:12",f: "Estándares de planificación financiera personal",h: "Si una crisis genera angustia que no puedes manejar, busca apoyo emocional profesional."},{t: "Contentamiento: el dinero no es tu amo",r: "Acostumbrarse a lo que se tiene hace que todo lo nuevo parezca insuficiente. La paz verdadera no depende del saldo.",a: "Piensa en tres cosas que hoy tienes y que antes deseaste, y dale gracias a Dios por ellas.",p: "¿En qué momento tuviste paz sin importar tu saldo?",v: "Hebreos 13:5",f: "Daniel Kahneman (Premio Nobel de Economía 2002), adaptación hedónica",h: "No aplica"}]},
    {id: "mente",n: "Salud mental y emocional",d: "7 días para cuidar tu mente con apoyo real",ctx: "Cuidar la mente es parte de cuidar la vida. Estos días te ayudan a reconocer el cansancio, a calmar la mente y a pedir ayuda sin vergüenza.",aviso: "Este plan no reemplaza el tratamiento profesional. Si piensas en hacerte daño o en no seguir viviendo, busca ayuda de inmediato (Ayuda y contactos).",dias: [{t: "Reconocer el cansancio",r: "Negar el agotamiento sólo aumenta el estrés. Reconocerlo es el primer paso para cuidarte.",a: "Revisa tu agenda de la próxima semana y deja al menos un bloque libre de descanso sin compromisos.",p: "¿Qué señales de tu cuerpo te avisan que el estrés supera tus límites?",v: "1 Reyes 19:4-5",f: "Organización Mundial de la Salud, directrices sobre salud mental en el trabajo",h: "Si el agotamiento te impide levantarte o cumplir tus tareas por varios días, consulta a un profesional."},{t: "Salir de la rumiación",r: "La rumiación mantiene la mente en alarma. Volver al presente, a la respiración y al cuerpo ayuda a cortar el ciclo.",a: "Cuando notes una preocupación repetitiva, detente dos minutos y sigue el ritmo de tu respiración.",p: "¿Cuántos escenarios catastróficos del último mes ocurrieron como los temías?",v: "Mateo 6:34",f: "Práctica basada en atención plena; Kristin Neff (autocompasión)",h: "Si los pensamientos obsesivos generan ataques de pánico frecuentes, busca apoyo profesional."},{t: "Cuando la tristeza pesa",r: "La tristeza prolongada no es una falla de carácter. Los Salmos muestran a personas fieles que también atravesaron noches oscuras.",a: "Cuéntale hoy a una persona de confianza, en pocas palabras, cómo te has sentido en las últimas semanas.",p: "¿Cómo puede la comunidad acompañar a quien perdió temporalmente la fuerza para esperar?",v: "Salmo 88:1-3",f: "OCDE, políticas para prevenir y tratar la salud mental",h: "Si la tristeza dura más de dos semanas, incluye pérdida de placer o cambios fuertes del sueño o del apetito, consulta a un profesional."},{t: "Pedir ayuda es valentía",r: "Pedir apoyo profesional no es falta de fe. La ciencia médica y la terapia son formas de cuidado que Dios puede usar.",a: "Entra a Ayuda y contactos y guarda en tu teléfono los números que más te sirvan.",p: "¿Qué miedo o creencia te ha impedido buscar la ayuda que necesitas?",v: "Mateo 9:12",f: "Ministerio de Salud de Chile, línea de prevención del suicidio",h: "Si surgen ideas de quitarte la vida o desesperación extrema, busca ayuda de inmediato (Ayuda y contactos)."},{t: "Comunidad que sostiene",r: "El aislamiento empeora la angustia. Pertenecer a una red de apoyo amortigua el estrés.",a: "Participa esta semana en una actividad grupal sana, en tu barrio, trabajo o comunidad de fe.",p: "¿A qué persona podrías acudir sin temor al juicio en un día difícil?",v: "Gálatas 6:2",f: "OCDE, integración social y salud mental",h: "Si el miedo al juicio te impide salir de casa o trabajar, consulta a un profesional."},{t: "Los hábitos de pantalla y sueño",r: "El exceso de noticias y pantallas altera el sueño y aumenta la ansiedad. Poner límites protege la mente.",a: "Esta noche, apaga las pantallas recreativas una hora antes de dormir.",p: "¿Qué parte de tu consumo digital aporta valor y cuál sólo siembra temor?",v: "Filipenses 4:8",f: "Higiene del sueño e intervenciones cognitivo-conductuales para el insomnio",h: "Si usas pantallas, alcohol u otras sustancias para anestesiar la realidad, busca apoyo: busca apoyo (Ayuda y contactos)."},{t: "Descansar en el carácter de Dios",r: "Hay dolores que no se resuelven de inmediato. La fe madura confía en la fidelidad de Dios aun en el misterio del sufrimiento.",a: "Ponte en silencio dos minutos, con las manos abiertas sobre tu regazo, y entrega a Dios una carga a la vez.",p: "¿Cómo puede convivir tu paz interior con problemas que aún no están resueltos?",v: "Isaías 26:3",f: "Dallas Willard, La renovación de la mente; C. S. Lewis, Una pena en observación",h: "No aplica"}]},
    { id: "cambios", n: "Adaptarme a los cambios", d: "7 días para atravesar lo que cambia", ctx: "Mudanzas, trabajos nuevos, pérdidas y cambios en la familia nos piden adaptarnos. Estos días te ayudan a avanzar sin prisa y sin perderte.", aviso: "Este plan acompaña; no reemplaza a un profesional. Si un cambio te deja sin fuerzas por semanas, busca apoyo (Ayuda y contactos).", dias: [
      { t: "Reconocer lo que cambió", r: "Nombrar el cambio ayuda a verlo con claridad en lugar de cargarlo como una nube.", a: "Escribe en una frase qué cambió en tu vida en este último tiempo.", p: "¿Qué parte del cambio te preocupa más?", v: "Eclesiastés 3:1", f: "Principios generales de resiliencia y adaptación", h: "No aplica" },
      { t: "Lo que sí puedo controlar", r: "Separar lo que depende de ti de lo que no, reduce la ansiedad.", a: "Haz dos listas: lo que depende de ti y lo que no. Actúa hoy sobre un punto de la primera.", p: "¿Qué paso pequeño puedes dar hoy?", v: "Filipenses 4:6", f: "Terapia de aceptación y compromiso (principios generales)", h: "No aplica" },
      { t: "Un día a la vez", r: "Dividir el cambio en pasos pequeños baja el peso que sientes.", a: "Escribe el próximo paso concreto para esta semana, y solo ese.", p: "¿Qué te ayudaría a no adelantarte al futuro?", v: "Mateo 6:34", f: "Psicología del afrontamiento", h: "No aplica" },
      { t: "Cuidar el cuerpo en el cambio", r: "En las transiciones el sueño y la comida suelen fallar. Cuidarlos sostiene la mente.", a: "Elige un hábito de sueño o de comida para esta semana.", p: "¿Qué te quita energía en estos días?", v: "1 Corintios 6:19", f: "Directrices de la OMS sobre actividad física, descanso y salud mental", h: "Si el cansancio o el insomnio duran semanas, consulta a un médico." },
      { t: "Pedir apoyo", r: "Nadie se adapta solo. Compartir el cambio con alguien de confianza disminuye la carga.", a: "Cuéntale a una persona de confianza algo concreto que te está costando.", p: "¿Quién puede acompañarte en este tiempo?", v: "Eclesiastés 4:9-10", f: "Integración social y salud mental (OCDE)", h: "Si te sientes aislado por semanas, busca apoyo (Ayuda y contactos)." },
      { t: "Soltar lo que no volverá", r: "Algunas cosas cambiaron para siempre. Aceptarlo permite construir algo nuevo sin borrar lo valioso que fue.", a: "Escribe algo valioso que dejaste atrás y agradece por ello.", p: "¿Qué aprendiste de lo que ya no está?", v: "Isaías 43:18-19", f: "George Bonanno, trayectorias de resiliencia ante la pérdida", h: "Si el duelo te paraliza más de un año, busca apoyo profesional." },
      { t: "Mirar el nuevo camino con esperanza", r: "Adaptarse es un proceso que avanza en pasos pequeños. Dios acompaña cada etapa.", a: "Da hoy un paso nuevo, aunque sea pequeño, y reconoce que lo diste.", p: "¿Qué pequeña señal de avance notaste esta semana?", v: "Lamentaciones 3:22-23", f: "Práctica de gratitud y de metas pequeñas", h: "No aplica" },
    ] },
    { id: "hablar", n: "Confianza para hablar en público", d: "7 días para ganar seguridad al hablar", ctx: "Hablar frente a otros da miedo a casi todos. La seguridad se construye con práctica pequeña, repetida y con apoyo.", aviso: "Este plan acompaña; no reemplaza a un profesional. Si el miedo a hablar te impide vivir o trabajar, busca apoyo profesional (Ayuda y contactos).", dias: [
      { t: "Entender el miedo", r: "El nerviosismo es normal y tiene una función: prepararte. No es señal de incapacidad.", a: "Anota qué es lo que más te preocupa al hablar en público.", p: "¿Qué temes que pase si te equivocas?", v: "Éxodo 4:10-12", f: "Principios generales sobre ansiedad social y exposición gradual", h: "Si el miedo te hace evitar casi todo, busca apoyo profesional." },
      { t: "Respirar antes de hablar", r: "Respirar lento calma el cuerpo y da claridad a la mente.", a: "Antes de hablar hoy con alguien, inhala cuatro segundos y exhala seis, tres veces.", p: "¿Qué sientes en el cuerpo cuando te pones nervioso?", v: "Salmo 46:10", f: "Técnicas de respiración para regular el estrés", h: "No aplica" },
      { t: "Hablar en lo pequeño", r: "La confianza crece con práctica en contextos seguros.", a: "Di tu opinión en una conversación pequeña de hoy, en familia o con un colega.", p: "¿Qué conversación pequeña puedes aprovechar hoy?", v: "Proverbios 15:23", f: "Exposición gradual (principios generales de la terapia cognitivo-conductual)", h: "No aplica" },
      { t: "Preparar tu mensaje", r: "Un mensaje claro en tres ideas es más fácil de decir que un discurso largo.", a: "Escribe tres ideas que quieres comunicar y una frase final.", p: "¿Qué idea es la que más importa que los demás escuchen?", v: "Nehemías 8:8", f: "Práctica de comunicación clara", h: "No aplica" },
      { t: "Practicar en voz alta", r: "Hablar en voz alta antes de hablar a otros reduce la sorpresa.", a: "Lee tu mensaje en voz alta dos veces, frente a un espejo o a alguien de confianza.", p: "¿Qué parte te costó más decir en voz alta?", v: "2 Timoteo 2:15", f: "Ensayo y práctica (principios generales)", h: "No aplica" },
      { t: "Mirar a una persona amable", r: "Quienes te escuchan casi siempre quieren que te vaya bien. Hablarle a una persona amable a la vez ayuda.", a: "En tu próxima intervención, busca a una persona amable y háblale a ella, no al grupo entero.", p: "¿Cómo cambiaría tu charla si pensaras que quieren escucharte?", v: "Colosenses 4:6", f: "Comunicación interpersonal (principios generales)", h: "No aplica" },
      { t: "Celebrar el paso dado", r: "La seguridad se construye con pasos pequeños que se reconocen.", a: "Anota un avance concreto de esta semana y agradece a Dios por él.", p: "¿Qué te gustaría practicar la próxima semana?", v: "2 Corintios 12:9", f: "Refuerzo positivo y metas pequeñas", h: "No aplica" },
    ] },
    { id: "trabajo", n: "Mi trabajo con sentido", d: "7 días para trabajar con propósito y descanso", ctx: "El trabajo ocupa buena parte de la vida. Estos días te ayudan a ordenar tus tareas, cuidar tu energía y dar valor a lo que haces.", aviso: "Este plan acompaña; no reemplaza la orientación laboral ni legal. Si sufres acoso o un despido que consideras injusto, busca asesoría en la Dirección del Trabajo (dt.gob.cl).", dias: [
      { t: "Tu trabajo hoy", r: "Ver tu trabajo como una forma de servir ayuda a darle sentido a lo que haces, incluso en tareas sencillas.", a: "Escribe en una frase para qué sirve tu trabajo a las personas.", p: "¿Quién se beneficia de lo que haces cada día?", v: "Colosenses 3:23", f: "Psicología del sentido en el trabajo (principios generales)", h: "No aplica" },
      { t: "Priorizar lo importante", r: "No todo lo urgente es importante. Elegir tres prioridades reduce el agobio.", a: "Elige tres tareas para mañana y deja el resto para después.", p: "¿Qué tarea se repite sin avanzar, y por qué?", v: "Proverbios 16:3", f: "Gestión del tiempo por prioridades (principios generales)", h: "No aplica" },
      { t: "Pausas que cuentan", r: "El descanso breve mejora la concentración y el ánimo.", a: "Toma una pausa de cinco minutos, sin pantalla, cada dos horas de trabajo.", p: "¿Qué te ayudaría a parar antes de llegar al cansancio?", v: "Eclesiastés 4:6", f: "Pausas y productividad (principios generales)", h: "No aplica" },
      { t: "Pedir ayuda", r: "Pedir ayuda a tiempo evita errores y desgaste. No es señal de debilidad.", a: "Pide ayuda o una aclaración sobre una tarea que te tiene detenido.", p: "¿A quién de tu entorno laboral podrías acudir?", v: "Eclesiastés 4:9-10", f: "Trabajo en equipo y apoyo social (principios generales)", h: "No aplica" },
      { t: "Límites razonables", r: "Decir que no a lo que excede tu tiempo protege tu salud y tu trabajo.", a: "Esta semana responde con una frase amable cuando te pidan algo fuera de tu alcance.", p: "¿Qué te cuesta más: decir sí o decir no?", v: "Gálatas 6:5", f: "Asertividad laboral (principios generales)", h: "Si el trabajo te causa angustia constante, busca apoyo profesional (Ayuda y contactos)." },
      { t: "Aprender algo nuevo", r: "Seguir aprendiendo abre puertas y devuelve la sensación de avance.", a: "Dedica quince minutos a aprender una habilidad útil para tu trabajo.", p: "¿Qué habilidad te gustaría fortalecer en los próximos meses?", v: "Proverbios 1:5", f: "Aprendizaje continuo (principios generales)", h: "No aplica" },
      { t: "Trabajar con gratitud", r: "La gratitud por lo que tienes disminuye la comparación y el agobio.", a: "Anota tres cosas de tu trabajo que agradeces esta semana.", p: "¿Qué cambiaría si miraras tu trabajo como un regalo y no solo como una obligación?", v: "Colosenses 3:17", f: "Práctica de gratitud (principios generales)", h: "No aplica" }
    ] },
    { id: "entorno", n: "Cuidar mi entorno", d: "7 días para cuidar tu casa, tu barrio y tu seguridad", ctx: "El lugar donde vives influye en tu salud y en tu tranquilidad. Estos días te ayudan a mirar tu entorno con cuidado y a actuar en lo pequeño.", aviso: "Este plan acompaña. Si hay peligro inmediato, llama primero: Carabineros (133), Bomberos (132) o Ambulancia (131).", dias: [
      { t: "Mirar tu espacio", r: "Un espacio ordenado y limpio ayuda a sentirse más tranquilo.", a: "Elige un rincón de tu casa y ordénalo durante diez minutos.", p: "¿Qué lugar de tu casa te daría más calma si estuviera ordenado?", v: "Proverbios 24:3-4", f: "Psicología ambiental (principios generales)", h: "No aplica" },
      { t: "Lo que te rodea", r: "El entorno cercano influye en el ánimo: ruido, luz, orden y compañía.", a: "Anota tres cosas de tu entorno que te suman y tres que te restan.", p: "¿Qué cambio pequeño haría más agradable tu día?", v: "Salmo 121:1-2", f: "Ambientes y bienestar (principios generales)", h: "No aplica" },
      { t: "Cuidar lo común", r: "Cuidar los espacios compartidos es una forma de amar al prójimo.", a: "Recoge un residuo de un lugar común o saluda a un vecino.", p: "¿Qué espacio compartido de tu barrio te gustaría cuidar?", v: "Mateo 22:39", f: "Convivencia y vida comunitaria (principios generales)", h: "No aplica" },
      { t: "Seguridad en casa", r: "Revisar lo básico de seguridad en el hogar previene accidentes.", a: "Revisa que los números de emergencia estén a la vista y que tengas una linterna que funcione.", p: "¿Quién en tu casa sabría qué hacer en una emergencia?", v: "Salmo 91:11", f: "Prevención de accidentes domésticos (recomendaciones generales)", h: "Si hay violencia o miedo en tu hogar, tu seguridad es lo primero: busca ayuda de inmediato (Ayuda y contactos)." },
      { t: "Agua y basura", r: "Usar el agua con cuidado y separar residuos son hábitos sencillos con impacto real.", a: "Hoy cierra bien la llave al lavarte los dientes y separa un tipo de residuo reciclable.", p: "¿Qué hábito de consumo podrías reducir esta semana?", v: "Génesis 2:15", f: "Hábitos de cuidado ambiental (principios generales)", h: "No aplica" },
      { t: "Plantas que crecen", r: "Cuidar una planta enseña paciencia y conecta con la vida.", a: "Riega una planta que tengas, o planta una semilla en una maceta.", p: "¿Qué te enseña el crecimiento de una planta sobre el tiempo?", v: "Salmo 1:3", f: "Beneficios del contacto con la naturaleza (principios generales)", h: "No aplica" },
      { t: "Un entorno para todos", r: "Pensar en quienes viven cerca, incluidos los mayores y los niños, hace el lugar más seguro y acogedor.", a: "Pregunta a un vecino mayor si necesita algo esta semana.", p: "¿Quién cerca de ti podría necesitar un poco de compañía?", v: "Levítico 19:34", f: "Vida comunitaria y cuidado de personas mayores (principios generales)", h: "No aplica" }
    ] },
    { id: "social", n: "Conectar con personas", d: "7 días para construir vínculos y sentirte acompañado", ctx: "Las relaciones sostienen la salud. Estos días te ayudan a acercarte a otros, a animar a quien está solo y a sentirte parte de una comunidad.", aviso: "Este plan acompaña; no reemplaza el apoyo profesional. Si te sientes aislado por semanas o piensas en no seguir viviendo, busca ayuda de inmediato (Ayuda y contactos).", dias: [
      { t: "Quién te acompaña", r: "Reconocer tus apoyos reales fortalece la sensación de pertenencia.", a: "Escribe los nombres de tres personas que te acompañan en momentos difíciles.", p: "¿Qué te gustaría que supieran de ti esas personas?", v: "Eclesiastés 4:12", f: "Redes de apoyo social (principios generales)", h: "No aplica" },
      { t: "Un mensaje amable", r: "Un gesto pequeño puede abrir una conversación.", a: "Envía hoy un mensaje a alguien con quien hace tiempo no hablas.", p: "¿Qué te frena para escribirle a alguien?", v: "Proverbios 17:17", f: "Vínculos y bienestar (principios generales)", h: "No aplica" },
      { t: "Escuchar de verdad", r: "Escuchar sin interrumpir hace que el otro se sienta valorado.", a: "En tu próxima conversación, haz una pregunta y escucha la respuesta completa.", p: "¿Cómo te sientes cuando alguien te escucha sin apuro?", v: "Santiago 1:19", f: "Escucha activa (principios generales)", h: "No aplica" },
      { t: "Participar", r: "Unirse a una actividad de interés común crea vínculos naturales.", a: "Busca un grupo, club, voluntariado o actividad de tu comunidad y anota una fecha para ir.", p: "¿Qué actividad te gustaría compartir con otras personas?", v: "Hebreos 10:24-25", f: "Participación social y salud mental (principios generales)", h: "No aplica" },
      { t: "Ayudar a otro", r: "Servir a otros fortalece el propio ánimo y las relaciones.", a: "Ofrece ayuda concreta a alguien: llevar algo, acompañar un trámite o cocinar para otro.", p: "¿Qué habilidad tuya podría servirle a alguien cerca?", v: "Gálatas 6:2", f: "Ayuda mutua y bienestar (principios generales)", h: "No aplica" },
      { t: "Pedir compañía", r: "Pedir compañía no es una carga: muchas personas agradecen poder ayudar.", a: "Pide a alguien de confianza que te acompañe a caminar o a tomar algo esta semana.", p: "¿Qué te impide pedir compañía con naturalidad?", v: "Eclesiastés 4:9", f: "Apoyo social (principios generales)", h: "No aplica" },
      { t: "Comunidad que sostiene", r: "Una comunidad se construye día a día, con pequeños gestos de presencia.", a: "Agradece a una persona que estuvo contigo en algo importante, en persona o por escrito.", p: "¿Qué cambiaría en tu semana si cada día tuvieras un vínculo que te anime?", v: "Romanos 12:15", f: "Vínculos y sentido de pertenencia (principios generales)", h: "No aplica" }
    ] },
    { id: "inversion", n: "Aprender a invertir con calma", d: "7 días de educación financiera general, sin recomendar productos", ctx: "Invertir es una herramienta, no una promesa. Estos días te enseñan conceptos básicos para decidir con calma, sin prisa ni presión.", aviso: "Esta es educación financiera general. No es asesoría de inversión ni recomienda productos. Antes de invertir, consulta a un asesor autorizado por la CMF (cmfchile.cl) y revisa tus deudas y tu fondo de emergencia.", dias: [
      { t: "Antes de invertir", r: "Antes de invertir conviene tener un fondo de emergencia y no tener deudas caras.", a: "Anota tus gastos fijos del último mes y cuánto te queda libre.", p: "¿Tienes un colchón para tres meses de gastos fijos?", v: "Proverbios 21:5", f: "Educación financiera general (principios de planificación)", h: "Si tienes deudas difíciles de pagar, busca orientación gratuita (Ayuda y contactos)." },
      { t: "Riesgo y plazo", r: "Lo que promete más rentabilidad suele conllevar más riesgo, y el plazo cambia lo que conviene.", a: "Escribe para qué necesitarías el dinero: en un mes, en tres años o en veinte.", p: "¿Cuánto tiempo puedes esperar sin necesitar ese dinero?", v: "Eclesiastés 11:2", f: "Conceptos básicos de riesgo y plazo (educación financiera general)", h: "No aplica" },
      { t: "Repartir el riesgo", r: "No poner todo en un solo lugar reduce el impacto de una mala decisión.", a: "Revisa cómo distribuyes tus ahorros hoy y anota una idea para repartirlos mejor.", p: "¿Qué pasaría si perdieras una parte de tus ahorros hoy?", v: "Eclesiastés 11:2", f: "Diversificación (educación financiera general)", h: "No aplica" },
      { t: "El tiempo a favor", r: "El interés compuesto hace que el tiempo trabaje a favor del ahorro constante.", a: "Calcula con una planilla simple qué pasaría con un ahorro mensual pequeño en cinco años.", p: "¿Qué gasto pequeño podrías convertir en ahorro?", v: "Proverbios 13:11", f: "Interés compuesto (educación financiera general)", h: "No aplica" },
      { t: "Desconfiar de promesas", r: "Las ofertas de ganancias altas y sin riesgo suelen ser una señal de alerta.", a: "Si te ofrecen un rendimiento alto sin riesgo, pide la información por escrito y consúltala con un asesor autorizado.", p: "¿Qué señales te harían dudar de una oferta?", v: "Proverbios 28:20", f: "Señales de fraude financiero (educación del consumidor)", h: "Si ya perdiste dinero en una estafa, denuncia en la policía y busca orientación." },
      { t: "Decidir antes de gastar", r: "Decidir antes de gastar, con una meta clara, da calma y control.", a: "Asigna una parte de tu ingreso a un propósito antes de gastar el resto.", p: "¿Qué meta pondrías primero en tu presupuesto?", v: "Lucas 14:28", f: "Presupuesto por propósitos (principios generales)", h: "No aplica" },
      { t: "Tu ruta a seguir", r: "Un plan simple, revisado cada cierto tiempo, vale más que una decisión impulsiva.", a: "Escribe tres pasos para tu próximo mes financiero y revísalos con alguien de confianza.", p: "¿Qué paso puedes dar esta semana, sin prisa?", v: "Proverbios 16:9", f: "Planificación financiera (educación general)", h: "Consulta a un asesor autorizado por la CMF antes de cualquier inversión." }
    ] },
  ].filter(Boolean);   // F1025: una entrada vacía no tumba la sección
  const planVidaProg = () => { const p = rg(K_PLANVIDA); return p && typeof p === 'object' ? p : {}; };
  const planVidaHechos = (id) => { const h = planVidaProg()[id]; return Array.isArray(h) ? h : []; };
  // Portada del plan «Mi relación conmigo»: un reflejo en el lago al amanecer (la persona se mira y se entiende)
  const portadaPlanVida = (id) => {
    const pl = PLAN_VIDA.find((x) => x.id === id) || PLAN_VIDA[0];
    const cielo = (a, b2) => '<defs><linearGradient id="pvc' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b2 + '"/></linearGradient></defs><rect width="1280" height="720" fill="url(#pvc' + id + ')"/>';
    const esc2 = {
      yo: cielo('#f9dcb3', '#cfe5ea') + '<circle cx="1000" cy="200" r="90" fill="#fbe8a6"/><path d="M0 470C200 400 380 430 560 420S900 390 1280 445V540H0Z" fill="#9cc68f"/><rect y="520" width="1280" height="200" fill="#8ec3cf"/><g opacity=".38" transform="matrix(1 0 0 -1 0 1040)"><circle cx="640" cy="372" r="34" fill="#5a3d24"/><path d="M592 424C592 398 614 390 640 390S688 398 688 424V520H592Z" fill="#4f8a55"/></g><circle cx="640" cy="372" r="34" fill="#5a3d24"/><path d="M592 424C592 398 614 390 640 390S688 398 688 424V520H592Z" fill="#4f8a55"/>',
      familia: cielo('#fbe7c4', '#e9efe2') + '<rect y="500" width="1280" height="220" fill="#8fbf82"/><path d="M420 500 540 380 660 500Z" fill="#c4604a"/><rect x="450" y="500" width="180" height="150" fill="#f6ecd2"/><rect x="520" y="560" width="40" height="90" fill="#7a5a3c"/><rect x="470" y="530" width="36" height="36" fill="#fbe8a6"/><circle cx="740" cy="520" r="26" fill="#e8b58c"/><path d="M712 560C712 540 768 540 768 560V640H712Z" fill="#4f8a55"/><circle cx="820" cy="530" r="20" fill="#e8b58c"/><path d="M800 565C800 548 840 548 840 565V640H800Z" fill="#c4604a"/>',
      finanzas: cielo('#f5efd9', '#e9efe0') + '<rect y="540" width="1280" height="180" fill="#a9cf9b"/><ellipse cx="520" cy="560" rx="120" ry="28" fill="#d9b65c"/><rect x="400" y="500" width="240" height="60" rx="30" fill="#e8c76a"/><rect x="420" y="440" width="200" height="60" rx="30" fill="#d9b65c"/><path d="M760 520V420" stroke="#4f8a55" stroke-width="8" stroke-linecap="round"/><ellipse cx="740" cy="410" rx="28" ry="14" fill="#7cc08a"/><ellipse cx="782" cy="400" rx="28" ry="14" fill="#4f8a55"/>',
      cambios: cielo('#fbe7c4', '#e4f0f6') + '<circle cx="640" cy="330" r="90" fill="#fbe8a6"/><path d="M0 520C260 430 460 470 640 470S1000 430 1280 520V720H0Z" fill="#a9cf9b"/><path d="M0 600C300 540 520 600 760 580S1100 540 1280 600V720H0Z" fill="#6aa86b"/><path d="M560 720 640 500 720 720" fill="#e8d3a6" opacity=".9"/>',
      hablar: cielo('#f5e6c8', '#e9efe0') + '<rect x="420" y="470" width="440" height="40" rx="8" fill="#8c6a46"/><rect x="500" y="380" width="280" height="90" rx="10" fill="#c9a77a"/><ellipse cx="640" cy="300" rx="160" ry="90" fill="#fbe8a6" opacity=".35"/>' + [[220, 600], [330, 620], [950, 610], [1060, 630]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="24" fill="#7a5a3c"/><rect x="' + (x - 26) + '" y="' + (y + 22) + '" width="52" height="80" rx="20" fill="#4f8a55"/>').join('') + '',
      mente: cielo('#e9e4f2', '#f3ead2') + '<circle cx="960" cy="200" r="70" fill="#fbf1d6" opacity=".9"/><rect y="500" width="1280" height="220" fill="#8ec3cf" opacity=".85"/><path d="M0 500C200 470 400 520 640 500S1000 470 1280 500" fill="none" stroke="#ffffff" stroke-width="5" opacity=".6"/><path d="M0 540C220 510 420 560 640 540S1000 510 1280 540" fill="none" stroke="#ffffff" stroke-width="4" opacity=".45"/><path d="M0 580C240 552 440 600 640 580S1000 552 1280 580" fill="none" stroke="#ffffff" stroke-width="3" opacity=".3"/>'
    };
    const esc3 = {
      trabajo: cielo('#f5e6c8', '#e4f0f6') + '<circle cx="1000" cy="170" r="66" fill="#fbe8a6"/><rect x="380" y="300" width="300" height="260" rx="6" fill="#f6ecd2" stroke="#5a3d24" stroke-width="2"/><rect x="420" y="250" width="220" height="60" rx="6" fill="#c9a77a" stroke="#5a3d24" stroke-width="2"/>' + [[430, 340], [520, 340], [610, 340], [430, 420], [520, 420], [610, 420]].map(([x, y]) => '<rect x="' + x + '" y="' + y + '" width="50" height="50" rx="6" fill="#b8dbe4" stroke="#5a3d24" stroke-width="1.5"/>').join('') + '<rect y="560" width="1280" height="160" fill="#a9cf9b"/>',
      entorno: cielo('#fbe7c4', '#e9efe2') + '<circle cx="1040" cy="180" r="60" fill="#fbe8a6"/><rect y="520" width="1280" height="200" fill="#8fbf82"/><rect x="520" y="470" width="240" height="20" rx="8" fill="#c9a77a"/><rect x="540" y="490" width="10" height="60" fill="#5a3d24"/><rect x="710" y="490" width="10" height="60" fill="#5a3d24"/><circle cx="260" cy="430" r="90" fill="#4f8a55"/><rect x="250" y="500" width="20" height="90" fill="#8c6a46"/><circle cx="1010" cy="420" r="80" fill="#6aa86b"/><rect x="1000" y="480" width="20" height="110" fill="#8c6a46"/>',
      social: cielo('#fbe3bd', '#e9efe2') + '<circle cx="640" cy="200" r="70" fill="#fbe8a6" opacity=".7"/><rect y="540" width="1280" height="180" fill="#a9cf9b"/>' + [[480, 470, '#7cc08a'], [580, 450, '#c4604a'], [700, 450, '#fbe8a6'], [800, 470, '#b8dbe4']].map(([x, y, c]) => '<circle cx="' + x + '" cy="' + (y - 60) + '" r="26" fill="#e8b58c"/><path d="M' + (x - 42) + ' ' + (y + 60) + ' Q' + (x - 44) + ' ' + (y - 20) + ' ' + x + ' ' + (y - 18) + ' Q' + (x + 44) + ' ' + (y - 20) + ' ' + (x + 42) + ' ' + (y + 60) + 'Z" fill="' + c + '" stroke="#5a3d24" stroke-width="1.2"/>').join('') + '<path d="M640 300 Q600 260 610 230 Q640 250 640 300 Q640 250 670 230 Q680 260 640 300Z" fill="#c4604a"/>',
      inversion: cielo('#f5efd9', '#e9efe0') + '<rect y="560" width="1280" height="160" fill="#a9cf9b"/>' + [[400, 560], [520, 560], [640, 560]].map(([x, y], k) => '<ellipse cx="' + x + '" cy="' + (y - 40 - k * 30) + '" rx="60" ry="16" fill="#d9b65c" stroke="#5a3d24" stroke-width="1.2"/><ellipse cx="' + x + '" cy="' + (y - 30 - k * 30) + '" rx="60" ry="16" fill="#e8c76a" stroke="#5a3d24" stroke-width="1.2"/>').join('') + '<path d="M900 560V400" stroke="#4f8a55" stroke-width="8" stroke-linecap="round"/><ellipse cx="880" cy="390" rx="30" ry="15" fill="#7cc08a"/><ellipse cx="924" cy="380" rx="30" ry="15" fill="#4f8a55"/>',
    };
    Object.assign(esc2, esc3);
    const cuerpo = esc2[pl.id] || esc2.yo;
    return '<svg class="plan-portada" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(pl.n) + '">' + cuerpo + '</svg>';
  };
  // Portada de cada Biblia: tapa de cuero verde, filete dorado y el brote de la marca
  const portadaBiblia = (v) => '<svg class="biblia-portada" viewBox="0 0 320 200" role="img" aria-label="Portada de la ' + esc(v.n) + '"><rect x="4" y="4" width="312" height="192" rx="14" fill="#2f4f3a"/><rect x="16" y="16" width="288" height="168" rx="9" fill="none" stroke="#d9b65c" stroke-width="2"/><rect x="24" y="24" width="272" height="152" rx="6" fill="none" stroke="#d9b65c" stroke-width=".8" opacity=".7"/><text x="160" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="3" fill="#f6ecd2">SANTA BIBLIA</text><g transform="translate(138 84) scale(1.6)">' + PICTO.brote + '</g><text x="160" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#f6ecd2">' + esc(v.c) + '</text><text x="160" y="168" text-anchor="middle" font-family="Georgia, serif" font-size="10.5" fill="#d9b65c">' + esc(v.n) + '</text></svg>';
  const planVidaCardHTML = (pl) => { const h = planVidaHechos(pl.id).length, tot = pl.dias.length; return '<button type="button" class="card plan-card" data-planvida="' + pl.id + '"><div class="plan-foto plan-foto-svg" aria-hidden="true">' + portadaPlanVida(pl.id) + '</div><div class="t"><span aria-hidden="true">' + svg('brote', 22) + '</span>' + esc(pl.n) + '<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">' + esc(pl.d) + '</p><p class="suave m0t">' + h + ' de ' + tot + ' días</p>' + (h < tot ? '<p class="suave m0t">Siguiente: ' + esc(pl.dias[pl.dias.findIndex((x, k) => planVidaHechos(pl.id).indexOf(k) < 0)].t) + '</p>' : '<p class="suave m0t">Plan completado</p>') + '</button>'; };
  // F1018 · Juntos hacemos el bien en Vida: pantalla vacía por ahora (se creará el lugar para personas con y sin iglesia).
  function vistaJuntosVida() {
    $('#pantalla').innerHTML = cabecera('Juntos hacemos el bien', 'Vida') + '<div class="card"><b>Muy pronto</b><p class="m0t">Un lugar donde personas con y sin iglesia compartan acciones, se unan a actividades de iglesias u organicen sus propios movimientos.</p></div>';
    volverA('Vida', vistaVida);
  }
  // F1018 · Un error al abrir una sección muestra un aviso, nunca una pantalla en blanco.
  function seguro(fn) {
    try { return fn(); } catch (e) { console.error(e); $('#pantalla').innerHTML = cabecera('Vida', 'Vida') + '<p class="suave">Esta sección no pudo abrirse. Vuelve a intentarlo en un momento.</p>'; }
  }
  // F1017 · Ayuda y contactos: emergencias, líneas de apoyo, cuidados y la iglesia. Los números NO van dentro de los planes.
  function vistaAyuda() {
    const bloque = (titulo, cuerpo) => '<section class="card ayuda-bloque"><h3 class="ayuda-t">' + esc(titulo) + '</h3>' + cuerpo + '</section>';
    const linea = (nombre, numero, detalle) => '<li><b>' + esc(nombre) + '</b> · <span class="ayuda-num">' + esc(numero) + '</span><br><span class="suave">' + esc(detalle) + '</span></li>';
    const emergencias = '<ul class="ayuda-lista">' + linea('Ambulancia (SAMU)', '131', 'Emergencias de salud, a cualquier hora.') + linea('Bomberos', '132', 'Incendios y rescates.') + linea('Carabineros', '133', 'Seguridad y peligro inmediato.') + '</ul><p class="suave m0">Si hay peligro inmediato, llama primero.</p>';
    const apoyo = '<ul class="ayuda-lista">' + linea('Fono *4141 (Minsal)', '*4141', 'Prevención del suicidio. Gratuito, 24 horas, confidencial.') + linea('Sernameg', '1455', 'Violencia contra la mujer y violencia intrafamiliar.') + linea('SENDA', '1412', 'Consumo de drogas y alcohol. Gratuito y anónimo.') + linea('Fono Infancia', '800 200 818', 'Apoyo para la crianza y para niños y adolescentes.') + '</ul><p class="suave m0">Confirma estos números en el sitio oficial antes de publicar la app.</p>';
    const cuidados = '<ul class="ayuda-pasos"><li>Come algo, aunque sea poco, y bebe agua.</li><li>Sal a caminar cinco minutos, si puedes.</li><li>Habla hoy con una persona de confianza.</li><li>Respira lento: cuatro segundos adentro, seis afuera.</li><li>Aleja de tu alcance lo que pueda hacerte daño.</li></ul>';
    const iglesia = '<p>Tu pastor o un líder de tu comunidad de fe puede acompañarte, orar contigo y ayudarte a buscar apoyo profesional.</p><ul class="ayuda-pasos"><li>Habla con tu pastor en persona o por teléfono.</li><li>Visita una iglesia cercana y pide un momento de oración o consejería pastoral.</li><li>Pide que te acompañen a buscar un profesional si lo necesitas.</li></ul><p class="suave m0">La iglesia acompaña; no reemplaza a los servicios de emergencia ni al tratamiento profesional.</p>';
    $('#pantalla').innerHTML = cabecera('Ayuda y contactos', 'Vida') + '<p class="suave">Si estás en peligro, llama primero. Aquí encuentras a quién acudir.</p>' + bloque('Tu iglesia y tu pastor', iglesia) + bloque('Cuidarte hoy', cuidados) + bloque('Emergencias', emergencias) + bloque('Líneas de apoyo en Chile', apoyo);
    volverA('Vida', vistaVida);
  }
  function vistaPlanesVida() {
    $('#pantalla').innerHTML = `${cabecera('Planes de vida', 'Vida')}<p class="suave">Un tema a la vez para crecer como persona. Son ideas para ti, no tareas que cumplir.</p><div class="grid">${PLAN_VIDA.map(planVidaCardHTML).join('')}</div>`;
    volverA('Vida', vistaVida);
    document.querySelectorAll('[data-planvida]').forEach((b) => b.addEventListener('click', () => seguro(() => vistaPlanVida(b.dataset.planvida))));
  }
  // F1002 · Progreso neutral: siete puntos, sin rojos ni reproches. El botón lleva al primer día pendiente.
  function planVidaAvance(pl, hechos) {
    const total = pl.dias.length, hechas = hechos.size, primero = pl.dias.findIndex((x, k) => !hechos.has(k));
    const puntos = pl.dias.map((x, k) => '<span class="pv-punto' + (hechos.has(k) ? ' on' : '') + '" aria-hidden="true"></span>').join('');
    const txt = hechas === total ? 'Completaste el plan. Puedes repasarlo cuando quieras.' : hechas + ' de ' + total + ' días. Un día a la vez.';
    const boton = hechas === total ? '' : '<button type="button" class="btn" id="pvSeguir" data-dia="' + (primero < 0 ? 0 : primero) + '">Seguir: día ' + ((primero < 0 ? 0 : primero) + 1) + '</button>';
    return '<div class="pv-avance"><div class="pv-puntos" role="img" aria-label="' + esc(txt) + '">' + puntos + '</div><p class="suave m0">' + esc(txt) + '</p>' + boton + '</div>';
  }
  function vistaPlanVida(id) {
    const pl = PLAN_VIDA.find((x) => x.id === id); if (!pl) return vistaPlanesVida();
    const hechos = new Set(planVidaHechos(id));
    $('#pantalla').innerHTML = `${cabecera(pl.n, 'Planes de vida')}<div class="plan-foto plan-foto-svg" aria-hidden="true">${portadaPlanVida(id)}</div><p class="suave">${esc(pl.d)}</p><p class="plan-ctx">${esc(pl.ctx)}</p><p class="suave m0">${esc(pl.aviso)}</p>${planVidaAvance(pl, hechos)}<button type="button" class="btn sec" id="pvAyuda">Ayuda y contactos</button>
      <div class="lista sep">${pl.dias.map((d, j) => `<button type="button" class="plan-leer${hechos.has(j) ? ' hecho' : ''}" data-vdia="${j}"><span class="plan-n">${hechos.has(j) ? svg('check', 16) : j + 1}</span><span>Día ${j + 1} · ${esc(d.t)}</span></button>`).join('')}</div>`;
    volverA('Planes de vida', vistaPlanesVida);
    document.querySelectorAll('[data-vdia]').forEach((b) => b.addEventListener('click', () => vistaDiaVida(id, Number(b.dataset.vdia))));
    const ps = $('#pvSeguir'); if (ps) ps.onclick = () => vistaDiaVida(id, Number(ps.dataset.dia));
    const pa = $('#pvAyuda'); if (pa) pa.onclick = () => vistaAyuda();
  }
  function vistaDiaVida(id, j) {
    const pl = PLAN_VIDA.find((x) => x.id === id); if (!pl || !pl.dias[j]) return vistaPlanesVida();
    const d = pl.dias[j], hecho = planVidaHechos(id).indexOf(j) >= 0;
    $('#pantalla').innerHTML = `${cabecera('Día ' + (j + 1) + ' · ' + d.t, pl.n)}<p class="suave m0">Día ${j + 1} de ${pl.dias.length}</p><button type="button" class="btn ${hecho ? 'sec' : ''}" id="vdiaHecho" aria-pressed="${hecho}">${hecho ? 'Marcado como hecho (quitar)' : 'Lo hice'}</button><p class="plan-ctx">${esc(d.r)}</p><div class="card"><b>Para hoy</b><p class="m0t">${esc(d.a)}</p></div><div class="card"><b>Para pensar</b><p class="m0t">${esc(d.p || '')}</p></div><p class="suave">Referencia: ${esc(d.v)}</p>${d.f ? '<p class="suave">Fuente de la idea: ' + esc(d.f) + '</p>' : ''}${d.h && d.h !== 'No aplica' ? '<div class="card"><b>Cuándo buscar ayuda</b><p class="m0t">' + esc(d.h) + '</p></div>' : ''}
      ${j + 1 < pl.dias.length ? `<button type="button" class="btn sec sep" id="vdiaSig">Siguiente día</button>` : `<p class="suave sep">Terminaste los ${pl.dias.length} días de este plan. Puedes volver a leerlos cuando quieras.</p>`}`;
    volverA(pl.n, () => vistaPlan2(id));
    const vs = $('#vdiaSig'); if (vs) vs.onclick = () => vistaDiaVida(id, j + 1);
    $('#vdiaHecho').onclick = () => {
      const p = planVidaProg(), lista = new Set(Array.isArray(p[id]) ? p[id] : []);
      if (lista.has(j)) lista.delete(j); else { lista.add(j); vibra(); }
      p[id] = [...lista]; guardar(K_PLANVIDA, p);
      vistaDiaVida(id, j);
    };
  }
  const vistaPlan2 = (id) => vistaPlanVida(id);
  const PLANES = [
    { id: 'calma', n: 'Salmos para la calma', d: '7 días para respirar y confiar', ctx: 'Los salmos son oraciones de personas reales que sintieron miedo y encontraron paz.', dias: [23, 27, 46, 91, 121, 139, 63].map((c) => [['PSA', c]]) },
    { id: 'sermon', n: 'El Sermón del Monte', d: '3 días con las palabras de Jesús', ctx: 'Jesús enseña en una colina cómo vivir: las bienaventuranzas, la oración y la confianza.', dias: rango('MAT', 5, 7).map((x) => [x]) },
    { id: 'animo', n: 'Cartas de ánimo', d: '9 días: Filipenses y Santiago', ctx: 'Cartas escritas para animar a creyentes en tiempos difíciles.', dias: rango('PHP', 1, 4).concat(rango('JAS', 1, 5)).map((x) => [x]) },
    { id: 'juan', n: 'El Evangelio de Juan', d: '21 días conociendo a Jesús', ctx: 'Juan cuenta quién es Jesús: la luz, el pan de vida, el buen pastor.', dias: rango('JHN', 1, 21).map((x) => [x]) },
    { id: 'prov', n: 'Sabiduría de Proverbios', d: '31 días, un capítulo por día', ctx: 'Consejos breves para el trabajo, la familia, las palabras y el dinero.', dias: rango('PRO', 1, 31).map((x) => [x]) },
    { id: 'marcos', n: 'Marcos: Jesús en acción', d: '16 días, el Evangelio más corto', ctx: 'El relato más rápido de la vida de Jesús: sanidades, milagros y cruz.', dias: rango('MRK', 1, 16).map((x) => [x]) },
    { id: 'lucas', n: 'Lucas: la compasión de Jesús', d: '24 días con las parábolas', ctx: 'Aquí están el buen samaritano, el hijo pródigo y la oveja perdida.', dias: rango('LUK', 1, 24).map((x) => [x]) },
    { id: 'hechos', n: 'Hechos: nace la iglesia', d: '28 días, el viaje de los primeros creyentes', ctx: 'Cómo el Espíritu Santo llevó el mensaje de Jesús de Jerusalén al mundo.', dias: rango('ACT', 1, 28).map((x) => [x]) },
    { id: 'romanos', n: 'Romanos: la gracia', d: '16 días para entender la fe', ctx: 'Pablo explica con orden qué hizo Dios por nosotros y cómo vivir agradecidos.', dias: rango('ROM', 1, 16).map((x) => [x]) },
    { id: 'genesis', n: 'Génesis: los comienzos', d: '50 días desde la creación hasta José', ctx: 'La creación, Abraham, Isaac, Jacob y José: el origen de la historia de la fe.', dias: rango('GEN', 1, 50).map((x) => [x]) },
    { id: 'efesios', n: 'Efesios: vivir con identidad', d: '6 días en la carta a los Efesios', ctx: 'Pablo escribe a una comunidad para recordarle quiénes son y cómo vivir desde esa identidad, en la casa, en el trabajo y en la comunidad.', dias: rango('EPH', 1, 6).map((x) => [x]) },
    { id: 'gratitud', n: 'Salmos de gratitud', d: '7 días para agradecer', ctx: 'Los salmos de gratitud enseñan a recordar lo bueno de Dios aun en tiempos difíciles.', dias: [100, 103, 107, 111, 118, 136, 150].map((c) => [['PSA', c]]) },
  ];
  // F942: ritmo de lectura (capítulos por día) y foto de cada plan (img/planes/<id>.jpg)
  const RITMOS = [1, 2, 3, 5];
  const planDias = (pl, r) => { const n = Number(r) || 1; if (n <= 1) return pl.dias; const f = [].concat.apply([], pl.dias), o = []; for (let i = 0; i < f.length; i += n) o.push(f.slice(i, i + n)); return o; };
  const PD = (pl) => { const e = rg(K_PLANES)[pl.id]; return planDias(pl, e && e.r); };
  const planFoto = (pl) => `<div class="plan-foto" aria-hidden="true"><img src="img/planes/${pl.id}.svg" alt="" loading="lazy" onerror="this.parentNode.classList.add('sin')"></div>`;
  const planEstado = (id) => { const e = rg(K_PLANES)[id]; return e && Array.isArray(e.h) ? e : null; };
  const planTxt = (pl, i) => PD(pl)[i].map((x) => libroInfo(x[0])[1] + ' ' + x[1]).join(' y ');
  function planAuto(cod, cap) {
    try {
      const pls = rg(K_PLANES); let cambio = null;
      PLANES.forEach((pl) => { const e = pls[pl.id]; if (!e || !Array.isArray(e.h)) return; const i = PD(pl).findIndex((d, j) => e.h.indexOf(j) < 0 && d.some((x) => x[0] === cod && x[1] === cap)); if (i >= 0) { e.h.push(i); cambio = [pl, i, e.h.length === pl.dias.length]; } });
      if (cambio) { guardar(K_PLANES, pls); gotaGanar('plan'); toastBib(cambio[2] ? '¡Plan completado: ' + cambio[0].n + '!' : 'Día ' + (cambio[1] + 1) + ' de «' + cambio[0].n + '» listo'); }
    } catch (e) { /* sin planes */ }
  }
  function vistaPlanes() {
    const pls = rg(K_PLANES);
    $('#pantalla').innerHTML = `${cabecera('Planes de lectura', 'Palabra')}<p class="suave">Un poquito cada día. Si lees el capítulo del plan en la Biblia, se marca solo.</p>
      <div class="grid">${PLANES.map((pl) => { const e = planEstado(pl.id), n = e ? e.h.length : 0, tot = PD(pl).length; return `<button type="button" class="card plan-card" data-plan="${pl.id}">${planFoto(pl)}<div class="t"><span aria-hidden="true">${svg('calendario')}</span>${esc(pl.n)}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${esc(pl.d)}</p>${e ? `<div class="barra-av" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${n}"><i class="av-${Math.round((n / tot) * 20) * 5}"></i></div><p class="suave m0t">${n === tot ? '¡Completado!' : n + ' de ' + tot + ' días'}</p>` : '<p class="suave m0t">Toca para empezar</p>'}</button>`; }).join('')}</div>`;
    volverA('Palabra', vistaPalabra);
    document.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => vistaPlan(b.dataset.plan)));
  }
  let ritSel = 1;
  function vistaPlan(id) {
    const pl = PLANES.find((x) => x.id === id); if (!pl) return vistaPlanes();
    const e = planEstado(id), DIAS = PD(pl), hechos = new Set(e ? e.h : []), sig = DIAS.findIndex((d, j) => !hechos.has(j));
    $('#pantalla').innerHTML = `${cabecera(pl.n, 'Planes')}${planFoto(pl)}<p class="suave">${esc(pl.d)}</p>${pl.ctx ? '<p class="plan-ctx">' + esc(pl.ctx) + '</p>' : ''}
      ${!e ? '<p class="suave m0">¿Cuántos capítulos quieres leer por día?</p><div class="chips" role="group" aria-label="Capítulos por día">' + RITMOS.map((x) => `<button type="button" class="chip${x === ritSel ? ' on' : ''}" data-rit="${x}" aria-pressed="${x === ritSel}">${x}</button>`).join('') + '</div><p class="suave">' + planDias(pl, ritSel).length + ' días con ' + ritSel + (ritSel === 1 ? ' capítulo' : ' capítulos') + ' por día</p><button type="button" class="btn" id="plEmpezar">Empezar este plan</button>' : sig < 0 ? '<div class="card plan-fin"><b>¡Terminaste este plan!</b><p class="suave m0t">Qué hermoso constancia. Puedes volver a leerlo cuando quieras.</p></div>' : `<button type="button" class="btn" id="plHoy">Leer hoy: ${esc(planTxt(pl, sig))}</button>`}
      <div class="lista sep">${DIAS.map((d, j) => `<div class="plan-dia${hechos.has(j) ? ' hecho' : ''}"><button type="button" class="plan-leer" data-leer="${j}"><span class="plan-n">${hechos.has(j) ? svg('check', 16) : j + 1}</span><span>Día ${j + 1} · ${esc(planTxt(pl, j))}</span></button>${e ? `<button type="button" class="plan-ok" data-ok="${j}" aria-pressed="${hechos.has(j)}" aria-label="${hechos.has(j) ? 'Quitar la marca' : 'Marcar como leído'}">${svg('check', 18)}</button>` : ''}</div>`).join('')}</div>
      ${e ? '<button type="button" class="btn sec sep" id="plQuitar">Dejar este plan</button>' : ''}`;
    volverA('Planes', vistaPlanes);
    const em = $('#plEmpezar'); if (em) em.onclick = () => { const q = rg(K_PLANES); q[id] = { ini: new Date().toISOString(), h: [], r: ritSel }; guardar(K_PLANES, q); confeti(em); vistaPlan(id); };
    document.querySelectorAll('[data-rit]').forEach((b) => b.addEventListener('click', () => { ritSel = Number(b.dataset.rit); vibra(); vistaPlan(id); }));
    const hh = $('#plHoy'); if (hh) hh.onclick = () => { const d = DIAS[sig][0]; vistaCapitulo(d[0], d[1]); };
    document.querySelectorAll('[data-leer]').forEach((b) => b.addEventListener('click', () => { const d = DIAS[Number(b.dataset.leer)][0]; vistaCapitulo(d[0], d[1]); }));
    document.querySelectorAll('[data-ok]').forEach((b) => b.addEventListener('click', () => {
      const q = rg(K_PLANES), r = q[id]; if (!r) return; const j = Number(b.dataset.ok), k = r.h.indexOf(j);
      if (k >= 0) r.h.splice(k, 1); else r.h.push(j); guardar(K_PLANES, q); vibra(); vistaPlan(id);
      if (k < 0) { const nb = document.querySelector('[data-ok="' + j + '"]'); confeti(nb); if (r.h.length === DIAS.length) toastBib('¡Plan completado!'); }
    }));
    const qb = $('#plQuitar'); if (qb) qb.onclick = () => { if (!confirm('¿Dejar este plan? Se borra tu avance en él.')) return; const q = rg(K_PLANES); delete q[id]; guardar(K_PLANES, q); vistaPlanes(); };
  }
  let miBibTab = 'res';
  async function vistaMiBiblia() {
    const res = rg(K_RES), cols = rg(K_RESCOL), notas = rg(K_NOTAS), marc = lista(K_MARC);
    const items = []; Object.keys(res).forEach((ck) => (res[ck] || []).forEach((v) => items.push({ k: ck + '.' + v, cod: ck.split('.')[0], cap: Number(ck.split('.')[1]), v, c: Number(cols[ck + '.' + v]) || 0 })));
    const tabs3 = [['res', 'Resaltados', items.length], ['notas', 'Notas', Object.keys(notas).length], ['marc', 'Guardados', marc.length]];
    const vacio = { res: 'Aún no has resaltado nada. En la Biblia toca un versículo y elige un color.', notas: 'Aún no tienes notas. Toca un versículo y elige «Nota».', marc: 'Aún no has guardado versículos. Toca uno y elige «Guardar».' };
    const cuerpoNotas = Object.keys(notas).sort((a, b) => String(notas[b].f).localeCompare(String(notas[a].f))).map((k) => `<button type="button" class="card item mb-fila" data-mb="${esc(k)}"><b>${esc(notas[k].c)}</b><p class="m0t">${esc(notas[k].t)}</p><p class="suave m0t">${esc(fecha(notas[k].f))}</p></button>`).join('');
    const cuerpoMarc = marc.slice().reverse().map((x) => `<button type="button" class="card item mb-fila" data-mb="${esc(x.k)}"><b>${svg('marcador', 15)} ${esc(x.c)}</b><p class="m0t">«${esc(x.t)}»</p></button>`).join('');
    $('#pantalla').innerHTML = `${cabecera('Mi Biblia', 'Palabra')}
      <div class="chips" role="group" aria-label="Sección">${tabs3.map((t) => `<button type="button" class="chip${miBibTab === t[0] ? ' on' : ''}" data-mbt="${t[0]}" aria-pressed="${miBibTab === t[0]}">${t[1]} · ${t[2]}</button>`).join('')}</div>
      <div id="mbCuerpo">${miBibTab === 'notas' ? (cuerpoNotas || `<p class="suave sep">${vacio.notas}</p>`) : miBibTab === 'marc' ? (cuerpoMarc || `<p class="suave sep">${vacio.marc}</p>`) : (items.length ? '<p class="suave" id="mbCarga">Cargando…</p>' : `<p class="suave sep">${vacio.res}</p>`)}</div>`;
    volverA('Palabra', vistaPalabra);
    document.querySelectorAll('[data-mbt]').forEach((b) => b.addEventListener('click', () => { miBibTab = b.dataset.mbt; vistaMiBiblia(); }));
    const abrir = () => document.querySelectorAll('[data-mb]').forEach((b) => b.addEventListener('click', () => { const q = b.dataset.mb.split('.'); vistaCapitulo(q[0], Number(q[1])); }));
    abrir();
    if (miBibTab !== 'res' || !items.length) return;
    const orden = items.slice().sort((a, b) => (LIBROS.findIndex((l) => l[0] === a.cod) - LIBROS.findIndex((l) => l[0] === b.cod)) || a.cap - b.cap || a.v - b.v).slice(0, 80), html = [];
    for (const it of orden) {
      let t = ''; try { t = ((await libroCargar(it.cod))[it.cap - 1] || [])[it.v - 1] || ''; } catch (e) { t = ''; }
      html.push(`<button type="button" class="card item mb-fila mb-c${it.c}" data-mb="${esc(it.cod + '.' + it.cap)}"><b>${esc(libroInfo(it.cod)[1] + ' ' + it.cap + ':' + it.v)}</b><p class="m0t">${t ? '«' + esc(t) + '»' : ''}</p></button>`);
      if (!$('#mbCuerpo')) return;
    }
    const cu = $('#mbCuerpo'); if (cu && miBibTab === 'res') { cu.innerHTML = html.join(''); abrir(); }
  }

  // ----- Logros (insignias): se calculan con lo que ya hay en el teléfono; nada que subir -----
  const LOGROS = [
    ['primero', 'Primer paso', 'Leíste tu primer capítulo', 'libro', () => nLeidos() >= 1],
    ['diez', 'Lector constante', '10 capítulos leídos', 'libro', () => nLeidos() >= 10],
    ['cincuenta', 'Caminante', '50 capítulos leídos', 'rollo', () => nLeidos() >= 50],
    ['racha3', 'Tres días', '3 días seguidos', 'llama', () => rachaActual() >= 3],
    ['racha7', 'Semana fiel', '7 días seguidos', 'llama', () => rachaActual() >= 7],
    ['racha30', 'Un mes con Dios', '30 días seguidos', 'sol', () => rachaActual() >= 30],
    ['resalte', 'Subrayador', '5 versículos resaltados', 'chispas', () => nResaltes() >= 5],
    ['nota', 'Pensador', 'Escribiste una nota', 'pluma', () => Object.keys(rg(K_NOTAS)).length >= 1],
    ['guardado', 'Guardián', 'Guardaste un versículo', 'marcador', () => lista(K_MARC).length >= 1],
    ['plan', 'Plan completo', 'Terminaste un plan de lectura', 'trofeo', () => PLANES.some((pl) => { const e = planEstado(pl.id); return e && e.h.length >= pl.dias.length; })],
    ['oracion', 'Orante', 'Escribiste en Mi oración', 'corazon', () => lista(K_MIORACION).length >= 1],
    ['hizo1', 'Manos a la obra', 'Diste tu primer paso de acción', 'chispas', () => nHechas() >= 1],
    ['hizo10', 'Constructor', '10 pasos de acción', 'trofeo', () => nHechas() >= 10],
    ['ayuda', 'Ojo que ayuda', 'Te comprometiste a ayudar con algo que notaste', 'foco', () => hacLista().some((x) => x.tipo === 'mirar')],
    ['cancion', 'Cantor', 'Marcaste una canción favorita', 'nota', () => lista(K_CFAV).length >= 1]
  ];
  const logrosHTML = () => `<div class="logros">${LOGROS.map((l) => { const on = l[4](); return `<div class="logro${on ? ' on' : ''}" title="${esc(l[2])}"><span class="logro-ic">${svg(on ? l[3] : 'candado', 22)}</span><b>${esc(l[1])}</b><small>${esc(l[2])}</small></div>`; }).join('')}</div>`;

  // ---------- F875 · Perfil, Ministerios y efectos ----------
  const K_PERFIL = 'tb_movil_perfil';
  const AVATARES = ['svg:brote', 'svg:hoja', 'svg:paloma', 'svg:llama', 'svg:corazon', 'svg:estrella', 'svg:iglesia', 'svg:libro', 'svg:viento', 'svg:gente', '🌿', '🕊️', '🌻', '⭐', '🔥', '🌊', '📖', '🦋', '🌸', '🌙', '☀️', '🍃', '🦁', '🐑', '🌈', '💎'];
  const perfilLeer = () => { const p = leer(K_PERFIL) || {}; return { g: Number.isInteger(p.g) && p.g >= 0 && p.g < 8 ? p.g : 0, e: AVATARES.indexOf(p.e) >= 0 ? p.e : '', t: typeof p.t === 'string' ? p.t : 'auto', tl: typeof p.tl === 'string' ? p.tl : '', n: typeof p.n === 'string' ? p.n.slice(0, 30) : '', b: typeof p.b === 'string' ? p.b.slice(0, 140) : '', f: p.f === 'sans' ? 'sans' : 'serif', m: p.m === 'off' ? 'off' : 'on', ca: p.ca === true, meta: [1, 2, 3, 5].indexOf(p.meta) >= 0 ? p.meta : 1 }; };
  const iniciales = (n) => (String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
  const avatarHTML = (nombre, p, grande) => `<span class="avatar g${p.g}${grande ? ' grande' : ''}" aria-hidden="true">${p.e ? (/^svg:[a-z]+$/.test(p.e) ? svg(p.e.slice(4), grande ? 40 : 22) : esc(p.e)) : esc(iniciales(nombre))}</span>`;
  const saludoHora = () => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; };
  const mesAnio = (iso) => { try { return new Date(iso).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  const pintaColores = () => document.querySelectorAll('[data-mc]').forEach((e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.dataset.mc || '')) e.style.setProperty('--mc', e.dataset.mc); });
  const fila = (cls, ico, tit, sub, ir) => `<button type="button" class="fila" data-pf="${ir}"><span class="fila-ico ${cls}" aria-hidden="true">${ico}</span><span class="fila-txt">${tit}${sub ? `<small>${sub}</small>` : ''}</span><span class="flecha" aria-hidden="true">›</span></button>`;

  async function misMinisterios(id) {
    const r = await rpcRaw('miembro_mis_ministerios', { p_codigo: id.codigo, p_clave: id.clave });
    return r.ok && Array.isArray(r.data) ? { ok: true, lista: r.data } : { ok: false, falta: !!r.falta };
  }
  async function vistaMinisterios(id) {
    $('#pantalla').innerHTML = `${cabecera('Mis ministerios', 'Mi iglesia')}<p class="suave" id="mimsg">Cargando…</p><div id="milista" class="grid"></div>`;
    volverA('Mi iglesia', vistaIglesia);
    const r = await misMinisterios(id), m = $('#mimsg'); if (!m) return;
    if (!r.ok) { m.textContent = r.falta ? 'Los ministerios se están preparando en el servidor. Vuelve a intentarlo pronto.' : MOTIVOS['sin-internet']; return; }
    if (!r.lista.length) { m.innerHTML = 'Todavía no estás en ningún ministerio. Cuéntale a tu pastor en qué te gustaría servir: él te suma al grupo y aparecerá aquí.'; return; }
    m.textContent = 'Los grupos donde sirves con tu iglesia.';
    $('#milista').innerHTML = r.lista.map((x) => `<div class="card min-card" data-mc="${esc(x.color)}"><div class="t"><span class="min-ico" aria-hidden="true">${x.icono ? esc(x.icono) : svg('persona', 26)}</span>${esc(x.nombre)}${x.es_lider ? '<span class="etiqueta">Líder</span>' : ''}</div><p class="suave m0t">${x.lideres ? 'Lideran: ' + esc(x.lideres) : 'Tu pastor aún no designó líder.'}</p></div>`).join('');
    pintaColores();
  }

  function logrosAbrir() {                                   // F902: «Mis logros» vive en un ícono bajo el perfil y se abre en una hoja
    if ($('#tbLogros')) return;
    const c = nuevoEl('<div class="tb-hoja-r" id="tbLogros" role="dialog" aria-modal="true" aria-label="Mis logros"><div><h2>Mis logros</h2>' + logrosHTML() + '<button type="button" class="tb-cerrar" id="lgOk">Cerrar</button></div></div>'); if (!c) return;
    document.body.appendChild(c); const cerrar = () => { try { c.remove(); } catch (e) { /* ya cerrada */ } };
    c.addEventListener('click', (ev) => { if (ev.target === c) cerrar(); }); const ok = $('#lgOk'); if (ok) { ok.onclick = cerrar; ok.focus(); }
  }
  function vistaPerfil() {
    const id = leer(K_ID), cu = leer(K_CUENTA), ig = leer(K_IG), p = perfilLeer();
    const nombre = p.n || (id && id.nombre) || (cu && cu.correo && cu.correo.split('@')[0]) || 'Invitado';
    const desde = id && id.creadoEn ? mesAnio(id.creadoEn) : '';
    $('#pantalla').innerHTML = `
      <section class="perfil-hero">${bandaTB('camino')}<div class="perfil-aura" aria-hidden="true"></div>${avatarHTML(nombre, p, true)}
        <h1>${esc(nombre)}</h1>
        <p class="suave m0">${ig && ig.nombre ? '⛪ ' + esc(ig.nombre) : 'Aún sin iglesia'}${desde ? ' · desde ' + esc(desde) : ''}</p>
        ${cu ? `<p class="suave m0">✉️ ${esc(cu.correo)}</p>` : ''}
        ${p.b ? `<p class="perfil-lema">«${esc(p.b)}»</p>` : ''}
        <div class="chips-min" id="perfMin"></div>
        <div class="perfil-acc"><button type="button" class="perfil-ic" data-pf="logros" aria-label="Mis logros"><span aria-hidden="true">${svg('trofeo', 20)}</span><small>Mis logros</small></button></div></section>
      <div class="stats" aria-label="Tu camino">
        <div class="stat"><span class="stat-ic">${svg('llama', 22)}</span><b>${rachaActual()}</b><small>días seguidos</small></div>
        <div class="stat"><span class="stat-ic">${svg('libro', 22)}</span><b>${nLeidos()}</b><small>capítulos</small></div>
        <div class="stat"><span class="stat-ic">${svg('chispas', 22)}</span><b>${nResaltes()}</b><small>resaltados</small></div>
        <div class="stat"><span class="stat-ic">${svg('pluma', 22)}</span><b>${Object.keys(rg(K_NOTAS)).length}</b><small>notas</small></div></div>
      <div class="card meta-hoy"><div class="anillo" role="img" aria-label="Meta de hoy: ${Math.min(leidosHoy(), p.meta)} de ${p.meta}"><svg viewBox="0 0 36 36" width="64" height="64" aria-hidden="true"><circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="3.4" pathLength="100"/><circle class="anillo-v" cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.round(Math.min(1, leidosHoy() / p.meta) * 100)} 100" transform="rotate(-90 18 18)"/></svg><b>${Math.min(leidosHoy(), p.meta)}/${p.meta}</b></div>
        <div><div class="t">Meta de hoy</div><p class="suave m0t">${leidosHoy() >= p.meta ? '¡Meta cumplida! Gracias por dedicarle tiempo a la Palabra.' : 'Lee ' + p.meta + (p.meta === 1 ? ' capítulo' : ' capítulos') + ' hoy.'}</p>
        <div class="chips chips-meta" role="group" aria-label="Capítulos por día">${[1, 2, 3, 5].map((x) => `<button type="button" class="chip${p.meta === x ? ' on' : ''}" data-meta="${x}" aria-pressed="${p.meta === x}">${x}</button>`).join('')}</div></div></div>
      <button type="button" class="card hac-perfil" data-pf="hacer"><span class="hac-perfil-n">${nHechas()}</span><span class="invita-txt"><b>Pasos de acción</b><small>${nHechas() ? 'Lo que has hecho por ti, por otros y por tu comunidad' : 'Empieza hoy: un paso pequeño cuenta'}</small></span><span class="flecha" aria-hidden="true">›</span></button>
      <button type="button" class="card invita" data-pf="invitar"><span class="invita-ic" aria-hidden="true">${svg('compartir', 26)}</span><span class="invita-txt"><b>Invita a un amigo</b><small>Regálale un momento de paz con la Palabra</small></span><span class="flecha" aria-hidden="true">›</span></button>
      ${pastorLeer() ? `${bandaTB('pastor')}<section class="area area-pastor" aria-label="Panel del pastor"><div class="area-cab"><span class="area-tag">Panel del pastor</span><h2 class="area-t">Cuidar a tu iglesia</h2><p class="suave m0">Todo lo que necesitas para guiar, orar y servir con tu comunidad, en un solo lugar.</p></div><div class="card pas-descanso"><b>Tu descanso también cuenta</b><p class="suave m0t">Guiar a una iglesia exige mucho. Aparta tiempo para ti y para tu familia, y busca un par con quien hablar.</p></div><div class="grid">${[['🧱', 'Muro', 'Peticiones que compartiste y cuántas personas oran.', 'muro'], ['📅', 'Agenda', 'Actividades y reuniones de tu iglesia.', 'agenda'], ['📣', 'Avisos', 'Mensajes para todos o para un grupo.', 'avisos'], ['🕍', 'Ministerios', 'Grupos, personas y líderes.', 'ministerios'], ['🤲', 'Juntos hacemos el bien', 'Ideas y movimientos para servir con tu iglesia.', 'juntos'], ['🙏', 'Oraciones', 'Peticiones recibidas.', 'oraciones']].map((x) => activa(x[0], x[1], x[2], x[3]).replace('data-ir=', 'data-pas=')).join('')}</div></section>` : ''}
      ${id ? '' : `<h2 class="sep">Empieza</h2><div class="lista">${fila('t1', '⛪', 'Unirme a mi iglesia', 'Con el código de tu pastor', 'unir')}${fila('t2', '🔑', 'Recuperar mi iglesia', 'Con la llave de otro teléfono', 'llave')}</div>`}
      <h2 class="sep">Mi plan</h2><div class="lista">${fila('t2', '🧭', 'Cambiar mi plan', esc(planResumen()), 'plan')}</div>
      <h2 class="sep">Apariencia</h2>
      <details class="perfil-det"><summary><span aria-hidden="true">${svg('pluma', 18)}</span> Editar mi perfil <i class="flecha" aria-hidden="true">›</i></summary>
      <h2 class="sep">Sobre mí</h2>
      <div class="card"><label for="pfn">Cómo quieres que te llame</label><input id="pfn" type="text" maxlength="30" value="${esc(p.n)}" placeholder="${esc((id && id.nombre) || 'Tu nombre')}" autocomplete="given-name">
        <label for="pfb">Mi versículo o lema favorito</label><textarea id="pfb" rows="2" maxlength="140" placeholder="Ej. Todo lo puedo en Cristo que me fortalece">${esc(p.b)}</textarea>
        <button type="button" class="btn" id="pfok">Guardar perfil</button></div>
      <h2 class="sep">Tu avatar</h2>
      <div class="card"><div class="av-sel" role="group" aria-label="Color del avatar">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<button type="button" class="avatar g${i}${p.g === i ? ' sel' : ''}" data-g="${i}" aria-label="Color ${i + 1}" aria-pressed="${p.g === i}"></button>`).join('')}</div>
        <div class="av-sel emo" role="group" aria-label="Símbolo">${['']. concat(AVATARES).map((e) => `<button type="button" class="av-emo${p.e === e ? ' sel' : ''}" data-e="${e}" aria-label="${e ? 'Símbolo ' + e.replace('svg:', '') : 'Mis iniciales'}" aria-pressed="${p.e === e}">${e ? (/^svg:/.test(e) ? svg(e.slice(4), 22) : e) : 'Aa'}</button>`).join('')}</div></div></details>
      <div class="temas-c" role="group" aria-label="Tema de color">${TEMAS.map((x) => `<button type="button" class="tema-c${p.t === x[0] ? ' sel' : ''}" data-tc="${x[0]}" data-mc="${x[3]}" aria-label="${esc(x[1])}" aria-pressed="${p.t === x[0]}"></button>`).join('')}<button type="button" class="tema-c mas" data-pf="temas" aria-label="Más opciones de apariencia">⋯</button></div>
      <div class="lista">${fila('t2', svg('ajustes', 26), 'Efectos y sonido', 'Sonidos, animaciones y cuidar el teléfono', 'rapido')}</div>
      <h2 class="sep">Cuenta</h2>
      <div class="lista">${cu ? fila('t2', '☁️', 'Sesión iniciada', esc(cu.correo), 'nada') + fila('t4', '↩️', 'Cerrar sesión', '', 'salir') : fila('t2', '✉️', 'Entrar o crear cuenta', 'Tu iglesia te sigue a cualquier teléfono', 'cuenta')}</div>
      ${cu ? '<p class="suave sinc-p" id="sincEstado"></p>' : ''}
      ${apoyarFila()}
      ${bloqueInstalar()}`;
    pintarInstalar($('[data-instalar-box]')); syncPintar();
    document.querySelectorAll('[data-meta]').forEach((b) => b.addEventListener('click', () => { perfilGuardar({ meta: Number(b.dataset.meta) }); vibra(); vistaPerfil(); }));
    const pok = $('#pfok'); if (pok) pok.onclick = () => { perfilGuardar({ n: $('#pfn').value.trim().slice(0, 30), b: $('#pfb').value.trim().slice(0, 140) }); toastBib('Perfil guardado'); confeti(pok); vistaPerfil(); };
    document.querySelectorAll('[data-tc]').forEach((b) => b.addEventListener('click', () => { vibra(); perfilGuardar({ t: b.dataset.tc }); temaAplicar(b.dataset.tc); document.querySelectorAll('[data-tc]').forEach((x) => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); }); }));
    try { pintaColores(); } catch (e) { /* sin colores */ }
    document.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { const q = perfilLeer(); perfilGuardar({ g: Number(b.dataset.g) }); vibra(); vistaPerfil(); }));
    document.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', () => { const q = perfilLeer(); perfilGuardar({ e: b.dataset.e }); vibra(); vistaPerfil(); }));
    document.querySelectorAll('[data-pas]').forEach((b) => b.addEventListener('click', () => { const pas = pastorLeer(); if (!pas) return vistaPastorEntrar(); const volverPerfil = (f) => { f(); volverA('Perfil', vistaPerfil); }; ({ muro: () => pMuro(pas), agenda: () => vistaAgenda(modoPastor(pas)), avisos: () => vistaAvisos(modoPastor(pas)), ministerios: () => pMinisterios(pas), juntos: abrirJuntos, oraciones: () => pOraciones(pas) }[b.dataset.pas] || (() => {}))(); }));
    document.querySelectorAll('[data-pf]').forEach((b) => b.addEventListener('click', () => ({
      min: () => vistaMinisterios(id), ora: () => vistaOracion(id), priv: () => vistaPrivacidad(id), ayu: () => vistaAyuda(id), logros: logrosAbrir, rapido: () => { if (window.TBRendimiento) window.TBRendimiento.abrir(); },
      hacer: () => vistaHacer(null, vistaPerfil), plan: planRehacer, invitar: invitarHoja, temas: vistaTemas, apoyar: vistaApoyar, pastor: () => (pastorLeer() ? ir('pastor') : vistaPastorEntrar()), unir: () => codigoHoja(), llave: vistaLlave, cuenta: () => vistaCuenta('entrar'), nada: () => {},
      salir: () => { if (confirm('¿Cerrar sesión? Tus notas personales quedan guardadas en tu cuenta y vuelven cuando entres.')) cerrarSesionCuenta(); }
    }[b.dataset.pf] || (() => {}))()));
    if (id) misMinisterios(id).then((r) => { const c = $('#perfMin'); if (!c || !r.ok) return; c.innerHTML = r.lista.map((x) => `<span class="min-chip" data-mc="${esc(x.color)}">${esc(x.icono || '👥')} ${esc(x.nombre)}</span>`).join(''); pintaColores(); });
  }
  const vibra = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sin vibración */ } };

  // ---------- F888 · Invitar a un amigo (WhatsApp o correo). No se guarda ni se envía a nuestros servidores ningún número ni correo. ----------
  // <invitar>
  const invitaUrl = () => { try { const l = window.location; return String(l.origin + l.pathname).replace(/index\.html$/, ''); } catch (e) { return ''; } };
  const invitaTexto = (amigo, yo, url) => (amigo ? '¡Hola ' + amigo + '! ' : '¡Hola! ') + 'Estoy usando Tierra Buena para leer la Biblia un ratito cada día y me está haciendo mucho bien 🌱 Quiero que la pruebes: es gratis y en un minuto ya estás adentro.\n\nEntra aquí: ' + url + (yo ? '\n\n— ' + yo : '');
  const invitaNumero = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.slice(0, 2) === '00') d = d.slice(2); if (/^9\d{8}$/.test(d)) d = '56' + d; else if (d[0] === '0') d = d.replace(/^0+/, ''); return d.length >= 8 && d.length <= 15 ? d : ''; };
  const invitaCorreoOk = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(t || '').trim());
  const invitaWa = (num, txt) => 'https://wa.me/' + (num || '') + '?text=' + encodeURIComponent(txt);
  const invitaMail = (correo, txt) => 'mailto:' + (correo || '').trim() + '?subject=' + encodeURIComponent('Te invito a Tierra Buena 🌱') + '&body=' + encodeURIComponent(txt);
  // </invitar>
  function invitarHoja() {
    const p = perfilLeer(), id = leer(K_ID), yo = p.n || (id && id.nombre) || '';
    const h = nuevoEl(`<div class="hoja" id="hojaInvitar" role="dialog" aria-modal="true" aria-label="Invita a un amigo"><div class="hoja-in hoja-inv"><div class="hoja-asa" aria-hidden="true"></div>
      <div class="inv-sobre" aria-hidden="true">${svg('compartir', 30)}</div><h3>Invita a un amigo</h3><p class="suave">Regálale un momento de paz con la Palabra. Tu amigo entra gratis y empieza en un minuto.</p>
      <label for="invNom">¿Cómo se llama? <span class="suave">(opcional)</span></label><input id="invNom" type="text" maxlength="30" autocomplete="off" placeholder="Ej. Camila">
      <label for="invTel">Su WhatsApp <span class="suave">(opcional)</span></label><input id="invTel" type="tel" inputmode="tel" autocomplete="off" placeholder="Ej. 9 1234 5678">
      <label for="invCor">Su correo <span class="suave">(opcional)</span></label><input id="invCor" type="email" inputmode="email" autocomplete="off" autocapitalize="none" placeholder="amigo@correo.com">
      <p id="invErr" class="error" role="alert" hidden></p>
      <div class="inv-msg" aria-live="polite"><small>Así llegará tu mensaje</small><p id="invTxt"></p></div>
      <a class="btn inv-wa" id="invWa" target="_blank" rel="noopener">Enviar por WhatsApp</a><a class="btn inv-mail" id="invMail" target="_blank" rel="noopener">Enviar por correo</a>
      <div class="hoja-bt"><button type="button" class="btn sec" id="invCopiar">Copiar mensaje</button><button type="button" class="btn sec" id="invX">Cerrar</button></div>
      <p class="suave inv-priv">No guardamos su número ni su correo.</p></div></div>`);
    if (!h) return;
    document.body.appendChild(h);
    const cerrar = () => { try { h.remove(); } catch (e) { /* nada */ } };
    const txt = () => invitaTexto($('#invNom').value.trim(), yo, invitaUrl());
    const pinta = () => {
      const t = txt(), tel = $('#invTel').value.trim(), cor = $('#invCor').value.trim(), num = invitaNumero(tel), e = $('#invErr');
      $('#invTxt').textContent = t; $('#invWa').href = invitaWa(num, t); $('#invMail').href = invitaMail(invitaCorreoOk(cor) ? cor : '', t);
      const mal = (tel && !num) ? 'Ese número no parece completo. Puedes dejarlo vacío y elegir el contacto en WhatsApp.' : (cor && !invitaCorreoOk(cor)) ? 'Ese correo no parece completo. Puedes dejarlo vacío y elegirlo en tu app de correo.' : '';
      e.textContent = mal; e.hidden = !mal;
    };
    ['invNom', 'invTel', 'invCor'].forEach((x) => $('#' + x).addEventListener('input', pinta));
    ['invWa', 'invMail'].forEach((x) => $('#' + x).addEventListener('click', () => { vibra(); confeti($('#' + x)); toastBib('¡Gracias por compartir la Palabra!'); }));
    $('#invCopiar').onclick = () => { const t = txt(); try { navigator.clipboard.writeText(t).then(() => toastBib('Mensaje copiado')); } catch (e) { toastBib('No pudimos copiarlo. Mantén el dedo sobre el mensaje.'); } };
    $('#invX').onclick = cerrar; h.addEventListener('click', (e) => { if (e && e.target === h) cerrar(); });
    pinta();
  }

  // Luciérnagas suaves de fondo (efecto de libro de cuentos). Solo CSS; se apagan con «reducir movimiento».
  (function ambiente() {
    if (!document.createElement || !document.body || !document.body.insertBefore) return;
    const a = document.createElement('div'); a.className = 'ambiente'; a.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 14; i++) { const s = document.createElement('i'); s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%'); s.style.setProperty('--d', (11 + Math.random() * 14).toFixed(1) + 's'); s.style.setProperty('--r', (-Math.random() * 24).toFixed(1) + 's'); s.style.setProperty('--s', (3 + Math.random() * 5).toFixed(1) + 'px'); s.style.setProperty('--w', (Math.random() * 70 - 35).toFixed(0) + 'px'); a.appendChild(s); }
    document.body.insertBefore(a, document.body.firstChild);
  })();
  // Título grande que se encoge en una barra de cristal al bajar (como las apps de iOS).
  if (window.addEventListener) window.addEventListener('scroll', () => {
    const t = $('#barraTop'), h = $('#pantalla h1'); if (!t || !t.classList) return;
    const on = window.scrollY > 70 && !!h; t.classList.toggle('on', on); if (on) $('#barraTopTxt').textContent = h.textContent;
  }, { passive: true });


  // ---------- F876 · Temas, Fábula del mes, Agenda/Avisos y MODO PASTOR ----------
  const TEMAS = [['auto', 'Automático', 'Sigue a tu teléfono', '#8a7d68'], ['amanecer', 'Amanecer', 'Dorado cálido', '#b8893a'], ['pergamino', 'Pergamino', 'Papel para leer', '#a83e2c'], ['bosque', 'Bosque', 'Verde sereno', '#2e8b57'], ['oceano', 'Océano', 'Azul profundo', '#2f6fa8'], ['atardecer', 'Atardecer', 'Naranja y rosa', '#d1603d'], ['vigilia', 'Vigilia', 'Violeta nocturno', '#8c7bff'], ['medianoche', 'Medianoche', 'Negro puro, ahorra batería', '#222222'], ['nieve', 'Nieve', 'Blanco limpio y azul', '#3b82c4'], ['lavanda', 'Lavanda', 'Violeta suave', '#8b6fd1'], ['menta', 'Menta', 'Verde fresco', '#2fa37a'], ['sakura', 'Sakura', 'Rosa tierno', '#d9628f'], ['cielo', 'Cielo', 'Azul de mañana', '#2f8fd8'], ['desierto', 'Desierto', 'Arena y cobre', '#c4783a'], ['esmeralda', 'Esmeralda', 'Verde con oro', '#1f8f6a'], ['carbon', 'Carbón', 'Gris y naranja', '#f08a3c'], ['aurora', 'Aurora', 'Halos de color', '#c25bd6']];
  const temaAplicar = (t) => {
    if (!document.documentElement || !document.documentElement.setAttribute) return;
    const ok = TEMAS.some((x) => x[0] === t && t !== 'auto');
    if (ok) document.documentElement.setAttribute('data-tema', t); else document.documentElement.removeAttribute('data-tema');
    try { const mc = getComputedStyle(document.documentElement).getPropertyValue('--papel').trim(); document.querySelectorAll('meta[name=theme-color]').forEach((m) => { m.removeAttribute('media'); if (mc) m.setAttribute('content', mc); }); } catch (e) { /* nada */ }
  };
  temaAplicar(perfilLeer().t);
  // Hora de lectura: el tema elegido para leer vive aparte (perfil.tl) y solo se ve mientras hay un capítulo abierto.
  setTimeout(() => { try { if (window.TBSuscripcion) datoCargar('suscripcion').then((c) => { if (c) window.TBSuscripcion.config(c); }).catch(() => { /* sin oferta */ }); } catch (e) { /* sin oferta */ } }, 0);
  let enLectura = false;
  const temaLectura = () => { const hay = !!document.getElementById('lectura'), q = perfilLeer(); enLectura = hay; temaAplicar(hay && q.tl ? q.tl : q.t); };
  try { const pn = document.getElementById('pantalla'); if (pn && window.MutationObserver) new MutationObserver(() => { if (!!document.getElementById('lectura') !== enLectura) temaLectura(); }).observe(pn, { childList: true }); } catch (e) { /* sin observador */ }
  const ajusteAplicar = () => { try { const q = perfilLeer(), h = document.documentElement; h.setAttribute('data-fuente', q.f); h.setAttribute('data-anim', q.m); h.setAttribute('data-tam', q.z || 'n'); h.setAttribute('data-contraste', q.ca ? 'alto' : 'normal'); } catch (e) { /* nada */ } };
  ajusteAplicar();
  const perfilGuardar = (cambio) => guardar(K_PERFIL, Object.assign({}, perfilLeer(), cambio));

  // ----- Fábula del mes (versión móvil de la del escritorio: escena ilustrada + capítulos que se abren uno a uno) -----
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const escenaSVG = () => `<svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="fbCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fb-tono)" stop-opacity=".95"/><stop offset="1" stop-color="var(--fb-tono)" stop-opacity=".35"/></linearGradient></defs><rect width="800" height="160" fill="url(#fbCielo)"/><g class="fb-par0"><circle class="fb-halo" cx="120" cy="52" r="58" fill="#fff" opacity=".18"/><circle cx="120" cy="52" r="30" fill="#fff" opacity=".55"/></g><path d="M440 44q9-10 18 0q9-10 18 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".7"/><g class="fb-par1">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<circle class="fb-luz" data-i="${i}" cx="${60 + i * 98}" cy="${132 - (i % 3) * 10}" r="${(1.6 + (i % 3) * .7).toFixed(1)}" fill="#fff"/>`).join('')}</g><path d="M0 118 Q200 78 420 112 T800 98 V160 H0Z" fill="#000" opacity=".16"/><path d="M0 140 Q240 104 470 136 T800 126 V160 H0Z" fill="var(--tarjeta)"/></svg>`;
  let fabPaso = 0, fabId = null;
  const fabSemana = () => { const d = new Date(), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + 'w' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); };
  function destello(ancla, tono) {
    const card = $('#fabCard'); if (!card || !ancla || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const rc = card.getBoundingClientRect(), ra = ancla.getBoundingClientRect(), cx = ra.left - rc.left + ra.width / 2, cy = ra.top - rc.top + ra.height / 2, col = ['#ffffff', '#ffd36b', /^#[0-9a-fA-F]{6}$/.test(tono || '') ? tono : '#ffffff'];
    for (let i = 0; i < 18; i++) { const e = document.createElement('i'), a = (i / 18) * Math.PI * 2 + Math.random() * .5, d = 44 + Math.random() * 70; e.className = 'fb-spark'; e.style.left = cx + 'px'; e.style.top = cy + 'px'; e.style.setProperty('--dx', Math.cos(a) * d + 'px'); e.style.setProperty('--dy', Math.sin(a) * d + 'px'); e.style.setProperty('--c', col[i % 3]); card.appendChild(e); setTimeout(() => e.remove(), 1200); }
  }
  async function vistaFabula(sel) {
    $('#pantalla').innerHTML = `${cabecera('Fábula del mes', 'Palabra')}<p class="suave" id="fabmsg">Cargando…</p>`;
    volverA('Palabra', vistaPalabra);
    let cat; try { cat = await datoCargar('fabulas'); } catch (e) { const m = $('#fabmsg'); if (m) m.textContent = SIN_DATOS; return; }
    const ids = Object.keys(cat); if (!ids.length) return;
    if (sel && cat[sel]) { fabId = sel; fabPaso = 0; }
    if (!fabId || !cat[fabId]) { fabId = ids[(new Date().getMonth()) % ids.length]; fabPaso = 0; }
    const f = cat[fabId], total = f.puertas.length + 1, tono = /^#[0-9a-fA-F]{6}$/.test(f.tono || '') ? f.tono : '#3f5d3a';
    const puntos = Array.from({ length: total }, (_, i) => `<button type="button" class="fab-punto${i === fabPaso ? ' activo' : ''}${i < fabPaso ? ' visto' : ''}" data-fp="${i}"${i > fabPaso ? ' disabled' : ''} aria-label="${i === total - 1 ? 'Moraleja' : 'Capítulo ' + ROM[i]}">${i === total - 1 ? '✦' : ROM[i]}</button>`).join('<span class="fab-hilo" aria-hidden="true"></span>');
    let cuerpo;
    if (fabPaso < f.puertas.length) {
      const p = f.puertas[fabPaso], ult = fabPaso === f.puertas.length - 1, tit = String(p.titulo || '').replace(/^(Primera|Segunda|Tercera|Cuarta)\s+reja:\s*/i, '');
      cuerpo = `<div class="fab-puerta"><div class="fab-tit"><span class="fab-num">${ROM[fabPaso]}</span>${esc(tit)}</div><p class="fab-texto">${esc(p.texto)}</p><div class="fab-preg"><span aria-hidden="true">💭</span><p>${esc(p.pregunta)}</p></div></div>
        <div class="fab-acc">${fabPaso > 0 ? '<button type="button" class="btn sec chico" id="fabAtras">← Atrás</button>' : ''}<button type="button" class="btn chico" id="fabSig">${ult ? 'Ver la moraleja ✦' : 'Continuar →'}</button></div>`;
    } else {
      const clave = 'tb_fabula_' + fabId + '_' + fabSemana(), hecho = leer(clave) === 1;
      cuerpo = `<div class="fab-final"><div class="fab-tit">✦ Moraleja</div><blockquote class="fab-mor">${String(f.moraleja || '').split(/\s+/).filter(Boolean).map((w, i) => `<span class="fab-pal" data-i="${i}">${esc(w)}</span>`).join(' ')}</blockquote>
        <div class="fab-practica"><b>🌱 Para practicar esta semana</b><p>${esc(f.practica)}</p><button type="button" class="btn chico${hecho ? '' : ' sec'}" id="fabComp" aria-pressed="${hecho}">${hecho ? '✓ Lo voy a practicar' : 'Me comprometo'}</button></div>
        ${f.lee ? `<p class="suave">📖 Para seguir en la Biblia: <b>${esc(f.lee)}</b></p>` : ''}</div><div class="fab-acc"><button type="button" class="btn sec chico" id="fabRe">↺ Leerla de nuevo</button></div>`;
    }
    $('#pantalla').innerHTML = `${cabecera('Fábula del mes', 'Palabra')}
      <article class="fab-card" id="fabCard"><div class="fab-escena" id="fabEsc">${escenaSVG()}<span class="fab-icono" aria-hidden="true">${esc(f.icono || '📖')}</span></div>
        <div class="fab-cuerpo"><h2 class="m0">${esc(f.titulo)}</h2><p class="suave">${esc(f.atribucion)} · ${esc(f.tiempo || '')}</p>${fabPaso === 0 ? `<p class="fab-intro">${esc(f.intro)}</p>` : ''}<div class="fab-puntos">${puntos}</div>${cuerpo}</div></article>
      <h2 class="sep">Otras fábulas</h2><div class="chips" role="group" aria-label="Elegir fábula">${ids.map((k) => `<button type="button" class="chip${k === fabId ? ' on' : ''}" data-fid="${esc(k)}" aria-pressed="${k === fabId}">${esc(cat[k].icono || '')} ${esc(cat[k].titulo)}</button>`).join('')}</div>`;
    volverA('Palabra', vistaPalabra);
    const card = $('#fabCard'); card.style.setProperty('--fb-tono', tono); card.style.setProperty('--fb-prog', (total > 1 ? fabPaso / (total - 1) : 1).toFixed(3));
    document.querySelectorAll('.fb-luz').forEach((c) => { const i = Number(c.dataset.i) || 0; c.style.setProperty('--d', (7 + (i * 1.3) % 5).toFixed(1) + 's'); c.style.setProperty('--r', '-' + (i * 1.7).toFixed(1) + 's'); });
    document.querySelectorAll('.fab-pal').forEach((w) => w.style.setProperty('--i', w.dataset.i));
    const ir2 = (n) => { fabPaso = n; vibra(); vistaFabula(); window.scrollTo(0, 0); };
    document.querySelectorAll('[data-fp]').forEach((b) => b.addEventListener('click', () => ir2(Number(b.dataset.fp))));
    const s = $('#fabSig'); if (s) s.onclick = () => ir2(fabPaso + 1);
    const a = $('#fabAtras'); if (a) a.onclick = () => ir2(fabPaso - 1);
    const re = $('#fabRe'); if (re) re.onclick = () => ir2(0);
    const co = $('#fabComp'); if (co) co.onclick = () => { const on = co.getAttribute('aria-pressed') !== 'true'; guardar('tb_fabula_' + fabId + '_' + fabSemana(), on ? 1 : 0); co.setAttribute('aria-pressed', String(on)); co.classList.toggle('sec', !on); co.textContent = on ? '✓ Lo voy a practicar' : 'Me comprometo'; if (on) destello(co, tono); };
    if (fabPaso === total - 1) setTimeout(() => destello($('.fab-mor'), tono), 450);
    document.querySelectorAll('[data-fid]').forEach((b) => b.addEventListener('click', () => vistaFabula(b.dataset.fid)));
  }

  // ----- F941 · Apoyar Tierra Buena (suscripción mensual y anual; apagada por defecto, ver datos/suscripcion.json) -----
  const apoyarFila = () => {
    try { const S = window.TBSuscripcion; if (!S || !S.catalogo()) return '';
      const dias = (window.TBInicio && window.TBInicio.cargar().ciclo.diasCuidado) || 0;
      if (S.tengoPlus()) return `<h2 class="sep">Apoyo</h2><div class="lista">${fila('t1', svg('corazon', 22), 'Gracias por apoyar', 'Ver o administrar mi apoyo', 'apoyar')}</div>`;
      if (S.ofertaVisible(dias)) return `<h2 class="sep">Apoyo</h2><div class="lista">${fila('t1', svg('corazon', 22), 'Apoyar Tierra Buena', 'Es opcional y lo esencial sigue gratis', 'apoyar')}</div>`;
    } catch (e) { /* sin oferta */ }
    return '';
  };
  async function vistaApoyar(periodo) {
    const S = window.TBSuscripcion; if (!S) return vistaPerfil();
    if (!S.catalogo()) { try { S.config(await datoCargar('suscripcion')); } catch (e) { /* sin catálogo */ } }
    const C = S.catalogo(); if (!C) return vistaPerfil();
    const T = C.textos, per = S.PERIODOS.indexOf(periodo) >= 0 ? periodo : 'anual', ya = S.tengoPlus(), est = S.leer();
    const lista = (l) => `<ul class="apoyo-lista">${l.map((x) => `<li>${svg('check', 18)}<span>${esc(x)}</span></li>`).join('')}</ul>`;
    const aho = S.ahorroAnual();
    $('#pantalla').innerHTML = `${cabecera(T.titulo, 'Perfil')}<p class="suave">${esc(T.intro)}</p>
      ${ya ? `<div class="card apoyo-ok"><b>${esc(T.activo)}</b>${est && est.vence ? `<p class="suave m0t">${esc(T.vence)} ${esc(fecha(est.vence))}.</p>` : ''}${S.enGracia() ? `<p class="suave m0t">${esc(T.gracia)}</p>` : ''}<p class="suave m0t">${esc(T.cancelar)}</p></div>` : `
      <div class="chips apoyo-per" role="group" aria-label="Elige el periodo">${S.PERIODOS.map((p) => `<button type="button" class="chip${p === per ? ' on' : ''}" data-per="${p}" aria-pressed="${p === per}">${esc(C.planes[p].nombre)}${p === 'anual' && aho ? ' · ahorra ' + aho + '%' : ''}</button>`).join('')}</div>
      <div class="card apoyo-plan"><p class="apoyo-precio">${esc(S.precioTexto(per))}</p><p class="suave m0">${esc(C.planes[per].nota)}</p></div>
      <h2 class="sep">Qué incluye</h2>${lista(C.incluye)}`}
      <h2 class="sep">Siempre gratis</h2>${lista(C.siempre_gratis)}
      ${ya ? '' : '<div class="apoyo-acc"><button type="button" class="btn" id="apoyoOk">Suscribirme</button><button type="button" class="btn sec" id="apoyoRest">Restaurar compras</button></div><p class="suave" id="apoyoMsg" aria-live="polite"></p><p class="suave"><small>Al suscribirte aceptas los Términos y la Política de privacidad. Puedes cancelar cuando quieras desde la tienda.</small></p>'}`;
    volverA('Perfil', vistaPerfil);
    document.querySelectorAll('[data-per]').forEach((b) => b.addEventListener('click', () => { vibra(); vistaApoyar(b.dataset.per); }));
    const msg = (t) => { const m = $('#apoyoMsg'); if (m) m.textContent = t; };
    const puente = window.TBPagos;   // lo agrega la versión de tienda (Capacitor/RevenueCat); en la web no existe
    const ok = $('#apoyoOk'), rs = $('#apoyoRest');
    if (ok) ok.onclick = async () => { vibra(); if (!puente || typeof puente.comprar !== 'function') return msg(T.sin_tienda); ok.disabled = true; try { const r = await puente.comprar(per, C.planes[per].id_tienda); if (r && r.ok) { S.aplicar(r.compra); vistaApoyar(per); } else msg('No se completó la compra. No se cobró nada.'); } catch (e) { msg('No pudimos completar la compra ahora. No se cobró nada.'); } ok.disabled = false; };
    if (rs) rs.onclick = async () => { vibra(); if (!puente || typeof puente.restaurar !== 'function') return msg(T.sin_tienda); try { const r = await puente.restaurar(); if (r && r.ok && r.compra) { S.aplicar(r.compra); vistaApoyar(per); } else msg('No encontramos compras para restaurar.'); } catch (e) { msg('No pudimos restaurar ahora. Inténtalo más tarde.'); } };
  }

  // ----- Temas -----
  function vistaTemas() {
    const t = perfilLeer().t;
    $('#pantalla').innerHTML = `${cabecera('Temas', 'Perfil')}<p class="suave">Elige cómo se ve tu app. Se guarda en tu cuenta.</p>
      <h2 class="sep">Colores</h2><div class="temas">${TEMAS.map((x) => `<button type="button" class="tema${t === x[0] ? ' sel' : ''}" data-t="${x[0]}" aria-pressed="${t === x[0]}"><span class="tema-bola" data-mc="${x[3]}"></span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></button>`).join('')}</div>
      <h2 class="sep">Letra para leer</h2><div class="chips" role="group" aria-label="Tipo de letra"><button type="button" class="chip${perfilLeer().f === 'serif' ? ' on' : ''}" data-fu="serif" aria-pressed="${perfilLeer().f === 'serif'}">Con serifa (libro)</button><button type="button" class="chip${perfilLeer().f === 'sans' ? ' on' : ''}" data-fu="sans" aria-pressed="${perfilLeer().f === 'sans'}">Clara (sin serifa)</button></div>
      <h2 class="sep">Contraste</h2><div class="chips" role="group" aria-label="Contraste"><button type="button" class="chip${perfilLeer().ca ? ' on' : ''}" data-ca="on" aria-pressed="${perfilLeer().ca}">Alto (más fácil de leer)</button><button type="button" class="chip${perfilLeer().ca ? '' : ' on'}" data-ca="off" aria-pressed="${!perfilLeer().ca}">Normal</button></div>
      <h2 class="sep">Animaciones</h2><div class="chips" role="group" aria-label="Animaciones"><button type="button" class="chip${perfilLeer().m === 'on' ? ' on' : ''}" data-an="on" aria-pressed="${perfilLeer().m === 'on'}">Activadas</button><button type="button" class="chip${perfilLeer().m === 'off' ? ' on' : ''}" data-an="off" aria-pressed="${perfilLeer().m === 'off'}">Más tranquilo</button></div>`;
    volverA('Perfil', vistaPerfil); pintaColores();
    document.querySelectorAll('[data-fu]').forEach((b) => b.addEventListener('click', () => { perfilGuardar({ f: b.dataset.fu }); ajusteAplicar(); vibra(); vistaTemas(); }));
    document.querySelectorAll('[data-ca]').forEach((b) => b.addEventListener('click', () => { perfilGuardar({ ca: b.dataset.ca === 'on' }); ajusteAplicar(); vibra(); vistaTemas(); }));
    document.querySelectorAll('[data-an]').forEach((b) => b.addEventListener('click', () => { perfilGuardar({ m: b.dataset.an }); ajusteAplicar(); vibra(); vistaTemas(); }));
    document.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { perfilGuardar({ t: b.dataset.t }); temaAplicar(b.dataset.t); vibra(); vistaTemas(); }));
  }

  // ----- Agenda y avisos (los ven los miembros; los crean pastor y líderes) -----
  const MOT2 = { 'sin-permiso': 'No tienes permiso para hacer esto.', 'titulo-invalido': 'Escribe un título de 2 a 80 letras.', 'fecha-invalida': 'Elige una fecha y hora que no sea pasada.', demasiados: 'Llegaste al límite por ahora. Inténtalo más tarde.', 'texto-invalido': 'Escribe un título (2 a 80 letras) y un texto (2 a 600 letras).', repetido: 'Ya existe un ministerio con ese nombre.', 'nombre-invalido': 'El nombre debe tener entre 2 y 40 letras.' };
  const errP = (e) => MOT2[e] || errTxt(e);
  const dtFmt = (iso) => { try { return new Date(iso).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  const alcanceOpc = (mins, todaIglesia) => `${todaIglesia ? '<option value="">Toda la iglesia</option>' : ''}${mins.map((m) => `<option value="${esc(m.id)}">${esc(m.icono || '')} ${esc(m.nombre)}</option>`).join('')}`;
  // Crea una acción (rpc) según quién es: pastor (secreto) o líder (clave de miembro).
  const quien = (pas, id) => (pas ? { p_codigo: pas.codigo, p_secreto: pas.secreto, p_clave: null } : { p_codigo: id.codigo, p_secreto: null, p_clave: id.clave });
  const formAgenda = (mins, todaIglesia) => `<div class="card sep16"><div class="t"><span aria-hidden="true">${svg('mas', 20)}</span>Nueva actividad</div>
    <label for="agt">Título</label><input id="agt" type="text" maxlength="80">
    <label for="agf">Fecha y hora</label><input id="agf" type="datetime-local">
    <label for="agl">Lugar (opcional)</label><input id="agl" type="text" maxlength="80">
    <label for="agd">Detalle (opcional)</label><textarea id="agd" rows="2" maxlength="400"></textarea>
    <label for="aga">Para quién</label><select id="aga">${alcanceOpc(mins, todaIglesia)}</select>
    <p id="agerr" class="error" role="alert" hidden></p><button type="button" class="btn" id="agok">Agregar a la agenda</button></div>`;
  const formAviso = (mins, todaIglesia) => `<div class="card sep16"><div class="t"><span aria-hidden="true">${svg('altavoz', 20)}</span>Nuevo aviso</div>
    <label for="avt">Título</label><input id="avt" type="text" maxlength="80">
    <label for="avx">Mensaje</label><textarea id="avx" rows="3" maxlength="600"></textarea>
    <label for="ava">Para quién</label><select id="ava">${alcanceOpc(mins, todaIglesia)}</select>
    <p id="averr" class="error" role="alert" hidden></p><button type="button" class="btn" id="avok">Publicar aviso</button></div>`;
  const eventoHTML = (e, borrable) => `<div class="card item evento"><div class="ev-fecha" aria-hidden="true"><b>${esc(new Date(e.inicio).toLocaleDateString('es-CL', { day: 'numeric' }))}</b><small>${esc(new Date(e.inicio).toLocaleDateString('es-CL', { month: 'short' }))}</small></div><div class="ev-txt"><b>${esc(e.titulo)}</b><p class="suave m0">${esc(dtFmt(e.inicio))}${e.lugar ? ' · ' + svg('lugar', 14) + ' ' + esc(e.lugar) : ''}${e.ministerio ? ' · ' + esc(e.ministerio) : ''}</p>${e.detalle ? `<p class="m0t">${esc(e.detalle)}</p>` : ''}${borrable ? `<button type="button" class="enlace" data-bev="${esc(e.id)}">Quitar</button>` : ''}</div></div>`;
  const avisoHTML = (a, borrable) => `<div class="card item aviso"><div class="t"><span aria-hidden="true">${svg('altavoz', 20)}</span>${esc(a.titulo)}${a.ministerio ? `<span class="etiqueta">${esc(a.ministerio)}</span>` : ''}</div><p class="m0t">${esc(a.texto)}</p><p class="suave m0t">${esc(fecha(a.creado_en))}${borrable ? ` · <button type="button" class="enlace" data-bav="${esc(a.id)}">Quitar</button>` : ''}</p></div>`;

  // Pantalla común (miembro/líder y pastor). modo: { pas, id, volverTxt, volverFn }
  async function vistaAgenda(modo) {
    const { pas, id } = modo;
    $('#pantalla').innerHTML = `${cabecera('Agenda', modo.volverTxt)}<p class="suave" id="agmsg">Cargando…</p><div id="agmov"></div><div id="aglista"></div><div id="agform"></div>`;
    volverA(modo.volverTxt, modo.volverFn);
    try { const mv = window.TBJuntos && window.TBJuntos.listaHTML(); if (mv) $('#agmov').innerHTML = '<h2 class="sep">Movimientos de tu iglesia</h2><div class="lista">' + mv + '</div>'; } catch (e) { /* sin movimientos */ }
    const [rE, rM] = await Promise.all([
      pas ? rpcRaw('agenda_pastor_listar', { p_codigo: pas.codigo, p_secreto: pas.secreto }) : rpcRaw('agenda_miembro_listar', { p_codigo: id.codigo, p_clave: id.clave }),
      pas ? rpcRaw('ministerio_pastor_listar', { p_codigo: pas.codigo, p_secreto: pas.secreto }) : misMinisterios(id).then((r) => ({ ok: r.ok, data: r.lista }))
    ]);
    const m = $('#agmsg'); if (!m) return;
    if (!rE.ok) { m.textContent = rE.falta ? 'La agenda aún no está lista. Estamos preparándola; vuelve a intentarlo más tarde.' : MOTIVOS['sin-internet']; return; }
    const mins = (rM.ok && Array.isArray(rM.data) ? rM.data : []).filter((x) => pas || x.es_lider);
    const lista = rE.data || [];
    try { guardar('tb_movil_agenda_cache', lista.map((e) => ({ id: e.id, t: e.titulo, fecha: e.inicio, lugar: e.lugar || '' }))); } catch (e) { /* sin copia */ }   // F921: alimenta calendario y avisos
    m.textContent = lista.length ? 'Lo que viene en tu iglesia.' : 'Todavía no hay actividades.';
    $('#aglista').innerHTML = lista.map((e) => eventoHTML(e, !!pas || e.puede_borrar)).join('');
    if (pas || mins.length) $('#agform').innerHTML = formAgenda(mins, !!pas);
    document.querySelectorAll('[data-bev]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('¿Quitar esta actividad de la agenda?')) return;
      const q = quien(pas, id); const r = await rpcRaw('agenda_borrar', { p_codigo: q.p_codigo, p_secreto: q.p_secreto, p_clave: q.p_clave, p_id: b.dataset.bev });
      r.ok && r.data ? vistaAgenda(modo) : (m.textContent = errTxt(r.error));
    }));
    const ok = $('#agok'); if (!ok) return;
    ok.onclick = async () => {
      const er = $('#agerr'), t = $('#agt').value.trim(), f = $('#agf').value; er.hidden = true;
      if (t.length < 2) { er.textContent = MOT2['titulo-invalido']; er.hidden = false; return; }
      const d = new Date(f); if (!f || isNaN(d)) { er.textContent = MOT2['fecha-invalida']; er.hidden = false; return; }
      ok.disabled = true; const q = quien(pas, id);
      const r = await rpcRaw('agenda_crear', { p_codigo: q.p_codigo, p_secreto: q.p_secreto, p_clave: q.p_clave, p_ministerio: $('#aga').value || null, p_titulo: t, p_detalle: $('#agd').value.trim() || null, p_lugar: $('#agl').value.trim() || null, p_inicio: d.toISOString() });
      ok.disabled = false; const x = r.ok ? primera(r.data) : null;
      if (x && x.ok) return vistaAgenda(modo);
      er.textContent = errP(x ? x.motivo : r.error); er.hidden = false;
    };
  }
  async function vistaAvisos(modo) {
    const { pas, id } = modo;
    $('#pantalla').innerHTML = `${cabecera('Avisos', modo.volverTxt)}<p class="suave" id="avmsg">Cargando…</p><div id="avlista"></div><div id="avform"></div>`;
    volverA(modo.volverTxt, modo.volverFn);
    const [rA, rM] = await Promise.all([
      pas ? rpcRaw('aviso_pastor_listar', { p_codigo: pas.codigo, p_secreto: pas.secreto }) : rpcRaw('aviso_miembro_listar', { p_codigo: id.codigo, p_clave: id.clave }),
      pas ? rpcRaw('ministerio_pastor_listar', { p_codigo: pas.codigo, p_secreto: pas.secreto }) : misMinisterios(id).then((r) => ({ ok: r.ok, data: r.lista }))
    ]);
    const m = $('#avmsg'); if (!m) return;
    if (!rA.ok) { m.textContent = rA.falta ? 'Los avisos aún no están listos. Estamos preparándolos; vuelve a intentarlo más tarde.' : MOTIVOS['sin-internet']; return; }
    const mins = (rM.ok && Array.isArray(rM.data) ? rM.data : []).filter((x) => pas || x.es_lider), lista = rA.data || [];
    m.textContent = lista.length ? 'Mensajes de tu pastor y de los líderes.' : 'Todavía no hay avisos.';
    $('#avlista').innerHTML = lista.map((a) => avisoHTML(a, !!pas || a.puede_borrar)).join('');
    if (pas || mins.length) $('#avform').innerHTML = formAviso(mins, !!pas);
    document.querySelectorAll('[data-bav]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('¿Quitar este aviso?')) return;
      const q = quien(pas, id); const r = await rpcRaw('aviso_borrar', { p_codigo: q.p_codigo, p_secreto: q.p_secreto, p_clave: q.p_clave, p_id: b.dataset.bav });
      r.ok && r.data ? vistaAvisos(modo) : (m.textContent = errTxt(r.error));
    }));
    const ok = $('#avok'); if (!ok) return;
    ok.onclick = async () => {
      const er = $('#averr'); er.hidden = true; ok.disabled = true; const q = quien(pas, id);
      const r = await rpcRaw('aviso_crear', { p_codigo: q.p_codigo, p_secreto: q.p_secreto, p_clave: q.p_clave, p_ministerio: $('#ava').value || null, p_titulo: $('#avt').value.trim(), p_texto: $('#avx').value.trim() });
      ok.disabled = false; const x = r.ok ? primera(r.data) : null;
      if (x && x.ok) return vistaAvisos(modo);
      er.textContent = errP(x ? x.motivo : r.error); er.hidden = false;
    };
  }
  const modoMiembro = (id) => ({ id, volverTxt: 'Mi iglesia', volverFn: vistaIglesia });

  // ----- MODO PASTOR -----
  const K_PASTOR = 'tb_movil_pastor';
  const pastorLeer = () => { const p = leer(K_PASTOR); return p && /^[A-Z0-9]{6}$/.test(p.codigo || '') && /^[0-9a-f]{20,128}$/.test(p.secreto || '') ? p : null; };
  const prpc = (fn, p, extra) => rpcRaw(fn, Object.assign({ p_codigo: p.codigo, p_secreto: p.secreto }, extra || {}));
  const modoPastor = (p) => ({ pas: p, volverTxt: 'Panel', volverFn: vistaPastor });
  function barraRefrescar(tab) {
    const pt = $('.tab[data-tab="pastor"]'); if (pt) pt.hidden = true;                // F914: Pastor vive dentro de la 1.ª pestaña (siempre 5 espacios)
    if (tab === 'pastor') tab = 'iglesia';
    const vis = Array.prototype.slice.call(document.querySelectorAll('.tab')).filter((b) => !b.hidden), bar = $('.barra');
    if (bar && bar.style && bar.style.setProperty) { bar.style.setProperty('--n', String(vis.length)); bar.style.setProperty('--i', String(Math.max(0, vis.findIndex((b) => b.dataset.tab === tab)))); }
  }
  const llaveDePastor = (txt) => {
    const t = String(txt || '').trim().replace(/\s+/g, '');
    try { const j = JSON.parse(atob(t.replace(/^PULPITO-PASTOR-/, ''))); const c = String(j.c || '').toUpperCase(); if (/^[A-Z0-9]{6}$/.test(c) && /^[0-9a-f]{20,128}$/.test(j.s || '')) return { codigo: c, secreto: j.s }; } catch (e) { /* llave mal copiada */ }
    return null;
  };
  // F901: «Soy pastor» = un solo campo para el código (ya no hay pantalla larga). Si aún no lo tiene, lo solicita ahí mismo.
  function pastorHoja() {
    const h = nuevoEl(`<div class="hoja" id="hojaPastor" role="dialog" aria-modal="true" aria-label="Entrar como pastor"><div class="hoja-in hoja-cod hoja-pas"><div class="hoja-asa" aria-hidden="true"></div><div class="hoja-cod-ic hoja-pas-ic" aria-hidden="true">${svg('escudo', 30)}</div><div id="pasCuerpo"></div></div></div>`);
    if (!h) return;
    document.body.appendChild(h);
    const cerrar = () => { try { h.remove(); } catch (e) { /* nada */ } };
    const err = (m) => { const e = $('#pasErr'); if (e) { e.textContent = m || ''; e.hidden = !m; } };
    const sono = (n) => { try { if (window.TBSonido) window.TBSonido[n](); } catch (e) { /* sin sonido */ } };
    const TXT_COD = { 'codigo-invalido': 'No encontramos ese código. Revisa que tenga 8 letras o números, tal como llegó a tu correo.', 'codigo-revocado': 'Ese código fue cancelado. Escríbenos a softappgms@outlook.com y lo revisamos contigo.', 'codigo-otro-correo': 'Ese código es de otro correo. Escribe el mismo correo con el que pediste tu acceso.', 'codigo-vencido': 'Ese código venció por falta de uso. Pídenos que lo reactiven escribiendo a softappgms@outlook.com.', 'demasiados-intentos': 'Hubo varios intentos seguidos. Espera una hora e inténtalo de nuevo, para cuidar tu cuenta.' };
    // F903: si quien mira es administrador (sesión en admins_pulpito), aparece un botón para generar al instante un código de pastor de prueba.
    const adminPrueba = async () => {
      try {
        if (!hayAuth() || !SB.rpc || !leer(K_CUENTA)) return;
        const r = await SB.rpc('es_admin_pulpito'); const caja = $('#pasCuerpo');
        if (!caja || r.error || r.data !== true || $('#pasAdm')) return;
        const d = document.createElement('div'); d.id = 'pasAdm'; d.className = 'pas-adm';
        d.innerHTML = '<button type="button" class="btn sec" id="pasGen">Administrador: generar código de prueba</button><p class="suave" id="pasGenMsg" hidden></p>';
        caja.appendChild(d);
        $('#pasGen').onclick = async () => {
          const cor = ($('#pkCor').value || (leer(K_CUENTA) || {}).correo || '').trim(); const m = $('#pasGenMsg'); m.hidden = false;
          if (!CORREO_RE.test(cor)) { m.textContent = 'Escribe primero el correo con el que vas a probar.'; return; }
          $('#pasGen').disabled = true; m.textContent = 'Generando…';
          const g = await SB.rpc('pastor_codigo_prueba', { p_correo: cor, p_iglesia: 'Iglesia de prueba' }); $('#pasGen').disabled = false;
          if (g.error || !/^[A-Z0-9]{8}$/i.test(String(g.data || ''))) { sono('error'); m.textContent = g.error ? 'Falta correr SQL_F903_SOLICITUD_PASTOR.sql en Supabase.' : 'No se pudo: ' + g.data; return; }
          $('#pkHoja').value = String(g.data).toUpperCase(); $('#pkCor').value = cor; sono('exito'); m.textContent = 'Listo: código ' + String(g.data).toUpperCase() + ' para ' + cor + '. Ya está escrito arriba: toca «Entrar como pastor».';
        };
      } catch (e) { /* sin permiso de administrador: el botón no aparece */ }
    };
    const pantallaCodigo = () => {
      $('#pasCuerpo').innerHTML = `<h3>Entrar como pastor</h3><p class=\"suave\">Escribe el código de 8 letras que te enviamos por correo, junto con ese mismo correo. Si usas la llave larga del computador, pégala en el primer campo.</p>
        <label for=\"pkHoja\">Tu código de pastor</label>
        <input id=\"pkHoja\" class=\"cod-in cod-pas\" type=\"text\" autocomplete=\"off\" autocapitalize=\"characters\" spellcheck=\"false\" placeholder=\"Ej. A1B2C3D4\" aria-label=\"Código de pastor\">
        <label for=\"pkCor\">Tu correo <small class=\"suave\">(no hace falta con la llave larga)</small></label>
        <input id=\"pkCor\" type=\"email\" maxlength=\"120\" autocomplete=\"email\" inputmode=\"email\" value=\"${esc((leer(K_CUENTA) || {}).correo || '')}\">
        <p id=\"pasErr\" class=\"error\" role=\"alert\" hidden></p>
        <div class=\"hoja-bt\"><button type=\"button\" class=\"btn\" id=\"pasEntrar\">Entrar como pastor</button><button type=\"button\" class=\"btn sec\" id=\"pasPedir\">Aún no tengo mi código: solicitarlo</button><button type=\"button\" class=\"btn sec\" id=\"pasX\">Ahora no</button></div>
        <p class=\"suave pas-nota\">Entregamos el código solo después de confirmar a cada pastor. Así cuidamos a las personas de tu iglesia.</p>`;
      $('#pasX').onclick = cerrar; $('#pasPedir').onclick = pantallaPedir;
      adminPrueba();
      $('#pkHoja').addEventListener('keydown', (e) => { if (e && e.key === 'Enter') entrar(); });
      $('#pasEntrar').onclick = entrar;
      setTimeout(() => { try { $('#pkHoja').focus(); } catch (e) { /* nada */ } }, 150);
    };
    const entrarConLlave = async (p) => {
      const b = $('#pasEntrar'); b.disabled = true; b.textContent = 'Comprobando…';
      const r = await rpcRaw('solicitud_pastor_resolver', { p_codigo: p.codigo, p_secreto: p.secreto, p_id: crypto.randomUUID(), p_aprobar: false, p_mensaje: null });
      b.disabled = false; b.textContent = 'Entrar como pastor';
      if (!r.ok) { sono('error'); return err(r.falta ? 'Las funciones de pastor aún no están activadas. Avisa a quien administra la app.' : MOTIVOS['sin-internet']); }
      if (r.data === 'sin-permiso') { sono('error'); return err('Esa llave no corresponde a ninguna iglesia. Revisa que sea la última que copiaste.'); }
      guardar(K_PASTOR, p); cerrar(); sono('campana'); barraRefrescar('pastor'); ir('pastor');
    };
    const llaveTexto = (p) => 'PULPITO-PASTOR-' + btoa(JSON.stringify({ c: p.codigo, s: p.secreto }));
    const pantallaIglesia = (nombre, correo) => {
      $('#pasCuerpo').innerHTML = `<div class=\"pas-ok\" aria-hidden=\"true\">✅</div><h3>Código verificado</h3><p class=\"suave\">Bienvenido${nombre ? ', pastor de <b>' + esc(nombre) + '</b>' : ''}. ¿Cómo quieres seguir?</p>
        <p id=\"pasErr\" class=\"error\" role=\"alert\" hidden></p>
        <div class=\"hoja-bt\"><button type=\"button\" class=\"btn\" id=\"pasCrear\">Crear mi iglesia en Tierra Buena</button><button type=\"button\" class=\"btn sec\" id=\"pasYa\">Ya la tengo en el computador (pegar mi llave)</button></div>
        <p class=\"suave pas-nota\">Al crearla recibirás un código de 6 letras para compartir con tus miembros. Tú decides a quién aceptas.</p>`;
      $('#pasYa').onclick = pantallaCodigo;
      $('#pasCrear').onclick = async () => {
        const b = $('#pasCrear'); b.disabled = true; b.textContent = 'Creando…'; err('');
        const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); const secreto = Array.prototype.map.call(bytes, (x) => ('0' + x.toString(16)).slice(-2)).join('');
        const r = await rpcRaw('iglesia_crear', { p_nombre: (nombre || 'Mi iglesia').slice(0, 80), p_eslogan: null, p_secreto: secreto });
        const f = r.ok ? primera(r.data) : null;
        if (!f || !f.ok) { b.disabled = false; b.textContent = 'Crear mi iglesia en Tierra Buena'; sono('error'); return err(r.falta ? 'Esta parte aún no está activada. Avisa a quien administra la app.' : !r.ok ? MOTIVOS['sin-internet'] : 'No pudimos crearla ahora. Inténtalo de nuevo en un momento.'); }
        const p = { codigo: f.codigo_nuevo, secreto }; guardar(K_PASTOR, p); sono('campana');
        $('#pasCuerpo').innerHTML = `<div class=\"pas-ok\" aria-hidden=\"true\">🎉</div><h3>¡Tu iglesia está lista!</h3><p class=\"suave\">Comparte este código con tus miembros:</p><p class=\"pas-cod\"><b>${esc(p.codigo)}</b></p>
          <p class=\"suave\">Guarda tu llave de respaldo: te sirve si cambias de teléfono. No la compartas con nadie.</p>
          <div class=\"hoja-bt\"><button type=\"button\" class=\"btn sec\" id=\"pasCopia\">Copiar mi llave de respaldo</button><button type=\"button\" class=\"btn\" id=\"pasIr\">Ir a mi panel</button></div>`;
        $('#pasCopia').onclick = async () => { try { await navigator.clipboard.writeText(llaveTexto(p)); $('#pasCopia').textContent = 'Llave copiada ✓'; } catch (e) { $('#pasCopia').textContent = 'No se pudo copiar'; } };
        $('#pasIr').onclick = () => { cerrar(); barraRefrescar('pastor'); ir('pastor'); };
      };
    };
    const entrar = async () => {
      const txt = ($('#pkHoja').value || '').trim(), correo = ($('#pkCor').value || '').trim(); err('');
      if (!txt) return err('Escribe o pega tu código de pastor.');
      const p = llaveDePastor(txt);
      if (p) return entrarConLlave(p);
      const cod = txt.replace(/[\s-]+/g, '').toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(cod)) return err('El código tiene 8 letras o números. Si es una llave larga, cópiala otra vez completa.');
      if (!CORREO_RE.test(correo)) return err('Escribe el mismo correo con el que pediste tu acceso.');
      const b = $('#pasEntrar'); b.disabled = true; b.textContent = 'Comprobando…';
      let r = await rpcRaw('pastor_movil_entrar', { p_codigo: cod, p_correo: correo });
      if (!r.ok && r.falta) r = await rpcRaw('pastor_validar_codigo_v2', { p_codigo: cod, p_correo: correo });   // si aún no se corrió el SQL nuevo, usa el de siempre
      b.disabled = false; b.textContent = 'Entrar como pastor';
      if (!r.ok) { sono('error'); return err(r.falta ? 'Esta parte aún no está activada. Avisa a quien administra la app.' : MOTIVOS['sin-internet']); }
      const f = primera(r.data) || {};
      if (!f.ok) { sono('error'); return err(TXT_COD[f.mensaje] || TXT_COD['codigo-invalido']); }
      sono('exito'); pantallaIglesia(f.iglesia, correo);
    };
    const pantallaPedir = () => {
      const cu = leer(K_CUENTA);
      $('#pasCuerpo').innerHTML = `<h3>Solicitar mi código de pastor</h3><p class="suave">Cuéntanos quién eres y de qué iglesia. Confirmamos a cada pastor para cuidar a la gente de su iglesia; tus datos se usan solo para eso. Te enviamos el código a tu correo.</p>
        <label for="spNom">Tu nombre</label><input id="spNom" type="text" maxlength="60" autocomplete="name">
        <label for="spCor">Tu correo</label><input id="spCor" type="email" maxlength="120" autocomplete="email" inputmode="email" value="${esc(cu && cu.correo ? cu.correo : '')}">
        <label for="spIgl">Nombre de tu iglesia y ciudad</label><input id="spIgl" type="text" maxlength="120" autocomplete="off" placeholder="Ej. Iglesia Camino Nuevo, Calama">
        <label for="spCar">Tu cargo</label><input id="spCar" type="text" maxlength="60" autocomplete="off" placeholder="Ej. pastor">
        <label for="spTel">Tu teléfono o WhatsApp</label><input id="spTel" type="tel" maxlength="30" autocomplete="tel" placeholder="Solo para confirmar que eres tú">
        <label for="spEnl">Enlace público de tu iglesia o datos de otro pastor que te conozca</label><input id="spEnl" type="text" maxlength="140" autocomplete="off" placeholder="https://… o nombre y teléfono">
        <label class="chk"><input id="spAc" type="checkbox"><span>Sirvo como pastor o líder y permito que confirmen mis datos con ese enlace o esa persona.</span></label>
        <p id="pasErr" class="error" role="alert" hidden></p>
        <div class="hoja-bt"><button type="button" class="btn" id="spEnv">Enviar solicitud</button><button type="button" class="btn sec" id="spAtras">‹ Ya tengo mi código</button></div>`;
      $('#spAtras').onclick = pantallaCodigo;
      $('#spEnv').onclick = async () => {
        const nombre = $('#spNom').value.trim().replace(/\s+/g, ' '), correo = $('#spCor').value.trim(), igl = $('#spIgl').value.trim().replace(/\s+/g, ' ');
        if (nombre.length < 2) return err('Escribe tu nombre.');
        if (!CORREO_RE.test(correo)) return err('Revisa tu correo: parece incompleto.');
        if (igl.length < 3) return err('Escribe el nombre de tu iglesia.');
        const car = $('#spCar').value.trim(), tel = $('#spTel').value.trim(), enl = $('#spEnl').value.trim();
        if (car.length < 3) return err('Cuéntanos tu cargo (por ejemplo: pastor).');
        if (tel.replace(/\D/g, '').length < 8) return err('Escribe un teléfono o WhatsApp con el código de tu ciudad.');
        if (enl.length < 8) return err('Para confirmarlo, escribe el enlace público de tu iglesia o los datos de otro pastor o líder que te conozca.');
        if (!$('#spAc').checked) return err('Marca la casilla para poder enviar tu solicitud.');
        try { const reg = JSON.parse(localStorage.getItem('tb_sol_pastor_reg') || '[]').filter((t) => Date.now() - t < 86400000); if (reg.length >= 8) return err('Ya enviaste varias solicitudes hoy desde este teléfono. Espera un poco o escríbenos a softappgms@outlook.com.'); } catch (e) { /* sin almacenamiento */ }   // F904: hasta 8 por día y por teléfono (antes 1)
        const msgFinal = ['Cargo: ' + car, 'Teléfono/WhatsApp: ' + tel, 'Enlace o referencia: ' + enl, 'Origen: app del celular'].join(' | ').slice(0, 290);
        err(''); const b = $('#spEnv'); b.disabled = true; b.textContent = 'Enviando…';
        let ok = false, detalle = '';
        try {
          if (SB && SB.rpc) {                                          // 1.º la función segura (siempre llega al panel)
            const r1 = await SB.rpc('pastor_solicitar', { p_nombre: nombre, p_correo: correo, p_iglesia: igl, p_cargo: car, p_telefono: tel, p_enlace: enl, p_origen: 'celular' });
            if (!r1.error) { ok = (r1.data === 'ok' || r1.data === 'repetida'); if (!ok) detalle = String(r1.data || ''); }
            else detalle = (r1.error.code || '') + ' ' + (r1.error.message || '');
          }
          if (!ok && SB && SB.from && (!detalle || /PGRST202|could not find|function/i.test(detalle))) {   // 2.º, si el SQL nuevo aún no se corrió: la forma de siempre
            const r2 = await SB.from('solicitudes_pastor').insert({ nombre: nombre.slice(0, 60), correo: correo.slice(0, 120), iglesia: igl.slice(0, 120), mensaje: msgFinal });
            ok = !r2.error; if (r2.error) detalle = (r2.error.code || '') + ' ' + (r2.error.message || '');
          }
        } catch (e) { ok = false; detalle = 'red: ' + (e && e.message ? e.message : e); }
        if (!ok) { try { console.warn('solicitud pastor:', detalle); window.tbUltimoError = detalle; } catch (e2) { /* nada */ } }
        if (!ok) { b.disabled = false; b.textContent = 'Enviar solicitud'; sono('error'); if (detalle === 'demasiadas' || detalle === 'saturado') return err(detalle === 'demasiadas' ? 'Este correo ya pidió varias veces hoy. Escríbenos a softappgms@outlook.com y lo revisamos contigo.' : 'Hay muchas solicitudes en este momento. Inténtalo en una hora.'); return err(/42501|row-level|permission/i.test(detalle) ? 'No pudimos enviarla: falta activar un permiso en el servidor. Avisa a quien administra la app (código 42501).' : /fetch|network|red:/i.test(detalle) ? 'No pudimos enviarla. Revisa tu internet e inténtalo otra vez.' : 'No pudimos enviarla (' + (detalle.trim().slice(0, 60) || 'sin detalle') + '). Avisa a quien administra la app.'); }
        sono('exito'); try { const reg2 = JSON.parse(localStorage.getItem('tb_sol_pastor_reg') || '[]').filter((t) => Date.now() - t < 86400000); reg2.push(Date.now()); localStorage.setItem('tb_sol_pastor_reg', JSON.stringify(reg2)); } catch (e) { /* sin almacenamiento */ }
        $('#pasCuerpo').innerHTML = `<div class="pas-ok" aria-hidden="true">${svg('correo', 44)}</div><h3>¡Solicitud enviada!</h3><p class="suave">Revisaremos tu solicitud y te escribiremos a <b>${esc(correo)}</b> con tu código de pastor. Cuando lo tengas, vuelve a tocar <b>Soy pastor</b> y pégalo.</p><div class="hoja-bt"><button type="button" class="btn" id="spListo">Listo</button></div>`;
        $('#spListo').onclick = cerrar;
      };
      setTimeout(() => { try { $('#spNom').focus(); } catch (e) { /* nada */ } }, 150);
    };
    h.addEventListener('click', (e) => { if (e && e.target === h) cerrar(); });
    pantallaCodigo();
  }
  function vistaPastorEntrar() { if (!haySesion()) return puerta(); pastorHoja(); }
  async function vistaPastor() {
    const p = pastorLeer(); if (!p) return vistaPastorEntrar();
    const fil = (cls, ico, tit, sub, ir3, n) => `<button type="button" class="fila" data-pp="${ir3}"><span class="fila-ico ${cls}" aria-hidden="true">${ico}</span><span class="fila-txt">${tit}<small>${sub}</small></span><span class="insignia" id="n-${ir3}" hidden></span><span class="flecha" aria-hidden="true">›</span></button>`;
    $('#pantalla').innerHTML = `${bandaTB('comunidad')}<section class="saludo"><div class="perfil-aura" aria-hidden="true"></div>${avatarHTML('P', { g: perfilLeer().g, e: 'svg:escudo' }, false)}<div><p class="suave m0">Modo pastor</p><h1 id="pIgl">Mi iglesia</h1><p class="suave m0">Código <b>${esc(p.codigo)}</b></p></div></section>
      <p class="suave" id="pResumen" aria-live="polite">Revisando lo de hoy…</p>
      <h2 class="sep">Mi agenda</h2><div class="lista">${fil('t2', svg('calendario', 22), 'Mi calendario', 'Visitas, reuniones y descanso. Solo tú lo ves', 'mcal')}</div>
      <h2 class="sep">Para atender hoy</h2><div class="lista">${fil('t3', svg('compartir', 22), 'Visitas', 'Quién pide que lo visites', 'vis')}${fil('t2', svg('corazon', 22), 'Oraciones', 'Peticiones recibidas', 'ora')}${fil('t1', svg('gente', 22), 'Solicitudes', 'Quién quiere unirse', 'sol')}</div>
      <h2 class="sep">Mi iglesia</h2><div class="lista">${fil('t2', svg('compartir', 22), 'Chat', 'Iglesia, pastor y líderes, y conversaciones', 'chat')}${fil('t4', svg('brote', 22), 'Bienvenida', 'Primeras 4 semanas de quienes llegan', 'bien')}${fil('t4', svg('gente', 22), 'Miembros', 'Quiénes forman tu iglesia', 'mie')}${fil('t1', svg('gente', 22), 'Disponibilidad', 'Quiénes pueden servir y cuándo', 'disp')}${fil('t1', svg('iglesia', 22), 'Ministerios y líderes', 'Grupos, personas y líderes', 'min')}${fil('t2', svg('calendario', 22), 'Agenda', 'Actividades y reuniones', 'age')}${fil('t3', svg('altavoz', 22), 'Avisos', 'Mensajes para todos o un grupo', 'avi')}${fil('t4', svg('bloques', 22), 'Datos y código', 'Nombre, eslogan y código', 'dat')}</div>
      <div id="tbEjem" class="tb-ejem-caja"></div>
      <p class="suave sep16">${svg('escudo', 16)} Las finanzas se administran solo desde el computador.</p>
      <button type="button" class="btn sec sep16" id="pSalir">Salir del modo pastor</button>`;
    try { if (window.TBEjemplos && $('#tbEjem')) window.TBEjemplos.pintar($('#tbEjem'), 'pastor'); } catch (e) { /* sin ejemplos */ }
    document.querySelectorAll('[data-ir=juntos]').forEach((b) => b.addEventListener('click', abrirJuntos));
    document.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', () => ({ sol: pSolicitudes, ora: pOraciones, vis: pVisitas, mie: pMiembros, min: pMinisterios, age: () => vistaAgenda(modoPastor(p)), avi: () => vistaAvisos(modoPastor(p)), mcal: () => pCalendario(p), disp: () => pDisponibilidad(p), bien: () => pBienvenida(p), chat: () => vistaChat({ rol: 'pastor', codigo: p.codigo, secreto: p.secreto }), dat: pDatos }[b.dataset.pp])(p)));
    $('#pSalir').onclick = () => { if (confirm('¿Salir del modo pastor en este teléfono? Tu llave se borra de aquí (sigue en tu computador).')) { borrar(K_PASTOR); borrar('tb_movil_juntos_cache'); barraRefrescar('perfil'); ir('perfil'); } };
    const ins = (k, n) => { const e = $('#n-' + k); if (e && n > 0) { e.textContent = n > 99 ? '99+' : String(n); e.hidden = false; } };
    // F1032 · Resumen del pastor: una frase con lo que requiere atención hoy (sin rankings ni cifras en rojo)
    const cuentas = { sol: 0, ora: 0, vis: 0 };
    const pintaResumen = () => {
      const e = $('#pResumen'); if (!e) return;
      const t = cuentas.sol + cuentas.ora + cuentas.vis, pl = (n, a, b) => (n === 1 ? a : b);
      e.textContent = t ? 'Hoy tienes ' + cuentas.vis + ' ' + pl(cuentas.vis, 'visita pedida', 'visitas pedidas') + ', ' + cuentas.ora + ' ' + pl(cuentas.ora, 'oración recibida', 'oraciones recibidas') + ' y ' + cuentas.sol + ' ' + pl(cuentas.sol, 'solicitud', 'solicitudes') + ' por revisar.' : 'Nada urgente por hoy. Un momento de oración por tu iglesia siempre ayuda.';
    };
    setTimeout(() => { const e = $('#pResumen'); if (e && /Revisando/.test(e.textContent)) e.textContent = 'No pudimos revisar lo de hoy. Revisa tu conexión y vuelve a abrir esta pantalla.'; }, 8000);
    rpc('iglesia_perfil', { p_codigo: p.codigo }).then((r) => { const h = $('#pIgl'); if (h && r.ok && r.data && r.data.nombre) h.textContent = r.data.nombre; });
    prpc('solicitud_pastor_listar', p).then((r) => { if (r.ok) { cuentas.sol = (r.data || []).length; ins('sol', cuentas.sol); pintaResumen(); } });
    prpc('peticion_pastor_listar_v2', p).then((r) => (r.ok ? r : prpc('peticion_pastor_listar', p))).then((r) => { if (r.ok) { cuentas.ora = (r.data || []).length; ins('ora', cuentas.ora); pintaResumen(); } });
    prpc('visita_pastor_listar', p).then((r) => { if (r.ok) { cuentas.vis = (r.data || []).filter((v) => v.estado === 'solicitada').length; ins('vis', cuentas.vis); pintaResumen(); } });
  }
  // F1033 · CALENDARIO PERSONAL del pastor (solo lo ve él). Requiere 15_SQL_F1033_CALENDARIO_PASTOR.sql.
  const CAL_TIPOS = [['visita', 'Visita'], ['reunion', 'Reunión'], ['predica', 'Prédica'], ['personal', 'Personal'], ['descanso', 'Descanso']];
  const CAL_MOTIVO = { 'sin-permiso': 'No pudimos confirmar tu clave de pastor. Revisa tu conexión.', 'titulo-invalido': 'Escribe un título de 2 a 80 letras.', 'tipo-invalido': 'Elige un tipo.', 'fecha-invalida': 'Revisa la fecha de inicio y la de fin.', 'demasiados': 'Guardaste muchas cosas en poco tiempo. Espera una hora.', 'no-existe': 'Ese evento ya no existe.' };
  const aLocal = (d) => { const z = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); };
  async function pCalendario(p) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy.getTime() + 14 * 86400000);
    const etiqueta = (d) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#pantalla').innerHTML = `${cabecera('Mi calendario', 'Panel')}<p class="suave">Tu agenda personal: visitas, reuniones, prédicas y descanso. Solo la ves tú.</p>
      <div class="cr-acc"><button type="button" class="btn sec" id="calNuevo" aria-expanded="false" aria-controls="calForm">+ Agregar a mi calendario</button><button type="button" class="btn sec" id="calVerMes">Ver el mes</button></div>
      <div id="calForm" class="card" hidden>
        <label for="calT">¿Qué es?</label><input id="calT" type="text" maxlength="80" placeholder="Ej.: Visitar a la familia Soto">
        <label for="calTi">Tipo</label><select id="calTi">${CAL_TIPOS.map((t) => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select>
        <label for="calI">Comienza</label><input id="calI" type="datetime-local" value="${aLocal(new Date())}">
        <label for="calF">Termina (opcional)</label><input id="calF" type="datetime-local">
        <label for="calD">Detalle (opcional)</label><textarea id="calD" rows="2" maxlength="400"></textarea>
        <button type="button" class="btn" id="calGuardar">Guardar</button>
      </div>
      <p class="suave" id="calMsg" role="status"></p>
      <div id="calLista" class="lista"><p class="suave">Cargando…</p></div>`;
    volverA('Panel', vistaPastor);
    const msg = (t, ok) => { const m = $('#calMsg'); if (m) { m.textContent = t; m.className = ok ? 'ok suave' : 'suave'; } };
    const cargar = async () => {
      const r = await prpc('calendario_pastor_listar', p, { p_desde: hoy.toISOString(), p_hasta: hasta.toISOString() });
      const caja = $('#calLista'); if (!caja) return;
      if (!r.ok) { caja.innerHTML = '<p class="suave">No pudimos abrir tu calendario. Revisa tu conexión y vuelve a intentarlo.</p>'; return; }
      const evs = r.data || [];
      if (!evs.length) { caja.innerHTML = '<p class="suave">No tienes nada agendado en las próximas dos semanas. Un espacio libre también es parte del servicio.</p>'; return; }
      let dia = '', html = '';
      evs.forEach((e) => {
        const d = new Date(e.inicio), clave = d.toDateString();
        if (clave !== dia) { dia = clave; html += `<h3 class="sep">${esc(etiqueta(d))}</h3>`; }
        const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const tipo = (CAL_TIPOS.find((t) => t[0] === e.tipo) || [0, 'Personal'])[1];
        html += `<div class="card item"><p class="m0"><b>${esc(hora)} · ${esc(e.titulo)}</b></p><p class="suave m0t">${esc(tipo)}${e.detalle ? ' · ' + esc(e.detalle) : ''}</p><button type="button" class="btn sec chico" data-caldel="${esc(e.id)}">Quitar</button></div>`;
      });
      caja.innerHTML = html;
      caja.querySelectorAll('[data-caldel]').forEach((b) => b.addEventListener('click', async () => {
        if (!confirm('¿Quitar este evento de tu calendario?')) return;
        const rr = await prpc('calendario_pastor_borrar', p, { p_id: b.dataset.caldel });
        const x = rr.ok ? primera(rr.data) : null;
        if (x && x.ok) { msg('Evento quitado.', true); cargar(); } else msg(CAL_MOTIVO[x ? x.motivo : ''] || 'No se pudo quitar. Revisa tu conexión.', false);
      }));
    };
    $('#calNuevo').onclick = () => { const f = $('#calForm'), b = $('#calNuevo'); f.hidden = !f.hidden; b.setAttribute('aria-expanded', String(!f.hidden)); };
    $('#calVerMes').onclick = () => pCalendarioMes(p, new Date());
    $('#calGuardar').onclick = async () => {
      const titulo = ($('#calT').value || '').trim(), inicio = $('#calI').value, fin = $('#calF').value;
      if (!titulo) return msg('Escribe qué es antes de guardar.', false);
      if (!inicio) return msg('Elige cuándo comienza.', false);
      const btn = $('#calGuardar'); btn.disabled = true;
      const r = await prpc('calendario_pastor_crear', p, { p_titulo: titulo, p_tipo: $('#calTi').value, p_inicio: new Date(inicio).toISOString(), p_fin: fin ? new Date(fin).toISOString() : null, p_detalle: ($('#calD').value || '').trim() || null });
      btn.disabled = false;
      const x = r.ok ? primera(r.data) : null;
      if (x && x.ok) { $('#calT').value = ''; $('#calD').value = ''; $('#calF').value = ''; msg('Guardado en tu calendario.', true); cargar(); }
      else msg(CAL_MOTIVO[x ? x.motivo : ''] || 'No se pudo guardar. Revisa tu conexión.', false);
    };
    cargar();
  }
  // F1038 · TURNOS de servicio: el pastor asigna un servicio a un miembro. Requiere 17_SQL_F1038_TURNOS.sql.
  const TURNO_MOTIVO = { 'sin-permiso': 'No pudimos confirmar tu clave de pastor. Revisa tu conexión.', 'titulo-invalido': 'Escribe un título de 2 a 80 letras.', 'fecha-invalida': 'Elige cuándo es el servicio.', 'miembro-invalido': 'Elige a una persona de tu iglesia.', 'demasiados': 'Asignaste muchos turnos en poco tiempo. Espera una hora.', 'no-existe': 'Ese turno ya no existe.' };
  async function pTurnos(p) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy.getTime() + 14 * 86400000);
    const etiqueta = (d) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const msg = (t, ok) => { const m = $('#turMsg'); if (m) { m.textContent = t; m.className = ok ? 'ok suave' : 'suave'; } };
    $('#pantalla').innerHTML = `${cabecera('Turnos de servicio', 'Disponibilidad')}<p class="suave">Asigna un servicio a una persona de tu iglesia. Lo ve ella en su panel.</p>
      <div class="card"><label for="turT">¿Qué servicio es?</label><input id="turT" type="text" maxlength="80" placeholder="Ej.: Sonido del culto del domingo">
        <label for="turM">¿Quién sirve?</label><select id="turM"><option value="">Cargando personas…</option></select>
        <label for="turI">Cuándo</label><input id="turI" type="datetime-local" value="${aLocal(new Date())}">
        <button type="button" class="btn" id="turGuardar">Asignar turno</button></div>
      <p class="suave" id="turMsg" role="status"></p>
      <h2 class="sep">Próximos 14 días</h2><div id="turLista" class="lista"><p class="suave">Cargando…</p></div>`;
    volverA('Disponibilidad', () => pDisponibilidad(p));
    const cargarPersonas = async () => {
      const r = await prpc('miembros_servicio_listar', p);
      const sel = $('#turM'); if (!sel) return;
      const filas = r.ok ? (r.data || []) : [];
      sel.innerHTML = filas.length ? '<option value="">Elige una persona</option>' + filas.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('') : '<option value="">Aún no hay personas en tu iglesia</option>';
    };
    const cargar = async () => {
      const r = await prpc('turno_pastor_listar', p, { p_desde: hoy.toISOString(), p_hasta: hasta.toISOString() });
      const caja = $('#turLista'); if (!caja) return;
      if (!r.ok) { caja.innerHTML = '<p class="suave">No pudimos abrir los turnos. Revisa tu conexión.</p>'; return; }
      const filas = r.data || [];
      if (!filas.length) { caja.innerHTML = '<p class="suave">Todavía no asignaste turnos en las próximas dos semanas.</p>'; return; }
      let dia = '', html = '';
      filas.forEach((t) => {
        const d = new Date(t.inicio), clave = d.toDateString();
        if (clave !== dia) { dia = clave; html += `<h3 class="sep">${esc(etiqueta(d))}</h3>`; }
        const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        html += `<div class="card item"><p class="m0"><b>${esc(hora)} · ${esc(t.titulo)}</b></p><p class="suave m0t">${esc(t.miembro)}</p><button type="button" class="btn sec chico" data-turdel="${esc(t.id)}">Quitar turno</button></div>`;
      });
      caja.innerHTML = html;
      caja.querySelectorAll('[data-turdel]').forEach((b) => b.addEventListener('click', async () => {
        if (!confirm('¿Quitar este turno?')) return;
        const rr = await prpc('turno_borrar', p, { p_id: b.dataset.turdel });
        const x = rr.ok ? primera(rr.data) : null;
        if (x && x.ok) { msg('Turno quitado.', true); cargar(); } else msg(TURNO_MOTIVO[x ? x.motivo : ''] || 'No se pudo quitar. Revisa tu conexión.', false);
      }));
    };
    $('#turGuardar').onclick = async () => {
      const titulo = ($('#turT').value || '').trim(), miembro = $('#turM').value, inicio = $('#turI').value;
      if (!titulo) return msg('Escribe qué servicio es.', false);
      if (!miembro) return msg('Elige a una persona.', false);
      if (!inicio) return msg('Elige cuándo es.', false);
      const btn = $('#turGuardar'); btn.disabled = true;
      const r = await prpc('turno_crear', p, { p_titulo: titulo, p_inicio: new Date(inicio).toISOString(), p_miembro: miembro });
      btn.disabled = false;
      const x = r.ok ? primera(r.data) : null;
      if (x && x.ok) { $('#turT').value = ''; msg('Turno asignado.', true); cargar(); }
      else msg(TURNO_MOTIVO[x ? x.motivo : ''] || 'No se pudo asignar. Revisa tu conexión.', false);
    };
    cargarPersonas(); cargar();
  }
  // F1042 · Mi calendario en vista de MES: cuadrícula con los días que tienen eventos. Al tocar un día, se ven sus eventos.
  async function pCalendarioMes(p, ref) {
    const primero = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const siguiente = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const nombreMes = primero.toLocaleDateString('es-CL', { month: 'long' });
    const mesTxt = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1) + ' ' + primero.getFullYear();
    const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    $('#pantalla').innerHTML = `${cabecera('Mes', 'Mi calendario')}
      <div class="cal-mes-nav"><button type="button" class="btn sec chico" id="calAnt" aria-label="Mes anterior">‹</button><h2 class="cal-mes-tit">${esc(mesTxt)}</h2><button type="button" class="btn sec chico" id="calSig" aria-label="Mes siguiente">›</button></div>
      <div class="cal-grid" role="grid" aria-label="${esc(mesTxt)}">${dias.map((d) => `<span class="cal-dia-n" aria-hidden="true">${d}</span>`).join('')}</div>
      <div id="calDia" class="lista sep16"><p class="suave">Toca un día para ver lo que tienes agendado.</p></div>`;
    volverA('Mi calendario', () => pCalendario(p));
    $('#calAnt').onclick = () => pCalendarioMes(p, new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
    $('#calSig').onclick = () => pCalendarioMes(p, new Date(ref.getFullYear(), ref.getMonth() + 1, 1));
    const r = await prpc('calendario_pastor_listar', p, { p_desde: primero.toISOString(), p_hasta: siguiente.toISOString() });
    // F1043 · Calendario mensual de servicios: los turnos asignados del mes aparecen con el nombre de quien sirve.
    const rt = await prpc('turno_pastor_listar', p, { p_desde: primero.toISOString(), p_hasta: siguiente.toISOString() });
    const eventos = r.ok ? (r.data || []) : [];
    const turnos = rt.ok ? (rt.data || []).map((t) => ({ tipo: 'turno', titulo: t.titulo, inicio: t.inicio, miembro: t.miembro })) : [];
    const porDia = {};
    eventos.concat(turnos).forEach((e) => { const k = new Date(e.inicio).getDate(); (porDia[k] = porDia[k] || []).push(e); });
    const vacios = (primero.getDay() + 6) % 7;
    const hoy = new Date();
    let celdas = '';
    for (let i = 0; i < vacios; i++) celdas += '<span class="cal-cel vacia" aria-hidden="true"></span>';
    const total = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
      const n = (porDia[d] || []).length, esHoy = hoy.getFullYear() === ref.getFullYear() && hoy.getMonth() === ref.getMonth() && hoy.getDate() === d;
      celdas += `<button type="button" class="cal-cel${n ? ' con' : ''}${esHoy ? ' hoy' : ''}" data-cald="${d}" aria-label="${d}${n ? ', ' + n + ' eventos' : ', sin eventos'}">${d}${n ? '<span class="cal-pt" aria-hidden="true"></span>' : ''}</button>`;
    }
    $('.cal-grid').insertAdjacentHTML('beforeend', celdas);
    if (!r.ok && !rt.ok) { $('#calDia').innerHTML = '<p class="suave">No pudimos abrir el mes. Revisa tu conexión.</p>'; return; }
    document.querySelectorAll('[data-cald]').forEach((b) => b.addEventListener('click', () => {
      const d = Number(b.dataset.cald), lista = porDia[d] || [];
      const fecha = new Date(ref.getFullYear(), ref.getMonth(), d);
      const etiq = fecha.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
      $('#calDia').innerHTML = `<h3 class="sep">${esc(etiq)}</h3>` + (lista.length ? lista.map((e) => e.tipo === 'turno'
        ? `<div class="card item"><p class="m0"><b>${esc(new Date(e.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))} · ${esc(e.titulo)}</b></p><p class="suave m0t">Sirve: <b>${esc(e.miembro)}</b></p></div>`
        : `<div class="card item"><p class="m0"><b>${esc(new Date(e.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))} · ${esc(e.titulo)}</b></p><p class="suave m0t">${esc((CAL_TIPOS.find((t) => t[0] === e.tipo) || [0, 'Personal'])[1])}${e.detalle ? ' · ' + esc(e.detalle) : ''}</p></div>`).join('') : '<p class="suave">Nada agendado este día.</p>');
    }));
  }
  // F1046 · ATENDER NUEVOS MIEMBROS: seguimiento de las primeras 4 semanas (contacto, visita, grupo, oración). Requiere 20_SQL_F1046_BIENVENIDA.sql.
  const BIEN_PASOS = [['contacto', 'Lo contacté'], ['visita', 'Lo visité'], ['grupo', 'Lo invité a un grupo'], ['oracion', 'Oré por él o ella']];
  const BIEN_MOTIVO = { 'sin-permiso': 'No pudimos confirmar tu clave de pastor. Revisa tu conexión.', 'miembro-invalido': 'Elige a una persona de tu iglesia.', 'paso-invalido': 'Ese paso no existe.', 'demasiados': 'Agregaste muchas personas en poco tiempo. Espera una hora.', 'no-existe': 'Esa persona ya no está en el seguimiento.' };
  async function pBienvenida(p) {
    const msg = (t, ok) => { const m = $('#bieMsg'); if (m) { m.textContent = t; m.className = ok ? 'ok suave' : 'suave'; } };
    $('#pantalla').innerHTML = `${cabecera('Bienvenida', 'Mi iglesia')}<p class="suave">Las primeras cuatro semanas importan. Marca lo que ya hiciste con cada persona nueva. Solo lo ves tú.</p>
      <div class="card"><label for="bieM">Agregar a una persona nueva</label><select id="bieM"><option value="">Cargando personas…</option></select>
        <button type="button" class="btn" id="bieAgregar">Empezar su seguimiento</button></div>
      <p class="suave" id="bieMsg" role="status"></p>
      <h2 class="sep">Seguimiento</h2><div id="bieLista" class="lista"><p class="suave">Cargando…</p></div>`;
    volverA('Mi iglesia', vistaPastor);
    const cargar = async () => {
      const r = await prpc('bienvenida_listar', p);
      const caja = $('#bieLista'); if (!caja) return;
      if (!r.ok) { caja.innerHTML = '<p class="suave">No pudimos abrir el seguimiento. Revisa tu conexión.</p>'; return; }
      const filas = r.data || [];
      if (!filas.length) { caja.innerHTML = '<p class="suave">Todavía no empezaste el seguimiento de nadie. Elige a una persona nueva arriba.</p>'; return; }
      caja.innerHTML = filas.map((f) => {
        const dias = Math.floor((Date.now() - new Date(f.iniciado).getTime()) / 86400000);
        const semana = Math.min(4, Math.floor(dias / 7) + 1);
        const pasos = BIEN_PASOS.map((x) => { const on = !!f[x[0]]; return `<button type="button" class="chip${on ? ' on' : ''}" data-bpm="${esc(f.miembro_id)}" data-bpp="${x[0]}" data-bph="${on ? '0' : '1'}" aria-pressed="${on}">${esc(x[1])}</button>`; }).join('');
        return `<div class="card item"><p class="m0"><b>${esc(f.nombre)}</b></p><p class="suave m0t">${dias > 28 ? 'Más de 4 semanas desde que llegó' : 'Semana ' + semana + ' de 4'}</p><div class="chips" role="group" aria-label="Pasos con ${esc(f.nombre)}">${pasos}</div></div>`;
      }).join('');
      caja.querySelectorAll('[data-bpm]').forEach((b) => b.addEventListener('click', async () => {
        const rr = await prpc('bienvenida_marcar', p, { p_miembro: b.dataset.bpm, p_paso: b.dataset.bpp, p_hecho: b.dataset.bph === '1' });
        const x = rr.ok ? primera(rr.data) : null;
        if (x && x.ok) cargar(); else msg(BIEN_MOTIVO[x ? x.motivo : ''] || 'No se pudo guardar. Revisa tu conexión.', false);
      }));
    };
    const personas = async () => {
      const r = await prpc('miembros_servicio_listar', p); const sel = $('#bieM'); if (!sel) return;
      const f = r.ok ? (r.data || []) : [];
      sel.innerHTML = f.length ? '<option value="">Elige una persona</option>' + f.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('') : '<option value="">Aún no hay personas en tu iglesia</option>';
    };
    $('#bieAgregar').onclick = async () => {
      const m = $('#bieM').value; if (!m) return msg('Elige a una persona.', false);
      const rr = await prpc('bienvenida_iniciar', p, { p_miembro: m });
      const x = rr.ok ? primera(rr.data) : null;
      if (x && x.ok) { msg('Seguimiento empezado.', true); cargar(); } else msg(BIEN_MOTIVO[x ? x.motivo : ''] || 'No se pudo empezar. Revisa tu conexión.', false);
    };
    personas(); cargar();
  }
  // F1051 · CHAT de la iglesia: tres espacios (iglesia completa, pastor y lideres, directo pastor-miembro). Requiere 23_SQL_F1051_CHAT_IGLESIA.sql.
  const CHAT_CAT = [['preguntas', 'Pregunta'], ['oracion', 'Oración'], ['ayuda', 'Ayuda'], ['servicio', 'Servicio'], ['avisos', 'Aviso'], ['reunion', 'Reunión']];
  const CHAT_MOT = { 'sin-permiso': 'Tu acceso a este espacio no lo permite.', 'texto-invalido': 'Escribe un mensaje de 1 a 1000 letras.', 'categoria-invalida': 'Elige una categoría.', 'demasiados': 'Has enviado muchos mensajes en poco tiempo. Espera un momento.', 'no-existe': 'Eso ya no está disponible.', 'titulo-invalido': 'Escribe un título de 2 a 80 letras.', 'fecha-invalida': 'Elige cuándo es la reunión.', 'miembro-invalido': 'Elige a una persona de tu iglesia.' };
  const chatQ = (x) => (x.rol === 'pastor' ? { p_codigo: x.codigo, p_clave: null, p_secreto: x.secreto } : { p_codigo: x.codigo, p_clave: x.clave, p_secreto: null });
  const chatSala = (sala) => 'https://meet.jit.si/' + encodeURIComponent(sala);
  const chatMot = (r) => { const x = r && r.ok ? primera(r.data) : null; return x && x.ok ? null : (CHAT_MOT[x ? x.motivo : ''] || 'No se pudo completar. Revisa tu conexión.'); };
  async function vistaChat(x, canal) {
    const q = chatQ(x), esPastor = x.rol === 'pastor';
    if (!esPastor && x.esLider === undefined) {   // el miembro que lidera un ministerio puede crear reuniones con el pastor
      const mm = await misMinisterios({ codigo: x.codigo, clave: x.clave });
      x.esLider = !!(mm.ok && mm.lista.some((z) => z.es_lider));
    }
    if (!canal) {
      const volver = esPastor ? vistaPastor : vistaIglesia;
      $('#pantalla').innerHTML = `${cabecera('Chat de mi iglesia', esPastor ? 'Panel' : 'Mi iglesia')}<p class="suave">Un espacio para bendecir, unirnos y organizar. Aquí no se resuelven conflictos: para eso, habla en persona o en privado con el pastor.</p>
        <div id="chMsg" class="suave" role="status"></div><div id="chLista" class="lista"><p class="suave">Cargando…</p></div>
        ${esPastor ? '<button type="button" class="btn sec" id="chNuevo">Nueva conversación con una persona</button><div id="chPersona" class="lista" hidden></div>' : '<button type="button" class="btn sec" id="chPrivado">Hablar en privado con mi pastor</button>'}`;
      volverA(esPastor ? 'Panel' : 'Mi iglesia', volver);
      const abrir = (c) => vistaChat(x, c);
      const r = await rpcRaw('chat_canales_listar', q);
      const caja = $('#chLista'); if (!caja) return;
      if (!r.ok) { caja.innerHTML = '<p class="suave">No pudimos abrir el chat. Revisa tu conexión.</p>'; }
      else {
        const c = r.data || [];
        caja.innerHTML = c.length ? c.map((k) => `<button type="button" class="fila" data-chc="${esc(k.id)}"><span class="fila-txt">${esc(k.tipo === 'directo' ? k.directo_nombre || k.nombre : k.nombre)}<small>${k.tipo === 'iglesia' ? 'Toda la iglesia' : k.tipo === 'lideres' ? 'Pastor y líderes: reuniones y organización' : 'Conversación privada'}</small></span><span class="flecha" aria-hidden="true">›</span></button>`).join('') : '<p class="suave">Aún no hay conversaciones.</p>';
        caja.querySelectorAll('[data-chc]').forEach((b) => b.addEventListener('click', () => abrir(c.find((k) => k.id === b.dataset.chc))));
      }
      const pv = $('#chPrivado');
      if (pv) pv.onclick = async () => { const rr = await rpcRaw('chat_directo_abrir', Object.assign({}, q, { p_miembro: null })); const e = chatMot(rr); if (e) { $('#chMsg').textContent = e; return; } const ok = primera(rr.data); const c2 = await rpcRaw('chat_canales_listar', q); const k = (c2.data || []).find((z) => z.id === ok.canal_id); if (k) abrir(k); };
      const nv = $('#chNuevo');
      if (nv) nv.onclick = async () => {
        const box = $('#chPersona'); box.hidden = false; box.innerHTML = '<p class="suave">Cargando personas…</p>';
        const rp = await rpcRaw('miembros_servicio_listar', { p_codigo: x.codigo, p_secreto: x.secreto });
        box.innerHTML = (rp.ok ? (rp.data || []) : []).map((m) => `<button type="button" class="fila" data-chm="${esc(m.id)}"><span class="fila-txt">${esc(m.nombre)}</span><span class="flecha" aria-hidden="true">›</span></button>`).join('') || '<p class="suave">No hay personas para mostrar.</p>';
        box.querySelectorAll('[data-chm]').forEach((b) => b.addEventListener('click', async () => {
          const rr = await rpcRaw('chat_directo_abrir', Object.assign({}, q, { p_miembro: b.dataset.chm }));
          const e = chatMot(rr); if (e) { $('#chMsg').textContent = e; return; }
          const c2 = await rpcRaw('chat_canales_listar', q); const k = (c2.data || []).find((z) => z.id === primera(rr.data).canal_id); if (k) abrir(k);
        }));
      };
      return;
    }
    // ----- dentro de un canal -----
    const puedeVideo = esPastor ? canal.tipo !== 'iglesia' : (x.esLider && canal.tipo === 'lideres');
    const normas = canal.normas ? `<div class="card chat-normas"><b>Normas de este espacio</b><p class="m0t">${esc(canal.normas)}</p></div>` : '';
    const privadoBtn = (!esPastor && canal.tipo === 'iglesia') ? '<button type="button" class="btn sec chico" id="chDirecto">Hablar en privado con mi pastor</button>' : '';
    const pastorTools = esPastor ? `<div class="cr-acc"><button type="button" class="btn sec chico" id="chNormas">Editar normas</button><button type="button" class="btn sec chico" id="chLimpiar">Limpiar historial</button><button type="button" class="btn sec chico" id="chDenuncias">Ver denuncias</button></div><div id="chPanel" hidden></div>` : '';
    const videoBox = puedeVideo ? `<div class="cr-acc"><button type="button" class="btn sec chico" id="chVideo">Crear reunión por video</button></div><div id="chVideoForm" class="card" hidden><label for="chVT">Título de la reunión</label><input id="chVT" type="text" maxlength="80"><label for="chVI">Cuándo</label><input id="chVI" type="datetime-local" value="${aLocal(new Date())}"><button type="button" class="btn" id="chVG">Crear y compartir</button></div><div id="chReuniones" class="lista"></div>` : '';
    $('#pantalla').innerHTML = `${cabecera(canal.tipo === 'directo' ? (canal.directo_nombre || canal.nombre) : canal.nombre, 'Chat')}${normas}${privadoBtn}${pastorTools}${videoBox}
      <p class="suave" id="chMsg" role="status"></p><div id="chHilo" class="chat-hilo" aria-live="polite"><p class="suave">Cargando mensajes…</p></div>
      <div class="card chat-escribir"><label for="chCat">Tipo de mensaje</label><select id="chCat">${CHAT_CAT.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join('')}</select>
        <label for="chTxt">Escribe con cariño</label><textarea id="chTxt" rows="2" maxlength="1000"></textarea><button type="button" class="btn" id="chEnviar">Enviar</button></div>`;
    volverA('Chat', () => vistaChat(x));
    const msg = (t, ok) => { const m = $('#chMsg'); if (m) { m.textContent = t; m.className = ok ? 'ok suave' : 'suave'; } };
    const cargarHilo = async () => {
      const r = await rpcRaw('chat_mensajes_listar', Object.assign({}, q, { p_canal: canal.id }));
      const h = $('#chHilo'); if (!h) return;
      if (!r.ok) { h.innerHTML = '<p class="suave">No pudimos cargar los mensajes.</p>'; return; }
      const l = r.data || [];
      h.innerHTML = l.length ? l.map((m) => `<article class="chat-msg${m.es_mio ? ' mio' : ''}${m.oculto ? ' oculto' : ''}"><p class="chat-quien"><b>${esc(m.autor_nombre)}</b> <span class="etiqueta">${esc(m.autor_rol === 'pastor' ? 'Pastor' : m.autor_rol === 'lider' ? 'Líder' : 'Miembro')}</span> <small class="suave">${esc(new Date(m.creado_en).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small></p><p class="chat-txt">${m.texto === null ? '<em>Mensaje oculto por el pastor.</em>' : esc(m.texto)}</p><div class="cr-acc">${!m.es_mio ? `<button type="button" class="btn sec chico" data-denu="${esc(m.id)}">Denunciar</button>` : ''}${esPastor ? `<button type="button" class="btn sec chico" data-ocu="${esc(m.id)}" data-val="${m.oculto ? '0' : '1'}">${m.oculto ? 'Mostrar' : 'Ocultar'}</button>` : ''}</div></article>`).join('') : '<p class="suave">Todavía no hay mensajes. Sé el primero en bendecir.</p>';
      h.querySelectorAll('[data-denu]').forEach((b) => b.addEventListener('click', async () => {
        const motivo = prompt('¿Qué pasó? (opcional, una frase)') || '';
        const rr = await rpcRaw('chat_reportar', Object.assign({}, q, { p_mensaje: b.dataset.denu, p_motivo: motivo }));
        msg(chatMot(rr) || 'Gracias. Tu denuncia llegó al pastor.', !chatMot(rr));
      }));
      h.querySelectorAll('[data-ocu]').forEach((b) => b.addEventListener('click', async () => {
        const rr = await rpcRaw('chat_mensaje_ocultar', { p_codigo: x.codigo, p_secreto: x.secreto, p_mensaje: b.dataset.ocu, p_ocultar: b.dataset.val === '1' });
        if (chatMot(rr)) msg(chatMot(rr)); else cargarHilo();
      }));
    };
    $('#chEnviar').onclick = async () => {
      const t = ($('#chTxt').value || '').trim();
      if (!t) return msg('Escribe un mensaje antes de enviar.');
      const btn = $('#chEnviar'); btn.disabled = true;
      const rr = await rpcRaw('chat_mensajes_enviar', Object.assign({}, q, { p_canal: canal.id, p_categoria: $('#chCat').value, p_texto: t }));
      btn.disabled = false;
      const e = chatMot(rr);
      if (e) return msg(e);
      $('#chTxt').value = ''; msg('Enviado.', true); cargarHilo();
    };
    const dc = $('#chDirecto');
    if (dc) dc.onclick = async () => { const rr = await rpcRaw('chat_directo_abrir', Object.assign({}, q, { p_miembro: null })); if (chatMot(rr)) return msg(chatMot(rr)); const c2 = await rpcRaw('chat_canales_listar', q); const k = (c2.data || []).find((z) => z.id === primera(rr.data).canal_id); if (k) vistaChat(x, k); };
    if (esPastor) {
      $('#chNormas').onclick = () => { const pn = $('#chPanel'); pn.hidden = false; pn.innerHTML = `<label for="chN">Normas de este espacio (400 letras)</label><textarea id="chN" rows="3" maxlength="400">${esc(canal.normas || '')}</textarea><button type="button" class="btn" id="chNG">Guardar normas</button>`; $('#chNG').onclick = async () => { const rr = await rpcRaw('chat_normas_fijar', { p_codigo: x.codigo, p_secreto: x.secreto, p_canal: canal.id, p_normas: $('#chN').value }); if (chatMot(rr)) msg(chatMot(rr)); else { canal.normas = $('#chN').value.trim() || null; msg('Normas guardadas.', true); vistaChat(x, canal); } }; };
      $('#chLimpiar').onclick = async () => { if (!confirm('¿Borrar todo el historial de este espacio? Esto no se puede deshacer.')) return; const rr = await rpcRaw('chat_historial_limpiar', { p_codigo: x.codigo, p_secreto: x.secreto, p_canal: canal.id }); if (chatMot(rr)) msg(chatMot(rr)); else { msg('Historial borrado.', true); cargarHilo(); } };
      $('#chDenuncias').onclick = async () => {
        const pn = $('#chPanel'); pn.hidden = false; pn.innerHTML = '<p class="suave">Cargando denuncias…</p>';
        const rr = await rpcRaw('chat_reportes_listar', { p_codigo: x.codigo, p_secreto: x.secreto });
        const l = rr.ok ? (rr.data || []) : [];
        pn.innerHTML = l.length ? l.map((d) => `<div class="card item"><p class="m0"><b>${esc(d.autor_nombre)}</b>: ${esc(d.texto || '(mensaje oculto)')}</p><p class="suave m0t">${d.motivo ? 'Motivo: ' + esc(d.motivo) : 'Sin motivo'} · ${d.revisado ? 'Revisada' : 'Pendiente'}</p>${d.revisado ? '' : `<button type="button" class="btn sec chico" data-rev="${esc(d.id)}">Marcar como revisada</button>`}</div>`).join('') : '<p class="suave">No hay denuncias.</p>';
        pn.querySelectorAll('[data-rev]').forEach((b) => b.addEventListener('click', async () => { await rpcRaw('chat_reporte_revisar', { p_codigo: x.codigo, p_secreto: x.secreto, p_reporte: b.dataset.rev }); $('#chDenuncias').click(); }));
      };
    }
    if (puedeVideo) {
      const cargarReuniones = async () => { const r = await rpcRaw('chat_llamadas_listar', Object.assign({}, q, { p_canal: canal.id })); const c = $('#chReuniones'); if (!c) return; const l = r.ok ? (r.data || []) : []; c.innerHTML = l.length ? l.map((k) => `<div class="card item"><p class="m0"><b>${esc(k.titulo)}</b></p><p class="suave m0t">${esc(new Date(k.inicio).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))} · ${esc(k.creado_por)}</p><button type="button" class="btn sec chico" data-entrar="${esc(chatSala(k.sala))}">Entrar a la reunión</button></div>`).join('') : '<p class="suave">No hay reuniones próximas.</p>'; c.querySelectorAll('[data-entrar]').forEach((b) => b.addEventListener('click', () => window.open(b.dataset.entrar, '_blank', 'noopener'))); };
      $('#chVideo').onclick = () => { const f = $('#chVideoForm'); f.hidden = !f.hidden; };
      $('#chVG').onclick = async () => {
        const rr = await rpcRaw('chat_llamada_crear', Object.assign({}, q, { p_canal: canal.id, p_titulo: $('#chVT').value.trim(), p_inicio: $('#chVI').value ? new Date($('#chVI').value).toISOString() : null }));
        const e = chatMot(rr); if (e) return msg(e);
        const sala = primera(rr.data).sala; const link = chatSala(sala);
        $('#chVideoForm').hidden = true; msg('Reunión creada. Compártela en este espacio para que llegue a todos.', true);
        const enlaceTxt = `Reunión por video: ${$('#chVT').value.trim() || 'reunión'}. Entrar: ${link}`;
        if (navigator.share) { try { await navigator.share({ title: 'Reunión', text: enlaceTxt }); } catch (e2) { /* cancelado */ } }
        else { try { await navigator.clipboard.writeText(enlaceTxt); msg('Reunión creada. El enlace se copió: pégalo en el chat para compartirlo.', true); } catch (e3) { msg('Reunión creada. Enlace: ' + link, true); } }
        cargarReuniones();
      };
      cargarReuniones();
    }
    cargarHilo();
  }
  // F1033 · Disponibilidad de los miembros, para organizar turnos. Requiere 16_SQL_F1033_DISPONIBILIDAD.sql.
  async function pDisponibilidad(p) {
    const NOMB = { entre: 'Entre semana', fin: 'Fines de semana', manana: 'Mañanas', tarde: 'Tardes', noche: 'Noches' };
    $('#pantalla').innerHTML = `${cabecera('Disponibilidad', 'Panel')}<p class="suave">Quiénes pueden servir y cuándo. Lo marcan los miembros desde su panel.</p><div id="dispLista" class="lista"><p class="suave">Cargando…</p></div><button type="button" class="btn sec sep16" id="verTurnos">Asignar turnos de servicio</button>`;
    volverA('Panel', vistaPastor);
    $('#verTurnos').onclick = () => pTurnos(p);
    const r = await prpc('disponibilidad_pastor_listar', p);
    const caja = $('#dispLista'); if (!caja) return;
    if (!r.ok) { caja.innerHTML = '<p class="suave">No pudimos cargar la disponibilidad. Revisa tu conexión.</p>'; return; }
    const filas = r.data || [];
    caja.innerHTML = filas.length ? filas.map((f) => `<div class="card item"><b>${esc(f.miembro)}</b><p class="suave m0t">${(f.franjas || []).map((x) => esc(NOMB[x] || x)).join(' · ')}</p></div>`).join('') : '<p class="suave">Todavía nadie marcó cuándo puede servir.</p>';
  }
  // F1039 · Turnos de un ministerio que yo lidero. Requiere 18_SQL_F1039_TURNOS_LIDERES.sql.
  async function vistaTurnosLider(id, min) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hasta = new Date(hoy.getTime() + 14 * 86400000);
    const etiqueta = (d) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const base = { p_codigo: id.codigo, p_clave: id.clave, p_ministerio: min.id };
    const msg = (t, ok) => { const m = $('#tlMsg'); if (m) { m.textContent = t; m.className = ok ? 'ok suave' : 'suave'; } };
    const MOT = { 'sin-permiso': 'Solo los líderes de este ministerio pueden hacerlo.', 'titulo-invalido': 'Escribe un título de 2 a 80 letras.', 'fecha-invalida': 'Elige cuándo es el servicio.', 'miembro-invalido': 'Elige a una persona de la iglesia.', 'demasiados': 'Asignaste muchos turnos en poco tiempo. Espera una hora.', 'no-existe': 'Ese turno ya no existe.' };
    $('#pantalla').innerHTML = `${cabecera('Turnos · ' + min.nombre, 'Mi iglesia')}<p class="suave">Asigna un servicio a una persona de tu ministerio.</p>
      <div class="card"><label for="tlT">¿Qué servicio es?</label><input id="tlT" type="text" maxlength="80" placeholder="Ej.: Ayudar en la entrada">
        <label for="tlM">¿Quién sirve?</label><select id="tlM"><option value="">Cargando personas…</option></select>
        <label for="tlI">Cuándo</label><input id="tlI" type="datetime-local" value="${aLocal(new Date())}">
        <button type="button" class="btn" id="tlGuardar">Asignar turno</button></div>
      <p class="suave" id="tlMsg" role="status"></p>
      <h2 class="sep">Próximos 14 días</h2><div id="tlLista" class="lista"><p class="suave">Cargando…</p></div>`;
    volverA('Mi iglesia', vistaIglesia);
    const personas = async () => {
      const r = await rpcRaw('miembros_turno_listar', base); const sel = $('#tlM'); if (!sel) return;
      const f = r.ok ? (r.data || []) : [];
      sel.innerHTML = f.length ? '<option value="">Elige una persona</option>' + f.map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('') : '<option value="">No pudimos cargar las personas</option>';
    };
    const cargar = async () => {
      const r = await rpcRaw('turno_lider_listar', Object.assign({}, base, { p_desde: hoy.toISOString(), p_hasta: hasta.toISOString() }));
      const c = $('#tlLista'); if (!c) return;
      if (!r.ok) { c.innerHTML = '<p class="suave">No pudimos abrir los turnos. Revisa tu conexión.</p>'; return; }
      const f = r.data || [];
      if (!f.length) { c.innerHTML = '<p class="suave">Todavía no hay turnos de este ministerio en las próximas dos semanas.</p>'; return; }
      let dia = '', html = '';
      f.forEach((t) => {
        const d = new Date(t.inicio), clave = d.toDateString();
        if (clave !== dia) { dia = clave; html += `<h3 class="sep">${esc(etiqueta(d))}</h3>`; }
        html += `<div class="card item"><p class="m0"><b>${esc(d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))} · ${esc(t.titulo)}</b></p><p class="suave m0t">${esc(t.miembro)}</p><button type="button" class="btn sec chico" data-tldel="${esc(t.id)}">Quitar turno</button></div>`;
      });
      c.innerHTML = html;
      c.querySelectorAll('[data-tldel]').forEach((b) => b.addEventListener('click', async () => {
        if (!confirm('¿Quitar este turno?')) return;
        const rr = await rpcRaw('turno_lider_borrar', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.dataset.tldel });
        const x = rr.ok ? primera(rr.data) : null;
        if (x && x.ok) { msg('Turno quitado.', true); cargar(); } else msg(MOT[x ? x.motivo : ''] || 'No se pudo quitar. Revisa tu conexión.', false);
      }));
    };
    $('#tlGuardar').onclick = async () => {
      const titulo = ($('#tlT').value || '').trim(), miembro = $('#tlM').value, inicio = $('#tlI').value;
      if (!titulo) return msg('Escribe qué servicio es.', false);
      if (!miembro) return msg('Elige a una persona.', false);
      if (!inicio) return msg('Elige cuándo es.', false);
      const btn = $('#tlGuardar'); btn.disabled = true;
      const r = await rpcRaw('turno_lider_crear', Object.assign({}, base, { p_titulo: titulo, p_inicio: new Date(inicio).toISOString(), p_miembro: miembro }));
      btn.disabled = false;
      const x = r.ok ? primera(r.data) : null;
      if (x && x.ok) { $('#tlT').value = ''; msg('Turno asignado.', true); cargar(); }
      else msg(MOT[x ? x.motivo : ''] || 'No se pudo asignar. Revisa tu conexión.', false);
    };
    personas(); cargar();
  }
  const pCab = (tit, extra) => `${cabecera(tit, 'Panel')}${extra || ''}<p class="suave" id="pmsg">Cargando…</p><div id="plista"></div>`;
  async function pSolicitudes(p) {
    $('#pantalla').innerHTML = pCab('Solicitudes'); volverA('Panel', vistaPastor);
    const r = await prpc('solicitud_pastor_listar', p), m = $('#pmsg'); if (!m) return;
    if (!r.ok) { m.textContent = errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length ? 'Personas que piden unirse. Confirma que las conoces antes de aprobar.' : 'No hay solicitudes pendientes. 🎉';
    $('#plista').innerHTML = l.map((s) => `<div class="card item"><div class="t"><span aria-hidden="true">${svg('persona', 20)}</span>${esc(s.nombre_visible)}</div>${s.nombre_completo ? `<p class="m0t">${esc(s.nombre_completo)}</p>` : ''}${s.nota ? `<p class="suave m0t">«${esc(s.nota)}»</p>` : ''}<p class="suave m0t">${esc(fecha(s.creado_en))}</p><div class="fab-acc"><button type="button" class="btn chico" data-ap="${esc(s.id)}">Aprobar</button><button type="button" class="btn sec chico" data-re="${esc(s.id)}">Rechazar</button></div></div>`).join('');
    const resolver = (id, si) => async () => { const r2 = await prpc('solicitud_pastor_resolver', p, { p_id: id, p_aprobar: si, p_mensaje: si ? 'Bienvenido a la iglesia' : null }); const x = r2.ok ? r2.data : null; if (x === 'aprobada' || x === 'rechazada' || x === 'no-existe') return pSolicitudes(p); m.textContent = x === 'iglesia-llena' ? 'La iglesia llegó a su límite de personas.' : errTxt(r2.error); };
    document.querySelectorAll('[data-ap]').forEach((b) => b.addEventListener('click', resolver(b.dataset.ap, true)));
    document.querySelectorAll('[data-re]').forEach((b) => b.addEventListener('click', () => { if (confirm('¿Rechazar esta solicitud?')) resolver(b.dataset.re, false)(); }));
  }
  async function pMiembros(p) {
    $('#pantalla').innerHTML = pCab('Miembros'); volverA('Panel', vistaPastor);
    const r = await prpc('miembros_pastor_listar', p), m = $('#pmsg'); if (!m) return;
    if (!r.ok) { m.textContent = errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length + (l.length === 1 ? ' persona en tu iglesia.' : ' personas en tu iglesia.');
    $('#plista').innerHTML = `<div class="lista">${l.map((x) => `<div class="fila">${avatarHTML(x.nombre_visible, { g: (x.nombre_visible || '').length % 8, e: '' }, false).replace('class="avatar', 'class="avatar mini')}<span class="fila-txt">${esc(x.nombre_visible)}<small>Desde ${esc(mesAnio(x.creado_en))}</small></span></div>`).join('')}</div>`;
  }
  // F947 · Muro para el pastor: ve lo que compartió y cuántas personas oran (solo un número; nadie ve quién).
  async function pMuro(p) {
    $('#pantalla').innerHTML = `${cabecera('Muro', 'Perfil')}<p class="suave" id="pmsg">Cargando…</p><div id="muro"></div>`; volverA('Perfil', vistaPerfil);
    let r = await rpcRaw('peticion_muro', { p_codigo: p.codigo, p_secreto: p.secreto });
    if (!r.ok) r = await rpcRaw('peticion_muro', { p_codigo: p.codigo, p_clave: p.secreto });
    let l = r.ok && Array.isArray(r.data) ? r.data : null;
    if (!l) { let q = await prpc('peticion_pastor_listar_v2', p); if (!q.ok && q.falta) q = await prpc('peticion_pastor_listar', p); l = q.ok ? (q.data || []).filter((x) => x.publica) : null; }
    const m = $('#pmsg'), caja = $('#muro'); if (!m || !caja) return;
    if (!l) { m.textContent = 'No se pudo abrir el muro ahora. Revisa tu conexión e inténtalo otra vez.'; return; }
    m.textContent = l.length ? 'Peticiones que compartiste con tu iglesia. Para compartir otra, ve a Oraciones.' : 'Aún no hay peticiones compartidas. Desde Oraciones puedes compartir las que quieras.';
    caja.innerHTML = l.map((x) => `<div class="card item muro-card"><div class="muro-cab"><span class="muro-ini" aria-hidden="true">${esc((x.nombre || '🙏').trim().charAt(0).toUpperCase())}</span><span><b>${esc(x.nombre || 'Alguien de tu iglesia')}</b></span></div><p class="muro-txt">${esc(x.texto)}</p>${x.orando != null ? `<p class="suave m0t">${svg('corazon', 16)} ${Math.max(0, Number(x.orando) || 0)} ${Number(x.orando) === 1 ? 'persona ora' : 'personas oran'}</p>` : ''}</div>`).join('');
  }
  async function pOraciones(p) {
    $('#pantalla').innerHTML = pCab('Oraciones'); volverA('Panel', vistaPastor);
    let r = await prpc('peticion_pastor_listar_v2', p); if (!r.ok && r.falta) r = await prpc('peticion_pastor_listar', p);
    const m = $('#pmsg'); if (!m) return; if (!r.ok) { m.textContent = errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length ? 'Peticiones nuevas. Al marcarlas, la persona ve que las viste.' : 'No hay peticiones nuevas.';
    $('#plista').innerHTML = l.map((x) => `<div class="card item"><div class="t"><span aria-hidden="true">${svg('paloma', 20)}</span>${x.anonima ? 'Anónima' : esc(x.nombre || 'Sin nombre')}${x.tipo ? `<span class="etiqueta">${esc(x.tipo)}</span>` : ''}</div><p class="m0t">${esc(x.texto)}</p><p class="suave m0t">${esc(fecha(x.creado_en))}${x.publica ? ' · quiere que se comparta en el muro' : ''}</p><div class="fab-acc"><button type="button" class="btn chico" data-vi="${esc(x.id)}">Ya la vi</button>${x.publica && !x.aprobada ? `<button type="button" class="btn sec chico" data-pu="${esc(x.id)}" data-an="${x.anonima ? 1 : 0}">Compartir en el muro</button>` : ''}</div></div>`).join('');
    document.querySelectorAll('[data-vi]').forEach((b) => b.addEventListener('click', async () => { await prpc('peticion_pastor_marcar_vista', p, { p_id: b.dataset.vi }); pOraciones(p); }));
    // F1048 · Seguimiento de cada petición: recibida, en oración o atendida (lo ve solo el pastor). Requiere 21_SQL_F1048_PETICIONES_SEGUIMIENTO.sql.
    const PET_ESTADOS = [['recibida', 'Recibida'], ['en_oracion', 'En oración'], ['atendida', 'Atendida']];
    const qe = await prpc('peticion_seguimiento_listar', p);
    const est = {}; if (qe.ok) (qe.data || []).forEach((e) => { est[e.peticion_id] = e.estado; });
    document.querySelectorAll('#plista .card').forEach((c, i) => {
      const x = l[i]; if (!x || !x.id) return;
      const actual = est[x.id] || 'recibida';
      const caja = document.createElement('div'); caja.className = 'pet-seg'; caja.setAttribute('role', 'group'); caja.setAttribute('aria-label', 'Seguimiento de la petición');
      caja.innerHTML = PET_ESTADOS.map(([k, t]) => '<button type="button" class="chip' + (actual === k ? ' on' : '') + '" data-pes="' + k + '" data-pid="' + esc(x.id) + '" aria-pressed="' + (actual === k) + '">' + t + '</button>').join('');
      c.appendChild(caja);
    });
    document.querySelectorAll('[data-pes]').forEach((b) => b.addEventListener('click', async () => {
      const rr = await prpc('peticion_seguimiento_fijar', p, { p_peticion: b.dataset.pid, p_estado: b.dataset.pes });
      const x = rr.ok ? primera(rr.data) : null;
      if (x && x.ok) pOraciones(p); else m.textContent = 'No se pudo guardar el seguimiento. Revisa tu conexión.';
    }));
    document.querySelectorAll('[data-pu]').forEach((b) => b.addEventListener('click', async () => { await prpc('peticion_pastor_publicar', p, { p_id: b.dataset.pu, p_ocultar_nombre: b.dataset.an === '1' }); await prpc('peticion_pastor_marcar_vista', p, { p_id: b.dataset.pu }); pOraciones(p); }));
  }
  const ESTADO_V = { solicitada: 'Nueva', aceptada: 'Aceptada', agendada: 'Agendada', realizada: 'Realizada', no_disponible: 'No disponible' };
  async function pVisitas(p) {
    $('#pantalla').innerHTML = pCab('Visitas'); volverA('Panel', vistaPastor);
    const r = await prpc('visita_pastor_listar', p), m = $('#pmsg'); if (!m) return; if (!r.ok) { m.textContent = errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length ? 'Pedidos de visita. La dirección aparece cuando aceptas.' : 'No hay pedidos de visita abiertos.';
    $('#plista').innerHTML = l.map((v) => `<div class="card item"><div class="t"><span aria-hidden="true">${svg('gente', 20)}</span>${esc(v.nombre || 'Sin nombre')}<span class="etiqueta">${esc(ESTADO_V[v.estado] || v.estado)}</span></div><p class="m0t"><b>${esc(v.tipo)}</b>${v.urgencia ? ' · ' + esc(v.urgencia) : ''}</p><p class="m0t">${esc(v.motivo)}</p>${v.horarios ? `<p class="suave m0t">${svg('reloj', 16)} ${esc(v.horarios)}</p>` : ''}${v.telefono ? `<p class="suave m0t">${svg('telefono', 16)} ${esc(v.telefono)}</p>` : ''}${v.direccion ? `<p class="suave m0t">${svg('lugar', 16)} ${esc(v.direccion)}</p>` : ''}
      <label for="vr-${esc(v.id)}">Mensaje para la persona</label><input id="vr-${esc(v.id)}" type="text" maxlength="200" value="${esc(v.respuesta || '')}"><label for="vc-${esc(v.id)}">Cuándo (si agendas)</label><input id="vc-${esc(v.id)}" type="text" maxlength="60" value="${esc(v.cuando || '')}" placeholder="Sábado 5 pm">
      <div class="fab-acc"><button type="button" class="btn chico" data-ve="aceptada" data-id="${esc(v.id)}">Aceptar</button><button type="button" class="btn sec chico" data-ve="agendada" data-id="${esc(v.id)}">Agendar</button><button type="button" class="btn sec chico" data-ve="realizada" data-id="${esc(v.id)}">Realizada</button><button type="button" class="btn sec chico" data-ve="no_disponible" data-id="${esc(v.id)}">No puedo</button></div></div>`).join('');
    document.querySelectorAll('[data-ve]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.dataset.id, cu = $('#vc-' + id).value.trim();
      if (b.dataset.ve === 'agendada' && !cu) return (m.textContent = 'Escribe cuándo será la visita para agendarla.');
      const r2 = await prpc('visita_pastor_responder', p, { p_id: id, p_estado: b.dataset.ve, p_respuesta: $('#vr-' + id).value.trim() || null, p_cuando: cu || null });
      r2.ok && r2.data ? pVisitas(p) : (m.textContent = errTxt(r2.error));
    }));
  }
  const ICONOS_MIN = ['👥', '🎵', '👶', '🧒', '📖', '🙏', '🤝', '🍞', '🎤', '🎬', '💒', '🌱'], COLORES_MIN = ['#4f8a5b', '#b8893a', '#4a7fb0', '#c4604a', '#7a55b0', '#2f8f86', '#c25b86', '#6b6b6b'];
  async function pMinisterios(p) {
    $('#pantalla').innerHTML = pCab('Ministerios'); volverA('Panel', vistaPastor);
    const r = await prpc('ministerio_pastor_listar', p), m = $('#pmsg'); if (!m) return;
    if (!r.ok) { m.textContent = r.falta ? 'Los ministerios aún no están activados. Avisa a quien administra la app.' : errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length ? 'Toca un ministerio para sumar personas y elegir líderes.' : 'Aún no hay ministerios. Crea el primero abajo.';
    $('#plista').innerHTML = `<div class="grid">${l.map((x) => `<button type="button" class="card min-card" data-mc="${esc(x.color)}" data-mi="${esc(x.id)}"><div class="t"><span class="min-ico" aria-hidden="true">${esc(x.icono || '👥')}</span>${esc(x.nombre)}<span class="flecha" aria-hidden="true">›</span></div><p class="suave m0t">${Number(x.miembros) || 0} personas${x.lideres ? ' · Lidera: ' + esc(x.lideres) : ' · sin líder'}</p></button>`).join('')}</div>
      <div class="card sep16"><div class="t"><span aria-hidden="true">${svg('mas', 20)}</span>Nuevo ministerio</div><label for="mnn">Nombre</label><input id="mnn" type="text" maxlength="40"><label for="mni">Ícono</label><select id="mni">${ICONOS_MIN.map((i) => `<option>${i}</option>`).join('')}</select><label for="mnc">Color</label><select id="mnc">${COLORES_MIN.map((c, i) => `<option value="${c}">Color ${i + 1}</option>`).join('')}</select><p id="mnerr" class="error" role="alert" hidden></p><button type="button" class="btn" id="mnok">Crear ministerio</button></div>`;
    pintaColores();
    document.querySelectorAll('[data-mi]').forEach((b) => b.addEventListener('click', () => pMinisterio(p, l.find((x) => x.id === b.dataset.mi))));
    $('#mnok').onclick = async () => {
      const er = $('#mnerr'); er.hidden = true;
      const r2 = await prpc('ministerio_crear', p, { p_nombre: $('#mnn').value.trim(), p_color: $('#mnc').value, p_icono: $('#mni').value }); const x = r2.ok ? primera(r2.data) : null;
      if (x && x.ok) return pMinisterios(p); er.textContent = errP(x ? x.motivo : r2.error); er.hidden = false;
    };
  }
  async function pMinisterio(p, mi) {
    if (!mi) return pMinisterios(p);
    $('#pantalla').innerHTML = `${cabecera(mi.nombre, 'Ministerios')}<p class="suave" id="pmsg">Cargando…</p><div id="plista"></div>`; volverA('Ministerios', () => pMinisterios(p));
    const r = await prpc('ministerio_pastor_personas', p, { p_ministerio: mi.id }), m = $('#pmsg'); if (!m) return;
    if (!r.ok) { m.textContent = errTxt(r.error); return; }
    const l = r.data || []; m.textContent = l.length ? 'Marca quién sirve aquí y quién lidera. Un líder puede crear actividades y avisos de este grupo.' : 'Aún no hay personas en la iglesia para sumar.';
    $('#plista').innerHTML = `<div class="lista">${l.map((x) => `<div class="fila persona"><span class="fila-txt">${esc(x.nombre)}<small>${x.es_lider ? '⭐ Líder' : x.asignado ? 'Sirve aquí' : 'No está en este grupo'}</small></span><button type="button" class="chip${x.asignado ? ' on' : ''}" data-as="${esc(x.miembro_id)}" data-l="${x.es_lider ? 1 : 0}" data-a="${x.asignado ? 1 : 0}">${x.asignado ? 'Quitar' : 'Sumar'}</button>${x.asignado ? `<button type="button" class="chip${x.es_lider ? ' on' : ''}" data-li="${esc(x.miembro_id)}" data-l="${x.es_lider ? 1 : 0}">${x.es_lider ? 'Quitar líder' : 'Hacer líder'}</button>` : ''}</div>`).join('')}</div><button type="button" class="btn sec sep16" id="mnDel">Borrar este ministerio</button>`;
    const cambia = async (idm, asig, lid) => { const r2 = await prpc('ministerio_asignar', p, { p_ministerio: mi.id, p_miembro: idm, p_asignado: asig, p_lider: lid }); r2.ok ? pMinisterio(p, mi) : (m.textContent = errTxt(r2.error)); };
    document.querySelectorAll('[data-as]').forEach((b) => b.addEventListener('click', () => cambia(b.dataset.as, b.dataset.a !== '1', false)));
    document.querySelectorAll('[data-li]').forEach((b) => b.addEventListener('click', () => cambia(b.dataset.li, true, b.dataset.l !== '1')));
    $('#mnDel').onclick = async () => { if (!confirm('¿Borrar el ministerio «' + mi.nombre + '»? Sus actividades y avisos también se borran.')) return; await prpc('ministerio_borrar', p, { p_ministerio: mi.id }); pMinisterios(p); };
  }
  async function pDatos(p) {
    $('#pantalla').innerHTML = `${cabecera('Datos y código', 'Panel')}<p class="suave" id="pmsg">Cargando…</p><div id="plista"></div>`; volverA('Panel', vistaPastor);
    const r = await rpc('iglesia_perfil', { p_codigo: p.codigo }), m = $('#pmsg'); if (!m) return;
    const d = (r.ok && r.data) || {}; m.textContent = '';
    const enlace = location.origin + location.pathname + '?c=' + p.codigo;
    $('#plista').innerHTML = `<div class="card"><div class="t"><span aria-hidden="true">${svg('iglesia', 20)}</span>Código de tu iglesia</div><p class="codigo-grande">${esc(p.codigo)}</p><p class="suave m0">Compártelo con tus hermanos para que se unan.</p><button type="button" class="btn sec" id="dCopiar">${svg('copiar', 18)} Copiar enlace de invitación</button><p id="dmsg" class="ok" role="status"></p></div>
      <div class="card sep16"><label for="dn">Nombre de la iglesia</label><input id="dn" type="text" maxlength="60" value="${esc(d.nombre || '')}"><label for="de">Eslogan</label><input id="de" type="text" maxlength="80" value="${esc(d.eslogan || '')}"><p id="derr" class="error" role="alert" hidden></p><button type="button" class="btn" id="dGuardar">Guardar</button></div>
      <div class="card sep16"><div class="t"><span aria-hidden="true">${svg('ciclo', 20)}</span>Cambiar el código</div><p class="suave m0t">Si el código se filtró, crea uno nuevo. El anterior deja de servir y tendrás que copiar de nuevo la llave desde el computador.</p><button type="button" class="btn sec" id="dRotar">Crear un código nuevo</button></div>`;
    $('#dCopiar').onclick = async () => { try { await navigator.clipboard.writeText(enlace); $('#dmsg').textContent = 'Enlace copiado.'; } catch (e) { $('#dmsg').textContent = enlace; } };
    $('#dGuardar').onclick = async () => { const r2 = await prpc('iglesia_guardar_perfil', p, { p_nombre: $('#dn').value.trim(), p_eslogan: $('#de').value.trim() || null }); const er = $('#derr'); if (r2.ok && r2.data) { er.hidden = true; $('#dmsg').textContent = 'Guardado.'; } else { er.textContent = 'No se pudo guardar. Revisa el nombre (2 a 60 letras) y tu conexión.'; er.hidden = false; } };
    $('#dRotar').onclick = async () => { if (!confirm('¿Crear un código nuevo? El actual dejará de servir.')) return; const r2 = await prpc('iglesia_rotar_codigo', p), x = r2.ok ? primera(r2.data) : null; if (x && x.ok && x.codigo_nuevo) { guardar(K_PASTOR, { codigo: x.codigo_nuevo, secreto: p.secreto }); alert('Tu código nuevo es ' + x.codigo_nuevo + '. En el computador, toca «Cambiar el código» o copia de nuevo la llave.'); vistaPastor(); } else $('#dmsg').textContent = 'No se pudo cambiar el código.'; };
  }

  // ---------- F884 · Primera vez: animación, 4 preguntas y tu espacio ----------
  // (El inicio de sesión NO se toca: se abre el de siempre.) Quien abre la app por primera vez ve: animación → 4 preguntas → «tu espacio» (plan, ambiente, horario, meta) → crear cuenta
  // (solo nombre, correo y contraseña). Quien ya usaba la app (cuenta, iglesia o solicitud) no lo ve. Las respuestas viajan con la cuenta.
  // La entrada como miembro (código/llave) vive en Mi iglesia y la del pastor en Perfil.
  const K_ONB = 'tb_movil_onboarding';
  const onbLeer = () => { const o = leer(K_ONB); return o && o.hecho === true ? o : null; };
  const hayOnb = () => !!(onbLeer() || leer(K_ID) || leer(K_SOL) || leer(K_CUENTA));
  const entrandoPon = (on) => { try { if (document.body && document.body.classList) document.body.classList.toggle('entrando', !!on); } catch (e) { /* nada */ } };
  const clase = (e, c, on) => { try { e.classList.toggle(c, on); } catch (x) { /* nada */ } };
  const ONB_P = [
    { id: 'nombre', texto: true, t: '¿Cómo te llamas?', a: 'Así te saludamos cada día.', ph: 'Tu nombre' },
    { id: 'busca', multi: true, max: 3, t: '¿Qué te trae a Tierra Buena?', a: 'Elige hasta tres.', o: [['leer', 'libro', 'Leer la Biblia cada día'], ['orar', 'corazon', 'Orar y encontrar paz'], ['conocer', 'chispas', 'Conocer más a Dios'], ['iglesia', 'iglesia', 'Crecer con mi iglesia'], ['descansar', 'luna', 'Descansar en calma'], ['retos', 'estrella', 'Retos para poner en práctica']] },
    { id: 'info1', info: true, ic: 'gente', t: (r) => (r.nombre ? r.nombre + ', aquí la Palabra se vive' : 'Aquí la Palabra se vive'), a: 'Leer es el principio. Cada día das un paso pequeño: algo que haces por ti, por alguien o por tu comunidad. Empezamos por nosotros.' },
    { id: 'exp', t: '¿Cómo es tu camino con la Biblia?', a: 'No hay respuesta mala.', o: [['nuevo', 'brote', 'Estoy empezando'], ['a_veces', 'libro', 'La leo de vez en cuando'], ['seguido', 'llama', 'La leo seguido'], ['profundo', 'rollo', 'Quiero profundizar']] },
    { id: 'trad', t: '¿Con qué tradición te sientes en casa?', a: 'Con esto se eligen las fechas importantes que verás. Es opcional y solo lo ves tú.', o: [['evangelica', 'iglesia', 'Evangélica o protestante'], ['catolica', 'iglesia', 'Católica'], ['ortodoxa', 'iglesia', 'Ortodoxa'], ['otra', 'gente', 'Otra iglesia cristiana'], ['explorando', 'chispas', 'Estoy explorando'], ['nodecir', 'candado', 'Prefiero no decirlo']] },
    { id: 'animo', t: '¿Cómo está tu corazón hoy?', a: 'Lo usamos para elegir tu primera lectura.', o: [['paz', 'paloma', 'En paz'], ['cansado', 'luna', 'Cansado'], ['ansioso', 'viento', 'Con preocupación'], ['agradecido', 'corazon', 'Agradecido'], ['dudas', 'ayuda', 'Con dudas']] },
    { id: 'area', t: '¿En qué quieres crecer?', a: 'Elige lo que más necesitas ahora.', o: [['fe', 'llama', 'Mi fe'], ['paz', 'paloma', 'Mi paz interior'], ['familia', 'gente', 'Mi familia'], ['proposito', 'estrella', 'Mi propósito'], ['sabiduria', 'foco', 'Sabiduría para decidir']] },
    { id: 'mom', t: '¿Cuándo te gusta leer?', a: 'Con eso armamos tu horario.', o: [['manana', 'sol', 'Por la mañana'], ['mediodia', 'sol', 'Al mediodía'], ['tarde', 'sol', 'Por la tarde'], ['noche', 'luna', 'De noche'], ['libre', 'calendario', 'Cuando pueda']] },
    { id: 'meta', num: true, t: '¿Cuánto quieres leer al día?', a: 'Puedes cambiarlo cuando quieras.', o: [['1', 'brote', 'Un capítulo · unos 4 minutos'], ['2', 'libro', 'Dos capítulos · unos 8 minutos'], ['3', 'llama', 'Tres capítulos'], ['5', 'trofeo', 'Cinco capítulos']] },
    { id: 'info2', info: true, ic: 'trofeo', t: (r) => 'A tu ritmo, ' + onbRitmo(r.meta || 1), a: 'Es el tiempo que tardarías en leer toda la Biblia con tu meta. Sin prisa, pero sin parar.' }
  ];
  const ONB_NQ = ONB_P.filter((x) => !x.info).length;
  const ONB_MOM = { manana: ['Por la mañana', '07:00'], mediodia: ['Al mediodía', '12:30'], tarde: ['Por la tarde', '17:30'], noche: ['De noche', '21:30'], libre: ['Cuando puedas', ''] };
  const ONB_VERS = { ansioso: 'PHP.4.6', cansado: 'MAT.11.28', paz: 'JHN.14.27', agradecido: 'PSA.100.4', dudas: 'JAS.1.5' };
  const onbEstado = { r: { nombre: '', busca: [], exp: '', trad: '', animo: '', area: '', mom: '', meta: 0 }, plan: true, cambiar: false };
  let onbT = 0, onbI = 0;
  const onbParar = () => { clearTimeout(onbT); clearInterval(onbI); };
  function onbRitmo(meta) {                                // la Biblia tiene 1189 capítulos: cuánto tardarías con tu meta
    const dias = Math.ceil(1189 / (meta || 1)), m = Math.round(dias / 30);
    return dias >= 700 ? 'unos ' + (Math.round(dias / 365 * 10) / 10).toString().replace('.', ',') + ' años' : 'unos ' + m + ' meses';
  }
  function onbCalcular(r) {
    const b = r.busca || [];
    const calma = b.indexOf('descansar') >= 0 || r.animo === 'ansioso' || r.animo === 'cansado' || (b.indexOf('orar') >= 0 && (!r.exp || r.exp === 'nuevo' || r.exp === 'a_veces'));
    const plan = calma ? 'calma' : ({ nuevo: 'juan', a_veces: 'animo', seguido: 'sermon', profundo: 'prov' }[r.exp] || 'juan');
    const tema = { manana: 'amanecer', mediodia: 'cielo', tarde: 'atardecer', noche: 'medianoche' }[r.mom] || (b.indexOf('descansar') >= 0 ? 'medianoche' : 'bosque');
    return { plan, tema, hora: (ONB_MOM[r.mom] || ['', ''])[1], meta: [1, 2, 3, 5].indexOf(r.meta) >= 0 ? r.meta : 1 };
  }
  function onbGuardar(omitido) {                          // guarda las respuestas, aplica ambiente y meta, y empieza el plan si la persona lo dejó marcado
    const r = onbEstado.r, c = onbCalcular(r);
    guardar(K_ONB, Object.assign({ v: 2, hecho: true, ts: Date.now() }, omitido ? { omitido: true } : { nombre: r.nombre, busca: r.busca.slice(), exp: r.exp, trad: r.trad, animo: r.animo, area: r.area, mom: r.mom, meta: c.meta, hora: c.hora, plan: c.plan, tema: c.tema }));
    if (omitido) return;
    perfilGuardar(Object.assign({ meta: c.meta, t: c.tema }, r.nombre ? { n: r.nombre.slice(0, 30) } : {})); temaAplicar(c.tema);
    if (onbEstado.plan) { const q = rg(K_PLANES); if (!q[c.plan]) { q[c.plan] = { ini: new Date().toISOString(), h: [] }; guardar(K_PLANES, q); } }
  }
  function onbIr() { entrandoPon(false); ir('palabra'); toastBib('Tu espacio está listo'); }
  // El inicio de sesión es el de siempre (vistaCuenta, sin cambios): aquí solo se abre. REGLA: no modificarlo sin que el usuario lo pida.
  function onbCuentaIr(modo) { onbParar(); entrandoPon(false); vistaCuenta(modo); }
  const onbBrote = (n) => `<div class="ent-prog" data-paso="${n}" role="img" aria-label="Pregunta ${n} de ${ONB_NQ}"><span class="ent-brote">${svg('brote', 26)}</span><span class="ent-barra">${ONB_P.filter((x) => !x.info).map((x, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span></div>`;
  // ---------- F895 · Menú de la persona (arriba a la izquierda): plan, información, calendario, compartir, widgets, configuración, suscripción, historia ----------
  const textoPantalla = (titulo, trozos, extra, atras) => {   // pantalla simple de lectura con botón «‹ Menú»
    $('#pantalla').innerHTML = `${cabecera(titulo, 'Menú')}${trozos.map((t) => `<p class="txt-l">${esc(t)}</p>`).join('')}${extra || ''}`;
    $('#volver').onclick = atras || menuAbrir; window.scrollTo(0, 0);
  };
  function vistaHistoria() {
    textoPantalla('Nuestra historia', [
      'Tierra Buena nació de una idea sencilla: aprender es hermoso, pero vivir lo aprendido es todavía mejor.',
      'Creemos que una sociedad mejor empieza en cada persona: en cómo nos tratamos en casa, con los vecinos, en el barrio y en la ciudad.',
      'Por eso aquí lees, practicas y compartes. Cada día das un paso pequeño, y si solo lo intentas, también cuenta.',
      'No juzgamos. Cuando vemos algo que falta, lo convertimos en ayuda. Nos perdonamos, nos valoramos, nos cuidamos y cuidamos la tierra que nos sostiene.',
      'Nuestros valores son cuatro: humildad, empatía, acción y esperanza. Y la invitación es para todos, de cualquier iglesia o sin ella: lo que nos une es hacer el bien.'
    ], '<button type="button" class="btn sec" id="hPal">Una palabra para pastores y para quienes los acompañamos</button>');
    const hp = $('#hPal'); if (hp) hp.onclick = () => vistaPalabraFundador();
  }
  // F1023 · Palabras para pastores y para quienes los acompañamos (texto guardado en docs/PALABRAS_FUNDADOR.md)
  function vistaPalabraFundador() {
    textoPantalla('Para quien guía y para quien acompaña', ["Un pastor sirve de muchas formas a la vez: predica, escucha, visita, organiza, aconseja, planifica, administra y acompaña a su familia. Cada semana lleva en el corazón los problemas de muchas personas, y muchas veces lo hace en silencio. Este espacio es para reconocer ese trabajo y para recordar que quien guía también necesita ser sostenido.","Los pastores son personas. Se cansan, se preocupan, ríen y lloran como cualquiera. A veces se les exige que nunca se equivoquen y que siempre den el ejemplo, y pocas veces alguien se detiene a preguntar cómo están. Lo mismo ocurre con sus familias: esposas e hijos que también sostienen esta llamada, muchas veces sin que nadie lo note.","Si tú eres parte de una iglesia, puedes ser una gran ayuda. Ora por tu pastor por su nombre. Dale las gracias con una palabra sincera. Respeta sus días de descanso. Ofrece lo que puedas: un servicio, una mano para el aseo, un momento para escuchar. Cada gesto pequeño de apoyo renueva a quien sirve.","Quiero contarte algo personal. Crecí en familias de pastores que viajan de ciudad en ciudad. Conocí muchas comunidades, muchas misiones y muchas maneras de servir. Y en todas partes encontré lo mismo: personas que quieren ayudar, y pastores que necesitan saber que alguien camina a su lado. Esa es la razón de esta app.","Dios renueva nuestras fuerzas, y nosotros también tenemos que hacer nuestra parte. No se trata solo de sentir, sino de actuar. Haz algo hoy por alguien. Ora, escucha, visita, ayuda. Y cuando te canses, vuelve a empezar: el bien se construye un paso a la vez, una y otra vez. HACERLO. Hacerlo juntos, paso a paso, para que nuestra comunidad crezca y sea mejor cada día."], '', vistaHistoria);
  }
  function vistaInfo() {
    textoPantalla('Cómo usar la app', [
      'Tierra Buena es una app para leer la Biblia, orar y poner en práctica lo que aprendes, sola o con tu iglesia.',
      'Palabra: lees y escuchas la Biblia a tu ritmo. Vida: das un paso pequeño cada día y lo compartes si quieres. Mi iglesia: pides oración, recibes avisos y te unes con el código de tu iglesia.',
      'Tu plan se arma con lo que nos cuentas al empezar, y lo puedes cambiar cuando quieras desde el menú.',
      'Tus notas y tu avance son tuyos. Nada se comparte sin que tú lo decidas.'
    ]);
  }
  function vistaSuscripcion() {
    textoPantalla('Suscripción', [
      'Hoy Tierra Buena es gratis y todo está abierto.',
      'Más adelante podría haber un apoyo voluntario para sostener la app. Si llega, será claro, sin letra chica, y lo que ya usas seguirá siendo tuyo.'
    ]);
  }
  function vistaWidgets() {                                 // F898: lo que sí se puede hoy en una app web instalada
    textoPantalla('Versículo en mi pantalla', [
      'Con Tierra Buena instalada, mantén tocado su ícono: aparecen atajos directos a tu versículo de hoy, a la Biblia y a tus fechas importantes. Funciona en Android.',
      'Los widgets que se quedan fijos en la pantalla (como un reloj) solo existen en apps de tienda. Los estamos preparando para cuando publiquemos la app; mientras tanto, «Hoy» muestra tu versículo, tu racha y la próxima fecha importante.'
    ], '<button type="button" class="btn" id="wgInst">Instalar la app</button>');
    $('#wgInst').onclick = instalarUnToque;
  }
  // Fechas cristianas que celebran todas las iglesias (sin santos ni fiestas que dividan). La Pascua se calcula (método de Meeus).
  function pascua(a) {
    const A = a % 19, B = Math.floor(a / 100), C = a % 100, D = Math.floor(B / 4), E = B % 4, F = Math.floor((B + 8) / 25), G = Math.floor((B - F + 1) / 3);
    const H = (19 * A + B - D - G + 15) % 30, I = Math.floor(C / 4), K = C % 4, L = (32 + 2 * E + 2 * I - H - K) % 7, M = Math.floor((A + 11 * H + 22 * L) / 451);
    const mes = Math.floor((H + L - 7 * M + 114) / 31), dia = ((H + L - 7 * M + 114) % 31) + 1;
    return new Date(a, mes - 1, dia);
  }
  function pascuaOrtodoxa(a) {                              // calendario juliano (+13 días hasta 2099)
    const A = a % 4, B = a % 7, C = a % 19, D = (19 * C + 15) % 30, E = (2 * A + 4 * B - D + 34) % 7, M = Math.floor((D + E + 114) / 31), d = ((D + E + 114) % 31) + 1;
    return new Date(a, M - 1, d + 13);
  }
  const TRAD_N = { evangelica: 'Evangélica o protestante', catolica: 'Católica', ortodoxa: 'Ortodoxa', otra: 'Otra iglesia cristiana', explorando: 'Explorando', nodecir: 'Fechas para todos' };
  function fechasSantas(a, trad) {
    const mk = (P) => (d) => new Date(P.getFullYear(), P.getMonth(), P.getDate() + d);
    const P = pascua(a), mas = mk(P), nav = new Date(a, 11, 25), dom4 = new Date(a, 11, 24 - (new Date(a, 11, 24).getDay() % 7) - 21);
    const Epi = [new Date(a, 0, 6), 'Epifanía', 'Recordamos a los que buscaron la luz.', 'Alegra a alguien con una palabra amable.'];
    const Cen = [mas(-46), 'Miércoles de Ceniza', 'Empieza la Cuaresma: un tiempo de volver al corazón.', 'Elige algo de lo que te quieras liberar.'];
    const Ram = [mas(-7), 'Domingo de Ramos', 'Se recuerda la entrada a Jerusalén.', 'Recibe a alguien con alegría.'];
    const Jue = [mas(-3), 'Jueves Santo', 'Se recuerda la última cena y el servicio.', 'Sirve a alguien sin esperar nada.'];
    const Vie = [mas(-2), 'Viernes Santo', 'Un día de silencio y gratitud.', 'Haz un momento de silencio y da gracias.'];
    const Pas = [P, 'Domingo de Pascua', 'Celebramos la esperanza y la vida nueva.', 'Comparte una buena noticia.'];
    const Asc = [mas(39), 'Ascensión', 'Se recuerda el envío a servir.', 'Haz algo bueno por tu barrio.'];
    const Pen = [mas(49), 'Pentecostés', 'Se celebra el nacimiento de la iglesia.', 'Une a dos personas que se llevan mal.'];
    const Adv = [dom4, 'Primer domingo de Adviento', 'Empieza la espera de la Navidad.', 'Prepara algo para dar.'];
    const Nav = [nav, 'Navidad', 'Celebramos que la esperanza llegó a nuestro mundo.', 'Regala tiempo a alguien solo.'];
    const hoyC = new Date(); hoyC.setHours(0, 0, 0, 0);     // F898: Mes de la Biblia (todo septiembre) y fechas de Chile para todas las tradiciones
    const MesB = [(hoyC.getFullYear() === a && hoyC.getMonth() === 8) ? hoyC : new Date(a, 8, 1), 'Mes de la Biblia', 'Todo septiembre: un mes para leer y compartir la Palabra.', 'Lee un capítulo cada día y cuéntaselo a alguien.', 'mes'];
    // F979 · Solsticio de invierno (hemisferio sur) según la media del año tropical; el día se toma en UTC, como en las fechas oficiales de 2021 a 2024.
    const solsticioJunio = (y) => { const u = new Date((2451716.5677 + 365.24219 * (y - 2000) - 2440587.5) * 86400000); return new Date(y, 5, u.getUTCDate()); };
    const dom = (m, n) => { const p = new Date(a, m, 1); return new Date(a, m, 1 + (7 - p.getDay()) % 7 + 7 * (n - 1)); };
    const chile = [[new Date(a, 0, 1), 'Año Nuevo', 'Empezamos un año con esperanza.', 'Escribe una meta pequeña para tu año.'], [new Date(a, 4, 1), 'Día del Trabajo', 'Valoramos el esfuerzo de cada persona.', 'Agradece a alguien por su trabajo.'], [dom(4, 2), 'Día de la Madre (Chile)', 'Honramos a quienes nos cuidaron.', 'Llama o abraza a una madre que admires.'], [dom(5, 3), 'Día del Padre (Chile)', 'Honramos a quienes nos guiaron.', 'Agradece a un padre o a quien hizo ese papel.'], [new Date(a, 6, 26), 'Día de los Abuelos (Chile)', 'Valoramos la sabiduría de nuestros mayores.', 'Visita o llama a una persona mayor.'], [dom(7, 2), 'Día del Niño (Chile)', 'Cuidamos a los más pequeños.', 'Dedica un rato a jugar con un niño.'], [solsticioJunio(a), 'Día de los Pueblos Indígenas', 'Honramos la sabiduría de los pueblos originarios de nuestra tierra.', 'Conoce un pueblo originario de Chile y su lengua.'], [new Date(a, 8, 18), 'Fiestas Patrias de Chile', 'Damos gracias por nuestra tierra y su gente.', 'Ora por Chile y comparte con tu vecindario.'], [new Date(a, 9, 31), 'Día de las Iglesias Evangélicas y Protestantes', 'Agradecemos la Palabra al alcance de todos.', 'Lee un pasaje con alguien o regala una Biblia.']];
    let l;
    if (trad === 'evangelica') l = [MesB, Vie, Pas, Asc, Pen, Nav];
    else if (trad === 'catolica') l = [[new Date(a, 0, 1), 'Santa María, Madre de Dios', 'Empezamos el año confiando en Dios.', 'Escribe una intención para el año.'], Epi, Cen, Ram, Jue, Vie, Pas, Asc, Pen, [mas(60), 'Corpus Christi', 'Se celebra la presencia de Cristo en la comunidad.', 'Comparte tu mesa con alguien.'], [new Date(a, 7, 15), 'Asunción de la Virgen María', 'Se recuerda a María y su esperanza.', 'Llama a tu mamá o a una madre que admires.'], [new Date(a, 10, 1), 'Todos los Santos', 'Recordamos a quienes vivieron el bien.', 'Agradece a alguien que te enseñó a ser mejor.'], [new Date(a, 11, 8), 'Inmaculada Concepción', 'Fiesta de María en Adviento.', 'Haz un gesto de pureza de corazón: perdona.'], Adv, Nav];
    else if (trad === 'ortodoxa') { const O = pascuaOrtodoxa(a), mo = mk(O); l = [[new Date(a, 0, 7), 'Navidad ortodoxa', 'Celebramos el nacimiento de Cristo.', 'Regala tiempo a alguien solo.'], [new Date(a, 0, 19), 'Teofanía', 'Se recuerda el bautismo de Jesús.', 'Agradece por tu familia y tu comunidad.'], [mo(-7), 'Domingo de Ramos ortodoxo', 'Se recuerda la entrada a Jerusalén.', 'Recibe a alguien con alegría.'], [mo(-2), 'Viernes Santo ortodoxo', 'Un día de silencio y gratitud.', 'Haz un momento de silencio y da gracias.'], [O, 'Pascua ortodoxa', 'Celebramos la vida nueva: «¡Cristo ha resucitado!»', 'Comparte una buena noticia.'], [mo(39), 'Ascensión ortodoxa', 'Se recuerda el envío a servir.', 'Haz algo bueno por tu barrio.'], [mo(49), 'Pentecostés ortodoxo', 'Se celebra el nacimiento de la iglesia.', 'Une a dos personas que se llevan mal.']]; }
    else l = [MesB, Jue, Vie, Pas, Asc, Pen, Adv, Nav];   // las fechas católicas (Epifanía, Ceniza, Ramos) solo salen si la persona elige «Católica'
    return l.concat(chile).filter((x) => x[0] && !isNaN(x[0]));
  }
  const tradLeer = () => { try { const o = onbLeer(); return (o && o.trad) || ''; } catch (e) { return ''; } };
  function fechaCercanaChip() {                             // F897: en «Hoy», solo si la fecha santa de tu calendario cae en los próximos 7 días (si no, no aparece nada: sin ruido)
    try {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const a = hoy.getFullYear(), t = tradLeer();
      const p = fechasSantas(a, t).concat(fechasSantas(a + 1, t)).sort((x, y) => x[0] - y[0]).find((x) => x[0] >= hoy);
      if (!p) return '';
      const n = Math.round((p[0] - hoy) / 86400000); if (n > 7) return '';
      return `<button type="button" class="hoy-fecha" data-ir="cal">${svg('calendario', 16)}<span><b>${esc(p[1])}</b> · ${n === 0 ? (p[4] === 'mes' ? 'todo este mes' : 'hoy') : n === 1 ? 'mañana' : 'en ' + n + ' días'}</span></button>`;
    } catch (e) { return ''; }
  }
  function vistaCalendario() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const a = hoy.getFullYear(), lista = fechasSantas(a, tradLeer()).concat(fechasSantas(a + 1, tradLeer())).sort((x, y) => x[0] - y[0]).filter((x) => x[0] >= hoy).slice(0, 8);
    const fmt = (d) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    const dias = (d, f) => { const n = Math.round((d - hoy) / 86400000); return n === 0 ? (f === 'mes' ? 'Todo este mes' : 'Hoy') : n === 1 ? 'Mañana' : 'En ' + n + ' días'; };
    const [p, ...resto] = lista;
    $('#pantalla').innerHTML = `${cabecera('Fechas importantes', 'Menú')}<p class="suave">Cada fecha incluye una sugerencia sencilla para vivirla.</p><p class="cal-trad"><span>${svg('calendario', 18)} ${esc(TRAD_N[tradLeer()] || 'Fechas para todos')}</span><button type="button" class="enlace" id="calCambiar">Cambiar tradición</button></p>
      ${p ? `<div class="card cal-prox"><small>Próxima fecha</small><h3>${esc(p[1])}</h3><p class="cal-cuando">${esc(dias(p[0], p[4]))} · ${esc(fmt(p[0]))}</p><p>${esc(p[2])}</p><p class="cal-paso">${svg('chispas', 18)} <b>Sugerencia:</b> ${esc(p[3])}</p></div>` : ''}
      ${(() => { try { const mv = window.TBFechas && window.TBFechas.listaHTML(['juntos', 'agenda']); return mv ? '<h2 class="sep">Lo de tu iglesia</h2><div class="lista">' + mv + '</div>' : ''; } catch (e) { return ''; } })()}<h2 class="sep">Más adelante</h2><div class="lista">${resto.map((x) => `<div class="fila cal-fila"><span class="fila-ico t2" aria-hidden="true">${svg('calendario', 20)}</span><span class="fila-txt"><b>${esc(x[1])}</b><small>${esc(dias(x[0], x[4]))} · ${esc(fmt(x[0]))}</small></span></div>`).join('')}</div>`;
    $('#volver').onclick = menuAbrir; $('#calCambiar').onclick = planRehacer; window.scrollTo(0, 0);
  }
  const menuCerrar = () => { try { const c = $('#cajonMenu'); if (c) c.remove(); } catch (e) { /* nada */ } };
  function menuAbrir() {
    menuCerrar();
    const p = perfilLeer(), o = onbLeer(), nombre = p.n || (o && o.nombre) || (leer(K_ID) && leer(K_ID).nombre) || 'Tu espacio';
    const it = (k, ic, t, d) => `<button type="button" class="cj-it" data-cj="${k}"><span class="cj-ic">${svg(ic, 22)}</span><span class="cj-tx"><b>${esc(t)}</b><small>${esc(d)}</small></span></button>`;
    const h = nuevoEl(`<div class="cajon" id="cajonMenu" role="dialog" aria-modal="true" aria-label="Menú"><nav class="cajon-in">
      <div class="cj-cab">${avatarHTML(nombre, p, true)}<div><b>${esc(nombre)}</b><small>${esc(planResumen())}</small></div><button type="button" class="cj-x" id="cjX" aria-label="Cerrar">${svg('x', 20)}</button></div>
      <div class="cj-lista">
        ${yaInstalada() ? '' : it('inst', 'compartir', 'Instalar la app', 'Un toque y queda en tu pantalla')}
        ${it('jun', 'brote', 'Juntos hacemos el bien', 'Ideas y movimientos de tu iglesia')}
        ${it('plan', 'brote', 'Personalizar la app', 'Cambiar mis respuestas iniciales')}
        ${it('info', 'ayuda', 'Cómo usar la app', 'Guía rápida de cada sección')}
        ${it('cal', 'calendario', 'Fechas importantes', 'Fiestas cristianas y actividades de tu iglesia')}
        ${it('comp', 'compartir', 'Compartir la app', 'Invita a alguien que quieras')}
        ${it('wid', 'bloques', 'Versículo en mi pantalla', 'Verlo sin abrir la app')}
        ${it('conf', 'foco', 'Ajustes y cuenta', 'Temas, letra, sonido y datos de tu cuenta')}
        ${it('sus', 'estrella', 'Suscripción', 'Hoy todo es gratis')}
        ${it('hist', 'hoja', 'Lee nuestra historia', 'Por qué existe Tierra Buena')}
      </div></nav></div>`);
    if (!h) return ir('perfil');
    document.body.appendChild(h);
    const va = { inst: instalarUnToque, jun: abrirJuntos, plan: planRehacer, info: vistaInfo, cal: vistaCalendario, comp: invitarHoja, wid: vistaWidgets, conf: () => ir('perfil'), sus: vistaSuscripcion, hist: vistaHistoria };
    h.querySelectorAll('.cj-it').forEach((b) => b.addEventListener('click', () => { vibra(); menuCerrar(); entrandoPon(false); (va[b.dataset.cj] || (() => {}))(); }));
    $('#cjX').onclick = menuCerrar; h.addEventListener('click', (e) => { if (e && e.target === h) menuCerrar(); });
  }
  function menuBoton() {                                    // el botón fijo arriba a la izquierda; su avatar sigue a la persona
    let b = $('#btnMenu');
    if (!b) { b = nuevoEl('<button type="button" class="btn-menu" id="btnMenu" aria-label="Abrir mi menú"></button>'); if (!b) return; document.body.appendChild(b); b.onclick = () => { vibra(); menuAbrir(); }; }
    const p = perfilLeer(), o = onbLeer(); b.innerHTML = avatarHTML(p.n || (o && o.nombre) || '', p, false) + '<i class="btn-menu-pt" aria-hidden="true"></i>';
  }
  // ---------- F894 · Mi plan: las respuestas de la entrada organizan la app, y se pueden repetir cuando la persona quiera otra experiencia ----------
  const TAB_BUSCA = { leer: 'palabra', orar: 'palabra', conocer: 'palabra', descansar: 'palabra', iglesia: 'iglesia', retos: 'vida' };
  function tabInicio() {                                   // la app abre en lo que la persona dijo que más busca (la primera opción que marcó)
    try { const o = onbLeer(); const b = o && o.busca && o.busca[0]; return TAB_BUSCA[b] || 'iglesia'; } catch (e) { return 'iglesia'; }
  }
  function planResumen() {
    const o = onbLeer(); if (!o || o.omitido || !o.plan) return 'Cuéntanos de ti y armamos tu plan';
    const pl = PLANES.find((x) => x.id === o.plan);
    return (pl ? pl.n : 'Tu plan') + ' · ' + (o.meta || 1) + (o.meta === 1 || !o.meta ? ' capítulo' : ' capítulos') + ' al día';
  }
  function planRehacer() {                                 // repite las preguntas con las respuestas de antes ya puestas; no pide cuenta
    const o = onbLeer() || {};
    onbEstado.r = { nombre: o.nombre || '', busca: (o.busca || []).slice(), exp: o.exp || '', trad: o.trad || '', animo: o.animo || '', area: o.area || '', mom: o.mom || '', meta: o.meta || 0 };
    onbEstado.plan = true; onbEstado.cambiar = true; onbPregunta(0);
  }
  // ---------- F892 · Portada con pantallas que cambian (idea de Bible Chat): se ve cada vez que se abre la app sin cuenta ----------
  // 5 pantallas cortas que muestran de qué trata la app + un cierre «de parte de Tierra Buena», y recién después se abre el lugar para entrar.
  // Se mueve sola (se detiene si la persona toca o desliza, y no se mueve con «reducir movimiento»). El inicio de sesión NO se toca: solo se abre.
  const PORT = [
    { ic: 'brote', t: 'Aquí la Palabra se vive', a: 'Aprender es hermoso. Vivirlo, todavía más.', c: ['libro', 'corazon', 'gente'] },
    { ic: 'libro', t: 'Lee y escucha a tu ritmo', a: 'La Biblia en tu teléfono, con la letra que te guste. También puedes escucharla.', c: ['altavoz', 'marcador', 'pluma'] },
    { ic: 'check', t: 'Un paso pequeño cada día', a: 'Elige algo para hacer hoy. Si lo intentas, también cuenta.', c: ['estrella', 'llama', 'trofeo'] },
    { ic: 'iglesia', t: 'Camina con tu iglesia', a: 'Pide oración, recibe avisos y súmate a lo que hace tu comunidad.', c: ['paloma', 'calendario', 'gente'] },
    { ic: 'gente', t: 'Juntos hacemos el bien', a: 'Tu iglesia pasa de la Palabra a la acción: elige una idea, ponle fecha, lugar y líderes, e invita a tu congregación.', c: ['corazon', 'hoja', 'sol'] }
  ];
  const portMov = () => { try { const h = document.documentElement; return !(h && h.getAttribute && h.getAttribute('data-anim') === 'off') && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  function onbSplash() {
    onbParar(); entrandoPon(true);
    const ya = !!onbLeer() && !leer(K_ID) && !leer(K_SOL) && !leer(K_CUENTA), dentro = !!(leer(K_ID) || leer(K_SOL) || leer(K_CUENTA)), n = PORT.length + 1;
    const sl = PORT.map((x, i) => `<div class="pt-sl" id="ptS${i}" role="group" aria-label="${i + 1} de ${n}"><div class="pt-esc" aria-hidden="true"><i class="pt-aro"></i><i class="pt-aro a2"></i><span class="pt-ic">${svg(x.ic, 52)}</span>${x.c.map((k, j) => `<span class="pt-chip c${j + 1}">${svg(k, 20)}</span>`).join('')}</div><h1 class="pt-t">${esc(x.t)}</h1><p class="pt-a">${esc(x.a)}</p></div>`).join('');
    const fin = `<div class="pt-sl pt-fin" id="ptS${PORT.length}" role="group" aria-label="${n} de ${n}"><div class="ent-logo" aria-hidden="true"><i class="ent-aro"></i><i class="ent-aro a2"></i><span class="ent-hoja">${svg('hoja', 64)}</span></div><h1 class="ent-marca">Tierra Buena</h1><p class="ent-lema">Donde la Palabra echa raíz</p><p class="pt-a">Hecho con cariño para que el bien eche raíz en ti, en los tuyos y en tu lugar.</p></div>`;
    const pts = Array.from({ length: n }, (_, i) => `<button type="button" class="pt-pt" data-pt="${i}" aria-label="Pantalla ${i + 1} de ${n}"></button>`).join('');
    const botones = dentro
      ? `<button type="button" class="btn" id="onbEmpezar">Entrar</button>`
      : ya
      ? `<button type="button" class="btn" id="onbEmpezar">Entrar a mi cuenta</button><p class="ent-links"><button type="button" class="enlace" id="onbCrear">Crear una cuenta nueva</button></p>`
      : `<button type="button" class="btn" id="onbEmpezar">Empezar</button><p class="ent-links"><button type="button" class="enlace" id="onbYaTengo">Ya tengo cuenta</button></p>`;   // F888: la primera vez solo ofrece «Empezar»; «Ya tengo cuenta» aparece al final de las preguntas
    $('#pantalla').innerHTML = `<section class="ent ent-splash ent-port" data-i="0"><div class="pt-vista" id="ptVista"><div class="pt-pista">${sl}${fin}</div></div><div class="pt-pie"><div class="pt-pts">${pts}</div>${botones}</div></section>`;
    ligaCodigo();
    const sec = $('.ent-port'); let i = 0;
    const puntos = () => { try { return Array.from(document.querySelectorAll('.pt-pt')); } catch (e) { return []; } };
    const ver = (k) => {
      i = Math.max(0, Math.min(n - 1, k));
      try { sec.setAttribute('data-i', String(i)); } catch (e) { /* nada */ }
      for (let j = 0; j < n; j++) { const e = $('#ptS' + j); if (e) { clase(e, 'on', j === i); try { e.setAttribute('aria-hidden', j === i ? 'false' : 'true'); } catch (x) { /* nada */ } } }
      puntos().forEach((d, j) => { clase(d, 'on', j === i); try { if (j === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); } catch (x) { /* nada */ } });
    };
    const quieta = () => clearInterval(onbI);
    ver(0);
    if (portMov()) onbI = setInterval(() => { if (i >= n - 1) quieta(); else ver(i + 1); }, 7500);   // pasa sola; en el cierre de Tierra Buena se queda
    puntos().forEach((d) => { d.onclick = () => { quieta(); ver(Number(d.getAttribute('data-pt'))); }; });
    const vi = $('#ptVista'); let x0 = null;               // deslizar con el dedo
    if (vi && vi.addEventListener) {
      vi.addEventListener('touchstart', (e) => { x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null; }, { passive: true });
      vi.addEventListener('touchend', (e) => { const t = e.changedTouches && e.changedTouches[0]; if (x0 === null || !t) return; const d = t.clientX - x0; x0 = null; if (Math.abs(d) > 40) { quieta(); ver(i + (d < 0 ? 1 : -1)); } }, { passive: true });
    }
    $('#onbEmpezar').onclick = () => { quieta(); if (dentro) { onbParar(); entrandoPon(false); ir(tabInicio()); } else if (ya) onbCuentaIr('entrar'); else onbPregunta(0); };
    if (!dentro && !ya) $('#onbYaTengo').onclick = () => { quieta(); onbCuentaIr('entrar'); };
    if (ya) { $('#onbCrear').onclick = () => onbCuentaIr('crear'); }
  }
  function onbPregunta(i) {
    onbParar(); entrandoPon(true);
    const q = ONB_P[i], r = onbEstado.r, nq = ONB_P.slice(0, i + 1).filter((x) => !x.info).length;
    const sig = () => (i < ONB_P.length - 1 ? onbPregunta(i + 1) : onbArmando());
    const cab = `<div class="ent-cab"><button type="button" class="volver" id="onbAtras" aria-label="Atrás">‹</button>${onbBrote(nq)}<button type="button" class="enlace" id="onbSaltar">Saltar</button></div>`;
    const atras = () => (i ? onbPregunta(i - 1) : (onbEstado.cambiar ? (onbEstado.cambiar = false, entrandoPon(false), ir('perfil')) : onbSplash()));
    if (q.info) {                                          // pantalla de ánimo entre preguntas (como Bible Chat): un mensaje y seguir
      $('#pantalla').innerHTML = `<section class="ent ent-preg ent-info">${cab}<div class="ent-info-c"><div class="ent-info-ic" aria-hidden="true"><i></i>${svg(q.ic, 44)}</div><h1 class="ent-t">${esc(q.t(r))}</h1><p class="suave">${esc(q.a)}</p></div><button type="button" class="btn" id="onbSig">Continuar</button></section>`;
      $('#onbAtras').onclick = atras; $('#onbSaltar').onclick = sig; $('#onbSig').onclick = sig;
      return;
    }
    if (q.texto) {
      $('#pantalla').innerHTML = `<section class="ent ent-preg">${cab}<h1 class="ent-t">${esc(q.t)}</h1><p class="suave">${esc(q.a)}</p>
        <input id="onbNombre" class="ent-nombre" type="text" maxlength="30" autocomplete="given-name" enterkeyhint="done" placeholder="${esc(q.ph)}" value="${esc(r.nombre)}" aria-label="${esc(q.t)}">
        <button type="button" class="btn" id="onbSig">Continuar</button></section>`;
      const guardaNombre = () => { r.nombre = String(($('#onbNombre') || {}).value || '').replace(/[<>]/g, '').trim().slice(0, 30); };
      $('#onbAtras').onclick = () => { guardaNombre(); atras(); }; $('#onbSaltar').onclick = () => { r.nombre = ''; sig(); };
      $('#onbSig').onclick = () => { guardaNombre(); sig(); };
      $('#onbNombre').addEventListener('keydown', (e) => { if (e && e.key === 'Enter') { guardaNombre(); sig(); } });
      try { setTimeout(() => $('#onbNombre').focus(), 250); } catch (e) { /* sin foco */ }
      return;
    }
    const cur = (q.multi ? r.busca : [r[q.id]]).map(String);
    $('#pantalla').innerHTML = `<section class="ent ent-preg">${cab}
      <h1 class="ent-t">${esc(q.t)}</h1><p class="suave">${esc(q.a)}</p>
      <div class="ent-ops" role="group" aria-label="${esc(q.t)}">${q.o.map((o) => { const on = cur.indexOf(o[0]) >= 0; return `<button type="button" class="ent-op${on ? ' on' : ''}" data-v="${o[0]}" aria-pressed="${on}"><span class="ent-op-ic">${svg(o[1], 24)}</span><span class="ent-op-t">${esc(o[2])}</span><span class="ent-op-ok">${svg('check', 18)}</span></button>`; }).join('')}</div>
      ${q.multi ? '<button type="button" class="btn" id="onbSig">Continuar</button>' : ''}</section>`;
    $('#onbAtras').onclick = atras;
    $('#onbSaltar').onclick = sig;
    document.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
      vibra();
      if (q.multi) {
        const k = r.busca.indexOf(b.dataset.v);
        if (k >= 0) r.busca.splice(k, 1); else if (r.busca.length < q.max) r.busca.push(b.dataset.v); else { toastBib('Elige hasta tres'); return; }
        clase(b, 'on', k < 0); b.setAttribute('aria-pressed', String(k < 0)); return;
      }
      r[q.id] = q.num ? Number(b.dataset.v) : b.dataset.v;
      document.querySelectorAll('.ent-op').forEach((x) => { clase(x, 'on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      clearTimeout(onbT); onbT = setTimeout(sig, 260);
    }));
    const s = $('#onbSig'); if (s) s.onclick = sig;
  }
  // Animación «Armando tu plan» (como Bible Chat): un aro que se llena y una lista que se va marcando con lo que la persona contó.
  function onbArmando() {
    onbParar(); entrandoPon(true);
    const r = onbEstado.r, c = onbCalcular(r), pl = PLANES.find((x) => x.id === c.plan) || PLANES[0], tm = TEMAS.find((x) => x[0] === c.tema) || TEMAS[0];
    const pasos = ['Eligiendo tu plan: ' + pl.n, 'Preparando tu ambiente: ' + tm[1], c.hora ? 'Ajustando tu horario: ' + c.hora : 'Dejando tu horario libre', 'Armando tu meta: ' + c.meta + (c.meta === 1 ? ' capítulo' : ' capítulos') + ' al día'];
    $('#pantalla').innerHTML = `<section class="ent ent-carga" role="status" aria-live="polite">
      <h1 class="ent-t">${r.nombre ? esc(r.nombre) + ', estamos' : 'Estamos'} armando tu espacio</h1>
      <div class="ent-aro-c" aria-hidden="true"><svg viewBox="0 0 120 120" width="150" height="150"><circle class="aro-f" cx="60" cy="60" r="52"/><circle class="aro-v" cx="60" cy="60" r="52"/></svg><b id="onbPct">0%</b></div>
      <ul class="ent-pasos">${pasos.map((p, k) => `<li data-p="${k}"><span class="ent-paso-ok">${svg('check', 16)}</span>${esc(p)}</li>`).join('')}</ul></section>`;
    const calma = (() => { try { return document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } })();
    const total = calma ? 900 : 4200, t0 = Date.now(), lis = Array.from(document.querySelectorAll('.ent-pasos li'));
    const aro = $('.aro-v'); if (aro && !calma) clase(aro, 'llena', true);
    onbI = setInterval(() => {
      const f = Math.min(1, (Date.now() - t0) / total), pct = $('#onbPct');
      if (pct) pct.textContent = Math.round(f * 100) + '%';
      lis.forEach((li, k) => { if (f >= (k + 1) / (pasos.length + 0.3)) clase(li, 'ok', true); });
      if (f >= 1) { clearInterval(onbI); lis.forEach((li) => clase(li, 'ok', true)); if (aro) clase(aro, 'fin', true); onbT = setTimeout(onbResultado, 450); }
    }, 60);
  }
  function onbResultado() {
    onbParar(); entrandoPon(true);
    const r = onbEstado.r, c = onbCalcular(r), pl = PLANES.find((x) => x.id === c.plan) || PLANES[0], tm = TEMAS.find((x) => x[0] === c.tema) || TEMAS[0], mom = ONB_MOM[r.mom];
    temaAplicar(c.tema);                                   // la persona ya ve su ambiente en esta pantalla
    const vref = ONB_VERS[r.animo] || 'JER.29.11', vp = vref.split('.');
    $('#pantalla').innerHTML = `<section class="ent ent-res">
      <div class="ent-cab"><button type="button" class="volver" id="onbAtras" aria-label="Atrás">‹</button></div>
      <h1 class="ent-t">${r.nombre ? esc(r.nombre) + ', tu' : 'Tu'} espacio está listo</h1><p class="suave">Lo armamos con lo que nos contaste. Todo se puede cambiar después.</p>
      <div class="ent-vers card" id="onbVers"><small>Una palabra para ti hoy</small><p class="ent-vers-t" id="onbVersT">…</p><span class="suave" id="onbVersR"></span></div>
      <div class="ent-filas">
        <div class="ent-fila"><span class="ent-fila-ic">${svg('calendario', 24)}</span><div><small>Tu primer plan</small><b>${esc(pl.n)}</b><span class="suave">${esc(pl.d)}</span></div></div>
        <div class="ent-fila"><span class="ent-fila-ic">${svg('chispas', 24)}</span><div><small>Tu ambiente</small><b>${esc(tm[1])}</b><span class="suave">${esc(tm[2])}</span></div></div>
        <div class="ent-fila"><span class="ent-fila-ic">${svg(r.mom === 'noche' ? 'luna' : 'sol', 24)}</span><div><small>Tu momento</small><b>${esc(mom ? mom[0] : 'Cuando puedas')}</b><span class="suave">${c.hora ? 'Te sugeriremos las ' + c.hora + '.' : 'Sin horario fijo.'}</span></div></div>
        ${r.trad && r.trad !== 'nodecir' ? `<div class="ent-fila"><span class="ent-fila-ic">${svg('calendario', 24)}</span><div><small>Tus fechas</small><b>${esc(TRAD_N[r.trad] || 'Cristiano')}</b><span class="suave">Con las fechas que viven en tu iglesia.</span></div></div>` : ''}
        <div class="ent-fila"><span class="ent-fila-ic">${svg('llama', 24)}</span><div><small>Tu meta</small><b>${c.meta} ${c.meta === 1 ? 'capítulo' : 'capítulos'} al día</b><span class="suave">Toda la Biblia en ${esc(onbRitmo(c.meta))}.</span></div></div>
        <div class="ent-fila"><span class="ent-fila-ic">${svg('chispas', 24)}</span><div><small>Tu primer paso de acción</small><b>Hoy lo hago</b><span class="suave">Cada día un paso pequeño para vivir lo que lees.</span></div></div>
      </div>
      <label class="chk"><input type="checkbox" id="onbPlan"${onbEstado.plan ? ' checked' : ''}><span>Empezar «${esc(pl.n)}» al entrar</span></label>
      <button type="button" class="btn" id="onbSig">${onbEstado.cambiar ? 'Guardar mi nuevo plan' : 'Crear mi cuenta'}</button>
      <button type="button" class="btn sec" id="onbCambiar">Cambiar mis respuestas</button>
      ${onbEstado.cambiar ? '<p class="ent-links"><button type="button" class="enlace" id="onbCancelar">Dejar mi plan como estaba</button></p>' : '<p class="ent-links"><button type="button" class="enlace" id="onbYa">Ya tengo cuenta</button></p>'}</section>`;
    (async () => {                                         // el versículo sale de la Biblia que ya está en el teléfono
      try { const l = await libroCargar(vp[0]), t = l[Number(vp[1]) - 1][Number(vp[2]) - 1], a = $('#onbVersT'), b = $('#onbVersR'); if (a && t) { a.textContent = '«' + t + '»'; b.textContent = libroInfo(vp[0])[1] + ' ' + vp[1] + ':' + vp[2]; } else if ($('#onbVers')) $('#onbVers').hidden = true; } catch (e) { const v = $('#onbVers'); if (v) v.hidden = true; }
    })();
    try { setTimeout(() => { const b = $('#onbSig'); if (b) confeti(b); }, 450); } catch (e) { /* sin celebración */ }
    $('#onbAtras').onclick = () => onbPregunta(ONB_P.length - 1);
    $('#onbCambiar').onclick = () => onbPregunta(0);
    $('#onbPlan').addEventListener('change', (e) => { onbEstado.plan = !!(e && e.target ? e.target.checked : $('#onbPlan').checked); });
    $('#onbSig').onclick = () => { onbGuardar(false); if (onbEstado.cambiar) { onbEstado.cambiar = false; entrandoPon(false); ir('perfil'); toastBib('Tu nuevo plan está listo'); } else onbCuentaIr('crear'); };
    if (onbEstado.cambiar) $('#onbCancelar').onclick = () => { onbEstado.cambiar = false; entrandoPon(false); ir('perfil'); };
    else $('#onbYa').onclick = () => onbCuentaIr('entrar');
  }
  // ---------- Navegación ----------
    // F902 · INICIO: el 5.º menú, al centro. Más aire y menos cosas. Aquí vive «Juntos hacemos el bien» (ya no está dentro de Vida).
  let relojInicio = 0, calmaIdle = 0, calmaVela = null, calmaResp = [];
  function calmaSoltar() {                                   // al salir de Inicio se apaga todo: reloj, pausa por quietud, respiración y pantalla encendida
    if (relojInicio) { clearInterval(relojInicio); relojInicio = 0; }
    if (calmaIdle) { clearTimeout(calmaIdle); calmaIdle = 0; }
    calmaResp.forEach(clearTimeout); calmaResp = [];
    if (calmaVela) { try { calmaVela.release(); } catch (e) { /* nada */ } calmaVela = null; }
    if (window.TBLienzo) { try { window.TBLienzo.soltar(); } catch (e) { /* nada */ } }   // F928: el jardín también se apaga al salir
  }
  function vistaInicio() {                                  // F909: INICIO LIMPIO = solo el fondo vivo + frases pequeñas que pasan despacio. Se animan solo con opacity/transform y se pausan si Inicio no se ve.
    calmaSoltar();
    const p = perfilLeer(), o = (() => { try { return onbLeer(); } catch (e) { return null; } })(), n = (p.n || (o && o.nombre) || '').split(' ')[0];
    const FRASES = ['Hoy basta con dar un buen paso.', 'Lo pequeño, hecho con cariño, cuenta.', 'Respira. Vas bien.', 'Una palabra amable también es una semilla.', 'No tienes que poder con todo hoy.', 'Lo que siembras con paciencia, crece.', 'Haz una cosa buena y déjala ir.', 'Pregunta cómo está alguien. En serio.', 'La calma también se practica.', 'Hay buena tierra donde estás parado.', 'Descansar es parte del trabajo.', 'Sé el aviso bueno de alguien hoy.'];
    const hoy = new Date(), h0 = hoy.getHours(), saludo = h0 < 6 ? 'Qué bueno verte despierto' : h0 < 12 ? 'Buenos días' : h0 < 19 ? 'Buenas tardes' : 'Buenas noches';
    let k = (hoy.getFullYear() * 366 + hoy.getMonth() * 31 + hoy.getDate()) % FRASES.length;
    $('#pantalla').innerHTML = `<section class="inicio-limpio${window.TBLienzo ? ' il-con-lienzo' : ''}" id="inicioLimpio" aria-label="Inicio"><button type="button" class="il-juntos il-paisaje" id="ilPais" aria-label="Elegir paisaje y clima" title="Tu paisaje"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 19l6-10 4 6 3-4 7 8z"/><circle cx="17" cy="6" r="2"/></svg></button><button type="button" class="il-juntos" id="ilJuntos" aria-label="Juntos hacemos el bien" title="Juntos hacemos el bien">${svg('gente', 22)}</button><p class="il-sal">${saludo}${n ? ', ' + esc(n) : ''}</p><time class="il-hora" id="ilHora"></time><p class="il-frase" id="ilFrase" aria-live="off"></p><div id="ilLienzo"></div></section>`;
    const sec = $('#inicioLimpio'), fr = $('#ilFrase');
    const bp = $('#ilPais'); if (bp) bp.onclick = () => { vibra(); if (window.TBLienzo && window.TBLienzo.paisajeHoja) window.TBLienzo.paisajeHoja(() => { const c = $('#ilLienzo'); if (c) window.TBLienzo.montar(c); }); };
    const bj = $('#ilJuntos'); if (bj) bj.onclick = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sin vibración */ } abrirJuntos(); };
    const quieto = () => document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    fr.textContent = FRASES[k]; calmaResp.push(setTimeout(() => { if (fr.isConnected) fr.classList.add('on'); }, 120));
    const reloj = $('#ilHora'), horaTxt = () => { try { return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };   // F928: reloj pequeño, se actualiza con el mismo temporizador de las frases (sin otro)
    if (reloj) reloj.textContent = horaTxt();
    if (window.TBLienzo) window.TBLienzo.montar($('#ilLienzo'));
    let visible = true;
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }) : null; if (io) io.observe(sec);
    relojInicio = setInterval(() => {                         // una frase cada 11 s; si no se ve, no hace nada
      if (!sec.isConnected) { if (io) io.disconnect(); return calmaSoltar(); }
      if (document.hidden || !visible) return;
      if (reloj) { const t = horaTxt(); if (reloj.textContent !== t) reloj.textContent = t; }
      if (quieto()) return;
      fr.classList.remove('on');
      calmaResp.push(setTimeout(() => { if (!fr.isConnected) return; k = (k + 1) % FRASES.length; fr.textContent = FRASES[k]; fr.classList.add('on'); }, 1500));
    }, 11000);
  }
  // F914: la 1.ª pestaña ofrece 2 caminos en el mismo lugar: Iglesia (miembro) y Pastor (panel). Nada se elimina: cada uno abre su vista de siempre.
  function vistaEspacioIglesia() {   // F915: sin menú intermedio. Si entró como pastor, su panel vive en este mismo lugar; si no, Mi iglesia de siempre («Soy pastor» y «Mi código» ya existen ahí)
    if (pastorLeer() && !codigoDeEnlace()) return vistaPastor();
    return vistaIglesia();
  }
  const VISTAS = { inicio: vistaInicio, iglesia: vistaEspacioIglesia, palabra: vistaPalabra, vida: vistaVida, perfil: vistaPerfil, pastor: vistaPastor };
  const ORDEN_TAB = ['iglesia', 'palabra', 'inicio', 'vida', 'perfil', 'pastor']; let tabPrev = '';
  function pantEntra(sentido) {                             // F885: la pantalla nueva entra deslizando (se apaga con «reducir movimiento» o Animaciones: más tranquilo)
    try {
      const p = $('#pantalla'); if (!p || !p.animate || document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      const H = document.documentElement; H.classList.add('tb-cambia');                 // F915: efectos en pausa mientras entra la pantalla
      const an = p.animate([{ opacity: 0, transform: 'translateX(' + (sentido === 'atras' ? -22 : 22) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' });
      const fin = () => H.classList.remove('tb-cambia'); an.onfinish = fin; an.oncancel = fin; setTimeout(fin, 450);
    } catch (e) { /* sin animación */ }
  }
  function ir(tab, directo) {
    if (!haySesion()) return puerta();                       // F936: sin sesión no se abre ninguna sección
    const sentido = ORDEN_TAB.indexOf(tab) < ORDEN_TAB.indexOf(tabPrev) ? 'atras' : 'adelante'; tabPrev = tab;
    const tabMarca = tab === 'pastor' ? 'iglesia' : tab;
    document.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === tabMarca) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    barraRefrescar(tab); try { menuBoton(); } catch (e) { /* sin botón */ }
    const tp = $('#barraTop'); if (tp && tp.classList && tp.classList.remove) tp.classList.remove('on');
    if (tab !== 'inicio') { try { calmaSoltar(); } catch (e) { /* nada */ } }
    (directo === 'miembro' && tab === 'iglesia' ? vistaIglesia : VISTAS[tab])(); window.scrollTo(0, 0); $('#pantalla').focus({ preventScroll: true }); pantEntra(sentido);
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sin vibración */ } ir(b.dataset.tab); }));
  const red = () => { $('#sinRed').hidden = navigator.onLine; };
  window.addEventListener('online', red); window.addEventListener('offline', red); red();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { /* sin sw: igual funciona */ });
  // ---------- F886: capa premium (ondas al tocar, aparición al bajar, números que suben, rebote de pestañas, paralaje) ----------
  (function premium() {
    try {
      const calma = () => { try { return document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; } };
      if (document.addEventListener) document.addEventListener('pointerdown', (ev) => {   // onda de luz donde tocas + rebote del ícono de la pestaña
        try {
          if (calma() || !ev || !ev.target || !ev.target.closest) return;
          const t = ev.target.closest('.btn,.card,.fila,.chip,.tab,.ico-cod'); if (!t) return;
          const r = t.getBoundingClientRect(), o = document.createElement('span'); o.className = 'onda'; o.setAttribute('aria-hidden', 'true');
          o.style.setProperty('--ox', (ev.clientX - r.left) + 'px'); o.style.setProperty('--oy', (ev.clientY - r.top) + 'px');
          t.appendChild(o); setTimeout(() => { try { o.remove(); } catch (e) { /* nada */ } }, 720);
          if (t.classList.contains('tab')) { const ic = t.querySelector('.ico'); if (ic) { ic.classList.remove('rebota'); void ic.offsetWidth; ic.classList.add('rebota'); } }
        } catch (e) { /* nada */ }
      }, { passive: true });
      let raf = 0;
      if (window.addEventListener) window.addEventListener('scroll', () => {                // paralaje suave del fondo y de los íconos grandes
        if (raf || calma() || typeof requestAnimationFrame !== 'function') return;
        raf = requestAnimationFrame(() => { raf = 0; try { const amb = document.querySelector('.ambiente'); if (amb) amb.style.setProperty('--par', String(Math.min(window.scrollY || 0, 400))); } catch (e) { /* nada */ } });
      }, { passive: true });
      const pan = document.querySelector('#pantalla');
      if (!pan || typeof MutationObserver !== 'function') return;
      const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return; const n = e.target; io.unobserve(n); n.classList.add('rv-on');
        setTimeout(() => { try { n.classList.remove('rv'); n.classList.remove('rv-on'); } catch (x) { /* nada */ } }, 1000);
      }), { threshold: 0.06 }) : null;
      let clave = '';
      new MutationObserver(() => {
        try {
          if (calma()) return;
          if (io) {
            const alto = window.innerHeight || 800;
            pan.querySelectorAll(':scope > .card, :scope > .lista, :scope > .stats, :scope > .grid > *, :scope > .logros > *').forEach((n) => { if (n.getBoundingClientRect().top > alto * 0.92) { n.classList.add('rv'); io.observe(n); } });
            setTimeout(() => { try { pan.querySelectorAll('.rv').forEach((n) => { n.classList.add('rv-on'); n.classList.remove('rv'); }); } catch (x) { /* nada */ } }, 4000);   // red de seguridad: nada se queda oculto
          }
          const nums = Array.from(pan.querySelectorAll('.stat b')), k = nums.map((b) => b.textContent).join('|');
          if (!nums.length) { clave = ''; return; }
          if (k === clave) return; clave = k;
          nums.forEach((b) => {                                                              // los números suben hasta su valor
            const v = parseInt(b.textContent, 10); if (!(v > 0) || String(v) !== b.textContent.trim()) return;
            const t0 = performance.now(), paso = (t) => { const f = Math.min(1, (t - t0) / 900); b.textContent = String(Math.round(v * (1 - Math.pow(1 - f, 3)))); if (f < 1) requestAnimationFrame(paso); };
            b.textContent = '0'; requestAnimationFrame(paso);
          });
        } catch (e) { /* nada */ }
      }).observe(pan, { childList: true });
    } catch (e) { /* sin capa premium: la app funciona igual */ }
  })();
  // ---------- F899 · Perfil ordenado (secciones que se abren y cierran) + pantalla de apertura ----------
  const pfAbierto = new Set(['Mis logros', 'Empieza']);
  function pfOrdenar() {                                    // agrupa cada título del Perfil con su contenido; mueve los elementos (no los recrea), así los botones siguen funcionando
    try {
      const p = $('#pantalla'); if (!p || !p.querySelector('.hac-perfil') || p.querySelector('.pf-grupo')) return;
      Array.from(p.querySelectorAll(':scope > h2.sep')).forEach((h) => {
        const nombre = h.textContent.trim(), d = document.createElement('details'), sm = document.createElement('summary');
        d.className = 'pf-grupo'; d.open = pfAbierto.has(nombre); sm.textContent = nombre; d.appendChild(sm);
        h.parentNode.insertBefore(d, h);
        let x = h.nextSibling; while (x && !(x.nodeType === 1 && x.matches && x.matches('h2.sep'))) { const nx = x.nextSibling; d.appendChild(x); x = nx; }
        h.remove(); d.addEventListener('toggle', () => { if (d.open) pfAbierto.add(nombre); else pfAbierto.delete(nombre); });
      });
    } catch (e) { /* sin orden: el Perfil se ve como antes */ }
  }
  try { if (window.MutationObserver && $('#pantalla')) new MutationObserver(pfOrdenar).observe($('#pantalla'), { childList: true }); } catch (e) { /* nada */ }
  (function arranque() {                                    // la pantalla de apertura (HTML + CSS) se quita sola; la 2.ª vez en la misma sesión ni se ve
    try {
      const el = $('#arranque'); if (!el) return;
      let visto = false; try { visto = sessionStorage.getItem('tb_movil_arr') === '1'; sessionStorage.setItem('tb_movil_arr', '1'); } catch (e) { /* nada */ }
      if (visto) { el.remove(); return; }
      // F904: el teléfono no deja sonar hasta el primer toque. Si el audio aún está dormido, la apertura espera un instante («Toca para entrar») y,
      // al tocar, la animación vuelve a empezar JUNTO con la melodía: el sonido y el movimiento nacen a la vez (antes la melodía llegaba tarde, con la animación ya terminada).
      let sale = setTimeout(() => { try { el.remove(); } catch (e) { /* nada */ } }, 3700);
      const S = window.TBSonido;
      setTimeout(() => {
        try {
          if (!S || !S.activo() || S.corriendo() || !document.body.contains(el)) return;
          clearTimeout(sale);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'arr-toca'; b.textContent = 'Toca para entrar';
          el.appendChild(b); el.classList.add('espera');
          const esperaMax = setTimeout(() => { try { el.remove(); } catch (e) { /* nada */ } }, 25000);
          b.addEventListener('click', () => {
            clearTimeout(esperaMax); try { S.primero(); } catch (e) { /* sin sonido */ }
            try { b.remove(); el.classList.remove('espera'); const lista = Array.from(el.children); lista.forEach((c) => { if (c.style) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; } }); } catch (e) { /* sin reinicio */ }
            sale = setTimeout(() => { try { el.remove(); } catch (e) { /* nada */ } }, 4300);
          });
        } catch (e) { /* nada */ }
      }, 700);
    } catch (e) { /* nada */ }
  })();
  try {   // F888 · modo prueba: abrir la app con ?reiniciar=1 borra lo guardado en este dispositivo y vuelve a la primera vez
    if (/[?&]reiniciar=1/.test(String((window.location && window.location.search) || ''))) {
      Object.keys(localStorage).filter((k) => /^tb_movil_/.test(k)).forEach((k) => localStorage.removeItem(k));
      if (window.history && history.replaceState) history.replaceState(null, '', window.location.pathname);
    }
  } catch (e) { /* sin modo prueba */ }
  // F892: sin cuenta, ni iglesia, ni solicitud (primera vez o quien dijo «solo quiero leer») se abre la portada animada cada vez; con cuenta o iglesia, directo a la app
  const portadaYaVista = () => { try { if (sessionStorage.getItem('tb_movil_portada') === '1') return true; sessionStorage.setItem('tb_movil_portada', '1'); return false; } catch (e) { return true; } };   // una vez por apertura (no en cada recarga); si no hay dónde anotarlo, no molesta
  marcaDentro();
  if (!haySesion() ? (!hayOnb() || !portadaYaVista()) : (!codigoDeEnlace() && (!hayOnb() || !portadaYaVista()))) onbSplash(); else ir(tabInicio());   // F936: sin sesión, la portada y luego la puerta   // F893: la portada sale al abrir la app para todos (una vez por apertura)
  try {   // F898: atajos del ícono instalado (manifest → shortcuts)
    const q = new URLSearchParams(String((window.location && window.location.search) || '').slice(1)).get('ir');
    const at = { versiculo: vistaVersiculo, biblia: vistaBiblia, calendario: vistaCalendario };
    if (q && at[q] && haySesion() && !codigoDeEnlace()) setTimeout(() => { try { ir('palabra'); at[q](); } catch (e) { /* nada */ } }, 60);
  } catch (e) { /* sin atajo */ }
  const fechasProx = () => { try { const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const a = hoy.getFullYear(); return fechasSantas(a, tradLeer()).concat(fechasSantas(a + 1, tradLeer())).filter((x) => x[0] >= hoy && x[4] !== 'mes').sort((x, y) => x[0] - y[0]).slice(0, 6).map((x) => ({ id: 's' + x[0].getTime(), t: x[1], fecha: x[0] })); } catch (e) { return []; } };
  window.TBApp = { fechasProx, sb: SB, leer, guardar, esc, ir, vibra, svg, volverVida: () => ir('inicio'), irA: (d) => { const m = { lectura: () => { ir('palabra'); vistaBiblia(); }, vida: () => ir('vida'), plan: () => { ir('palabra'); vistaPlanes(); }, oracion: () => { ir('vida'); vistaMiOracion(); }, juego: () => { ir('palabra'); vistaJuegos(); } }; if (m[d]) m[d](); }, guardarAjuste: (c) => { perfilGuardar(c); ajusteAplicar(); } };   // F901: lo usan identidad.js (ejemplos y Juntos)
  syncInicio();
})();
