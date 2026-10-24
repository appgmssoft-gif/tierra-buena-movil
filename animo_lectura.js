/* F1409 · Palabra de ánimo (tarea 2.15) y lectura de prédicas (tarea 2.16).
   Pastor: enviar una frase fija a un miembro en un toque; ver cuántas personas abrieron cada prédica (solo conteo).
   Miembro: ver sus palabras de ánimo y marcarlas como leídas.
   Usa SQL 61 (pastor_animo_enviar, miembro_animos_listar, miembro_animo_leer) y SQL 62 (pastor_predica_lecturas). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const nombreDe = (m) => String((m && (m.nombre_visible || m.nombre)) || 'Sin nombre');
  const FRASES = [['animo', 'Ánimo'], ['oracion', 'Oro por ti'], ['gracias', 'Gracias'], ['contigo', 'Estoy contigo']];
  const MOTIVOS = { 'sin-permiso': 'Tu clave ya no sirve. Vuelve a entrar.', 'no-encontrada': 'No la encontramos.', 'demasiadas': 'Ya enviaste muchas hoy. Intenta más tarde.', 'datos-invalidos': 'No se pudo enviar. Intenta de nuevo.' };
  const motivo = (r) => (r && r.motivo && MOTIVOS[r.motivo]) || 'No se pudo completar. Revisa tu conexión.';

  // ---------- Pastor: enviar ánimo ----------
  async function abrirAnimo(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="aniVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Palabra de ánimo</h1>' +
      '<p class="suave">Elige una frase y tócala: se envía a la persona. Solo frases fijas, para que nunca sea algo hiriente.</p>' +
      '<p class="suave" id="aniMsg" role="status"></p>' +
      '<div class="mie-buscar"><input id="aniQ" type="search" placeholder="Buscar una persona" aria-label="Buscar una persona" autocomplete="off"></div>' +
      '<div id="aniLista"><p class="suave" role="status">Cargando…</p></div>';
    $('#aniVolver').onclick = ctx.volver;
    const mr = await ctx.rpc('pastor_miembros_listar', p, { p_buscar: '' });
    const todas = mr && mr.ok ? (mr.data || []) : [];
    const pintar = () => {
      const q = ($('#aniQ').value || '').trim().toLowerCase();
      const lista = todas.filter((m) => nombreDe(m).toLowerCase().includes(q)).slice(0, 40);
      $('#aniLista').innerHTML = lista.length ? lista.map((m) =>
        '<div class="cp-fila"><span class="cp-fila-t"><b>' + esc(nombreDe(m)) + '</b></span><span class="enc-opciones">' +
        FRASES.map(([k, t]) => '<button type="button" class="btn sec" data-ani="' + esc(m.id) + '" data-frase="' + k + '">' + t + '</button>').join('') +
        '</span></div>').join('')
        : '<p class="suave">No encontramos a nadie con ese nombre.</p>';
      document.querySelectorAll('[data-ani]').forEach((b) => b.onclick = async () => {
        b.disabled = true;
        const g = fila(await ctx.rpc('pastor_animo_enviar', p, { p_para: b.getAttribute('data-ani'), p_frase: b.getAttribute('data-frase') }));
        $('#aniMsg').textContent = g && g.ok ? 'Palabra de ánimo enviada.' : motivo(g);
        b.disabled = false;
      });
    };
    $('#aniQ').addEventListener('input', pintar);
    pintar();
  }

  // ---------- Pastor: lectura de prédicas (solo conteo) ----------
  async function abrirLectura(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="lecVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Lectura de prédicas</h1>' +
      '<p class="suave">Cuántas personas abrieron cada prédica publicada. Solo son números: no se muestran nombres.</p>' +
      '<div id="lecLista"><p class="suave" role="status">Cargando…</p></div>';
    $('#lecVolver').onclick = ctx.volver;
    const d = fila(await ctx.rpc('pastor_predica_lecturas', p));
    if (!d || d.ok === false) { $('#lecLista').innerHTML = '<p class="suave">No pudimos cargar la lectura. Revisa tu conexión.</p>'; return; }
    const lista = d.predicas || [];
    $('#lecLista').innerHTML = lista.length ? lista.map((x) =>
      '<div class="cp-fila"><span class="cp-fila-t"><b>' + esc(x.titulo) + '</b><small>Publicada: ' + esc(String(x.publicado_en || '').slice(0, 10)) + '</small></span>' +
      '<span class="suave">' + x.vieron + (x.vieron === 1 ? ' persona' : ' personas') + '</span></div>').join('')
      : '<p class="suave">Todavía no hay prédicas publicadas.</p>';
  }

  // ---------- Miembro: palabras de ánimo ----------
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const pintar = async () => {
      const r = await rpcRaw('miembro_animos_listar', { p_codigo: id.codigo, p_clave: id.clave });
      const d = r && r.ok ? r.data : null;
      const lista = d && d.ok !== false ? (d.animos || []) : [];
      if (!lista.length) { c.innerHTML = ''; return; }
      c.innerHTML = '<h2 class="mi-sub">Palabras de ánimo</h2>' + lista.map((a) =>
        '<button type="button" class="cp-fila" data-ani-leer="' + esc(a.id) + '"' + (a.leida ? '' : ' aria-label="Nueva"') + '>' +
        '<span class="cp-fila-t"><b>' + esc(a.texto) + '</b><small>' + (a.leida ? 'Leída' : 'Nueva') + '</small></span></button>').join('');
      c.querySelectorAll('[data-ani-leer]').forEach((b) => b.onclick = async () => {
        await rpcRaw('miembro_animo_leer', { p_codigo: id.codigo, p_clave: id.clave, p_id: b.getAttribute('data-ani-leer') });
        pintar();
      });
    };
    await pintar();
  }

  window.TBAnimo = { abrir: abrirAnimo, miembroMostrar };
  window.TBLecturaPredicas = { abrir: abrirLectura };
  if (typeof module !== 'undefined' && module.exports) module.exports = { animo: window.TBAnimo, lectura: window.TBLecturaPredicas };
})();
