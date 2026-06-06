/**
 * stateParksNJ.js — New Jersey state parks, forests, and recreation areas.
 *
 * v1 seed for the State Parks feature. National parks have a bundled species
 * cache + NPS Species API; state parks have NEITHER, so each entry here just
 * carries the location + a sensible default search radius. The runtime
 * fetches species LIVE from eBird + iNat (via the existing /api/*-proxy
 * endpoints) using these coordinates and `radiusKm`.
 *
 * COORDINATES — verified May 2026 against two independent Wikipedia sources:
 *   (1) the consolidated list page
 *       https://en.wikipedia.org/wiki/List_of_New_Jersey_state_parks
 *   (2) each park's individual article infobox (spot-checked on the three
 *       largest, most outlier values: Wharton, Island Beach, Worthington —
 *       all three sources agreed to 4 decimal places).
 * Capital State Park (Trenton) is omitted — still in planning, no defined
 * grounds. Marinas and golf courses are excluded (not wildlife destinations).
 * This is the complete set of 47 NJ state parks, forests, recreation areas,
 * and preserves with public natural grounds.
 *
 * `radiusKm` is the live-data search radius (eBird caps at 50 km). Roughly:
 *   • compact parks / battlefields / preserves → 2–3 km
 *   • typical state parks → 4–6 km
 *   • large state forests (Wharton, Stokes, Bass River, Belleplain,
 *     Brendan T. Byrne, Worthington, Wawayanda) → 8–12 km
 *   • linear parks (D&R Canal) → 10 km nominal
 *
 * `category` is informational (filterable in the UI later). Atsion sits
 * inside Wharton State Forest; listed separately because users search for
 * it by name (radii will overlap — acceptable).
 */

import { STATE_PARKS_DE } from './stateParksDE.js';
import { STATE_PARKS_CT } from './stateParksCT.js';
import { STATE_PARKS_RI } from './stateParksRI.js';
import { STATE_PARKS_MA } from './stateParksMA.js';

export const STATE_PARKS_NJ = [
  { id: 'nj-hewitt',           name: 'Abram S. Hewitt State Forest',        lat: 41.18570453, lng: -74.331375,  radiusKm: 6,  category: 'state-forest' },
  { id: 'nj-allaire',          name: 'Allaire State Park',                  lat: 40.162111,   lng: -74.131561,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-allamuchy',        name: 'Allamuchy Mountain State Park',       lat: 40.921244,   lng: -74.782222,  radiusKm: 6,  category: 'state-park' },
  { id: 'nj-atsion',           name: 'Atsion Recreation Area',              lat: 39.741,      lng: -74.733,     radiusKm: 5,  category: 'recreation-area' },
  { id: 'nj-barnegat',         name: 'Barnegat Lighthouse State Park',      lat: 39.763031,   lng: -74.107983,  radiusKm: 2,  category: 'state-park' },
  { id: 'nj-bass-river',       name: 'Bass River State Forest',             lat: 39.620531,   lng: -74.42465,   radiusKm: 8,  category: 'state-forest' },
  { id: 'nj-belleplain',       name: 'Belleplain State Forest',             lat: 39.249061,   lng: -74.841192,  radiusKm: 8,  category: 'state-forest' },
  { id: 'nj-byrne-forest',     name: 'Brendan T. Byrne State Forest',       lat: 39.891017,   lng: -74.579619,  radiusKm: 10, category: 'state-forest' },
  { id: 'nj-bulls-island',     name: 'Bulls Island Recreation Area',        lat: 40.4097,     lng: -75.0372,    radiusKm: 2,  category: 'recreation-area' },
  { id: 'nj-cape-may-point',   name: 'Cape May Point State Park',           lat: 38.933153,   lng: -74.960925,  radiusKm: 3,  category: 'state-park' },
  { id: 'nj-cheesequake',      name: 'Cheesequake State Park',              lat: 40.4350,     lng: -74.27028,   radiusKm: 3,  category: 'state-park' },
  { id: 'nj-corsons-inlet',    name: "Corson's Inlet State Park",           lat: 39.217208,   lng: -74.646256,  radiusKm: 2,  category: 'state-park' },
  // Linear park (~70 km): one center+radius can't represent it, so sample
  // along both arms — main canal (Trenton→Kingston→New Brunswick) + the
  // feeder canal along the Delaware (Lambertville). Per-point radius 6 km.
  { id: 'nj-d-and-r-canal',    name: 'Delaware & Raritan Canal State Park', lat: 40.368686,   lng: -74.61615,   radiusKm: 6,  category: 'state-park',
    points: [[40.221, -74.756], [40.376, -74.612], [40.487, -74.456], [40.366, -74.946]] },
  { id: 'nj-double-trouble',   name: 'Double Trouble State Park',           lat: 39.897878,   lng: -74.221292,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-farny',            name: 'Farny State Park',                    lat: 40.96245,    lng: -74.458003,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-fort-mott',        name: 'Fort Mott State Park',                lat: 39.6031,     lng: -75.5525,    radiusKm: 2,  category: 'state-park' },
  { id: 'nj-hacklebarney',     name: 'Hacklebarney State Park',             lat: 40.7481,     lng: -74.7322,    radiusKm: 3,  category: 'state-park' },
  { id: 'nj-high-point',       name: 'High Point State Park',               lat: 41.29,       lng: -74.69,      radiusKm: 5,  category: 'state-park' },
  { id: 'nj-hopatcong',        name: 'Hopatcong State Park',                lat: 40.9144,     lng: -74.6653,    radiusKm: 3,  category: 'state-park' },
  { id: 'nj-island-beach',     name: 'Island Beach State Park',             lat: 39.905272,   lng: -74.081431,  radiusKm: 6,  category: 'state-park' },
  { id: 'nj-jenny-jump',       name: 'Jenny Jump State Forest',             lat: 40.92203,    lng: -74.92558,   radiusKm: 4,  category: 'state-forest' },
  { id: 'nj-kittatinny',       name: 'Kittatinny Valley State Park',        lat: 41.0164,     lng: -74.7439,    radiusKm: 4,  category: 'state-park' },
  { id: 'nj-liberty',          name: 'Liberty State Park',                  lat: 40.70399,    lng: -74.05375,   radiusKm: 3,  category: 'state-park' },
  { id: 'nj-long-pond',        name: 'Long Pond Ironworks State Park',      lat: 41.140986,   lng: -74.309228,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-monmouth-battle',  name: 'Monmouth Battlefield State Park',     lat: 40.256147,   lng: -74.320719,  radiusKm: 3,  category: 'state-park' },
  { id: 'nj-norvin-green',     name: 'Norvin Green State Forest',           lat: 41.068889,   lng: -74.325658,  radiusKm: 5,  category: 'state-forest' },
  { id: 'nj-parvin',           name: 'Parvin State Park',                   lat: 39.510853,   lng: -75.132642,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-penn-forest',      name: 'Penn State Forest',                   lat: 39.7346944,  lng: -74.4913389, radiusKm: 6,  category: 'state-forest' },
  { id: 'nj-pigeon-swamp',     name: 'Pigeon Swamp State Park',             lat: 40.3869,     lng: -74.4738,    radiusKm: 3,  category: 'state-park' },
  { id: 'nj-princeton-battle', name: 'Princeton Battlefield State Park',    lat: 40.330858,   lng: -74.676856,  radiusKm: 2,  category: 'state-park' },
  { id: 'nj-ramapo-mountain',  name: 'Ramapo Mountain State Forest',        lat: 41.032806,   lng: -74.251825,  radiusKm: 5,  category: 'state-forest' },
  { id: 'nj-rancocas',         name: 'Rancocas State Park',                 lat: 40.007536,   lng: -74.833219,  radiusKm: 3,  category: 'state-park' },
  { id: 'nj-ringwood',         name: 'Ringwood State Park',                 lat: 41.136256,   lng: -74.256108,  radiusKm: 5,  category: 'state-park' },
  { id: 'nj-round-valley',     name: 'Round Valley Recreation Area',        lat: 40.6139,     lng: -74.8227,    radiusKm: 5,  category: 'recreation-area' },
  { id: 'nj-spruce-run',       name: 'Spruce Run Recreation Area',          lat: 40.6628,     lng: -74.9389,    radiusKm: 4,  category: 'recreation-area' },
  { id: 'nj-stephens',         name: 'Stephens State Park',                 lat: 40.869183,   lng: -74.81,      radiusKm: 3,  category: 'state-park' },
  { id: 'nj-stokes-forest',    name: 'Stokes State Forest',                 lat: 41.184453,   lng: -74.797314,  radiusKm: 8,  category: 'state-forest' },
  { id: 'nj-stow-creek',       name: 'Stow Creek State Park',               lat: 39.4426,     lng: -75.4085,    radiusKm: 3,  category: 'state-park' },
  { id: 'nj-swartswood',       name: 'Swartswood State Park',               lat: 41.073631,   lng: -74.818783,  radiusKm: 4,  category: 'state-park' },
  { id: 'nj-tall-pines',       name: 'Tall Pines State Preserve',           lat: 39.778,      lng: -75.142,     radiusKm: 3,  category: 'state-preserve' },
  { id: 'nj-voorhees',         name: 'Voorhees State Park',                 lat: 40.695981,   lng: -74.887133,  radiusKm: 3,  category: 'state-park' },
  { id: 'nj-warren-grove',     name: 'Warren Grove Recreation Area',        lat: 39.7534139,  lng: -74.387194,  radiusKm: 4,  category: 'recreation-area' },
  { id: 'nj-washington-x',     name: 'Washington Crossing State Park',      lat: 40.3111,     lng: -74.8636,    radiusKm: 3,  category: 'state-park' },
  { id: 'nj-washington-rock',  name: 'Washington Rock State Park',          lat: 40.613236,   lng: -74.47325,   radiusKm: 2,  category: 'state-park' },
  { id: 'nj-wawayanda',        name: 'Wawayanda State Park',                lat: 41.1981119,  lng: -74.3977478, radiusKm: 8,  category: 'state-park' },
  // NJ's largest park (~122k acres). The single Batsto center sits in the
  // south, so sample the heart + Atsion (north) too. Per-point radius 8 km.
  { id: 'nj-wharton',          name: 'Wharton State Forest',                lat: 39.64389,    lng: -74.64678,   radiusKm: 8,  category: 'state-forest',
    points: [[39.64389, -74.64678], [39.741, -74.733], [39.700, -74.620]] },
  { id: 'nj-worthington',      name: 'Worthington State Forest',            lat: 40.9932,     lng: -75.0855,    radiusKm: 6,  category: 'state-forest' },
];

// iNaturalist place IDs — the park's curated boundary polygon. When present,
// the app queries iNat species by the ACTUAL park boundary (place_id) instead
// of a lat/lng circle, so non-bird species from neighbouring towns/water are
// excluded. Verified May 2026 by scripts/lookupInatPlaces.mjs: each id's place
// centroid was confirmed within ~8 km of the park's coordinate (Island Beach's
// larger offset is expected — it's a ~16 km barrier island; exact name match).
// The 20 parks without an entry have no iNat polygon and keep the radius path
// (the large/linear ones there use multi-point sampling).
export const INAT_PLACE_IDS = {
  'nj-hewitt': 162995, 'nj-allaire': 162914, 'nj-allamuchy': 162919,
  'nj-cape-may-point': 214672, 'nj-cheesequake': 162896, 'nj-corsons-inlet': 162936,
  'nj-double-trouble': 162934, 'nj-farny': 162915, 'nj-fort-mott': 162935,
  'nj-hacklebarney': 162943, 'nj-high-point': 163073, 'nj-island-beach': 162948,
  'nj-kittatinny': 162953, 'nj-liberty': 66812, 'nj-long-pond': 162836,
  'nj-parvin': 162949, 'nj-pigeon-swamp': 118304, 'nj-rancocas': 130952,
  'nj-ringwood': 162916, 'nj-round-valley': 139622, 'nj-spruce-run': 139525,
  'nj-stokes-forest': 162773, 'nj-swartswood': 162986, 'nj-tall-pines': 163451,
  'nj-voorhees': 139996, 'nj-washington-rock': 162984,
  // Delaware (verified May 2026, STATE=DE node scripts/lookupInatPlaces.mjs).
  // Brandywine excluded: its only iNat match is the small "Pollinator Garden"
  // sub-polygon, which would under-count the park → it uses the radius instead.
  'de-alapocas': 181333, 'de-auburn-valley': 169859, 'de-cape-henlopen': 222476,
  'de-killens-pond': 208396, 'de-lums-pond': 177713, 'de-trap-pond': 172845,
  'de-white-clay': 95508,
  // Connecticut (verified May 2026, STATE=CT node scripts/lookupInatPlaces.mjs;
  // Natchaug/Enders/Trout Brook re-pinned to the iNat centroid). 57/58 parks;
  // Great Pond SF has no iNat polygon → radius fallback.
  'ct-hammonasset': 54044, 'ct-sherwood-island': 56341, 'ct-silver-sands': 56345,
  'ct-bluff-point': 10040, 'ct-rocky-neck': 56320, 'ct-harkness': 56165,
  'ct-haley-farm': 56161, 'ct-farm-river': 56420, 'ct-sleeping-giant': 56349,
  'ct-talcott-mountain': 56372, 'ct-penwood': 56282, 'ct-west-rock-ridge': 56389,
  'ct-mount-tom': 56237, 'ct-mount-riga': 56236, 'ct-gillette-castle': 56151,
  'ct-selden-neck': 56335, 'ct-haddam-meadows': 56158, 'ct-devils-hopyard': 56110,
  'ct-kent-falls': 56194, 'ct-housatonic-meadows': 56180, 'ct-wadsworth-falls': 56384,
  'ct-southford-falls': 56363, 'ct-indian-well': 56185, 'ct-bigelow-hollow': 56063,
  'ct-mansfield-hollow': 56214, 'ct-burr-pond': 56086, 'ct-black-rock': 56069,
  'ct-squantz-pond': 56364, 'ct-lake-waramaug': 56199, 'ct-kettletown': 56195,
  'ct-hopeville-pond': 56178, 'ct-quaddick': 56302, 'ct-chatfield-hollow': 6722,
  'ct-day-pond': 56108, 'ct-macedonia-brook': 56212, 'ct-mashamoquet-brook': 56217,
  'ct-gay-city': 56148, 'ct-huntington': 56097, 'ct-putnam-memorial': 56298,
  'ct-osbornedale': 56267, 'ct-quinnipiac-river': 56309, 'ct-dinosaur': 56112,
  'ct-pachaug-sf': 56271, 'ct-cockaponset-sf': 56095, 'ct-mohawk-sf': 56229,
  'ct-meshomasic-sf': 56222, 'ct-shenipsit-sf': 56340, 'ct-tunxis-sf': 56382,
  'ct-mattatuck-sf': 56220, 'ct-naugatuck-sf': 56245, 'ct-salmon-river-sf': 56327,
  'ct-american-legion-sf': 56035, 'ct-campbell-falls': 56088, 'ct-seth-low-pierrepont': 56337,
  'ct-natchaug-sf': 56241, 'ct-enders-sf': 56128, 'ct-trout-brook-valley': 56432,
  // Rhode Island (verified May 2026, STATE=RI node scripts/lookupInatPlaces.mjs).
  // RI is sparsely represented in iNat's PLACES database — only these 5 units
  // have a polygon; the other 36 use the radius fallback (their iNat OBServations
  // are still dense, just queried by lat/lng circle rather than boundary).
  'ri-colt': 152757, 'ri-lincoln-woods': 194890, 'ri-nicholas-farm': 127993,
  'ri-buck-hill': 141335, 'ri-great-swamp': 215903,
  // Massachusetts (verified 2026, STATE=MA node scripts/lookupInatPlaces.mjs).
  // 17/62 units have an iNat polygon (MA, like RI, is patchy in iNat's PLACES db
  // despite dense observations); the rest use the radius fallback. Hopkinton SP
  // was excluded — its only nearby match is the adjacent *Whitehall* SP polygon.
  'ma-greylock': 51732, 'ma-savoy-mtn': 185525, 'ma-wachusett-mtn': 129257,
  'ma-bolton-flats-wma': 141166, 'ma-walden-pond': 130331, 'ma-callahan': 203905,
  'ma-blue-hills': 51261, 'ma-borderland': 159853, 'ma-myles-standish-sf': 125247,
  'ma-burrage-pond-wma': 141168, 'ma-halibut-point': 226458, 'ma-harold-parker-sf': 185502,
  'ma-nickerson': 217371, 'ma-correllus-sf': 189349, 'ma-horseneck-beach': 217873,
  'ma-frances-crane-wma': 141171, 'ma-mt-holyoke-range': 181127,
};

// Curated naturalist highlights for the flagship NJ parks — the "what makes
// this place special for wildlife" note national parks get. Only parks with a
// well-documented, verifiable wildlife story are included; the rest show none.
// Facts are established (hawk-migration sites, barrier-island ecology, Pine
// Barrens specialties, etc.) — nothing invented.
export const STATE_PARK_HIGHLIGHTS = {
  'nj-cape-may-point': "One of North America's premier birding sites. Each fall (Sept–Nov) the Cape May Hawkwatch tallies tens of thousands of migrating raptors, alongside monarch butterflies and waves of songbirds funneling down the peninsula.",
  'nj-island-beach': 'A ~10-mile undeveloped barrier island — one of the largest on the Atlantic coast. Ospreys nest spring through summer, and harbor seals haul out on the Barnegat Bay side through winter.',
  'nj-high-point': "Home to New Jersey's highest elevation (1,803 ft). The Kittatinny Ridge above the park is a classic fall hawk-migration flyway, and the cool highland forest holds breeding warblers in summer.",
  'nj-barnegat': "The inlet jetty is one of the East Coast's best winter birding spots — Harlequin Ducks, Purple Sandpipers, scoters, and Long-tailed Ducks gather here, with seals offshore.",
  'nj-liberty': 'An urban oasis on the Hudson: tidal salt marsh and the Caven Point shoreline draw herons, egrets, shorebirds, and wintering waterfowl — with peregrine falcons hunting the harbor against the Manhattan skyline.',
  'nj-wharton': "New Jersey's largest state forest (~122,000 acres) and the heart of the Pine Barrens — habitat for specialties like the Pine Barrens treefrog, amid tea-colored cedar streams and vast pitch-pine forest.",
  'nj-stokes-forest': 'Sunrise Mountain, on the Kittatinny Ridge, is a renowned fall hawk-watch. The high ridgeline and hemlock ravines support breeding warblers and other highland species.',
  'nj-worthington': 'In the Delaware Water Gap, the steep Kittatinny ridge (Mount Tammany, Appalachian Trail) channels migrating raptors each fall and shelters forest-interior breeding birds.',
  'nj-cheesequake': 'A rare transition zone where northern and southern habitats meet — saltmarsh, freshwater swamp, and pine-oak forest in one park make for unusually diverse birdlife.',
  'nj-belleplain': 'A southern pinelands forest famous among birders for breeding songbirds — Summer Tanager, Prothonotary and Hooded Warblers, and Acadian Flycatcher around Lake Nummy.',
  'nj-stow-creek': 'A Delaware Bayshore park centered on a long-active bald eagle nest, with a dedicated viewing platform. Tidal marsh and woods along Stow Creek also draw herons, ospreys, and wintering waterfowl.',
  // Delaware flagships (established, verifiable wildlife stories).
  'de-cape-henlopen': "Delaware's premier birding site, where the Cape Henlopen Hawk Watch tracks thousands of migrating raptors each fall. 'The Point' concentrates seabirds, shorebirds, and migrant songbirds, with harbor seals offshore in winter.",
  'de-seashore': 'A barrier island between Rehoboth Bay and the Atlantic. The Indian River Inlet draws gulls, terns, gannets, and wintering sea ducks; ospreys nest on the bay side and seals appear offshore in winter.',
  'de-trap-pond': 'Home to the northernmost natural stand of bald cypress in the United States. The cypress swamp shelters nesting Prothonotary Warblers, herons, owls, and a rich amphibian community.',
  'de-brandywine': 'A Piedmont park of old-growth Tulip Tree Woods (a National Natural Landmark) and meadows, with a fall hawk watch and diverse breeding forest birds along Brandywine Creek.',
  'de-white-clay': 'A large Piedmont preserve of forest, meadow, and trout streams straddling the Delaware–Pennsylvania line — strong breeding-bird diversity and a notable spring warbler migration.',
  // Connecticut flagships (established, verifiable wildlife stories).
  'ct-hammonasset': "Connecticut's largest shoreline park. Meigs Point is a premier birding spot — fall hawk and songbird migration funnels along the coast, with wintering sea ducks, shorebirds, and salt-marsh wildlife.",
  'ct-bluff-point': "Connecticut's largest undeveloped stretch of coast — a peninsula between Long Island Sound and the Poquonnock estuary famed among birders for the fall 'morning flight' of songbirds, plus wintering waterfowl and ospreys in summer.",
  'ct-sherwood-island': "Connecticut's oldest state park, on Long Island Sound. Its point and salt marsh draw migrating shorebirds and monarch butterflies in fall, herons and egrets through summer, and wintering waterfowl.",
  'ct-talcott-mountain': "The traprock cliffs at Heublein Tower, on the Metacomet Ridge, host a noted fall hawk-watch — thousands of Broad-winged Hawks and other raptors stream past each September.",
  'ct-sleeping-giant': 'A two-mile traprock ridge above the Quinnipiac valley. Its hemlock ravines and mixed hardwood forest hold breeding warblers and thrushes, with raptors passing along the ridge in fall.',
  'ct-pachaug-sf': "Connecticut's largest state forest (~24,000 acres). The Rhododendron Sanctuary's Atlantic white cedar swamp, extensive woodlands, and Beachdale Pond support breeding warblers, owls, and a rich amphibian community.",
  'ct-housatonic-meadows': 'A classic stretch of the Housatonic River framed by pine and hemlock — a renowned trout river where bald eagles winter and warblers breed along the wooded banks.',
  'ct-bigelow-hollow': "Northern-flavored woodland in the vast Nipmuck State Forest, set around Mashapaug Pond (Connecticut's largest natural lake) and Breakneck Pond — breeding forest songbirds and excellent amphibian habitat.",
  // Rhode Island flagships (established, verifiable wildlife stories).
  'ri-block-island': "One of the Northeast's premier migration stopovers — each fall huge numbers of migrant songbirds (and rarities) concentrate on 'the Block,' a vital refueling point on the Atlantic Flyway.",
  'ri-great-swamp': "Rhode Island's premier inland wildlife area — ~3,300 acres of swamp, marsh, and the shore of Worden Pond, with nesting ospreys, herons, waterfowl, and a rich amphibian and reptile community.",
  'ri-arcadia': "Rhode Island's largest protected area (~14,000 acres) — extensive woodland, the Wood and Falls rivers, and ponds supporting breeding forest birds, river otters, and a diverse herpetofauna.",
  'ri-beavertail': "Rhode Island's classic seawatch — the rocky point at the tip of Conanicut Island draws migrating seabirds, gannets, and sea ducks, with harbor seals on the rocks in winter.",
  'ri-colt': 'Open meadows along a Narragansett Bay shoreline in Bristol — ospreys nest over the bay, and the fields and hedgerows draw migrant songbirds, wading birds, and wintering waterfowl.',
  'ri-charlestown-breachway': 'The Charlestown salt ponds and barrier beach are a shorebird and waterfowl magnet — terns and oystercatchers nest near the breachway, with loons and sea ducks offshore in winter.',
  // Massachusetts flagships (established, verifiable wildlife stories).
  'ma-greylock': "Massachusetts' highest peak (3,491 ft) — its cool summit holds a boreal spruce-fir forest with northern breeding songbirds (thrushes and warblers), and the ridge channels migrating hawks each fall.",
  'ma-mt-tom': "A traprock ridge above the Connecticut River and one of the Northeast's great fall hawk-watches — thousands of Broad-winged Hawks and other raptors stream past each September.",
  'ma-wachusett-mtn': "Central Massachusetts' highest summit and a noted fall hawk-watch, with stands of old-growth forest on its slopes and waves of migrant songbirds in season.",
  'ma-blue-hills': 'The largest conservation land in Greater Boston (~7,000 acres) — its Great Blue Hill hosts a fall hawk-watch, and the varied forest, marsh, and rocky-ledge habitats support diverse breeding birds and woodland wildlife.',
  'ma-quabbin': "A vast protected wilderness around Massachusetts' largest reservoir — the site of the state's bald eagle restoration, with nesting Common Loons, wintering waterfowl, and roaming black bears, moose, and bobcats.",
  'ma-nickerson': "Cape Cod's largest state park — a glacial landscape of clear kettle ponds and pitch-pine woods, with ospreys overhead, breeding warblers, and wintering waterfowl on the ponds.",
  'ma-salisbury-beach': 'Where the Merrimack River meets the sea — dunes, salt marsh, and estuary on the premier North Shore draw migrating shorebirds and terns, with wintering sea ducks, gulls, and (in irruption years) Snowy Owls.',
  'ma-correllus-sf': 'The wild heart of Martha’s Vineyard — rare sandplain grassland and pitch-pine barrens supporting Northern Harriers, whip-poor-wills, and a globally rare community of moths and grassland wildlife.',
};

// Multi-state registry. Each new state ships its own data file (same shape)
// and is added here + to STATE_PARK_STATES in App.jsx + STATE_NAMES in
// scripts/prerenderParks.js; the selector, map, deep links, and prerender
// then pick it up automatically.
export const STATE_PARKS_BY_STATE = {
  NJ: STATE_PARKS_NJ,
  DE: STATE_PARKS_DE,
  CT: STATE_PARKS_CT,
  RI: STATE_PARKS_RI,
  MA: STATE_PARKS_MA,
};

// Resolve a state-park entry from a path like /state-park/nj/<id>.
export function findStatePark(stateCode, parkId) {
  const list = STATE_PARKS_BY_STATE[String(stateCode).toUpperCase()];
  if (!list) return null;
  return list.find(p => p.id === parkId) || null;
}
