/**
 * stateParksSD.js — SD state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_SD = [
  { id: "sd-custer", name: "Custer State Park", lat: 43.7458, lng: -103.418, radiusKm: 8, category: "state-park" },
  { id: "sd-bear-butte", name: "Bear Butte State Park", lat: 44.4599, lng: -103.4509, radiusKm: 3, category: "state-park" },
  { id: "sd-angostura", name: "Angostura Reservoir State Recreation Area", lat: 43.2908, lng: -103.4797, radiusKm: 4, category: "recreation-area" },
  { id: "sd-roy-lake", name: "Roy Lake State Park", lat: 45.7097, lng: -97.4488, radiusKm: 3, category: "state-park" },
  { id: "sd-sica-hollow", name: "Sica Hollow State Park", lat: 45.7419, lng: -97.2425, radiusKm: 3, category: "state-park" },
  { id: "sd-fort-sisseton", name: "Fort Sisseton State Park", lat: 45.6578, lng: -97.5303, radiusKm: 2, category: "state-park" },
  { id: "sd-hartford-beach", name: "Hartford Beach State Park", lat: 45.4027, lng: -96.6659, radiusKm: 2, category: "state-park" },
  { id: "sd-pickerel-lake", name: "Pickerel Lake State Park", lat: 45.5019, lng: -97.2831, radiusKm: 2, category: "state-park" },
  { id: "sd-oakwood-lakes", name: "Oakwood Lakes State Park", lat: 44.4498, lng: -96.982, radiusKm: 3, category: "state-park" },
  { id: "sd-newton-hills", name: "Newton Hills State Park", lat: 43.2244, lng: -96.5772, radiusKm: 3, category: "state-park" },
  { id: "sd-palisades", name: "Palisades State Park", lat: 43.6875, lng: -96.5169, radiusKm: 2, category: "state-park" },
  { id: "sd-good-earth", name: "Good Earth State Park", lat: 43.4756, lng: -96.5942, radiusKm: 2, category: "state-park" },
  { id: "sd-union-grove", name: "Union Grove State Park", lat: 42.9202, lng: -96.7853, radiusKm: 2, category: "state-park" },
  { id: "sd-lake-herman", name: "Lake Herman State Park", lat: 43.9929, lng: -97.1604, radiusKm: 2, category: "state-park" },
  { id: "sd-fisher-grove", name: "Fisher Grove State Park", lat: 44.8835, lng: -98.3567, radiusKm: 2, category: "state-park" },
  { id: "sd-shadehill", name: "Shadehill Reservoir State Recreation Area", lat: 45.7214, lng: -102.2803, radiusKm: 4, category: "recreation-area" },
  { id: "sd-sandy-shore", name: "Sandy Shore State Park", lat: 44.8942, lng: -97.2422, radiusKm: 4, category: "state-park" },
  { id: "sd-custer-airport", name: "Custer State Park Airport", lat: 43.7281, lng: -103.3519, radiusKm: 4, category: "state-park" },
  { id: "sd-lake-hiddenwood", name: "Lake Hiddenwood State Park", lat: 45.5469, lng: -99.9864, radiusKm: 4, category: "state-park" },
  { id: "sd-rahn-lake", name: "Rahn Lake State Recreation Area", lat: 43.1064, lng: -99.8333, radiusKm: 4, category: "recreation-area" },
  { id: "sd-lake-alvin", name: "Lake Alvin State Recreation Area", lat: 43.4406, lng: -96.6214, radiusKm: 4, category: "recreation-area" },
  { id: "sd-twin-lakes", name: "Twin Lakes State Recreation Area", lat: 43.9644, lng: -98.3297, radiusKm: 4, category: "recreation-area" },
  { id: "sd-little-moreau", name: "Little Moreau State Recreation Area", lat: 45.3544, lng: -101.0997, radiusKm: 4, category: "recreation-area" },
  { id: "sd-richmond-lake", name: "Richmond Lake State Recreation Area", lat: 45.5411, lng: -98.6111, radiusKm: 4, category: "recreation-area" },
  { id: "sd-lake-hendricks", name: "Lake Hendricks State Recreation Area", lat: 44.4789, lng: -96.4756, radiusKm: 4, category: "recreation-area" },
  { id: "sd-custer-norbeck-wildlife-preserve", name: "Custer State Park - Norbeck Wildlife Preserve", lat: 43.7814, lng: -103.5292, radiusKm: 4, category: "state-preserve" },
];
