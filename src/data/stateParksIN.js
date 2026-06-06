// Indiana state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs IN.
// Lake Michigan dunes → northern lakes → central gorge parks → southern hills.
// Indiana Dunes National Park is federal (the adjacent State Park is included).
// category → state-park 🏞️ · state-forest 🌲 · state-beach 🏖️
export const STATE_PARKS_IN = [
  // ── Northern Indiana ────────────────────────────────────────────────────────
  { id: 'in-indiana-dunes',  name: 'Indiana Dunes State Park',       lat: 41.6600, lng: -87.0400, radiusKm: 3, category: 'state-beach' },
  { id: 'in-pokagon',        name: 'Pokagon State Park',             lat: 41.7083, lng: -85.0219, radiusKm: 3, category: 'state-park' },
  { id: 'in-potato-creek',   name: 'Potato Creek State Park',        lat: 41.5525, lng: -86.3481, radiusKm: 3, category: 'state-park' },
  { id: 'in-chain-o-lakes',  name: "Chain O'Lakes State Park",       lat: 41.3331, lng: -85.3806, radiusKm: 3, category: 'state-park' },
  { id: 'in-tippecanoe-river', name: 'Tippecanoe River State Park',  lat: 41.1223, lng: -86.5830, radiusKm: 4, category: 'state-park' },
  { id: 'in-prophetstown',   name: 'Prophetstown State Park',        lat: 40.5000, lng: -86.8333, radiusKm: 3, category: 'state-park' },
  { id: 'in-ouabache',       name: 'Ouabache State Park',            lat: 40.7200, lng: -85.1100, radiusKm: 2, category: 'state-park' },
  { id: 'in-summit-lake',    name: 'Summit Lake State Park',         lat: 40.0270, lng: -85.3073, radiusKm: 3, category: 'state-park' },
  // ── Central Indiana (the gorge & ravine parks) ──────────────────────────────
  { id: 'in-turkey-run',     name: 'Turkey Run State Park',          lat: 39.8845, lng: -87.2068, radiusKm: 2, category: 'state-park' },
  { id: 'in-shades',         name: 'Shades State Park',              lat: 39.9417, lng: -87.0917, radiusKm: 2, category: 'state-park' },
  { id: 'in-mccormicks-creek', name: "McCormick's Creek State Park", lat: 39.2897, lng: -86.7267, radiusKm: 2, category: 'state-park' },
  { id: 'in-richard-lieber', name: 'Richard Lieber State Park',      lat: 39.4792, lng: -86.8833, radiusKm: 3, category: 'state-park' },
  { id: 'in-fort-harrison',  name: 'Fort Harrison State Park',       lat: 39.8667, lng: -86.0167, radiusKm: 2, category: 'state-park' },
  { id: 'in-mounds',         name: 'Mounds State Park',              lat: 40.1004, lng: -85.6207, radiusKm: 2, category: 'state-park' },
  { id: 'in-shakamak',       name: 'Shakamak State Park',            lat: 39.1700, lng: -87.2400, radiusKm: 2, category: 'state-park' },
  // ── Southern hills & Ohio River ─────────────────────────────────────────────
  { id: 'in-brown-county',   name: 'Brown County State Park',        lat: 39.1136, lng: -86.2647, radiusKm: 5, category: 'state-park' },
  { id: 'in-spring-mill',    name: 'Spring Mill State Park',         lat: 38.7333, lng: -86.4200, radiusKm: 3, category: 'state-park' },
  { id: 'in-clifty-falls',   name: 'Clifty Falls State Park',        lat: 38.7482, lng: -85.4152, radiusKm: 2, category: 'state-park' },
  { id: 'in-versailles',     name: 'Versailles State Park',          lat: 39.0800, lng: -85.2300, radiusKm: 3, category: 'state-park' },
  { id: 'in-charlestown',    name: 'Charlestown State Park',         lat: 38.4300, lng: -85.6300, radiusKm: 3, category: 'state-park' },
  { id: 'in-falls-of-the-ohio', name: 'Falls of the Ohio State Park', lat: 38.2756, lng: -85.7636, radiusKm: 2, category: 'state-park' },
  { id: 'in-obannon-woods',  name: "O'Bannon Woods State Park",      lat: 38.2281, lng: -86.2961, radiusKm: 3, category: 'state-park' },
  { id: 'in-lincoln',        name: 'Lincoln State Park',             lat: 38.1042, lng: -86.9964, radiusKm: 2, category: 'state-park' },
  { id: 'in-harmonie',       name: 'Harmonie State Park',            lat: 38.0600, lng: -87.9500, radiusKm: 3, category: 'state-park' },
  { id: 'in-whitewater-memorial', name: 'Whitewater Memorial State Park', lat: 39.6139, lng: -84.9653, radiusKm: 3, category: 'state-park' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'in-morgan-monroe-sf', name: 'Morgan-Monroe State Forest',   lat: 39.3792, lng: -86.4250, radiusKm: 6, category: 'state-forest' },
  { id: 'in-yellowwood-sf',  name: 'Yellowwood State Forest',        lat: 39.1854, lng: -86.3365, radiusKm: 5, category: 'state-forest' },
  { id: 'in-clark-sf',       name: 'Clark State Forest',             lat: 38.5476, lng: -85.9333, radiusKm: 5, category: 'state-forest' },
  { id: 'in-harrison-crawford-sf', name: 'Harrison-Crawford State Forest', lat: 38.1861, lng: -86.2847, radiusKm: 6, category: 'state-forest' },
  { id: 'in-jackson-washington-sf', name: 'Jackson-Washington State Forest', lat: 38.8450, lng: -86.0519, radiusKm: 5, category: 'state-forest' },
];
