// Missouri state parks & conservation areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MO.
// Ozark springs & shut-ins → the St. Francois Mountains → the big lakes → the
// tallgrass prairie, plus premier Dept. of Conservation areas (birding/waterfowl).
// category → state-park 🏞️ · state-preserve 🦋 (conservation areas)
export const STATE_PARKS_MO = [
  // ── Ozark springs ───────────────────────────────────────────────────────────
  { id: 'mo-ha-ha-tonka',    name: 'Ha Ha Tonka State Park',         lat: 37.9689, lng: -92.7691, radiusKm: 3, category: 'state-park' },
  { id: 'mo-bennett-spring', name: 'Bennett Spring State Park',      lat: 37.7168, lng: -92.8575, radiusKm: 2, category: 'state-park' },
  { id: 'mo-montauk',        name: 'Montauk State Park',             lat: 37.4531, lng: -91.6803, radiusKm: 2, category: 'state-park' },
  { id: 'mo-alley-spring',   name: 'Alley Spring State Park',        lat: 37.1542, lng: -91.4442, radiusKm: 2, category: 'state-park' },
  { id: 'mo-big-spring',     name: 'Big Spring State Park',          lat: 36.9269, lng: -90.9889, radiusKm: 2, category: 'state-park' },
  { id: 'mo-echo-bluff',     name: 'Echo Bluff State Park',          lat: 37.3114, lng: -91.4061, radiusKm: 3, category: 'state-park' },
  { id: 'mo-roaring-river',  name: 'Roaring River State Park',       lat: 36.5861, lng: -93.8378, radiusKm: 3, category: 'state-park' },
  // ── Ozark rivers & caves ────────────────────────────────────────────────────
  { id: 'mo-meramec',        name: 'Meramec State Park',             lat: 38.2067, lng: -91.1025, radiusKm: 3, category: 'state-park' },
  { id: 'mo-onondaga-cave',  name: 'Onondaga Cave State Park',       lat: 38.0592, lng: -91.2303, radiusKm: 2, category: 'state-park' },
  { id: 'mo-current-river',  name: 'Current River State Park',       lat: 37.3217, lng: -91.4367, radiusKm: 3, category: 'state-park' },
  // ── St. Francois Mountains (SE igneous) & bootheel ──────────────────────────
  { id: 'mo-johnsons-shut-ins', name: "Johnson's Shut-Ins State Park", lat: 37.5419, lng: -90.8419, radiusKm: 3, category: 'state-park' },
  { id: 'mo-elephant-rocks', name: 'Elephant Rocks State Park',      lat: 37.6542, lng: -90.6881, radiusKm: 2, category: 'state-park' },
  { id: 'mo-taum-sauk',      name: 'Taum Sauk Mountain State Park',  lat: 37.5703, lng: -90.7278, radiusKm: 3, category: 'state-park' },
  { id: 'mo-sam-baker',      name: 'Sam A. Baker State Park',        lat: 37.2533, lng: -90.5261, radiusKm: 3, category: 'state-park' },
  { id: 'mo-hawn',           name: 'Hawn State Park',                lat: 37.8217, lng: -90.2362, radiusKm: 3, category: 'state-park' },
  { id: 'mo-big-oak-tree',   name: 'Big Oak Tree State Park',        lat: 36.6550, lng: -89.3283, radiusKm: 2, category: 'state-park' },
  // ── Big lakes ───────────────────────────────────────────────────────────────
  { id: 'mo-lake-of-the-ozarks', name: 'Lake of the Ozarks State Park', lat: 38.0981, lng: -92.6168, radiusKm: 5, category: 'state-park' },
  { id: 'mo-table-rock',     name: 'Table Rock State Park',          lat: 36.5819, lng: -93.3064, radiusKm: 3, category: 'state-park' },
  { id: 'mo-pomme-de-terre', name: 'Pomme de Terre State Park',      lat: 37.8714, lng: -93.3178, radiusKm: 3, category: 'state-park' },
  { id: 'mo-stockton',       name: 'Stockton State Park',            lat: 37.6186, lng: -93.7519, radiusKm: 3, category: 'state-park' },
  // ── St. Louis & central ─────────────────────────────────────────────────────
  { id: 'mo-castlewood',     name: 'Castlewood State Park',          lat: 38.5511, lng: -90.5411, radiusKm: 2, category: 'state-park' },
  { id: 'mo-babler',         name: 'Babler State Park',              lat: 38.6200, lng: -90.6944, radiusKm: 2, category: 'state-park' },
  { id: 'mo-cuivre-river',   name: 'Cuivre River State Park',        lat: 39.0350, lng: -90.9328, radiusKm: 4, category: 'state-park' },
  // ── Northern Missouri ───────────────────────────────────────────────────────
  { id: 'mo-mark-twain',     name: 'Mark Twain State Park',          lat: 39.4917, lng: -91.8014, radiusKm: 3, category: 'state-park' },
  { id: 'mo-thousand-hills', name: 'Thousand Hills State Park',      lat: 40.1794, lng: -92.6392, radiusKm: 3, category: 'state-park' },
  { id: 'mo-pershing',       name: 'Pershing State Park',            lat: 39.7589, lng: -93.2147, radiusKm: 3, category: 'state-park' },
  // ── Western prairie ─────────────────────────────────────────────────────────
  { id: 'mo-prairie',        name: 'Prairie State Park',             lat: 37.5122, lng: -94.5717, radiusKm: 4, category: 'state-park' },
  { id: 'mo-knob-noster',    name: 'Knob Noster State Park',         lat: 38.7539, lng: -93.5994, radiusKm: 3, category: 'state-park' },
  // ── Premier conservation areas ──────────────────────────────────────────────
  { id: 'mo-august-busch-ca', name: 'August A. Busch Memorial Conservation Area', lat: 38.7183, lng: -90.7556, radiusKm: 4, category: 'state-preserve' },
  { id: 'mo-columbia-bottom-ca', name: 'Columbia Bottom Conservation Area', lat: 38.8081, lng: -90.1516, radiusKm: 4, category: 'state-preserve' },
  { id: 'mo-duck-creek-ca',  name: 'Duck Creek Conservation Area',   lat: 37.0422, lng: -90.0964, radiusKm: 5, category: 'state-preserve' },
  { id: 'mo-grand-pass-ca',  name: 'Grand Pass Conservation Area',   lat: 39.2950, lng: -93.3197, radiusKm: 4, category: 'state-preserve' },
];
