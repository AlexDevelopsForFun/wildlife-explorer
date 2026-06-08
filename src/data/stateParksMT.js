// Montana state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MT
// (Makoshika added manually — it's filtered out but is MT's largest park).
// The Flathead/Mission lakes (W) → the SW mountains & caverns → the Missouri
// near Great Falls → the eastern badlands. Glacier & Yellowstone are FEDERAL
// (excluded). category → state-park 🏞️
export const STATE_PARKS_MT = [
  // ── Flathead & northwest lakes ──────────────────────────────────────────────
  { id: 'mt-wild-horse-island', name: 'Wild Horse Island State Park', lat: 47.8417, lng: -114.2092, radiusKm: 3, category: 'state-park' },
  { id: 'mt-lake-mary-ronan', name: 'Lake Mary Ronan State Park',     lat: 47.9272, lng: -114.3822, radiusKm: 2, category: 'state-park' },
  { id: 'mt-whitefish-lake', name: 'Whitefish Lake State Park',       lat: 48.4250, lng: -114.3700, radiusKm: 3, category: 'state-park' },
  { id: 'mt-lone-pine',      name: 'Lone Pine State Park',            lat: 48.1786, lng: -114.3414, radiusKm: 2, category: 'state-park' },
  { id: 'mt-placid-lake',    name: 'Placid Lake State Park',          lat: 47.1193, lng: -113.5030, radiusKm: 2, category: 'state-park' },
  { id: 'mt-painted-rocks',  name: 'Painted Rocks State Park',        lat: 45.6811, lng: -114.3008, radiusKm: 3, category: 'state-park' },
  // ── Southwest mountains, caverns & headwaters ───────────────────────────────
  { id: 'mt-bannack',        name: 'Bannack State Park',              lat: 45.1591, lng: -112.9986, radiusKm: 3, category: 'state-park' },
  { id: 'mt-lewis-clark-caverns', name: 'Lewis and Clark Caverns State Park', lat: 45.8341, lng: -111.8627, radiusKm: 3, category: 'state-park' },
  { id: 'mt-lost-creek',     name: 'Lost Creek State Park',           lat: 46.2039, lng: -112.9950, radiusKm: 3, category: 'state-park' },
  { id: 'mt-missouri-headwaters', name: 'Missouri Headwaters State Park', lat: 45.9207, lng: -111.4980, radiusKm: 3, category: 'state-park' },
  { id: 'mt-madison-buffalo-jump', name: 'Madison Buffalo Jump State Park', lat: 45.7944, lng: -111.4625, radiusKm: 2, category: 'state-park' },
  // ── Missouri River & Great Falls (central) ──────────────────────────────────
  { id: 'mt-giant-springs',  name: 'Giant Springs Heritage State Park', lat: 47.5344, lng: -111.2297, radiusKm: 3, category: 'state-park' },
  { id: 'mt-sluice-boxes',   name: 'Sluice Boxes State Park',         lat: 47.1639, lng: -110.9510, radiusKm: 4, category: 'state-park' },
  { id: 'mt-first-peoples-buffalo-jump', name: 'First Peoples Buffalo Jump State Park', lat: 47.4897, lng: -111.5290, radiusKm: 3, category: 'state-park' },
  { id: 'mt-tower-rock',     name: 'Tower Rock State Park',           lat: 47.1889, lng: -111.8100, radiusKm: 2, category: 'state-park' },
  // ── Eastern badlands & plains ───────────────────────────────────────────────
  { id: 'mt-makoshika',      name: 'Makoshika State Park',            lat: 47.0833, lng: -104.6925, radiusKm: 5, category: 'state-park' },
  { id: 'mt-medicine-rocks', name: 'Medicine Rocks State Park',       lat: 46.0444, lng: -104.4710, radiusKm: 4, category: 'state-park' },
  { id: 'mt-pictograph-cave', name: 'Pictograph Cave State Park',     lat: 45.7375, lng: -108.4314, radiusKm: 2, category: 'state-park' },
  { id: 'mt-greycliff-prairie-dog', name: 'Greycliff Prairie Dog Town State Park', lat: 45.7597, lng: -109.7794, radiusKm: 2, category: 'state-park' },
  { id: 'mt-pirogue-island', name: 'Pirogue Island State Park',       lat: 46.4417, lng: -105.8225, radiusKm: 3, category: 'state-park' },
];
