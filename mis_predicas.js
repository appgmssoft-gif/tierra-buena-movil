/* F1308 · «Mis prédicas» (panel del pastor): grabar, guardar, escuchar y compartir sus prédicas.
   Fase 1: todo queda en el teléfono del pastor (IndexedDB). La publicación a los miembros es la fase 2. */
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const vibra = () => { try { if (A().vibra) A().vibra(); } catch (e) { /* sin vibración */ } };
  const uid = () => 'mp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
  const fecha = (t) => { try { return new Date(t).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ''; } };
  const mime = () => { try { return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''; } catch (e) { return ''; } };
  const ext = (t) => (/mp4|aac/.test(t || '') ? 'm4a' : /ogg/.test(t || '') ? 'ogg' : 'webm');

  const bd = () => new Promise((ok, no) => { try { const r = indexedDB.open('tb_mis_predicas', 1); r.onupgradeneeded = () => { r.result.createObjectStore('p', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
  const op = (modo, f) => bd().then((db) => new Promise((ok, no) => { const tx = db.transaction('p', modo), q = f(tx.objectStore('p')); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => no(tx.error); }));
  const todas = () => op('readonly', (s) => s.getAll()).then((l) => (l || []).sort((a, b) => b.t - a.t)).catch(() => []);

  let urls = [], rec = null, stream = null, trozos = [], reloj = 0, acum = 0, tIni = 0, pausado = false, lock = null;
  const limpiarUrls = () => { urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { /* nada */ } }); urls = []; };
  const soltarPantalla = () => { try { if (lock) lock.release(); } catch (e) { /* nada */ } lock = null; };
  function parar(descartar) {
    clearInterval(reloj); reloj = 0; soltarPantalla();
    try { if (rec && rec.state !== 'inactive') { if (descartar) rec.onstop = null; rec.stop(); } } catch (e) { /* nada */ }
    try { if (stream) stream.getTracks().forEach((x) => x.stop()); } catch (e) { /* nada */ }
    rec = null; stream = null; pausado = false;
  }
  const pantalla = (html) => { const p = $('#pantalla'); if (!p) return; p.innerHTML = html; try { window.scrollTo(0, 0); } catch (e) { /* nada */ } };
  const atras = () => { parar(true); limpiarUrls(); try { A().ir('pastor'); } catch (e) { /* nada */ } };

  async function vistaLista() {
    limpiarUrls();
    pantalla('<button type="button" class="volver" id="mpAtras">‹ Panel</button><h1>Mis prédicas</h1><div class="filete"></div>' +
      '<p class="suave">Graba tu mensaje, guárdalo y escúchalo cuando quieras. Por ahora quedan solo en este teléfono.</p>' +
      '<button type="button" class="btn" id="mpNueva" style="width:100%;min-height:60px;font-size:1.1rem">🎙️ Grabar una prédica nueva</button>' +
      '<h2 class="pp-sub">Mis grabaciones</h2><div id="mpL"><p class="suave">Cargando…</p></div>' +
      '<p class="suave pp-nota">Consejo: mantén la pantalla encendida y el teléfono cargando mientras grabas. Si llaman por teléfono, la grabación se detiene.</p>');
    $('#mpAtras').onclick = atras; $('#mpNueva').onclick = () => { vibra(); vistaGrabar(); };
    const l = await todas(), c = $('#mpL'); if (!c) return;
    c.innerHTML = l.length ? l.map((x) => '<article class="card mp-it" data-id="' + esc(x.id) + '"><b>' + esc(x.titulo) + '</b><small class="suave" style="display:block">' + esc(fecha(x.t)) + ' · ' + mmss(x.dur) + (x.pasaje ? ' · ' + esc(x.pasaje) : '') + '</small><audio controls preload="none" data-a="' + esc(x.id) + '" style="width:100%;margin:8px 0"></audio><div class="hoja-bt"><button type="button" class="btn sec" data-sh="' + esc(x.id) + '">Compartir</button><button type="button" class="pp-borrar" data-xb="' + esc(x.id) + '">Borrar</button></div></article>').join('') : '<p class="suave">Todavía no tienes grabaciones. Toca el botón de arriba para empezar.</p>';
    c.querySelectorAll('audio[data-a]').forEach((a) => { const x = l.find((y) => y.id === a.dataset.a); if (x) { const u = URL.createObjectURL(x.blob); urls.push(u); a.src = u; } });
    c.querySelectorAll('[data-sh]').forEach((b) => { b.onclick = async () => {
      const x = l.find((y) => y.id === b.dataset.sh); if (!x) return;
      const f = new File([x.blob], (x.titulo || 'predica').replace(/[^\w\- áéíóúñ]/gi, '').trim().replace(/\s+/g, '_') + '.' + ext(x.blob.type), { type: x.blob.type });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: x.titulo }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      const u = URL.createObjectURL(x.blob), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    }; });
    c.querySelectorAll('[data-xb]').forEach((b) => { let ya = false; b.onclick = async () => { if (!ya) { ya = true; b.textContent = '¿Seguro? Toca otra vez'; return; } await op('readwrite', (s) => s.delete(b.dataset.xb)).catch(() => 0); vistaLista(); }; });
  }

  function vistaGrabar() {
    const hay = !!(navigator.mediaDevices && window.MediaRecorder);
    pantalla('<button type="button" class="volver" id="mpAtras">‹ Mis prédicas</button><h1>Grabar prédica</h1><div class="filete"></div>' +
      (hay ? '<div class="pp-rec"><button type="button" class="pp-rec-b" id="mpB" aria-label="Empezar a grabar"><span class="pp-rec-i" aria-hidden="true">🎙️</span></button><p class="pp-rec-t" id="mpT" aria-live="polite">0:00</p><p class="suave pp-rec-m" id="mpM">Toca el círculo para empezar.</p><button type="button" class="btn sec" id="mpPausa" hidden>⏸ Pausar</button></div><div id="mpGuardar"></div>' : '<p class="pp-guia">Tu navegador no permite grabar aquí. Prueba desde Chrome (Android) o Safari actualizado.</p>'));
    $('#mpAtras').onclick = () => { if (rec && !confirm('Se está grabando. ¿Salir y descartar?')) return; parar(true); vistaLista(); };
    const b = $('#mpB'); if (!b) return;
    b.onclick = async () => {
      vibra(); const m = $('#mpM'), tt = $('#mpT'), pb = $('#mpPausa');
      if (rec) { if (acumTotal() < 3) { if (m) m.textContent = 'Graba al menos 3 segundos.'; return; } rec.stop(); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { if (m) m.textContent = 'Permite el micrófono para grabar (en los ajustes del navegador).'; return; }
      const mt = mime(); try { rec = mt ? new MediaRecorder(stream, { mimeType: mt }) : new MediaRecorder(stream); } catch (e) { parar(true); if (m) m.textContent = 'No pude empezar a grabar.'; return; }
      trozos = []; acum = 0; tIni = Date.now(); pausado = false;
      try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; }
      b.classList.add('on'); b.setAttribute('aria-label', 'Terminar de grabar'); if (pb) pb.hidden = false; if (m) m.textContent = 'Grabando… toca el círculo para terminar.';
      rec.ondataavailable = (e) => { if (e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = () => {
        const dur = acumTotal(), blob = new Blob(trozos, { type: (rec && rec.mimeType) || mt || 'audio/webm' });
        clearInterval(reloj); soltarPantalla(); try { stream.getTracks().forEach((x) => x.stop()); } catch (e) { /* nada */ } rec = null; stream = null;
        b.classList.remove('on'); if (pb) pb.hidden = true; ficha(blob, dur);
      };
      rec.start(1000);
      reloj = setInterval(() => { if (tt) tt.textContent = mmss(acumTotal()); }, 500);
      if (pb) pb.onclick = () => { try { if (!pausado) { acum += Date.now() - tIni; rec.pause(); pausado = true; pb.textContent = '▶ Seguir'; b.classList.remove('on'); if (m) m.textContent = 'En pausa.'; } else { tIni = Date.now(); rec.resume(); pausado = false; pb.textContent = '⏸ Pausar'; b.classList.add('on'); if (m) m.textContent = 'Grabando…'; } } catch (e) { /* nada */ } };
    };
  }
  const acumTotal = () => (acum + (pausado ? 0 : Date.now() - tIni)) / 1000;

  function ficha(blob, dur) {
    const c = $('#mpGuardar'), m = $('#mpM'); if (!c) return;
    if (dur < 3) { if (m) m.textContent = 'Fue muy corto (menos de 3 segundos); no se guardó.'; return; }
    const u = URL.createObjectURL(blob); urls.push(u);
    if (m) m.textContent = 'Listo ✓ Escúchala y ponle nombre.';
    c.innerHTML = '<audio controls src="' + u + '" style="width:100%"></audio><label class="suave" for="mpTit">Título</label><input id="mpTit" class="inp" maxlength="80" value="Prédica del ' + esc(fecha(Date.now())) + '"><label class="suave" for="mpPas">Pasaje (opcional)</label><input id="mpPas" class="inp" maxlength="60" placeholder="Ej.: Juan 3:16"><div class="hoja-bt"><button type="button" class="btn" id="mpGuarda">Guardar</button><button type="button" class="pp-borrar" id="mpDesc">Descartar</button></div><p class="suave" id="mpMsg"></p>';
    $('#mpGuarda').onclick = async () => {
      const t = $('#mpTit').value.trim() || 'Prédica sin título';
      try { await op('readwrite', (s) => s.put({ id: uid(), t: Date.now(), dur, blob, titulo: t, pasaje: $('#mpPas').value.trim() })); vistaLista(); } catch (e) { $('#mpMsg').textContent = 'No pude guardar: revisa el espacio del teléfono.'; }
    };
    $('#mpDesc').onclick = () => { if (confirm('¿Descartar esta grabación?')) vistaLista(); };
  }

  window.TBMisPredicas = { abrir: vistaLista };
})();
