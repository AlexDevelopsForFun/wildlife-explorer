// Arizona state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs AZ
// (Boyce Thompson Arboretum added manually — a top-tier birding hotspot).
// The Sky Island birding parks (SE) → the Sonoran saguaro country → the Verde
// Valley riparian corridor → the lower Colorado River. Grand Canyon, Saguaro &
// Petrified Forest are FEDERAL (excluded). category → state-park 🏞️
export const STATE_PARKS_AZ = [
  // ── Sky Islands & southeast (premier birding) ───────────────────────────────
  { id: 'az-catalina',       name: 'Catalina State Park',            lat: 32.4362, lng: -110.9048, radiusKm: 4, category: 'state-park' },
  { id: 'az-patagonia-lake', name: 'Patagonia Lake State Park',      lat: 31.4939, lng: -110.8540, radiusKm: 3, category: 'state-park' },
  { id: 'az-kartchner-caverns', name: 'Kartchner Caverns State Park', lat: 31.8375, lng: -110.3472, radiusKm: 3, category: 'state-park' },
  { id: 'az-oracle',         name: 'Oracle State Park',              lat: 32.6107, lng: -110.7714, radiusKm: 3, category: 'state-park' },
  { id: 'az-roper-lake',     name: 'Roper Lake State Park',          lat: 32.7558, lng: -109.7050, radiusKm: 2, category: 'state-park' },
  { id: 'az-picacho-peak',   name: 'Picacho Peak State Park',        lat: 32.6311, lng: -111.4156, radiusKm: 3, category: 'state-park' },
  // ── Sonoran central (Phoenix country) ───────────────────────────────────────
  { id: 'az-lost-dutchman',  name: 'Lost Dutchman State Park',       lat: 33.4561, lng: -111.4770, radiusKm: 4, category: 'state-park' },
  { id: 'az-boyce-thompson', name: 'Boyce Thompson Arboretum State Park', lat: 33.2786, lng: -111.1608, radiusKm: 3, category: 'state-park' },
  { id: 'az-alamo-lake',     name: 'Alamo Lake State Park',          lat: 34.2322, lng: -113.6028, radiusKm: 5, category: 'state-park' },
  // ── Verde Valley & red rock (central highlands) ─────────────────────────────
  { id: 'az-dead-horse-ranch', name: 'Dead Horse Ranch State Park',  lat: 34.7539, lng: -112.0140, radiusKm: 3, category: 'state-park' },
  { id: 'az-red-rock',       name: 'Red Rock State Park',            lat: 34.8147, lng: -111.8280, radiusKm: 3, category: 'state-park' },
  { id: 'az-slide-rock',     name: 'Slide Rock State Park',          lat: 34.9153, lng: -111.7310, radiusKm: 2, category: 'state-park' },
  { id: 'az-tonto-natural-bridge', name: 'Tonto Natural Bridge State Park', lat: 34.3206, lng: -111.4567, radiusKm: 2, category: 'state-park' },
  // ── Lower Colorado River (west) ─────────────────────────────────────────────
  { id: 'az-lake-havasu',    name: 'Lake Havasu State Park',         lat: 34.4359, lng: -114.2855, radiusKm: 3, category: 'state-park' },
  { id: 'az-cattail-cove',   name: 'Cattail Cove State Park',        lat: 34.3506, lng: -114.1700, radiusKm: 2, category: 'state-park' },
  { id: 'az-buckskin-mountain', name: 'Buckskin Mountain State Park', lat: 34.2575, lng: -114.1616, radiusKm: 3, category: 'state-park' },
  // ── Northeast (high desert & Little Colorado) ───────────────────────────────
  { id: 'az-homolovi',       name: 'Homolovi State Park',            lat: 35.0253, lng: -110.6290, radiusKm: 4, category: 'state-park' },
  { id: 'az-lyman-lake',     name: 'Lyman Lake State Park',          lat: 34.3631, lng: -109.3747, radiusKm: 3, category: 'state-park' },
];
