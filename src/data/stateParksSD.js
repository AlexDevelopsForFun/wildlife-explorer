// South Dakota state parks & recreation areas — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs SD.
// The Black Hills (Custer's bison & elk), the glacial lakes & woods of the NE,
// and the Big Sioux valley. category → state-park 🏞️ · recreation-area 🛶
export const STATE_PARKS_SD = [
  // ── Black Hills & west ──────────────────────────────────────────────────────
  { id: 'sd-custer',         name: 'Custer State Park',              lat: 43.7458, lng: -103.4180, radiusKm: 8, category: 'state-park' },
  { id: 'sd-bear-butte',     name: 'Bear Butte State Park',          lat: 44.4599, lng: -103.4509, radiusKm: 3, category: 'state-park' },
  { id: 'sd-angostura',      name: 'Angostura Reservoir State Recreation Area', lat: 43.2908, lng: -103.4797, radiusKm: 4, category: 'recreation-area' },
  // ── Northeast (glacial lakes & coteau woods) ────────────────────────────────
  { id: 'sd-roy-lake',       name: 'Roy Lake State Park',            lat: 45.7097, lng: -97.4488, radiusKm: 3, category: 'state-park' },
  { id: 'sd-sica-hollow',    name: 'Sica Hollow State Park',         lat: 45.7419, lng: -97.2425, radiusKm: 3, category: 'state-park' },
  { id: 'sd-fort-sisseton',  name: 'Fort Sisseton State Park',       lat: 45.6578, lng: -97.5303, radiusKm: 2, category: 'state-park' },
  { id: 'sd-hartford-beach', name: 'Hartford Beach State Park',      lat: 45.4027, lng: -96.6659, radiusKm: 2, category: 'state-park' },
  { id: 'sd-pickerel-lake',  name: 'Pickerel Lake State Park',       lat: 45.5019, lng: -97.2831, radiusKm: 2, category: 'state-park' },
  { id: 'sd-oakwood-lakes',  name: 'Oakwood Lakes State Park',       lat: 44.4498, lng: -96.9820, radiusKm: 3, category: 'state-park' },
  // ── Southeast (Big Sioux valley) ────────────────────────────────────────────
  { id: 'sd-newton-hills',   name: 'Newton Hills State Park',        lat: 43.2244, lng: -96.5772, radiusKm: 3, category: 'state-park' },
  { id: 'sd-palisades',      name: 'Palisades State Park',           lat: 43.6875, lng: -96.5169, radiusKm: 2, category: 'state-park' },
  { id: 'sd-good-earth',     name: 'Good Earth State Park',          lat: 43.4756, lng: -96.5942, radiusKm: 2, category: 'state-park' },
  { id: 'sd-union-grove',    name: 'Union Grove State Park',         lat: 42.9202, lng: -96.7853, radiusKm: 2, category: 'state-park' },
  // ── Central ─────────────────────────────────────────────────────────────────
  { id: 'sd-lake-herman',    name: 'Lake Herman State Park',         lat: 43.9929, lng: -97.1604, radiusKm: 2, category: 'state-park' },
  { id: 'sd-fisher-grove',   name: 'Fisher Grove State Park',        lat: 44.8835, lng: -98.3567, radiusKm: 2, category: 'state-park' },
  { id: 'sd-shadehill',      name: 'Shadehill Reservoir State Recreation Area', lat: 45.7214, lng: -102.2803, radiusKm: 4, category: 'recreation-area' },
];
