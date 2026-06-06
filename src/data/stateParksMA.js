// Massachusetts state parks, forests, reservations, beaches & WMAs — wildlife
// units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of MA
// "State Park / State Forest / State Reservation / State Beach / Wildlife
// Management Area" (195 raw units), then curated to the wildlife destinations
// across every region (Berkshires, Pioneer Valley, central, MetroWest, Boston/
// South Shore, North Shore, Cape & Islands). Dropped: urban "Heritage State
// Parks" (Lowell, Lawrence, Lynn, Holyoke, Fall River, Western Gateway, Roxbury,
// Chicopee), duplicates (Bash Bish Falls SP/SF, Martha's Vineyard = Correllus SF,
// Windsor SF/James SP, Myles Standish SF/SP, Douglas/Douglass, Lowell-Dracut
// twins, Federated Women's twins), and noise ("State Park Bar", "State Forest
// Cemetery", swimming-pool dams). Three premier wildlife areas missing from
// Wikidata added via authoritative Nominatim geocodes: Blue Hills Reservation,
// Horseneck Beach State Reservation, and Quabbin Park.
//
// Plum Island is intentionally omitted — it is mostly the federal Parker River
// NWR (only the small Sandy Point tip is state), matching how we keep this a
// STATE feature; Salisbury Beach SR represents the premier North Shore coast.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 · state-beach 🏖️ · state-preserve 🦋 (WMAs/Quabbin)
// radiusKm is the fallback search radius. As with RI, MA is patchy in iNat's
// PLACES database: 17/62 units have a boundary place_id; the rest query by radius
// (iNat observation density is high, so the radius path still returns rich data),
// and county-level eBird gives every MA unit national-park-grade bird rarity.

export const STATE_PARKS_MA = [
  // ── Berkshires & far west ───────────────────────────────────────────────────
  { id: 'ma-greylock',           name: 'Mount Greylock State Reservation',       lat: 42.6023, lng: -73.1763, radiusKm: 6, category: 'state-park' },
  { id: 'ma-october-mtn',        name: 'October Mountain State Forest',          lat: 42.3501, lng: -73.1745, radiusKm: 8, category: 'state-forest' },
  { id: 'ma-mohawk-trail',       name: 'Mohawk Trail State Forest',              lat: 42.6252, lng: -72.8701, radiusKm: 6, category: 'state-forest' },
  { id: 'ma-savoy-mtn',          name: 'Savoy Mountain State Forest',            lat: 42.6001, lng: -73.0245, radiusKm: 6, category: 'state-forest' },
  { id: 'ma-mt-washington',      name: 'Mount Washington State Forest',          lat: 42.1353, lng: -73.4747, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-bash-bish-falls',    name: 'Bash Bish Falls State Park',             lat: 42.1162, lng: -73.4963, radiusKm: 2, category: 'state-park' },
  { id: 'ma-mt-everett',         name: 'Mount Everett State Reservation',        lat: 42.1016, lng: -73.4327, radiusKm: 3, category: 'state-park' },
  { id: 'ma-pittsfield-sf',      name: 'Pittsfield State Forest',                lat: 42.4834, lng: -73.3013, radiusKm: 6, category: 'state-forest' },
  { id: 'ma-beartown-sf',        name: 'Beartown State Forest',                  lat: 42.2334, lng: -73.2746, radiusKm: 6, category: 'state-forest' },
  { id: 'ma-sandisfield-sf',     name: 'Sandisfield State Forest',               lat: 42.0950, lng: -73.1863, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-tolland-sf',         name: 'Tolland State Forest',                   lat: 42.1343, lng: -73.0296, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-windsor-sf',         name: 'Windsor State Forest',                   lat: 42.5331, lng: -73.0075, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-chester-blandford-sf', name: 'Chester-Blandford State Forest',       lat: 42.2494, lng: -72.9494, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-dar-sf',             name: 'D.A.R. State Forest',                    lat: 42.4569, lng: -72.7986, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-natural-bridge',     name: 'Natural Bridge State Park',              lat: 42.7067, lng: -73.0933, radiusKm: 2, category: 'state-park' },
  { id: 'ma-wahconah-falls',     name: 'Wahconah Falls State Park',              lat: 42.4875, lng: -73.1150, radiusKm: 2, category: 'state-park' },
  { id: 'ma-george-darey-wma',   name: 'George L. Darey Wildlife Management Area', lat: 42.3972, lng: -73.2422, radiusKm: 4, category: 'state-preserve' },

  // ── Pioneer Valley (Connecticut River) ──────────────────────────────────────
  { id: 'ma-mt-tom',             name: 'Mount Tom State Reservation',            lat: 42.2625, lng: -72.6314, radiusKm: 4, category: 'state-park' },
  { id: 'ma-mt-holyoke-range',   name: 'Mount Holyoke Range State Park',         lat: 42.3078, lng: -72.5119, radiusKm: 4, category: 'state-park' },
  { id: 'ma-skinner',            name: 'J. A. Skinner State Park',               lat: 42.3044, lng: -72.5883, radiusKm: 2, category: 'state-park' },
  { id: 'ma-mt-sugarloaf',       name: 'Mount Sugarloaf State Reservation',      lat: 42.4702, lng: -72.5921, radiusKm: 2, category: 'state-park' },
  { id: 'ma-mt-toby-sf',         name: 'Mount Toby State Forest',                lat: 42.5042, lng: -72.5286, radiusKm: 4, category: 'state-forest' },
  { id: 'ma-robinson',           name: 'Robinson State Park',                    lat: 42.0918, lng: -72.6705, radiusKm: 3, category: 'state-park' },
  { id: 'ma-wendell-sf',         name: 'Wendell State Forest',                   lat: 42.5751, lng: -72.4245, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-quabbin',            name: 'Quabbin Park',                           lat: 42.2933, lng: -72.3185, radiusKm: 6, category: 'state-preserve' },

  // ── Central Massachusetts ───────────────────────────────────────────────────
  { id: 'ma-wachusett-mtn',      name: 'Wachusett Mountain State Reservation',   lat: 42.4891, lng: -71.8867, radiusKm: 4, category: 'state-park' },
  { id: 'ma-leominster-sf',      name: 'Leominster State Forest',                lat: 42.5209, lng: -71.8384, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-purgatory-chasm',    name: 'Purgatory Chasm State Reservation',      lat: 42.1283, lng: -71.7144, radiusKm: 2, category: 'state-park' },
  { id: 'ma-douglas-sf',         name: 'Douglas State Forest',                   lat: 42.0339, lng: -71.7625, radiusKm: 5, category: 'state-forest' },
  { id: 'ma-upton-sf',           name: 'Upton State Forest',                     lat: 42.2092, lng: -71.6081, radiusKm: 4, category: 'state-forest' },
  { id: 'ma-moore',              name: 'Moore State Park',                       lat: 42.3182, lng: -71.9572, radiusKm: 3, category: 'state-park' },
  { id: 'ma-wells',              name: 'Wells State Park',                       lat: 42.1464, lng: -72.0669, radiusKm: 3, category: 'state-park' },
  { id: 'ma-quinsigamond',       name: 'Quinsigamond State Park',               lat: 42.2603, lng: -71.7528, radiusKm: 2, category: 'state-park' },
  { id: 'ma-great-brook-farm',   name: 'Great Brook Farm State Park',            lat: 42.5558, lng: -71.3533, radiusKm: 3, category: 'state-park' },
  { id: 'ma-watatic',            name: 'Watatic Mountain State Wildlife Area',   lat: 42.6967, lng: -71.8928, radiusKm: 3, category: 'state-preserve' },
  { id: 'ma-bolton-flats-wma',   name: 'Bolton Flats Wildlife Management Area',  lat: 42.4625, lng: -71.6439, radiusKm: 3, category: 'state-preserve' },

  // ── MetroWest / Concord ─────────────────────────────────────────────────────
  { id: 'ma-walden-pond',        name: 'Walden Pond State Reservation',          lat: 42.4419, lng: -71.3411, radiusKm: 2, category: 'state-park' },
  { id: 'ma-hopkinton',          name: 'Hopkinton State Park',                   lat: 42.2492, lng: -71.5255, radiusKm: 3, category: 'state-park' },
  { id: 'ma-ashland',            name: 'Ashland State Park',                     lat: 42.2422, lng: -71.4672, radiusKm: 2, category: 'state-park' },
  { id: 'ma-callahan',           name: 'Callahan State Park',                    lat: 42.3194, lng: -71.4669, radiusKm: 3, category: 'state-park' },

  // ── Boston & South Shore ────────────────────────────────────────────────────
  { id: 'ma-blue-hills',         name: 'Blue Hills Reservation',                 lat: 42.2244, lng: -71.0530, radiusKm: 6, category: 'state-park' },
  { id: 'ma-wompatuck',          name: 'Wompatuck State Park',                   lat: 42.2064, lng: -70.8461, radiusKm: 4, category: 'state-park' },
  { id: 'ma-borderland',         name: 'Borderland State Park',                  lat: 42.0671, lng: -71.1567, radiusKm: 3, category: 'state-park' },
  { id: 'ma-massasoit',          name: 'Massasoit State Park',                   lat: 41.8678, lng: -70.9900, radiusKm: 3, category: 'state-park' },
  { id: 'ma-ames-nowell',        name: 'Ames Nowell State Park',                 lat: 42.1175, lng: -70.9850, radiusKm: 2, category: 'state-park' },
  { id: 'ma-myles-standish-sf',  name: 'Myles Standish State Forest',            lat: 41.8676, lng: -70.6641, radiusKm: 8, category: 'state-forest' },
  { id: 'ma-freetown-fall-river-sf', name: 'Freetown-Fall River State Forest',   lat: 41.7579, lng: -71.0634, radiusKm: 6, category: 'state-forest' },
  { id: 'ma-burrage-pond-wma',   name: 'Burrage Pond Wildlife Management Area',  lat: 42.0210, lng: -70.8760, radiusKm: 4, category: 'state-preserve' },

  // ── North Shore ─────────────────────────────────────────────────────────────
  { id: 'ma-salisbury-beach',    name: 'Salisbury Beach State Reservation',      lat: 42.8265, lng: -70.8174, radiusKm: 3, category: 'state-beach' },
  { id: 'ma-halibut-point',      name: 'Halibut Point State Park',               lat: 42.6895, lng: -70.6330, radiusKm: 2, category: 'state-park' },
  { id: 'ma-maudslay',           name: 'Maudslay State Park',                    lat: 42.8211, lng: -70.9247, radiusKm: 3, category: 'state-park' },
  { id: 'ma-bradley-palmer',     name: 'Bradley Palmer State Park',              lat: 42.6333, lng: -70.8953, radiusKm: 3, category: 'state-park' },
  { id: 'ma-harold-parker-sf',   name: 'Harold Parker State Forest',             lat: 42.6198, lng: -71.0804, radiusKm: 5, category: 'state-forest' },

  // ── Cape Cod & the Islands ──────────────────────────────────────────────────
  { id: 'ma-nickerson',          name: 'Nickerson State Park',                   lat: 41.7611, lng: -70.0333, radiusKm: 4, category: 'state-park' },
  { id: 'ma-shawme-crowell-sf',  name: 'Shawme-Crowell State Forest',            lat: 41.7598, lng: -70.5256, radiusKm: 4, category: 'state-forest' },
  { id: 'ma-scusset-beach',      name: 'Scusset Beach State Reservation',        lat: 41.7794, lng: -70.5010, radiusKm: 2, category: 'state-beach' },
  { id: 'ma-south-cape-beach',   name: 'South Cape Beach State Park',            lat: 41.5584, lng: -70.5024, radiusKm: 2, category: 'state-beach' },
  { id: 'ma-correllus-sf',       name: 'Manuel F. Correllus State Forest',       lat: 41.4069, lng: -70.6139, radiusKm: 4, category: 'state-forest' },
  { id: 'ma-joseph-sylvia-beach', name: 'Joseph Sylvia State Beach',             lat: 41.4253, lng: -70.5542, radiusKm: 2, category: 'state-beach' },
  { id: 'ma-demarest-lloyd',     name: 'Demarest Lloyd State Park',              lat: 41.5263, lng: -70.9833, radiusKm: 2, category: 'state-park' },
  { id: 'ma-horseneck-beach',    name: 'Horseneck Beach State Reservation',      lat: 41.5079, lng: -71.0487, radiusKm: 3, category: 'state-beach' },
  { id: 'ma-frances-crane-wma',  name: 'Frances A. Crane Wildlife Management Area', lat: 41.6386, lng: -70.5653, radiusKm: 4, category: 'state-preserve' },
];
