/* F1357 · Centro de configuración de la iglesia, primeras 5 áreas (tarea 1.10 del PLAN_TAREAS_IGLESIA.md).
   Cada iglesia elige cómo trabajar. Toda opción trae un valor por defecto que funciona sin tocar nada.
   Se guarda en la clave «config_iglesia» de config_pastor_guardar (SQL 26 ya corrido): no hace falta SQL nuevo.
   El guardado fusiona por clave de primer nivel, así que siempre se envía «config_iglesia» completa (leída + el área editada)
   para no borrar las otras áreas. Las demás claves de la configuración (p. ej. tarjeta_pastor) no se tocan. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);

  // Esquema: área → campos. «def» es el valor por defecto. Lenguaje simple, sin jerga.
  const ESQUEMA = [
    { k: 'iglesia', ico: '⛪', t: 'Tu iglesia', d: 'Cómo suenan los mensajes que envía la app', campos: [
      { k: 'tono', r: 'Tono', t: 'Tono de los mensajes', ayuda: 'Cómo hablan los avisos que la app envía a nombre de tu iglesia.', op: [['cercano', 'Cercano'], ['formal', 'Formal']], def: 'cercano' },
      { k: 'firma', r: 'Firma', t: 'Firma de los avisos', ayuda: 'Una línea al final de cada aviso. Ej.: Pastor Juan y equipo.', max: 40, def: '' }] },
    { k: 'culto', ico: '🕯️', t: 'Culto y servicios', d: 'Cuántos servicios hay y cómo se confirman los turnos', campos: [
      { k: 'servicios', r: 'Servicios por semana', t: 'Servicios por semana', ayuda: 'Cuántas veces se reúne la iglesia en la semana.', op: [['1', '1'], ['2', '2'], ['3', '3 o más']], def: '1' },
      { k: 'confirmar', r: 'Confirmación', t: 'Confirmar el turno', ayuda: 'Quien tiene un turno (música, recepción, etc.) puede avisar si va a poder.', op: [['obligatoria', 'Obligatoria'], ['opcional', 'Opcional'], ['aviso', 'Solo aviso']], def: 'opcional' },
      { k: 'plazo', r: 'Plazo', t: 'Plazo para confirmar', ayuda: 'Cuántas horas antes del servicio se pide la respuesta.', op: [['24', '24 horas'], ['48', '48 horas'], ['72', '72 horas']], def: '48' }] },
    { k: 'grupos', ico: '🕍', t: 'Grupos y ministerios', d: 'Quién puede crear grupos', campos: [
      { k: 'crea', r: 'Crean grupos', t: 'Quién puede crear grupos', ayuda: 'Un grupo puede ser un ministerio, una célula o un equipo.', op: [['pastor', 'Solo el pastor'], ['lideres', 'Pastor y líderes']], def: 'pastor' }] },
    { k: 'cursos', ico: '🎓', t: 'Cursos y formación', d: 'Nota para aprobar y repeticiones del examen', campos: [
      { k: 'nota', r: 'Nota mínima', t: 'Nota mínima para aprobar', ayuda: 'Porcentaje de respuestas correctas que se pide.', op: [['60', '60 %'], ['70', '70 %'], ['80', '80 %']], def: '70' },
      { k: 'repite', r: 'Repeticiones', t: 'Veces que se puede repetir el examen', ayuda: 'Cuántas oportunidades tiene cada persona.', op: [['1', '1'], ['2', '2'], ['3', '3'], ['0', 'Sin límite']], def: '3' }] },
    { k: 'metas', ico: '🎯', t: 'Metas de líderes', d: 'Cada cuánto se revisan y qué ve el pastor', campos: [
      { k: 'periodo', r: 'Revisión', t: 'Cada cuánto se revisan', ayuda: 'El tiempo que dura cada ronda de metas.', op: [['semanal', 'Cada semana'], ['quincenal', 'Cada 2 semanas'], ['mensual', 'Cada mes']], def: 'mensual' },
      { k: 'notas', r: 'El pastor ve', t: 'Qué ve el pastor', ayuda: 'Las notas son lo que el líder escribe con sus palabras.', op: [['todo', 'Notas y resultados'], ['resultados', 'Solo resultados']], def: 'todo' }] },
    { k: 'temas', ico: '📖', t: 'Tema de estudio del mes', d: 'El tema que la iglesia estudia este mes (se cambia cada mes)', campos: [
      { k: 'tema', r: 'Tema', t: 'Tema del mes', ayuda: 'Ej.: La oración en familia. Déjalo vacío si no hay tema este mes.', max: 80, def: '' },
      { k: 'pasaje', r: 'Pasaje', t: 'Pasaje para leer', ayuda: 'Ej.: Mateo 6:5-15. Se muestra junto al tema.', max: 60, def: '' },
      { k: 'responsable', r: 'Responsable', t: 'Quién lo guía', ayuda: 'Nombre de la persona que guía el estudio.', max: 40, def: '' },
      { k: 'mostrar', r: 'Mostrar', t: 'Mostrar a los miembros', ayuda: 'Si dices Sí, el tema aparece en la pantalla de los miembros.', op: [['si', 'Sí'], ['no', 'No']], def: 'no' }] },
  ];

  const area = (k) => ESQUEMA.find((a) => a.k === k);

  // Valor de un campo: el guardado si es válido; si no, el valor por defecto.
  function valorDe(campo, v) {
    if (campo.op) return campo.op.some((o) => o[0] === v) ? v : campo.def;
    const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, campo.max || 0);
    return s || campo.def;
  }
  // Devuelve los valores completos de un área (con defectos). Nunca falla con datos raros.
  function valoresArea(a, guardado) {
    const g = guardado && typeof guardado === 'object' && !Array.isArray(guardado) ? guardado : {};
    const o = {}; a.campos.forEach((c) => { o[c.k] = valorDe(c, g[c.k]); }); return o;
  }
  // Toda la configuración normalizada (solo las áreas conocidas).
  function normalizar(cfg) {
    const g = cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
    const o = {}; ESQUEMA.forEach((a) => { o[a.k] = valoresArea(a, g[a.k]); }); return o;
  }
  function etiqueta(c, v) { const o = c.op && c.op.find((x) => x[0] === v); return o ? o[1] : v; }
  function resumen(a, vals) {
    return a.campos.filter((c) => c.op || vals[c.k]).map((c) => (esc(c.r) + ': ' + esc(etiqueta(c, vals[c.k]))).replace(/ /g, '&nbsp;')).join(' · ');
  }

  function cabecera(volverId, texto) { return '<button type="button" class="volver" id="' + volverId + '">‹ ' + texto + '</button>'; }

  function hubHTML(cfg) {
    const n = normalizar(cfg);
    return cabecera('cfgVolver', 'Panel') + '<h1 class="cp-titulo">Configuración de tu iglesia</h1>' +
      '<p class="suave">Elige cómo trabaja tu iglesia. Todo ya viene listo: solo cambia lo que quieras.</p>' +
      '<div class="cfg-lista">' + ESQUEMA.map((a, i) => '<button type="button" class="cp-fila cfg-fila" data-cfg="' + a.k + '" style="--i:' + i + '">' +
        '<span class="cp-ico" aria-hidden="true">' + a.ico + '</span><span class="cp-fila-t"><b>' + esc(a.t) + '</b><small>' + esc(a.d) + '</small>' +
        '<small class="cfg-res">' + resumen(a, n[a.k]) + '</small></span><span class="cp-ir" aria-hidden="true">›</span></button>').join('') + '</div>' +
      '<p class="suave cfg-nota">Tus elecciones quedan guardadas. Cada función de la app las irá usando a medida que se active.</p>';
  }

  function campoHTML(a, c, v) {
    const id = 'cfg_' + a.k + '_' + c.k;
    if (c.op) {
      return '<div class="cfg-campo"><span class="cfg-et" id="' + id + '_t">' + esc(c.t) + '</span><p class="suave cfg-ayuda">' + esc(c.ayuda) + '</p>' +
        '<div class="cp-filtros cfg-op" role="radiogroup" aria-labelledby="' + id + '_t" data-campo="' + c.k + '">' +
        c.op.map((o) => '<button type="button" role="radio" class="cp-chip' + (o[0] === v ? ' on' : '') + '" aria-checked="' + (o[0] === v) + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>').join('') + '</div></div>';
    }
    return '<div class="cfg-campo"><label class="cfg-et" for="' + id + '">' + esc(c.t) + '</label><p class="suave cfg-ayuda">' + esc(c.ayuda) + '</p>' +
      '<input id="' + id + '" type="text" maxlength="' + c.max + '" value="' + esc(v) + '" data-campo="' + c.k + '" autocomplete="off"></div>';
  }
  function areaHTML(a, vals) {
    return cabecera('cfgAtras', 'Configuración') + '<h1 class="cp-titulo">' + esc(a.ico) + ' ' + esc(a.t) + '</h1><p class="suave">' + esc(a.d) + '.</p>' +
      '<div class="card cfg-form">' + a.campos.map((c) => campoHTML(a, c, vals[c.k])).join('') +
      '<p id="cfgErr" class="error" role="alert" hidden></p>' +
      '<button type="button" class="btn" id="cfgGuardar">Guardar</button>' +
      '<button type="button" class="btn sec" id="cfgRestaurar">Volver a lo que viene por defecto</button>' +
      '<p id="cfgMsg" class="suave" role="status" aria-live="polite"></p></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = cabecera('cfgVolver', 'Panel') + '<h1 class="cp-titulo">Configuración de tu iglesia</h1><p class="suave">Cargando…</p>';
    $('#cfgVolver').onclick = ctx.volver;
    const r = await ctx.rpc('config_pastor_leer', p);
    if (!r.ok || r.data == null || typeof r.data !== 'object') {
      pant.innerHTML = cabecera('cfgVolver', 'Panel') + '<h1 class="cp-titulo">Configuración de tu iglesia</h1>' +
        '<p class="error" role="alert">No pudimos cargar la configuración. Revisa tu conexión e inténtalo de nuevo.</p><button type="button" class="btn sec" id="cfgReintentar">Reintentar</button>';
      $('#cfgVolver').onclick = ctx.volver; $('#cfgReintentar').onclick = () => abrir(p, ctx);
      return;
    }
    let cfg = normalizar(r.data.config_iglesia);
    const hub = () => {
      pant.innerHTML = hubHTML(cfg); $('#cfgVolver').onclick = ctx.volver;
      document.querySelectorAll('[data-cfg]').forEach((b) => { b.onclick = () => editar(b.getAttribute('data-cfg')); });
    };
    // «ini» son los valores que se muestran; solo cambia «cfg» (lo guardado) cuando el guardado resulta bien.
    const editar = (k, ini) => {
      const a = area(k); if (!a) return hub();
      const parte = ini || cfg[k];
      pant.innerHTML = areaHTML(a, parte); $('#cfgAtras').onclick = hub;
      const sel = {}; a.campos.forEach((c) => { sel[c.k] = parte[c.k]; });
      document.querySelectorAll('.cfg-op').forEach((g) => {
        const campo = g.getAttribute('data-campo');
        g.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => {
          sel[campo] = b.getAttribute('data-v'); $('#cfgMsg').textContent = '';
          g.querySelectorAll('[data-v]').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
        }; });
      });
      document.querySelectorAll('input[data-campo]').forEach((i) => i.addEventListener('input', () => { sel[i.getAttribute('data-campo')] = i.value; $('#cfgMsg').textContent = ''; }));
      $('#cfgRestaurar').onclick = () => { const d = {}; a.campos.forEach((c) => { d[c.k] = c.def; }); editar(k, d); $('#cfgMsg').textContent = 'Ya está lo que viene por defecto. Toca Guardar para confirmar.'; };
      $('#cfgGuardar').onclick = async () => {
        const btn = $('#cfgGuardar'), er = $('#cfgErr'); er.hidden = true; btn.disabled = true;
        const nuevo = Object.assign({}, cfg, { [k]: valoresArea(a, sel) });
        const g = await ctx.rpc('config_pastor_guardar', p, { p_config: { config_iglesia: nuevo } });
        btn.disabled = false;
        const fila = Array.isArray(g.data) ? g.data[0] : g.data;
        if (g.ok && fila && fila.ok) { cfg = nuevo; $('#cfgMsg').textContent = 'Guardado.'; }
        else { er.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'; er.hidden = false; }
      };
    };
    hub();
  }

  window.TBConfigIglesia = { abrir, _t: { ESQUEMA, normalizar, valoresArea, valorDe, hubHTML, areaHTML } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBConfigIglesia;
})();
