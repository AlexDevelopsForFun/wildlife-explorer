// Minnesota state parks, forests & wildlife areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MN.
// Lake Superior's North Shore → the Arrowhead/Boundary Waters gateway → the
// Mississippi headwaters → the driftless southeast → the prairie southwest.
// (MN's vast WMA system is represented by a few premier areas.) category →
// state-park 🏞️ · state-forest 🌲 · state-preserve 🦋 (wildlife areas)
export const STATE_PARKS_MN = [
  // ── North Shore (Lake Superior) ─────────────────────────────────────────────
  { id: 'mn-gooseberry-falls', name: 'Gooseberry Falls State Park',  lat: 47.1469, lng: -91.4633, radiusKm: 3, category: 'state-park' },
  { id: 'mn-split-rock-lighthouse', name: 'Split Rock Lighthouse State Park', lat: 47.1919, lng: -91.3928, radiusKm: 3, category: 'state-park' },
  { id: 'mn-tettegouche',     name: 'Tettegouche State Park',         lat: 47.3358, lng: -91.1994, radiusKm: 4, category: 'state-park' },
  { id: 'mn-cascade-river',   name: 'Cascade River State Park',       lat: 47.7097, lng: -90.5222, radiusKm: 3, category: 'state-park' },
  // ── Arrowhead & northeast ───────────────────────────────────────────────────
  { id: 'mn-bear-head-lake',  name: 'Bear Head Lake State Park',      lat: 47.7953, lng: -92.0700, radiusKm: 3, category: 'state-park' },
  { id: 'mn-lake-vermilion-soudan', name: 'Lake Vermilion-Soudan Underground Mine State Park', lat: 47.8233, lng: -92.2372, radiusKm: 4, category: 'state-park' },
  { id: 'mn-scenic',          name: 'Scenic State Park',              lat: 47.7214, lng: -93.5700, radiusKm: 3, category: 'state-park' },
  { id: 'mn-jay-cooke',       name: 'Jay Cooke State Park',           lat: 46.6497, lng: -92.3307, radiusKm: 4, category: 'state-park' },
  { id: 'mn-banning',         name: 'Banning State Park',             lat: 46.1647, lng: -92.8544, radiusKm: 3, category: 'state-park' },
  { id: 'mn-st-croix',        name: 'St. Croix State Park',           lat: 45.9742, lng: -92.5836, radiusKm: 6, category: 'state-park' },
  // ── North-central (headwaters & lakes) ──────────────────────────────────────
  { id: 'mn-itasca',          name: 'Itasca State Park',              lat: 47.2397, lng: -95.2075, radiusKm: 5, category: 'state-park' },
  { id: 'mn-lake-bemidji',    name: 'Lake Bemidji State Park',        lat: 47.5400, lng: -94.8194, radiusKm: 3, category: 'state-park' },
  { id: 'mn-mille-lacs-kathio', name: 'Mille Lacs Kathio State Park', lat: 46.1288, lng: -93.7405, radiusKm: 4, category: 'state-park' },
  { id: 'mn-glendalough',     name: 'Glendalough State Park',         lat: 46.3333, lng: -95.6667, radiusKm: 3, category: 'state-park' },
  { id: 'mn-maplewood',       name: 'Maplewood State Park',           lat: 46.5336, lng: -95.9492, radiusKm: 3, category: 'state-park' },
  // ── Prairie & Red River (northwest/west) ────────────────────────────────────
  { id: 'mn-buffalo-river',   name: 'Buffalo River State Park',       lat: 46.8647, lng: -96.4600, radiusKm: 3, category: 'state-park' },
  { id: 'mn-glacial-lakes',   name: 'Glacial Lakes State Park',       lat: 45.5372, lng: -95.5219, radiusKm: 3, category: 'state-park' },
  { id: 'mn-lac-qui-parle',   name: 'Lac qui Parle State Park',       lat: 45.0295, lng: -95.8911, radiusKm: 3, category: 'state-park' },
  // ── Twin Cities & St. Croix Valley ──────────────────────────────────────────
  { id: 'mn-afton',           name: 'Afton State Park',               lat: 44.8625, lng: -92.7836, radiusKm: 3, category: 'state-park' },
  { id: 'mn-william-obrien',  name: "William O'Brien State Park",     lat: 45.2192, lng: -92.7658, radiusKm: 3, category: 'state-park' },
  { id: 'mn-wild-river',      name: 'Wild River State Park',          lat: 45.5061, lng: -92.7178, radiusKm: 4, category: 'state-park' },
  { id: 'mn-interstate',      name: 'Interstate State Park',          lat: 45.3950, lng: -92.6697, radiusKm: 2, category: 'state-park' },
  { id: 'mn-fort-snelling',   name: 'Fort Snelling State Park',       lat: 44.8858, lng: -93.1781, radiusKm: 3, category: 'state-park' },
  // ── Southeast (driftless & Big Woods) ───────────────────────────────────────
  { id: 'mn-nerstrand-big-woods', name: 'Nerstrand Big Woods State Park', lat: 44.3450, lng: -93.1072, radiusKm: 2, category: 'state-park' },
  { id: 'mn-myre-big-island', name: 'Myre-Big Island State Park',     lat: 43.6358, lng: -93.3089, radiusKm: 3, category: 'state-park' },
  { id: 'mn-whitewater',      name: 'Whitewater State Park',          lat: 44.0583, lng: -92.0588, radiusKm: 3, category: 'state-park' },
  { id: 'mn-beaver-creek-valley', name: 'Beaver Creek Valley State Park', lat: 43.6500, lng: -91.5828, radiusKm: 2, category: 'state-park' },
  { id: 'mn-forestville',     name: 'Forestville/Mystery Cave State Park', lat: 43.6397, lng: -92.2119, radiusKm: 3, category: 'state-park' },
  { id: 'mn-frontenac',       name: 'Frontenac State Park',           lat: 44.5075, lng: -92.3264, radiusKm: 3, category: 'state-park' },
  { id: 'mn-great-river-bluffs', name: 'Great River Bluffs State Park', lat: 43.9464, lng: -91.3994, radiusKm: 3, category: 'state-park' },
  // ── Southwest prairie ───────────────────────────────────────────────────────
  { id: 'mn-minneopa',        name: 'Minneopa State Park',            lat: 44.1622, lng: -94.1022, radiusKm: 3, category: 'state-park' },
  { id: 'mn-blue-mounds',     name: 'Blue Mounds State Park',         lat: 43.7172, lng: -96.1892, radiusKm: 3, category: 'state-park' },
  // ── Forests & premier wildlife areas ────────────────────────────────────────
  { id: 'mn-beltrami-island-sf', name: 'Beltrami Island State Forest', lat: 48.5505, lng: -95.1541, radiusKm: 9, category: 'state-forest' },
  { id: 'mn-st-croix-sf',     name: 'St. Croix State Forest',         lat: 46.0631, lng: -92.4292, radiusKm: 6, category: 'state-forest' },
  { id: 'mn-carlos-avery-wma', name: 'Carlos Avery Wildlife Management Area', lat: 45.3167, lng: -93.0872, radiusKm: 5, category: 'state-preserve' },
  { id: 'mn-lac-qui-parle-wma', name: 'Lac qui Parle Wildlife Management Area', lat: 45.2308, lng: -96.2606, radiusKm: 6, category: 'state-preserve' },
];
