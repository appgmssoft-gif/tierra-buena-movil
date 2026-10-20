// material.js - F1306 · «Material» dentro del editor de estudios y prédicas (Fase 3, equivalente al panel Material del escritorio).
// Una hoja que se abre sobre el editor, sin salir de él: sugiere personas, lugares, palabras, fechas, contexto e ilustraciones que acompañan
// al pasaje, busca en todo a la vez y pone lo elegido con un toque en el campo donde estás escribiendo. Usa los mismos datos de la Biblioteca de apoyo.
// CSP: sin atributo style en el HTML.
'use strict';
(function () {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sin = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const App = () => window.TBApp || {};
  const vibra = () => { try { if (App().vibra) App().vibra(); } catch (e) { /* sin vibración */ } };

  // Tipos: archivo, icono, nombre, cómo se escribe al ponerlo en el campo
  const cortar = (t, n) => { t = String(t || '').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };
  const TIPOS = {
    pe: { ico: '🧑', nom: 'Personas', poner: (o) => o.t + (o.s ? ' — ' + o.s : '') + (o.x ? '\n' + cortar(o.x, 500) : '') + (o.r ? ' (' + o.r.split(';')[0].trim() + ')' : '') },
    lu: { ico: '📍', nom: 'Lugares', poner: (o) => o.t + (o.s ? ' (' + o.s + ')' : '') + (o.x ? '\n' + cortar(o.x, 500) : '') },
    di: { ico: '📚', nom: 'Diccionario', poner: (o) => o.t + (o.s ? ' (' + o.s + ')' : '') + ': ' + cortar(o.x, 500) + (o.r ? '\nPasajes: ' + o.r : '') },
    or: { ico: '🔑', nom: 'Palabras originales', poner: (o) => o.t + (o.s ? ' (' + o.s + ')' : '') + ': ' + cortar(o.x, 500) + (o.r ? '\nPasajes: ' + o.r : '') },
    tl: { ico: '🕰️', nom: 'Fechas', poner: (o) => o.t + (o.s ? ' — ' + o.s : '') + (o.r ? '\nPasajes: ' + o.r : '') },
    cx: { ico: '🏺', nom: 'Contexto', poner: (o) => o.t + (o.s ? ' (' + o.s + ')' : '') + '\n' + cortar(o.x, 600) },
    li: { ico: '📜', nom: 'Libros', poner: (o) => 'Introducción a ' + o.t + (o.s ? ' (' + o.s + ')' : '') + '\n' + cortar(o.x, 600) },
    il: { ico: '💡', nom: 'Ilustraciones', poner: (o) => o.t + (o.s ? ' (tema: ' + o.s + ')' : '') + '\n' + cortar(o.x, 700) + (o.a ? '\nAplicación: ' + o.a : '') },
    te: { ico: '🗂️', nom: 'Temas', poner: (o) => o.t + (o.x ? ' — ' + cortar(o.x.split('\n')[0], 300) : '') }
  };
  const ORDEN = ['cx', 'li', 'pe', 'lu', 'tl', 'or', 'di', 'te', 'il'];
  const GRUPOS = [['todo', '✨ Todo', ORDEN], ['pe', '🧑 Personas', ['pe']], ['lu', '📍 Lugares', ['lu']], ['pal', '📚 Palabras', ['or', 'di']], ['tl', '🕰️ Fechas', ['tl']], ['cx', '🏺 Contexto', ['cx', 'li']], ['il', '💡 Ideas', ['il']], ['te', '🗂️ Temas', ['te']]];

  let datos = null, cargando = null;
  const cargar = () => {
    if (datos) return Promise.resolve(datos);
    if (cargando) return cargando;
    cargando = Promise.all(ORDEN.map((k) => fetch('datos/apoyo_' + k + '.json').then((r) => { if (!r.ok) throw new Error('x'); return r.json(); }).then((a) => [k, Array.isArray(a) ? a : []]).catch(() => [k, null]))).then((pares) => {
      const fallo = pares.every((p) => p[1] === null); if (fallo) { cargando = null; throw new Error('sin datos'); }
      datos = {}; pares.forEach(([k, a]) => { datos[k] = (a || []).map((o) => { o._k = k; o._b = sin(o.t + ' ' + o.s + ' ' + o.x); return o; }); }); return datos;
    }).catch((e) => { cargando = null; throw e; });
    return cargando;
  };

  // ---------- Referencias: «Génesis 2:7; Romanos 5:12-14; Mateo 5-7» → [{cod, c1, c2}] ----------
  const libros = () => { const b = App().biblia; return b && b.libros ? b.libros.map((l) => [l[0], sin(l[1]).replace(/[^a-z0-9]/g, ''), l[1]]) : []; };
  const refsDe = (txt, L) => {
    const out = [];
    String(txt || '').split(/[;]| a (?=[1-3]?\s?[A-ZÁÉÍÓÚ])/).forEach((seg) => {
      const m = /^\s*((?:[1-3]\s?)?[A-Za-zÁÉÍÓÚáéíóúñÑ]+(?:\s(?:de|del|los|las)\s[A-Za-zÁÉÍÓÚáéíóúñÑ]+)*)\s*(\d+)?(.*)$/.exec(seg); if (!m) return;
      const nom = sin(m[1]).replace(/[^a-z0-9]/g, ''), lib = L.find((l) => l[1] === nom); if (!lib || !m[2]) return;
      const c1 = Number(m[2]), resto = m[3] || '', r2 = /^\s*[-–]\s*(\d+)/.exec(resto);
      out.push({ cod: lib[0], c1, c2: resto.trim().charAt(0) === ':' ? c1 : (r2 ? Math.max(c1, Number(r2[1])) : c1) });
    });
    return out;
  };
  const sugeridos = (pasaje) => {
    const T = window.TBPredicas && window.TBPredicas._t, L = libros(); if (!T || !T.parseRef || !L.length || !datos) return [];
    const P = T.parseRef(pasaje); if (!P) return [];
    const res = [];
    ORDEN.forEach((k) => {
      (datos[k] || []).forEach((o) => {
        let ok = false;
        if (k === 'li') ok = sin(o.t).replace(/[^a-z0-9]/g, '') === sin(P.libro).replace(/[^a-z0-9]/g, '');
        else ok = refsDe(k === 'cx' ? o.s : o.r, L).some((r) => r.cod === P.cod && P.cap >= r.c1 && P.cap <= r.c2);
        if (ok) res.push(o);
      });
    });
    return res;
  };

  // ---------- Hoja ----------
  function abrir(opt) {
    opt = opt || {};
    const ov = document.createElement('div'); ov.className = 'pp-hoja mt-hoja'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Material');
    ov.innerHTML = '<div class="pp-hoja-c mt-c"><div class="mt-cab"><h2>🧰 Material</h2><button type="button" class="mt-x" id="mtX" aria-label="Cerrar">✕</button></div>' +
      '<p class="suave mt-dest" id="mtDest"></p><input type="text" id="mtQ" class="pp-busca" placeholder="Buscar personas, lugares, palabras…" autocomplete="off">' +
      '<div class="pp-chips mt-tabs" id="mtTabs" role="group" aria-label="Qué buscar"></div><div id="mtRes" class="mt-res" aria-live="polite"><p class="suave">Cargando material…</p></div></div>';
    document.body.appendChild(ov);
    const cerrar = () => ov.remove(); ov.querySelector('#mtX').onclick = cerrar; ov.addEventListener('click', (e) => { if (e.target === ov) cerrar(); });
    const dest = () => { const d = ov.querySelector('#mtDest'); if (d) d.textContent = 'Lo que toques se pone en: ' + (opt.etiqueta ? opt.etiqueta() : 'tu texto'); }; dest();
    let tab = 'todo', sug = [], lim = 30, abierto = '';
    const tabs = () => {
      const tb = ov.querySelector('#mtTabs'); if (!tb) return;
      const lista = (sug.length ? [['pas', '📖 Este pasaje (' + sug.length + ')', null]] : []).concat(GRUPOS);
      tb.innerHTML = lista.map((g) => '<button type="button" class="chip' + (tab === g[0] ? ' on' : '') + '" data-g="' + g[0] + '" aria-pressed="' + (tab === g[0]) + '">' + esc(g[1]) + '</button>').join('');
      tb.querySelectorAll('.chip').forEach((c) => { c.onclick = () => { vibra(); tab = c.dataset.g; lim = 30; abierto = ''; tabs(); pintar(); }; });
    };
    const pintar = () => {
      const r = ov.querySelector('#mtRes'), q = sin((ov.querySelector('#mtQ').value || '').trim()); if (!r || !datos) return;
      let base; if (tab === 'pas') base = sug; else { const g = GRUPOS.find((x) => x[0] === tab) || GRUPOS[0]; base = []; g[2].forEach((k) => { base = base.concat(datos[k] || []); }); }
      const hits = base.filter((o) => !q || o._b.indexOf(q) >= 0);
      if (!hits.length) { r.innerHTML = '<div class="pp-vacio"><p>No hay resultados.</p><p class="suave">' + (q ? 'Prueba con una palabra más corta.' : 'Prueba con otra pestaña.') + '</p></div>'; return; }
      r.innerHTML = hits.slice(0, lim).map((o, i) => { const T = TIPOS[o._k], on = abierto === o._k + ':' + o.t; return '<article class="mt-it' + (on ? ' open' : '') + '"><button type="button" class="mt-top" data-i="' + i + '" aria-expanded="' + on + '"><span class="mt-ico" aria-hidden="true">' + T.ico + '</span><span class="mt-tt"><b>' + esc(o.t) + '</b>' + (o.s ? '<small>' + esc(cortar(o.s, 70)) + '</small>' : '') + '</span></button>' + (on ? '<div class="mt-det"><p>' + esc(cortar(o.x, 900)).replace(/\n+/g, '<br>') + '</p>' + (o.r ? '<p class="suave">📖 ' + esc(o.r) + '</p>' : '') + '</div>' : (o.x ? '<p class="mt-pre">' + esc(cortar(o.x.split('\n')[0], 110)) + '</p>' : '')) + '<button type="button" class="btn mt-poner" data-p="' + i + '">➕ Poner</button></article>'; }).join('') + (hits.length > lim ? '<button type="button" class="btn sec" id="mtMas">Ver más (' + (hits.length - lim) + ')</button>' : '');
      r.querySelectorAll('.mt-top').forEach((b) => { b.onclick = () => { vibra(); const o = hits[Number(b.dataset.i)], id = o._k + ':' + o.t; abierto = abierto === id ? '' : id; pintar(); }; });
      r.querySelectorAll('.mt-poner').forEach((b) => { b.onclick = () => { vibra(); const o = hits[Number(b.dataset.p)], et = opt.poner ? opt.poner(TIPOS[o._k].poner(o)) : null; b.textContent = et ? '✓ Puesto en ' + et : 'No pude ponerlo'; b.classList.add('hecho'); dest(); }; });
      const m = r.querySelector('#mtMas'); if (m) m.onclick = () => { lim += 30; pintar(); };
    };
    let t = 0; ov.querySelector('#mtQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { lim = 30; abierto = ''; pintar(); }, 180); });
    cargar().then(() => { if (!ov.isConnected) return; sug = sugeridos(opt.pasaje); tab = sug.length ? 'pas' : 'todo'; tabs(); pintar(); }).catch(() => { const r = ov.querySelector('#mtRes'); if (r) r.innerHTML = '<p class="suave">Para abrir el material la primera vez necesitas internet. Después queda en tu teléfono.</p>'; });
  }

  const api = { abrir, _t: { refsDe, sugeridos, cargar } };
  if (typeof window !== 'undefined') window.TBMaterial = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
