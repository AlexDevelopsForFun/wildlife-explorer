// Idaho state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs ID.
// The Panhandle lakes & forests → the central Payette/Salmon country → the
// Snake River Plain dunes, springs & reservoirs → the Yellowstone-edge swans.
// category → state-park 🏞️
export const STATE_PARKS_ID = [
  // ── Panhandle (north) ───────────────────────────────────────────────────────
  { id: 'id-priest-lake',    name: 'Priest Lake State Park',         lat: 48.6134, lng: -116.8320, radiusKm: 4, category: 'state-park' },
  { id: 'id-farragut',       name: 'Farragut State Park',            lat: 47.9671, lng: -116.5827, radiusKm: 4, category: 'state-park' },
  { id: 'id-heyburn',        name: 'Heyburn State Park',             lat: 47.3532, lng: -116.7613, radiusKm: 4, category: 'state-park' },
  { id: 'id-round-lake',     name: 'Round Lake State Park',          lat: 48.1631, lng: -116.6370, radiusKm: 2, category: 'state-park' },
  { id: 'id-dworshak',       name: 'Dworshak State Park',            lat: 46.5855, lng: -116.2880, radiusKm: 4, category: 'state-park' },
  { id: 'id-hells-gate',     name: 'Hells Gate State Park',          lat: 46.3547, lng: -117.0430, radiusKm: 3, category: 'state-park' },
  { id: 'id-winchester-lake', name: 'Winchester Lake State Park',    lat: 46.2347, lng: -116.6214, radiusKm: 2, category: 'state-park' },
  // ── Central (Payette & Salmon River) ────────────────────────────────────────
  { id: 'id-ponderosa',      name: 'Ponderosa State Park',           lat: 44.9345, lng: -116.0780, radiusKm: 3, category: 'state-park' },
  { id: 'id-lake-cascade',   name: 'Lake Cascade State Park',        lat: 44.5213, lng: -116.0520, radiusKm: 4, category: 'state-park' },
  { id: 'id-yankee-fork',    name: 'Land of the Yankee Fork State Park', lat: 44.4758, lng: -114.2105, radiusKm: 5, category: 'state-park' },
  // ── Southwest (Boise & Snake River) ─────────────────────────────────────────
  { id: 'id-bruneau-dunes',  name: 'Bruneau Dunes State Park',       lat: 42.8958, lng: -115.6780, radiusKm: 4, category: 'state-park' },
  { id: 'id-eagle-island',   name: 'Eagle Island State Park',        lat: 43.6868, lng: -116.3849, radiusKm: 2, category: 'state-park' },
  { id: 'id-lucky-peak',     name: 'Lucky Peak State Park',          lat: 43.5329, lng: -116.0580, radiusKm: 3, category: 'state-park' },
  { id: 'id-three-island',   name: 'Three Island Crossing State Park', lat: 42.9411, lng: -115.3180, radiusKm: 2, category: 'state-park' },
  // ── Snake River Plain (springs, reservoirs, granite) ────────────────────────
  { id: 'id-thousand-springs', name: 'Thousand Springs State Park',  lat: 42.8578, lng: -114.8760, radiusKm: 4, category: 'state-park' },
  { id: 'id-massacre-rocks', name: 'Massacre Rocks State Park',      lat: 42.7267, lng: -112.9330, radiusKm: 3, category: 'state-park' },
  { id: 'id-lake-walcott',   name: 'Lake Walcott State Park',        lat: 42.6746, lng: -113.4770, radiusKm: 4, category: 'state-park' },
  { id: 'id-castle-rocks',   name: 'Castle Rocks State Park',        lat: 42.1370, lng: -113.6770, radiusKm: 3, category: 'state-park' },
  { id: 'id-bear-lake',      name: 'Bear Lake State Park',           lat: 42.1111, lng: -111.2730, radiusKm: 4, category: 'state-park' },
  // ── East (Yellowstone ecosystem edge) ───────────────────────────────────────
  { id: 'id-harriman',       name: 'Harriman State Park',            lat: 44.3360, lng: -111.4613, radiusKm: 4, category: 'state-park' },
  { id: 'id-henrys-lake',    name: 'Henrys Lake State Park',         lat: 44.6200, lng: -111.3739, radiusKm: 3, category: 'state-park' },
];
