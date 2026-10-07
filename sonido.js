// sonido.js - F918 (voz propia del área Iglesia). F902 (melodía de apertura + coro suave en cada nota). F900. Identidad sonora de Tierra Buena. Todo se genera en el teléfono (WebAudio): no hay archivos, no hay derechos de autor, pesa casi nada.
// FIRMA SONORA: tres notas que suben (tierra → brote → cielo): Sol4 · Re5 · Si5, con cola larga y un destello. Es lo primero que se oye y vuelve en los logros.
// Familia: todos los sonidos usan la misma escala (pentatónica de Sol) y el mismo «timbre cálido» (seno + triángulo suave, ataque redondo, algo de eco), para que suenen a UNA sola app.
// Regla del usuario: en CADA sesión de trabajo se mejora el sonido (ver compartido/docs/TAREAS.md).
'use strict';
(function () {
  const K = 'tb_movil_sonido';
  let ctx = null, maestro = null, eco = null, listo = false, t0 = Date.now();
  const activo = () => { try { return localStorage.getItem(K) !== '0'; } catch (e) { return true; } };
  const NOTAS = { G3: 196, D4: 293.66, G4: 392, A4: 440, B4: 493.88, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, D6: 1174.66, G6: 1568 };

  function iniciar() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      maestro = ctx.createGain(); maestro.gain.value = 0.5;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.25;
      maestro.connect(comp); comp.connect(ctx.destination);
      // eco suave (sala pequeña): ruido que se apaga solo
      const largo = Math.floor(ctx.sampleRate * 1.2), buf = ctx.createBuffer(2, largo, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 3.2); }
      const conv = ctx.createConvolver(); conv.buffer = buf; const sal = ctx.createGain(); sal.gain.value = 0.32;
      conv.connect(sal); sal.connect(maestro); eco = conv;
      listo = true;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function despertar() { try { if (iniciar() && ctx.state === 'suspended') ctx.resume(); } catch (e) { /* sin audio */ } }

  // una nota «cálida»: seno + triángulo, ataque redondo, caída natural, un poco al eco
  function nota(f, cuando, dur, vol, opc) {
    if (!ctx || !listo) return;
    opc = opc || {};
    f = f * 2 * (1 + (Math.random() - 0.5) * 0.004);             // F906: variación mínima (±0,2 %): cada toque suena vivo, no a máquina
    // F903: todo una octava más arriba (antes sonaba grave y opaco en el celular)
    const t = ctx.currentTime + (cuando || 0), g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2.005; o2.detune.value = 3;
    const g2 = ctx.createGain(); g2.gain.value = (opc.brillo == null ? 0.16 : opc.brillo) * 1.5;   // más armónicos = timbre de campanita, no de zumbido
    vol = f > 1800 ? vol * 0.8 : vol;                            // en lo agudo el oído oye más fuerte: se baja un poco
    fl.type = 'lowpass'; fl.frequency.value = Math.min(9000, Math.max(opc.corte || 4200, f * 2.4)) + 1200; fl.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (opc.ataque || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(fl); fl.connect(maestro);
    if (!opc.sinCoro) { const o3 = ctx.createOscillator(), g3 = ctx.createGain(); o3.type = 'sine'; o3.frequency.value = f; o3.detune.value = -7; g3.gain.value = 0.45; o3.connect(g3); g3.connect(g); o3.start(t); o3.stop(t + dur + 0.05); }   // F902: coro suave = más cuerpo, más agradable
    if (eco && (opc.eco == null ? 0.5 : opc.eco) > 0) { const e = ctx.createGain(); e.gain.value = opc.eco == null ? 0.5 : opc.eco; fl.connect(e); e.connect(eco); }
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  // un soplo de aire (para abrir/cerrar pantallas)
  const ruidos = {};
  function soplo(cuando, dur, vol, desde, hasta) {
    if (!ctx || !listo) return;
    const t = ctx.currentTime + (cuando || 0), n = Math.floor(ctx.sampleRate * dur), kb = n; let b = ruidos[kb];   // F906: el ruido se genera una sola vez por duración (menos trabajo en el teléfono)
    if (!b) { b = ruidos[kb] = ctx.createBuffer(1, n, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(desde, t); f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(maestro); s.start(t); s.stop(t + dur + 0.02);
  }
  let ultSon = 0;
  const ok = (fn) => function () { if (!activo()) return; const ahora = Date.now(); if (ahora - ultSon < 45) return; ultSon = ahora; despertar();   // F906: sin ráfagas (menos nodos de audio a la vez)
    if (!listo || !ctx || ctx.state === 'closed') return; try { fn.apply(null, arguments); } catch (e) { /* sin sonido */ } };

  const API = {
    activo,
    poner(v) { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) { /* nada */ } if (v) API.exito(); },
    firma: ok(function () {                       // F902: MELODÍA DE APERTURA (~5 s): la tierra (G3+D4) · la semilla sube · brota · y se abre al cielo con un acorde
      nota(NOTAS.G3, 0.00, 4.8, 0.07, { eco: 0.5, corte: 1400, ataque: 0.7, sinCoro: true }); nota(NOTAS.D4, 0.35, 4.4, 0.045, { eco: 0.6, corte: 1600, ataque: 0.9, sinCoro: true });   // el «suelo»
      const M = [['G4', 0.00, 1.0, 0.17], ['A4', 0.30, 0.9, 0.15], ['D5', 0.62, 1.1, 0.16], ['B4', 1.00, 0.9, 0.12], ['E5', 1.34, 1.0, 0.15], ['D5', 1.76, 0.9, 0.12], ['G5', 2.20, 1.5, 0.15]];
      M.forEach((n) => nota(NOTAS[n[0]], n[1], n[2], n[3], { eco: 0.7 }));
      nota(NOTAS.B5, 2.70, 2.6, 0.13, { eco: 0.9, brillo: 0.24 }); nota(NOTAS.D5, 2.70, 2.4, 0.09, { eco: 0.8 }); nota(NOTAS.G4, 2.70, 2.6, 0.10, { eco: 0.7 });   // el acorde final: ya brotó
      nota(NOTAS.D6, 3.30, 0.7, 0.045, { eco: 0.9, brillo: 0.3 }); nota(NOTAS.G6, 3.55, 1.1, 0.035, { eco: 1, brillo: 0.3 });   // destellos
      soplo(0.05, 1.4, 0.04, 400, 3000);
    }),
    toque: ok(function () { nota(NOTAS.D6, 0, 0.11, 0.06, { eco: 0.1, brillo: 0.05, ataque: 0.004 }); }),
    suave: ok(function () { nota(NOTAS.A5, 0, 0.16, 0.05, { eco: 0.2, brillo: 0.05, ataque: 0.006 }); }),
    tab(i) { ok(function () { const e = [NOTAS.G4, NOTAS.A4, NOTAS.B4, NOTAS.D5, NOTAS.E5][Number(i) % 5]; nota(e, 0, 0.32, 0.12, { eco: 0.35 }); nota(e * 2, 0.03, 0.2, 0.04, { eco: 0.3, brillo: 0 }); })(); },
    abre: ok(function () { soplo(0, 0.26, 0.04, 500, 2400); }),   // F915: solo el soplo (antes sumaba una nota que chocaba con el sonido de la pestaña)
    vuelve: ok(function () { soplo(0, 0.24, 0.04, 2200, 500); }),
    exito: ok(function () { nota(NOTAS.G5, 0, 0.5, 0.13, { eco: 0.6 }); nota(NOTAS.D6, 0.12, 0.9, 0.12, { eco: 0.8, brillo: 0.22 }); }),
    logro: ok(function () { [NOTAS.G4, NOTAS.B4, NOTAS.D5, NOTAS.G5, NOTAS.D6].forEach((f, i) => nota(f, i * 0.09, 1.1, 0.12, { eco: 0.8 })); soplo(0.1, 0.9, 0.04, 800, 4200); }),
    suerte: ok(function () { nota(NOTAS.E5, 0, 0.3, 0.1, { eco: 0.4 }); nota(NOTAS.G5, 0.1, 0.5, 0.1, { eco: 0.5 }); }),
    aviso: ok(function () { nota(NOTAS.B5, 0, 0.35, 0.09, { eco: 0.5 }); nota(NOTAS.G5, 0.16, 0.5, 0.08, { eco: 0.5 }); }),
    error: ok(function () { nota(NOTAS.D4, 0, 0.28, 0.1, { eco: 0.2, corte: 1400 }); nota(NOTAS.G3, 0.12, 0.4, 0.09, { eco: 0.2, corte: 900 }); }),
    // F901 · voces nuevas de la familia (misma escala y mismo timbre cálido)
    campana: ok(function () {                    // campana de iglesia suave: entrar como pastor, momentos solemnes
      [[1, 0.16], [2.0, 0.07], [2.76, 0.05], [5.4, 0.018]].forEach((p) => nota(NOTAS.G4 * p[0], 0, 3.2 / p[0] + 0.8, p[1], { eco: 0.9, brillo: 0, corte: 5200, ataque: 0.004 }));
      nota(NOTAS.G3, 0.02, 2.6, 0.08, { eco: 0.5, corte: 700 });
    }),
    tecla(i) { ok(function () { const e = [NOTAS.G4, NOTAS.A4, NOTAS.B4, NOTAS.D5, NOTAS.E5, NOTAS.G5][Math.max(0, Math.min(5, Number(i) || 0))]; nota(e, 0, 0.18, 0.07, { eco: 0.25, brillo: 0.08, ataque: 0.004 }); })(); },   // al escribir cada letra del código sube una nota
    juntos(n) { ok(function () {                 // voces que se van sumando: «juntos». Cuantas más personas, más voces.
      const v = [NOTAS.G4, NOTAS.D5, NOTAS.B4, NOTAS.G5, NOTAS.E5, NOTAS.B5], c = Math.max(2, Math.min(v.length, Number(n) + 1 || 3));
      for (let i = 0; i < c; i++) nota(v[i], i * 0.11, 1.5 + i * 0.1, 0.1 - i * 0.008, { eco: 0.8, brillo: 0.18 });
      nota(NOTAS.G3, 0, 1.8, 0.08, { eco: 0.4, corte: 800 }); soplo(0.05, 0.7, 0.03, 600, 3400);
    })(); },
    calma(i) { ok(function () { const e = [NOTAS.G4, NOTAS.A4, NOTAS.B4, NOTAS.D5, NOTAS.E5, NOTAS.G5][Math.max(0, Math.min(5, Number(i) || 0))]; nota(e, 0, 2.6, 0.075, { eco: 0.95, brillo: 0.22, ataque: 0.03 }); })(); },   // F906: al sembrar una luz en Inicio: escala pentatónica, larga y suave
    respira(entra) { ok(function () { if (entra) { nota(NOTAS.G4, 0, 3.8, 0.06, { eco: 0.8, ataque: 0.9, sinCoro: true }); nota(NOTAS.D5, 0.5, 3.4, 0.045, { eco: 0.8, ataque: 0.9, sinCoro: true }); } else { nota(NOTAS.D5, 0, 5.2, 0.05, { eco: 0.9, ataque: 0.4, sinCoro: true }); nota(NOTAS.G4, 0.6, 5, 0.045, { eco: 0.9, ataque: 0.5, sinCoro: true }); nota(NOTAS.G3, 1.2, 4.4, 0.05, { eco: 0.7, ataque: 0.6, corte: 900, sinCoro: true }); } })(); },   // F906: inhala sube, exhala baja
    armar: ok(function () {                      // F919: al armar un movimiento con la iglesia: tres notas que suben y se apoyan, como manos que se juntan
      [[NOTAS.G4, 0], [NOTAS.B4, 0.1], [NOTAS.D5, 0.2]].forEach((n) => nota(n[0], n[1], 0.9, 0.09, { eco: 0.6, ataque: 0.01 })); nota(NOTAS.G5, 0.34, 1.2, 0.07, { eco: 0.85, brillo: 0.2 });
    }),
    recordatorio: ok(function (hoy) {            // F920/F921: aviso dentro de la app. Dos notas suaves que bajan; si la fecha es HOY, tres que suben (más presente, siempre cordial)
      if (hoy === true) { nota(NOTAS.G4, 0, 0.6, 0.07, { eco: 0.6, ataque: 0.02 }); nota(NOTAS.B4, 0.14, 0.6, 0.07, { eco: 0.65, ataque: 0.02 }); nota(NOTAS.D5, 0.28, 1.1, 0.075, { eco: 0.8, ataque: 0.03 }); return; }
      nota(NOTAS.D5, 0, 0.5, 0.07, { eco: 0.6, ataque: 0.02 }); nota(NOTAS.G4, 0.18, 0.9, 0.065, { eco: 0.7, ataque: 0.03 });
    }),
    iglesia: ok(function () {                    // F918: voz propia del área Iglesia: campana lejana + acorde abierto de Sol (reunidos, en paz)
      nota(NOTAS.G4, 0, 2.2, 0.07, { eco: 0.9, brillo: 0.05, corte: 3200, ataque: 0.02 }); nota(NOTAS.G4 * 2.76, 0, 0.9, 0.012, { eco: 0.9, brillo: 0, corte: 5200, ataque: 0.004 });
      nota(NOTAS.D5, 0.14, 2.0, 0.07, { eco: 0.85, ataque: 0.05 }); nota(NOTAS.B4, 0.28, 2.0, 0.06, { eco: 0.85, ataque: 0.06 }); nota(NOTAS.G5, 0.42, 1.8, 0.05, { eco: 0.9, brillo: 0.2, ataque: 0.07 });
    }),
    gota: ok(function () { nota(NOTAS.E5, 0, 0.18, 0.06, { eco: 0.5, brillo: 0.2, ataque: 0.005 }); nota(NOTAS.B4, 0.09, 0.5, 0.05, { eco: 0.8, ataque: 0.01 }); }),   // F931 (I4): una gota de rocío que se recoge
    sana: ok(function () { nota(NOTAS.G4, 0, 0.5, 0.06, { eco: 0.7, ataque: 0.02 }); nota(NOTAS.D5, 0.1, 0.7, 0.06, { eco: 0.8, brillo: 0.15, ataque: 0.03 }); nota(NOTAS.G5, 0.22, 1.1, 0.045, { eco: 0.9, brillo: 0.25, ataque: 0.04 }); }),   // F930 (I3): sello Tierra Buena al limpiar maleza: tres notas que suben, como la luz que vuelve
    semilla: ok(function () { nota(NOTAS.D4, 0, 0.22, 0.09, { eco: 0.3, corte: 1100 }); nota(NOTAS.A4, 0.12, 0.35, 0.08, { eco: 0.5 }); nota(NOTAS.E5, 0.24, 0.6, 0.07, { eco: 0.7, brillo: 0.2 }); })   // algo que cae en la tierra y brota
  };
  // F903: ahorro de batería: con la app en segundo plano el audio se duerme del todo y se despierta al volver
  document.addEventListener('visibilitychange', () => { try { if (!ctx) return; if (document.hidden) { if (ctx.state === 'running') ctx.suspend(); } else if (activo() && ctx.state === 'suspended' && API._sono) ctx.resume(); } catch (e) { /* sin audio */ } });
  // F915: SIN SONIDOS DOBLES. Si otro sonido DISTINTO sonó hace menos de 0,3 s, los sonidos «suaves» (toque, abre, vuelve, suave, tab) se callan:
  // suena uno solo, el primero. Los momentos importantes (firma, logro, éxito, aviso, error, campana, juntos, semilla, calma, respira) y las teclas siempre suenan.
  const FUERTES = ['firma', 'exito', 'logro', 'aviso', 'error', 'campana', 'juntos', 'semilla', 'sana', 'gota', 'calma', 'respira', 'suerte', 'tecla', 'iglesia', 'armar', 'recordatorio'];
  let ultNom = '', ultMs = 0;
  Object.keys(API).forEach((k) => {
    const f = API[k]; if (typeof f !== 'function' || k === 'activo' || k === 'poner') return;
    API[k] = function () { const ahora = Date.now(); if (k !== ultNom && ahora - ultMs < 300 && FUERTES.indexOf(k) < 0) return; ultNom = k; ultMs = ahora; return f.apply(API, arguments); };
  });
  window.TBSonido = API;

  // --- conexión automática con toda la app (sin tocar el resto del código) ---
  const por = (t) => (t && t.closest) ? t : null;
  document.addEventListener('pointerdown', (ev) => {
    try {
      despertar();
      if (!listo && !ctx) return;
      const t = por(ev && ev.target); if (!t) return;
      const tab = t.closest('.tab');
      if (tab && tab.getAttribute('data-tab') === 'iglesia') return API.iglesia();   // F918
      if (tab) { const i = Array.prototype.indexOf.call(document.querySelectorAll('.tab'), tab); API.tab(i < 0 ? 0 : i); return; }
      if (t.closest('.volver')) return API.vuelve();
      if (t.closest('summary')) return API.suave();
      if (t.closest('.btn:not(.sec), .card, [data-ir], .tbcar-ir')) return API.abre();
      if (t.closest('button, [role=button], a')) API.toque();
    } catch (e) { /* sin sonido */ }
  }, true);
  // F901: al escribir el código (de iglesia o de pastor) cada letra suena una nota que sube
  document.addEventListener('input', (ev) => { try { const t = por(ev && ev.target); if (!t || !t.id) return; if (t.id === 'codHoja' || t.id === 'cod') API.tecla(Math.min(5, String(t.value || '').length - 1)); else if (t.id === 'pkHoja') API.tecla(Math.floor((String(t.value || '').length % 6))); } catch (e) { /* sin sonido */ } }, true);
  // F903: el teléfono solo deja sonar después de un toque. La firma suena en el PRIMER toque de la sesión (antes solo si llegaba en los primeros 4 s, por eso casi nunca sonaba).
  const primerToque = () => {
    try {
      if (API._sono || !activo()) return; API._sono = true;
      iniciar(); if (!ctx) return;
      const sonar = () => { try { ultSon = 0; API.firma(); } catch (e) { /* sin sonido */ } };
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().then(sonar, sonar); else sonar();
    } catch (e) { /* sin sonido */ }
  };
  API.primero = primerToque; API.corriendo = () => { try { return !!(ctx && ctx.state === 'running'); } catch (e) { return false; } };   // F904: la apertura de app.js los usa
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((n) => document.addEventListener(n, function f() { primerToque(); ['pointerdown', 'touchend', 'click', 'keydown'].forEach((m) => document.removeEventListener(m, f, true)); }, true));
  // éxito automático en los momentos de logro de la app (confeti, «hecho»)
  try {
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n && n.classList && (n.classList.contains('cf-pt') || n.classList.contains('fb-spark') || n.classList.contains('toast-ok'))) { if (!API._ult || Date.now() - API._ult > 900) { API._ult = Date.now(); API.logro(); } return; } } }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (e) { /* sin observador */ }
  // intenta sonar la firma al abrir (funciona cuando el navegador ya permitió audio, p. ej. app instalada)
  setTimeout(() => { try { if (activo()) { iniciar(); if (ctx && ctx.state === 'running' && !API._sono) { API._sono = true; ultSon = 0; API.firma(); } } } catch (e) { /* nada */ } }, 350);
})();
