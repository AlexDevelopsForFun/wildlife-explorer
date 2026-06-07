// Iowa state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs IA.
// Mississippi bluffs (NE) → central lakes & woods → the Loess Hills (W).
// category → state-park 🏞️ · state-forest 🌲
export const STATE_PARKS_IA = [
  // ── Northeast (Mississippi bluffs & Driftless) ──────────────────────────────
  { id: 'ia-pikes-peak',     name: 'Pikes Peak State Park',          lat: 42.9969, lng: -91.1636, radiusKm: 3, category: 'state-park' },
  { id: 'ia-backbone',       name: 'Backbone State Park',            lat: 42.6331, lng: -91.5617, radiusKm: 3, category: 'state-park' },
  { id: 'ia-maquoketa-caves', name: 'Maquoketa Caves State Park',    lat: 42.1183, lng: -90.7781, radiusKm: 2, category: 'state-park' },
  { id: 'ia-bellevue',       name: 'Bellevue State Park',            lat: 42.2472, lng: -90.4228, radiusKm: 2, category: 'state-park' },
  { id: 'ia-palisades-kepler', name: 'Palisades-Kepler State Park',  lat: 41.9075, lng: -91.5064, radiusKm: 2, category: 'state-park' },
  { id: 'ia-wapsipinicon',   name: 'Wapsipinicon State Park',        lat: 42.0953, lng: -91.2856, radiusKm: 2, category: 'state-park' },
  // ── Central Iowa ────────────────────────────────────────────────────────────
  { id: 'ia-ledges',         name: 'Ledges State Park',              lat: 41.9922, lng: -93.8738, radiusKm: 2, category: 'state-park' },
  { id: 'ia-big-creek',      name: 'Big Creek State Park',           lat: 41.8156, lng: -93.7589, radiusKm: 3, category: 'state-park' },
  { id: 'ia-brushy-creek',   name: 'Brushy Creek State Park',        lat: 42.3917, lng: -93.9908, radiusKm: 4, category: 'state-park' },
  { id: 'ia-george-wyth',    name: 'George Wyth Memorial State Park', lat: 42.5353, lng: -92.4011, radiusKm: 2, category: 'state-park' },
  { id: 'ia-dolliver',       name: 'Dolliver Memorial State Park',   lat: 42.3869, lng: -94.0836, radiusKm: 2, category: 'state-park' },
  { id: 'ia-springbrook',    name: 'Springbrook State Park',         lat: 41.7767, lng: -94.4594, radiusKm: 3, category: 'state-park' },
  { id: 'ia-lake-macbride',  name: 'Lake Macbride State Park',       lat: 41.7939, lng: -91.5661, radiusKm: 3, category: 'state-park' },
  { id: 'ia-rock-creek',     name: 'Rock Creek State Park',          lat: 41.7489, lng: -92.8425, radiusKm: 2, category: 'state-park' },
  // ── Southern Iowa ───────────────────────────────────────────────────────────
  { id: 'ia-lacey-keosauqua', name: 'Lacey-Keosauqua State Park',    lat: 40.7103, lng: -91.9814, radiusKm: 3, category: 'state-park' },
  { id: 'ia-geode',          name: 'Geode State Park',               lat: 40.8261, lng: -91.3803, radiusKm: 2, category: 'state-park' },
  { id: 'ia-honey-creek',    name: 'Honey Creek State Park',         lat: 40.8611, lng: -92.9363, radiusKm: 3, category: 'state-park' },
  { id: 'ia-lake-wapello',   name: 'Lake Wapello State Park',        lat: 40.8158, lng: -92.5886, radiusKm: 2, category: 'state-park' },
  // ── Iowa Great Lakes & north-central ────────────────────────────────────────
  { id: 'ia-gull-point',     name: 'Gull Point State Park',          lat: 43.3708, lng: -95.1653, radiusKm: 2, category: 'state-park' },
  { id: 'ia-black-hawk',     name: 'Black Hawk State Park',          lat: 42.2933, lng: -95.0233, radiusKm: 2, category: 'state-park' },
  { id: 'ia-clear-lake',     name: 'Clear Lake State Park',          lat: 43.1106, lng: -93.3947, radiusKm: 2, category: 'state-park' },
  { id: 'ia-pilot-knob',     name: 'Pilot Knob State Park',          lat: 43.2489, lng: -93.5572, radiusKm: 2, category: 'state-park' },
  // ── Loess Hills (west) ──────────────────────────────────────────────────────
  { id: 'ia-stone',          name: 'Stone State Park',               lat: 42.5489, lng: -96.4667, radiusKm: 3, category: 'state-park' },
  { id: 'ia-lewis-and-clark', name: 'Lewis and Clark State Park',    lat: 42.0422, lng: -96.1678, radiusKm: 2, category: 'state-park' },
  { id: 'ia-lake-manawa',    name: 'Lake Manawa State Park',         lat: 41.1980, lng: -95.8580, radiusKm: 3, category: 'state-park' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'ia-loess-hills-sf', name: 'Loess Hills State Forest',       lat: 41.8083, lng: -95.9169, radiusKm: 7, category: 'state-forest' },
  { id: 'ia-shimek-sf',      name: 'Shimek State Forest',            lat: 40.6100, lng: -91.6821, radiusKm: 5, category: 'state-forest' },
  { id: 'ia-stephens-sf',    name: 'Stephens State Forest',          lat: 41.0667, lng: -93.1836, radiusKm: 6, category: 'state-forest' },
];
