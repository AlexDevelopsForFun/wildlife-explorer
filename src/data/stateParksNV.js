// Nevada state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs NV.
// Valley of Fire's red sandstone & Mojave bighorn (S) → the Great Basin gorges &
// mountain lakes (E) → the Sierra-front wetlands & desert lakes (W). Great Basin
// NP & Lake Mead NRA are FEDERAL (excluded). category → state-park 🏞️ · recreation-area 🛶
export const STATE_PARKS_NV = [
  // ── Southern Nevada (Mojave) ────────────────────────────────────────────────
  { id: 'nv-valley-of-fire', name: 'Valley of Fire State Park',      lat: 36.4389, lng: -114.5325, radiusKm: 5, category: 'state-park' },
  { id: 'nv-spring-mountain-ranch', name: 'Spring Mountain Ranch State Park', lat: 36.0678, lng: -115.4580, radiusKm: 3, category: 'state-park' },
  { id: 'nv-floyd-lamb',     name: 'Floyd Lamb State Park',          lat: 36.3222, lng: -115.2661, radiusKm: 2, category: 'state-park' },
  { id: 'nv-big-bend-colorado', name: 'Big Bend of the Colorado State Recreation Area', lat: 35.1106, lng: -114.6430, radiusKm: 3, category: 'recreation-area' },
  // ── Eastern Nevada (Great Basin ranges) ─────────────────────────────────────
  { id: 'nv-cathedral-gorge', name: 'Cathedral Gorge State Park',    lat: 37.8194, lng: -114.4139, radiusKm: 3, category: 'state-park' },
  { id: 'nv-cave-lake',      name: 'Cave Lake State Park',           lat: 39.1897, lng: -114.7222, radiusKm: 3, category: 'state-park' },
  { id: 'nv-kershaw-ryan',   name: 'Kershaw-Ryan State Park',        lat: 37.5886, lng: -114.5253, radiusKm: 2, category: 'state-park' },
  { id: 'nv-echo-canyon',    name: 'Echo Canyon State Park',         lat: 37.9100, lng: -114.2610, radiusKm: 3, category: 'state-park' },
  { id: 'nv-spring-valley',  name: 'Spring Valley State Park',       lat: 38.0539, lng: -114.1710, radiusKm: 3, category: 'state-park' },
  { id: 'nv-berlin-ichthyosaur', name: 'Berlin-Ichthyosaur State Park', lat: 38.8786, lng: -117.5950, radiusKm: 4, category: 'state-park' },
  // ── Western Nevada (Sierra front & desert lakes) ────────────────────────────
  { id: 'nv-lake-tahoe',     name: 'Lake Tahoe Nevada State Park',   lat: 39.1714, lng: -119.8925, radiusKm: 4, category: 'state-park' },
  { id: 'nv-washoe-lake',    name: 'Washoe Lake State Park',         lat: 39.2450, lng: -119.7850, radiusKm: 4, category: 'state-park' },
  { id: 'nv-dayton',         name: 'Dayton State Park',              lat: 39.2483, lng: -119.5890, radiusKm: 2, category: 'state-park' },
  { id: 'nv-walker-lake',    name: 'Walker Lake State Park',         lat: 38.6625, lng: -118.7672, radiusKm: 5, category: 'state-park' },
  { id: 'nv-south-fork',     name: 'South Fork State Recreation Area', lat: 40.6575, lng: -115.7460, radiusKm: 4, category: 'recreation-area' },
  { id: 'nv-wild-horse',     name: 'Wild Horse State Recreation Area', lat: 41.6708, lng: -115.8000, radiusKm: 4, category: 'recreation-area' },
  { id: 'nv-rye-patch',      name: 'Rye Patch State Recreation Area', lat: 40.4706, lng: -118.3094, radiusKm: 4, category: 'recreation-area' },
];
