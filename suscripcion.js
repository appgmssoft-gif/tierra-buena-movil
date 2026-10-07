// suscripcion.js - F941 · Base de «Tierra Buena Plus» (mensual y anual). SIN cobro propio: la verdad la escribe el servidor/tienda (ver PLAN_SUSCRIPCION.md).
// Guarda solo una copia local del estado (para abrir sin internet). Nunca bloquea la Biblia, la oración ni el árbol. No toca el inicio de sesión ni SYNC_CLAVES.
'use strict';
(function () {
  const K = 'tb_suscripcion', DIA = 86400000, ESTADOS_OK = ['activa', 'prueba', 'gracia'], PERIODOS = ['mensual', 'anual'];
  let CAT = null;
  const ls = { g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, s(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin guardar */ } }, b(k) { try { localStorage.removeItem(k); } catch (e) { /* nada */ } } };
  function leer() { try { const x = JSON.parse(ls.g(K) || 'null'); if (!x || typeof x !== 'object' || PERIODOS.indexOf(x.periodo) < 0) return null; return { periodo: x.periodo, estado: String(x.estado || ''), vence: +x.vence || 0, origen: String(x.origen || '') }; } catch (e) { return null; } }
  // Aplica lo que informe la tienda o el servidor. Estados válidos: activa | prueba | gracia | vencida | cancelada.
  function aplicar(c) {
    if (!c || PERIODOS.indexOf(c.periodo) < 0) return false;
    ls.s(K, JSON.stringify({ periodo: c.periodo, estado: String(c.estado || 'activa'), vence: +c.vence || 0, origen: String(c.origen || ''), ts: Date.now() })); return true;
  }
  function limpiar() { ls.b(K); }
  const graciaMs = () => ((CAT && +CAT.gracia_dias) || 7) * DIA;
  function tengoPlus(ahora) { const e = leer(); if (!e || ESTADOS_OK.indexOf(e.estado) < 0) return false; return !e.vence || e.vence + graciaMs() > (ahora || Date.now()); }
  // ¿Venció hace poco (dentro de la gracia)? Sirve para un mensaje cordial, nunca para bloquear algo.
  function enGracia(ahora) { const e = leer(); const t = ahora || Date.now(); return !!(e && ESTADOS_OK.indexOf(e.estado) >= 0 && e.vence && e.vence < t && e.vence + graciaMs() > t); }
  // La oferta se muestra solo si está encendida desde el catálogo, la persona ya lleva días de cuidado y aún no apoya. Nunca en lectura ni oración (lo decide quien la llama).
  function ofertaVisible(diasCuidado) { return !!(CAT && CAT.oferta_activa === true && (+diasCuidado || 0) >= (+CAT.dias_cuidado_minimo || 7) && !tengoPlus()); }
  const clp = (n) => '$' + String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' CLP';
  function precioTexto(periodo) { const p = CAT && CAT.planes && CAT.planes[periodo]; return p ? clp(p.precio_clp) + ' por ' + p.periodo : ''; }
  function ahorroAnual() { const m = CAT && CAT.planes && CAT.planes.mensual, a = CAT && CAT.planes && CAT.planes.anual; if (!m || !a) return 0; return Math.max(0, Math.round((1 - a.precio_clp / (m.precio_clp * 12)) * 100)); }
  const api = { config(c) { CAT = c; }, catalogo: () => CAT, leer, aplicar, limpiar, tengoPlus, enGracia, ofertaVisible, precioTexto, ahorroAnual, PERIODOS };
  if (typeof window !== 'undefined') window.TBSuscripcion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
