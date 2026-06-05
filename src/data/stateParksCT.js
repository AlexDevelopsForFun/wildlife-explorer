// Connecticut state parks & forests — wildlife-significant units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of
// every CT "State Park / State Forest / State Reserve" (131 units), then curated
// to the wildlife destinations: all coastal parks, the ridge/mountain parks, the
// CT-River and waterfall parks, the major ponds/reservoirs, and ALL the large
// state forests. Omitted from v1 (easily added later): linear rail-trails (Hop
// River, Larkin, Farmington Canal, Moosup Valley, Windsor Locks Canal),
// sub-features/duplicates (e.g. "…Bathing Beach", "Historic Bridges of…",
// "…State Park Reserve" twins), historic forts (Griswold, Shantok), urban units
// (Beardsley), the "State Park Supply Yard", and Centennial Watershed SF
// (scattered watershed parcels with no single meaningful centroid). CT counties
// feed eBird subnational2 codes US-CT-001…015 (eBird uses the 8 traditional ones).
//
// Coordinates spot-corrected against authoritative iNaturalist place centroids
// where Wikidata held a stray node — Natchaug SF, Enders SF (each was 14–19 km
// off the real forest), and Trout Brook Valley. 58 units; 57 carry a verified
// iNat boundary place_id, Great Pond SF uses the radius fallback.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 · state-preserve 🦋
// radiusKm is only a fallback; parks with an iNat place_id query the real boundary.

export const STATE_PARKS_CT = [
  // ── Coastal (Long Island Sound) — premier birding ───────────────────────────
  { id: 'ct-hammonasset',      name: 'Hammonasset Beach State Park', lat: 41.2650, lng: -72.5558, radiusKm: 4, category: 'state-park' },
  { id: 'ct-sherwood-island',  name: 'Sherwood Island State Park',   lat: 41.1154, lng: -73.3270, radiusKm: 3, category: 'state-park' },
  { id: 'ct-silver-sands',     name: 'Silver Sands State Park',      lat: 41.2000, lng: -73.0711, radiusKm: 3, category: 'state-park' },
  { id: 'ct-bluff-point',      name: 'Bluff Point State Park',       lat: 41.3250, lng: -72.0286, radiusKm: 3, category: 'state-preserve' },
  { id: 'ct-rocky-neck',       name: 'Rocky Neck State Park',        lat: 41.3100, lng: -72.2453, radiusKm: 3, category: 'state-park' },
  { id: 'ct-harkness',         name: 'Harkness Memorial State Park', lat: 41.3047, lng: -72.1131, radiusKm: 2, category: 'state-park' },
  { id: 'ct-haley-farm',       name: 'Haley Farm State Park',        lat: 41.3320, lng: -72.0092, radiusKm: 2, category: 'state-park' },
  { id: 'ct-farm-river',       name: 'Farm River State Park',        lat: 41.2547, lng: -72.8569, radiusKm: 2, category: 'state-park' },

  // ── Ridges & mountains (incl. hawk-watch) ───────────────────────────────────
  { id: 'ct-sleeping-giant',   name: 'Sleeping Giant State Park',    lat: 41.4331, lng: -72.8850, radiusKm: 4, category: 'state-park' },
  { id: 'ct-talcott-mountain', name: 'Talcott Mountain State Park',  lat: 41.8250, lng: -72.7900, radiusKm: 3, category: 'state-park' },
  { id: 'ct-penwood',          name: 'Penwood State Park',           lat: 41.8600, lng: -72.7800, radiusKm: 3, category: 'state-park' },
  { id: 'ct-west-rock-ridge',  name: 'West Rock Ridge State Park',   lat: 41.3456, lng: -72.9722, radiusKm: 4, category: 'state-park' },
  { id: 'ct-mount-tom',        name: 'Mount Tom State Park',         lat: 41.6925, lng: -73.2794, radiusKm: 2, category: 'state-park' },
  { id: 'ct-mount-riga',       name: 'Mount Riga State Park',        lat: 42.0353, lng: -73.4339, radiusKm: 4, category: 'state-park' },

  // ── Connecticut River, waterfalls & gorges ──────────────────────────────────
  { id: 'ct-gillette-castle',  name: 'Gillette Castle State Park',   lat: 41.4236, lng: -72.4314, radiusKm: 3, category: 'state-park' },
  { id: 'ct-selden-neck',      name: 'Selden Neck State Park',       lat: 41.3947, lng: -72.4150, radiusKm: 3, category: 'state-park' },
  { id: 'ct-haddam-meadows',   name: 'Haddam Meadows State Park',    lat: 41.4800, lng: -72.5075, radiusKm: 3, category: 'state-park' },
  { id: 'ct-devils-hopyard',   name: "Devil's Hopyard State Park",   lat: 41.4825, lng: -72.3472, radiusKm: 4, category: 'state-park' },
  { id: 'ct-kent-falls',       name: 'Kent Falls State Park',        lat: 41.7750, lng: -73.4100, radiusKm: 2, category: 'state-park' },
  { id: 'ct-housatonic-meadows', name: 'Housatonic Meadows State Park', lat: 41.8450, lng: -73.3783, radiusKm: 4, category: 'state-park' },
  { id: 'ct-wadsworth-falls',  name: 'Wadsworth Falls State Park',   lat: 41.5362, lng: -72.6851, radiusKm: 3, category: 'state-park' },
  { id: 'ct-southford-falls',  name: 'Southford Falls State Park',   lat: 41.4543, lng: -73.1618, radiusKm: 2, category: 'state-park' },
  { id: 'ct-indian-well',      name: 'Indian Well State Park',       lat: 41.3462, lng: -73.1301, radiusKm: 2, category: 'state-park' },

  // ── Ponds, lakes & reservoirs ───────────────────────────────────────────────
  { id: 'ct-bigelow-hollow',   name: 'Bigelow Hollow State Park',    lat: 42.0044, lng: -72.1297, radiusKm: 5, category: 'state-park' },
  { id: 'ct-mansfield-hollow', name: 'Mansfield Hollow State Park',  lat: 41.7683, lng: -72.1756, radiusKm: 4, category: 'state-park' },
  { id: 'ct-burr-pond',        name: 'Burr Pond State Park',         lat: 41.8689, lng: -73.0940, radiusKm: 3, category: 'state-park' },
  { id: 'ct-black-rock',       name: 'Black Rock State Park',        lat: 41.6551, lng: -73.1064, radiusKm: 3, category: 'state-park' },
  { id: 'ct-squantz-pond',     name: 'Squantz Pond State Park',      lat: 41.5106, lng: -73.4764, radiusKm: 3, category: 'state-park' },
  { id: 'ct-lake-waramaug',    name: 'Lake Waramaug State Park',     lat: 41.7064, lng: -73.3825, radiusKm: 3, category: 'state-park' },
  { id: 'ct-kettletown',       name: 'Kettletown State Park',        lat: 41.4211, lng: -73.2047, radiusKm: 3, category: 'state-park' },
  { id: 'ct-hopeville-pond',   name: 'Hopeville Pond State Park',    lat: 41.6076, lng: -71.9190, radiusKm: 3, category: 'state-park' },
  { id: 'ct-quaddick',         name: 'Quaddick State Park',          lat: 41.9556, lng: -71.8117, radiusKm: 3, category: 'state-park' },
  { id: 'ct-chatfield-hollow', name: 'Chatfield Hollow State Park',  lat: 41.3706, lng: -72.6003, radiusKm: 3, category: 'state-park' },
  { id: 'ct-day-pond',         name: 'Day Pond State Park',          lat: 41.5533, lng: -72.4183, radiusKm: 2, category: 'state-park' },

  // ── Inland woodland & meadow parks ──────────────────────────────────────────
  { id: 'ct-macedonia-brook',  name: 'Macedonia Brook State Park',   lat: 41.7728, lng: -73.4842, radiusKm: 4, category: 'state-park' },
  { id: 'ct-mashamoquet-brook', name: 'Mashamoquet Brook State Park', lat: 41.8511, lng: -71.9847, radiusKm: 4, category: 'state-park' },
  { id: 'ct-gay-city',         name: 'Gay City State Park',          lat: 41.7261, lng: -72.4400, radiusKm: 3, category: 'state-park' },
  { id: 'ct-huntington',       name: 'Collis P. Huntington State Park', lat: 41.3512, lng: -73.3560, radiusKm: 3, category: 'state-park' },
  { id: 'ct-putnam-memorial',  name: 'Putnam Memorial State Park',   lat: 41.3397, lng: -73.3836, radiusKm: 2, category: 'state-park' },
  { id: 'ct-osbornedale',      name: 'Osbornedale State Park',       lat: 41.3397, lng: -73.1028, radiusKm: 2, category: 'state-park' },
  { id: 'ct-quinnipiac-river', name: 'Quinnipiac River State Park',  lat: 41.4231, lng: -72.8533, radiusKm: 3, category: 'state-park' },
  { id: 'ct-dinosaur',         name: 'Dinosaur State Park',          lat: 41.6505, lng: -72.6568, radiusKm: 2, category: 'state-park' },

  // ── State forests (the large wildlife blocks) ───────────────────────────────
  { id: 'ct-pachaug-sf',       name: 'Pachaug State Forest',         lat: 41.5992, lng: -71.8781, radiusKm: 10, category: 'state-forest' },
  { id: 'ct-cockaponset-sf',   name: 'Cockaponset State Forest',     lat: 41.4411, lng: -72.5336, radiusKm: 8, category: 'state-forest' },
  { id: 'ct-mohawk-sf',        name: 'Mohawk State Forest',          lat: 41.8167, lng: -73.2833, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-natchaug-sf',      name: 'Natchaug State Forest',        lat: 41.8296, lng: -72.0950, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-meshomasic-sf',    name: 'Meshomasic State Forest',      lat: 41.6300, lng: -72.5500, radiusKm: 7, category: 'state-forest' },
  { id: 'ct-shenipsit-sf',     name: 'Shenipsit State Forest',       lat: 41.9756, lng: -72.3867, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-tunxis-sf',        name: 'Tunxis State Forest',          lat: 42.0189, lng: -72.9583, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-mattatuck-sf',     name: 'Mattatuck State Forest',       lat: 41.6429, lng: -73.1007, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-naugatuck-sf',     name: 'Naugatuck State Forest',       lat: 41.4583, lng: -73.0603, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-salmon-river-sf',  name: 'Salmon River State Forest',    lat: 41.5536, lng: -72.4425, radiusKm: 6, category: 'state-forest' },
  { id: 'ct-american-legion-sf', name: 'American Legion State Forest', lat: 41.9330, lng: -73.0110, radiusKm: 4, category: 'state-forest' },
  { id: 'ct-enders-sf',        name: 'Enders State Forest',          lat: 41.9551, lng: -72.8845, radiusKm: 3, category: 'state-forest' },
  { id: 'ct-great-pond-sf',    name: 'Great Pond State Forest',      lat: 41.9000, lng: -72.8314, radiusKm: 3, category: 'state-forest' },

  // ── Nature reserves ─────────────────────────────────────────────────────────
  { id: 'ct-trout-brook-valley', name: 'Trout Brook Valley State Park Reserve', lat: 41.2583, lng: -73.3445, radiusKm: 3, category: 'state-preserve' },
  { id: 'ct-campbell-falls',   name: 'Campbell Falls State Park Reserve', lat: 42.0425, lng: -73.2244, radiusKm: 2, category: 'state-preserve' },
  { id: 'ct-seth-low-pierrepont', name: 'Seth Low Pierrepont State Park Reserve', lat: 41.3265, lng: -73.4987, radiusKm: 2, category: 'state-preserve' },
];
