// New Mexico state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs NM.
// The Sangre de Cristo & San Juan high country (N) → the Rio Grande birding
// corridor & Chihuahuan desert (S) → the Pecos sinkhole lakes (SE) → the
// shortgrass-plains reservoirs (NE). Carlsbad Caverns & White Sands are FEDERAL
// (excluded). category → state-park 🏞️
export const STATE_PARKS_NM = [
  // ── Northern high country (Sangre de Cristo & San Juan) ─────────────────────
  { id: 'nm-cimarron-canyon', name: 'Cimarron Canyon State Park',    lat: 36.5378, lng: -105.1750, radiusKm: 5, category: 'state-park' },
  { id: 'nm-eagle-nest-lake', name: 'Eagle Nest Lake State Park',    lat: 36.5333, lng: -105.2500, radiusKm: 4, category: 'state-park' },
  { id: 'nm-heron-lake',     name: 'Heron Lake State Park',          lat: 36.6806, lng: -106.6672, radiusKm: 4, category: 'state-park' },
  { id: 'nm-navajo-lake',    name: 'Navajo Lake State Park',         lat: 36.8011, lng: -107.6925, radiusKm: 5, category: 'state-park' },
  { id: 'nm-hyde-memorial',  name: 'Hyde Memorial State Park',       lat: 35.7367, lng: -105.8360, radiusKm: 3, category: 'state-park' },
  { id: 'nm-coyote-creek',   name: 'Coyote Creek State Park',        lat: 35.9200, lng: -105.1640, radiusKm: 2, category: 'state-park' },
  { id: 'nm-fenton-lake',    name: 'Fenton Lake State Park',         lat: 35.8825, lng: -106.7260, radiusKm: 3, category: 'state-park' },
  { id: 'nm-sugarite-canyon', name: 'Sugarite Canyon State Park',    lat: 36.9592, lng: -104.3860, radiusKm: 4, category: 'state-park' },
  // ── Central mountains ───────────────────────────────────────────────────────
  { id: 'nm-manzano-mountains', name: 'Manzano Mountains State Park', lat: 34.6033, lng: -106.3610, radiusKm: 3, category: 'state-park' },
  // ── Rio Grande corridor & Chihuahuan desert (south) ─────────────────────────
  { id: 'nm-elephant-butte', name: 'Elephant Butte Lake State Park', lat: 33.6251, lng: -107.0095, radiusKm: 6, category: 'state-park' },
  { id: 'nm-caballo-lake',   name: 'Caballo Lake State Park',        lat: 32.9964, lng: -107.2869, radiusKm: 5, category: 'state-park' },
  { id: 'nm-percha-dam',     name: 'Percha Dam State Park',          lat: 32.8686, lng: -107.3036, radiusKm: 2, category: 'state-park' },
  { id: 'nm-leasburg-dam',   name: 'Leasburg Dam State Park',        lat: 32.4969, lng: -106.9228, radiusKm: 2, category: 'state-park' },
  { id: 'nm-mesilla-valley-bosque', name: 'Mesilla Valley Bosque State Park', lat: 32.2747, lng: -106.8050, radiusKm: 3, category: 'state-park' },
  { id: 'nm-city-of-rocks',  name: 'City of Rocks State Park',       lat: 32.5900, lng: -107.9760, radiusKm: 3, category: 'state-park' },
  { id: 'nm-rockhound',      name: 'Rockhound State Park',           lat: 32.1000, lng: -107.3000, radiusKm: 3, category: 'state-park' },
  { id: 'nm-oliver-lee',     name: 'Oliver Lee Memorial State Park', lat: 32.7467, lng: -105.9160, radiusKm: 3, category: 'state-park' },
  // ── Pecos sinkhole lakes (southeast) ────────────────────────────────────────
  { id: 'nm-bottomless-lakes', name: 'Bottomless Lakes State Park',  lat: 33.3192, lng: -104.3320, radiusKm: 3, category: 'state-park' },
  { id: 'nm-brantley-lake',  name: 'Brantley Lake State Park',       lat: 32.5514, lng: -104.3840, radiusKm: 4, category: 'state-park' },
  { id: 'nm-oasis',          name: 'Oasis State Park',               lat: 34.2578, lng: -103.3490, radiusKm: 2, category: 'state-park' },
  // ── Shortgrass-plains reservoirs (northeast) ────────────────────────────────
  { id: 'nm-clayton-lake',   name: 'Clayton Lake State Park',        lat: 36.5783, lng: -103.3060, radiusKm: 3, category: 'state-park' },
  { id: 'nm-santa-rosa-lake', name: 'Santa Rosa Lake State Park',    lat: 35.0500, lng: -104.6670, radiusKm: 4, category: 'state-park' },
  // ── West (Colorado Plateau edge) ────────────────────────────────────────────
  { id: 'nm-bluewater-lake', name: 'Bluewater Lake State Park',      lat: 35.2944, lng: -108.1100, radiusKm: 4, category: 'state-park' },
];
