// Ohio state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs OH.
// Lake Erie marshes (the warbler-migration coast) → central reservoirs →
// Hocking Hills & the Appalachian southeast. category → state-park 🏞️ · state-forest 🌲
export const STATE_PARKS_OH = [
  // ── Lake Erie coast & islands (premier spring migration) ────────────────────
  { id: 'oh-maumee-bay',     name: 'Maumee Bay State Park',          lat: 41.6833, lng: -83.3833, radiusKm: 3, category: 'state-park' },
  { id: 'oh-crane-creek',    name: 'Crane Creek State Park',         lat: 41.6211, lng: -83.1611, radiusKm: 2, category: 'state-park' },
  { id: 'oh-east-harbor',    name: 'East Harbor State Park',         lat: 41.5476, lng: -82.8099, radiusKm: 3, category: 'state-park' },
  { id: 'oh-catawba-island', name: 'Catawba Island State Park',      lat: 41.5750, lng: -82.8571, radiusKm: 2, category: 'state-park' },
  { id: 'oh-kelleys-island', name: 'Kelleys Island State Park',      lat: 41.6016, lng: -82.6977, radiusKm: 2, category: 'state-park' },
  { id: 'oh-middle-bass-island', name: 'Middle Bass Island State Park', lat: 41.6709, lng: -82.8100, radiusKm: 2, category: 'state-park' },
  { id: 'oh-headlands-beach', name: 'Headlands Beach State Park',    lat: 41.7578, lng: -81.2889, radiusKm: 2, category: 'state-park' },
  { id: 'oh-geneva',         name: 'Geneva State Park',              lat: 41.8542, lng: -80.9720, radiusKm: 2, category: 'state-park' },
  // ── Northeast Ohio ──────────────────────────────────────────────────────────
  { id: 'oh-punderson',      name: 'Punderson State Park',           lat: 41.4590, lng: -81.2136, radiusKm: 2, category: 'state-park' },
  { id: 'oh-nelson-kennedy-ledges', name: 'Nelson Kennedy Ledges State Park', lat: 41.3285, lng: -81.0392, radiusKm: 2, category: 'state-park' },
  { id: 'oh-west-branch',    name: 'West Branch State Park',         lat: 41.1431, lng: -81.1082, radiusKm: 3, category: 'state-park' },
  { id: 'oh-pymatuning',     name: 'Pymatuning State Park (Ohio)',   lat: 41.6067, lng: -80.5322, radiusKm: 3, category: 'state-park' },
  { id: 'oh-mosquito-lake',  name: 'Mosquito Lake State Park',       lat: 41.3427, lng: -80.7555, radiusKm: 3, category: 'state-park' },
  // ── Central Ohio ────────────────────────────────────────────────────────────
  { id: 'oh-alum-creek',     name: 'Alum Creek State Park',          lat: 40.1917, lng: -82.9731, radiusKm: 3, category: 'state-park' },
  { id: 'oh-delaware',       name: 'Delaware State Park',            lat: 40.3586, lng: -83.0692, radiusKm: 3, category: 'state-park' },
  { id: 'oh-deer-creek',     name: 'Deer Creek State Park',          lat: 39.6461, lng: -83.2509, radiusKm: 3, category: 'state-park' },
  { id: 'oh-grand-lake-st-marys', name: 'Grand Lake St. Marys State Park', lat: 40.5312, lng: -84.4997, radiusKm: 4, category: 'state-park' },
  { id: 'oh-indian-lake',    name: 'Indian Lake State Park',         lat: 40.4808, lng: -83.8661, radiusKm: 3, category: 'state-park' },
  // ── Southwest Ohio ──────────────────────────────────────────────────────────
  { id: 'oh-caesar-creek',   name: 'Caesar Creek State Park',        lat: 39.5222, lng: -84.0139, radiusKm: 3, category: 'state-park' },
  { id: 'oh-east-fork',      name: 'East Fork State Park',           lat: 39.0200, lng: -84.1139, radiusKm: 4, category: 'state-park' },
  { id: 'oh-hueston-woods',  name: 'Hueston Woods State Park',       lat: 39.5761, lng: -84.7456, radiusKm: 3, category: 'state-park' },
  { id: 'oh-john-bryan',     name: 'John Bryan State Park',          lat: 39.7911, lng: -83.8480, radiusKm: 2, category: 'state-park' },
  { id: 'oh-cowan-lake',     name: 'Cowan Lake State Park',          lat: 39.3890, lng: -83.9049, radiusKm: 2, category: 'state-park' },
  // ── Hocking Hills & Appalachian southeast ───────────────────────────────────
  { id: 'oh-hocking-hills',  name: 'Hocking Hills State Park',       lat: 39.4306, lng: -82.5389, radiusKm: 3, category: 'state-park' },
  { id: 'oh-lake-hope',      name: 'Lake Hope State Park',           lat: 39.3377, lng: -82.3534, radiusKm: 3, category: 'state-park' },
  { id: 'oh-burr-oak',       name: 'Burr Oak State Park',            lat: 39.5447, lng: -82.0306, radiusKm: 3, category: 'state-park' },
  { id: 'oh-strouds-run',    name: 'Strouds Run State Park',         lat: 39.3402, lng: -82.0245, radiusKm: 3, category: 'state-park' },
  { id: 'oh-tar-hollow',     name: 'Tar Hollow State Park',          lat: 39.3560, lng: -82.7770, radiusKm: 3, category: 'state-park' },
  { id: 'oh-great-seal',     name: 'Great Seal State Park',          lat: 39.3694, lng: -82.9417, radiusKm: 3, category: 'state-park' },
  { id: 'oh-scioto-trail',   name: 'Scioto Trail State Park',        lat: 39.2286, lng: -82.9514, radiusKm: 3, category: 'state-park' },
  { id: 'oh-forked-run',     name: 'Forked Run State Park',          lat: 39.1015, lng: -81.7876, radiusKm: 3, category: 'state-park' },
  { id: 'oh-salt-fork',      name: 'Salt Fork State Park',           lat: 40.1022, lng: -81.4980, radiusKm: 5, category: 'state-park' },
  { id: 'oh-mohican',        name: 'Mohican State Park',             lat: 40.6091, lng: -82.2630, radiusKm: 3, category: 'state-park' },
  { id: 'oh-dillon',         name: 'Dillon State Park',              lat: 40.0597, lng: -82.1617, radiusKm: 3, category: 'state-park' },
  { id: 'oh-shawnee',        name: 'Shawnee State Park',             lat: 38.7347, lng: -83.1983, radiusKm: 3, category: 'state-park' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'oh-shawnee-sf',     name: 'Shawnee State Forest',           lat: 38.6932, lng: -83.1289, radiusKm: 8, category: 'state-forest' },
  { id: 'oh-zaleski-sf',     name: 'Zaleski State Forest',           lat: 39.2595, lng: -82.3990, radiusKm: 6, category: 'state-forest' },
  { id: 'oh-mohican-sf',     name: 'Mohican-Memorial State Forest',  lat: 40.6000, lng: -82.3000, radiusKm: 4, category: 'state-forest' },
];
