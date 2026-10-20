// apuntes.js - F1304 · Apuntes de prédicas (Estudio y Prédicas, Fase 2).
// Un lugar para anotar prédicas de cualquier origen (tu iglesia, un evento, internet): escribir, dictar, grabar con el micrófono,
// poner versículos con un toque y marcar momentos del audio. Pensado para usarse de pie, en una fila o en un viaje: botones grandes y todo se guarda solo.
// Textos en tb_movil_ep_apuntes (se sincroniza con la cuenta). Los audios quedan SOLO en el teléfono (IndexedDB «tb_pp_audio», claves «ra_…»).
// CSP: sin atributo style en el HTML (colores y tamaños en apuntes.css / setProperty).
'use strict';
(function () {
  const K = 'tb_movil_ep_apuntes', K_E = 'tb_movil_estudios';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const App = () => window.TBApp || {};
  const vibra = () => { try { if (App().vibra) App().vibra(); } catch (e) { /* sin vibración */ } };
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const leerL = (k) => { let v = null; try { v = App().leer(k); } catch (e) { v = null; } return Array.isArray(v) ? v : []; };
  const lista = () => leerL(K);
  const vivos = () => lista().filter((x) => !x.borrado).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const sinAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const hoyISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fechaBonita = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso || ''; } };
  const cuandoVer = (t) => { const d = new Date(t), h = new Date(); const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); return (d.toDateString() === h.toDateString() ? 'Hoy' : d.toLocaleDateString('es', { day: 'numeric', month: 'short' })) + ' · ' + hora; };

  const FUENTES = [['iglesia', '⛪', 'Mi iglesia'], ['evento', '🎪', 'Evento'], ['linea', '🌐', 'En línea'], ['otro', '📝', 'Otro']];
  const fuenteDe = (id) => FUENTES.find((f) => f[0] === id) || FUENTES[3];
  const tituloAuto = (f) => {
    const d = new Date(), dia = d.toLocaleDateString('es', { weekday: 'long' }), n = d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
    return f === 'iglesia' ? 'Prédica del ' + dia + ' ' + n : f === 'evento' ? 'Evento · ' + n : f === 'linea' ? 'Prédica en línea · ' + n : 'Apuntes · ' + n;
  };
  const nuevo = (fuente) => ({ id: uid('apunte'), fuente: fuente || 'iglesia', titulo: tituloAuto(fuente || 'iglesia'), fecha: hoyISO(), predicador: '', pasaje: '', enlace: '', notas: '', llevo: '', orar: '', audios: 0, updated: Date.now() });
  const guardarIt = (it) => {
    it.updated = Date.now(); const l = lista(), i = l.findIndex((x) => x.id === it.id);
    if (i >= 0) l[i] = it; else l.push(it);
    try { return App().guardar(K, l.slice(-500)); } catch (e) { return false; }
  };

  // ---------- Audios (solo en el teléfono) ----------
  const bd = () => new Promise((ok, no) => { try { const r = indexedDB.open('tb_pp_audio', 1); r.onupgradeneeded = () => { r.result.createObjectStore('rec', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
  const bdOp = (modo, f) => bd().then((db) => new Promise((ok, no) => { const tx = db.transaction('rec', modo), st = tx.objectStore('rec'), q = f(st); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => no(tx.error); }));
  const prefijo = (id) => 'ra_' + id + '_';
  const audiosDe = (id) => bdOp('readonly', (st) => st.getAll(IDBKeyRange.bound(prefijo(id), prefijo(id) + '\uffff'))).then((l) => (l || []).sort((a, b) => b.t - a.t)).catch(() => []);
  const mimeAudio = () => { try { return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''; } catch (e) { return ''; } };
  const hayGrabar = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  let rec = null, stream = null, reloj = 0, t0 = 0, trozos = [], recId = '', recAp = '', recTipo = '', lock = null, ultCk = 0, vistaAud = null;
  const msgRec = (t) => { const m = $('#apRecM'); if (m) m.textContent = t; };
  function liberar() { clearInterval(reloj); reloj = 0; try { if (stream) stream.getTracks().forEach((x) => x.stop()); } catch (e) { /* nada */ } stream = null; try { if (lock) lock.release(); } catch (e) { /* nada */ } lock = null; }
  function reponerBoton() { const b = $('#apRecB'), t = $('#apRecT'), p = $('#apRec'); if (b) { b.classList.remove('on'); b.setAttribute('aria-label', 'Empezar a grabar'); } if (p) p.classList.remove('on'); if (t) t.textContent = 'Grabar la prédica'; }
  function pararGrab() { try { if (rec && rec.state !== 'inactive') { rec.stop(); return; } } catch (e) { /* nada */ } if (rec) { liberar(); rec = null; } }
  function checkpoint() { ultCk = Date.now(); const dur = (Date.now() - t0) / 1000; bdOp('readwrite', (st) => st.put({ id: recId, apunte: recAp, t: t0, dur, blob: new Blob(trozos, { type: recTipo }), parcial: true })).catch(() => 0); }
  async function empezarGrab(it) {
    if (rec) return pararGrab();
    detenerVoz();
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { msgRec('Permite el micrófono para grabar (en los ajustes del navegador).'); return; }
    const mime = mimeAudio(); try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { liberar(); rec = null; msgRec('No pude empezar a grabar.'); return; }
    trozos = []; t0 = Date.now(); ultCk = t0; recAp = it.id; recId = prefijo(it.id) + Date.now().toString(36); recTipo = rec.mimeType || mime || 'audio/webm';
    try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; }
    const b = $('#apRecB'), p = $('#apRec'); if (b) { b.classList.add('on'); b.setAttribute('aria-label', 'Parar de grabar'); } if (p) p.classList.add('on');
    msgRec('Grabando… puedes escribir mientras tanto. Mantén la pantalla encendida.');
    rec.ondataavailable = (e) => { if (e.data && e.data.size) trozos.push(e.data); };
    rec.onstop = async () => {
      const dur = (Date.now() - t0) / 1000, id = recId, ap = recAp, blob = new Blob(trozos, { type: recTipo }), inicio = t0; rec = null; trozos = []; liberar(); reponerBoton();
      if (dur < 3) { await bdOp('readwrite', (st) => st.delete(id)).catch(() => 0); msgRec('Fue muy corto (menos de 3 segundos); no se guardó.'); return; }
      try { await bdOp('readwrite', (st) => st.put({ id, apunte: ap, t: inicio, dur, blob })); msgRec('Guardada ✓ La tienes abajo, en «Grabaciones».'); } catch (e) { msgRec('No pude guardar la grabación: revisa el espacio del teléfono.'); }
      if (vistaAud) vistaAud(ap);
    };
    rec.start(1000);
    reloj = setInterval(() => {
      if (!$('#apRecB')) { pararGrab(); return; }   // salió de la pantalla: se guarda lo grabado y se apaga el micrófono
      const s = (Date.now() - t0) / 1000, tt = $('#apRecT'); if (tt) tt.textContent = '● ' + mmss(s);
      if (Date.now() - ultCk > 60000 && s > 10) checkpoint();
    }, 500);
  }
  document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && rec && !lock) { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; } } });

  // ---------- Dictado (reconocimiento de voz del teléfono) ----------
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let vozRec = null, vozBtn = null, vozOn = false;
  function detenerVoz() { vozOn = false; if (vozBtn) { vozBtn.classList.remove('on'); vozBtn.setAttribute('aria-pressed', 'false'); } try { if (vozRec) vozRec.stop(); } catch (e) { /* nada */ } vozRec = null; vozBtn = null; }
  const aviso = (t) => { const a = $('#apAviso'); if (a) a.textContent = t; };
  function dictar(btn, el) {
    if (vozOn && vozBtn === btn) { detenerVoz(); aviso('Dictado detenido ✓'); return; }
    if (rec) { aviso('Mientras grabas, el micrófono ya está en uso: escribe, o dicta después.'); return; }
    detenerVoz(); let r; try { r = new SR(); } catch (e) { aviso('Tu teléfono no permite dictar aquí.'); return; }
    r.lang = 'es-CL'; r.continuous = true; r.interimResults = false; vozRec = r; vozBtn = btn; vozOn = true; btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); aviso('🎤 Escuchando… toca otra vez para parar.');
    r.onresult = (e) => {
      let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' ';
      t = t.trim().replace(/\s+(nueva línea|nuevo párrafo|punto y aparte)\s*/gi, '\n').replace(/\s+(coma)\s+/gi, ', '); if (!t) return;
      const v = el.value, fin = !v.trim() || /[.!?\n]\s*$/.test(v); if (fin) t = t.charAt(0).toUpperCase() + t.slice(1);
      el.value = (v && !/\s$/.test(v) ? v + ' ' : v) + t; el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    r.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { detenerVoz(); aviso('Permite el micrófono para dictar (en los ajustes del navegador).'); } else if (e.error === 'network') { detenerVoz(); aviso('Dictar necesita internet.'); } };
    r.onend = () => { if (vozOn && vozRec === r) { try { r.start(); } catch (e) { detenerVoz(); } } };
    try { r.start(); } catch (e) { detenerVoz(); aviso('No pude abrir el micrófono.'); }
  }

  // ---------- Pantallas ----------
  const tam = () => { try { const n = Number(localStorage.getItem('tb_pp_tam')); return n >= 0 && n <= 3 ? n : 1; } catch (e) { return 1; } };
  const pintar = (html) => {
    const p = $('#pantalla'); if (!p) return; pararGrab(); detenerVoz();
    p.innerHTML = '<div class="pp ap pp-tam' + tam() + '">' + html + '</div>'; try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  };
  const atras = (txt) => '<button type="button" class="volver" id="apAtras">‹ ' + esc(txt) + '</button>';
  const aInicio = () => { if (window.TBPredicas && window.TBPredicas.abrir) window.TBPredicas.abrir(); else if (App().ir) App().ir('palabra'); };

  const flt = { q: '', f: '' };
  function vistaLista(reset) {
    if (reset !== false) { flt.q = ''; flt.f = ''; }
    pintar(atras('Estudio y Prédicas') + '<section class="pp-hero ap-hero"><h1>🎧 Apuntes de prédicas</h1><p>Anota lo que escuchas, donde estés: escribe, dicta o graba.</p></section>' +
      '<h2 class="pp-sub">¿Dónde escuchas la prédica?</h2><div class="ap-tiles">' + FUENTES.map((f) => '<button type="button" class="ap-tile ap-t-' + f[0] + '" data-n="' + f[0] + '"><span aria-hidden="true">' + f[1] + '</span><b>' + esc(f[2]) + '</b><small>Empezar a apuntar</small></button>').join('') + '</div>' +
      '<h2 class="pp-sub">Mis apuntes</h2><input type="text" id="apQ" class="pp-busca" placeholder="Buscar por título, predicador o texto…" value="' + esc(flt.q) + '" autocomplete="off">' +
      '<div class="pp-chips" id="apFlt" role="group" aria-label="Filtrar por origen">' + [['', 'Todos']].concat(FUENTES.map((f) => [f[0], f[1] + ' ' + f[2]])).map((x) => '<button type="button" class="chip' + (flt.f === x[0] ? ' on' : '') + '" data-f="' + x[0] + '" aria-pressed="' + (flt.f === x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>' +
      '<div id="apLista" class="pp-cards" aria-live="polite"></div>');
    $('#apAtras').onclick = aInicio;
    document.querySelectorAll('.ap-tile').forEach((b) => { b.onclick = () => { vibra(); const it = nuevo(b.dataset.n); guardarIt(it); vistaEditor(it); }; });
    const pl = () => {
      const r = $('#apLista'); if (!r) return; const q = sinAcento(flt.q.trim()), todos = vivos();
      const its = todos.filter((x) => (!flt.f || x.fuente === flt.f) && (!q || sinAcento([x.titulo, x.predicador, x.pasaje, x.notas, x.llevo].join(' ')).indexOf(q) >= 0));
      if (!its.length) { r.innerHTML = '<div class="pp-vacio"><p>' + (todos.length ? 'No hay apuntes con ese filtro.' : 'Aún no tienes apuntes.') + '</p><p class="suave">' + (todos.length ? 'Prueba con «Todos» o una palabra más corta.' : 'Toca uno de los botones de arriba y empieza: se guarda solo.') + '</p></div>'; return; }
      r.innerHTML = its.map((x, i) => { const f = fuenteDe(x.fuente); return '<button type="button" class="pp-item ap-item" data-id="' + esc(x.id) + '" data-i="' + i + '"><span class="pp-st ap-f-' + esc(f[0]) + '">' + f[1] + ' ' + esc(f[2]) + '</span><b>' + esc(x.titulo || 'Sin título') + '</b><small>' + esc(fechaBonita(x.fecha)) + (x.predicador ? ' · ' + esc(x.predicador) : '') + (x.pasaje ? ' · 📖 ' + esc(x.pasaje) : '') + (x.audios ? ' · 🎙️ ' + x.audios : '') + '</small>' + (x.notas ? '<small class="ap-prev">' + esc(String(x.notas).replace(/\s+/g, ' ').slice(0, 90)) + '</small>' : '') + '</button>'; }).join('');
      r.querySelectorAll('.ap-item').forEach((b) => { b.style.setProperty('--d', Math.min(Number(b.dataset.i), 8) * 60 + 'ms'); b.onclick = () => { vibra(); const x = its.find((y) => y.id === b.dataset.id); if (x) vistaEditor(x); }; });
    };
    pl(); let t = 0; $('#apQ').addEventListener('input', () => { flt.q = $('#apQ').value; clearTimeout(t); t = setTimeout(pl, 180); });
    document.querySelectorAll('#apFlt .chip').forEach((c) => { c.onclick = () => { flt.f = c.dataset.f; document.querySelectorAll('#apFlt .chip').forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); }); pl(); }; });
  }

  const textoApunte = (it) => [it.titulo || 'Apuntes', [fuenteDe(it.fuente)[2], it.predicador && 'Predicador: ' + it.predicador, it.pasaje && 'Texto: ' + it.pasaje, it.fecha && fechaBonita(it.fecha), it.enlace].filter(Boolean).join(' · '), '', it.notas || '', it.llevo ? '\nLO QUE ME LLEVO\n' + it.llevo : '', it.orar ? '\nPARA ORAR\n' + it.orar : '', '\n— Hecho con Tierra Buena'].join('\n');

  function hojaVersiculo(poner) {
    const V = window.TBPredicas && window.TBPredicas._v; if (!V || !V.traerPasaje) { aviso('No pude abrir la Biblia ahora.'); return; }
    const ov = document.createElement('div'); ov.className = 'pp-hoja'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Poner un versículo');
    ov.innerHTML = '<div class="pp-hoja-c"><h2>📖 Poner un versículo</h2><p class="pp-guia">Escribe el pasaje que nombró el predicador. Ej.: Juan 3:16</p><div class="pp-campo"><input type="text" id="apRef" maxlength="80" placeholder="Libro, capítulo y versículos" autocomplete="off" autocapitalize="words"></div><div id="apRefV" class="pp-txtc" aria-live="polite"></div><button type="button" class="btn" id="apRefOk" hidden>Poner en mis apuntes</button><button type="button" class="pp-borrar" id="apRefX">Cancelar</button></div>';
    document.body.appendChild(ov); const cerrar = () => ov.remove(), inp = ov.querySelector('#apRef'), box = ov.querySelector('#apRefV'), ok = ov.querySelector('#apRefOk');
    ov.querySelector('#apRefX').onclick = cerrar; setTimeout(() => { try { inp.focus(); } catch (e) { /* nada */ } }, 60);
    let t = 0, seq = 0, res = null; const sel = new Set();
    const act = () => { ok.hidden = !res || res.error === 'ref' || (!res.error && !sel.size); ok.textContent = res && res.error === 'red' ? 'Poner solo la cita' : 'Poner ' + sel.size + (sel.size === 1 ? ' versículo' : ' versículos'); };
    const buscar = async () => {
      const v = inp.value.trim(), my = ++seq; sel.clear(); res = null; act(); if (!v) { box.innerHTML = ''; return; }
      box.innerHTML = '<p class="suave">Buscando…</p>'; const r = await V.traerPasaje(v); if (my !== seq) return; res = r;
      if (r.error === 'ref') { box.innerHTML = '<p class="suave">Aún no reconozco ese pasaje. Prueba así: «Salmo 23» o «Juan 3:16».</p>'; act(); return; }
      if (r.error) { box.innerHTML = '<p class="suave">No pude traer el texto (sin internet). Puedes poner solo la cita: ' + esc(r.ref) + '.</p>'; act(); return; }
      if (r.r.v1 && r.vs.length <= 8) r.vs.forEach((x) => sel.add(x[0]));
      box.innerHTML = '<p class="suave">Toca los versículos que quieras poner.</p>' + r.vs.map((x) => '<button type="button" class="pp-v' + (sel.has(x[0]) ? ' sel' : '') + '" data-v="' + x[0] + '" aria-pressed="' + sel.has(x[0]) + '"><sup>' + x[0] + '</sup> ' + esc(x[1]) + '</button>').join('');
      box.querySelectorAll('.pp-v').forEach((b) => { b.onclick = () => { vibra(); const n = Number(b.dataset.v); if (sel.has(n)) sel.delete(n); else sel.add(n); b.classList.toggle('sel', sel.has(n)); b.setAttribute('aria-pressed', String(sel.has(n))); act(); }; });
      act();
    };
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(buscar, 350); });
    ok.onclick = () => {
      vibra(); if (!res || res.error === 'ref') return;
      if (res.error) { poner('(' + res.ref + ')'); cerrar(); return; }
      const ns = Array.from(sel).sort((a, b) => a - b); if (!ns.length) return;
      const seg = ns.every((n, k) => k === 0 || n === ns[k - 1] + 1), cita = res.r.libro + ' ' + res.r.cap + ':' + (seg && ns.length > 1 ? ns[0] + '-' + ns[ns.length - 1] : ns.join(','));
      poner('«' + ns.map((n) => (res.vs.find((y) => y[0] === n) || [0, ''])[1]).join(' ') + '» (' + cita + ')'); cerrar();
    };
  }

  function vistaEditor(it) {
    const campo = (id, et, ayuda, filas) => '<div class="pp-campo"><label for="ap_' + id + '">' + esc(et) + '</label>' + (ayuda ? '<small class="suave">' + esc(ayuda) + '</small>' : '') + (filas ? '<textarea id="ap_' + id + '" data-f="' + id + '" rows="' + filas + '" maxlength="6000" placeholder="Escribe aquí…">' + esc(it[id]) + '</textarea>' : '<input type="text" id="ap_' + id + '" data-f="' + id + '" maxlength="200" value="' + esc(it[id]) + '">') + '</div>';
    pintar(atras('Mis apuntes') +
      '<input type="text" id="apTit" class="ap-tit" data-f="titulo" maxlength="120" placeholder="Título de la prédica" value="' + esc(it.titulo) + '" aria-label="Título">' +
      '<div class="pp-chips ap-fuentes" id="apFuentes" role="group" aria-label="De dónde es">' + FUENTES.map((f) => '<button type="button" class="chip' + (it.fuente === f[0] ? ' on' : '') + '" data-s="' + f[0] + '" aria-pressed="' + (it.fuente === f[0]) + '">' + f[1] + ' ' + esc(f[2]) + '</button>').join('') + '</div>' +
      (hayGrabar() ? '<section class="ap-rec" id="apRec"><button type="button" class="ap-rec-b" id="apRecB" aria-label="Empezar a grabar"><span aria-hidden="true">🎙️</span></button><div class="ap-rec-c"><b id="apRecT">Grabar la prédica</b><small id="apRecM">Toca el círculo para grabar. Puedes escribir mientras tanto.</small></div></section>' : '<p class="pp-guia ap-sinrec">Tu navegador no permite grabar aquí. Puedes escribir' + (SR ? ' o dictar' : '') + ' tus apuntes.</p>') +
      '<div class="ap-herr" role="toolbar" aria-label="Atajos para apuntar"><button type="button" data-q="ver"><i aria-hidden="true">📖</i><span>Versículo</span></button><button type="button" data-q="clave"><i aria-hidden="true">⭐</i><span>Clave</span></button><button type="button" data-q="marca"><i aria-hidden="true">⏱</i><span>Marca</span></button><button type="button" data-q="duda"><i aria-hidden="true">❓</i><span>Duda</span></button><button type="button" data-q="aplic"><i aria-hidden="true">🙌</i><span>Aplicar</span></button>' + (SR ? '<button type="button" data-q="voz" aria-pressed="false"><i aria-hidden="true">🎤</i><span>Dictar</span></button>' : '') + '</div><p class="suave ap-aviso" id="apAviso" aria-live="polite"></p>' +
      '<textarea id="apNotas" class="ap-notas" data-f="notas" rows="10" maxlength="30000" placeholder="Escribe aquí lo que vas escuchando…" aria-label="Mis apuntes">' + esc(it.notas) + '</textarea><p class="pp-guardado" id="apGuardado" aria-live="polite">Se guarda solo</p>' +
      '<details class="pp-texto ap-mas"><summary>🗂️ <b>Más datos</b> · predicador, texto, fecha</summary><div class="pp-txtc">' + campo('predicador', 'Predicador') + campo('pasaje', 'Texto bíblico', 'Ej.: Juan 3:16-21') + '<div class="pp-campo"><label for="ap_fecha">Fecha</label><input type="date" id="ap_fecha" data-f="fecha" value="' + esc(it.fecha) + '"></div>' + campo('enlace', 'Enlace o lugar', 'Si la viste en internet, pega aquí el enlace.') + campo('llevo', '🙌 Lo que me llevo', 'Una o dos cosas que voy a aplicar.', 4) + campo('orar', '🙏 Para orar', 'Motivos de oración que salieron.', 3) + '</div></details>' +
      '<h2 class="pp-sub">Grabaciones</h2><div id="apAudios"><p class="suave">Cargando…</p></div><p class="suave pp-nota">Las grabaciones se guardan solo en este teléfono, no se suben a ninguna parte.</p>' +
      '<div class="ap-acc"><button type="button" class="btn" id="apDis">🎨 Diseñar y compartir</button><button type="button" class="btn sec" id="apCompartir">Compartir como texto</button><button type="button" class="btn sec" id="apEstudio">📖 Pasar a un estudio</button><button type="button" class="pp-borrar" id="apBorrar">🗑️ Borrar este apunte</button></div>');
    const g = $('#apGuardado'); let t = 0;
    const ya = () => { clearTimeout(t); const ok = guardarIt(it); if (g) g.textContent = ok === false ? 'No se pudo guardar: libera espacio en el teléfono' : 'Guardado ✓'; };
    $('#apAtras').onclick = () => { ya(); vistaLista(false); };
    document.querySelectorAll('[data-f]').forEach((el) => el.addEventListener('input', () => { it[el.dataset.f] = el.value; if (g) g.textContent = 'Escribiendo…'; clearTimeout(t); t = setTimeout(ya, 450); }));
    document.querySelectorAll('#apFuentes .chip').forEach((c) => { c.onclick = () => { vibra(); it.fuente = c.dataset.s; document.querySelectorAll('#apFuentes .chip').forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); }); ya(); }; });
    const nt = $('#apNotas');
    const poner = (txt, enfocar) => { const a = nt.selectionStart == null ? nt.value.length : nt.selectionStart, b = nt.selectionEnd == null ? a : nt.selectionEnd, antes = nt.value.slice(0, a), desp = nt.value.slice(b), pre = antes && !/\n$/.test(antes) ? '\n' : '', pos = (antes + pre + txt).length; nt.value = antes + pre + txt + desp; if (enfocar !== false) { nt.focus(); try { nt.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } nt.dispatchEvent(new Event('input', { bubbles: true })); };
    const hora = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    document.querySelectorAll('.ap-herr button').forEach((b) => {
      b.onclick = () => {
        vibra(); const q = b.dataset.q;
        if (q === 'ver') hojaVersiculo((x) => poner(x));
        else if (q === 'clave') poner('⭐ ');
        else if (q === 'duda') poner('❓ ');
        else if (q === 'aplic') poner('🙌 Me llevo: ');
        else if (q === 'marca') { poner('⏱ ' + (rec && recAp === it.id ? mmss((Date.now() - t0) / 1000) : hora()) + ' '); aviso(rec ? 'Marca puesta: coincide con el minuto de tu grabación.' : 'Marca puesta con la hora actual.'); }
        else if (q === 'voz') dictar(b, nt);
      };
    });
    const pintarAudios = async (id) => {
      const c = $('#apAudios'); if (!c || id !== it.id) return; const l = await audiosDe(it.id); const c2 = $('#apAudios'); if (!c2) return;
      if (it.audios !== l.length) { it.audios = l.length; guardarIt(it); }
      c2.innerHTML = l.length ? l.map((x) => '<article class="pp-ens" data-e="' + esc(x.id) + '"><div class="pp-ens-c"><b>' + esc(cuandoVer(x.t)) + '</b><small>' + mmss(x.dur) + ' · ' + ((x.blob && x.blob.size ? x.blob.size : 0) / 1048576).toFixed(1) + ' MB' + (x.parcial ? ' · se cortó antes de terminar' : '') + '</small></div><audio controls preload="none" data-a="' + esc(x.id) + '"></audio><button type="button" class="pp-borrar" data-xe="' + esc(x.id) + '">Borrar</button></article>').join('') : '<p class="suave">Todavía no grabas ninguna.</p>';
      c2.querySelectorAll('audio[data-a]').forEach((a) => { const x = l.find((y) => y.id === a.dataset.a); if (x && x.blob) { const u = URL.createObjectURL(x.blob); a.src = u; a.addEventListener('emptied', () => { try { URL.revokeObjectURL(u); } catch (e) { /* nada */ } }, { once: true }); } });
      c2.querySelectorAll('[data-xe]').forEach((b) => { let sure = false; b.onclick = async () => { if (!sure) { sure = true; b.textContent = '¿Seguro? Toca otra vez'; return; } await bdOp('readwrite', (st) => st.delete(b.dataset.xe)).catch(() => 0); pintarAudios(it.id); }; });
    };
    vistaAud = pintarAudios; pintarAudios(it.id);
    const rb = $('#apRecB'); if (rb) rb.onclick = () => { vibra(); empezarGrab(it); };
    $('#apDis').onclick = () => { vibra(); ya(); if (window.TBDisenos) window.TBDisenos.abrir('a', it, () => vistaEditor(it)); };
    $('#apCompartir').onclick = async () => {
      vibra(); ya(); const tx = textoApunte(it);
      try { if (navigator.share) { await navigator.share({ title: it.titulo || 'Apuntes', text: tx }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(tx); if (g) g.textContent = 'Copiado ✓ Ya puedes pegarlo donde quieras.'; } catch (e) { if (g) g.textContent = 'No pude copiar. Selecciona el texto y cópialo a mano.'; }
    };
    $('#apEstudio').onclick = () => {
      vibra(); ya(); const l = leerL(K_E);
      const e = { id: uid('study'), format: 'libre', passage: it.pasaje || '', topic: it.titulo || '', author: it.predicador || '', date: '', status: 'borrador', series: '', observeKeywords: '', observeActions: '', observeCharacters: '', observeContext: (it.notas || '') + (it.llevo ? '\n\nLO QUE ME LLEVO\n' + it.llevo : ''), interpretHistory: '', interpretCulture: '', interpretTheology: '', applyAnswers: '', wordStudyNotes: '', updated: Date.now() };
      l.push(e); try { App().guardar(K_E, l.slice(-300)); } catch (er) { /* nada */ }
      const V = window.TBPredicas && window.TBPredicas._v; if (V && V.vistaEditor) V.vistaEditor('e', e, 1, false); else aInicio();
    };
    let sureB = false; $('#apBorrar').onclick = async () => {
      if (!sureB) { sureB = true; $('#apBorrar').textContent = '¿Seguro? Toca otra vez (se borran también sus grabaciones)'; return; }
      pararGrab(); for (const x of await audiosDe(it.id)) await bdOp('readwrite', (st) => st.delete(x.id)).catch(() => 0);
      try { App().guardar(K, lista().filter((x) => x.id !== it.id)); } catch (e) { /* nada */ } vistaLista(false);
    };
  }

  const api = { abrir: () => vistaLista(true), nuevoRapido: (f) => { const it = nuevo(f || 'iglesia'); guardarIt(it); vistaEditor(it); }, cuantos: () => vivos().length, K };
  if (typeof window !== 'undefined') window.TBApuntes = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
