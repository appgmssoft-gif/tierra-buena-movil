/* F1428 · Mi plan del mes (tareas 6.2 y 6.3 de PLAN_TAREAS_IGLESIA.md), vista de la persona asignada.
   Usa SQL 70: lider_mis_metas y lider_meta_marcar. Solo ve y marca SUS metas.
   Si no tiene metas este mes, no muestra nada (no ocupa lugar). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const periodoActual = (hoy) => { const h = hoy || new Date(); return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0'); };
  const nombreMes = (hoy) => (hoy || new Date()).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);

  // id = { codigo, clave, nombre }. rpcRaw(nombre, parámetros) como en el resto de la vista del miembro.
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const periodo = periodoActual();
    const r = await rpcRaw('lider_mis_metas', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_periodo: periodo });
    const metas = lista(r);
    if (!metas || !metas.length) { c.innerHTML = ''; return; }
    const hechas = metas.filter((m) => m.cumplida).length;
    const pintar = (ms) => {
      const h = ms.filter((m) => m.cumplida).length;
      c.innerHTML = '<h2 class="mi-sub">Mi plan del mes</h2><div class="card mm-plan"><p class="suave m0">' + esc(nombreMes()) + ' · ' + h + ' de ' + ms.length + ' cumplidas</p><ul class="cp-lista">' +
        ms.map((m) => '<li class="mm-meta' + (m.cumplida ? ' hecha' : '') + '"><button type="button" class="mm-chk" data-mm="' + esc(m.id) + '" data-val="' + (m.cumplida ? '0' : '1') +
          '" aria-pressed="' + (!!m.cumplida) + '">' + (m.cumplida ? '✅' : '⬜') + '</button><span>' + esc(m.titulo) + '</span></li>').join('') +
        '</ul><p class="suave" id="mmMsg" role="status" aria-live="polite"></p></div>';
      c.querySelectorAll('[data-mm]').forEach((b) => {
        b.onclick = async () => {
          const nuevo = b.getAttribute('data-val') === '1';
          const g = await rpcRaw('lider_meta_marcar', { p_codigo: id.codigo, p_clave: id.clave, p_secreto: null, p_id: b.getAttribute('data-mm'), p_cumplida: nuevo });
          if (g && g.ok && g.data && g.data.ok) {
            const actualizadas = metas.map((m) => (m.id === b.getAttribute('data-mm') ? Object.assign({}, m, { cumplida: nuevo }) : m));
            metas.splice(0, metas.length, ...actualizadas); pintar(metas);
          } else { const m = document.getElementById('mmMsg'); if (m) m.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; }
        };
      });
    };
    pintar(metas);
    void hechas;
  }

  window.TBMetasLider = { miembroMostrar, _t: { periodoActual } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBMetasLider;
})();
