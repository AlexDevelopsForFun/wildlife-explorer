// Louisiana state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs LA.
// Coastal marsh & Grand Isle (a migration mecca) → the Atchafalaya Basin →
// northern lakes → Toledo Bend. category → state-park 🏞️ · state-forest 🌲 ·
// state-beach 🏖️ · state-preserve 🦋 (WMAs)
export const STATE_PARKS_LA = [
  // ── Coast & southeast swamps ────────────────────────────────────────────────
  { id: 'la-grand-isle',     name: 'Grand Isle State Park',          lat: 29.2586, lng: -89.9547, radiusKm: 3, category: 'state-beach' },
  { id: 'la-fontainebleau',  name: 'Fontainebleau State Park',       lat: 30.3452, lng: -90.0227, radiusKm: 3, category: 'state-park' },
  { id: 'la-bayou-segnette', name: 'Bayou Segnette State Park',      lat: 29.9030, lng: -90.1545, radiusKm: 3, category: 'state-park' },
  { id: 'la-cypremort-point', name: 'Cypremort Point State Park',    lat: 29.7382, lng: -91.8536, radiusKm: 2, category: 'state-beach' },
  { id: 'la-palmetto-island', name: 'Palmetto Island State Park',    lat: 29.8693, lng: -92.1517, radiusKm: 3, category: 'state-park' },
  { id: 'la-tickfaw',        name: 'Tickfaw State Park',             lat: 30.3822, lng: -90.6313, radiusKm: 3, category: 'state-park' },
  { id: 'la-sam-houston-jones', name: 'Sam Houston Jones State Park', lat: 30.3021, lng: -93.2586, radiusKm: 3, category: 'state-park' },
  // ── Atchafalaya Basin ───────────────────────────────────────────────────────
  { id: 'la-lake-fausse-pointe', name: 'Lake Fausse Pointe State Park', lat: 30.0597, lng: -91.6096, radiusKm: 4, category: 'state-park' },
  { id: 'la-chicot',         name: 'Chicot State Park',              lat: 30.8003, lng: -92.2797, radiusKm: 4, category: 'state-park' },
  // ── Premier WMAs (coastal & basin) ──────────────────────────────────────────
  { id: 'la-atchafalaya-delta-wma', name: 'Atchafalaya Delta Wildlife Management Area', lat: 29.4194, lng: -91.3078, radiusKm: 6, category: 'state-preserve' },
  { id: 'la-maurepas-swamp-wma', name: 'Maurepas Swamp Wildlife Management Area', lat: 30.1464, lng: -90.5164, radiusKm: 6, category: 'state-preserve' },
  { id: 'la-pass-a-loutre-wma', name: 'Pass a Loutre Wildlife Management Area', lat: 29.0702, lng: -89.1201, radiusKm: 6, category: 'state-preserve' },
  // ── North Louisiana lakes ───────────────────────────────────────────────────
  { id: 'la-chemin-a-haut',  name: 'Chemin-A-Haut State Park',       lat: 32.9100, lng: -91.8450, radiusKm: 3, category: 'state-park' },
  { id: 'la-lake-bruin',     name: 'Lake Bruin State Park',          lat: 31.9606, lng: -91.2011, radiusKm: 2, category: 'state-park' },
  { id: 'la-lake-darbonne',  name: "Lake D'Arbonne State Park",      lat: 32.7868, lng: -92.4899, radiusKm: 3, category: 'state-park' },
  { id: 'la-lake-claiborne', name: 'Lake Claiborne State Park',      lat: 32.7231, lng: -92.9203, radiusKm: 3, category: 'state-park' },
  { id: 'la-poverty-point',  name: 'Poverty Point Reservoir State Park', lat: 32.4825, lng: -91.4946, radiusKm: 3, category: 'state-park' },
  { id: 'la-lake-bistineau', name: 'Lake Bistineau State Park',      lat: 32.4439, lng: -93.3803, radiusKm: 3, category: 'state-park' },
  // ── West (Toledo Bend / Sabine uplands) ─────────────────────────────────────
  { id: 'la-north-toledo-bend', name: 'North Toledo Bend State Park', lat: 31.5684, lng: -93.7349, radiusKm: 3, category: 'state-park' },
  { id: 'la-hodges-gardens', name: 'Hodges Gardens State Park',      lat: 31.3692, lng: -93.4248, radiusKm: 3, category: 'state-park' },
  { id: 'la-alexander-sf',   name: 'Alexander State Forest',         lat: 31.1241, lng: -92.4884, radiusKm: 5, category: 'state-forest' },
];
