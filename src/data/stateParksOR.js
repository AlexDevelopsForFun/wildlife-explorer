// Oregon state parks — wildlife units (v1).
// Coordinates from Wikidata (P625) via scripts/fetchStateParkCandidates.mjs OR.
// The seabird headlands & whale-watch capes of the coast → the Columbia Gorge &
// Silver Falls → the high-desert Deschutes country → the Wallowa & John Day east.
// Crater Lake is FEDERAL (excluded). category → state-park 🏞️
export const STATE_PARKS_OR = [
  // ── Coast (north to south) ──────────────────────────────────────────────────
  { id: 'or-fort-stevens',   name: 'Fort Stevens State Park',        lat: 46.1836, lng: -123.9732, radiusKm: 4, category: 'state-park' },
  { id: 'or-ecola',          name: 'Ecola State Park',               lat: 45.9229, lng: -123.9690, radiusKm: 3, category: 'state-park' },
  { id: 'or-oswald-west',    name: 'Oswald West State Park',         lat: 45.7698, lng: -123.9600, radiusKm: 3, category: 'state-park' },
  { id: 'or-cape-lookout',   name: 'Cape Lookout State Park',        lat: 45.3526, lng: -123.9724, radiusKm: 3, category: 'state-park' },
  { id: 'or-carl-washburne', name: 'Carl G. Washburne Memorial State Park', lat: 44.1582, lng: -124.1170, radiusKm: 3, category: 'state-park' },
  { id: 'or-shore-acres',    name: 'Shore Acres State Park',         lat: 43.3237, lng: -124.3820, radiusKm: 2, category: 'state-park' },
  { id: 'or-cape-arago',     name: 'Cape Arago State Park',          lat: 43.3062, lng: -124.3930, radiusKm: 2, category: 'state-park' },
  { id: 'or-cape-blanco',    name: 'Cape Blanco State Park',         lat: 42.8358, lng: -124.5428, radiusKm: 3, category: 'state-park' },
  { id: 'or-bullards-beach', name: 'Bullards Beach State Park',      lat: 43.1562, lng: -124.4100, radiusKm: 3, category: 'state-park' },
  { id: 'or-harris-beach',   name: 'Harris Beach State Park',        lat: 42.0671, lng: -124.3070, radiusKm: 2, category: 'state-park' },
  // ── Columbia Gorge & Willamette Valley ──────────────────────────────────────
  { id: 'or-ainsworth',      name: 'Ainsworth State Park',           lat: 45.5923, lng: -122.0570, radiusKm: 2, category: 'state-park' },
  { id: 'or-silver-falls',   name: 'Silver Falls State Park',        lat: 44.8564, lng: -122.6086, radiusKm: 4, category: 'state-park' },
  { id: 'or-tryon-creek',    name: 'Tryon Creek State Natural Area', lat: 45.4372, lng: -122.6790, radiusKm: 2, category: 'state-preserve' },
  // ── Central Oregon (Deschutes high desert) ──────────────────────────────────
  { id: 'or-smith-rock',     name: 'Smith Rock State Park',          lat: 44.3693, lng: -121.1380, radiusKm: 3, category: 'state-park' },
  { id: 'or-cove-palisades', name: 'The Cove Palisades State Park',  lat: 44.6036, lng: -121.2767, radiusKm: 4, category: 'state-park' },
  { id: 'or-tumalo',         name: 'Tumalo State Park',              lat: 44.1271, lng: -121.3320, radiusKm: 2, category: 'state-park' },
  { id: 'or-la-pine',        name: 'La Pine State Park',             lat: 43.7762, lng: -121.5290, radiusKm: 4, category: 'state-park' },
  // ── Eastern Oregon (Wallowas & John Day) ────────────────────────────────────
  { id: 'or-wallowa-lake',   name: 'Wallowa Lake State Park',        lat: 45.2688, lng: -117.2120, radiusKm: 3, category: 'state-park' },
  { id: 'or-cottonwood-canyon', name: 'Cottonwood Canyon State Park', lat: 45.4784, lng: -120.4723, radiusKm: 6, category: 'state-park' },
  { id: 'or-catherine-creek', name: 'Catherine Creek State Park',    lat: 45.1529, lng: -117.7370, radiusKm: 2, category: 'state-park' },
  // ── Southern Oregon ─────────────────────────────────────────────────────────
  { id: 'or-valley-of-the-rogue', name: 'Valley of the Rogue State Park', lat: 42.4110, lng: -123.1500, radiusKm: 3, category: 'state-park' },
  { id: 'or-collier-memorial', name: 'Collier Memorial State Park',  lat: 42.6432, lng: -121.8830, radiusKm: 3, category: 'state-park' },
];
