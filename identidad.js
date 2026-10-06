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
      { ic: '🌍', t: 'Sumarse a algo bueno del barrio', quien: 'Felipe', escena: 'Vio «Abrigo para el invierno» y quiso aportar con lo que tenía.',
        pasos: ['Abre «Juntos hacemos el bien» y toca «Me sumo».', 'Junta lo que puede y marca «Hice mi parte».', 'Invita a alguien con el mensaje ya listo.'],
        res: 'Se suma sin tener que pertenecer a ninguna iglesia.', tab: 'inicio', di: 'juntos', btn: 'Ver los movimientos' }
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
  function pintarEjemplos(caja, rol) {
    if (!caja) return;
    let actual = rol === 'pastor' ? 'pastor' : 'miembro';
    let reloj = 0, obs = null;
    const parar = () => { if (reloj) { clearInterval(reloj); reloj = 0; } };
    const dibuja = () => {
      parar(); if (obs) { try { obs.disconnect(); } catch (e) { /* sin observador */ } obs = null; }
      const L = visibles(actual); let idx = 0, auto = !calma();
      caja.innerHTML = `<div class="tbej" data-rol="${actual}">
        <div class="tbej-cab"><span class="tbej-ic" aria-hidden="true">${actual === 'pastor' ? '🛡️' : '🌱'}</span><div><b>${dentroDeIglesia() ? (actual === 'pastor' ? 'Cómo cuida mejor a su iglesia un pastor' : 'Cómo aprovecha la app un miembro') : (actual === 'pastor' ? 'Ideas para organizar una iglesia' : 'Ideas para empezar hoy')}</b><small>${dentroDeIglesia() ? 'Historias inventadas, pensadas para inspirar. Desliza y toca una para probarla.' : 'Ejemplos inventados para inspirarte. Desliza y toca uno para probarlo.'}</small></div></div>
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
  const AMBITOS = { familia: 'Mi familia', vecinos: 'Mis vecinos', iglesia: 'Mi iglesia', ciudad: 'Mi ciudad', pais: 'Mi país' };
  const MOV = [
    { id: 'olla', ic: '🍲', t: 'Una olla, un barrio', lema: 'Nadie come solo ni pasa hambre en nuestra cuadra.', ambito: 'vecinos', meta: 120, unidad: 'platos al mes', base: 78, quien: 'Sector Norte · 3 iglesias y la junta de vecinos',
      pasos: ['Pon 1 kilo de lo que tengas (arroz, legumbres, verduras).', 'Ofrece 2 horas un sábado para cocinar o servir.', 'Lleva un plato a un vecino que esté pasando un mal momento.'] },
    { id: 'utiles', ic: '🎒', t: 'Ningún niño sin útiles', lema: 'Que la falta de un cuaderno no sea la razón para quedarse atrás.', ambito: 'ciudad', meta: 60, unidad: 'kits escolares', base: 41, quien: 'Red de familias y profesores voluntarios',
      pasos: ['Dona un lápiz, cuaderno o mochila en buen estado.', 'Arma un kit con 5 elementos básicos.', 'Pregunta en tu colegio quién lo necesita, sin exponer a nadie.'] },
    { id: 'abrigo', ic: '🧥', t: 'Abrigo para el invierno', lema: 'Una chaqueta que ya no usas es el invierno de otra persona.', ambito: 'ciudad', meta: 150, unidad: 'abrigos entregados', base: 96, quien: 'Clubes deportivos y comunidades',
      pasos: ['Revisa tu clóset: separa 2 prendas limpias y en buen estado.', 'Invita a tu equipo, curso o trabajo a hacer lo mismo.', 'Entrégalas en el punto de recolección más cercano.'] },
    { id: 'acompana', ic: '☎️', t: 'Vecinos que se acompañan', lema: 'Una llamada a tiempo cambia un día entero.', ambito: 'vecinos', meta: 40, unidad: 'adultos mayores acompañados', base: 23, quien: 'Adolescentes y jóvenes de la comunidad',
      pasos: ['Elige a un adulto mayor que conozcas y llámalo esta semana.', 'Anota cuándo le gusta recibir visitas.', 'Pregunta si necesita algo: compras, trámites, compañía.'] },
    { id: 'plaza', ic: '🌳', t: 'Plaza viva', lema: 'Cuidar un lugar de todos es decir «esto es nuestro».', ambito: 'vecinos', meta: 6, unidad: 'jornadas de limpieza', base: 4, quien: 'Vecinos, niños y comerciantes',
      pasos: ['Lleva guantes y una bolsa un sábado por la mañana.', 'Planta o riega una planta.', 'Invita a un vecino que nunca ha participado.'] },
    { id: 'refuerzo', ic: '📚', t: 'Refuerzo escolar gratis', lema: 'Quien sabe, enseña. Quien aprende, un día enseñará.', ambito: 'iglesia', meta: 30, unidad: 'estudiantes apoyados', base: 18, quien: 'Profesores jubilados y universitarios',
      pasos: ['Ofrece 1 hora semanal en lo que mejor sabes (matemática, lectura, inglés).', 'Consigue un espacio con luz y mesa: la sala de la iglesia sirve.', 'Cuéntale a una familia que lo necesite.'] },
    { id: 'huerta', ic: '🥬', t: 'Huerta de todos', lema: 'Sembrar juntos: la comida más rica es la que cosechamos entre varios.', ambito: 'vecinos', meta: 20, unidad: 'familias participando', base: 12, quien: 'Terreno cedido por la parroquia y vecinos',
      pasos: ['Trae semillas, tierra, herramientas o simplemente tus manos.', 'Elige un día fijo de la semana para regar.', 'Reparte lo cosechado con quien lo necesite.'] },
    { id: 'sangre', ic: '🩸', t: 'Sangre que une', lema: 'Una hora tuya puede darle años a alguien.', ambito: 'ciudad', meta: 50, unidad: 'donantes', base: 29, quien: 'Iglesias, clubes y colegios',
      pasos: ['Pregunta en el centro de salud si puedes donar.', 'Ve acompañado: se hace más fácil.', 'Cuéntalo para que otros se animen.'] }
  ];
  const RECETA = [['👀', 'Mira', 'Escoge un problema real que veas cerca, uno solo.'], ['🤝', 'Une', 'Invita a 3 personas. Un movimiento es de muchos o no es movimiento.'], ['⚡', 'Empieza', 'Da un primer paso en 72 horas. Lo pequeño que empieza gana.'], ['📏', 'Mide', 'Ponle un número: platos, personas, abrigos, horas.'], ['🎉', 'Celebra', 'Cuenta lo logrado para que otros se animen.']];
  const REGLAS = ['Nunca publiques nombres, fotos ni direcciones de personas sin su permiso.', 'No pidas dinero a desconocidos: pide tiempo, cosas o ayuda y rinde cuentas.', 'Ayuda con dignidad: pregunta qué necesita la persona, no decidas por ella.', 'Un movimiento sirve a todos, sin importar iglesia, religión o forma de pensar.'];

  const est = () => { const e = leer(K_J, null); return e && typeof e === 'object' ? { unidos: e.unidos || {}, mios: e.mios || [], total: e.total || 0 } : { unidos: {}, mios: [], total: 0 }; };
  const salvar = (e) => guardar(K_J, e);
  const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a * 100 / Math.max(1, b))));
  const barra = (v, m, cl) => `<div class="tbj-bar ${cl || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${m}" aria-valuenow="${Math.min(v, m)}"><i data-w="${pct(v, m)}"></i></div>`;
  const aplicarAnchos = (r) => { $$('.tbj-bar i[data-w]', r).forEach((i) => { setTimeout(() => { i.style.setProperty('--w', i.dataset.w + '%'); }, calma() ? 0 : 60); }); };
  const invitacion = (t, lema, meta, unidad) => `🌍 ${t}\n${lema}\nMeta: ${meta} ${unidad}.\n¿Te sumas? Yo ya empecé. Lo hacemos juntos con la app Tierra Buena: ${location.origin}${location.pathname}\n#JuntosHacemosElBien`;
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
  function opcionesDelMes() { const n = new Date().getMonth(); return [0, 1, 2, 3].map((k) => MOV[(n * 2 + k * 3) % MOV.length]).filter((m, i, v) => v.indexOf(m) === i); }
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
    const base = (m, i) => 10 + ((m.base || 20) % 17) + i * 3;   // votos de ejemplo (hasta conectar la nube)
    const tot = ops.reduce((s, m, i) => s + base(m, i) + (voto === m.id ? 1 : 0), 0);
    caja.innerHTML = `<div class="card tbj-voto"><p class="tbj-vq"><b>¿Qué hacemos entre todos este mes?</b><small>Un voto por persona. La opción más votada se vuelve el movimiento del mes en la app.</small></p>
      ${ops.map((m, i) => { const v = base(m, i) + (voto === m.id ? 1 : 0); return `<button type="button" class="tbj-op${voto === m.id ? ' on' : ''}" data-v="${m.id}" ${voto ? 'disabled' : ''}><span class="tbj-op-ic" aria-hidden="true">${m.ic}</span><span class="tbj-op-tx"><b>${esc(m.t)}</b><small>${esc(m.lema)}</small>${voto ? barra(v, tot, '') : ''}</span>${voto ? `<em>${pct(v, tot)}%</em>` : ''}</button>`; }).join('')}
      <p class="suave tbj-vnota">${voto ? 'Gracias por votar. Vuelve el próximo mes: habrá nuevas opciones.' : 'Elige una. No hay respuestas malas: todas hacen bien.'} <span class="tbj-ejtag">Cifras de ejemplo: con tu cuenta y la votación activa se vuelve real</span></p></div>`;
    $$('.tbj-op', caja).forEach((b) => { b.onclick = () => { if (b.disabled) return; snd('juntos', 3); const x = est2(); x.votos[mesClave()] = b.dataset.v; guardar(K_J2, x); pintarVoto(); confeti(caja); }; });
    aplicarAnchos(caja);
  }
  function pintarMuro() {
    const caja = $('#tbjMuro'); if (!caja) return;
    const e = est2();
    const base = [{ q: 'Una familia del Sector Norte', t: 'Este sábado repartimos 40 platos de comida. Llegaron 9 vecinos nuevos a ayudar.', a: 14, ej: true }, { q: 'Un grupo de jóvenes', t: 'Limpiamos la plaza y plantamos 12 arbolitos. El próximo mes seguimos con la otra cuadra.', a: 22, ej: true }];
    const L = e.muro.concat(base);
    caja.innerHTML = `<div class="card tbj-muro-nuevo"><label for="tbjTxt" class="tbj-vq"><b>Cuenta un avance</b><small>Algo bueno que hiciste o viste. Sin nombres ni fotos de otras personas.</small></label>
      <textarea id="tbjTxt" maxlength="220" rows="3" placeholder="Hoy ayudamos a…"></textarea><div class="tbj-muro-fila"><small id="tbjCnt">0 / 220</small><button type="button" class="btn chico" id="tbjPub">Compartir avance</button></div></div>
      <div class="tbj-muro">${L.map((m, i) => `<article class="card tbj-post"><p class="tbj-post-q">${esc(m.q || 'Yo')}${m.ej ? ' <span class="tbj-ejtag">ejemplo</span>' : ''}</p><p>${esc(m.t)}</p><button type="button" class="tbj-an${m.yo ? ' on' : ''}" data-i="${i}" aria-pressed="${!!m.yo}">👏 Animar · <b>${m.a || 0}</b></button></article>`).join('')}</div>`;
    const t = $('#tbjTxt'); t.oninput = () => { $('#tbjCnt').textContent = t.value.length + ' / 220'; };
    $('#tbjPub').onclick = () => { const v = t.value.trim(); if (v.length < 8) { snd('error'); t.focus(); return; } const x = est2(); x.muro.unshift({ q: 'Yo', t: v.slice(0, 220), a: 0, f: Date.now() }); x.muro = x.muro.slice(0, 40); guardar(K_J2, x); snd('exito'); pintarMuro(); };
    $$('.tbj-an', caja).forEach((b) => { b.onclick = () => { const i = Number(b.dataset.i), x = est2(); if (i >= x.muro.length) { snd('toque'); b.classList.toggle('on'); const n = $('b', b); n.textContent = String(Number(n.textContent) + (b.classList.contains('on') ? 1 : -1)); return; } const m = x.muro[i]; m.yo = !m.yo; m.a = Math.max(0, (m.a || 0) + (m.yo ? 1 : -1)); guardar(K_J2, x); snd('toque'); pintarMuro(); }; });
  }

  function abrir() {
    const ap = A(), pant = $('#pantalla'); if (!pant) return;
    const e = est();
    const aportes = Object.keys(e.unidos).reduce((s, k) => s + (e.unidos[k].n || 0), 0) + e.mios.reduce((s, m) => s + (m.n || 0), 0);
    const sumados = Object.keys(e.unidos).length + e.mios.length;
    pant.innerHTML = `<button type="button" class="volver" id="tbjVolver">‹ Vida</button>
      <section class="tbj-hero"><span class="tbj-h-a" aria-hidden="true"></span><span class="tbj-h-b" aria-hidden="true"></span>
        <p class="tbj-sello">Movimientos de Tierra Buena</p><h1>Juntos hacemos el bien</h1>
        <p class="tbj-lema">Aquí la Palabra se vuelve barrio. Elige un movimiento, súmate y mira cómo crece, o inicia el tuyo.</p>
        <div class="tbj-huella"><span><b data-n="${aportes}">${aportes}</b><small>pasos míos</small></span><span><b data-n="${sumados}">${sumados}</b><small>movimientos</small></span></div></section>
      <h2 class="sep">Mis movimientos</h2><div id="tbjMios"></div>
      <div class="tbj-nuevo"><button type="button" class="btn" id="tbjNuevo">＋ Iniciar mi propio movimiento</button></div>
      <h2 class="sep">Movimientos en marcha <small class="tbj-ejtag">ejemplos para inspirarte</small></h2><div id="tbjLista" class="tbj-lista"></div>
      <h2 class="sep">La receta de un movimiento</h2>
      <ol class="tbj-receta">${RECETA.map((r, i) => `<li><span class="tbj-n" aria-hidden="true">${r[0]}</span><span><b>${i + 1}. ${r[1]}</b><small>${r[2]}</small></span></li>`).join('')}</ol>
      <div class="card tbj-reglas"><div class="t"><span aria-hidden="true">🛡️</span>Reglas del bien</div><ul>${REGLAS.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    $('#tbjVolver').onclick = () => { snd('vuelve'); if (ap.ir) ap.ir('vida'); };
    pintarMios(); pintarLista(); pintarVoto(); pintarMuro(); aplicarAnchos(pant);
    $('#tbjNuevo').onclick = () => { snd('abre'); formulario(); };
    try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
  }

  function pintarLista() {
    const e = est(), cont = $('#tbjLista'); if (!cont) return;
    cont.innerHTML = MOV.map((m) => {
      const u = e.unidos[m.id], v = m.base + (u ? u.n : 0), unido = !!u;
      return `<article class="tbj-mov${unido ? ' unido' : ''}" data-id="${m.id}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${m.ic}</span><div><b>${esc(m.t)}</b><small>${esc(AMBITOS[m.ambito])} · ${esc(m.quien)}</small></div></div>
        <p class="tbj-mov-lema">${esc(m.lema)}</p>
        ${barra(v, m.meta)}<p class="tbj-mov-num"><b>${v}</b> de ${m.meta} ${esc(m.unidad)}</p>
        <details class="tbj-pasos"><summary>${unido ? 'Mis pasos' : 'Cómo puedo ayudar'}</summary><ul>${m.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></details>
        <div class="tbj-acc">${unido ? `<button type="button" class="btn tbj-parte" data-id="${m.id}">Hice mi parte (+1)</button>` : `<button type="button" class="btn tbj-sumo" data-id="${m.id}">Me sumo</button>`}<button type="button" class="btn sec tbj-inv" data-id="${m.id}">Invitar</button></div></article>`;
    }).join('');
    $$('.tbj-sumo', cont).forEach((b) => { b.onclick = () => { const x = est(); x.unidos[b.dataset.id] = { n: 0, desde: new Date().toISOString() }; salvar(x); snd('juntos', Object.keys(x.unidos).length); confeti(b.parentNode); setTimeout(abrir, calma() ? 0 : 650); }; });
    $$('.tbj-parte', cont).forEach((b) => { b.onclick = () => { const x = est(); if (!x.unidos[b.dataset.id]) return; x.unidos[b.dataset.id].n += 1; x.total += 1; salvar(x); snd('semilla'); confeti(b.parentNode); setTimeout(abrir, calma() ? 0 : 500); }; });
    $$('.tbj-inv', cont).forEach((b) => { b.onclick = () => { const m = MOV.find((z) => z.id === b.dataset.id); if (m) { snd('suave'); compartir(invitacion(m.t, m.lema, m.meta, m.unidad)); } }; });
  }

  function pintarMios() {
    const e = est(), cont = $('#tbjMios'); if (!cont) return;
    if (!e.mios.length) { cont.innerHTML = '<div class="card tbj-vacio"><p class="m0">🌱</p><p class="suave m0t">Aún no has iniciado ninguno. Cuando inicies uno, aquí verás su avance y podrás invitar a otros.</p></div>'; return; }
    cont.innerHTML = e.mios.map((m) => `<article class="tbj-mov mio${m.ok ? ' cumplido' : ''}" data-id="${m.id}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${m.ok ? '🏆' : '🌱'}</span><div><b>${esc(m.t)}</b><small>${esc(AMBITOS[m.ambito] || '')}${m.ok ? ' · ¡Cumplido!' : ''}</small></div></div>
      <p class="tbj-mov-lema">${esc(m.que)}</p>${barra(m.n || 0, m.meta)}<p class="tbj-mov-num"><b>${m.n || 0}</b> de ${m.meta} ${esc(m.unidad)}</p>
      <p class="tbj-primer"><b>Primer paso:</b> ${esc(m.paso)}</p>
      <div class="tbj-acc">${m.ok ? '' : `<button type="button" class="btn tbj-mas" data-id="${m.id}">+1 hecho</button>`}<button type="button" class="btn sec tbj-inv2" data-id="${m.id}">Invitar</button><button type="button" class="btn sec tbj-bor" data-id="${m.id}" aria-label="Borrar este movimiento">🗑</button></div></article>`).join('');
    $$('.tbj-mas', cont).forEach((b) => { b.onclick = () => { const x = est(), m = x.mios.find((z) => z.id === b.dataset.id); if (!m) return; m.n = (m.n || 0) + 1; x.total += 1; const cumplido = !m.ok && m.n >= m.meta; if (cumplido) m.ok = true; salvar(x); snd(cumplido ? 'logro' : 'semilla'); confeti(b.parentNode); setTimeout(abrir, calma() ? 0 : 500); }; });
    $$('.tbj-inv2', cont).forEach((b) => { b.onclick = () => { const m = est().mios.find((z) => z.id === b.dataset.id); if (m) { snd('suave'); compartir(invitacion(m.t, m.que, m.meta, m.unidad)); } }; });
    $$('.tbj-bor', cont).forEach((b) => { b.onclick = () => { if (!confirm('¿Borrar este movimiento de tu teléfono?')) return; const x = est(); x.mios = x.mios.filter((z) => z.id !== b.dataset.id); salvar(x); abrir(); }; });
  }

  function formulario() {
    const pant = $('#pantalla'), ap = A();
    pant.innerHTML = `<button type="button" class="volver" id="tbjAtras">‹ Juntos hacemos el bien</button>
      <section class="tbj-hero chico"><h1>Inicia un movimiento</h1><p class="tbj-lema">Responde 5 cosas cortas. Después lo invitas a otros con un mensaje listo.</p></section>
      <label for="tbjT">1. ¿Cómo se llama? (corto y que inspire)</label><input id="tbjT" type="text" maxlength="60" placeholder="Ej. Una olla, un barrio" autocomplete="off">
      <label for="tbjQ">2. ¿Qué problema real quieres mejorar?</label><textarea id="tbjQ" rows="2" maxlength="140" placeholder="Ej. Hay familias de mi cuadra que no alcanzan a comer a fin de mes."></textarea>
      <label for="tbjA">3. ¿Quiénes pueden sumarse primero?</label><select id="tbjA">${Object.keys(AMBITOS).map((k) => `<option value="${k}"${k === 'vecinos' ? ' selected' : ''}>${AMBITOS[k]}</option>`).join('')}</select>
      <label for="tbjM">4. ¿Cuánto quieres lograr? (un número y qué mide)</label><div class="tbj-fila"><input id="tbjM" type="number" inputmode="numeric" min="1" max="100000" placeholder="50"><input id="tbjU" type="text" maxlength="30" placeholder="platos, abrigos, horas…" autocomplete="off"></div>
      <label for="tbjP">5. ¿Cuál es el primer paso que darás en 72 horas?</label><textarea id="tbjP" rows="2" maxlength="140" placeholder="Ej. Preguntar a 3 vecinos si quieren aportar una verdura."></textarea>
      <p id="tbjErr" class="error" role="alert" hidden></p><button type="button" class="btn" id="tbjCrear">Crear mi movimiento</button>`;
    $('#tbjAtras').onclick = () => { snd('vuelve'); abrir(); };
    $('#tbjCrear').onclick = () => {
      const t = $('#tbjT').value.trim().replace(/\s+/g, ' '), que = $('#tbjQ').value.trim(), meta = Math.floor(Number($('#tbjM').value)), unidad = $('#tbjU').value.trim() || 'pasos', paso = $('#tbjP').value.trim();
      const er = (m) => { const x = $('#tbjErr'); x.textContent = m; x.hidden = false; snd('error'); };
      if (t.length < 3) return er('Ponle un nombre de al menos 3 letras.');
      if (que.length < 8) return er('Cuéntanos en una frase qué problema quieres mejorar.');
      if (!(meta >= 1 && meta <= 100000)) return er('Ponle una meta con número (por ejemplo, 50).');
      if (paso.length < 5) return er('Escribe el primer paso que darás.');
      const x = est(); x.mios.unshift({ id: 'm' + Date.now().toString(36), t: t.slice(0, 60), que: que.slice(0, 140), ambito: $('#tbjA').value, meta, unidad: unidad.slice(0, 30), paso: paso.slice(0, 140), n: 0, creado: new Date().toISOString() });
      x.mios = x.mios.slice(0, 20); salvar(x); snd('juntos', 5); abrir();
      setTimeout(() => aviso('¡Listo! Toca «Invitar» para sumar a tus primeros 3.'), 200);
    };
    try { window.scrollTo(0, 0); $('#tbjT').focus(); } catch (x) { /* nada */ }
  }
  window.TBJuntos = { abrir };
})();
