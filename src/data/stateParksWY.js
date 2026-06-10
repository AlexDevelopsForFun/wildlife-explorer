/**
 * stateParksWY.js — WY state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_WY = [
  { id: "wy-hot-springs", name: "Hot Springs State Park", lat: 43.6547, lng: -108.199, radiusKm: 3, category: "state-park" },
  { id: "wy-boysen", name: "Boysen State Park", lat: 43.4166, lng: -108.1773, radiusKm: 5, category: "state-park" },
  { id: "wy-sinks-canyon", name: "Sinks Canyon State Park", lat: 42.75, lng: -108.807, radiusKm: 3, category: "state-park" },
  { id: "wy-buffalo-bill", name: "Buffalo Bill State Park", lat: 44.5011, lng: -109.184, radiusKm: 5, category: "state-park" },
  { id: "wy-keyhole", name: "Keyhole State Park", lat: 44.3246, lng: -104.7726, radiusKm: 5, category: "state-park" },
  { id: "wy-glendo", name: "Glendo State Park", lat: 42.5561, lng: -104.983, radiusKm: 5, category: "state-park" },
  { id: "wy-guernsey", name: "Guernsey State Park", lat: 42.3039, lng: -104.769, radiusKm: 4, category: "state-park" },
  { id: "wy-edness-wilkins", name: "Edness K. Wilkins State Park", lat: 42.8564, lng: -106.176, radiusKm: 2, category: "state-park" },
  { id: "wy-curt-gowdy", name: "Curt Gowdy State Park", lat: 41.1736, lng: -105.227, radiusKm: 4, category: "state-park" },
  { id: "wy-hawk-springs", name: "Hawk Springs State Recreation Area", lat: 41.7117, lng: -104.194, radiusKm: 3, category: "recreation-area" },
  { id: "wy-seminoe", name: "Seminoe State Park", lat: 42.0586, lng: -106.872, radiusKm: 5, category: "state-park" },
  { id: "wy-bear-river", name: "Bear River State Park", lat: 41.266, lng: -110.937, radiusKm: 3, category: "state-park" },
  { id: "wy-park", name: "State Park", lat: 42.4794, lng: -104.9702, radiusKm: 4, category: "state-park" },
];
