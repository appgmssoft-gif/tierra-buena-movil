// tablero.js — Tablero de Tierra Buena · FASE 1 (F1125). Diseño: diseno/DISENO_TABLERO_JUEGOS.md (sección 14).
// Reglas: un jugador, dado de 1 (tirada bonus de 2), seis casillas (rocío, pregunta, atajo, tormenta, pausa, escudo), tres rondas.
// Gotas: van directo al saldo del Vivero (TBInicio.ganarDirecto). El saldo se ve igual aquí y en el Inicio.
// SONIDO PROPIO: solo en este archivo (tambores, marimba, pájaros, viento, gong) con cola de reverberación.
// Respeta el interruptor de sonidos de Perfil (tb_movil_sonido). No usa sonido.js.
'use strict';
(function () {
  const K = 'tb_movil_tablero', K_LEIDOS = 'tb_movil_leidos', K_SON = 'tb_movil_sonido';
  const FILAS = 5, COLS = 7, META = 30;                       // recorrido en zigzag: 0 = salida, 30 = meta
  const NOMBRES = ['Camino de semilla', 'Camino de brote', 'Camino de raíz', 'Camino de ramas'];
  const ICONO = { rocio: '💧', pregunta: '❓', atajo: '⤴', tormenta: '🌪', pausa: '⏸', escudo: '🛡', meta: '🏁' };
  const TRAMPA = { tormenta: 1, pausa: 1 };
  // Pesos por ronda (suman 1). Tormenta + pausa nunca pasan de 1 de cada 6.
  const PESOS = {
    1: { rocio: 0.50, pregunta: 0.22, atajo: 0.12, tormenta: 0.04, pausa: 0.04, escudo: 0.08 },
    2: { rocio: 0.43, pregunta: 0.19, atajo: 0.11, tormenta: 0.10, pausa: 0.06, escudo: 0.11 },
    3: { rocio: 0.43, pregunta: 0.19, atajo: 0.10, tormenta: 0.10, pausa: 0.06, escudo: 0.12 }
  };
  // Rotación del cubo (X, Y) que deja cada número mirando a la persona
  const CARA = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

  // ---------- Casillas: cada ronda sale siempre igual (semilla fija) ----------
  function semilla(n) {
    let s = n >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const cacheRonda = {};
  function casillasDeRonda(ronda) {
    if (cacheRonda[ronda]) return cacheRonda[ronda];
    const pesos = PESOS[Math.min(ronda, 3)], rnd = semilla(ronda * 7919 + 17), tipos = ['rocio', 'pregunta', 'atajo', 'tormenta', 'pausa', 'escudo'];
    const out = { 0: 'salida', [META]: 'meta' };
    let previa = 'salida';
    for (let p = 1; p < META; p++) {
      const r = rnd(); let acc = 0, t = 'rocio';
      for (const k of tipos) { acc += pesos[k]; if (r < acc) { t = k; break; } }
      if (p <= 2 && t === 'tormenta') t = 'rocio';                   // la salida nunca castiga
      if (TRAMPA[t] && TRAMPA[previa]) t = 'rocio';                  // dos trampas seguidas no
      out[p] = t; previa = t;
    }
    if (!Object.keys(out).some((p) => out[p] === 'escudo')) out[12] = 'escudo';
    // retrocesos garantizados: 1 en la ronda 1, 2 en las siguientes
    const minimo = ronda === 1 ? 1 : 2;
    let cuantas = Object.keys(out).filter((p) => out[p] === 'tormenta').length;
    for (let intento = 0; cuantas < minimo && intento < 500; intento++) {
      const p = 5 + Math.floor(rnd() * 23);
      if (out[p] !== 'rocio' || TRAMPA[out[p - 1]] || TRAMPA[out[p + 1]]) continue;
      out[p] = 'tormenta'; cuantas++;
    }
    return (cacheRonda[ronda] = out);
  }
  const tipoEn = (ronda, p) => casillasDeRonda(ronda)[p];
  function coord(p) {                                              // zigzag: fila a fila, cada una al revés de la anterior
    const r = Math.floor(p / COLS), c = r % 2 === 0 ? p % COLS : COLS - 1 - (p % COLS);
    return { x: (c + 0.5) / COLS * 100, y: (r + 0.5) / FILAS * 100 };
  }

  // ---------- Estado (en este teléfono; la clave entra en SYNC_CLAVES de app.js) ----------
  const nuevoEstado = () => ({ v: 1, ronda: 1, pos: 0, maxPos: 0, escudos: 0, bonus: 0, pausa: false, gotas: 0, rondas: 0, vistas: [] });
  function cargar() {
    try { const v = JSON.parse(localStorage.getItem(K)); if (v && v.v === 1 && v.ronda >= 1 && v.pos >= 0 && v.pos <= META) return Object.assign(nuevoEstado(), v); } catch (e) { /* sin datos */ }
    return nuevoEstado();
  }
  function guardar() { try { localStorage.setItem(K, JSON.stringify(E)); } catch (e) { /* sin espacio */ } }

  // ---------- Sonido propio de la selva (WebAudio; nada de archivos) ----------
  let ctx = null, master = null, verb = null;
  const sonOn = () => { try { return localStorage.getItem(K_SON) !== '0'; } catch (e) { return true; } };
  function audio() {
    if (!sonOn()) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.85;
        const comp = ctx.createDynamicsCompressor();                 // compresor suave: nada se corta ni revienta
        comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
        master.connect(comp); comp.connect(ctx.destination);
        // cola de reverberación de sala con árboles: ruido que se apaga con curva natural
        const n = Math.floor(ctx.sampleRate * 2.4), b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
        verb = ctx.createConvolver(); verb.buffer = b;
        const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(comp);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  // salida: el sonido va al master y, en parte, a la reverberación (humedo = cuánto)
  function salida(nodo, humedo) {
    nodo.connect(master);
    if (humedo) { const g = ctx.createGain(); g.gain.value = humedo; nodo.connect(g); g.connect(verb); }
  }
  // envolvente natural: ataque corto, caída exponencial (como una tecla que se apaga sola)
  function caida(g, t, vol, atk, vida) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.setTargetAtTime(0.0001, t + atk, vida / 4); }
  function ruido(d, dur, vol, frec, tipo, q, hasta, humedo) {      // chasquido, soplo: ruido filtrado
    const t = ctx.currentTime + d, n = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = tipo || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(frec, t);
    if (hasta) f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); caida(g, t, vol, Math.min(0.008, dur * 0.25), dur);
    s.connect(f); f.connect(g); salida(g, humedo || 0); s.start(t); s.stop(t + dur + 0.05);
  }
  function golpe(d, vol, f0, f1, vida, humedo) {                    // tambor: membrana (tono que cae) + cuerpo + baqueta
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0 || 160, t); o.frequency.exponentialRampToValueAtTime(f1 || 55, t + 0.12);
    caida(g, t, vol, 0.003, vida || 0.5); o.connect(g); salida(g, humedo == null ? 0.2 : humedo); o.start(t); o.stop(t + (vida || 0.5) + 0.05);
    ruido(d, 0.05, vol * 0.45, 900, 'bandpass', 0.8);
    ruido(d, 0.012, vol * 0.3, 3200, 'highpass', 0.5);
  }
  function madera(d, vol) { ruido(d, 0.035, vol, 2200 + Math.random() * 900, 'bandpass', 6, 0, 0.15); }   // dado contra la mesa
  function marimba(d, f, vol, dur, brillo) {                        // lámina de madera: tono cálido + parcial 4 + mazo
    const t = ctx.currentTime + d;
    [[f, 'triangle', 1, dur], [f * 4, 'sine', 0.14 * (brillo || 1), dur * 0.22]].forEach((p) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = p[1]; o.frequency.value = p[0];
      caida(g, t, vol * p[2], 0.002, p[3]); o.connect(g); salida(g, 0.35); o.start(t); o.stop(t + p[3] + 0.05);
    });
    ruido(d, 0.02, vol * 0.4, f * 3, 'bandpass', 3);
  }
  function pajaro(d) {                                              // trinos: tres chirridos con vibrato
    [[0, 2300, 3100, 0.05], [0.12, 2700, 3500, 0.045], [0.23, 2100, 2900, 0.04]].forEach((p) => {
      const t = ctx.currentTime + d + p[0], o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(p[1], t); o.frequency.exponentialRampToValueAtTime(p[2], t + 0.07);
      lfo.frequency.value = 32; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
      caida(g, t, p[3], 0.006, 0.1); o.connect(g); salida(g, 0.5);
      o.start(t); o.stop(t + 0.14); lfo.start(t); lfo.stop(t + 0.14);
    });
  }
  function viento(d, dur, vol, desde, hasta) {                      // soplo de selva: ruido marrón que se mueve de tono
    const t = ctx.currentTime + d, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; c[i] = last * 3.5; }
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(desde, t); f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); salida(g, 0.6); s.start(t); s.stop(t + dur + 0.05);
  }
  function wah(d) {                                                 // «¡uy!» que baja: trombón de juguete
    const t = ctx.currentTime + d, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(260, t + 1.0);
    caida(g, t, 0.14, 0.05, 1.1); o.connect(f); f.connect(g); salida(g, 0.3); o.start(t); o.stop(t + 1.15);
  }
  function boing(d) {                                               // «boing» suave al fallar: nunca castiga con ruido fuerte
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(230, t + 0.28);
    lfo.frequency.value = 9; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
    caida(g, t, 0.14, 0.01, 0.4); o.connect(g); salida(g, 0.3); o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5);
  }
  function gotaSonido(d) {                                          // gota de rocío: un «blup» que sube y se apaga
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.11);
    caida(g, t, 0.13, 0.004, 0.22); o.connect(g); salida(g, 0.45); o.start(t); o.stop(t + 0.3);
    marimba(0.09, 1174.66, 0.07, 0.45, 0.6);
  }
  function gong(d, f, vol) {                                        // gong metálico: parciales no armónicos con vaivén
    const t = ctx.currentTime + d;
    [[1, 1, 4.5], [2.76, 0.35, 3], [5.4, 0.18, 2], [8.93, 0.08, 1.2]].forEach((p) => {
      [0, 1.6].forEach((dt) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * p[0] + dt; caida(g, t, vol * p[1] * 0.5, 0.008, p[2]); o.connect(g); salida(g, 0.7); o.start(t); o.stop(t + p[2] + 0.05); });
    });
  }
  const ESCALA = [293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33];   // re menor: camino de selva
  const SONIDOS = {
    inicio() {                                                      // entrar a la selva: bombos y una marimba que sube
      golpe(0, 0.5, 150, 50, 0.6); golpe(0.24, 0.32, 140, 48, 0.5); golpe(0.48, 0.5, 150, 50, 0.6); golpe(0.7, 0.38, 130, 46, 0.5);
      [293.66, 349.23, 392, 440, 523.25, 587.33].forEach((f, i) => marimba(0.85 + i * 0.085, f, 0.17, 1.0, 1));
      pajaro(1.5); viento(0, 1.6, 0.05, 300, 1400);
    },
    dado() { for (let i = 0; i < 9; i++) madera(i * (0.06 + i * 0.012), 0.22); golpe(0.7, 0.4, 120, 50, 0.3); },
    clack(i) { madera(0, 0.16 + (Number(i) % 3) * 0.03); },         // cada rebote del dado
    paso(p) { madera(0, 0.04); marimba(0.01, ESCALA[Number(p) % ESCALA.length], 0.1, 0.42, 0.9); },   // cada casilla suma una nota
    retro(p) { marimba(0, ESCALA[Math.max(0, Number(p)) % ESCALA.length] * 0.5, 0.09, 0.5, 0.8); golpe(0.02, 0.1, 120, 60, 0.15, 0.1); },
    rocio() { gotaSonido(0); },
    pregunta() { marimba(0, 440, 0.15, 0.5); marimba(0.2, 587.33, 0.15, 0.8); pajaro(0.5); },
    acierto() { [392, 493.88, 587.33, 783.99].forEach((f, i) => marimba(i * 0.07, f, 0.15, 0.9)); golpe(0.12, 0.38, 150, 50, 0.5); pajaro(0.4); },
    error() { boing(0); },
    atajo() { viento(0, 0.45, 0.1, 300, 2800); [523.25, 587.33, 659.25, 783.99, 880].forEach((f, i) => marimba(0.12 + i * 0.05, f, 0.12, 0.45)); pajaro(0.35); },
    tormenta() { viento(0, 1.8, 0.22, 260, 700); golpe(0.1, 0.42, 110, 40, 0.5); golpe(0.36, 0.42, 110, 40, 0.5); golpe(0.62, 0.5, 100, 36, 0.7); wah(0.9); },
    pausa() { golpe(0, 0.4, 90, 42, 0.9); marimba(0.5, 220, 0.1, 1.3, 0.6); },
    escudo() { gong(0, 293.66, 0.22); },
    meta() {                                                        // fanfarria: rollo de bombos que se acelera + arpegio + pájaros + gong
      for (let i = 0; i < 10; i++) golpe(i * (0.11 - i * 0.004), 0.25 + i * 0.03, 150, 55, 0.35);
      [293.66, 349.23, 440, 587.33, 698.46, 880, 1046.5].forEach((f, i) => marimba(0.9 + i * 0.09, f, 0.16, 1.2));
      pajaro(1.7); pajaro(2.0); gong(1.5, 293.66, 0.16);
    },
    salida() { golpe(0, 0.32, 100, 48, 0.5); pajaro(0.2); }
  };
  function son(nombre, a) {
    const A = audio(); if (!A) return;
    try { SONIDOS[nombre](a); } catch (e) { /* un sonido nunca rompe el juego */ }
  }
  function vibra(p) { try { if (navigator.vibrate && !reducido()) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  const reducido = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };

  // ---------- Partida y pantalla ----------
  let E = null, $ = {}, ocupado = false, PIEZA = '🌱', VOLVER = null, BANCO = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const espera = (ms) => new Promise((r) => setTimeout(r, reducido() ? Math.min(ms, 60) : ms));
  const ref = (q) => `${q.cod} ${q.cap}:${q.v}`;
  const saldoVivero = () => { try { return window.TBInicio ? TBInicio.cargar().gotas.saldo : 0; } catch (e) { return 0; } };

  // Gotas para el Vivero: directo al saldo (TBInicio.ganarDirecto), sin tope diario. Sube el contador de la partida y vuela al saldo.
  function gota(n) {
    let k = 0; try { if (window.TBInicio && TBInicio.ganarDirecto) k = TBInicio.ganarDirecto(n) || 0; } catch (e) { k = 0; }
    if (!k) return;
    E.gotas += k; pintarEstado(); volarGotas(k);
  }
  function decir(titulo, cuerpo) {
    if (!$.texto) return;
    $.texto.innerHTML = `<b>${esc(titulo)}</b><span>${esc(cuerpo)}</span>`;
    $.bola.classList.remove('salta'); void $.bola.offsetWidth; $.bola.classList.add('salta');
  }
  // Partículas: gotas que vuelan de la pieza al saldo (visible aquí y en el Inicio)
  function volarGotas(n) {
    if (reducido() || !$.piezaIn || !$.chip) return;
    const o = $.piezaIn.getBoundingClientRect(), d = $.chip.getBoundingClientRect();
    const x0 = o.left + o.width / 2, y0 = o.top + o.height / 2, x1 = d.left + d.width / 2, y1 = d.top + d.height / 2;
    for (let i = 0; i < Math.min(n, 8); i++) {
      const g = document.createElement('span'); g.className = 'tbl-gota-vuela'; g.textContent = '💧'; document.body.appendChild(g);
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 90, my = Math.min(y0, y1) - 70 - Math.random() * 50;
      const a = g.animate([
        { transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 1 },
        { transform: `translate(${mx}px,${my}px) scale(1.15)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${x1}px,${y1}px) scale(.5)`, opacity: 0 }
      ], { duration: 820 + Math.random() * 200, delay: i * 90, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
      a.onfinish = () => { g.remove(); const c = $.chip; if (c) { c.classList.remove('pulso'); void c.offsetWidth; c.classList.add('pulso'); } };
    }
  }
  // Chispas al caer en una casilla o al completar una ronda
  function chispas(x, y, cant, color) {
    if (reducido()) return;
    for (let i = 0; i < cant; i++) {
      const s = document.createElement('span'); s.className = 'tbl-chispa'; s.style.background = color || '#ffe9a8'; document.body.appendChild(s);
      const ang = (i / cant) * Math.PI * 2 + Math.random() * 0.4, r = 26 + Math.random() * 22;
      const a = s.animate([{ transform: `translate(${x}px,${y}px) scale(1)`, opacity: 1 }, { transform: `translate(${x + Math.cos(ang) * r}px,${y + Math.sin(ang) * r}px) scale(.2)`, opacity: 0 }], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      a.onfinish = () => s.remove();
    }
  }
  function centroPieza() { const o = $.piezaIn.getBoundingClientRect(); return { x: o.left + o.width / 2, y: o.top + o.height / 2 }; }
  function sacudir() { if (!$.mesa || reducido()) return; $.mesa.classList.remove('sacude'); void $.mesa.offsetWidth; $.mesa.classList.add('sacude'); }
  function destello(fondo) {                                        // luz que cruza el tablero (tormenta: oscura; meta: dorada)
    if (!$.mesa || reducido()) return;
    const f = document.createElement('div'); f.className = 'tbl-flash'; f.style.background = fondo; $.mesa.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
  function hojas(cant) {                                            // hojas que vuelan por el tablero en una tormenta
    if (!$.mesa || reducido()) return;
    for (let i = 0; i < cant; i++) {
      const h = document.createElement('span'); h.className = 'tbl-hoja'; h.textContent = i % 3 === 0 ? '🍂' : '🍃'; $.mesa.appendChild(h);
      const dur = 1100 + Math.random() * 700;
      h.style.top = (10 + Math.random() * 80) + '%';
      const a = h.animate([{ transform: 'translate(-30px,0) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(300px,${(Math.random() - 0.5) * 60}px) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 }], { duration: dur, delay: i * 90, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = () => h.remove();
    }
  }
  function confeti() {
    if (reducido()) return;
    const c = document.createElement('div'); c.className = 'tbl-confeti'; const em = ['🍃', '💧', '✨', '🌿', '🥁'];
    for (let i = 0; i < 26; i++) { const s = document.createElement('span'); s.textContent = em[i % em.length]; s.style.left = (Math.random() * 100) + '%'; s.style.setProperty('--dx', ((Math.random() - 0.5) * 120) + 'px'); s.style.animationDelay = (Math.random() * 0.4) + 's'; c.appendChild(s); }
    document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
  }

  // Dado 3D: un cubo con seis caras. Gira hacia delante varias vueltas y se detiene mostrando el número.
  function pipsHTML(f) {
    const pips = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[f];
    let h = ''; for (let k = 0; k < 9; k++) h += '<i' + (pips.indexOf(k) >= 0 ? ' class="on"' : '') + '></i>'; return h;
  }
  function dadoEl() {
    const d = document.createElement('div'); d.className = 'tbl-dado3d';
    d.innerHTML = '<div class="tbl-cubo">' + [1, 2, 3, 4, 5, 6].map((f) => '<div class="tbl-cara c' + f + '">' + pipsHTML(f) + '</div>').join('') + '</div><span class="tbl-sombra"></span>';
    d._rot = { x: 0, y: 0 }; d.querySelector('.tbl-cubo').style.transform = 'rotateX(0deg) rotateY(0deg)';
    return d;
  }
  function rodarDado(el, v, i) {
    return new Promise((res) => {
      const cubo = el.querySelector('.tbl-cubo'), t = CARA[v], b = el._rot, quieto = reducido();
      const norm = (a) => ((a % 360) + 360) % 360;
      const sp = quieto ? 0 : (2 + Math.floor(Math.random() * 2)) * 360;      // dos o tres vueltas completas
      const nx = b.x + sp + norm(t[0] - b.x), ny = b.y + sp + norm(t[1] - b.y);   // siempre termina en la cara pedida
      el._rot = { x: nx, y: ny };
      el.classList.remove('rueda'); void el.offsetWidth; el.classList.add('rueda');
      cubo.style.transform = `rotateX(${nx}deg) rotateY(${ny}deg)`;
      if (!quieto) [0.26, 0.46, 0.62, 0.76, 0.88, 1.0].forEach((s, k) => setTimeout(() => son('clack', k + i * 2), s * 1000));   // un golpe por rebote
      setTimeout(() => { el.classList.remove('rueda'); res(); }, quieto ? 20 : 1150);
    });
  }
  // Pieza: salta en cada casilla; al retroceder se inclina hacia atrás
  function colocarPieza(dir) {
    const c = coord(E.pos); $.pieza.style.left = c.x + '%'; $.pieza.style.top = c.y + '%';
    if (dir === undefined || reducido()) return;
    $.piezaIn.classList.remove('salta', 'retro'); void $.piezaIn.offsetWidth; $.piezaIn.classList.add(dir > 0 ? 'salta' : 'retro');
  }
  function pintarCasillas(animar) {
    const tipos = casillasDeRonda(E.ronda);
    for (let p = 0; p <= META; p++) {
      const el = $.casillas[p]; if (!el) continue;
      const vis = p <= E.maxPos, key = vis ? 'v' + tipos[p] : 'o', antes = el.dataset.k;
      if (antes === key) continue;
      el.dataset.k = key; el.className = 'tbl-casilla ' + (vis ? 'tipo-' + tipos[p] : 'oculta');
      el.textContent = !vis ? '' : (p === 0 ? 'Salida' : ICONO[tipos[p]] || '');
      if (vis && animar && antes === 'o') { el.classList.add('revela'); setTimeout(() => el.classList.remove('revela'), 620); }
    }
  }
  function pintarEstado() {
    if (!$.estado) return;
    const pos = E.pos === 0 ? 'Salida' : 'Casilla ' + E.pos + ' de ' + META;
    $.estado.innerHTML = `<span class="tbl-chip">${esc(NOMBRES[Math.min(E.ronda, 4) - 1])} · Ronda ${E.ronda}</span><span class="tbl-chip">${pos}</span><span class="tbl-chip" data-chip="saldo" title="Saldo del Vivero: el mismo que ves en Inicio">💧 ${saldoVivero()}</span><span class="tbl-chip" title="Escudos guardados">🛡 ${E.escudos}</span>${E.pausa ? '<span class="tbl-chip">⏸ Descanso pendiente</span>' : ''}`;
    $.chip = $.estado.querySelector('[data-chip=saldo]');
    if ($.mesa) $.mesa.classList.toggle('con-escudo', E.escudos > 0);
  }
  function pintarPanel() {
    if (!$.panel || $.panel.dataset.modo === 'pregunta') return;
    $.panel.dataset.modo = 'botones';
    $.panel.innerHTML = `<div class="tbl-acciones"><button type="button" class="tbl-btn" id="tblLanzar"${ocupado ? ' disabled' : ''}>🎲 Lanzar dado</button><button type="button" class="tbl-btn sec" id="tblBonus"${ocupado || E.bonus <= 0 ? ' disabled' : ''}>Dados de bonus (${E.bonus})</button></div><p class="tbl-nota">Tu avance se guarda: puedes cerrar la app y volver aquí.</p>`;
    $.lanzar = document.getElementById('tblLanzar'); $.bonus = document.getElementById('tblBonus');
    if ($.lanzar) $.lanzar.addEventListener('click', () => turno(false));
    if ($.bonus) $.bonus.addEventListener('click', () => turno(true));
  }
  function pintarTodo() { pintarEstado(); colocarPieza(); pintarCasillas(false); pintarPanel(); }

  // ---------- Movimiento ----------
  async function tirar(n) {
    const els = n === 2 ? [$.d1, $.d2] : [$.d1];
    $.d2.hidden = n !== 2;
    const vals = els.map(() => 1 + Math.floor(Math.random() * 6));
    await Promise.all(els.map((el, i) => rodarDado(el, vals[i], i)));
    return vals;
  }
  async function avanzar(n) {                                       // n > 0 avanza; n < 0 retrocede. Nunca antes de la salida ni pasando la meta.
    const paso = n > 0 ? 1 : -1; let k = Math.abs(n);
    const agil = paso > 0 && k >= 2 ? 0.6 : 1;                      // atajo y tiradas largas: un poco más ágil
    while (k-- > 0) {
      const sig = E.pos + paso; if (sig < 0 || sig > META) break;
      E.pos = sig; E.maxPos = Math.max(E.maxPos, E.pos);
      colocarPieza(paso); pintarCasillas(true); pintarEstado();
      son(paso > 0 ? 'paso' : 'retro', E.pos);
      await espera((paso > 0 ? 260 : 320) * agil);
      if (E.pos === META) break;
    }
    guardar();
  }
  async function turno(bonus) {
    if (ocupado) return;
    if (E.pausa && !bonus) {                                        // la pausa cuesta un turno: no se tira el dado
      E.pausa = false; guardar(); decir('Descanso', 'Descansas este turno. Lanza cuando quieras.'); son('pausa'); pintarTodo(); return;
    }
    if (bonus && E.bonus <= 0) return;
    ocupado = true; pintarPanel();
    try {
      if (bonus) E.bonus--;
      const vals = await tirar(bonus ? 2 : 1), total = vals.reduce((a, b) => a + b, 0);
      decir(bonus ? 'Dado de bonus' : 'Tu tirada', `Sacaste ${total}. Avanzas ${total} ${total === 1 ? 'casilla' : 'casillas'}.`);
      await espera(380);
      await avanzar(total);
      await llegada();
    } finally { ocupado = false; guardar(); pintarTodo(); }
  }
  // Efecto de la casilla donde cayó. Los movimientos extra (atajo, pregunta acertada, tormenta) no encadenan efectos; solo la meta.
  async function llegada() {
    if (E.pos === 0) return;
    if (E.pos === META) return ronda();
    const t = tipoEn(E.ronda, E.pos), c = centroPieza();
    if (t === 'rocio') { gota(1); chispas(c.x, c.y, 6, '#bfe6ff'); decir('Rocío', 'Una gota de rocío para tu Vivero.'); son('rocio'); }
    else if (t === 'pregunta') { chispas(c.x, c.y, 5, '#fff1b8'); await pregunta(); }
    else if (t === 'atajo') { const k = Math.random() < 0.5 ? 2 : 3; decir('Atajo', `El camino se acorta: avanzas ${k} casillas.`); son('atajo'); chispas(c.x, c.y, 10, '#b8f0a6'); await espera(380); await avanzar(k); if (E.pos === META) return ronda(); }
    else if (t === 'tormenta') { await tormenta(); }
    else if (t === 'pausa') { E.pausa = true; gota(2); decir('Descanso', 'Pierdes un turno, pero ganas 2 gotas.'); son('pausa'); }
    else if (t === 'escudo') {
      if (E.escudos < 2) { E.escudos++; decir('Escudo', `Guardas un escudo (tienes ${E.escudos}). Detiene una tormenta.`); chispas(c.x, c.y, 8, '#cfe9f5'); }
      else { gota(1); decir('Escudo lleno', 'Ya tienes 2 escudos: esta vez ganas una gota.'); }
      son('escudo');
    }
    guardar();
  }
  async function tormenta() {
    son('tormenta'); sacudir(); destello('radial-gradient(circle,rgba(60,90,120,.1),rgba(15,25,45,.6))'); hojas(7); vibra([90, 50, 90]);
    if (E.escudos > 0) {
      E.escudos--; const c = centroPieza(); chispas(c.x, c.y, 12, '#cfe9f5'); gota(1);
      decir('¡Tormenta!', 'Tu escudo la detuvo. Sigues en tu lugar y ganas una gota.');
      return;
    }
    const r = 1 + Math.floor(Math.random() * 3);
    gota(1);                                                        // lo que deja la tormenta: siempre algo a cambio
    decir('¡Tormenta!', `Retrocedes ${r} ${r === 1 ? 'casilla' : 'casillas'}. Lo que deja la tormenta: una gota.`);
    await espera(750); await avanzar(-r);
  }
  // Pregunta de lo leído: acierto = 1 casilla extra y 2 gotas. Fallo = sin castigo: ves la respuesta y el versículo.
  async function cargarBanco() {
    if (BANCO) return BANCO;
    try { const r = await fetch('datos/juego_raices.json'); const j = await r.json(); BANCO = Array.isArray(j.preguntas) ? j.preguntas : []; } catch (e) { BANCO = []; }
    return BANCO;
  }
  function elegirPregunta(bank) {
    const L = (() => { try { return JSON.parse(localStorage.getItem(K_LEIDOS)) || {}; } catch (e) { return {}; } })();
    const leidas = bank.filter((q) => L[q.cod + '.' + q.cap]);
    const base = leidas.length ? leidas : bank, vistas = E.vistas || [];
    const nuevas = base.filter((q) => vistas.indexOf(q.id) < 0), pool = nuevas.length ? nuevas : base;
    const q = pool[Math.floor(Math.random() * pool.length)];
    E.vistas = vistas.concat(q.id).slice(-20);
    return { q, general: !leidas.length };
  }
  async function pregunta() {
    const bank = await cargarBanco();
    if (!bank.length) { decir('Pregunta', 'Hoy no hay preguntas disponibles. Sigues sin castigo.'); return; }
    const { q, general } = elegirPregunta(bank);
    decir('Pregunta', 'Responde para avanzar un poco más.');
    await new Promise((resolver) => {
      $.panel.dataset.modo = 'pregunta';
      $.panel.innerHTML = `<div class="tbl-preg"><p class="tbl-preg-cab">${general ? 'Pregunta general: aún no marcas capítulos como leídos' : 'De lo que leíste'}</p><p class="tbl-preg-txt">${esc(q.p)}</p><div class="tbl-opc">${q.o.map((o, i) => `<button type="button" class="tbl-btn sec" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`;
      $.panel.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.o), bien = i === q.c, caja = $.panel.querySelector('.tbl-preg');
        $.panel.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; x.classList.toggle('elegida', Number(x.dataset.o) === i); });
        const res = bien ? `¡Acertaste! Avanzas 1 casilla extra y ganas 2 gotas. Versículo: ${ref(q)}.` : `La respuesta era: ${q.o[q.c]}. Versículo: ${ref(q)}. Sigues en tu lugar.`;
        $.panel.insertAdjacentHTML('beforeend', `<p class="tbl-preg-res">${esc(res)}</p><button type="button" class="tbl-btn" id="tblSeguir">Seguir</button>`);
        caja.classList.add(bien ? 'ok' : 'mal');
        son(bien ? 'acierto' : 'error');
        if (bien) { gota(2); const c = centroPieza(); chispas(c.x, c.y, 12, '#ffe9a8'); }
        guardar();
        document.getElementById('tblSeguir').addEventListener('click', async () => {
          $.panel.dataset.modo = 'botones'; $.panel.innerHTML = '';
          if (bien) { await avanzar(1); if (E.pos === META) await ronda(); }
          resolver();
        });
      }));
    });
  }
  // Meta: suma 10 gotas y un dado de bonus; empieza la ronda siguiente.
  function aviso(titulo, cuerpo, boton) {
    return new Promise((r) => {
      $.aviso.innerHTML = `<div class="tbl-aviso-caja"><b>${esc(titulo)}</b><p>${esc(cuerpo)}</p><button type="button" class="tbl-btn" id="tblAvisoOk">${esc(boton)}</button></div>`;
      $.aviso.hidden = false;
      document.getElementById('tblAvisoOk').addEventListener('click', () => { $.aviso.hidden = true; r(); });
    });
  }
  async function ronda() {
    const hecha = E.ronda;
    E.rondas++; gota(10);
    E.ronda = hecha + 1; E.pos = 0; E.maxPos = 0; E.bonus += 1; E.pausa = false;
    guardar();
    son('meta'); confeti(); destello('radial-gradient(circle,rgba(255,220,120,.15),rgba(255,200,80,.55))'); vibra([60, 40, 60, 40, 120]);
    const c = centroPieza(); chispas(c.x, c.y, 16, '#ffd45c');
    const fase1 = hecha === 3 ? ' Completaste las tres rondas de la Fase 1. Puedes seguir: las rondas nuevas se afinan en la Fase 2.' : '';
    pintarTodo();
    await aviso(`¡Ronda ${hecha} completa!`, `Ganas 10 gotas y un dado de bonus.${fase1} Empieza ${NOMBRES[Math.min(E.ronda, 4) - 1]}.`, 'Seguir');
    decir('Nueva ronda', `Empiezas ${NOMBRES[Math.min(E.ronda, 4) - 1]}. Lanza el dado.`);
  }

  // ---------- Pantalla ----------
  function abrir(volver, opc) {
    opc = opc || {}; VOLVER = volver; PIEZA = opc.pieza || '🌱';
    const main = document.getElementById('pantalla'); if (!main) return;
    E = cargar(); ocupado = false; $ = {};
    main.innerHTML = `<section class="tbl" id="tbl" aria-label="Tablero de Tierra Buena">
      <button type="button" class="volver" id="tblVolver">‹ Juegos</button>
      <h1>Tablero de Tierra Buena</h1><div class="filete"></div>
      <p class="suave tbl-intro">Avanza por el camino. Cada casilla trae algo: rocío, una pregunta, un atajo o una tormenta. Un escudo la detiene.</p>
      <div class="tbl-estado" id="tblEstado"></div>
      <div class="tbl-bola" id="tblBola" aria-live="polite"><p id="tblTexto"></p></div>
      <div class="tbl-mesa" id="tblMesa">
        <div class="tbl-campo"></div>
        <div id="tblCasillas"></div>
        <div class="tbl-pieza" id="tblPieza" aria-label="Tu pieza"><span class="tbl-pieza-in" id="tblPiezaIn">${esc(PIEZA)}</span></div>
        <div class="tbl-aviso" id="tblAviso" hidden></div>
      </div>
      <div class="tbl-bandeja" id="tblBandeja"></div>
      <div class="tbl-panel" id="tblPanel"></div>
    </section>`;
    $.mesa = document.getElementById('tblMesa'); $.estado = document.getElementById('tblEstado'); $.bola = document.getElementById('tblBola'); $.texto = document.getElementById('tblTexto');
    $.pieza = document.getElementById('tblPieza'); $.piezaIn = document.getElementById('tblPiezaIn'); $.aviso = document.getElementById('tblAviso'); $.panel = document.getElementById('tblPanel');
    $.d1 = dadoEl(); $.d2 = dadoEl(); $.d2.hidden = true;
    const band = document.getElementById('tblBandeja'); band.appendChild($.d1); band.appendChild($.d2);
    const cont = document.getElementById('tblCasillas'); $.casillas = {};
    for (let p = 0; p <= META; p++) {
      const c = coord(p), el = document.createElement('div');
      el.className = 'tbl-casilla oculta'; el.style.left = c.x + '%'; el.style.top = c.y + '%'; el.dataset.k = 'o'; cont.appendChild(el); $.casillas[p] = el;
    }
    document.getElementById('tblVolver').addEventListener('click', () => { son('salida'); if (typeof volver === 'function') volver(); });
    pintarTodo();
    decir('Bienvenido', E.pos === 0 ? 'Lanza el dado para empezar el camino.' : 'Sigues donde te quedaste. Lanza el dado cuando quieras.');
    son('inicio');
  }

  window.TBTablero = {
    abrir,
    // expuesto para pruebas (no usar desde la interfaz)
    _t: { casillasDeRonda, coord, PESOS, META, FILAS, COLS, TRAMPA, tipoEn, semilla, nuevoEstado, ICONO, SONIDOS, audio, CARA }
  };
})();
