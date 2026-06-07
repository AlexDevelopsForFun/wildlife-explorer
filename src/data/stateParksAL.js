// Alabama state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs AL.
// Gulf coast & Mobile-Tensaw delta → the Appalachian northeast → Oak Mountain →
// the Eufaula lakes. category → state-park 🏞️ · state-forest 🌲 · state-beach 🏖️ ·
// state-preserve 🦋 (WMAs)
export const STATE_PARKS_AL = [
  // ── Gulf coast & Mobile delta ───────────────────────────────────────────────
  { id: 'al-gulf',           name: 'Gulf State Park',                lat: 30.2637, lng: -87.6776, radiusKm: 3, category: 'state-beach' },
  { id: 'al-meaher',         name: 'Meaher State Park',              lat: 30.6697, lng: -87.9360, radiusKm: 3, category: 'state-park' },
  { id: 'al-historic-blakeley', name: 'Historic Blakeley State Park', lat: 30.7433, lng: -87.9153, radiusKm: 3, category: 'state-park' },
  // ── Appalachian northeast ───────────────────────────────────────────────────
  { id: 'al-cheaha',         name: 'Cheaha State Park',              lat: 33.4856, lng: -85.8092, radiusKm: 3, category: 'state-park' },
  { id: 'al-desoto',         name: 'DeSoto State Park',              lat: 34.4956, lng: -85.6189, radiusKm: 3, category: 'state-park' },
  { id: 'al-monte-sano',     name: 'Monte Sano State Park',          lat: 34.7400, lng: -86.5100, radiusKm: 3, category: 'state-park' },
  { id: 'al-lake-guntersville', name: 'Lake Guntersville State Park', lat: 34.3881, lng: -86.2050, radiusKm: 4, category: 'state-park' },
  { id: 'al-bucks-pocket',   name: "Buck's Pocket State Park",       lat: 34.4708, lng: -86.0644, radiusKm: 3, category: 'state-park' },
  { id: 'al-cathedral-caverns', name: 'Cathedral Caverns State Park', lat: 34.5733, lng: -86.2222, radiusKm: 2, category: 'state-park' },
  { id: 'al-rickwood-caverns', name: 'Rickwood Caverns State Park',  lat: 33.8795, lng: -86.8449, radiusKm: 2, category: 'state-park' },
  // ── Central Alabama ─────────────────────────────────────────────────────────
  { id: 'al-oak-mountain',   name: 'Oak Mountain State Park',        lat: 33.3156, lng: -86.7734, radiusKm: 5, category: 'state-park' },
  { id: 'al-wind-creek',     name: 'Wind Creek State Park',          lat: 32.8600, lng: -85.9300, radiusKm: 3, category: 'state-park' },
  { id: 'al-chewacla',       name: 'Chewacla State Park',            lat: 32.5541, lng: -85.4809, radiusKm: 2, category: 'state-park' },
  { id: 'al-lake-lurleen',   name: 'Lake Lurleen State Park',        lat: 33.2986, lng: -87.6800, radiusKm: 3, category: 'state-park' },
  // ── Tennessee River (north) ─────────────────────────────────────────────────
  { id: 'al-joe-wheeler',    name: 'Joe Wheeler State Park',         lat: 34.8169, lng: -87.3514, radiusKm: 4, category: 'state-park' },
  { id: 'al-mallard-fox-creek-wma', name: 'Mallard-Fox Creek Wildlife Management Area', lat: 34.6853, lng: -87.1389, radiusKm: 4, category: 'state-preserve' },
  // ── Southeast (Chattahoochee / Eufaula) ─────────────────────────────────────
  { id: 'al-lakepoint',      name: 'Lakepoint State Park',           lat: 31.9908, lng: -85.1150, radiusKm: 4, category: 'state-park' },
  { id: 'al-frank-jackson',  name: 'Frank Jackson State Park',       lat: 31.3142, lng: -86.2722, radiusKm: 2, category: 'state-park' },
  { id: 'al-blue-springs',   name: 'Blue Springs State Park',        lat: 31.6597, lng: -85.5063, radiusKm: 2, category: 'state-park' },
  { id: 'al-chattahoochee',  name: 'Chattahoochee State Park',       lat: 31.0103, lng: -85.0306, radiusKm: 2, category: 'state-park' },
  // ── Southwest / Black Belt ──────────────────────────────────────────────────
  { id: 'al-claude-kelley',  name: 'Claude D. Kelley State Park',    lat: 31.2622, lng: -87.4881, radiusKm: 2, category: 'state-park' },
  { id: 'al-roland-cooper',  name: 'Roland Cooper State Park',       lat: 32.0572, lng: -87.2492, radiusKm: 2, category: 'state-park' },
  { id: 'al-chickasaw',      name: 'Chickasaw State Park',           lat: 32.3590, lng: -87.7870, radiusKm: 2, category: 'state-park' },
  { id: 'al-cahaba-river-wma', name: 'Cahaba River Wildlife Management Area', lat: 33.1186, lng: -87.1228, radiusKm: 4, category: 'state-preserve' },
  // ── State forests ───────────────────────────────────────────────────────────
  { id: 'al-geneva-sf',      name: 'Geneva State Forest',            lat: 31.1485, lng: -86.1749, radiusKm: 5, category: 'state-forest' },
  { id: 'al-little-river-sf', name: 'Little River State Forest',     lat: 31.2575, lng: -87.5039, radiusKm: 3, category: 'state-forest' },
];
