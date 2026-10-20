// calendario_imagen.js - F1311 · Imagen del mes para compartir con la iglesia (panel del pastor > Mi calendario > Mes).
// Solo lleva los SERVICIOS (turnos): quién sirve cada día. La agenda personal del pastor (visitas, reuniones, descanso)
// NO se incluye porque solo él la ve. Lee turno_pastor_listar (ya existe). Si el mes es largo, hace varias imágenes.
(function () {
  'use strict';
  const A = () => window.TBApp || {};
  const W = 1080, M = 48, COLS = 7, CW = Math.floor((W - 2 * M) / COLS);
  const ALTO_ITEM = 44, ALTO_DIA = 44, CABEZA = 190, PIE = 70, MAX_ALTO = 2800, MAX_ITEMS = 4;
  const PAPEL = '#f6efdf', TINTA = '#2b2218', VERDE = '#3f5d3a', ORO = '#b8862b', LINEA = '#d8ccb0', CELDA = '#fffaf0', VACIA = '#efe6d0';
  const SANS = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", serif';
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const msg = (t) => { const m = document.querySelector('#calImgMsg'); if (m) m.textContent = t; };
  const tituloMes = (y, m) => { const t = new Date(y, m, 1).toLocaleDateString('es-CL', { month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1) + ' ' + y; };

  function fit(ctx, t, max) {
    t = String(t == null ? '' : t);
    if (ctx.measureText(t).width <= max) return t;
    while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  // Semanas (lunes primero) con los servicios de cada día.
  function semanas(y, m, porDia) {
    const off = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < off; i++) celdas.push(null);
    for (let d = 1; d <= total; d++) celdas.push({ d, items: porDia[d] || [] });
    while (celdas.length % 7) celdas.push(null);
    const out = [];
    for (let i = 0; i < celdas.length; i += 7) out.push(celdas.slice(i, i + 7));
    return out;
  }

  function altoSemana(sem) {
    let mx = 0;
    sem.forEach((c) => { if (!c) return; const n = c.items.length; const h = Math.min(n, MAX_ITEMS) * ALTO_ITEM + (n > MAX_ITEMS ? 26 : 0); if (h > mx) mx = h; });
    return Math.max(120, ALTO_DIA + mx + 14);
  }

  // Reparte las semanas en imágenes para que ninguna pase de MAX_ALTO.
  function paginar(sems) {
    const paginas = [];
    let cur = [], alto = CABEZA + ALTO_DIA + PIE;
    sems.forEach((s) => {
      const h = altoSemana(s);
      if (cur.length && alto + h > MAX_ALTO) { paginas.push({ semanas: cur, alto }); cur = []; alto = CABEZA + ALTO_DIA + PIE; }
      cur.push({ s, h }); alto += h;
    });
    if (cur.length) paginas.push({ semanas: cur, alto });
    return paginas;
  }

  function dibujarPagina(pag, num, total, titulo, hayTurnos) {
    const c = document.createElement('canvas');
    c.width = W; c.height = pag.alto;
    const x = c.getContext('2d');
    x.fillStyle = PAPEL; x.fillRect(0, 0, W, c.height);
    x.fillStyle = VERDE; x.fillRect(0, 0, W, 18);

    x.textBaseline = 'alphabetic';
    x.fillStyle = TINTA; x.font = 'bold 62px ' + SERIF;
    x.fillText('Calendario de ' + titulo.toLowerCase(), M, 100);
    x.fillStyle = VERDE; x.font = '30px ' + SANS;
    const sub = hayTurnos ? 'Quién sirve cada día' + (total > 1 ? ' · ' + num + ' de ' + total : '') : 'Aún no hay servicios asignados este mes';
    x.fillText(sub, M, 146);

    let y = CABEZA;
    x.fillStyle = VERDE; x.font = 'bold 22px ' + SANS; x.textAlign = 'center';
    DIAS.forEach((d, i) => x.fillText(d.slice(0, 3).toUpperCase(), M + i * CW + CW / 2, y + 26));
    x.textAlign = 'left';
    y += ALTO_DIA;

    pag.semanas.forEach(({ s, h }) => {
      s.forEach((cel, col) => {
        const cx = M + col * CW, cy = y;
        x.fillStyle = cel ? CELDA : VACIA;
        x.fillRect(cx + 2, cy + 2, CW - 4, h - 4);
        x.strokeStyle = LINEA; x.lineWidth = 2; x.strokeRect(cx + 2, cy + 2, CW - 4, h - 4);
        if (!cel) return;
        x.fillStyle = cel.items.length ? TINTA : '#8a7d63';
        x.font = 'bold 28px ' + SANS;
        x.fillText(String(cel.d), cx + 12, cy + 32);
        const tx = cx + 14, maxW = CW - 26;
        const n = cel.items.length;
        cel.items.slice(0, MAX_ITEMS).forEach((t, i) => {
          const iy = cy + ALTO_DIA + i * ALTO_ITEM;
          x.fillStyle = '#e7efdf'; x.fillRect(tx - 4, iy, CW - 22, ALTO_ITEM - 6);
          x.fillStyle = VERDE; x.fillRect(tx - 4, iy, 5, ALTO_ITEM - 6);
          const hora = new Date(t.inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          x.fillStyle = TINTA; x.font = 'bold 18px ' + SANS;
          x.fillText(fit(x, t.titulo, maxW), tx + 8, iy + 18);
          x.fillStyle = '#5d4d2e'; x.font = '16px ' + SANS;
          x.fillText(fit(x, hora + ' · ' + (t.miembro || ''), maxW), tx + 8, iy + 36);
        });
        if (n > MAX_ITEMS) {
          x.fillStyle = ORO; x.font = 'bold 17px ' + SANS;
          x.fillText('+' + (n - MAX_ITEMS) + ' más', tx + 4, cy + ALTO_DIA + MAX_ITEMS * ALTO_ITEM + 14);
        }
      });
      y += h;
    });

    x.fillStyle = '#7a6a4a'; x.font = '24px ' + SANS;
    x.fillText('Hecho con Tierra Buena', M, c.height - 30);
    return c;
  }

  const aBlob = (c) => new Promise((ok) => c.toBlob((b) => ok(b), 'image/png'));

  async function servicios(p, y, m) {
    const sb = A().sb;
    if (!sb) return { ok: false };
    try {
      const { data, error } = await sb.rpc('turno_pastor_listar', {
        p_codigo: p.codigo, p_secreto: p.secreto,
        p_desde: new Date(y, m, 1).toISOString(), p_hasta: new Date(y, m + 1, 1).toISOString()
      });
      if (error) return { ok: false };
      return { ok: true, filas: (data || []).slice().sort((a, b) => new Date(a.inicio) - new Date(b.inicio)) };
    } catch (e) { return { ok: false }; }
  }

  async function compartir(files, titulo) {
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: titulo }); return 'compartido'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
    }
    // Sin menú de compartir (computador): descargar cada imagen
    files.forEach((f) => {
      const url = URL.createObjectURL(f), a = document.createElement('a');
      a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });
    return 'descargado';
  }

  // Crea la(s) imagen(es) del mes de `ref` y las comparte.
  async function abrir(p, ref) {
    const y = ref.getFullYear(), m = ref.getMonth();
    const btn = document.querySelector('#calImgBtn');
    if (btn) btn.disabled = true;
    msg('Preparando la imagen del mes…');
    try {
      const r = await servicios(p, y, m);
      if (!r.ok) { msg('No pudimos leer los servicios del mes. Revisa tu conexión.'); return; }
      const porDia = {};
      r.filas.forEach((t) => { const d = new Date(t.inicio).getDate(); (porDia[d] = porDia[d] || []).push(t); });
      const titulo = tituloMes(y, m);
      const paginas = paginar(semanas(y, m, porDia));
      const files = [];
      for (let i = 0; i < paginas.length; i++) {
        const blob = await aBlob(dibujarPagina(paginas[i], i + 1, paginas.length, titulo, r.filas.length > 0));
        if (!blob) throw new Error('canvas');
        const nombre = 'calendario-' + y + '-' + String(m + 1).padStart(2, '0') + (paginas.length > 1 ? '-' + (i + 1) + 'de' + paginas.length : '') + '.png';
        files.push(new File([blob], nombre, { type: 'image/png' }));
      }
      const res = await compartir(files, 'Calendario de ' + titulo);
      msg(res === 'descargado' ? 'Imagen' + (files.length > 1 ? 'es' : '') + ' descargada' + (files.length > 1 ? 's' : '') + '.'
        : res === 'compartido' ? 'Listo: imagen' + (files.length > 1 ? 'es' : '') + ' compartida' + (files.length > 1 ? 's' : '') + '.' : '');
    } catch (e) {
      msg('No pudimos crear la imagen. Intenta de nuevo.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  window.TBCalImagen = { abrir };
})();
