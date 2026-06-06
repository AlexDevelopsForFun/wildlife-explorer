// Michigan state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MI.
// Upper Peninsula wilderness → Lake Michigan dune coast → Saginaw Bay / Lake
// Huron migration → the Straits. Sleeping Bear & Isle Royale (federal) excluded.
// category → state-park 🏞️ · state-forest 🌲 · state-beach 🏖️
export const STATE_PARKS_MI = [
  // ── Upper Peninsula ─────────────────────────────────────────────────────────
  { id: 'mi-porcupine-mountains', name: 'Porcupine Mountains Wilderness State Park', lat: 46.7822, lng: -89.7542, radiusKm: 8, category: 'state-park' },
  { id: 'mi-tahquamenon-falls', name: 'Tahquamenon Falls State Park', lat: 46.5964, lng: -85.2083, radiusKm: 6, category: 'state-park' },
  { id: 'mi-fort-wilkins',   name: 'Fort Wilkins Historic State Park', lat: 47.4672, lng: -87.8697, radiusKm: 3, category: 'state-park' },
  { id: 'mi-mclain',         name: 'McLain State Park',              lat: 47.2368, lng: -88.6073, radiusKm: 2, category: 'state-park' },
  { id: 'mi-craig-lake',     name: 'Craig Lake State Park',          lat: 46.6119, lng: -88.1781, radiusKm: 5, category: 'state-park' },
  { id: 'mi-van-riper',      name: 'Van Riper State Park',           lat: 46.5239, lng: -87.9842, radiusKm: 3, category: 'state-park' },
  { id: 'mi-lake-gogebic',   name: 'Lake Gogebic State Park',        lat: 46.4575, lng: -89.5761, radiusKm: 3, category: 'state-park' },
  { id: 'mi-muskallonge-lake', name: 'Muskallonge Lake State Park',  lat: 46.6764, lng: -85.6358, radiusKm: 3, category: 'state-park' },
  { id: 'mi-indian-lake',    name: 'Indian Lake State Park',         lat: 45.9439, lng: -86.3317, radiusKm: 3, category: 'state-park' },
  { id: 'mi-palms-book',     name: 'Palms Book State Park',          lat: 46.0077, lng: -86.3783, radiusKm: 2, category: 'state-park' },
  { id: 'mi-fayette',        name: 'Fayette Historic State Park',    lat: 45.7167, lng: -86.6611, radiusKm: 2, category: 'state-park' },
  // ── Straits & northern Lower Peninsula ──────────────────────────────────────
  { id: 'mi-wilderness',     name: 'Wilderness State Park',          lat: 45.7342, lng: -84.9028, radiusKm: 5, category: 'state-park' },
  { id: 'mi-mackinac-island', name: 'Mackinac Island State Park',    lat: 45.8667, lng: -84.6167, radiusKm: 3, category: 'state-park' },
  { id: 'mi-petoskey',       name: 'Petoskey State Park',            lat: 45.4030, lng: -84.9075, radiusKm: 2, category: 'state-park' },
  { id: 'mi-hartwick-pines', name: 'Hartwick Pines State Park',      lat: 44.7472, lng: -84.6686, radiusKm: 3, category: 'state-park' },
  { id: 'mi-cheboygan',      name: 'Cheboygan State Park',           lat: 45.6500, lng: -84.4083, radiusKm: 3, category: 'state-park' },
  // ── Northwest Lower (Lake Michigan / Traverse) ──────────────────────────────
  { id: 'mi-leelanau',       name: 'Leelanau State Park',            lat: 45.1864, lng: -85.5622, radiusKm: 3, category: 'state-park' },
  { id: 'mi-dh-day',         name: 'D. H. Day State Park',           lat: 44.8989, lng: -86.0200, radiusKm: 2, category: 'state-park' },
  { id: 'mi-fishermans-island', name: "Fisherman's Island State Park", lat: 45.2667, lng: -85.3611, radiusKm: 3, category: 'state-park' },
  { id: 'mi-interlochen',    name: 'Interlochen State Park',         lat: 44.6278, lng: -85.7628, radiusKm: 2, category: 'state-park' },
  // ── West Lower (the dune coast) ─────────────────────────────────────────────
  { id: 'mi-ludington',      name: 'Ludington State Park',           lat: 44.0412, lng: -86.5043, radiusKm: 4, category: 'state-park' },
  { id: 'mi-silver-lake',    name: 'Silver Lake State Park',         lat: 43.6786, lng: -86.5111, radiusKm: 3, category: 'state-beach' },
  { id: 'mi-hoffmaster',     name: 'P. J. Hoffmaster State Park',    lat: 43.1239, lng: -86.2650, radiusKm: 3, category: 'state-park' },
  { id: 'mi-muskegon',       name: 'Muskegon State Park',            lat: 43.2463, lng: -86.3440, radiusKm: 3, category: 'state-park' },
  { id: 'mi-saugatuck-dunes', name: 'Saugatuck Dunes State Park',    lat: 42.7033, lng: -86.1997, radiusKm: 3, category: 'state-park' },
  { id: 'mi-warren-dunes',   name: 'Warren Dunes State Park',        lat: 41.9153, lng: -86.5933, radiusKm: 3, category: 'state-beach' },
  { id: 'mi-grand-mere',     name: 'Grand Mere State Park',          lat: 41.9931, lng: -86.5497, radiusKm: 2, category: 'state-park' },
  // ── East Lower (Lake Huron, Saginaw Bay & SE) ───────────────────────────────
  { id: 'mi-tawas-point',    name: 'Tawas Point State Park',         lat: 44.2556, lng: -83.4461, radiusKm: 2, category: 'state-park' },
  { id: 'mi-port-crescent',  name: 'Port Crescent State Park',       lat: 44.0047, lng: -83.0550, radiusKm: 3, category: 'state-park' },
  { id: 'mi-bay-city',       name: 'Bay City State Park',            lat: 43.6661, lng: -83.9053, radiusKm: 3, category: 'state-park' },
  { id: 'mi-sleeper',        name: 'Albert E. Sleeper State Park',   lat: 43.9725, lng: -83.2086, radiusKm: 2, category: 'state-park' },
  { id: 'mi-negwegon',       name: 'Negwegon State Park',            lat: 44.8561, lng: -83.3269, radiusKm: 3, category: 'state-park' },
  { id: 'mi-sterling',       name: 'Sterling State Park',            lat: 41.9156, lng: -83.3336, radiusKm: 2, category: 'state-park' },
  { id: 'mi-algonac',        name: 'Algonac State Park',             lat: 42.6444, lng: -82.5239, radiusKm: 2, category: 'state-park' },
  // ── Southern recreation areas ───────────────────────────────────────────────
  { id: 'mi-waterloo',       name: 'Waterloo State Recreation Area', lat: 42.3614, lng: -84.1908, radiusKm: 5, category: 'state-park' },
  { id: 'mi-seven-lakes',    name: 'Seven Lakes State Park',         lat: 42.8090, lng: -83.6681, radiusKm: 2, category: 'state-park' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'mi-allegan-sf',     name: 'Allegan State Forest',           lat: 42.5336, lng: -85.9661, radiusKm: 7, category: 'state-forest' },
  { id: 'mi-au-sable-sf',    name: 'Au Sable State Forest',          lat: 44.1000, lng: -84.1700, radiusKm: 8, category: 'state-forest' },
];
