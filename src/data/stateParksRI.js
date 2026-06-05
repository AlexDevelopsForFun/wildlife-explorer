// Rhode Island state parks, beaches & DEM management areas — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of RI
// "State Park / State Beach / Management Area / …" (88 raw units), then curated
// to genuine STATE wildlife destinations. Dropped: municipal "Memorial Parks"
// (Pawtucket/Providence — Slater, Lippitt, Highland, Veterans, etc.), FEDERAL
// National Wildlife Refuges (Ninigret, Sachuest Point, Trustom Pond, Block
// Island, Chafee, Pettaquamscutt — not state units), private Audubon Society of
// RI refuges (Davis, Fisherville, Kimball, Powder Mill Ledges…), and duplicate
// sub-features (Burlingame ×4, Goddard beach, Sand Hill Cove = Roger Wheeler).
// Great Swamp Management Area — RI's premier inland wildlife area, missing from
// Wikidata — added via an authoritative Nominatim geocode (41.461, -71.587).
//
// As the Ocean State, RI gets its own beach category. eBird subnational2 codes
// US-RI-001…009 cover the 5 counties (Bristol/Kent/Newport/Providence/Washington).
//
// category → map emoji: state-park 🏞️ · state-beach 🏖️ · state-preserve 🦋 (mgmt areas)
// radiusKm is the fallback search radius. NOTE: RI is sparsely covered in iNat's
// PLACES database, so only 5 units (Colt, Lincoln Woods, Great Swamp, Nicholas
// Farm, Buck Hill) have a boundary place_id; the other 36 query by radius. iNat
// OBServation density in RI is still high, so the radius path returns rich data;
// and county-level eBird gives every RI unit national-park-grade bird rarity.

export const STATE_PARKS_RI = [
  // ── State parks ─────────────────────────────────────────────────────────────
  { id: 'ri-beavertail',         name: 'Beavertail State Park',                  lat: 41.4494, lng: -71.3994, radiusKm: 2, category: 'state-park' },
  { id: 'ri-brenton-point',      name: 'Brenton Point State Park',               lat: 41.4528, lng: -71.3544, radiusKm: 2, category: 'state-park' },
  { id: 'ri-burlingame',         name: 'Burlingame State Park',                  lat: 41.3628, lng: -71.7003, radiusKm: 4, category: 'state-park' },
  { id: 'ri-colt',               name: 'Colt State Park',                        lat: 41.6767, lng: -71.2989, radiusKm: 3, category: 'state-park' },
  { id: 'ri-fishermens-memorial', name: "Fishermen's Memorial State Park",       lat: 41.3812, lng: -71.4895, radiusKm: 2, category: 'state-park' },
  { id: 'ri-fort-adams',         name: 'Fort Adams State Park',                  lat: 41.4781, lng: -71.3356, radiusKm: 2, category: 'state-park' },
  { id: 'ri-fort-wetherill',     name: 'Fort Wetherill State Park',              lat: 41.4794, lng: -71.3650, radiusKm: 2, category: 'state-park' },
  { id: 'ri-goddard',            name: 'Goddard Memorial State Park',            lat: 41.6586, lng: -71.4378, radiusKm: 3, category: 'state-park' },
  { id: 'ri-haines-memorial',    name: 'Haines Memorial State Park',             lat: 41.7525, lng: -71.3397, radiusKm: 2, category: 'state-park' },
  { id: 'ri-lincoln-woods',      name: 'Lincoln Woods State Park',               lat: 41.8972, lng: -71.4361, radiusKm: 3, category: 'state-park' },
  { id: 'ri-snake-den',          name: 'Snake Den State Park',                   lat: 41.8472, lng: -71.5253, radiusKm: 3, category: 'state-park' },
  { id: 'ri-pulaski',            name: 'Casimir Pulaski Memorial State Park',    lat: 41.9270, lng: -71.7956, radiusKm: 3, category: 'state-park' },
  { id: 'ri-diamond-hill',       name: 'Diamond Hill State Park',                lat: 42.0033, lng: -71.4300, radiusKm: 2, category: 'state-park' },
  { id: 'ri-ww2-memorial',       name: 'World War II Veterans Memorial State Park', lat: 42.0086, lng: -71.5103, radiusKm: 2, category: 'state-park' },
  { id: 'ri-rocky-point',        name: 'Rocky Point State Park',                 lat: 41.6897, lng: -71.3667, radiusKm: 2, category: 'state-park' },
  { id: 'ri-cocumscussoc',       name: 'Cocumscussoc State Park',                lat: 41.5833, lng: -71.4647, radiusKm: 2, category: 'state-park' },
  { id: 'ri-meshanticut',        name: 'Meshanticut State Park',                 lat: 41.7689, lng: -71.4764, radiusKm: 2, category: 'state-park' },
  { id: 'ri-salter-grove',       name: 'Salter Grove State Park',                lat: 41.7569, lng: -71.3831, radiusKm: 2, category: 'state-park' },

  // ── State beaches (Long Island Sound / Atlantic — coastal birding) ──────────
  { id: 'ri-misquamicut',        name: 'Misquamicut State Beach',                lat: 41.3236, lng: -71.8028, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-scarborough',        name: 'Scarborough State Beach',                lat: 41.3803, lng: -71.4778, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-east-matunuck',      name: 'East Matunuck State Beach',              lat: 41.3778, lng: -71.5264, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-roger-wheeler',      name: 'Roger Wheeler State Beach',              lat: 41.3708, lng: -71.4967, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-east-beach',         name: 'East Beach State Beach',                 lat: 41.3451, lng: -71.6823, radiusKm: 3, category: 'state-beach' },
  { id: 'ri-charlestown-breachway', name: 'Charlestown Breachway State Beach',   lat: 41.3567, lng: -71.6381, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-salty-brine',        name: 'Salty Brine State Beach',                lat: 41.3758, lng: -71.5117, radiusKm: 2, category: 'state-beach' },
  { id: 'ri-block-island',       name: 'Block Island State Beach',              lat: 41.1822, lng: -71.5653, radiusKm: 3, category: 'state-beach' },

  // ── DEM management areas (the prime wildlife habitat) ───────────────────────
  { id: 'ri-arcadia',            name: 'Arcadia Management Area',                lat: 41.5500, lng: -71.7000, radiusKm: 10, category: 'state-preserve' },
  { id: 'ri-big-river',          name: 'Big River Management Area',              lat: 41.6222, lng: -71.6161, radiusKm: 6, category: 'state-preserve' },
  { id: 'ri-carolina',           name: 'Carolina Management Area',               lat: 41.4661, lng: -71.6911, radiusKm: 5, category: 'state-preserve' },
  { id: 'ri-george-washington',  name: 'George Washington Management Area',      lat: 41.9201, lng: -71.7690, radiusKm: 6, category: 'state-preserve' },
  { id: 'ri-durfee-hill',        name: 'Durfee Hill Management Area',            lat: 41.8919, lng: -71.7436, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-nicholas-farm',      name: 'Nicholas Farm Management Area',          lat: 41.6764, lng: -71.7772, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-black-hut',          name: 'Black Hut Management Area',              lat: 42.0028, lng: -71.6528, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-buck-hill',          name: 'Buck Hill Management Area',              lat: 42.0056, lng: -71.7883, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-black-farm',         name: 'Black Farm Management Area',             lat: 41.4686, lng: -71.7244, radiusKm: 3, category: 'state-preserve' },
  { id: 'ri-woody-hill',         name: 'Woody Hill Management Area',             lat: 41.3731, lng: -71.7417, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-dutch-island',       name: 'Dutch Island Management Area',           lat: 41.5036, lng: -71.4003, radiusKm: 2, category: 'state-preserve' },
  { id: 'ri-succotash-marsh',    name: 'Succotash Marsh Management Area',        lat: 41.3792, lng: -71.5258, radiusKm: 2, category: 'state-preserve' },
  { id: 'ri-south-shore',        name: 'South Shore Management Area',            lat: 41.3881, lng: -71.6031, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-pawcatuck-river',    name: 'Pawcatuck River Management Area',        lat: 41.3500, lng: -71.8342, radiusKm: 4, category: 'state-preserve' },
  { id: 'ri-great-swamp',        name: 'Great Swamp Management Area',            lat: 41.4610, lng: -71.5866, radiusKm: 5, category: 'state-preserve' },
];
