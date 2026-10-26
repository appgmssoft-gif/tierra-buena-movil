// membresia_lista.js · F1433 · Promesa 13: lista de personas por estado de membresía (SQL 81). Solo pastor.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lista = (r) => (r && r.ok && Array.isArray(r.data) ? r.data : null);
  const ETQ = { visitante: 'Visitante', congregado: 'Congregado', miembro: 'Miembro', 'sin-definir': 'Sin definir' };
  const ORDEN = ['miembro', 'congregado', 'visitante', 'sin-definir'];
  const fecha = (f) => (f ? new Date(f + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const clave = (x) => x.membresia || 'sin-definir';

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const cabecera = '<button type="button" class="volver" id="memVolver">‹ Panel</button><h1 class="cp-titulo">Membresía</h1>';
    let filtro = 'todos';
    const pintar = async () => {
      pant.innerHTML = cabecera + '<p class="suave">Cargando…</p>';
      const r = await ctx.rpc('pastor_membresia_listar', p, { p_estado: null });
      const todas = lista(r);
      if (!todas) { pant.innerHTML = cabecera + '<p class="error" role="alert">No pudimos cargar la lista. Revisa tu conexión.</p>'; $('#memVolver').onclick = ctx.volver; return; }
      const cuenta = {}; ORDEN.forEach((k) => (cuenta[k] = 0));
      todas.forEach((x) => { cuenta[clave(x)] = (cuenta[clave(x)] || 0) + 1; });
      const ver = filtro === 'todos' ? todas : todas.filter((x) => clave(x) === filtro);
      const chips = ['todos'].concat(ORDEN).map((k) => {
        const n = k === 'todos' ? todas.length : cuenta[k];
        const txt = (k === 'todos' ? 'Todas' : ETQ[k]) + ' (' + n + ')';
        return '<button type="button" class="cp-chip' + (filtro === k ? ' on' : '') + '" data-mem="' + k + '" aria-pressed="' + (filtro === k) + '">' + esc(txt) + '</button>';
      }).join('');
      pant.innerHTML = cabecera +
        '<p class="suave">Marca la membresía de cada persona desde su ficha en Centro › Personas.</p>' +
        '<div class="cp-filtros" role="group" aria-label="Filtrar por estado">' + chips + '</div>' +
        (ver.length ? ver.map((x) => '<div class="card mi-meta-ig"><b>' + esc(x.nombre) + '</b>' +
          '<p class="suave m0">' + esc(ETQ[clave(x)]) + (x.fecha ? ' · desde ' + esc(fecha(x.fecha)) : '') + '</p></div>').join('')
          : '<p class="suave">No hay personas en esta lista.</p>');
      $('#memVolver').onclick = ctx.volver;
      document.querySelectorAll('[data-mem]').forEach((b) => { b.onclick = () => { filtro = b.getAttribute('data-mem'); pintar(); }; });
    };
    await pintar();
  }

  window.TBMembresiaLista = { abrir };
})();
