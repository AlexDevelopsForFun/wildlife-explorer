// Wyoming state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs WY.
// A small system (Yellowstone, Grand Teton & Devils Tower are FEDERAL, excluded):
// the Wind River canyons & Hot Springs bison herd, the big reservoirs, and the
// southeast foothills. category → state-park 🏞️ · recreation-area 🛶
export const STATE_PARKS_WY = [
  // ── Wind River country (central) ────────────────────────────────────────────
  { id: 'wy-hot-springs',    name: 'Hot Springs State Park',         lat: 43.6547, lng: -108.1990, radiusKm: 3, category: 'state-park' },
  { id: 'wy-boysen',         name: 'Boysen State Park',              lat: 43.4166, lng: -108.1773, radiusKm: 5, category: 'state-park' },
  { id: 'wy-sinks-canyon',   name: 'Sinks Canyon State Park',        lat: 42.7500, lng: -108.8070, radiusKm: 3, category: 'state-park' },
  // ── Big Horn Basin & northeast ──────────────────────────────────────────────
  { id: 'wy-buffalo-bill',   name: 'Buffalo Bill State Park',        lat: 44.5011, lng: -109.1840, radiusKm: 5, category: 'state-park' },
  { id: 'wy-keyhole',        name: 'Keyhole State Park',             lat: 44.3246, lng: -104.7726, radiusKm: 5, category: 'state-park' },
  // ── North Platte reservoirs & southeast ─────────────────────────────────────
  { id: 'wy-glendo',         name: 'Glendo State Park',              lat: 42.5561, lng: -104.9830, radiusKm: 5, category: 'state-park' },
  { id: 'wy-guernsey',       name: 'Guernsey State Park',            lat: 42.3039, lng: -104.7690, radiusKm: 4, category: 'state-park' },
  { id: 'wy-edness-wilkins', name: 'Edness K. Wilkins State Park',   lat: 42.8564, lng: -106.1760, radiusKm: 2, category: 'state-park' },
  { id: 'wy-curt-gowdy',     name: 'Curt Gowdy State Park',          lat: 41.1736, lng: -105.2270, radiusKm: 4, category: 'state-park' },
  { id: 'wy-hawk-springs',   name: 'Hawk Springs State Recreation Area', lat: 41.7117, lng: -104.1940, radiusKm: 3, category: 'recreation-area' },
  // ── Southwest ───────────────────────────────────────────────────────────────
  { id: 'wy-seminoe',        name: 'Seminoe State Park',             lat: 42.0586, lng: -106.8720, radiusKm: 5, category: 'state-park' },
  { id: 'wy-bear-river',     name: 'Bear River State Park',          lat: 41.2660, lng: -110.9370, radiusKm: 3, category: 'state-park' },
];
