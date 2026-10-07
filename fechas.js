// fechas.js - F921. CALENDARIO Y AVISOS DENTRO DE LA APP para todo lo que tenga fecha: movimientos de Juntos, actividades de la agenda de la iglesia
// (se guardan en el teléfono al abrir la Agenda) y fechas del Calendario santo. Avisa dentro de la app (sin permisos del teléfono) y marca el ícono de Juntos.
// Lenguaje: respetuoso y cordial, neutro (ver compartido/docs/TAREAS.md).
'use strict';
(function () {
  const DIA = 86400000, K_AVISO = 'tb_movil_fechas_aviso', K_AGENDA = 'tb_movil_agenda_cache';
  const UMBRALES = { juntos: [30, 14, 7, 3, 1, 0], agenda: [7, 1, 0], santa: [1, 0] };
  const leer = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin guardar */ } };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dia0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const diasPara = (f) => Math.round((dia0(f) - dia0(new Date())) / DIA);
  const snd = (n, a) => { try { if (window.TBSonido && window.TBSonido[n]) window.TBSonido[n](a); } catch (e) { /* sin sonido */ } };

  function fuentes() {
    const l = [];
    try { (window.TBJuntos ? window.TBJuntos.proximos() : []).forEach((x) => l.push({ id: 'j' + x.m.id, t: x.m.t, f: new Date(x.m.fecha + 'T12:00:00'), lugar: x.m.lugar || '', tipo: 'juntos', ic: '🌱' })); } catch (e) { /* sin Juntos */ }
    try { (leer(K_AGENDA, []) || []).forEach((e) => { const f = new Date(e.fecha); if (!isNaN(f)) l.push({ id: 'a' + e.id, t: e.t, f, lugar: e.lugar || '', tipo: 'agenda', ic: '📅' }); }); } catch (e) { /* sin agenda */ }
    try { (window.TBApp && window.TBApp.fechasProx ? window.TBApp.fechasProx() : []).forEach((e) => l.push({ id: e.id, t: e.t, f: e.fecha, lugar: '', tipo: 'santa', ic: '🕊️' })); } catch (e) { /* sin calendario */ }
    return l.map((x) => Object.assign(x, { d: diasPara(x.f) })).filter((x) => x.d >= 0).sort((a, b) => a.f - b.f);
  }
  const cuando = (x) => x.d === 0 ? 'Hoy' : x.d === 1 ? 'Mañana' : 'En ' + x.d + ' días';
  const frase = (x) => cuando(x) + ': «' + x.t + '»' + (x.lugar ? ' · ' + x.lugar : '');
  function recordHTML() {
    const l = fuentes().filter((x) => x.d <= (x.tipo === 'juntos' ? 30 : 7));
    if (!l.length) return '';
    return '<div class="card tbj-record"><div class="t"><span aria-hidden="true">🔔</span>Próximamente</div><ul>' + l.slice(0, 6).map((x) => '<li>' + esc(x.ic + ' ' + frase(x)) + '</li>').join('') + '</ul></div>';
  }
  function listaHTML(tipos) {
    const l = fuentes().filter((x) => !tipos || tipos.indexOf(x.tipo) >= 0); if (!l.length) return '';
    return l.map((x) => '<div class="fila cal-fila"><span class="fila-ico t2" aria-hidden="true">' + x.ic + '</span><span class="fila-txt"><b>' + esc(x.t) + '</b><small>' + esc(x.f.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + cuando(x).toLowerCase() + (x.lugar ? ' · ' + x.lugar : '')) + '</small></span></div>').join('');
  }
  function aviso(txt) {
    try { const o = document.querySelector('.tb-aviso'); if (o) o.remove(); const d = document.createElement('div'); d.className = 'tb-aviso'; d.setAttribute('role', 'status'); d.textContent = txt; document.body.appendChild(d); setTimeout(() => { try { d.remove(); } catch (e) { /* nada */ } }, 4200); } catch (e) { /* nada */ }
  }
  function avisarHoy() {
    try {
      const ya = leer(K_AVISO, {}) || {}, pend = [], hoyK = dia0(new Date()).getTime();
      Object.keys(ya).forEach((k) => { if (ya[k] < hoyK - 60 * DIA) delete ya[k]; });   // se limpia lo viejo
      fuentes().forEach((x) => { const u = (UMBRALES[x.tipo] || []).filter((t) => x.d <= t).pop(); if (u == null) return; const k = x.id + ':' + u; if (!ya[k]) { ya[k] = hoyK; pend.push(x); } });
      guardar(K_AVISO, ya);
      if (!pend.length) return;
      snd('recordatorio', pend.some((x) => x.d === 0));
      aviso(pend.length === 1 ? frase(pend[0]) : 'Tienes ' + pend.length + ' fechas próximas en tu iglesia.');
    } catch (e) { /* sin aviso */ }
  }
  function punto() { try { const b = document.getElementById('ilJuntos'); if (b) b.classList.toggle('tbj-punto', fuentes().some((x) => x.tipo === 'juntos' && x.d <= 7)); } catch (e) { /* nada */ } }
  try { new MutationObserver(punto).observe(document.getElementById('pantalla') || document.body, { childList: true }); } catch (e) { /* sin punto */ }
  setTimeout(() => { avisarHoy(); punto(); }, 2800);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { avisarHoy(); punto(); } });
  window.TBFechas = { proximos: fuentes, listaHTML, recordHTML, avisarHoy };
})();
