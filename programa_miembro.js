/* F1406 · 1.17 Programa del domingo, lado del miembro (dentro de «Mi servicio»).
   Muestra la plantilla que el pastor publicó: bloques, tiempos, responsables y notas.
   Usa miembro_programa_leer (SQL 57). Si no hay programa publicado, no muestra nada. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const min = (n) => { n = +n || 0; if (n < 60) return n + ' min'; const h = Math.floor(n / 60), m = n % 60; return h + ' h' + (m ? ' ' + m + ' min' : ''); };

  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const r = await rpcRaw('miembro_programa_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok ? r.data : null;
    const pr = d && d.ok && d.programa;
    if (!pr) { c.innerHTML = ''; return; }   // sin programa publicado: no aparece nada
    const filas = (pr.bloques || []).map((b) =>
      '<li><span class="prog-h"><b>' + esc(b.titulo) + '</b> <small class="suave">' + esc(min(b.minutos)) + '</small></span>' +
      (b.responsable ? '<span class="suave">Responsable: ' + esc(b.responsable) + '</span>' : '') +
      (b.notas ? '<span class="suave">' + esc(b.notas) + '</span>' : '') + '</li>').join('');
    c.innerHTML = '<div class="card prog-miembro" aria-labelledby="progTitulo">' +
      '<h2 class="mi-sub" id="progTitulo">Programa del domingo</h2>' +
      '<p class="m0"><b>' + esc(pr.nombre) + '</b> · ' + esc(min(pr.total_minutos)) + '</p>' +
      (pr.detalle ? '<p class="suave m0t">' + esc(pr.detalle) + '</p>' : '') +
      '<ol class="prog-lista">' + filas + '</ol></div>';
  }
  window.TBPrograma = { miembroMostrar };
})();
