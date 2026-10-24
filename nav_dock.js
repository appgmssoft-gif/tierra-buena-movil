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
  let sec = null;

  // Barra secundaria: una fila fina encima de la principal, solo para la sección donde estás.
  function quitarSecundaria() {
    if (sec) sec.remove();
    sec = null;
    document.body.classList.remove('tb-con-dock2');
  }
  function montarSecundaria(items, activo) {
    quitarSecundaria();
    const n = document.createElement('div');
    n.id = 'tbDock2';
    n.className = 'tb-dock2';
    n.setAttribute('role', 'group');
    n.setAttribute('aria-label', 'Vistas de esta sección');
    n.innerHTML = items.map((i) => '<button type="button" class="tb-dock2-b" data-d2="' + i.k + '" aria-pressed="' + (i.k === activo ? 'true' : 'false') + '">' + i.t + '</button>').join('');
    document.body.appendChild(n);
    document.body.classList.add('tb-con-dock2');
    n.querySelectorAll('[data-d2]').forEach((b) => b.addEventListener('click', () => {
      const it = items.find((i) => i.k === b.dataset.d2);
      if (it && it.fn) it.fn(); // si la sección ya no está en pantalla, la fila se retira sola
      n.querySelectorAll('[data-d2]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    }));
    sec = n;
  }

  function quitar() {
    quitarSecundaria();
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
      quitarSecundaria();
      marcar(k);
      if (acciones[k]) acciones[k]();
    }));
    montado = nav;
  }

  window.TBDock = { montar, marcar, quitar, montarSecundaria, quitarSecundaria, _t: { ITEMS: ITEMS.map((i) => i.k) } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBDock;
})();
