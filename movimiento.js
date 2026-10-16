// movimiento.js - F1171 · UN SOLO interruptor de movimiento para toda la app.
// Antes cada archivo tenía su propia copia de «¿animaciones apagadas?» y el tablero la ignoraba.
// Ahora todos preguntan aquí: TBMov.quieto() es verdadero con Animaciones «apagadas» o con «reducir movimiento» del teléfono.
// Al apagar las animaciones se cancelan también las hechas por JavaScript (Web Animations) que el CSS no alcanza.
'use strict';
(function () {
  const H = document.documentElement;
  const quieto = () => {
    try { return H.getAttribute('data-anim') === 'off' || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  };
  // Detiene lo que ya está corriendo (animaciones de JS e infinitas) cuando se pasa a «quieto».
  function detener() {
    try { document.getAnimations().forEach((a) => { try { a.cancel(); } catch (e) { /* ya terminada */ } }); } catch (e) { /* sin API */ }
  }
  // F1173 · Arreglo del parpadeo al ACTIVAR las animaciones: al pasar de «apagadas» a «activas», el CSS arranca de golpe todas las
  // animaciones de entrada (con «backwards», cada tarjeta vuelve a opacidad 0 y reaparece) y las de «aparición al bajar» (.rv).
  // Eso se veía como un destello de toda la pantalla. Ahora, en el mismo instante del cambio (antes de pintar), lo ya visible se deja en
  // su estado final; solo siguen las animaciones sin fin (luces, aurora) y el fondo aparece con un fundido suave.
  function reactivar() {
    try {
      document.getAnimations().forEach((a) => {
        try { const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null; if (t && t.iterations !== Infinity) a.finish(); } catch (e) { /* ya terminada */ }
      });
    } catch (e) { /* sin API */ }
    try { Array.prototype.forEach.call(document.querySelectorAll('.rv'), (n) => { n.classList.add('rv-on'); n.classList.remove('rv'); }); } catch (e) { /* sin nada que mostrar */ }
    try { H.classList.add('tb-reactiva'); setTimeout(() => H.classList.remove('tb-reactiva'), 1100); } catch (e) { /* nada */ }
  }
  let antes = quieto();
  try {
    new MutationObserver(() => { const ahora = quieto(); if (ahora && !antes) detener(); else if (!ahora && antes) reactivar(); antes = ahora; }).observe(H, { attributes: true, attributeFilter: ['data-anim'] });
  } catch (e) { /* sin observador */ }
  window.TBMov = { quieto, detener };
})();
