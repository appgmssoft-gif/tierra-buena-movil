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
      { ic: '🙏', t: 'Pedir oración con discreción', quien: 'Marcela, 34 años, madre soltera', escena: 'Hace dos semanas le recortaron las horas en el trabajo. Prefirió no contarlo en el grupo y quiso compartirlo solo con su pastor, con confianza y en privado.',
        pasos: ['Abrió «Pedir oración» y eligió «Solo mi pastor».', 'Marcó «Ocultar mi nombre» para cuidar su privacidad y escribió la petición con sus palabras.', 'Volvió a ver «Mis peticiones» para saber si ya la habían leído.'],
        res: 'Su pastor oró por ella y le escribió esa misma semana. Su nombre se mantuvo en reserva.', tab: 'iglesia', di: 'oracion', btn: 'Pedir oración' },
      { ic: '🤝', t: 'Pedir una visita cuando cuesta salir', quien: 'Don Hernán, 78 años', escena: 'Después de la operación de cadera ya no puede ir a la iglesia. Su nieta le configuró la app.',
        pasos: ['Su nieta abrió «Pedir visita» y eligió «Acompañamiento».', 'Puso dos horarios que le acomodan y marcó urgencia «Esta semana».', 'La dirección solo la ve el pastor cuando acepta la visita.'],
        res: 'El pastor aceptó, llegó el jueves con dos hermanos de la iglesia y le llevaron la comunión.', tab: 'iglesia', di: 'visita', btn: 'Pedir una visita' },
      { ic: '📅', t: 'No perderse nada de la semana', quien: 'Camila, 19 años, universitaria', escena: 'Siempre se enteraba tarde de los ensayos del grupo de alabanza.',
        pasos: ['Abrió «Agenda» y miró «Mis grupos».', 'Vio que el ensayo cambió de horario (el aviso del líder estaba en «Avisos»).', 'Pasó la fecha a su calendario del teléfono.'],
        res: 'Dejó de llegar tarde y pasó de «invitada» a segunda voz del grupo.', tab: 'iglesia', di: 'agenda', btn: 'Ver la agenda' },
      { ic: '🕍', t: 'Saber con quién hablar', quien: 'Rodrigo, 41 años, recién llegado', escena: 'Quería servir pero no sabía a quién preguntar ni qué grupos existían.',
        pasos: ['Abrió «Mis ministerios» y leyó quién lidera cada grupo.', 'Eligió el de jóvenes porque el líder tenía horario de sábado.', 'Le escribió al líder con un mensaje corto ya pensado.'],
        res: 'En un mes ya estaba a cargo de la música de la reunión de jóvenes.', tab: 'iglesia', di: 'ministerios', btn: 'Ver mis ministerios' },
      { ic: '🧱', t: 'Orar juntos por una petición real', quien: 'Familia Soto', escena: 'Cada noche leen una petición del Muro antes de dormir.',
        pasos: ['Abren el «Muro» con los niños.', 'Leen la petición que el pastor compartió (sin nombres si así se pidió).', 'Oran un minuto y la marcan como acompañada.'],
        res: 'Los niños aprendieron a orar por otros y una de las peticiones se respondió: la celebraron juntos.', tab: 'iglesia', di: 'muro', btn: 'Abrir el Muro' },
      { ic: '✨', t: 'Convertir la lectura en un paso', quien: 'Ignacio, 27 años', escena: 'Leía con constancia, pero quería que la lectura se notara en su día a día.',
        pasos: ['Terminó un capítulo y tocó «Hoy lo hago».', 'Eligió un paso de 5 minutos: llamar a su hermano con quien estaba distanciado.', 'Lo marcó «Lo intenté» (también cuenta).'],
        res: 'La llamada duró 20 minutos. A los 14 días tenía una racha y ya no se perdía la lectura.', tab: 'vida', di: 'hacer', btn: 'Probar «Hoy lo hago»' },
      { ic: '📖', t: 'Leer sin internet, de camino al trabajo', quien: 'Paulina, 52 años, viaja 2 horas al día', escena: 'En el metro casi no hay señal.',
        pasos: ['Abrió la Biblia una vez con internet en casa.', 'Los libros que lee quedan guardados para leer sin conexión.', 'Eligió un plan de lectura de 10 minutos y activó «Escuchar» para seguir con los ojos cerrados.'],
        res: 'Terminó el Evangelio de Marcos en tres semanas, todo en el metro.', tab: 'palabra', di: 'biblia', btn: 'Abrir la Biblia' },
      { ic: '🗓', t: 'Un plan que de verdad se cumple', quien: 'Matías, 30 años', escena: 'Había comenzado tres planes anuales y no logró sostenerlos más de dos semanas.',
        pasos: ['Cambió a un plan corto de 7 minutos diarios.', 'Eligió la hora de «después del café».', 'Miró su avance cada domingo.'],
        res: '90 días seguidos. «Lo pequeño que se repite le gana a lo grande que se abandona», dice.', tab: 'palabra', di: 'planes', btn: 'Ver los planes' },
      { ic: '📜', t: 'La fábula del mes en familia', quien: 'Los Ríos (papá, mamá y dos niños)', escena: 'Querían un momento sin pantallas los domingos.',
        pasos: ['Abren un capítulo de la «Fábula del mes» cada domingo.', 'Cada uno cuenta qué personaje le pareció más valiente.', 'Marcan la práctica de la semana (ej. «dar las gracias en voz alta»).'],
        res: 'Se volvió el rato favorito de la semana: hasta la abuela se conecta por videollamada.', tab: 'palabra', di: 'fabula', btn: 'Leer la fábula' },
      { ic: '🧠', t: 'Una pausa cuando todo pesa', quien: 'Daniela, 23 años', escena: 'La semana de exámenes no podía dormir y la cabeza no paraba.',
        pasos: ['Abrió «Salud mental» y probó la respiración guiada de 2 minutos.', 'Hizo el chequeo corto para ponerle nombre a lo que sentía.', 'Leyó «dónde pedir ayuda» y anotó el número de la línea de apoyo de su ciudad.'],
        res: 'Durmió esa noche. Al día siguiente le contó a su mamá cómo se sentía.', tab: 'vida', di: 'salud', btn: 'Abrir Salud mental' },
      { ic: '🎓', t: 'Aprender para servir mejor', quien: 'Berta, 46 años, ayudante en la olla común', escena: 'Quería aprender a manipular alimentos de forma segura para repartir comida.',
        pasos: ['Abrió «Aprender» y buscó un curso gratuito.', 'Fue marcando su avance clase por clase.', 'Compartió lo aprendido con el equipo de la olla.'],
        res: 'El equipo ahora tiene un protocolo de higiene sencillo, hecho por ellos mismos.', tab: 'vida', di: 'aprender', btn: 'Ver los cursos' },
      { ic: '💡', t: 'Del «¿y si…?» a un proyecto listo', quien: 'Jóvenes del sector Norte', escena: 'Querían ayudar a un asilo cercano pero no sabían por dónde empezar ni cuánto costaba.',
        pasos: ['Abrieron «Proyectos listos» y eligieron uno parecido.', 'Copiaron lugar, presupuesto y personas necesarias.', 'Lo adaptaron y lo presentaron a su pastor.'],
        res: 'Primera visita al mes siguiente: 12 jóvenes, onces y música para 30 personas mayores.', tab: 'vida', di: 'proyectos', btn: 'Ver proyectos listos' },
      { ic: '🌟', t: 'Vivir la acción del mes', quien: 'Sra. Gloria, 60 años', escena: 'El tema del mes era «Gratitud» y no sabía cómo vivirlo.',
        pasos: ['Abrió «Acción del mes» y leyó las formas de vivirla.', 'Agregó su propia acción: «Escribir una nota de gracias a alguien por semana».', 'Anotó cómo le fue al final del mes.'],
        res: 'Escribió cuatro notas. Una de ellas llegó a una vecina que estaba por mudarse.', tab: 'iglesia', di: 'accion', btn: 'Ver la acción del mes' },
      { ic: '🌍', t: 'Sumarse a un movimiento del barrio', quien: 'Felipe, 35 años', escena: 'Vio una publicación de «Abrigo para el invierno» y quiso aportar con lo que tenía.',
        pasos: ['Abrió «Juntos hacemos el bien» y tocó «Me sumo».', 'Reunió 3 abrigos de su familia y marcó «Hice mi parte».', 'Invitó a su equipo de fútbol con el mensaje listo.'],
        res: 'El equipo juntó 21 abrigos. Se sumaron sin pertenecer a ninguna iglesia.', tab: 'inicio', di: 'juntos', btn: 'Ver los movimientos' }
    ],
    pastor: [
      { ic: '👋', t: 'Recibir a quien llega, el mismo día', quien: 'Pastor Andrés, iglesia de 90 miembros', escena: 'Antes se enteraba de las visitas nuevas semanas después, por casualidad.',
        pasos: ['Abre «Solicitudes» cada mañana (la insignia le avisa cuántas hay).', 'Mira el nombre y la nota que dejó la persona.', 'Acepta, y le responde con un saludo personal.'],
        res: 'Pasó de un 20% a un 70% de personas nuevas que vuelven la semana siguiente.', tab: 'pastor', dp: 'sol', btn: 'Ver solicitudes' },
      { ic: '🙏', t: 'Orar por lo que realmente pasa', quien: 'Pastora Lorena', escena: 'Las peticiones se perdían en mensajes de WhatsApp sueltos.',
        pasos: ['Entra a «Oraciones» y las lee por tipo.', 'Responde a las más delicadas en privado.', 'Comparte en el Muro solo las que la persona autorizó.'],
        res: 'Cada petición tiene respuesta. La congregación ora más y comparte con más cuidado.', tab: 'pastor', dp: 'ora', btn: 'Ver oraciones' },
      { ic: '🤝', t: 'Organizar las visitas de la semana', quien: 'Pastor Elías', escena: 'Tenía 6 pedidos de visita y solo dos tardes libres.',
        pasos: ['En «Visitas» ordenó por urgencia.', 'Aceptó las urgentes y delegó dos a un líder de ministerio.', 'Dejó un mensaje breve a cada persona con el día acordado.'],
        res: 'Nadie esperó más de 4 días y su semana quedó ordenada.', tab: 'pastor', dp: 'vis', btn: 'Ver visitas' },
      { ic: '👥', t: 'Conocer a su gente de verdad', quien: 'Pastor Joaquín', escena: 'No lograba recordar quién llevaba un mes sin venir.',
        pasos: ['Abrió «Miembros» y revisó quiénes se unieron hace poco.', 'Marcó a quién llamar el sábado.', 'Anotó cómo se sentía cada persona para orar mejor.'],
        res: 'Recuperó el contacto con 5 familias en un mes.', tab: 'pastor', dp: 'mie', btn: 'Ver miembros' },
      { ic: '🕍', t: 'Repartir el servicio, no cargarlo solo', quien: 'Pastora Rosa', escena: 'Hacía todo ella y estaba agotada.',
        pasos: ['Creó los ministerios en «Ministerios y líderes».', 'Nombró un líder por grupo y le dio un integrante de apoyo.', 'Pidió a cada líder un aviso mensual para su grupo.'],
        res: 'Ahora el 40% de la iglesia sirve en algo. Ella volvió a predicar con calma.', tab: 'pastor', dp: 'min', btn: 'Ver ministerios' },
      { ic: '📅', t: 'Una agenda que todos ven', quien: 'Pastor Samuel', escena: 'Las reuniones se cruzaban y cada grupo tenía su propio chat.',
        pasos: ['Cargó todas las actividades del mes en «Agenda».', 'Marcó cuáles son para todos y cuáles para un grupo.', 'Revisó cruces antes de publicar.'],
        res: 'Se acabaron los «¿a qué hora era?» de los domingos.', tab: 'pastor', dp: 'age', btn: 'Abrir la agenda' },
      { ic: '📣', t: 'Un aviso que sí se lee', quien: 'Pastor Tomás', escena: 'Sus avisos de 12 líneas por chat nadie los leía.',
        pasos: ['Escribió el aviso en 3 líneas con un solo pedido.', 'Lo envió solo al ministerio de jóvenes.', 'Puso la fecha y el lugar al comienzo.'],
        res: 'Subió la asistencia a la actividad de 8 a 31 personas.', tab: 'pastor', dp: 'avi', btn: 'Escribir un aviso' },
      { ic: '⚙️', t: 'El código de tu iglesia, bien cuidado', quien: 'Pastora Carolina', escena: 'Alguien externo se enteró del código y pidió unirse.',
        pasos: ['Revisó «Solicitudes» y no aceptó a quien no conocía.', 'Fue a «Datos y código» a revisar el nombre y eslogan de la iglesia.', 'Compartió el código solo en el culto y por mensaje directo.'],
        res: 'Aprendió que aceptar es una decisión suya: el código solo abre la puerta, no entra nadie sin su permiso.', tab: 'pastor', dp: 'dat', btn: 'Ver datos y código' },
      { ic: '🌟', t: 'Vivir juntos la acción del mes', quien: 'Pastor Mario', escena: 'Quería que toda la congregación hiciera algo concreto cada mes.',
        pasos: ['Leyó el tema del mes y lo anunció el domingo.', 'Pidió que cada hogar escogiera una de las «formas de vivirla».', 'El domingo siguiente pidió a dos personas contar cómo les fue.'],
        res: 'La predicación y la vida de la semana empezaron a hablar del mismo tema.', tab: 'iglesia', di: 'accion', btn: 'Ver la acción del mes' },
      { ic: '🌍', t: 'Liderar un movimiento con el barrio', quien: 'Pastor Daniel', escena: 'Su iglesia está rodeada de vecinos que nunca han entrado.',
        pasos: ['Abrió «Juntos hacemos el bien» y creó «Una olla, un barrio».', 'Invitó a otras dos iglesias y a la junta de vecinos con el mensaje listo.', 'Midió cuántos platos se entregaron cada sábado.'],
        res: 'En tres meses: 340 platos y 4 familias nuevas pidieron visita por confianza, no por promoción.', tab: 'inicio', di: 'juntos', btn: 'Iniciar un movimiento' },
      { ic: '🛡️', t: 'Cuidar la privacidad de su gente', quien: 'Pastor Ricardo', escena: 'Una familia le pidió que su situación no se supiera.',
        pasos: ['Respondió la petición en privado, sin compartirla en el Muro.', 'Explicó a quienes preguntan qué ve el pastor y qué no (está en «Mi privacidad»).', 'Nunca puso nombres completos en un aviso.'],
        res: 'La confianza subió: la gente pide más porque sabe que se cuida lo que cuenta.', tab: 'pastor', dp: 'ora', btn: 'Ver oraciones' }
    ]
  };

  // Carrusel de tarjetas (F902): se desliza con el dedo, tiene flechas, puntos y pausa. Sin animación continua: solo avanza una tarjeta cada 14 s mientras se ve en pantalla.
  function pintarEjemplos(caja, rol) {
    if (!caja) return;
    let actual = rol === 'pastor' ? 'pastor' : 'miembro';
    let reloj = 0, obs = null;
    const parar = () => { if (reloj) { clearInterval(reloj); reloj = 0; } };
    const dibuja = () => {
      parar(); if (obs) { try { obs.disconnect(); } catch (e) { /* sin observador */ } obs = null; }
      const L = EJ[actual]; let idx = 0, auto = !calma();
      caja.innerHTML = `<div class="tbej" data-rol="${actual}">
        <div class="tbej-cab"><span class="tbej-ic" aria-hidden="true">${actual === 'pastor' ? '🛡️' : '🌱'}</span><div><b>${actual === 'pastor' ? 'Cómo cuida mejor a su iglesia un pastor' : 'Cómo aprovecha la app un miembro'}</b><small>Historias de ejemplo, inventadas pero muy reales. Desliza para verlas y toca una para probarla.</small></div></div>
        ${rol === 'ambos' ? `<div class="tbej-seg" role="tablist" aria-label="Ver ejemplos para"><button type="button" role="tab" data-r="miembro" aria-selected="${actual === 'miembro'}">Soy miembro</button><button type="button" role="tab" data-r="pastor" aria-selected="${actual === 'pastor'}">Soy pastor</button></div>` : ''}
        <div class="tbej-car" role="region" aria-roledescription="carrusel" aria-label="Ejemplos de la vida real" tabindex="0">${L.map((e, i) => `<article class="tbej-card" data-i="${i}" data-hu="${(i * 37) % 360}" aria-label="${i + 1} de ${L.length}">
          <div class="tbej-arte" aria-hidden="true"><span class="tbej-big">${e.ic}</span><i class="tbej-hoja a"></i><i class="tbej-hoja b"></i></div>
          <div class="tbej-txt"><span class="tbej-fic">Ejemplo ficticio</span><h3>${esc(e.t)}</h3><p class="tbej-q">${esc(e.quien)}</p><p class="tbej-esc">${esc(e.escena)}</p><p class="tbej-h">Qué hizo en la app</p><ol>${e.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol><p class="tbej-res"><b>Resultado:</b> ${esc(e.res)}</p><button type="button" class="tbej-go" data-i="${i}">${esc(e.btn)} ›</button></div></article>`).join('')}</div>
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
    const pastor = $('.tab[data-tab="pastor"]'); const hayPastor = pastor && !pastor.hidden;
    if (e.tab === 'pastor' && !hayPastor) return aviso('Esto se abre cuando entras como pastor: toca «Soy pastor» arriba.');
    if (!ap.ir) return;
    ap.ir(e.tab);
    setTimeout(() => { if (!clic()) aviso(e.tab === 'iglesia' ? 'Esto se abre cuando tu pastor te acepta en su iglesia: toca «Mi código».' : 'Aún no se puede abrir desde aquí.'); }, 60);
  }
  window.TBEjemplos = { pintar: pintarEjemplos, datos: EJ };

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
    $('#tbjVolver').onclick = () => { snd('vuelve'); if (ap.ir) ap.ir('inicio'); };
    pintarMios(); pintarLista(); aplicarAnchos(pant);
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
