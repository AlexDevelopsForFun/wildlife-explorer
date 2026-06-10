/**
 * stateParksDE.js — DE state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_DE = [
  { id: "de-alapocas", name: "Alapocas Run State Park", lat: 39.768724, lng: -75.5588125, radiusKm: 2, category: "state-park" },
  { id: "de-auburn-valley", name: "Auburn Valley State Park", lat: 39.80917, lng: -75.67972, radiusKm: 2, category: "state-park" },
  { id: "de-bellevue", name: "Bellevue State Park", lat: 39.77917, lng: -75.49583, radiusKm: 2, category: "state-park" },
  { id: "de-brandywine", name: "Brandywine Creek State Park", lat: 39.8112231, lng: -75.5663143, radiusKm: 3, category: "state-park" },
  { id: "de-cape-henlopen", name: "Cape Henlopen State Park", lat: 38.8031678, lng: -75.0946255, radiusKm: 5, category: "state-park" },
  { id: "de-seashore", name: "Delaware Seashore State Park", lat: 38.6103267, lng: -75.0680895, radiusKm: 6, category: "state-park" },
  { id: "de-fenwick", name: "Fenwick Island State Park", lat: 38.47583, lng: -75.05444, radiusKm: 3, category: "state-park" },
  { id: "de-fort-delaware", name: "Fort Delaware State Park", lat: 39.59, lng: -75.57194, radiusKm: 2, category: "state-park" },
  { id: "de-fort-dupont", name: "Fort DuPont State Park", lat: 39.57139, lng: -75.58361, radiusKm: 2, category: "state-park" },
  { id: "de-fox-point", name: "Fox Point State Park", lat: 39.75611, lng: -75.48972, radiusKm: 2, category: "state-park" },
  { id: "de-holts-landing", name: "Holts Landing State Park", lat: 38.5931681, lng: -75.1340726, radiusKm: 2, category: "state-park" },
  { id: "de-killens-pond", name: "Killens Pond State Park", lat: 38.9815077, lng: -75.5361511, radiusKm: 3, category: "state-park" },
  { id: "de-lums-pond", name: "Lums Pond State Park", lat: 39.554287, lng: -75.714942, radiusKm: 4, category: "state-park" },
  { id: "de-trap-pond", name: "Trap Pond State Park", lat: 38.5245921, lng: -75.4743265, radiusKm: 4, category: "state-park" },
  { id: "de-white-clay", name: "White Clay Creek State Park", lat: 39.73611, lng: -75.76222, radiusKm: 5, category: "state-park" },
  { id: "de-beach-plum", name: "Beach Plum Island State Park", lat: 38.8, lng: -75.1789, radiusKm: 3, category: "state-park" },
  { id: "de-augustine-wma", name: "Augustine Wildlife Area", lat: 39.4783, lng: -75.6014, radiusKm: 3, category: "state-preserve" },
  { id: "de-woodland-beach-wma", name: "Woodland Beach Wildlife Area", lat: 39.35, lng: -75.5008, radiusKm: 4, category: "state-preserve" },
  { id: "de-redden", name: "Redden State Forest", lat: 38.7367, lng: -75.3989, radiusKm: 4, category: "state-forest" },
  { id: "de-red-lion", name: "Red Lion State Forest", lat: 39.6061, lng: -75.6539, radiusKm: 4, category: "state-forest" },
  { id: "de-blackbird", name: "Blackbird State Forest", lat: 39.3419, lng: -75.6828, radiusKm: 4, category: "state-forest" },
  { id: "de-ellendale", name: "Ellendale State Forest", lat: 38.7703, lng: -75.4358, radiusKm: 4, category: "state-forest" },
  { id: "de-wilmington-state-parks", name: "Wilmington State Parks", lat: 39.755, lng: -75.55, radiusKm: 4, category: "state-park" },
  { id: "de-brandywine-springs", name: "Brandywine Springs State Park", lat: 39.7439, lng: -75.6411, radiusKm: 4, category: "state-park" },
  { id: "de-walter-s-carpenter", name: "Walter S Carpenter State Park", lat: 39.7139, lng: -75.7747, radiusKm: 4, category: "state-park" },
];
