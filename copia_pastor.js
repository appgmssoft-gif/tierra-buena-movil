/* F1404 · 1.16 Copia de seguridad de los datos de la iglesia (SQL 56).
   El pastor descarga un archivo JSON con los datos de su iglesia. No incluye claves ni códigos de acceso.
   Llama a copia_iglesia_leer con la clave de pastor (igual que el resto del panel). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    pant.innerHTML = '<button type="button" class="volver" id="copVolver">‹ Panel</button>' +
      '<h1 class="cp-titulo">Copia de seguridad</h1>' +
      '<p class="suave">Descarga una copia de los datos de tu iglesia en un archivo. Guárdalo en un lugar seguro: contiene datos personales de tu comunidad.</p>' +
      '<div class="card"><p class="suave m0">La copia incluye miembros, familias, peticiones, avisos, asistencia, actividades y la configuración de la iglesia. No incluye claves ni códigos de acceso.</p></div>' +
      '<button type="button" class="btn" id="copBajar">Descargar copia de seguridad</button>' +
      '<p class="suave" id="copMsg" role="status" aria-live="polite"></p>';
    $('#copVolver').onclick = ctx.volver;
    $('#copBajar').onclick = async () => {
      const b = $('#copBajar'), msg = $('#copMsg');
      b.disabled = true; msg.textContent = 'Preparando la copia…';
      const r = await ctx.rpc('copia_iglesia_leer', p);
      b.disabled = false;
      const d = r && r.ok ? r.data : null;
      if (!d || d.ok !== true) {
        msg.textContent = d && d.motivo === 'sin-permiso'
          ? 'No pudimos confirmar tu clave de pastor. Vuelve a entrar.'
          : 'No pudimos preparar la copia. Revisa tu conexión e inténtalo de nuevo.';
        return;
      }
      try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'copia-tierra-buena-' + p.codigo + '-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
        const total = Object.keys(d.conteos || {}).reduce((s, k) => s + (+d.conteos[k] || 0), 0);
        msg.textContent = 'Listo: se descargó la copia con ' + total + ' registros. Guárdala en un lugar seguro.';
      } catch (e) { msg.textContent = 'No se pudo descargar en este teléfono. Inténtalo de nuevo.'; }
    };
  }
  window.TBCopia = { abrir };
})();
