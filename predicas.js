// predicas.js - F1291 (F1292: biblioteca · F1293: series, filtros, papelera, tiempo) · Estudio y Prédicas en el móvil (FASE 1 de la integración del escritorio). Solo Tierra Buena Plus.
// Mismos nombres de campos que el escritorio (title, baseText, point1…, observeKeywords…) para poder unir ambos en una fase futura.
// Un paso por pantalla, guardado automático, sin tocar el inicio de sesión. CSP: sin atributo style en el HTML (colores y tamaños en predicas.css / setProperty).
'use strict';
(function () {
  const K_E = 'tb_movil_estudios', K_P = 'tb_movil_predicas';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const App = () => window.TBApp || {};
  const plus = () => { try { return !!(window.TBSuscripcion && window.TBSuscripcion.tengoPlus()); } catch (e) { return false; } };
  const quieto = () => { try { return !!(window.TBMov && window.TBMov.quieto()); } catch (e) { return false; } };
  const vibra = () => { try { if (App().vibra) App().vibra(); } catch (e) { /* sin vibración */ } };
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const lista = (k) => { let v = null; try { v = App().leer(k); } catch (e) { v = null; } return Array.isArray(v) ? v : []; };
  const grabar = (k, v) => { try { return App().guardar(k, v); } catch (e) { return false; } };

  // ---------- Pasos (lenguaje simple: cada paso dice qué hacer, en una frase) ----------
  const F = (id, et, ayuda, filas, ph) => ({ id, et, ayuda, filas: filas || 4, ph: ph || '' });
  const PASOS_E = [
    { t: 'El texto', ico: '📖', guia: 'Elige qué vas a estudiar. Puede ser un pasaje o un tema.', campos: [F('passage', 'Pasaje', 'Ej.: Juan 3:16-21', 1, 'Libro, capítulo y versículos'), F('topic', 'Tema (si lo tienes)', 'En pocas palabras, de qué trata.', 1, 'Ej.: El amor de Dios'), F('series', 'Serie (opcional)', 'Para agrupar estudios parecidos. Ej.: Salmos.', 1, 'Nombre de la serie')] },
    { t: 'Observar', ico: '👀', guia: 'Lee despacio. Aquí solo anotas lo que el texto DICE, sin explicarlo todavía.', campos: [F('observeKeywords', 'Palabras que se repiten', 'Las que aparecen varias veces o llaman la atención.'), F('observeActions', 'Qué se hace', 'Verbos y acciones: quién hace qué.'), F('observeCharacters', 'Quiénes aparecen', 'Personas y lugares.'), F('observeContext', 'Antes y después', 'Qué pasa justo antes y justo después.')] },
    { t: 'Interpretar', ico: '🔎', guia: 'Ahora preguntas: ¿qué quiso decir esto a quienes lo oyeron primero?', campos: [F('interpretHistory', 'Cuándo y por qué', 'La situación de esa época.'), F('interpretCulture', 'Costumbres de ese tiempo', 'Cosas que hoy no se usan o se entienden distinto.'), F('interpretTheology', 'Qué enseña de Dios', 'Lo que el texto muestra de Dios y de nosotros.')] },
    { t: 'Aplicar', ico: '🌱', guia: 'La parte práctica: qué cambia en tu vida esta semana.', campos: [F('applyAnswers', '¿Qué voy a hacer con esto?', 'Una o dos acciones concretas, con nombre y fecha.', 5), F('wordStudyNotes', 'Palabras que quiero entender mejor', 'Opcional.', 3)] }
  ];
  const PASOS_P = [
    { t: 'Texto y título', ico: '✍️', guia: 'Parte por lo esencial: el texto, el título y la idea principal.', campos: [F('baseText', 'Texto base', 'Ej.: Salmo 23', 1, 'Libro, capítulo y versículos'), F('title', 'Título', 'Corto y fácil de recordar.', 1), F('centralTruth', 'La idea principal', 'Una sola frase: lo que quieres que se lleven.', 3), F('series', 'Serie (opcional)', 'Para agrupar mensajes parecidos. Ej.: Salmos.', 1, 'Nombre de la serie')] },
    { t: 'Introducción', ico: '🚪', guia: 'Cómo abres. Presenta el texto y por qué importa hoy.', campos: [F('intro', 'Introducción', 'Una historia corta o una pregunta sirve mucho.', 6)] },
    { t: 'Punto I', ico: '1️⃣', guia: 'Tu primer punto. Una idea, con el versículo que la apoya.', campos: [F('point1', 'Punto I', '', 7)] },
    { t: 'Punto II', ico: '2️⃣', guia: 'Tu segundo punto.', campos: [F('point2', 'Punto II', '', 7)] },
    { t: 'Punto III', ico: '3️⃣', guia: 'Tu tercer punto (si no lo necesitas, déjalo en blanco).', campos: [F('point3', 'Punto III', '', 7)] },
    { t: 'Ilustraciones', ico: '💡', guia: 'Historias o ejemplos de la vida diaria que ayudan a entender.', campos: [F('illustrations', 'Ilustraciones', '', 6)] },
    { t: 'Cierre y llamado', ico: '🙌', guia: 'Cómo terminas y qué les pides que hagan.', campos: [F('conclusion', 'Conclusión', 'Repite la idea principal.', 4), F('call', 'Llamado', 'Algo concreto que puedan hacer hoy.', 4)] }
  ];
  const nuevoE = () => ({ id: uid('study'), passage: '', topic: '', author: '', date: '', status: 'borrador', series: '', observeKeywords: '', observeActions: '', observeCharacters: '', observeContext: '', interpretHistory: '', interpretCulture: '', interpretTheology: '', applyAnswers: '', wordStudyNotes: '', updated: Date.now() });
  const nuevaP = (pre) => Object.assign({ id: uid('sermon'), title: '', baseText: '', centralTruth: '', intro: '', point1: '', point2: '', point3: '', illustrations: '', conclusion: '', call: '', status: 'borrador', series: '', updated: Date.now() }, pre || {});
  // Puente estudio → prédica (la aplicación del estudio pasa a ser el llamado).
  const predicaDesdeEstudio = (e) => nuevaP({ baseText: e.passage || '', title: e.topic || '', call: e.applyAnswers || '', intro: e.observeContext || '', studyId: e.id });
  const llenos = (it, pasos) => pasos.map((p) => p.campos.some((c) => c.id !== 'series' && String(it[c.id] || '').trim()));
  const tituloDe = (it, tipo) => (tipo === 'e' ? (it.topic || it.passage) : (it.title || it.baseText)) || 'Sin título';
  const textoCompartir = (it, tipo) => {
    const pasos = tipo === 'e' ? PASOS_E : PASOS_P, out = [tituloDe(it, tipo)];
    pasos.forEach((p) => p.campos.forEach((c) => { const v = String(it[c.id] || '').trim(); if (v) out.push('\n' + c.et.toUpperCase() + '\n' + v); }));
    return out.join('\n') + '\n\n— Hecho con Tierra Buena';
  };
  const vivos = (k) => lista(k).filter((x) => !x.borrado);
  const REP = [['intro', 'Introducción'], ['point1', 'Punto I'], ['point2', 'Punto II'], ['point3', 'Punto III'], ['conclusion', 'Conclusión'], ['call', 'Llamado']];
  const reparto = (it, total) => {
    const W = { intro: 1, point1: 2.2, point2: 2.2, point3: 2.2, conclusion: 0.5, call: 0.5 }, ks = Object.keys(W).filter((k) => String(it[k] || '').trim()), suma = ks.reduce((a, k) => a + W[k], 0), out = {};
    if (!suma || !(total > 0)) return out; ks.forEach((k) => { out[k] = Math.max(1, Math.round(total * W[k] / suma)); }); return out;
  };
  const tiempoHTML = (it) => { const m = it.minutos || 0, r = m ? reparto(it, m) : {}; return '<section class="pp-tiempo"><h3>⏱️ Tiempo del mensaje</h3><p class="suave">¿Cuánto tiempo tienes para predicar?</p><div class="pp-chips">' + [15, 20, 30, 40, 45, 60].map((x) => '<button type="button" class="chip pp-min' + (m === x ? ' on' : '') + '" data-m="' + x + '" aria-pressed="' + (m === x) + '">' + x + ' min</button>').join('') + '</div>' + (Object.keys(r).length ? '<ul class="pp-reparto">' + REP.filter((x) => r[x[0]]).map((x) => '<li><span>' + x[1] + '</span><b>≈ ' + r[x[0]] + ' min</b></li>').join('') + '</ul>' : (m ? '<p class="suave">Escribe la introducción y los puntos para ver el reparto.</p>' : '')) + '</section>'; };
  const tarjetas = (tipo) => vivos(tipo === 'e' ? K_E : K_P).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));

  // ---------- Pantallas ----------
  let envuelto = null;
  const pintar = (html, extra) => {
    const p = $('#pantalla'); if (!p) return;
    p.innerHTML = '<div class="pp' + (quieto() ? ' pp-quieto' : '') + (extra ? ' ' + extra : '') + '">' + html + '</div>';
    envuelto = p.firstChild; try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  };
  const cab = (atras, txt) => '<button type="button" class="volver" id="ppAtras">‹ ' + esc(txt || 'Palabra') + '</button>';
  const ADORNO = '<svg class="pp-adorno" viewBox="0 0 120 80" aria-hidden="true"><path d="M10 60 Q35 48 60 60 Q85 48 110 60 V70 Q85 58 60 70 Q35 58 10 70Z" class="pp-a1"/><path d="M60 60 V22" class="pp-a2"/><circle cx="60" cy="18" r="9" class="pp-a3"/><path d="M60 40 q-14-4-20-16 M60 34 q14-4 20-16" class="pp-a2"/></svg>';

  function abrir() { if (!plus()) return vistaPlus(); vistaInicio(); }

  function vistaPlus() {
    pintar(cab() + '<section class="pp-hero pp-lock">' + ADORNO + '<p class="pp-chip">Incluido en Plus</p><h1>Estudio y Prédicas</h1><p>Prepara tus estudios bíblicos y tus mensajes desde el teléfono, paso a paso y sin perderte.</p></section>' +
      '<ul class="pp-lista-in"><li><b>Estudio bíblico guiado</b><span>Observar, interpretar y aplicar, un paso por pantalla.</span></li><li><b>Prédicas con esquema</b><span>Idea principal, tres puntos, ilustraciones y llamado.</span></li><li><b>Modo púlpito</b><span>Letra grande para predicar con el teléfono.</span></li><li><b>En todos tus equipos</b><span>Se guardan en tu cuenta.</span></li></ul>' +
      '<button type="button" class="btn" id="ppPlanes">Ver planes</button><p class="suave pp-nota">La Biblia, la oración y la ayuda en crisis siguen gratis.</p>');
    $('#ppAtras').onclick = () => App().ir('palabra');
    $('#ppPlanes').onclick = () => { vibra(); if (App().apoyar) App().apoyar(); };
  }

  function vistaInicio() {
    const ne = vivos(K_E).length, np = vivos(K_P).length;
    pintar(cab() + '<section class="pp-hero">' + ADORNO + '<h1>Estudio y Prédicas</h1><p>Prepara con calma. Todo se guarda solo.</p></section>' +
      '<button type="button" class="pp-gran pp-g1" data-t="e"><span class="pp-gi" aria-hidden="true">📖</span><b>Estudio bíblico</b><small>' + (ne ? ne + (ne === 1 ? ' estudio' : ' estudios') : 'Observar, interpretar, aplicar') + '</small></button>' +
      '<button type="button" class="pp-gran pp-g2" data-t="p"><span class="pp-gi" aria-hidden="true">🎙️</span><b>Prédicas</b><small>' + (np ? np + (np === 1 ? ' prédica' : ' prédicas') : 'Tu mensaje en 7 pasos') + '</small></button>' +
      '<button type="button" class="pp-gran pp-g3" data-t="b"><span class="pp-gi" aria-hidden="true">📚</span><b>Biblioteca de apoyo</b><small>Diccionario, personajes, ilustraciones, prédicas de ejemplo y más</small></button>');
    $('#ppAtras').textContent = '‹ Palabra'; $('#ppAtras').onclick = () => App().ir('palabra');
    document.querySelectorAll('.pp-gran').forEach((b) => { b.onclick = () => { vibra(); if (b.dataset.t === 'b') vistaBiblioteca(null); else vistaLista(b.dataset.t); }; });
  }

  const flt = { q: '', est: '', serie: '' };
  const EST = { borrador: 'Borrador', en_progreso: 'En progreso', completado: 'Completado', lista: 'Lista para predicar', predicada: 'Ya predicada' };
  const seriesDe = (tipo) => Array.from(new Set(vivos(tipo === 'e' ? K_E : K_P).map((x) => String(x.series || '').trim()).filter(Boolean))).sort();
  const serChips = (tipo) => { const l = seriesDe(tipo); return l.length ? '<div class="pp-chips" aria-label="Series que ya tienes">' + l.map((x) => '<button type="button" class="chip pp-sugser" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : ''; };
  const textoTodo = (it, pasos) => pasos.map((p) => p.campos.map((c) => it[c.id] || '').join(' ')).join(' ');

  function vistaLista(tipo, reset) {
    if (reset !== false) { flt.q = ''; flt.est = ''; flt.serie = ''; }
    const k = tipo === 'e' ? K_E : K_P, okTxt = tipo === 'e' ? 'completado' : 'lista', ser = seriesDe(tipo), nPap = lista(k).filter((x) => x.borrado).length, pasos = tipo === 'e' ? PASOS_E : PASOS_P;
    const est = [['', 'Todos'], ['borrador', 'Borrador'], ['en_progreso', 'En progreso'], [okTxt, tipo === 'e' ? 'Completados' : 'Listas']].concat(tipo === 'p' ? [['predicada', 'Ya predicadas']] : []);
    const chip = (v, t, on, att) => '<button type="button" class="chip' + (on ? ' on' : '') + '" ' + att + '="' + esc(v) + '" aria-pressed="' + on + '">' + esc(t) + '</button>';
    pintar(cab() + '<h1 class="pp-h">' + (tipo === 'e' ? 'Mis estudios' : 'Mis prédicas') + '</h1>' +
      '<button type="button" class="btn" id="ppNuevo">+ Nuev' + (tipo === 'e' ? 'o estudio' : 'a prédica') + '</button>' +
      '<input type="text" id="ppQ" class="pp-busca" placeholder="Buscar en lo que escribiste…" value="' + esc(flt.q) + '" autocomplete="off">' +
      '<div class="pp-chips" id="ppEst" role="group" aria-label="Filtrar por estado">' + est.map((x) => chip(x[0], x[1], flt.est === x[0], 'data-e')).join('') + '</div>' +
      (ser.length ? '<div class="pp-chips" id="ppSer" role="group" aria-label="Filtrar por serie">' + chip('', 'Todas las series', !flt.serie, 'data-s') + ser.map((x) => chip(x, x, flt.serie === x, 'data-s')).join('') + '</div>' : '') +
      '<div id="ppLista" class="pp-cards" aria-live="polite"></div>' + (nPap ? '<button type="button" class="pp-borrar" id="ppPap">🗑️ Papelera (' + nPap + ')</button>' : ''));
    $('#ppAtras').textContent = '‹ Estudio y Prédicas'; $('#ppAtras').onclick = vistaInicio;
    $('#ppNuevo').onclick = () => { vibra(); const it = tipo === 'e' ? nuevoE() : nuevaP(); vistaEditor(tipo, it, 0, true); };
    const pap = $('#ppPap'); if (pap) pap.onclick = () => vistaPapelera(tipo);
    const pintarLista = () => {
      const r = $('#ppLista'); if (!r) return; const q = sinAcento(flt.q.trim()), todos = tarjetas(tipo);
      const its = todos.filter((it) => (!flt.est || it.status === flt.est) && (!flt.serie || String(it.series || '') === flt.serie) && (!q || sinAcento(tituloDe(it, tipo) + ' ' + textoTodo(it, pasos)).indexOf(q) >= 0));
      if (!its.length) { r.innerHTML = todos.length ? '<div class="pp-vacio"><p>No hay resultados con ese filtro.</p><p class="suave">Prueba con «Todos» o una palabra más corta.</p></div>' : '<div class="pp-vacio"><p>Aún no tienes ' + (tipo === 'e' ? 'estudios' : 'prédicas') + '.</p><p class="suave">Toca el botón verde para empezar. Puedes parar y seguir cuando quieras.</p></div>'; return; }
      r.innerHTML = its.map((it, i) => { const ll = llenos(it, pasos), n = ll.filter(Boolean).length;
        return '<button type="button" class="pp-item" data-id="' + esc(it.id) + '" data-i="' + i + '"><b>' + esc(tituloDe(it, tipo)) + '</b><small>' + esc(EST[it.status] || 'Borrador') + ' · ' + n + ' de ' + pasos.length + ' pasos' + (it.series ? ' · Serie: ' + esc(it.series) : '') + '</small><i class="pp-barra" data-w="' + Math.round(n / pasos.length * 100) + '"></i></button>'; }).join('');
      r.querySelectorAll('.pp-item').forEach((b) => { b.style.setProperty('--d', Math.min(Number(b.dataset.i), 8) * 60 + 'ms'); const br = b.querySelector('.pp-barra'); if (br) br.style.setProperty('--w', br.dataset.w + '%'); b.onclick = () => { const it = its.find((x) => x.id === b.dataset.id); if (it) vistaEditor(tipo, it, 0, false); }; });
    };
    pintarLista(); let t = 0; $('#ppQ').addEventListener('input', () => { flt.q = $('#ppQ').value; clearTimeout(t); t = setTimeout(pintarLista, 180); });
    const marca = (sel, att, clave) => document.querySelectorAll(sel + ' .chip').forEach((c) => { c.onclick = () => { flt[clave] = c.getAttribute(att); document.querySelectorAll(sel + ' .chip').forEach((x) => { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', String(x === c)); }); pintarLista(); }; });
    marca('#ppEst', 'data-e', 'est'); marca('#ppSer', 'data-s', 'serie');
  }

  function vistaPapelera(tipo) {
    const k = tipo === 'e' ? K_E : K_P, lim = Date.now() - 30 * 86400000; let todos = lista(k); const antes = todos.length;
    todos = todos.filter((x) => !x.borrado || x.borrado > lim); if (todos.length !== antes) grabar(k, todos);   // pasados 30 días se borran solas
    const pap = todos.filter((x) => x.borrado).sort((a, b) => b.borrado - a.borrado);
    pintar(cab() + '<h1 class="pp-h">Papelera</h1><p class="pp-guia">Aquí quedan 30 días por si te arrepientes. Después se borran solas.</p>' +
      (pap.length ? '<div class="pp-cards">' + pap.map((it) => { const d = Math.max(0, Math.floor((Date.now() - it.borrado) / 86400000)); return '<div class="pp-pit"><b>' + esc(tituloDe(it, tipo)) + '</b><small>' + (d === 0 ? 'Borrada hoy' : 'Borrada hace ' + d + (d === 1 ? ' día' : ' días')) + '</small><div class="pp-fila"><button type="button" class="btn sec" data-r="' + esc(it.id) + '">Restaurar</button><button type="button" class="pp-borrar" data-x="' + esc(it.id) + '">Borrar para siempre</button></div></div>'; }).join('') + '</div>' : '<div class="pp-vacio"><p>La papelera está vacía.</p></div>'));
    $('#ppAtras').textContent = '‹ ' + (tipo === 'e' ? 'Mis estudios' : 'Mis prédicas'); $('#ppAtras').onclick = () => vistaLista(tipo, false);
    document.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { vibra(); const l = lista(k), x = l.find((y) => y.id === b.dataset.r); if (x) { delete x.borrado; x.updated = Date.now(); grabar(k, l); } vistaPapelera(tipo); }; });
    document.querySelectorAll('[data-x]').forEach((b) => { let ya = false; b.onclick = () => { if (!ya) { ya = true; b.textContent = '¿Seguro? Toca otra vez'; return; } grabar(k, lista(k).filter((y) => y.id !== b.dataset.x)); vistaPapelera(tipo); }; });
  }

  function guardarItem(tipo, it, nuevo) {
    const k = tipo === 'e' ? K_E : K_P, todos = lista(k), i = todos.findIndex((x) => x.id === it.id);
    it.updated = Date.now();
    if (i >= 0) todos[i] = it; else todos.push(it);
    return grabar(k, todos.slice(-300));
  }

  function vistaEditor(tipo, it, paso, nuevo) {
    const pasos = tipo === 'e' ? PASOS_E : PASOS_P, total = pasos.length + 1;   // el último paso es «Listo»
    if (paso >= pasos.length) return vistaListo(tipo, it);
    const P = pasos[paso], ll = llenos(it, pasos);
    pintar(cab() + '<div class="pp-prog" role="group" aria-label="Pasos">' + pasos.map((p, i) => '<button type="button" class="pp-dot' + (i === paso ? ' on' : '') + (ll[i] ? ' ok' : '') + '" data-i="' + i + '" aria-label="Paso ' + (i + 1) + ': ' + esc(p.t) + '"></button>').join('') + '<span class="pp-dot fin" aria-hidden="true"></span></div>' +
      '<p class="pp-paso">Paso ' + (paso + 1) + ' de ' + total + '</p><h1 class="pp-h"><span aria-hidden="true">' + P.ico + '</span> ' + esc(P.t) + '</h1><p class="pp-guia">' + esc(P.guia) + '</p>' +
      P.campos.map((c) => '<div class="pp-campo"><label for="pp_' + c.id + '">' + esc(c.et) + '</label>' + (c.ayuda ? '<small class="suave">' + esc(c.ayuda) + '</small>' : '') +
        (c.filas === 1 ? '<input type="text" id="pp_' + c.id + '" data-c="' + c.id + '" maxlength="200" placeholder="' + esc(c.ph) + '" value="' + esc(it[c.id]) + '">' : '<textarea id="pp_' + c.id + '" data-c="' + c.id + '" rows="' + c.filas + '" maxlength="6000" placeholder="' + esc(c.ph || 'Escribe aquí…') + '">' + esc(it[c.id]) + '</textarea>') + (c.id === 'series' ? serChips(tipo) : '') + '</div>').join('') +
      '<button type="button" class="pp-apoyo" id="ppApoyo">📚 Ideas y apoyo para este paso</button><p class="pp-guardado" id="ppGuardado" aria-live="polite">Se guarda solo</p>' +
      '<div class="pp-nav">' + (paso > 0 ? '<button type="button" class="btn sec" id="ppPrev">‹ Atrás</button>' : '') + '<button type="button" class="btn" id="ppNext">' + (paso === pasos.length - 1 ? 'Terminar' : 'Siguiente ›') + '</button></div>');
    $('#ppAtras').textContent = '‹ ' + (tipo === 'e' ? 'Mis estudios' : 'Mis prédicas');
    $('#ppAtras').onclick = () => { guardarItem(tipo, it); vistaLista(tipo, false); };
    let t = 0; const g = $('#ppGuardado');
    const guardarYa = () => { clearTimeout(t); if (it.status === 'borrador' && pasos.some((p) => p.campos.some((c) => c.id !== 'series' && String(it[c.id] || '').trim()))) it.status = 'en_progreso'; const ok = guardarItem(tipo, it); if (g) g.textContent = ok === false ? 'No se pudo guardar: libera espacio en el teléfono' : 'Guardado ✓'; };
    document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('input', () => { it[el.dataset.c] = el.value; if (g) g.textContent = 'Escribiendo…'; clearTimeout(t); t = setTimeout(guardarYa, 450); }));
    document.querySelectorAll('.pp-dot[data-i]').forEach((d) => { d.onclick = () => { guardarYa(); vistaEditor(tipo, it, Number(d.dataset.i)); }; });
    document.querySelectorAll('.pp-sugser').forEach((b) => { b.onclick = () => { const el = $('#pp_series'); if (el) { el.value = b.dataset.v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; });
    let campo = P.campos[0].id; document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('focus', () => { campo = el.dataset.c; }));
    $('#ppApoyo').onclick = () => { vibra(); guardarYa(); vistaBiblioteca({ tipo, it, paso, get campo() { return campo; }, sug: (tipo === 'e' ? SUG_E : SUG_P)[paso] || [] }); };
    $('#ppNext').onclick = () => { vibra(); guardarYa(); vistaEditor(tipo, it, paso + 1); };
    const pv = $('#ppPrev'); if (pv) pv.onclick = () => { guardarYa(); vistaEditor(tipo, it, paso - 1); };
    if (nuevo && paso === 0) { const f = $('[data-c]'); if (f && !quieto()) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 250); }
  }

  function vistaListo(tipo, it) {
    const pasos = tipo === 'e' ? PASOS_E : PASOS_P, ll = llenos(it, pasos), n = ll.filter(Boolean).length, esE = tipo === 'e';
    const okTxt = esE ? 'completado' : 'lista', hecho = it.status === okTxt;
    pintar(cab() + '<section class="pp-hero pp-ok">' + ADORNO + '<h1>' + (n === pasos.length ? '¡Muy bien!' : 'Buen avance') + '</h1><p>' + esc(tituloDe(it, tipo)) + '</p></section>' +
      '<p class="pp-guia">' + n + ' de ' + pasos.length + ' pasos tienen texto.' + (n < pasos.length ? ' Toca un punto de arriba para completar lo que falta.' : '') + '</p>' +
      '<div class="pp-prog" role="group" aria-label="Pasos">' + pasos.map((p, i) => '<button type="button" class="pp-dot' + (ll[i] ? ' ok' : '') + '" data-i="' + i + '" aria-label="' + esc(p.t) + (ll[i] ? ' (con texto)' : ' (en blanco)') + '"></button>').join('') + '<span class="pp-dot fin on" aria-hidden="true"></span></div>' +
      (esE ? '<button type="button" class="btn" id="ppAPred">Crear una prédica con este estudio</button>' : '<button type="button" class="btn" id="ppPulpito">Abrir en modo púlpito</button>') +
      (esE ? '' : tiempoHTML(it)) + '<button type="button" class="btn sec" id="ppMarca">' + (hecho ? 'Volver a «en progreso»' : (esE ? 'Marcar como completado' : 'Marcar como lista para predicar')) + '</button>' +
      (!esE && it.status === 'lista' ? '<button type="button" class="btn sec" id="ppPred">Marcar como ya predicada</button>' : '') + '<button type="button" class="btn sec" id="ppComp">Compartir como texto</button>' +
      '<button type="button" class="pp-borrar" id="ppBorrar">Mover a la papelera</button><p id="ppMsg" class="suave pp-nota" role="status"></p>');
    $('#ppAtras').textContent = '‹ ' + (esE ? 'Mis estudios' : 'Mis prédicas'); $('#ppAtras').onclick = () => vistaLista(tipo, false);
    document.querySelectorAll('.pp-dot[data-i]').forEach((d) => { d.onclick = () => vistaEditor(tipo, it, Number(d.dataset.i)); });
    const msg = (t) => { const m = $('#ppMsg'); if (m) m.textContent = t; };
    $('#ppMarca').onclick = () => { it.status = hecho ? 'en_progreso' : okTxt; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); };
    const pr = $('#ppPred'); if (pr) pr.onclick = () => { it.status = 'predicada'; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); };
    document.querySelectorAll('.pp-min').forEach((b) => { b.onclick = () => { it.minutos = Number(b.dataset.m); guardarItem(tipo, it); vibra(); vistaListo(tipo, it); }; });
    if (esE) $('#ppAPred').onclick = () => { vibra(); const p = predicaDesdeEstudio(it); guardarItem('p', p); vistaEditor('p', p, 0, true); };
    else $('#ppPulpito').onclick = () => { vibra(); pulpito(it); };
    $('#ppComp').onclick = async () => {
      const tx = textoCompartir(it, tipo);
      try { if (navigator.share) { await navigator.share({ title: tituloDe(it, tipo), text: tx }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(tx); msg('Copiado. Pégalo donde quieras.'); } catch (e) { msg('No se pudo copiar desde aquí.'); }
    };
    let ya = false; $('#ppBorrar').onclick = () => {
      if (!ya) { ya = true; $('#ppBorrar').textContent = '¿Seguro? Se mueve a la papelera'; return; }
      it.borrado = Date.now(); guardarItem(tipo, it); vistaLista(tipo);
    };
  }

  // ---------- Modo púlpito: letra grande, una parte por pantalla ----------
  function pulpito(it) {
    const partes = [['Título', (it.title || '') + (it.baseText ? '\n' + it.baseText : '')], ['Idea principal', it.centralTruth], ['Introducción', it.intro, 'intro'], ['Punto I', it.point1, 'point1'], ['Punto II', it.point2, 'point2'], ['Punto III', it.point3, 'point3'], ['Ilustraciones', it.illustrations], ['Conclusión', it.conclusion, 'conclusion'], ['Llamado', it.call, 'call']].filter((x) => String(x[1] || '').trim());
    if (!partes.length) { const m = $('#ppMsg'); if (m) m.textContent = 'Escribe algo en la prédica para verla en modo púlpito.'; return; }
    let i = 0, tam = 26, lock = null; const rep = it.minutos ? reparto(it, it.minutos) : {}; const ov = document.createElement('div'); ov.className = 'pp-pulpito' + (quieto() ? ' pp-quieto' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo púlpito');
    ov.innerHTML = '<div class="pp-pu-top"><button type="button" class="pp-pu-b" id="puCerrar" aria-label="Cerrar">✕</button><span id="puNum"></span><span><button type="button" class="pp-pu-b" id="puMenos" aria-label="Letra más chica">A−</button><button type="button" class="pp-pu-b" id="puMas" aria-label="Letra más grande">A+</button></span></div><h2 id="puTit"></h2><div class="pp-pu-txt" id="puTxt"></div><div class="pp-pu-nav"><button type="button" class="pp-pu-b gr" id="puAnt">‹ Anterior</button><button type="button" class="pp-pu-b gr" id="puSig">Siguiente ›</button></div>';
    document.body.appendChild(ov);
    const ver = () => { $('#puTit').textContent = partes[i][0]; const tx = $('#puTxt'); tx.textContent = partes[i][1]; tx.style.setProperty('--pf', tam + 'px'); $('#puNum').textContent = (i + 1) + ' / ' + partes.length + (rep[partes[i][2]] ? ' · ≈ ' + rep[partes[i][2]] + ' min' : ''); tx.classList.remove('pp-in'); void tx.offsetWidth; tx.classList.add('pp-in'); $('#puAnt').disabled = i === 0; $('#puSig').disabled = i === partes.length - 1; };
    const cerrar = () => { try { if (lock && lock.release) lock.release(); } catch (e) { /* nada */ } ov.remove(); };
    $('#puCerrar').onclick = cerrar; $('#puAnt').onclick = () => { if (i > 0) { i--; ver(); } }; $('#puSig').onclick = () => { if (i < partes.length - 1) { i++; ver(); } };
    $('#puMas').onclick = () => { tam = Math.min(54, tam + 4); ver(); }; $('#puMenos').onclick = () => { tam = Math.max(18, tam - 4); ver(); };
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => { /* sin pantalla encendida */ }); } catch (e) { /* nada */ }
    ver();
  }


  // ---------- Biblioteca de apoyo (material del escritorio, en versión liviana y buscable) ----------
  const SUG_E = [['cx', 'li', 'te'], ['di', 'pe', 'lu', 'me'], ['cx', 'do', 'or', 'ca', 'pa'], ['ap', 'do']];
  const SUG_P = [['ej', 'li', 'te'], ['il', 'ej'], ['di', 'pe', 'ca', 'il'], ['di', 'pe', 'ca', 'il'], ['di', 'pe', 'ca', 'il'], ['il', 'ej'], ['ap', 'ej']];
  const memo = {}; let indice = null;
  const sinAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const traer = async (u) => { if (memo[u]) return memo[u]; const r = await fetch(u); if (!r.ok) throw new Error('x'); memo[u] = await r.json(); return memo[u]; };
  const parrafos = (t) => String(t || '').split(/\n{2,}/).map((x) => '<p>' + esc(x).replace(/\n/g, '<br>') + '</p>').join('');
  const insTxt = (c, o) => c === 'il' ? o.t + '\n' + o.x + (o.a ? '\nAplicación: ' + o.a : '') : c === 'ap' ? o.t : o.t + ' — ' + (o.x || '').split('\n')[0].slice(0, 500) + (o.r ? ' (' + o.r + ')' : '');
  const volverEd = (ctx) => vistaEditor(ctx.tipo, ctx.it, ctx.paso);

  async function vistaBiblioteca(ctx) {
    pintar(cab() + '<h1 class="pp-h">Biblioteca de apoyo</h1><p class="pp-guia">' + (ctx ? 'Elige algo y tócalo para insertarlo en tu ' + (ctx.tipo === 'e' ? 'estudio' : 'prédica') + '.' : 'Todo el material, buscable y sin internet después de abrirlo una vez.') + '</p><div id="ppCats" class="pp-grid" aria-live="polite"><p class="suave">Cargando…</p></div>');
    $('#ppAtras').textContent = ctx ? '‹ Volver a mi ' + (ctx.tipo === 'e' ? 'estudio' : 'prédica') : '‹ Estudio y Prédicas'; $('#ppAtras').onclick = () => (ctx ? volverEd(ctx) : vistaInicio());
    let ix; try { ix = indice || (indice = await traer('datos/apoyo_indice.json')); } catch (e) { const c = $('#ppCats'); if (c) c.innerHTML = '<p class="suave">Para abrir la biblioteca la primera vez necesitas internet. Después queda en tu teléfono.</p>'; return; }
    const c = $('#ppCats'); if (!c) return;
    const orden = ctx ? ix.slice().sort((a, b) => (ctx.sug.indexOf(a.id) < 0 ? 99 : ctx.sug.indexOf(a.id)) - (ctx.sug.indexOf(b.id) < 0 ? 99 : ctx.sug.indexOf(b.id))) : ix;
    c.innerHTML = orden.map((k, i) => '<button type="button" class="pp-cat' + (ctx && ctx.sug.indexOf(k.id) >= 0 ? ' sug' : '') + '" data-k="' + k.id + '" data-i="' + i + '"><span aria-hidden="true">' + esc(k.i) + '</span><b>' + esc(k.n) + '</b><small>' + k.c + '</small>' + (ctx && ctx.sug.indexOf(k.id) >= 0 ? '<em>Para este paso</em>' : '') + '</button>').join('');
    c.querySelectorAll('.pp-cat').forEach((b) => { b.style.setProperty('--d', (Number(b.dataset.i) * 35) + 'ms'); b.onclick = () => { vibra(); vistaCategoria(ix.find((k) => k.id === b.dataset.k), ctx, ''); }; });
  }

  async function vistaCategoria(k, ctx, q) {
    pintar(cab() + '<h1 class="pp-h"><span aria-hidden="true">' + esc(k.i) + '</span> ' + esc(k.n) + '</h1><p class="pp-guia">' + esc(k.a) + '</p><input type="text" id="ppBusca" class="pp-busca" placeholder="Buscar en ' + esc(k.n.toLowerCase()) + '…" value="' + esc(q) + '" autocomplete="off"><div id="ppRes" class="pp-cards" aria-live="polite"><p class="suave">Cargando…</p></div>');
    $('#ppAtras').textContent = '‹ Biblioteca'; $('#ppAtras').onclick = () => vistaBiblioteca(ctx);
    let datos; try { datos = await traer('datos/apoyo_' + k.id + '.json'); } catch (e) { const r = $('#ppRes'); if (r) r.innerHTML = '<p class="suave">No se pudo cargar. Abre esta parte una vez con internet y quedará guardada.</p>'; return; }
    const idx = datos.map((o) => sinAcento(o.t + ' ' + o.s + ' ' + o.x));
    let lim = 40;
    const lista = () => {
      const r = $('#ppRes'), b = $('#ppBusca'); if (!r || !b) return;
      const qq = sinAcento(b.value.trim()), hits = []; datos.forEach((o, i) => { if (!qq || idx[i].indexOf(qq) >= 0) hits.push(o); });
      if (!hits.length) { r.innerHTML = '<div class="pp-vacio"><p>No hay resultados.</p><p class="suave">Prueba con una palabra más corta.</p></div>'; return; }
      r.innerHTML = hits.slice(0, lim).map((o, i) => '<button type="button" class="pp-item pp-res" data-i="' + i + '"><b>' + esc(o.t) + '</b>' + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</button>').join('') + (hits.length > lim ? '<button type="button" class="btn sec" id="ppMas">Ver más (' + (hits.length - lim) + ')</button>' : '');
      r.querySelectorAll('.pp-res').forEach((bt) => { bt.onclick = () => { vibra(); vistaDetalle(k, hits[Number(bt.dataset.i)], ctx, $('#ppBusca').value); }; });
      const m = $('#ppMas'); if (m) m.onclick = () => { lim += 40; lista(); };
    };
    lista(); let t = 0; $('#ppBusca').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { lim = 40; lista(); }, 180); });
  }

  function vistaDetalle(k, o, ctx, q) {
    const esBase = k.id === 'ej';
    pintar(cab() + '<p class="pp-paso">' + esc(k.n) + '</p><h1 class="pp-h">' + esc(o.t) + '</h1>' + (o.s ? '<p class="pp-chip pp-chip2">' + esc(o.s) + '</p>' : '') + (o.r ? '<p class="pp-refs">📌 ' + esc(o.r) + '</p>' : '') +
      '<div class="pp-det">' + parrafos(o.x) + (o.a ? '<p><b>Aplicación:</b> ' + esc(o.a) + '</p>' : '') + (o.p ? '<h3>Así se arma</h3>' + [['Idea principal', o.p.centralTruth], ['Introducción', o.p.intro], ['Punto I', o.p.point1], ['Punto II', o.p.point2], ['Punto III', o.p.point3], ['Ilustraciones', o.p.illustrations], ['Conclusión', o.p.conclusion], ['Llamado', o.p.call]].filter((x) => x[1]).map((x) => '<p><b>' + x[0] + ':</b> ' + esc(x[1]) + '</p>').join('') : '') +
      (o.b ? '<details class="pp-bio"><summary>Leer la historia completa</summary>' + parrafos(o.b) + '</details>' : '') + '</div>' +
      (ctx ? '<button type="button" class="btn" id="ppIns">Insertar en mi ' + (ctx.tipo === 'e' ? 'estudio' : 'prédica') + '</button>' : '') +
      (esBase ? '<button type="button" class="btn' + (ctx ? ' sec' : '') + '" id="ppBase">Usar como base de una prédica nueva</button>' : '') +
      '<button type="button" class="btn sec" id="ppCopia">Copiar</button><p id="ppMsg" class="suave pp-nota" role="status"></p>');
    $('#ppAtras').textContent = '‹ ' + k.n; $('#ppAtras').onclick = () => vistaCategoria(k, ctx, q);
    const msg = (t) => { const m = $('#ppMsg'); if (m) m.textContent = t; };
    if (ctx) $('#ppIns').onclick = () => {
      const c = ctx.campo, ant = String(ctx.it[c] || '').trim(), def = (ctx.tipo === 'e' ? PASOS_E : PASOS_P)[ctx.paso].campos.find((f) => f.id === c), linea = def && def.filas === 1; ctx.it[c] = linea ? (ant ? ant + '; ' : '') + (k.id === 'ej' || k.id === 'li' || k.id === 'cx' ? (o.r || o.t) : o.t) : (ant ? ant + '\n\n' : '') + insTxt(k.id, o);
      if (ctx.it.status === 'borrador') ctx.it.status = 'en_progreso'; guardarItem(ctx.tipo, ctx.it); vibra(); volverEd(ctx);
    };
    if (esBase) $('#ppBase').onclick = () => { vibra(); const p = nuevaP(o.p); p.id = uid('sermon'); p.status = 'borrador'; guardarItem('p', p); vistaEditor('p', p, 0, false); };
    $('#ppCopia').onclick = async () => { try { await navigator.clipboard.writeText(o.t + '\n\n' + o.x + (o.r ? '\n' + o.r : '')); msg('Copiado.'); } catch (e) { msg('No se pudo copiar desde aquí.'); } };
  }

  const api = { abrir, plus, K_E, K_P, _t: { reparto, insTxt, sinAcento, SUG_E, SUG_P, nuevoE, nuevaP, predicaDesdeEstudio, textoCompartir, llenos, PASOS_E, PASOS_P, tituloDe } };
  if (typeof window !== 'undefined') window.TBPredicas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
