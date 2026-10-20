// predicas.js - F1302 (ensayo en voz alta con grabación, lista con estados de color) · F1301 (barra fija de crear, tamaño de letra, recordatorio en calendario, pasos fijos) · F1300 (estudiar desde la Biblia, títulos sugeridos, púlpito con deslizar) · F1299 (barra de herramientas, atajos de escritura, conteo, campos que crecen) · F1298 (versiones anteriores, revisar y sugerir, dictado por voz) · F1291 (F1292: biblioteca · F1293: series, filtros, papelera, tiempo · F1294: crear fácil: pantalla «Empezar» con el pasaje, texto bíblico dentro del editor, continuar · F1295: 13 formatos de estudio del escritorio, adaptados: una pregunta por pantalla · F1296: ideas al vuelo, prédica corta/breve, varios versículos, cronómetro, resumen · F1297: fecha de predicar, próxima prédica, duplicar, tarjeta imagen, PDF) · Estudio y Prédicas en el móvil (FASE 1 de la integración del escritorio). Abierto para todos por ahora (PLANES_ACTIVOS = false).
// Mismos nombres de campos que el escritorio (title, baseText, point1…, observeKeywords…) para poder unir ambos en una fase futura.
// Un paso por pantalla, guardado automático, sin tocar el inicio de sesión. CSP: sin atributo style en el HTML (colores y tamaños en predicas.css / setProperty).
'use strict';
(function () {
  const K_E = 'tb_movil_estudios', K_P = 'tb_movil_predicas', K_I = 'tb_movil_ep_ideas';
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

  // ---------- F1295 · Formatos de estudio del escritorio (Mesa de estudio), adaptados al móvil: cada pregunta es una pantalla ----------
  // [id, icono, nombre, tiempo, para qué sirve, explicación, [[campo, título, ayuda]…]] · mismos campos que el escritorio (observeKeywords = oKeywords…)
  const FORMATOS = [["oia","🧭","Observar · Interpretar · Aplicar","30–60 min","Preparar una enseñanza completa.","Primero miras qué dice el texto, luego entiendes qué significa y al final decides qué haces.",[]],["soap","📔","Diario personal","10–15 min","Tu momento diario con Dios.","Lees, observas, aplicas y oras. Corto y de corazón.",[["observeKeywords","📖 Lo que leí","Copia el versículo o la frase que más te habló hoy."],["observeContext","👀 Lo que veo","¿Qué dice el texto? ¿Qué me llama la atención?"],["applyAnswers","🙌 Lo que cambio","¿Qué voy a hacer distinto esta semana?"],["interpretTheology","🙏 Mi oración","Escribe una oración con lo que aprendiste."]]],["preguntas","❓","Preguntas guiadas","15–25 min","Cuando no sabes por dónde empezar.","Una pregunta a la vez, con palabras simples.",[["observeCharacters","🧑 ¿Quiénes aparecen?","Personas o grupos, y qué hace cada uno."],["observeActions","🎬 ¿Qué pasa?","Cuenta el texto con tus palabras."],["observeContext","📍 ¿Dónde y cuándo?","Lugar, época y situación."],["interpretHistory","🤔 ¿Por qué importa?","Qué estaba pasando y por qué se escribió."],["interpretTheology","✨ ¿Cómo es Dios aquí?","Qué nos dice este texto de Dios."],["applyAnswers","🙌 ¿Qué hago yo?","Un paso concreto para esta semana."]]],["libre","✍️","Cuaderno libre","Sin tiempo","Ideas sueltas o apuntes de un mensaje.","Una hoja en blanco para escribir como quieras.",[["observeContext","✍️ Mis notas","Escribe como quieras: ideas, preguntas, versículos…"]]],["express","⚡","Express: 3 preguntas","5 min","Cuando tienes poco tiempo.","¿Qué dice? ¿Qué significa? ¿Qué hago? Nada más.",[["observeContext","👀 ¿Qué dice?","Resume el texto en dos o tres frases."],["interpretTheology","💡 ¿Qué significa?","La idea principal, con tus palabras."],["applyAnswers","🙌 ¿Qué hago?","Una sola acción para hoy."]]],["palabras","🔑","Palabra por palabra","20–30 min","Entender palabras clave del texto.","Eliges palabras importantes y descubres qué significan.",[["observeKeywords","🔑 Palabras que se repiten","Anota las palabras que se repiten o te llaman la atención."],["wordStudyNotes","📚 Qué significan","Usa «Palabras originales» (a la derecha) para traer su significado."],["interpretTheology","✨ Qué enseñan de Dios","Qué muestran estas palabras sobre Dios."],["applyAnswers","🙌 Mi paso","Cómo vivo esto desde hoy."]]],["personaje","🧑","Un personaje","20–30 min","Aprender de la vida de alguien de la Biblia.","Quién es, qué hace y qué aprendemos de su historia.",[["observeCharacters","🧑 ¿Quién es?","Nombre, quién era y a qué se dedicaba."],["observeActions","🎬 ¿Qué hace y qué dice?","Sus decisiones y palabras en este pasaje."],["interpretHistory","⏳ ¿En qué momento vive?","Época y situación que le tocó vivir."],["interpretTheology","✨ ¿Qué aprendo de Dios?","Cómo actúa Dios en su historia."],["applyAnswers","🙌 ¿Qué imito o evito?","Qué copio de su ejemplo y qué cuidado tengo."]]],["contexto","🏺","Contexto del pasaje","25–40 min","Entender el mundo en que se escribió.","Dónde, cuándo y entre quiénes ocurre, antes de interpretar.",[["observeContext","📍 Dónde y cuándo","Lugar, fecha aproximada y quién escribe a quién."],["interpretHistory","📜 Qué pasaba entonces","Hechos de esa época que ayudan a entender."],["interpretCulture","🏺 Costumbres de la época","Cómo vivía la gente: comida, ropa, leyes, trabajo."],["interpretTheology","💡 Qué querían decir","Qué entendieron los primeros lectores."],["applyAnswers","🙌 Qué cambia hoy","Qué se parece y qué es distinto en mi vida."]]],["grupo","👥","Para conversar en grupo","15–20 min","Preparar una reunión de célula o grupo pequeño.","Una guía con preguntas abiertas, un compromiso y oración.",[["observeKeywords","📖 Lo que leeremos","Versículo o frase que abre la conversación."],["interpretTheology","💬 Preguntas para conversar","Escribe 3 o 4 preguntas abiertas para el grupo."],["applyAnswers","🤝 Nuestro compromiso","Un paso que podamos dar juntos esta semana."],["observeContext","🙏 Para orar juntos","Motivos de oración que salen del texto."]]],["mapa","🗺️","Mapa de ideas","15–25 min","Ver el pasaje como un dibujo de ideas conectadas.","Una idea al centro y ramas que salen de ella. Ideal si piensas en imágenes.",[["interpretTheology","🎯 Idea central","Una frase corta con la idea más importante del pasaje."],["observeKeywords","🌿 Ramas principales","Escribe 3 o 4 palabras o frases cortas, una por línea. Cada una será una rama."],["observeActions","🔗 Cómo se conectan","Une las ideas con flechas en palabras. Ej.: confiar → descansar."],["observeContext","🖼️ Imagen que lo resume","Describe un dibujo o símbolo simple que represente el pasaje."],["applyAnswers","🙌 Mi paso","Una acción concreta que sale de este mapa."]]],["linea","⏳","Línea de tiempo","15–25 min","Seguir una historia paso a paso, en orden.","Pones los hechos en fila, de principio a fin, y ves cómo avanza la historia.",[["interpretHistory","⏪ Antes de la historia","¿Qué había pasado antes? ¿Cómo estaban las cosas?"],["observeActions","🎬 Primero, luego, después","Un hecho por línea, en orden. Ej.: 1) Dios llama. 2) Él responde…"],["observeCharacters","🧑 Quién entra y cuándo","Anota quién aparece o se va en cada momento."],["interpretTheology","🔄 El giro importante","El momento en que todo cambia. ¿Qué lo provoca?"],["applyAnswers","⏩ ¿En qué parte estoy yo?","Con qué momento de la historia me identifico hoy y qué hago."]]],["infografia","📊","Infografía de una página","15–25 min","Enseñar con un cartel fácil de ver y recordar.","Un título fuerte, tres ideas cortas, un dato que sorprende y una frase para llevarse.",[["interpretTheology","📣 Título del cartel","Una frase corta y fuerte (máximo 8 palabras)."],["observeKeywords","🔢 Tres ideas cortas","Una idea por línea, con muy pocas palabras. Se verán como tarjetas."],["observeContext","🔍 Un dato que sorprende","Un número, un lugar o un hecho del texto que llame la atención."],["interpretCulture","🖼️ Íconos o fotos sugeridos","Qué dibujo, foto o símbolo pondrías junto a cada idea."],["applyAnswers","💬 Frase para recordar","Una frase corta que la gente pueda repetir y llevarse."]]],["bosquejo","🏛️","Bosquejo para exponer","40–60 min","Preparar una exposición del pasaje frente a otros.","Una idea central, tres puntos que salen del texto, una ilustración y un cierre.",[["interpretTheology","🎯 Idea central","Lo que el pasaje enseña, en una sola frase."],["observeKeywords","📌 Primer punto","Título corto + el versículo de donde sale."],["observeActions","📌 Segundo punto","Título corto + el versículo de donde sale."],["observeCharacters","📌 Tercer punto","Título corto + el versículo de donde sale."],["observeContext","💡 Ilustración","Una historia o ejemplo corto que ayude a entender."],["applyAnswers","🏁 Cierre y llamado","Cómo termino y a qué invito a la gente."]]]];
  const FMT = (id) => FORMATOS.find((f) => f[0] === id) || FORMATOS[0];
  const RECOM = ['express', 'preguntas', 'oia', 'soap'];
  const SUGC = { observeKeywords: ['cx', 'li', 'te'], observeActions: ['cx', 'li'], observeCharacters: ['pe', 'lu'], observeContext: ['cx', 'li', 'lu'], interpretHistory: ['cx', 'di', 'lu', 'me'], interpretCulture: ['cx', 'di'], interpretTheology: ['do', 'or', 'ca', 'pa'], wordStudyNotes: ['di'], applyAnswers: ['ap', 'do'] };
  const LARGOS = [['completa', '🎙️', 'Mensaje completo', '30–45 min', 'Introducción, tres puntos, ilustraciones y llamado.'], ['corta', '⏱️', 'Mensaje corto', '10–15 min', 'Una idea, un solo punto y un llamado.'], ['breve', '🌅', 'Palabras breves', '5 min', 'Para un saludo o una reunión pequeña: una idea y un llamado.']];
  const largoDe = (it) => LARGOS.find((x) => x[0] === ((it && it.formato) || 'completa')) || LARGOS[0];
  const PASOS_PC = [PASOS_P[0], { t: 'Cómo abres', ico: '🚪', guia: 'Dos o tres frases que lleven al texto.', campos: [F('intro', 'Introducción', '', 4)] }, { t: 'Tu punto', ico: '1️⃣', guia: 'Una sola idea, con el versículo que la apoya.', campos: [F('point1', 'Punto', '', 8)] }, PASOS_P[6]];
  const PASOS_PB = [PASOS_P[0], { t: 'Tu mensaje', ico: '🌅', guia: 'Una idea y el versículo que la apoya. Nada más.', campos: [F('point1', 'Mensaje', '', 8)] }, { t: 'Llamado', ico: '🙌', guia: 'Algo concreto que puedan hacer hoy.', campos: [F('call', 'Llamado', '', 4)] }];
  const SUGP = { baseText: ['ej', 'li', 'te'], intro: ['ej', 'li', 'te'], point1: ['di', 'pe', 'ca', 'il'], conclusion: ['ap', 'ej'], call: ['ap', 'ej'] };
  const largoCards = (sel) => LARGOS.map((f) => { const on = f[0] === sel; return '<button type="button" class="pp-fmt' + (on ? ' on' : '') + '" data-f="' + f[0] + '" aria-pressed="' + on + '"><span class="pp-fi" aria-hidden="true">' + f[1] + '</span><span class="pp-ft"><b>' + esc(f[2]) + '</b><small>' + esc(f[3]) + ' · ' + esc(f[4]) + '</small></span>' + (on ? '<em>Elegido</em>' : '') + '</button>'; }).join('');
  const pfCache = {};
  const pasosDe = (tipo, it) => {
    if (tipo !== 'e') return !it || !it.formato || it.formato === 'completa' ? PASOS_P : (it.formato === 'corta' ? PASOS_PC : PASOS_PB); if (!it || !it.format || it.format === 'oia') return PASOS_E;
    return pfCache[it.format] || (pfCache[it.format] = [PASOS_E[0]].concat(FMT(it.format)[6].map((c) => { const m = /^(\S+)\s+(.*)$/.exec(c[1]); return { t: m ? m[2] : c[1], ico: m ? m[1] : '📝', guia: c[2], unico: true, campos: [F(c[0], 'Tu respuesta', '', 6, 'Escribe aquí…')] }; })));
  };
  const sugDe = (tipo, it, paso, P) => (tipo === 'e' ? ((it.format && it.format !== 'oia' && SUGC[P.campos[0].id]) || SUG_E[paso] || []) : ((it.formato && it.formato !== 'completa' && SUGP[P.campos[0].id]) || SUG_P[paso] || []));
  const fmtCards = (sel, todos) => {
    const orden = RECOM.concat(FORMATOS.map((f) => f[0]).filter((x) => RECOM.indexOf(x) < 0)), ver = orden.filter((x) => todos || RECOM.indexOf(x) >= 0 || x === sel);
    return ver.map((id) => { const f = FMT(id), on = id === sel; return '<button type="button" class="pp-fmt' + (on ? ' on' : '') + '" data-f="' + id + '" aria-pressed="' + on + '"><span class="pp-fi" aria-hidden="true">' + f[1] + '</span><span class="pp-ft"><b>' + esc(f[2]) + '</b><small>' + esc(f[3]) + ' · ' + esc(f[4]) + '</small></span>' + (on ? '<em>Elegido</em>' : '') + '</button>'; }).join('');
  };
  const nuevoE = () => ({ id: uid('study'), format: 'oia', passage: '', topic: '', author: '', date: '', status: 'borrador', series: '', observeKeywords: '', observeActions: '', observeCharacters: '', observeContext: '', interpretHistory: '', interpretCulture: '', interpretTheology: '', applyAnswers: '', wordStudyNotes: '', updated: Date.now() });
  const nuevaP = (pre) => Object.assign({ id: uid('sermon'), formato: 'completa', title: '', baseText: '', centralTruth: '', intro: '', point1: '', point2: '', point3: '', illustrations: '', conclusion: '', call: '', status: 'borrador', series: '', updated: Date.now() }, pre || {});
  // Puente estudio → prédica (la aplicación del estudio pasa a ser el llamado).
  const predicaDesdeEstudio = (e) => (e.format === 'bosquejo'
    ? nuevaP({ baseText: e.passage || '', title: e.topic || '', centralTruth: e.interpretTheology || '', point1: e.observeKeywords || '', point2: e.observeActions || '', point3: e.observeCharacters || '', illustrations: e.observeContext || '', call: e.applyAnswers || '', studyId: e.id })
    : nuevaP({ baseText: e.passage || '', title: e.topic || '', call: e.applyAnswers || '', intro: e.format === 'express' || e.format === 'mapa' ? '' : (e.observeContext || ''), centralTruth: e.format === 'express' || e.format === 'mapa' ? (e.interpretTheology || '') : '', studyId: e.id }));
  const llenos = (it, pasos) => pasos.map((p) => p.campos.some((c) => c.id !== 'series' && String(it[c.id] || '').trim()));
  const tituloDe = (it, tipo) => (tipo === 'e' ? (it.topic || it.passage) : (it.title || it.baseText)) || 'Sin título';
  const textoCompartir = (it, tipo) => {
    const pasos = pasosDe(tipo, it), out = [tituloDe(it, tipo)], vistos = {};
    pasos.forEach((p) => p.campos.forEach((c) => { vistos[c.id] = 1; const v = String(it[c.id] || '').trim(); if (v) out.push('\n' + (p.unico ? p.t : c.et).toUpperCase() + '\n' + v); }));
    (tipo === 'e' ? PASOS_E : PASOS_P).forEach((p) => p.campos.forEach((c) => { const v = String(it[c.id] || '').trim(); if (!vistos[c.id] && v) out.push('\n' + c.et.toUpperCase() + '\n' + v); }));
    return out.join('\n') + '\n\n— Hecho con Tierra Buena';
  };
  const vivos = (k) => lista(k).filter((x) => !x.borrado);
  const REP = [['intro', 'Introducción'], ['point1', 'Punto I'], ['point2', 'Punto II'], ['point3', 'Punto III'], ['conclusion', 'Conclusión'], ['call', 'Llamado']];
  const reparto = (it, total) => {
    const W = { intro: 1, point1: 2.2, point2: 2.2, point3: 2.2, conclusion: 0.5, call: 0.5 }, ks = Object.keys(W).filter((k) => String(it[k] || '').trim()), suma = ks.reduce((a, k) => a + W[k], 0), out = {};
    if (!suma || !(total > 0)) return out; ks.forEach((k) => { out[k] = Math.max(1, Math.round(total * W[k] / suma)); }); return out;
  };
  const tiempoHTML = (it) => { const m = it.minutos || 0, r = m ? reparto(it, m) : {}; return '<section class="pp-tiempo"><h3>⏱️ Tiempo del mensaje</h3><p class="suave">¿Cuánto tiempo tienes para predicar?</p><div class="pp-chips">' + [5, 10, 15, 20, 30, 40, 45, 60].map((x) => '<button type="button" class="chip pp-min' + (m === x ? ' on' : '') + '" data-m="' + x + '" aria-pressed="' + (m === x) + '">' + x + ' min</button>').join('') + '</div>' + (Object.keys(r).length ? '<ul class="pp-reparto">' + REP.filter((x) => r[x[0]]).map((x) => '<li><span>' + x[1] + '</span><b>≈ ' + r[x[0]] + ' min</b></li>').join('') + '</ul>' : (m ? '<p class="suave">Escribe la introducción y los puntos para ver el reparto.</p>' : '')) + '</section>'; };
  const tarjetas = (tipo) => vivos(tipo === 'e' ? K_E : K_P).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));


  // ---------- F1294 · Pasajes: «Juan 3:16-21» → texto de la Biblia de la app (sin internet si ya se leyó) ----------
  const ALIAS = { sal: 'PSA', salmo: 'PSA', jn: 'JHN', mt: 'MAT', mr: 'MRK', mc: 'MRK', lc: 'LUK', hch: 'ACT', hechos: 'ACT', ro: 'ROM', gn: 'GEN', ex: 'EXO', dt: 'DEU', pr: 'PRO', is: 'ISA', jer: 'JER', ap: 'REV', stg: 'JAS', fil: 'PHP', flp: 'PHP', heb: 'HEB', cant: 'SNG', cantares: 'SNG', eclesiastes: 'ECC', ef: 'EPH', col: 'COL', gal: 'GAL', tit: 'TIT', jud: 'JUD' };
  const norm = (t) => sinAcento(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function parseRef(txt) {
    const b = App().biblia; if (!b) return null;
    const s = norm(String(txt || '').replace(/[-–—]/g, ' ')).replace(/^(i{1,3}) /, (x, r) => r.length + ' ');
    const m = /^([123]? ?[a-z]+) (\d{1,3})(?: (\d{1,3})(?: (\d{1,3}))?)?$/.exec(s); if (!m) return null;
    const nom = m[1].replace(/\s/g, ''), libs = b.libros.map((l) => [l[0], norm(l[1]).replace(/\s/g, ''), l[1], l[2]]);
    let L = libs.find((l) => l[1] === nom) || libs.find((l) => ALIAS[nom] === l[0]);
    if (!L && nom.length >= 3) { const c = libs.filter((l) => l[1].indexOf(nom) === 0); if (c.length === 1) L = c[0]; }
    if (!L) return null;
    const cap = Number(m[2]); if (!(cap >= 1 && cap <= L[3])) return null;
    const v1 = m[3] ? Number(m[3]) : 0, v2 = m[4] ? Number(m[4]) : v1;
    return { cod: L[0], libro: L[2], cap, v1, v2: Math.max(v1, v2) };
  }
  const refTexto = (r, n) => r.libro + ' ' + r.cap + (r.v1 ? ':' + r.v1 + (r.v2 > r.v1 ? '-' + r.v2 : '') : '');
  async function traerPasaje(txt) {
    const r = parseRef(txt); if (!r) return { error: 'ref' };
    let lib; try { lib = await App().biblia.cargar(r.cod, App().biblia.ver()); } catch (e) { return { error: 'red', r, ref: refTexto(r) }; }
    const cap = lib && lib[r.cap - 1]; if (!cap) return { error: 'red', r, ref: refTexto(r) };
    const a = r.v1 || 1, z = Math.min(r.v1 ? r.v2 : cap.length, cap.length, a + 79), vs = [];
    for (let v = a; v <= z; v++) vs.push([v, String(cap[v - 1] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()]);
    return { r, ref: refTexto(r), vs };
  }
  const POPULARES = ['Juan 3:16-21', 'Salmo 23', 'Romanos 8:28-39', 'Filipenses 4:4-9', 'Mateo 5:1-12', '1 Corintios 13'];
  const campoRef = (tipo) => (tipo === 'e' ? 'passage' : 'baseText');
  const primerVacio = (it, pasos) => { const i = llenos(it, pasos).indexOf(false); return i < 0 ? 0 : i; };
  const ultimoLeido = () => { try { const u = App().leer('tb_movil_biblia_ultimo'), b = App().biblia; const L = u && b && b.libros.find((l) => l[0] === u.cod); return L ? L[1] + ' ' + Number(u.cap) : ''; } catch (e) { return ''; } };

  // ---------- Pantallas ----------
  const tamLetra = () => { try { const n = Number(localStorage.getItem('tb_pp_tam')); return n >= 0 && n <= 3 ? n : 1; } catch (e) { return 1; } };
  let envuelto = null;
  const pintar = (html, extra) => {
    const p = $('#pantalla'); if (!p) return; try { if (typeof detenerVoz === 'function') detenerVoz(); } catch (e) { /* nada */ }
    p.innerHTML = '<div class="pp pp-tam' + tamLetra() + (quieto() ? ' pp-quieto' : '') + (extra ? ' ' + extra : '') + '">' + html + '</div>';
    envuelto = p.firstChild; try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  };
  const cab = (atras, txt) => '<button type="button" class="volver" id="ppAtras">‹ ' + esc(txt || 'Palabra') + '</button>';
  const ADORNO = '<svg class="pp-adorno" viewBox="0 0 120 80" aria-hidden="true"><path d="M10 60 Q35 48 60 60 Q85 48 110 60 V70 Q85 58 60 70 Q35 58 10 70Z" class="pp-a1"/><path d="M60 60 V22" class="pp-a2"/><circle cx="60" cy="18" r="9" class="pp-a3"/><path d="M60 40 q-14-4-20-16 M60 34 q14-4 20-16" class="pp-a2"/></svg>';

  // F1303 · Desbloqueado para todos mientras no se activen los planes (el dueño avisará cuándo). Para volver a cerrarlo: poner PLANES_ACTIVOS = true.
  const PLANES_ACTIVOS = false;
  function abrir() { if (PLANES_ACTIVOS && !plus()) return vistaPlus(); vistaInicio(); }

  function vistaPlus() {
    pintar(cab() + '<section class="pp-hero pp-lock">' + ADORNO + '<h1>Estudio y Prédicas</h1><p>Prepara tus estudios bíblicos y tus mensajes desde el teléfono, paso a paso y sin perderte.</p></section>' +
      '<button type="button" class="btn" id="ppPlanes">Ver planes</button>');
    $('#ppAtras').onclick = () => App().ir('palabra');
    $('#ppPlanes').onclick = () => { vibra(); if (App().apoyar) App().apoyar(); };
  }

  function vistaInicio() {
    const na = window.TBApuntes ? window.TBApuntes.cuantos() : 0, ne = vivos(K_E).length, np = vivos(K_P).length, ni = ideasVivas().length, prox = vivos(K_P).filter((x) => x.preachDate && x.status !== 'predicada' && diasPara(x.preachDate) >= 0).sort((a, b) => (a.preachDate < b.preachDate ? -1 : 1))[0];
    const rec = vivos(K_E).map((x) => ['e', x]).concat(vivos(K_P).map((x) => ['p', x])).sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0))[0];
    const proxHTML = prox ? (() => { const n = llenos(prox, pasosDe('p', prox)).filter(Boolean).length, t = pasosDe('p', prox).length; return '<button type="button" class="pp-prox" id="ppProx"><small>Próxima prédica · ' + cuando(prox.preachDate) + '</small><b>' + esc(tituloDe(prox, 'p')) + '</b><span>📅 ' + esc(fechaBonita(prox.preachDate)) + ' · ' + n + ' de ' + t + ' pasos listos</span></button>'; })() : '';
    const cont = rec && !(prox && rec[1].id === prox.id) ? (() => { const pasos = rec[0] === 'e' ? PASOS_E : PASOS_P, n = llenos(rec[1], pasos).filter(Boolean).length; return '<button type="button" class="pp-cont" id="ppCont"><small>Continuar donde quedaste</small><b>' + esc(tituloDe(rec[1], rec[0])) + '</b><span>' + (rec[0] === 'e' ? '📖 Estudio' : '🎙️ Prédica') + ' · ' + n + ' de ' + pasos.length + ' pasos</span><i class="pp-barra" data-w="' + Math.round(n / pasos.length * 100) + '"></i></button>'; })() : '';
    pintar(cab() + '<section class="pp-hero">' + ADORNO + '<h1>Estudio y Prédicas</h1><p>Prepara con calma. Todo se guarda solo.</p></section>' + '<button type="button" class="pp-cta" id="ppApun"><span aria-hidden="true">🎧</span><span><b>Tomar apuntes de una prédica</b><small>Escribe, dicta o graba lo que escuchas</small></span></button>' + proxHTML + cont +
      '<h2 class="pp-sub">Lo que ya tienes</h2>' +
      '<button type="button" class="pp-gran pp-g1" data-t="e"><span class="pp-gi" aria-hidden="true">📖</span><b>Mis estudios</b><small>' + (ne ? ne + (ne === 1 ? ' estudio' : ' estudios') : 'Aún no tienes ninguno') + '</small></button>' +
      '<button type="button" class="pp-gran pp-g2" data-t="p"><span class="pp-gi" aria-hidden="true">🎙️</span><b>Mis prédicas</b><small>' + (np ? np + (np === 1 ? ' prédica' : ' prédicas') : 'Aún no tienes ninguna') + '</small></button>' +
      (ni ? '<button type="button" class="pp-gran pp-g1" data-t="i"><span class="pp-gi" aria-hidden="true">💡</span><b>Mis ideas</b><small>' + ni + (ni === 1 ? ' idea anotada' : ' ideas anotadas') + '</small></button>' : '') + '<button type="button" class="pp-gran pp-g4" data-t="a"><span class="pp-gi" aria-hidden="true">🎧</span><b>Mis apuntes de prédicas</b><small>' + (na ? na + (na === 1 ? ' apunte' : ' apuntes') : 'De tu iglesia, de un evento o de internet') + '</small></button>' + '<button type="button" class="pp-gran pp-g3" data-t="b"><span class="pp-gi" aria-hidden="true">📚</span><b>Biblioteca de apoyo</b><small>Diccionario, personajes, ilustraciones, prédicas de ejemplo y más</small></button><div class="pp-acc" role="toolbar" aria-label="Crear"><button type="button" class="pp-nuevo pp-g1" data-n="e"><span aria-hidden="true">📖</span><b>Nuevo estudio</b></button><button type="button" class="pp-nuevo pp-g2" data-n="p"><span aria-hidden="true">🎙️</span><b>Nueva prédica</b></button><button type="button" class="pp-nuevo pp-ga" id="ppApunB" aria-label="Tomar apuntes de una prédica"><span aria-hidden="true">🎧</span><b>Apuntes</b></button><button type="button" class="pp-nuevo pp-gi2" id="ppIdea" aria-label="Anota una idea al vuelo"><span aria-hidden="true">💡</span><b>Idea</b></button></div>');
    $('#ppAtras').textContent = '‹ Palabra'; $('#ppAtras').onclick = () => App().ir('palabra');
    const br = document.querySelector('.pp-cont .pp-barra'); if (br) br.style.setProperty('--w', br.dataset.w + '%');
    const abrirAp = () => { vibra(); if (window.TBApuntes) window.TBApuntes.abrir(); };
    const bap = $('#ppApun'), bap2 = $('#ppApunB'); if (bap) bap.onclick = abrirAp; if (bap2) bap2.onclick = abrirAp;
    const bi0 = $('#ppIdea'); if (bi0) bi0.onclick = () => { vibra(); hojaIdea('', vistaInicio); };
    const px = $('#ppProx'); if (px) px.onclick = () => { vibra(); const ps = pasosDe('p', prox), i = llenos(prox, ps).indexOf(false); if (i < 0) vistaListo('p', prox); else vistaEditor('p', prox, i); };
    const ct = $('#ppCont'); if (ct) ct.onclick = () => { vibra(); const pasos = rec[0] === 'e' ? PASOS_E : PASOS_P, i = primerVacio(rec[1], pasos); vistaEditor(rec[0], rec[1], i); };
    document.querySelectorAll('.pp-nuevo').forEach((b) => { b.onclick = () => { vibra(); vistaEmpezar(b.dataset.n); }; });
    document.querySelectorAll('.pp-gran').forEach((b) => { b.onclick = () => { vibra(); if (b.dataset.t === 'a') { if (window.TBApuntes) window.TBApuntes.abrir(); } else if (b.dataset.t === 'b') vistaBiblioteca(null); else if (b.dataset.t === 'i') vistaIdeas(); else vistaLista(b.dataset.t); }; });
  }

  // ---------- Empezar: una sola pregunta («¿con qué texto?») y se arma todo ----------
  function vistaEmpezar(tipo) {
    const esE = tipo === 'e', ult = ultimoLeido(), sug = (ult ? [ult] : []).concat(POPULARES).slice(0, 6), ests = !esE ? vivos(K_E).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 4) : [];
    pintar(cab() + '<p class="pp-paso">Paso 1</p><h1 class="pp-h">' + (esE ? 'Nuevo estudio' : 'Nueva prédica') + '</h1><p class="pp-guia">¿Con qué texto de la Biblia quieres empezar? Escríbelo y lo traemos para que lo leas mientras preparas.</p>' +
      '<div class="pp-campo"><label for="ppRef">Pasaje</label><input type="text" id="ppRef" maxlength="80" placeholder="Ej.: Juan 3:16-21" autocomplete="off" autocapitalize="words"></div>' +
      '<div id="ppVista" class="pp-vista" aria-live="polite"><p class="suave">Escribe el libro, el capítulo y, si quieres, los versículos.</p></div>' +
      (esE ? '<h2 class="pp-sub">¿Cómo quieres estudiar?</h2><div id="ppFmts" class="pp-fmts"></div><button type="button" class="pp-borrar" id="ppMasF">Ver los ' + FORMATOS.length + ' formatos</button>' : '<h2 class="pp-sub">¿Qué tan larga?</h2><div id="ppFmts" class="pp-fmts"></div>') + '<div class="pp-chips" aria-label="Sugerencias">' + sug.map((x) => '<button type="button" class="chip pp-sug" data-v="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
      '<button type="button" class="btn" id="ppGo">Empezar</button>' +
      '<button type="button" class="btn sec" id="ppBlanco">' + (esE ? 'Empezar sin pasaje (con un tema)' : 'Empezar en blanco') + '</button>' +
      (!esE ? '<h2 class="pp-sub">O parte de algo que ya tienes</h2>' + (ests.length ? ests.map((e) => '<button type="button" class="pp-item pp-deest" data-id="' + esc(e.id) + '"><b>' + esc(tituloDe(e, 'e')) + '</b><small>Usar este estudio como base</small></button>').join('') : '') + '<button type="button" class="pp-item pp-deej"><b>Una prédica de ejemplo</b><small>Elige un esquema listo y adáptalo</small></button>' : ''));
    $('#ppAtras').textContent = '‹ Estudio y Prédicas'; $('#ppAtras').onclick = vistaInicio;
    const inp = $('#ppRef'); let t = 0, ultimo = null, seq = 0;
    const ver = async () => {
      const v = inp.value.trim(), box = $('#ppVista'), my = ++seq; if (!box) return;
      if (!v) { ultimo = null; box.innerHTML = '<p class="suave">Escribe el libro, el capítulo y, si quieres, los versículos.</p>'; return; }
      box.innerHTML = '<p class="suave">Buscando…</p>'; const r = await traerPasaje(v); if (my !== seq || !$('#ppVista')) return; ultimo = r.error === 'ref' ? null : r;
      if (r.error === 'ref') box.innerHTML = '<p class="suave">Aún no reconozco ese pasaje. Prueba así: «Salmo 23» o «Juan 3:16».</p>';
      else if (r.error) box.innerHTML = '<p class="pp-ok-l">✓ ' + esc(r.ref) + '</p><p class="suave">No pude traer el texto ahora (sin internet). Igual puedes empezar.</p>';
      else box.innerHTML = '<p class="pp-ok-l">✓ ' + esc(r.ref) + ' · ' + r.vs.length + (r.vs.length === 1 ? ' versículo' : ' versículos') + '</p><p class="pp-prev">' + esc(r.vs.slice(0, 2).map((x) => x[1]).join(' ')).slice(0, 220) + '…</p>';
    };
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(ver, 350); });
    document.querySelectorAll('.pp-sug').forEach((b) => { b.onclick = () => { inp.value = b.dataset.v; ver(); }; });
    let fmt = esE ? 'oia' : 'completa', todosF = false; const pf = () => { const c = $('#ppFmts'); if (!c) return; c.innerHTML = esE ? fmtCards(fmt, todosF) : largoCards(fmt); c.querySelectorAll('.pp-fmt').forEach((b) => { b.onclick = () => { vibra(); fmt = b.dataset.f; pf(); }; }); const m = $('#ppMasF'); if (m) m.hidden = todosF; };
    pf(); if (esE) $('#ppMasF').onclick = () => { todosF = true; pf(); };
    const crear = (ref) => { const it = esE ? nuevoE() : nuevaP(); if (esE) it.format = fmt; else it.formato = fmt; it[campoRef(tipo)] = ref; guardarItem(tipo, it); vistaEditor(tipo, it, ref && esE ? 1 : 0, !ref); };
    $('#ppGo').onclick = () => { vibra(); const v = inp.value.trim(); if (!v) { inp.focus(); $('#ppVista').innerHTML = '<p class="suave">Escribe un pasaje, o toca «' + (esE ? 'Empezar sin pasaje' : 'Empezar en blanco') + '».</p>'; return; } crear(ultimo && ultimo.ref ? ultimo.ref : v); };
    $('#ppBlanco').onclick = () => { vibra(); crear(''); };
    document.querySelectorAll('.pp-deest').forEach((b) => { b.onclick = () => { vibra(); const e = vivos(K_E).find((x) => x.id === b.dataset.id); if (!e) return; const pr = predicaDesdeEstudio(e); guardarItem('p', pr); vistaEditor('p', pr, 0, false); }; });
    const ej = document.querySelector('.pp-deej'); if (ej) ej.onclick = async () => { vibra(); try { const ix = indice || (indice = await traer('datos/apoyo_indice.json')); vistaCategoria(ix.find((k) => k.id === 'ej'), null, ''); } catch (e) { vistaBiblioteca(null); } };
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
    $('#ppNuevo').onclick = () => { vibra(); vistaEmpezar(tipo); };
    const pap = $('#ppPap'); if (pap) pap.onclick = () => vistaPapelera(tipo);
    const pintarLista = () => {
      const r = $('#ppLista'); if (!r) return; const q = sinAcento(flt.q.trim()), todos = tarjetas(tipo);
      const its = todos.filter((it) => (!flt.est || it.status === flt.est) && (!flt.serie || String(it.series || '') === flt.serie) && (!q || sinAcento(tituloDe(it, tipo) + ' ' + textoTodo(it, pasos)).indexOf(q) >= 0));
      if (!its.length) { r.innerHTML = todos.length ? '<div class="pp-vacio"><p>No hay resultados con ese filtro.</p><p class="suave">Prueba con «Todos» o una palabra más corta.</p></div>' : '<div class="pp-vacio"><p>Aún no tienes ' + (tipo === 'e' ? 'estudios' : 'prédicas') + '.</p><p class="suave">Toca el botón verde para empezar. Puedes parar y seguir cuando quieras.</p></div>'; return; }
      r.innerHTML = its.map((it, i) => { const ps = pasosDe(tipo, it), ll = llenos(it, ps), n = ll.filter(Boolean).length;
        return '<button type="button" class="pp-item" data-id="' + esc(it.id) + '" data-i="' + i + '"><span class="pp-st pp-st-' + esc(it.status || 'borrador') + '">' + esc(EST[it.status] || 'Borrador') + '</span><b>' + esc(tituloDe(it, tipo)) + '</b><small>' + n + ' de ' + ps.length + ' pasos' + (tipo === 'e' && it.format && it.format !== 'oia' ? ' · ' + FMT(it.format)[1] + ' ' + esc(FMT(it.format)[2]) : '') + (tipo === 'p' && it.formato && it.formato !== 'completa' ? ' · ' + largoDe(it)[1] + ' ' + esc(largoDe(it)[2]) : '') + (tipo === 'p' && it.preachDate ? ' · 📅 ' + esc(fechaBonita(it.preachDate)) : '') + (it.series ? ' · Serie: ' + esc(it.series) : '') + '</small><i class="pp-barra" data-w="' + Math.round(n / ps.length * 100) + '"></i></button>'; }).join('');
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

  let textoAbierto = false, itAnt = '', pasoAnt = -1;
  function vistaEditor(tipo, it, paso, nuevo) {
    const pasos = pasosDe(tipo, it), total = pasos.length + 1;   // el último paso es «Listo»
    if (paso >= pasos.length) return vistaListo(tipo, it);
    const P = pasos[paso], ll = llenos(it, pasos);
    const dir = itAnt === it.id && pasoAnt >= 0 ? (paso > pasoAnt ? 'pp-d-der' : paso < pasoAnt ? 'pp-d-izq' : '') : ''; itAnt = it.id; pasoAnt = paso;
    if (tomarVersion(it, 'Al abrir', 1800000)) guardarItem(tipo, it);
    pintar(cab() + '<div class="pp-prog" role="group" aria-label="Pasos">' + pasos.map((p, i) => '<button type="button" class="pp-dot' + (i === paso ? ' on' : '') + (ll[i] ? ' ok' : '') + '" data-i="' + i + '" aria-label="Paso ' + (i + 1) + ': ' + esc(p.t) + (ll[i] ? ' (listo)' : '') + '"' + (i === paso ? ' aria-current="step"' : '') + '>' + (ll[i] && i !== paso ? '✓' : (i + 1)) + (i === paso ? '<span class="pp-dn">' + esc(p.t) + '</span>' : '') + '</button>').join('') + '<span class="pp-dot fin" aria-hidden="true"></span></div>' +
      (paso === 0 ? '<button type="button" class="pp-fmtcambia" id="ppFmt">' + (tipo === 'e' ? FMT(it.format)[1] + ' Formato: <b>' + esc(FMT(it.format)[2]) : largoDe(it)[1] + ' Largo: <b>' + esc(largoDe(it)[2])) + '</b> · Cambiar</button>' : '') + '<p class="pp-paso">Paso ' + (paso + 1) + ' de ' + total + '</p><h1 class="pp-h"><span aria-hidden="true">' + P.ico + '</span> ' + esc(P.t) + '</h1><p class="pp-guia">' + esc(P.guia) + '</p>' +
      P.campos.map((c) => '<div class="pp-campo"><div class="pp-fila-et"><label for="pp_' + c.id + '">' + esc(c.et) + '</label>' + micHTML(c.id) + '</div>' + (c.ayuda ? '<small class="suave">' + esc(c.ayuda) + '</small>' : '') +
        (c.filas === 1 ? '<input type="text" id="pp_' + c.id + '" data-c="' + c.id + '" maxlength="200" placeholder="' + esc(c.ph) + '" value="' + esc(it[c.id]) + '">' : '<textarea id="pp_' + c.id + '" data-c="' + c.id + '" rows="' + c.filas + '" maxlength="6000" placeholder="' + esc(c.ph || 'Escribe aquí…') + '">' + esc(it[c.id]) + '</textarea>') + (c.id === 'series' ? serChips(tipo) : '') + (c.id === 'title' ? '<button type="button" class="pp-sugt" id="ppSugT">✨ Sugerir un título</button><div class="pp-chips" id="ppSugTc"></div>' : '') + '</div>').join('') +
      (paso > 0 && String(it[campoRef(tipo)] || '').trim() ? '<details class="pp-texto" id="ppTexto"' + (textoAbierto ? ' open' : '') + '><summary>📖 <b>' + esc(it[campoRef(tipo)]) + '</b> · ver el texto</summary><div id="ppTxtCuerpo" class="pp-txtc"><p class="suave">Cargando…</p></div></details>' : '') + '<div class="pp-herr" role="toolbar" aria-label="Herramientas">' + (paso > 0 && String(it[campoRef(tipo)] || '').trim() ? '<button type="button" id="ppHTexto"><i aria-hidden="true">📖</i><span>Texto</span></button>' : '') + '<button type="button" id="ppMat"><i aria-hidden="true">🧰</i><span>Material</span></button>' + (tipo === 'p' && vivos(K_E).length ? '<button type="button" id="ppEstB"><i aria-hidden="true">📖</i><span>Estudios</span></button>' : '') + '<button type="button" id="ppApoyo"><i aria-hidden="true">📚</i><span>Apoyo</span></button><button type="button" id="ppIdeaB"><i aria-hidden="true">💡</i><span>Idea</span></button><button type="button" id="ppVer"><i aria-hidden="true">🕘</i><span>Versiones</span></button>' + '<button type="button" id="ppHTam"><i aria-hidden="true">Aa</i><span>Letra</span></button>' + (SR ? '<button type="button" id="ppHVoz"><i aria-hidden="true">🎤</i><span>Dictar</span></button>' : '') + '</div><p class="pp-guardado" id="ppGuardado" aria-live="polite">Se guarda solo</p><p class="pp-conteo" id="ppConteo"></p>' +
      '<div class="pp-navw">' + (SR ? '<button type="button" class="pp-fab" id="ppFab" aria-label="Dictar con la voz" aria-pressed="false">🎤</button>' : '') + '<div class="pp-atajos" id="ppAtajos" hidden role="toolbar" aria-label="Atajos de escritura"><button type="button" data-a="com">« »</button><button type="button" data-a="cita">( cita )</button><button type="button" data-a="lista">• Lista</button><button type="button" data-a="par">¶ Párrafo</button></div><div class="pp-nav">' + (paso > 0 ? '<button type="button" class="btn sec" id="ppPrev">‹ Atrás</button>' : '') + '<button type="button" class="btn" id="ppNext">' + (paso === pasos.length - 1 ? 'Terminar' : 'Siguiente: ' + esc(pasos[paso + 1].t) + ' ›') + '</button></div></div>', dir);
    $('#ppAtras').textContent = '‹ ' + (tipo === 'e' ? 'Mis estudios' : 'Mis prédicas');
    $('#ppAtras').onclick = () => { guardarItem(tipo, it); vistaLista(tipo, false); };
    let t = 0; const g = $('#ppGuardado');
    const guardarYa = () => { clearTimeout(t); if (it.status === 'borrador' && pasos.some((p) => p.campos.some((c) => c.id !== 'series' && String(it[c.id] || '').trim()))) it.status = 'en_progreso'; const ok = guardarItem(tipo, it); if (g) g.textContent = ok === false ? 'No se pudo guardar: libera espacio en el teléfono' : 'Guardado ✓'; };
    document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('input', () => { it[el.dataset.c] = el.value; if (g) g.textContent = 'Escribiendo…'; clearTimeout(t); t = setTimeout(guardarYa, 450); }));
    document.querySelectorAll('.pp-dot[data-i]').forEach((d) => { d.onclick = () => { guardarYa(); vistaEditor(tipo, it, Number(d.dataset.i)); }; });
    document.querySelectorAll('.pp-sugser').forEach((b) => { b.onclick = () => { const el = $('#pp_series'); if (el) { el.value = b.dataset.v; el.dispatchEvent(new Event('input', { bubbles: true })); } }; });
    let campo = P.campos[0].id; document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('focus', () => { campo = el.dataset.c; }));
    const det = $('#ppTexto');
    if (det) {
      const cargar = async () => {
        const cu = $('#ppTxtCuerpo'); if (!cu || cu.dataset.ok) return; const r = await traerPasaje(it[campoRef(tipo)]); const c2 = $('#ppTxtCuerpo'); if (!c2) return;
        if (r.error === 'ref') { c2.innerHTML = '<p class="suave">No reconozco el pasaje «' + esc(it[campoRef(tipo)]) + '». Escríbelo como «Juan 3:16-21» en el primer paso.</p>'; return; }
        if (r.error) { c2.innerHTML = '<p class="suave">No pude traer el texto ahora. Los capítulos que ya leíste se abren sin internet.</p>'; return; }
        c2.dataset.ok = '1'; c2.innerHTML = '<p class="suave">Toca los versículos que quieras (puedes elegir varios) y luego «Insertar».</p>' + r.vs.map((x) => '<button type="button" class="pp-v" data-v="' + x[0] + '"><sup>' + x[0] + '</sup> ' + esc(x[1]) + '</button>').join('') + '<button type="button" class="btn pp-vins" id="ppVIns" hidden>Insertar</button>';
        const sel = new Set(), bi = c2.querySelector('#ppVIns'), act = () => { bi.hidden = !sel.size; bi.textContent = 'Insertar ' + sel.size + (sel.size === 1 ? ' versículo' : ' versículos'); };
        c2.querySelectorAll('.pp-v').forEach((b) => { b.onclick = () => { vibra(); const n = Number(b.dataset.v); if (sel.has(n)) sel.delete(n); else sel.add(n); b.classList.toggle('sel', sel.has(n)); b.setAttribute('aria-pressed', String(sel.has(n))); act(); }; });
        bi.onclick = () => { const el = document.getElementById('pp_' + campo) || $('[data-c]'); if (!el || !sel.size) return; const ns = Array.from(sel).sort((a, b) => a - b), seguidos = ns.every((n, k) => k === 0 || n === ns[k - 1] + 1), cita = r.r.libro + ' ' + r.r.cap + ':' + (seguidos && ns.length > 1 ? ns[0] + '-' + ns[ns.length - 1] : ns.join(',')), una = el.tagName === 'INPUT', add = una ? cita : '«' + ns.map((n) => (r.vs.find((y) => y[0] === n) || [0, ''])[1]).join(' ') + '» (' + cita + ')'; el.value = (el.value.trim() ? el.value.trim() + (una ? '; ' : '\n\n') : '') + add; el.dispatchEvent(new Event('input', { bubbles: true })); c2.querySelectorAll('.pp-v.sel').forEach((x) => { x.classList.remove('sel'); x.classList.add('puesto'); x.setAttribute('aria-pressed', 'false'); }); sel.clear(); act(); };
      };
      det.addEventListener('toggle', () => { textoAbierto = det.open; if (det.open) cargar(); }); if (det.open) cargar();
    }
    const fb = $('#ppFmt'); if (fb) fb.onclick = () => { guardarYa(); if (tipo === 'e') vistaFormato(it); else vistaLargo(it); };
    document.querySelectorAll('[data-mic]').forEach((b) => { b.onclick = () => { vibra(); const el = document.getElementById('pp_' + b.dataset.mic); if (el) dictar(b, el, (m) => { if (g) g.textContent = m; }); }; });
    const stb = $('#ppSugT'); if (stb) stb.onclick = () => { vibra(); const c = $('#ppSugTc'), o = titulosSug(it); if (!c) return; if (!o.length) { c.innerHTML = '<p class="suave">Escribe primero la idea principal o el texto base y te propongo títulos.</p>'; return; } c.innerHTML = o.map((x, i) => '<button type="button" class="chip pp-sug" data-ti="' + i + '">' + esc(x) + '</button>').join(''); c.querySelectorAll('[data-ti]').forEach((b) => { b.onclick = () => { vibra(); const el = $('#pp_title'); if (el) { el.value = o[Number(b.dataset.ti)]; el.dispatchEvent(new Event('input', { bubbles: true })); } c.innerHTML = ''; }; }); };
    const bver = $('#ppVer'); if (bver) bver.onclick = () => { guardarYa(); vistaVersiones(tipo, it, () => vistaEditor(tipo, it, paso)); };
    const crece = (el) => { if (el.tagName !== 'TEXTAREA') return; try { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight + 4, Math.round(window.innerHeight * 0.6)) + 'px'; } catch (e) { /* nada */ } };
    const conteo = () => { const c = $('#ppConteo'); if (!c) return; const todo = nPal(Object.keys(snapDe(it)).map((k) => it[k]).join(' ')), esteP = nPal(P.campos.map((q) => it[q.id]).join(' ')); c.textContent = 'Este paso: ' + esteP + ' palabras · Todo: ' + todo + (tipo === 'p' && todo ? ' · ≈ ' + Math.max(1, Math.round(todo / 130)) + ' min hablando' : ''); };
    document.querySelectorAll('textarea[data-c]').forEach((el) => { crece(el); el.addEventListener('input', () => crece(el)); }); conteo();
    document.querySelectorAll('[data-c]').forEach((el) => el.addEventListener('input', conteo));
    const at = $('#ppAtajos'); let tAt = 0;
    const ponAt = () => { clearTimeout(tAt); if (at) at.hidden = false; };
    const quitaAt = () => { clearTimeout(tAt); tAt = setTimeout(() => { const a = document.activeElement; if (at && !(a && a.matches && a.matches('[data-c]'))) at.hidden = true; }, 220); };
    document.querySelectorAll('[data-c]').forEach((el) => { el.addEventListener('focus', ponAt); el.addEventListener('blur', quitaAt); });
    document.querySelectorAll('#ppAtajos [data-a]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.onclick = () => { vibra(); const el = document.getElementById('pp_' + campo); if (!el) return; const una = el.tagName === 'INPUT', ref = String(it[campoRef(tipo)] || '').trim(), a = b.dataset.a;
        const txt = a === 'com' ? '«»' : a === 'cita' ? '(' + (ref || 'cita') + ')' : una ? '' : (a === 'lista' ? '\n• ' : '\n\n'), atras = a === 'com' ? 1 : 0; if (!txt) return;
        const s0 = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length, e0 = typeof el.selectionEnd === 'number' ? el.selectionEnd : s0;
        el.value = el.value.slice(0, s0) + txt + el.value.slice(e0); const pos = s0 + txt.length - atras; try { el.focus(); el.setSelectionRange(pos, pos); } catch (e) { /* nada */ } el.dispatchEvent(new Event('input', { bubbles: true })); };
    });
    const hA = $('#ppHTam'); if (hA) hA.onclick = () => { vibra(); const n = (tamLetra() + 1) % 4; try { localStorage.setItem('tb_pp_tam', String(n)); } catch (e) { /* nada */ } const w = document.querySelector('.pp'); if (w) { w.className = w.className.replace(/pp-tam\d/, 'pp-tam' + n); } document.querySelectorAll('textarea[data-c]').forEach(crece); if (g) g.textContent = 'Letra: ' + ['pequeña', 'normal', 'grande', 'muy grande'][n]; };
    const hT = $('#ppHTexto'); if (hT) hT.onclick = () => { vibra(); const d = $('#ppTexto'); if (d) { d.open = true; try { d.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' }); } catch (e) { /* nada */ } } };
    const fab = $('#ppFab'); if (fab) fab.onclick = () => { vibra(); const el = document.getElementById('pp_' + campo); if (el) dictar(fab, el, (m) => { if (g) g.textContent = m; }); };
    const ad = document.querySelector('.pp-dot.on'), pg = document.querySelector('.pp-prog'); if (ad && pg) pg.scrollLeft = Math.max(0, ad.offsetLeft - pg.clientWidth / 2 + ad.offsetWidth / 2);
    const hV = $('#ppHVoz'); if (hV) hV.onclick = () => { vibra(); const el = document.getElementById('pp_' + campo); if (el) dictar(hV, el, (m) => { if (g) g.textContent = m; }); };
    $('#ppIdeaB').onclick = () => { guardarYa(); hojaIdea(tituloDe(it, tipo), () => { if (g) g.textContent = 'Idea guardada ✓'; }); };
    const bMat = $('#ppMat'); if (bMat) bMat.onclick = () => {
      vibra(); guardarYa(); if (!window.TBMaterial) return;
      const cp = () => P.campos.find((c) => c.id === campo) || P.campos[0], nombre = () => (P.unico ? P.t : cp().et);
      window.TBMaterial.abrir({ pasaje: it[campoRef(tipo)], etiqueta: nombre, poner: (txt) => { const el = document.getElementById('pp_' + campo) || $('[data-c]'); if (!el) return null; el.value = (el.value.trim() ? el.value.trim() + (el.tagName === 'INPUT' ? '; ' : '\n\n') : '') + txt; el.dispatchEvent(new Event('input', { bubbles: true })); return nombre(); } });
    };
    const bEst = $('#ppEstB'); if (bEst) bEst.onclick = () => { vibra(); guardarYa(); hojaEstudios(() => campo, g); };
    $('#ppApoyo').onclick = () => { vibra(); guardarYa(); vistaBiblioteca({ tipo, it, paso, get campo() { return campo; }, sug: sugDe(tipo, it, paso, P) }); };
    $('#ppNext').onclick = () => { vibra(); guardarYa(); vistaEditor(tipo, it, paso + 1); };
    const pv = $('#ppPrev'); if (pv) pv.onclick = () => { guardarYa(); vistaEditor(tipo, it, paso - 1); };
    if (nuevo && paso === 0) { const f = $('[data-c]'); if (f && !quieto()) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 250); }
  }

  // ---------- F1298 · Versiones anteriores, revisar y sugerir, dictado por voz ----------
  const META = new Set(['id', 'format', 'formato', 'status', 'updated', 'versions', 'borrado', 'preachDate', 'minutos', 'targetMinutes', 'studyId', 'author', 'date']);
  const snapDe = (it) => { const o = {}; Object.keys(it).forEach((k) => { if (!META.has(k) && typeof it[k] === 'string' && it[k].trim()) o[k] = it[k]; }); return o; };
  const nPal = (s) => (String(s || '').trim().match(/\S+/g) || []).length;
  function tomarVersion(it, motivo, minGap) {
    const s = snapDe(it); if (!Object.keys(s).length) return false;
    const v = it.versions = Array.isArray(it.versions) ? it.versions : [], u = v[v.length - 1];
    if (u && JSON.stringify(u.s) === JSON.stringify(s)) return false;
    if (u && minGap && Date.now() - u.t < minGap) return false;
    v.push({ t: Date.now(), s, m: motivo || '' }); while (v.length > 6) v.shift(); return true;
  }
  const ETQ = (() => { const m = {}; PASOS_E.concat(PASOS_P).forEach((p) => p.campos.forEach((c) => { m[c.id] = c.et; })); FORMATOS.forEach((f) => (f[6] || []).forEach((c) => { m[c[0]] = String(c[1]).replace(/^[^\wÁ-ú]+/, ''); })); m.baseText = 'Texto base'; m.centralTruth = 'La idea principal'; return m; })();
  const cuandoVer = (t) => { const d = new Date(t), h = new Date(); const mismo = d.toDateString() === h.toDateString(); const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); return (mismo ? 'Hoy' : d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + hora; };
  function vistaVersiones(tipo, it, volver) {
    const v = (it.versions || []).slice().reverse();
    pintar(cab() + '<h1 class="pp-h">🕘 Versiones anteriores</h1><p class="pp-guia">Se guardan solas cuando abres tu texto. Elige una para ver qué tenía y, si quieres, volver a ella. Lo de ahora no se pierde: queda como otra versión.</p>' +
      (v.length ? v.map((x, i) => '<details class="pp-ver"><summary><b>' + esc(cuandoVer(x.t)) + '</b><small>' + esc(x.m || 'Guardada') + ' · ' + nPal(Object.keys(x.s).map((k) => x.s[k]).join(' ')) + ' palabras</small></summary>' +
        Object.keys(x.s).map((k) => '<p class="pp-ver-c"><i>' + esc(ETQ[k] || k) + '</i>' + esc(x.s[k].length > 220 ? x.s[k].slice(0, 220) + '…' : x.s[k]) + '</p>').join('') +
        '<button type="button" class="btn sec" data-rv="' + (v.length - 1 - i) + '">Volver a esta versión</button></details>').join('') : '<p class="suave">Todavía no hay versiones. Aparecen después de que escribas y vuelvas a abrir.</p>'));
    $('#ppAtras').textContent = '‹ Volver'; $('#ppAtras').onclick = volver;
    document.querySelectorAll('[data-rv]').forEach((b) => { b.onclick = () => { vibra(); const x = (it.versions || [])[Number(b.dataset.rv)]; if (!x) return; tomarVersion(it, 'Antes de volver atrás'); Object.keys(it).forEach((k) => { if (!META.has(k) && typeof it[k] === 'string') it[k] = ''; }); Object.keys(x.s).forEach((k) => { it[k] = x.s[k]; }); guardarItem(tipo, it); vistaEditor(tipo, it, 0); }; });
  }

  const PARADA = new Set('para como pero porque cuando donde este esta esto estos estas todo todos toda todas esta está tiene tienen sido ser son fue pueden puede hacer entre sobre desde hasta cada otra otro mucho muchos nuestro nuestra tambien también aunque mismo nada algo así'.split(' '));
  const clave = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zñ\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4 && !PARADA.has(w));
  const conVerso = (s) => /\d+\s*[:.]\s*\d+/.test(String(s || ''));
  const LLAMADOS = ['Esta semana te invito a…', 'Hoy, antes de irte, te pido que…', 'Mientras volvemos a casa, decide una cosa: …', 'Si hoy sientes esto, ven y oremos juntos.'];
  // Revisión local (sin IA ni internet): señales sencillas y concretas. ins = texto que se puede agregar con un toque.
  function revisar(tipo, it) {
    const r = [], ok = (t) => r.push({ ok: true, t }), mal = (t, d, ins) => r.push({ ok: false, t, d, ins });
    if (tipo === 'e') {
      const o = ['observeKeywords', 'observeActions', 'observeCharacters', 'observeContext', 'oKeywords'].some((k) => String(it[k] || '').trim()), i = ['interpretHistory', 'interpretCulture', 'interpretTheology'].some((k) => String(it[k] || '').trim()), a = String(it.applyAnswers || '').trim();
      if (!String(it.passage || '').trim()) mal('Falta el pasaje', 'Escribe el texto que estudias, por ejemplo «Juan 3:16-21».'); else ok('Tienes el pasaje.');
      if (o) ok('Observaste lo que el texto dice.'); else mal('Falta observar', 'Antes de explicar, anota qué dice: palabras repetidas, quiénes aparecen, qué se hace.');
      if (i) ok('Interpretaste el texto.'); else mal('Falta interpretar', 'Pregúntate qué quiso decir a quienes lo oyeron primero.');
      if (nPal(a) >= 6) ok('Tu aplicación es concreta.'); else mal('Hazla más concreta', 'Una acción con nombre y fecha: «Esta semana voy a…». Así se cumple.', { campo: 'applyAnswers', texto: 'Esta semana voy a…' });
      return r;
    }
    const f = it.formato || 'completa', pts = ['point1', 'point2', 'point3'].filter((k) => String(it[k] || '').trim()), idea = String(it.centralTruth || '').trim();
    if (!idea) mal('Falta la idea principal', 'Una sola frase con lo que quieres que se lleven. Todo lo demás la apoya.'); else if (nPal(idea) > 30) mal('La idea principal es larga', 'Tiene ' + nPal(idea) + ' palabras. Acórtala a una frase que se pueda repetir de memoria.'); else ok('La idea principal es una frase clara.');
    if (f === 'completa') {
      const n = nPal(it.intro); if (!n) mal('Falta la introducción', 'Una historia corta o una pregunta abre bien el mensaje.'); else if (n < 25) mal('Introducción muy breve', 'Tiene ' + n + ' palabras. Suma una historia o una pregunta que lleve al texto.'); else ok('Tienes una introducción.');
      if (pts.length < 2) mal('Pocos puntos', 'Un mensaje completo se entiende mejor con dos o tres puntos.'); else ok('Tienes ' + pts.length + ' puntos.');
      if (!String(it.illustrations || '').trim()) mal('Falta una ilustración', 'Una historia o ejemplo de la vida diaria ayuda a entender y a recordar.');
      else ok('Incluyes ilustraciones.');
    } else if (!pts.length) mal('Falta tu mensaje', 'Escribe la idea central con el versículo que la apoya.'); else ok('Tienes tu mensaje.');
    if (pts.length > 1) { const w = pts.map((k) => nPal(it[k])), mx = Math.max.apply(null, w), mn = Math.min.apply(null, w); if (mn && mx > mn * 2.5) mal('Puntos desparejos', 'Uno tiene ' + mx + ' palabras y otro ' + mn + '. Equilibrarlos hace más fácil seguirte.'); else ok('Tus puntos están parejos.'); }
    const sin = pts.filter((k) => !conVerso(it[k])).map((k) => 'Punto ' + (k.slice(-1)));
    if (pts.length) { if (sin.length) mal('Apoya con un versículo', sin.join(', ') + ' no cita ningún versículo (por ejemplo «Juan 3:16»).'); else ok('Cada punto cita un versículo.'); }
    if (!String(it.conclusion || '').trim() && f === 'completa') mal('Falta la conclusión', 'Vuelve a la idea principal para que se quede.', idea ? { campo: 'conclusion', texto: 'Recordemos: ' + idea } : null);
    else if (String(it.conclusion || '').trim() && idea) { const A = new Set(clave(idea)), c = clave(it.conclusion).filter((w) => A.has(w)).length; if (A.size && !c) mal('La conclusión no vuelve a la idea', 'Repite con otras palabras la idea principal para cerrar el círculo.'); else ok('La conclusión vuelve a la idea principal.'); }
    const ll = String(it.call || '').trim();
    if (!ll) mal('Falta el llamado', 'Pide algo concreto que puedan hacer hoy. Te dejo frases para empezar:', { campo: 'call', texto: LLAMADOS[0], varias: LLAMADOS }); else if (nPal(ll) < 8) mal('Haz el llamado más concreto', 'Di qué, cuándo y cómo. «Esta semana te invito a…» funciona bien.'); else ok('Tu llamado es concreto.');
    const cont = {}; clave([it.intro, it.point1, it.point2, it.point3, it.conclusion].join(' ')).forEach((w) => { cont[w] = (cont[w] || 0) + 1; });
    const top = Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0]; if (top && cont[top] >= 7) mal('Repites «' + top + '»', 'Aparece ' + cont[top] + ' veces. Si es tu palabra clave, está bien; si no, varía.');
    return r;
  }
  function vistaRevision(tipo, it) {
    const r = revisar(tipo, it), faltan = r.filter((x) => !x.ok), bien = r.filter((x) => x.ok);
    pintar(cab() + '<h1 class="pp-h">🔍 Revisar ' + (tipo === 'e' ? 'mi estudio' : 'mi prédica') + '</h1><p class="pp-guia">' + (faltan.length ? faltan.length + (faltan.length === 1 ? ' cosa puede mejorar' : ' cosas pueden mejorar') + '. Son ideas: tú decides.' : '¡Todo se ve bien! Solo falta que lo vivas.') + ' Revisa la estructura, no si es verdad ni bendecido: eso es tuyo y de Dios.</p>' +
      faltan.map((x, i) => '<article class="pp-rev"><b>💡 ' + esc(x.t) + '</b><p>' + esc(x.d) + '</p>' + (x.ins ? (x.ins.varias ? x.ins.varias.map((v, j) => '<button type="button" class="pp-apoyo" data-ins="' + i + '" data-j="' + j + '">' + esc(v) + '</button>').join('') : '<button type="button" class="pp-apoyo" data-ins="' + i + '">Agregar «' + esc(x.ins.texto.length > 46 ? x.ins.texto.slice(0, 46) + '…' : x.ins.texto) + '»</button>') : '') + '</article>').join('') +
      (bien.length ? '<h2 class="pp-sub">Va bien</h2><ul class="pp-bien">' + bien.map((x) => '<li>✓ ' + esc(x.t) + '</li>').join('') + '</ul>' : '') + '<button type="button" class="btn" id="ppRevVer">Seguir escribiendo</button>');
    $('#ppAtras').textContent = '‹ Volver'; $('#ppAtras').onclick = () => vistaListo(tipo, it);
    $('#ppRevVer').onclick = () => { vibra(); vistaEditor(tipo, it, 0); };
    document.querySelectorAll('[data-ins]').forEach((b) => { b.onclick = () => { vibra(); const x = faltan[Number(b.dataset.ins)]; if (!x || !x.ins) return; const t = x.ins.varias ? x.ins.varias[Number(b.dataset.j) || 0] : x.ins.texto; it[x.ins.campo] = (String(it[x.ins.campo] || '').trim() ? String(it[x.ins.campo]).trim() + '\n\n' : '') + t; guardarItem(tipo, it); vistaEditor(tipo, it, Math.max(0, pasosDe(tipo, it).findIndex((p) => p.campos.some((c) => c.id === x.ins.campo)))); }; });
  }

  // Dictado: usa el reconocimiento de voz del teléfono (Chrome/Android y Safari). Si no existe, no se muestra el botón.
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  let vozRec = null, vozBtn = null, vozOn = false;
  function detenerVoz() { vozOn = false; if (vozBtn) { vozBtn.classList.remove('on'); vozBtn.setAttribute('aria-pressed', 'false'); } try { if (vozRec) vozRec.stop(); } catch (e) { /* nada */ } vozRec = null; vozBtn = null; }
  const micHTML = (id) => SR ? '<button type="button" class="pp-mic" data-mic="' + esc(id) + '" aria-pressed="false" aria-label="Dictar con la voz">🎤 Dictar</button>' : '';
  function dictar(btn, el, aviso) {
    if (vozOn && vozBtn === btn) { detenerVoz(); aviso('Dictado detenido ✓'); return; }
    detenerVoz(); let rec; try { rec = new SR(); } catch (e) { aviso('Tu teléfono no permite dictar aquí.'); return; }
    rec.lang = 'es-CL'; rec.continuous = true; rec.interimResults = false; vozRec = rec; vozBtn = btn; vozOn = true; btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); aviso('🎤 Escuchando… habla con calma. Toca otra vez para parar.');
    rec.onresult = (e) => {
      let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + ' ';
      t = t.trim().replace(/\s+(nueva línea|nuevo párrafo|punto y aparte)\s*/gi, '\n').replace(/\s+(coma)\s+/gi, ', '); if (!t) return;
      const v = el.value, fin = !v.trim() || /[.!?\n]\s*$/.test(v), una = el.tagName === 'INPUT'; if (fin) t = t.charAt(0).toUpperCase() + t.slice(1);
      el.value = (v && !/\s$/.test(v) ? v + (una ? ' ' : ' ') : v) + t; el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { detenerVoz(); aviso('Permite el micrófono para dictar (en los ajustes del navegador).'); } else if (e.error === 'network') { detenerVoz(); aviso('Dictar necesita internet.'); } };
    rec.onend = () => { if (vozOn && vozRec === rec) { try { rec.start(); } catch (e) { detenerVoz(); } } };
    try { rec.start(); } catch (e) { detenerVoz(); aviso('No pude abrir el micrófono.'); }
  }

  // F1303 · Consultar mis estudios mientras escribes una prédica (puente del escritorio, Fase 84): lista, vista previa y «Insertar» en el campo activo.
  function hojaEstudios(getCampo, nota) {
    const ests = vivos(K_E).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    const ov = document.createElement('div'); ov.className = 'pp-hoja'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mis estudios');
    const cierra = () => ov.remove();
    const lista = () => {
      ov.innerHTML = '<div class="pp-hoja-c"><h2>📖 Mis estudios</h2><p class="pp-guia">Toca uno para ver lo que escribiste y pasarlo a tu prédica.</p>' + (ests.length ? ests.map((e, i) => '<button type="button" class="pp-item" data-i="' + i + '"><b>' + esc(tituloDe(e, 'e')) + '</b><small>' + (e.format && e.format !== 'oia' ? FMT(e.format)[1] + ' ' + esc(FMT(e.format)[2]) : '📖 Observar · Interpretar · Aplicar') + '</small></button>').join('') : '<p class="suave">Aún no tienes estudios.</p>') + '<button type="button" class="pp-borrar" id="ppEX">Cerrar</button></div>';
      ov.querySelector('#ppEX').onclick = cierra;
      ov.querySelectorAll('.pp-item').forEach((b) => { b.onclick = () => { vibra(); ver(ests[Number(b.dataset.i)]); }; });
    };
    const ver = (e) => {
      const ps = pasosDe('e', e), bloques = [];
      ps.slice(1).forEach((p) => p.campos.forEach((c) => { const v = String(e[c.id] || '').trim(); if (v) bloques.push([p.unico ? p.t : c.et, v]); }));
      ov.innerHTML = '<div class="pp-hoja-c"><h2>' + esc(tituloDe(e, 'e')) + '</h2>' + (bloques.length ? bloques.map((x, i) => '<div class="pp-pit"><b>' + esc(x[0]) + '</b><p>' + esc(x[1]) + '</p><button type="button" class="btn sec" data-b="' + i + '">Insertar esto</button></div>').join('') : '<p class="suave">Este estudio aún no tiene texto escrito.</p>') + '<button type="button" class="pp-borrar" id="ppEV">‹ Volver a la lista</button></div>';
      ov.querySelector('#ppEV').onclick = lista;
      ov.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => { vibra(); const el = document.getElementById('pp_' + getCampo()) || document.querySelector('[data-c]'); if (!el) return; const txt = bloques[Number(b.dataset.b)][1]; el.value = (el.value.trim() ? el.value.trim() + (el.tagName === 'INPUT' ? '; ' : '\n\n') : '') + txt; el.dispatchEvent(new Event('input', { bubbles: true })); if (nota) nota.textContent = 'Estudio insertado ✓'; cierra(); }; });
    };
    document.body.appendChild(ov); lista();
  }

  // F1300 · Desde la Biblia: con versículos elegidos, un toque para estudiar o preparar una prédica con ese pasaje.
  function desdePasaje(ref) {
    if (PLANES_ACTIVOS && !plus()) return abrir();
    const ov = document.createElement('div'); ov.className = 'pp-hoja'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Usar este pasaje');
    ov.innerHTML = '<div class="pp-hoja-c"><h2>📖 ' + esc(ref) + '</h2><p class="pp-guia">¿Qué quieres hacer con este pasaje?</p><button type="button" class="btn" id="ppDE">📖 Estudiarlo</button><button type="button" class="btn sec" id="ppDP">🎙️ Preparar una prédica</button><button type="button" class="pp-borrar" id="ppDX">Ahora no</button></div>';
    document.body.appendChild(ov); const cerrar = () => ov.remove();
    ov.querySelector('#ppDX').onclick = cerrar;
    ov.querySelector('#ppDE').onclick = () => { vibra(); cerrar(); const e = Object.assign(nuevoE(), { passage: ref }); guardarItem('e', e); vistaEditor('e', e, 1, true); };
    ov.querySelector('#ppDP').onclick = () => { vibra(); cerrar(); const p = nuevaP({ baseText: ref }); guardarItem('p', p); vistaEditor('p', p, 0, true); };
  }
  // F1300 · Títulos sugeridos (reglas sencillas, sin IA): salen de la idea principal, el pasaje y la palabra clave.
  function titulosSug(it) {
    const idea = String(it.centralTruth || '').replace(/[.!?¡¿]+/g, '').trim(), ref = String(it.baseText || '').trim(), r = [];
    const may = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    if (idea) { const w = idea.split(/\s+/); r.push(may(w.slice(0, 7).join(' ')) + (w.length > 7 ? '…' : '')); }
    const cont = {}; clave(idea + ' ' + [it.point1, it.point2, it.point3].join(' ')).forEach((x) => { cont[x] = (cont[x] || 0) + 1; });
    const top = Object.keys(cont).sort((a, b) => cont[b] - cont[a] || b.length - a.length)[0]; if (top) r.push(may(top));
    if (ref) { r.push('Desde ' + ref); if (top) r.push(may(top) + ' en ' + ref); }
    return r.filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 4);
  }

  // ---------- F1302 · Ensayo en voz alta: graba, escucha y compara con el tiempo (las grabaciones quedan SOLO en este teléfono) ----------
  const bd = () => new Promise((ok, no) => { try { const r = indexedDB.open('tb_pp_audio', 1); r.onupgradeneeded = () => { r.result.createObjectStore('rec', { keyPath: 'id' }); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
  const bdOp = (modo, f) => bd().then((db) => new Promise((ok, no) => { const tx = db.transaction('rec', modo), st = tx.objectStore('rec'), q = f(st); tx.oncomplete = () => ok(q && q.result); tx.onerror = () => no(tx.error); }));
  const ensayos = (id) => bdOp('readonly', (st) => st.getAll()).then((l) => (l || []).filter((x) => x.sermon === id).sort((a, b) => b.t - a.t)).catch(() => []);
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s) % 60).padStart(2, '0');
  const mimeAudio = () => { try { return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''; } catch (e) { return ''; } };
  async function vistaEnsayo(it) {
    const meta = (it.minutos || it.targetMinutes || 0) * 60, hay = !!(navigator.mediaDevices && window.MediaRecorder);
    pintar(cab() + '<section class="pp-hero pp-ok">' + ADORNO + '<h1>Ensayar en voz alta</h1><p>' + esc(tituloDe(it, 'p')) + '</p></section>' +
      (hay ? '<div class="pp-rec"><button type="button" class="pp-rec-b" id="ppRecB" aria-label="Empezar a grabar"><span class="pp-rec-i" aria-hidden="true">🎙️</span></button><p class="pp-rec-t" id="ppRecT" aria-live="polite">0:00' + (meta ? ' / ' + mmss(meta) : '') + '</p><p class="suave pp-rec-m" id="ppRecM">Toca el círculo para empezar. Habla como lo harás el domingo.</p></div><div id="ppRecP"></div>' : '<p class="pp-guia">Tu navegador no permite grabar aquí. Prueba desde Chrome (Android) o Safari actualizado.</p>') +
      '<details class="pp-texto"><summary>📄 <b>Ver mi mensaje</b> mientras ensayo</summary><div class="pp-txtc" id="ppRecTx"></div></details><h2 class="pp-sub">Mis ensayos</h2><div id="ppRecL"><p class="suave">Cargando…</p></div><p class="suave pp-nota">Las grabaciones se guardan solo en este teléfono, no se suben a ninguna parte.</p>');
    $('#ppAtras').textContent = '‹ Volver'; $('#ppAtras').onclick = () => { parar(true); vistaListo('p', it); };
    $('#ppRecTx').innerHTML = [['Idea principal', it.centralTruth], ['Introducción', it.intro], ['Punto I', it.point1], ['Punto II', it.point2], ['Punto III', it.point3], ['Ilustraciones', it.illustrations], ['Conclusión', it.conclusion], ['Llamado', it.call]].filter((x) => String(x[1] || '').trim()).map((x) => '<h3 class="pp-sub">' + x[0] + '</h3><p>' + esc(x[1]) + '</p>').join('') || '<p class="suave">Aún no escribiste nada.</p>';
    const urls = []; let rec = null, trozos = [], t0 = 0, reloj = 0, stream = null;
    function parar(descartar) { clearInterval(reloj); reloj = 0; try { if (rec && rec.state !== 'inactive') { if (descartar) rec.onstop = null; rec.stop(); } } catch (e) { /* nada */ } try { if (stream) stream.getTracks().forEach((x) => x.stop()); } catch (e) { /* nada */ } if (descartar) urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { /* nada */ } }); rec = null; stream = null; }
    async function lista() {
      const l = await ensayos(it.id), c = $('#ppRecL'); if (!c) return;
      c.innerHTML = l.length ? l.map((x) => '<article class="pp-ens" data-e="' + esc(x.id) + '"><div class="pp-ens-c"><b>' + esc(cuandoVer(x.t)) + '</b><small>' + mmss(x.dur) + (meta ? (x.dur > meta ? ' · pasó ' + mmss(x.dur - meta) : ' · faltó ' + mmss(meta - x.dur)) : '') + '</small></div><audio controls preload="none" data-a="' + esc(x.id) + '"></audio><button type="button" class="pp-borrar" data-xe="' + esc(x.id) + '">Borrar</button></article>').join('') : '<p class="suave">Todavía no grabas ninguno.</p>';
      c.querySelectorAll('audio[data-a]').forEach((a) => { const x = l.find((y) => y.id === a.dataset.a); if (x) { const u = URL.createObjectURL(x.blob); urls.push(u); a.src = u; } });
      c.querySelectorAll('[data-xe]').forEach((b) => { let ya = false; b.onclick = async () => { if (!ya) { ya = true; b.textContent = '¿Seguro? Toca otra vez'; return; } await bdOp('readwrite', (st) => st.delete(b.dataset.xe)).catch(() => 0); lista(); }; });
    }
    lista();
    const b = $('#ppRecB'); if (!b) return;
    b.onclick = async () => {
      vibra(); const m = $('#ppRecM'), tt = $('#ppRecT');
      if (rec) { parar(false); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { if (m) m.textContent = 'Permite el micrófono para grabar (en los ajustes del navegador).'; return; }
      const mime = mimeAudio(); try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { parar(true); if (m) m.textContent = 'No pude empezar a grabar.'; return; }
      trozos = []; t0 = Date.now(); b.classList.add('on'); b.setAttribute('aria-label', 'Parar de grabar'); if (m) m.textContent = 'Grabando… toca el círculo para terminar.';
      rec.ondataavailable = (e) => { if (e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = async () => {
        const dur = (Date.now() - t0) / 1000, blob = new Blob(trozos, { type: (rec && rec.mimeType) || mime || 'audio/webm' }); b.classList.remove('on'); b.setAttribute('aria-label', 'Empezar a grabar'); clearInterval(reloj); if (stream) stream.getTracks().forEach((x) => x.stop()); rec = null; stream = null;
        if (dur < 3) { if (m) m.textContent = 'Fue muy corto (menos de 3 segundos); no se guardó.'; return; }
        try { await bdOp('readwrite', (st) => st.put({ id: uid('ens'), sermon: it.id, t: Date.now(), dur, blob })); const todos = await ensayos(it.id); for (const x of todos.slice(5)) await bdOp('readwrite', (st) => st.delete(x.id)); if (m) m.textContent = 'Guardado ✓ Escúchalo abajo. Guardo tus últimos 5 ensayos.'; } catch (e) { if (m) m.textContent = 'No pude guardar la grabación: revisa el espacio del teléfono.'; }
        lista();
      };
      rec.start(1000); reloj = setInterval(() => { const s = (Date.now() - t0) / 1000; if (tt) { tt.textContent = mmss(s) + (meta ? ' / ' + mmss(meta) : ''); tt.classList.toggle('pasado', !!meta && s > meta); } }, 500);
    };
  }

  function vistaFormato(it) {
    pintar(cab() + '<h1 class="pp-h">¿Cómo quieres estudiar?</h1><p class="pp-guia">Lo que ya escribiste no se pierde si cambias de formato.</p><div id="ppFmts" class="pp-fmts"></div><button type="button" class="pp-borrar" id="ppMasF">Ver los ' + FORMATOS.length + ' formatos</button>');
    $('#ppAtras').textContent = '‹ Volver a mi estudio'; $('#ppAtras').onclick = () => vistaEditor('e', it, 0);
    let todos = false; const pf = () => { const c = $('#ppFmts'); if (!c) return; c.innerHTML = fmtCards(it.format || 'oia', todos); c.querySelectorAll('.pp-fmt').forEach((b) => { b.onclick = () => { vibra(); it.format = b.dataset.f; guardarItem('e', it); vistaEditor('e', it, 0); }; }); const m = $('#ppMasF'); if (m) m.hidden = todos; };
    $('#ppMasF').onclick = () => { todos = true; pf(); }; pf();
  }

  function vistaLargo(it) {
    pintar(cab() + '<h1 class="pp-h">¿Qué tan larga?</h1><p class="pp-guia">Lo que ya escribiste no se pierde si cambias.</p><div id="ppFmts" class="pp-fmts">' + largoCards(it.formato || 'completa') + '</div>');
    $('#ppAtras').textContent = '‹ Volver a mi prédica'; $('#ppAtras').onclick = () => vistaEditor('p', it, 0);
    document.querySelectorAll('.pp-fmt').forEach((b) => { b.onclick = () => { vibra(); it.formato = b.dataset.f; guardarItem('p', it); vistaEditor('p', it, 0); }; });
  }

  // ---------- F1296 · Ideas al vuelo: se anotan en 5 segundos y después se convierten en estudio o prédica ----------
  const ideasVivas = () => lista(K_I).filter((x) => !x.borrado).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  function hojaIdea(de, despues) {
    const ov = document.createElement('div'); ov.className = 'pp-hoja'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Anotar una idea');
    ov.innerHTML = '<div class="pp-hoja-c"><h2>💡 Anota tu idea</h2><textarea id="ppIdeaT" rows="5" maxlength="1500" placeholder="Como te venga: una frase, una pregunta, un versículo…"></textarea><div class="pp-nav"><button type="button" class="btn sec" id="ppIdeaX">Cancelar</button><button type="button" class="btn" id="ppIdeaOk">Guardar idea</button></div></div>';
    document.body.appendChild(ov); const ta = ov.querySelector('#ppIdeaT'), cerrar = () => ov.remove();
    if (!quieto()) setTimeout(() => { try { ta.focus(); } catch (e) { /* nada */ } }, 150);
    ov.querySelector('#ppIdeaX').onclick = cerrar;
    ov.querySelector('#ppIdeaOk').onclick = () => { const t = ta.value.trim(); if (!t) { ta.focus(); return; } const l = lista(K_I); l.push({ id: uid('idea'), t, de: de || '', updated: Date.now() }); grabar(K_I, l.slice(-200)); vibra(); cerrar(); if (despues) despues(); };
  }
  function vistaIdeas() {
    const l = ideasVivas();
    pintar(cab() + '<h1 class="pp-h">Mis ideas</h1><p class="pp-guia">Lo que anotaste al vuelo. Toca para convertirlo en algo.</p><button type="button" class="btn" id="ppIdeaN">💡 Anotar otra idea</button>' +
      (l.length ? '<div class="pp-cards">' + l.map((x) => '<div class="pp-pit"><b>' + esc(x.t.slice(0, 160)) + (x.t.length > 160 ? '…' : '') + '</b><small>' + new Date(x.updated || Date.now()).toLocaleDateString('es') + (x.de ? ' · desde «' + esc(x.de) + '»' : '') + (x.usada ? ' · Ya usada ✓' : '') + '</small><div class="pp-fila"><button type="button" class="btn sec" data-ie="' + esc(x.id) + '">Hacer un estudio</button><button type="button" class="btn sec" data-ip="' + esc(x.id) + '">Hacer una prédica</button></div><button type="button" class="pp-borrar" data-ix="' + esc(x.id) + '">Borrar</button></div>').join('') + '</div>' : '<div class="pp-vacio"><p>Aún no tienes ideas.</p><p class="suave">Anótalas apenas se te ocurran, donde estés.</p></div>'));
    $('#ppAtras').textContent = '‹ Estudio y Prédicas'; $('#ppAtras').onclick = vistaInicio;
    $('#ppIdeaN').onclick = () => hojaIdea('', vistaIdeas);
    const usar = (id, tipo) => { const todas = lista(K_I), x = todas.find((y) => y.id === id); if (!x) return; x.usada = true; grabar(K_I, todas); const it = tipo === 'e' ? nuevoE() : nuevaP(); if (tipo === 'e') it.topic = x.t.slice(0, 200); else { it.title = x.t.slice(0, 100); it.centralTruth = x.t; } guardarItem(tipo, it); vibra(); vistaEditor(tipo, it, 0, true); };
    document.querySelectorAll('[data-ie]').forEach((b) => { b.onclick = () => usar(b.dataset.ie, 'e'); });
    document.querySelectorAll('[data-ip]').forEach((b) => { b.onclick = () => usar(b.dataset.ip, 'p'); });
    document.querySelectorAll('[data-ix]').forEach((b) => { let ya = false; b.onclick = () => { if (!ya) { ya = true; b.textContent = '¿Seguro? Toca otra vez'; return; } grabar(K_I, lista(K_I).filter((y) => y.id !== b.dataset.ix)); vistaIdeas(); }; });
  }

  // ---------- F1297 · Fecha en que se predica (mismo nombre que el escritorio: preachDate), tarjeta para compartir y PDF ----------
  const isoDe = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const hoyISO = () => isoDe(new Date());
  const domingo = (sig) => { const d = new Date(), w = d.getDay(); d.setDate(d.getDate() + (w === 0 ? (sig ? 7 : 0) : 7 - w + (sig ? 7 : 0))); return isoDe(d); };
  const diasPara = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(hoyISO() + 'T00:00:00')) / 86400000);
  const cuando = (iso) => { const n = diasPara(iso); return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n > 1 ? 'en ' + n + ' días' : 'hace ' + (-n) + ' días'; };
  const fechaBonita = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
  // F1301 · Recordatorio en el calendario del teléfono (archivo .ics, un evento de todo el día con aviso la tarde anterior).
  function icsDe(it) {
    const d = String(it.preachDate || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
    const f = d.replace(/-/g, ''), sig = new Date(d + 'T12:00:00'); sig.setDate(sig.getDate() + 1);
    const g = sig.getFullYear() + String(sig.getMonth() + 1).padStart(2, '0') + String(sig.getDate()).padStart(2, '0'), cl = (t) => String(t || '').replace(/[\\;,]/g, ' ').replace(/\s+/g, ' ').trim();
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tierra Buena//ES', 'BEGIN:VEVENT', 'UID:' + it.id + '@tierrabuena', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;VALUE=DATE:' + f, 'DTEND;VALUE=DATE:' + g, 'SUMMARY:Predicar: ' + cl(tituloDe(it, 'p')), 'DESCRIPTION:' + cl(it.baseText) + (it.centralTruth ? ' - ' + cl(it.centralTruth) : ''), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Mañana predicas', 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function bajarICS(it) { const t = icsDe(it); if (!t) return false; try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/calendar' })); a.download = 'predica.ics'; document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) { /* nada */ } }, 1500); return true; } catch (e) { return false; } }

  const fechaHTML = (it) => '<section class="pp-fecha"><h3>📅 ¿Cuándo vas a predicar?</h3><div class="pp-chips"><button type="button" class="chip pp-dia' + (it.preachDate === domingo(0) ? ' on' : '') + '" data-d="dom0">Este domingo</button><button type="button" class="chip pp-dia' + (it.preachDate === domingo(1) ? ' on' : '') + '" data-d="dom1">Próximo domingo</button>' + (it.preachDate ? '<button type="button" class="chip pp-dia" data-d="no">Quitar fecha</button>' : '') + '</div><label for="ppFecha" class="suave">O elige otro día</label><input type="date" id="ppFecha" class="pp-busca" value="' + esc(it.preachDate || '') + '">' + (it.preachDate ? '<p class="suave">' + esc(fechaBonita(it.preachDate)) + ' · ' + cuando(it.preachDate) + '</p><button type="button" class="btn sec" id="ppCal">📆 Agregar al calendario (con aviso el día antes)</button>' : '') + '</section>';
  const cortar = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const tarjetaLineas = (it, tipo) => {
    const o = { titulo: tituloDe(it, tipo), sub: tipo === 'e' ? it.passage : it.baseText, bloques: [] };
    if (tipo === 'p') [['Idea principal', 'centralTruth'], ['Punto I', 'point1'], ['Punto II', 'point2'], ['Punto III', 'point3'], ['Llamado', 'call']].forEach((x) => { if (String(it[x[1]] || '').trim()) o.bloques.push([x[0], cortar(it[x[1]], 190)]); });
    else pasosDe('e', it).slice(1).forEach((s) => s.campos.forEach((c) => { const v = String(it[c.id] || '').trim(); if (v && o.bloques.length < 6) o.bloques.push([s.unico ? s.t : c.et, cortar(v, 190)]); }));
    return o;
  };
  function tarjetaPNG(it, tipo) {
    return new Promise((ok) => {
      try {
        const L = tarjetaLineas(it, tipo), W = 1080, M = 72, c = document.createElement('canvas'); c.width = W; const x = c.getContext('2d'), SERIF = 'Georgia, "Times New Roman", serif';
        const wrap = (t, f, an) => { x.font = f; const out = []; let ln = ''; String(t).split(' ').forEach((w) => { const q = ln ? ln + ' ' + w : w; if (x.measureText(q).width > an && ln) { out.push(ln); ln = w; } else ln = q; }); if (ln) out.push(ln); return out; };
        const pasada = (dib) => {
          let y = 130; const linea = (t, f, col, lh) => { wrap(t, f, W - 2 * M).forEach((s) => { if (dib) { x.font = f; x.fillStyle = col; x.fillText(s, M, y); } y += lh; }); };
          linea(L.titulo, 'bold 66px ' + SERIF, '#2b2218', 80); if (L.sub) { y += 4; linea(L.sub, 'italic 38px ' + SERIF, '#5d6b4f', 52); } y += 30;
          L.bloques.forEach((b) => { if (dib) { x.font = 'bold 28px system-ui, sans-serif'; x.fillStyle = '#3f5d3a'; x.fillText(String(b[0]).toUpperCase(), M, y); } y += 44; linea(b[1], '38px ' + SERIF, '#2b2218', 54); y += 28; });
          return y + 90;
        };
        c.height = pasada(false); x.fillStyle = '#f6efdf'; x.fillRect(0, 0, W, c.height); x.fillStyle = '#3f5d3a'; x.fillRect(0, 0, W, 26); x.textBaseline = 'alphabetic'; pasada(true);
        x.font = '28px system-ui, sans-serif'; x.fillStyle = '#7a6a4a'; x.fillText('Hecho con Tierra Buena', M, c.height - 40);
        c.toBlob((b) => ok(b), 'image/png');
      } catch (e) { ok(null); }
    });
  }
  function imprimir(it, tipo) {
    let c = document.getElementById('ppPrint'); if (c) c.remove(); c = document.createElement('div'); c.id = 'ppPrint';
    const L = tarjetaLineas(it, tipo); void L;
    c.innerHTML = '<h1>' + esc(tituloDe(it, tipo)) + '</h1>' + (it.preachDate ? '<p class="pp-pr-sub">Para predicar: ' + esc(fechaBonita(it.preachDate)) + '</p>' : '') +
      pasosDe(tipo, it).map((s) => s.campos.map((cc) => { const v = String(it[cc.id] || '').trim(); return v && cc.id !== 'series' ? '<h2>' + esc(s.unico ? s.t : cc.et) + '</h2><p>' + esc(v).replace(/\n/g, '<br>') + '</p>' : ''; }).join('')).join('') + '<p class="pp-pr-pie">Hecho con Tierra Buena</p>';
    document.body.appendChild(c); const fin = () => { c.remove(); window.removeEventListener('afterprint', fin); }; window.addEventListener('afterprint', fin);
    try { window.print(); } catch (e) { fin(); return false; } return true;
  }

  // ---------- Resumen del mensaje: palabras, minutos hablando y qué falta ----------
  const SUMAR = ['intro', 'point1', 'point2', 'point3', 'illustrations', 'conclusion', 'call'];
  const palabras = (it) => SUMAR.reduce((a, k) => a + String(it[k] || '').trim().split(/\s+/).filter(Boolean).length, 0);
  const resumenDe = (it) => {
    const w = palabras(it); if (!w) return null; const min = Math.max(1, Math.round(w / 130)); let nota = 'Elige arriba cuánto tiempo tienes para ver si calza.';
    if (it.minutos) { const d = min - it.minutos; nota = d >= 3 ? 'Te pasas por unos ' + d + ' min: acorta un punto o una ilustración.' : d <= -5 ? 'Te sobran unos ' + (-d) + ' min: puedes sumar una ilustración o una pregunta.' : 'Calza bien con tus ' + it.minutos + ' min ✓'; }
    const falta = []; if (!String(it.centralTruth || '').trim()) falta.push('la idea principal'); if (!String(it.call || '').trim()) falta.push('el llamado');
    return { w, min, nota, falta };
  };
  const resumenHTML = (it) => { const r = resumenDe(it); return r ? '<section class="pp-resumen"><h3>📊 Cómo va tu mensaje</h3><p><b>≈ ' + r.w + ' palabras</b> · unos ' + r.min + ' min hablando</p><p class="suave">' + esc(r.nota) + '</p>' + (r.falta.length ? '<p class="suave">Te falta: ' + r.falta.join(' y ') + '.</p>' : '') + '</section>' : ''; };

  function vistaListo(tipo, it) {
    const pasos = pasosDe(tipo, it), ll = llenos(it, pasos), n = ll.filter(Boolean).length, esE = tipo === 'e';
    const okTxt = esE ? 'completado' : 'lista', hecho = it.status === okTxt;
    if (tomarVersion(it, 'Al terminar', 600000)) guardarItem(tipo, it);
    pintar(cab() + '<section class="pp-hero pp-ok">' + ADORNO + '<h1>' + (n === pasos.length ? '¡Muy bien!' : 'Buen avance') + '</h1><p>' + esc(tituloDe(it, tipo)) + '</p></section>' +
      '<p class="pp-guia">' + n + ' de ' + pasos.length + ' pasos tienen texto.' + (n < pasos.length ? ' Toca un punto de arriba para completar lo que falta.' : '') + '</p>' +
      '<div class="pp-prog" role="group" aria-label="Pasos">' + pasos.map((p, i) => '<button type="button" class="pp-dot' + (ll[i] ? ' ok' : '') + '" data-i="' + i + '" aria-label="' + esc(p.t) + (ll[i] ? ' (con texto)' : ' (en blanco)') + '"></button>').join('') + '<span class="pp-dot fin on" aria-hidden="true"></span></div>' +
      (esE ? '<button type="button" class="btn" id="ppAPred">Crear una prédica con este estudio</button>' : '<button type="button" class="btn" id="ppPulpito">Abrir en modo púlpito</button><button type="button" class="btn sec" id="ppEns">🎙️ Ensayar en voz alta y grabar</button>') +
      (esE ? '' : fechaHTML(it) + tiempoHTML(it) + resumenHTML(it)) + '<button type="button" class="btn sec" id="ppMarca">' + (hecho ? 'Volver a «en progreso»' : (esE ? 'Marcar como completado' : 'Marcar como lista para predicar')) + '</button>' +
      (!esE && it.status === 'lista' ? '<button type="button" class="btn sec" id="ppPred">Marcar como ya predicada</button>' : '') + '<button type="button" class="btn sec" id="ppRev">🔍 Revisar y sugerir</button><button type="button" class="btn sec" id="ppVerL">🕘 Versiones anteriores</button><button type="button" class="btn sec" id="ppComp">Compartir como texto</button><button type="button" class="btn" id="ppDis">🎨 Diseñar y compartir</button><button type="button" class="btn sec" id="ppImg">Compartir como imagen</button><button type="button" class="btn sec" id="ppPdf">Imprimir o guardar como PDF</button><button type="button" class="btn sec" id="ppDup">Duplicar</button>' +
      '<button type="button" class="pp-borrar" id="ppBorrar">Mover a la papelera</button><p id="ppMsg" class="suave pp-nota" role="status"></p>');
    $('#ppAtras').textContent = '‹ ' + (esE ? 'Mis estudios' : 'Mis prédicas'); $('#ppAtras').onclick = () => vistaLista(tipo, false);
    document.querySelectorAll('.pp-dot[data-i]').forEach((d) => { d.onclick = () => vistaEditor(tipo, it, Number(d.dataset.i)); });
    const msg = (t) => { const m = $('#ppMsg'); if (m) m.textContent = t; };
    $('#ppRev').onclick = () => { vibra(); vistaRevision(tipo, it); };
    $('#ppVerL').onclick = () => { vibra(); vistaVersiones(tipo, it, () => vistaListo(tipo, it)); };
    $('#ppMarca').onclick = () => { it.status = hecho ? 'en_progreso' : okTxt; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); };
    const pr = $('#ppPred'); if (pr) pr.onclick = () => { it.status = 'predicada'; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); };
    document.querySelectorAll('.pp-min').forEach((b) => { b.onclick = () => { it.minutos = Number(b.dataset.m); it.targetMinutes = it.minutos; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); }; });
    if (esE) $('#ppAPred').onclick = () => { vibra(); const p = predicaDesdeEstudio(it); guardarItem('p', p); vistaEditor('p', p, 0, true); };
    else { $('#ppPulpito').onclick = () => { vibra(); pulpito(it); }; $('#ppEns').onclick = () => { vibra(); vistaEnsayo(it); }; }
    document.querySelectorAll('.pp-dia').forEach((b) => { b.onclick = () => { it.preachDate = b.dataset.d === 'dom0' ? domingo(0) : b.dataset.d === 'dom1' ? domingo(1) : ''; guardarItem(tipo, it); vibra(); vistaListo(tipo, it); }; });
    const bc = $('#ppCal'); if (bc) bc.onclick = () => { vibra(); msg(bajarICS(it) ? 'Listo: ábrelo para guardarlo en tu calendario.' : 'No pude crear el recordatorio desde aquí.'); };
    const fe = $('#ppFecha'); if (fe) fe.onchange = () => { it.preachDate = fe.value || ''; guardarItem(tipo, it); vistaListo(tipo, it); };
    $('#ppDup').onclick = () => { vibra(); const c = JSON.parse(JSON.stringify(it)); c.id = uid(esE ? 'study' : 'sermon'); delete c.borrado; delete c.preachDate; delete c.versions; delete c.studyId; c.status = 'borrador'; if (esE) c.topic = tituloDe(it, tipo) + ' (copia)'; else c.title = tituloDe(it, tipo) + ' (copia)'; guardarItem(tipo, c); vistaEditor(tipo, c, 0, false); };
    $('#ppPdf').onclick = () => { vibra(); if (!imprimir(it, tipo)) msg('No se pudo abrir la impresión desde aquí.'); };
    $('#ppDis').onclick = () => { vibra(); if (window.TBDisenos) window.TBDisenos.abrir(tipo, it, () => vistaListo(tipo, it)); };
    $('#ppImg').onclick = async () => {
      msg('Preparando la imagen…'); const b = await tarjetaPNG(it, tipo); if (!b) { msg('No se pudo crear la imagen.'); return; }
      const f = new File([b], 'tarjeta-tierra-buena.png', { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: tituloDe(it, tipo) }); msg(''); return; } } catch (e) { if (e && e.name === 'AbortError') { msg(''); return; } }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'tarjeta-tierra-buena.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); msg('Imagen guardada en tus descargas.');
    };
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
    let i = 0, tam = 26, lock = null, seg = 0, run = null; const rep = it.minutos ? reparto(it, it.minutos) : {}; const ov = document.createElement('div'); ov.className = 'pp-pulpito' + (quieto() ? ' pp-quieto' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo púlpito');
    ov.innerHTML = '<div class="pp-pu-top"><button type="button" class="pp-pu-b" id="puCerrar" aria-label="Cerrar">✕</button><span id="puNum"></span><span><button type="button" class="pp-pu-b" id="puMenos" aria-label="Letra más chica">A−</button><button type="button" class="pp-pu-b" id="puMas" aria-label="Letra más grande">A+</button></span></div><h2 id="puTit"></h2><div class="pp-pu-txt" id="puTxt"></div><div class="pp-pu-nav"><button type="button" class="pp-pu-b gr" id="puAnt">‹ Anterior</button><button type="button" class="pp-pu-b" id="puReloj" aria-label="Cronómetro: tocar para iniciar o pausar">▶ 0:00</button><button type="button" class="pp-pu-b gr" id="puSig">Siguiente ›</button></div>';
    document.body.appendChild(ov);
    const ver = () => { const pt = $('#puPts'); if (pt) { pt.innerHTML = partes.map((q, k) => '<button type="button" class="pp-pu-pt' + (k === i ? ' on' : '') + '" data-k="' + k + '" aria-label="' + esc(q[0]) + '"></button>').join(''); pt.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { i = Number(b.dataset.k); ver(); }; }); } $('#puTit').textContent = partes[i][0]; const tx = $('#puTxt'); tx.textContent = partes[i][1]; tx.style.setProperty('--pf', tam + 'px'); $('#puNum').textContent = (i + 1) + ' / ' + partes.length + (rep[partes[i][2]] ? ' · ≈ ' + rep[partes[i][2]] + ' min' : ''); tx.classList.remove('pp-in'); void tx.offsetWidth; tx.classList.add('pp-in'); $('#puAnt').disabled = i === 0; $('#puSig').disabled = i === partes.length - 1; };
    const cerrar = () => { clearInterval(run); try { if (lock && lock.release) lock.release(); } catch (e) { /* nada */ } ov.remove(); };
    let x0 = null; ov.addEventListener('touchstart', (e) => { x0 = e.touches && e.touches[0] ? e.touches[0].clientX : null; }, { passive: true });
    ov.addEventListener('touchend', (e) => { if (x0 === null) return; const x1 = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : x0, d = x1 - x0; x0 = null; if (Math.abs(d) < 70) return; if (d < 0 && i < partes.length - 1) { i++; ver(); } else if (d > 0 && i > 0) { i--; ver(); } }, { passive: true });
    $('#puCerrar').onclick = cerrar; $('#puAnt').onclick = () => { if (i > 0) { i--; ver(); } }; $('#puSig').onclick = () => { if (i < partes.length - 1) { i++; ver(); } };
    $('#puMas').onclick = () => { tam = Math.min(54, tam + 4); ver(); }; $('#puMenos').onclick = () => { tam = Math.max(18, tam - 4); ver(); };
    const meta = it.minutos ? it.minutos * 60 : 0, f2 = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const pintaR = () => { const b = $('#puReloj'); if (!b) return; b.textContent = (run ? '⏸ ' : '▶ ') + f2(seg) + (meta ? ' / ' + f2(meta) : ''); b.classList.toggle('pasado', !!meta && seg > meta); };
    $('#puReloj').onclick = () => { if (run) { clearInterval(run); run = null; } else run = setInterval(() => { seg++; pintaR(); }, 1000); pintaR(); }; pintaR();
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
      const c = ctx.campo, ant = String(ctx.it[c] || '').trim(), def = pasosDe(ctx.tipo, ctx.it)[ctx.paso].campos.find((f) => f.id === c), linea = def && def.filas === 1; ctx.it[c] = linea ? (ant ? ant + '; ' : '') + (k.id === 'ej' || k.id === 'li' || k.id === 'cx' ? (o.r || o.t) : o.t) : (ant ? ant + '\n\n' : '') + insTxt(k.id, o);
      if (ctx.it.status === 'borrador') ctx.it.status = 'en_progreso'; guardarItem(ctx.tipo, ctx.it); vibra(); volverEd(ctx);
    };
    if (esBase) $('#ppBase').onclick = () => { vibra(); const p = nuevaP(o.p); p.id = uid('sermon'); p.status = 'borrador'; guardarItem('p', p); vistaEditor('p', p, 0, false); };
    $('#ppCopia').onclick = async () => { try { await navigator.clipboard.writeText(o.t + '\n\n' + o.x + (o.r ? '\n' + o.r : '')); msg('Copiado.'); } catch (e) { msg('No se pudo copiar desde aquí.'); } };
  }

  const api = { abrir, desdePasaje, plus, K_E, K_P, _v: { tarjetaPNG, imprimir, vistaListo, vistaIdeas, hojaIdea, vistaLargo, pasosDe, FORMATOS, vistaFormato, vistaInicio, vistaEmpezar, vistaEditor, traerPasaje }, _t: { mmss, icsDe, titulosSug, revisar, tomarVersion, snapDe, tarjetaLineas, domingo, diasPara, cuando, resumenDe, largoDe, ideasVivas, parseRef, refTexto, POPULARES, reparto, insTxt, sinAcento, SUG_E, SUG_P, nuevoE, nuevaP, predicaDesdeEstudio, textoCompartir, llenos, PASOS_E, PASOS_P, tituloDe } };
  if (typeof window !== 'undefined') window.TBPredicas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
