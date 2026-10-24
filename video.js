/* F1410 · Videollamadas dentro de la app (tarea 3.5). Sin salir de la app.
   El video viaja directo entre los teléfonos (WebRTC). La app solo ayuda a conectarlos (SQL 67).
   Máximo 4 personas por sala. Si alguien no puede conectarse por su red, la app lo dice (ver notas en PLAN). */
(function () {
  'use strict';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LIMITE = 6;            // personas en la sala, incluida quien llama (malla: con más personas el teléfono se calienta)
  const LATIDO_MS = 2000;
  const STUN = [{ urls: 'stun:stun.l.google.com:19302' }];
  const MOT = {
    'sin-permiso': 'Esta reunión no es para tu chat. Pídele al pastor que te invite.',
    'sala-llena': 'La reunión ya tiene ' + LIMITE + ' personas. Intenta en unos minutos.',
    'no-estas-en-la-sala': 'Se cortó tu conexión con la reunión. Vuelve a entrar.',
    'datos-invalidos': 'No pudimos entrar. Intenta de nuevo.'
  };

  // ---------- Lógica pura (se prueba sin navegador) ----------
  // Para que dos personas no se ofrezcan a la vez: la de identificador menor es quien envía la oferta.
  function quienOfrece(miId, otroId) { return String(miId) < String(otroId); }
  function identidadNueva() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    let s = ''; for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
  function puedeEntrar(cantidadOtros) { return cantidadOtros < LIMITE - 1; }
  function nombreLimpio(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Persona'; }

  // ---------- Pantalla ----------
  function capaHTML(titulo) {
    return '<div class="vid-top"><b>' + esc(titulo) + '</b><span class="suave" id="vidCuenta">Conectando…</span></div>' +
      '<div class="vid-grid" id="vidGrid"><figure class="vid-caja"><video id="vidYo" autoplay playsinline muted></video><figcaption>Tú</figcaption></figure></div>' +
      '<div class="vid-barra">' +
      '<button type="button" class="btn sec" id="vidMic" aria-pressed="true">🎤 Micrófono</button>' +
      '<button type="button" class="btn sec" id="vidCam" aria-pressed="true">📷 Cámara</button>' +
      '<button type="button" class="btn" id="vidSalir">Salir</button></div>' +
      '<p class="suave" id="vidMsg" role="status" aria-live="polite"></p>';
  }

  async function abrir(sala, q, rpcRaw, nombre, titulo) {
    if (document.getElementById('tbVideo')) return;
    const aviso = (t) => { const m = document.getElementById('vidMsg'); if (m) m.textContent = t; else window.alert(t); };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) {
      return window.alert('Este teléfono no permite videollamadas dentro de la app. Prueba con otro navegador.');
    }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, facingMode: 'user' }, audio: true }); }
    catch (e) { return window.alert('Necesitamos permiso para la cámara y el micrófono. Actívalo en los ajustes del teléfono y vuelve a entrar.'); }

    const yo = identidadNueva();
    const miNombre = nombreLimpio(nombre);
    const entrada = await rpcRaw('video_entrar', Object.assign({}, q, { p_sala: sala, p_participante: yo, p_nombre: miNombre }));
    const d = entrada && entrada.ok && entrada.data && (Array.isArray(entrada.data) ? entrada.data[0] : entrada.data);
    if (!d || !d.ok) { stream.getTracks().forEach((t) => t.stop()); return window.alert(MOT[d && d.motivo] || 'No pudimos entrar a la reunión. Revisa tu conexión.'); }

    const capa = document.createElement('div');
    capa.id = 'tbVideo'; capa.className = 'vid-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-label', 'Reunión por video');
    capa.innerHTML = capaHTML(titulo || 'Reunión');
    document.body.appendChild(capa);
    const yoVideo = document.getElementById('vidYo'); yoVideo.srcObject = stream;

    const pares = new Map();   // id del otro -> { pc, nombre, pendientes, figura }
    const nombres = new Map(); // id del otro -> nombre
    let desde = 0, activo = true, timer = null;
    const cuenta = () => { const c = document.getElementById('vidCuenta'); if (c) c.textContent = (pares.size + 1) + (pares.size === 0 ? ' persona' : ' personas'); };

    function enviar(tipo, para, dato) {
      return rpcRaw('video_senal_enviar', Object.assign({}, q, { p_sala: sala, p_de: yo, p_para: para, p_tipo: tipo, p_dato: dato })).catch(() => null);
    }
    function figuraPara(id, nom) {
      const f = document.createElement('figure'); f.className = 'vid-caja'; f.id = 'vid-' + id;
      const v = document.createElement('video'); v.autoplay = true; v.playsInline = true;
      const c = document.createElement('figcaption'); c.textContent = nom;
      f.appendChild(v); f.appendChild(c);
      document.getElementById('vidGrid').appendChild(f);
      return v;
    }
    function crearPar(otro) {
      if (pares.has(otro)) return pares.get(otro);
      const pc = new RTCPeerConnection({ iceServers: STUN });
      const par = { pc, nombre: nombres.get(otro) || 'Persona', pendientes: [], figura: null, remoto: false };
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => { if (e.candidate) enviar('candidato', otro, e.candidate.toJSON ? e.candidate.toJSON() : e.candidate); };
      pc.ontrack = (e) => {
        if (!par.figura) par.figura = figuraPara(otro, par.nombre);
        par.figura.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') aviso('No se pudo conectar con alguien por su red. Puede volver a intentar entrando de nuevo.');
      };
      pares.set(otro, par); cuenta();
      return par;
    }
    async function ofrecer(otro) {
      const par = crearPar(otro);
      const oferta = await par.pc.createOffer();
      await par.pc.setLocalDescription(oferta);
      enviar('oferta', otro, { type: oferta.type, sdp: oferta.sdp });
    }
    async function recibirSenal(s) {
      const de = s.de;
      if (s.tipo === 'oferta') {
        const par = crearPar(de);
        await par.pc.setRemoteDescription(s.dato);
        for (const c of par.pendientes.splice(0)) { try { await par.pc.addIceCandidate(c); } catch (e) { /* red ya no válida */ } }
        const resp = await par.pc.createAnswer();
        await par.pc.setLocalDescription(resp);
        enviar('respuesta', de, { type: resp.type, sdp: resp.sdp });
      } else if (s.tipo === 'respuesta') {
        const par = pares.get(de); if (par) await par.pc.setRemoteDescription(s.dato);
      } else if (s.tipo === 'candidato') {
        const par = pares.get(de); if (!par) return;
        if (par.pc.remoteDescription) { try { await par.pc.addIceCandidate(s.dato); } catch (e) { /* ignorar */ } }
        else par.pendientes.push(s.dato);
      }
    }
    function quitar(otro) {
      const par = pares.get(otro); if (!par) return;
      try { par.pc.close(); } catch (e) { /* ya cerrada */ }
      const f = document.getElementById('vid-' + otro); if (f) f.remove();
      pares.delete(otro); cuenta();
    }
    async function latido() {
      if (!activo) return;
      const r = await rpcRaw('video_latido', Object.assign({}, q, { p_sala: sala, p_participante: yo, p_desde: desde }));
      const x = r && r.ok && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      if (!x || x.ok === false) { if (x && x.motivo === 'no-estas-en-la-sala') { aviso(MOT['no-estas-en-la-sala']); } return; }
      const otros = x.otros || [];
      otros.forEach((o) => nombres.set(o.participante, o.nombre));
      const vivos = new Set(otros.map((o) => o.participante));
      // Quien se fue: se quita su cuadro.
      Array.from(pares.keys()).forEach((id) => { if (!vivos.has(id)) quitar(id); });
      // Quien llegó y me toca ofrecer.
      for (const o of otros) {
        if (!pares.has(o.participante) && quienOfrece(yo, o.participante)) await ofrecer(o.participante);
      }
      for (const s of (x.senales || [])) {
        desde = Math.max(desde, Number(s.id) || 0);
        try { await recibirSenal(s); } catch (e) { /* una señal rota no tumba la llamada */ }
      }
      cuenta();
    }
    async function salir() {
      if (!activo) return; activo = false;
      clearInterval(timer);
      Array.from(pares.keys()).forEach((id) => quitar(id));
      stream.getTracks().forEach((t) => t.stop());
      rpcRaw('video_salir', Object.assign({}, q, { p_sala: sala, p_participante: yo })).catch(() => null);
      capa.remove();
    }

    document.getElementById('vidSalir').onclick = salir;
    document.getElementById('vidMic').onclick = (e) => {
      const on = !(e.currentTarget.getAttribute('aria-pressed') === 'true');
      stream.getAudioTracks().forEach((t) => { t.enabled = on; });
      e.currentTarget.setAttribute('aria-pressed', String(on));
    };
    document.getElementById('vidCam').onclick = (e) => {
      const on = !(e.currentTarget.getAttribute('aria-pressed') === 'true');
      stream.getVideoTracks().forEach((t) => { t.enabled = on; });
      e.currentTarget.setAttribute('aria-pressed', String(on));
    };
    // Quien tiene menos identificador también conecta si ya estaban los demás.
    for (const o of (d.otros || [])) nombres.set(o.participante, o.nombre);
    timer = setInterval(latido, LATIDO_MS);
    latido();
    cuenta();
  }

  window.TBVideo = { abrir, _t: { quienOfrece, identidadNueva, puedeEntrar, nombreLimpio, LIMITE } };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.TBVideo;
})();
