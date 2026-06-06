// Georgia state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs GA.
// Blue Ridge → Piedmont → Coastal Plain → Okefenokee & coast. (Anastasia, a
// Wikidata mislabel actually in Florida, excluded.) category → state-park 🏞️ ·
// state-forest 🌲 · state-preserve 🦋
export const STATE_PARKS_GA = [
  // ── North Georgia mountains ─────────────────────────────────────────────────
  { id: 'ga-cloudland-canyon', name: 'Cloudland Canyon State Park',  lat: 34.8403, lng: -85.4829, radiusKm: 3, category: 'state-park' },
  { id: 'ga-fort-mountain',  name: 'Fort Mountain State Park',       lat: 34.7627, lng: -84.7032, radiusKm: 3, category: 'state-park' },
  { id: 'ga-amicalola-falls', name: 'Amicalola Falls State Park',    lat: 34.5654, lng: -84.2427, radiusKm: 3, category: 'state-park' },
  { id: 'ga-vogel',          name: 'Vogel State Park',               lat: 34.7659, lng: -83.9254, radiusKm: 3, category: 'state-park' },
  { id: 'ga-unicoi',         name: 'Unicoi State Park',              lat: 34.7203, lng: -83.7259, radiusKm: 3, category: 'state-park' },
  { id: 'ga-black-rock-mountain', name: 'Black Rock Mountain State Park', lat: 34.9069, lng: -83.4084, radiusKm: 3, category: 'state-park' },
  { id: 'ga-tallulah-gorge', name: 'Tallulah Gorge State Park',      lat: 34.7398, lng: -83.3952, radiusKm: 3, category: 'state-park' },
  { id: 'ga-moccasin-creek', name: 'Moccasin Creek State Park',      lat: 34.8449, lng: -83.5881, radiusKm: 2, category: 'state-park' },
  { id: 'ga-smithgall-woods', name: 'Smithgall Woods Conservation Area', lat: 34.6919, lng: -83.7672, radiusKm: 3, category: 'state-preserve' },
  { id: 'ga-tugaloo',        name: 'Tugaloo State Park',             lat: 34.4991, lng: -83.0781, radiusKm: 3, category: 'state-park' },
  { id: 'ga-victoria-bryant', name: 'Victoria Bryant State Park',    lat: 34.2968, lng: -83.1607, radiusKm: 2, category: 'state-park' },
  // ── Piedmont & metro Atlanta ────────────────────────────────────────────────
  { id: 'ga-red-top-mountain', name: 'Red Top Mountain State Park',  lat: 34.1429, lng: -84.7067, radiusKm: 3, category: 'state-park' },
  { id: 'ga-sweetwater-creek', name: 'Sweetwater Creek State Park',  lat: 33.7538, lng: -84.6390, radiusKm: 3, category: 'state-park' },
  { id: 'ga-panola-mountain', name: 'Panola Mountain State Park',    lat: 33.6234, lng: -84.1728, radiusKm: 2, category: 'state-park' },
  { id: 'ga-arabia-mountain', name: 'Arabia Mountain State Park',    lat: 33.6647, lng: -84.0794, radiusKm: 2, category: 'state-park' },
  { id: 'ga-fort-yargo',     name: 'Fort Yargo State Park',          lat: 33.9684, lng: -83.7302, radiusKm: 3, category: 'state-park' },
  { id: 'ga-hard-labor-creek', name: 'Hard Labor Creek State Park',  lat: 33.6550, lng: -83.5968, radiusKm: 3, category: 'state-park' },
  { id: 'ga-don-carter',     name: 'Don Carter State Park',          lat: 34.3876, lng: -83.7465, radiusKm: 3, category: 'state-park' },
  { id: 'ga-chattahoochee-bend', name: 'Chattahoochee Bend State Park', lat: 33.4297, lng: -84.9895, radiusKm: 4, category: 'state-park' },
  { id: 'ga-high-falls',     name: 'High Falls State Park',          lat: 33.1783, lng: -84.0205, radiusKm: 2, category: 'state-park' },
  { id: 'ga-indian-springs', name: 'Indian Springs State Park',      lat: 33.2474, lng: -83.9235, radiusKm: 2, category: 'state-park' },
  { id: 'ga-watson-mill',    name: 'Watson Mill Bridge State Park',  lat: 34.0250, lng: -83.0750, radiusKm: 2, category: 'state-park' },
  { id: 'ga-fdr',            name: 'F. D. Roosevelt State Park',     lat: 32.8375, lng: -84.8156, radiusKm: 5, category: 'state-park' },
  { id: 'ga-mistletoe',      name: 'Mistletoe State Park',           lat: 33.6433, lng: -82.3852, radiusKm: 3, category: 'state-park' },
  // ── Coastal Plain & south Georgia ───────────────────────────────────────────
  { id: 'ga-providence-canyon', name: 'Providence Canyon State Park', lat: 32.0644, lng: -84.9219, radiusKm: 3, category: 'state-park' },
  { id: 'ga-magnolia-springs', name: 'Magnolia Springs State Park',  lat: 32.8733, lng: -81.9616, radiusKm: 3, category: 'state-park' },
  { id: 'ga-george-l-smith', name: 'George L. Smith State Park',     lat: 32.5586, lng: -82.1194, radiusKm: 3, category: 'state-park' },
  { id: 'ga-little-ocmulgee', name: 'Little Ocmulgee State Park',    lat: 32.0952, lng: -82.8899, radiusKm: 3, category: 'state-park' },
  { id: 'ga-general-coffee', name: 'General Coffee State Park',      lat: 31.5093, lng: -82.7551, radiusKm: 3, category: 'state-park' },
  { id: 'ga-reed-bingham',   name: 'Reed Bingham State Park',        lat: 31.1616, lng: -83.5389, radiusKm: 3, category: 'state-park' },
  { id: 'ga-kolomoki-mounds', name: 'Kolomoki Mounds State Park',    lat: 31.4686, lng: -84.9485, radiusKm: 3, category: 'state-park' },
  { id: 'ga-seminole',       name: 'Seminole State Park',            lat: 30.8050, lng: -84.8792, radiusKm: 3, category: 'state-park' },
  { id: 'ga-dixon-memorial-sf', name: 'Dixon Memorial State Forest', lat: 31.0925, lng: -82.2889, radiusKm: 6, category: 'state-forest' },
  // ── Coast & Okefenokee ──────────────────────────────────────────────────────
  { id: 'ga-skidaway-island', name: 'Skidaway Island State Park',    lat: 31.9493, lng: -81.0537, radiusKm: 3, category: 'state-park' },
  { id: 'ga-crooked-river',  name: 'Crooked River State Park',       lat: 30.8422, lng: -81.5525, radiusKm: 3, category: 'state-park' },
  { id: 'ga-stephen-foster', name: 'Stephen C. Foster State Park',   lat: 30.8231, lng: -82.3644, radiusKm: 5, category: 'state-park' },
  { id: 'ga-altamaha-wma',   name: 'Altamaha Wildlife Management Area', lat: 31.3689, lng: -81.5131, radiusKm: 4, category: 'state-preserve' },
];
