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
    eligiendo: true, paisaje: [], maleza: [], gotas: { saldo: 0, total: 0, pendientes: [], hoy: { fecha: null, lectura: 0, vida: 0 } },
    vivero: { desbloqueados: [], plantas: [], aves: [] } });

  function migrar(x) {                                      // dato dañado o de otra versión → se rescata lo que sirve; nunca error en pantalla
    const b = nuevo(); if (!x || typeof x !== 'object') return b;
    try {
      const c = x.ciclo || {};
      b.ciclo = { n: tope(+c.n || 1, 1, 9999), especie: typeof c.especie === 'string' ? c.especie : null, inicio: c.inicio || null, diasCuidado: tope(+c.diasCuidado || 0, 0, 30),
        ultimoDia: c.ultimoDia || null, ultimaVisita: c.ultimaVisita || c.ultimoDia || null, cerrado: !!c.cerrado, diaPendiente: !!c.diaPendiente };
      b.eligiendo = x.eligiendo === undefined ? !b.ciclo.especie : !!x.eligiendo;
      if (Array.isArray(x.paisaje)) b.paisaje = x.paisaje.filter((p) => p && p.especie).slice(-6);
      if (Array.isArray(x.maleza)) b.maleza = x.maleza.filter((m) => m && m.id && m.casilla).slice(0, 5);
      const g = x.gotas || {}; b.gotas = { saldo: Math.max(0, +g.saldo || 0), total: Math.max(0, +g.total || 0), pendientes: Array.isArray(g.pendientes) ? g.pendientes.filter((p) => p && p.id).slice(0, 30) : [],
        hoy: { fecha: (g.hoy && g.hoy.fecha) || null, lectura: +(g.hoy && g.hoy.lectura) || 0, vida: +(g.hoy && g.hoy.vida) || 0 } };
      const w = x.vivero || {}; b.vivero = { desbloqueados: Array.isArray(w.desbloqueados) ? w.desbloqueados.filter((s) => typeof s === 'string') : [],
        plantas: Array.isArray(w.plantas) ? w.plantas.filter((p) => p && p.id && p.casilla) : [], aves: Array.isArray(w.aves) ? w.aves.filter((p) => p && p.id) : [] };
    } catch (e) { return nuevo(); }
    return b;
  }
  function cargar() { try { const a = almacen(); return migrar(a ? JSON.parse(a.getItem(K) || 'null') : null); } catch (e) { return nuevo(); } }
  function guardar(e) { try { const a = almacen(); if (a) a.setItem(K, JSON.stringify(e)); } catch (er) { /* sin guardar: el jardín sigue funcionando esta sesión */ } return e; }
  const cat = () => CAT || { ciclo: { dias: 30, etapas: [{ id: 'brote', desde: 1 }, { id: 'raiz', desde: 8 }, { id: 'ramas', desde: 15 }, { id: 'frondoso', desde: 22 }], maleza_max: 5, paisaje_guardado: 12 }, orden_especies: ['araucaria'], primera_eleccion: ['araucaria'], especies: {}, semillas: {}, aves: {}, economia: { origenes: {}, pendientes_max: 30, aves_activas_max: 2 }, maleza: { tipos: ['hoja_seca'], tabla: [] }, casillas: { pasto: [], fondo: [] } };

  // Etapa del árbol según los días de cuidado (0 = aún no hay árbol: se está eligiendo la semilla).
  function etapa(dias) { const et = cat().ciclo.etapas; let r = null; if (dias >= 1) for (const s of et) if (dias >= s.desde) r = s.id; return r; }
  // Cuánta maleza corresponde a una ausencia (en días completos SIN entrar). 0 o 1 día sin entrar = ninguna (gracia).
  function malezaPara(ausencia) { let n = 0; for (const f of cat().maleza.tabla) if (ausencia >= f.ausencia) n = f.cantidad; return Math.min(n, cat().ciclo.maleza_max || 5); }
  // Siguiente especie del ciclo: la primera del orden que aún no se ha vivido; si ya se vivieron todas, se repite el orden.
  function siguienteEspecie(e) {
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
    if (c.cerrado && h !== c.ultimoDia) {                  // el árbol maduro pasa al paisaje y empieza otro mes con otra especie
      paisajeNuevo(e); const n = c.n + 1; e.ciclo = { n, especie: siguienteEspecie(e), inicio: h, diasCuidado: 0, ultimoDia: null, ultimaVisita: c.ultimaVisita, cerrado: false, diaPendiente: false };
      r.cicloNuevo = true; r.panoramica = true;
    }
    const cc = e.ciclo;
    if (ausencia >= 2) {                                   // ausencia: aparece maleza (sin superar el tope; lo que ya había se conserva)
      const objetivo = malezaPara(ausencia), tipos = cat().maleza.tipos;
      while (e.maleza.length < objetivo) { const cas = casillaLibre(e, 'pasto'); if (!cas) break; e.maleza.push({ id: idc('m'), tipo: tipos[e.maleza.length % tipos.length], casilla: cas, desde: h }); }
    }
    cc.ultimaVisita = h;
    if (h !== cc.ultimoDia) {
      if (e.maleza.length > 0) { cc.diaPendiente = true; r.pausado = true; }   // con maleza el crecimiento queda en pausa hasta sanar
      else { cc.diasCuidado = Math.min(cat().ciclo.dias, cc.diasCuidado + 1); cc.ultimoDia = h; cc.diaPendiente = false; r.diaNuevo = true; if (cc.diasCuidado >= cat().ciclo.dias) cc.cerrado = true; }
    } else if (e.maleza.length > 0) r.pausado = true;
    r.maleza = e.maleza.length; r.etapa = etapa(cc.diasCuidado); r.etapaCambio = r.etapa !== antes; guardar(e); return r;
  }

  // Sana UNA maleza (toque). Al sanar la última, el día pendiente cuenta y el crecimiento sigue. Devuelve { ok, quedan, diaNuevo }.
  function sanar(id) {
    const e = cargar(), i = e.maleza.findIndex((m) => m.id === id); if (i < 0) return { ok: false, quedan: e.maleza.length, diaNuevo: false };
    e.maleza.splice(i, 1); let diaNuevo = false; const c = e.ciclo;
    if (e.maleza.length === 0 && c.diaPendiente) { c.diaPendiente = false; c.ultimoDia = hoy(); c.diasCuidado = Math.min(cat().ciclo.dias, c.diasCuidado + 1); diaNuevo = true; if (c.diasCuidado >= cat().ciclo.dias) c.cerrado = true; }
    guardar(e); return { ok: true, quedan: e.maleza.length, diaNuevo };
  }

  // ---- Gotas de rocío ----
  function reiniciaHoy(e) { const h = hoy(); if (e.gotas.hoy.fecha !== h) e.gotas.hoy = { fecha: h, lectura: 0, vida: 0 }; }
  // Ganar gotas por leer o por una acción de Vida. Respeta el tope diario y el máximo de pendientes. Devuelve la cantidad realmente agregada.
  function ganar(origen) {
    const o = cat().economia.origenes[origen]; if (!o) return 0; const e = cargar(); reiniciaHoy(e);
    let n = 0; for (let i = 0; i < o.gotas; i++) {
      if (e.gotas.hoy[origen] >= o.tope_dia || e.gotas.pendientes.length >= (cat().economia.pendientes_max || 30)) break;
      const cas = casillaLibre(e, 'pasto') || 'pasto-' + (1 + e.gotas.pendientes.length % 8); e.gotas.pendientes.push({ id: idc('g'), casilla: cas, origen, en: hoy() }); e.gotas.hoy[origen]++; n++;
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
  function comprar(tipo, id) {                             // tipo: 'semilla' | 'ave'. Devuelve { ok, motivo }
    const e = cargar(), it = (tipo === 'ave' ? cat().aves : cat().semillas)[id]; if (!it) return { ok: false, motivo: 'no-existe' };
    const clave = (tipo === 'ave' ? 'ave_' : 'sem_') + id; if (e.vivero.desbloqueados.indexOf(clave) >= 0) return { ok: false, motivo: 'ya-tienes' };
    if (e.gotas.saldo < it.precio) return { ok: false, motivo: 'faltan-gotas' };
    e.gotas.saldo -= it.precio; e.vivero.desbloqueados.push(clave); guardar(e); return { ok: true, motivo: null };
  }
  function plantar(id) {                                   // planta una semilla ya desbloqueada en una casilla libre permitida
    const e = cargar(), it = cat().semillas[id]; if (!it || e.vivero.desbloqueados.indexOf('sem_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    const cas = casillaLibre(e, 'pasto', it.casillas); if (!cas) return { ok: false, motivo: 'sin-lugar' };
    e.vivero.plantas.push({ id, casilla: cas, en: hoy() }); guardar(e); return { ok: true, casilla: cas };
  }
  function activarAve(id, si) {                            // máximo 2 aves activas a la vez (cuidado de la batería)
    const e = cargar(); if (e.vivero.desbloqueados.indexOf('ave_' + id) < 0) return { ok: false, motivo: 'no-desbloqueada' };
    const i = e.vivero.aves.findIndex((a) => a.id === id);
    if (si === false) { if (i >= 0) e.vivero.aves.splice(i, 1); guardar(e); return { ok: true }; }
    if (i >= 0) return { ok: true };
    if (e.vivero.aves.length >= (cat().economia.aves_activas_max || 2)) return { ok: false, motivo: 'maximo' };
    e.vivero.aves.push({ id, desde: hoy() }); guardar(e); return { ok: true };
  }
  // Mensaje del árbol del ciclo actual: { titulo, mensaje, dato, vida: {tema, texto, n, de} }. `vida` rota según el día de cuidado; `salto` pasa al siguiente.
  function mensajeActual(salto) { const e = cargar(), s = cat().especies[e.ciclo.especie]; if (!s) return null; const L = s.vida || [], n = L.length ? (((e.ciclo.diasCuidado || 0) + (salto || 0)) % L.length + L.length) % L.length : 0;
    return { titulo: s.nombre + (s.otro ? ' · ' + s.otro : ''), mensaje: s.mensaje, dato: s.dato, vida: L.length ? { tema: L[n].tema, texto: L[n].texto, n: n + 1, de: L.length } : null }; }

  const api = { config(o) { if (o && o.catalogo) CAT = o.catalogo; if (o && o.hoy) HOY = o.hoy; if (o && o.almacen) ALM = o.almacen; }, cargar, guardar, estado: cargar, etapa, malezaPara, elegirPrimera, visita, sanar, ganar, recolectar, comprar, plantar, activarAve, mensajeActual, K };
  if (typeof window !== 'undefined') window.TBInicio = api; if (typeof module !== 'undefined') module.exports = api;
})();
