// Washington state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs WA.
// The outer-coast & Salish Sea straits (orcas, seabirds) → the San Juans → the
// Cascade rivers → the Channeled Scablands of the east → the Columbia Gorge.
// Mount Rainier, Olympic & North Cascades are FEDERAL (excluded). category → state-park 🏞️
export const STATE_PARKS_WA = [
  // ── Outer coast & Olympic straits ───────────────────────────────────────────
  { id: 'wa-cape-disappointment', name: 'Cape Disappointment State Park', lat: 46.2912, lng: -124.0720, radiusKm: 3, category: 'state-park' },
  { id: 'wa-fort-worden',    name: 'Fort Worden State Park',         lat: 48.1398, lng: -122.7659, radiusKm: 2, category: 'state-park' },
  { id: 'wa-fort-flagler',   name: 'Fort Flagler State Park',        lat: 48.0972, lng: -122.6947, radiusKm: 2, category: 'state-park' },
  { id: 'wa-fort-ebey',      name: 'Fort Ebey State Park',           lat: 48.2170, lng: -122.6770, radiusKm: 2, category: 'state-park' },
  { id: 'wa-twin-harbors',   name: 'Twin Harbors State Park',        lat: 46.8567, lng: -124.1069, radiusKm: 2, category: 'state-park' },
  { id: 'wa-grayland-beach', name: 'Grayland Beach State Park',      lat: 46.7886, lng: -124.0930, radiusKm: 2, category: 'state-park' },
  // ── Salish Sea & San Juans ──────────────────────────────────────────────────
  { id: 'wa-deception-pass', name: 'Deception Pass State Park',      lat: 48.4075, lng: -122.6450, radiusKm: 4, category: 'state-park' },
  { id: 'wa-moran',          name: 'Moran State Park',               lat: 48.6624, lng: -122.8367, radiusKm: 4, category: 'state-park' },
  { id: 'wa-larrabee',       name: 'Larrabee State Park',            lat: 48.6575, lng: -122.4790, radiusKm: 3, category: 'state-park' },
  { id: 'wa-lime-kiln-point', name: 'Lime Kiln Point State Park',    lat: 48.5153, lng: -123.1500, radiusKm: 2, category: 'state-park' },
  { id: 'wa-camano-island',  name: 'Camano Island State Park',       lat: 48.1287, lng: -122.4996, radiusKm: 2, category: 'state-park' },
  // ── Cascade rivers & lakes ──────────────────────────────────────────────────
  { id: 'wa-wallace-falls',  name: 'Wallace Falls State Park',       lat: 47.8706, lng: -121.6540, radiusKm: 3, category: 'state-park' },
  { id: 'wa-lake-wenatchee', name: 'Lake Wenatchee State Park',      lat: 47.8114, lng: -120.7280, radiusKm: 3, category: 'state-park' },
  { id: 'wa-rasar',          name: 'Rasar State Park',               lat: 48.5177, lng: -121.9030, radiusKm: 3, category: 'state-park' },
  // ── Channeled Scablands & eastern Washington ────────────────────────────────
  { id: 'wa-steamboat-rock', name: 'Steamboat Rock State Park',      lat: 47.8631, lng: -119.1331, radiusKm: 4, category: 'state-park' },
  { id: 'wa-sun-lakes-dry-falls', name: 'Sun Lakes-Dry Falls State Park', lat: 47.5964, lng: -119.3610, radiusKm: 4, category: 'state-park' },
  { id: 'wa-palouse-falls',  name: 'Palouse Falls State Park',       lat: 46.6669, lng: -118.2240, radiusKm: 3, category: 'state-park' },
  { id: 'wa-potholes',       name: 'Potholes State Park',            lat: 46.9794, lng: -119.3508, radiusKm: 4, category: 'state-park' },
  { id: 'wa-mount-spokane',  name: 'Mount Spokane State Park',       lat: 47.9253, lng: -117.1160, radiusKm: 5, category: 'state-park' },
  { id: 'wa-fields-spring',  name: 'Fields Spring State Park',       lat: 46.0772, lng: -117.1719, radiusKm: 3, category: 'state-park' },
  // ── Columbia Gorge ──────────────────────────────────────────────────────────
  { id: 'wa-beacon-rock',    name: 'Beacon Rock State Park',         lat: 45.6617, lng: -122.0160, radiusKm: 3, category: 'state-park' },
  { id: 'wa-columbia-hills', name: 'Columbia Hills Historical State Park', lat: 45.6428, lng: -121.1070, radiusKm: 3, category: 'state-park' },
];
