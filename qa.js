// qa.js · HERRAMIENTAS DE DESARROLLO Y CONTROL DE CALIDAD.
// Se activa en dos casos:
//  1) localhost / 127.0.0.1 (tu computadora), sin PIN.
//  2) la versión de desarrollo instalada en tu celular (?dev=1), tras escribir tu PIN.
// En la app que usan las personas no se activa: no tiene el PIN ni se abre con ?dev=1.
(function () {
  'use strict';
  // Huella SHA-256 de tu PIN de desarrollo. Se genera con herramientas/crear_pin_dev.html y se pega aquí.
  // Vacía = no se puede desbloquear la versión de desarrollo en el celular (solo funciona en localhost).
  const DEV_HASH = '';
  const KDEV = 'tb_dev_ok', KDIAS = 'tb_qa_dias_extra';
  const host = (typeof location !== 'undefined' && location.hostname) || '';
  const enLocal = host === 'localhost' || host === '127.0.0.1';
  const pideDev = /[?&]dev=1/.test((typeof location !== 'undefined' && location.search) || '');

  // La versión de desarrollo usa su propio manifiesto, para instalarse aparte de la app normal.
  if (pideDev) { const m = document.querySelector('link[rel="manifest"]'); if (m) m.setAttribute('href', 'manifest-dev.webmanifest'); }

  const desbloqueado = () => enLocal || localStorage.getItem(KDEV) === '1';
  const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  async function pedirPin() {
    if (!DEV_HASH) { alert('El PIN de desarrollo no está configurado. Ver herramientas/crear_pin_dev.html.'); return false; }
    const pin = window.prompt('PIN de desarrollo:'); if (!pin) return false;
    const huella = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin)));
    if (huella !== DEV_HASH) { alert('PIN incorrecto.'); return false; }
    localStorage.setItem(KDEV, '1'); return true;
  }

  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const diasExtra = () => Math.max(0, parseInt(localStorage.getItem(KDIAS) || '0', 10) || 0);
  const fechaSimulada = () => { const d = new Date(); d.setDate(d.getDate() + diasExtra()); return iso(d); };
  function aplicarReloj() { if (window.TBInicio && window.TBInicio.config) window.TBInicio.config({ hoy: fechaSimulada }); }

  // Cada día simulado hace una visita real: el árbol, la maleza y la fruta avanzan igual que con el tiempo.
  function avanzar(n) {
    const T = window.TBInicio; if (!T) return;
    for (let i = 0; i < n; i++) { localStorage.setItem(KDIAS, String(diasExtra() + 1)); aplicarReloj(); T.visita(); }
    location.reload();
  }
  function darGotas(n) { const T = window.TBInicio; if (!T) return; const e = T.cargar(); e.gotas.saldo += n; e.gotas.total += n; T.guardar(e); }
  async function desbloquearTodo() {
    const T = window.TBInicio; if (!T) return;
    const cat = await fetch('datos/inicio_catalogo.json').then((r) => r.json());
    const e = T.cargar();
    [['semillas', 'sem_'], ['aves', 'ave_'], ['ambientes', 'amb_'], ['tematicas', 'tem_'], ['lugares', 'lug_'], ['climas', 'cli_'], ['especiales', 'esp_']]
      .forEach(([grupo, pre]) => Object.keys(cat[grupo] || {}).forEach((k) => { const c = pre + k; if (e.vivero.desbloqueados.indexOf(c) < 0) e.vivero.desbloqueados.push(c); }));
    T.guardar(e); location.reload();
  }
  // F1072 · Reinicio completo: el Inicio vuelve a la primera elección (en el teléfono y en la nube de la cuenta), con los días simulados en cero.
  function reiniciar() {
    if (!window.confirm('¿Empezar de nuevo el Inicio como la primera vez? Se borra el progreso del Inicio (también en la nube) y los días simulados.')) return;
    const hecho = () => { localStorage.removeItem(KDIAS); location.reload(); };
    const TA = window.TBApp; const p = TA && TA.reiniciarInicio ? TA.reiniciarInicio() : Promise.resolve(true);
    p.then(hecho, hecho);
  }
  // F1072 · Atajo: deja el Inicio con un hábitat ya comprado y elegido, para probar sin gastar gotas.
  function probarHabitat(h) {
    const T = window.TBInicio; if (!T) return;
    const EMBLEMA = { bosque: 'araucaria', desierto: 'chanar', costa: 'palma_chilena' };   // mismo emblema que el catálogo (F1071)
    const e = T.cargar(); if (e.eligiendo) { e.eligiendo = false; if (!e.ciclo.especie) { e.ciclo.especie = EMBLEMA[h] || 'araucaria'; e.ciclo.inicio = iso(new Date()); e.ciclo.diasCuidado = 1; e.ciclo.ultimoDia = e.ciclo.ultimaVisita = iso(new Date()); } }
    const c = 'tem_' + h; if (e.vivero.desbloqueados.indexOf(c) < 0) e.vivero.desbloqueados.push(c);
    e.tematica = h; T.guardar(e); location.reload();
  }
  // F1072 · Resumen del estado actual, para saber en qué punto está la prueba.
  function resumen() {
    const T = window.TBInicio; if (!T) return 'Inicio sin cargar';
    const e = T.cargar(), dia = e.eligiendo ? 'sin elegir árbol' : 'día ' + e.ciclo.diasCuidado;
    const hab = e.tematica || 'sin hábitat';
    return dia + ' · ' + hab + ' · ' + ((e.gotas && e.gotas.saldo) || 0) + ' gotas';
  }

  // Cambiar de vista: usuario normal, miembro o pastor. Las credenciales de prueba se piden una sola vez y quedan en tu teléfono.
  function verComo(quien) {
    if (quien === 'usuario') { localStorage.removeItem('tb_movil_identidad'); localStorage.removeItem('tb_movil_pastor'); location.reload(); return; }
    if (quien === 'miembro') {
      let c = JSON.parse(localStorage.getItem('tb_dev_miembro') || 'null');
      if (!c) { const codigo = window.prompt('Código de iglesia de pruebas:'), clave = window.prompt('Clave de miembro de prueba:'); if (!codigo || !clave) return; c = { codigo: codigo.trim().toUpperCase(), clave: clave.trim() }; localStorage.setItem('tb_dev_miembro', JSON.stringify(c)); }
      localStorage.setItem('tb_movil_identidad', JSON.stringify({ nombre: 'Miembro de prueba', codigo: c.codigo, clave: c.clave })); location.reload(); return;
    }
    if (quien === 'pastor') {
      let c = JSON.parse(localStorage.getItem('tb_dev_pastor') || 'null');
      if (!c) { const codigo = window.prompt('Código de iglesia de pruebas:'), secreto = window.prompt('Clave de pastor de prueba:'); if (!codigo || !secreto) return; c = { codigo: codigo.trim().toUpperCase(), secreto: secreto.trim() }; localStorage.setItem('tb_dev_pastor', JSON.stringify(c)); }
      localStorage.setItem('tb_movil_pastor', JSON.stringify({ codigo: c.codigo, secreto: c.secreto })); location.reload();
    }
  }

  // Panel: botón flotante y lista de acciones. Sin estilos en línea (qa.css).
  function construir() {
    const caja = document.createElement('div'); caja.className = 'qa-caja';
    const boton = document.createElement('button'); boton.type = 'button'; boton.className = 'qa-toggle'; boton.textContent = 'DEV';
    const panel = document.createElement('div'); panel.className = 'qa-panel'; panel.hidden = true;
    const titulo = document.createElement('p'); titulo.className = 'qa-titulo'; titulo.textContent = 'Desarrollo · +' + diasExtra() + ' días';
    const estado = document.createElement('p'); estado.className = 'qa-pie'; estado.textContent = resumen(); panel.appendChild(estado);
    const acc = [['+1 día', () => avanzar(1)], ['+7 días', () => avanzar(7)], ['+30 días', () => avanzar(30)], ['+500 gotas', () => { darGotas(500); location.reload(); }], ['Desbloquear todo', desbloquearTodo],
      ['Probar bosque', () => probarHabitat('bosque')], ['Probar desierto', () => probarHabitat('desierto')], ['Probar costa', () => probarHabitat('costa')],
      ['Ver como usuario', () => verComo('usuario')], ['Ver como miembro', () => verComo('miembro')], ['Ver como pastor', () => verComo('pastor')], ['Empezar de nuevo (primera vez)', reiniciar]];
    panel.appendChild(titulo);
    acc.forEach(([txt, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'qa-btn'; b.textContent = txt; b.addEventListener('click', () => fn()); panel.appendChild(b); });
    const pie = document.createElement('p'); pie.className = 'qa-pie'; pie.textContent = (enLocal ? 'Computadora' : 'Celular (desarrollo)') + ' · día simulado ' + fechaSimulada();
    panel.appendChild(pie);
    boton.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    caja.appendChild(panel); caja.appendChild(boton); document.body.appendChild(caja);
  }
  async function iniciar() {
    if (!desbloqueado()) { if (!pideDev) return; if (!(await pedirPin())) return; }
    if (!document.querySelector('link[href="qa.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'qa.css'; document.head.appendChild(l); }
    construir();
    const tryReloj = () => { if (window.TBInicio) aplicarReloj(); else setTimeout(tryReloj, 200); };
    tryReloj();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
