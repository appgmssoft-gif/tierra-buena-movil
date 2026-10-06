// rendimiento.js - F902. Que el teléfono NO se caliente, sin quitar efectos ni decoración.
// Idea: no gastar energía en lo que nadie está mirando.
//  1) Toda animación «infinita» se pausa cuando está fuera de la pantalla, mientras se desliza, o con la app en segundo plano.
//  2) Mide la fluidez real del teléfono. Si va justo, pasa solo a «Equilibrado» (cristal liso) y, si sigue justo, a «Ahorro» (lo que se mueve se queda quieto, la decoración sigue).
//  3) Botón de acceso rápido «Efectos y sonido» (arriba a la derecha) para cambiarlo con un toque.
// CSP: sin atributo style en el HTML.
'use strict';
(function () {
  const K = 'tb_movil_efectos';          // 'auto' | '0' completo | '1' equilibrado | '2' ahorro
  const H = document.documentElement;
  const A = () => window.TBApp || {};
  const leer = () => { try { const v = localStorage.getItem(K); return v === '0' || v === '1' || v === '2' ? v : 'auto'; } catch (e) { return 'auto'; } };
  const poner = (v) => { try { localStorage.setItem(K, v); } catch (e) { /* sin guardar */ } };
  let nivelAuto = 0;                     // lo que decidió la medición (solo se sube, nunca baja hasta reabrir)
  const aplicar = () => { const m = leer(); H.setAttribute('data-eco', m === 'auto' ? String(nivelAuto) : m); };

  // ---- 1) pausar lo que no se ve ----
  let sels = [], io = null;
  function buscarAnimadas() {
    const s = [];
    try {
      Array.prototype.forEach.call(document.styleSheets, (hoja) => {
        let reglas; try { reglas = hoja.cssRules; } catch (e) { return; }
        const rec = (rs) => Array.prototype.forEach.call(rs || [], (r) => {
          if (r.cssRules && !r.selectorText) return rec(r.cssRules);
          if (!r.style || !r.selectorText) return;
          const a = (r.style.animation || '') + ' ' + (r.style.animationIterationCount || '');
          if (/infinite/.test(a)) r.selectorText.split(',').forEach((x) => { x = x.replace(/::?(before|after)/g, '').replace(/:(hover|active|focus)[^,]*/g, '').trim(); if (x && !/^html\b\s*$/.test(x)) s.push(x); });
        });
        rec(reglas);
      });
    } catch (e) { /* sin lectura de estilos */ }
    return Array.from(new Set(s));
  }
  function marcar() {
    if (!sels.length) return;
    sels.forEach((q) => { let l; try { l = document.querySelectorAll(q); } catch (e) { return; } Array.prototype.forEach.call(l, (el) => { if (el.classList.contains('tb-anima')) return; el.classList.add('tb-anima'); if (io) io.observe(el); }); });
  }
  let deb = 0; const luego = () => { if (deb) return; deb = setTimeout(() => { deb = 0; marcar(); }, 350); };
  function iniciarPausas() {
    sels = buscarAnimadas();
    if (typeof IntersectionObserver === 'function') io = new IntersectionObserver((en) => { en.forEach((e) => e.target.classList.toggle('tb-fuera', !e.isIntersecting)); }, { rootMargin: '60px' });
    marcar();
    try { new MutationObserver(luego).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* sin observador */ }
    document.addEventListener('visibilitychange', () => { H.classList.toggle('tb-pausa', document.hidden); });
    let t = 0; window.addEventListener('scroll', () => { if (!H.classList.contains('tb-scroll')) H.classList.add('tb-scroll'); clearTimeout(t); t = setTimeout(() => H.classList.remove('tb-scroll'), 160); }, { passive: true });
  }

  // ---- 2) medir la fluidez ----
  function medir(ms, fin) {
    if (typeof requestAnimationFrame !== 'function' || document.hidden) return fin(60);
    let n = 0, t0 = 0, ult = 0, lentos = 0;
    const paso = (t) => {
      if (!t0) { t0 = t; ult = t; } else { if (t - ult > 34) lentos++; ult = t; n++; }
      if (t - t0 < ms && !document.hidden) requestAnimationFrame(paso); else { const s = Math.max(1, (t - t0) / 1000); fin(Math.min(60, n / s), lentos / Math.max(1, n)); }
    };
    requestAnimationFrame(paso);
  }
  function vigilar() {
    if (leer() !== 'auto') return;
    try { const c = navigator.hardwareConcurrency || 8, m = navigator.deviceMemory || 4; if (c <= 4 || m <= 2) { nivelAuto = Math.max(nivelAuto, 1); aplicar(); } } catch (e) { /* sin datos */ }
    try { if (navigator.getBattery) navigator.getBattery().then((b) => { if (!b.charging && b.level <= 0.2) { nivelAuto = Math.max(nivelAuto, 1); aplicar(); } }); } catch (e) { /* sin batería */ }
    const ronda = () => {
      if (leer() !== 'auto') return;
      medir(1600, (fps, lentos) => {
        if (fps < 38 || lentos > 0.25) { if (nivelAuto < 2) { nivelAuto++; aplicar(); } }
        setTimeout(ronda, nivelAuto >= 2 ? 120000 : 45000);
      });
    };
    setTimeout(ronda, 6000);             // espera a que termine la apertura
  }

  // ---- 3) acceso rápido ----
  const sonOn = () => { try { return !window.TBSonido || window.TBSonido.activo(); } catch (e) { return true; } };
  const movOn = () => { try { return H.getAttribute('data-anim') !== 'off'; } catch (e) { return true; } };
  function hoja() {
    if (document.getElementById('tbRap')) return;
    const m = leer();
    const caja = document.createElement('div'); caja.className = 'tb-hoja-r'; caja.id = 'tbRap'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-label', 'Efectos y sonido');
    caja.innerHTML = `<div><h2>Efectos y sonido</h2><p>Cámbialos cuando quieras. Si tu teléfono se calienta, elige «Ahorro»: la decoración se queda, solo se detiene lo que se mueve.</p>
      <div class="tb-fila"><span class="ic" aria-hidden="true">🔊</span><span class="tx"><b>Sonidos</b><small>La melodía y los sonidos al tocar.</small></span><button type="button" class="tb-int" id="rpSon" aria-pressed="${sonOn()}">${sonOn() ? 'Activos' : 'Apagados'}</button></div>
      <div class="tb-fila"><span class="ic" aria-hidden="true">✨</span><span class="tx"><b>Animaciones</b><small>Movimiento en pantallas y botones.</small></span><button type="button" class="tb-int" id="rpMov" aria-pressed="${movOn()}">${movOn() ? 'Activas' : 'Quietas'}</button></div>
      <div class="tb-fila"><span class="ic" aria-hidden="true">🌡️</span><span class="tx"><b>Cuidar el teléfono</b><small>Menos calor y más batería.</small><span class="tb-niv" role="group" aria-label="Cuidar el teléfono"><button type="button" data-n="auto" aria-pressed="${m === 'auto'}">Auto</button><button type="button" data-n="0" aria-pressed="${m === '0'}">Completo</button><button type="button" data-n="1" aria-pressed="${m === '1'}">Equilibrado</button><button type="button" data-n="2" aria-pressed="${m === '2'}">Ahorro</button></span></span></div>
      <button type="button" class="tb-cerrar" id="rpOk">Listo</button></div>`;
    document.body.appendChild(caja);
    const cerrar = () => { try { caja.remove(); } catch (e) { /* ya cerrada */ } };
    caja.addEventListener('click', (ev) => { if (ev.target === caja) cerrar(); });
    document.getElementById('rpOk').onclick = cerrar;
    document.getElementById('rpSon').onclick = (ev) => { const v = !sonOn(); try { if (window.TBSonido) window.TBSonido.poner(v); } catch (e) { /* sin sonido */ } ev.currentTarget.setAttribute('aria-pressed', String(v)); ev.currentTarget.textContent = v ? 'Activos' : 'Apagados'; };
    document.getElementById('rpMov').onclick = (ev) => { const v = !movOn(); try { if (A().guardarAjuste) A().guardarAjuste({ m: v ? 'on' : 'off' }); else H.setAttribute('data-anim', v ? 'on' : 'off'); } catch (e) { /* sin guardar */ } ev.currentTarget.setAttribute('aria-pressed', String(v)); ev.currentTarget.textContent = v ? 'Activas' : 'Quietas'; };
    Array.prototype.forEach.call(caja.querySelectorAll('.tb-niv button'), (b) => { b.onclick = () => { poner(b.dataset.n); if (b.dataset.n === 'auto') nivelAuto = 0; aplicar(); Array.prototype.forEach.call(caja.querySelectorAll('.tb-niv button'), (x) => x.setAttribute('aria-pressed', String(x === b))); if (b.dataset.n === 'auto') vigilar(); }; });
    document.getElementById('rpOk').focus();
  }
  function boton() {
    if (document.getElementById('tbRapido')) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'tbRapido'; b.className = 'tb-rapido'; b.setAttribute('aria-label', 'Efectos y sonido'); b.textContent = '🎚️';
    b.onclick = hoja; document.body.appendChild(b);
  }

  aplicar();
  const arranque = () => { iniciarPausas(); vigilar(); boton(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranque); else arranque();
  window.TBRendimiento = { nivel: () => H.getAttribute('data-eco'), abrir: hoja };
})();
