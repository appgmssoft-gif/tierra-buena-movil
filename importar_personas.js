/* F1374 · Importar personas desde una planilla (tarea 1.11 de PLAN_TAREAS_IGLESIA.md).
   Tres pasos: elegir archivo → revisar columnas y filas → importar. La revisión se hace en el teléfono:
   solo se envían las filas que pasan, en lotes de 200 (pastor_personas_importar, SQL 37 pendiente).
   Si el SQL 37 aún no está corrido, la pantalla lo dice y no pierde lo que la persona ya revisó.
   Excel: se guarda como CSV. No se guarda el archivo, solo las personas. */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s) => document.querySelector(s);
  const MAX_FILAS = 500, MAX_BYTES = 300000, LOTE = 200, MOSTRAR_ERRORES = 20;
  const CAMPOS = [
    { k: 'nombre', t: 'Nombre', req: true, ej: 'María Pérez', alias: ['nombre', 'nombre completo', 'nombres', 'name', 'persona'] },
    { k: 'telefono', t: 'Teléfono', ej: '+56 9 1234 5678', alias: ['telefono', 'celular', 'fono', 'phone', 'movil', 'whatsapp'] },
    { k: 'cumpleanos', t: 'Fecha de nacimiento', ej: '26/10/1990', alias: ['cumpleanos', 'fecha de nacimiento', 'nacimiento', 'cumple', 'birthday'] },
    { k: 'familia', t: 'Familia', ej: 'Pérez', alias: ['familia', 'apellido', 'apellidos'] },
    { k: 'direccion', t: 'Dirección', ej: 'Calle Sol 123', alias: ['direccion', 'domicilio', 'address'] },
  ];
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const hoy = () => new Date();

  // ---------- Lógica pura (se prueba sin navegador) ----------
  // Lee CSV con «,», «;» o tabulación (detecta cuál usa). Respeta comillas y saltos de línea dentro de comillas.
  function parsearCSV(texto) {
    const s = String(texto || '').replace(/^\uFEFF/, '');
    const primera = s.split(/\r?\n/)[0] || '';
    const cuenta = (c) => primera.split(c).length - 1;
    const sep = [';', ',', '\t'].reduce((a, c) => (cuenta(c) > cuenta(a) ? c : a), ';');
    const filas = []; let fila = [], campo = '', q = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { fila.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; fila.push(campo); campo = ''; filas.push(fila); fila = []; }
      else campo += ch;
    }
    fila.push(campo); filas.push(fila);
    return filas.map((f) => f.map((x) => x.trim())).filter((f) => f.some((x) => x !== ''));
  }
  // Propone qué columna del archivo corresponde a cada campo. -1 = no usar.
  function sugerirMapeo(cabeceras) {
    const m = {};
    CAMPOS.forEach((c) => {
      const i = cabeceras.findIndex((h) => c.alias.indexOf(norm(h)) >= 0);
      m[c.k] = i;
    });
    return m;
  }
  function normTel(t) {
    const s = String(t || '').trim();
    if (!s) return { v: '' };
    const dig = s.replace(/\D/g, '');
    if (dig.length < 8 || dig.length > 15) return { error: 'El teléfono debe tener 8 a 15 números' };
    return { v: s.replace(/[^\d+\s()-]/g, '').trim() };
  }
  function normFecha(t) {
    const s = String(t || '').trim();
    if (!s) return { v: '' };
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    if (!m) return { error: 'La fecha debe ser como 26/10/1990' };
    const f = new Date(y, mo - 1, d), h = hoy();
    if (f.getFullYear() !== y || f.getMonth() !== mo - 1 || f.getDate() !== d || y < 1900 || f > h) return { error: 'Revisa la fecha de nacimiento' };
    return { v: y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0') };
  }
  // Misma huella que usa el servidor: nombre sin tildes + teléfono solo con números. Evita repetir dentro del archivo.
  const huella = (nombre, tel) => norm(nombre) + '|' + String(tel || '').replace(/\D/g, '');
  // Revisa todas las filas con el mapeo elegido.
  function preparar(filas, mapeo) {
    const datos = filas.slice(1);
    if (datos.length > MAX_FILAS) return { demasiadas: true, total: datos.length };
    const validas = [], errores = [], vistas = {};
    let repetidas = 0;
    const celda = (row, k) => (mapeo[k] >= 0 ? String(row[mapeo[k]] || '').trim() : '');
    datos.forEach((row, i) => {
      const linea = i + 2;
      if (row.every((x) => !String(x || '').trim())) return;
      const nombre = celda(row, 'nombre').replace(/\s+/g, ' ');
      const err = [];
      if (!nombre) err.push('falta el nombre');
      if (nombre.length > 80) err.push('el nombre tiene más de 80 letras');
      const tel = normTel(celda(row, 'telefono')); if (tel.error) err.push(tel.error);
      const cum = normFecha(celda(row, 'cumpleanos')); if (cum.error) err.push(cum.error);
      const fam = celda(row, 'familia'); if (fam.length > 80) err.push('la familia tiene más de 80 letras');
      const dir = celda(row, 'direccion'); if (dir.length > 200) err.push('la dirección tiene más de 200 letras');
      if (err.length) { errores.push({ linea, motivo: err.join(', ') }); return; }
      const h = huella(nombre, tel.v);
      if (vistas[h]) { repetidas++; return; }
      vistas[h] = true;
      validas.push({ nombre, telefono: tel.v, cumpleanos: cum.v, familia: fam, direccion: dir });
    });
    return { validas, errores, repetidas, total: datos.length };
  }
  // Plantilla lista para llenar (separador «;» para que Excel en español la abra en columnas).
  function plantillaCSV() {
    const cab = CAMPOS.map((c) => c.t).join(';');
    const ej = CAMPOS.map((c) => c.ej).join(';');
    return '\uFEFF' + cab + '\r\n' + ej + '\r\n';
  }

  // ---------- Pantalla ----------
  const MOTIVO = {
    'sin-permiso': 'Tu sesión de pastor ya no es válida. Vuelve a entrar en modo pastor.',
    'limite-lote': 'El lote es demasiado grande. Inténtalo de nuevo.',
    'limite': 'Tu iglesia llegó al máximo de personas importadas.',
    'filas-invalidas': 'No pudimos leer las filas. Revisa el archivo.',
  };
  const motivoTxt = (m) => MOTIVO[m] || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
  const fila = (r) => (r && r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null);
  const aviso = (id, t) => { const el = document.getElementById(id); if (el) { el.textContent = t || ''; el.hidden = !t; } };
  const cab = (titulo, paso) => '<button type="button" class="volver" id="impVolver">‹ Panel</button>' +
    (paso ? '<p class="suave cp-paso" aria-current="step">Paso ' + paso + ' de 3</p>' : '') + '<h1 class="cp-titulo">' + esc(titulo) + '</h1>';

  function pasoUnoHTML() {
    return cab('Importar personas', 1) +
      '<p class="suave">Sube una planilla con tu lista de personas. Revisamos cada fila antes de guardar. Lo que no pase la revisión no se guarda.</p>' +
      '<div class="card"><h2 class="mi-sub">Antes de empezar</h2><ol class="cp-lista">' +
      '<li>Pon una persona por fila. La columna «Nombre» es obligatoria; las demás son opcionales.</li>' +
      '<li>¿Tienes Excel? Guárdalo como CSV: Archivo → Guardar como → CSV.</li>' +
      '<li>Si no sabes cómo empezar, descarga la plantilla y llénala.</li></ol>' +
      '<button type="button" class="btn sec" id="impPlantilla">Descargar plantilla</button></div>' +
      '<div class="card"><label for="impArchivo">Elegir archivo (CSV, hasta 500 personas)</label>' +
      '<input id="impArchivo" type="file" accept=".csv,text/csv">' +
      '<p class="error" id="impErr" role="alert" hidden></p></div>' +
      '<p class="suave cp-nota">Los datos se revisan en tu teléfono. Solo se guardan las personas que pasan la revisión. El archivo no se guarda.</p>';
  }

  function pasoDosHTML(est) {
    const r = est.prep;
    const opc = (k) => '<option value="-1">No usar</option>' + est.cabeceras.map((h, i) => '<option value="' + i + '"' + (est.mapeo[k] === i ? ' selected' : '') + '>' + esc(h || 'Columna ' + (i + 1)) + '</option>').join('');
    const mapa = CAMPOS.map((c) => '<label for="impM_' + c.k + '">' + esc(c.t) + (c.req ? ' (obligatoria)' : '') + '</label>' +
      '<select id="impM_' + c.k + '" data-campo="' + c.k + '">' + opc(c.k) + '</select>').join('');
    const listas = r.validas.length;
    const vista = r.validas.slice(0, 5).map((p) => '<li><b>' + esc(p.nombre) + '</b>' + (p.telefono ? ' · ' + esc(p.telefono) : '') + (p.familia ? ' · ' + esc(p.familia) : '') + '</li>').join('');
    const errs = r.errores.slice(0, MOSTRAR_ERRORES).map((e) => '<li>Fila ' + e.linea + ': ' + esc(e.motivo) + '</li>').join('');
    const mas = r.errores.length > MOSTRAR_ERRORES ? '<p class="suave">Y ' + (r.errores.length - MOSTRAR_ERRORES) + ' filas más con error.</p>' : '';
    return cab('Revisar antes de importar', 2) +
      '<div class="card" role="status" aria-live="polite"><p><b>' + listas + '</b> ' + (listas === 1 ? 'persona lista' : 'personas listas') + ' para importar</p>' +
      '<p class="suave">' + r.errores.length + ' con error · ' + r.repetidas + ' repetidas dentro del archivo (se omiten)</p></div>' +
      '<div class="card"><h2 class="mi-sub">Columnas de tu archivo</h2><p class="suave">Revisamos que cada dato caiga en el lugar correcto.</p>' + mapa + '</div>' +
      (listas ? '<h2 class="mi-sub">Así se verán</h2><ul class="cp-lista">' + vista + '</ul>' : '') +
      (r.errores.length ? '<div class="card"><h2 class="mi-sub">Filas con error (no se guardan)</h2><ul class="cp-lista">' + errs + '</ul>' + mas + '</div>' : '') +
      '<p class="error" id="impErr2" role="alert" hidden></p>' +
      '<div class="cp-acciones"><button type="button" class="btn sec" id="impAtras">‹ Cambiar archivo</button> ' +
      '<button type="button" class="btn" id="impGo"' + (listas ? '' : ' disabled') + '>Importar ' + listas + ' ' + (listas === 1 ? 'persona' : 'personas') + '</button></div>' +
      '<p class="suave" id="impMsg" role="status" aria-live="polite"></p>';
  }

  function pasoTresHTML(res) {
    return cab('Listo', 3) +
      '<div class="card" role="status"><p><b>Agregamos ' + res.insertadas + ' ' + (res.insertadas === 1 ? 'persona' : 'personas') + '.</b></p>' +
      '<p class="suave">' + (res.repetidas ? res.repetidas + ' ya estaban en tu iglesia y se omitieron. ' : '') +
      (res.errores ? res.errores + ' filas con error no se guardaron.' : '') + '</p></div>' +
      '<div class="cp-acciones"><button type="button" class="btn" id="impOtra">Importar otra planilla</button> ' +
      '<button type="button" class="btn sec" id="impFin">Volver al panel</button></div>';
  }

  async function abrir(p, ctx) {
    const pant = $('#pantalla'); if (!pant) return;
    const est = { p, ctx, paso: 1, cabeceras: [], filas: [], mapeo: {}, prep: null };
    const pintar = () => {
      if (est.paso === 1) pant.innerHTML = pasoUnoHTML();
      else if (est.paso === 2) pant.innerHTML = pasoDosHTML(est);
      if (est.paso === 1) conectarPaso1(); else if (est.paso === 2) conectarPaso2();
      $('#impVolver') && ($('#impVolver').onclick = ctx.volver);
    };
    const conectarPaso1 = () => {
      $('#impPlantilla').onclick = () => {
        const blob = new Blob([plantillaCSV()], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'plantilla_personas.csv';
        document.body.appendChild(a); a.click(); a.remove();
      };
      $('#impArchivo').onchange = async (e) => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        if (f.size > MAX_BYTES) { aviso('impErr', 'El archivo pesa más de 300 KB. Divídelo en partes más pequeñas.'); return; }
        const filas = parsearCSV(await f.text());
        if (filas.length < 2) { aviso('impErr', 'No encontramos personas en el archivo. Revisa que tenga al menos una fila debajo de los títulos.'); return; }
        est.cabeceras = filas[0]; est.filas = filas; est.mapeo = sugerirMapeo(est.cabeceras);
        est.prep = preparar(est.filas, est.mapeo);
        if (est.prep.demasiadas) { aviso('impErr', 'La planilla tiene más de ' + MAX_FILAS + ' personas. Divídela en partes.'); return; }
        est.paso = 2; pintar();
      };
    };
    const conectarPaso2 = () => {
      $('#impAtras').onclick = () => { est.paso = 1; pintar(); };
      document.querySelectorAll('[data-campo]').forEach((s) => {
        s.onchange = () => {
          const k = s.getAttribute('data-campo'); est.mapeo[k] = parseInt(s.value, 10);
          est.prep = preparar(est.filas, est.mapeo); pintar();
        };
      });
      $('#impGo').onclick = () => importar(est);
    };
    pintar();
  }

  // Envía las personas revisadas en lotes. Si se corta, lo guardado queda y el reintento no duplica (lo impide el servidor).
  async function importar(est) {
    const { p, ctx } = est, lista = est.prep.validas;
    const boton = $('#impGo'); boton.disabled = true;
    const tot = { insertadas: 0, repetidas: 0, errores: est.prep.errores.length };
    for (let i = 0; i < lista.length; i += LOTE) {
      const lote = lista.slice(i, i + LOTE);
      aviso('impMsg', 'Guardando ' + Math.min(i + LOTE, lista.length) + ' de ' + lista.length + '…');
      const r = await ctx.rpc('pastor_personas_importar', p, { p_filas: lote });
      const d = fila(r);
      if (!d) {
        boton.disabled = false; aviso('impMsg', '');
        aviso('impErr2', r && r.falta
          ? 'Esta función se activa pronto en tu iglesia. Tu revisión sigue aquí; no se perdió nada.'
          : 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo. Lo ya guardado no se duplica.');
        return;
      }
      if (!d.ok) { boton.disabled = false; aviso('impErr2', motivoTxt(d.motivo) + ' Se guardaron ' + tot.insertadas + ' personas.'); aviso('impMsg', ''); return; }
      tot.insertadas += d.insertadas || 0; tot.repetidas += d.repetidas || 0;
    }
    const pant = $('#pantalla');
    pant.innerHTML = pasoTresHTML(tot);
    $('#impOtra').onclick = () => abrir(p, ctx);
    $('#impFin').onclick = ctx.volver;
  }

  window.TBImportar = { abrir, _t: { parsearCSV, sugerirMapeo, normTel, normFecha, preparar, plantillaCSV, huella, CAMPOS, MAX_FILAS, LOTE } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBImportar;
})();
