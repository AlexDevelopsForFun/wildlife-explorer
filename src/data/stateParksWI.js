// Wisconsin state parks, forests & wildlife areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs WI
// (Horicon Marsh & Mead Wildlife Area added via Nominatim). Northwoods lakes &
// loons → Door County → Devil's Lake → the Mississippi bluffs. (WI's hundreds of
// small State Natural Areas are omitted from v1.) category → state-park 🏞️ ·
// state-forest 🌲 · state-beach 🏖️ · state-preserve 🦋 (wildlife areas)
export const STATE_PARKS_WI = [
  // ── Northwoods (forests, lakes, loons) ──────────────────────────────────────
  { id: 'wi-northern-highland', name: 'Northern Highland-American Legion State Forest', lat: 45.9644, lng: -89.5813, radiusKm: 9, category: 'state-forest' },
  { id: 'wi-brule-river-sf',  name: 'Brule River State Forest',       lat: 46.5419, lng: -91.5858, radiusKm: 7, category: 'state-forest' },
  { id: 'wi-flambeau-river-sf', name: 'Flambeau River State Forest',  lat: 45.7483, lng: -90.7642, radiusKm: 7, category: 'state-forest' },
  { id: 'wi-governor-knowles-sf', name: 'Governor Knowles State Forest', lat: 45.7742, lng: -92.7792, radiusKm: 7, category: 'state-forest' },
  { id: 'wi-copper-falls',    name: 'Copper Falls State Park',        lat: 46.3764, lng: -90.6433, radiusKm: 3, category: 'state-park' },
  { id: 'wi-pattison',        name: 'Pattison State Park',            lat: 46.5267, lng: -92.1222, radiusKm: 3, category: 'state-park' },
  { id: 'wi-amnicon-falls',   name: 'Amnicon Falls State Park',       lat: 46.6139, lng: -91.8994, radiusKm: 2, category: 'state-park' },
  { id: 'wi-big-bay',         name: 'Big Bay State Park',             lat: 46.8000, lng: -90.6728, radiusKm: 3, category: 'state-park' },
  { id: 'wi-rib-mountain',    name: 'Rib Mountain State Park',        lat: 44.9183, lng: -89.6894, radiusKm: 2, category: 'state-park' },
  { id: 'wi-council-grounds', name: 'Council Grounds State Park',     lat: 45.1853, lng: -89.7431, radiusKm: 2, category: 'state-park' },
  // ── Door County & Lake Michigan ─────────────────────────────────────────────
  { id: 'wi-peninsula',       name: 'Peninsula State Park',           lat: 45.1511, lng: -87.2175, radiusKm: 3, category: 'state-park' },
  { id: 'wi-newport',         name: 'Newport State Park',             lat: 45.2350, lng: -86.9942, radiusKm: 3, category: 'state-park' },
  { id: 'wi-whitefish-dunes', name: 'Whitefish Dunes State Park',     lat: 44.9287, lng: -87.1852, radiusKm: 2, category: 'state-beach' },
  { id: 'wi-potawatomi',      name: 'Potawatomi State Park',          lat: 44.8644, lng: -87.4150, radiusKm: 2, category: 'state-park' },
  { id: 'wi-rock-island',     name: 'Rock Island State Park',         lat: 45.4158, lng: -86.8194, radiusKm: 2, category: 'state-park' },
  { id: 'wi-point-beach-sf',  name: 'Point Beach State Forest',       lat: 44.2022, lng: -87.5187, radiusKm: 3, category: 'state-forest' },
  { id: 'wi-kohler-andrae',   name: 'Kohler-Andrae State Park',       lat: 43.6628, lng: -87.7217, radiusKm: 2, category: 'state-beach' },
  { id: 'wi-high-cliff',      name: 'High Cliff State Park',          lat: 44.1592, lng: -88.2894, radiusKm: 3, category: 'state-park' },
  // ── Central & southern Wisconsin ────────────────────────────────────────────
  { id: 'wi-devils-lake',     name: "Devil's Lake State Park",        lat: 43.4147, lng: -89.7131, radiusKm: 4, category: 'state-park' },
  { id: 'wi-mirror-lake',     name: 'Mirror Lake State Park',         lat: 43.5650, lng: -89.8200, radiusKm: 2, category: 'state-park' },
  { id: 'wi-governor-dodge',  name: 'Governor Dodge State Park',      lat: 43.0247, lng: -90.1064, radiusKm: 4, category: 'state-park' },
  { id: 'wi-blue-mound',      name: 'Blue Mound State Park',          lat: 43.0281, lng: -89.8528, radiusKm: 2, category: 'state-park' },
  { id: 'wi-wildcat-mountain', name: 'Wildcat Mountain State Park',   lat: 43.6981, lng: -90.5625, radiusKm: 3, category: 'state-park' },
  { id: 'wi-kettle-moraine',  name: 'Kettle Moraine State Forest',    lat: 43.4986, lng: -88.1884, radiusKm: 6, category: 'state-forest' },
  { id: 'wi-roche-a-cri',     name: 'Roche-a-Cri State Park',         lat: 44.0025, lng: -89.8194, radiusKm: 2, category: 'state-park' },
  { id: 'wi-buckhorn',        name: 'Buckhorn State Park',            lat: 43.9392, lng: -90.0039, radiusKm: 3, category: 'state-park' },
  { id: 'wi-mill-bluff',      name: 'Mill Bluff State Park',          lat: 43.9464, lng: -90.3153, radiusKm: 2, category: 'state-park' },
  // ── Mississippi River bluffs ────────────────────────────────────────────────
  { id: 'wi-wyalusing',       name: 'Wyalusing State Park',           lat: 42.9797, lng: -91.1086, radiusKm: 3, category: 'state-park' },
  { id: 'wi-perrot',          name: 'Perrot State Park',              lat: 44.0186, lng: -91.4675, radiusKm: 3, category: 'state-park' },
  { id: 'wi-nelson-dewey',    name: 'Nelson Dewey State Park',        lat: 42.7308, lng: -91.0194, radiusKm: 2, category: 'state-park' },
  // ── Premier wildlife areas ──────────────────────────────────────────────────
  { id: 'wi-horicon-marsh',   name: 'Horicon Marsh',                  lat: 43.5497, lng: -88.6559, radiusKm: 6, category: 'state-preserve' },
  { id: 'wi-mead',            name: 'Mead Wildlife Area',             lat: 44.6723, lng: -89.8086, radiusKm: 5, category: 'state-preserve' },
];
