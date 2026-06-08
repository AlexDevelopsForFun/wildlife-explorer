// Colorado state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs CO.
// Front Range foothills & birding reservoirs → the north-central moose country →
// the eastern-plains flyway lakes → the Western Slope canyons → the southern
// mountains & San Luis Valley. Rocky Mountain NP is FEDERAL (excluded).
// category → state-park 🏞️
export const STATE_PARKS_CO = [
  // ── Front Range (foothills & metro birding) ─────────────────────────────────
  { id: 'co-barr-lake',      name: 'Barr Lake State Park',           lat: 39.9433, lng: -104.7644, radiusKm: 4, category: 'state-park' },
  { id: 'co-roxborough',     name: 'Roxborough State Park',          lat: 39.4297, lng: -105.0690, radiusKm: 3, category: 'state-park' },
  { id: 'co-castlewood-canyon', name: 'Castlewood Canyon State Park', lat: 39.3297, lng: -104.7390, radiusKm: 3, category: 'state-park' },
  { id: 'co-golden-gate-canyon', name: 'Golden Gate Canyon State Park', lat: 39.8308, lng: -105.4110, radiusKm: 4, category: 'state-park' },
  { id: 'co-eldorado-canyon', name: 'Eldorado Canyon State Park',     lat: 39.9306, lng: -105.2920, radiusKm: 3, category: 'state-park' },
  { id: 'co-mueller',        name: 'Mueller State Park',              lat: 38.8797, lng: -105.1810, radiusKm: 4, category: 'state-park' },
  { id: 'co-cheyenne-mountain', name: 'Cheyenne Mountain State Park', lat: 38.7336, lng: -104.8280, radiusKm: 3, category: 'state-park' },
  { id: 'co-chatfield',      name: 'Chatfield State Park',           lat: 39.5367, lng: -105.0690, radiusKm: 4, category: 'state-park' },
  // ── North-central mountains (moose country) ─────────────────────────────────
  { id: 'co-state-forest',   name: 'State Forest State Park',        lat: 40.5114, lng: -106.0100, radiusKm: 6, category: 'state-park' },
  { id: 'co-steamboat-lake', name: 'Steamboat Lake State Park',      lat: 40.8086, lng: -106.9520, radiusKm: 4, category: 'state-park' },
  { id: 'co-sylvan-lake',    name: 'Sylvan Lake State Park',         lat: 39.5439, lng: -106.7550, radiusKm: 3, category: 'state-park' },
  { id: 'co-lory',           name: 'Lory State Park',                lat: 40.5903, lng: -105.1840, radiusKm: 3, category: 'state-park' },
  // ── Eastern plains (flyway reservoirs) ──────────────────────────────────────
  { id: 'co-jackson-lake',   name: 'Jackson Lake State Park',        lat: 40.3828, lng: -104.0920, radiusKm: 4, category: 'state-park' },
  { id: 'co-john-martin',    name: 'John Martin Reservoir State Park', lat: 38.0747, lng: -102.9310, radiusKm: 5, category: 'state-park' },
  { id: 'co-north-sterling', name: 'North Sterling State Park',      lat: 40.7892, lng: -103.2650, radiusKm: 4, category: 'state-park' },
  // ── Western Slope (canyons & lakes) ─────────────────────────────────────────
  { id: 'co-ridgway',        name: 'Ridgway State Park',             lat: 38.2125, lng: -107.7340, radiusKm: 4, category: 'state-park' },
  { id: 'co-rifle-falls',    name: 'Rifle Falls State Park',         lat: 39.6739, lng: -107.7000, radiusKm: 2, category: 'state-park' },
  { id: 'co-crawford',       name: 'Crawford State Park',            lat: 38.6872, lng: -107.5960, radiusKm: 3, category: 'state-park' },
  { id: 'co-highline-lake',  name: 'Highline Lake State Park',       lat: 39.2703, lng: -108.8370, radiusKm: 3, category: 'state-park' },
  { id: 'co-navajo',         name: 'Navajo State Park',              lat: 37.0089, lng: -107.4090, radiusKm: 5, category: 'state-park' },
  // ── Southern mountains & San Luis Valley ────────────────────────────────────
  { id: 'co-lake-pueblo',    name: 'Lake Pueblo State Park',         lat: 38.2547, lng: -104.7320, radiusKm: 5, category: 'state-park' },
  { id: 'co-lathrop',        name: 'Lathrop State Park',             lat: 37.6028, lng: -104.8330, radiusKm: 3, category: 'state-park' },
  { id: 'co-trinidad-lake',  name: 'Trinidad Lake State Park',       lat: 37.1456, lng: -104.5700, radiusKm: 3, category: 'state-park' },
  { id: 'co-san-luis',       name: 'San Luis State Park',            lat: 37.6664, lng: -105.7350, radiusKm: 4, category: 'state-park' },
];
