// New York state parks, forest-preserve units & WMAs — wildlife units (v1).
//
// Coordinates verified against Wikidata (P625) via a one-shot SPARQL pull of NY
// "State Park / State Forest / Wilderness Area / Wild Forest / WMA / Nature
// Preserve" (295 raw units), curated to the wildlife destinations across every
// region: Long Island coast, the Lower Hudson Highlands, the Catskills, the
// Capital region, the Adirondacks, the Thousand Islands / North Country, the
// Finger Lakes gorges, and Niagara / the Great Lakes shore. Dropped: golf
// courses, the Taconic State Parkway, heliports, the dozens of numbered
// reforestation "State Forest Number N" woodlots, urban NYC parks, and the
// 6-million-acre "Adirondack/Catskill State Park" umbrella points (a single pin
// is meaningless — represented instead by their named Wilderness/Wild Forest
// units). Adirondack/Catskill Wilderness & Wild Forest tracts are categorised as
// state-forest. Acadia-style federal land (e.g. Montezuma NWR) is excluded;
// the adjacent state Howland Island WMA represents that area.
//
// category → map emoji: state-park 🏞️ · state-forest 🌲 (Forest Preserve) · state-beach 🏖️ · state-preserve 🦋 (WMAs)
// radiusKm is the fallback search radius. 36/68 units have an iNat boundary
// place_id; the rest query by radius (iNat observation density is high), and
// county-level eBird gives every unit national-park-grade bird rarity.

export const STATE_PARKS_NY = [
  // ── Long Island (coast & maritime — premier birding) ────────────────────────
  { id: 'ny-montauk-point',      name: 'Montauk Point State Park',               lat: 41.0700, lng: -71.8550, radiusKm: 2, category: 'state-park' },
  { id: 'ny-camp-hero',          name: 'Camp Hero State Park',                   lat: 41.0667, lng: -71.8678, radiusKm: 2, category: 'state-park' },
  { id: 'ny-hither-hills',       name: 'Hither Hills State Park',                lat: 41.0100, lng: -72.0100, radiusKm: 3, category: 'state-park' },
  { id: 'ny-orient-beach',       name: 'Orient Beach State Park',                lat: 41.1294, lng: -72.2664, radiusKm: 2, category: 'state-park' },
  { id: 'ny-connetquot',         name: 'Connetquot River State Park Preserve',   lat: 40.7503, lng: -73.1505, radiusKm: 3, category: 'state-park' },
  { id: 'ny-caleb-smith',        name: 'Caleb Smith State Park Preserve',        lat: 40.8508, lng: -73.2278, radiusKm: 2, category: 'state-park' },
  { id: 'ny-sunken-meadow',      name: 'Sunken Meadow State Park',               lat: 40.9114, lng: -73.2580, radiusKm: 2, category: 'state-park' },
  { id: 'ny-heckscher',          name: 'Heckscher State Park',                   lat: 40.7075, lng: -73.1611, radiusKm: 2, category: 'state-park' },
  { id: 'ny-robert-moses',       name: 'Robert Moses State Park',                lat: 40.6200, lng: -73.2600, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-jones-beach',        name: 'Jones Beach State Park',                 lat: 40.5976, lng: -73.5148, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-wildwood',           name: 'Wildwood State Park',                    lat: 40.9604, lng: -72.7956, radiusKm: 2, category: 'state-park' },
  { id: 'ny-hallock',            name: 'Hallock State Park Preserve',            lat: 40.9831, lng: -72.5889, radiusKm: 2, category: 'state-park' },
  { id: 'ny-lido-beach-wma',     name: 'Lido Beach Wildlife Management Area',    lat: 40.5939, lng: -73.6161, radiusKm: 2, category: 'state-preserve' },

  // ── Lower Hudson Highlands ──────────────────────────────────────────────────
  { id: 'ny-bear-mountain',      name: 'Bear Mountain State Park',               lat: 41.3128, lng: -74.0058, radiusKm: 4, category: 'state-park' },
  { id: 'ny-harriman',           name: 'Harriman State Park',                    lat: 41.2431, lng: -74.1006, radiusKm: 8, category: 'state-park' },
  { id: 'ny-hudson-highlands',   name: 'Hudson Highlands State Park',            lat: 41.4479, lng: -73.9663, radiusKm: 4, category: 'state-park' },
  { id: 'ny-storm-king',         name: 'Storm King State Park',                  lat: 41.4270, lng: -73.9890, radiusKm: 2, category: 'state-park' },
  { id: 'ny-minnewaska',         name: 'Minnewaska State Park Preserve',         lat: 41.7200, lng: -74.2840, radiusKm: 5, category: 'state-park' },
  { id: 'ny-sterling-forest',    name: 'Sterling Forest State Park',             lat: 41.1988, lng: -74.2568, radiusKm: 6, category: 'state-park' },
  { id: 'ny-fahnestock',         name: 'Clarence Fahnestock State Park',         lat: 41.4290, lng: -73.8580, radiusKm: 4, category: 'state-park' },
  { id: 'ny-rockefeller',        name: 'Rockefeller State Park Preserve',        lat: 41.1117, lng: -73.8364, radiusKm: 2, category: 'state-park' },
  { id: 'ny-nyack-beach',        name: 'Nyack Beach State Park',                 lat: 41.1189, lng: -73.9151, radiusKm: 2, category: 'state-park' },

  // ── Catskills & mid-Hudson ──────────────────────────────────────────────────
  { id: 'ny-slide-mountain',     name: 'Slide Mountain Wilderness Area',         lat: 41.9986, lng: -74.3864, radiusKm: 6, category: 'state-forest' },
  { id: 'ny-lake-taghkanic',     name: 'Lake Taghkanic State Park',              lat: 42.0914, lng: -73.7083, radiusKm: 2, category: 'state-park' },
  { id: 'ny-mills-norrie',       name: 'Margaret Lewis Norrie State Park',       lat: 41.8570, lng: -73.9220, radiusKm: 2, category: 'state-park' },
  { id: 'ny-taconic',            name: 'Taconic State Park',                     lat: 42.1206, lng: -73.5192, radiusKm: 4, category: 'state-park' },
  { id: 'ny-basha-kill-wma',     name: 'Basha Kill Wildlife Management Area',    lat: 41.5325, lng: -74.5239, radiusKm: 4, category: 'state-preserve' },

  // ── Capital region & eastern NY ─────────────────────────────────────────────
  { id: 'ny-thacher',            name: 'John Boyd Thacher State Park',           lat: 42.6558, lng: -74.0192, radiusKm: 3, category: 'state-park' },
  { id: 'ny-saratoga-spa',       name: 'Saratoga Spa State Park',                lat: 43.0511, lng: -73.8039, radiusKm: 3, category: 'state-park' },
  { id: 'ny-moreau-lake',        name: 'Moreau Lake State Park',                 lat: 43.2260, lng: -73.7090, radiusKm: 4, category: 'state-park' },
  { id: 'ny-grafton-lakes',      name: 'Grafton Lakes State Park',               lat: 42.7700, lng: -73.4640, radiusKm: 3, category: 'state-park' },
  { id: 'ny-schodack-island',    name: 'Schodack Island State Park',             lat: 42.4900, lng: -73.7800, radiusKm: 3, category: 'state-park' },

  // ── Adirondacks ─────────────────────────────────────────────────────────────
  { id: 'ny-high-peaks',         name: 'High Peaks Wilderness Area',             lat: 44.1903, lng: -74.0269, radiusKm: 10, category: 'state-forest' },
  { id: 'ny-giant-mountain',     name: 'Giant Mountain Wilderness Area',         lat: 44.0730, lng: -73.7351, radiusKm: 5, category: 'state-forest' },
  { id: 'ny-five-ponds',         name: 'Five Ponds Wilderness Area',             lat: 44.0446, lng: -74.9325, radiusKm: 8, category: 'state-forest' },
  { id: 'ny-pharaoh-lake',       name: 'Pharaoh Lake Wilderness Area',           lat: 43.8107, lng: -73.6654, radiusKm: 6, category: 'state-forest' },
  { id: 'ny-moose-river-plains', name: 'Moose River Plains Wild Forest',         lat: 43.7290, lng: -74.7010, radiusKm: 8, category: 'state-forest' },
  { id: 'ny-lake-george-beach',  name: 'Lake George Beach State Park',           lat: 43.4161, lng: -73.7022, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-cumberland-bay',     name: 'Cumberland Bay State Park',              lat: 44.7250, lng: -73.4230, radiusKm: 2, category: 'state-park' },
  { id: 'ny-point-au-roche',     name: 'Point Au Roche State Park',              lat: 44.7790, lng: -73.3900, radiusKm: 3, category: 'state-park' },
  { id: 'ny-higley-flow',        name: 'Higley Flow State Park',                 lat: 44.4962, lng: -74.9219, radiusKm: 3, category: 'state-park' },

  // ── Thousand Islands & North Country ────────────────────────────────────────
  { id: 'ny-wellesley-island',   name: 'Wellesley Island State Park',            lat: 44.3300, lng: -76.0000, radiusKm: 4, category: 'state-park' },
  { id: 'ny-robert-wehle',       name: 'Robert G. Wehle State Park',             lat: 43.8733, lng: -76.2708, radiusKm: 2, category: 'state-park' },
  { id: 'ny-sandy-island-beach', name: 'Sandy Island Beach State Park',          lat: 43.6310, lng: -76.1960, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-selkirk-shores',     name: 'Selkirk Shores State Park',              lat: 43.5580, lng: -76.1960, radiusKm: 3, category: 'state-park' },

  // ── Finger Lakes & central NY (the gorge parks) ─────────────────────────────
  { id: 'ny-letchworth',         name: 'Letchworth State Park',                  lat: 42.6347, lng: -77.9833, radiusKm: 6, category: 'state-park' },
  { id: 'ny-watkins-glen',       name: 'Watkins Glen State Park',                lat: 42.3771, lng: -76.8717, radiusKm: 2, category: 'state-park' },
  { id: 'ny-taughannock',        name: 'Taughannock Falls State Park',           lat: 42.5469, lng: -76.5995, radiusKm: 2, category: 'state-park' },
  { id: 'ny-treman',             name: 'Robert H. Treman State Park',            lat: 42.4000, lng: -76.5740, radiusKm: 3, category: 'state-park' },
  { id: 'ny-buttermilk-falls',   name: 'Buttermilk Falls State Park',            lat: 42.4000, lng: -76.5300, radiusKm: 2, category: 'state-park' },
  { id: 'ny-green-lakes',        name: 'Green Lakes State Park',                 lat: 43.0484, lng: -75.9710, radiusKm: 3, category: 'state-park' },
  { id: 'ny-fillmore-glen',      name: 'Fillmore Glen State Park',               lat: 42.7000, lng: -76.4200, radiusKm: 2, category: 'state-park' },
  { id: 'ny-clark-reservation',  name: 'Clark Reservation State Park',           lat: 42.9930, lng: -76.0947, radiusKm: 2, category: 'state-park' },
  { id: 'ny-chimney-bluffs',     name: 'Chimney Bluffs State Park',              lat: 43.2800, lng: -76.9200, radiusKm: 2, category: 'state-park' },
  { id: 'ny-stony-brook',        name: 'Stony Brook State Park',                 lat: 42.5208, lng: -77.6950, radiusKm: 2, category: 'state-park' },
  { id: 'ny-cayuga-lake',        name: 'Cayuga Lake State Park',                 lat: 42.8960, lng: -76.7500, radiusKm: 2, category: 'state-park' },
  { id: 'ny-chenango-valley',    name: 'Chenango Valley State Park',             lat: 42.2150, lng: -75.8300, radiusKm: 3, category: 'state-park' },
  { id: 'ny-howland-island-wma', name: 'Howland Island Wildlife Management Area', lat: 43.0837, lng: -76.6788, radiusKm: 4, category: 'state-preserve' },

  // ── Western NY, Niagara & the Great Lakes shore ─────────────────────────────
  { id: 'ny-allegany',           name: 'Allegany State Park',                    lat: 42.1150, lng: -78.7200, radiusKm: 10, category: 'state-park' },
  { id: 'ny-niagara-falls',      name: 'Niagara Falls State Park',               lat: 43.0800, lng: -79.0700, radiusKm: 2, category: 'state-park' },
  { id: 'ny-fort-niagara',       name: 'Fort Niagara State Park',                lat: 43.2620, lng: -79.0550, radiusKm: 2, category: 'state-park' },
  { id: 'ny-evangola',           name: 'Evangola State Park',                    lat: 42.6069, lng: -79.1017, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-hamlin-beach',       name: 'Hamlin Beach State Park',                lat: 43.3610, lng: -77.9530, radiusKm: 2, category: 'state-beach' },
  { id: 'ny-braddock-bay-wma',   name: 'Braddock Bay Fish and Wildlife Management Area', lat: 43.3003, lng: -77.7097, radiusKm: 3, category: 'state-preserve' },
  { id: 'ny-darien-lakes',       name: 'Darien Lakes State Park',                lat: 42.9000, lng: -78.4300, radiusKm: 3, category: 'state-park' },
  { id: 'ny-buffalo-harbor',     name: 'Buffalo Harbor State Park',              lat: 42.8460, lng: -78.8618, radiusKm: 2, category: 'state-park' },
  { id: 'ny-golden-hill',        name: 'Golden Hill State Park',                 lat: 43.3690, lng: -78.4790, radiusKm: 2, category: 'state-park' },
  { id: 'ny-beaver-island',      name: 'Beaver Island State Park',               lat: 42.9600, lng: -78.9500, radiusKm: 2, category: 'state-park' },
];
