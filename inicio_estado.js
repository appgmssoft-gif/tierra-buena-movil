// inicio_estado.js - F922 · I1. LÓGICA del Inicio «Tierra Buena» (árbol mensual, maleza, gotas de rocío, vivero). SIN pantalla: solo estado, reglas y guardado.
// Plan y decisiones: compartido/docs/PLAN_INICIO_TIERRA_BUENA.md. Catálogo (solo lectura): datos/inicio_catalogo.json.
// Todo es local (clave tb_inicio_v1). Nada se castiga: faltar solo pausa el crecimiento y aparece maleza que se sana tocándola.
// Uso: TBInicio.config(catalogo); const r = TBInicio.visita(); ... Cada función devuelve datos simples y nunca lanza error a la pantalla.
'use strict';
(function () {
  const K = 'tb_inicio_v1', VERSION = 1;
  let CAT = null, HOY = null, ALM = null;                 // catálogo, reloj y almacén inyectables (para las pruebas)
  const almacen = () => ALM || (typeof localStorage !== 'undefined' ? localStorage : null);
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hoy = () => (HOY ? HOY() : iso(new Date()));       // fecha LOCAL del teléfono, AAAA-MM-DD
  const dnum = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : NaN; };
  const dif = (a, b) => dnum(a) - dnum(b);                  // días entre dos fechas
  const tope = (n, a, b) => Math.max(a, Math.min(b, n));
  const idc = (p) => p + Math.random().toString(36).slice(2, 7);

  const nuevo = () => ({ v: VERSION, ciclo: { n: 1, especie: null, inicio: null, diasCuidado: 0, ultimoDia: null, ultimaVisita: null, cerrado: false, diaPendiente: false },
    eligiendo: true, tematica: null, habDias: 0, paisaje: [], maleza: [], gotas: { saldo: 0, total: 0, pendientes: [], hoy: { fecha: null, lectura: 0, vida: 0 } },
    vivero: { desbloqueados: [], plantas: [], aves: [], ambientes: [] }, cosechas: { total: 0, pend: [], ult: {} }, trivia: { fecha: null, i: null, ok: false, elegida: null } });

  function migrar(x) {                                      // dato dañado o de otra versión → se rescata lo que sirve; nunca error en pantalla
    const b = nuevo(); if (!x || typeof x !== 'object') return b;
    try {
      const c = x.ciclo || {};
      b.ciclo = { n: tope(+c.n || 1, 1, 9999), especie: typeof c.especie === 'string' ? c.especie : null, inicio: c.inicio || null, diasCuidado: tope(+c.diasCuidado || 0, 0, (cat().ciclo && cat().ciclo.dias) || 10),
        ultimoDia: c.ultimoDia || null, ultimaVisita: c.ultimaVisita || c.ultimoDia || null, cerrado: !!c.cerrado, diaPendiente: !!c.diaPendiente };
      b.eligiendo = x.eligiendo === undefined ? !b.ciclo.especie : !!x.eligiendo;
      b.tematica = typeof x.tematica === 'string' ? x.tematica : null;   // F965: temática activa
      b.habDias = tope(+x.habDias || 0, 0, (cat().ciclo && cat().ciclo.habitat_dias) || 30);   // F1076: días del hábitat (30)
      if (Array.isArray(x.paisaje)) b.paisaje = x.paisaje.filter((p) => p && p.especie).slice(-6);
      if (Array.isArray(x.maleza)) b.maleza = x.maleza.filter((m) => m && m.id && m.casilla).slice(0, 5);
      const g = x.gotas || {}; b.gotas = { saldo: Math.max(0, +g.saldo || 0), total: Math.max(0, +g.total || 0), pendientes: Array.isArray(g.pendientes) ? g.pendientes.filter((p) => p && p.id).slice(0, 30) : [],
        hoy: { fecha: (g.hoy && g.hoy.fecha) || null, lectura: +(g.hoy && g.hoy.lectura) || 0, vida: +(g.hoy && g.hoy.vida) || 0, plan: +(g.hoy && g.hoy.plan) || 0, oracion: +(g.hoy && g.hoy.oracion) || 0 } };
      const w = x.vivero || {}; b.vivero = { desbloqueados: Array.isArray(w.desbloqueados) ? w.desbloqueados.filter((s) => typeof s === 'string') : [],
        plantas: Array.isArray(w.plantas) ? w.plantas.filter((p) => p && p.id && p.casilla) : [], aves: Array.isArray(w.aves) ? w.aves.filter((p) => p && p.id) : [], ambientes: Array.isArray(w.ambientes) ? w.ambientes.filter((s) => typeof s === 'string').slice(0, 6) : [] };
      const q = x.cosechas || {}; b.cosechas = { total: Math.max(0, Math.floor(+q.total || 0)), pend: Array.isArray(q.pend) ? q.pend.filter((f) => f && f.id && f.casilla).slice(0, 12) : [], ult: q.ult && typeof q.ult === 'object' ? Object.keys(q.ult).slice(-60).reduce((o, k) => { if (typeof q.ult[k] === 'string') o[k] = q.ult[k]; return o; }, {}) : {} };   // F959: frutos
      const t = x.trivia || {}; b.trivia = { fecha: typeof t.fecha === 'string' ? t.fecha : null, i: Number.isInteger(t.i) ? t.i : null, ok: !!t.ok, elegida: Number.isInteger(t.elegida) ? t.elegida : null };   // F961: trivia diaria
    } catch (e) { return nuevo(); }
    return b;
  }
  function cargar() { try { const a = almacen(); return migrar(a ? JSON.parse(a.getItem(K) || 'null') : null); } catch (e) { return nuevo(); } }
  function guardar(e) { try { const a = almacen(); if (a) a.setItem(K, JSON.stringify(e)); } catch (er) { /* sin guardar: el jardín sigue funcionando esta sesión */ } return e; }
  const cat = () => CAT || { ciclo: { dias: 30, etapas: [{ id: 'brote', desde: 1 }, { id: 'raiz', desde: 8 }, { id: 'ramas', desde: 15 }, { id: 'frondoso', desde: 22 }], maleza_max: 5, paisaje_guardado: 12 }, orden_especies: ['araucaria'], primera_eleccion: ['araucaria'], especies: {}, semillas: {}, aves: {}, economia: { origenes: {}, pendientes_max: 30, aves_activas_max: 2 }, maleza: { tipos: ['hoja_seca'], tabla: [] }, casillas: { pasto: [], fondo: [] } };

  // Etapa del árbol según los días de cuidado (0 = aún no hay árbol: se está eligiendo la semilla).
  // F1005 · Avance diario: cada día se nota. La escala crece del 78 % al 100 % a lo largo del ciclo, y dentro de cada etapa se ve el porcentaje.
  function avanceDiario(dias) {
    const c = cat().ciclo, tot = c.dias || 30, d = Math.max(1, Math.min(tot, dias || 1));
    const e = etapa(d), idx = Math.max(0, c.etapas.findIndex((s) => s.id === e));
    const ini = c.etapas[idx].desde, fin = idx + 1 < c.etapas.length ? c.etapas[idx + 1].desde : tot + 1;
    const fraccion = Math.min(1, Math.max(0, (d - ini) / (fin - ini)));
    // F1015: crecimiento que se nota desde el día 2: sube rápido al comienzo y luego se suaviza. Hojas nuevas cada día en la copa.
    const avance = Math.max(0, d - 1) / Math.max(1, tot - 1);   // F1070: crecimiento lineal: cada día se nota
    const escala = 0.55 + 0.45 * avance;
    const hojas = Math.min(42, Math.round(d * 1.4));
    return { dia: d, total: tot, etapa: e, fraccion: Math.round(fraccion * 100) / 100, escala: Math.round(escala * 1000) / 1000, hojas: hojas };
  }
  // F1006 · Entorno que crece con el árbol: cuántos elementos comprados se ven según el día (todos al día 30).
  function entornoVisible(total, dia) {
    const tot = cat().ciclo.dias || 30; if (!total) return 0;
    return Math.min(total, Math.max(1, Math.ceil(total * Math.min(Math.max(1, dia || 1), tot) / tot)));
  }
  function etapa(dias) { const et = cat().ciclo.etapas; let r = null; if (dias >= 1) for (const s of et) if (dias >= s.desde) r = s.id; return r; }
  // Cuánta maleza corresponde a una ausencia (en días completos SIN entrar). 0 o 1 día sin entrar = ninguna (gracia).
  function malezaPara(ausencia) { let n = 0; for (const f of cat().maleza.tabla) if (ausencia >= f.ausencia) n = f.cantidad; return Math.min(n, cat().ciclo.maleza_max || 5); }
  // Siguiente especie del ciclo: la primera del orden que aún no se ha vivido; si ya se vivieron todas, se repite el orden.
  function siguienteEspecie(e) {
    const t = e.tematica && (cat().tematicas || {})[e.tematica], em = t && t.arbol;   // F1071: el árbol sale del emblema del hábitat activo
    if (em && (cat().especies || {})[em]) return em;
    const orden = cat().orden_especies, vividas = e.paisaje.map((p) => p.especie).concat(e.ciclo.especie ? [e.ciclo.especie] : []);
    const libre = orden.find((s) => vividas.indexOf(s) < 0); if (libre) return libre;
    const k = vividas.length ? orden.indexOf(vividas[vividas.length - 1]) : -1; return orden[(k + 1) % orden.length];
  }
  function casillaLibre(e, grupo, pref) {                  // primera casilla libre del grupo (o de la lista dada); null si no hay
    const usadas = new Set([].concat(e.maleza.map((m) => m.casilla), e.gotas.pendientes.map((g) => g.casilla), e.vivero.plantas.map((p) => p.casilla), e.paisaje.map((p) => p.casilla)));
    const lista = pref || cat().casillas[grupo] || []; return lista.find((c) => !usadas.has(c)) || null;
  }
  function paisajeNuevo(e) {                                // el árbol maduro pasa al fondo
    const c = e.ciclo; const cas = casillaLibre(e, 'fondo') || ('fondo-' + (((c.n - 1) % (cat().casillas.fondo.length || 6)) + 1));
    e.paisaje = e.paisaje.filter((p) => p.casilla !== cas); e.paisaje.push({ ciclo: c.n, especie: c.especie, casilla: cas }); e.paisaje = e.paisaje.slice(-(cat().ciclo.paisaje_guardado || 6));
  }

  // Primera semilla: la persona elige entre las que ofrece el catálogo. Devuelve false si el id no corresponde o ya eligió.
  function elegirPrimera(id) {
    const e = cargar(); if (!e.eligiendo || cat().primera_eleccion.indexOf(id) < 0) return false;
    const h = hoy(); e.ciclo = { n: 1, especie: id, inicio: h, diasCuidado: 1, ultimoDia: h, ultimaVisita: h, cerrado: false, diaPendiente: false }; e.eligiendo = false; guardar(e); return true;
  }

  // Se llama cada vez que se abre Inicio. Cuenta el día de cuidado, calcula maleza, cierra o abre ciclos.
  // Devuelve { diaNuevo, maleza (cantidad pendiente), cicloNuevo, panoramica (true si hay que hacer el paneo), etapa, etapaCambio, eligiendo, pausado }.
  function visita() {
    const e = cargar(), h = hoy(), c = e.ciclo, r = { diaNuevo: false, maleza: e.maleza.length, cicloNuevo: false, panoramica: false, etapa: etapa(c.diasCuidado), etapaCambio: false, eligiendo: e.eligiendo, pausado: false };
    if (!isFinite(dnum(h))) return r;
    if (e.eligiendo) { guardar(e); return r; }
    if (c.ultimaVisita && dif(h, c.ultimaVisita) < 0) { r.pausado = e.maleza.length > 0 || c.diaPendiente; return r; }   // reloj del teléfono hacia atrás: no se toca nada
    const ausencia = c.ultimaVisita ? Math.max(0, dif(h, c.ultimaVisita) - 1) : 0, antes = etapa(c.diasCuidado);
    const cc = e.ciclo;
    if (ausencia >= 2) {                                   // ausencia: aparece maleza (sin superar el tope; lo que ya había se conserva)
      const objetivo = malezaPara(ausencia), tipos = cat().maleza.tipos;
      while (e.maleza.length < objetivo) { const cas = casillaLibre(e, 'pasto'); if (!cas) break; e.maleza.push({ id: idc('m'), tipo: tipos[e.maleza.length % tipos.length], casilla: cas, desde: h }); }
    }
    cc.ultimaVisita = h;
    if (h !== cc.ultimoDia) {
      if (e.maleza.length > 0) { cc.diaPendiente = true; r.pausado = true; }   // con maleza el crecimiento queda en pausa hasta sanar
      else { cc.diasCuidado = Math.min(cat().ciclo.dias, cc.diasCuidado + 1); cc.ultimoDia = h; cc.diaPendiente = false; r.diaNuevo = true; e.habDias = Math.min(HAB_DIAS(), (e.habDias || 0) + 1); if (cc.diasCuidado >= cat().ciclo.dias) cc.cerrado = true; }
    } else if (e.maleza.length > 0) r.pausado = true;
    r.maleza = e.maleza.length; r.etapa = etapa(cc.diasCuidado); r.etapaCambio = r.etapa !== antes; guardar(e); return r;
  }

  // Sana UNA maleza (toque). Al sanar la última, el día pendiente cuenta y el crecimiento sigue. Devuelve { ok, quedan, diaNuevo }.
  function sanar(id) {
    const e = cargar(), i = e.maleza.findIndex((m) => m.id === id); if (i < 0) return { ok: false, quedan: e.maleza.length, diaNuevo: false };
    e.maleza.splice(i, 1); let diaNuevo = false; const c = e.ciclo;
    if (e.maleza.length === 0 && c.diaPendiente) { c.diaPendiente = false; c.ultimoDia = hoy(); c.diasCuidado = Math.min(cat().ciclo.dias, c.diasCuidado + 1); diaNuevo = true; e.habDias = Math.min(HAB_DIAS(), (e.habDias || 0) + 1); if (c.diasCuidado >= cat().ciclo.dias) c.cerrado = true; }
    guardar(e); return { ok: true, quedan: e.maleza.length, diaNuevo };
  }

  // ---- Gotas de rocío ----
  function reiniciaHoy(e) { const h = hoy(); if (e.gotas.hoy.fecha !== h) e.gotas.hoy = { fecha: h, lectura: 0, vida: 0, plan: 0, oracion: 0 }; }
  // Ganar gotas por leer o por una acción de Vida. Respeta el tope diario y el máximo de pendientes. Devuelve la cantidad realmente agregada.
  function ganar(origen) {
    const o = cat().economia.origenes[origen]; if (!o) return 0; const e = cargar(); reiniciaHoy(e);
    let n = 0; for (let i = 0; i < o.gotas; i++) {
      if ((e.gotas.hoy[origen] || 0) >= o.tope_dia || e.gotas.pendientes.length >= (cat().economia.pendientes_max || 30)) break;
      const cas = casillaLibre(e, 'pasto') || 'pasto-' + (1 + e.gotas.pendientes.length % 8); e.gotas.pendientes.push({ id: idc('g'), casilla: cas, origen, en: hoy() }); e.gotas.hoy[origen] = (e.gotas.hoy[origen] || 0) + 1; n++;
    }
    guardar(e); return n;
  }
  function recolectar(id) {                                // toque en una gota; id = 'todas' recolecta el grupo «+n»
    const e = cargar(); let sel = [];
    if (id === 'todas') sel = e.gotas.pendientes.splice(0);
    else { const i = e.gotas.pendientes.findIndex((g) => g.id === id); if (i >= 0) sel = e.gotas.pendientes.splice(i, 1); }
    e.gotas.saldo += sel.length; e.gotas.total += sel.length; guardar(e); return sel.length;
  }
  // ---- Vivero ----
  // F1067 · Cada planta, ave o ambiente se ve solo en su hábitat (o en cualquiera si es general). Lo demás queda guardado y vuelve al elegir ese hábitat.
  function visibleEn(tipo, id, tem) {
    const it = (cat()[tipo === 'semilla' ? 'semillas' : tipo === 'ave' ? 'aves' : 'ambientes'] || {})[id] || {};
    const h = it.habitat && it.habitat.length ? it.habitat : ['general'];
    return h.indexOf('general') >= 0 || (!!tem && h.indexOf(tem) >= 0);
  }
  const PREF = { semilla: 'sem_', ave: 'ave_', ambiente: 'amb_', lugar: 'lug_', clima: 'cli_', tema: 'tem_' }, LISTA = { semilla: 'semillas', ave: 'aves', ambiente: 'ambientes', lugar: 'lugares', clima: 'climas', tema: 'tematicas' }, GRATIS = { lugar: 'colinas', clima: 'natural' };
  function tiene(tipo, id) { if (GRATIS[tipo] === id) return true; return cargar().vivero.desbloqueados.indexOf(PREF[tipo] + id) >= 0; }
  function comprar(tipo, id) {                             // tipo: 'semilla' | 'ave' | 'lugar' | 'clima'. Devuelve { ok, motivo }
    const e = cargar(), it = (cat()[LISTA[tipo]] || {})[id]; if (!it) return { ok: false, motivo: 'no-existe' };
    const clave = PREF[tipo] + id; if (e.vivero.desbloqueados.indexOf(clave) >= 0) return { ok: false, motivo: 'ya-tienes' };
    if (e.gotas.saldo < it.precio) return { ok: false, motivo: 'faltan-gotas' };
    e.gotas.saldo -= it.precio; e.vivero.desbloqueados.push(clave); guardar(e); return { ok: true, motivo: null };
  }
  function plantar(id) {                                   // planta una semilla ya desbloqueada en una casilla libre permitida
    const e = cargar(), it = cat().semillas[id]; if (!it || e.vivero.desbloqueados.indexOf('sem_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    if (it.habitat && it.habitat.indexOf(e.tematica) < 0) return { ok: false, motivo: 'otra-tematica' };   // F965/F1067: una planta de hábitat se planta solo con ese hábitat como fondo (nunca cambia el fondo sola)
    const cas = casillaLibre(e, 'pasto', it.casillas); if (!cas) return { ok: false, motivo: 'sin-lugar' };
    e.vivero.plantas.push({ id, casilla: cas, en: hoy() }); guardar(e); return { ok: true, casilla: cas };
  }
  function elegirTematica(id) {                            // F965: usa una temática ya comprada; null la quita. Devuelve { ok, motivo }
    const e = cargar(); if (id === null) { e.tematica = null; guardar(e); return { ok: true, motivo: null }; }
    if (!(cat().tematicas || {})[id]) return { ok: false, motivo: 'no-existe' };
    if (e.vivero.desbloqueados.indexOf('tem_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    e.tematica = id; guardar(e); return { ok: true, motivo: null };
  }
  function activarAve(id, si) {                            // máximo 2 aves activas a la vez (cuidado de la batería)
    const e = cargar(); if (e.vivero.desbloqueados.indexOf('ave_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    const ave = (cat().aves || {})[id]; if (ave && ave.habitat && ave.habitat.indexOf(e.tematica) < 0 && si !== false) return { ok: false, motivo: 'otra-tematica' };   // F969: aves exóticas solo con su temática
    const i = e.vivero.aves.findIndex((a) => a.id === id);
    if (si === false) { if (i >= 0) e.vivero.aves.splice(i, 1); guardar(e); return { ok: true }; }
    if (i >= 0) return { ok: true };
    if (e.vivero.aves.filter((a) => visibleEn('ave', a.id, e.tematica)).length >= (cat().economia.aves_activas_max || 2)) return { ok: false, motivo: 'maximo' };   // F1067: solo cuentan las aves del hábitat activo
    e.vivero.aves.push({ id, desde: hoy() }); guardar(e); return { ok: true };
  }
  // F1055 · Ambientes (luciérnagas): se compran con gotas y se encienden o apagan. Sin límite de cantidad; solo con su hábitat activo.
  function activarAmbiente(id, si) {
    const e = cargar(); if (e.vivero.desbloqueados.indexOf('amb_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    const it = (cat().ambientes || {})[id]; if (it && it.habitat && it.habitat.indexOf(e.tematica) < 0 && si !== false) return { ok: false, motivo: 'otra-tematica' };
    e.vivero.ambientes = e.vivero.ambientes || [];
    const i = e.vivero.ambientes.indexOf(id);
    if (si === false) { if (i >= 0) e.vivero.ambientes.splice(i, 1); guardar(e); return { ok: true }; }
    if (i < 0) e.vivero.ambientes.push(id); guardar(e); return { ok: true };
  }
  // F1074 · Primera elección: el lugar del jardín (bosque, desierto o costa). Compra el hábitat, lo activa y su árbol emblemático es el primero.
  const HABITATS_INICIALES = ['bosque', 'desierto', 'costa'];
  const HAB_DIAS = () => (cat().ciclo && cat().ciclo.habitat_dias) || 30;   // F1076: el hábitat se completa en 30 días (tres rasgos de 10)
  function elegirHabitatInicial(h) {
    const e = cargar(); if (!e.eligiendo || HABITATS_INICIALES.indexOf(h) < 0) return false;
    const t = (cat().tematicas || {})[h] || {}, em = t.arbol && (cat().especies || {})[t.arbol] ? t.arbol : null;
    if (!em) return false;
    const c = 'tem_' + h; if (e.vivero.desbloqueados.indexOf(c) < 0) e.vivero.desbloqueados.push(c);
    const hoyS = hoy(); e.tematica = h;
    e.ciclo = { n: 1, especie: em, inicio: hoyS, diasCuidado: 1, ultimoDia: hoyS, ultimaVisita: hoyS, cerrado: false, diaPendiente: false };
    e.habDias = 1; e.eligiendo = false; guardar(e); return true;
  }
  function tieneEspecial(id) { return cargar().vivero.desbloqueados.indexOf('esp_' + id) >= 0; }
  function comprarEspecial(id) {                           // contenido de «Tu paisaje»: se paga solo con frutos y requiere tener ese paisaje. Devuelve { ok, motivo }
    const e = cargar(), it = (cat().especiales || {})[id]; if (!it) return { ok: false, motivo: 'no-existe' };
    if (e.vivero.desbloqueados.indexOf('esp_' + id) >= 0) return { ok: false, motivo: 'ya-tienes' };
    if (it.lugar && !tiene('lugar', it.lugar)) return { ok: false, motivo: 'falta-lugar' };
    const precio = +it.precio || 0; if (e.gotas.saldo < precio) return { ok: false, motivo: 'faltan-gotas' };   // F1070: se paga con gotas (sin frutos)
    e.gotas.saldo -= precio; e.vivero.desbloqueados.push('esp_' + id); guardar(e); return { ok: true, motivo: null };
  }
  // F933 · Mensajes del día: 3 por día que cambian solos con la fecha (no con el botón). 1 = dato real del árbol, 2 = respeto a la naturaleza y al planeta, 3 = crecer como personas y sociedad.
  // Rotan por los días desde que empezó el árbol (`salto` suma días: solo para pruebas). Los datos propios de la especie y los comunes se alternan.
  const mezcla = (a, b) => { const r = [], n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) { if (i < a.length) r.push(a[i]); if (i < b.length) r.push(b[i]); } return r; };
  const dia = (e, salto) => { const c = e.ciclo, d = c.inicio && isFinite(dnum(c.inicio)) ? Math.max(0, dif(hoy(), c.inicio)) : (c.diasCuidado || 0); return d + (salto || 0); };
  const elige = (L, d) => (L.length ? L[((d % L.length) + L.length) % L.length] : null);
  function mensajeActual(salto) { const e = cargar(), K = cat(), s = K.especies[e.ciclo.especie]; if (!s) return null; const d = dia(e, salto);
    const La = mezcla(s.arbol || (s.dato ? [s.dato] : []), K.arbol_comun || []), Lp = mezcla(s.planeta || [], K.planeta_comun || []);
    const Lv = (s.vida || []).map((x) => ({ tema: x.tema, texto: x.texto })).concat((K.vida_comun || []).map((t) => ({ tema: 'Convivir mejor', texto: t })));
    const ta = elige(La, d), tp = elige(Lp, d), v = Lv.length ? Lv[((d % Lv.length) + Lv.length) % Lv.length] : null;
    const items = [ta ? { clave: 'arbol', titulo: 'Del árbol', texto: ta } : null, tp ? { clave: 'planeta', titulo: 'Para el planeta', texto: tp } : null, v ? { clave: 'vida', titulo: v.tema || 'Para crecer', texto: v.texto } : null].filter(Boolean);
    return { titulo: s.nombre + (s.otro ? ' · ' + s.otro : ''), mensaje: s.mensaje, dato: ta || s.dato, items, dia: d, como: K.como || null, vida: v ? { tema: v.tema, texto: v.texto, n: (d % Lv.length) + 1, de: Lv.length } : null }; }

  // ---- F961 · Trivia diaria de naturaleza (para todas las personas). Una pregunta por día que rota por la fecha; acertar da 3 gotas directas; fallar no castiga y muestra la respuesta. ----
  const rot = (d) => ((d % 3) + 3) % 3;                                   // las opciones giran según el día para que la correcta no quede siempre en el mismo lugar
  function triviaHoy() {
    const L = (cat().trivia || []); if (!L.length) return null; const e = cargar(), h = hoy(), d = dnum(h), i = ((Math.floor(d) * 11) % L.length + L.length) % L.length, q = L[i], r = rot(d);
    const ord = q.o.map((_, k) => (k + r) % q.o.length), hecha = e.trivia.fecha === h && e.trivia.i === i;
    const o = { i, pregunta: q.p, opciones: ord.map((k) => q.o[k]), resuelta: hecha, gotas: (cat().economia.origenes.trivia || { gotas: 3 }).gotas, racha: 0 };
    if (hecha) { o.ok = e.trivia.ok; o.elegida = e.trivia.elegida; o.correcta = ord.indexOf(q.c); o.explicacion = q.e; }
    return o;
  }
  function responderTrivia(pos) {                                          // pos = posición mostrada (0..2). Devuelve { ok, correcta, explicacion, gotas } o { ok:false, motivo }
    const t = triviaHoy(); if (!t) return { ok: false, motivo: 'sin-trivia' }; if (t.resuelta) return { ok: false, motivo: 'ya-respondida' };
    const L = cat().trivia, q = L[t.i], r = rot(dnum(hoy())), ord = q.o.map((_, k) => (k + r) % q.o.length); if (!(pos >= 0 && pos < ord.length)) return { ok: false, motivo: 'opcion' };
    const acierto = ord[pos] === q.c, e = cargar(), g = acierto ? t.gotas : 0;
    e.trivia = { fecha: hoy(), i: t.i, ok: acierto, elegida: pos }; if (g) { e.gotas.saldo += g; e.gotas.total += g; } guardar(e);
    return { ok: true, acierto, correcta: ord.indexOf(q.c), explicacion: q.e, gotas: g };
  }

  const api = { elegirHabitatInicial, visibleEn, avanceDiario, entornoVisible, config(o) { if (o && o.catalogo) CAT = o.catalogo; if (o && o.hoy) HOY = o.hoy; if (o && o.almacen) ALM = o.almacen; }, cargar, guardar, estado: cargar, etapa, malezaPara, elegirPrimera, visita, sanar, ganar, recolectar, comprar, tiene, plantar, activarAve, activarAmbiente, mensajeActual, tieneEspecial, comprarEspecial, triviaHoy, responderTrivia, elegirTematica, K };
  if (typeof window !== 'undefined') window.TBInicio = api; if (typeof module !== 'undefined') module.exports = api;
})();
