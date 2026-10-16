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
  let antes = quieto();
  try {
    new MutationObserver(() => { const ahora = quieto(); if (ahora && !antes) detener(); antes = ahora; }).observe(H, { attributes: true, attributeFilter: ['data-anim'] });
  } catch (e) { /* sin observador */ }
  window.TBMov = { quieto, detener };
})();
