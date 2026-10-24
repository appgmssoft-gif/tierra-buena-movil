/* F1345 · Prédicas de la iglesia. El pastor publica una prédica (título, pasaje y resumen) para que su iglesia la lea
   en el teléfono. El miembro la ve en «Prédicas» dentro de Mi iglesia. Requiere 25_SQL_F1345_PREDICAS_PUBLICAR.sql.
   Solo texto: el audio de «Mis prédicas» no se sube aquí. */
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const esc = (t) => (A().esc ? A().esc(t) : String(t == null ? '' : t));
  const $ = (s) => document.querySelector(s);
  const rpc = async (fn, args) => {
    try {
      const { data, error } = await A().sb.rpc(fn, args);
      if (error) return { ok: false, error: /could not find the function|PGRST202/i.test(error.message || '') ? 'falta' : 'sin-internet' };
      return { ok: true, data };
    } catch (e) { return { ok: false, error: 'sin-internet' }; }
  };
  const fecha = (iso) => { try { return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  const pantalla = (html) => { const p = $('#pantalla'); if (!p) return; p.innerHTML = html; try { window.scrollTo(0, 0); } catch (e) { /* nada */ } };
  const MSG_ERR = { 'sin-internet': 'Sin conexión. Intenta de nuevo cuando tengas internet.', falta: 'Esta parte todavía se está preparando. Vuelve a intentarlo pronto.' };
  const MOTIVO_PUB = {
    'sin-permiso': 'Necesitamos confirmar que eres el pastor de esta iglesia.',
    'titulo-invalido': 'El título debe tener entre 2 y 100 letras.',
    'resumen-invalido': 'El resumen debe tener entre 2 y 4000 letras.',
    demasiadas: 'Ya publicaste 5 prédicas hoy. Vuelve mañana.'
  };
  const cabecera = (tit, volver) => `<header class="cab"><button type="button" class="btn sec chico" id="ppVolver">← Volver</button><h1>${esc(tit)}</h1></header>`;

  // ---------- Miembro: leer las prédicas de su iglesia ----------
  async function miembro(id, volver) {
    pantalla(`<section class="pp-wrap">${cabecera('Prédicas de tu iglesia')}<p class="suave" id="ppMsg">Cargando…</p><div id="ppLista"></div></section>`);
    $('#ppVolver').onclick = () => volver && volver();
    const r = await rpc('predica_miembro_listar', { p_codigo: id.codigo, p_clave: id.clave });
    const m = $('#ppMsg'), l = $('#ppLista');
    if (!r.ok) { m.textContent = MSG_ERR[r.error] || MSG_ERR['sin-internet']; return; }
    const lista = r.data || [];
    if (!lista.length) { m.textContent = 'Todavía no hay prédicas publicadas. Cuando tu pastor comparta una, aparecerá aquí.'; return; }
    m.textContent = lista.length === 1 ? '1 prédica publicada para leer.' : lista.length + ' prédicas publicadas para leer.';
    l.innerHTML = lista.map((p) => `<article class="card item pp-card"><button type="button" class="pp-tit" data-pp-abrir="${esc(p.id)}" aria-expanded="false"><b>${esc(p.titulo)}</b>${p.pasaje ? `<span class="etiqueta">${esc(p.pasaje)}</span>` : ''}<small class="suave">${esc(fecha(p.publicado_en))}</small></button><div class="pp-texto" id="pp-${esc(p.id)}" hidden><p class="m0t">${esc(p.resumen).replace(/\n/g, '<br>')}</p></div></article>`).join('');
    l.querySelectorAll('[data-pp-abrir]').forEach((b) => b.addEventListener('click', () => {
      const t = document.getElementById('pp-' + b.dataset.ppAbrir); if (!t) return;
      t.hidden = !t.hidden; b.setAttribute('aria-expanded', String(!t.hidden));
      // F1410 · 2.16: al abrirla, queda marcada como leída (solo se guarda que la abrió; el pastor ve el número).
      if (!t.hidden) Promise.resolve(rpc('miembro_predica_marcar_leida', { p_codigo: id.codigo, p_clave: id.clave, p_predica: b.dataset.ppAbrir })).catch(() => {});
    }));
  }

  // ---------- Pastor: publicar, ver y quitar ----------
  async function pastor(p, volver) {
    const mias = (() => {
      const l = (A().leer && A().leer('tb_movil_predicas')) || [];
      return (Array.isArray(l) ? l : []).filter((x) => x && !x.borrado && String(x.title || '').trim());
    })();
    const selector = mias.length ? `<div class="card pp-form"><p class="m0t"><b>¿Ya la escribiste en Estudio y Prédicas?</b></p><label class="pp-campo">Elige una prédica<select id="ppSel"><option value="">— Elige —</option>${mias.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}${x.baseText ? ' · ' + esc(x.baseText) : ''}</option>`).join('')}</select></label><button type="button" class="btn sec" id="ppTraer">Traer su texto</button></div>` : '';
    const form = selector + `<form class="card pp-form" id="ppForm" novalidate>
        <h2 class="mi-sub">Publicar una prédica</h2>
        <label class="pp-campo">Título<input id="ppT" type="text" maxlength="100" required placeholder="Ej.: La fe que mueve montañas" /></label>
        <label class="pp-campo">Pasaje (opcional)<input id="ppP" type="text" maxlength="100" placeholder="Ej.: Hebreos 11:1-6" /></label>
        <label class="pp-campo">Resumen o puntos principales<textarea id="ppR" rows="6" maxlength="4000" required placeholder="Escribe los puntos que quieres que la iglesia recuerde."></textarea></label>
        <p class="suave m0t" id="ppAv">Se publica para todos los miembros de tu iglesia. Puedes quitarla cuando quieras.</p>
        <button type="submit" class="btn sep16" id="ppPub">Publicar a mi iglesia</button>
      </form>`;
    pantalla(`<section class="pp-wrap">${cabecera('Prédicas para mi iglesia')}${form}<h2 class="mi-sub">Publicadas</h2><p class="suave" id="ppMsg">Cargando…</p><div id="ppLista"></div></section>`);
    $('#ppVolver').onclick = () => volver && volver();

    const cargarLista = async () => {
      const r = await rpc('predica_pastor_listar', { p_codigo: p.codigo, p_secreto: p.secreto });
      const m = $('#ppMsg'), l = $('#ppLista');
      if (!r.ok) { m.textContent = MSG_ERR[r.error] || MSG_ERR['sin-internet']; return; }
      const lista = r.data || [];
      m.textContent = lista.length ? '' : 'Aún no has publicado prédicas.';
      l.innerHTML = lista.map((x) => `<article class="card item pp-card"><b>${esc(x.titulo)}</b>${x.pasaje ? ` <span class="etiqueta">${esc(x.pasaje)}</span>` : ''}<p class="suave m0t">${esc(fecha(x.publicado_en))}</p><button type="button" class="btn sec chico" data-pp-quitar="${esc(x.id)}">Quitar</button></article>`).join('');
      l.querySelectorAll('[data-pp-quitar]').forEach((b) => b.addEventListener('click', async () => {
        if (!confirm('¿Quitar esta prédica? Tu iglesia dejará de verla.')) return;
        const q = await rpc('predica_quitar', { p_codigo: p.codigo, p_secreto: p.secreto, p_id: b.dataset.ppQuitar });
        if (q.ok && q.data) cargarLista(); else $('#ppMsg').textContent = MSG_ERR[q.error] || 'No se pudo quitar. Intenta de nuevo.';
      }));
    };
    cargarLista();

    // Traer el texto de una prédica escrita en Estudio y Prédicas (sin volver a escribirla).
    const tr = $('#ppTraer');
    if (tr) tr.onclick = () => {
      const x = mias.find((y) => y.id === $('#ppSel').value);
      if (!x) { $('#ppAv').textContent = 'Elige primero una prédica de la lista.'; return; }
      const partes = [];
      const bloque = (tit, v) => { const t = String(v || '').trim(); if (t) partes.push(tit ? tit + '\n' + t : t); };
      bloque('La idea principal', x.centralTruth);
      bloque('Introducción', x.intro);
      bloque('Punto I', x.point1);
      bloque('Punto II', x.point2);
      bloque('Punto III', x.point3);
      bloque('Conclusión', x.conclusion);
      bloque('Llamado', x.call);
      $('#ppT').value = String(x.title || '').slice(0, 100);
      $('#ppP').value = String(x.baseText || '').slice(0, 100);
      $('#ppR').value = partes.join('\n\n').slice(0, 4000);
      $('#ppAv').textContent = partes.length ? 'Listo. Revisa el texto y publícalo cuando quieras.' : 'Esa prédica aún no tiene puntos escritos. Puedes escribir el resumen a mano.';
    };

    $('#ppForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const av = $('#ppAv'), btn = $('#ppPub');
      const t = $('#ppT').value.trim(), pa = $('#ppP').value.trim(), re = $('#ppR').value.trim();
      if (t.length < 2 || re.length < 2) { av.textContent = 'Escribe al menos un título y un resumen.'; return; }
      btn.disabled = true; av.textContent = 'Publicando…';
      const r = await rpc('predica_publicar', { p_codigo: p.codigo, p_secreto: p.secreto, p_titulo: t, p_pasaje: pa, p_resumen: re });
      btn.disabled = false;
      const x = r.ok && Array.isArray(r.data) ? r.data[0] : null;
      if (x && x.ok) {
        A().vibra && A().vibra();
        $('#ppT').value = ''; $('#ppP').value = ''; $('#ppR').value = '';
        av.textContent = 'Listo. Tu iglesia ya puede leerla.';
        cargarLista();
      } else {
        av.textContent = (x && MOTIVO_PUB[x.motivo]) || MSG_ERR[r.error] || 'No se pudo publicar. Intenta de nuevo.';
      }
    });
  }

  window.TBPredPub = { miembro, pastor };
})();
