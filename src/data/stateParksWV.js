// West Virginia state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs WV
// (+ Blackwater Falls geocoded via Nominatim). Allegheny/Appalachian highlands:
// high valleys, old-growth groves, and boreal relicts. New River Gorge is a
// NATIONAL park (federal) and is excluded. category → state-park 🏞️ ·
// state-forest 🌲 · state-preserve 🦋 (WMAs)
export const STATE_PARKS_WV = [
  // ── Allegheny highlands (the wild core) ─────────────────────────────────────
  { id: 'wv-blackwater-falls', name: 'Blackwater Falls State Park',  lat: 39.1105, lng: -79.4959, radiusKm: 4, category: 'state-park' },
  { id: 'wv-canaan-valley',  name: 'Canaan Valley Resort State Park', lat: 39.0236, lng: -79.4658, radiusKm: 5, category: 'state-park' },
  { id: 'wv-cathedral',      name: 'Cathedral State Park',           lat: 39.3265, lng: -79.5387, radiusKm: 2, category: 'state-park' },
  { id: 'wv-coopers-rock-sf', name: 'Coopers Rock State Forest',     lat: 39.6556, lng: -79.7878, radiusKm: 5, category: 'state-forest' },
  { id: 'wv-audra',          name: 'Audra State Park',               lat: 39.0404, lng: -80.0654, radiusKm: 2, category: 'state-park' },
  { id: 'wv-kumbrabow-sf',   name: 'Kumbrabow State Forest',         lat: 38.6386, lng: -80.0983, radiusKm: 4, category: 'state-forest' },
  { id: 'wv-holly-river',    name: 'Holly River State Park',         lat: 38.6664, lng: -80.3269, radiusKm: 4, category: 'state-park' },
  { id: 'wv-tygart-lake',    name: 'Tygart Lake State Park',         lat: 39.3044, lng: -80.0222, radiusKm: 3, category: 'state-park' },
  // ── Greenbrier Valley & Allegheny Mountains ─────────────────────────────────
  { id: 'wv-watoga',         name: 'Watoga State Park',              lat: 38.1036, lng: -80.1497, radiusKm: 5, category: 'state-park' },
  { id: 'wv-seneca-sf',      name: 'Seneca State Forest',            lat: 38.3276, lng: -79.9353, radiusKm: 5, category: 'state-forest' },
  { id: 'wv-calvin-price-sf', name: 'Calvin Price State Forest',     lat: 38.0636, lng: -80.1517, radiusKm: 4, category: 'state-forest' },
  { id: 'wv-beartown',       name: 'Beartown State Park',            lat: 38.0522, lng: -80.2756, radiusKm: 2, category: 'state-park' },
  { id: 'wv-droop-mountain', name: 'Droop Mountain Battlefield State Park', lat: 38.1100, lng: -80.2722, radiusKm: 2, category: 'state-park' },
  { id: 'wv-greenbrier-sf',  name: 'Greenbrier State Forest',        lat: 37.7396, lng: -80.3334, radiusKm: 5, category: 'state-forest' },
  { id: 'wv-cranberry-wma',  name: 'Cranberry Wildlife Management Area', lat: 38.2764, lng: -80.4122, radiusKm: 6, category: 'state-preserve' },
  // ── New River & southern coalfields ─────────────────────────────────────────
  { id: 'wv-babcock',        name: 'Babcock State Park',             lat: 37.9940, lng: -80.9712, radiusKm: 3, category: 'state-park' },
  { id: 'wv-hawks-nest',     name: 'Hawks Nest State Park',          lat: 38.1225, lng: -81.1278, radiusKm: 2, category: 'state-park' },
  { id: 'wv-grandview',      name: 'Grandview State Park',           lat: 37.8414, lng: -81.0656, radiusKm: 2, category: 'state-park' },
  { id: 'wv-bluestone',      name: 'Bluestone State Park',           lat: 37.6178, lng: -80.9386, radiusKm: 3, category: 'state-park' },
  { id: 'wv-pipestem',       name: 'Pipestem Resort State Park',     lat: 37.5342, lng: -80.9983, radiusKm: 4, category: 'state-park' },
  { id: 'wv-camp-creek',     name: 'Camp Creek State Park',          lat: 37.5039, lng: -81.1319, radiusKm: 2, category: 'state-park' },
  { id: 'wv-twin-falls',     name: 'Twin Falls Resort State Park',   lat: 37.6236, lng: -81.4592, radiusKm: 3, category: 'state-park' },
  { id: 'wv-chief-logan',    name: 'Chief Logan State Park',         lat: 37.8939, lng: -82.0181, radiusKm: 3, category: 'state-park' },
  { id: 'wv-panther-sf',     name: 'Panther State Forest',           lat: 37.4236, lng: -81.8761, radiusKm: 4, category: 'state-forest' },
  { id: 'wv-cabwaylingo-sf', name: 'Cabwaylingo State Forest',       lat: 37.9742, lng: -82.3519, radiusKm: 4, category: 'state-forest' },
  // ── Central & western ───────────────────────────────────────────────────────
  { id: 'wv-cedar-creek',    name: 'Cedar Creek State Park',         lat: 38.8819, lng: -80.8619, radiusKm: 3, category: 'state-park' },
  { id: 'wv-kanawha-sf',     name: 'Kanawha State Forest',           lat: 38.2562, lng: -81.6540, radiusKm: 4, category: 'state-forest' },
  { id: 'wv-north-bend',     name: 'North Bend State Park',          lat: 39.2208, lng: -81.1097, radiusKm: 3, category: 'state-park' },
  { id: 'wv-tomlinson-run',  name: 'Tomlinson Run State Park',       lat: 40.5475, lng: -80.5872, radiusKm: 2, category: 'state-park' },
  // ── Eastern Panhandle ───────────────────────────────────────────────────────
  { id: 'wv-cacapon',        name: 'Cacapon Resort State Park',      lat: 39.5058, lng: -78.3000, radiusKm: 4, category: 'state-park' },
  { id: 'wv-lost-river',     name: 'Lost River State Park',          lat: 38.8964, lng: -78.9131, radiusKm: 3, category: 'state-park' },
];
