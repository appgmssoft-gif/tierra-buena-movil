// resguardo.js - F946 · CUIDADO DE LOS AVANCES. Se carga PRIMERO (antes que todo lo demás) para proteger lo guardado en el teléfono.
// Qué hace:
//   1) Pide al navegador que NO borre los datos de la app por falta de espacio (storage.persist).
//   2) Al abrir una versión nueva, guarda una copia de seguridad de lo que dejó la versión anterior («respaldo previo»), ANTES de que el código nuevo lo toque.
//   3) Mantiene una copia al día de los avances (cuenta básica, iglesia, pastor, Inicio, juegos, Biblia, notas...) y, si algo falta o quedó dañado, lo recupera.
//   4) Avisa a la app cada vez que se guarda un dato (evento «tb-guardado») para que la copia en la nube lo suba.
// Reglas de privacidad: la copia pertenece a UNA cuenta (correo). Si esa cuenta cierra sesión, se elimina o entra otra persona, la copia se borra y nunca se mezcla.
// No toca el inicio de sesión: solo mira si existe la clave tb_movil_cuenta. Las llaves de sesión de Supabase (sb-*) no se copian.
'use strict';
(function () {
  const BUILD = 'f951';
  const K_ACT = 'tb_respaldo', K_PREV = 'tb_respaldo_previo';
  const PROPIA = /^(tb_movil_|tb_inicio_|tb_suscripcion|tb_fabula_)/, NO_COPIAR = /^(tb_respaldo|tb_movil_sync$)/;
  const TOPE = 900000;   // caracteres por copia: si los datos pasan de esto no se copia (el teléfono tiene ~5 MB en total)

  function crear(S, orig) {
    const o = orig || { set: (k, v) => S.setItem(k, v), del: (k) => S.removeItem(k) };
    const raw = (k) => { try { return S.getItem(k); } catch (e) { return null; } };
    const json = (k) => { try { const v = raw(k); return v == null ? null : JSON.parse(v); } catch (e) { return undefined; } };   // undefined = dato dañado
    const claves = () => { const r = []; try { for (let i = 0; i < S.length; i++) { const k = S.key(i); if (k && PROPIA.test(k) && !NO_COPIAR.test(k)) r.push(k); } } catch (e) { /* sin acceso */ } return r; };
    const correo = () => { const c = json('tb_movil_cuenta'); return c && c.correo ? String(c.correo).toLowerCase() : null; };
    const leerCopia = (k) => { try { const c = JSON.parse(raw(k) || 'null'); return c && typeof c === 'object' && c.d && typeof c.d === 'object' ? c : null; } catch (e) { return null; } };
    const borrarCopias = () => { try { o.del(K_ACT); o.del(K_PREV); } catch (e) { /* nada */ } };

    // Foto de todo lo propio (texto crudo). Sin cuenta no hay nada que cuidar; devuelve null.
    function foto() {
      const cu = correo(); if (!cu) return null;
      const d = {}; let n = 0;
      claves().forEach((k) => { const v = raw(k); if (v != null) { d[k] = v; n += v.length; } });
      return n > TOPE ? null : { v: BUILD, t: Date.now(), correo: cu, d };
    }
    function guardarCopia(k, c) { try { o.set(k, JSON.stringify(c)); return true; } catch (e) { return false; } }
    function tomar() { const f = foto(); if (!f) return false; return guardarCopia(K_ACT, f); }

    // Al abrir: si es otra versión, lo que dejó la anterior pasa a «previo» (intacto) y se toma la copia nueva.
    function alAbrir() {
      const r = { versionNueva: false, recuperadas: [], persistente: null };
      const act = leerCopia(K_ACT), cu = correo();
      if (act && cu && act.correo !== cu) { borrarCopias(); tomar(); return r; }          // otra persona en este teléfono: la copia anterior no es suya
      if (cu) {
        r.recuperadas = recuperar(act, leerCopia(K_PREV));
        if (act && act.v !== BUILD) { r.versionNueva = true; if (!guardarCopia(K_PREV, act)) { try { o.del(K_PREV); } catch (e) { /* nada */ } } }
        tomar();
      } else if (act && act.correo) {
        // la clave de la cuenta desapareció sola (nadie cerró sesión: eso borra la copia): se devuelve todo lo que había, la sesión incluida
        r.recuperadas = restaurarTodo(act);
      }
      return r;
    }
    // Recupera SOLO lo que falta o está dañado; nunca pisa un dato sano.
    function recuperar(act, prev) {
      const hechas = [];
      [act, prev].forEach((c) => {
        if (!c || c.correo !== correo()) return;
        Object.keys(c.d).forEach((k) => {
          if (!PROPIA.test(k) || NO_COPIAR.test(k) || hechas.indexOf(k) >= 0) return;
          const actual = json(k);
          if (actual === null || actual === undefined) {      // falta (null) o está roto (undefined)
            let sano = true; try { JSON.parse(c.d[k]); } catch (e) { sano = false; }
            if (sano) { try { o.set(k, c.d[k]); hechas.push(k); } catch (e) { /* sin espacio */ } }
          }
        });
      });
      return hechas;
    }
    function restaurarTodo(c) {
      const hechas = [];
      Object.keys(c.d).forEach((k) => { if (PROPIA.test(k) && !NO_COPIAR.test(k)) { try { JSON.parse(c.d[k]); o.set(k, c.d[k]); hechas.push(k); } catch (e) { /* dato roto: se omite */ } } });
      return hechas;
    }
    return { foto, tomar, alAbrir, recuperar, borrarCopias, leerCopia, correo, claves, BUILD, K_ACT, K_PREV };
  }

  // ---- Navegador: se conecta al almacenamiento real ----
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && !window.TBResguardo) {
    try {
      const P = Storage.prototype, oSet = P.setItem, oDel = P.removeItem, oClr = P.clear;
      const orig = { set: (k, v) => oSet.call(localStorage, k, v), del: (k) => oDel.call(localStorage, k) };
      const R = crear(localStorage, orig); let timer = null, ultimo = 0;
      const programar = () => { clearTimeout(timer); timer = setTimeout(() => { R.tomar(); ultimo = Date.now(); }, 4000); };
      P.setItem = function (k, v) {
        const r = oSet.call(this, k, v);
        try { if (this === localStorage && typeof k === 'string' && PROPIA.test(k) && !NO_COPIAR.test(k)) { programar(); window.dispatchEvent(new CustomEvent('tb-guardado', { detail: k })); } } catch (e) { /* nunca estorba al guardar */ }
        return r;
      };
      P.removeItem = function (k) {
        try { if (this === localStorage && k === 'tb_movil_cuenta') { clearTimeout(timer); R.borrarCopias(); } } catch (e) { /* nada */ }   // cerrar sesión o borrar la cuenta borra también la copia
        return oDel.call(this, k);
      };
      P.clear = function () { try { if (this === localStorage) { clearTimeout(timer); R.borrarCopias(); } } catch (e) { /* nada */ } return oClr.call(this); };
      const res = R.alAbrir();
      window.TBResguardo = { BUILD, abrir: res, tomar: () => R.tomar(), info: () => { const c = R.leerCopia(K_ACT); return { fecha: c ? c.t : null, version: c ? c.v : null, persistente: window.TBResguardo.persistente }; }, persistente: null };
      if (res.recuperadas && res.recuperadas.length) { const once = () => { document.removeEventListener('pointerdown', once, true); try { window.TBSonido && window.TBSonido.salvo && window.TBSonido.salvo(); } catch (e) { /* sin sonido */ } }; document.addEventListener('pointerdown', once, true); }   // al primer toque tras recuperar algo, suena «a salvo»
      document.addEventListener('visibilitychange', () => { try { if (document.hidden && Date.now() - ultimo > 20000) { R.tomar(); ultimo = Date.now(); } } catch (e) { /* nada */ } });   // al salir de la app, copia al día
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then((p) => { window.TBResguardo.persistente = !!p; }, () => {}); } catch (e) { /* sin API */ }
    } catch (e) { /* si algo falla, la app sigue igual que antes */ }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { crear, PROPIA, BUILD };
})();
