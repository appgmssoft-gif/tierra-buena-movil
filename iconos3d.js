// iconos3d.js — versión 2.5D de los iconos de la app (degradados, brillo y sombra de base).
// Se carga después de iconos.js. Expone TB.svg3d(nombre, tamaño) y TB.iconos3d.
// Cada llamada crea sus propios degradados con id único, para que no se mezclen entre pantallas.
(function () {
  'use strict';
  window.TB = window.TB || {};
  const DEFS = `<defs>
<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9bc28f"/><stop offset="1" stop-color="#3f5d3a"/></linearGradient>
<linearGradient id="go" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset="1" stop-color="#b8893a"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6b8a8"/><stop offset="1" stop-color="#c4604a"/></linearGradient>
<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cdf0"/><stop offset="1" stop-color="#4a7fb0"/></linearGradient>
<linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#e6dcc4"/></linearGradient>
<linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a77a"/><stop offset="1" stop-color="#9a6a45"/></linearGradient>
</defs>`;
  const SH = '<ellipse cx="24" cy="44.5" rx="14" ry="2.4" fill="#2b2218" opacity=".22"/>';
  const HI = (d) => `<path d="${d}" fill="#fff" opacity=".45"/>`;
  const I = {
    persona: '<circle cx="24" cy="16" r="8" fill="url(#go)"/>'+HI('M18.5 12.5c1.2-3 3-4.5 5.5-4.5-2.5 1-4 2.5-4.5 5z')+'<path d="M8 42c0-9.4 7.2-15 16-15s16 5.6 16 15z" fill="url(#gv)"/>',
  'calendario': '<rect x="6" y="9" width="36" height="32" rx="6" fill="url(#gp)" stroke="#bfae84" stroke-width="1"/><path d="M6 17a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v5H6z" fill="url(#gr)"/><rect x="14.5" y="5" width="4" height="8" rx="2" fill="#5c5040"/><rect x="29.5" y="5" width="4" height="8" rx="2" fill="#5c5040"/><text x="24" y="37" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#2b2218">17</text>',
  'libro': '<path d="M3 13Q24 6 45 13V38Q24 32 3 38Z" fill="url(#gv)"/><path d="M24 15C18 12 11 12 6 14V36C11 34 18 34 24 37Z" fill="url(#gp)"/><path d="M24 15C30 12 37 12 42 14V36C37 34 30 34 24 37Z" fill="url(#gp)"/><path d="M8 19h11M8 23h11M8 27h9M29 19h11M29 23h11M29 27h9" stroke="#c9b98f" stroke-width="1.2" stroke-linecap="round"/>',
  'corazon': '<path d="M24 41C10 31 5 23 5 16.5 5 10.5 9.5 6 15.5 6c3.8 0 6.6 2 8.5 5 1.9-3 4.7-5 8.5-5C39.5 6 44 10.5 44 16.5 44 23 39 31 24 41z" fill="url(#gr)"/>'+HI('M11 13.5c0-2.2 1.6-3.8 3.8-3.8 0 0-2.5 .8-3 3.4z'),
  'casa': '<path d="M5 23 24 7l19 16v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="url(#gp)" stroke="#bfae84" stroke-width="1"/><path d="M3 24 24 6l21 18" fill="none" stroke="url(#go)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="28" width="10" height="12" rx="2" fill="url(#gv)"/><rect x="10" y="25" width="6" height="6" rx="1" fill="url(#gb)"/><rect x="32" y="25" width="6" height="6" rx="1" fill="url(#gb)"/>',
  'iglesia': '<path d="M11 42V22l13-12 13 12v20z" fill="url(#gp)" stroke="#bfae84" stroke-width="1"/><path d="M8 24 24 9l16 15" fill="none" stroke="url(#go)" stroke-width="4" stroke-linejoin="round"/><path d="M24 2v7M21 5h6" stroke="#b8893a" stroke-width="2.4" stroke-linecap="round"/><path d="M19 42V31a5 5 0 0 1 10 0v11z" fill="url(#gv)"/><circle cx="24" cy="21" r="2.6" fill="url(#gb)"/>',
  'gente': '<circle cx="17" cy="16" r="6" fill="url(#go)"/><circle cx="32" cy="16" r="6" fill="url(#gr)"/><path d="M5 41c0-8 5-13 12-13s12 5 12 13z" fill="url(#go)"/><path d="M26 41c0-8 4-13 10-13s9 5 9 13z" fill="url(#gr)"/>',
  'check': '<circle cx="24" cy="24" r="18" fill="url(#gv)"/>'+HI('M12 17a14 14 0 0 1 9-7c-5 1-9 5-9 7z')+'<path d="M14 25l7 7 13-14" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>',
  'chat': '<path d="M7 9h34a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H20l-9 7v-7H7a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" fill="url(#gb)"/>'+HI('M9 12h30v3H9z')+'<circle cx="16" cy="22" r="2.6" fill="#fff"/><circle cx="24" cy="22" r="2.6" fill="#fff"/><circle cx="32" cy="22" r="2.6" fill="#fff"/>',
  'altavoz': '<path d="M6 18h8l12-9v30l-12-9H6z" fill="url(#go)"/>'+HI('M7 19h6l10-7v3l-8 6H7z')+'<path d="M32 17a9 9 0 0 1 0 14M37 12a16 16 0 0 1 0 24" fill="none" stroke="#b8893a" stroke-width="3" stroke-linecap="round"/>',
  'brote': '<path d="M12 28h24l-3 12a3 3 0 0 1-3 2H18a3 3 0 0 1-3-2z" fill="url(#gt)"/><path d="M24 28V16" stroke="#3f5d3a" stroke-width="2.4" stroke-linecap="round"/><path d="M24 20C24 11 17 6 9 7c0 8 6 13 15 13z" fill="url(#gv)"/><path d="M24 17c0-7 6-12 15-11 0 8-6 12-15 11z" fill="url(#gv)"/>',
  'estrella': '<path d="M24 4l5.9 12.6 13.8 1.8-10.2 9.4 2.7 13.7L24 34.3 11.8 41.5l2.7-13.7L4.3 18.4l13.8-1.8z" fill="url(#go)" stroke="#b8893a" stroke-width="1" stroke-linejoin="round"/>'+HI('M24 8l2.6 6-5 0z'),
  'campana': '<path d="M24 5c-7 0-11 5.5-11 13v9l-4 6h30l-4-6v-9c0-7.5-4-13-11-13z" fill="url(#go)"/>'+HI('M17 16c0-4 2-7 5-8-2 2-3 4-3 8z')+'<path d="M20 38a4 4 0 0 0 8 0" fill="url(#gt)"/>',
  };
  let uid = 0;
  const svg3d = (nombre, tamano) => {
    const cuerpo = I[nombre];
    if (!cuerpo) return '';
    const sufijo = 'i3-' + (++uid);
    const defs = DEFS.replace(/id="(g[a-z])"/g, (m, g) => `id="${g}-${sufijo}"`).replace(/url\(#(g[a-z])\)/g, (m, g) => `url(#${g}-${sufijo})`);
    const ref = cuerpo.replace(/url\(#(g[a-z])\)/g, (m, g) => `url(#${g}-${sufijo})`);
    return `<svg viewBox="0 0 48 48" width="${tamano}" height="${tamano}" aria-hidden="true" focusable="false">${defs}${SH}${ref}</svg>`;
  };
  window.TB.svg3d = svg3d;
  window.TB.iconos3d = Object.keys(I);
})();
