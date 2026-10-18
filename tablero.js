// tablero.js — Tablero de Tierra Buena (F1126). Diseño: diseno/DISENO_TABLERO_JUEGOS.md.
// Cada tablero tiene 10 niveles. Cada nivel pasado enciende una luz. Las luces y el nivel crecen la dificultad:
// más casillas, retrocesos más largos y preguntas más difíciles. Desde el nivel 5, el «Ladrón de rocío» quita una gota por cada luz encendida.
// Gotas: directo al saldo del Vivero (TBInicio.ganarDirecto / restarDirecto), el mismo número que en el Inicio.
// Cada tablero es un lugar turístico de Chile con una leyenda. Sonido propio de la selva. Respeta el interruptor de Perfil.
'use strict';
(function () {
  const K = 'tb_movil_tablero', K_LEIDOS = 'tb_movil_leidos', K_SON = 'tb_movil_sonido';
  const NIVELES = 10;
  // Lugares turísticos de Chile, con una leyenda corta de tono místico (cada tablero toma uno).
  const TEMAS = [
    { nombre: 'Rapa Nui', lugar: 'Ahu y moáis', icono: '🗿', cielo: '#f2d7a0', campo: '#2f5f57', aura: '#ffd45c', deco: ['moai', 'ola', 'flor', 'sol'], leyenda: 'Los moáis miran al mar y guardan silencio. Dicen que a veces, en la noche, se mueven un poco.' },
    { nombre: 'Atacama', lugar: 'Valle de la Luna', icono: '🌵', cielo: '#f0c59a', campo: '#7a4f33', aura: '#ffb36b', deco: ['cactus', 'sol', 'montana', 'ave'], leyenda: 'Bajo la luna, las sombras de las rocas cuentan historias que el desierto nunca olvidó.' },
    { nombre: 'Chiloé', lugar: 'Iglesias y palafitos', icono: '⛪', cielo: '#cfe3d6', campo: '#2b5246', aura: '#8fe3c4', deco: ['pez', 'arbol', 'concha', 'ave'], leyenda: 'La Pincoya baila sobre la marea cuando el mar está en paz. Quien la ve, vuelve.' },
    { nombre: 'Torres del Paine', lugar: 'Patagonia', icono: '🏔️', cielo: '#d3dcea', campo: '#3a4c5c', aura: '#9fd8ff', deco: ['montana', 'ave', 'arbol', 'sol'], leyenda: 'El viento patagónico lleva los secretos de los cerros de un lado al otro del lago.' },
    { nombre: 'Lauca', lugar: 'Altiplano', icono: '🌋', cielo: '#eadac4', campo: '#5f6039', aura: '#f2c48d', deco: ['llama', 'montana', 'flor', 'sol'], leyenda: 'Los volcanes vigilan el agua de los antiguos. Las vicuñas conocen un camino escondido.' },
    { nombre: 'Valparaíso', lugar: 'Cerros y ascensores', icono: '🚠', cielo: '#f5cfb0', campo: '#463b5a', aura: '#ffb08a', deco: ['ave', 'sol', 'flor', 'concha'], leyenda: 'Al anochecer los cerros se encienden como un tesoro entre las casas de colores.' },
    { nombre: 'Cajón del Maipo', lugar: 'Cordillera', icono: '🏞️', cielo: '#d6eacf', campo: '#3a5f43', aura: '#9ee0a6', deco: ['arbol', 'ola', 'flor', 'ave'], leyenda: 'Un río cantarín guía a quien busca la montaña. Dicen que el agua recuerda a quien la visita.' },
    { nombre: 'Juan Fernández', lugar: 'Isla lejana', icono: '🏝️', cielo: '#c0e4e9', campo: '#2b5a62', aura: '#8ee3e8', deco: ['concha', 'pez', 'cangrejo', 'ola'], leyenda: 'Una isla en medio del mar guarda huellas de quien esperó mucho tiempo por volver.' },
    { nombre: 'Desierto florido', lugar: 'Atacama en primavera', icono: '🌸', cielo: '#ffd9ec', campo: '#7d5a7a', aura: '#ffb3dc', deco: ['flor', 'mariposa', 'cactus', 'sol'], leyenda: 'Tras la lluvia escasa, el desierto despierta de colores. Las flores esperan años para salir y florecer una sola vez.' },
    { nombre: 'Costa', lugar: 'Pacífico', icono: '🌊', cielo: '#d2ebff', campo: '#2d5f7a', aura: '#9fd3ff', deco: ['cangrejo', 'concha', 'pez', 'ola'], leyenda: 'Las olas guardan canciones viejas. Quien escucha con calma, aprende a esperar la marea.' },
    { nombre: 'Bosque nativo', lugar: 'Alerce Andino', icono: '🌳', cielo: '#cfe8c4', campo: '#2a4d31', aura: '#b8f0a6', deco: ['arbol', 'hongo', 'ave', 'flor'], leyenda: 'Los alerces crecen despacio, pero viven siglos. Cada anillo de su tronco cuenta un año de paciencia.' }
  ];
  const tema = (t) => TEMAS[(t - 1) % TEMAS.length];
  // F1140 · Sala de tableros: lugares completados (aparte del progreso). Jugar de nuevo no los cambia.
  const K_HECHOS = 'tb_movil_tableros_hechos';
  let REPLAY = null, VOLVER = null, SALA = null;   // SALA: lleva a la Sala de tableros desde la mesa                                   // REPLAY: id de un tablero que se juega de nuevo (no guarda progreso)
  function hechosLeer() { try { const a = JSON.parse(localStorage.getItem(K_HECHOS) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function hechoRegistrar(id) { const a = hechosLeer(); if (a.indexOf(id) < 0) a.push(id); try { localStorage.setItem(K_HECHOS, JSON.stringify(a)); } catch (e) { /* sin espacio */ } }
  const RANGO = (n) => Math.min(2 + Math.floor((n - 1) / 2), 6);     // casillas que puede retroceder una tormenta en el nivel n
  const CASILLAS = (n) => 18 + 3 * (n - 1);                           // casillas de juego en el nivel n (sin salida ni meta)
  const TRAMPA = { tormenta: 1, pausa: 1, ladron: 1, remolino: 1 };
  const TIPOS = ['rocio', 'pregunta', 'atajo', 'tormenta', 'pausa', 'escudo', 'cofre', 'relampago', 'ladron', 'remolino', 'arreo', 'memoria', 'cosecha', 'puerta'];
  const ICONO = { rocio: '💧', pregunta: '❓', atajo: '⤴', tormenta: '🌪', pausa: '⏸', escudo: '🛡', cofre: '🎁', relampago: '⚡', ladron: '🦹', remolino: '🌀', meta: '🏁', arreo: '🐑', memoria: '🃏', cosecha: '🧺', puerta: '🚪' };

  // ---------- Pesos por nivel: más niveles = menos rocío y más trampas. Se normalizan para sumar 1. ----------
  function pesosDe(n) {
    const w = {
      rocio: Math.max(0.2, 0.40 - 0.02 * (n - 1)), pregunta: 0.18 + 0.006 * (n - 1), atajo: 0.10, tormenta: 0.07 + 0.005 * (n - 1),
      pausa: 0.05, escudo: 0.08, cofre: n >= 2 ? 0.04 : 0, relampago: 0.04, arreo: 0.05, memoria: 0.05, cosecha: 0.04, puerta: 0.05,
      ladron: n >= 5 ? 0.05 : 0, remolino: n >= 7 ? 0.04 : 0
    };
    const suma = Object.keys(w).reduce((a, k) => a + w[k], 0);
    Object.keys(w).forEach((k) => { w[k] = w[k] / suma; });
    return w;
  }
  function semilla(n) {
    let s = n >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const cuenta = (out, tipo, C) => { let c = 0; for (let p = 1; p <= C; p++) if (out[p] === tipo) c++; return c; };
  const cacheNivel = {};
  // Un nivel de un tablero: casillas 1..C, salida 0 y meta C+1. Siempre sale igual (semilla por tablero y nivel).
  function nivelDe(t, n) {
    const clave = t + ':' + n; if (cacheNivel[clave]) return cacheNivel[clave];
    const C = CASILLAS(n), rnd = semilla(t * 1009 + n * 7919 + 17), w = pesosDe(n);
    const out = { 0: 'salida' }; out[C + 1] = 'meta';
    let previa = 'salida';
    for (let p = 1; p <= C; p++) {
      const r = rnd(); let acc = 0, tipo = 'rocio';
      for (const k of TIPOS) { acc += w[k] || 0; if (r < acc) { tipo = k; break; } }
      if (p <= 2 && TRAMPA[tipo]) tipo = 'rocio';                    // la salida nunca castiga
      if (TRAMPA[tipo] && TRAMPA[previa]) tipo = 'rocio';           // dos trampas seguidas no
      out[p] = tipo; previa = tipo;
    }
    // mínimos por nivel: cada tipo aparece al menos una vez cuando ya toca
    [['escudo', 1], ['tormenta', n === 1 ? 1 : 2], ['cofre', n >= 2 ? 1 : 0], ['relampago', 1], ['ladron', n >= 5 ? 1 : 0], ['remolino', n >= 7 ? 1 : 0]].forEach((par) => {
      let c = cuenta(out, par[0], C);
      for (let i = 0; c < par[1] && i < 800; i++) {
        const p = 3 + Math.floor(rnd() * (C - 4));                    // casillas 3 .. C-2
        if (out[p] !== 'rocio') continue;
        if (TRAMPA[par[0]] && (TRAMPA[out[p - 1]] || TRAMPA[out[p + 1]])) continue;
        out[p] = par[0]; c++;
      }
    });
    return (cacheNivel[clave] = { tipos: out, C, meta: C + 1 });
  }
  // Posiciones de las casillas en un anillo de esquinas redondeadas alrededor de la bola (px del tablero -> %).
  // Las esquinas redondeadas mantienen la misma separación en las curvas (con esquinas vivas las casillas se juntaban).
  function anillo(N, w, h) {
    const m = 26, x0 = m, x1 = w - m, y0 = m, y1 = h - m, r = Math.max(10, Math.min(56, (x1 - x0) / 5));
    const a = y1 - y0 - 2 * r, b = x1 - x0 - 2 * r, q = (Math.PI * r) / 2;
    const seg = [
      { len: a, f: (t) => [x0, y1 - r - t] },                                                         // izquierda, hacia arriba
      { len: q, f: (t) => { const th = Math.PI + t / r; return [x0 + r + r * Math.cos(th), y0 + r + r * Math.sin(th)]; } },
      { len: b, f: (t) => [x0 + r + t, y0] },                                                          // arriba, hacia la derecha
      { len: q, f: (t) => { const th = -Math.PI / 2 + t / r; return [x1 - r + r * Math.cos(th), y0 + r + r * Math.sin(th)]; } },
      { len: a, f: (t) => [x1, y0 + r + t] },                                                          // derecha, hacia abajo
      { len: q, f: (t) => { const th = t / r; return [x1 - r + r * Math.cos(th), y1 - r + r * Math.sin(th)]; } },
      { len: b, f: (t) => [x1 - r - t, y1] },                                                          // abajo, hacia la izquierda
      { len: q, f: (t) => { const th = Math.PI / 2 + t / r; return [x0 + r + r * Math.cos(th), y1 - r + r * Math.sin(th)]; } }
    ];
    const P = seg.reduce((acc, g) => acc + g.len, 0), out = [];
    for (let k = 0; k < N; k++) {
      let s = (k * P) / N, g = seg[0];
      for (let i = 0; i < seg.length; i++) { g = seg[i]; if (s <= g.len || i === seg.length - 1) break; s -= g.len; }
      const pt = g.f(Math.min(s, g.len));
      out.push({ x: pt[0] / w * 100, y: pt[1] / h * 100 });
    }
    return out;
  }

  // F1165 · Encaje del trazo: se achica en torno a su centro (misma forma, mismo espaciado) hasta que cada casilla
  // quede dentro del campo con 4 px de aire y ninguna pise a otra. Devuelve las coordenadas en % y el tamaño de casilla.
  function encajar(base, w, h) {
    const P = base.map((c) => ({ x: c.x * w / 100, y: c.y * h / 100 })), N = P.length;
    let sep0 = 1e9, cheb0 = 1e9;                                     // mínimos entre TODOS los pares (no solo vecinas): distancia y separación por eje
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      sep0 = Math.min(sep0, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y));
      cheb0 = Math.min(cheb0, Math.max(Math.abs(P[i].x - P[j].x), Math.abs(P[i].y - P[j].y)));
    }
    const xs = P.map((p) => p.x), ys = P.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    let cs = 16, s = 1;
    for (let cand = 42; cand >= 16; cand--) {                        // la casilla más grande que cabe
      const pad = cand / 2 + 16;                                     // 12 px del campo + 4 px de aire
      s = Math.max(0.3, Math.min(1, (cx - pad) / (cx - minX), (w - pad - cx) / (maxX - cx), (cy - pad) / (cy - minY), (h - pad - cy) / (maxY - cy)));
      // cuadrados: en diagonal se pisan si la separación por eje es menor que el lado, por eso el tope es también 0,9 × esa separación
      cs = Math.max(16, Math.min(42, Math.floor(Math.min(sep0 * 0.86, cheb0 * 0.9) * s)));
      if (cs <= cand) break;
    }
    const coords = P.map((p) => ({ x: (cx + (p.x - cx) * s) / w * 100, y: (cy + (p.y - cy) * s) / h * 100 }));
    return { coords, cs };
  }
  // F1152 · Caminos que cambian por nivel: anillo, ondas (un anillo con olas) y trébol (cuatro lóbulos). Todos rodean la bola
  // y las casillas quedan a la misma distancia entre sí, igual que el anillo.
  function trazo(nivel, N, w, h) {
    const forma = ['anillo', 'ondas', 'trebol'][(nivel - 1) % 3];
    if (forma === 'anillo') return anillo(N, w, h);
    const cx = w / 2, cy = h * 0.46, ax = (w - 52) / 2, ay = (h - 52) / 2, M = 720;
    const pts = [];
    for (let i = 0; i < M; i++) {
      const t = (i / M) * Math.PI * 2;
      const r = forma === 'ondas' ? 0.9 + 0.1 * Math.sin(5 * t) : 0.84 + 0.16 * Math.cos(2 * t) ** 2;
      pts.push([cx + ax * r * Math.cos(t), cy + ay * r * Math.sin(t)]);
    }
    // Reparte N casillas por longitud de arco (distancia igual entre vecinas)
    const acum = [0];
    for (let i = 1; i <= M; i++) { const a = pts[i - 1], b = pts[i % M]; acum.push(acum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = acum[M], out = [];
    let j = 0;
    for (let k = 0; k < N; k++) {
      const s = (k * L) / N;
      while (j < M && acum[j + 1] < s) j++;
      const seg = acum[j + 1] - acum[j] || 1, f = (s - acum[j]) / seg, a = pts[j], b = pts[(j + 1) % M];
      out.push({ x: (a[0] + (b[0] - a[0]) * f) / w * 100, y: (a[1] + (b[1] - a[1]) * f) / h * 100 });
    }
    return out;
  }

  // ---------- Estado (en este teléfono; la clave entra en SYNC_CLAVES de app.js) ----------
  const nuevoEstado = () => ({ v: 2, tablero: 1, nivel: 1, pos: 0, maxPos: 0, escudos: 0, bonus: 0, pausa: false, gotas: 0, luces: 0, niveles: 0, vistas: [], ultima: null });
  function cargar() {
    try {
      const v = JSON.parse(localStorage.getItem(K));
      if (v && v.v === 2 && v.nivel >= 1 && v.nivel <= NIVELES && v.pos >= 0) return Object.assign(nuevoEstado(), v);
      if (v && v.v === 1) {                                           // versión anterior (rondas de 30): se pasa a niveles
        const n = Math.min(Math.max(1, v.ronda || 1), NIVELES);
        return Object.assign(nuevoEstado(), { nivel: n, luces: n - 1, gotas: v.gotas || 0, escudos: v.escudos || 0, bonus: v.bonus || 0, niveles: n - 1 });
      }
    } catch (e) { /* sin datos */ }
    return nuevoEstado();
  }
  function guardar() { if (REPLAY) return; try { localStorage.setItem(K, JSON.stringify(E)); } catch (e) { /* sin espacio */ } }

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
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
        master.connect(comp); comp.connect(ctx.destination);
        const n = Math.floor(ctx.sampleRate * 2.4), b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
        verb = ctx.createConvolver(); verb.buffer = b;
        const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(comp);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function salida(nodo, humedo) {
    nodo.connect(master);
    if (humedo) { const g = ctx.createGain(); g.gain.value = humedo; nodo.connect(g); g.connect(verb); }
  }
  function caida(g, t, vol, atk, vida) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.setTargetAtTime(0.0001, t + atk, vida / 4); }
  function ruido(d, dur, vol, frec, tipo, q, hasta, humedo) {
    const t = ctx.currentTime + d, n = Math.max(1, Math.floor(ctx.sampleRate * dur)), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = tipo || 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(frec, t);
    if (hasta) f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); caida(g, t, vol, Math.min(0.008, dur * 0.25), dur);
    s.connect(f); f.connect(g); salida(g, humedo || 0); s.start(t); s.stop(t + dur + 0.05);
  }
  function golpe(d, vol, f0, f1, vida, humedo) {
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0 || 160, t); o.frequency.exponentialRampToValueAtTime(f1 || 55, t + 0.12);
    caida(g, t, vol, 0.003, vida || 0.5); o.connect(g); salida(g, humedo == null ? 0.2 : humedo); o.start(t); o.stop(t + (vida || 0.5) + 0.05);
    ruido(d, 0.05, vol * 0.45, 900, 'bandpass', 0.8);
    ruido(d, 0.012, vol * 0.3, 3200, 'highpass', 0.5);
  }
  function madera(d, vol) { ruido(d, 0.035, vol, 2200 + Math.random() * 900, 'bandpass', 6, 0, 0.15); }
  function marimba(d, f, vol, dur, brillo) {
    const t = ctx.currentTime + d;
    [[f, 'triangle', 1, dur], [f * 4, 'sine', 0.14 * (brillo || 1), dur * 0.22]].forEach((p) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = p[1]; o.frequency.value = p[0];
      caida(g, t, vol * p[2], 0.002, p[3]); o.connect(g); salida(g, 0.35); o.start(t); o.stop(t + p[3] + 0.05);
    });
    ruido(d, 0.02, vol * 0.4, f * 3, 'bandpass', 3);
  }
  function pajaro(d) {
    [[0, 2300, 3100, 0.05], [0.12, 2700, 3500, 0.045], [0.23, 2100, 2900, 0.04]].forEach((p) => {
      const t = ctx.currentTime + d + p[0], o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(p[1], t); o.frequency.exponentialRampToValueAtTime(p[2], t + 0.07);
      lfo.frequency.value = 32; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
      caida(g, t, p[3], 0.006, 0.1); o.connect(g); salida(g, 0.5);
      o.start(t); o.stop(t + 0.14); lfo.start(t); lfo.stop(t + 0.14);
    });
  }
  function viento(d, dur, vol, desde, hasta) {
    const t = ctx.currentTime + d, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), c = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; c[i] = last * 3.5; }
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.setValueAtTime(desde, t); f.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); salida(g, 0.6); s.start(t); s.stop(t + dur + 0.05);
  }
  function wah(d) {
    const t = ctx.currentTime + d, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(110, t + 1.0);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(260, t + 1.0);
    caida(g, t, 0.14, 0.05, 1.1); o.connect(f); f.connect(g); salida(g, 0.3); o.start(t); o.stop(t + 1.15);
  }
  function remolinoSonido(d) {                                      // remolino: viento que da vueltas (tono que sube y baja)
    viento(d, 1.4, 0.2, 200, 1800); viento(d + 0.5, 1.0, 0.14, 1800, 200);
    [0, 0.3, 0.6, 0.9].forEach((x) => golpe(d + x, 0.12, 90, 45, 0.3, 0.1));
  }
  function ladronSonido(d) {                                        // ladrón: notas graves que se alejan a escondidas
    [392, 329.63, 261.63, 196].forEach((f, i) => marimba(d + i * 0.14, f, 0.1, 0.7, 0.5));
    viento(d + 0.2, 0.9, 0.06, 500, 180);
  }
  function boing(d) {
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(230, t + 0.28);
    lfo.frequency.value = 9; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency);
    caida(g, t, 0.14, 0.01, 0.4); o.connect(g); salida(g, 0.3); o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5);
  }
  function gotaSonido(d) {
    const t = ctx.currentTime + d, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(620, t + 0.11);
    caida(g, t, 0.13, 0.004, 0.22); o.connect(g); salida(g, 0.45); o.start(t); o.stop(t + 0.3);
    marimba(0.09, 1174.66, 0.07, 0.45, 0.6);
  }
  function gong(d, f, vol) {
    const t = ctx.currentTime + d;
    [[1, 1, 4.5], [2.76, 0.35, 3], [5.4, 0.18, 2], [8.93, 0.08, 1.2]].forEach((p) => {
      [0, 1.6].forEach((dt) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * p[0] + dt; caida(g, t, vol * p[1] * 0.5, 0.008, p[2]); o.connect(g); salida(g, 0.7); o.start(t); o.stop(t + p[2] + 0.05); });
    });
  }
  const ESCALA = [293.66, 329.63, 349.23, 392, 440, 466.16, 523.25, 587.33];
  const SONIDOS = {
    inicio() {
      golpe(0, 0.5, 150, 50, 0.6); golpe(0.24, 0.32, 140, 48, 0.5); golpe(0.48, 0.5, 150, 50, 0.6); golpe(0.7, 0.38, 130, 46, 0.5);
      [293.66, 349.23, 392, 440, 523.25, 587.33].forEach((f, i) => marimba(0.85 + i * 0.085, f, 0.17, 1.0, 1));
      pajaro(1.5); viento(0, 1.6, 0.05, 300, 1400);
    },
    dado() { for (let i = 0; i < 9; i++) madera(i * (0.06 + i * 0.012), 0.22); golpe(0.7, 0.4, 120, 50, 0.3); },
    clack(i) { madera(0, 0.16 + (Number(i) % 3) * 0.03); },
    paso(p) { madera(0, 0.04); marimba(0.01, ESCALA[Number(p) % ESCALA.length], 0.1, 0.42, 0.9); },
    retro(p) { marimba(0, ESCALA[Math.max(0, Number(p)) % ESCALA.length] * 0.5, 0.09, 0.5, 0.8); golpe(0.02, 0.1, 120, 60, 0.15, 0.1); },
    rocio() { gotaSonido(0); },
    pregunta() { marimba(0, 440, 0.15, 0.5); marimba(0.2, 587.33, 0.15, 0.8); pajaro(0.5); },
    acierto() { [392, 493.88, 587.33, 783.99].forEach((f, i) => marimba(i * 0.07, f, 0.15, 0.9)); golpe(0.12, 0.38, 150, 50, 0.5); pajaro(0.4); },
    error() { boing(0); },
    atajo() { viento(0, 0.45, 0.1, 300, 2800); [523.25, 587.33, 659.25, 783.99, 880].forEach((f, i) => marimba(0.12 + i * 0.05, f, 0.12, 0.45)); pajaro(0.35); },
    tormenta() { viento(0, 1.8, 0.22, 260, 700); golpe(0.1, 0.42, 110, 40, 0.5); golpe(0.36, 0.42, 110, 40, 0.5); golpe(0.62, 0.5, 100, 36, 0.7); wah(0.9); },
    remolino() { remolinoSonido(0); },
    ladron() { ladronSonido(0); },
    cofre() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => marimba(i * 0.08, f, 0.16, 0.8, 1)); golpe(0.3, 0.3, 140, 50, 0.4); pajaro(0.45); },
    relampago() { golpe(0, 0.4, 150, 50, 0.4); [392, 523.25, 659.25].forEach((f, i) => marimba(0.1 + i * 0.06, f, 0.14, 0.6)); },
    carta() { madera(0, 0.12); marimba(0.02, 660, 0.08, 0.3, 0.8); },
    pausa() { golpe(0, 0.4, 90, 42, 0.9); marimba(0.5, 220, 0.1, 1.3, 0.6); },
    escudo() { gong(0, 293.66, 0.22); },
    nivel() { [293.66, 392, 523.25, 587.33].forEach((f, i) => marimba(i * 0.1, f, 0.16, 1.0)); gong(0.5, 293.66, 0.12); pajaro(0.7); },
    meta() {
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
  const reducido = () => { try { return !!(window.TBMov && window.TBMov.quieto()); } catch (e) { return false; } };
  function vibra(p) { try { if (navigator.vibrate && !reducido()) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }

  // ---------- Partida y pantalla ----------
  let E = null, $ = {}, ocupado = false, PIEZA = '🌱', BANCO = null, MEDIDA = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const espera = (ms) => new Promise((r) => setTimeout(r, reducido() ? Math.min(ms, 60) : ms));
  // F1128 · Nombre completo del libro (no el código): «Juan 11:35», no «JHN 11:35»
  const LIBRO = {"GEN": "Génesis", "EXO": "Éxodo", "LEV": "Levítico", "NUM": "Números", "DEU": "Deuteronomio", "JOS": "Josué", "JDG": "Jueces", "RUT": "Rut", "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Reyes", "2KI": "2 Reyes", "1CH": "1 Crónicas", "2CH": "2 Crónicas", "EZR": "Esdras", "NEH": "Nehemías", "EST": "Ester", "JOB": "Job", "PSA": "Salmos", "PRO": "Proverbios", "ECC": "Eclesiastés", "SNG": "Cantares", "ISA": "Isaías", "JER": "Jeremías", "LAM": "Lamentaciones", "EZK": "Ezequiel", "DAN": "Daniel", "HOS": "Oseas", "JOL": "Joel", "AMO": "Amós", "OBA": "Abdías", "JON": "Jonás", "MIC": "Miqueas", "NAM": "Nahúm", "HAB": "Habacuc", "ZEP": "Sofonías", "HAG": "Hageo", "ZEC": "Zacarías", "MAL": "Malaquías", "MAT": "Mateo", "MRK": "Marcos", "LUK": "Lucas", "JHN": "Juan", "ACT": "Hechos", "ROM": "Romanos", "1CO": "1 Corintios", "2CO": "2 Corintios", "GAL": "Gálatas", "EPH": "Efesios", "PHP": "Filipenses", "COL": "Colosenses", "1TH": "1 Tesalonicenses", "2TH": "2 Tesalonicenses", "1TI": "1 Timoteo", "2TI": "2 Timoteo", "TIT": "Tito", "PHM": "Filemón", "HEB": "Hebreos", "JAS": "Santiago", "1PE": "1 Pedro", "2PE": "2 Pedro", "1JN": "1 Juan", "2JN": "2 Juan", "3JN": "3 Juan", "JUD": "Judas", "REV": "Apocalipsis"};
  const ref = (q) => `${LIBRO[q.cod] || q.cod} ${q.cap}:${q.v}`;
  const info = () => nivelDe(E.tablero, E.nivel);
  const barajar = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; };
  const saldoVivero = () => { try { return window.TBInicio ? TBInicio.cargar().gotas.saldo : 0; } catch (e) { return 0; } };

  // Gotas para el Vivero: directo al saldo, sin tope diario. Sube el contador de la partida y vuela al saldo.
  function gota(n) {
    let k = 0; try { if (window.TBInicio && TBInicio.ganarDirecto) k = TBInicio.ganarDirecto(n) || 0; } catch (e) { k = 0; }
    if (!k) return 0;
    E.gotas += k; pintarEstado(); volarGotas(k); return k;
  }
  function quitarGotas(n) {                                         // solo el Ladrón de rocío (y no baja de 0)
    try { return window.TBInicio && TBInicio.restarDirecto ? TBInicio.restarDirecto(n) : 0; } catch (e) { return 0; }
  }
  function decir(titulo, cuerpo) {
    if (!$.texto) return;
    $.texto.innerHTML = `<b>${esc(titulo)}</b><span>${esc(cuerpo)}</span>`;
    ajustarBola();
    $.bola.classList.remove('salta'); void $.bola.offsetWidth; $.bola.classList.add('salta');
    brillos(6);
  }
  // Destellos dentro de la bola de cristal (siempre dentro del círculo)
  function brillos(n) {
    if (!$.bola || reducido()) return;
    $.bola.querySelectorAll('.tbl-destello').forEach((x) => x.remove());
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'); s.className = 'tbl-destello'; s.setAttribute('aria-hidden', 'true');
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 38;
      s.style.setProperty('--x', (50 + Math.cos(a) * r).toFixed(1) + '%'); s.style.setProperty('--y', (50 + Math.sin(a) * r).toFixed(1) + '%');
      s.style.animationDelay = (i * 0.12).toFixed(2) + 's'; $.bola.appendChild(s);
    }
  }
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
  function sacudir() { if (!$.root || reducido()) return; $.mesa.classList.remove('sacude'); void $.mesa.offsetWidth; $.mesa.classList.add('sacude'); }
  function destello(fondo) {
    if (!$.mesa || reducido()) return;
    const f = document.createElement('div'); f.className = 'tbl-flash'; f.style.background = fondo; $.mesa.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
  function hojas(cant) {
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

  // Dado 3D
  const CARA = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
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
      const sp = quieto ? 0 : (2 + Math.floor(Math.random() * 2)) * 360;
      const nx = b.x + sp + norm(t[0] - b.x), ny = b.y + sp + norm(t[1] - b.y);
      el._rot = { x: nx, y: ny };
      el.classList.remove('rueda'); void el.offsetWidth; el.classList.add('rueda');
      cubo.style.transform = `rotateX(${nx}deg) rotateY(${ny}deg)`;
      if (!quieto) [0.26, 0.46, 0.62, 0.76, 0.88, 1.0].forEach((s, k) => setTimeout(() => son('clack', k + i * 2), s * 1000));
      setTimeout(() => { el.classList.remove('rueda'); res(); }, quieto ? 20 : 1150);
    });
  }

  // ---------- Tablero: casillas en anillo alrededor de la bola ----------
  function medirMesa() {
    const w = $.mesa.clientWidth || 360, h = $.mesa.clientHeight || 560;
    return { w, h };
  }
  function montar() {                                               // crea las casillas del nivel actual, en anillo
    const I = info(), N = I.meta + 1;
    MEDIDA = medirMesa();
    const enc = encajar(trazo(E.nivel, N, MEDIDA.w, MEDIDA.h), MEDIDA.w, MEDIDA.h);   // F1165: dentro del campo y sin pisarse
    $.coords = enc.coords; const cs = enc.cs;
    $.casillas = {};
    $.cont.innerHTML = '';
    $.mesa.style.setProperty('--cs', cs + 'px');
    // F1144 · Bola y bandeja de dados: la bola se centra un poco arriba y la bandeja queda en el hueco entre la bola y la fila de abajo
    const w = MEDIDA.w, h = MEDIDA.h, bola = Math.round(Math.max(110, Math.min(w * 0.52, 196, h * 0.36)));
    const cy = h * 0.46, abajoBola = cy + bola / 2, filaAbajo = Math.max(...$.coords.map((c) => c.y)) * h / 100 - cs / 2, TIRO_H = 70;
    const ty = Math.max(abajoBola + 2, (abajoBola + filaAbajo) / 2 - TIRO_H / 2);
    $.mesa.style.setProperty('--bola-w', bola + 'px'); $.mesa.style.setProperty('--bola-y', cy.toFixed(1) + 'px');
    $.mesa.style.setProperty('--tiro-y', ty.toFixed(1) + 'px');
    trazarSendero();
    for (let p = 0; p <= I.meta; p++) {
      const c = $.coords[p], el = document.createElement('div');
      el.className = 'tbl-casilla oculta brota'; el.style.left = c.x + '%'; el.style.top = c.y + '%'; el.dataset.k = 'o'; el.style.animationDelay = (p * 22) + 'ms';   // F1145 · entrada escalonada del camino
      $.cont.appendChild(el); $.casillas[p] = el;
    }
    colocarPieza(); pintarCasillas(false);
  }
  // F1144 · Sendero: un camino punteado que une las casillas. Lo recorrido se ve dorado; lo que falta, apenas insinuado.
  function trazarSendero() {
    if (!$.mesa || !$.coords) return;
    $.mesa.querySelectorAll('.tbl-sendero').forEach((x) => x.remove());
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'tbl-sendero'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    $.todo = document.createElementNS(NS, 'polyline'); $.todo.setAttribute('class', 'todo');
    $.hecho = document.createElementNS(NS, 'polyline'); $.hecho.setAttribute('class', 'hecho');
    svg.appendChild($.todo); svg.appendChild($.hecho);
    $.cont.parentNode.insertBefore(svg, $.cont);
    $.sendero = svg; pintarSendero();
  }
  function pintarSendero() {
    if (!$.todo || !$.coords) return;
    const meta = info().meta, pts = (n) => $.coords.slice(0, Math.min(n, meta) + 1).map((c) => c.x + ',' + c.y).join(' ');
    $.todo.setAttribute('points', pts(E.maxPos + 1) + (E.maxPos + 1 >= meta ? ' ' + $.coords[0].x + ',' + $.coords[0].y : ''));
    $.hecho.setAttribute('points', pts(E.pos));
  }
  function colocarPieza(dir) {
    if (!$.coords) return;
    if (dir !== undefined && $.casillas && $.casillas[E.pos] && !reducido()) { const f = $.casillas[E.pos]; f.classList.remove('pisada'); void f.offsetWidth; f.classList.add('pisada'); }   // F1145 · onda al pisar
    const c = $.coords[E.pos] || $.coords[0]; $.pieza.style.left = c.x + '%'; $.pieza.style.top = c.y + '%';
    pintarSendero();
    if (dir === undefined || reducido()) return;
    $.piezaIn.classList.remove('salta', 'retro'); void $.piezaIn.offsetWidth; $.piezaIn.classList.add(dir > 0 ? 'salta' : 'retro');
  }
  function pintarCasillas(animar) {
    const I = info();
    for (let p = 0; p <= I.meta; p++) {
      const el = $.casillas[p]; if (!el) continue;
      const vis = p <= E.maxPos, t = p === I.meta ? 'meta' : I.tipos[p], key = vis ? 'v' + t : 'o', antes = el.dataset.k;
      if (antes === key) continue;
      el.dataset.k = key; el.className = 'tbl-casilla ' + (vis ? 'tipo-' + t : 'oculta');
      el.innerHTML = !vis ? '' : '<img src="img/tablero/' + (p === 0 ? 'salida' : t) + '.svg" alt="">' + (p > 0 && p < I.meta ? '<em class="tbl-num">' + p + '</em>' : '');
      if (vis && animar && antes === "o") { el.classList.add("revela"); setTimeout(() => el.classList.remove("revela"), 1100); }
    }
  }
  function aplicarTema() {
    const T = tema(E.tablero);
    $.root.style.setProperty('--tb-cielo', T.cielo); $.root.style.setProperty('--tb-campo', T.campo); $.root.style.setProperty('--tb-aura', T.aura || '#9fdcff');
    pintarDecor(T);
    $.tit.textContent = `Tablero ${E.tablero} · ${T.nombre}`;
    $.sub.textContent = '';   // F1150 · la info del lugar y de los niveles no se muestra durante el juego
    $.icono.innerHTML = `<img class="tbl-ico-tema" src="img/tablero/deco/${(T.deco || ['sol'])[0]}.svg" alt="">`;
  }
  // Decoración de cada lugar: figuras suaves sobre el campo (siempre igual para ese tablero)
  function pintarDecor(T) {
    if (!$.campo) return;
    const rnd = semilla(E.tablero * 31 + 5), lista = T.deco || [];
    $.campo.innerHTML = paisajeHTML(T);   // F1151 · paisaje del lugar detrás de las casillas
    for (let i = 0; i < 9 && lista.length; i++) {
      const d = document.createElement('img'); d.className = 'tbl-deco'; d.src = 'img/tablero/deco/' + lista[i % lista.length] + '.svg'; d.alt = ''; d.setAttribute('aria-hidden', 'true');
      d.style.left = (6 + rnd() * 88).toFixed(1) + '%'; d.style.top = (6 + rnd() * 88).toFixed(1) + '%';
      d.style.setProperty('--r', (rnd() * 40 - 20).toFixed(0) + 'deg'); d.style.width = (26 + rnd() * 18).toFixed(0) + 'px';
      $.campo.appendChild(d);
    }
    // F1145 · ambiente: nubes que pasan y aves en el cielo del lugar
    for (let k = 0; k < 3; k++) { const n = document.createElement('i'); n.className = 'tbl-nube'; n.setAttribute('aria-hidden', 'true'); n.style.top = (4 + rnd() * 40).toFixed(0) + '%'; n.style.animationDelay = (-rnd() * 40).toFixed(1) + 's'; n.style.transform = 'scale(' + (0.7 + rnd() * 0.6).toFixed(2) + ')'; $.campo.appendChild(n); }
    for (let k = 0; k < 2; k++) { const a = document.createElement('i'); a.className = 'tbl-ave'; a.setAttribute('aria-hidden', 'true'); a.style.top = (8 + rnd() * 30).toFixed(0) + '%'; a.style.animationDelay = (-rnd() * 16).toFixed(1) + 's'; $.campo.appendChild(a); }
  }
  // F1151 · Paisaje de cada lugar: cielo, horizonte y primer plano (mar, dunas, bosque, montañas o valle)
  function paisajeHTML(T) {
    const txt = (T.nombre + ' ' + (T.deco || []).join(' ')).toLowerCase();
    const tipo = /ola|pez|concha|cangrejo|costa|juan|rapa|valpara/.test(txt) ? 'mar' : /cactus|desierto|atacama|llama/.test(txt) ? 'desierto' : /arbol|bosque|hongo|chilo|alerce/.test(txt) ? 'bosque' : /montana|torres|lauca|maipo|cordillera|paine/.test(txt) ? 'montana' : 'valle';
    const cielo = `<rect width="100" height="100" fill="${T.cielo}"/><circle cx="78" cy="20" r="7" fill="#fff6d6" opacity=".55"/>`;
    const fondo = {
      mar: `<rect y="50" width="100" height="50" fill="#3f8fb0"/><path d="M0 58 Q12 54 24 58 T48 58 T72 58 T100 58" stroke="#e6f6ff" stroke-width="1" fill="none" opacity=".6"/><path d="M0 50 Q50 40 100 50 V58 Q50 50 0 58Z" fill="#d9c08f"/>`,
      desierto: `<path d="M0 60 Q30 46 60 58 T100 54 V100 H0Z" fill="#d9a26b"/><path d="M0 74 Q40 62 70 74 T100 70 V100 H0Z" fill="#c2814e"/>`,
      bosque: `<path d="M0 58 Q40 44 100 56 V100 H0Z" fill="#5f8f5a"/><g fill="#2f6b3d"><circle cx="14" cy="60" r="7"/><circle cx="36" cy="56" r="8"/><circle cx="62" cy="58" r="6"/><circle cx="86" cy="55" r="8"/></g>`,
      montana: `<path d="M0 70 L22 40 L38 60 L58 30 L78 62 L100 45 V100 H0Z" fill="#8fa6b8"/><path d="M58 30 L66 42 L58 39 L50 44Z" fill="#fff" opacity=".9"/><path d="M0 80 Q50 70 100 80 V100 H0Z" fill="#5f7a4e"/>`,
      valle: `<path d="M0 58 Q35 42 65 56 T100 52 V100 H0Z" fill="#7fa86a"/><path d="M0 72 Q45 62 100 72 V100 H0Z" fill="#5d8a4f"/>`
    }[tipo];
    return `<svg class="tbl-paisaje" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${cielo}${fondo}</svg>`;
  }
  function pintarLuces() {
    let h = ''; for (let i = 1; i <= NIVELES; i++) h += '<span class="tbl-luz' + (i <= E.luces ? ' on' : '') + '" title="Luz ' + i + '"></span>';
    $.luces.innerHTML = h;
  }
  // F1142 · El texto de la bola se ajusta solo: baja de tamaño hasta que quepa entero en el círculo (en cualquier teléfono).
  function ajustarBola() {
    const p = $.texto; if (!p) return;
    const b = p.querySelector('b'), sp = p.querySelector('span');
    const fija = (t) => { p.style.setProperty('font-size', t + 'rem'); if (sp) sp.style.setProperty('font-size', t + 'rem'); if (b) b.style.setProperty('font-size', (t * 1.12) + 'rem'); };
    let t = 0.96; fija(t);
    while (p.scrollHeight > p.clientHeight + 1 && t > 0.6) { t = Math.round((t - 0.02) * 100) / 100; fija(t); }
  }
  function pintarEstado() {
    if (!$.estado) return;
    const I = info(), pos = E.pos === 0 ? 'Salida' : 'Casilla ' + E.pos + ' de ' + I.C;
    const im = (f) => `<img class="tbl-ico" src="img/tablero/${f}.svg" alt="">`;   // F1128 · símbolos ilustrados, no emojis
    // F1150 · Dentro del tablero solo lo que se usa: gotas del Vivero, protección (escudos) y descanso si aplica
    $.estado.innerHTML = `<span class="tbl-chip" data-chip="saldo" title="Gotas en tu Vivero">${im('rocio')} ${saldoVivero()}</span><span class="tbl-chip" title="Escudos: protegen de tormentas">${im('escudo')} ${E.escudos}</span>${E.pausa ? `<span class="tbl-chip">${im('pausa')} Descanso</span>` : ''}`;
    $.chip = $.estado.querySelector('[data-chip=saldo]');
    if ($.root) $.root.classList.toggle('con-escudo', E.escudos > 0);
    pintarLuces(); aplicarTema();
  }
  function pintarPanel() {
    if (!$.panel || $.panel.dataset.modo === 'pregunta') return;
    $.panel.dataset.modo = 'botones';
    // F1144 · Los botones viven dentro del tablero (en la bandeja de madera). El bonus solo muestra el dado y su cantidad.
    $.btns.innerHTML = `<button type="button" class="tbl-lanza" id="tblLanzar" aria-label="Lanzar dado"${ocupado ? ' disabled' : ''}><img src="img/tablero/ui/dado.svg" alt=""><span>Lanzar</span></button>` +
      `<button type="button" class="tbl-bonus" id="tblBonus" aria-label="Dados de bonus: tienes ${E.bonus}"${ocupado || E.bonus <= 0 ? ' disabled' : ''}><img src="img/tablero/ui/dado.svg" alt=""><b>${E.bonus}</b></button>` +
      '';   // F1150 · sin botón Sala
    $.lanzar = document.getElementById('tblLanzar'); $.bonus = document.getElementById('tblBonus');
    if ($.lanzar) $.lanzar.addEventListener('click', () => turno(false));
    if ($.bonus) $.bonus.addEventListener('click', () => turno(true));
    $.panel.innerHTML = '';
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
    const meta = info().meta, agil = paso > 0 && k >= 2 ? 0.8 : 1;
    while (k-- > 0) {
      const sig = E.pos + paso; if (sig < 0 || sig > meta) break;
      E.pos = sig; E.maxPos = Math.max(E.maxPos, E.pos);
      colocarPieza(paso); pintarCasillas(true); pintarEstado();
      son(paso > 0 ? 'paso' : 'retro', E.pos);
      await espera((paso > 0 ? 470 : 420) * agil);
      if (E.pos === meta) break;
    }
    guardar();
  }
  async function turno(bonus) {
    if (ocupado) return;
    if (E.pausa && !bonus) {
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
  // Efecto de la casilla. Los movimientos extra no encadenan efectos; solo la meta.
  async function llegada() {
    if (E.pos === 0) return;
    const I = info();
    if (E.pos === I.meta) return nivelCompleto();
    const t = I.tipos[E.pos], c = centroPieza();
    if (t === 'rocio') { gota(1); chispas(c.x, c.y, 6, '#bfe6ff'); decir('Rocío', 'Una gota de rocío para tu Vivero.'); son('rocio'); }
    else if (t === 'pregunta') {
      chispas(c.x, c.y, 5, '#fff1b8');
      const ok = await preguntas(E.nivel >= 6 ? 2 : 1);             // desde el nivel 6, dos preguntas seguidas
      if (ok) { decir('¡Bien!', `Avanzas ${ok} ${ok === 1 ? 'casilla extra' : 'casillas extra'}.`); await espera(300); await avanzar(ok); if (E.pos === I.meta) return nivelCompleto(); }
    }
    else if (t === 'atajo') { const k = Math.random() < 0.5 ? 2 : 3; decir('Atajo', `El camino se acorta: avanzas ${k} casillas.`); son('atajo'); chispas(c.x, c.y, 10, '#b8f0a6'); await espera(380); await avanzar(k); if (E.pos === I.meta) return nivelCompleto(); }
    else if (t === 'tormenta') { await tormenta(); }
    else if (t === 'remolino') { await remolino(); }
    else if (t === 'ladron') { await ladron(); }
    else if (t === 'pausa') { E.pausa = true; gota(2); decir('Descanso', 'Pierdes un turno, pero ganas 2 gotas.'); son('pausa'); }
    else if (t === 'escudo') {
      if (E.escudos < 2) { E.escudos++; decir('Escudo', `Guardas un escudo (tienes ${E.escudos}). Detiene tormentas, remolinos y ladrones.`); chispas(c.x, c.y, 8, '#cfe9f5'); }
      else { gota(1); decir('Escudo lleno', 'Ya tienes 2 escudos: esta vez ganas una gota.'); }
      son('escudo');
    }
    else if (t === 'cofre') { gota(3); chispas(c.x, c.y, 12, '#ffe9a8'); decir('Cofre', 'Un cofre escondido en el camino: 3 gotas.'); son('cofre'); }
    else if (t === 'arreo' || t === 'memoria' || t === 'cosecha') { await minijuegoCasilla(t); }
    else if (t === 'puerta') { await puerta(); }
    else if (t === 'relampago') { await relampago(); }
    guardar();
  }
  async function tormenta() {
    son('tormenta'); sacudir(); destello('radial-gradient(circle,rgba(60,90,120,.1),rgba(15,25,45,.6))'); hojas(7); vibra([90, 50, 90]);
    if (E.escudos > 0) {
      E.escudos--; const c = centroPieza(); chispas(c.x, c.y, 12, '#cfe9f5'); gota(1);
      decir('¡Tormenta!', 'Tu escudo la detuvo. Sigues en tu lugar y ganas una gota.');
      return;
    }
    const r = 1 + Math.floor(Math.random() * RANGO(E.nivel));
    gota(1);
    decir('¡Tormenta!', `Retrocedes ${r} ${r === 1 ? 'casilla' : 'casillas'}. Lo que deja la tormenta: una gota.`);
    await espera(750); await avanzar(-r);
  }
  async function remolino() {
    remolinoSonido(0); sacudir(); destello('radial-gradient(circle,rgba(120,90,160,.1),rgba(40,20,60,.6))'); hojas(9); vibra([70, 40, 70, 40, 70]);
    if (E.escudos > 0) {
      E.escudos--; const c = centroPieza(); chispas(c.x, c.y, 12, '#e0d4f5');
      decir('Remolino', 'Tu escudo lo frenó. Sigues en tu lugar.');
      return;
    }
    const r = RANGO(E.nivel);
    decir('Remolino', `Te arrastra ${r} ${r === 1 ? 'casilla' : 'casillas'} hacia atrás. Sin premio.`);
    await espera(850); await avanzar(-r);
  }
  // Ladrón de rocío (desde el nivel 5): quita una gota por cada luz encendida. El escudo lo detiene.
  async function ladron() {
    ladronSonido(0); sacudir(); vibra([40, 60, 40]);
    if (E.escudos > 0) {
      E.escudos--; const c = centroPieza(); chispas(c.x, c.y, 12, '#cfe9f5');
      decir('Ladrón de rocío', 'Tu escudo lo ahuyentó. Tus gotas están a salvo.');
      return;
    }
    const pierde = Math.max(1, E.luces);
    const quitadas = quitarGotas(pierde);
    if (quitadas > 0) decir('Ladrón de rocío', `Te quitó ${quitadas} ${quitadas === 1 ? 'gota' : 'gotas'}: una por cada luz encendida (${E.luces}).`);
    else decir('Ladrón de rocío', 'Pasó de largo: no tenías gotas que perder.');
    pintarEstado();
  }
  // Pregunta de lo leído. Acierto = 1 casilla extra (se cuenta fuera) y 2 gotas. Fallo = sin castigo.
  async function cargarBanco() {
    if (BANCO) return BANCO;
    try { const r = await fetch('datos/juego_raices.json'); const j = await r.json(); BANCO = Array.isArray(j.preguntas) ? j.preguntas.map((q) => Object.assign({}, q, { o: (q.o || []).map((x) => (Array.isArray(x) ? x[0] : x)) })) : []; } catch (e) { BANCO = []; }
    return BANCO;
  }
  // F1127 · Elegir pregunta. Regla: nunca se repite hasta que salen todas (ciclo completo del banco).
  // Si leíste capítulos con preguntas, 3 de cada 4 veces salen de ahí; el resto sale de todo el banco.
  // Así no se quedan atrapadas en las pocas preguntas de un solo capítulo.
  function elegirPregunta(bank) {
    const L = (() => { try { return JSON.parse(localStorage.getItem(K_LEIDOS)) || {}; } catch (e) { return {}; } })();
    const leidas = bank.filter((q) => L[q.cod + '.' + q.cap]);
    const vistas = E.vistas || [];
    const libres = (lista) => lista.filter((q) => vistas.indexOf(q.id) < 0 && (!E.ultima || q.id !== E.ultima));
    let pool = leidas.length && Math.random() < 0.75 ? libres(leidas) : [];
    if (!pool.length) pool = libres(bank);
    if (!pool.length) { E.vistas = []; pool = bank.filter((q) => q.id !== E.ultima); }   // se agotaron: empieza un ciclo nuevo
    if (!pool.length) pool = bank;                                                             // (banco de una sola pregunta)
    const q = pool[Math.floor(Math.random() * pool.length)];
    E.vistas = (E.vistas || []).concat(q.id);
    E.ultima = q.id;
    return { q, general: !leidas.length };
  }
  async function preguntas(n) {                                     // n preguntas seguidas: devuelve cuántas se aciertan
    const bank = await cargarBanco();
    if (!bank.length) { decir('Pregunta', 'Hoy no hay preguntas disponibles. Sigues sin castigo.'); return 0; }
    let aciertos = 0;
    for (let k = 0; k < n; k++) { if (await preguntaUna(bank, k, n)) aciertos++; }
    return aciertos;
  }
  function preguntaUna(bank, k, n) {
    const { q, general } = elegirPregunta(bank);
    decir('Pregunta' + (n > 1 ? ` ${k + 1} de ${n}` : ''), 'Responde para avanzar un poco más.');
    return new Promise((resolver) => {
      $.panel.dataset.modo = 'pregunta'; if ($.root) $.root.classList.add('en-pregunta');   // F1128: con la pregunta, el tablero se encoge y los dados se esconden
      $.panel.innerHTML = `<div class="tbl-preg"><p class="tbl-preg-cab">${n > 1 ? 'Pregunta ' + (k + 1) + ' de ' + n + ' · ' : ''}${esc(ref(q))}${general ? ' · (pregunta general)' : ''}</p><p class="tbl-preg-txt">${esc(q.p)}</p><div class="tbl-opc">${q.o.map((o, i) => `<button type="button" class="tbl-btn sec" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`;
      $.panel.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.o), bien = i === q.c, caja = $.panel.querySelector('.tbl-preg');
        $.panel.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; x.classList.toggle('elegida', Number(x.dataset.o) === i); });
        const res = bien ? `¡Acertaste! Ganas 2 gotas. Lo encuentras en ${ref(q)}.` : `La respuesta era: «${q.o[q.c]}». Lo encuentras en ${ref(q)}. Sin castigo.`;
        $.panel.insertAdjacentHTML('beforeend', `<p class="tbl-preg-res">${esc(res)}</p><button type="button" class="tbl-btn" id="tblSeguir">Seguir</button>`);
        requestAnimationFrame(() => { const sg = document.getElementById('tblSeguir'); if (sg) sg.scrollIntoView({ block: 'end', behavior: 'smooth' }); });   // F1150 · se ve sin deslizar
        caja.classList.add(bien ? 'ok' : 'mal');
        son(bien ? 'acierto' : 'error');
        if (bien) { gota(2); const c = centroPieza(); chispas(c.x, c.y, 12, '#ffe9a8'); }
        guardar();
        document.getElementById('tblSeguir').addEventListener('click', () => {
          $.panel.dataset.modo = 'botones'; $.panel.innerHTML = ''; if ($.root) $.root.classList.remove('en-pregunta'); montar(); resolver(bien);
        });
      }));
    });
  }

  // ---------- Minijuegos (Relámpago) ----------
  function mini(titulo, sub) {                                      // capa sobre el tablero para jugar; devuelve la caja
    const caja = document.createElement('div'); caja.className = 'tbl-mini';
    caja.innerHTML = `<b>${esc(titulo)}</b><small>${esc(sub)}</small>`;
    $.mesa.appendChild(caja); return caja;
  }
  function botonMini(caja, texto, alTocar) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-btn sec'; b.textContent = texto;
    b.addEventListener('click', alTocar); caja.appendChild(b); return b;
  }
  // F1137 · Cada minijuego explica su regla antes de empezar. El tiempo corre solo al tocar «¡Empezar!».
  // F1146 · Ilustraciones de los juegos (SVG propio), sin emojis
  const FIG = (n, c) => `<img class="${c || 'tbl-fig'}" src="img/tablero/deco/${n}.svg" alt="">`;
  const MINI = (n, c) => `<img class="${c || 'tbl-fig'}" src="img/tablero/mini/${n}.svg" alt="">`;   // F1245: íconos grandes de cada minijuego
  const INTRO_MINI = {
    memoria: { ico: MINI('memoria', 'tbl-intro-fig'), titulo: 'Pares del huerto', pasos: ['Toca una carta y luego otra.', 'Si son iguales, quedan juntas.', 'Encuentra las 6 parejas para ganar 2 gotas.'] },
    cosecha: { ico: MINI('cosecha', 'tbl-intro-fig'), titulo: 'Atrapa la cosecha', pasos: ['Toca las frutas y verduras que caen: cada una suma 1 punto. La manzana dorada vale 3.', 'Lo que no se come (piedra, hueso, araña, bota) resta 1 y corta tu racha. Cada 5 seguidas dan un punto extra.', 'La gota de rocío suma 3 segundos. 20 segundos: 14 puntos dan 2 gotas, 7 dan 1.'] },
    arreo: { ico: MINI('arreo', 'tbl-intro-fig'), titulo: 'Ovejas en fuga', pasos: ['Toca cada oveja para llevarla al corral. Aparecen por todos lados. Las rebeldes (más oscuras) piden dos toques y la dorada vale 3.', 'Espanta al zorro antes de que cruce: si no, se lleva una oveja.', '¡No toques el avispero! Te quita 2 ovejas. 22 segundos: 16 ovejas dan 2 gotas, 9 dan 1.'] },
    reto: { ico: MINI('preguntas', 'tbl-intro-fig'), titulo: 'Cinco preguntas', pasos: ['Cinco preguntas cortas de tres tipos.', 'Cada acierto da 1 gota (máximo 4).', 'Fallar no tiene castigo.'] },
    eco: { ico: MINI('eco', 'tbl-intro-fig'), titulo: 'Ojo de halcón', pasos: ['Mira en qué orden se iluminan los animales.', 'Repite la secuencia tocándolos igual.', 'Cada ronda suma un animal. 4 rondas dan 2 gotas; 2 rondas, 1.'] }
  };
  function miniIntro(clave, juego) {
    return new Promise((res) => {
      const d = INTRO_MINI[clave];
      const caja = document.createElement('div'); caja.className = 'tbl-mini tbl-intro';
      caja.innerHTML = `<span class="tbl-intro-ico" aria-hidden="true">${d.ico}</span><b>${esc(d.titulo)}</b><ol class="tbl-pasos">${d.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`;
      const fila = document.createElement('div'); fila.className = 'tbl-fila';
      const ahora = document.createElement('button'); ahora.type = 'button'; ahora.className = 'tbl-btn sec'; ahora.textContent = 'Ahora no';
      const empezar = document.createElement('button'); empezar.type = 'button'; empezar.className = 'tbl-btn'; empezar.textContent = '¡Empezar!';
      fila.append(ahora, empezar); caja.appendChild(fila); $.mesa.appendChild(caja);
      ahora.addEventListener('click', () => { caja.remove(); res(0); });
      empezar.addEventListener('click', () => { caja.remove(); juego().then(res); });
    });
  }
  // F1138 · Cualquier minijuego se juega desde su tarjeta de instrucciones (casilla, Relámpago o menú).
  function jugarMini(clave) {
    const f = { arreo: miniArreo, cosecha: miniCosecha, memoria: miniMemoria, reto: miniReto, eco: miniEco }[clave];
    return miniIntro(clave, f);
  }
  async function minijuegoCasilla(clave) {
    const c = centroPieza(); chispas(c.x, c.y, 6, '#fff1b8');
    const n = await jugarMini(clave);
    if (n) gota(n);
    decir(INTRO_MINI[clave].titulo, n ? `Ganas ${n} ${n === 1 ? 'gota' : 'gotas'} del minijuego.` : 'Sigue el camino: sin gotas esta vez.');
  }
  // F1138 · Tres puertas: elige una. Cada puerta esconde un premio distinto (gotas, dado de bonus o nada).
  function puerta() {
    return new Promise((res) => {
      const caja = mini('Tres puertas', 'Elige una puerta. Cada una esconde algo distinto.');
      const fila = document.createElement('div'); fila.className = 'tbl-fila tbl-puertas'; caja.appendChild(fila);
      const premios = mezclar(['gotas', 'bonus', 'nada']); let elegida = false;
      premios.forEach((premio, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-btn sec tbl-puerta';
        b.innerHTML = '<span aria-hidden="true">🚪</span> ' + (i + 1);
        b.addEventListener('click', () => {
          if (elegida) return; elegida = true;
          fila.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('abierta');
          let txt;
          if (premio === 'gotas') { gota(3); txt = 'Había 3 gotas de rocío. ¡Son tuyas!'; son('cofre'); }
          else if (premio === 'bonus') { E.bonus += 1; pintarPanel(); txt = '¡Un dado de bonus! Lánzalo cuando quieras.'; son('cofre'); }
          else { txt = 'Solo polvo del camino. Sigue así.'; son('pausa'); }
          caja.querySelector('small').textContent = txt;
          botonMini(caja, 'Seguir', () => { caja.remove(); res(); });
        });
        fila.appendChild(b);
      });
    });
  }
  // F1138 · Minijuego suelto desde el menú: misma tarjeta, ganancias al Vivero y opción de jugar otra vez.
  function soloMini(clave, volver) {
    const main = document.getElementById('pantalla'); if (!main || !INTRO_MINI[clave]) return;
    E = cargar(); $ = {};
    const ico = ICONO[clave] || '🧠', titulo = INTRO_MINI[clave].titulo, icoFig = INTRO_MINI[clave].ico;
    document.body.classList.add('tb-full', 'tb-tapa');
    main.innerHTML = `<section class="tbl tbl-solo" aria-label="${esc(titulo)}"><header class="tbl-top"><button type="button" class="volver" id="tblVolver">‹ Minijuegos</button><div class="tbl-tit"><span class="tbl-icono" aria-hidden="true">${icoFig}</span><div><b>${esc(titulo)}</b><small>Minijuego suelto</small></div></div></header><div class="tbl-mesa" id="tblMesa"></div></section>`;
    $.mesa = document.getElementById('tblMesa');
    const salirAlMenu = () => { document.body.classList.remove('tb-full', 'tb-tapa'); if (volver) volver(); };
    document.getElementById('tblVolver').addEventListener('click', salirAlMenu);
    jugarMini(clave).then((n) => {
      if (n) { try { if (window.TBInicio && TBInicio.ganarDirecto) TBInicio.ganarDirecto(n); } catch (e) { /* sin Vivero: no pasa nada */ } }
      const mesa = document.getElementById('tblMesa'); if (!mesa) return;
      const card = document.createElement('div'); card.className = 'tbl-mini tbl-intro';
      card.innerHTML = `<span class="tbl-intro-ico" aria-hidden="true">${n ? '🎉' : icoFig}</span><b>${n ? '¡Ganaste ' + n + ' ' + (n === 1 ? 'gota' : 'gotas') + '!' : 'Buen intento'}</b><small>${n ? 'Las gotas van a tu Vivero.' : 'Puedes volver a intentarlo cuando quieras.'}</small>`;
      const fila = document.createElement('div'); fila.className = 'tbl-fila';
      const salir = document.createElement('button'); salir.type = 'button'; salir.className = 'tbl-btn sec'; salir.textContent = 'Volver a Minijuegos';
      salir.addEventListener('click', salirAlMenu);
      const otra = document.createElement('button'); otra.type = 'button'; otra.className = 'tbl-btn'; otra.textContent = 'Jugar otra vez';
      otra.addEventListener('click', () => soloMini(clave, volver));
      fila.append(salir, otra); card.appendChild(fila); mesa.appendChild(card);
    });
  }
  // F1146 · Pares del huerto con ilustraciones: cartas que giran en 3D, contador de parejas y brillo al acertar.
  function miniMemoria() {
    return new Promise((res) => {
      const figs = ['manzana', 'uva', 'choclo', 'zanahoria', 'papa', 'palta'], cartas = barajar(figs.concat(figs));
      const caja = mini('Pares del huerto', 'Encuentra las parejas. Sin prisa y sin castigo.');
      const marca = document.createElement('p'); marca.className = 'tbl-marca'; marca.textContent = 'Parejas: 0 de 6'; caja.appendChild(marca);
      const grid = document.createElement('div'); grid.className = 'tbl-mem'; caja.appendChild(grid);
      let abiertas = [], parejas = 0, bloqueo = false, listo = false;
      const cerrar = (n) => { if (listo) return; listo = true; caja.remove(); res(n); };
      cartas.forEach((e) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-carta'; b.dataset.e = e; b.setAttribute('aria-label', 'Carta boca abajo');
        b.innerHTML = '<span class="tbl-carta-f" aria-hidden="true"></span><span class="tbl-carta-c">' + FIG(e) + '</span>';
        b.addEventListener('click', () => girar(b)); grid.appendChild(b);
      });
      function girar(b) {
        if (bloqueo || b.classList.contains('abierta') || b.classList.contains('pareja')) return;
        b.classList.add('abierta'); son('carta'); abiertas.push(b);
        if (abiertas.length < 2) return;
        bloqueo = true; const x = abiertas[0], y = abiertas[1];
        if (x.dataset.e === y.dataset.e) {
          x.classList.add('pareja'); y.classList.add('pareja'); parejas++; abiertas = []; bloqueo = false; son('acierto');
          const r = y.getBoundingClientRect(); chispas(r.left + r.width / 2, r.top + r.height / 2, 10, '#ffe9a8');
          marca.textContent = 'Parejas: ' + parejas + ' de 6';
          if (parejas === 6) { son('nivel'); setTimeout(() => cerrar(2), 800); }
        } else {
          setTimeout(() => { x.classList.remove('abierta'); y.classList.remove('abierta'); abiertas = []; bloqueo = false; }, 850);
        }
      }
      botonMini(caja, 'Saltar', () => cerrar(0));
    });
  }
  // F1146 · Frutas y cosas raras dibujadas (SVG propio). Cada toque muestra el resultado donde se tocó.
  const COSA = {
    manzana: '<svg viewBox="0 0 40 40"><path d="M20 13c-6-5-16-2-15 9 1 9 8 16 15 16s14-7 15-16C36 11 26 8 20 13z" fill="#e0523a"/><path d="M20 13c0-4 2-6 5-7" stroke="#5b3a1d" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="13" cy="20" rx="3" ry="5" fill="#fff" opacity=".35"/></svg>',
    uva: '<svg viewBox="0 0 40 40"><g fill="#7b4fb3"><circle cx="20" cy="14" r="5"/><circle cx="14" cy="21" r="5"/><circle cx="26" cy="21" r="5"/><circle cx="20" cy="28" r="5"/><circle cx="14" cy="34" r="4"/><circle cx="26" cy="34" r="4"/></g><path d="M20 9V4" stroke="#5b3a1d" stroke-width="2.5" stroke-linecap="round"/></svg>',
    maiz: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="22" rx="8" ry="14" fill="#f2c230"/><path d="M15 14v16M20 9v26M25 14v16" stroke="#d9a02b" stroke-width="1.5"/><path d="M12 24c-4-2-5 6 0 10M28 24c4-2 5 6 0 10" stroke="#7cc08a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    papa: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="22" rx="16" ry="11" fill="#b98a4e"/><circle cx="13" cy="20" r="1.6" fill="#7a5530"/><circle cx="24" cy="25" r="1.6" fill="#7a5530"/><circle cx="28" cy="18" r="1.2" fill="#7a5530"/></svg>',
    frutilla: '<svg viewBox="0 0 40 40"><path d="M20 36c-9-4-14-12-13-19 6-5 20-5 26 0 1 7-4 15-13 19z" fill="#e0344b"/><path d="M12 17l4-4 4 4 4-4 4 4 4-4" stroke="#7cc08a" stroke-width="2.5" fill="none" stroke-linejoin="round"/></svg>',
    piedra: '<svg viewBox="0 0 40 40"><path d="M7 28l5-14 9-5 10 4 5 12-6 7H13z" fill="#8c8a84"/><path d="M12 22l8-2 8 3" stroke="#5f5d58" stroke-width="1.5" fill="none"/></svg>',
    hueso: '<svg viewBox="0 0 40 40"><g fill="#efe6d2" stroke="#8a7a60" stroke-width="1.5"><rect x="12" y="17" width="16" height="6" rx="3"/><circle cx="10" cy="16" r="4"/><circle cx="10" cy="24" r="4"/><circle cx="30" cy="16" r="4"/><circle cx="30" cy="24" r="4"/></g></svg>',
    arana: '<svg viewBox="0 0 40 40"><path d="M20 4v8M10 10l8 6M30 10l-8 6M6 20h10M34 20H24M10 30l8-6M30 30l-8-6" stroke="#2b2218" stroke-width="2" fill="none"/><circle cx="20" cy="24" r="7" fill="#2b2218"/><circle cx="20" cy="14" r="4" fill="#2b2218"/></svg>',
    bota: '<svg viewBox="0 0 40 40"><path d="M14 6h9v18h11v7c0 3-2 4-4 4H10c-3 0-4-2-4-4V22c0-3 2-4 4-4h4z" fill="#6b4a2b"/><path d="M14 30h20" stroke="#3b2612" stroke-width="2.5"/></svg>'
  };
  // F1247 · Atrapa la cosecha: 20 s. Frutas y verduras suman, la manzana dorada vale 3, la gota de rocío da 3 s más y lo que no se come resta y corta la racha.
  // Cada cosa cae por su propio camino (recto, con vaivén o en diagonal); cada tanto llega una lluvia de cosecha.
  function miniCosecha() {
    return new Promise((res) => {
      const caja = mini('Atrapa la cosecha', 'Toca lo que se come. La dorada vale 3. Lo que no se come, resta.');
      const campo = document.createElement('div'); campo.className = 'tbl-cosecha'; caja.appendChild(campo);
      const marca = document.createElement('p'); marca.className = 'tbl-marca'; caja.appendChild(marca);
      let pts = 0, racha = 0, extra = 0, fin = false, listo = false, lluvia = 0; const DUR = 20000, t0 = Date.now();
      const frutas = ['manzana', 'uva', 'choclo', 'zanahoria', 'papa', 'palta'], raras = ['piedra', 'hueso', 'arana', 'bota'], TAM = 48;
      const resta = () => Math.max(0, DUR + extra - (Date.now() - t0)), progreso = () => Math.min(1, (Date.now() - t0) / (DUR + extra));
      const pinta = () => { marca.textContent = 'Puntos: ' + pts + (racha >= 2 ? ' · Racha ×' + racha : '') + ' · ' + Math.ceil(resta() / 1000) + ' s'; };
      const al = (a, b) => a + Math.random() * (b - a);
      const pop = (ev, txt, cls) => {                              // «+1» o «−1» donde se tocó
        const r = campo.getBoundingClientRect(), p = document.createElement('span'); p.className = 'tbl-pop ' + cls; p.textContent = txt;
        p.style.left = (ev.clientX - r.left) + 'px'; p.style.top = (ev.clientY - r.top) + 'px'; campo.appendChild(p); setTimeout(() => p.remove(), 700);
      };
      const camino = () => {                                       // cada cosa cae por su propio camino
        const W = campo.clientWidth || 300, H = campo.clientHeight || 220, x = al(0.04, 0.88) * (W - TAM), p = progreso(), dur = Math.round(al(3000, 4200) * (1 - 0.38 * p)), r = Math.random(), kf = [];
        if (r < 0.4) { kf.push({ transform: 'translate(' + x + 'px,' + (-TAM) + 'px)' }, { transform: 'translate(' + x + 'px,' + H + 'px)' }); }
        else if (r < 0.75) { for (let i = 0; i <= 6; i++) kf.push({ transform: 'translate(' + Math.max(0, Math.min(W - TAM, x + (i % 2 ? 1 : -1) * 38 * (i ? 1 : 0))) + 'px,' + (-TAM + (H + TAM) * (i / 6)) + 'px)' }); }
        else { const dx = (Math.random() < 0.5 ? -1 : 1) * al(60, 120), x2 = Math.max(0, Math.min(W - TAM, x + dx)); kf.push({ transform: 'translate(' + x + 'px,' + (-TAM) + 'px)' }, { transform: 'translate(' + x2 + 'px,' + H + 'px)' }); }
        return { kf, dur };
      };
      const caer = () => {
        if (fin || !campo.isConnected) return;
        const r = Math.random(), p = progreso(), pr = 0.22 + 0.12 * p;
        const tipo = r < 0.05 ? 'dorada' : r < 0.09 && extra < 9000 ? 'rocio' : r < 0.09 + pr ? 'rara' : 'fruta';
        const nombre = tipo === 'rara' ? raras[Math.floor(Math.random() * raras.length)] : frutas[Math.floor(Math.random() * frutas.length)];
        const it = document.createElement('button'); it.type = 'button'; it.className = 'tbl-caida mov ' + tipo;
        it.setAttribute('aria-label', { rara: 'Cosa que no se come: no la toques', dorada: 'Manzana dorada: vale 3', rocio: 'Gota de rocío: suma 3 segundos', fruta: 'Para comer' }[tipo]);
        it.innerHTML = tipo === 'rara' ? COSA[nombre] : tipo === 'dorada' ? FIG('manzana') : tipo === 'rocio' ? '<img src="img/tablero/rocio.svg" alt="">' : FIG(nombre);
        const c = camino(); campo.appendChild(it);
        const anim = it.animate(c.kf, { duration: c.dur, easing: 'linear', fill: 'forwards' });
        it.addEventListener('pointerdown', (ev) => {
          ev.preventDefault(); if (fin || it.dataset.h) return; it.dataset.h = '1'; anim.pause();
          if (tipo === 'rara') { pts = Math.max(0, pts - 1); racha = 0; son('error'); pop(ev, '−1', 'mal'); }
          else if (tipo === 'rocio') { extra += 3000; son('atajo'); pop(ev, '+3 s', 'bien'); chispas(ev.clientX, ev.clientY, 8, '#bfe6ff'); }
          else {
            racha++; let g = tipo === 'dorada' ? 3 : 1; if (racha % 5 === 0) { g++; pop(ev, '¡Racha! +' + g, 'bien'); } else pop(ev, '+' + g, 'bien');
            pts += g; son(tipo === 'dorada' ? 'atajo' : 'rocio'); chispas(ev.clientX, ev.clientY, tipo === 'dorada' ? 12 : 6, tipo === 'dorada' ? '#ffe27a' : '#bfe6a6');
          }
          it.classList.add('tocada'); setTimeout(() => it.remove(), 200); pinta();
        });
        anim.onfinish = () => it.remove();
      };
      const sig = () => {                                          // cada vez más seguido; cada ~6 s llega una lluvia de cosecha
        if (fin || !campo.isConnected) return;
        const p = progreso(); caer();
        if (Date.now() - lluvia > 6000 && p > 0.2) { lluvia = Date.now(); for (let i = 1; i <= 3; i++) setTimeout(caer, i * 160); }
        setTimeout(sig, (640 - 300 * p) * al(0.8, 1.2));
      };
      const tick = setInterval(() => { pinta(); if (resta() <= 0) terminar(); }, 120);
      const terminar = () => {
        if (fin) return; fin = true; clearInterval(tick);
        const n = pts >= 14 ? 2 : pts >= 7 ? 1 : 0;
        marca.textContent = `¡Cosecha de ${pts} ${pts === 1 ? 'punto' : 'puntos'}! ${n ? 'Ganas ' + n + ' ' + (n === 1 ? 'gota' : 'gotas') + '.' : 'Esta vez no hubo gotas.'}`;
        botonMini(caja, 'Seguir', () => { if (listo) return; listo = true; caja.remove(); res(n); });
      };
      pinta(); sig();
    });
  }
  // F1151 · Ovejas en fuga con reglas: ovejas normales, rebeldes (hay que tocarlas dos veces), zorro (espantarlo antes de que cruce)
  // y racha: tres toques seguidos traen una oveja extra. Más rápido a medida que avanza.
  function miniArreo() {
    return new Promise((res) => {
      const caja = mini('Ovejas en fuga', 'Lleva las ovejas al corral. Cuidado con el zorro y el avispero.');
      const campo = document.createElement('div'); campo.className = 'tbl-cosecha tbl-arreo'; caja.appendChild(campo);
      const marca = document.createElement('p'); marca.className = 'tbl-marca'; caja.appendChild(marca);
      const corral = document.createElement('div'); corral.className = 'tbl-corral'; corral.textContent = 'Corral'; caja.appendChild(corral);
      let n = 0, zorro = 0, racha = 0, ultimo = 0, fin = false, listo = false; const DUR = 22000, t0 = Date.now();
      const progreso = () => Math.min(1, (Date.now() - t0) / DUR);
      const pinta = () => { marca.textContent = `Corral: ${n} · Zorro: ${zorro} · ${Math.max(0, Math.ceil((DUR - (Date.now() - t0)) / 1000))} s`; };
      const aviso = (txt, cls) => { const p = document.createElement('span'); p.className = 'tbl-pop ' + cls; p.textContent = txt; p.style.left = '50%'; p.style.top = '40%'; campo.appendChild(p); setTimeout(() => p.remove(), 800); };
      const TAM = 64, ETQ = { oveja: 'Oveja', rebelde: 'Oveja rebelde: tócala dos veces', dorada: 'Oveja dorada: vale 3', zorro: 'Zorro: tócalo para espantarlo', avispero: 'Avispero: no lo toques' };
      const IMG = { zorro: 'img/tablero/deco/eco-zorro.svg', avispero: 'img/tablero/deco/avispero.svg' };
      const al = (a, b) => a + Math.random() * (b - a);
      const ruta = (tipo) => {                                      // F1246: cada aparición tiene su propio camino por todo el campo
        const W = campo.clientWidth || 300, H = campo.clientHeight || 220, p = progreso(), y0 = al(0.08, 0.78) * (H - TAM), x0 = al(0.08, 0.8) * (W - TAM);
        const r = Math.random(); let modo = r < 0.5 ? 'cruza' : r < 0.72 ? 'zigzag' : r < 0.88 ? 'baja' : 'salta';
        if (tipo === 'dorada') modo = Math.random() < 0.5 ? 'salta' : 'zigzag';
        if (tipo === 'avispero') modo = Math.random() < 0.6 ? 'zigzag' : 'baja';
        const rapido = tipo === 'dorada' || tipo === 'avispero' ? 0.75 : tipo === 'zorro' ? 0.85 : 1, dur = Math.round((4300 - 1700 * p) * al(0.85, 1.15) * rapido);
        if (modo === 'salta') { const e = 'translate(' + x0 + 'px,' + y0 + 'px)'; return { dur: 1500 + (1 - p) * 900, perm: true, kf: [{ transform: e + ' scale(0)', offset: 0 }, { transform: e + ' scale(1.15)', offset: 0.12 }, { transform: e + ' scale(1)', offset: 0.2 }, { transform: e + ' scale(1)', offset: 0.85 }, { transform: e + ' scale(0)', offset: 1 }] }; }
        if (modo === 'baja') { const arriba = Math.random() < 0.5, d = arriba ? 1 : -1, x = al(0.05, 0.85) * (W - TAM), ya = arriba ? -TAM : H, yb = arriba ? H : -TAM; return { dur, kf: [{ transform: 'translate(' + x + 'px,' + ya + 'px)' }, { transform: 'translate(' + (x + d * al(-30, 30)) + 'px,' + yb + 'px)' }] }; }
        const izq = Math.random() < 0.65, xa = izq ? -TAM : W, xb = izq ? W : -TAM, f = izq ? 1 : -1, kf = [];
        const pasos = modo === 'zigzag' ? 6 : 1;
        for (let i = 0; i <= pasos; i++) { const x = xa + (xb - xa) * (i / pasos), y = Math.max(0, Math.min(H - TAM, y0 + (modo === 'zigzag' ? (i % 2 ? 1 : -1) * al(25, 55) : 0))); kf.push({ transform: 'translate(' + x + 'px,' + y + 'px) scaleX(' + f + ')' }); }
        return { dur, kf };
      };
      const crear = (tipo) => {
        const o = document.createElement('button'); o.type = 'button'; o.className = 'tbl-oveja mov ' + tipo; o.setAttribute('aria-label', ETQ[tipo]);
        const img = document.createElement('img'); img.src = IMG[tipo] || 'img/tablero/deco/eco-oveja.svg'; img.alt = ''; o.appendChild(img);
        o.dataset.falta = tipo === 'rebelde' ? '2' : '1';
        const rt = ruta(tipo); campo.appendChild(o);
        const anim = o.animate(rt.kf, { duration: rt.dur, easing: rt.perm ? 'ease-out' : 'linear', fill: 'forwards' });
        o.addEventListener('pointerdown', (ev) => {
          ev.preventDefault(); if (fin || o.dataset.h) return;
          o.dataset.falta = String(Number(o.dataset.falta) - 1);
          if (Number(o.dataset.falta) > 0) { o.classList.add('tocada'); son('carta'); return; }   // rebelde: primer toque
          o.dataset.h = '1'; anim.pause();
          if (tipo === 'zorro') { o.classList.add('espantado'); aviso('¡Zorro espantado!', 'bien'); son('pausa'); chispas(ev.clientX, ev.clientY, 8, '#ffd8a0'); }
          else if (tipo === 'avispero') { n = Math.max(0, n - 2); racha = 0; aviso('¡Avispas! −2', 'mal'); son('error'); chispas(ev.clientX, ev.clientY, 10, '#ff8a6a'); o.classList.add('picado'); }
          else {
            const ahora = Date.now(); racha = ahora - ultimo < 1500 ? racha + 1 : 1; ultimo = ahora;
            n += tipo === 'dorada' ? 3 : 1; if (tipo === 'dorada') { aviso('¡Dorada! +3', 'bien'); son('atajo'); }
            if (racha > 0 && racha % 3 === 0) { n++; aviso('¡En fila! +1', 'bien'); son('atajo'); }
            son('rocio'); chispas(ev.clientX, ev.clientY, tipo === 'dorada' ? 12 : 6, '#fff1b8');
          }
          o.classList.add('llevada'); setTimeout(() => o.remove(), 340); pinta();
        });
        anim.onfinish = () => {
          if (tipo === 'zorro' && !o.dataset.h && !fin) { zorro++; n = Math.max(0, n - 1); aviso('¡Se llevó una oveja!', 'mal'); son('error'); pinta(); }
          o.remove();
        };
      };
      const cadena = () => {                                       // la siguiente aparición depende del avance: cada vez más seguido y con más peligros
        if (fin || !campo.isConnected) return;
        const p = progreso(), r = Math.random(), pz = 0.08 + 0.05 * p, pa = 0.10 + 0.10 * p, pd = 0.05, pr = 0.16 + 0.05 * p;
        const tipo = r < pz ? 'zorro' : r < pz + pa ? 'avispero' : r < pz + pa + pd ? 'dorada' : r < pz + pa + pd + pr ? 'rebelde' : 'oveja';
        crear(tipo);
        setTimeout(cadena, (850 - 400 * p) * al(0.8, 1.2));
      };
      const tick = setInterval(pinta, 250); pinta(); cadena();
      setTimeout(() => {
        fin = true; clearInterval(tick);
        const g = n >= 16 ? 2 : n >= 9 ? 1 : 0;
        marca.textContent = `¡Corral con ${n} ${n === 1 ? 'oveja' : 'ovejas'}! El zorro se llevó ${zorro}. ${g ? 'Ganas ' + g + ' ' + (g === 1 ? 'gota' : 'gotas') + '.' : 'Esta vez no fue suficiente.'}`;
        botonMini(caja, 'Seguir', () => { if (listo) return; listo = true; caja.remove(); res(g); });
      }, DUR);
    });
  }
  // F1146 · Eco de la montaña (nuevo): los animales se iluminan en orden; repite la secuencia tocándolos igual.
  function miniEco() {
    return new Promise((res) => {
      const OPC = ['eco-oveja', 'eco-llama', 'eco-zorro', 'eco-pinguino'], NOMBRE_ECO = { 'eco-oveja': 'Oveja', 'eco-llama': 'Llama', 'eco-zorro': 'Zorro', 'eco-pinguino': 'Pingüino' };
      const caja = mini('Ojo de halcón', 'Mira en qué orden se iluminan los animales y repítelo tocándolos.'); caja.classList.add('compacta');
      const marca = document.createElement('p'); marca.className = 'tbl-marca'; caja.appendChild(marca);
      const grid = document.createElement('div'); grid.className = 'tbl-eco'; caja.appendChild(grid);
      const btns = OPC.map((n, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-eco-b c' + (i + 1); b.setAttribute('aria-label', NOMBRE_ECO[n]); b.innerHTML = FIG(n); b.disabled = true; grid.appendChild(b); return b; });
      const seq = []; let paso = 0, listo = false, mostrando = false;
      const vivo = () => caja.isConnected && !listo;
      const cerrar = (n) => { if (listo) return; listo = true; caja.remove(); res(n); };
      const esperar = (ms) => new Promise((r) => setTimeout(r, reducido() ? Math.min(ms, 80) : ms));
      async function mostrar() {
        mostrando = true; btns.forEach((b) => { b.disabled = true; }); marca.textContent = 'Mira con atención…';
        await esperar(450);
        for (const i of seq) {
          if (!vivo()) return;
          btns[i].classList.add('luz'); son('carta', i); await esperar(520); btns[i].classList.remove('luz'); await esperar(200);
        }
        if (!vivo()) return;
        mostrando = false; paso = 0; btns.forEach((b) => { b.disabled = false; }); marca.textContent = 'Tu turno · ronda ' + seq.length;
      }
      function ronda() { seq.push(Math.floor(Math.random() * OPC.length)); mostrar(); }
      function fallo() {
        btns.forEach((b) => { b.disabled = true; }); son('error'); grid.classList.add('mal');
        const n = Math.max(0, seq.length - 1), g = n >= 4 ? 2 : n >= 2 ? 1 : 0;
        marca.textContent = `Llegaste a ${n} ${n === 1 ? 'ronda' : 'rondas'}. ` + (g ? `Ganas ${g} ${g === 1 ? 'gota' : 'gotas'}.` : 'Esta vez no hubo gotas.');
        botonMini(caja, 'Seguir', () => cerrar(g));
      }
      btns.forEach((b, i) => b.addEventListener('click', () => {
        if (b.disabled || mostrando || !vivo()) return;
        if (seq[paso] !== i) { fallo(); return; }
        b.classList.add('luz'); setTimeout(() => b.classList.remove('luz'), 200); son('rocio'); paso++;
        if (paso === seq.length) { btns.forEach((x) => { x.disabled = true; }); marca.textContent = '¡Bien! Sigue con la ronda ' + (seq.length + 1); setTimeout(ronda, 900); }
      }));
      ronda();
    });
  }
  // F1133 · Ojo de halcón: cinco desafíos rápidos de cultura general, naturaleza y Chile (nada religioso).
  // Tres formatos: opción múltiple, «¿cuál no encaja?» y verdadero o falso. Un acierto = 1 gota (máximo 4).
  let RETOS = null;
  async function cargarRetos() {
    if (RETOS) return RETOS;
    try { const r = await fetch('datos/juego_curiosidades.json'); const j = await r.json(); RETOS = Array.isArray(j.retos) ? j.retos : []; } catch (e) { RETOS = []; }
    return RETOS;
  }
  function mezclar(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function miniReto() {
    return new Promise(async (res) => {
      const banco = await cargarRetos();
      if (!banco.length) { res(0); return; }
      const caja = mini('Cinco preguntas', 'Cinco desafíos rápidos. Un acierto = 1 gota (máximo 4). Sin castigo.');
      const rondas = mezclar(banco).slice(0, Math.min(5, banco.length));
      let i = 0, gotasReto = 0, listo = false;
      const cerrar = (n) => { if (listo) return; listo = true; caja.remove(); res(n); };
      const rotulo = { quiz: 'Pregunta', intruso: '¿Cuál NO encaja?', vf: '¿Verdadero o falso?' };
      function ronda() {
        if (i >= rondas.length) {
          caja.innerHTML = `<b>¡Reto terminado!</b><small>Acertaste ${gotasReto} ${gotasReto === 1 ? 'vez' : 'veces'}.</small>`;
          botonMini(caja, 'Seguir', () => cerrar(Math.min(gotasReto, 4)));
          return;
        }
        const r = rondas[i], correcta = r.o[r.c], ops = r.tipo === 'vf' ? r.o.slice() : mezclar(r.o);
        caja.innerHTML = `<b>${esc(rotulo[r.tipo] || 'Reto')}</b><small>Ronda ${i + 1} de ${rondas.length}</small><p class="tbl-reto-q">${esc(r.p)}</p><div class="tbl-reto-ops"></div><p class="tbl-reto-res" aria-live="polite"></p>`;
        const cont = caja.querySelector('.tbl-reto-ops'), out = caja.querySelector('.tbl-reto-res');
        ops.forEach((texto) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'tbl-btn sec tbl-reto-op'; b.textContent = texto;
          b.addEventListener('click', () => {
            const bien = texto === correcta;
            cont.querySelectorAll('button').forEach((x) => { x.disabled = true; });
            b.classList.add(bien ? 'ok' : 'mal');
            if (bien) { gotasReto++; son('acierto'); } else { son('error'); }
            out.textContent = bien ? '¡Acertaste! ' + (r.dato || '') : 'Era: ' + correcta + '. ' + (r.dato || '');
            botonMini(caja, i + 1 < rondas.length ? 'Siguiente' : 'Ver resultado', () => { i++; ronda(); });
          });
          cont.appendChild(b);
        });
        botonMini(caja, 'Saltar', () => cerrar(Math.min(gotasReto, 4)));
      }
      ronda();
    });
  }
  // Minijuegos desbloqueados por nivel completado (diseño, sección 13): Arreo (nivel 1), Memoria (2), Cosecha (3).
  // F1133 · Desde el primer tablero están los tres minijuegos y el Ojo de halcón (antes se desbloqueaban por nivel).
  function minisDesbloqueados() { return ['arreo', 'memoria', 'cosecha', 'reto', 'eco']; }   // F1146 · se suma el Eco de la montaña
  async function relampago() {
    son('relampago');
    decir('Relámpago', 'Un minijuego para ganar gotas. Puedes saltarlo.');
    const eleccion = minisDesbloqueados()[Math.floor(Math.random() * minisDesbloqueados().length)];
    const n = await jugarMini(eleccion);
    if (n) gota(n);
    decir('Relámpago', n ? `Ganas ${n} ${n === 1 ? 'gota' : 'gotas'} del minijuego.` : 'Sigue el camino: sin gotas esta vez.');
  }

  // ---------- Niveles y tableros ----------
  function aviso(titulo, cuerpo, boton) {
    return new Promise((r) => {
      $.aviso.innerHTML = `<div class="tbl-aviso-caja"><b>${esc(titulo)}</b><p>${esc(cuerpo)}</p><button type="button" class="tbl-btn" id="tblAvisoOk">${esc(boton)}</button></div>`;
      $.aviso.hidden = false;
      document.getElementById('tblAvisoOk').addEventListener('click', () => { $.aviso.hidden = true; r(); });
    });
  }
  async function nivelCompleto() {
    const hecho = E.nivel, T = tema(E.tablero);
    E.luces++; E.niveles++; gota(10); E.bonus += 1; E.pausa = false; E.pos = 0; E.maxPos = 0;
    let titulo, cuerpo;
    if (hecho < NIVELES) {
      E.nivel = hecho + 1;
      titulo = `¡Nivel ${hecho} completo!`;
      cuerpo = `Se enciende una luz (${E.luces} de ${NIVELES}). Ganas 10 gotas y un dado de bonus. El camino crece: ${CASILLAS(E.nivel)} casillas.`;
    } else {
      const siguiente = tema(E.tablero + 1);
      if (!REPLAY) hechoRegistrar(E.tablero);                           // F1140: el lugar queda en la Sala de tableros
      E.tablero += 1; E.nivel = 1; E.luces = 0;
      titulo = '¡Tablero completo!';
      cuerpo = REPLAY ? `Lo jugaste de nuevo. Tu progreso no cambió: ${T.lugar} ya está en tu Sala.` : `Las 10 luces se apagan. Ahora te espera ${siguiente.lugar} (${siguiente.nombre}). Ganas 10 gotas y un dado de bonus.`;
      void T;
    }
    guardar(); son(hecho < NIVELES ? 'nivel' : 'meta'); confeti();
    destello('radial-gradient(circle,rgba(255,220,120,.15),rgba(255,200,80,.55))'); vibra([60, 40, 60, 40, 120]);
    const c = centroPieza(); chispas(c.x, c.y, 16, '#ffd45c');
    if (hecho === NIVELES) { montar(); }
    pintarTodo();
    await aviso(titulo, cuerpo, REPLAY && hecho === NIVELES ? 'Volver a la Sala' : 'Seguir');
    if (REPLAY && hecho === NIVELES) { if (VOLVER) VOLVER(); return; }
    if (hecho < NIVELES) montar();
    decir(`Nivel ${E.nivel}`, hecho < NIVELES ? `Empiezas el nivel ${E.nivel}. Lanza el dado.` : tema(E.tablero).leyenda);
    pintarTodo();
  }

  // F1140 · Caja de un lugar, dibujada en código (SVG nítido). Completada: color y emblema del lugar. Bloqueada: en sombra con candado.
  function cajaSVG(id, hecho) {
    const T = tema(id), g = 'c' + id + (hecho ? 'h' : 'b');
    return `<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(hecho ? T.nombre : 'Lugar por descubrir')}">` +
      `<defs><linearGradient id="m${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a6a3a"/><stop offset="1" stop-color="#5b3a1d"/></linearGradient>` +
      `<linearGradient id="s${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.cielo}"/><stop offset="1" stop-color="${T.campo}"/></linearGradient>` +
      `<radialGradient id="a${g}"><stop offset="0" stop-color="${T.aura}" stop-opacity=".95"/><stop offset="1" stop-color="${T.aura}" stop-opacity="0"/></radialGradient><pattern id="w${g}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)"><path d="M0 4 H14 M0 11 H14" stroke="#2a180a" stroke-width="1" opacity=".28"/></pattern></defs>` +
      `<rect x="6" y="6" width="148" height="188" rx="12" fill="url(#m${g})" stroke="#3b2a18" stroke-width="3"/>` +
      `<rect x="6" y="6" width="148" height="188" rx="12" fill="url(#w${g})"/>` +
      `<rect x="18" y="18" width="124" height="112" rx="8" fill="url(#s${g})" stroke="#3b2a18" stroke-width="2"/>` +
      `<circle cx="80" cy="66" r="44" fill="url(#a${g})"/>` +
      `<text x="80" y="78" font-size="34" text-anchor="middle">${hecho ? T.icono : '❔'}</text>` +
      `<circle cx="14" cy="14" r="3.5" fill="#d9a441"/><circle cx="146" cy="14" r="3.5" fill="#d9a441"/><circle cx="14" cy="186" r="3.5" fill="#d9a441"/><circle cx="146" cy="186" r="3.5" fill="#d9a441"/>` +
      `<rect x="22" y="140" width="116" height="44" rx="6" fill="#d9a441" stroke="#6b4a2b" stroke-width="2"/>` +
      `<text x="80" y="158" font-size="12.5" font-weight="700" text-anchor="middle" fill="#2b2218">${hecho ? esc(T.nombre) : 'Lugar ' + ((id - 1) % TEMAS.length + 1)}</text>` +
      `<text x="80" y="174" font-size="9.5" text-anchor="middle" fill="#4a3826">${hecho ? esc(T.lugar) : 'Por descubrir'}</text>` +
      (hecho ? '' : `<rect x="6" y="6" width="148" height="188" rx="12" fill="#0b1310" opacity=".55"/><text x="80" y="104" font-size="26" text-anchor="middle">🔒</text>`) +
      `</svg>`;
  }
  // Lista de lugares para la Sala: id, nombre, lugar y si ya está completado.
  function listaTableros() {
    const H = hechosLeer();
    return TEMAS.map((T, i) => ({ id: i + 1, nombre: T.nombre, lugar: T.lugar, icono: T.icono, leyenda: T.leyenda, hecho: H.some((h) => ((h - 1) % TEMAS.length) === i) }));
  }

  // ---------- Pantalla ----------
  function abrir(volver, opc) {
    opc = opc || {}; PIEZA = opc.pieza || 'brote';
    const main = document.getElementById('pantalla'); if (!main) return;
    REPLAY = opc.rejugar || null; VOLVER = volver || null; SALA = opc.sala || null;
    E = REPLAY ? Object.assign(nuevoEstado(), { tablero: REPLAY }) : cargar(); ocupado = false; $ = {};
    document.body.classList.add('tb-full', 'tb-tapa');   // F1244: el tablero tapa todo; el fondo animado se apaga mientras está abierto
    main.innerHTML = `<section class="tbl" id="tbl" aria-label="Tablero de Tierra Buena">
      <header class="tbl-top">
        <button type="button" class="volver" id="tblVolver">‹ Juegos</button>
        <div class="tbl-tit"><span class="tbl-icono" id="tblIcono" aria-hidden="true"></span><div><b id="tblTit"></b><small id="tblSub"></small></div></div>
      </header>
      <div class="tbl-luces" id="tblLuces" aria-label="Luces encendidas: una por nivel pasado"></div>
      <div class="tbl-mesa" id="tblMesa"><div class="tbl-estado" id="tblEstado"></div>
        <div class="tbl-campo" id="tblCampo"></div>
        <i class="tbl-rosa" aria-hidden="true"></i>
        <div class="tbl-bola" id="tblBola" aria-live="polite"><i class="tbl-aura" aria-hidden="true"></i><i class="tbl-orbita" aria-hidden="true"></i><p id="tblTexto"></p></div>
        <div id="tblCasillas"></div>
        <div class="tbl-pieza" id="tblPieza" aria-label="Tu pieza"><span class="tbl-pieza-in" id="tblPiezaIn"><img class="tbl-pieza-img" src="img/piezas/${esc(PIEZA)}.svg" alt=""></span></div>
        <div class="tbl-tiro" id="tblTiro"><div class="tbl-tiro-base"><div class="tbl-dados" id="tblDados"></div><div class="tbl-btns" id="tblBtns"></div></div></div>
        <div class="tbl-aviso" id="tblAviso" hidden></div>
      </div>
      <div class="tbl-panel" id="tblPanel"></div>
    </section>`;
    $.root = document.getElementById('tbl'); $.mesa = document.getElementById('tblMesa'); $.cont = document.getElementById('tblCasillas');
    $.campo = document.getElementById('tblCampo'); $.estado = document.getElementById('tblEstado'); $.luces = document.getElementById('tblLuces'); $.bola = document.getElementById('tblBola'); $.texto = document.getElementById('tblTexto');
    $.tit = document.getElementById('tblTit'); $.sub = document.getElementById('tblSub'); $.icono = document.getElementById('tblIcono');
    $.pieza = document.getElementById('tblPieza'); $.piezaIn = document.getElementById('tblPiezaIn'); $.aviso = document.getElementById('tblAviso'); $.panel = document.getElementById('tblPanel');
    $.d1 = dadoEl(); $.d2 = dadoEl(); $.d2.hidden = true;
    $.tiro = document.getElementById('tblTiro'); $.btns = document.getElementById('tblBtns');
    const dados = document.getElementById('tblDados'); dados.appendChild($.d1); dados.appendChild($.d2);
    document.getElementById('tblVolver').addEventListener('click', () => { son('salida'); if (typeof volver === 'function') volver(); });
    montar(); pintarTodo();
    if (!$.resize) { $.resize = () => { if ($.root && $.root.isConnected) { montar(); } }; window.addEventListener('resize', $.resize); }
    decir(`Tablero ${E.tablero}`, E.pos === 0 ? tema(E.tablero).leyenda : 'Sigue tu camino.');
    son('inicio');
    if (E.pos === 0 && !REPLAY) mostrarCaja();   // F1151 · al empezar, el tablero llega cerrado en su caja
  }
  // F1151 · Caja cerrada: muestra el lugar y las luces de niveles (esa info ya no aparece durante el juego). Un toque la abre.
  function mostrarCaja() {
    if (!$.root || document.getElementById('tblCaja')) return;
    const T = tema(E.tablero);
    const luces = Array.from({ length: NIVELES }, (_, i) => `<span class="tbl-caja-luz${i < E.luces ? ' on' : ''}"></span>`).join('');
    const c = document.createElement('div'); c.className = 'tbl-caja'; c.id = 'tblCaja';
    c.className = 'tbl-caja tbl-tapa-caja'; c.id = 'tblCaja';
    c.style.setProperty('--deco', `url(img/tablero/deco/${esc((T.deco || ['sol'])[0])}.svg)`);
    c.innerHTML = `<div class="tbl-tapa-escena" aria-hidden="true">` +
      `<div class="tbl-tapa-hoja izq"><span class="tbl-tapa-vent"></span></div>` +
      `<div class="tbl-tapa-hoja der"><span class="tbl-tapa-vent"></span></div>` +
      `</div>` +
      `<div class="tbl-tapa-tit"><b>${esc(T.nombre)}</b><small>Tablero ${E.tablero} · ${esc(T.lugar)}</small></div>` +
      `<div class="tbl-tapa-info"><div class="tbl-caja-lucesfila" aria-label="Luces: una por nivel pasado">${luces}</div>` +
      `<p class="tbl-caja-sub">Nivel ${E.nivel} de ${NIVELES}</p>` +
      `<button type="button" class="tbl-btn" id="tblAbrirCaja">Abrir la caja</button></div>`;
    $.root.appendChild(c);
    document.getElementById('tblAbrirCaja').addEventListener('click', (ev) => {
      const b = ev.currentTarget; b.disabled = true; c.classList.add('abriendo'); son('cofre');
      setTimeout(() => { c.remove(); son('inicio'); }, 1800);
    });
  }

  window.TBTablero = {
    abrir, minijuego: soloMini, caja: cajaSVG, lista: listaTableros,
    // expuesto para pruebas (no usar desde la interfaz)
    _t: { TEMAS, NIVELES, CASILLAS, RANGO, pesosDe, nivelDe, anillo, trazo, encajar, TRAMPA, ICONO, SONIDOS, audio, tema, CARA, nuevoEstado, cargar,
      // para pruebas: elige n preguntas con un estado dado y devuelve sus ids en orden
      elegirN(bank, estado, n) { const previo = E; E = estado; const ids = []; try { for (let i = 0; i < n; i++) ids.push(elegirPregunta(bank).q.id); } finally { E = previo; } return ids; } }
  };
})();
