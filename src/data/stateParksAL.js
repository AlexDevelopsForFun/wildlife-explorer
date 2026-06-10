/**
 * stateParksAL.js — AL state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_AL = [
  { id: "al-gulf", name: "Gulf State Park", lat: 30.2637, lng: -87.6776, radiusKm: 3, category: "state-beach" },
  { id: "al-meaher", name: "Meaher State Park", lat: 30.6697, lng: -87.936, radiusKm: 3, category: "state-park" },
  { id: "al-historic-blakeley", name: "Historic Blakeley State Park", lat: 30.7433, lng: -87.9153, radiusKm: 3, category: "state-park" },
  { id: "al-cheaha", name: "Cheaha State Park", lat: 33.4856, lng: -85.8092, radiusKm: 3, category: "state-park" },
  { id: "al-desoto", name: "DeSoto State Park", lat: 34.4956, lng: -85.6189, radiusKm: 3, category: "state-park" },
  { id: "al-monte-sano", name: "Monte Sano State Park", lat: 34.74, lng: -86.51, radiusKm: 3, category: "state-park" },
  { id: "al-lake-guntersville", name: "Lake Guntersville State Park", lat: 34.3881, lng: -86.205, radiusKm: 4, category: "state-park" },
  { id: "al-bucks-pocket", name: "Buck's Pocket State Park", lat: 34.4708, lng: -86.0644, radiusKm: 3, category: "state-park" },
  { id: "al-cathedral-caverns", name: "Cathedral Caverns State Park", lat: 34.5733, lng: -86.2222, radiusKm: 2, category: "state-park" },
  { id: "al-rickwood-caverns", name: "Rickwood Caverns State Park", lat: 33.8795, lng: -86.8449, radiusKm: 2, category: "state-park" },
  { id: "al-oak-mountain", name: "Oak Mountain State Park", lat: 33.3156, lng: -86.7734, radiusKm: 5, category: "state-park" },
  { id: "al-wind-creek", name: "Wind Creek State Park", lat: 32.86, lng: -85.93, radiusKm: 3, category: "state-park" },
  { id: "al-chewacla", name: "Chewacla State Park", lat: 32.5541, lng: -85.4809, radiusKm: 2, category: "state-park" },
  { id: "al-lake-lurleen", name: "Lake Lurleen State Park", lat: 33.2986, lng: -87.68, radiusKm: 3, category: "state-park" },
  { id: "al-joe-wheeler", name: "Joe Wheeler State Park", lat: 34.8169, lng: -87.3514, radiusKm: 4, category: "state-park" },
  { id: "al-mallard-fox-creek-wma", name: "Mallard-Fox Creek Wildlife Management Area", lat: 34.6853, lng: -87.1389, radiusKm: 4, category: "state-preserve" },
  { id: "al-lakepoint", name: "Lakepoint State Park", lat: 31.9908, lng: -85.115, radiusKm: 4, category: "state-park" },
  { id: "al-frank-jackson", name: "Frank Jackson State Park", lat: 31.3142, lng: -86.2722, radiusKm: 2, category: "state-park" },
  { id: "al-blue-springs", name: "Blue Springs State Park", lat: 31.6597, lng: -85.5063, radiusKm: 2, category: "state-park" },
  { id: "al-chattahoochee", name: "Chattahoochee State Park", lat: 31.0103, lng: -85.0306, radiusKm: 2, category: "state-park" },
  { id: "al-claude-kelley", name: "Claude D. Kelley State Park", lat: 31.2622, lng: -87.4881, radiusKm: 2, category: "state-park" },
  { id: "al-roland-cooper", name: "Roland Cooper State Park", lat: 32.0572, lng: -87.2492, radiusKm: 2, category: "state-park" },
  { id: "al-chickasaw", name: "Chickasaw State Park", lat: 32.359, lng: -87.787, radiusKm: 2, category: "state-park" },
  { id: "al-cahaba-river-wma", name: "Cahaba River Wildlife Management Area", lat: 33.1186, lng: -87.1228, radiusKm: 4, category: "state-preserve" },
  { id: "al-geneva-sf", name: "Geneva State Forest", lat: 31.1485, lng: -86.1749, radiusKm: 5, category: "state-forest" },
  { id: "al-little-river-sf", name: "Little River State Forest", lat: 31.2575, lng: -87.5039, radiusKm: 3, category: "state-forest" },
  { id: "al-selma", name: "Selma State Park", lat: 32.4111, lng: -86.8675, radiusKm: 4, category: "state-park" },
  { id: "al-sumter", name: "Sumter State Park", lat: 32.5486, lng: -88.2189, radiusKm: 4, category: "state-park" },
  { id: "al-tannehill", name: "Tannehill State Park", lat: 33.2507, lng: -87.0639, radiusKm: 4, category: "state-park" },
  { id: "al-weogufka", name: "Weogufka State Forest", lat: 32.9817, lng: -86.35, radiusKm: 4, category: "state-forest" },
  { id: "al-cedar-creek", name: "Cedar Creek State Park", lat: 31.0489, lng: -88.1847, radiusKm: 4, category: "state-park" },
  { id: "al-fort-toulouse", name: "Fort Toulouse State Park", lat: 32.5028, lng: -86.2556, radiusKm: 4, category: "state-park" },
  { id: "al-paul-m-grist", name: "Paul M. Grist State Park", lat: 32.5981, lng: -86.9908, radiusKm: 4, category: "state-park" },
  { id: "al-bladon-springs", name: "Bladon Springs State Park", lat: 31.7311, lng: -88.1942, radiusKm: 4, category: "state-park" },
  { id: "al-elk-river-lodge", name: "Elk River Lodge State Park", lat: 34.8039, lng: -87.2269, radiusKm: 4, category: "state-park" },
  { id: "al-saint-stephens", name: "Saint Stephens State Forest", lat: 31.5836, lng: -88.1506, radiusKm: 4, category: "state-forest" },
  { id: "al-edward-hauss-nursery", name: "Edward Hauss State Forest Nursery", lat: 31.1739, lng: -87.4394, radiusKm: 4, category: "state-forest" },
];
