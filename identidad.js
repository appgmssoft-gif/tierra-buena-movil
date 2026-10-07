// identidad.js - F901. Dos piezas de la identidad de Tierra Buena:
//   1) TBEjemplos: historias de la vida real (FICTICIAS, pero creíbles) que enseñan a aprovechar bien la app. Hay para miembros y para pastores.
//   2) TBJuntos: «Juntos hacemos el bien», el lugar para iniciar y sumarse a movimientos sociales.
// CSP: sin atributo style en el HTML; los anchos de las barras se ponen con element.style.setProperty.
'use strict';
(function () {
  const A = () => window.TBApp || {};
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const snd = (n, a) => { try { if (window.TBSonido && window.TBSonido[n]) window.TBSonido[n](a); } catch (e) { /* sin sonido */ } };
  const calma = () => { try { return document.documentElement.getAttribute('data-anim') === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const leer = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const guardar = (k, v) => { try { if (A().guardar) return A().guardar(k, v); localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  // Fechas locales (F923: estas tres se usaban en el formulario y en «Mis movimientos» pero no estaban definidas; el formulario fallaba al abrirse).
  const DIA = 86400000;
  const hoyISO = (n) => { const d = new Date(Date.now() + (n || 0) * DIA), z = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const cuandoTxt = (m) => { try { const n = Math.round((new Date(m.fecha + 'T12:00:00') - new Date(new Date().toDateString() + ' 12:00:00')) / DIA), f = new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); return f + (m.hora ? ' · ' + m.hora : '') + (n === 0 ? ' · hoy' : n === 1 ? ' · falta 1 día' : n > 1 ? ' · faltan ' + n + ' días' : ''); } catch (e) { return String(m.fecha || ''); } };
  function aviso(txt) {
    try { const o = $('.tb-aviso'); if (o) o.remove(); const d = document.createElement('div'); d.className = 'tb-aviso'; d.setAttribute('role', 'status'); d.textContent = txt; document.body.appendChild(d); setTimeout(() => { try { d.remove(); } catch (e) { /* nada */ } }, 3200); } catch (e) { /* nada */ }
  }

  // =====================================================================================================
  // 1) EJEMPLOS DE LA VIDA REAL  (todos ficticios; cada uno enseña UNA herramienta de la app)
  //    ir: a dónde lleva «Probarlo». tab = pestaña donde vive; di = botón [data-ir] o dp = botón [data-pp] del panel de pastor.
  // =====================================================================================================
  const EJ = {
    miembro: [
      { ic: '🙏', t: 'Pedir oración con discreción', quien: 'Marcela', escena: 'Pasa por un momento difícil y prefiere no contarlo en el grupo.',
        pasos: ['Abre «Pedir oración» y elige «Solo mi pastor».', 'Marca «Ocultar mi nombre» y escribe con sus palabras.', 'Vuelve a «Mis peticiones» para ver si ya la leyeron.'],
        res: 'Su pastor ora por ella. Su nombre queda en reserva.', tab: 'iglesia', di: 'oracion', btn: 'Pedir oración' },
      { ic: '🤝', t: 'Pedir una visita cuando cuesta salir', quien: 'Don Hernán', escena: 'Ya no puede ir a la iglesia. Su nieta le dejó la app lista.',
        pasos: ['Abre «Pedir visita» y elige «Acompañamiento».', 'Pone los horarios que le acomodan.', 'La dirección solo la ve el pastor, cuando acepta.'],
        res: 'Alguien de la iglesia llega a su casa, a la hora acordada.', tab: 'iglesia', di: 'visita', btn: 'Pedir una visita' },
      { ic: '📅', t: 'No perderse lo de la semana', quien: 'Camila', escena: 'Siempre se enteraba tarde de los cambios del grupo.',
        pasos: ['Abre «Agenda» y mira «Mis grupos».', 'Revisa «Avisos» por si cambió la hora.', 'Pasa la fecha a su calendario.'],
        res: 'Llega a tiempo y sin apuro.', tab: 'iglesia', di: 'agenda', btn: 'Ver la agenda' },
      { ic: '🧱', t: 'Orar juntos por una petición', quien: 'Una familia', escena: 'Antes de dormir leen una petición del Muro.',
        pasos: ['Abren el «Muro» juntos.', 'Leen una petición compartida (sin nombres si así se pidió).', 'Oran un momento y la marcan como acompañada.'],
        res: 'Aprenden a orar por otros, de a poco y con cuidado.', tab: 'iglesia', di: 'muro', btn: 'Abrir el Muro' },
      { ic: '🌍', t: 'Armar algo bueno con la iglesia', quien: 'Felipe', escena: 'Vio «Abrigo para el invierno» y quiso armarlo con su grupo.',
        pasos: ['Abre «Juntos hacemos el bien» y toca «Armarlo en mi iglesia».', 'Pone fecha, lugar y un 2.º líder.', 'Invita a su congregación con el mensaje ya listo.'],
        res: 'La iglesia se mueve junta, con fecha, lugar y líderes claros.', tab: 'inicio', di: 'juntos', btn: 'Ver las ideas' }
    ],
    pastor: [
      { ic: '👋', t: 'Recibir a quien llega', quien: 'Un pastor', escena: 'Antes se enteraba de las personas nuevas tarde y por casualidad.',
        pasos: ['Abre «Solicitudes».', 'Lee el nombre y la nota que dejó la persona.', 'Acepta y responde con un saludo propio.'],
        res: 'La persona se siente esperada desde el primer día.', tab: 'pastor', dp: 'sol', btn: 'Ver solicitudes' },
      { ic: '🙏', t: 'Orar por lo que de verdad pasa', quien: 'Una pastora', escena: 'Las peticiones llegaban sueltas, por mensajes.',
        pasos: ['Entra a «Oraciones» y las lee con calma.', 'Responde las delicadas en privado.', 'En el Muro comparte solo lo que la persona autorizó.'],
        res: 'Cada petición recibe respuesta y se cuida lo que se confía.', tab: 'pastor', dp: 'ora', btn: 'Ver oraciones' },
      { ic: '📣', t: 'Un aviso que sí se lee', quien: 'Un pastor', escena: 'Sus avisos largos casi nadie los terminaba.',
        pasos: ['Escribe el aviso corto, con un solo pedido.', 'Pone el día y el lugar al comienzo.', 'Lo envía solo al grupo que corresponde.'],
        res: 'El aviso se entiende de una mirada.', tab: 'pastor', dp: 'avi', btn: 'Escribir un aviso' },
      { ic: '⚙️', t: 'Cuidar la puerta de la iglesia', quien: 'Una pastora', escena: 'Alguien que no conocía pidió unirse con el código.',
        pasos: ['Revisa «Solicitudes» y no acepta a quien no reconoce.', 'En «Datos y código» confirma el nombre de la iglesia.', 'Comparte el código en persona o por mensaje directo.'],
        res: 'Aceptar es siempre decisión suya: el código solo abre la puerta.', tab: 'pastor', dp: 'dat', btn: 'Ver datos y código' }
    ]
  };

  // F903: NIVEL DE ACCESO. Quien aún no entra a una iglesia solo ve ejemplos «abiertos» (agenda, Biblia, planes, ministerios, avisos, acción del mes, Juntos...).
  // Los que hablan de personas, oración, visitas, miembros o salud se muestran solo cuando ya entró a su iglesia (miembro o pastor).
  const dentroDeIglesia = () => !!(leer('tb_movil_identidad', null) || leer('tb_movil_pastor', null));
  const esPrivado = (e) => ['oracion', 'visita', 'muro', 'salud'].indexOf(e.di) >= 0 || ['sol', 'ora', 'vis', 'mie', 'dat'].indexOf(e.dp) >= 0;
  const esPastorYa = () => !!leer('tb_movil_pastor', null);
  // F904: filtro más fino: sin iglesia solo ejemplos abiertos; dentro de una iglesia, quien NO es pastor no ve ejemplos que dependen del panel del pastor (no los podría abrir)
  const visibles = (rol) => { const d = dentroDeIglesia(), p = esPastorYa(); return EJ[rol].filter((e) => (d || !esPrivado(e)) && (e.tab !== 'pastor' || p || !d || rol === 'pastor')); };

  // Carrusel de tarjetas (F902): se desliza con el dedo, tiene flechas, puntos y pausa. Sin animación continua: solo avanza una tarjeta cada 14 s mientras se ve en pantalla.
  function pintarEjemplosCompleto(caja, rol) {
    if (!caja) return;
    let actual = rol === 'pastor' ? 'pastor' : 'miembro';
    let reloj = 0, obs = null;
    const parar = () => { if (reloj) { clearInterval(reloj); reloj = 0; } };
    const dibuja = () => {
      parar(); if (obs) { try { obs.disconnect(); } catch (e) { /* sin observador */ } obs = null; }
      const L = visibles(actual); let idx = 0, auto = !calma();
      caja.innerHTML = `<div class="tbej" data-rol="${actual}">
        <div class="tbej-cab"><span class="tbej-ic" aria-hidden="true">${actual === 'pastor' ? '🛡️' : '🌱'}</span><div><b>${dentroDeIglesia() ? (actual === 'pastor' ? 'Cómo cuida mejor a su iglesia un pastor' : 'Cómo aprovecha la app un miembro') : (actual === 'pastor' ? 'Ideas para organizar una iglesia' : 'Ideas para empezar hoy')}</b><small>${dentroDeIglesia() ? 'Historias inventadas, no son personas reales. Desliza y toca una para probarla.' : 'Historias inventadas, no son personas reales. Desliza y toca uno para probarlo.'}</small></div></div>
        ${rol === 'ambos' ? `<div class="tbej-seg" role="tablist" aria-label="Ver ejemplos para"><button type="button" role="tab" data-r="miembro" aria-selected="${actual === 'miembro'}">Soy miembro</button><button type="button" role="tab" data-r="pastor" aria-selected="${actual === 'pastor'}">Soy pastor</button></div>` : ''}
        <div class="tbej-car" role="region" aria-roledescription="carrusel" aria-label="Ejemplos de la vida real" tabindex="0">${L.map((e, i) => `<article class="tbej-card" data-i="${i}" data-hu="${(i * 37) % 360}" aria-label="${i + 1} de ${L.length}">
          <div class="tbej-arte" aria-hidden="true"><span class="tbej-big">${e.ic}</span><i class="tbej-hoja a"></i><i class="tbej-hoja b"></i></div>
          <div class="tbej-txt"><span class="tbej-fic">Ejemplo ficticio</span><h3>${esc(e.t)}</h3><p class="tbej-q">${esc(e.quien)}</p><p class="tbej-esc">${esc(e.escena)}</p><details class="tbej-mas"><summary>Ver cómo se hace</summary><ol>${e.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol><p class="tbej-res">${esc(e.res)}</p></details><button type="button" class="tbej-go" data-i="${i}">${esc(e.btn)} ›</button></div></article>`).join('')}</div>
        <div class="tbej-ctl"><button type="button" class="tbej-fl2" data-d="-1" aria-label="Ejemplo anterior">‹</button><span class="tbej-pt" aria-live="polite"></span><button type="button" class="tbej-pa" aria-label="Pausar o seguir pasando solas">${auto ? '⏸' : '▶'}</button><button type="button" class="tbej-fl2" data-d="1" aria-label="Ejemplo siguiente">›</button></div></div>`;
      const car = $('.tbej-car', caja), pt = $('.tbej-pt', caja), pa = $('.tbej-pa', caja);
      $$('.tbej-card', car).forEach((c) => c.style.setProperty('--hu', c.dataset.hu));   // CSP: sin style en el HTML
      const marca = () => { pt.textContent = (idx + 1) + ' de ' + L.length; };
      const ir = (n, suave) => { idx = (n + L.length) % L.length; const c = car.children[idx]; if (c) { try { car.scrollTo({ left: c.offsetLeft - car.offsetLeft, behavior: suave && !calma() ? 'smooth' : 'auto' }); } catch (e) { car.scrollLeft = c.offsetLeft; } } marca(); };
      let t = 0; car.addEventListener('scroll', () => { if (t) return; t = setTimeout(() => { t = 0; const w = car.clientWidth || 1; const n = Math.round(car.scrollLeft / (car.children[0] ? car.children[0].offsetWidth + 10 : w)); if (n !== idx && car.children[n]) { idx = n; marca(); } }, 120); }, { passive: true });
      $$('.tbej-fl2', caja).forEach((b) => { b.onclick = () => { auto = false; pa.textContent = '▶'; snd('tab', 1); ir(idx + Number(b.dataset.d), true); }; });
      pa.onclick = () => { auto = !auto; pa.textContent = auto ? '⏸' : '▶'; snd('tab', 2); };
      car.addEventListener('touchstart', () => { auto = false; pa.textContent = '▶'; }, { passive: true });
      car.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(idx + 1, true); } else if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(idx - 1, true); } });
      $$('.tbej-seg button', caja).forEach((b) => { b.onclick = () => { snd('tab', b.dataset.r === 'pastor' ? 3 : 1); actual = b.dataset.r; dibuja(); }; });
      $$('.tbej-go', caja).forEach((b) => { b.onclick = () => probar(L[Number(b.dataset.i)]); });
      marca();
      const arrancar = () => { if (reloj || calma()) return; reloj = setInterval(() => { if (auto && !document.hidden) ir(idx + 1, true); }, 14000); };
      if (typeof IntersectionObserver === 'function') { obs = new IntersectionObserver((en) => { if (en[0] && en[0].isIntersecting) arrancar(); else parar(); }, { threshold: 0.4 }); obs.observe(car); } else arrancar();
    };
    dibuja();
  }
  // F916: los ejemplos ya no ocupan la pantalla: viven detrás de un botón pequeño («Ejemplos de uso»). Se abren solo si la persona los necesita y dicen claro que son inventados.
  function pintarEjemplos(caja, rol) {
    if (!caja) return;
    const cerrado = () => {
      caja.innerHTML = '<button type="button" class="tbej-btn" aria-expanded="false"><span class="tbej-btn-ic" aria-hidden="true">💡</span><span class="tbej-btn-tx"><b>Ejemplos de uso</b><small>Historias inventadas para entender cómo se usa. No son personas reales.</small></span><i aria-hidden="true">›</i></button>';
      $('.tbej-btn', caja).onclick = abierto;
    };
    const abierto = () => {
      snd('abre');
      caja.innerHTML = '<div class="tbej-in"></div><button type="button" class="tbej-cerrar">Cerrar ejemplos</button>';
      pintarEjemplosCompleto($('.tbej-in', caja), rol);
      $('.tbej-cerrar', caja).onclick = () => { snd('vuelve'); cerrado(); };
    };
    cerrado();
  }
  function probar(e) {
    snd('abre');
    const ap = A();
    const clic = () => { const b = e.dp ? $(`[data-pp="${e.dp}"]`) : $(`[data-ir="${e.di}"]`); if (b) { b.click(); return true; } return false; };
    if (clic()) return;                                                       // ya está en esta pantalla
    let hayPastor = false; try { hayPastor = !!localStorage.getItem('tb_movil_pastor'); } catch (x) { /* sin almacenamiento */ }
    if (e.tab === 'pastor' && !hayPastor) return aviso('Esto se abre cuando entras como pastor: toca «Soy pastor» arriba.');
    if (!ap.ir) return;
    ap.ir(e.tab, e.tab === 'iglesia' ? 'miembro' : undefined);
    setTimeout(() => { if (!clic()) aviso(e.tab === 'iglesia' ? 'Esto se abre cuando tu pastor te acepta en su iglesia: toca «Mi código».' : 'Aún no se puede abrir desde aquí.'); }, 60);
  }
  window.TBEjemplos = { pintar: pintarEjemplos, datos: EJ, visibles, dentro: dentroDeIglesia };

  // =====================================================================================================
  // 2) JUNTOS HACEMOS EL BIEN  — movimientos sociales
  // =====================================================================================================
  const K_J = 'tb_movil_juntos';
  const AMBITOS = { iglesia: 'Mi iglesia', grupo: 'Mi grupo o ministerio', iglesias: 'Con otras iglesias', barrio: 'Mi barrio' };
  // J1 (F923): las ideas y los proyectos listos viven en UN solo catálogo (datos/juntos_catalogo.json). Vida ya no los repite: este es el único camino.
  const K_FAV = 'tb_movil_ideas_fav';          // «Me interesa»: misma clave e ids de antes, no se pierde nada
  let CAT = null, MOV = [], filtroCat = '';
  const corto = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };
  async function catalogo() {
    if (CAT) return CAT;
    const r = await fetch('datos/juntos_catalogo.json'); if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json(); if (!d || !Array.isArray(d.items) || !Array.isArray(d.categorias)) throw new Error('catálogo no válido');
    MOV = d.items; return (CAT = d);
  }
  const catDe = (m) => (CAT && CAT.categorias.find((c) => c.id === m.cat)) || { icono: '', label: '' };
  const ideaBase = (m) => (m.tipo === 'paquete' && m.idea_id && MOV.find((z) => z.id === m.idea_id)) || m;
  const favs = () => { const l = leer(K_FAV, []); return Array.isArray(l) ? l : []; };
  const ambitoDe = (m) => (m.cat === 'entre_iglesias' ? 'iglesias' : m.lugar_tipo === 'publico' ? 'barrio' : 'iglesia');
  const RECETA = [['👀', 'Mira', 'Escoge un problema real que veas cerca, uno solo.'], ['🤝', 'Une', 'Invita a 3 personas. Un movimiento es de muchos o no es movimiento.'], ['⚡', 'Empieza', 'Da un primer paso en 72 horas. Lo pequeño que empieza gana.'], ['📏', 'Mide', 'Ponle un número: platos, personas, abrigos, horas.'], ['🎉', 'Celebra', 'Cuenta lo logrado para que otros se animen.']];
  const REGLAS = ['Nunca publiques nombres, fotos ni direcciones de personas sin su permiso.', 'No se maneja dinero en la app: se piden tiempo, cosas o ayuda, y se rinde cuentas.', 'Ayuda con dignidad: pregunta qué necesita la persona, no decidas por ella.', 'Respeta a tu congregación: tu pastor y tus líderes guían. Si surge un problema, se conversa dentro de la iglesia.'];

  const est = () => { const e = leer(K_J, null); return e && typeof e === 'object' ? { unidos: e.unidos || {}, mios: e.mios || [], total: e.total || 0 } : { unidos: {}, mios: [], total: 0 }; };
  const salvar = (e) => guardar(K_J, e);
  const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a * 100 / Math.max(1, b))));
  const barra = (v, m, cl) => `<div class="tbj-bar ${cl || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${m}" aria-valuenow="${Math.min(v, m)}"><i data-w="${pct(v, m)}"></i></div>`;
  const aplicarAnchos = (r) => { $$('.tbj-bar i[data-w]', r).forEach((i) => { setTimeout(() => { i.style.setProperty('--w', i.dataset.w + '%'); }, calma() ? 0 : 60); }); };
  const invitacion = (t, lema, meta, unidad, cuando) => `🌍 ${t}\n${lema}${meta ? '\nMeta: ' + meta + (unidad ? ' ' + unidad : '') + '.' : ''}${cuando ? '\n' + cuando : ''}\n¿Te sumas? Yo ya empecé. Lo hacemos juntos con la app Tierra Buena: ${location.origin}${location.pathname}\n#JuntosHacemosElBien`;
  function compartir(txt) {
    try { if (navigator.share) { navigator.share({ text: txt }).catch(() => { /* cancelado */ }); return; } } catch (e) { /* sin compartir */ }
    try { window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener'); } catch (e) { /* nada */ }
  }
  const confeti = (el) => { if (calma() || !el) return; for (let i = 0; i < 14; i++) { const p = document.createElement('i'); p.className = 'tbj-cf'; p.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px'); p.style.setProperty('--dy', (-(40 + Math.random() * 90)).toFixed(0) + 'px'); p.style.setProperty('--r', (Math.random() * 360).toFixed(0) + 'deg'); p.style.setProperty('--d', (Math.random() * 0.2).toFixed(2) + 's'); el.appendChild(p); setTimeout(() => { try { p.remove(); } catch (e) { /* nada */ } }, 1200); } };


  // F904 · ENCUESTA DEL MES y MURO DE AVANCES. Hoy viven en el teléfono (clave tb_movil_juntos2); al correr SQL_F898_ACCION_JUNTOS.sql se conectan a Supabase para verse entre teléfonos.
  // Regla de diseño: sin comentarios abiertos ni rankings entre iglesias; solo avances, ánimo («Animar») y una votación al mes.
  const K_J2 = 'tb_movil_juntos2';
  const mesClave = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const est2 = () => { const e = leer(K_J2, null); return e && typeof e === 'object' ? { votos: e.votos || {}, muro: Array.isArray(e.muro) ? e.muro : [] } : { votos: {}, muro: [] }; };
  function opcionesDelMes() { const base = MOV.filter((m) => m.tipo === 'idea'); if (!base.length) return []; const n = new Date().getMonth(); return [0, 1, 2, 3].map((k) => base[(n * 2 + k * 3) % base.length]).filter((m, i, v) => v.indexOf(m) === i); }
  // F904b: si hay sesión y la persona que administra ya activó las opciones del mes en Supabase, la encuesta es REAL (1 persona = 1 voto, cuenta personas, nunca iglesias). Si no, queda la versión de ejemplo del teléfono.
  async function votoReal() {
    try { const sb = A().sb; if (!sb || !sb.rpc) return null; const r = await sb.rpc('movimiento_resultados', {}); if (r.error || !Array.isArray(r.data) || !r.data.length) return null; return r.data; } catch (e) { return null; }
  }
  async function pintarVoto() {
    const caja = $('#tbjVoto'); if (!caja) return;
    const real = await votoReal();
    if (real) {
      const tot = real.reduce((s, o) => s + Number(o.votos || 0), 0), voto = real.some((o) => o.mi_voto);
      caja.innerHTML = `<div class="card tbj-voto"><p class="tbj-vq"><b>¿Qué hacemos entre todos este mes?</b><small>Un voto por persona, de todas las personas de la app. La opción con más votos es el movimiento del mes. Puedes cambiar tu voto mientras dure el mes.</small></p>
        ${real.map((o) => `<button type="button" class="tbj-op${o.mi_voto ? ' on' : ''}" data-r="${esc(o.opcion_id)}"><span class="tbj-op-ic" aria-hidden="true">🌱</span><span class="tbj-op-tx"><b>${esc(o.titulo)}</b><small>${esc(o.descripcion || '')}</small>${o.paso ? `<small>Tu gesto: ${esc(o.paso)}</small>` : ''}${voto ? barra(Number(o.votos), Math.max(1, tot), '') : ''}</span>${voto ? `<em>${pct(Number(o.votos), tot)}%</em>` : ''}</button>`).join('')}
        <button type="button" class="btn sec chico" id="tbjSug">💡 Proponer una idea para el próximo mes</button><p class="suave tbj-vnota" id="tbjVmsg">${voto ? 'Gracias por votar.' : 'Elige una.'}</p></div>`;
      $$('.tbj-op', caja).forEach((b) => { b.onclick = async () => { snd('juntos', 3); try { await A().sb.rpc('movimiento_votar', { p_opcion: b.dataset.r }); } catch (e) { /* sin red */ } pintarVoto(); }; });
      $('#tbjSug').onclick = async () => { const t = (prompt('¿Qué bien podríamos hacer juntos? (una frase corta)') || '').trim(); if (t.length < 3) return; let m = 'No se pudo enviar. Inténtalo más tarde.'; try { const r = await A().sb.rpc('movimiento_sugerir', { p_titulo: t.slice(0, 80) }); if (r && !r.error) { m = 'Gracias: quien administra revisará tu idea.'; snd('exito'); } } catch (e) { /* sin red */ } const x = $('#tbjVmsg'); if (x) x.textContent = m; };
      aplicarAnchos(caja); return;
    }
    const e = est2(), mes = mesClave(), voto = e.votos[mes], ops = opcionesDelMes();
    if (!ops.length) { caja.innerHTML = ''; return; }
    caja.innerHTML = `<div class="card tbj-voto"><p class="tbj-vq"><b>¿Qué haremos juntos este mes?</b><small>Elige la idea que más te gustaría que tu iglesia impulsara. Es tu voto personal.</small></p>
      ${ops.map((m) => `<button type="button" class="tbj-op${voto === m.id ? ' on' : ''}" data-v="${m.id}" ${voto ? 'disabled' : ''}><span class="tbj-op-ic" aria-hidden="true">${esc(m.icono)}</span><span class="tbj-op-tx"><b>${esc(m.titulo)}</b><small>${esc(corto(m.que_es, 110))}</small></span></button>`).join('')}
      <p class="suave tbj-vnota">${voto ? 'Gracias por votar. Vuelve el próximo mes: habrá nuevas ideas. Los resultados se verán cuando la votación esté activa en tu iglesia.' : 'Elige una. Todas hacen bien.'}</p></div>`;
    $$('.tbj-op', caja).forEach((b) => { b.onclick = () => { if (b.disabled) return; snd('juntos', 3); const x = est2(); x.votos[mesClave()] = b.dataset.v; guardar(K_J2, x); pintarVoto(); confeti(caja); }; });
    aplicarAnchos(caja);
  }
  function pintarMuro() {
    const caja = $('#tbjMuro'); if (!caja) return;
    const e = est2();
    const L = e.muro;
    caja.innerHTML = `<div class="card tbj-muro-nuevo"><label for="tbjTxt" class="tbj-vq"><b>Cuenta un avance</b><small>Algo bueno que hiciste o viste. Sin nombres ni fotos de otras personas.</small></label>
      <textarea id="tbjTxt" maxlength="220" rows="3" placeholder="Hoy ayudamos a…"></textarea><div class="tbj-muro-fila"><small id="tbjCnt">0 / 220</small><button type="button" class="btn chico" id="tbjPub">Compartir avance</button></div></div>
      <div class="tbj-muro">${!L.length ? '<div class="card tbj-vacio"><p class="m0">🕊️</p><p class="suave m0t">Aún no hay avances. Cuenta el primero: anima a tu iglesia.</p></div>' : ''}${L.map((m, i) => `<article class="card tbj-post"><p class="tbj-post-q">${esc(m.q || 'Yo')}</p><p>${esc(m.t)}</p><button type="button" class="tbj-an${m.yo ? ' on' : ''}" data-i="${i}" aria-pressed="${!!m.yo}">👏 Animar · <b>${m.a || 0}</b></button></article>`).join('')}</div>`;
    const t = $('#tbjTxt'); t.oninput = () => { $('#tbjCnt').textContent = t.value.length + ' / 220'; };
    $('#tbjPub').onclick = () => { const v = t.value.trim(); if (v.length < 8) { snd('error'); t.focus(); return; } const x = est2(); x.muro.unshift({ q: 'Yo', t: v.slice(0, 220), a: 0, f: Date.now() }); x.muro = x.muro.slice(0, 40); guardar(K_J2, x); snd('exito'); pintarMuro(); };
    $$('.tbj-an', caja).forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i), x = est2(); if (i >= x.muro.length) { snd('toque'); b.classList.toggle('on'); const n = $('b', b); n.textContent = String(Number(n.textContent) + (b.classList.contains('on') ? 1 : -1)); return; } const m = x.muro[i]; m.yo = !m.yo; m.a = Math.max(0, (m.a || 0) + (m.yo ? 1 : -1)); guardar(K_J2, x); snd('toque'); pintarMuro(); }; });
  }

  function abrir() {
    const ap = A(), pant = $('#pantalla'); if (!pant) return;
    const e = est();
    const aportes = Object.keys(e.unidos).reduce((s, k) => s + (e.unidos[k].n || 0), 0) + e.mios.reduce((s, m) => s + (m.n || 0), 0);
    const sumados = Object.keys(e.unidos).length + e.mios.length;
    pant.innerHTML = `<button type="button" class="volver" id="tbjVolver">‹ Inicio</button>
      <section class="tbj-hero"><span class="tbj-h-a" aria-hidden="true"></span><span class="tbj-h-b" aria-hidden="true"></span>
        <p class="tbj-sello">Movimientos de Tierra Buena</p><h1>Juntos hacemos el bien</h1>
        <p class="tbj-lema">Aquí la Palabra se vuelve acción. Arma un movimiento con tu iglesia, mira cómo crece e invita a tu congregación.</p>
        <div class="tbj-huella"><span><b data-n="${aportes}">${aportes}</b><small>pasos míos</small></span><span><b data-n="${sumados}">${sumados}</b><small>movimientos</small></span></div></section>
      ${recordHTML()}${borradorHTML()}<h2 class="sep">Mis movimientos</h2><div id="tbjMios"></div>
      <h2 class="sep">En mi iglesia <small class="tbj-ejtag">lo que se necesita y lo que ya llegó</small></h2><div id="tbjIg"></div>
      <div class="tbj-nuevo">${vistaPrevia() ? '<p class="tbj-previa-nota"><b>Armar un movimiento</b> está disponible para miembros y pastores de una iglesia.</p>' : '<button type="button" class="btn" id="tbjNuevo">＋ Armar un movimiento con mi iglesia</button>'}</div>
      <h2 class="sep">${vistaPrevia() ? 'Ideas y proyectos de muestra' : 'Ideas y proyectos listos'} <small class="tbj-ejtag">toca uno para ver el plan</small></h2><div id="tbjLista" class="tbj-lista"><p class="suave">Cargando…</p></div>
      <h2 class="sep">La receta de un movimiento</h2>
      <ol class="tbj-receta">${RECETA.map((r, i) => `<li><span class="tbj-n" aria-hidden="true">${r[0]}</span><span><b>${i + 1}. ${r[1]}</b><small>${r[2]}</small></span></li>`).join('')}</ol>
      <div class="card tbj-reglas"><div class="t"><span aria-hidden="true">🛡️</span>Reglas del bien</div><ul>${REGLAS.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    $('#tbjVolver').onclick = () => { snd('vuelve'); if (ap.ir) ap.ir('inicio'); };
    pintarMios(); pintarIglesia(); pintarMuro(); aplicarAnchos(pant);
    catalogo().then(() => pintarLista()).catch(() => { const c = $('#tbjLista'); if (c) c.innerHTML = '<p class="suave">No pudimos abrir las ideas. Revisa tu internet: lo que ya abriste antes se ve sin conexión.</p>'; }).then(() => pintarVoto());
    const bn = $('#tbjNuevo'); if (bn) bn.onclick = () => { snd('abre'); empezar(null); };
    const rb = $('#tbjRetomar'); if (rb) rb.onclick = () => { snd('abre'); const b = leer(K_BOR, null); planForm(b && b.id, b); };
    const db = $('#tbjDescartar'); if (db) db.onclick = () => { if (!confirm('¿Descartar este plan sin terminar?')) return; guardar(K_BOR, null); abrir(); };
    try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
  }

  // ---------- F927 · VISTA PREVIA: quien nunca entró como miembro ni como pastor de una iglesia ve una muestra (3 ideas y 3 proyectos) ----------
  const vistaPrevia = () => !credenciales();
  function muestra() {                                       // 3 ideas y 3 proyectos listos, de temas distintos, siempre los mismos
    const out = [];
    ['idea', 'paquete'].forEach((tipo) => { const vistos = []; MOV.forEach((m) => { if (m.tipo === tipo && vistos.length < 3 && !vistos.includes(m.cat)) { vistos.push(m.cat); out.push(m); } }); });
    return out;
  }
  const previaHTML = () => `<div class="card tbj-previa"><span class="tbj-previa-ic" aria-hidden="true">🌱</span><div><b>Vista previa</b><p class="m0">Esta es una pequeña muestra: ${muestra().length} de las ${MOV.length} ideas y proyectos que existen. Al entrar a una iglesia (como miembro o como pastor) se abren todos y se pueden armar movimientos con tu comunidad.</p></div></div>`;
  function pintarLista() {
    const cont = $('#tbjLista'); if (!cont || !CAT) return;
    const fav = favs();
    const chips = [['', 'Todas'], ['fav', '⭐ Mis ideas']].concat(CAT.categorias.map((c) => [c.id, c.icono + ' ' + c.label]));
    const previa = vistaPrevia(), ver = previa ? muestra() : MOV.filter((m) => !filtroCat || (filtroCat === 'fav' ? fav.includes(m.id) : m.cat === filtroCat));
    cont.innerHTML = (previa ? previaHTML() : `<div class="tbj-chips" role="group" aria-label="Filtrar por tema">${chips.map((c) => { const on = c[0] === filtroCat; return `<button type="button" class="tbj-chip${on ? ' on' : ''}" data-c="${esc(c[0])}" aria-pressed="${on}">${esc(c[1])}</button>`; }).join('')}</div>`) +
      (ver.length ? ver.map((m) => `<article class="tbj-mov" data-id="${esc(m.id)}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${esc(m.icono)}</span><div><b>${esc(m.titulo)}</b><small>${m.tipo === 'paquete' ? 'Proyecto listo' : 'Idea'} · ${esc(catDe(m).label)}${fav.includes(m.id) ? ' · ⭐' : ''}</small></div></div>
        <p class="tbj-mov-lema">${esc(corto(m.que_es, 150))}</p>
        <p class="suave m0t">${m.tipo === 'paquete' ? esc((m.lugar_texto || '') + ' · ' + (m.presupuesto_texto || '')) : esc((m.personas || '') + ' · ' + (m.costo || ''))}</p>
        <div class="tbj-acc"><button type="button" class="btn tbj-ver" data-id="${esc(m.id)}">Ver y usar este plan</button></div></article>`).join('') : '<p class="suave sep">Todavía no marcaste ninguna idea con ⭐.</p>');
    $$('.tbj-chip', cont).forEach((b) => { b.onclick = () => { filtroCat = b.dataset.c; snd('suave'); pintarLista(); }; });
    $$('.tbj-ver', cont).forEach((b) => { b.onclick = () => { snd('abre'); ficha(b.dataset.id); }; });
  }

  // Ficha de una idea o proyecto listo + botón «Usar este plan» (abre «Arma tu movimiento» ya precargado).
  function ficha(id) {
    const m = MOV.find((z) => z.id === id); if (!m) return abrir();
    const base = ideaBase(m), pasos = base.como_empezar || [], paq = m.tipo === 'paquete', pant = $('#pantalla');
    pant.innerHTML = `<button type="button" class="volver" id="tbjAtras">‹ Juntos hacemos el bien</button>
      <section class="tbj-hero chico"><p class="tbj-sello">${paq ? 'Proyecto listo' : 'Idea'} · ${esc(catDe(m).label)}</p><h1>${esc(m.titulo)}</h1><p class="tbj-lema">${esc(m.que_es)}</p></section>
      <div class="card">${pasos.length ? `<h3 class="m0t">Cómo empezar</h3><ol class="formas">${pasos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
        <p class="suave${pasos.length ? '' : ' m0t'}">${paq ? `<b>📍 Dónde:</b> ${esc(m.lugar_texto)} · <b>💰 Dinero:</b> ${esc(m.presupuesto_texto)}${Number(m.personas_sugeridas) ? ` · <b>👥 Personas sugeridas:</b> ${Number(m.personas_sugeridas)}` : ''}` : `<b>👥 Personas:</b> ${esc(m.personas)} · <b>💰 Costo:</b> ${esc(m.costo)}`}</p>
        ${m.versiculo ? `<p class="suave m0">${esc(m.versiculo)}</p>` : ''}</div>
      ${vistaPrevia() ? '<p class="tbj-previa-nota"><b>Vista previa.</b> Para usar este plan y armar el movimiento, primero hay que entrar a una iglesia como miembro o como pastor.</p>' : '<button type="button" class="btn" id="tbjUsar">Usar este plan</button>'}<button type="button" class="btn sec" id="tbjFav"></button>`;
    const pintarFav = () => { $('#tbjFav').textContent = favs().includes(m.id) ? '⭐ Quitar de mis ideas' : '☆ Me interesa'; };
    $('#tbjAtras').onclick = () => { snd('vuelve'); abrir(); };
    const bu = $('#tbjUsar'); if (bu) bu.onclick = () => { snd('armar'); empezar(m); };
    $('#tbjFav').onclick = () => { const l = favs().filter((x) => x !== m.id); if (!favs().includes(m.id)) l.push(m.id); guardar(K_FAV, l); snd('toque'); pintarFav(); };
    pintarFav();
    try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
  }

  const numerica = (m) => typeof m.meta === 'number' && m.meta >= 1;   // movimientos antiguos con meta en número; los nuevos traen la meta en palabras
  function pintarMios() {
    const e = est(), cont = $('#tbjMios'); if (!cont) return;
    if (!e.mios.length) { cont.innerHTML = '<div class="card tbj-vacio"><p class="m0">🌱</p><p class="suave m0t">Aún no has iniciado ninguno. Cuando inicies uno, aquí verás su avance y podrás invitar a otros.</p></div>'; return; }
    cont.innerHTML = e.mios.map((m) => `<article class="tbj-mov mio${m.ok ? ' cumplido' : ''}" data-id="${m.id}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${m.ok ? '🏆' : '🌱'}</span><div><b>${esc(m.t)}</b><small>${esc(AMBITOS[m.ambito] || '')}${m.ok ? ' · ¡Cumplido!' : ''}</small></div></div>
      <p class="tbj-mov-lema">${esc(m.que)}</p>${numerica(m) ? `${barra(m.n || 0, m.meta)}<p class="tbj-mov-num"><b>${m.n || 0}</b> de ${m.meta} ${esc(m.unidad)}</p>` : (m.plan && m.plan.meta ? `<p class="tbj-primer"><b>Meta:</b> ${esc(m.plan.meta)}</p>` : '')}${m.plan && m.plan.para_quien ? `<p class="tbj-primer"><b>Para:</b> ${esc(m.plan.para_quien)}</p>` : ''}
      <p class="tbj-primer"><b>Primer paso:</b> ${esc(m.paso)}</p>${m.fecha ? `<p class="tbj-primer"><b>Cuándo:</b> ${esc(cuandoTxt(m))}${m.lugar ? ` · <b>Dónde:</b> ${esc(m.lugar)}` : ''}</p>` : ''}${m.plan && m.plan.encargado_nombre ? `<p class="tbj-primer"><b>Recibe los aportes:</b> ${esc(m.plan.encargado_nombre)}</p>` : ''}${m.lider2 ? `<p class="tbj-primer"><b>Líderes:</b> ${esc(m.lider || 'Yo')} y ${esc(m.lider2)}${m.lider3 ? ', ' + esc(m.lider3) : ''}</p>` : ''}
      ${m.nube && m.nube.estado === 'publicado' ? '<p class="tbj-nube ok"><span aria-hidden="true">✨</span> Publicado en la Agenda de tu iglesia</p>' : (m.plan && m.lider2 ? '<p class="tbj-nube">Solo en tu teléfono' + (m.nube && m.nube.error && MOTIVOS[m.nube.error] ? ' · ' + esc(MOTIVOS[m.nube.error]) : '') + '</p>' : '')}<div class="tbj-acc">${m.ok || !numerica(m) ? '' : `<button type="button" class="btn tbj-mas" data-id="${m.id}">+1 hecho</button>`}${credenciales() && m.plan && m.fecha && m.lider2 && !(m.nube && m.nube.estado === 'publicado') ? `<button type="button" class="btn tbj-pubb" data-id="${m.id}">Publicar en mi iglesia</button>` : ''}<button type="button" class="btn sec tbj-inv2" data-id="${m.id}">Invitar</button><button type="button" class="btn sec tbj-bor" data-id="${m.id}" aria-label="Borrar este movimiento">🗑</button></div></article>`).join('');
    $$('.tbj-pubb', cont).forEach((b) => { b.onclick = () => publicarMov(b.dataset.id); });
    $$('.tbj-mas', cont).forEach((b) => { b.onclick = () => { const x = est(), m = x.mios.find((z) => z.id === b.dataset.id); if (!m) return; m.n = (m.n || 0) + 1; x.total += 1; const cumplido = !m.ok && m.n >= m.meta; if (cumplido) m.ok = true; salvar(x); snd(cumplido ? 'logro' : 'semilla'); confeti(b.parentNode); setTimeout(abrir, calma() ? 0 : 500); }; });
    $$('.tbj-inv2', cont).forEach((b) => { b.onclick = () => { const m = est().mios.find((z) => z.id === b.dataset.id); if (m) { snd('suave'); compartir(invitacion(m.t, m.que, numerica(m) ? m.meta : (m.plan && m.plan.meta) || '', numerica(m) ? m.unidad : '', m.fecha ? 'Cuándo: ' + cuandoTxt(m) + (m.lugar ? ' · Dónde: ' + m.lugar : '') : '')); } }; });
    $$('.tbj-bor', cont).forEach((b) => { b.onclick = () => { if (!confirm('¿Borrar este movimiento de tu teléfono?')) return; const x = est(); x.mios = x.mios.filter((z) => z.id !== b.dataset.id); salvar(x); abrir(); }; });
  }

  // =====================================================================================================
  // J2 (F923) · «ARMA TU MOVIMIENTO» = el plan en blanco del catálogo (plantilla), una sección por pantalla.
  // Los campos, las ayudas, los ejemplos y lo obligatorio salen de datos/juntos_catalogo.json. El avance se guarda solo (borrador en el teléfono).
  // =====================================================================================================
  const K_BOR = 'tb_movil_juntos_borrador';
  let F = null;                                  // { item, secs, vals, paso }
  const sinNum = (t) => String(t || '').replace(/^\d+\.\s*/, '');
  const fechaLarga = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return iso; } };
  const campos = () => F.secs.reduce((a, s) => a.concat(s.campos), []);
  function valoresIniciales(secs, it) {
    const v = {}; secs.forEach((s) => s.campos.forEach((c) => { v[c.id] = c.tipo === 'lista' ? [''] : c.tipo === 'casilla' ? false : c.tipo === 'fecha' ? hoyISO(30) : c.tipo === 'miembro' ? 'yo' : ''; }));
    if (it) { v.nombre = it.titulo || ''; if (it.lugar_tipo === 'iglesia') v.lugar = it.lugar_texto || ''; const p = (ideaBase(it).como_empezar || []).map((x) => corto(x, 120)); if (p.length) v.pasos = p; }
    return v;
  }
  function empezar(it) {
    if (vistaPrevia()) return aviso('Armar un movimiento está disponible para miembros y pastores de una iglesia.');
    const b = leer(K_BOR, null);
    if (b && b.vals && !confirm('Tienes un plan sin terminar. ¿Empezar uno nuevo y descartar ese?')) return abrir();
    planForm(it, null);
  }
  async function planForm(it, bor) {
    try { await catalogo(); } catch (e) { return aviso('No pudimos abrir el plan. Revisa tu internet y vuelve a intentarlo.'); }
    if (typeof it === 'string') it = MOV.find((z) => z.id === it) || null;
    const secs = CAT.plantilla.secciones.filter((s) => s.id !== 'cierre');   // «Al terminar» se llena al cerrar el movimiento (J5)
    F = { item: it || null, secs, vals: valoresIniciales(secs, it), paso: 0 };
    if (bor && bor.vals) { Object.keys(F.vals).forEach((k) => { const x = bor.vals[k]; if (x == null) return; if (Array.isArray(F.vals[k])) { if (Array.isArray(x) && x.length) F.vals[k] = x.map(String); } else F.vals[k] = typeof F.vals[k] === 'boolean' ? !!x : String(x); }); F.paso = Math.min(Math.max(0, bor.paso | 0), secs.length - 1); }
    pintarPaso();
  }
  const guardarBor = () => { if (F) guardar(K_BOR, { id: F.item ? F.item.id : '', vals: F.vals, paso: F.paso, t: Date.now() }); };
  function borradorHTML() {
    const b = leer(K_BOR, null); if (!b || !b.vals) return '';
    return `<div class="card tbj-borr"><p class="m0"><b>Tienes un plan sin terminar</b><br><small>${esc(b.vals.nombre || 'Sin nombre')} · va en el paso ${(b.paso | 0) + 1}</small></p><div class="tbj-acc"><button type="button" class="btn" id="tbjRetomar">Continuar</button><button type="button" class="btn sec" id="tbjDescartar">Descartar</button></div></div>`;
  }
  function fechaNota(v) { return v && v < hoyISO(30) ? 'Es menos de 1 mes: es posible que algunas personas no alcancen a organizarse. Puedes continuar.' : 'Con 1 mes de anticipación todas las personas pueden organizarse y asistir.'; }
  function campoHTML(c) {
    const id = 'tbjf-' + c.id, v = F.vals[c.id], op = c.obligatorio ? '' : ' <small class="tbj-op-tag">· opcional</small>';
    const ay = c.ayuda ? `<p class="suave tbj-vnota" id="${id}-a">${esc(c.ayuda)}</p>` : '', desc = c.ayuda ? ` aria-describedby="${id}-a"` : '', ph = c.ejemplo ? ` placeholder="Ej. ${esc(c.ejemplo)}"` : '';
    if (c.tipo === 'casilla') return `<li><label><input type="checkbox" class="tbjC" id="${id}"${v ? ' checked' : ''}> <span>${esc(c.etiqueta)}${op}</span></label></li>`;
    const lab = `<label for="${id}">${esc(c.etiqueta)}${op}</label>`;
    if (c.tipo === 'miembro') return `${lab}<select id="${id}"${desc}>${opcionesEncargado(v)}</select>${ay}`;
    if (c.tipo === 'fecha') return `${lab}<input id="${id}" type="date" min="${hoyISO(14)}" value="${esc(v)}"${desc}><p class="suave tbj-vnota" id="tbjFn" aria-live="polite">${esc(fechaNota(v))}</p>${ay}`;
    if (c.tipo === 'hora') return `${lab}<input id="${id}" type="time" value="${esc(v)}"${desc}>${ay}`;
    if (c.tipo === 'persona') return `${lab}<input id="${id}" type="text" maxlength="40" value="${esc(v)}" autocomplete="off" enterkeyhint="next"${desc}${ph}>${ay}`;
    if (c.tipo === 'lista') return `<p class="tbj-vq m0"><b>${esc(c.etiqueta)}</b>${op}</p>${ay}<div id="${id}">${v.map((x, k) => `<div class="tbj-li"><input class="tbjl" type="text" maxlength="120" data-f="${esc(c.id)}" data-i="${k}" value="${esc(x)}" aria-label="${esc(c.etiqueta)}: línea ${k + 1}"${ph}><button type="button" class="btn sec tbjq" data-f="${esc(c.id)}" data-i="${k}" aria-label="Quitar la línea ${k + 1}">✕</button></div>`).join('')}</div><button type="button" class="btn sec chico tbjmas" data-f="${esc(c.id)}">＋ Agregar otra línea</button>`;
    const largo = (c.max || 0) > 100;
    return `${lab}${largo ? `<textarea id="${id}" rows="3" maxlength="${c.max}"${desc}${ph}>${esc(v)}</textarea>` : `<input id="${id}" type="text" maxlength="${c.max || 80}" value="${esc(v)}" autocomplete="off"${desc}${ph}>`}${ay}`;
  }
  function recoger() {
    if (!F) return;
    F.secs[F.paso].campos.forEach((c) => {
      if (c.tipo === 'lista') { const l = $$('.tbjl').filter((e) => e.dataset.f === c.id); if (l.length) F.vals[c.id] = l.map((e) => String(e.value || '')); }
      else if (c.tipo === 'casilla') { const e = $('#tbjf-' + c.id); if (e) F.vals[c.id] = !!e.checked; }
      else { const e = $('#tbjf-' + c.id); if (e) F.vals[c.id] = String(e.value || ''); }
    });
  }
  const limpiar = (a) => (Array.isArray(a) ? a : []).map((x) => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean);
  function validar(s) {
    const V = F.vals, falta = (c) => ({ id: c.id, msg: `Falta completar: «${c.etiqueta}».` });
    for (const c of s.campos) {
      if (!c.obligatorio) continue;
      const v = V[c.id];
      if (c.tipo === 'casilla') { if (!v) return { id: c.id, msg: 'Para continuar, marca este compromiso: «' + c.etiqueta + '»' }; continue; }
      if (c.tipo === 'lista') { if (!limpiar(v).length) return { id: c.id, msg: `Escribe al menos una línea en «${c.etiqueta}».` }; continue; }
      if (c.tipo === 'miembro') continue;
      if (c.tipo === 'fecha') { if (!v || v < hoyISO(14)) return { id: c.id, msg: 'La fecha de inicio debe ser desde el ' + fechaLarga(hoyISO(14)) + ' (2 semanas desde hoy). Se sugiere 1 mes.' }; continue; }
      if (String(v || '').trim().length < (c.tipo === 'persona' ? 2 : 3)) return falta(c);
    }
    if (s.campos.some((c) => c.id === 'segundo') && String(V.lider || '').trim().toLowerCase() === String(V.segundo || '').trim().toLowerCase() && String(V.segundo || '').trim()) return { id: 'segundo', msg: 'El 2.º líder debe ser otra persona: así el movimiento sigue si falta el líder.' };
    return null;
  }
  function pintarPaso() {
    const S = F.secs, i = F.paso, s = S[i], pant = $('#pantalla'), ultimo = i === S.length - 1, soloCasillas = s.campos.every((c) => c.tipo === 'casilla');
    pant.innerHTML = `<button type="button" class="volver" id="tbjAtras">‹ Guardar y salir</button>
      <section class="tbj-hero chico"><p class="tbj-sello">Paso ${i + 1} de ${S.length}</p><h1>${esc(sinNum(s.titulo))}</h1>${i === 0 && F.item ? `<p class="tbj-lema">Partimos de «${esc(F.item.titulo)}». Puedes cambiar lo que quieras.</p>` : ''}</section>
      ${barra(i + 1, S.length)}<p class="suave tbj-vnota">Tu avance se guarda solo. Puedes salir y continuar cuando quieras.</p>
      ${i === 0 && CAT.plantilla.reglas ? `<details class="tbj-pasos"><summary>Reglas de un movimiento</summary><ul>${CAT.plantilla.reglas.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></details>` : ''}
      ${soloCasillas ? `<div class="card tbj-reglas"><div class="t"><span aria-hidden="true">🛡️</span>Nos comprometemos a</div><ul class="tbj-comp">${s.campos.map(campoHTML).join('')}</ul></div>` : s.campos.map(campoHTML).join('')}
      <p id="tbjErr" class="error" role="alert" hidden></p>
      <div class="tbj-acc">${i > 0 ? '<button type="button" class="btn sec" id="tbjPrev">‹ Atrás</button>' : ''}<button type="button" class="btn" id="tbjSig">${ultimo ? 'Crear mi movimiento' : 'Siguiente ›'}</button></div>`;
    aplicarAnchos(pant);
    if (s.campos.some((c) => c.tipo === 'miembro')) cargarNombres();
    pant.oninput = () => { if (F && $('#tbjSig')) { recoger(); guardarBor(); } };
    $('#tbjAtras').onclick = () => { recoger(); guardarBor(); snd('vuelve'); F = null; abrir(); setTimeout(() => aviso('Tu avance quedó guardado.'), 200); };
    const pv = $('#tbjPrev'); if (pv) pv.onclick = () => { recoger(); F.paso = Math.max(0, F.paso - 1); guardarBor(); snd('suave'); pintarPaso(); };
    const f = $('#tbjf-fecha'); if (f) f.oninput = () => { const n = $('#tbjFn'); if (n) n.textContent = fechaNota(f.value); };
    $$('.tbjmas').forEach((b) => { b.onclick = () => { recoger(); const a = F.vals[b.dataset.f]; if (a.length < 12) a.push(''); guardarBor(); pintarPaso(); const l = $$('.tbjl').filter((e) => e.dataset.f === b.dataset.f); try { l[l.length - 1].focus(); } catch (x) { /* nada */ } }; });
    $$('.tbjq').forEach((b) => { b.onclick = () => { recoger(); const a = F.vals[b.dataset.f]; a.splice(Number(b.dataset.i), 1); if (!a.length) a.push(''); guardarBor(); pintarPaso(); }; });
    $('#tbjSig').onclick = () => {
      recoger(); const er = validar(s);
      if (er) { const m = $('#tbjErr'); m.textContent = er.msg; m.hidden = false; snd('error'); try { const e = $('#tbjf-' + er.id) || $$('.tbjl')[0]; if (e && e.focus) e.focus(); } catch (x) { /* nada */ } return; }
      guardarBor();
      if (ultimo) return crear();
      F.paso += 1; guardarBor(); snd('suave'); pintarPaso(); try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
    };
    try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
  }
  function crear() {
    const V = F.vals, t = (k) => String(V[k] || '').replace(/\s+/g, ' ').trim();
    const plan = { problema: t('problema'), para_quien: t('para_quien'), meta: t('meta'), fecha: V.fecha, hora: t('hora'), lugar: t('lugar'), plan_b: t('plan_b'), lider: t('lider'), segundo: t('segundo'), tercero: t('tercero'), encargado: String(V.encargado || 'yo'), encargado_nombre: nombreEncargado(V.encargado), lider_c: t('lider_contacto'), segundo_c: t('segundo_contacto'), aportes: limpiar(V.aportes), pasos: limpiar(V.pasos), compromisos: { dignidad: !!V.c_dignidad, respeto: !!V.c_respeto, sin_dinero: !!V.c_sin_dinero, permisos: !!V.c_permisos }, origen: F.item ? F.item.id : '' };
    const x = est();
    x.mios.unshift({ id: 'm' + Date.now().toString(36), t: t('nombre').slice(0, 60), que: plan.problema.slice(0, 300), ambito: F.item ? ambitoDe(F.item) : 'iglesia', paso: plan.pasos[0] || '', fecha: plan.fecha, hora: plan.hora, lugar: plan.lugar.slice(0, 80), lider: plan.lider.slice(0, 40), lider2: plan.segundo.slice(0, 40), lider3: plan.tercero.slice(0, 40), comp: true, nube: null, n: 0, plan, creado: new Date().toISOString() });
    const idNuevo = x.mios[0].id;
    x.mios = x.mios.slice(0, 20); salvar(x); guardar(K_BOR, null); F = null; snd('juntos', 5); abrir();
    if (credenciales()) setTimeout(() => publicarMov(idNuevo), 250);
    else setTimeout(() => aviso('¡Listo! Tu movimiento quedó guardado en tu teléfono. Para publicarlo en la Agenda de tu iglesia, primero hay que unirse a ella con su código.'), 200);
  }
  // ---------- F925 · J3: publicar en la iglesia (Supabase, SQL 08) ----------
  // Quién publica: el pastor (código + secreto) o un miembro que lidera un ministerio (código + clave). Sin iglesia, queda solo en el teléfono.
  function credenciales() {
    try {
      const L = A().leer; if (!L) return null;
      const pa = L('tb_movil_pastor', null); if (pa && pa.codigo && pa.secreto) return { p_codigo: pa.codigo, p_secreto: pa.secreto, p_clave: null };
      const id = L('tb_movil_identidad', null); if (id && id.codigo && id.clave) return { p_codigo: id.codigo, p_secreto: null, p_clave: id.clave };
    } catch (e) { /* sin iglesia */ }
    return null;
  }
  const MOTIVOS = {
    'sin-permiso': 'Solo el pastor o quien lidera un ministerio puede publicar en la iglesia. El movimiento sigue guardado en tu teléfono.',
    'fecha-cercana': 'La fecha debe ser al menos 2 semanas desde hoy. Puedes cambiarla y volver a publicar.',
    'falta-lugar': 'Falta el lugar. Agrégalo para poder publicar.',
    'falta-fecha': 'Falta la fecha de inicio.',
    'falta-equipo': 'Se necesitan un líder y un 2.º líder distintos.',
    'falta-compromisos': 'Faltan marcar los compromisos del equipo.',
    'ya-publicado': 'Este movimiento ya estaba publicado.',
    'miembro-invalido': 'No se encontró a la persona elegida para recibir los aportes. Elige a otra.',
    'no-publicado': 'Este movimiento todavía no está publicado.',
    'cantidad-invalida': 'La cantidad debe ser un número entre 0 y 999.',
    'sin-aporte': 'Esa persona ya no tiene este aporte anotado.',
    'titulo-invalido': 'El nombre del movimiento es muy corto.',
    'demasiados': 'La iglesia ya tiene muchos movimientos abiertos. Conviene cerrar alguno antes de publicar otro.'
  };
  const motivoTxt = (m) => MOTIVOS[m] || 'No se pudo publicar en este momento. El movimiento sigue guardado en tu teléfono; puedes intentarlo de nuevo.';
  const inicioISO = (m) => { try { const h = /^\d{2}:\d{2}$/.test(m.hora || '') ? m.hora : '10:00'; return new Date(m.fecha + 'T' + h + ':00').toISOString(); } catch (e) { return null; } };
  function panelPublicando(on, paso, texto) {
    let el = $('#tbjPub');
    if (!on) { if (el) { el.classList.add('sale'); setTimeout(() => { try { el.remove(); } catch (e) { /* nada */ } }, 320); } return; }
    if (!el) { el = document.createElement('div'); el.id = 'tbjPub'; el.className = 'tbj-pub'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    const pasos = ['Guardando el plan', 'Anotando al equipo', 'Publicando en la Agenda'];
    el.innerHTML = '<div class="tbj-pub-in"><span class="tbj-pub-ic" aria-hidden="true">🌱</span><b>Publicando tu movimiento</b><ol>' + pasos.map((t, i) => '<li class="' + (i < paso ? 'ok' : i === paso ? 'ya' : '') + '">' + t + '</li>').join('') + '</ol><small>' + esc(texto || 'Un momento…') + '</small></div>';
  }

  // ---------- F925 · J4: aportes (cada miembro anota lo que aporta; UNA persona a cargo marca «recibido») ----------
  let NOMBRES = null;                                         // miembros de la iglesia para elegir a la persona a cargo (solo pastor y líderes los ven)
  const opcionesEncargado = (v) => '<option value="yo"' + (!v || v === 'yo' ? ' selected' : '') + '>Yo (quien crea el movimiento)</option>' + (NOMBRES || []).map((n) => '<option value="' + esc(n.id) + '"' + (v === n.id ? ' selected' : '') + '>' + esc(n.nombre) + '</option>').join('');
  const nombreEncargado = (v) => { if (!v || v === 'yo') return 'Quien crea el movimiento'; const n = (NOMBRES || []).find((z) => z.id === v); return n ? n.nombre : 'Otra persona de la iglesia'; };
  async function cargarNombres() {
    const cr = credenciales(), sb = A().sb; if (!cr || !sb || !sb.rpc) return;
    if (!NOMBRES) { try { const r = await sb.rpc('juntos_miembros_nombres', cr); NOMBRES = !r.error && Array.isArray(r.data) ? r.data : []; } catch (e) { NOMBRES = []; } }
    const sel = $('#tbjf-encargado'); if (sel && F) sel.innerHTML = opcionesEncargado(F.vals.encargado || 'yo');
  }
  let IGL = [];
  const cuandoIso = (iso) => { try { const d = new Date(iso); return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function aporteHTML(m, a, esPastor, hayClave) {
    const por = a.por_recibir || 0, rec = a.recibido || 0, tot = por + rec, marca = esPastor || m.soy_encargado, abierto = m.estado === 'publicado';
    const chips = tot ? `<span class="tbj-st por"><i aria-hidden="true"></i>Por recibir: <b>${por}</b></span><span class="tbj-st rec"><i aria-hidden="true"></i>Recibido: <b>${rec}</b></span>` : '<span class="tbj-st">Aún nadie se anotó</span>';
    const mio = hayClave && abierto ? (a.mio_recibido ? `<p class="tbj-mio rec">Tu aporte (${a.mio}) ya fue recibido. ¡Gracias!</p>` : `<div class="tbj-mio"><label for="tbjap-${esc(a.id)}">${a.mio ? `Tu aporte (por recibir)` : '¿Cuánto aportas?'}</label><div class="tbj-mio-f"><input id="tbjap-${esc(a.id)}" type="number" inputmode="numeric" min="0" max="999" value="${a.mio || 1}"><button type="button" class="btn tbj-ap-g" data-a="${esc(a.id)}">${a.mio ? 'Cambiar' : 'Yo aporto'}</button>${a.mio ? `<button type="button" class="btn sec tbj-ap-q" data-a="${esc(a.id)}">Quitar</button>` : ''}</div></div>`) : '';
    const lista = marca && Array.isArray(a.aportantes) && a.aportantes.length ? `<ul class="tbj-aport">${a.aportantes.map((x) => `<li class="${x.recibido ? 'rec' : 'por'}"><span><b>${esc(x.nombre)}</b> · ${x.cantidad}</span><span class="tbj-st ${x.recibido ? 'rec' : 'por'}"><i aria-hidden="true"></i>${x.recibido ? 'Recibido' : 'Por recibir'}</span>${abierto ? `<button type="button" class="btn ${x.recibido ? 'sec' : ''} tbj-rec-b" data-a="${esc(a.id)}" data-mi="${esc(x.miembro_id)}" data-r="${x.recibido ? 0 : 1}">${x.recibido ? 'Deshacer' : 'Marcar recibido'}</button>` : ''}</li>`).join('')}</ul>` : '';
    return `<div class="tbj-ap"><div class="tbj-ap-t"><b>${esc(a.descripcion)}</b><div class="tbj-sts">${chips}</div></div>${tot ? barra(rec, tot) : ''}${mio}${lista}</div>`;
  }
  function pintarIglesia() {
    const cont = $('#tbjIg'); if (!cont) return;
    const cr = credenciales(), sb = A().sb;
    if (!cr || !sb || !sb.rpc) { cont.innerHTML = '<div class="card tbj-vacio"><p class="suave m0">Cuando te unas a una iglesia, aquí verás los movimientos que ella publique y podrás anotar lo que aportas.</p></div>'; return; }
    cont.innerHTML = '<p class="suave">Cargando los movimientos de tu iglesia…</p>';
    const esPastor = !!cr.p_secreto;
    (esPastor ? sb.rpc('juntos_pastor_listar', { p_codigo: cr.p_codigo, p_secreto: cr.p_secreto }) : sb.rpc('juntos_miembro_listar', { p_codigo: cr.p_codigo, p_clave: cr.p_clave })).then((r) => {
      if (r.error) throw new Error('red');
      IGL = (Array.isArray(r.data) ? r.data : []).filter((m) => m.estado === 'publicado' || m.estado === 'cerrado');
      if (!IGL.length) { cont.innerHTML = '<div class="card tbj-vacio"><p class="suave m0">Tu iglesia todavía no ha publicado movimientos. Cuando lo haga, aparecerán aquí con lo que se necesita.</p></div>'; return; }
      cont.innerHTML = IGL.map((m) => `<article class="tbj-mov tbj-ig"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">🌿</span><div><b>${esc(m.titulo)}</b><small>${m.estado === 'cerrado' ? 'Cerrado' : esc(cuandoIso(m.inicio))}${m.lugar ? ' · ' + esc(m.lugar) : ''}</small></div></div>
        ${m.meta ? `<p class="tbj-primer"><b>Meta:</b> ${esc(m.meta)}</p>` : ''}
        <p class="tbj-encargado">${m.encargado_aportes ? `<b>Recibe los aportes:</b> ${esc(m.encargado_aportes.nombre)}${m.soy_encargado ? ' (tú)' : ''}` : '<b>Recibe los aportes:</b> el pastor y el equipo del movimiento'}</p>
        ${(m.aportes || []).length ? '<div class="tbj-aps">' + m.aportes.map((a) => aporteHTML(m, a, esPastor, !!cr.p_clave)).join('') + '</div>' : '<p class="suave">Este movimiento no pide aportes de especies o tiempo.</p>'}</article>`).join('');
      aplicarAnchos(cont);
      $$('.tbj-ap-g', cont).forEach((b) => { b.onclick = () => marcarAporte(b.dataset.a, Number(($('#tbjap-' + b.dataset.a) || {}).value)); });
      $$('.tbj-ap-q', cont).forEach((b) => { b.onclick = () => marcarAporte(b.dataset.a, 0); });
      $$('.tbj-rec-b', cont).forEach((b) => { b.onclick = () => marcarRecibido(b.dataset.a, b.dataset.mi, b.dataset.r === '1'); });
    }).catch(() => {
      cont.innerHTML = '<div class="card tbj-vacio"><p class="suave m0">No pudimos cargar los movimientos de tu iglesia. Revisa tu internet e inténtalo de nuevo.</p><button type="button" class="btn sec" id="tbjIgRe">Reintentar</button></div>';
      const b = $('#tbjIgRe'); if (b) b.onclick = pintarIglesia;
    });
  }
  async function marcarAporte(aporte, cant) {
    const cr = credenciales(), sb = A().sb; if (!cr || !sb) return;
    if (!(cant >= 0 && cant <= 999) || cant !== Math.floor(cant)) return aviso(MOTIVOS['cantidad-invalida']);
    try {
      const r = await sb.rpc('juntos_aporte_marcar', { p_codigo: cr.p_codigo, p_clave: cr.p_clave, p_aporte: aporte, p_cantidad: cant });
      if (r.error) throw new Error('red');
      const f = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!f || !f.ok) return aviso(motivoTxt(f && f.motivo));
      snd('juntos', 3); aviso(cant ? '¡Gracias! Tu aporte quedó anotado como «por recibir». La persona a cargo lo marcará como recibido cuando llegue.' : 'Quitaste tu aporte.'); pintarIglesia();
    } catch (e) { aviso('No se pudo guardar tu aporte. Revisa tu internet e inténtalo de nuevo.'); }
  }
  async function marcarRecibido(aporte, miembro, recibido) {
    const cr = credenciales(), sb = A().sb; if (!cr || !sb) return;
    try {
      const r = await sb.rpc('juntos_aporte_recibido', Object.assign({}, cr, { p_aporte: aporte, p_miembro: miembro, p_recibido: recibido }));
      if (r.error) throw new Error('red');
      const f = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!f || !f.ok) return aviso(f && f.motivo === 'sin-permiso' ? 'Solo la persona a cargo de los aportes y el pastor pueden marcar lo recibido.' : motivoTxt(f && f.motivo));
      snd('juntos', recibido ? 5 : 2); aviso(recibido ? 'Marcado como recibido.' : 'Volvió a «por recibir».'); pintarIglesia();
    } catch (e) { aviso('No se pudo guardar. Revisa tu internet e inténtalo de nuevo.'); }
  }
  async function publicarMov(id) {
    const x = est(), m = x.mios.find((z) => z.id === id); if (!m || (m.nube && m.nube.estado === 'publicado')) return;
    const cr = credenciales(), sb = A().sb; if (!cr || !sb || !sb.rpc) return aviso('Para publicar hace falta unirse a una iglesia.');
    const fin = (msg, nube) => { panelPublicando(false); const y = est(), mm = y.mios.find((z) => z.id === id); if (mm) { mm.nube = nube; salvar(y); } try { pintarMios(); } catch (e) { /* nada */ } aviso(msg); };
    const llamar = async (fn, args) => { const r = await sb.rpc(fn, Object.assign({}, cr, args)); if (r.error) throw new Error('red'); const f = Array.isArray(r.data) ? r.data[0] : r.data; return f || { ok: false, motivo: 'otro' }; };
    const pl = m.plan || {}, base = { p_titulo: m.t, p_problema: pl.problema || null, p_para_quien: pl.para_quien || null, p_meta: pl.meta || null, p_lugar: m.lugar || null, p_plan_b: pl.plan_b || null, p_inicio: inicioISO(m) };
    try {
      panelPublicando(true, 0, 'Esto toma unos segundos.');
      let nid = m.nube && m.nube.id;
      if (!nid) {
        const c = await llamar('juntos_crear', Object.assign({ p_idea_id: null }, base));
        if (!c.ok) return fin(motivoTxt(c.motivo), { estado: 'local', error: c.motivo });
        nid = c.id;
      } else {
        const g = await llamar('juntos_guardar', Object.assign({ p_mov: nid }, base));
        if (!g.ok) return fin(motivoTxt(g.motivo), { id: nid, estado: 'local', error: g.motivo });
      }
      panelPublicando(true, 1, 'Los contactos del equipo solo los ven el pastor y el equipo.');
      const eq = [{ rol: 'lider', nombre: m.lider, contacto: pl.lider_c || '' }, { rol: 'segundo', nombre: m.lider2, contacto: pl.segundo_c || '' }].concat(m.lider3 ? [{ rol: 'tercero', nombre: m.lider3, contacto: '' }] : []);
      const e1 = await llamar('juntos_equipo_guardar', { p_mov: nid, p_equipo: eq });
      if (!e1.ok) return fin(motivoTxt(e1.motivo), { id: nid, estado: 'local', error: e1.motivo });
      let sinEnc = false;
      try {
        const en = pl.encargado || 'yo', rr = await sb.rpc('juntos_aportes_encargado', Object.assign({}, cr, { p_mov: nid }, en === 'yo' ? { p_miembro: null, p_yo: true } : { p_miembro: en, p_yo: false }));
        if (rr.error) sinEnc = true; else { const f = Array.isArray(rr.data) ? rr.data[0] : rr.data; if (f && !f.ok) return fin(motivoTxt(f.motivo), { id: nid, estado: 'local', error: f.motivo }); }
      } catch (e) { sinEnc = true; }
      await llamar('juntos_aportes_guardar', { p_mov: nid, p_aportes: (pl.aportes || []).slice(0, 30).map((t) => ({ tipo: /\b(hora|horas|manos|tiempo|voluntari)/i.test(t) ? 'tiempo' : 'especie', descripcion: String(t).slice(0, 80), cantidad: 1 })) });
      await llamar('juntos_pasos_guardar', { p_mov: nid, p_pasos: (pl.pasos || []).slice(0, 20).map((t) => ({ texto: String(t).slice(0, 160), fecha: null, responsable: null, hecho: false })) });
      panelPublicando(true, 2, 'Casi listo.');
      const c2 = pl.compromisos || {};
      const pu = await llamar('juntos_publicar', { p_mov: nid, p_dignidad: !!c2.dignidad, p_respeto: !!c2.respeto, p_sin_dinero: !!c2.sin_dinero, p_permisos: !!c2.permisos });
      if (!pu.ok && pu.motivo !== 'ya-publicado') return fin(motivoTxt(pu.motivo), { id: nid, estado: 'local', error: pu.motivo });
      snd('juntos', 5);
      fin(sinEnc ? 'Publicado en la Agenda. Aún no se puede asignar a la persona a cargo de los aportes: falta una actualización del servicio; mientras tanto el pastor y el equipo los reciben.' : '¡Publicado! Tu movimiento ya aparece en la Agenda de tu iglesia.', { id: nid, estado: 'publicado', sinEnc: sinEnc });
    } catch (e) {
      fin('Sin conexión. Tu movimiento quedó guardado en el teléfono; puedes publicarlo después con «Publicar en mi iglesia».', { id: m.nube && m.nube.id, estado: 'local', error: 'red' });
    }
  }
  // F920 · CALENDARIO Y AVISOS DENTRO DE LA APP. Los movimientos con fecha se ven en la Agenda y el Calendario, y avisan a 30, 14, 7, 3 y 1 día y el mismo día.
  const diasPara = (m) => Math.round((new Date(m.fecha + 'T12:00:00') - new Date(new Date().toDateString() + ' 12:00:00')) / DIA);
  function proximos() { try { return est().mios.filter((m) => m.fecha && !m.ok && diasPara(m) >= 0).sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((m) => ({ m, d: diasPara(m) })); } catch (e) { return []; } }
  const frase = (x) => (x.d === 0 ? 'Hoy' : x.d === 1 ? 'Mañana' : 'En ' + x.d + ' días') + ': «' + x.m.t + '»' + (x.m.lugar ? ' · ' + x.m.lugar : '');
  function recordHTML() { try { return window.TBFechas ? window.TBFechas.recordHTML() : ''; } catch (e) { return ''; } }
  function listaHTML() { const l = proximos(); if (!l.length) return ''; return l.map((x) => '<div class="fila cal-fila"><span class="fila-ico t2" aria-hidden="true">🌱</span><span class="fila-txt"><b>' + esc(x.m.t) + '</b><small>' + esc(cuandoTxt(x.m)) + (x.m.lugar ? ' · ' + esc(x.m.lugar) : '') + '</small></span></div>').join(''); }
  window.TBJuntos = { abrir, proximos, listaHTML, publicar: publicarMov, marcarAporte, marcarRecibido, iglesia: pintarIglesia };
})();
