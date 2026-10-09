// qa.js · PANEL DE CONTROL DE CALIDAD (solo para desarrollo).
// Se activa únicamente cuando la app corre en localhost o 127.0.0.1. En la app publicada no hace nada.
// Permite: avanzar días (para ver todo el crecimiento), dar gotas, desbloquear todo el catálogo y reiniciar el progreso.
(function () {
  'use strict';
  const h = (typeof location !== 'undefined' && location.hostname) || '';
  const esDesarrollo = h === 'localhost' || h === '127.0.0.1';
  if (!esDesarrollo) return;
  const KDIAS = 'tb_qa_dias_extra';
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const diasExtra = () => Math.max(0, parseInt(localStorage.getItem(KDIAS) || '0', 10) || 0);
  const fechaSimulada = () => { const d = new Date(); d.setDate(d.getDate() + diasExtra()); return iso(d); };

  // Aplica el reloj simulado al Inicio: el árbol crece como si hubieran pasado los días.
  function aplicarReloj() { if (window.TBInicio && window.TBInicio.config) window.TBInicio.config({ hoy: fechaSimulada }); }

  // Cada día simulado hace una visita real: así el árbol, la maleza y la fruta avanzan igual que con el paso de los días.
  function avanzar(n) {
    const T = window.TBInicio; if (!T) return;
    for (let i = 0; i < n; i++) {
      localStorage.setItem(KDIAS, String(diasExtra() + 1));
      aplicarReloj();
      T.visita();
    }
    location.reload();
  }
  function darGotas(n) {
    const T = window.TBInicio; if (!T) return;
    const e = T.cargar(); e.gotas.saldo += n; e.gotas.total += n; T.guardar(e);
  }
  async function desbloquearTodo() {
    const T = window.TBInicio; if (!T) return;
    const cat = await fetch('datos/inicio_catalogo.json').then((r) => r.json());
    const e = T.cargar();
    const prefijos = [['semillas', 'sem_'], ['aves', 'ave_'], ['ambientes', 'amb_'], ['tematicas', 'tem_'], ['lugares', 'lug_'], ['climas', 'cli_'], ['especiales', 'esp_']];
    prefijos.forEach(([grupo, pre]) => Object.keys(cat[grupo] || {}).forEach((k) => {
      const clave = pre + k; if (e.vivero.desbloqueados.indexOf(clave) < 0) e.vivero.desbloqueados.push(clave);
    }));
    T.guardar(e); location.reload();
  }
  function reiniciar() {
    if (!confirm('¿Reiniciar el progreso del Inicio y los días simulados?')) return;
    localStorage.removeItem('tb_inicio_v1'); localStorage.removeItem(KDIAS); location.reload();
  }

  // Panel: botón flotante y lista de acciones (sin estilos en línea: las clases están en qa.css).
  function construir() {
    const caja = document.createElement('div'); caja.className = 'qa-caja';
    const boton = document.createElement('button'); boton.type = 'button'; boton.className = 'qa-toggle'; boton.textContent = 'QA';
    const panel = document.createElement('div'); panel.className = 'qa-panel'; panel.hidden = true;
    const titulo = document.createElement('p'); titulo.className = 'qa-titulo';
    const acciones = [
      ['+1 día', () => avanzar(1)], ['+7 días', () => avanzar(7)], ['+30 días', () => avanzar(30)],
      ['+500 gotas', () => { darGotas(500); location.reload(); }], ['Desbloquear todo', desbloquearTodo],
      ['Volver a empezar', reiniciar]
    ];
    panel.appendChild(titulo);
    acciones.forEach(([txt, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'qa-btn'; b.textContent = txt;
      b.addEventListener('click', () => fn()); panel.appendChild(b);
    });
    const pie = document.createElement('p'); pie.className = 'qa-pie'; pie.textContent = 'Solo en localhost. Día simulado: ' + fechaSimulada();
    panel.appendChild(pie);
    boton.addEventListener('click', () => { panel.hidden = !panel.hidden; titulo.textContent = 'Control de calidad · +' + diasExtra() + ' días'; });
    caja.appendChild(panel); caja.appendChild(boton); document.body.appendChild(caja);
  }
  function iniciar() {
    if (!document.querySelector('link[href="qa.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'qa.css'; document.head.appendChild(l); }
    construir();
    const tryReloj = () => { if (window.TBInicio) aplicarReloj(); else setTimeout(tryReloj, 200); };
    tryReloj();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
