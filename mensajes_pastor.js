/* F1313 · «Mensajes para copiar» (solo en el panel del pastor): textos listos para situaciones de la iglesia.
   Los datos viven en datos/pastor_mensajes.json. El pastor copia el texto y lo pega donde quiera. */
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const vibra = () => { try { if (A().vibra) A().vibra(); } catch (e) { /* sin vibración */ } };
  const sinAcento = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const pantalla = (html) => { const p = $('#pantalla'); if (!p) return; p.innerHTML = html; try { window.scrollTo(0, 0); } catch (e) { /* nada */ } };
  const volverPastor = () => { try { A().ir('pastor'); } catch (e) { /* nada */ } };
  let lista = null;

  const cargar = async () => {
    if (lista) return lista;
    const r = await fetch('datos/pastor_mensajes.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    lista = await r.json();
    return lista;
  };

  function vistaDetalle(m, q) {
    pantalla('<button type="button" class="volver" id="mpAtras">‹ Mensajes</button>' +
      '<p class="pp-paso">Mensajes para copiar</p>' +
      '<h1 class="pp-h">' + esc(m.t) + '</h1>' +
      '<p class="pp-guia">Antes de enviarlo, cambia [nombre] por el nombre de la persona.</p>' +
      '<div class="pp-det"><p>' + esc(m.x).split('\n').join('<br>') + '</p></div>' +
      '<button type="button" class="btn" id="mpCopia">Copiar mensaje</button>' +
      '<p id="mpMsg" class="suave pp-nota" role="status"></p>');
    $('#mpAtras').onclick = () => vistaLista(q);
    $('#mpCopia').onclick = async () => {
      vibra();
      const msg = $('#mpMsg');
      try { await navigator.clipboard.writeText(m.x); msg.textContent = 'Copiado. Ya puedes pegarlo.'; }
      catch (e) { msg.textContent = 'No se pudo copiar desde aquí. Mantén presionado el texto para seleccionarlo.'; }
    };
  }

  function pintarLista(q) {
    const r = $('#mpRes'), qq = sinAcento(q.trim());
    if (!r || !lista) return [];
    const hits = lista.filter((o) => !qq || sinAcento(o.t + ' ' + o.x).indexOf(qq) >= 0);
    if (!hits.length) { r.innerHTML = '<div class="pp-vacio"><p>No hay resultados.</p><p class="suave">Prueba con una palabra más corta.</p></div>'; return hits; }
    r.innerHTML = hits.map((o, i) => '<button type="button" class="pp-item pp-res" data-i="' + i + '"><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></button>').join('');
    r.querySelectorAll('.pp-res').forEach((b) => { b.onclick = () => { vibra(); vistaDetalle(hits[Number(b.dataset.i)], q); }; });
    return hits;
  }

  function vistaLista(q) {
    q = q || '';
    pantalla('<button type="button" class="volver" id="mpVolver">‹ Panel del pastor</button>' +
      '<h1 class="pp-h">Mensajes para copiar</h1>' +
      '<p class="pp-guia">Textos listos para situaciones de la iglesia. Tócalo para verlo y copiarlo.</p>' +
      '<input type="text" id="mpBusca" class="pp-busca" placeholder="Buscar, por ejemplo: visita, bebé…" value="' + esc(q) + '" autocomplete="off">' +
      '<div id="mpRes" class="pp-cards" aria-live="polite"><p class="suave">Cargando…</p></div>');
    $('#mpVolver').onclick = volverPastor;
    cargar().then(() => {
      pintarLista(q);
      const b = $('#mpBusca');
      if (b) b.oninput = () => pintarLista(b.value);
    }).catch(() => {
      const r = $('#mpRes');
      if (r) r.innerHTML = '<p class="suave">No se pudo cargar. Conéctate a internet una vez y quedará guardado en tu teléfono.</p>';
    });
  }

  window.TBMensajesPastor = { abrir: () => vistaLista('') };
})();
