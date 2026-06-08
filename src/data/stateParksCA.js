// California state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs CA
// (Point Lobos, Torrey Pines & Mono Lake reserves added manually; Sue-meg lat
// corrected). The North Coast redwoods → the Bay Area peaks → the Big Sur coast
// → the Sierra & desert → the southland. Yosemite, Sequoia, Redwood NP, Death
// Valley & Joshua Tree are FEDERAL (excluded).
// category → state-park 🏞️ · state-preserve 🦋 (natural reserves) · recreation-area 🛶
export const STATE_PARKS_CA = [
  // ── North Coast redwoods ────────────────────────────────────────────────────
  { id: 'ca-jedediah-smith', name: 'Jedediah Smith Redwoods State Park', lat: 41.7817, lng: -124.1010, radiusKm: 4, category: 'state-park' },
  { id: 'ca-prairie-creek', name: 'Prairie Creek Redwoods State Park', lat: 41.4038, lng: -124.0380, radiusKm: 5, category: 'state-park' },
  { id: 'ca-del-norte-redwoods', name: 'Del Norte Coast Redwoods State Park', lat: 41.6708, lng: -124.1170, radiusKm: 3, category: 'state-park' },
  { id: 'ca-humboldt-redwoods', name: 'Humboldt Redwoods State Park', lat: 40.3119, lng: -123.9720, radiusKm: 6, category: 'state-park' },
  { id: 'ca-sue-meg',        name: 'Sue-meg State Park',              lat: 41.1336, lng: -124.1545, radiusKm: 3, category: 'state-park' },
  // ── North Coast (Mendocino–Sonoma) ──────────────────────────────────────────
  { id: 'ca-mackerricher',   name: 'MacKerricher State Park',        lat: 39.4933, lng: -123.7940, radiusKm: 3, category: 'state-park' },
  { id: 'ca-salt-point',     name: 'Salt Point State Park',          lat: 38.5736, lng: -123.3260, radiusKm: 3, category: 'state-park' },
  { id: 'ca-sonoma-coast',   name: 'Sonoma Coast State Park',        lat: 38.3690, lng: -123.0740, radiusKm: 4, category: 'state-park' },
  // ── Bay Area ────────────────────────────────────────────────────────────────
  { id: 'ca-mount-tamalpais', name: 'Mount Tamalpais State Park',    lat: 37.9239, lng: -122.5970, radiusKm: 4, category: 'state-park' },
  { id: 'ca-mount-diablo',   name: 'Mount Diablo State Park',        lat: 37.8628, lng: -121.9311, radiusKm: 5, category: 'state-park' },
  { id: 'ca-big-basin',      name: 'Big Basin Redwoods State Park',  lat: 37.1725, lng: -122.2230, radiusKm: 5, category: 'state-park' },
  { id: 'ca-ano-nuevo',      name: 'Año Nuevo State Park',           lat: 37.1331, lng: -122.3330, radiusKm: 3, category: 'state-park' },
  { id: 'ca-angel-island',   name: 'Angel Island State Park',        lat: 37.8642, lng: -122.4319, radiusKm: 2, category: 'state-park' },
  { id: 'ca-tomales-bay',    name: 'Tomales Bay State Park',         lat: 38.1228, lng: -122.8890, radiusKm: 3, category: 'state-park' },
  // ── Central Coast & Big Sur ─────────────────────────────────────────────────
  { id: 'ca-point-lobos',    name: 'Point Lobos State Natural Reserve', lat: 36.5158, lng: -121.9388, radiusKm: 3, category: 'state-preserve' },
  { id: 'ca-julia-pfeiffer-burns', name: 'Julia Pfeiffer Burns State Park', lat: 36.1681, lng: -121.6700, radiusKm: 3, category: 'state-park' },
  { id: 'ca-pfeiffer-big-sur', name: 'Pfeiffer Big Sur State Park',  lat: 36.2476, lng: -121.7820, radiusKm: 3, category: 'state-park' },
  { id: 'ca-garrapata',      name: 'Garrapata State Park',           lat: 36.4694, lng: -121.9100, radiusKm: 3, category: 'state-park' },
  { id: 'ca-montana-de-oro', name: 'Montaña de Oro State Park',      lat: 35.2639, lng: -120.8620, radiusKm: 4, category: 'state-park' },
  { id: 'ca-morro-bay',      name: 'Morro Bay State Park',           lat: 35.3473, lng: -120.8260, radiusKm: 3, category: 'state-park' },
  // ── Sierra Nevada & eastern deserts ─────────────────────────────────────────
  { id: 'ca-anza-borrego',   name: 'Anza-Borrego Desert State Park', lat: 33.2592, lng: -116.3990, radiusKm: 9, category: 'state-park' },
  { id: 'ca-emerald-bay',    name: 'Emerald Bay State Park',         lat: 38.9536, lng: -120.0939, radiusKm: 3, category: 'state-park' },
  { id: 'ca-donner',         name: 'Donner Memorial State Park',     lat: 39.3200, lng: -120.2420, radiusKm: 3, category: 'state-park' },
  { id: 'ca-mono-lake',      name: 'Mono Lake Tufa State Natural Reserve', lat: 38.0017, lng: -119.0264, radiusKm: 6, category: 'state-preserve' },
  // ── Southern California ─────────────────────────────────────────────────────
  { id: 'ca-torrey-pines',   name: 'Torrey Pines State Natural Reserve', lat: 32.9206, lng: -117.2533, radiusKm: 2, category: 'state-preserve' },
  { id: 'ca-crystal-cove',   name: 'Crystal Cove State Park',        lat: 33.5739, lng: -117.8400, radiusKm: 3, category: 'state-park' },
  { id: 'ca-cuyamaca-rancho', name: 'Cuyamaca Rancho State Park',    lat: 32.9333, lng: -116.5670, radiusKm: 5, category: 'state-park' },
  { id: 'ca-malibu-creek',   name: 'Malibu Creek State Park',        lat: 34.1008, lng: -118.7110, radiusKm: 4, category: 'state-park' },
  { id: 'ca-salton-sea',     name: 'Salton Sea State Recreation Area', lat: 33.4742, lng: -115.8890, radiusKm: 7, category: 'recreation-area' },
  // ── Central Valley ──────────────────────────────────────────────────────────
  { id: 'ca-caswell',        name: 'Caswell Memorial State Park',    lat: 37.6933, lng: -121.1880, radiusKm: 2, category: 'state-park' },
];
