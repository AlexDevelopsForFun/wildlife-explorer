// Pennsylvania state parks, forests & WMAs — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of PA
// "State Park / State Forest / Natural Area / WMA / State Game Land" (530 raw
// units), curated to the wildlife destinations across every region: Lake Erie,
// the northwest, the PA Wilds & elk country, the Pine Creek Gorge, the Poconos,
// the Susquehanna, the Laurel Highlands, and the southeast. Dropped: the ~100+
// numbered "State Game Lands Number N" (unnamed hunting parcels), the "...District"
// / Dam / Office / Cabin sub-features, and urban/historic Philadelphia units
// (Independence Mall, Point, Pennsbury Manor). Middle Creek WMA (the famous
// late-winter Snow Goose staging) and Buzzard Swamp WMA are included.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 · state-preserve 🦋 (WMAs/Natural Areas)
// radiusKm is the fallback search radius. 62/67 units have an iNat boundary
// place_id (PA's iNat PLACES coverage is excellent). Pymatuning falls back to
// radius (its only iNat polygon is the Ohio side of the shared reservoir).

export const STATE_PARKS_PA = [
  // ── Lake Erie & the northwest ───────────────────────────────────────────────
  { id: 'pa-presque-isle',       name: 'Presque Isle State Park',                lat: 42.1631, lng: -80.1008, radiusKm: 4, category: 'state-park' },
  { id: 'pa-erie-bluffs',        name: 'Erie Bluffs State Park',                 lat: 42.0083, lng: -80.4108, radiusKm: 2, category: 'state-park' },
  { id: 'pa-pymatuning',         name: 'Pymatuning State Park',                  lat: 41.5232, lng: -80.4910, radiusKm: 5, category: 'state-park' },
  { id: 'pa-maurice-goddard',    name: 'Maurice K. Goddard State Park',          lat: 41.4289, lng: -80.1447, radiusKm: 3, category: 'state-park' },
  { id: 'pa-moraine',            name: 'Moraine State Park',                     lat: 40.9536, lng: -80.1275, radiusKm: 5, category: 'state-park' },
  { id: 'pa-mcconnells-mill',    name: 'McConnells Mill State Park',             lat: 40.9267, lng: -80.1900, radiusKm: 3, category: 'state-park' },
  { id: 'pa-raccoon-creek',      name: 'Raccoon Creek State Park',               lat: 40.5117, lng: -80.4428, radiusKm: 4, category: 'state-park' },
  { id: 'pa-oil-creek',          name: 'Oil Creek State Park',                   lat: 41.5417, lng: -79.6497, radiusKm: 4, category: 'state-park' },

  // ── PA Wilds & elk country (north-central) ──────────────────────────────────
  { id: 'pa-cook-forest',        name: 'Cook Forest State Park',                 lat: 41.3236, lng: -79.1639, radiusKm: 4, category: 'state-park' },
  { id: 'pa-clear-creek',        name: 'Clear Creek State Park',                 lat: 41.3289, lng: -79.0914, radiusKm: 2, category: 'state-park' },
  { id: 'pa-kinzua-bridge',      name: 'Kinzua Bridge State Park',               lat: 41.7553, lng: -78.5834, radiusKm: 2, category: 'state-park' },
  { id: 'pa-elk-state-park',     name: 'Elk State Park',                         lat: 41.5895, lng: -78.5611, radiusKm: 4, category: 'state-park' },
  { id: 'pa-sinnemahoning',      name: 'Sinnemahoning State Park',               lat: 41.4483, lng: -78.0492, radiusKm: 4, category: 'state-park' },
  { id: 'pa-cherry-springs',     name: 'Cherry Springs State Park',              lat: 41.6628, lng: -77.8231, radiusKm: 3, category: 'state-park' },
  { id: 'pa-ole-bull',           name: 'Ole Bull State Park',                    lat: 41.5361, lng: -77.7122, radiusKm: 3, category: 'state-park' },
  { id: 'pa-kettle-creek',       name: 'Kettle Creek State Park',                lat: 41.3778, lng: -77.9231, radiusKm: 3, category: 'state-park' },
  { id: 'pa-leonard-harrison',   name: 'Leonard Harrison State Park',            lat: 41.6967, lng: -77.4544, radiusKm: 2, category: 'state-park' },
  { id: 'pa-colton-point',       name: 'Colton Point State Park',                lat: 41.7012, lng: -77.4662, radiusKm: 2, category: 'state-park' },
  { id: 'pa-bald-eagle',         name: 'Bald Eagle State Park',                  lat: 41.0417, lng: -77.6033, radiusKm: 4, category: 'state-park' },
  { id: 'pa-black-moshannon',    name: 'Black Moshannon State Park',             lat: 40.8983, lng: -78.0564, radiusKm: 4, category: 'state-park' },
  { id: 'pa-parker-dam',         name: 'Parker Dam State Park',                  lat: 41.2017, lng: -78.5086, radiusKm: 3, category: 'state-park' },
  { id: 'pa-prince-gallitzin',   name: 'Prince Gallitzin State Park',            lat: 40.6750, lng: -78.5369, radiusKm: 4, category: 'state-park' },

  // ── Endless Mountains (north-central/east) ──────────────────────────────────
  { id: 'pa-ricketts-glen',      name: 'Ricketts Glen State Park',               lat: 41.3392, lng: -76.2602, radiusKm: 4, category: 'state-park' },
  { id: 'pa-worlds-end',         name: 'Worlds End State Park',                  lat: 41.4714, lng: -76.5686, radiusKm: 3, category: 'state-park' },
  { id: 'pa-hills-creek',        name: 'Hills Creek State Park',                 lat: 41.8133, lng: -77.1667, radiusKm: 2, category: 'state-park' },
  { id: 'pa-salt-springs',       name: 'Salt Springs State Park',                lat: 41.9139, lng: -75.8664, radiusKm: 2, category: 'state-park' },
  { id: 'pa-tuscarora',          name: 'Tuscarora State Park',                   lat: 40.8000, lng: -76.0247, radiusKm: 2, category: 'state-park' },

  // ── Poconos & northeast ─────────────────────────────────────────────────────
  { id: 'pa-promised-land',      name: 'Promised Land State Park',               lat: 41.3153, lng: -75.1992, radiusKm: 4, category: 'state-park' },
  { id: 'pa-tobyhanna',          name: 'Tobyhanna State Park',                   lat: 41.2389, lng: -75.3725, radiusKm: 3, category: 'state-park' },
  { id: 'pa-big-pocono',         name: 'Big Pocono State Park',                  lat: 41.0419, lng: -75.3456, radiusKm: 2, category: 'state-park' },
  { id: 'pa-hickory-run',        name: 'Hickory Run State Park',                 lat: 41.0361, lng: -75.6839, radiusKm: 4, category: 'state-park' },
  { id: 'pa-lehigh-gorge',       name: 'Lehigh Gorge State Park',                lat: 40.9661, lng: -75.7586, radiusKm: 4, category: 'state-park' },
  { id: 'pa-beltzville',         name: 'Beltzville State Park',                  lat: 40.8683, lng: -75.6081, radiusKm: 3, category: 'state-park' },
  { id: 'pa-nescopeck',          name: 'Nescopeck State Park',                   lat: 41.0764, lng: -75.9028, radiusKm: 3, category: 'state-park' },
  { id: 'pa-george-childs',      name: 'George W. Childs Park',                  lat: 41.2378, lng: -74.9178, radiusKm: 2, category: 'state-park' },

  // ── Southeast & Philadelphia region ─────────────────────────────────────────
  { id: 'pa-nockamixon',         name: 'Nockamixon State Park',                  lat: 40.4208, lng: -75.2617, radiusKm: 4, category: 'state-park' },
  { id: 'pa-marsh-creek',        name: 'Marsh Creek State Park',                 lat: 40.0683, lng: -75.7331, radiusKm: 3, category: 'state-park' },
  { id: 'pa-french-creek',       name: 'French Creek State Park',                lat: 40.2117, lng: -75.7919, radiusKm: 4, category: 'state-park' },
  { id: 'pa-ridley-creek',       name: 'Ridley Creek State Park',                lat: 39.9558, lng: -75.4497, radiusKm: 2, category: 'state-park' },
  { id: 'pa-tyler',              name: 'Tyler State Park',                       lat: 40.2250, lng: -74.9833, radiusKm: 2, category: 'state-park' },
  { id: 'pa-delaware-canal',     name: 'Delaware Canal State Park',              lat: 40.5503, lng: -75.0856, radiusKm: 5, category: 'state-park' },

  // ── Susquehanna & south-central ─────────────────────────────────────────────
  { id: 'pa-middle-creek-wma',   name: 'Middle Creek Wildlife Management Area',  lat: 40.2711, lng: -76.2501, radiusKm: 4, category: 'state-preserve' },
  { id: 'pa-gifford-pinchot',    name: 'Gifford Pinchot State Park',             lat: 40.0717, lng: -76.8883, radiusKm: 3, category: 'state-park' },
  { id: 'pa-codorus',            name: 'Codorus State Park',                     lat: 39.7700, lng: -76.9367, radiusKm: 3, category: 'state-park' },
  { id: 'pa-samuel-lewis',       name: 'Samuel S. Lewis State Park',             lat: 39.9964, lng: -76.5492, radiusKm: 2, category: 'state-park' },
  { id: 'pa-susquehannock',      name: 'Susquehannock State Park',               lat: 39.8117, lng: -76.2914, radiusKm: 2, category: 'state-park' },
  { id: 'pa-shikellamy',         name: 'Shikellamy State Park',                  lat: 40.8814, lng: -76.7839, radiusKm: 2, category: 'state-park' },
  { id: 'pa-little-buffalo',     name: 'Little Buffalo State Park',              lat: 40.4517, lng: -77.1731, radiusKm: 2, category: 'state-park' },
  { id: 'pa-swatara',            name: 'Swatara State Park',                     lat: 40.5400, lng: -76.4631, radiusKm: 4, category: 'state-park' },
  { id: 'pa-caledonia',          name: 'Caledonia State Park',                   lat: 39.9117, lng: -77.4831, radiusKm: 3, category: 'state-park' },
  { id: 'pa-pine-grove-furnace', name: 'Pine Grove Furnace State Park',          lat: 40.0311, lng: -77.3067, radiusKm: 3, category: 'state-park' },

  // ── Laurel Highlands & southwest ────────────────────────────────────────────
  { id: 'pa-ohiopyle',           name: 'Ohiopyle State Park',                    lat: 39.8417, lng: -79.4342, radiusKm: 6, category: 'state-park' },
  { id: 'pa-laurel-hill',        name: 'Laurel Hill State Park',                 lat: 40.0133, lng: -79.2589, radiusKm: 3, category: 'state-park' },
  { id: 'pa-linn-run',           name: 'Linn Run State Park',                    lat: 40.1564, lng: -79.2311, radiusKm: 2, category: 'state-park' },
  { id: 'pa-keystone',           name: 'Keystone State Park',                    lat: 40.3719, lng: -79.3831, radiusKm: 2, category: 'state-park' },
  { id: 'pa-yellow-creek',       name: 'Yellow Creek State Park',                lat: 40.5683, lng: -79.0264, radiusKm: 3, category: 'state-park' },
  { id: 'pa-blue-knob',          name: 'Blue Knob State Park',                   lat: 40.2786, lng: -78.5814, radiusKm: 4, category: 'state-park' },
  { id: 'pa-trough-creek',       name: 'Trough Creek State Park',                lat: 40.3286, lng: -78.1314, radiusKm: 2, category: 'state-park' },
  { id: 'pa-canoe-creek',        name: 'Canoe Creek State Park',                 lat: 40.4867, lng: -78.2697, radiusKm: 3, category: 'state-park' },

  // ── Major state forests & natural areas ─────────────────────────────────────
  { id: 'pa-michaux-sf',         name: 'Michaux State Forest',                   lat: 39.9904, lng: -77.3586, radiusKm: 7, category: 'state-forest' },
  { id: 'pa-bald-eagle-sf',      name: 'Bald Eagle State Forest',                lat: 40.8878, lng: -77.6561, radiusKm: 8, category: 'state-forest' },
  { id: 'pa-tioga-sf',           name: 'Tioga State Forest',                     lat: 41.7769, lng: -77.5139, radiusKm: 8, category: 'state-forest' },
  { id: 'pa-moshannon-sf',       name: 'Moshannon State Forest',                 lat: 41.2083, lng: -78.5756, radiusKm: 8, category: 'state-forest' },
  { id: 'pa-loyalsock-sf',       name: 'Loyalsock State Forest',                 lat: 41.5108, lng: -76.7203, radiusKm: 8, category: 'state-forest' },
  { id: 'pa-elk-sf',             name: 'Elk State Forest',                       lat: 41.3334, lng: -78.2914, radiusKm: 8, category: 'state-forest' },
  { id: 'pa-buzzard-swamp-wma',  name: 'Buzzard Swamp Wildlife Management Area', lat: 41.4475, lng: -79.0636, radiusKm: 3, category: 'state-preserve' },
  { id: 'pa-bear-meadows-na',    name: 'Bear Meadows Natural Area',              lat: 40.7292, lng: -77.7639, radiusKm: 2, category: 'state-preserve' },
];
