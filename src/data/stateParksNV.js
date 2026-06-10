/**
 * stateParksNV.js — NV state parks & wildlife areas.
 * Curated, coordinate-verified units PLUS catalog-expansion units appended by
 * scripts/expandStateParks.mjs (Wikidata, civic/historic + sub-parcel filtered,
 * de-duped against the curated set). Species are fetched LIVE (eBird + iNat).
 * Existing curated entries are preserved; expansion only appends new units.
 */

export const STATE_PARKS_NV = [
  { id: "nv-valley-of-fire", name: "Valley of Fire State Park", lat: 36.4389, lng: -114.5325, radiusKm: 5, category: "state-park" },
  { id: "nv-spring-mountain-ranch", name: "Spring Mountain Ranch State Park", lat: 36.0678, lng: -115.458, radiusKm: 3, category: "state-park" },
  { id: "nv-floyd-lamb", name: "Floyd Lamb State Park", lat: 36.3222, lng: -115.2661, radiusKm: 2, category: "state-park" },
  { id: "nv-big-bend-colorado", name: "Big Bend of the Colorado State Recreation Area", lat: 35.1106, lng: -114.643, radiusKm: 3, category: "recreation-area" },
  { id: "nv-cathedral-gorge", name: "Cathedral Gorge State Park", lat: 37.8194, lng: -114.4139, radiusKm: 3, category: "state-park" },
  { id: "nv-cave-lake", name: "Cave Lake State Park", lat: 39.1897, lng: -114.7222, radiusKm: 3, category: "state-park" },
  { id: "nv-kershaw-ryan", name: "Kershaw-Ryan State Park", lat: 37.5886, lng: -114.5253, radiusKm: 2, category: "state-park" },
  { id: "nv-echo-canyon", name: "Echo Canyon State Park", lat: 37.91, lng: -114.261, radiusKm: 3, category: "state-park" },
  { id: "nv-spring-valley", name: "Spring Valley State Park", lat: 38.0539, lng: -114.171, radiusKm: 3, category: "state-park" },
  { id: "nv-berlin-ichthyosaur", name: "Berlin-Ichthyosaur State Park", lat: 38.8786, lng: -117.595, radiusKm: 4, category: "state-park" },
  { id: "nv-lake-tahoe", name: "Lake Tahoe Nevada State Park", lat: 39.1714, lng: -119.8925, radiusKm: 4, category: "state-park" },
  { id: "nv-washoe-lake", name: "Washoe Lake State Park", lat: 39.245, lng: -119.785, radiusKm: 4, category: "state-park" },
  { id: "nv-dayton", name: "Dayton State Park", lat: 39.2483, lng: -119.589, radiusKm: 2, category: "state-park" },
  { id: "nv-walker-lake", name: "Walker Lake State Park", lat: 38.6625, lng: -118.7672, radiusKm: 5, category: "state-park" },
  { id: "nv-south-fork", name: "South Fork State Recreation Area", lat: 40.6575, lng: -115.746, radiusKm: 4, category: "recreation-area" },
  { id: "nv-wild-horse", name: "Wild Horse State Recreation Area", lat: 41.6708, lng: -115.8, radiusKm: 4, category: "recreation-area" },
  { id: "nv-rye-patch", name: "Rye Patch State Recreation Area", lat: 40.4706, lng: -118.3094, radiusKm: 4, category: "recreation-area" },
  { id: "nv-beaver-dam", name: "Beaver Dam State Park", lat: 37.51, lng: -114.073, radiusKm: 4, category: "state-park" },
  { id: "nv-forty-mile", name: "Forty Mile State Park", lat: 37.0739, lng: -116.3489, radiusKm: 4, category: "state-park" },
  { id: "nv-van-sickle-bistate-park", name: "Van Sickle Bi-State Park", lat: 38.9622, lng: -119.94, radiusKm: 4, category: "state-park" },
  { id: "nv-snyder-meadows", name: "Snyder Meadows State Park", lat: 39.1153, lng: -119.8439, radiusKm: 4, category: "state-park" },
  { id: "nv-ice-age-fossils", name: "Ice Age Fossils State Park", lat: 36.3186, lng: -115.2061, radiusKm: 4, category: "state-park" },
  { id: "nv-lahontan", name: "Lahontan State Recreation Area", lat: 39.4231, lng: -119.11, radiusKm: 4, category: "recreation-area" },
  { id: "nv-walker-river", name: "Walker River State Recreation Area", lat: 38.8503, lng: -119.0856, radiusKm: 4, category: "recreation-area" },
  { id: "nv-sand-harbor-beach", name: "Sand Harbor Beach State Recreation Area", lat: 39.1975, lng: -119.9292, radiusKm: 4, category: "recreation-area" },
  { id: "nv-eagle-valley-reservoir", name: "Eagle Valley Reservoir State Recreation Area", lat: 38.0242, lng: -114.1953, radiusKm: 4, category: "recreation-area" },
  { id: "nv-goose-creek-ground-and-game-refuge", name: "Goose Creek State Recreation Ground and Game Refuge", lat: 41.9067, lng: -114.1753, radiusKm: 4, category: "recreation-area" },
];
