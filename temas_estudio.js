/* F1431 · Tema de estudio mensual con seguimiento consentido (tarea 4.7 de PLAN_TAREAS_IGLESIA.md).
   Pastor: escribe el tema del mes (título y texto breve). Se guarda en la configuración de la iglesia
   (config_pastor_guardar, clave tema_estudio), guardando solo los últimos 12 meses.
   Miembro: lo ve en Mi iglesia y, si quiere, marca «Lo estoy siguiendo». Esa marca es SUYA: se guarda
   en su teléfono (clave tb_movil_tema_seguido, que se sincroniza si tiene cuenta). El pastor nunca ve quién la marcó.
   Usa SQL 75: miembro_tema_estudio_leer (solo lectura). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const CLAVE_SEGUIDO = 'tb_movil_tema_seguido';
  const MAX_MESES = 12;
  const lista = (r) => (r && r.ok ? r.data : null);
  const primera = (d) => (Array.isArray(d) ? d[0] : d);

  const periodoActual = (h) => { const d = h || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const textoMes = (periodo) => { const [y, m] = periodo.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }); };
  const esPeriodo = (v) => /^[0-9]{4}-[0-9]{2}$/.test(String(v || ''));
  const esTexto = (t, min, max) => { const s = String(t || '').trim(); return s.length >= min && s.length <= max; };

  // Lo que el miembro marca como seguido (solo en su teléfono).
  function seguidos() { try { const v = JSON.parse(localStorage.getItem(CLAVE_SEGUIDO) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function marcarSeguido(periodo, valor) {
    const s = seguidos(); if (valor) s[periodo] = true; else delete s[periodo];
    try { localStorage.setItem(CLAVE_SEGUIDO, JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  // Mantiene solo los últimos 12 meses al guardar.
  function recortar(temas) {
    const claves = Object.keys(temas).filter(esPeriodo).sort().reverse().slice(0, MAX_MESES);
    const out = {}; claves.forEach((k) => { out[k] = temas[k]; }); return out;
  }

  // ----- Miembro -----
  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id || !id.codigo || !id.clave) return;
    const r = await rpcRaw('miembro_tema_estudio_leer', { p_codigo: id.codigo, p_clave: id.clave });
    const d = r && r.ok ? primera(r.data) : null;
    const periodo = periodoActual();
    const tema = d && d.ok && d.temas ? d.temas[periodo] : null;
    if (!tema || !tema.titulo) { c.innerHTML = ''; return; }
    const sigue = !!seguidos()[periodo];
    c.innerHTML = '<h2 class="mi-sub">Tema de estudio de ' + esc(textoMes(periodo)) + '</h2>' +
      '<div class="card rv-card"><p class="rv-titulo">' + esc(tema.titulo) + '</p>' +
      (tema.texto ? '<p class="suave">' + esc(tema.texto) + '</p>' : '') +
      '<label class="tm-chk"><input type="checkbox" id="temaSigo"' + (sigue ? ' checked' : '') + '> <span>Lo estoy siguiendo este mes</span></label>' +
      '<p class="suave m0" id="temaMsg" role="status" aria-live="polite">Esta marca es solo tuya: tu pastor no la ve.</p></div>';
    $('#temaSigo').onchange = (e) => {
      const ok = marcarSeguido(periodo, e.target.checked);
      const m = $('#temaMsg'); if (m) { m.textContent = ok ? (e.target.checked ? '¡Qué bien! Lo estás siguiendo este mes.' : 'Listo, quitamos la marca.') : 'No pudimos guardar en este teléfono. Revisa el espacio disponible.'; m.className = ok ? 'suave' : 'error'; }
    };
  }

  // ----- Pastor -----
  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const periodo = periodoActual();
    const pintar = async () => {
      pant.innerHTML = '<button type="button" class="volver" id="temaVolver">‹ Panel</button><h1 class="cp-titulo">Tema de estudio del mes</h1>' +
        '<p class="suave">Un tema corto para que la iglesia estudie el mes. Las personas lo siguen si quieren; tú no ves quién lo sigue.</p><div id="temaCont"><p class="suave">Cargando…</p></div>';
      $('#temaVolver').onclick = ctx.volver;
      const r = await ctx.rpc('config_pastor_leer', p);
      const cfg = r && r.ok && r.data && typeof r.data === 'object' ? r.data : null;
      if (!cfg) { $('#temaCont').innerHTML = '<p class="error" role="alert">No pudimos cargar el tema. Revisa tu conexión.</p>'; return; }
      const temas = (cfg.tema_estudio && typeof cfg.tema_estudio === 'object') ? cfg.tema_estudio : {};
      const actual = temas[periodo] || { titulo: '', texto: '' };
      $('#temaCont').innerHTML = '<div class="card"><h2 class="mi-sub m0">' + esc(textoMes(periodo)) + '</h2>' +
        '<label for="temaTit">Título del tema (2 a 80 letras)</label><input id="temaTit" type="text" maxlength="80" value="' + esc(actual.titulo) + '" autocomplete="off">' +
        '<label for="temaTxt">Texto breve (hasta 400 letras, opcional)</label><textarea id="temaTxt" maxlength="400" rows="4">' + esc(actual.texto) + '</textarea>' +
        '<p class="error" id="temaErr" role="alert" hidden></p><button type="button" class="btn" id="temaGuardar">Guardar tema del mes</button>' +
        '<p class="suave" id="temaMsgP" role="status" aria-live="polite"></p></div>';
      $('#temaGuardar').onclick = async () => {
        const err = $('#temaErr'); err.hidden = true;
        const titulo = $('#temaTit').value.trim(), texto = $('#temaTxt').value.trim();
        if (!esTexto(titulo, 2, 80)) { err.textContent = 'El título debe tener entre 2 y 80 letras.'; err.hidden = false; return; }
        if (texto.length > 400) { err.textContent = 'El texto es muy largo (máximo 400 letras).'; err.hidden = false; return; }
        const nuevos = Object.assign({}, temas, { [periodo]: { titulo, texto } });
        const g = await ctx.rpc('config_pastor_guardar', p, { p_config: { tema_estudio: recortar(nuevos) } });
        const fila = primera(g && g.data);
        const m = $('#temaMsgP');
        if (g && g.ok && fila && fila.ok) { if (m) { m.textContent = 'Guardado. Ya lo ven tus miembros en Mi iglesia.'; m.className = 'suave'; } }
        else { if (m) { m.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; m.className = 'error'; } }
      };
    };
    await pintar();
  }

  window.TBTemasEstudio = { abrir, miembroMostrar, _t: { periodoActual, recortar, esTexto, MAX_MESES, CLAVE_SEGUIDO } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBTemasEstudio;
})();
