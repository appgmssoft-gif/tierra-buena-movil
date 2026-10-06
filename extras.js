// extras.js - F900. Capa visual de Tierra Buena que NO toca el código del inicio de sesión ni de la Biblia:
//   1) Fondo vivo por lugar (Palabra = campo y luz · Vida = siembra y luciérnagas · Iglesia = luz del templo · Perfil = noche estrellada)
//   2) Carrusel de imágenes animadas al comienzo de cada sección, con mini botón «¿Qué puedo hacer?» que abre una hoja explicativa
//   3) Fábula del mes visible y viva en Palabra  ·  «Hoy lo hago» destacado  ·  interruptor de sonidos en Perfil
// IMPORTANTE (CSP): la página no permite el atributo style en el HTML; todo color y movimiento va en extras.css o con element.style.setProperty.
'use strict';
(function () {
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const calma = () => { try { return document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const snd = (n) => { try { if (window.TBSonido) TBSonido[n](); } catch (e) { /* sin sonido */ } };

  // ---------- 1) FONDO VIVO ----------
  const R = (a, b) => a + ((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1 + 1) % 1 * (b - a);   // «azar» fijo (siempre igual, no parpadea al recargar)
  function escenaPalabra() {
    let n = '', p = '';
    for (let i = 0; i < 4; i++) n += `<g class="fv-nube"><ellipse cx="${60 + i * 95}" cy="${90 + i * 46}" rx="${46 - i * 4}" ry="13"/><ellipse cx="${88 + i * 95}" cy="${80 + i * 46}" rx="28" ry="12"/></g>`;
    for (let i = 0; i < 16; i++) p += `<circle class="fv-polen" cx="${R(10, 390).toFixed(0)}" cy="${R(420, 780).toFixed(0)}" r="${(1.2 + (i % 3) * .7).toFixed(1)}"/>`;
    return `<svg class="fv-esc fv-palabra" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="fvPc" x1="0" y1="0" x2="0" y2="1"><stop class="fv-s0" offset="0"/><stop class="fv-s1" offset="1"/></linearGradient></defs>
      <rect width="400" height="800" fill="url(#fvPc)"/>
      <g class="fv-rayos"><polygon points="300,-40 360,-40 150,520 60,520"/><polygon points="380,-40 430,-40 300,520 230,520"/><polygon points="200,-40 240,-40 40,520 -20,520"/></g>
      <circle class="fv-sol" cx="318" cy="120" r="46"/>${n}
      <path class="fv-col fv-col1" d="M0 560 Q110 500 220 548 T400 520 V800 H0z"/><path class="fv-col fv-col2" d="M0 630 Q130 585 250 624 T400 600 V800 H0z"/><path class="fv-col fv-col3" d="M0 700 Q120 668 240 696 T400 684 V800 H0z"/>${p}
      <path class="fv-ave" d="M0 0q8-10 16 0q8-10 16 0"/><path class="fv-ave fv-ave2" d="M0 0q6-8 12 0q6-8 12 0"/></svg>`;
  }
  function escenaVida() {
    let t = '', l = '';
    for (let i = 0; i < 26; i++) { const x = 8 + i * 15.5, h = 60 + ((i * 37) % 55), y = 720 - ((i * 23) % 40); t += `<g class="fv-tg"><path class="fv-tallo" d="M${x} ${y + 80}q${i % 2 ? 6 : -6} -${h * .5} 0 -${h}"/><path class="fv-hoja" d="M${x} ${y + 80 - h * .6}q${i % 2 ? 14 : -14} -10 ${i % 2 ? 22 : -22} -2q-${i % 2 ? 12 : -12} 10 -${i % 2 ? 22 : -22} 2z"/></g>`; }
    for (let i = 0; i < 14; i++) l += `<circle class="fv-luci" cx="${R(20, 380).toFixed(0)}" cy="${R(480, 740).toFixed(0)}" r="${(2 + (i % 3)).toFixed(0)}"/>`;
    return `<svg class="fv-esc fv-vida" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="fvVc" x1="0" y1="0" x2="0" y2="1"><stop class="fv-v0" offset="0"/><stop class="fv-v1" offset=".75"/><stop class="fv-v2" offset="1"/></linearGradient><radialGradient id="fvVs" cx=".5" cy=".5" r=".5"><stop class="fv-vs0" offset="0"/><stop class="fv-vs1" offset="1"/></radialGradient></defs>
      <rect width="400" height="800" fill="url(#fvVc)"/><circle class="fv-sol2" cx="90" cy="610" r="150" fill="url(#fvVs)"/>
      <path class="fv-col fv-col2" d="M0 600 Q140 560 260 596 T400 580 V800 H0z"/><g class="fv-trigal">${t}</g>${l}</svg>`;
  }
  function escenaIglesia() {
    let m = '';
    for (let i = 0; i < 18; i++) m += `<circle class="fv-mota" cx="${R(70, 330).toFixed(0)}" cy="${R(300, 760).toFixed(0)}" r="${(1.2 + (i % 3) * .8).toFixed(1)}"/>`;
    return `<svg class="fv-esc fv-iglesia" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="fvIc" x1="0" y1="0" x2="0" y2="1"><stop class="fv-i0" offset="0"/><stop class="fv-i1" offset="1"/></linearGradient></defs>
      <rect width="400" height="800" fill="url(#fvIc)"/>
      <path class="fv-arco" d="M110 560V300a90 90 0 0 1 180 0V560z"/><path class="fv-arco2" d="M150 560V310a50 50 0 0 1 100 0V560z"/>
      <g class="fv-haz"><polygon points="170,300 230,300 330,800 70,800"/><polygon points="188,300 212,300 250,800 150,800"/></g>
      <path class="fv-cruz" d="M200 214v70M176 242h48"/>${m}<rect class="fv-piso" x="0" y="700" width="400" height="100"/></svg>`;
  }
  function escenaPerfil() {
    let e = '';
    for (let i = 0; i < 40; i++) e += `<circle class="fv-est" cx="${R(6, 394).toFixed(0)}" cy="${R(10, 520).toFixed(0)}" r="${(0.8 + (i % 4) * .5).toFixed(1)}"/>`;
    return `<svg class="fv-esc fv-perfil" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs><linearGradient id="fvNc" x1="0" y1="0" x2="0" y2="1"><stop class="fv-n0" offset="0"/><stop class="fv-n1" offset="1"/></linearGradient></defs>
      <rect width="400" height="800" fill="url(#fvNc)"/>${e}<circle class="fv-luna-h" cx="90" cy="140" r="64"/><path class="fv-luna" transform="translate(70 120) scale(1.7)" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
      <path class="fv-fugaz" d="M0 0L-70 36"/><path class="fv-col fv-mon1" d="M0 600 L70 520 L130 580 L210 480 L290 570 L340 530 L400 590 V800 H0z"/><path class="fv-col fv-mon2" d="M0 690 L90 620 L170 680 L260 610 L400 690 V800 H0z"/></svg>`;
  }
  const LUGAR = { palabra: 'palabra', vida: 'vida', iglesia: 'iglesia', perfil: 'perfil', pastor: 'perfil' };
  function fondo() {
    let f = $('#fondoVivo');
    if (!f) { f = document.createElement('div'); f.id = 'fondoVivo'; f.setAttribute('aria-hidden', 'true'); f.innerHTML = escenaPalabra() + escenaVida() + escenaIglesia() + escenaPerfil(); document.body.insertBefore(f, document.body.firstChild); }
    return f;
  }
  const tabActual = () => { const t = $('.tab[aria-current="page"]'); return t ? t.dataset.tab : 'palabra'; };
  function ponerFondo() { try { fondo().setAttribute('data-lugar', LUGAR[tabActual()] || 'palabra'); } catch (e) { /* sin fondo */ } }

  // ---------- 2) CARRUSEL + HOJA ----------
  const ico = {
    sol: () => { let r = ''; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; r += `<line x1="${(60 + 34 * Math.cos(a)).toFixed(1)}" y1="${(60 + 34 * Math.sin(a)).toFixed(1)}" x2="${(60 + 50 * Math.cos(a)).toFixed(1)}" y2="${(60 + 50 * Math.sin(a)).toFixed(1)}"/>`; } return `<g class="gi">${r}</g><circle class="pu rel" cx="60" cy="60" r="20"/>`; },
    libro: () => '<path class="fl" d="M18 30h30a12 12 0 0 1 12 12v50a9 9 0 0 0-9-9H18z"/><path class="fl" d="M102 30H72a12 12 0 0 0-12 12v50a9 9 0 0 1 9-9h33z"/><path class="ch" d="M60 14v10M50 18l4 7M70 18l-4 7"/>',
    audio: () => '<path d="M26 72V60a34 34 0 0 1 68 0v12"/><rect class="rel" x="18" y="68" width="16" height="28" rx="7"/><rect class="rel" x="86" y="68" width="16" height="28" rx="7"/><path class="on1" d="M44 40a22 22 0 0 1 32 0"/><path class="on2" d="M36 30a34 34 0 0 1 48 0"/>',
    pergamino: () => '<rect class="fl" x="30" y="20" width="60" height="80" rx="9"/><path class="ch" d="M42 44h36M42 58h36M42 72h22"/>',
    corazon: () => '<path class="pu rel" d="M60 100S18 74 18 46a21 21 0 0 1 42-6 21 21 0 0 1 42 6c0 28-42 54-42 54z"/>',
    nota: () => '<path class="fl" d="M44 86V34l44-10v52"/><circle class="rel" cx="36" cy="88" r="10"/><circle class="rel" cx="80" cy="78" r="10"/>',
    brote: () => '<path d="M60 102V54"/><path class="fl rel" d="M60 64C36 64 28 48 28 34c20 0 32 8 32 30z"/><path class="fl2 rel" d="M60 54c0-18 12-28 32-28 0 18-10 28-32 28z"/><path d="M36 102h48"/>',
    gente: () => '<circle class="fl rel" cx="60" cy="42" r="14"/><circle class="fl2 rel" cx="26" cy="52" r="10"/><circle class="fl2 rel" cx="94" cy="52" r="10"/><path d="M34 98c0-18 12-28 26-28s26 10 26 28M6 94c0-12 8-20 20-20M114 94c0-12-8-20-20-20"/>',
    casa: () => '<path class="fl" d="M60 12v14M52 19h16M24 100V58l36-30 36 30v42M12 100h96"/><path class="ch" d="M50 100V84a10 10 0 0 1 20 0v16"/>',
    estrella: () => '<path class="pu rel" d="M60 14l13 29 31 3-24 21 8 31-28-17-28 17 8-31-24-21 31-3z"/>',
    escudo: () => '<path class="fl" d="M60 12l36 14v30c0 24-16 40-36 48-20-8-36-24-36-48V26z"/><path class="ch" d="M60 38v28M46 52h28"/>'
  };
  const arte = (k, grande) => `<svg class="tbcar-art${grande ? ' grande' : ''}" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="halo" cx="60" cy="60" r="54"/><g class="trazo">${(ico[k] || ico.estrella)()}</g></svg>`;
  const SLIDES = {
    palabra: [
      { k: 'sol', c: 'c1', t: 'Hoy lo hago', d: 'Convierte lo que lees en un paso real, pequeño y fácil.', p: ['Elegir una acción de pocos minutos', 'Marcarla como hecha y ver tu avance', 'Llevarlo a tu casa, tu barrio o tu iglesia'], bus: /Hoy lo hago/i },
      { k: 'libro', c: 'c2', t: 'La Biblia en español', d: 'Elige tu versión y lee, incluso sin internet.', p: ['Cambiar de versión cuando quieras', 'Resaltar, anotar y guardar versículos', 'Seguir leyendo donde te quedaste'], bus: /Leer la Biblia/i },
      { k: 'audio', c: 'c3', t: 'Escúchala', d: 'El audio lee la versión que elegiste.', p: ['Escuchar el capítulo mientras caminas', 'Cambiar la velocidad de la voz', 'Pasar solo al capítulo siguiente'], bus: /Leer la Biblia/i, b: 'Abrir la Biblia' },
      { k: 'pergamino', c: 'c4', t: 'Fábula del mes', d: 'Un relato corto para practicar, capítulo a capítulo.', p: ['Abrir un capítulo a la vez', 'Marcar tu práctica de la semana', 'Conversarla con tu familia'], bus: /F[áa]bula del mes/i },
      { k: 'estrella', c: 'c5', t: 'Versículo de hoy', d: 'Una frase para empezar el día con calma.', p: ['Leerlo en voz alta', 'Guardarlo en Mi Biblia', 'Hacerle una imagen para compartir'], bus: /Vers[íi]culo de hoy/i }
    ],
    vida: [
      { k: 'sol', c: 'c1', t: 'Hoy lo hago', d: 'Un paso pequeño hoy. Intentarlo ya cuenta.', p: ['Elegir una acción sencilla', 'Hacerla y marcarla', 'Sumar tus días de práctica'], bus: /Hoy lo hago/i },
      { k: 'corazon', c: 'c4', t: 'Mi oración', d: 'Tu diario de peticiones, solo para ti.', p: ['Escribir tus peticiones', 'Ver cuáles ya fueron respondidas', 'Mantener todo privado'], bus: /Mi oraci[óo]n/i },
      { k: 'nota', c: 'c5', t: 'Música', d: 'Letras para cantar y para leer en el culto.', p: ['Buscar una canción', 'Leer la letra grande', 'Cantar en familia'], bus: /M[úu]sica/i },
      { k: 'brote', c: 'c2', t: 'Mi crecimiento', d: 'Pequeños pasos de cada semana.', p: ['Elegir un hábito', 'Ver cómo crece tu avance', 'Celebrar cada logro'], bus: /Mi crecimiento/i },
      { k: 'gente', c: 'c3', t: 'Servir a otros', d: 'Ideas y proyectos listos para tu comunidad.', p: ['Encontrar una idea cerca de ti', 'Ver lugar, presupuesto y personas', 'Invitar a otros a sumarse'], bus: /Ideas y proyectos|Proyectos listos/i }
    ],
    iglesia: [
      { k: 'casa', c: 'c2', t: 'Tu iglesia', d: 'Todo lo que se vive en comunidad, en un solo lugar.', p: ['Unirte con el código de tu iglesia', 'Ver avisos y agenda', 'Conocer a quienes sirven'], bus: /c[óo]digo|Agenda|Avisos/i },
      { k: 'corazon', c: 'c4', t: 'Pedir oración', d: 'Que otros oren contigo, con la privacidad que elijas.', p: ['Elegir quién puede verlo', 'Ocultar tu nombre si quieres', 'Ver tus peticiones'], bus: /oraci[óo]n/i },
      { k: 'gente', c: 'c3', t: 'Pedir una visita', d: 'Tu pastor puede acompañarte donde estés.', p: ['Elegir el tipo de visita', 'Decir tus horarios', 'Ver la respuesta del pastor'], bus: /visita/i },
      { k: 'estrella', c: 'c5', t: 'Avisos y agenda', d: 'Entérate de lo que viene.', p: ['Ver las próximas actividades', 'Leer los avisos de tu pastor', 'No perderte nada'], bus: /Agenda|Avisos/i }
    ],
    perfil: [
      { k: 'brote', c: 'c2', t: 'Tu camino', d: 'Tu racha, tus logros y tu avance.', p: ['Ver tus días seguidos', 'Desbloquear logros', 'Seguir creciendo'], bus: null },
      { k: 'estrella', c: 'c5', t: 'Tu estilo', d: 'Temas de color y apariencia para leer cómodo.', p: ['Elegir entre muchos temas', 'Cambiar tamaño y fondo', 'Quitar o dejar el movimiento'], bus: /tema|apariencia/i },
      { k: 'gente', c: 'c3', t: 'Invita a un amigo', d: 'Comparte la app con un mensaje listo.', p: ['Enviar por WhatsApp o correo', 'Editar el mensaje', 'No se guarda ningún contacto'], bus: /Invita/i },
      { k: 'escudo', c: 'c1', t: 'Tu plan', d: 'La app se adapta a lo que más buscas.', p: ['Contestar pocas preguntas', 'Cambiar tu plan cuando quieras', 'Empezar en tu pestaña favorita'], bus: /plan/i }
    ]
  };
  const buscar = (re) => { if (!re) return null; return $$('#pantalla [data-ir], #pantalla button.card').find((b) => re.test(b.textContent || '')) || null; };
  function irA(s) {
    const b = buscar(s.bus);
    if (b) { b.click(); return; }
    const x = $('#pantalla .stats, #pantalla .grid, #pantalla .card'); if (x && x.scrollIntoView) x.scrollIntoView({ behavior: calma() ? 'auto' : 'smooth', block: 'center' });
  }
  function hoja(s) {
    cerrarHoja(); snd('abre');
    const h = document.createElement('div'); h.className = 'tbhoja'; h.id = 'tbHoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true'); h.setAttribute('aria-label', s.t);
    h.innerHTML = `<div class="tbhoja-fondo" data-x="1"></div><div class="tbhoja-caja ${s.c}"><button type="button" class="tbhoja-x" data-x="1" aria-label="Cerrar">✕</button>${arte(s.k, true)}<h2>${esc(s.t)}</h2><p class="tbhoja-d">${esc(s.d)}</p><p class="tbhoja-q">¿Qué puedo hacer aquí?</p><ul>${s.p.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button type="button" class="tbhoja-ir" id="tbHojaIr">${esc(s.b || 'Entrar ahora')} ›</button></div>`;
    document.body.appendChild(h);
    h.addEventListener('click', (e) => { if (e.target && e.target.getAttribute && e.target.getAttribute('data-x')) { snd('vuelve'); cerrarHoja(); } });
    $('#tbHojaIr', h).onclick = () => { cerrarHoja(); irA(s); };
    document.addEventListener('keydown', escCierra);
    const x = $('.tbhoja-x', h); if (x && x.focus) x.focus({ preventScroll: true });
  }
  const escCierra = (e) => { if (e && e.key === 'Escape') cerrarHoja(); };
  function cerrarHoja() { const h = $('#tbHoja'); if (h) h.remove(); document.removeEventListener('keydown', escCierra); }

  function carrusel(tab) {
    const L = SLIDES[tab]; if (!L) return null;
    const c = document.createElement('section'); c.className = 'tbcar'; c.setAttribute('aria-label', 'Lo que puedes hacer aquí'); c.setAttribute('data-tab', tab);
    c.innerHTML = `<div class="tbcar-pista" tabindex="0">${L.map((s, i) => `<article class="tbcar-s ${s.c}" data-i="${i}">${arte(s.k)}<div class="tbcar-tx"><b>${esc(s.t)}</b><span>${esc(s.d)}</span><button type="button" class="tbcar-ir" data-i="${i}">¿Qué puedo hacer?</button></div></article>`).join('')}</div><div class="tbcar-pts">${L.map((s, i) => `<i data-i="${i}"${i ? '' : ' class="on"'}></i>`).join('')}</div>`;
    const pista = $('.tbcar-pista', c);
    $$('.tbcar-ir', c).forEach((b) => b.addEventListener('click', () => hoja(L[Number(b.dataset.i)])));
    let pausa = false, i0 = 0;
    const ancho = () => (pista.firstElementChild ? pista.firstElementChild.getBoundingClientRect().width + 10 : 1);
    pista.addEventListener('scroll', () => { const i = Math.max(0, Math.min(L.length - 1, Math.round(pista.scrollLeft / ancho()))); if (i !== i0) { i0 = i; $$('.tbcar-pts i', c).forEach((p, j) => { p.classList.toggle('on', j === i); }); } }, { passive: true });
    ['pointerdown', 'touchstart', 'focusin'].forEach((e) => pista.addEventListener(e, () => { pausa = true; }, { passive: true }));
    const reanuda = () => { setTimeout(() => { pausa = false; }, 6000); };
    ['pointerup', 'touchend', 'focusout'].forEach((e) => pista.addEventListener(e, reanuda, { passive: true }));
    const tic = setInterval(() => {
      if (!c.isConnected) return clearInterval(tic);
      if (pausa || calma() || document.hidden || $('#tbHoja')) return;
      const n = (i0 + 1) % L.length; try { pista.scrollTo({ left: n * ancho(), behavior: 'smooth' }); } catch (e) { pista.scrollLeft = n * ancho(); }
    }, 4800);
    return c;
  }

  // ---------- 3) FÁBULA VISIBLE ----------
  let fabCat = null;
  async function fabulaTarjeta() {
    try {
      if (!fabCat) fabCat = await (await fetch('datos/fabulas.json')).json();
      const ids = Object.keys(fabCat), f = fabCat[ids[new Date().getMonth() % ids.length]]; if (!f) return null;
      const t = document.createElement('button'); t.type = 'button'; t.className = 'tbfab'; t.setAttribute('data-ir-fab', '1');
      t.innerHTML = `<span class="tbfab-ic" aria-hidden="true">${esc(f.icono || '📜')}</span><span class="tbfab-tx"><small>Fábula del mes</small><b>${esc(f.titulo)}</b><em>${esc(String(f.intro || '').slice(0, 96))}${String(f.intro || '').length > 96 ? '…' : ''}</em><span class="tbfab-met">${esc(f.tiempo || '')}${f.puertas && f.puertas.length ? ' · ' + f.puertas.length + ' capítulos' : ''}</span></span><span class="tbfab-go">Leer<br>ahora ›</span><i class="tbfab-b1"></i><i class="tbfab-b2"></i>`;
      if (/^#[0-9a-fA-F]{6}$/.test(f.tono || '')) t.style.setProperty('--tono', f.tono);
      t.addEventListener('click', () => { snd('abre'); const b = buscar(/F[áa]bula del mes/i); if (b) b.click(); });
      return t;
    } catch (e) { return null; }
  }

  // ---------- 4) SONIDO EN PERFIL ----------
  function filaSonido() {
    const d = document.createElement('div'); d.className = 'tbson';
    const on = () => !window.TBSonido || TBSonido.activo();
    const pinta = () => { d.innerHTML = `<span class="tbson-ic" aria-hidden="true">🔔</span><span class="tbson-tx"><b>Sonidos de Tierra Buena</b><small>${on() ? 'Activados: toques, pestañas y logros suenan' : 'Silenciados'}</small></span><button type="button" class="tbson-p" id="tbSonP">Escuchar</button><button type="button" class="tbson-sw" role="switch" aria-checked="${on()}" aria-label="Sonidos"><i></i></button>`; };
    pinta();
    d.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target : null; if (!t) return;
      if (t.closest('.tbson-sw')) { try { TBSonido.poner(!on()); } catch (x) { /* nada */ } pinta(); }
      else if (t.closest('.tbson-p')) { try { TBSonido.firma(); } catch (x) { /* nada */ } }
    });
    return d;
  }

  // ---------- Pegamento: pone todo en cada pantalla raíz ----------
  let poniendo = false;
  function poner() {
    if (poniendo) return; poniendo = true;
    try {
      ponerFondo();
      const pant = $('#pantalla'); if (!pant || $('.tbcar', pant)) return;
      if ($('.volver', pant) || $('#fabCard', pant)) return;                      // solo pantallas raíz (sin botón «volver»)
      if (!($('.grid .card', pant) || $('.perfil-hero', pant))) return;           // la portada y las preguntas de entrada quedan intactas
      const tab = tabActual(), car = carrusel(tab); if (!car) return;
      const ancla = $('.hoy', pant) || $('.perfil-hero', pant) || $('.filete', pant);
      if (ancla) ancla.after(car); else pant.insertBefore(car, pant.firstChild);
      let tras = car;
      if (tab === 'perfil') { const s = filaSonido(); tras.after(s); tras = s; }
      if (tab === 'palabra') fabulaTarjeta().then((t) => { if (t && car.isConnected && !$('.tbfab', pant)) car.after(t); });
      $$('[data-ir=hacer]', pant).forEach((b) => b.classList.add('tb-destacada'));
    } catch (e) { /* sin extras: la app sigue igual */ } finally { poniendo = false; }
  }
  let rq = 0; const luego = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; poner(); }); };
  try {
    const p = $('#pantalla'); if (p) new MutationObserver(luego).observe(p, { childList: true });
    const nav = $('.barra'); if (nav) new MutationObserver(() => { ponerFondo(); luego(); }).observe(nav, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  } catch (e) { /* sin observadores */ }
  poner();
})();
