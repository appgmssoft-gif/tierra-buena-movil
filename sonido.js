// sonido.js - F900. Identidad sonora de Tierra Buena. Todo se genera en el teléfono (WebAudio): no hay archivos, no hay derechos de autor, pesa casi nada.
// FIRMA SONORA: tres notas que suben (tierra → brote → cielo): Sol4 · Re5 · Si5, con cola larga y un destello. Es lo primero que se oye y vuelve en los logros.
// Familia: todos los sonidos usan la misma escala (pentatónica de Sol) y el mismo «timbre cálido» (seno + triángulo suave, ataque redondo, algo de eco), para que suenen a UNA sola app.
// Regla del usuario: en CADA sesión de trabajo se mejora el sonido (ver compartido/docs/SIGUIENTE_SESION.md → «SONIDO»).
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
      maestro = ctx.createGain(); maestro.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.25;
      maestro.connect(comp); comp.connect(ctx.destination);
      // eco suave (sala pequeña): ruido que se apaga solo
      const largo = Math.floor(ctx.sampleRate * 1.6), buf = ctx.createBuffer(2, largo, ctx.sampleRate);
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
    const t = ctx.currentTime + (cuando || 0), g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter();
    o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = f; o2.frequency.value = f * 2.005; o2.detune.value = 3;
    const g2 = ctx.createGain(); g2.gain.value = opc.brillo == null ? 0.16 : opc.brillo;
    fl.type = 'lowpass'; fl.frequency.value = opc.corte || 4200; fl.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (opc.ataque || 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(fl); fl.connect(maestro);
    if (eco && (opc.eco == null ? 0.5 : opc.eco) > 0) { const e = ctx.createGain(); e.gain.value = opc.eco == null ? 0.5 : opc.eco; fl.connect(e); e.connect(eco); }
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  // un soplo de aire (para abrir/cerrar pantallas)
  function soplo(cuando, dur, vol, desde, hasta) {
    if (!ctx || !listo) return;
    const t = ctx.currentTime + (cuando || 0), n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(desde, t); f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(maestro); s.start(t); s.stop(t + dur + 0.02);
  }
  const ok = (fn) => function () { if (!activo()) return; despertar(); if (!listo || !ctx || ctx.state === 'closed') return; try { fn.apply(null, arguments); } catch (e) { /* sin sonido */ } };

  const API = {
    activo,
    poner(v) { try { localStorage.setItem(K, v ? '1' : '0'); } catch (e) { /* nada */ } if (v) API.exito(); },
    firma: ok(function () {                       // la firma de Tierra Buena
      nota(NOTAS.G4, 0.00, 1.6, 0.20, { eco: 0.7 }); nota(NOTAS.D5, 0.22, 1.7, 0.19, { eco: 0.7 }); nota(NOTAS.B5, 0.46, 2.6, 0.17, { eco: 0.9, brillo: 0.24 });
      nota(NOTAS.G3, 0.00, 2.4, 0.10, { eco: 0.4, corte: 900 });   // el «suelo»: la tierra buena
      soplo(0.05, 1.1, 0.045, 400, 3200);
      nota(NOTAS.G6, 0.78, 1.8, 0.05, { eco: 1, brillo: 0 });      // destello final
    }),
    toque: ok(function () { nota(NOTAS.D6, 0, 0.11, 0.06, { eco: 0.1, brillo: 0.05, ataque: 0.004 }); }),
    suave: ok(function () { nota(NOTAS.A5, 0, 0.16, 0.05, { eco: 0.2, brillo: 0.05, ataque: 0.006 }); }),
    tab(i) { ok(function () { const e = [NOTAS.G4, NOTAS.A4, NOTAS.B4, NOTAS.D5, NOTAS.E5][Number(i) % 5]; nota(e, 0, 0.32, 0.12, { eco: 0.35 }); nota(e * 2, 0.03, 0.2, 0.04, { eco: 0.3, brillo: 0 }); })(); },
    abre: ok(function () { soplo(0, 0.28, 0.05, 500, 2400); nota(NOTAS.D5, 0.02, 0.3, 0.05, { eco: 0.4 }); }),
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
    semilla: ok(function () { nota(NOTAS.D4, 0, 0.22, 0.09, { eco: 0.3, corte: 1100 }); nota(NOTAS.A4, 0.12, 0.35, 0.08, { eco: 0.5 }); nota(NOTAS.E5, 0.24, 0.6, 0.07, { eco: 0.7, brillo: 0.2 }); })   // algo que cae en la tierra y brota
  };
  window.TBSonido = API;

  // --- conexión automática con toda la app (sin tocar el resto del código) ---
  const por = (t) => (t && t.closest) ? t : null;
  document.addEventListener('pointerdown', (ev) => {
    try {
      despertar();
      if (!listo && !ctx) return;
      const t = por(ev && ev.target); if (!t) return;
      const tab = t.closest('.tab');
      if (tab) { const i = Array.prototype.indexOf.call(document.querySelectorAll('.tab'), tab); API.tab(i < 0 ? 0 : i); return; }
      if (t.closest('.volver')) return API.vuelve();
      if (t.closest('summary')) return API.suave();
      if (t.closest('.btn:not(.sec), .card, [data-ir], .tbcar-ir')) return API.abre();
      if (t.closest('button, [role=button], a')) API.toque();
    } catch (e) { /* sin sonido */ }
  }, true);
  // F901: al escribir el código (de iglesia o de pastor) cada letra suena una nota que sube
  document.addEventListener('input', (ev) => { try { const t = por(ev && ev.target); if (!t || !t.id) return; if (t.id === 'codHoja' || t.id === 'cod') API.tecla(Math.min(5, String(t.value || '').length - 1)); else if (t.id === 'pkHoja') API.tecla(Math.floor((String(t.value || '').length % 6))); } catch (e) { /* sin sonido */ } }, true);
  // la primera vez que el teléfono deja sonar (exige un toque), si la apertura aún está a la vista suena la firma
  let intento = false;
  document.addEventListener('pointerdown', () => { if (intento) return; intento = true; if (Date.now() - t0 < 4200 && !API._sono) { API._sono = true; API.firma(); } }, { once: true, capture: true });
  // éxito automático en los momentos de logro de la app (confeti, «hecho»)
  try {
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n && n.classList && (n.classList.contains('cf-pt') || n.classList.contains('fb-spark') || n.classList.contains('toast-ok'))) { if (!API._ult || Date.now() - API._ult > 900) { API._ult = Date.now(); API.logro(); } return; } } }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch (e) { /* sin observador */ }
  // intenta sonar la firma al abrir (funciona cuando el navegador ya permitió audio, p. ej. app instalada)
  setTimeout(() => { try { if (activo()) { iniciar(); if (ctx && ctx.state === 'running' && !API._sono) { API._sono = true; API.firma(); } } } catch (e) { /* nada */ } }, 350);
})();
