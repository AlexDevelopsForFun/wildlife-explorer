// Mississippi state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MS.
// Gulf coast → the Delta → the Appalachian-foothill northeast → the Pascagoula
// swamp. category → state-park 🏞️ · state-forest 🌲 · state-beach 🏖️ ·
// state-preserve 🦋 (WMAs)
export const STATE_PARKS_MS = [
  // ── Gulf coast ──────────────────────────────────────────────────────────────
  { id: 'ms-buccaneer',      name: 'Buccaneer State Park',           lat: 30.2642, lng: -89.4044, radiusKm: 2, category: 'state-beach' },
  { id: 'ms-shepard',        name: 'Shepard State Park',             lat: 30.3767, lng: -88.6292, radiusKm: 2, category: 'state-park' },
  { id: 'ms-pascagoula-river-wma', name: 'Pascagoula River Wildlife Management Area', lat: 30.7794, lng: -88.7167, radiusKm: 6, category: 'state-preserve' },
  // ── Mississippi Delta ───────────────────────────────────────────────────────
  { id: 'ms-leroy-percy',    name: 'Leroy Percy State Park',         lat: 33.1606, lng: -90.9322, radiusKm: 3, category: 'state-park' },
  { id: 'ms-great-river-road', name: 'Great River Road State Park',  lat: 33.8411, lng: -91.0411, radiusKm: 3, category: 'state-park' },
  { id: 'ms-florewood',      name: 'Florewood State Park',           lat: 33.5250, lng: -90.2503, radiusKm: 2, category: 'state-park' },
  // ── Central Mississippi ─────────────────────────────────────────────────────
  { id: 'ms-lefleurs-bluff', name: "LeFleur's Bluff State Park",     lat: 32.3314, lng: -90.1528, radiusKm: 2, category: 'state-park' },
  { id: 'ms-roosevelt',      name: 'Roosevelt State Park',           lat: 32.3203, lng: -89.6728, radiusKm: 3, category: 'state-park' },
  { id: 'ms-lake-lincoln',   name: 'Lake Lincoln State Park',        lat: 31.6798, lng: -90.3376, radiusKm: 3, category: 'state-park' },
  { id: 'ms-holmes-county',  name: 'Holmes County State Park',       lat: 33.0289, lng: -89.9161, radiusKm: 2, category: 'state-park' },
  // ── Appalachian-foothill northeast ──────────────────────────────────────────
  { id: 'ms-tishomingo',     name: 'Tishomingo State Park',          lat: 34.6050, lng: -88.1903, radiusKm: 3, category: 'state-park' },
  { id: 'ms-jp-coleman',     name: 'J. P. Coleman State Park',       lat: 34.9442, lng: -88.1717, radiusKm: 3, category: 'state-park' },
  { id: 'ms-john-kyle',      name: 'John W. Kyle State Park',        lat: 34.4306, lng: -89.8028, radiusKm: 3, category: 'state-park' },
  { id: 'ms-cossar',         name: 'George P. Cossar State Park',     lat: 34.1319, lng: -89.8833, radiusKm: 3, category: 'state-park' },
  { id: 'ms-lake-lowndes',   name: 'Lake Lowndes State Park',        lat: 33.4333, lng: -88.2972, radiusKm: 2, category: 'state-park' },
  // ── Southwest (Natchez & the river bluffs) ──────────────────────────────────
  { id: 'ms-natchez',        name: 'Natchez State Park',             lat: 31.5919, lng: -91.2056, radiusKm: 3, category: 'state-park' },
  { id: 'ms-percy-quin',     name: 'Percy Quin State Park',          lat: 31.1861, lng: -90.5219, radiusKm: 3, category: 'state-park' },
  { id: 'ms-grand-gulf',     name: 'Grand Gulf Military State Park',  lat: 32.0303, lng: -91.0533, radiusKm: 2, category: 'state-park' },
  // ── Piney Woods (south/east) ────────────────────────────────────────────────
  { id: 'ms-paul-johnson',   name: 'Paul B. Johnson State Park',     lat: 31.1419, lng: -89.2403, radiusKm: 3, category: 'state-park' },
  { id: 'ms-clarkco',        name: 'Clarkco State Park',             lat: 32.0953, lng: -88.6889, radiusKm: 2, category: 'state-park' },
  { id: 'ms-pearl-river-wma', name: 'Pearl River Wildlife Management Area', lat: 32.5489, lng: -89.9078, radiusKm: 5, category: 'state-preserve' },
  { id: 'ms-kurtz-sf',       name: 'Kurtz State Forest',             lat: 31.2956, lng: -88.4911, radiusKm: 4, category: 'state-forest' },
];
