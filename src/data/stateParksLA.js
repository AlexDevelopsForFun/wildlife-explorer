/**
 * stateParksLA.js — LA state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_LA = [
  { id: "la-grand-isle", name: "Grand Isle State Park", lat: 29.2586, lng: -89.9547, radiusKm: 3, category: "state-beach" },
  { id: "la-fontainebleau", name: "Fontainebleau State Park", lat: 30.3452, lng: -90.0227, radiusKm: 3, category: "state-park" },
  { id: "la-bayou-segnette", name: "Bayou Segnette State Park", lat: 29.903, lng: -90.1545, radiusKm: 3, category: "state-park" },
  { id: "la-cypremort-point", name: "Cypremort Point State Park", lat: 29.7382, lng: -91.8536, radiusKm: 2, category: "state-beach" },
  { id: "la-palmetto-island", name: "Palmetto Island State Park", lat: 29.8693, lng: -92.1517, radiusKm: 3, category: "state-park" },
  { id: "la-tickfaw", name: "Tickfaw State Park", lat: 30.3822, lng: -90.6313, radiusKm: 3, category: "state-park" },
  { id: "la-sam-houston-jones", name: "Sam Houston Jones State Park", lat: 30.3021, lng: -93.2586, radiusKm: 3, category: "state-park" },
  { id: "la-lake-fausse-pointe", name: "Lake Fausse Pointe State Park", lat: 30.0597, lng: -91.6096, radiusKm: 4, category: "state-park" },
  { id: "la-chicot", name: "Chicot State Park", lat: 30.8003, lng: -92.2797, radiusKm: 4, category: "state-park" },
  { id: "la-atchafalaya-delta-wma", name: "Atchafalaya Delta Wildlife Management Area", lat: 29.4194, lng: -91.3078, radiusKm: 6, category: "state-preserve" },
  { id: "la-maurepas-swamp-wma", name: "Maurepas Swamp Wildlife Management Area", lat: 30.1464, lng: -90.5164, radiusKm: 6, category: "state-preserve" },
  { id: "la-pass-a-loutre-wma", name: "Pass a Loutre Wildlife Management Area", lat: 29.0702, lng: -89.1201, radiusKm: 6, category: "state-preserve" },
  { id: "la-chemin-a-haut", name: "Chemin-A-Haut State Park", lat: 32.91, lng: -91.845, radiusKm: 3, category: "state-park" },
  { id: "la-lake-bruin", name: "Lake Bruin State Park", lat: 31.9606, lng: -91.2011, radiusKm: 2, category: "state-park" },
  { id: "la-lake-darbonne", name: "Lake D'Arbonne State Park", lat: 32.7868, lng: -92.4899, radiusKm: 3, category: "state-park" },
  { id: "la-lake-claiborne", name: "Lake Claiborne State Park", lat: 32.7231, lng: -92.9203, radiusKm: 3, category: "state-park" },
  { id: "la-poverty-point", name: "Poverty Point Reservoir State Park", lat: 32.4825, lng: -91.4946, radiusKm: 3, category: "state-park" },
  { id: "la-lake-bistineau", name: "Lake Bistineau State Park", lat: 32.4439, lng: -93.3803, radiusKm: 3, category: "state-park" },
  { id: "la-north-toledo-bend", name: "North Toledo Bend State Park", lat: 31.5684, lng: -93.7349, radiusKm: 3, category: "state-park" },
  { id: "la-hodges-gardens", name: "Hodges Gardens State Park", lat: 31.3692, lng: -93.4248, radiusKm: 3, category: "state-park" },
  { id: "la-alexander-sf", name: "Alexander State Forest", lat: 31.1241, lng: -92.4884, radiusKm: 5, category: "state-forest" },
  { id: "la-donaghey", name: "Donaghey State Park", lat: 33.0097, lng: -92.3692, radiusKm: 4, category: "state-park" },
  { id: "la-dean-lee", name: "Dean Lee State Forest", lat: 30.876, lng: -89.9928, radiusKm: 4, category: "state-forest" },
  { id: "la-st-bernard", name: "St. Bernard State Park", lat: 29.8614, lng: -89.9008, radiusKm: 4, category: "state-park" },
  { id: "la-bogue-chitto", name: "Bogue Chitto State Park", lat: 30.7675, lng: -90.1573, radiusKm: 4, category: "state-park" },
  { id: "la-jimmie-davis", name: "Jimmie Davis State Park", lat: 32.2921, lng: -92.5122, radiusKm: 4, category: "state-park" },
  { id: "la-louisiana-site", name: "Louisiana State Park Site 15", lat: 31.2392, lng: -93.5783, radiusKm: 4, category: "state-park" },
  { id: "la-south-toledo-bend", name: "South Toledo Bend State Park", lat: 31.208, lng: -93.57, radiusKm: 4, category: "state-park" },
  { id: "la-fairviewriverside", name: "Fairview-Riverside State Park", lat: 30.4088, lng: -90.1405, radiusKm: 4, category: "state-park" },
  { id: "la-alexander-headquarters-building", name: "Alexander State Forest Headquarters Building", lat: 31.1411, lng: -92.4747, radiusKm: 4, category: "state-forest" },
];
