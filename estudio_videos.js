/* F1327 · Estudio de videos (móvil), fase 1 de la paridad con el escritorio.
   Un video es una lista de escenas. Cada escena puede tener: título, subtítulo, segundos, fondo de color,
   diseño (centro, gigante, editorial, tarjeta, tercio), fondo animado (quieto, luces, ondas, rayos),
   animación del texto (aparece, enfoque, palabras), efectos (destellos, textura, brillo que pasa)
   y transición con la escena siguiente (fundido, deslizar, acercar, desenfoque, círculo, cortina).
   Las 41 plantillas listas vienen del escritorio (datos/videos_catalogo.json). */
(function () {
  const K = 'tb_estudio_videos';
  const W = 720;                 // resolución del video en el teléfono (ligera y nítida para redes)
  const TR = 0.65;               // duración de la transición entre escenas, en segundos
  const SEG_MIN = 1, SEG_MAX = 20;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vibra = () => { try { if (window.TBApp && window.TBApp.vibra) window.TBApp.vibra(); } catch (e) { /* sin vibración */ } };
  const PALETAS = [
    { n: 'Cielo', f: '#1f3a5f' }, { n: 'Arena', f: '#c9a86a' }, { n: 'Bosque', f: '#24412f' },
    { n: 'Atardecer', f: '#7a3b2e' }, { n: 'Noche', f: '#15151d' }
  ];
  const TRANSICIONES = [['fade', '🌫️ Suave'], ['slide', '➡️ Deslizar'], ['zoom', '🔍 Acercar'], ['blur', '✨ Desenfoque'], ['iris', '⭕ Círculo'], ['cortina', '🎞️ Cortina']];
  const FONDOS = [['liso', 'Quieto'], ['aurora', 'Luces suaves'], ['malla', 'Ondas de color'], ['rayos', 'Rayos de luz']];
  const DISENOS = [['centro', 'Al centro'], ['gigante', 'Gigante, al centro'], ['editorial', 'Grande, a la izquierda'], ['cristal', 'En tarjeta'], ['tercio', 'Abajo a la izquierda']];
  const ANIMS = [['aparecer', 'Aparece suave'], ['palabras', 'Línea por línea'], ['enfoque', 'De borroso a nítido']];
  const EFECTOS = [['bokeh', '🔆 Destellos'], ['grano', '🎞️ Textura de película'], ['barrido', '⚡ Brillo que pasa']];
  const MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let grab = null, vista = null, atrasFn = null, CAT = null;
  // Sonidos: sintetizados con Web Audio (sin archivos ni internet). Son los mismos del escritorio.
  const SFX = [['', '🔇 Ninguno'], ['whoosh', '💨 Pasada'], ['campana', '🔔 Campana'], ['brillo', '✨ Destello'], ['pop', '🫧 Burbuja'], ['tambor', '🥁 Golpe'], ['arpa', '🎼 Arpa'], ['aplauso', '👏 Aplausos'], ['subida', '🚀 Crescendo']];
  const MUS = new Map();   // música ya decodificada, por id de video (vive mientras la app está abierta)
  function abrirAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      const master = ctx.createGain(); master.gain.value = 1;
      master.connect(ctx.destination);
      return { ctx: ctx, master: master, dest: null };
    } catch (e) { return null; }
  }
  function sfxSintetizar(ac, id, t0, dest, vol) {
    const out = ac.createGain(); out.gain.value = vol == null ? 0.55 : vol; out.connect(dest);
    const tono = (f0, f1, ini, dur, tipo, pico) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = tipo || 'sine';
      o.frequency.setValueAtTime(f0, t0 + ini);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + ini + dur);
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.exponentialRampToValueAtTime(pico || 0.5, t0 + ini + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      o.connect(g); g.connect(out); o.start(t0 + ini); o.stop(t0 + ini + dur + 0.05);
    };
    const ruido = (ini, dur, f0, f1, q, pico, sube) => {
      const n = Math.max(1, Math.ceil(ac.sampleRate * dur));
      const b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = b;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t0 + ini); f.frequency.exponentialRampToValueAtTime(f1, t0 + ini + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0 + ini);
      if (sube) { g.gain.exponentialRampToValueAtTime(pico, t0 + ini + dur * 0.92); g.gain.linearRampToValueAtTime(0, t0 + ini + dur); }
      else { g.gain.exponentialRampToValueAtTime(pico, t0 + ini + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur); }
      src.connect(f); f.connect(g); g.connect(out); src.start(t0 + ini); src.stop(t0 + ini + dur);
    };
    if (id === 'whoosh') ruido(0, 0.75, 350, 3600, 0.8, 0.8);
    else if (id === 'campana') [[880, 0.5, 2.4], [1320, 0.3, 1.7], [1760, 0.2, 1.2], [2640, 0.1, 0.7]].forEach((p) => tono(p[0], p[0], 0, p[2], 'sine', p[1]));
    else if (id === 'brillo') [2637, 3136, 3951, 4699, 3520, 5274, 4186, 3136, 5920].forEach((f, i) => tono(f, f, i * 0.07, 0.28, 'sine', 0.2));
    else if (id === 'pop') tono(720, 180, 0, 0.14, 'sine', 0.8);
    else if (id === 'tambor') { tono(140, 42, 0, 0.8, 'sine', 1); ruido(0, 0.14, 1400, 200, 0.7, 0.35); }
    else if (id === 'arpa') [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tono(f, f, i * 0.11, 1.5, 'triangle', 0.35));
    else if (id === 'aplauso') { for (let i = 0; i < 28; i++) ruido(i * 0.055 + ((i * 37) % 10) / 10 * 0.035, 0.07, 1500 + (i % 5) * 400, 900, 0.6, 0.28); ruido(0.4, 1.4, 2600, 1500, 0.5, 0.12); }
    else if (id === 'subida') { ruido(0, 1.6, 200, 6500, 1.4, 0.7, true); tono(110, 440, 0, 1.6, 'sawtooth', 0.08); }
  }
  // Programa los sonidos de cada escena y la música sobre la línea de tiempo del video.
  function programarAudio(a, escs, starts, total, musica, volumen) {
    if (!a) return null;
    const ac = a.ctx, t0 = ac.currentTime + 0.1, salidas = [];
    escs.forEach((e, i) => { if (e.sfx) sfxSintetizar(ac, e.sfx, t0 + starts[i], a.master, 0.55); });
    if (musica) {
      const src = ac.createBufferSource(); src.buffer = musica;
      const g = ac.createGain(); const vol = (volumen == null ? 60 : volumen) / 100;
      g.gain.setValueAtTime(vol, t0);
      g.gain.setValueAtTime(vol, Math.max(t0, t0 + total - 2));
      g.gain.linearRampToValueAtTime(0, t0 + total);            // la música baja al final, sin cortarse
      src.connect(g); g.connect(a.master);
      src.start(t0, 0); src.stop(t0 + total + 0.1);
      salidas.push(src);
    }
    return { detener: () => { salidas.forEach((x) => { try { x.stop(); } catch (e) { /* ya paró */ } }); try { if (ac.state !== 'closed') ac.close(); } catch (e) { /* nada */ } } };
  }
  function cargarMusica(video, archivo) {
    const a = abrirAudio();
    if (!a) return Promise.reject(new Error('sin audio'));
    return archivo.arrayBuffer().then((buf) => new Promise((res, rej) => {
      a.ctx.decodeAudioData(buf, (dec) => { MUS.set(video.id, dec); res(dec); }, rej);
    })).finally(() => { try { a.ctx.close(); } catch (e) { /* nada */ } });
  }

  // ---------- datos ----------
  function leer() {
    try { const d = JSON.parse(localStorage.getItem(K)); return Object.assign({ videos: [] }, d || {}); }
    catch (e) { return { videos: [] }; }
  }
  function guardar(d) { try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) { /* sin espacio */ } }
  function nuevoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function slug(t) { return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video'; }
  function duracion(v) { return Math.round((v.escenas || []).reduce((a, e) => a + (Number(e.seg) || 0), 0) * 10) / 10; }
  function mimeVideo() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) || '';
  }
  async function cargarCatalogo() {
    if (CAT) return CAT;
    try { const r = await fetch('datos/videos_catalogo.json'); CAT = await r.json(); }
    catch (e) { CAT = { VIDEOS_PLANTILLAS: [], VIDEOS_GRUPOS_PLANTILLAS: [] }; }
    return CAT;
  }

  // ---------- pantalla y control ----------
  function cancelar() {
    if (vista) { try { vista.stop(); } catch (e) { /* nada */ } vista = null; }
    if (grab) {
      grab.descartar = true;
      try { if (grab.handle) grab.handle.stop(); if (grab.rec && grab.rec.state !== 'inactive') grab.rec.stop(); } catch (e) { /* nada */ }
      grab = null;
    }
  }
  function pantalla(html) {
    cancelar();
    const p = $('#pantalla'); if (!p) return;
    p.innerHTML = html;
    try { window.scrollTo(0, 0); } catch (e) { /* nada */ }
  }
  function volverA(txt, fn) { atrasFn = fn; return '<button type="button" class="volver" id="evVolver">‹ ' + txt + '</button>'; }
  function enlazarVolver() { const b = $('#evVolver'); if (b) b.onclick = () => { cancelar(); if (atrasFn) atrasFn(); }; }

  // ---------- color ----------
  function hexRgb(h) { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mezcla(h, k, hacia) { const a = hexRgb(h), b = hacia || [255, 255, 255]; return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')'; }
  function rgba(h, al) { const [r, g, b] = hexRgb(h); return 'rgba(' + r + ',' + g + ',' + b + ',' + al + ')'; }
  // Colores de una escena: la plantilla trae dos colores; una escena escrita a mano usa la paleta elegida.
  function colores(e) {
    if (Array.isArray(e.c) && e.c.length >= 2) return { c: e.c, tx: '#ffffff' };
    const p = PALETAS[e.pal || 0] || PALETAS[0];
    const oscuro = (parseInt(p.f.slice(1, 3), 16) * 0.3 + parseInt(p.f.slice(3, 5), 16) * 0.6 + parseInt(p.f.slice(5, 7), 16) * 0.1) < 140;
    return { c: [p.f, mezcla(p.f, 0.25)], tx: oscuro ? '#ffffff' : '#2b2118' };
  }

  // ---------- fondos ----------
  function fondo(x, esc, c, T) {
    const g = x.createLinearGradient(0, 0, W, W);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    x.fillStyle = g; x.fillRect(0, 0, W, W);
    const est = esc.est || 'liso';
    if (est === 'aurora') {
      [[0.3 + 0.2 * Math.sin(T * 0.4), 0.35 + 0.1 * Math.cos(T * 0.3)], [0.7 + 0.15 * Math.cos(T * 0.35), 0.65 + 0.12 * Math.sin(T * 0.45)]].forEach((p, k) => {
        const r = x.createRadialGradient(W * p[0], W * p[1], 0, W * p[0], W * p[1], W * 0.6);
        r.addColorStop(0, rgba(c[1], k ? 0.45 : 0.6)); r.addColorStop(1, rgba(c[1], 0));
        x.fillStyle = r; x.fillRect(0, 0, W, W);
      });
    } else if (est === 'malla') {
      for (let k = 0; k < 5; k++) {
        x.beginPath();
        for (let px = 0; px <= W; px += 12) {
          const py = W * (0.2 + k * 0.15) + Math.sin(px * 0.012 + T * 0.8 + k) * 36;
          if (px === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.lineWidth = 40; x.strokeStyle = rgba(c[1], 0.16); x.stroke();
      }
    } else if (est === 'rayos') {
      x.save(); x.translate(W / 2, W / 2); x.rotate(T * 0.05);
      for (let k = -8; k <= 8; k++) { x.fillStyle = rgba(c[1], 0.07); x.fillRect(k * 90 - 22, -W * 1.5, 44, W * 3); }
      x.restore();
    }
  }

  // ---------- texto ----------
  function envolver(x, texto, max) {
    const out = [];
    String(texto || '').split('\n').forEach((parrafo) => {
      let cur = '';
      parrafo.split(' ').forEach((p) => {
        const t = cur ? cur + ' ' + p : p;
        if (x.measureText(t).width > max && cur) { out.push(cur); cur = p; } else cur = t;
      });
      out.push(cur);
    });
    return out;
  }
  function fuente(x, tam, grosor, serif) { x.font = grosor + ' ' + tam + 'px ' + (serif ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif'); }
  // Busca el tamaño más grande que quepa en el ancho y alto dados.
  const MEMO = new Map();
  function ajustar(x, titulo, sub, maxW, maxH, tMax) {
    const clave = [titulo, sub, maxW, maxH, tMax].join('|');
    if (MEMO.has(clave)) return MEMO.get(clave);
    if (MEMO.size > 300) MEMO.clear();
    let tam = tMax, lt = [], ls = [], ts = 0;
    for (; tam >= 36; tam -= 4) {
      fuente(x, tam, 700, true); lt = envolver(x, titulo, maxW);
      ts = Math.max(30, Math.round(tam * 0.46));
      fuente(x, ts, 400, false); ls = sub ? envolver(x, sub, maxW) : [];
      fuente(x, tam, 700, true);
      const wT = lt.map((l) => x.measureText(l).width);
      fuente(x, ts, 400, false);
      const wS = ls.map((l) => x.measureText(l).width);
      const cabe = wT.concat(wS).every((w) => w <= maxW);     // ninguna palabra se sale de la pantalla
      if (cabe && lt.length * tam * 1.15 + (ls.length ? 28 + ls.length * ts * 1.3 : 0) <= maxH) break;
    }
    const res = { tam: tam, lt: lt, ts: ts, ls: ls };
    MEMO.set(clave, res);
    return res;
  }
  function texto(x, e, T, tl, d, layout, col) {
    const f = Math.max(0, Math.min(1, tl / Math.max(0.3, d)));
    const ease = (v) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
    const anim = e.anim || 'aparecer';
    let alpha = anim === 'palabras' ? 1 : ease(f * 5);
    const izq = layout === 'editorial' || layout === 'tercio';
    const maxW = W * (layout === 'gigante' ? 0.9 : izq ? 0.78 : 0.82);
    const maxH = W * (layout === 'cristal' ? 0.5 : 0.7);
    const tMax = layout === 'gigante' ? 170 : 116;
    const a = ajustar(x, e.titulo || '', e.subtitulo || '', maxW, maxH, tMax);
    const alto = a.lt.length * a.tam * 1.15 + (a.ls.length ? 28 + a.ls.length * a.ts * 1.3 : 0);
    const yC = layout === 'tercio' ? W * 0.72 : W / 2;
    let y0 = yC - alto / 2;
    x.save();
    if (layout === 'cristal') {
      const cw = W * 0.86, ch = alto + 80, cx = (W - cw) / 2, cy = W / 2 - ch / 2;
      x.globalAlpha = alpha * 0.28; x.fillStyle = '#000';
      x.beginPath(); x.roundRect ? x.roundRect(cx, cy, cw, ch, 28) : x.rect(cx, cy, cw, ch); x.fill();
      y0 = cy + 40;
    }
    if (anim === 'enfoque' && 'filter' in x) x.filter = 'blur(' + Math.round((1 - Math.min(1, f * 3)) * 14) + 'px)';
    x.fillStyle = col; x.globalAlpha = alpha;
    x.textAlign = izq ? 'left' : 'center'; x.textBaseline = 'top';
    const px = izq ? W * 0.08 : W / 2;
    fuente(x, a.tam, 700, true);
    let y = y0;
    a.lt.forEach((l, j) => {
      if (anim === 'palabras') x.globalAlpha = Math.max(0, Math.min(1, f * (a.lt.length + 1) * 1.4 - j));
      x.fillText(l, px, y); y += a.tam * 1.15;
    });
    if (a.ls.length) {
      y += 28; fuente(x, a.ts, 400, false); x.globalAlpha = alpha * 0.9;
      a.ls.forEach((l, j) => {
        if (anim === 'palabras') x.globalAlpha = Math.max(0, Math.min(1, f * (a.ls.length + a.lt.length + 1) * 1.2 - (a.lt.length + j)));
        x.fillText(l, px, y); y += a.ts * 1.3;
      });
    }
    x.restore();
  }

  // ---------- efectos ----------
  function efectos(x, e, T, col) {
    const fx = e.fx || [];
    if (fx.indexOf('bokeh') >= 0) {
      for (let k = 0; k < 12; k++) {
        const cx = W * ((k * 0.137 + 0.1 + T * 0.02 * (k % 3 + 1)) % 1.1), cy = W * ((k * 0.211 + 0.2 + Math.sin(T * 0.3 + k) * 0.05) % 1);
        x.fillStyle = rgba(col, 0.12); x.beginPath(); x.arc(cx, cy, 14 + (k % 5) * 9, 0, Math.PI * 2); x.fill();
      }
    }
    if (fx.indexOf('grano') >= 0) {
      x.fillStyle = rgba(col, 0.07);
      for (let k = 0; k < 220; k++) x.fillRect(Math.random() * W, Math.random() * W, 2, 2);
    }
    if (fx.indexOf('barrido') >= 0) {
      const p = (T * 0.25) % 1.6, bx = W * (-0.6 + p * 1.3);
      const g = x.createLinearGradient(bx - 90, 0, bx + 90, W);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, 0.22)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, W);
    }
  }

  // ---------- escena completa ----------
  function escena(x, e, tl, d, T, idx) {
    const cl = colores(e);
    x.save(); x.clearRect(0, 0, W, W);
    fondo(x, e, cl.c, T);
    texto(x, e, T, tl, d, e.lay || 'centro', cl.tx);
    efectos(x, e, T, cl.tx);
    x.restore();
  }

  // Transición entre dos escenas. p va de 0 a 1.
  function mezclar(out, tin, A, B, p) {
    const o = out.getContext('2d');
    o.clearRect(0, 0, W, W);
    const e = (v) => v * v * (3 - 2 * v);
    p = e(Math.max(0, Math.min(1, p)));
    if (tin === 'slide') { o.drawImage(A, -W * p, 0); o.drawImage(B, W * (1 - p), 0); return; }
    if (tin === 'zoom') { o.drawImage(A, 0, 0); o.globalAlpha = p; o.save(); o.translate(W / 2, W / 2); o.scale(1.15 - 0.15 * p, 1.15 - 0.15 * p); o.translate(-W / 2, -W / 2); o.drawImage(B, 0, 0); o.restore(); o.globalAlpha = 1; return; }
    if (tin === 'blur') {
      o.drawImage(A, 0, 0);
      if ('filter' in o) o.filter = 'blur(' + Math.round(p * 10) + 'px)';
      o.globalAlpha = p; o.drawImage(B, 0, 0); o.globalAlpha = 1;
      if ('filter' in o) o.filter = 'none';
      return;
    }
    if (tin === 'iris') {
      o.drawImage(A, 0, 0); o.save(); o.beginPath(); o.arc(W / 2, W / 2, p * W * 0.75, 0, Math.PI * 2); o.clip(); o.drawImage(B, 0, 0); o.restore(); return;
    }
    if (tin === 'cortina') {
      o.drawImage(A, 0, 0); o.save(); o.beginPath(); o.moveTo(0, 0); o.lineTo(p * W * 2, 0); o.lineTo(0, p * W * 2); o.closePath(); o.clip(); o.drawImage(B, 0, 0); o.restore(); return;
    }
    o.drawImage(A, 0, 0); o.globalAlpha = p; o.drawImage(B, 0, 0); o.globalAlpha = 1;   // fundido
  }

  // Dibuja el instante T del video (en segundos) sobre el canvas cv.
  function cuadro(cv, escs, starts, total, T, A, B) {
    const x = cv.getContext('2d');
    if (cv.width !== W) { cv.width = W; cv.height = W; }
    let i = 0;
    while (i < escs.length - 1 && T >= starts[i + 1]) i++;
    const e = escs[i], d = Number(e.seg) || SEG_MIN, tl = T - starts[i];
    if (i > 0 && tl < TR && (escs[i].tin || 'fade')) {
      const prev = escs[i - 1], dp = Number(prev.seg) || SEG_MIN;
      escena(A.getContext('2d'), prev, T - starts[i - 1], dp, T, i - 1);
      escena(B.getContext('2d'), e, tl, d, T, i);
      mezclar(cv, e.tin || 'fade', A, B, tl / TR);
    } else {
      escena(x, e, tl, d, T, i);
    }
    // barra de avance del video completo
    x.save(); x.globalAlpha = 0.55; x.fillStyle = colores(e).tx; x.fillRect(0, W - 10, W * Math.min(1, T / total), 10); x.restore();
    return i;
  }

  // Reproduce el video completo. track: pista de video para grabar (o null para verlo).
  function reproducir(cv, escs, track, alTerminar, alEscena, opc) {
    const grabando = !!track;
    if (cv.width !== W) { cv.width = W; cv.height = W; }
    const starts = [], lista = escs.map((e) => Number(e.seg) || SEG_MIN);
    let acc = 0; lista.forEach((d) => { starts.push(acc); acc += d; });
    const total = acc;
    const A = document.createElement('canvas'), B = document.createElement('canvas');
    A.width = B.width = W; A.height = B.height = W;
    const t0 = Date.now(); let ultima = -1, cuadros = 0, virtual = 0;
    const FPS = 15;
    const ctl = { tick: null, sonido: null, stop() { clearInterval(ctl.tick); if (ctl.sonido) { ctl.sonido.detener(); ctl.sonido = null; } } };
    if (opc && opc.audio) ctl.sonido = programarAudio(opc.audio, escs, starts, total, opc.musica, opc.volumen);
    const paso = () => {
      // Al grabar, el tiempo avanza por cuadros (1/15 s): así el video dura exactamente lo previsto aunque el teléfono vaya lento.
      const T = grabando ? virtual : (Date.now() - t0) / 1000;
      if (T >= total - 1e-6) {
        clearInterval(ctl.tick);
        cuadro(cv, escs, starts, total, total - 0.001, A, B);
        if (track && track.requestFrame) track.requestFrame();
        // Un instante extra para que el último cuadro quede dentro de la grabación.
        setTimeout(() => { if (ctl.sonido) { ctl.sonido.detener(); ctl.sonido = null; } if (alTerminar) alTerminar(); }, grabando ? 400 : 0);
        return;
      }
      const i = cuadro(cv, escs, starts, total, T, A, B);
      if (track && track.requestFrame) track.requestFrame();
      if (grabando) { virtual += 1 / FPS; cuadros++; }
      if (i !== ultima) { ultima = i; if (alEscena) alEscena(i, total); }
    };
    paso();
    ctl.tick = setInterval(paso, grabando ? 1000 / FPS : 66);
    return ctl;
  }

  // ---------- interfaz ----------
  function lista() {
    const d = leer();
    pantalla(volverA('Crear', () => { if (window.TBEstudioCreativo) window.TBEstudioCreativo.abrir(); }) +
      '<h1 class="ec-h">🎬 Estudio de videos</h1>' +
      '<p class="ec-guia">Un video son escenas: cada una tiene título, texto, fondo y el tiempo que dura.</p>' +
      '<button type="button" class="ec-cat" id="evPlant"><span class="ec-ci" aria-hidden="true">⭐</span><b>Plantillas listas</b><small>41 videos para usar: cámbiales el texto</small></button>' +
      '<button type="button" class="ec-cat" id="evNuevo"><span class="ec-ci" aria-hidden="true">➕</span><b>Nuevo video</b><small>Escribe tus escenas desde cero</small></button>' +
      (d.videos.length
        ? '<h2 class="ec-sub">Mis videos</h2><div class="ec-lista">' + d.videos.map((v) => '<button type="button" class="ec-item" data-id="' + esc(v.id) + '"><b>' + esc(v.titulo) + '</b><small>' + v.escenas.length + (v.escenas.length === 1 ? ' escena' : ' escenas') + ' · ' + duracion(v) + ' s</small></button>').join('') + '</div>'
        : '<p class="ec-guia">Aún no tienes videos propios. Empieza con una plantilla.</p>'));
    enlazarVolver();
    $('#evPlant').onclick = () => { vibra(); galeria(); };
    $('#evNuevo').onclick = () => { vibra(); formulario(null); };
    document.querySelectorAll('.ec-item[data-id]').forEach((b) => {
      b.onclick = () => { vibra(); const v = leer().videos.find((x) => x.id === b.dataset.id); if (v) detalle(v); };
    });
  }

  async function galeria() {
    pantalla(volverA('Videos', lista) + '<h1 class="ec-h">⭐ Plantillas listas</h1><p class="ec-guia">Toca una para verla en la pantalla, cambiarle el texto y crear tu video.</p><p class="ec-prog">Cargando…</p>');
    enlazarVolver();
    const c = await cargarCatalogo();
    const plantillas = c.VIDEOS_PLANTILLAS || [];
    const grupos = (c.VIDEOS_GRUPOS_PLANTILLAS || []);
    const en = new Set(grupos.reduce((a, g) => a.concat(g.ids), []));
    const bloques = grupos.map((g) => ({ t: g.titulo, ids: g.ids })).concat(
      [{ t: '✨ Otras plantillas', ids: plantillas.map((p) => p.id).filter((id) => !en.has(id)) }]);
    const html = bloques.filter((b) => b.ids.length).map((b) =>
      '<h2 class="ec-sub">' + esc(b.t) + '</h2><div class="ec-lista">' + b.ids.map((id) => {
        const p = plantillas.find((q) => q.id === id); if (!p) return '';
        return '<button type="button" class="ec-item ev-plant" data-p="' + esc(p.id) + '"><b>' + esc(p.icono || '🎬') + ' ' + esc(p.nombre) + '</b><small>' + esc(p.usa || p.ocasion || '') + ' · ' + p.escenas.length + ' escenas</small></button>';
      }).join('') + '</div>').join('');
    const cab = document.querySelector('#pantalla .ec-guia');
    const pr = document.querySelector('#pantalla .ec-prog'); if (pr) pr.remove();
    const cont = document.createElement('div');
    cont.innerHTML = plantillas.length ? html : '<p class="ec-aviso-txt" role="status">No se pudieron cargar las plantillas. Conéctate a internet una vez y vuelve a intentar.</p>';
    $('#pantalla').appendChild(cont);
    document.querySelectorAll('.ev-plant').forEach((b) => {
      b.onclick = () => { vibra(); const p = plantillas.find((q) => q.id === b.dataset.p); if (p) vistaPlantilla(p); };
    });
    if (cab) cab.setAttribute('data-listo', '1');
  }

  // Vista de una plantilla: se ve en la pantalla y se puede pasar a un video propio.
  function vistaPlantilla(p) {
    const v = plantillaAVideo(p);
    pantalla(volverA('Plantillas', galeria) + '<h1 class="ec-h">' + esc(p.icono || '🎬') + ' ' + esc(p.nombre) + '</h1>' +
      '<p class="ec-guia">' + esc(p.usa || '') + '</p>' +
      '<canvas id="evLienzo" class="ec-lienzo" role="img" aria-label="Vista previa de la plantilla"></canvas>' +
      '<p class="ec-prog" id="evProg" aria-live="polite"></p>' +
      '<button type="button" class="ec-cat" id="evVerP"><span class="ec-ci" aria-hidden="true">▶️</span><b>Ver</b><small>Pasa las escenas en la pantalla</small></button>' +
      '<button type="button" class="ec-cat" id="evUsar"><span class="ec-ci" aria-hidden="true">✏️</span><b>Usar esta plantilla</b><small>Cambia los textos y crea tu video</small></button>');
    enlazarVolver();
    const ver = () => { if (vista) vista.stop(); vista = reproducir($('#evLienzo'), v.escenas, null, () => { vista = null; const q = $('#evProg'); if (q) q.textContent = 'Fin de la vista previa.'; }, (i) => { const q = $('#evProg'); if (q) q.textContent = 'Escena ' + (i + 1) + ' de ' + v.escenas.length + ' · ' + (v.escenas[i].titulo || ''); }); };
    $('#evVerP').onclick = () => { vibra(); ver(); };
    $('#evUsar').onclick = () => { vibra(); formulario(v); };
    ver();
  }

  function plantillaAVideo(p) {
    return {
      id: nuevoId('v'), titulo: p.nombre, paleta: 0, plantilla: p.id,
      escenas: p.escenas.map((e) => ({ id: nuevoId('e'), titulo: e.t || '', subtitulo: e.s || '', seg: Math.max(SEG_MIN, Math.min(SEG_MAX, Number(e.d) || 3)), pal: 0, c: e.c, tin: e.tin, est: e.est, lay: e.lay, anim: e.anim, fx: e.fx || [], sfx: e.sfx || '' }))
    };
  }

  function detalle(v) {
    const n = v.escenas.length;
    pantalla(volverA('Videos', lista) +
      '<h1 class="ec-h">' + esc(v.titulo) + '</h1>' +
      '<p class="ec-guia">' + n + (n === 1 ? ' escena' : ' escenas') + ' · ' + duracion(v) + ' s en total.</p>' +
      '<ol class="ev-lista">' + v.escenas.map((e) => '<li><b>' + esc(e.titulo) + '</b>' + (e.subtitulo ? '<span>' + esc(e.subtitulo) + '</span>' : '') + '<small>' + e.seg + ' s</small></li>').join('') + '</ol>' +
      '<div class="ec-cats">' +
      (n ? '<button type="button" class="ec-cat" id="evVer"><span class="ec-ci" aria-hidden="true">▶️</span><b>Ver</b><small>Pasa las escenas en la pantalla</small></button>' +
        '<button type="button" class="ec-cat" id="evGrabar"><span class="ec-ci" aria-hidden="true">🎬</span><b>Crear video</b><small>Se graba y se puede descargar</small></button>' : '') +
      '<button type="button" class="ec-cat" id="evEditar"><span class="ec-ci" aria-hidden="true">✏️</span><b>Editar</b><small>Títulos, tiempos y fondos</small></button>' +
      '<button type="button" class="ec-cat" id="evQuitar"><span class="ec-ci" aria-hidden="true">🗑️</span><b>Quitar</b><small>Sacarlo de mis videos</small></button>' +
      '</div>');
    enlazarVolver();
    const ver = $('#evVer'); if (ver) ver.onclick = () => { vibra(); verVideo(v); };
    const gr = $('#evGrabar'); if (gr) gr.onclick = () => { vibra(); grabar(v); };
    $('#evEditar').onclick = () => { vibra(); formulario(v); };
    $('#evQuitar').onclick = () => {
      if (!confirm('¿Quitar «' + v.titulo + '» de tus videos?')) return;
      const d = leer(); d.videos = d.videos.filter((x) => x.id !== v.id); guardar(d); lista();
    };
  }

  function verVideo(v) {
    pantalla(volverA('Video', () => detalle(v)) + '<h1 class="ec-h">' + esc(v.titulo) + '</h1>' +
      '<canvas id="evLienzo" class="ec-lienzo" role="img" aria-label="Vista previa del video"></canvas><p class="ec-prog" id="evProg" aria-live="polite"></p>');
    enlazarVolver();
    vista = reproducir($('#evLienzo'), v.escenas, null, () => { vista = null; const q = $('#evProg'); if (q) q.textContent = 'Fin de la vista previa.'; }, (i) => { const q = $('#evProg'); if (q) q.textContent = 'Escena ' + (i + 1) + ' de ' + v.escenas.length + ' · ' + (v.escenas[i].titulo || ''); }, { audio: abrirAudio(), musica: MUS.get(v.id), volumen: v.musica && v.musica.vol });
  }

  function grabar(v, atras) {
    const mime = mimeVideo();
    const cab = volverA(atras ? 'Volver' : 'Video', atras || (() => detalle(v))) + '<h1 class="ec-h">' + esc(v.titulo) + '</h1>';
    if (!mime || !document.createElement('canvas').captureStream) {
      pantalla(cab + '<p class="ec-guia">Tu navegador no puede crear video. Usa «Ver» para pasar las escenas en la pantalla.</p>');
      enlazarVolver(); return;
    }
    pantalla(cab +
      '<p class="ec-guia">Se graba un video de ' + v.escenas.length + (v.escenas.length === 1 ? ' escena' : ' escenas') + ', ' + duracion(v) + ' s en total. Deja esta pantalla abierta hasta que termine.</p>' +
      '<canvas id="evLienzo" class="ec-lienzo" role="img" aria-label="Vista previa del video"></canvas>' +
      '<p class="ec-prog" id="evProg" aria-live="polite">Preparando…</p><div id="evResul"></div>');
    enlazarVolver();
    const cv = $('#evLienzo');
    const audio = abrirAudio();
    const stream = cv.captureStream(15);
    const track = stream.getVideoTracks()[0];
    if (audio) {
      audio.dest = audio.ctx.createMediaStreamDestination();
      audio.master.connect(audio.dest);
      stream.addTrack(audio.dest.stream.getAudioTracks()[0]);
    }
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
    const g = { rec: rec, handle: null, descartar: false };
    grab = g;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      if (grab === g) grab = null;
      if (g.descartar) return;
      const ext = mime.indexOf('video/mp4') === 0 ? 'mp4' : 'webm';
      const url = URL.createObjectURL(new Blob(chunks, { type: mime.split(';')[0] }));
      const p = $('#evProg'); if (p) p.textContent = 'Listo. Puedes verlo y descargarlo.';
      const r = $('#evResul');
      if (r) r.innerHTML = '<video class="ec-video" controls playsinline src="' + url + '"></video>' +
        '<button type="button" class="ec-cat" id="evBajar"><span class="ec-ci" aria-hidden="true">⬇️</span><b>Descargar video</b><small>Se guarda en tu teléfono</small></button>';
      const b = $('#evBajar');
      if (b) b.onclick = () => { vibra(); const a = document.createElement('a'); a.href = url; a.download = slug(v.titulo) + '.' + ext; document.body.appendChild(a); a.click(); a.remove(); };
    };
    rec.start(500);
    g.audio = audio;
    g.handle = reproducir(cv, v.escenas, track, () => { try { rec.stop(); } catch (e) { /* nada */ } }, (i, total) => {
      const p = $('#evProg'); if (p) p.textContent = 'Grabando escena ' + (i + 1) + ' de ' + v.escenas.length + ' (' + total + ' s)';
    }, { audio: audio, musica: MUS.get(v.id), volumen: v.musica && v.musica.vol });
  }

  function formulario(v) {
    const edit = !!(v && v.id && leer().videos.some((x) => x.id === v.id));
    const b = v ? JSON.parse(JSON.stringify(v)) : { id: nuevoId('v'), titulo: '', paleta: 0, escenas: [{ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }] };
    const volverDe = () => (edit ? detalle(v) : lista());
    const opts = (lista, sel) => lista.map((o) => '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[1] + '</option>').join('');
    const pintarForm = (err) => {
      pantalla(volverA(edit ? 'Video' : 'Videos', volverDe) +
        '<h1 class="ec-h">' + (edit ? 'Editar video' : 'Nuevo video') + '</h1>' +
        '<label class="ec-campo">Título del video<input id="evTit" class="ea-input" maxlength="120" value="' + esc(b.titulo) + '" placeholder="Ej.: Bienvenida"></label>' +
        '<h2 class="ec-sub">Escenas</h2>' +
        b.escenas.map((e, i) => {
          const fijo = Array.isArray(e.c) ? '<option value="orig" selected>Diseño original</option>' : '';
          return '<div class="ev-esc"><b>Escena ' + (i + 1) + '</b>' +
          '<label class="ec-campo">Título<input class="ea-input" maxlength="80" data-k="titulo" data-i="' + i + '" value="' + esc(e.titulo) + '" placeholder="Título de la escena"></label>' +
          '<label class="ec-campo">Texto pequeño (opcional)<input class="ea-input" maxlength="120" data-k="subtitulo" data-i="' + i + '" value="' + esc(e.subtitulo) + '"></label>' +
          '<div class="ev-fila"><label class="ec-campo">Segundos<input class="ea-input" type="number" min="' + SEG_MIN + '" max="' + SEG_MAX + '" step="0.5" data-k="seg" data-i="' + i + '" value="' + e.seg + '"></label>' +
          '<label class="ec-campo">Fondo<select class="ea-input" data-k="pal" data-i="' + i + '">' + fijo + PALETAS.map((p, k) => '<option value="' + k + '"' + (!Array.isArray(e.c) && k === (e.pal || 0) ? ' selected' : '') + '>' + p.n + '</option>').join('') + '</select></label></div>' +
          '<div class="ev-fila"><label class="ec-campo">Diseño<select class="ea-input" data-k="lay" data-i="' + i + '">' + opts(DISENOS, e.lay || 'centro') + '</select></label>' +
          '<label class="ec-campo">Movimiento del fondo<select class="ea-input" data-k="est" data-i="' + i + '">' + opts(FONDOS, e.est || 'liso') + '</select></label></div>' +
          '<div class="ev-fila"><label class="ec-campo">Aparición del texto<select class="ea-input" data-k="anim" data-i="' + i + '">' + opts(ANIMS, e.anim || 'aparecer') + '</select></label>' +
          '<label class="ec-campo">Cómo pasa a la siguiente<select class="ea-input" data-k="tin" data-i="' + i + '">' + opts(TRANSICIONES, e.tin || 'fade') + '</select></label></div>' +
          '<label class="ec-campo">Sonido al entrar<select class="ea-input" data-k="sfx" data-i="' + i + '">' + SFX.map((o) => '<option value="' + o[0] + '"' + ((e.sfx || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
          '<div class="ev-btns"><button type="button" class="chip" data-mv="-1" data-i="' + i + '" aria-label="Subir escena">▲</button><button type="button" class="chip" data-mv="1" data-i="' + i + '" aria-label="Bajar escena">▼</button><button type="button" class="chip" data-del="' + i + '">Quitar</button></div></div>';
        }).join('') +
        '<h2 class="ec-sub">Música de fondo</h2>' +
        '<div class="ev-esc">' + (b.musica
          ? '<p class="ev-mus">🎵 ' + esc(b.musica.nombre) + '</p>' + (MUS.has(b.id) ? '' : '<p class="ec-aviso-txt">Vuelve a elegir el audio para usarlo en esta sesión.</p>') +
            '<label class="ec-campo">Volumen: <output id="evVolOut">' + (b.musica.vol == null ? 60 : b.musica.vol) + '</output>%<input type="range" id="evVol" min="0" max="100" step="5" value="' + (b.musica.vol == null ? 60 : b.musica.vol) + '"></label>' +
            '<div class="ev-btns"><button type="button" class="chip" id="evQuitarMus">Quitar música</button></div>'
          : '<label class="ec-campo">Elige un audio (MP3, M4A o WAV)<input type="file" id="evAudio" accept="audio/*"></label>') + '</div>' +
        '<button type="button" class="ec-cat" id="evAdd"><span class="ec-ci" aria-hidden="true">➕</span><b>Agregar escena</b><small>Hasta 40 escenas</small></button>' +
        '<p class="ec-aviso-txt" id="evErr" role="alert"' + (err ? '' : ' hidden') + '>' + esc(err || '') + '</p>' +
        '<button type="button" class="ec-cat" id="evOk"><span class="ec-ci" aria-hidden="true">💾</span><b>Guardar video</b><small>Queda en tu teléfono</small></button>');
      enlazarVolver();
      const leerForm = () => {
        const t = $('#evTit'); if (t) b.titulo = t.value.trim().slice(0, 120);
        const vol = $('#evVol'); if (vol && b.musica) b.musica.vol = Number(vol.value);
        document.querySelectorAll('#pantalla [data-k][data-i]').forEach((el) => {
          const i = Number(el.dataset.i), k = el.dataset.k; const e = b.escenas[i]; if (!e) return;
          if (k === 'seg') e.seg = Math.max(SEG_MIN, Math.min(SEG_MAX, Math.round((Number(el.value) || SEG_MIN) * 2) / 2));
          else if (k === 'pal') { if (el.value === 'orig') return; e.pal = Number(el.value) || 0; delete e.c; }
          else if (k === 'lay' || k === 'est' || k === 'anim' || k === 'tin' || k === 'sfx') e[k] = el.value;
          else e[k] = el.value.trim().slice(0, k === 'titulo' ? 80 : 120);
        });
      };
      const au = $('#evAudio');
      if (au) au.onchange = () => {
        const f = au.files && au.files[0]; if (!f) return;
        leerForm();
        cargarMusica(b, f).then(() => { b.musica = { nombre: f.name.slice(0, 80), vol: 60 }; pintarForm(); })
          .catch(() => pintarForm('No se pudo leer ese audio. Prueba con un MP3, M4A o WAV.'));
      };
      const qm = $('#evQuitarMus');
      if (qm) qm.onclick = () => { vibra(); leerForm(); MUS.delete(b.id); b.musica = null; pintarForm(); };
      $('#evAdd').onclick = () => { vibra(); leerForm(); if (b.escenas.length >= 40) return; b.escenas.push({ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }); pintarForm(); };
      document.querySelectorAll('[data-del]').forEach((el) => { el.onclick = () => { vibra(); leerForm(); b.escenas.splice(Number(el.dataset.del), 1); if (!b.escenas.length) b.escenas.push({ id: nuevoId('e'), titulo: '', subtitulo: '', seg: 4, pal: 0 }); pintarForm(); }; });
      document.querySelectorAll('[data-mv]').forEach((el) => { el.onclick = () => { vibra(); leerForm(); const i = Number(el.dataset.i), j = i + Number(el.dataset.mv); if (j < 0 || j >= b.escenas.length) return; const t = b.escenas[i]; b.escenas[i] = b.escenas[j]; b.escenas[j] = t; pintarForm(); }; });
      $('#evOk').onclick = () => {
        leerForm();
        if (!b.titulo) return pintarForm('Escribe el título del video.');
        if (b.escenas.some((e) => !e.titulo)) return pintarForm('Cada escena necesita un título.');
        const d = leer();
        const i = d.videos.findIndex((x) => x.id === b.id);
        if (i >= 0) d.videos[i] = b; else d.videos.push(b);
        guardar(d); vibra();
        detalle(b);
      };
    };
    pintarForm('');
  }

  // Grabación desde otra sección (p. ej. canciones): escenas ya armadas, música opcional (archivo de audio).
  function grabarEscenas(titulo, escenas, opc) {
    opc = opc || {};
    const v = { id: nuevoId('x'), titulo: titulo, escenas: escenas, musica: null };
    const grabarYa = () => grabar(v, opc.atras);
    if (!opc.archivo) return grabarYa();
    const a = abrirAudio();
    if (!a) return grabarYa();
    try { a.ctx.close(); } catch (e) { /* nada */ }
    cargarMusica(v, opc.archivo).then(() => { v.musica = { nombre: opc.archivo.name, vol: opc.volumen == null ? 60 : opc.volumen }; grabarYa(); })
      .catch(() => grabarYa());
  }
  window.TBEstudioVideos = { abrir: lista, grabarEscenas: grabarEscenas, _t: { colores, envolver, cuadro, reproducir, duracion, plantillaAVideo, TRANSICIONES, FONDOS, DISENOS, ANIMS, EFECTOS, W } };
})();
