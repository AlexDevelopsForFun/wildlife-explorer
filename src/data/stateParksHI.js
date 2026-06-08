// Hawaii state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs HI
// (Waimea Canyon, Kaʻena Point & Waiʻanapanapa added manually).
// Kauaʻi's native-forest honeycreepers & the Nā Pali seabird cliffs → Oʻahu's
// albatross point → Maui's rainforest valleys → Hawaiʻi Island's coast & summits.
// Hawaiʻi Volcanoes & Haleakalā are FEDERAL (excluded). Endemic forest birds &
// seabirds dominate; rarity uses HI-county eBird + iNat. category → state-park 🏞️ · recreation-area 🛶
export const STATE_PARKS_HI = [
  // ── Kauaʻi ──────────────────────────────────────────────────────────────────
  { id: 'hi-na-pali-coast',  name: 'Nā Pali Coast State Park',       lat: 22.1833, lng: -159.6417, radiusKm: 5, category: 'state-park' },
  { id: 'hi-kokee',          name: "Koke'e State Park",              lat: 22.1303, lng: -159.6590, radiusKm: 5, category: 'state-park' },
  { id: 'hi-waimea-canyon',  name: 'Waimea Canyon State Park',       lat: 22.0964, lng: -159.6628, radiusKm: 4, category: 'state-park' },
  { id: 'hi-haena',          name: 'Haʻena State Park',              lat: 22.2247, lng: -159.5836, radiusKm: 2, category: 'state-park' },
  // ── Oʻahu ───────────────────────────────────────────────────────────────────
  { id: 'hi-kahana',         name: "Ahupua'a 'O Kahana State Park",  lat: 21.5350, lng: -157.8720, radiusKm: 3, category: 'state-park' },
  { id: 'hi-kaena-point',    name: 'Kaʻena Point State Park',        lat: 21.5742, lng: -158.2761, radiusKm: 3, category: 'state-park' },
  { id: 'hi-malaekahana',    name: 'Mālaekahana State Recreation Area', lat: 21.6617, lng: -157.9328, radiusKm: 2, category: 'recreation-area' },
  // ── Maui ────────────────────────────────────────────────────────────────────
  { id: 'hi-iao-valley',     name: 'ʻĪao Valley State Park',         lat: 20.8809, lng: -156.5446, radiusKm: 2, category: 'state-park' },
  { id: 'hi-makena',         name: 'Mākena State Park',              lat: 20.6575, lng: -156.4442, radiusKm: 2, category: 'state-park' },
  { id: 'hi-waianapanapa',   name: 'Waiʻanapanapa State Park',       lat: 20.7869, lng: -156.0033, radiusKm: 2, category: 'state-park' },
  // ── Hawaiʻi Island ──────────────────────────────────────────────────────────
  { id: 'hi-akaka-falls',    name: 'Akaka Falls State Park',         lat: 19.8542, lng: -155.1525, radiusKm: 2, category: 'state-park' },
  { id: 'hi-kekaha-kai',     name: 'Kekaha Kai State Park',          lat: 19.7922, lng: -156.0250, radiusKm: 3, category: 'state-park' },
  { id: 'hi-hapuna-beach',   name: 'Hapuna Beach State Recreation Area', lat: 19.9913, lng: -155.8230, radiusKm: 2, category: 'recreation-area' },
];
