/**
 * stateParksAZ.js — AZ state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_AZ = [
  { id: "az-catalina", name: "Catalina State Park", lat: 32.4362, lng: -110.9048, radiusKm: 4, category: "state-park" },
  { id: "az-patagonia-lake", name: "Patagonia Lake State Park", lat: 31.4939, lng: -110.854, radiusKm: 3, category: "state-park" },
  { id: "az-kartchner-caverns", name: "Kartchner Caverns State Park", lat: 31.8375, lng: -110.3472, radiusKm: 3, category: "state-park" },
  { id: "az-oracle", name: "Oracle State Park", lat: 32.6107, lng: -110.7714, radiusKm: 3, category: "state-park" },
  { id: "az-roper-lake", name: "Roper Lake State Park", lat: 32.7558, lng: -109.705, radiusKm: 2, category: "state-park" },
  { id: "az-picacho-peak", name: "Picacho Peak State Park", lat: 32.6311, lng: -111.4156, radiusKm: 3, category: "state-park" },
  { id: "az-lost-dutchman", name: "Lost Dutchman State Park", lat: 33.4561, lng: -111.477, radiusKm: 4, category: "state-park" },
  { id: "az-boyce-thompson", name: "Boyce Thompson Arboretum State Park", lat: 33.2786, lng: -111.1608, radiusKm: 3, category: "state-park" },
  { id: "az-alamo-lake", name: "Alamo Lake State Park", lat: 34.2322, lng: -113.6028, radiusKm: 5, category: "state-park" },
  { id: "az-dead-horse-ranch", name: "Dead Horse Ranch State Park", lat: 34.7539, lng: -112.014, radiusKm: 3, category: "state-park" },
  { id: "az-red-rock", name: "Red Rock State Park", lat: 34.8147, lng: -111.828, radiusKm: 3, category: "state-park" },
  { id: "az-slide-rock", name: "Slide Rock State Park", lat: 34.9153, lng: -111.731, radiusKm: 2, category: "state-park" },
  { id: "az-tonto-natural-bridge", name: "Tonto Natural Bridge State Park", lat: 34.3206, lng: -111.4567, radiusKm: 2, category: "state-park" },
  { id: "az-lake-havasu", name: "Lake Havasu State Park", lat: 34.4359, lng: -114.2855, radiusKm: 3, category: "state-park" },
  { id: "az-cattail-cove", name: "Cattail Cove State Park", lat: 34.3506, lng: -114.17, radiusKm: 2, category: "state-park" },
  { id: "az-buckskin-mountain", name: "Buckskin Mountain State Park", lat: 34.2575, lng: -114.1616, radiusKm: 3, category: "state-park" },
  { id: "az-homolovi", name: "Homolovi State Park", lat: 35.0253, lng: -110.629, radiusKm: 4, category: "state-park" },
  { id: "az-lyman-lake", name: "Lyman Lake State Park", lat: 34.3631, lng: -109.3747, radiusKm: 3, category: "state-park" },
  { id: "az-papago", name: "Papago State Park", lat: 33.4603, lng: -111.9578, radiusKm: 4, category: "state-park" },
  { id: "az-fort-verde", name: "Fort Verde State Park", lat: 34.5638, lng: -111.8567, radiusKm: 4, category: "state-park" },
  { id: "az-san-rafael", name: "San Rafael State Park", lat: 31.3508, lng: -110.6292, radiusKm: 4, category: "state-park" },
  { id: "az-dankworth-pond", name: "Dankworth Pond State Park", lat: 32.7206, lng: -109.7044, radiusKm: 4, category: "state-park" },
  { id: "az-bucksin-mountain", name: "Bucksin Mountain State Park", lat: 34.2514, lng: -114.1231, radiusKm: 4, category: "state-park" },
  { id: "az-pusch-ridge", name: "Pusch Ridge Wilderness Area", lat: 32.3667, lng: -110.817, radiusKm: 4, category: "state-preserve" },
  { id: "az-petrified-forest-national", name: "Petrified Forest National Wilderness Area", lat: 35.1315, lng: -109.8136, radiusKm: 4, category: "state-preserve" },
];
