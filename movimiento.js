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
    // F1275 · Las animaciones SIN FIN (luces, aurora, piezas del Inicio) arrancan en tandas de 10 por cuadro y no todas en el mismo instante:
    // en tablets, crear decenas de capas a la vez se ve como un destello. Se saltan las que están fuera de pantalla (ya las pausa rendimiento.css).
    try {
      if (typeof requestAnimationFrame !== 'function') return;
      const fuera = (a) => { try { const n = a.effect && a.effect.target; return !!(n && n.closest && n.closest('.tb-fuera')); } catch (e) { return false; } };
      const sinFin = document.getAnimations().filter((a) => { try { return a.effect.getTiming().iterations === Infinity && !fuera(a); } catch (e) { return false; } });
      sinFin.forEach((a) => { try { a.pause(); } catch (e) { /* no se pudo pausar */ } });
      let i = 0;
      const paso = () => {
        if (quieto()) return;   // si las apagaron otra vez, no se reinicia nada
        sinFin.slice(i, i + 10).forEach((a) => { try { if (a.playState === 'paused') a.play(); } catch (e) { /* ya no existe */ } });
        i += 10; if (i < sinFin.length) requestAnimationFrame(paso);
      };
      requestAnimationFrame(() => requestAnimationFrame(paso));
    } catch (e) { /* sin tandas: las animaciones arrancan juntas como antes */ }
  }
  let antes = quieto();
  try {
    new MutationObserver(() => { const ahora = quieto(); if (ahora && !antes) detener(); else if (!ahora && antes) reactivar(); antes = ahora; }).observe(H, { attributes: true, attributeFilter: ['data-anim'] });
  } catch (e) { /* sin observador */ }
  window.TBMov = { quieto, detener };
})();
