// South Carolina state parks & forests — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs SC.
// Coast → Midlands → Blue Ridge escarpment. category → state-park 🏞️ ·
// state-forest 🌲 · state-beach 🏖️ · state-preserve 🦋
export const STATE_PARKS_SC = [
  // ── Coast (Lowcountry & Grand Strand) ───────────────────────────────────────
  { id: 'sc-huntington-beach', name: 'Huntington Beach State Park',  lat: 33.5139, lng: -79.0611, radiusKm: 3, category: 'state-park' },
  { id: 'sc-hunting-island', name: 'Hunting Island State Park',      lat: 32.3664, lng: -80.4444, radiusKm: 3, category: 'state-beach' },
  { id: 'sc-edisto-beach',   name: 'Edisto Beach State Park',        lat: 32.5128, lng: -80.2999, radiusKm: 2, category: 'state-beach' },
  { id: 'sc-myrtle-beach',   name: 'Myrtle Beach State Park',        lat: 33.6478, lng: -78.9275, radiusKm: 2, category: 'state-park' },
  { id: 'sc-colleton',       name: 'Colleton State Park',            lat: 33.0625, lng: -80.6158, radiusKm: 2, category: 'state-park' },
  { id: 'sc-givhans-ferry',  name: 'Givhans Ferry State Park',       lat: 33.0321, lng: -80.3772, radiusKm: 2, category: 'state-park' },
  { id: 'sc-old-santee-canal', name: 'Old Santee Canal State Park',  lat: 33.1925, lng: -79.9692, radiusKm: 2, category: 'state-park' },
  // ── Midlands & Sandhills ────────────────────────────────────────────────────
  { id: 'sc-santee',         name: 'Santee State Park',              lat: 33.5181, lng: -80.4889, radiusKm: 4, category: 'state-park' },
  { id: 'sc-poinsett',       name: 'Poinsett State Park',            lat: 33.8067, lng: -80.5394, radiusKm: 2, category: 'state-park' },
  { id: 'sc-lee',            name: 'Lee State Park',                 lat: 34.2047, lng: -80.1956, radiusKm: 2, category: 'state-park' },
  { id: 'sc-sesquicentennial', name: 'Sesquicentennial State Park',  lat: 34.0880, lng: -80.9042, radiusKm: 2, category: 'state-park' },
  { id: 'sc-aiken',          name: 'Aiken State Park',               lat: 33.5507, lng: -81.4904, radiusKm: 2, category: 'state-park' },
  { id: 'sc-cheraw',         name: 'Cheraw State Park',              lat: 34.6475, lng: -79.8943, radiusKm: 3, category: 'state-park' },
  { id: 'sc-lake-warren',    name: 'Lake Warren State Park',         lat: 32.8386, lng: -81.3236, radiusKm: 2, category: 'state-park' },
  { id: 'sc-little-pee-dee', name: 'Little Pee Dee State Park',      lat: 34.3256, lng: -79.2746, radiusKm: 2, category: 'state-park' },
  { id: 'sc-lynches-river',  name: 'Lynches River State Park',       lat: 34.0400, lng: -79.7897, radiusKm: 2, category: 'state-park' },
  { id: 'sc-harbison-sf',    name: 'Harbison State Forest',          lat: 34.0928, lng: -81.1256, radiusKm: 3, category: 'state-forest' },
  { id: 'sc-manchester-sf',  name: 'Manchester State Forest',        lat: 33.8044, lng: -80.5178, radiusKm: 6, category: 'state-forest' },
  { id: 'sc-sand-hills-sf',  name: 'Sand Hills State Forest',        lat: 34.5344, lng: -80.0908, radiusKm: 7, category: 'state-forest' },
  // ── Piedmont & Upstate ──────────────────────────────────────────────────────
  { id: 'sc-kings-mountain', name: 'Kings Mountain State Park',      lat: 35.1305, lng: -81.3454, radiusKm: 3, category: 'state-park' },
  { id: 'sc-andrew-jackson', name: 'Andrew Jackson State Park',      lat: 34.8409, lng: -80.8069, radiusKm: 2, category: 'state-park' },
  { id: 'sc-landsford-canal', name: 'Landsford Canal State Park',    lat: 34.7886, lng: -80.8786, radiusKm: 2, category: 'state-park' },
  { id: 'sc-croft',          name: 'Croft State Park',               lat: 34.8752, lng: -81.8410, radiusKm: 3, category: 'state-park' },
  { id: 'sc-paris-mountain', name: 'Paris Mountain State Park',      lat: 34.9256, lng: -82.3656, radiusKm: 2, category: 'state-park' },
  // ── Blue Ridge escarpment & Jocassee Gorges ─────────────────────────────────
  { id: 'sc-caesars-head',   name: 'Caesars Head State Park',        lat: 35.1167, lng: -82.6000, radiusKm: 3, category: 'state-park' },
  { id: 'sc-jones-gap',      name: 'Jones Gap State Park',           lat: 35.1258, lng: -82.5750, radiusKm: 3, category: 'state-park' },
  { id: 'sc-keowee-toxaway', name: 'Keowee-Toxaway State Natural Area', lat: 34.9300, lng: -82.8831, radiusKm: 3, category: 'state-preserve' },
  { id: 'sc-devils-fork',    name: 'Devils Fork State Park',         lat: 34.9529, lng: -82.9476, radiusKm: 3, category: 'state-park' },
  { id: 'sc-oconee',         name: 'Oconee State Park',              lat: 34.8664, lng: -83.1041, radiusKm: 3, category: 'state-park' },
  { id: 'sc-lake-hartwell',  name: 'Lake Hartwell State Park',       lat: 34.4947, lng: -83.0316, radiusKm: 3, category: 'state-park' },
  { id: 'sc-calhoun-falls',  name: 'Calhoun Falls State Park',       lat: 34.1077, lng: -82.6198, radiusKm: 3, category: 'state-park' },
  { id: 'sc-baker-creek',    name: 'Baker Creek State Park',         lat: 33.8937, lng: -82.3551, radiusKm: 2, category: 'state-park' },
  { id: 'sc-hickory-knob',   name: 'Hickory Knob State Park',        lat: 33.8911, lng: -82.4147, radiusKm: 2, category: 'state-park' },
];
