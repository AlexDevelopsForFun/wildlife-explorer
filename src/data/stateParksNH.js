// New Hampshire state parks, forests, beaches & WMAs — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of NH
// "State Park / State Forest / State Beach / Notch / Wildlife Management Area"
// (161 raw units), curated to the wildlife destinations across every region
// (White Mountains, the notches, Lakes Region, Monadnock, Dartmouth-Sunapee,
// the seacoast, and the Great North Woods). Dropped: sub-features (Bear Brook
// CCC Camp / Dam), dups (Annett SF/Reservation, Clough SF/SP, Ellacoya SP/RV
// Park), and the dozens of tiny woodlot state forests / marsh WMAs. Wellington
// SP and Rollins SP were re-geocoded via Nominatim (Wikidata had Wellington on
// Cardigan Mtn's coordinate). Federal land (White Mountain NF, Umbagog &
// Great Bay NWRs) is excluded — this is a STATE feature; the state-run Umbagog
// Lake SP campground and Adams Point WMA on Great Bay represent those areas.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 · state-beach 🏖️ · state-preserve 🦋 (WMAs)
// radiusKm is the fallback search radius; parks with an iNat place_id query the real boundary.

export const STATE_PARKS_NH = [
  // ── White Mountains & the notches ───────────────────────────────────────────
  { id: 'nh-franconia-notch',    name: 'Franconia Notch State Park',             lat: 44.1433, lng: -71.6839, radiusKm: 6, category: 'state-park' },
  { id: 'nh-crawford-notch',     name: 'Crawford Notch State Park',              lat: 44.1819, lng: -71.3992, radiusKm: 6, category: 'state-park' },
  { id: 'nh-mount-washington',   name: 'Mount Washington State Park',            lat: 44.2694, lng: -71.3017, radiusKm: 3, category: 'state-park' },
  { id: 'nh-echo-lake-cathedral', name: 'Echo Lake–Cathedral Ledge State Park',  lat: 44.0530, lng: -71.1570, radiusKm: 3, category: 'state-park' },
  { id: 'nh-moose-brook',        name: 'Moose Brook State Park',                 lat: 44.4078, lng: -71.2306, radiusKm: 3, category: 'state-park' },
  { id: 'nh-dixville-notch',     name: 'Dixville Notch State Park',              lat: 44.8625, lng: -71.2917, radiusKm: 3, category: 'state-park' },

  // ── Monadnock region & southwest ────────────────────────────────────────────
  { id: 'nh-monadnock',          name: 'Monadnock State Park',                   lat: 42.8456, lng: -72.0886, radiusKm: 4, category: 'state-park' },
  { id: 'nh-miller',             name: 'Miller State Park',                      lat: 42.8547, lng: -71.8847, radiusKm: 2, category: 'state-park' },
  { id: 'nh-pisgah',             name: 'Pisgah State Park',                      lat: 42.8333, lng: -72.4333, radiusKm: 8, category: 'state-park' },
  { id: 'nh-rhododendron',       name: 'Rhododendron State Park',                lat: 42.7847, lng: -72.1917, radiusKm: 2, category: 'state-park' },
  { id: 'nh-greenfield',         name: 'Greenfield State Park',                  lat: 42.9545, lng: -71.8857, radiusKm: 3, category: 'state-park' },
  { id: 'nh-fox-forest',         name: 'Fox State Forest',                       lat: 43.1422, lng: -71.9108, radiusKm: 3, category: 'state-forest' },

  // ── Dartmouth–Sunapee & Kearsarge ───────────────────────────────────────────
  { id: 'nh-mount-sunapee',      name: 'Mount Sunapee State Park',               lat: 43.3429, lng: -72.0618, radiusKm: 4, category: 'state-park' },
  { id: 'nh-pillsbury',          name: 'Pillsbury State Park',                   lat: 43.2308, lng: -72.1003, radiusKm: 5, category: 'state-park' },
  { id: 'nh-rollins',            name: 'Rollins State Park',                     lat: 43.3492, lng: -71.8564, radiusKm: 2, category: 'state-park' },
  { id: 'nh-winslow',            name: 'Winslow State Park',                     lat: 43.3902, lng: -71.8679, radiusKm: 2, category: 'state-park' },
  { id: 'nh-cardigan',           name: 'Cardigan Mountain State Park',           lat: 43.6444, lng: -71.9342, radiusKm: 3, category: 'state-park' },
  { id: 'nh-lake-tarleton',      name: 'Lake Tarleton State Park',               lat: 43.9836, lng: -71.9758, radiusKm: 3, category: 'state-park' },

  // ── Lakes Region ────────────────────────────────────────────────────────────
  { id: 'nh-wellington',         name: 'Wellington State Park',                  lat: 43.6389, lng: -71.7841, radiusKm: 2, category: 'state-park' },
  { id: 'nh-ellacoya',           name: 'Ellacoya State Park',                    lat: 43.5742, lng: -71.3561, radiusKm: 2, category: 'state-park' },
  { id: 'nh-wentworth',          name: 'Wentworth State Park',                   lat: 43.6127, lng: -71.1469, radiusKm: 2, category: 'state-park' },
  { id: 'nh-ahern',              name: 'Ahern State Park',                       lat: 43.5561, lng: -71.5006, radiusKm: 2, category: 'state-park' },
  { id: 'nh-white-lake',         name: 'White Lake State Park',                  lat: 43.8359, lng: -71.2089, radiusKm: 3, category: 'state-park' },
  { id: 'nh-mount-major-sf',     name: 'Mount Major State Forest',               lat: 43.5125, lng: -71.2883, radiusKm: 3, category: 'state-forest' },
  { id: 'nh-belknap-mtn-sf',     name: 'Belknap Mountain State Forest',          lat: 43.5159, lng: -71.3737, radiusKm: 3, category: 'state-forest' },

  // ── Central / Merrimack Valley ──────────────────────────────────────────────
  { id: 'nh-bear-brook',         name: 'Bear Brook State Park',                  lat: 43.1079, lng: -71.3528, radiusKm: 6, category: 'state-park' },
  { id: 'nh-pawtuckaway',        name: 'Pawtuckaway State Park',                 lat: 43.1019, lng: -71.1811, radiusKm: 4, category: 'state-park' },
  { id: 'nh-clough',             name: 'Clough State Park',                      lat: 43.0978, lng: -71.6585, radiusKm: 2, category: 'state-park' },
  { id: 'nh-northwood-meadows',  name: 'Northwood Meadows State Park',           lat: 43.2132, lng: -71.1981, radiusKm: 2, category: 'state-park' },
  { id: 'nh-kingston',           name: 'Kingston State Park',                    lat: 42.9290, lng: -71.0550, radiusKm: 2, category: 'state-park' },
  { id: 'nh-silver-lake',        name: 'Silver Lake State Park',                 lat: 42.7625, lng: -71.5939, radiusKm: 2, category: 'state-park' },
  { id: 'nh-blue-job-sf',        name: 'Blue Job Mountain State Forest',         lat: 43.3333, lng: -71.0958, radiusKm: 2, category: 'state-forest' },

  // ── Seacoast ────────────────────────────────────────────────────────────────
  { id: 'nh-odiorne-point',      name: 'Odiorne Point State Park',              lat: 43.0436, lng: -70.7144, radiusKm: 2, category: 'state-park' },
  { id: 'nh-rye-harbor',         name: 'Rye Harbor State Park',                 lat: 43.0017, lng: -70.7446, radiusKm: 2, category: 'state-park' },
  { id: 'nh-wallis-sands',       name: 'Wallis Sands State Park',               lat: 43.0278, lng: -70.7289, radiusKm: 2, category: 'state-beach' },
  { id: 'nh-hampton-beach',      name: 'Hampton Beach State Park',              lat: 42.8989, lng: -70.8122, radiusKm: 2, category: 'state-beach' },
  { id: 'nh-jenness-beach',      name: 'Jenness State Beach',                   lat: 42.9856, lng: -70.7619, radiusKm: 2, category: 'state-beach' },
  { id: 'nh-north-hampton-beach', name: 'North Hampton State Beach',            lat: 42.9549, lng: -70.7818, radiusKm: 2, category: 'state-beach' },
  { id: 'nh-adams-point',        name: 'Adams Point Wildlife Management Area',  lat: 43.0931, lng: -70.8683, radiusKm: 2, category: 'state-preserve' },

  // ── Great North Woods ───────────────────────────────────────────────────────
  { id: 'nh-forest-lake',        name: 'Forest Lake State Park',                lat: 44.3534, lng: -71.6759, radiusKm: 2, category: 'state-park' },
  { id: 'nh-milan-hill',         name: 'Milan Hill State Park',                 lat: 44.5725, lng: -71.2236, radiusKm: 2, category: 'state-park' },
  { id: 'nh-mollidgewock',       name: 'Mollidgewock State Park',              lat: 44.7388, lng: -71.1447, radiusKm: 3, category: 'state-park' },
  { id: 'nh-umbagog-lake',       name: 'Umbagog Lake State Park',              lat: 44.7023, lng: -71.0555, radiusKm: 5, category: 'state-park' },
  { id: 'nh-coleman',            name: 'Coleman State Park',                    lat: 44.9437, lng: -71.3280, radiusKm: 3, category: 'state-park' },
  { id: 'nh-lake-francis',       name: 'Lake Francis State Park',              lat: 45.0600, lng: -71.3030, radiusKm: 4, category: 'state-park' },
];
