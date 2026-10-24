/* F1409 · 3.1 Agenda con vistas Lista, Semana y Mes, con un color por ministerio.
   Se monta sobre la lista de la agenda que ya existe (no cambia nada de los datos ni pide SQL).
   Los colores salen de una paleta fija por clases CSS (la política de seguridad bloquea los atributos style). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const N_COLORES = 8;

  // ---------- Lógica pura (se prueba sin navegador) ----------
  const claveDia = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function lunesDe(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  // Todas las casillas del mes, de lunes a domingo, completando semanas enteras.
  function celdasMes(anio, mes) {
    const ultimo = new Date(anio, mes + 1, 0), out = [], d = lunesDe(new Date(anio, mes, 1));
    while (d <= ultimo || out.length % 7 !== 0) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function diasSemana(fecha) { const d = lunesDe(fecha); return Array.from({ length: 7 }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)); }
  function agruparPorDia(lista) {
    const m = {};
    (lista || []).forEach((e) => { const f = new Date(e.inicio); if (isNaN(f)) return; (m[claveDia(f)] = m[claveDia(f)] || []).push(e); });
    Object.keys(m).forEach((k) => m[k].sort((a, b) => new Date(a.inicio) - new Date(b.inicio)));
    return m;
  }
  // El mismo ministerio siempre da el mismo color; sin ministerio usa el color 0.
  function indiceColor(e) {
    const base = String((e && (e.ministerio_id || e.ministerio)) || '');
    if (!base) return 0;
    let h = 0; for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
    return h % N_COLORES;
  }
  const claseColor = (e) => 'agv-c' + indiceColor(e);
  function leyenda(lista) {
    const vistos = {}, out = [];
    (lista || []).forEach((e) => { const n = e.ministerio || 'Toda la iglesia'; if (!vistos[n]) { vistos[n] = 1; out.push({ nombre: n, clase: claseColor(e) }); } });
    return out;
  }
  const nombreMes = (d) => d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const nombreDia = (d) => d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---------- Pantalla ----------
  function montar(op) {
    const lista = op.lista || [], pintarEvento = op.pintarEvento;
    const ant = document.querySelector(op.antes); if (!ant || !lista.length) return;
    if (document.getElementById('agvBarra')) return;
    const porDia = agruparPorDia(lista);
    const hoy = new Date();
    let vista = 'lista', ref = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), elegido = claveDia(hoy);

    ant.insertAdjacentHTML('beforebegin',
      '<div class="agv-barra" id="agvBarra" role="group" aria-label="Cómo ver la agenda">' +
      [['lista', 'Lista'], ['semana', 'Semana'], ['mes', 'Mes']].map((v) => '<button type="button" class="cp-chip" data-agv="' + v[0] + '" aria-pressed="' + (v[0] === 'lista' ? 'true' : 'false') + '">' + v[1] + '</button>').join('') +
      '</div><div id="agvCuerpo" aria-live="polite"></div>');
    const cuerpo = document.getElementById('agvCuerpo');

    const eventosDe = (k) => (porDia[k] || []).map((e) => pintarEvento(e)).join('') || '<p class="suave">No hay actividades este día.</p>';
    const puntos = (k) => (porDia[k] || []).slice(0, 4).map((e) => '<i class="agv-punto ' + claseColor(e) + '"></i>').join('');
    const ley = () => { const l = leyenda(lista); return l.length > 1 || (l[0] && l[0].nombre !== 'Toda la iglesia') ? '<div class="agv-leyenda" aria-label="Colores por ministerio">' + l.map((x) => '<span><i class="agv-punto ' + x.clase + '"></i>' + esc(x.nombre) + '</span>').join('') + '</div>' : ''; };

    function pintarMes() {
      const celdas = celdasMes(ref.getFullYear(), ref.getMonth());
      cuerpo.innerHTML = '<div class="agv-nav"><button type="button" class="btn chico sec" data-agv-nav="-1" aria-label="Mes anterior">‹</button><b>' + esc(nombreMes(ref)) + '</b><button type="button" class="btn chico sec" data-agv-nav="1" aria-label="Mes siguiente">›</button></div>' +
        '<div class="agv-rejilla">' + DIAS.map((d) => '<div class="agv-cab" aria-hidden="true">' + d + '</div>').join('') +
        celdas.map((d) => { const k = claveDia(d), n = (porDia[k] || []).length;
          return '<button type="button" class="agv-dia' + (d.getMonth() !== ref.getMonth() ? ' fuera' : '') + (k === claveDia(hoy) ? ' hoy' : '') + '" data-agv-dia="' + k + '" aria-pressed="' + (k === elegido ? 'true' : 'false') + '" aria-label="' + esc(nombreDia(d)) + ', ' + n + (n === 1 ? ' actividad' : ' actividades') + '"><span>' + d.getDate() + '</span><span class="agv-puntos">' + puntos(k) + '</span></button>'; }).join('') +
        '</div>' + ley() + '<h2 class="mi-sub" id="agvTitulo"></h2><div id="agvDetalle"></div>';
      mostrarDia();
    }
    function mostrarDia() {
      const t = document.getElementById('agvTitulo'), d = document.getElementById('agvDetalle'); if (!t || !d) return;
      const f = new Date(elegido + 'T00:00:00'); t.textContent = nombreDia(f); d.innerHTML = eventosDe(elegido);
    }
    function pintarSemana() {
      const dias = diasSemana(ref);
      cuerpo.innerHTML = '<div class="agv-nav"><button type="button" class="btn chico sec" data-agv-nav="-1" aria-label="Semana anterior">‹</button><b>' + esc(dias[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })) + ' – ' + esc(dias[6].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })) + '</b><button type="button" class="btn chico sec" data-agv-nav="1" aria-label="Semana siguiente">›</button></div>' + ley() +
        dias.map((d) => { const k = claveDia(d); return '<h2 class="mi-sub agv-semana-dia' + (k === claveDia(hoy) ? ' hoy' : '') + '">' + esc(nombreDia(d)) + '</h2>' + ((porDia[k] || []).length ? eventosDe(k) : '<p class="suave">Sin actividades.</p>'); }).join('');
    }
    function pintar() {
      const lst = document.querySelector(op.antes);
      if (lst) lst.hidden = vista !== 'lista';
      if (vista === 'lista') { cuerpo.innerHTML = ''; return; }
      if (vista === 'mes') pintarMes(); else pintarSemana();
    }
    document.getElementById('agvBarra').querySelectorAll('[data-agv]').forEach((b) => b.onclick = () => {
      vista = b.getAttribute('data-agv');
      document.getElementById('agvBarra').querySelectorAll('[data-agv]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      pintar();
    });
    cuerpo.addEventListener('click', (ev) => {
      const nav = ev.target.closest('[data-agv-nav]'), dia = ev.target.closest('[data-agv-dia]');
      if (nav) {
        const s = parseInt(nav.getAttribute('data-agv-nav'), 10);
        ref = vista === 'mes' ? new Date(ref.getFullYear(), ref.getMonth() + s, 1) : new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 7 * s);
        pintar();
      } else if (dia) {
        elegido = dia.getAttribute('data-agv-dia');
        cuerpo.querySelectorAll('[data-agv-dia]').forEach((x) => x.setAttribute('aria-pressed', x === dia ? 'true' : 'false'));
        mostrarDia();
      }
    });
  }

  window.TBAgendaVistas = { montar, _t: { claveDia, lunesDe, celdasMes, diasSemana, agruparPorDia, indiceColor, claseColor, leyenda, N_COLORES } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBAgendaVistas;
})();
