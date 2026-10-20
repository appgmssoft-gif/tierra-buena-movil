// mes_iglesia.js - F1310 · Calendario del mes para miembros (Mi iglesia > Servir > Ver el mes completo).
// Cuadrícula por días con un punto por cada servicio (dorado = tuyo). Al tocar un día se ven quién sirve y a qué hora.
// Usa turno_iglesia_listar (ya existe en la base). Solo lectura: no cambia nada.
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const $ = (s) => document.querySelector(s);
  const esc = (t) => (A().esc ? A().esc(t) : String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const norm = (x) => String(x || '').trim().toLowerCase();
  const CACHE = new Map(); // mes «2026-10» -> filas (en memoria; se reinicia al cerrar la app)
  const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  let st = null; // { id, volver, y, m, sel, soloMio }

  const clave = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
  const kDia = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const tituloMes = (y, m) => { const t = new Date(y, m, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };

  async function cargar(y, m) {
    const k = clave(y, m);
    if (CACHE.has(k)) return CACHE.get(k);
    const sb = A().sb;
    if (!sb) return { ok: false };
    try {
      const { data, error } = await sb.rpc('turno_iglesia_listar', {
        p_codigo: st.id.codigo, p_clave: st.id.clave,
        p_desde: new Date(y, m, 1).toISOString(), p_hasta: new Date(y, m + 1, 1).toISOString()
      });
      if (error) return { ok: false };
      const r = { ok: true, filas: (data || []).slice().sort((a, b) => new Date(a.inicio) - new Date(b.inicio)) };
      CACHE.set(k, r);
      return r;
    } catch (e) { return { ok: false }; }
  }

  function esMio(t) { const yo = norm(st.id.nombre); return !!yo && norm(t.miembro) === yo; }

  function pintar(r) {
    const cont = $('#mesCuerpo'); if (!cont) return;
    if (!r.ok) { cont.innerHTML = '<p class="suave m0">No pudimos cargar el calendario. Revisa tu conexión y vuelve a intentarlo.</p>'; return; }

    const filas = st.soloMio ? r.filas.filter(esMio) : r.filas;
    const porDia = new Map();
    filas.forEach((t) => { const k = kDia(new Date(t.inicio)); if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(t); });

    const primero = new Date(st.y, st.m, 1);
    const diasMes = new Date(st.y, st.m + 1, 0).getDate();
    if (st.sel > diasMes) st.sel = 1;
    const huecos = (primero.getDay() + 6) % 7; // semana empieza en lunes
    const hoy = new Date();

    let celdas = '';
    for (let i = 0; i < huecos; i++) celdas += '<span class="mes-vacio" aria-hidden="true"></span>';
    for (let d = 1; d <= diasMes; d++) {
      const f = new Date(st.y, st.m, d), k = kDia(f), lista = porDia.get(k) || [];
      const puntos = lista.slice(0, 3).map((t) => '<i class="mes-pt' + (esMio(t) ? ' mio' : '') + '"></i>').join('');
      const cls = ['mes-dia'];
      if (lista.length) cls.push('con');
      if (lista.some(esMio)) cls.push('tuyo');
      if (f.toDateString() === hoy.toDateString()) cls.push('hoy');
      if (st.sel === d) cls.push('sel');
      celdas += '<button type="button" class="' + cls.join(' ') + '" data-dia="' + d + '" aria-pressed="' + (st.sel === d) + '" aria-label="' + d + ' de ' + st.y + ', ' + (lista.length ? lista.length + (lista.length === 1 ? ' servicio' : ' servicios') : 'sin servicios') + '"><b>' + d + '</b><span class="mes-pts">' + puntos + '</span></button>';
    }

    const totalMes = filas.length, mios = r.filas.filter(esMio).length;
    const resumen = '<p class="suave m0 mes-resumen">' + r.filas.length + (r.filas.length === 1 ? ' servicio' : ' servicios') + ' este mes' + (mios ? ' · <b>' + mios + (mios === 1 ? ' es tuyo' : ' son tuyos') + '</b>' : '') + '.</p>';

    const lista = porDia.get(kDia(new Date(st.y, st.m, st.sel))) || [];
    const fechaSel = new Date(st.y, st.m, st.sel);
    const detalle = '<h2 class="mi-sub mes-sub">' + esc(fechaSel.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })) + '</h2>' +
      (lista.length
        ? '<div class="mes-det">' + lista.map((t) => {
            const h = new Date(t.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            return '<div class="mes-fila' + (esMio(t) ? ' mio' : '') + '"><span class="mes-hora">' + esc(h) + '</span><span class="mes-fila-tx"><b>' + esc(t.titulo) + '</b><small>' + esc(t.miembro || '') + (esMio(t) ? ' · Tú' : '') + '</small></span></div>';
          }).join('') + '</div>'
        : '<p class="suave m0">Sin servicios este día.</p>');

    cont.innerHTML =
      resumen +
      '<div class="mes-grid" role="grid" aria-label="Días de ' + esc(tituloMes(st.y, st.m)) + '">' +
        DIAS.map((x) => '<span class="mes-cab" aria-hidden="true">' + x + '</span>').join('') + celdas +
      '</div>' +
      '<p class="mes-leyenda suave m0"><i class="mes-pt"></i> servicio de la iglesia · <i class="mes-pt mio"></i> tuyo</p>' +
      detalle;

    cont.querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => {
      st.sel = Number(b.dataset.dia);
      if (A().vibra) A().vibra();
      pintar(st.ultimo);
    }));
  }

  function marco() {
    const { y, m } = st;
    $('#pantalla').innerHTML =
      '<button type="button" class="volver" id="volver">‹ ' + esc(st.volverTxt) + '</button>' +
      '<h1>Calendario del mes</h1>' +
      '<section class="mes">' +
        '<div class="mes-nav">' +
          '<button type="button" class="mes-flecha" id="mesPrev" aria-label="Mes anterior">‹</button>' +
          '<b id="mesTitulo">' + esc(tituloMes(y, m)) + '</b>' +
          '<button type="button" class="mes-flecha" id="mesNext" aria-label="Mes siguiente">›</button>' +
        '</div>' +
        '<div class="mes-filtros"><button type="button" class="chip' + (st.soloMio ? ' on' : '') + '" id="mesSoloMio" aria-pressed="' + st.soloMio + '">Solo mis turnos</button></div>' +
        '<div id="mesCuerpo"><p class="suave m0">Cargando el mes…</p></div>' +
      '</section>';
    $('#volver').onclick = st.volver;
    $('#mesPrev').onclick = () => cambiar(-1);
    $('#mesNext').onclick = () => cambiar(1);
    $('#mesSoloMio').onclick = () => { st.soloMio = !st.soloMio; mostrar(); };
  }

  async function cambiar(paso) {
    const f = new Date(st.y, st.m + paso, 1);
    st.y = f.getFullYear(); st.m = f.getMonth(); st.sel = 1;
    mostrar();
  }

  async function mostrar() {
    marco();
    const y = st.y, m = st.m;
    const r = await cargar(y, m);
    // Si el usuario cambió de mes mientras cargaba, no pintar el mes viejo
    if (st.y !== y || st.m !== m || !$('#mesCuerpo')) return;
    st.ultimo = r;
    pintar(r);
  }

  // Abre el calendario. `id` = {codigo, clave, nombre}; `volver` = función que regresa a Servir.
  function abrir(id, volver) {
    const hoy = new Date();
    st = { id, volver, volverTxt: 'Servir', y: hoy.getFullYear(), m: hoy.getMonth(), sel: hoy.getDate(), soloMio: false };
    mostrar();
  }

  window.TBMesIglesia = { abrir };
})();
