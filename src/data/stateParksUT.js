// Utah state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs UT.
// Antelope Island's bison & the Great Salt Lake → the Wasatch reservoirs → the
// red-rock SW → the slickrock canyon country → the Uinta Basin. Zion, Bryce,
// Arches, Canyonlands & Capitol Reef are FEDERAL (excluded). category → state-park 🏞️
export const STATE_PARKS_UT = [
  // ── Great Salt Lake & northern lakes ────────────────────────────────────────
  { id: 'ut-antelope-island', name: 'Antelope Island State Park',    lat: 40.9581, lng: -112.2070, radiusKm: 6, category: 'state-park' },
  { id: 'ut-willard-bay',    name: 'Willard Bay State Park',         lat: 41.3447, lng: -112.1114, radiusKm: 4, category: 'state-park' },
  { id: 'ut-bear-lake',      name: 'Bear Lake State Park',           lat: 41.9655, lng: -111.4002, radiusKm: 4, category: 'state-park' },
  { id: 'ut-hyrum',          name: 'Hyrum State Park',               lat: 41.6203, lng: -111.8570, radiusKm: 2, category: 'state-park' },
  // ── Wasatch & central reservoirs ────────────────────────────────────────────
  { id: 'ut-wasatch-mountain', name: 'Wasatch Mountain State Park',  lat: 40.5028, lng: -111.5370, radiusKm: 5, category: 'state-park' },
  { id: 'ut-jordanelle',     name: 'Jordanelle State Park',          lat: 40.6203, lng: -111.4117, radiusKm: 4, category: 'state-park' },
  { id: 'ut-deer-creek',     name: 'Deer Creek State Park',          lat: 40.4139, lng: -111.5060, radiusKm: 3, category: 'state-park' },
  { id: 'ut-utah-lake',      name: 'Utah Lake State Park',           lat: 40.2381, lng: -111.7350, radiusKm: 5, category: 'state-park' },
  { id: 'ut-rockport',       name: 'Rockport State Park',            lat: 40.7658, lng: -111.3908, radiusKm: 3, category: 'state-park' },
  // ── Southwest red rock (St. George country) ─────────────────────────────────
  { id: 'ut-snow-canyon',    name: 'Snow Canyon State Park',         lat: 37.2031, lng: -113.6410, radiusKm: 3, category: 'state-park' },
  { id: 'ut-sand-hollow',    name: 'Sand Hollow State Park',         lat: 37.1156, lng: -113.3760, radiusKm: 3, category: 'state-park' },
  { id: 'ut-quail-creek',    name: 'Quail Creek State Park',         lat: 37.1925, lng: -113.3850, radiusKm: 2, category: 'state-park' },
  { id: 'ut-gunlock',        name: 'Gunlock State Park',             lat: 37.2536, lng: -113.7840, radiusKm: 3, category: 'state-park' },
  { id: 'ut-coral-pink-dunes', name: 'Coral Pink Sand Dunes State Park', lat: 37.0378, lng: -112.7200, radiusKm: 3, category: 'state-park' },
  // ── South-central (Grand Staircase edge) ────────────────────────────────────
  { id: 'ut-kodachrome-basin', name: 'Kodachrome Basin State Park',  lat: 37.5006, lng: -112.0010, radiusKm: 3, category: 'state-park' },
  { id: 'ut-escalante-petrified', name: 'Escalante Petrified Forest State Park', lat: 37.7878, lng: -111.6290, radiusKm: 3, category: 'state-park' },
  { id: 'ut-goblin-valley',  name: 'Goblin Valley State Park',       lat: 38.5667, lng: -110.7100, radiusKm: 4, category: 'state-park' },
  // ── Canyon country (southeast) ──────────────────────────────────────────────
  { id: 'ut-dead-horse-point', name: 'Dead Horse Point State Park',  lat: 38.5058, lng: -109.7332, radiusKm: 4, category: 'state-park' },
  { id: 'ut-goosenecks',     name: 'Goosenecks State Park',          lat: 37.1747, lng: -109.9269, radiusKm: 2, category: 'state-park' },
  { id: 'ut-green-river',    name: 'Green River State Park',         lat: 38.9914, lng: -110.1540, radiusKm: 2, category: 'state-park' },
  // ── Uinta Basin (east) ──────────────────────────────────────────────────────
  { id: 'ut-steinaker',      name: 'Steinaker State Park',           lat: 40.5175, lng: -109.5300, radiusKm: 3, category: 'state-park' },
  { id: 'ut-red-fleet',      name: 'Red Fleet State Park',           lat: 40.5822, lng: -109.4322, radiusKm: 3, category: 'state-park' },
  { id: 'ut-starvation',     name: 'Fred Hayes State Park at Starvation', lat: 40.2028, lng: -110.4470, radiusKm: 4, category: 'state-park' },
  // ── Central-south reservoirs ────────────────────────────────────────────────
  { id: 'ut-otter-creek',    name: 'Otter Creek State Park',         lat: 38.1666, lng: -112.0160, radiusKm: 3, category: 'state-park' },
  { id: 'ut-scofield',       name: 'Scofield State Park',            lat: 39.7686, lng: -111.1528, radiusKm: 3, category: 'state-park' },
  { id: 'ut-yuba',           name: 'Yuba State Park',                lat: 39.3789, lng: -112.0270, radiusKm: 4, category: 'state-park' },
];
