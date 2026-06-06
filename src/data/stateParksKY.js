// Kentucky state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs KY;
// the "State Resort Park" flagships (Cumberland Falls, Carter Caves, etc., which
// the "State Park" filter misses) added via Nominatim. West Kentucky wetlands →
// Bluegrass → Cumberland → eastern mountains. category → state-park 🏞️ ·
// state-forest 🌲 · state-preserve 🦋 (WMAs)
export const STATE_PARKS_KY = [
  // ── West Kentucky (Mississippi/Ohio bottoms, lakes & wetlands) ──────────────
  { id: 'ky-john-james-audubon', name: 'John James Audubon State Park', lat: 37.8822, lng: -87.5481, radiusKm: 3, category: 'state-park' },
  { id: 'ky-columbus-belmont', name: 'Columbus-Belmont State Park',   lat: 36.7656, lng: -89.1069, radiusKm: 2, category: 'state-park' },
  { id: 'ky-ballard-wma',    name: 'Ballard Wildlife Management Area', lat: 37.0456, lng: -89.0964, radiusKm: 4, category: 'state-preserve' },
  { id: 'ky-sloughs-wma',    name: 'Sloughs Wildlife Management Area', lat: 37.7958, lng: -87.3314, radiusKm: 5, category: 'state-preserve' },
  { id: 'ky-higginson-henry-wma', name: 'Higginson-Henry Wildlife Management Area', lat: 37.6433, lng: -87.8978, radiusKm: 4, category: 'state-preserve' },
  { id: 'ky-kenlake',        name: 'Kenlake State Park',              lat: 36.7406, lng: -88.1264, radiusKm: 3, category: 'state-park' },
  { id: 'ky-cherokee',       name: 'Cherokee State Park',             lat: 36.7596, lng: -88.1384, radiusKm: 2, category: 'state-park' },
  { id: 'ky-mineral-mound',  name: 'Mineral Mound State Park',        lat: 37.0667, lng: -88.0789, radiusKm: 2, category: 'state-park' },
  { id: 'ky-lake-malone',    name: 'Lake Malone State Park',          lat: 37.0747, lng: -87.0403, radiusKm: 2, category: 'state-park' },
  { id: 'ky-pennyrile-sf',   name: 'Pennyrile State Forest',          lat: 37.0723, lng: -87.6700, radiusKm: 5, category: 'state-forest' },
  // ── Bluegrass & central ─────────────────────────────────────────────────────
  { id: 'ky-ep-tom-sawyer',  name: 'E. P. "Tom" Sawyer State Park',   lat: 38.2844, lng: -85.5595, radiusKm: 2, category: 'state-park' },
  { id: 'ky-big-bone-lick',  name: 'Big Bone Lick State Park',        lat: 38.8869, lng: -84.7480, radiusKm: 3, category: 'state-park' },
  { id: 'ky-general-butler', name: 'General Butler State Park',       lat: 38.6706, lng: -85.1542, radiusKm: 2, category: 'state-park' },
  { id: 'ky-kincaid-lake',   name: 'Kincaid Lake State Park',         lat: 38.7200, lng: -84.2806, radiusKm: 2, category: 'state-park' },
  { id: 'ky-blue-licks',     name: 'Blue Licks Battlefield State Park', lat: 38.4283, lng: -83.9947, radiusKm: 2, category: 'state-park' },
  { id: 'ky-fort-boonesborough', name: 'Fort Boonesborough State Park', lat: 37.8937, lng: -84.2704, radiusKm: 2, category: 'state-park' },
  { id: 'ky-taylorsville-lake', name: 'Taylorsville Lake State Park', lat: 38.0306, lng: -85.2556, radiusKm: 3, category: 'state-park' },
  // ── South-central (Cumberland & the big lakes) ──────────────────────────────
  { id: 'ky-cumberland-falls', name: 'Cumberland Falls State Resort Park', lat: 36.8361, lng: -84.3412, radiusKm: 4, category: 'state-park' },
  { id: 'ky-lake-cumberland', name: 'Lake Cumberland State Resort Park', lat: 36.9040, lng: -85.0724, radiusKm: 3, category: 'state-park' },
  { id: 'ky-general-burnside', name: 'General Burnside State Park',   lat: 36.9758, lng: -84.6022, radiusKm: 2, category: 'state-park' },
  { id: 'ky-levi-jackson',   name: 'Levi Jackson Wilderness Road State Park', lat: 37.0831, lng: -84.0417, radiusKm: 2, category: 'state-park' },
  { id: 'ky-dale-hollow',    name: 'Dale Hollow Lake State Park',     lat: 36.6386, lng: -85.2981, radiusKm: 3, category: 'state-park' },
  { id: 'ky-green-river-lake', name: 'Green River Lake State Park',   lat: 37.2761, lng: -85.3350, radiusKm: 3, category: 'state-park' },
  { id: 'ky-nolin-lake',     name: 'Nolin Lake State Park',          lat: 37.3047, lng: -86.2136, radiusKm: 3, category: 'state-park' },
  { id: 'ky-barren-river-lake', name: 'Barren River Lake State Resort Park', lat: 36.8614, lng: -86.0608, radiusKm: 3, category: 'state-park' },
  // ── Eastern mountains (Cumberland Plateau & Pine Mountain) ──────────────────
  { id: 'ky-natural-bridge', name: 'Natural Bridge State Park',       lat: 37.7775, lng: -83.6936, radiusKm: 3, category: 'state-park' },
  { id: 'ky-carter-caves',   name: 'Carter Caves State Resort Park',  lat: 38.3714, lng: -83.1252, radiusKm: 3, category: 'state-park' },
  { id: 'ky-greenbo-lake',   name: 'Greenbo Lake State Resort Park',  lat: 38.4881, lng: -82.8905, radiusKm: 3, category: 'state-park' },
  { id: 'ky-grayson-lake',   name: 'Grayson Lake State Park',         lat: 38.2161, lng: -83.0175, radiusKm: 3, category: 'state-park' },
  { id: 'ky-jenny-wiley',    name: 'Jenny Wiley State Park',          lat: 37.6972, lng: -82.7297, radiusKm: 3, category: 'state-park' },
  { id: 'ky-paintsville-lake', name: 'Paintsville Lake State Park',   lat: 37.8398, lng: -82.8710, radiusKm: 3, category: 'state-park' },
  { id: 'ky-fishtrap-lake',  name: 'Fishtrap Lake State Park',        lat: 37.4350, lng: -82.4194, radiusKm: 3, category: 'state-park' },
  { id: 'ky-pine-mountain',  name: 'Pine Mountain State Resort Park', lat: 36.7357, lng: -83.7383, radiusKm: 3, category: 'state-park' },
  { id: 'ky-kingdom-come',   name: 'Kingdom Come State Park',         lat: 36.9968, lng: -82.9788, radiusKm: 3, category: 'state-park' },
  { id: 'ky-kentucky-ridge-sf', name: 'Kentucky Ridge State Forest', lat: 36.6842, lng: -83.8069, radiusKm: 5, category: 'state-forest' },
];
