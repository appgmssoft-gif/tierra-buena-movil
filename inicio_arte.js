// inicio_arte.js - F1207 · Postales de los tres lugares (bosque, desierto, costa) para la pantalla de elegir lugar.
// Dibujos propios en SVG (sin imágenes externas, sin estilos en línea): capas con degradados, luz y detalles de cada lugar.
// Solo dibujo: no guarda nada ni toca el estado del Inicio. Si falla, inicio_lienzo.js usa la ilustración antigua.
'use strict';
(function () {
  const g = (id, a, b, x2, y2) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 || 0) + '" y2="' + (y2 === undefined ? 1 : y2) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  const rg = (id, c, o) => '<radialGradient id="' + id + '"><stop offset="0" stop-color="' + c + '" stop-opacity="' + o + '"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>';
  const brillos = (pts, col) => pts.map((p) => '<circle class="pt-brillo" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] || 1.4) + '" fill="' + col + '"/>').join('');

  // Pewén: tronco largo y copa en candelabro (ramas que suben y se abren), como en la escena del Inicio.
  function pewen(x, y, alto, esc) {
    const s = esc || 1, top = -alto;
    let ramas = '';
    [[-1, 0.0], [1, 0.0], [-1, 0.22], [1, 0.22], [-1, 0.42], [1, 0.42]].forEach((r, i) => {
      const dir = r[0], t = top + alto * r[1] * 0.55, largo = 26 - i * 2.2;
      ramas += '<path d="M0 ' + (t + 6) + ' Q' + dir * largo * 0.6 + ' ' + (t - 2) + ' ' + dir * largo + ' ' + (t - 12 + i * 1.2) + '" fill="none" stroke="#3b6b3f" stroke-width="2.6" stroke-linecap="round"/>'
        + '<ellipse cx="' + dir * largo + '" cy="' + (t - 13 + i * 1.2) + '" rx="' + (11 - i * 0.7) + '" ry="4.6" fill="#2f6b3f"/>'
        + '<ellipse cx="' + dir * (largo - 5) + '" cy="' + (t - 16 + i * 1.2) + '" rx="' + (8 - i * 0.5) + '" ry="3.2" fill="#4f8a55"/>';
    });
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><path d="M-3 0 L-2 ' + top + ' L2 ' + top + ' L3.2 0Z" fill="#6b4a32"/>'
      + '<path d="M0 -4 V' + top + '" stroke="#4d3523" stroke-width=".9" opacity=".5"/>' + ramas
      + '<ellipse cx="0" cy="' + (top - 7) + '" rx="13" ry="5.6" fill="#2f6b3f"/><ellipse cx="0" cy="' + (top - 11) + '" rx="8" ry="4" fill="#4f8a55"/></g>';
  }
  const copihue = (x, y, h, col) => '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0 Q' + (h * 0.1) + ' ' + (-h * 0.5) + ' ' + (h * 0.05) + ' ' + (-h) + '" fill="none" stroke="#3f7a45" stroke-width="1.5" stroke-linecap="round"/>'
    + '<path d="M' + (h * 0.05) + ' ' + (-h) + ' q-6 2 -5 12 q5 4 10 0 q1 -10 -5 -12Z" fill="' + col + '"/><path d="M' + (h * 0.05 - 4) + ' ' + (-h + 10) + ' q4 3 8 0" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/></g>';
  const helecho = (x, y, s, col) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round">'
    + [-60, -35, -10, 15, 40, 62].map((a) => '<path d="M0 0 Q' + Math.sin(a * Math.PI / 180) * 14 + ' -14 ' + Math.sin(a * Math.PI / 180) * 26 + ' ' + (-26 + Math.abs(a) * 0.12) + '"/>').join('') + '</g>';

  function bosque() {
    return '<defs>' + g('bs', '#b7dfe0', '#f7ecc6') + rg('bsol', '#fff1b8', 0.95) + g('bn', '#ffffff', '#ffffff') + '</defs>'
      + '<rect width="320" height="200" fill="url(#bs)"/>'
      + '<g class="pt-sol"><circle cx="236" cy="66" r="62" fill="url(#bsol)"/><circle cx="236" cy="66" r="16" fill="#fff6cf"/></g>'
      + '<path d="M0 104 L34 66 L52 82 L84 44 L116 84 L142 62 L176 96 L212 70 L246 92 L284 58 L320 90 V130 H0Z" fill="#b6c9d6"/>'
      + '<path d="M84 44 L72 62 L82 58 L90 66 L98 56Z M284 58 L272 74 L282 70 L291 78 L298 68Z M34 66 L26 78 L34 76 L42 82Z" fill="#fbfdff" opacity=".95"/>'
      + '<path d="M0 122 C40 100 70 112 110 104 S180 92 220 106 S290 100 320 108 V150 H0Z" fill="#8fb3a6"/>'
      + '<rect y="104" width="320" height="30" fill="#ffffff" opacity=".28"/>'
      + '<path d="M0 136 C50 118 100 130 150 122 S260 114 320 126 V200 H0Z" fill="#6ea36d"/>'
      + pewen(246, 138, 34, 0.9)
      + '<path d="M0 156 C60 140 120 152 180 144 S280 138 320 148 V200 H0Z" fill="#4a8a55"/>'
      + pewen(96, 160, 74, 1.15)
      + '<path d="M0 178 C70 164 140 174 210 168 S290 166 320 172 V200 H0Z" fill="#2f6b3f"/>'
      + helecho(20, 188, 1.0, '#8cc27a') + helecho(292, 190, 1.1, '#8cc27a') + helecho(170, 194, 0.8, '#6aa55f')
      + copihue(46, 192, 30, '#d6334f') + copihue(56, 194, 22, '#e8566d') + copihue(268, 194, 26, '#d6334f')
      + brillos([[70, 120, 1.6], [150, 140, 1.2], [200, 126, 1.5], [128, 98, 1.1], [286, 132, 1.3], [30, 140, 1.2]], '#fff6c0');
  }
  function desierto() {
    return '<defs>' + g('ds', '#f6cf92', '#fdeccb') + rg('dsol', '#fff0c2', 0.95) + g('dd1', '#f1cb8c', '#e4ae6b') + '</defs>'
      + '<rect width="320" height="200" fill="url(#ds)"/>'
      + '<g class="pt-sol"><circle cx="82" cy="72" r="70" fill="url(#dsol)"/><circle cx="82" cy="72" r="19" fill="#fff4d2"/></g>'
      + '<path d="M150 118 L172 80 H250 L276 118Z" fill="#d6a07c"/><path d="M150 118 L172 80 H196 L184 118Z" fill="#c78e6a" opacity=".6"/><rect x="172" y="80" width="78" height="4" fill="#e7bd9c"/>'
      + '<path d="M0 122 C60 108 120 120 180 112 S280 104 320 114 V150 H0Z" fill="#e8c196"/>'
      + '<rect y="108" width="320" height="30" fill="#ffffff" opacity=".18"/>'
      + '<path d="M0 142 C50 120 110 138 170 130 S270 118 320 134 V200 H0Z" fill="url(#dd1)"/>'
      + '<path d="M0 142 C50 120 110 138 170 130" fill="none" stroke="#fff3d6" stroke-width="1.6" opacity=".7"/>'
      + '<path d="M0 168 C70 148 150 166 230 156 S300 152 320 160 V200 H0Z" fill="#d49a58"/>'
      + '<path d="M0 168 C70 148 150 166 230 156" fill="none" stroke="#f3d7a2" stroke-width="1.6" opacity=".6"/>'
      + '<g transform="translate(250 176)"><rect x="-8" y="-62" width="16" height="64" rx="8" fill="#4f8f5a"/><rect x="-3" y="-62" width="4" height="64" rx="2" fill="#6dae74" opacity=".7"/>'
      + '<path d="M-8 -24 h-12 a6 6 0 0 1 -6 -6 v-18 a5 5 0 0 1 10 0 v14 h8Z" fill="#4f8f5a"/><path d="M8 -36 h12 a6 6 0 0 0 6 -6 v-14 a5 5 0 0 0 -10 0 v10 h-8Z" fill="#4f8f5a"/>'
      + '<circle cx="0" cy="-66" r="3.4" fill="#f08aa0"/><ellipse cx="0" cy="3" rx="22" ry="4" fill="#a8742f" opacity=".35"/></g>'
      + [[40, 184, 26], [64, 190, 20], [92, 186, 24], [196, 190, 18]].map((f) => '<g transform="translate(' + f[0] + ' ' + f[1] + ')"><path d="M0 0 Q2 ' + (-f[2] * 0.5) + ' 0 ' + (-f[2]) + '" fill="none" stroke="#6aa86b" stroke-width="1.5" stroke-linecap="round"/><path d="M0 ' + (-f[2]) + ' l-5 -6 q5 -7 5 -7 q0 0 5 7Z" fill="#e8454f"/><path d="M0 ' + (-f[2] - 2) + ' l-2 -8 M0 ' + (-f[2] - 2) + ' l2 -8" stroke="#f6a34a" stroke-width="1.2"/></g>').join('')
      + brillos([[120, 100, 1.4], [200, 96, 1.2], [30, 110, 1.2], [290, 128, 1.4]], '#fff3c8');
  }
  function costa() {
    const ola = (y, c, o) => '<path d="M0 ' + y + ' q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="' + c + '" stroke-width="1.6" opacity="' + o + '" stroke-linecap="round"/>';
    return '<defs>' + g('cs', '#bfe6ee', '#fbefd5') + rg('csol', '#fff0bd', 0.95) + g('cm', '#7cc4d2', '#4b9fb9') + g('ca', '#f2dcae', '#e3c78a') + '</defs>'
      + '<rect width="320" height="200" fill="url(#cs)"/>'
      + '<g class="pt-sol"><circle cx="228" cy="86" r="66" fill="url(#csol)"/><circle cx="228" cy="86" r="17" fill="#fff6d0"/></g>'
      + '<path d="M0 98 H320 V150 H0Z" fill="url(#cm)"/>'
      + '<path d="M206 98 H250 L262 150 H196Z" fill="#fff3c4" opacity=".35"/>'
      + ola(110, '#ffffff', 0.55) + '<g transform="translate(-14 0)">' + ola(122, '#ffffff', 0.5) + '</g>' + '<g transform="translate(-6 0)">' + ola(136, '#ffffff', 0.6) + '</g>'
      + '<path d="M0 98 H320" stroke="#e9f6f8" stroke-width="1.5" opacity=".8"/>'
      + '<path d="M0 152 C60 140 110 150 170 146 S280 142 320 150 V200 H0Z" fill="url(#ca)"/>'
      + '<path d="M0 152 C60 140 110 150 170 146 S280 142 320 150" fill="none" stroke="#ffffff" stroke-width="3" opacity=".85" stroke-linecap="round"/>'
      + '<path d="M0 176 C80 164 170 176 260 168 S310 166 320 170 V200 H0Z" fill="#d9bb7e" opacity=".7"/>'
      + '<g transform="translate(262 168)"><ellipse cx="0" cy="0" rx="16" ry="9" fill="#6c7a86"/><ellipse cx="-4" cy="-3" rx="9" ry="5" fill="#8794a0"/><ellipse cx="22" cy="3" rx="9" ry="5" fill="#5c6a76"/></g>'
      + '<g transform="translate(60 182)" fill="#5d9b5a" stroke="#3f7a45" stroke-width=".6">' + [-70, -45, -22, 0, 22, 45, 70].map((a) => '<path d="M0 0 L' + (Math.sin(a * Math.PI / 180) * 7) + ' ' + (-Math.cos(a * Math.PI / 180) * 7 * 3.2) + ' L' + (Math.sin(a * Math.PI / 180) * 7 + 4) + ' 0Z"/>').join('') + '<ellipse cx="2" cy="-2" rx="6" ry="3" fill="#d6455f" stroke="none"/></g>'
      + '<g transform="translate(150 186)"><path d="M0 0 a9 7 0 0 1 18 0 q-9 3 -18 0Z" fill="#f7dfd2"/><path d="M9 -1 v-6 M4 -1 l-1 -5 M14 -1 l1 -5" stroke="#e9b9a4" stroke-width=".9"/></g>'
      + '<path class="pt-ave" d="M70 52 q6 -7 12 0 q6 -7 12 0" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><path class="pt-ave a2" d="M104 38 q4.5 -5 9 0 q4.5 -5 9 0" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>'
      + brillos([[150, 118, 1.4], [240, 124, 1.2], [180, 132, 1.2]], '#ffffff');
  }


  const LEMA = { bosque: 'Niebla, helechos y el canto del chucao.', desierto: 'Cuando llueve, el desierto florece.', costa: 'Viento, sal y gaviotas al amanecer.' };
  const PIEZAS = { bosque: bosque, desierto: desierto, costa: costa };
  // Devuelve el SVG de la postal del lugar, o null si ese lugar no tiene postal propia.
  function postal(h) {
    const f = PIEZAS[h]; if (!f) return null;
    try { return '<svg class="il-postal-svg" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + f() + '</svg>'; } catch (e) { return null; }
  }
  window.TBArte = { postal: postal, lema: (h) => LEMA[h] || '' };
})();
