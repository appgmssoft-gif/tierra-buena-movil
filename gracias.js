/* F1409 · Gracias entre miembros (tarea 2.13), lado del miembro, dentro de «Mi servicio».
   Elegir a una persona del directorio (solo quienes lo permitieron), escribir la gracia (300 letras),
   decidir si es pública o privada, y ver las gracias públicas y las privadas que envió o recibió.
   Usa SQL 60 (miembro_gracia_enviar, miembro_gracias_listar) y SQL 63/64 (miembro_directorio_listar). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAX_TEXTO = 300;
  const MOTIVOS = { 'sin-permiso': 'Tu clave ya no sirve. Vuelve a entrar.', 'no-encontrada': 'No encontramos a esa persona.', 'demasiadas': 'Ya enviaste 10 gracias hoy. Intenta mañana.', 'datos-invalidos': 'Revisa el texto e intenta de nuevo.' };

  // Lógica pura: el primer problema en español claro, o null.
  function validarGracia(texto, paraId) {
    const t = String(texto || '').trim();
    if (!paraId) return 'Elige a quién le agradeces.';
    if (!t) return 'Escribe tu gracia.';
    if (t.length > MAX_TEXTO) return 'La gracia es demasiado larga (máximo 300 letras).';
    return null;
  }

  async function miembroMostrar(contenedorId, id, rpcRaw) {
    const c = document.getElementById(contenedorId); if (!c || !id) return;
    const pintar = async (aviso) => {
      const [dr, lr] = await Promise.all([
        rpcRaw('miembro_directorio_listar', { p_codigo: id.codigo, p_clave: id.clave }),
        rpcRaw('miembro_gracias_listar', { p_codigo: id.codigo, p_clave: id.clave })
      ]);
      const personas = dr && dr.ok && dr.data && dr.data.ok !== false ? (dr.data.personas || []) : [];
      const gracias = lr && lr.ok && lr.data && lr.data.ok !== false ? (lr.data.gracias || []) : [];
      const opciones = personas.map((x) => '<option value="' + esc(x.id) + '">' + esc(x.nombre) + '</option>').join('');
      const form = personas.length
        ? '<form id="grForm" class="cp-campo" novalidate>' +
          '<label>¿A quién le agradeces?<select id="grPara"><option value="">Elige a una persona</option>' + opciones + '</select></label>' +
          '<label>Tu gracia<textarea id="grTexto" rows="3" maxlength="' + MAX_TEXTO + '"></textarea></label>' +
          '<label><input type="checkbox" id="grPublica"> Que la vean todos en Comunidad</label>' +
          '<p class="suave" id="grErr" role="alert" hidden></p>' +
          '<button type="button" class="btn" id="grEnviar">Enviar gracias</button></form>'
        : '<p class="suave">Cuando alguien comparta su nombre en el directorio, podrás agradecerle aquí.</p>';
      const lista = gracias.length ? gracias.map((g) =>
        '<div class="cp-fila"><span class="cp-fila-t"><b>' + esc(g.de) + ' → ' + esc(g.para) + '</b><small>' + esc(g.texto) +
        ' · ' + (g.publica ? 'Pública' : 'Privada') + '</small></span></div>').join('')
        : '<p class="suave">Todavía no hay gracias para ver.</p>';
      c.innerHTML = '<h2 class="mi-sub">Gracias</h2>' + (aviso ? '<p class="suave" role="status">' + esc(aviso) + '</p>' : '') + form + '<h3 class="mi-sub">Lo que se ha dicho</h3>' + lista;

      const btn = c.querySelector('#grEnviar');
      if (btn) btn.onclick = async () => {
        const para = c.querySelector('#grPara').value;
        const texto = c.querySelector('#grTexto').value;
        const err = validarGracia(texto, para);
        const el = c.querySelector('#grErr');
        el.hidden = !err; el.textContent = err || '';
        if (err) return;
        btn.disabled = true;
        const g = await rpcRaw('miembro_gracia_enviar', { p_codigo: id.codigo, p_clave: id.clave, p_para: para,
          p_texto: texto.trim(), p_publica: !!c.querySelector('#grPublica').checked });
        const ok = g && g.ok && g.data && g.data.ok;
        pintar(ok ? 'Tu gracia quedó enviada.' : (MOTIVOS[g && g.data && g.data.motivo] || 'No se pudo enviar. Intenta de nuevo.'));
      };
    };
    await pintar('');
  }

  window.TBGracias = { miembroMostrar, _t: { validarGracia } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBGracias;
})();
