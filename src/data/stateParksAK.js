/**
 * stateParksAK.js — AK state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_AK = [
  { id: "ak-chugach", name: "Chugach State Park", lat: 61.0519, lng: -149.7969, radiusKm: 10, category: "state-park" },
  { id: "ak-kachemak-bay", name: "Kachemak Bay State Park", lat: 59.5328, lng: -151.21, radiusKm: 9, category: "state-park" },
  { id: "ak-denali", name: "Denali State Park", lat: 62.77, lng: -150.053, radiusKm: 9, category: "state-park" },
  { id: "ak-caines-head", name: "Caines Head State Recreation Area", lat: 60.001, lng: -149.422, radiusKm: 4, category: "recreation-area" },
  { id: "ak-captain-cook", name: "Captain Cook State Recreation Area", lat: 60.7883, lng: -151.0397, radiusKm: 5, category: "recreation-area" },
  { id: "ak-nancy-lake", name: "Nancy Lake State Recreation Area", lat: 61.6853, lng: -149.966, radiusKm: 4, category: "recreation-area" },
  { id: "ak-lake-louise", name: "Lake Louise State Recreation Area", lat: 62.2811, lng: -146.5386, radiusKm: 4, category: "recreation-area" },
  { id: "ak-matanuska-glacier", name: "Matanuska Glacier State Recreation Site", lat: 61.799, lng: -147.8141, radiusKm: 3, category: "recreation-area" },
  { id: "ak-chena-river", name: "Chena River State Recreation Area", lat: 64.9167, lng: -146.333, radiusKm: 7, category: "recreation-area" },
  { id: "ak-chilkat", name: "Chilkat State Park", lat: 59.2111, lng: -135.3981, radiusKm: 4, category: "state-park" },
  { id: "ak-chilkoot-lake", name: "Chilkoot Lake State Recreation Area", lat: 59.3358, lng: -135.5636, radiusKm: 3, category: "recreation-area" },
  { id: "ak-wood-tikchik", name: "Wood-Tikchik State Park", lat: 59.7456, lng: -158.7525, radiusKm: 12, category: "state-park" },
  { id: "ak-afognak-island", name: "Afognak Island State Park", lat: 58.3558, lng: -152.3, radiusKm: 8, category: "state-park" },
  { id: "ak-fort-abercrombie", name: "Fort Abercrombie State Historical Park", lat: 57.8344, lng: -152.3556, radiusKm: 3, category: "state-park" },
  { id: "ak-pasagshak", name: "Pasagshak State Recreation Site", lat: 57.4625, lng: -152.4514, radiusKm: 4, category: "recreation-area" },
  { id: "ak-deep-creek", name: "Deep Creek State Recreation Area", lat: 60.033, lng: -151.701, radiusKm: 4, category: "recreation-area" },
  { id: "ak-harding-lake", name: "Harding Lake State Recreation Area", lat: 64.4406, lng: -146.8639, radiusKm: 3, category: "recreation-area" },
  { id: "ak-wolf-lake-site", name: "Wolf Lake State Recreation Site", lat: 61.6444, lng: -149.2692, radiusKm: 4, category: "recreation-area" },
  { id: "ak-birch-lake-site", name: "Birch Lake State Recreation Site", lat: 64.3147, lng: -146.645, radiusKm: 4, category: "recreation-area" },
  { id: "ak-scout-lake-site", name: "Scout Lake State Recreation Site", lat: 60.5358, lng: -150.8308, radiusKm: 4, category: "recreation-area" },
  { id: "ak-chena-river-site", name: "Chena River State Recreation Site", lat: 64.8398, lng: -147.81, radiusKm: 4, category: "recreation-area" },
  { id: "ak-finger-lake-site", name: "Finger Lake State Recreation Site", lat: 61.6097, lng: -149.2639, radiusKm: 4, category: "recreation-area" },
  { id: "ak-moose-creek", name: "Moose Creek State Recreation Area", lat: 61.6828, lng: -149.0506, radiusKm: 4, category: "recreation-area" },
  { id: "ak-refuge-cove-site", name: "Refuge Cove State Recreation Site", lat: 55.4103, lng: -131.7611, radiusKm: 4, category: "recreation-area" },
  { id: "ak-salcha-river-site", name: "Salcha River State Recreation Site", lat: 64.4703, lng: -146.9208, radiusKm: 4, category: "recreation-area" },
  { id: "ak-king-mountain-site", name: "King Mountain State Recreation Site", lat: 61.7744, lng: -148.495, radiusKm: 4, category: "recreation-area" },
  { id: "ak-big-lake-north-site", name: "Big Lake North State Recreation Site", lat: 61.5472, lng: -149.8539, radiusKm: 4, category: "recreation-area" },
  { id: "ak-big-lake-south-site", name: "Big Lake South State Recreation Site", lat: 61.5325, lng: -149.8328, radiusKm: 4, category: "recreation-area" },
  { id: "ak-blueberry-lake-site", name: "Blueberry Lake State Recreation Site", lat: 61.1208, lng: -145.6956, radiusKm: 4, category: "recreation-area" },
  { id: "ak-keplerbradley-lakes", name: "Kepler-Bradley Lakes State Recreation Area", lat: 61.5575, lng: -149.2053, radiusKm: 4, category: "recreation-area" },
];
