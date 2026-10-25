/* F1413 · Distribución sin superposición (idea 3): coloca figuras en zonas con una distancia mínima entre ellas.
   Determinista (misma semilla = mismas posiciones), sin dependencias. Coordenadas en porcentaje del escenario. */
(function () {
  'use strict';
  function azar(sem) {
    let a = (sem >>> 0);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // zonas: [{x0,x1,y0,y1}, ...] una por figura. Devuelve [{x,y}, ...] en el mismo orden.
  function distribuir(zonas, opt) {
    const o = Object.assign({ minDist: 14, sem: 1, intentos: 240 }, opt || {});
    const R = azar(o.sem), out = [];
    zonas.forEach((z) => {
      let mejor = null, mejorD = -1;
      for (let k = 0; k < o.intentos; k++) {
        const c = { x: z.x0 + R() * (z.x1 - z.x0), y: z.y0 + R() * (z.y1 - z.y0) };
        const d = out.length ? Math.min.apply(null, out.map((p) => Math.hypot(p.x - c.x, p.y - c.y))) : Infinity;
        if (d >= o.minDist) { mejor = c; mejorD = d; break; }
        if (d > mejorD) { mejor = c; mejorD = d; }
      }
      out.push({ x: Math.round(mejor.x * 100) / 100, y: Math.round(mejor.y * 100) / 100 });
    });
    return out;
  }
  function sinSolapar(puntos, minDist) {
    for (let i = 0; i < puntos.length; i++) for (let j = i + 1; j < puntos.length; j++) {
      if (Math.hypot(puntos[i].x - puntos[j].x, puntos[i].y - puntos[j].y) < minDist) return false;
    }
    return true;
  }
  window.TBDistribucion = { distribuir, sinSolapar, _t: { azar } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBDistribucion;
})();
