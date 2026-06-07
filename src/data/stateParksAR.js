// Arkansas state parks & WMAs — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs AR.
// The Ozarks → the Arkansas River Valley peaks → the Ouachitas → the Delta &
// Cache River swamps. category → state-park 🏞️ · state-preserve 🦋 (WMAs/natural areas)
export const STATE_PARKS_AR = [
  // ── Ozarks (northwest) ──────────────────────────────────────────────────────
  { id: 'ar-devils-den',     name: "Devil's Den State Park",         lat: 35.7806, lng: -94.2517, radiusKm: 3, category: 'state-park' },
  { id: 'ar-hobbs',          name: 'Hobbs State Park – Conservation Area', lat: 36.2850, lng: -93.9386, radiusKm: 5, category: 'state-park' },
  { id: 'ar-withrow-springs', name: 'Withrow Springs State Park',     lat: 36.1660, lng: -93.7168, radiusKm: 2, category: 'state-park' },
  { id: 'ar-lake-fort-smith', name: 'Lake Fort Smith State Park',    lat: 35.7006, lng: -94.1206, radiusKm: 3, category: 'state-park' },
  { id: 'ar-buffalo-river',  name: 'Buffalo River State Park',       lat: 36.0781, lng: -92.5683, radiusKm: 3, category: 'state-park' },
  { id: 'ar-bull-shoals',    name: 'Bull Shoals-White River State Park', lat: 36.3583, lng: -92.5814, radiusKm: 3, category: 'state-park' },
  // ── Arkansas River Valley (the peaks) ───────────────────────────────────────
  { id: 'ar-petit-jean',     name: 'Petit Jean State Park',          lat: 35.1151, lng: -92.9354, radiusKm: 3, category: 'state-park' },
  { id: 'ar-mount-nebo',     name: 'Mount Nebo State Park',          lat: 35.2208, lng: -93.2550, radiusKm: 2, category: 'state-park' },
  { id: 'ar-mount-magazine', name: 'Mount Magazine State Park',      lat: 35.1746, lng: -93.6189, radiusKm: 3, category: 'state-park' },
  { id: 'ar-lake-dardanelle', name: 'Lake Dardanelle State Park',    lat: 35.2831, lng: -93.2031, radiusKm: 3, category: 'state-park' },
  { id: 'ar-pinnacle-mountain', name: 'Pinnacle Mountain State Park', lat: 34.8414, lng: -92.4858, radiusKm: 3, category: 'state-park' },
  // ── Ouachitas ───────────────────────────────────────────────────────────────
  { id: 'ar-queen-wilhelmina', name: 'Queen Wilhelmina State Park',  lat: 34.6853, lng: -94.3734, radiusKm: 3, category: 'state-park' },
  { id: 'ar-lake-ouachita',  name: 'Lake Ouachita State Park',       lat: 34.6158, lng: -93.1847, radiusKm: 4, category: 'state-park' },
  { id: 'ar-lake-catherine', name: 'Lake Catherine State Park',      lat: 34.4379, lng: -92.9180, radiusKm: 3, category: 'state-park' },
  { id: 'ar-degray-lake',    name: 'DeGray Lake Resort State Park',  lat: 34.2463, lng: -93.1498, radiusKm: 4, category: 'state-park' },
  { id: 'ar-crater-of-diamonds', name: 'Crater of Diamonds State Park', lat: 34.0331, lng: -93.6703, radiusKm: 2, category: 'state-park' },
  { id: 'ar-cossatot-river', name: 'Cossatot River State Park-Natural Area', lat: 34.2958, lng: -94.1681, radiusKm: 4, category: 'state-preserve' },
  // ── Southwest ───────────────────────────────────────────────────────────────
  { id: 'ar-millwood',       name: 'Millwood State Park',            lat: 33.6775, lng: -93.9872, radiusKm: 4, category: 'state-park' },
  { id: 'ar-white-oak-lake', name: 'White Oak Lake State Park',      lat: 33.6895, lng: -93.1144, radiusKm: 3, category: 'state-park' },
  { id: 'ar-logoly',         name: 'Logoly State Park',              lat: 33.3442, lng: -93.1869, radiusKm: 2, category: 'state-park' },
  // ── Delta & Crowley's Ridge (east) ──────────────────────────────────────────
  { id: 'ar-lake-chicot',    name: 'Lake Chicot State Park',         lat: 33.3711, lng: -91.1975, radiusKm: 3, category: 'state-park' },
  { id: 'ar-village-creek',  name: 'Village Creek State Park',       lat: 35.1633, lng: -90.7186, radiusKm: 4, category: 'state-park' },
  { id: 'ar-crowleys-ridge', name: "Crowley's Ridge State Park",     lat: 36.0443, lng: -90.6663, radiusKm: 2, category: 'state-park' },
  { id: 'ar-delta-heritage-trail', name: 'Delta Heritage Trail State Park', lat: 34.5542, lng: -90.7586, radiusKm: 5, category: 'state-park' },
  { id: 'ar-cane-creek',     name: 'Cane Creek State Park',          lat: 33.9127, lng: -91.7634, radiusKm: 3, category: 'state-park' },
  // ── Premier WMAs (Cache River / Big Woods swamps) ───────────────────────────
  { id: 'ar-dagmar-wma',     name: 'Dagmar Wildlife Management Area', lat: 34.8911, lng: -91.3122, radiusKm: 5, category: 'state-preserve' },
  { id: 'ar-bayou-de-view-wma', name: 'Bayou De View Wildlife Management Area', lat: 35.6228, lng: -90.9467, radiusKm: 5, category: 'state-preserve' },
  { id: 'ar-big-lake-wma',   name: 'Big Lake Wildlife Management Area', lat: 35.9389, lng: -90.0858, radiusKm: 5, category: 'state-preserve' },
];
