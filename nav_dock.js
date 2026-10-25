/* F1410 · Barra de navegación inferior (dock) para el miembro.
   Cinco destinos, como máximo, con texto bajo cada ícono (recomendación de diseño: 3 a 5 destinos).
   Vive fuera de la pantalla, así que no se borra al cambiar de sección. Se oculta dentro del chat (ahí está el campo de escribir). */
(function () {
  'use strict';
  const ITEMS = [
    { k: 'inicio', ico: '🏠', t: 'Inicio' },
    { k: 'chat', ico: '💬', t: 'Chat' },
    { k: 'agenda', ico: '📅', t: 'Agenda' },
    { k: 'muro', ico: '🧱', t: 'Comunidad' },
    { k: 'servir', ico: '🤲', t: 'Servir' }
  ];
  let montado = null;

  function quitar() {
    if (montado) montado.remove();
    montado = null;
    document.body.classList.remove('tb-con-dock');
  }
  function marcar(k) {
    if (!montado) return;
    montado.querySelectorAll('[data-dock]').forEach((b) => b.setAttribute('aria-current', b.dataset.dock === k ? 'page' : 'false'));
  }
  // acciones: { inicio: fn, chat: fn, agenda: fn, muro: fn, servir: fn }
  function montar(acciones) {
    quitar();
    // La app ya tiene su barra principal (.barra). No se duplica: la barra secundaria va encima de ella.
    if (document.querySelector('.barra')) return;
    const nav = document.createElement('nav');
    nav.id = 'tbDock';
    nav.className = 'tb-dock';
    nav.setAttribute('aria-label', 'Navegación principal');
    nav.innerHTML = ITEMS.map((i) => '<button type="button" class="tb-dock-b" data-dock="' + i.k + '" aria-label="' + i.t + '">' +
      '<span class="tb-dock-ico" aria-hidden="true">' + i.ico + '</span><span class="tb-dock-t">' + i.t + '</span></button>').join('');
    document.body.appendChild(nav);
    document.body.classList.add('tb-con-dock');
    nav.querySelectorAll('[data-dock]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.dock;
      document.body.classList.remove('en-chat');
      marcar(k);
      if (acciones[k]) acciones[k]();
    }));
    montado = nav;
  }

  window.TBDock = { montar, marcar, quitar, _t: { ITEMS: ITEMS.map((i) => i.k) } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBDock;
})();
