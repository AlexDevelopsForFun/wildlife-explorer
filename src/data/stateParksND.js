/**
 * stateParksND.js — ND state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_ND = [
  { id: "nd-cross-ranch", name: "Cross Ranch State Park", lat: 47.2142, lng: -100.999, radiusKm: 4, category: "state-park" },
  { id: "nd-lake-sakakawea", name: "Lake Sakakawea State Park", lat: 47.5239, lng: -101.452, radiusKm: 4, category: "state-park" },
  { id: "nd-fort-stevenson", name: "Fort Stevenson State Park", lat: 47.5908, lng: -101.42, radiusKm: 3, category: "state-park" },
  { id: "nd-lewis-and-clark", name: "Lewis and Clark State Park", lat: 48.1156, lng: -103.243, radiusKm: 3, category: "state-park" },
  { id: "nd-little-missouri", name: "Little Missouri State Park", lat: 47.5553, lng: -102.728, radiusKm: 5, category: "state-park" },
  { id: "nd-lake-metigoshe", name: "Lake Metigoshe State Park", lat: 48.9867, lng: -100.324, radiusKm: 3, category: "state-park" },
  { id: "nd-homen-sf", name: "Homen State Forest", lat: 48.9556, lng: -100.2586, radiusKm: 4, category: "state-forest" },
  { id: "nd-icelandic", name: "Icelandic State Park", lat: 48.7792, lng: -97.7529, radiusKm: 3, category: "state-park" },
  { id: "nd-pembina-gorge", name: "Pembina Gorge State Recreation Area", lat: 48.9414, lng: -98.06, radiusKm: 4, category: "state-park" },
  { id: "nd-pembina", name: "Pembina State Park", lat: 48.9644, lng: -97.2411, radiusKm: 2, category: "state-park" },
  { id: "nd-fort-abercrombie", name: "Fort Abercrombie State Park", lat: 46.4453, lng: -96.7186, radiusKm: 2, category: "state-park" },
  { id: "nd-fort-ransom", name: "Fort Ransom State Park", lat: 46.5444, lng: -97.9361, radiusKm: 3, category: "state-park" },
  { id: "nd-beaver-lake", name: "Beaver Lake State Park", lat: 46.4027, lng: -99.6198, radiusKm: 3, category: "state-park" },
  { id: "nd-grahams-island", name: "Grahams Island State Park", lat: 48.0606, lng: -99.1267, radiusKm: 4, category: "state-park" },
  { id: "nd-turtle-river", name: "Turtle River State Park", lat: 48.0086, lng: -97.4983, radiusKm: 3, category: "state-park" },
  { id: "nd-molander", name: "Molander State Park", lat: 47.1256, lng: -100.9667, radiusKm: 4, category: "state-park" },
  { id: "nd-rough-rider", name: "Rough Rider State Park", lat: 46.8922, lng: -103.538, radiusKm: 4, category: "state-park" },
  { id: "nd-camp-whitney", name: "Camp Whitney State Park", lat: 46.9931, lng: -99.5886, radiusKm: 4, category: "state-park" },
  { id: "nd-sheyenne-river", name: "Sheyenne River State Forest", lat: 46.5019, lng: -97.8831, radiusKm: 4, category: "state-forest" },
  { id: "nd-tetrault-woods", name: "Tetrault Woods State Forest", lat: 48.8936, lng: -97.9358, radiusKm: 4, category: "state-forest" },
  { id: "nd-turtle-mountain", name: "Turtle Mountain State Forest", lat: 48.9683, lng: -100.4944, radiusKm: 4, category: "state-forest" },
  { id: "nd-mouse-river-north-unit", name: "Mouse River State Forest North Unit", lat: 48.4994, lng: -100.3825, radiusKm: 4, category: "state-forest" },
  { id: "nd-mouse-river-south-unit", name: "Mouse River State Forest South Unit", lat: 48.3756, lng: -100.4003, radiusKm: 4, category: "state-forest" },
  { id: "nd-pelican-point", name: "Pelican Point State Recreation Area", lat: 48.9586, lng: -100.347, radiusKm: 4, category: "recreation-area" },
  { id: "nd-crow-flies-high", name: "Crow Flies High State Recreation Area", lat: 47.9825, lng: -102.5457, radiusKm: 4, category: "recreation-area" },
  { id: "nd-sheep-creek-dam", name: "Sheep Creek Dam State Recreation Area", lat: 46.3353, lng: -101.8489, radiusKm: 4, category: "recreation-area" },
  { id: "nd-butte-saint-paul", name: "Butte Saint Paul State Recreation Area", lat: 48.8517, lng: -100.196, radiusKm: 4, category: "recreation-area" },
  { id: "nd-devils-lake-state-parks-north-dakota", name: "Devils Lake State Parks (North Dakota)", lat: 48.0475, lng: -99.0597, radiusKm: 4, category: "state-park" },
  { id: "nd-indian-hills-and-resort", name: "Indian Hills State Recreation Area and Resort", lat: 47.6025, lng: -102.097, radiusKm: 4, category: "recreation-area" },
];
