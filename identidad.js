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
  // F919/F921: IDEAS (sin cifras ni personas inventadas; cada una trae un ejemplo de cómo podría organizarse). Aquí SÍ puede haber más ejemplos y variedad: es el lugar de las ideas.
  const CATS = ['Alimentos y ropa', 'Niñez y jóvenes', 'Adultos mayores y acompañar', 'Cuidado del entorno', 'Salud', 'Entre iglesias'];
  let filtroCat = '';
  const MOV = [
    { id: 'olla', ic: '🍲', t: 'Una olla para la congregación', lema: 'Que nadie en nuestra iglesia ni en nuestra cuadra pase hambre.', ambito: 'iglesia', cat: 'Alimentos y ropa', unidad: 'platos',
      pasos: ['Cada familia aporta 1 kilo de lo que tenga (arroz, legumbres, verduras).', 'Dos o tres personas cocinan un sábado en la sala de la iglesia.', 'Se lleva un plato a quien esté pasando un mal momento.'],
      ej: 'Un sábado a las 10:00 en la sala de la iglesia: 3 personas cocinan, 2 reparten y 1 anota lo recibido.' },
    { id: 'canasta', ic: '🧺', t: 'Canasta de fin de año', lema: 'Una mesa con lo necesario para quien lo requiere en estas fechas.', ambito: 'iglesia', cat: 'Alimentos y ropa', unidad: 'canastas',
      pasos: ['Se define qué lleva cada canasta (por ejemplo, 6 productos básicos).', 'Cada familia o grupo se compromete con un producto.', 'Se arman y se entregan con discreción.'],
      ej: 'Se arman 10 canastas el último sábado de noviembre; cada célula aporta un producto.' },
    { id: 'abrigo', ic: '🧥', t: 'Abrigo para el invierno', lema: 'Una chaqueta que ya no se usa puede ser el abrigo de otra persona.', ambito: 'iglesia', cat: 'Alimentos y ropa', unidad: 'abrigos',
      pasos: ['Cada persona separa 2 prendas limpias y en buen estado.', 'Se juntan en el templo o en la sala de reuniones.', 'El grupo de servicio las entrega con dignidad.'],
      ej: 'Durante dos domingos se recibe ropa al salir del culto; el tercer sábado se ordena y se entrega.' },
    { id: 'ropero', ic: '👕', t: 'Ropero solidario', lema: 'Un lugar fijo donde la ropa en buen estado encuentra nuevo dueño.', ambito: 'iglesia', cat: 'Alimentos y ropa', unidad: 'prendas entregadas',
      pasos: ['Se destina un rincón o armario de la iglesia.', 'Un equipo ordena por talla y temporada.', 'Se abre un día fijo al mes.'],
      ej: 'Primer sábado de cada mes, de 10:00 a 12:00, atendido por 3 personas del grupo de servicio.' },
    { id: 'utiles', ic: '🎒', t: 'Ningún niño sin útiles', lema: 'Que la falta de un cuaderno no sea una razón para quedarse atrás.', ambito: 'iglesia', cat: 'Niñez y jóvenes', unidad: 'kits escolares',
      pasos: ['La iglesia recoge lápices, cuadernos y mochilas en buen estado.', 'Se arman kits de 5 elementos básicos.', 'Se entregan con discreción, sin exponer a ninguna familia.'],
      ej: 'Se recibe material en febrero y los kits se entregan antes del inicio de clases.' },
    { id: 'merienda', ic: '🥪', t: 'Merienda para niños', lema: 'Un momento a la semana donde los niños del sector comen y comparten.', ambito: 'grupo', cat: 'Niñez y jóvenes', unidad: 'meriendas',
      pasos: ['El ministerio de niños define el día y la cantidad.', 'Cada familia aporta pan o fruta por turnos.', 'Siempre hay dos adultos presentes.'],
      ej: 'Cada miércoles a las 17:00 en la sala de la iglesia, con un turno semanal de dos familias.' },
    { id: 'jovenes', ic: '🎶', t: 'Tarde de jóvenes que sirve', lema: 'Los jóvenes ponen su energía al servicio de la comunidad.', ambito: 'grupo', cat: 'Niñez y jóvenes', unidad: 'jóvenes participando',
      pasos: ['El grupo de jóvenes elige una necesidad concreta.', 'Se reparten tareas (cocinar, limpiar, acompañar).', 'Al terminar se comparte qué se aprendió.'],
      ej: 'Un sábado por la tarde, el grupo de jóvenes limpia y pinta la sala de un hogar de adultos mayores.' },
    { id: 'refuerzo', ic: '📚', t: 'Refuerzo escolar en la iglesia', lema: 'Quien sabe, enseña. Quien aprende, un día enseñará.', ambito: 'grupo', cat: 'Niñez y jóvenes', unidad: 'estudiantes',
      pasos: ['Cada voluntario ofrece 1 hora semanal en lo que mejor sabe.', 'La sala de la iglesia sirve: luz y una mesa bastan.', 'Se informa a las familias que lo necesiten.'],
      ej: 'Martes y jueves de 16:00 a 17:00, con 4 voluntarios (lectura, matemática e inglés).' },
    { id: 'acompana', ic: '☎️', t: 'Hermanos que se acompañan', lema: 'Una llamada a tiempo puede cambiar un día entero.', ambito: 'grupo', cat: 'Adultos mayores y acompañar', unidad: 'visitas o llamadas',
      pasos: ['Cada joven o líder elige a un adulto mayor de la congregación.', 'Lo llama o lo visita durante la semana.', 'Pregunta si necesita compras, trámites o compañía.'],
      ej: 'Cada domingo se asignan los contactos de la semana y el domingo siguiente se comparte cómo resultó.' },
    { id: 'compras', ic: '🛒', t: 'Compras y trámites para quien no puede', lema: 'Un par de manos para lo cotidiano.', ambito: 'grupo', cat: 'Adultos mayores y acompañar', unidad: 'encargos realizados',
      pasos: ['Se arma una lista de personas que lo desean, con su consentimiento.', 'Un voluntario las contacta cada semana.', 'Se anota lo realizado para no repetir ni olvidar.'],
      ej: 'Los viernes por la mañana, dos voluntarios hacen las compras de 5 personas de la congregación.' },
    { id: 'hospital', ic: '🏥', t: 'Visita a enfermos', lema: 'Estar presente cuando alguien atraviesa un momento difícil.', ambito: 'iglesia', cat: 'Adultos mayores y acompañar', unidad: 'visitas',
      pasos: ['El pastor o el líder informa a quién se puede visitar, con su consentimiento.', 'Se visita en parejas, en horarios de visita.', 'Se acompaña con una oración o una conversación breve.'],
      ej: 'Parejas de visita por turnos: cada una recibe un nombre y un horario, y avisa al líder cuando termina.' },
    { id: 'vigilia', ic: '🕯️', t: 'Cadena de oración', lema: 'Sostener juntos una necesidad con constancia.', ambito: 'iglesia', cat: 'Adultos mayores y acompañar', unidad: 'horas de oración',
      pasos: ['Se define la necesidad (con el permiso de quien la presenta).', 'Se reparten horas del día entre los participantes.', 'Se avisa cuando hay novedades.'],
      ej: 'Durante 7 días, cada persona toma una hora y la anota en una lista compartida del grupo.' },
    { id: 'plaza', ic: '🌳', t: 'Cuidar nuestro templo y su plaza', lema: 'Cuidar un lugar de todos es decir «esto es nuestro».', ambito: 'iglesia', cat: 'Cuidado del entorno', unidad: 'jornadas',
      pasos: ['Un sábado por la mañana, con guantes y bolsas.', 'Se riegan y plantan plantas del entorno.', 'Se invita a un vecino que nunca ha venido.'],
      ej: 'Sábado de 9:00 a 12:00; cada familia lleva una herramienta y se comparte un desayuno al final.' },
    { id: 'huerta', ic: '🥬', t: 'Huerta de la iglesia', lema: 'Lo que se cosecha entre varios sabe mejor.', ambito: 'iglesia', cat: 'Cuidado del entorno', unidad: 'familias participando',
      pasos: ['Se elige un rincón del terreno y un día fijo para regar.', 'Cada familia trae semillas, herramientas o sus manos.', 'Lo cosechado se reparte con quien lo necesite.'],
      ej: 'Se arman 6 camas de cultivo en primavera; cada familia cuida una por un mes.' },
    { id: 'reciclaje', ic: '♻️', t: 'Reciclaje de la iglesia', lema: 'Pequeños hábitos que cuidan lo que se nos confió.', ambito: 'iglesia', cat: 'Cuidado del entorno', unidad: 'kilos reciclados',
      pasos: ['Se instalan contenedores rotulados.', 'Un equipo los lleva al punto de reciclaje.', 'Lo obtenido, si lo hay, se destina a una necesidad acordada.'],
      ej: 'Contenedores de cartón, plástico y vidrio a la salida del templo; se llevan al punto limpio cada dos semanas.' },
    { id: 'jornada', ic: '🩺', t: 'Jornada de salud con profesionales de la congregación', lema: 'Orientación y controles básicos a cargo de quienes saben.', ambito: 'iglesia', cat: 'Salud', unidad: 'personas atendidas',
      pasos: ['Se invita a profesionales de la salud de la propia iglesia.', 'Se coordinan permisos y el espacio con la autoridad correspondiente.', 'Se atiende con orden y respetando la privacidad.'],
      ej: 'Un sábado de mañana con 3 profesionales voluntarios, un espacio ventilado y turnos de atención.' },
    { id: 'taller', ic: '🧶', t: 'Taller de oficios', lema: 'Aprender y enseñar tejido, costura, cocina u otros oficios.', ambito: 'grupo', cat: 'Alimentos y ropa', unidad: 'talleres',
      pasos: ['Se identifican personas que dominan un oficio.', 'Se define un horario fijo y un cupo.', 'Lo elaborado puede donarse a quien lo necesite.'],
      ej: 'Jueves a las 15:00: taller de tejido; las bufandas terminadas se entregan en invierno.' },
    { id: 'hermanas', ic: '🤝', t: 'Iglesias hermanas', lema: 'Una causa compartida une más que cualquier diferencia.', ambito: 'iglesias', cat: 'Entre iglesias', unidad: 'iglesias participando',
      pasos: ['Cada pastor conversa la idea con su congregación.', 'Se acuerda un día y un lugar para trabajar juntos.', 'Se reparte el trabajo y se agradece al final.'],
      ej: 'Tres iglesias del sector preparan juntas una olla común un sábado, cada una aporta voluntarios e insumos.' }
  ];
  const RECETA = [['👀', 'Mira', 'Escoge un problema real que veas cerca, uno solo.'], ['🤝', 'Une', 'Invita a 3 personas. Un movimiento es de muchos o no es movimiento.'], ['⚡', 'Empieza', 'Da un primer paso en 72 horas. Lo pequeño que empieza gana.'], ['📏', 'Mide', 'Ponle un número: platos, personas, abrigos, horas.'], ['🎉', 'Celebra', 'Cuenta lo logrado para que otros se animen.']];
  const REGLAS = ['Nunca publiques nombres, fotos ni direcciones de personas sin su permiso.', 'No se maneja dinero en la app: se piden tiempo, cosas o ayuda, y se rinde cuentas.', 'Ayuda con dignidad: pregunta qué necesita la persona, no decidas por ella.', 'Respeta a tu congregación: tu pastor y tus líderes guían. Si surge un problema, se conversa dentro de la iglesia.'];

  const est = () => { const e = leer(K_J, null); return e && typeof e === 'object' ? { unidos: e.unidos || {}, mios: e.mios || [], total: e.total || 0 } : { unidos: {}, mios: [], total: 0 }; };
  const salvar = (e) => guardar(K_J, e);
  const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a * 100 / Math.max(1, b))));
  const barra = (v, m, cl) => `<div class="tbj-bar ${cl || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${m}" aria-valuenow="${Math.min(v, m)}"><i data-w="${pct(v, m)}"></i></div>`;
  const aplicarAnchos = (r) => { $$('.tbj-bar i[data-w]', r).forEach((i) => { setTimeout(() => { i.style.setProperty('--w', i.dataset.w + '%'); }, calma() ? 0 : 60); }); };
  const invitacion = (t, lema, meta, unidad, cuando) => `🌍 ${t}\n${lema}\nMeta: ${meta} ${unidad}.${cuando ? '\n' + cuando : ''}\n¿Te sumas? Yo ya empecé. Lo hacemos juntos con la app Tierra Buena: ${location.origin}${location.pathname}\n#JuntosHacemosElBien`;
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
    caja.innerHTML = `<div class="card tbj-voto"><p class="tbj-vq"><b>¿Qué haremos juntos este mes?</b><small>Elige la idea que más te gustaría que tu iglesia impulsara. Es tu voto personal.</small></p>
      ${ops.map((m) => `<button type="button" class="tbj-op${voto === m.id ? ' on' : ''}" data-v="${m.id}" ${voto ? 'disabled' : ''}><span class="tbj-op-ic" aria-hidden="true">${m.ic}</span><span class="tbj-op-tx"><b>${esc(m.t)}</b><small>${esc(m.lema)}</small></span></button>`).join('')}
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
    pant.innerHTML = `<button type="button" class="volver" id="tbjVolver">‹ Vida</button>
      <section class="tbj-hero"><span class="tbj-h-a" aria-hidden="true"></span><span class="tbj-h-b" aria-hidden="true"></span>
        <p class="tbj-sello">Movimientos de Tierra Buena</p><h1>Juntos hacemos el bien</h1>
        <p class="tbj-lema">Aquí la Palabra se vuelve acción. Arma un movimiento con tu iglesia, mira cómo crece e invita a tu congregación.</p>
        <div class="tbj-huella"><span><b data-n="${aportes}">${aportes}</b><small>pasos míos</small></span><span><b data-n="${sumados}">${sumados}</b><small>movimientos</small></span></div></section>
      ${recordHTML()}<h2 class="sep">Mis movimientos</h2><div id="tbjMios"></div>
      <div class="tbj-nuevo"><button type="button" class="btn" id="tbjNuevo">＋ Armar un movimiento con mi iglesia</button></div>
      <h2 class="sep">Ideas para tu iglesia <small class="tbj-ejtag">toca una para armarla</small></h2><div id="tbjLista" class="tbj-lista"></div>
      <h2 class="sep">La receta de un movimiento</h2>
      <ol class="tbj-receta">${RECETA.map((r, i) => `<li><span class="tbj-n" aria-hidden="true">${r[0]}</span><span><b>${i + 1}. ${r[1]}</b><small>${r[2]}</small></span></li>`).join('')}</ol>
      <div class="card tbj-reglas"><div class="t"><span aria-hidden="true">🛡️</span>Reglas del bien</div><ul>${REGLAS.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
    $('#tbjVolver').onclick = () => { snd('vuelve'); if (ap.ir) ap.ir('vida'); };
    pintarMios(); pintarLista(); pintarVoto(); pintarMuro(); aplicarAnchos(pant);
    $('#tbjNuevo').onclick = () => { snd('abre'); formulario(); };
    try { window.scrollTo(0, 0); } catch (x) { /* nada */ }
  }

  function pintarLista() {
    const cont = $('#tbjLista'); if (!cont) return;
    const ver = MOV.filter((m) => !filtroCat || m.cat === filtroCat);
    cont.innerHTML = `<div class="tbj-chips" role="group" aria-label="Filtrar ideas">${['Todas'].concat(CATS).map((c) => { const on = (c === 'Todas' && !filtroCat) || c === filtroCat; return `<button type="button" class="tbj-chip${on ? ' on' : ''}" data-c="${c === 'Todas' ? '' : esc(c)}" aria-pressed="${on}">${esc(c)}</button>`; }).join('')}</div>` + ver.map((m) => `<article class="tbj-mov" data-id="${m.id}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${m.ic}</span><div><b>${esc(m.t)}</b><small>${esc(AMBITOS[m.ambito])} · ${esc(m.cat)}</small></div></div>
        <p class="tbj-mov-lema">${esc(m.lema)}</p>
        <details class="tbj-pasos"><summary>Cómo se puede hacer</summary><ul>${m.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="tbj-ej"><b>Ejemplo:</b> ${esc(m.ej)}</p></details>
        <div class="tbj-acc"><button type="button" class="btn tbj-armar" data-id="${m.id}">Armarlo en mi iglesia</button></div></article>`).join('');
    $$('.tbj-chip', cont).forEach((b) => { b.onclick = () => { filtroCat = b.dataset.c; snd('suave'); pintarLista(); }; });
    $$('.tbj-armar', cont).forEach((b) => { b.onclick = () => { const m = MOV.find((z) => z.id === b.dataset.id); snd('armar'); formulario(m); }; });
  }

  function pintarMios() {
    const e = est(), cont = $('#tbjMios'); if (!cont) return;
    if (!e.mios.length) { cont.innerHTML = '<div class="card tbj-vacio"><p class="m0">🌱</p><p class="suave m0t">Aún no has iniciado ninguno. Cuando inicies uno, aquí verás su avance y podrás invitar a otros.</p></div>'; return; }
    cont.innerHTML = e.mios.map((m) => `<article class="tbj-mov mio${m.ok ? ' cumplido' : ''}" data-id="${m.id}"><div class="tbj-mov-cab"><span class="tbj-mov-ic" aria-hidden="true">${m.ok ? '🏆' : '🌱'}</span><div><b>${esc(m.t)}</b><small>${esc(AMBITOS[m.ambito] || '')}${m.ok ? ' · ¡Cumplido!' : ''}</small></div></div>
      <p class="tbj-mov-lema">${esc(m.que)}</p>${barra(m.n || 0, m.meta)}<p class="tbj-mov-num"><b>${m.n || 0}</b> de ${m.meta} ${esc(m.unidad)}</p>
      <p class="tbj-primer"><b>Primer paso:</b> ${esc(m.paso)}</p>${m.fecha ? `<p class="tbj-primer"><b>Cuándo:</b> ${esc(cuandoTxt(m))}${m.lugar ? ` · <b>Dónde:</b> ${esc(m.lugar)}` : ''}</p>` : ''}${m.lider2 ? `<p class="tbj-primer"><b>Líderes:</b> ${esc(m.lider || 'Yo')} y ${esc(m.lider2)}${m.lider3 ? ', ' + esc(m.lider3) : ''}</p>` : ''}
      <div class="tbj-acc">${m.ok ? '' : `<button type="button" class="btn tbj-mas" data-id="${m.id}">+1 hecho</button>`}<button type="button" class="btn sec tbj-inv2" data-id="${m.id}">Invitar</button><button type="button" class="btn sec tbj-bor" data-id="${m.id}" aria-label="Borrar este movimiento">🗑</button></div></article>`).join('');
    $$('.tbj-mas', cont).forEach((b) => { b.onclick = () => { const x = est(), m = x.mios.find((z) => z.id === b.dataset.id); if (!m) return; m.n = (m.n || 0) + 1; x.total += 1; const cumplido = !m.ok && m.n >= m.meta; if (cumplido) m.ok = true; salvar(x); snd(cumplido ? 'logro' : 'semilla'); confeti(b.parentNode); setTimeout(abrir, calma() ? 0 : 500); }; });
    $$('.tbj-inv2', cont).forEach((b) => { b.onclick = () => { const m = est().mios.find((z) => z.id === b.dataset.id); if (m) { snd('suave'); compartir(invitacion(m.t, m.que, m.meta, m.unidad, m.fecha ? 'Cuándo: ' + cuandoTxt(m) + (m.lugar ? ' · Dónde: ' + m.lugar : '') : '')); } }; });
    $$('.tbj-bor', cont).forEach((b) => { b.onclick = () => { if (!confirm('¿Borrar este movimiento de tu teléfono?')) return; const x = est(); x.mios = x.mios.filter((z) => z.id !== b.dataset.id); salvar(x); abrir(); }; });
  }

  function formulario(idea) {
    idea = idea || {};
    const pant = $('#pantalla'), ap = A();
    pant.innerHTML = `<button type="button" class="volver" id="tbjAtras">‹ Juntos hacemos el bien</button>
      <section class="tbj-hero chico"><h1>Arma tu movimiento</h1><p class="tbj-lema">Unas preguntas cortas. Después invitas a tu congregación con un mensaje listo.</p></section>
      <label for="tbjT">1. ¿Cómo se llama? (corto y que inspire)</label><input id="tbjT" type="text" maxlength="60" value="${esc(idea.t || '')}" placeholder="Ej. Una olla para la congregación" autocomplete="off">
      <label for="tbjQ">2. ¿Qué problema real quieres mejorar?</label><textarea id="tbjQ" rows="2" maxlength="140" placeholder="Ej. Hay familias de la iglesia que no alcanzan a comer a fin de mes.">${esc(idea.lema || '')}</textarea>
      <label for="tbjA">3. ¿Quiénes pueden sumarse primero?</label><select id="tbjA">${Object.keys(AMBITOS).map((k) => `<option value="${k}"${k === (idea.ambito || 'iglesia') ? ' selected' : ''}>${AMBITOS[k]}</option>`).join('')}</select>
      <label for="tbjM">4. ¿Cuánto quieres lograr? (un número y qué mide)</label><div class="tbj-fila"><input id="tbjM" type="number" inputmode="numeric" min="1" max="100000" placeholder="50"><input id="tbjU" type="text" maxlength="30" value="${esc(idea.unidad || '')}" placeholder="platos, abrigos, horas…" autocomplete="off"></div>
      <label for="tbjP">5. ¿Cuál es el primer paso que darás en 72 horas?</label><textarea id="tbjP" rows="2" maxlength="140" placeholder="Ej. Preguntar a 3 familias si quieren aportar una verdura.">${esc((idea.pasos && idea.pasos[0]) || '')}</textarea>
      <label for="tbjF">6. ¿Cuándo es? (se recomienda 1 mes, para que todos se organicen y puedan asistir)</label><input id="tbjF" type="date" min="${hoyISO(1)}" value="${hoyISO(30)}"><p class="suave tbj-vnota" id="tbjFn" aria-live="polite">Se sugiere 1 mes de anticipación. Puedes elegir otra fecha si lo necesitas.</p>
      <label for="tbjL">7. ¿Dónde? (un lugar abierto o la propia iglesia)</label><input id="tbjL" type="text" maxlength="80" placeholder="Ej. Sala de la iglesia" autocomplete="off">
      <label for="tbjL1">8. ¿Quién lidera, y quién lo reemplaza si falta?</label><div class="tbj-fila"><input id="tbjL1" type="text" maxlength="40" placeholder="Líder" autocomplete="off"><input id="tbjL2" type="text" maxlength="40" placeholder="2.º líder (obligatorio)" autocomplete="off"></div><input id="tbjL3" type="text" maxlength="40" placeholder="3.er líder (opcional)" autocomplete="off">
      <div class="card tbj-reglas"><div class="t"><span aria-hidden="true">🛡️</span>Me comprometo a</div><ul class="tbj-comp"><li><label><input type="checkbox" class="tbjC"> Cuidar la dignidad de quien reciba ayuda: sin nombres, rostros ni datos publicados.</label></li><li><label><input type="checkbox" class="tbjC"> Respetar a mi congregación y a mi pastor; lo que surja se conversa dentro de la iglesia.</label></li><li><label><input type="checkbox" class="tbjC"> No manejar dinero por la app y tener los permisos al día si el lugar los pide.</label></li></ul></div>
      <p id="tbjErr" class="error" role="alert" hidden></p><button type="button" class="btn" id="tbjCrear">Crear mi movimiento</button>`;
    $('#tbjAtras').onclick = () => { snd('vuelve'); abrir(); };
    $('#tbjF').oninput = () => { const v = $('#tbjF').value, n = $('#tbjFn'); n.textContent = v && v < hoyISO(30) ? 'Es menos de 1 mes. Es posible que algunas personas no alcancen a organizarse; avisa con tiempo.' : 'Se sugiere 1 mes de anticipación. Puedes elegir otra fecha si lo necesitas.'; };
    $('#tbjCrear').onclick = () => {
      const t = $('#tbjT').value.trim().replace(/\s+/g, ' '), que = $('#tbjQ').value.trim(), meta = Math.floor(Number($('#tbjM').value)), unidad = $('#tbjU').value.trim() || 'pasos', paso = $('#tbjP').value.trim();
      const er = (m) => { const x = $('#tbjErr'); x.textContent = m; x.hidden = false; snd('error'); };
      if (t.length < 3) return er('Ponle un nombre de al menos 3 letras.');
      if (que.length < 8) return er('Cuéntanos en una frase qué problema quieres mejorar.');
      if (!(meta >= 1 && meta <= 100000)) return er('Ponle una meta con número (por ejemplo, 50).');
      if (paso.length < 5) return er('Escribe el primer paso que darás.');
      const fecha = $('#tbjF').value, lugar = $('#tbjL').value.trim(), l1 = $('#tbjL1').value.trim(), l2 = $('#tbjL2').value.trim(), l3 = $('#tbjL3').value.trim();
      if (!fecha || fecha < hoyISO(1)) return er('Elige una fecha a partir de mañana.');
      if (lugar.length < 3) return er('Escribe dónde será.');
      if (l2.length < 2) return er('Hace falta un 2.º líder, por si el líder no puede ir.');
      if ($$('.tbjC').some((c) => !c.checked)) return er('Marca los tres compromisos para continuar.');
      const x = est(); x.mios.unshift({ id: 'm' + Date.now().toString(36), t: t.slice(0, 60), que: que.slice(0, 140), ambito: $('#tbjA').value, meta, unidad: unidad.slice(0, 30), paso: paso.slice(0, 140), fecha, lugar: lugar.slice(0, 80), lider: l1.slice(0, 40), lider2: l2.slice(0, 40), lider3: l3.slice(0, 40), comp: true, n: 0, creado: new Date().toISOString() });
      x.mios = x.mios.slice(0, 20); salvar(x); snd('juntos', 5); abrir();
      setTimeout(() => aviso('¡Listo! Toca «Invitar» para avisar a tu congregación.'), 200);
    };
    try { window.scrollTo(0, 0); $('#tbjT').focus(); } catch (x) { /* nada */ }
  }
  // F920 · CALENDARIO Y AVISOS DENTRO DE LA APP. Los movimientos con fecha se ven en la Agenda y el Calendario, y avisan a 30, 14, 7, 3 y 1 día y el mismo día.
  const diasPara = (m) => Math.round((new Date(m.fecha + 'T12:00:00') - new Date(new Date().toDateString() + ' 12:00:00')) / DIA);
  function proximos() { try { return est().mios.filter((m) => m.fecha && !m.ok && diasPara(m) >= 0).sort((a, b) => a.fecha < b.fecha ? -1 : 1).map((m) => ({ m, d: diasPara(m) })); } catch (e) { return []; } }
  const frase = (x) => (x.d === 0 ? 'Hoy' : x.d === 1 ? 'Mañana' : 'En ' + x.d + ' días') + ': «' + x.m.t + '»' + (x.m.lugar ? ' · ' + x.m.lugar : '');
  function recordHTML() { try { return window.TBFechas ? window.TBFechas.recordHTML() : ''; } catch (e) { return ''; } }
  function listaHTML() { const l = proximos(); if (!l.length) return ''; return l.map((x) => '<div class="fila cal-fila"><span class="fila-ico t2" aria-hidden="true">🌱</span><span class="fila-txt"><b>' + esc(x.m.t) + '</b><small>' + esc(cuandoTxt(x.m)) + (x.m.lugar ? ' · ' + esc(x.m.lugar) : '') + '</small></span></div>').join(''); }
  window.TBJuntos = { abrir, proximos, listaHTML };
})();
