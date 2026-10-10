// F1003 · Slots del Vivero: lógica pura (sin DOM). Cada decoración va a un slot y solo se muestra si es de su hábitat.
(function () {
  'use strict';
  const SLOTS = {
    canopy_bird: 'Copa y ramas altas del árbol',
    sky_ambient: 'Centro-superior del cielo',
    ground_flora: 'Lados izquierdo y derecho del prado',
    ground_fauna: 'Plano medio o lateral del suelo',
  };
  // Lugar del catálogo (paisajes) → hábitat del Vivero. Humedal y río son hábitats propios.
  const LUGAR_HABITAT = { bosque: 'bosque', desierto: 'desierto', montanas: 'cordillera', volcan: 'cordillera', costa: 'costa', lago: 'humedal', rio: 'rio' };
  // Estado de cada hábitat: 'disponible' se puede elegir; 'proximamente' existe en el modelo pero aún no se abre.
  const HABITATS = { bosque: 'disponible', desierto: 'disponible', cordillera: 'disponible', costa: 'disponible', jardin: 'disponible', humedal: 'proximamente', rio: 'proximamente' };
  const FAUNA = ['cisne', 'guanaco', 'zorro', 'huemul', 'gaviota'];

  function slotDe(item) {
    if (!item) return null;
    if (item.kind === 'ave') return 'canopy_bird';
    if (item.kind === 'semilla') return 'ground_flora';
    if (item.kind === 'fauna') return 'ground_fauna';
    if (item.kind === 'ambiente') return 'sky_ambient';
    return null;
  }

  function habitatDe(item) {
    if (item.habitat && item.habitat.length) return item.habitat;
    if (item.lugar && LUGAR_HABITAT[item.lugar]) return [LUGAR_HABITAT[item.lugar]];
    return ['general'];
  }

  function esDeHabitat(item, habitat) {
    const h = habitatDe(item);
    return h.indexOf(habitat) >= 0 || h.indexOf('general') >= 0;
  }

  function filtrarPorHabitat(items, habitat) {
    return items.filter((i) => esDeHabitat(i, habitat));
  }

  // Convierte el catálogo (inicio_catalogo.json) en ítems con slot, hábitat e id estable.
  function itemsDeCatalogo(C) {
    const out = [];
    Object.keys(C.aves || {}).forEach((k) => out.push({ id: 'ave_' + k, nombre: C.aves[k].nombre || k, kind: 'ave', habitat: C.aves[k].habitat || null, precio: C.aves[k].precio || 0 }));
    Object.keys(C.semillas || {}).forEach((k) => out.push({ id: 'planta_' + k, nombre: C.semillas[k].nombre || k, kind: 'semilla', habitat: C.semillas[k].habitat || null, precio: C.semillas[k].precio || 0 }));
    Object.keys(C.especiales || {}).forEach((k) => {
      const e = C.especiales[k];
      out.push({ id: 'esp_' + k, nombre: e.nombre || k, kind: FAUNA.indexOf(k) >= 0 ? 'fauna' : 'semilla', lugar: e.lugar, habitat: null, precio: e.precio || 0 });
    });
    return out;
  }

  function habitatDisponible(h) { return HABITATS[h] === 'disponible'; }
  function habitatesDisponibles() { return Object.keys(HABITATS).filter(habitatDisponible); }

  function estadoInicial(habitat) {
    return { active_habitat: habitat || 'general', equipped_items: {} };
  }

  // Equipa un ítem en su slot. Rechaza si el ítem no es del hábitat activo.
  function equipar(estado, item) {
    const slot = slotDe(item);
    if (!slot) return { ok: false, motivo: 'sin-slot' };
    if (!habitatDisponible(estado.active_habitat)) return { ok: false, motivo: 'proximamente' };
    if (!esDeHabitat(item, estado.active_habitat)) return { ok: false, motivo: 'otro-habitat' };
    return { ok: true, estado: { active_habitat: estado.active_habitat, equipped_items: Object.assign({}, estado.equipped_items, { [slot]: item.id }) } };
  }

  function quitar(estado, slot) {
    const eq = Object.assign({}, estado.equipped_items);
    delete eq[slot];
    return { active_habitat: estado.active_habitat, equipped_items: eq };
  }

  // Cambiar de hábitat retira lo que no pertenece al nuevo (nada queda fuera de lugar).
  function cambiarHabitat(estado, habitat, items) {
    const eq = {};
    Object.keys(estado.equipped_items).forEach((slot) => {
      const it = items.find((i) => i.id === estado.equipped_items[slot]);
      if (it && esDeHabitat(it, habitat)) eq[slot] = it.id;
    });
    return { active_habitat: habitat, equipped_items: eq };
  }

  window.TBSlots = { SLOTS, LUGAR_HABITAT, HABITATS, habitatDisponible, habitatesDisponibles, slotDe, habitatDe, esDeHabitat, filtrarPorHabitat, itemsDeCatalogo, estadoInicial, equipar, quitar, cambiarHabitat };
})();
