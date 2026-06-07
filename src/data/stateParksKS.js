// Kansas state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs KS.
// High Plains oases & chalk badlands (W) → the Smoky Hills reservoirs → the
// eastern lakes → the Flint Hills, plus Cheyenne Bottoms (premier shorebird marsh).
// category → state-park 🏞️ · state-preserve 🦋 (wildlife area)
export const STATE_PARKS_KS = [
  // ── High Plains & western badlands ──────────────────────────────────────────
  { id: 'ks-lake-scott',     name: 'Lake Scott State Park',          lat: 38.6756, lng: -100.9170, radiusKm: 3, category: 'state-park' },
  { id: 'ks-little-jerusalem', name: 'Little Jerusalem Badlands State Park', lat: 38.8025, lng: -100.9425, radiusKm: 3, category: 'state-park' },
  { id: 'ks-cedar-bluff',    name: 'Cedar Bluff State Park',         lat: 38.7747, lng: -99.7717, radiusKm: 4, category: 'state-park' },
  { id: 'ks-prairie-dog',    name: 'Prairie Dog State Park',         lat: 39.8069, lng: -99.9514, radiusKm: 3, category: 'state-park' },
  { id: 'ks-webster',        name: 'Webster State Park',             lat: 39.4097, lng: -99.4494, radiusKm: 3, category: 'state-park' },
  { id: 'ks-meade',          name: 'Meade State Park',               lat: 37.1722, lng: -100.4510, radiusKm: 2, category: 'state-park' },
  // ── Smoky Hills (central) ───────────────────────────────────────────────────
  { id: 'ks-kanopolis',      name: 'Kanopolis State Park',           lat: 38.6572, lng: -97.9997, radiusKm: 4, category: 'state-park' },
  { id: 'ks-mushroom-rock',  name: 'Mushroom Rock State Park',       lat: 38.7258, lng: -98.0306, radiusKm: 2, category: 'state-park' },
  { id: 'ks-wilson',         name: 'Wilson State Park',              lat: 38.9167, lng: -98.5044, radiusKm: 4, category: 'state-park' },
  { id: 'ks-glen-elder',     name: 'Glen Elder State Park',          lat: 39.5028, lng: -98.3253, radiusKm: 4, category: 'state-park' },
  { id: 'ks-lovewell',       name: 'Lovewell State Park',            lat: 38.9044, lng: -98.0508, radiusKm: 3, category: 'state-park' },
  // ── Eastern reservoirs ──────────────────────────────────────────────────────
  { id: 'ks-clinton',        name: 'Clinton State Park',             lat: 38.9358, lng: -95.3683, radiusKm: 4, category: 'state-park' },
  { id: 'ks-perry',          name: 'Perry State Park',               lat: 39.1406, lng: -95.4881, radiusKm: 4, category: 'state-park' },
  { id: 'ks-tuttle-creek',   name: 'Tuttle Creek State Park',        lat: 39.2556, lng: -96.5836, radiusKm: 5, category: 'state-park' },
  { id: 'ks-milford',        name: 'Milford State Park',             lat: 39.1040, lng: -96.9000, radiusKm: 5, category: 'state-park' },
  { id: 'ks-eisenhower',     name: 'Eisenhower State Park',          lat: 38.5203, lng: -95.7489, radiusKm: 3, category: 'state-park' },
  { id: 'ks-hillsdale',      name: 'Hillsdale State Park',           lat: 38.6681, lng: -94.9178, radiusKm: 4, category: 'state-park' },
  { id: 'ks-kaw-river',      name: 'Kaw River State Park',           lat: 39.0667, lng: -95.7583, radiusKm: 2, category: 'state-park' },
  // ── Flint Hills & southeast ─────────────────────────────────────────────────
  { id: 'ks-el-dorado',      name: 'El Dorado State Park',           lat: 37.8611, lng: -96.7719, radiusKm: 5, category: 'state-park' },
  { id: 'ks-cross-timbers',  name: 'Cross Timbers State Park',       lat: 37.7694, lng: -95.9392, radiusKm: 4, category: 'state-park' },
  { id: 'ks-fall-river',     name: 'Fall River State Park',          lat: 37.6550, lng: -96.0933, radiusKm: 3, category: 'state-park' },
  { id: 'ks-elk-city',       name: 'Elk City State Park',            lat: 37.2556, lng: -95.7711, radiusKm: 3, category: 'state-park' },
  { id: 'ks-cheney',         name: 'Cheney State Park',              lat: 37.7333, lng: -97.8167, radiusKm: 4, category: 'state-park' },
  { id: 'ks-crawford',       name: 'Crawford State Park',            lat: 37.6292, lng: -94.8058, radiusKm: 3, category: 'state-park' },
  // ── Premier birding marsh ───────────────────────────────────────────────────
  { id: 'ks-cheyenne-bottoms', name: 'Cheyenne Bottoms Wildlife Area', lat: 38.4500, lng: -98.6400, radiusKm: 7, category: 'state-preserve' },
];
