/**
 * stateParksID.js — ID state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_ID = [
  { id: "id-priest-lake", name: "Priest Lake State Park", lat: 48.6134, lng: -116.832, radiusKm: 4, category: "state-park" },
  { id: "id-farragut", name: "Farragut State Park", lat: 47.9671, lng: -116.5827, radiusKm: 4, category: "state-park" },
  { id: "id-heyburn", name: "Heyburn State Park", lat: 47.3532, lng: -116.7613, radiusKm: 4, category: "state-park" },
  { id: "id-round-lake", name: "Round Lake State Park", lat: 48.1631, lng: -116.637, radiusKm: 2, category: "state-park" },
  { id: "id-dworshak", name: "Dworshak State Park", lat: 46.5855, lng: -116.288, radiusKm: 4, category: "state-park" },
  { id: "id-hells-gate", name: "Hells Gate State Park", lat: 46.3547, lng: -117.043, radiusKm: 3, category: "state-park" },
  { id: "id-winchester-lake", name: "Winchester Lake State Park", lat: 46.2347, lng: -116.6214, radiusKm: 2, category: "state-park" },
  { id: "id-ponderosa", name: "Ponderosa State Park", lat: 44.9345, lng: -116.078, radiusKm: 3, category: "state-park" },
  { id: "id-lake-cascade", name: "Lake Cascade State Park", lat: 44.5213, lng: -116.052, radiusKm: 4, category: "state-park" },
  { id: "id-yankee-fork", name: "Land of the Yankee Fork State Park", lat: 44.4758, lng: -114.2105, radiusKm: 5, category: "state-park" },
  { id: "id-bruneau-dunes", name: "Bruneau Dunes State Park", lat: 42.8958, lng: -115.678, radiusKm: 4, category: "state-park" },
  { id: "id-eagle-island", name: "Eagle Island State Park", lat: 43.6868, lng: -116.3849, radiusKm: 2, category: "state-park" },
  { id: "id-lucky-peak", name: "Lucky Peak State Park", lat: 43.5329, lng: -116.058, radiusKm: 3, category: "state-park" },
  { id: "id-three-island", name: "Three Island Crossing State Park", lat: 42.9411, lng: -115.318, radiusKm: 2, category: "state-park" },
  { id: "id-thousand-springs", name: "Thousand Springs State Park", lat: 42.8578, lng: -114.876, radiusKm: 4, category: "state-park" },
  { id: "id-massacre-rocks", name: "Massacre Rocks State Park", lat: 42.7267, lng: -112.933, radiusKm: 3, category: "state-park" },
  { id: "id-lake-walcott", name: "Lake Walcott State Park", lat: 42.6746, lng: -113.477, radiusKm: 4, category: "state-park" },
  { id: "id-castle-rocks", name: "Castle Rocks State Park", lat: 42.137, lng: -113.677, radiusKm: 3, category: "state-park" },
  { id: "id-bear-lake", name: "Bear Lake State Park", lat: 42.1111, lng: -111.273, radiusKm: 4, category: "state-park" },
  { id: "id-harriman", name: "Harriman State Park", lat: 44.336, lng: -111.4613, radiusKm: 4, category: "state-park" },
  { id: "id-henrys-lake", name: "Henrys Lake State Park", lat: 44.62, lng: -111.3739, radiusKm: 3, category: "state-park" },
  { id: "id-mowry", name: "Mowry State Park", lat: 47.4625, lng: -116.8578, radiusKm: 4, category: "state-park" },
  { id: "id-mccroskey", name: "McCroskey State Park", lat: 47.065, lng: -116.951, radiusKm: 4, category: "state-park" },
  { id: "id-mann-creek", name: "Mann Creek State Park", lat: 44.3992, lng: -116.9067, radiusKm: 4, category: "state-park" },
  { id: "id-bogus-basin", name: "Bogus Basin State Park", lat: 43.7706, lng: -116.1042, radiusKm: 4, category: "state-park" },
  { id: "id-floodwood", name: "Floodwood State Forest", lat: 46.9583, lng: -115.8844, radiusKm: 4, category: "state-forest" },
  { id: "id-old-mission", name: "Old Mission State Park", lat: 47.5492, lng: -116.361, radiusKm: 4, category: "state-park" },
  { id: "id-indian-rocks", name: "Indian Rocks State Park", lat: 42.7119, lng: -112.2197, radiusKm: 4, category: "state-park" },
  { id: "id-balanced-rock", name: "Balanced Rock State Park", lat: 42.5477, lng: -114.9584, radiusKm: 4, category: "state-park" },
  { id: "id-packer-johns-cabin", name: "Packer Johns Cabin State Park", lat: 44.9594, lng: -116.2261, radiusKm: 4, category: "state-park" },
  { id: "id-horsethief-reservoir", name: "Horsethief Reservoir State Park", lat: 44.5131, lng: -115.9144, radiusKm: 4, category: "state-park" },
  { id: "id-idaho-state-foresters-building", name: "Idaho State Forester's Building", lat: 43.6097, lng: -116.2075, radiusKm: 4, category: "state-forest" },
  { id: "id-coeur-dalene-parkway", name: "Coeur d'Alene Parkway State Park", lat: 47.644, lng: -116.717, radiusKm: 4, category: "state-park" },
  { id: "id-lewisclark-canoe-camp", name: "Lewis-Clark Canoe Camp State Park", lat: 46.4992, lng: -116.3397, radiusKm: 4, category: "state-park" },
  { id: "id-priest-lake-lionhead-unit", name: "Priest Lake State Park Lionhead Unit", lat: 48.7324, lng: -116.8222, radiusKm: 4, category: "state-park" },
];
