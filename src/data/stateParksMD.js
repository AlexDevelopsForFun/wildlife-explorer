// Maryland state parks, forests & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs MD
// (144 raw → curated). Eastern Shore WMAs are premier Chesapeake/Atlantic
// waterfowl & marsh birding; western MD reaches the Appalachian plateau.
// category → state-park 🏞️ · state-forest 🌲 · state-beach 🏖️ · state-preserve 🦋 (WMAs)
export const STATE_PARKS_MD = [
  // ── Atlantic coast & lower Eastern Shore ────────────────────────────────────
  { id: 'md-assateague',     name: 'Assateague State Park',          lat: 38.2292, lng: -75.1436, radiusKm: 3, category: 'state-beach' },
  { id: 'md-pocomoke-river', name: 'Pocomoke River State Park',      lat: 38.1319, lng: -75.4403, radiusKm: 3, category: 'state-park' },
  { id: 'md-janes-island',   name: 'Janes Island State Park',        lat: 38.0164, lng: -75.8575, radiusKm: 3, category: 'state-park' },
  { id: 'md-deal-island-wma', name: 'Deal Island Wildlife Management Area', lat: 38.1864, lng: -75.8653, radiusKm: 4, category: 'state-preserve' },
  { id: 'md-fishing-bay-wma', name: 'Fishing Bay Wildlife Management Area', lat: 38.3322, lng: -75.9317, radiusKm: 5, category: 'state-preserve' },
  { id: 'md-ea-vaughn-wma',  name: 'E.A. Vaughn Wildlife Management Area', lat: 38.0775, lng: -75.3803, radiusKm: 4, category: 'state-preserve' },
  { id: 'md-tubman',         name: 'Harriet Tubman Underground Railroad State Park', lat: 38.4483, lng: -76.1386, radiusKm: 3, category: 'state-park' },
  // ── Upper Eastern Shore ─────────────────────────────────────────────────────
  { id: 'md-tuckahoe',       name: 'Tuckahoe State Park',            lat: 38.9667, lng: -75.9428, radiusKm: 3, category: 'state-park' },
  { id: 'md-martinak',       name: 'Martinak State Park',            lat: 38.8625, lng: -75.8397, radiusKm: 2, category: 'state-park' },
  { id: 'md-elk-neck',       name: 'Elk Neck State Park',            lat: 39.4831, lng: -75.9794, radiusKm: 3, category: 'state-park' },
  { id: 'md-elk-neck-sf',    name: 'Elk Neck State Forest',          lat: 39.5842, lng: -75.9056, radiusKm: 3, category: 'state-forest' },
  // ── Western Shore & Bay ─────────────────────────────────────────────────────
  { id: 'md-sandy-point',    name: 'Sandy Point State Park',         lat: 39.0200, lng: -76.4077, radiusKm: 2, category: 'state-beach' },
  { id: 'md-north-point',    name: 'North Point State Park',         lat: 39.2167, lng: -76.4333, radiusKm: 2, category: 'state-park' },
  { id: 'md-calvert-cliffs', name: 'Calvert Cliffs State Park',      lat: 38.4019, lng: -76.4239, radiusKm: 2, category: 'state-park' },
  { id: 'md-point-lookout',  name: 'Point Lookout State Park',       lat: 38.0644, lng: -76.3344, radiusKm: 2, category: 'state-park' },
  { id: 'md-st-marys-river', name: "St. Mary's River State Park",    lat: 38.2678, lng: -76.4992, radiusKm: 2, category: 'state-park' },
  { id: 'md-smallwood',      name: 'Smallwood State Park',           lat: 38.5564, lng: -77.1853, radiusKm: 2, category: 'state-park' },
  { id: 'md-greenwell',      name: 'Greenwell State Park',           lat: 38.3689, lng: -76.5292, radiusKm: 2, category: 'state-park' },
  { id: 'md-merkle-wma',     name: 'Merkle Wildlife Management Area', lat: 38.7361, lng: -76.7042, radiusKm: 3, category: 'state-preserve' },
  // ── Upper Bay / Northeast ───────────────────────────────────────────────────
  { id: 'md-susquehanna',    name: 'Susquehanna State Park',         lat: 39.6117, lng: -76.1433, radiusKm: 3, category: 'state-park' },
  { id: 'md-rocks',          name: 'Rocks State Park',               lat: 39.6400, lng: -76.4200, radiusKm: 2, category: 'state-park' },
  { id: 'md-gunpowder-falls', name: 'Gunpowder Falls State Park',    lat: 39.4797, lng: -76.5706, radiusKm: 5, category: 'state-park' },
  { id: 'md-patapsco-valley', name: 'Patapsco Valley State Park',    lat: 39.2931, lng: -76.7867, radiusKm: 5, category: 'state-park' },
  // ── Central / Piedmont ──────────────────────────────────────────────────────
  { id: 'md-seneca-creek',   name: 'Seneca Creek State Park',        lat: 39.1450, lng: -77.2564, radiusKm: 3, category: 'state-park' },
  { id: 'md-patuxent-river', name: 'Patuxent River State Park',      lat: 39.2374, lng: -77.0557, radiusKm: 4, category: 'state-park' },
  { id: 'md-mckee-beshers-wma', name: 'McKee-Beshers Wildlife Management Area', lat: 39.0772, lng: -77.3983, radiusKm: 3, category: 'state-preserve' },
  { id: 'md-cedarville-sf',  name: 'Cedarville State Forest',        lat: 38.6403, lng: -76.8203, radiusKm: 3, category: 'state-forest' },
  // ── Catoctin & Blue Ridge ───────────────────────────────────────────────────
  { id: 'md-cunningham-falls', name: 'Cunningham Falls State Park',  lat: 39.5992, lng: -77.4508, radiusKm: 3, category: 'state-park' },
  { id: 'md-gambrill',       name: 'Gambrill State Park',            lat: 39.4733, lng: -77.4919, radiusKm: 2, category: 'state-park' },
  { id: 'md-greenbrier',     name: 'Greenbrier State Park',          lat: 39.5361, lng: -77.6236, radiusKm: 2, category: 'state-park' },
  { id: 'md-south-mountain', name: 'South Mountain State Park',      lat: 39.5542, lng: -77.5997, radiusKm: 5, category: 'state-park' },
  { id: 'md-washington-monument', name: 'Washington Monument State Park', lat: 39.5004, lng: -77.6232, radiusKm: 2, category: 'state-park' },
  // ── Appalachian plateau (far west) ──────────────────────────────────────────
  { id: 'md-rocky-gap',      name: 'Rocky Gap State Park',           lat: 39.7047, lng: -78.6383, radiusKm: 3, category: 'state-park' },
  { id: 'md-dans-mountain',  name: 'Dans Mountain State Park',       lat: 39.5578, lng: -78.9533, radiusKm: 2, category: 'state-park' },
  { id: 'md-green-ridge-sf', name: 'Green Ridge State Forest',       lat: 39.6653, lng: -78.4431, radiusKm: 8, category: 'state-forest' },
  { id: 'md-deep-creek-lake', name: 'Deep Creek Lake State Park',    lat: 39.5250, lng: -79.3050, radiusKm: 3, category: 'state-park' },
  { id: 'md-swallow-falls',  name: 'Swallow Falls State Park',       lat: 39.4967, lng: -79.4253, radiusKm: 2, category: 'state-park' },
  { id: 'md-herrington-manor', name: 'Herrington Manor State Park',  lat: 39.4533, lng: -79.4511, radiusKm: 2, category: 'state-park' },
  { id: 'md-new-germany',    name: 'New Germany State Park',         lat: 39.6333, lng: -79.1217, radiusKm: 2, category: 'state-park' },
  { id: 'md-big-run',        name: 'Big Run State Park',             lat: 39.5450, lng: -79.1372, radiusKm: 3, category: 'state-park' },
  { id: 'md-savage-river-sf', name: 'Savage River State Forest',     lat: 39.6828, lng: -79.2069, radiusKm: 8, category: 'state-forest' },
];
