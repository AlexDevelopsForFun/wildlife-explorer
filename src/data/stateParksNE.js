// Nebraska state parks & recreation areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs NE.
// The Pine Ridge (Fort Robinson's bison & bighorn), the Niobrara River, the
// Missouri River bluffs, and the Platte/Sandhills lakes. category → state-park 🏞️ ·
// recreation-area 🛶 (SRAs)
export const STATE_PARKS_NE = [
  // ── Pine Ridge & panhandle (west) ───────────────────────────────────────────
  { id: 'ne-fort-robinson',  name: 'Fort Robinson State Park',       lat: 42.6672, lng: -103.4656, radiusKm: 6, category: 'state-park' },
  { id: 'ne-chadron',        name: 'Chadron State Park',             lat: 42.7089, lng: -103.0180, radiusKm: 3, category: 'state-park' },
  { id: 'ne-wildcat-hills',  name: 'Wildcat Hills State Recreation Area', lat: 41.7022, lng: -103.6672, radiusKm: 3, category: 'recreation-area' },
  { id: 'ne-box-butte',      name: 'Box Butte Reservoir State Recreation Area', lat: 42.4625, lng: -103.0741, radiusKm: 3, category: 'recreation-area' },
  // ── Niobrara River & Sandhills ──────────────────────────────────────────────
  { id: 'ne-niobrara',       name: 'Niobrara State Park',            lat: 42.7392, lng: -98.0569, radiusKm: 4, category: 'state-park' },
  { id: 'ne-smith-falls',    name: 'Smith Falls State Park',         lat: 42.8917, lng: -100.3169, radiusKm: 3, category: 'state-park' },
  { id: 'ne-calamus',        name: 'Calamus State Recreation Area',  lat: 41.8346, lng: -99.2152, radiusKm: 4, category: 'recreation-area' },
  // ── Missouri River (northeast/east) ─────────────────────────────────────────
  { id: 'ne-ponca',          name: 'Ponca State Park',               lat: 42.6050, lng: -96.7200, radiusKm: 3, category: 'state-park' },
  { id: 'ne-indian-cave',    name: 'Indian Cave State Park',         lat: 40.2528, lng: -95.5544, radiusKm: 4, category: 'state-park' },
  { id: 'ne-lewis-and-clark', name: 'Lewis and Clark State Recreation Area', lat: 42.8362, lng: -97.5776, radiusKm: 4, category: 'recreation-area' },
  { id: 'ne-brownville',     name: 'Brownville State Recreation Area', lat: 40.3953, lng: -95.6517, radiusKm: 2, category: 'recreation-area' },
  // ── Eastern (Lincoln–Omaha) ─────────────────────────────────────────────────
  { id: 'ne-platte-river',   name: 'Platte River State Park',        lat: 40.9925, lng: -96.2108, radiusKm: 3, category: 'state-park' },
  { id: 'ne-mahoney',        name: 'Eugene T. Mahoney State Park',   lat: 41.0264, lng: -96.3142, radiusKm: 2, category: 'state-park' },
  { id: 'ne-branched-oak',   name: 'Branched Oak State Recreation Area', lat: 40.9713, lng: -96.8631, radiusKm: 4, category: 'recreation-area' },
  { id: 'ne-two-rivers',     name: 'Two Rivers State Recreation Area', lat: 41.2192, lng: -96.3536, radiusKm: 3, category: 'recreation-area' },
  // ── Central (Platte & big reservoirs) ───────────────────────────────────────
  { id: 'ne-lake-mcconaughy', name: 'Lake McConaughy State Recreation Area', lat: 41.2506, lng: -101.8750, radiusKm: 6, category: 'recreation-area' },
  { id: 'ne-buffalo-bill-ranch', name: 'Buffalo Bill Ranch State Park', lat: 41.1614, lng: -100.7947, radiusKm: 2, category: 'state-park' },
  { id: 'ne-johnson-lake',   name: 'Johnson Lake State Recreation Area', lat: 40.6944, lng: -99.8531, radiusKm: 3, category: 'recreation-area' },
];
