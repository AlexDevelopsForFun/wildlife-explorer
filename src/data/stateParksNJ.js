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
import { STATE_PARKS_NH } from './stateParksNH.js';
import { STATE_PARKS_VT } from './stateParksVT.js';
import { STATE_PARKS_ME } from './stateParksME.js';
import { STATE_PARKS_NY } from './stateParksNY.js';
import { STATE_PARKS_PA } from './stateParksPA.js';
import { STATE_PARKS_MD } from './stateParksMD.js';
import { STATE_PARKS_VA } from './stateParksVA.js';
import { STATE_PARKS_WV } from './stateParksWV.js';
import { STATE_PARKS_NC } from './stateParksNC.js';
import { STATE_PARKS_SC } from './stateParksSC.js';
import { STATE_PARKS_GA } from './stateParksGA.js';
import { STATE_PARKS_TN } from './stateParksTN.js';
import { STATE_PARKS_KY } from './stateParksKY.js';
import { STATE_PARKS_OH } from './stateParksOH.js';
import { STATE_PARKS_MI } from './stateParksMI.js';
import { STATE_PARKS_IN } from './stateParksIN.js';
import { STATE_PARKS_IL } from './stateParksIL.js';
import { STATE_PARKS_WI } from './stateParksWI.js';
import { STATE_PARKS_MN } from './stateParksMN.js';
import { STATE_PARKS_FL } from './stateParksFL.js';
import { STATE_PARKS_AL } from './stateParksAL.js';
import { STATE_PARKS_MS } from './stateParksMS.js';
import { STATE_PARKS_LA } from './stateParksLA.js';
import { STATE_PARKS_AR } from './stateParksAR.js';
import { STATE_PARKS_IA } from './stateParksIA.js';
import { STATE_PARKS_MO } from './stateParksMO.js';
import { STATE_PARKS_ND } from './stateParksND.js';
import { STATE_PARKS_SD } from './stateParksSD.js';
import { STATE_PARKS_NE } from './stateParksNE.js';
import { STATE_PARKS_KS } from './stateParksKS.js';
import { STATE_PARKS_OK } from './stateParksOK.js';
import { STATE_PARKS_MT } from './stateParksMT.js';
import { STATE_PARKS_WY } from './stateParksWY.js';
import { STATE_PARKS_CO } from './stateParksCO.js';
import { STATE_PARKS_ID } from './stateParksID.js';
import { STATE_PARKS_UT } from './stateParksUT.js';
import { STATE_PARKS_NV } from './stateParksNV.js';
import { STATE_PARKS_AZ } from './stateParksAZ.js';
import { STATE_PARKS_NM } from './stateParksNM.js';
import { STATE_PARKS_CA } from './stateParksCA.js';
import { STATE_PARKS_OR } from './stateParksOR.js';
import { STATE_PARKS_WA } from './stateParksWA.js';
import { STATE_PARKS_TX } from './stateParksTX.js';
import { STATE_PARKS_AK } from './stateParksAK.js';
import { STATE_PARKS_HI } from './stateParksHI.js';

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
  // New Hampshire (verified 2026, STATE=NH node scripts/lookupInatPlaces.mjs +
  // variant-name pass). 7/45 units have an iNat polygon (NH is sparse in iNat's
  // PLACES db); rest use radius. Odiorne/Sunapee/Cardigan matched under shorter
  // names; Umbagog's only match is the federal NWR (excluded, kept state-only).
  'nh-bear-brook': 231917, 'nh-pawtuckaway': 232249, 'nh-white-lake': 6758,
  'nh-ahern': 229326, 'nh-odiorne-point': 120922, 'nh-mount-sunapee': 213353,
  'nh-cardigan': 141036,
  // Vermont (verified 2026, STATE=VT node scripts/lookupInatPlaces.mjs). VT is
  // richly covered in iNat's PLACES db — 39/52 units have a polygon. Mt Mansfield
  // SF accepted at its centroid (large multi-part forest); Victory SF matched
  // "Victory Bog Basin". The 13 misses (incl. Smugglers' Notch, Willoughby SF,
  // Dead Creek WMA) use the radius fallback.
  'vt-mount-philo': 122971, 'vt-button-bay': 122964, 'vt-kingsland-bay': 122970,
  'vt-dar': 123005, 'vt-sand-bar': 122996, 'vt-niquette-bay': 123001,
  'vt-grand-isle': 123012, 'vt-north-hero': 122967, 'vt-knight-point': 123003,
  'vt-burton-island': 122975, 'vt-alburg-dunes': 81705, 'vt-camels-hump': 148206,
  'vt-ascutney': 194334, 'vt-gifford-woods': 122976, 'vt-hazens-notch': 122969,
  'vt-elmore': 122968, 'vt-green-river-reservoir': 95545, 'vt-mollys-falls-pond': 122958,
  'vt-groton-sf': 123036, 'vt-maidstone': 123042, 'vt-brighton': 122983,
  'vt-crystal-lake': 122980, 'vt-lake-carmi': 122963, 'vt-sentinel-rock': 122960,
  'vt-jamaica': 193217, 'vt-townshend': 123041, 'vt-molly-stark': 123035,
  'vt-woodford': 123010, 'vt-fort-dummer': 123013, 'vt-emerald-lake': 122977,
  'vt-lake-shaftsbury': 122989, 'vt-lake-st-catherine': 122978, 'vt-bomoseen': 122985,
  'vt-branbury': 122981, 'vt-silver-lake': 123008, 'vt-quechee': 122974,
  'vt-wilgus': 122994, 'vt-mount-mansfield-sf': 123037, 'vt-victory-sf': 8672,
  // Maine (verified 2026, STATE=ME node scripts/lookupInatPlaces.mjs + variant
  // pass). 6/42 units have an iNat polygon (ME is sparse in iNat's PLACES db);
  // rest use radius. Scarborough Marsh matched the short "Scarborough Marsh".
  'me-baxter': 70218, 'me-birch-point': 216646, 'me-camden-hills': 120558,
  'me-cutler-coast': 121996, 'me-roque-bluffs': 160967, 'me-scarborough-marsh': 67518,
  // New York (verified 2026, STATE=NY node scripts/lookupInatPlaces.mjs + variant
  // pass). 36/68 units have an iNat polygon; rest use radius. Connetquot, Slide
  // Mountain, Braddock Bay, Thacher, Bashakill, and Five Ponds matched under
  // variant names. Taconic (a 13 km regional grouping) and Storm King (only the
  // Art Center) were excluded → radius fallback.
  'ny-jones-beach': 121117, 'ny-lido-beach-wma': 119429, 'ny-harriman': 124741,
  'ny-hudson-highlands': 153467, 'ny-minnewaska': 192775, 'ny-sterling-forest': 153106,
  'ny-fahnestock': 185471, 'ny-rockefeller': 134752, 'ny-nyack-beach': 128149,
  'ny-lake-taghkanic': 204809, 'ny-moreau-lake': 96630, 'ny-grafton-lakes': 170269,
  'ny-moose-river-plains': 167756, 'ny-higley-flow': 192648, 'ny-letchworth': 152362,
  'ny-watkins-glen': 146133, 'ny-taughannock': 121729, 'ny-buttermilk-falls': 232900,
  'ny-green-lakes': 130925, 'ny-fillmore-glen': 190441, 'ny-clark-reservation': 125672,
  'ny-chenango-valley': 130836, 'ny-allegany': 61332, 'ny-niagara-falls': 186696,
  'ny-fort-niagara': 145079, 'ny-evangola': 139691, 'ny-hamlin-beach': 202395,
  'ny-buffalo-harbor': 139869, 'ny-golden-hill': 184353, 'ny-beaver-island': 139871,
  'ny-connetquot': 160258, 'ny-slide-mountain': 167744, 'ny-braddock-bay-wma': 172803,
  'ny-thacher': 179667, 'ny-basha-kill-wma': 167947, 'ny-five-ponds': 168115,
  // Pennsylvania (verified 2026, STATE=PA node scripts/lookupInatPlaces.mjs).
  // 62/67 units have an iNat polygon — PA's iNat PLACES coverage is the best of
  // the big states. Tioga/Moshannon/Elk SF accepted at large-forest centroids.
  // Pymatuning's only match is the OHIO side (rejected → radius covers the PA
  // reservoir); Ole Bull, George Childs, Bald Eagle SF, Buzzard Swamp → radius.
  'pa-presque-isle': 51826, 'pa-erie-bluffs': 93338, 'pa-maurice-goddard': 93395,
  'pa-moraine': 211728, 'pa-mcconnells-mill': 79167, 'pa-raccoon-creek': 64240,
  'pa-oil-creek': 70225, 'pa-cook-forest': 129938, 'pa-clear-creek': 93304,
  'pa-kinzua-bridge': 93371, 'pa-elk-state-park': 93335, 'pa-sinnemahoning': 93491,
  'pa-cherry-springs': 93303, 'pa-kettle-creek': 93360, 'pa-leonard-harrison': 93375,
  'pa-colton-point': 93308, 'pa-bald-eagle': 93277, 'pa-black-moshannon': 93288,
  'pa-parker-dam': 93768, 'pa-prince-gallitzin': 93527, 'pa-ricketts-glen': 93512,
  'pa-worlds-end': 93315, 'pa-hills-creek': 93358, 'pa-salt-springs': 93500,
  'pa-tuscarora': 93481, 'pa-promised-land': 93526, 'pa-tobyhanna': 93483,
  'pa-big-pocono': 93283, 'pa-hickory-run': 93355, 'pa-lehigh-gorge': 93385,
  'pa-beltzville': 93278, 'pa-nescopeck': 93788, 'pa-nockamixon': 93784,
  'pa-marsh-creek': 93396, 'pa-french-creek': 76433, 'pa-ridley-creek': 93511,
  'pa-tyler': 93479, 'pa-delaware-canal': 134478, 'pa-middle-creek-wma': 132198,
  'pa-gifford-pinchot': 93347, 'pa-codorus': 93305, 'pa-samuel-lewis': 93498,
  'pa-susquehannock': 93485, 'pa-shikellamy': 79710, 'pa-little-buffalo': 93388,
  'pa-swatara': 93484, 'pa-caledonia': 93295, 'pa-pine-grove-furnace': 93777,
  'pa-ohiopyle': 93269, 'pa-laurel-hill': 93376, 'pa-linn-run': 93387,
  'pa-keystone': 93362, 'pa-yellow-creek': 93314, 'pa-blue-knob': 93290,
  'pa-trough-creek': 93482, 'pa-canoe-creek': 93299, 'pa-michaux-sf': 152164,
  'pa-loyalsock-sf': 152197, 'pa-bear-meadows-na': 172338, 'pa-tioga-sf': 152187,
  'pa-moshannon-sf': 152198, 'pa-elk-sf': 152188,
  // Batch 1 — MD/VA/WV (verified 2026, scripts/lookupInatPlaces.mjs variant pass).
  'md-assateague': 133637, 'md-pocomoke-river': 140256, 'md-deal-island-wma': 118660,
  'md-tuckahoe': 188008, 'md-martinak': 188009, 'md-sandy-point': 77272,
  'md-north-point': 79489, 'md-point-lookout': 118580, 'md-st-marys-river': 142654,
  'md-smallwood': 156943, 'md-merkle-wma': 121342, 'md-patapsco-valley': 72652,
  'md-patuxent-river': 228924, 'md-mckee-beshers-wma': 128728, 'md-cunningham-falls': 111194,
  'md-gambrill': 228920, 'md-rocky-gap': 79721, 'md-green-ridge-sf': 79411,
  'md-deep-creek-lake': 152021, 'md-swallow-falls': 152016,
  'va-first-landing': 160047, 'va-false-cape': 225463, 'va-kiptopeke': 126301,
  'va-machicomoco': 174482, 'va-york-river': 161168, 'va-chippokes': 161648,
  'va-belle-isle': 153562, 'va-westmoreland': 9189, 'va-caledon': 138012,
  'va-leesylvania': 143631, 'va-mason-neck': 143634, 'va-widewater': 141561,
  'va-pocahontas': 52890, 'va-powhatan': 160915, 'va-james-river': 161195,
  'va-bear-creek-lake': 50618, 'va-holliday-lake': 125738, 'va-twin-lakes': 125739,
  'va-lake-anna': 144724, 'va-mayo-river': 210008, 'va-sky-meadows': 121998,
  'va-shenandoah-river': 124934, 'va-douthat': 201262, 'va-fairy-stone': 204917,
  'va-claytor-lake': 231118, 'va-new-river-trail': 201998, 'va-hungry-mother': 181373,
  'va-natural-tunnel': 160052, 'va-wilderness-road': 159919,
  'wv-blackwater-falls': 160709, 'wv-coopers-rock-sf': 109878, 'wv-audra': 159824,
  'wv-kumbrabow-sf': 109864, 'wv-holly-river': 70227, 'wv-watoga': 70228,
  'wv-seneca-sf': 109868, 'wv-calvin-price-sf': 109870, 'wv-greenbrier-sf': 109856,
  'wv-babcock': 159825, 'wv-bluestone': 95114, 'wv-chief-logan': 160349,
  'wv-panther-sf': 168081, 'wv-cabwaylingo-sf': 109869, 'wv-kanawha-sf': 109795,
  'wv-north-bend': 159831,
  // Batch 2 — NC/SC/GA/TN/KY (verified 2026). NC 38/38; KY sparse (resort-park
  // naming) → mostly radius. Rejected: SC Lake Warren (14km), KY "Ballard County".
  'nc-jockeys-ridge': 147527, 'nc-fort-macon': 163030, 'nc-fort-fisher': 143834,
  'nc-carolina-beach': 121672, 'nc-hammocks-beach': 163035, 'nc-goose-creek': 164940,
  'nc-pettigrew': 164960, 'nc-merchants-millpond': 164797, 'nc-dismal-swamp': 150847,
  'nc-lake-waccamaw': 165006, 'nc-lumber-river': 165008, 'nc-jones-lake': 164997,
  'nc-singletary-lake': 165075, 'nc-bladen-lakes-sf': 111547, 'nc-carvers-creek': 164993,
  'nc-raven-rock': 165042, 'nc-eno-river': 153197, 'nc-umstead': 124988,
  'nc-haw-river': 164996, 'nc-medoc-mountain': 163036, 'nc-occoneechee-mtn': 148937,
  'nc-mayo-river': 164796, 'nc-lake-norman': 129396, 'nc-crowders-mountain': 181941,
  'nc-hanging-rock': 164995, 'nc-pilot-mountain': 81860, 'nc-stone-mountain': 165077,
  'nc-new-river': 160091, 'nc-mount-jefferson': 143075, 'nc-elk-knob': 143074,
  'nc-grandfather-mountain': 113319, 'nc-mount-mitchell': 111546, 'nc-lake-james': 165000,
  'nc-south-mountains': 129435, 'nc-chimney-rock': 143930, 'nc-gorges': 143926,
  'nc-dupont-sf': 180382, 'nc-pisgah-view': 189437,
  'sc-huntington-beach': 109417, 'sc-hunting-island': 225098, 'sc-edisto-beach': 175847,
  'sc-myrtle-beach': 175824, 'sc-colleton': 175983, 'sc-givhans-ferry': 175877,
  'sc-old-santee-canal': 153087, 'sc-santee': 147168, 'sc-poinsett': 185244,
  'sc-lee': 175898, 'sc-sesquicentennial': 121719, 'sc-aiken': 185193,
  'sc-cheraw': 147171, 'sc-little-pee-dee': 147172, 'sc-lynches-river': 159764,
  'sc-harbison-sf': 185416, 'sc-manchester-sf': 165412, 'sc-sand-hills-sf': 165406,
  'sc-kings-mountain': 147163, 'sc-andrew-jackson': 185167, 'sc-landsford-canal': 175798,
  'sc-croft': 185242, 'sc-paris-mountain': 147199, 'sc-caesars-head': 175828,
  'sc-jones-gap': 175846, 'sc-keowee-toxaway': 175897, 'sc-devils-fork': 109506,
  'sc-oconee': 129746, 'sc-lake-hartwell': 147200, 'sc-calhoun-falls': 147183,
  'sc-baker-creek': 147184, 'sc-hickory-knob': 147160,
  'ga-cloudland-canyon': 157541, 'ga-fort-mountain': 194727, 'ga-amicalola-falls': 194083,
  'ga-vogel': 194504, 'ga-unicoi': 194231, 'ga-black-rock-mountain': 194058,
  'ga-tallulah-gorge': 194059, 'ga-moccasin-creek': 194798, 'ga-tugaloo': 189430,
  'ga-victoria-bryant': 194505, 'ga-red-top-mountain': 189355, 'ga-sweetwater-creek': 194057,
  'ga-panola-mountain': 189354, 'ga-arabia-mountain': 147736, 'ga-fort-yargo': 189356,
  'ga-hard-labor-creek': 189388, 'ga-don-carter': 194913, 'ga-chattahoochee-bend': 189386,
  'ga-high-falls': 194151, 'ga-indian-springs': 194180, 'ga-watson-mill': 194502,
  'ga-mistletoe': 189431, 'ga-providence-canyon': 194796, 'ga-magnolia-springs': 194200,
  'ga-george-l-smith': 194124, 'ga-little-ocmulgee': 194199, 'ga-general-coffee': 194122,
  'ga-reed-bingham': 194201, 'ga-kolomoki-mounds': 194178, 'ga-seminole': 194736,
  'ga-dixon-memorial-sf': 181202, 'ga-skidaway-island': 194233, 'ga-crooked-river': 194121,
  'ga-stephen-foster': 201572, 'ga-altamaha-wma': 187775,
  'tn-reelfoot-lake': 129911, 'tn-meeman-shelby': 129897, 'tn-fort-pillow': 129925,
  'tn-chickasaw': 129876, 'tn-big-hill-pond': 129871, 'tn-natchez-trace': 129900,
  'tn-pickwick-landing': 129906, 'tn-paris-landing': 129904, 'tn-radnor-lake': 112397,
  'tn-long-hunter': 129896, 'tn-cedars-of-lebanon': 129875, 'tn-montgomery-bell': 129898,
  'tn-harpeth-river': 129889, 'tn-bledsoe-creek': 129872, 'tn-tims-ford': 129921,
  'tn-david-crockett': 129882, 'tn-natchez-trace-sf': 228327, 'tn-fall-creek-falls': 129886,
  'tn-cumberland-mountain': 129879, 'tn-frozen-head': 129888, 'tn-cummins-falls': 129880,
  'tn-burgess-falls': 129874, 'tn-pickett': 120096, 'tn-norris-dam': 129902,
  'tn-big-ridge': 129923, 'tn-roan-mountain': 129461, 'tn-warriors-path': 129922,
  'tn-panther-creek': 129924, 'tn-harrison-bay': 81518, 'tn-booker-t-washington': 129873,
  'tn-red-clay': 129910, 'tn-south-cumberland': 129917,
  'ky-john-james-audubon': 166323, 'ky-big-bone-lick': 143397, 'ky-blue-licks': 202923,
  'ky-cumberland-falls': 209669, 'ky-dale-hollow': 132139, 'ky-jenny-wiley': 228648,
  'ky-kingdom-come': 202791,
  // Batch 3 — Midwest/Great Lakes (verified 2026). IL sparse in iNat PLACES.
  // Rejected: OH "Delaware County", IL "Rock Cut CBC" + "Trail of Tears MO",
  // MN St. Croix park→forest mismatch.
  'oh-maumee-bay': 138098, 'oh-east-harbor': 160314, 'oh-kelleys-island': 160315,
  'oh-middle-bass-island': 184797, 'oh-punderson': 159759, 'oh-nelson-kennedy-ledges': 195652,
  'oh-west-branch': 119970, 'oh-pymatuning': 222609, 'oh-mosquito-lake': 230967,
  'oh-alum-creek': 160665, 'oh-deer-creek': 176359, 'oh-indian-lake': 227203,
  'oh-caesar-creek': 137545, 'oh-east-fork': 159277, 'oh-john-bryan': 167357,
  'oh-cowan-lake': 137546, 'oh-burr-oak': 220394, 'oh-strouds-run': 123835,
  'oh-scioto-trail': 160868, 'oh-forked-run': 227381, 'oh-salt-fork': 158152,
  'oh-mohican': 159125, 'oh-dillon': 171172, 'oh-shawnee': 159746, 'oh-mohican-sf': 159125,
  'mi-porcupine-mountains': 147606, 'mi-tahquamenon-falls': 158574, 'mi-fort-wilkins': 160612,
  'mi-mclain': 168887, 'mi-craig-lake': 159054, 'mi-van-riper': 160609,
  'mi-lake-gogebic': 158569, 'mi-muskallonge-lake': 161778, 'mi-indian-lake': 161781,
  'mi-palms-book': 161779, 'mi-fayette': 161782, 'mi-wilderness': 159051,
  'mi-mackinac-island': 160819, 'mi-hartwick-pines': 72802, 'mi-cheboygan': 128613,
  'mi-leelanau': 161785, 'mi-fishermans-island': 159632, 'mi-ludington': 162377,
  'mi-muskegon': 168888, 'mi-warren-dunes': 160596, 'mi-tawas-point': 119803,
  'mi-port-crescent': 159061, 'mi-bay-city': 117245, 'mi-negwegon': 161788,
  'mi-sterling': 163241, 'mi-algonac': 186235, 'mi-waterloo': 161791,
  'mi-seven-lakes': 171708, 'mi-allegan-sf': 159072,
  'in-indiana-dunes': 159481, 'in-pokagon': 225371, 'in-potato-creek': 158772,
  'in-prophetstown': 173408, 'in-ouabache': 158905, 'in-summit-lake': 160770,
  'in-turkey-run': 130761, 'in-shades': 130762, 'in-mccormicks-creek': 202674,
  'in-fort-harrison': 120954, 'in-mounds': 81476, 'in-brown-county': 160776,
  'in-spring-mill': 173545, 'in-clifty-falls': 219147, 'in-versailles': 117057,
  'in-charlestown': 160781, 'in-falls-of-the-ohio': 127890, 'in-obannon-woods': 160491,
  'in-harmonie': 66919, 'in-whitewater-memorial': 159445, 'in-yellowwood-sf': 160777,
  'in-clark-sf': 158700, 'in-harrison-crawford-sf': 158689, 'in-morgan-monroe-sf': 160775,
  'in-jackson-washington-sf': 160488,
  'il-illinois-beach': 163871, 'il-volo-bog': 161681, 'il-apple-river-canyon': 214417,
  'il-starved-rock': 129021, 'il-matthiessen': 128910, 'il-buffalo-rock': 128922,
  'il-kankakee-river': 125740, 'il-goose-lake-prairie': 168647, 'il-sand-ridge-sf': 128629,
  'il-jubilee-college': 141740, 'il-fox-ridge': 142928, 'il-giant-city': 170464,
  'il-ferne-clyffe': 207880, 'il-beall-woods': 122831,
  'wi-brule-river-sf': 115060, 'wi-flambeau-river-sf': 115172, 'wi-governor-knowles-sf': 115046,
  'wi-copper-falls': 136170, 'wi-pattison': 122694, 'wi-amnicon-falls': 82250,
  'wi-big-bay': 82251, 'wi-rib-mountain': 115679, 'wi-council-grounds': 115315,
  'wi-peninsula': 115552, 'wi-newport': 115489, 'wi-whitefish-dunes': 94054,
  'wi-potawatomi': 122693, 'wi-rock-island': 115693, 'wi-point-beach-sf': 115496,
  'wi-high-cliff': 115182, 'wi-devils-lake': 49561, 'wi-mirror-lake': 115400,
  'wi-governor-dodge': 115587, 'wi-blue-mound': 144934, 'wi-wildcat-mountain': 115417,
  'wi-roche-a-cri': 82253, 'wi-buckhorn': 115070, 'wi-mill-bluff': 115392,
  'wi-wyalusing': 115942, 'wi-perrot': 115044, 'wi-nelson-dewey': 136183,
  'wi-horicon-marsh': 115978, 'wi-mead': 115381, 'wi-kettle-moraine': 116081,
  'mn-gooseberry-falls': 94052, 'mn-split-rock-lighthouse': 158883, 'mn-tettegouche': 113517,
  'mn-cascade-river': 72797, 'mn-bear-head-lake': 72796, 'mn-jay-cooke': 127581,
  'mn-banning': 173181, 'mn-itasca': 117396, 'mn-lake-bemidji': 171515,
  'mn-mille-lacs-kathio': 72808, 'mn-buffalo-river': 171663, 'mn-lac-qui-parle': 147837,
  'mn-afton': 160392, 'mn-william-obrien': 117767, 'mn-wild-river': 186735,
  'mn-interstate': 111409, 'mn-fort-snelling': 109409, 'mn-nerstrand-big-woods': 186430,
  'mn-myre-big-island': 168926, 'mn-beaver-creek-valley': 173535, 'mn-frontenac': 185877,
  'mn-minneopa': 169501, 'mn-beltrami-island-sf': 171664, 'mn-st-croix-sf': 171186,
  'mn-carlos-avery-wma': 158804, 'mn-lac-qui-parle-wma': 160375,
  // Batch 4 — Gulf South (verified 2026). FL rich (47/52); AL/MS/LA/AR sparse in
  // iNat PLACES → mostly radius (county-grade birds still cover them). Rejected:
  // FL "[rectangle]" boxes, MS counties, AR federal Buffalo National River.
  'fl-blue-spring': 124138, 'fl-silver-springs': 150311, 'fl-rainbow-springs': 150527,
  'fl-ichetucknee-springs': 149787, 'fl-manatee-springs': 150087, 'fl-homosassa-springs': 151044,
  'fl-wekiwa-springs': 150967, 'fl-crystal-river': 185072, 'fl-myakka-river': 143685,
  'fl-oscar-scherer': 152837, 'fl-collier-seminole': 188893, 'fl-lovers-key': 184713,
  'fl-delnor-wiggins': 117762, 'fl-highlands-hammock': 119787, 'fl-lake-kissimmee': 151901,
  'fl-honeymoon-island': 151753, 'fl-caladesi-island': 151805, 'fl-hillsborough-river': 151718,
  'fl-egmont-key': 152350, 'fl-paynes-prairie': 142723, 'fl-lake-louisa': 151324,
  'fl-hontoon-island': 150588, 'fl-sebastian-inlet': 151954, 'fl-st-sebastian-river': 151982,
  'fl-jonathan-dickinson': 131291, 'fl-macarthur-beach': 144551, 'fl-bill-baggs': 129494,
  'fl-anastasia': 149864, 'fl-fort-clinch': 149646, 'fl-little-talbot': 149702,
  'fl-tomoka': 150298, 'fl-faver-dykes': 149953, 'fl-john-pennekamp': 187537,
  'fl-bahia-honda': 119102, 'fl-long-key': 192507, 'fl-curry-hammock': 185772,
  'fl-st-andrews': 148742, 'fl-st-joseph-peninsula': 148814, 'fl-st-george-island': 149360,
  'fl-topsail-hill': 148631, 'fl-big-lagoon': 129992, 'fl-florida-caverns': 148817,
  'fl-torreya': 187184, 'fl-suwannee-river': 149756, 'fl-three-rivers': 148984,
  'fl-myakka-sf': 143300, 'fl-wakulla-sf': 227687,
  'al-gulf': 147491, 'al-meaher': 178196, 'al-cheaha': 161743, 'al-desoto': 122942,
  'al-monte-sano': 135971, 'al-oak-mountain': 144440, 'al-chewacla': 112928,
  'al-joe-wheeler': 163844, 'al-cahaba-river-wma': 119238,
  'ms-pascagoula-river-wma': 185692, 'ms-lefleurs-bluff': 91665, 'ms-percy-quin': 182397,
  'la-grand-isle': 124391, 'la-palmetto-island': 154516, 'la-sam-houston-jones': 118190,
  'la-lake-fausse-pointe': 72805, 'la-chicot': 119927, 'la-hodges-gardens': 120136,
  'la-fontainebleau': 134664, 'la-maurepas-swamp-wma': 53220,
  'ar-petit-jean': 205393, 'ar-mount-magazine': 169800, 'ar-cossatot-river': 150418,
  'ar-millwood': 177472, 'ar-logoly': 122698, 'ar-lake-chicot': 215834, 'ar-big-lake-wma': 124443,
  // Iowa
  'ia-backbone': 158291, 'ia-wapsipinicon': 160786, 'ia-george-wyth': 122520, 'ia-springbrook': 162059,
  'ia-rock-creek': 159607, 'ia-lake-wapello': 159539, 'ia-black-hawk': 158443, 'ia-stone': 157622,
  'ia-loess-hills-sf': 160204, 'ia-shimek-sf': 162190, 'ia-stephens-sf': 162036,
  // Missouri
  'mo-ha-ha-tonka': 160245, 'mo-bennett-spring': 56621, 'mo-roaring-river': 159085, 'mo-meramec': 70222,
  'mo-onondaga-cave': 171936, 'mo-johnsons-shut-ins': 158079, 'mo-taum-sauk': 171183, 'mo-sam-baker': 158075,
  'mo-hawn': 157758, 'mo-lake-of-the-ozarks': 157763, 'mo-pomme-de-terre': 160613, 'mo-stockton': 159670,
  'mo-cuivre-river': 157781, 'mo-mark-twain': 158416, 'mo-thousand-hills': 158007, 'mo-pershing': 157773,
  'mo-prairie': 160834, 'mo-knob-noster': 160243, 'mo-august-busch-ca': 126473, 'mo-columbia-bottom-ca': 157785,
  'mo-grand-pass-ca': 159090,
  // North Dakota
  'nd-cross-ranch': 159390, 'nd-homen-sf': 159369, 'nd-icelandic': 112608, 'nd-beaver-lake': 159388,
  // South Dakota
  'sd-custer': 158608, 'sd-bear-butte': 119197, 'sd-angostura': 158131, 'sd-roy-lake': 160333,
  'sd-sica-hollow': 210780, 'sd-hartford-beach': 158123, 'sd-oakwood-lakes': 182702, 'sd-newton-hills': 141861,
  'sd-palisades': 222906, 'sd-good-earth': 96185, 'sd-union-grove': 159794, 'sd-fisher-grove': 158026,
  // Nebraska
  'ne-fort-robinson': 168874, 'ne-chadron': 129508, 'ne-wildcat-hills': 128590, 'ne-box-butte': 162456,
  'ne-niobrara': 110628, 'ne-smith-falls': 157742, 'ne-calamus': 158330, 'ne-ponca': 162451,
  'ne-indian-cave': 160642, 'ne-lewis-and-clark': 158488, 'ne-platte-river': 49770, 'ne-mahoney': 148759,
  'ne-branched-oak': 162614, 'ne-two-rivers': 148762, 'ne-lake-mcconaughy': 158071, 'ne-buffalo-bill-ranch': 157736,
  'ne-johnson-lake': 157738,
  // Kansas
  'ks-kaw-river': 130469, 'ks-el-dorado': 168594, 'ks-crawford': 205776,
  // Oklahoma
  'ok-beavers-bend': 121267, 'ok-black-mesa': 142431, 'ok-gloss-mountain': 184917, 'ok-lake-thunderbird': 152385,
  'ok-sequoyah': 118668, 'ok-lake-texoma': 114014,
  // Montana
  'mt-wild-horse-island': 177292, 'mt-lone-pine': 139027, 'mt-lewis-clark-caverns': 233645, 'mt-tower-rock': 161845,
  'mt-makoshika': 160742, 'mt-medicine-rocks': 160740, 'mt-pirogue-island': 160722,
  // Wyoming
  'wy-sinks-canyon': 149794, 'wy-guernsey': 187545,
  // Colorado
  'co-barr-lake': 92062, 'co-roxborough': 92020, 'co-castlewood-canyon': 91959, 'co-golden-gate-canyon': 91976,
  'co-eldorado-canyon': 233963, 'co-mueller': 91999, 'co-cheyenne-mountain': 120633, 'co-chatfield': 91955,
  'co-state-forest': 92024, 'co-steamboat-lake': 90191, 'co-sylvan-lake': 92034, 'co-lory': 153717,
  'co-jackson-lake': 91979, 'co-john-martin': 92043, 'co-north-sterling': 92059, 'co-ridgway': 92014,
  'co-rifle-falls': 92015, 'co-crawford': 91967, 'co-highline-lake': 91978, 'co-navajo': 92001,
  'co-lake-pueblo': 92007, 'co-lathrop': 91997, 'co-trinidad-lake': 92035,
  // Idaho
  'id-priest-lake': 219062, 'id-farragut': 218230, 'id-heyburn': 121578, 'id-round-lake': 211359,
  'id-dworshak': 177838, 'id-hells-gate': 186918, 'id-winchester-lake': 189253, 'id-ponderosa': 182087,
  'id-lake-cascade': 227947, 'id-bruneau-dunes': 128310, 'id-eagle-island': 166581, 'id-lucky-peak': 173769,
  'id-three-island': 195910, 'id-thousand-springs': 173743, 'id-massacre-rocks': 128624, 'id-lake-walcott': 182443,
  'id-castle-rocks': 128197, 'id-bear-lake': 218233, 'id-harriman': 119781, 'id-henrys-lake': 218985,
  // Utah
  'ut-antelope-island': 190045, 'ut-willard-bay': 171577, 'ut-hyrum': 171356, 'ut-wasatch-mountain': 171929,
  'ut-jordanelle': 171927, 'ut-deer-creek': 171930, 'ut-utah-lake': 179339, 'ut-rockport': 171926,
  'ut-snow-canyon': 171579, 'ut-sand-hollow': 171582, 'ut-coral-pink-dunes': 174274, 'ut-goblin-valley': 171458,
  'ut-dead-horse-point': 66616, 'ut-green-river': 182141, 'ut-scofield': 171931,
  // Nevada
  'nv-valley-of-fire': 74200, 'nv-spring-mountain-ranch': 119064, 'nv-floyd-lamb': 194648, 'nv-big-bend-colorado': 119050,
  'nv-cathedral-gorge': 119051, 'nv-cave-lake': 119052, 'nv-kershaw-ryan': 119057, 'nv-echo-canyon': 119054,
  'nv-spring-valley': 119065, 'nv-berlin-ichthyosaur': 119049, 'nv-lake-tahoe': 119059, 'nv-washoe-lake': 119070,
  'nv-dayton': 119053, 'nv-walker-lake': 119068, 'nv-south-fork': 119063, 'nv-rye-patch': 119062,
  // Arizona
  'az-catalina': 167318, 'az-patagonia-lake': 147280, 'az-kartchner-caverns': 132180, 'az-picacho-peak': 130445,
  'az-lost-dutchman': 144152, 'az-boyce-thompson': 182260, 'az-dead-horse-ranch': 129856, 'az-tonto-natural-bridge': 192755,
  'az-lake-havasu': 219564, 'az-oracle': 228074,
  // New Mexico
  'nm-caballo-lake': 171591, 'nm-percha-dam': 171590, 'nm-leasburg-dam': 171594, 'nm-bottomless-lakes': 173333,
  'nm-navajo-lake': 173490, 'nm-mesilla-valley-bosque': 177360,
  // California
  'ca-jedediah-smith': 5839, 'ca-prairie-creek': 5860, 'ca-humboldt-redwoods': 5837, 'ca-sue-meg': 5856,
  'ca-mackerricher': 5845, 'ca-salt-point': 3140, 'ca-sonoma-coast': 202762, 'ca-mount-tamalpais': 67043,
  'ca-mount-diablo': 5586, 'ca-big-basin': 3176, 'ca-ano-nuevo': 111885, 'ca-angel-island': 5195,
  'ca-tomales-bay': 3536, 'ca-julia-pfeiffer-burns': 5327, 'ca-pfeiffer-big-sur': 5734, 'ca-garrapata': 5134,
  'ca-montana-de-oro': 5555, 'ca-morro-bay': 211953, 'ca-anza-borrego': 186405, 'ca-emerald-bay': 5827,
  'ca-donner': 5306, 'ca-torrey-pines': 216456, 'ca-crystal-cove': 5692, 'ca-cuyamaca-rancho': 118768,
  'ca-malibu-creek': 4006, 'ca-salton-sea': 3819, 'ca-caswell': 5439,
  // Oregon
  'or-fort-stevens': 94576, 'or-ecola': 118813, 'or-oswald-west': 94570, 'or-cape-lookout': 120751,
  'or-carl-washburne': 120753, 'or-shore-acres': 120817, 'or-cape-arago': 120866, 'or-cape-blanco': 120749,
  'or-bullards-beach': 120748, 'or-harris-beach': 120799, 'or-ainsworth': 133283, 'or-silver-falls': 61001,
  'or-tryon-creek': 120463, 'or-smith-rock': 137713, 'or-cove-palisades': 135865, 'or-tumalo': 133690,
  'or-wallowa-lake': 132056, 'or-cottonwood-canyon': 132978, 'or-catherine-creek': 211218, 'or-valley-of-the-rogue': 136139,
  'or-collier-memorial': 136414,
  // Washington
  'wa-cape-disappointment': 129953, 'wa-fort-worden': 124979, 'wa-fort-flagler': 158220, 'wa-twin-harbors': 214309,
  'wa-grayland-beach': 214310, 'wa-deception-pass': 123421, 'wa-moran': 72845, 'wa-sun-lakes-dry-falls': 231977,
  'wa-mount-spokane': 184376, 'wa-fields-spring': 186576,
  // Texas
  'tx-palo-duro-canyon': 91238, 'tx-caprock-canyons': 91239, 'tx-copper-breaks': 141313, 'tx-possum-kingdom': 141354,
  'tx-dinosaur-valley': 77874, 'tx-caddo-lake': 142109, 'tx-martin-dies': 118412, 'tx-village-creek': 76874,
  'tx-huntsville': 92764, 'tx-enchanted-rock': 141509, 'tx-pedernales-falls': 138745, 'tx-lost-maples': 138752,
  'tx-garner': 63524, 'tx-guadalupe-river': 57513, 'tx-colorado-bend': 92948, 'tx-inks-lake': 95824,
  'tx-south-llano-river': 154050, 'tx-government-canyon': 95823, 'tx-palmetto': 119815, 'tx-goose-island': 141277,
  'tx-mustang-island': 122262, 'tx-galveston-island': 131962, 'tx-sea-rim': 142108, 'tx-brazos-bend': 122244,
  'tx-estero-llano-grande': 75980, 'tx-falcon': 141375, 'tx-choke-canyon': 141405, 'tx-davis-mountains': 90978,
  'tx-balmorhea': 112953, 'tx-franklin-mountains': 120120, 'tx-big-bend-ranch': 140438,
  // Alaska
  'ak-kachemak-bay': 71078,
  // Hawaii
  'hi-iao-valley': 117677, 'hi-waianapanapa': 122279,
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
  // New Hampshire flagships (established, verifiable wildlife stories).
  'nh-franconia-notch': 'A dramatic glacial pass between the Franconia and Kinsman ranges — peregrine falcons nest on Cannon Cliff, and the surrounding boreal forest holds Canada Jays, crossbills, and other northern specialties.',
  'nh-mount-washington': "The Northeast's highest peak (6,288 ft), capped by rare alpine tundra — home to nesting American Pipits, the endemic White Mountain fritillary butterfly, and some of the world's most extreme weather.",
  'nh-monadnock': "One of the world's most-climbed mountains — its bare rocky summit draws migrating hawks in fall, while the wooded slopes hold breeding warblers and thrushes.",
  'nh-miller': 'Pack Monadnock hosts New Hampshire’s premier fall hawk-watch — thousands of Broad-winged Hawks and other raptors stream past the summit each September.',
  'nh-pawtuckaway': "A marsh, ledges, and a beaver-flooded basin make this one of southern New Hampshire's richest wildlife spots — nesting Great Blue Herons and ospreys, abundant turtles and amphibians, and a famous boulder field.",
  'nh-odiorne-point': "New Hampshire's largest undeveloped stretch of seacoast — rocky shore, salt marsh, and thickets make it the state's premier coastal birding site, with migrant songbirds, seabirds, and wintering sea ducks.",
  'nh-umbagog-lake': 'A vast wild lake on the Maine border — nesting Common Loons and bald eagles, with moose and boreal birds in the surrounding spruce-fir wetlands.',
  'nh-lake-francis': 'In the remote Great North Woods near the Canadian border — the Connecticut Lakes country is prime habitat for moose, Canada Jays, Spruce Grouse, and Boreal Chickadees in the spruce-fir forest.',
  // Vermont flagships (established, verifiable wildlife stories).
  'vt-dead-creek': "Vermont's premier waterfowl area — each fall thousands of Snow Geese stage on the Dead Creek impoundments in the Champlain Valley, alongside ducks, raptors, and grassland birds.",
  'vt-mount-philo': "Vermont's oldest state park — its cliff-top perch over the Champlain Valley is a classic fall hawk-watch as Broad-winged Hawks and other raptors ride the ridge.",
  'vt-mount-mansfield-sf': "Vermont's highest peak (4,393 ft), capped by a fragile ribbon of arctic-alpine tundra — Bicknell's Thrush breeds in the summit krummholz, a globally rare songbird.",
  'vt-camels-hump': "Vermont's most iconic undeveloped peak — its tiny alpine summit shelters rare arctic plants and breeding Bicknell's Thrush, with Peregrine Falcons on the cliffs below.",
  'vt-willoughby-sf': 'The cliffs of Mount Pisgah and Mount Hor plunge into glacial Lake Willoughby — a fjord-like Northeast Kingdom gem with nesting Peregrine Falcons and rare arctic-alpine plants on the ledges.',
  'vt-maidstone': 'One of Vermont’s most remote lakes, ringed by spruce-fir forest in the Northeast Kingdom — nesting Common Loons, with a real chance at moose and boreal birds.',
  'vt-lake-carmi': 'Home to one of the largest peat bogs in the Northeast — a State Natural Area where breeding loons, bitterns, and bog specialties thrive around Vermont’s fourth-largest lake.',
  'vt-green-river-reservoir': 'A wild, motor-restricted reservoir with one of Vermont’s highest concentrations of nesting Common Loons, ringed by undeveloped forest.',
  // Maine flagships (established, verifiable wildlife stories).
  'me-baxter': "Maine's wilderness crown — Mount Katahdin, the Appalachian Trail's northern terminus, rises above 200,000+ acres of forest, bog, and pond that shelter moose, black bears, and breeding boreal birds.",
  'me-quoddy-head': 'The easternmost point in the United States — bold cliffs and cold, churning waters host nesting seabirds, passing whales, and a rare coastal peat bog.',
  'me-scarborough-marsh': "Maine's largest salt marsh — over 3,000 acres of tidal creeks and grasses teeming with herons, egrets, glossy ibis, saltmarsh sparrows, and migrating shorebirds.",
  'me-cutler-coast': 'The Bold Coast — dramatic headland cliffs over the Bay of Fundy, with nesting seabirds, migrating raptors, and whales offshore in summer.',
  'me-bradbury-mountain': "A modest summit with an outsized reputation — its spring hawk-watch is one of the Northeast's best inland counts, tallying thousands of migrating raptors each April.",
  'me-cobscook-bay': 'Some of the largest tides in the Lower 48 flush this bay twice daily — a bald eagle stronghold with abundant wintering waterfowl and shorebirds on the mudflats.',
  'me-camden-hills': 'Mount Battie and the Camden Hills rise straight from Penobscot Bay — a fall hawk-migration ridge with sweeping views over island-studded waters.',
  'me-bigelow-preserve': "The Bigelow Range — a 36,000-acre wild preserve of alpine summits above Flagstaff Lake, with breeding Bicknell's Thrush on the heights and moose in the lowlands.",
  // New York flagships (established, verifiable wildlife stories).
  'ny-niagara-falls': 'One of the world’s great waterfalls — and a globally significant winter gull spectacle, where many thousands of gulls of up to ~19 species gather on the Niagara River gorge.',
  'ny-letchworth': "The 'Grand Canyon of the East' — the Genesee River carves a 550-foot gorge where Bald Eagles nest and Turkey Vultures and hawks ride the cliff updrafts.",
  'ny-montauk-point': "Long Island's eastern tip — a premier winter seawatch for loons, sea ducks, gannets, and alcids, with harbor and gray seals hauled out on the rocks.",
  'ny-high-peaks': "The wild heart of the Adirondacks — New York's highest summits hold rare alpine tundra and Bicknell's Thrush amid vast spruce-fir forest roamed by moose and black bears.",
  'ny-minnewaska': 'The Shawangunk Ridge — white quartzite cliffs and dwarf pitch-pine barrens with nesting Peregrine Falcons, a globally rare ridgetop ecosystem, and clear sky lakes.',
  'ny-braddock-bay-wma': "One of the East's great spring hawk flights — Braddock Bay funnels tens of thousands of migrating raptors along the Lake Ontario shore each spring.",
  'ny-bear-mountain': 'A Hudson Highlands landmark where fall hawk-watchers tally thousands of raptors over the river, amid rugged oak forest along the Appalachian Trail.',
  'ny-allegany': "New York's largest state park (~65,000 acres) — a vast Allegheny Plateau forest of beech, maple, and hemlock that shelters black bears, bobcats, and breeding warblers.",
  'ny-basha-kill-wma': 'The largest freshwater wetland in southeastern New York — a birding magnet for herons, bitterns, ospreys, Bald Eagles, and migrating waterfowl.',
  // Pennsylvania flagships (established, verifiable wildlife stories).
  'pa-presque-isle': 'A sandy peninsula arcing into Lake Erie and one of the Northeast’s premier migration traps — over 320 bird species recorded, with waterfowl, shorebirds, and waves of warblers funneling through Gull Point.',
  'pa-middle-creek-wma': 'Famous for its late-winter spectacle — tens of thousands of Snow Geese and Tundra Swans stage on the lake each February–March, with nesting Bald Eagles and grassland birds.',
  'pa-ricketts-glen': 'A National Natural Landmark of 22 named waterfalls tumbling through a gorge of old-growth hemlock, pine, and oak — habitat for breeding warblers, thrushes, and salamanders.',
  'pa-ohiopyle': 'The Youghiogheny River gorge cuts through 20,000+ acres of rich Appalachian forest — spring wildflowers, breeding warblers, and one of the East’s great whitewater canyons.',
  'pa-cook-forest': 'The "Forest Cathedral" — a National Natural Landmark stand of old-growth white pine and hemlock, some over 300 years old, sheltering breeding forest birds and black bears.',
  'pa-sinnemahoning': "In the heart of Pennsylvania's elk range — elk and white-tailed deer browse the valley, Bald Eagles nest, and the wetlands draw herons and waterfowl.",
  'pa-pymatuning': "Pennsylvania's largest lake — where Bald Eagles first returned to nest in the state, now a stronghold for eagles, ospreys, and tens of thousands of migrating waterfowl.",
  'pa-leonard-harrison': 'The east rim of the Pine Creek Gorge — the "Grand Canyon of Pennsylvania," ~800 feet deep, where Bald Eagles, ospreys, and ravens ride the updrafts.',
  'pa-moraine': 'Built around Lake Arthur, a noted osprey-reintroduction success — now prime habitat for nesting ospreys, migrating waterfowl, and grassland birds on the reclaimed glacial landscape.',
  // Maryland flagships.
  'md-assateague': 'A wild barrier island shared with Virginia, famous for its free-roaming ponies — with nesting piping plovers and oystercatchers, migrating shorebirds, and Delmarva fox squirrels in the loblolly pines.',
  'md-deal-island-wma': "A vast tidal marsh on the Chesapeake's Eastern Shore — one of Maryland's premier spots for wintering waterfowl, marsh sparrows, rails, and hunting Northern Harriers.",
  'md-calvert-cliffs': 'Miocene fossil cliffs on the Chesapeake — shark teeth wash onto the beach below bluffs patrolled by Bald Eagles and ospreys.',
  'md-swallow-falls': "Maryland's highest waterfall amid a rare old-growth hemlock and white-pine grove on the Youghiogheny — a cool relict northern forest.",
  // Virginia flagships.
  'va-kiptopeke': 'At the tip of the Delmarva Peninsula — a legendary fall migration funnel whose hawk-watch and songbird banding station tally huge numbers of raptors and migrants staging before the Chesapeake Bay crossing.',
  'va-grayson-highlands': "Virginia's high country above 5,000 ft — open balds with free-roaming ponies and northern breeding birds amid the spruce-fir near Mount Rogers.",
  'va-mason-neck': "A Potomac peninsula protected for the Bald Eagle — one of the Chesapeake's first eagle refuges, with a large great blue heron rookery and wintering waterfowl.",
  'va-false-cape': 'A remote barrier spit between Back Bay and the Atlantic — wild undeveloped beach and maritime forest with feral horses and huge concentrations of wintering waterfowl.',
  // West Virginia flagships.
  'wv-canaan-valley': 'The highest large valley east of the Mississippi — a boreal wetland of bogs and spruce that feels like Canada, with breeding northern birds, beavers, and black bears.',
  'wv-blackwater-falls': 'The amber Blackwater River plunges through a rugged hemlock-and-rhododendron gorge in the Allegheny highlands — cool-forest songbirds and a famed highland landscape.',
  'wv-cranberry-wma': 'Gateway to the Cranberry Glades — a boreal bog relict of sphagnum, carnivorous plants, and northern birds high in the Allegheny Mountains.',
  // North Carolina flagships.
  'nc-mount-mitchell': 'The highest peak east of the Mississippi (6,684 ft) — a sky-island of Fraser fir and red spruce with breeding Northern Saw-whet Owls, Red Crossbills, and other boreal birds at their southern limit.',
  'nc-jockeys-ridge': 'The tallest active sand dunes on the Atlantic coast — a shifting Outer Banks landscape where fall hawks and migrants pass over maritime thicket and sound-side marsh.',
  'nc-merchants-millpond': "Where the coastal plain meets the swamp — a blackwater millpond of bald cypress and tupelo draped in Spanish moss, full of wading birds, turtles, and the occasional bear.",
  // South Carolina flagships.
  'sc-huntington-beach': "Widely rated South Carolina's best birding — a barrier-island park of beach, salt marsh, and freshwater lagoon teeming with wading birds, alligators, painted buntings, and wintering waterfowl.",
  'sc-caesars-head': 'A Blue Ridge escarpment overlook and a major fall hawk-watch, where thousands of Broad-winged Hawks kettle past the cliffs above the Jocassee Gorges.',
  // Georgia flagships.
  'ga-stephen-foster': 'The gateway to the Okefenokee Swamp — a vast blackwater wilderness of cypress prairies and gator holes, home to sandhill cranes, wood storks, and wading birds.',
  'ga-providence-canyon': "Georgia's \"Little Grand Canyon\" — vivid eroded gullies and rare plumleaf azalea, with woodland birds along the rim and floor.",
  // Tennessee flagships.
  'tn-reelfoot-lake': 'A cypress-studded lake born of the 1811–12 earthquakes — one of the inland South’s premier spots for wintering Bald Eagles, herons, and huge concentrations of waterfowl.',
  'tn-roan-mountain': "Famed for its grassy balds and Catawba rhododendron, the Roan highlands hold spruce-fir forest and breeding northern songbirds along the Appalachian crest.",
  // Kentucky flagships.
  'ky-cumberland-falls': 'The "Niagara of the South" — a 68-foot falls on the Cumberland River that casts a rare moonbow, set in a rugged forested gorge with breeding warblers and nesting Black Vultures.',
  'ky-john-james-audubon': 'Where John James Audubon studied and painted American birds — Ohio River woodlands that remain a migration corridor, with a museum holding original Audubon works.',
  'ky-big-bone-lick': 'The "birthplace of American paleontology," where Ice Age megafauna died at salt licks — today a live bison herd grazes beside the marshes and savanna.',
  // Ohio flagships.
  'oh-crane-creek': 'On the Lake Erie marshes beside Magee Marsh — the heart of the "Warbler Capital of the World," where May migration concentrates dazzling numbers of songbirds at the lakeshore.',
  'oh-maumee-bay': 'Western Lake Erie marsh and meadow at the gateway to the world-famous Magee Marsh warbler migration — herons, bald eagles, shorebirds, and spring songbird waves.',
  'oh-hocking-hills': 'A landscape of hemlock gorges, recess caves, and waterfalls cut into Blackhand sandstone — cool-microclimate forest with breeding warblers and nesting Black Vultures.',
  // Michigan flagships.
  'mi-porcupine-mountains': 'One of the largest tracts of old-growth northern hardwood in the U.S. — virgin hemlock and maple above Lake Superior, home to black bears, wolves, and breeding boreal birds.',
  'mi-tawas-point': 'A sandy hook into Lake Huron known as the "Cape May of the Midwest" — a spring migrant trap where warblers, shorebirds, and waterbirds pile up on the point.',
  'mi-tahquamenon-falls': 'One of the largest waterfalls east of the Mississippi, amber with cedar tannins — surrounded by vast boreal forest with moose, black bears, and northern birds.',
  // Indiana flagships.
  'in-indiana-dunes': 'Towering Lake Michigan dunes backed by oak savanna, bog, and marsh — one of the most biodiverse parks in the country and a key migration stopover.',
  'in-brown-county': "Indiana's largest state park — a rolling expanse of forested hills and ridgetop vistas with abundant deer, wild turkey, and breeding woodland birds.",
  // Illinois flagships.
  'il-starved-rock': 'Sandstone canyons and waterfalls above the Illinois River — a winter gathering spot for Bald Eagles below the dam, with breeding warblers in the cool box canyons.',
  'il-cache-river': 'Among the northernmost bald-cypress–tupelo swamps in North America — a Ramsar wetland of ancient trees, herons, and a rich amphibian and reptile community.',
  // Wisconsin flagships.
  'wi-horicon-marsh': 'The largest freshwater cattail marsh in the U.S. — a spectacle of staging Canada Geese and migrating cranes, herons, and waterfowl each spring and fall.',
  'wi-devils-lake': "Wisconsin's most-visited park — a spring-fed lake walled by 500-foot Baraboo quartzite bluffs, with turkey vultures and breeding forest birds on the talus and clifftops.",
  // Minnesota flagships.
  'mn-itasca': "Minnesota's oldest state park, where the Mississippi River begins — old-growth red and white pine sheltering loons, eagles, and a famed northern-forest birdlife.",
  'mn-blue-mounds': 'A Sioux quartzite prairie outcrop on the southwest plains — home to a state bison herd, prairie wildflowers, and grassland birds.',
  'mn-gooseberry-falls': 'The gateway to Lake Superior\'s North Shore — tumbling falls in birch-and-spruce forest, with peregrines on the cliffs and boreal birds inland.',
  // Florida flagships.
  'fl-myakka-river': 'One of Florida\'s oldest and largest parks — wet prairie, oak hammock, and the Myakka River teeming with alligators, wading birds, and roseate spoonbills.',
  'fl-wakulla-springs': 'One of the world\'s largest and deepest freshwater springs — a jungle river of manatees, alligators, anhingas, and limpkins, cruised by tour boats since the 1930s.',
  'fl-paynes-prairie': 'A vast savanna basin where wild horses and a bison herd roam — sandhill cranes winter by the thousands, with alligators and 270+ bird species.',
  'fl-john-pennekamp': 'The first undersea park in the U.S. — living coral reef, seagrass, and mangrove sheltering sea turtles, reef fish, and wading birds in the upper Keys.',
  'fl-st-joseph-peninsula': 'A slender Gulf barrier spit famed for its fall raptor migration — thousands of hawks and falcons funnel down the point past pristine dunes.',
  // Alabama flagships.
  'al-gulf': "Two miles of white-sand Gulf shore backed by dunes, marsh, and freshwater lakes — a migration landfall for songbirds and a haven for shorebirds and alligators.",
  'al-cheaha': "Alabama's highest point atop the Talladega range — quartzite outcrops and oak-pine forest with breeding warblers and fall hawk movements.",
  'al-lake-guntersville': 'A sprawling Tennessee River reservoir park and one of the Southeast\'s premier wintering grounds for Bald Eagles, with waterfowl and herons.',
  // Mississippi flagships.
  'ms-leroy-percy': 'A cypress-and-Spanish-moss park in the heart of the Delta, built around warm artesian springs — alligators, wood ducks, and abundant wading birds.',
  'ms-tishomingo': "In Mississippi's Appalachian-foothill corner — moss-draped sandstone bluffs and Bear Creek, an Ozark-like outpost of ferns and breeding songbirds.",
  // Louisiana flagships.
  'la-grand-isle': "Louisiana's only inhabited barrier island and a legendary migration landfall — trans-Gulf songbirds, terns, and shorebirds pile onto the beach and oak cheniers.",
  'la-atchafalaya-delta-wma': 'The growing delta where the Atchafalaya River meets the Gulf — a building wilderness of marsh and mudflat alive with wading birds, ducks, and alligators.',
  // Arkansas flagships.
  'ar-mount-magazine': "Arkansas's highest peak (2,753 ft) — bluff-top vistas, black bears, and rare butterflies on a sky-island of the Ozarks-Ouachitas.",
  'ar-dagmar-wma': 'A primeval bald-cypress and tupelo swamp on the Cache River — Big Woods wilderness of staggering waterfowl numbers, woodpeckers, and herons.',
  'ar-buffalo-river': "Along America's first National River — bluff-lined Ozark wilderness with elk in the valleys, black bears, and breeding warblers.",
  // Iowa flagships.
  'ia-pikes-peak': 'High bluffs above the confluence of the Mississippi and Wisconsin rivers — hardwood forest and a fall flyway where eagles and migrating hawks ride the valley.',
  'ia-loess-hills-sf': 'A rare landform of wind-piled loess ridges found almost nowhere else on Earth — prairie remnants with badgers, bobcats, and grassland birds.',
  // Missouri flagships.
  'mo-ha-ha-tonka': 'Castle ruins above a turquoise spring and karst sinkholes on the Niangua arm of Lake of the Ozarks — savanna glades alive with collared lizards and warblers.',
  'mo-johnsons-shut-ins': 'The East Fork of the Black River churns through billion-year-old igneous shut-ins in the St. Francois Mountains — rugged glades, black bears, and clear-water fish.',
  'mo-prairie': "Missouri's largest remaining tallgrass prairie — a sea of grass where bison and elk roam and greater prairie-chickens still boom in spring.",
  // North Dakota flagships.
  'nd-cross-ranch': 'One of the last free-flowing stretches of the Missouri River, bordered by bottomland cottonwood gallery forest and an adjacent bison preserve on native prairie.',
  'nd-little-missouri': 'A maze of rugged badlands coulees above the Little Missouri River — wild, trail-only backcountry roamed by mule deer, golden eagles, and prairie rattlesnakes.',
  // South Dakota flagships.
  'sd-custer': 'A Black Hills icon — granite spires and ponderosa forest where a famous free-roaming bison herd shares the hills with elk, pronghorn, bighorn, and begging burros.',
  'sd-bear-butte': 'A sacred laccolith rising abruptly from the plains — a sky-island of grassland and woods drawing migrating raptors and a small bison herd at its base.',
  // Nebraska flagships.
  'ne-fort-robinson': 'Sprawling Pine Ridge buttes and grassland in the northwest panhandle — bison and bighorn sheep herds, prairie dogs, and one of the West\'s great frontier landscapes.',
  'ne-smith-falls': "Home to Nebraska's tallest waterfall, tucked in the spring-fed canyon of the Niobrara — a biological crossroads where six ecosystems and their wildlife meet.",
  // Kansas flagships.
  'ks-cheyenne-bottoms': 'The largest interior marsh in the United States — a Western Hemisphere shorebird reserve where millions of sandpipers, plovers, and waterfowl stage each migration.',
  'ks-little-jerusalem': "Kansas's largest exposure of Niobrara chalk — 100-foot badland spires sheltering cliff-nesting birds, swift fox, and the rare ferruginous hawk.",
  // Oklahoma flagships.
  'ok-black-mesa': "Oklahoma's highest point in the far panhandle — a mesa-and-shortgrass meeting of Rocky Mountain and plains species, from pronghorn to piñon-juniper birds.",
  'ok-beavers-bend': 'Deep in the Ouachita pine-hardwood forest along the Mountain Fork River — clear trout water, white-tailed deer, and breeding warblers under towering pines.',
  'ok-great-salt-plains': 'A glittering expanse of salt flats and a shallow lake on the Central Flyway — selenite crystals below and clouds of shorebirds, gulls, and migrating waterfowl above.',
  // Montana flagships.
  'mt-wild-horse-island': 'A roadless island in Flathead Lake reached only by boat — bighorn sheep, mule deer, wild horses, and bald eagles on a Palouse-prairie remnant.',
  'mt-makoshika': "Montana's largest state park — eroded badlands of pine-dotted buttes that have yielded Tyrannosaurus and Triceratops fossils, with prairie falcons and golden eagles overhead.",
  // Wyoming flagships.
  'wy-hot-springs': "Home to one of the world's largest mineral hot springs and a free-roaming bison herd, where the Bighorn River cuts terraces of travertine.",
  'wy-sinks-canyon': 'A Wind River Mountains canyon where the Popo Agie River vanishes into a cave (the Sinks) and rises again downstream (the Rise) — bighorn sheep and nesting raptors on the cliffs.',
  // Colorado flagships.
  'co-state-forest': "The self-styled \"Moose Capital of Colorado\" — some 600 moose roam spruce-fir forest and willow flats below the Never Summer Mountains.",
  'co-barr-lake': 'A prairie reservoir ringed by cottonwoods where bald eagles nest — one of the Front Range\'s premier birding spots, with grebes, pelicans, and wintering raptors.',
  // Idaho flagships.
  'id-bruneau-dunes': 'Holds the tallest single-structure sand dune in North America (~470 ft) beside spring-fed desert lakes — kangaroo rats, raptors, and a dark-sky observatory.',
  'id-harriman': 'A former cattle ranch turned wildlife refuge on the Henrys Fork — wintering trumpeter swans, elk, moose, and sandhill cranes in the Greater Yellowstone ecosystem.',
  // Utah flagships.
  'ut-antelope-island': "The Great Salt Lake's largest island — a free-roaming bison herd, pronghorn, and bighorn, ringed by brine flats that feed millions of phalaropes, grebes, and shorebirds.",
  'ut-dead-horse-point': 'A 2,000-foot mesa-top overlook above a gooseneck of the Colorado River in canyon country — desert bighorn below and a dark-sky park above.',
  // Nevada flagships.
  'nv-valley-of-fire': "Nevada's oldest state park — flaming-red Aztec sandstone and ancient petroglyphs, home to desert bighorn sheep, chuckwallas, and kit foxes.",
  'nv-cathedral-gorge': 'A narrow valley of soft bentonite clay eroded into cathedral-like spires and slot canyons — a desert maze for wrens, raptors, and lizards.',
  // Arizona flagships.
  'az-patagonia-lake': 'A spring-and-creek-fed lake in the Sky Island country — premier southeast Arizona birding for elegant trogon, vermilion flycatcher, and rare Mexican strays.',
  'az-catalina': 'Saguaro-forest foothills of the Santa Catalina Mountains north of Tucson — nearly 5,000 saguaros, canyon streams, and Gila monsters, with rich desert and riparian birding.',
  // New Mexico flagships.
  'nm-bottomless-lakes': "New Mexico's first state park — a chain of deep karst sinkhole lakes along the Pecos bluffs, drawing wintering waterfowl to the Chihuahuan desert.",
  'nm-percha-dam': 'A small cottonwood bosque below a Rio Grande diversion dam — one of the Southwest\'s legendary migration birding hotspots for flycatchers, warblers, and vagrants.',
  // California flagships.
  'ca-ano-nuevo': 'Site of the largest mainland breeding colony of northern elephant seals — thousands haul out to battle and breed, alongside sea lions and shorebirds.',
  'ca-point-lobos': '"The greatest meeting of land and water in the world" — sea otters, harbor seals, and migrating gray whales below Monterey cypress headlands.',
  'ca-anza-borrego': "California's largest state park — 600,000 acres of Colorado Desert with bighorn sheep, roadrunners, spring wildflower blooms, and dark skies.",
  // Oregon flagships.
  'or-ecola': 'A Cannon Beach headland above Haystack Rock — tufted puffins and common murres nest on the sea stacks while gray whales pass offshore.',
  'or-smith-rock': 'Sheer welded-tuff walls above the Crooked River — golden eagles and prairie falcons nest the cliffs at the birthplace of American sport climbing.',
  // Washington flagships.
  'wa-deception-pass': "Washington's most-visited park, straddling churning tidal narrows — bald eagles, harbor seals, and orcas patrol the straits below old-growth bluffs.",
  'wa-lime-kiln-point': 'Known as "Whale Watch Park" — the best shore-based spot in the country to see resident orcas, with minke whales and porpoises offshore.',
  // Texas flagships.
  'tx-caprock-canyons': 'Red-rock canyons on the Llano Estacado escarpment — home to the official Texas State Bison Herd, which roams the park freely, plus prairie dogs and golden eagles.',
  'tx-brazos-bend': 'A bottomland-and-marsh refuge near Houston famous for its American alligators and 300+ bird species — herons, spoonbills, and wintering waterfowl.',
  // Alaska flagships.
  'ak-chugach': "Among the largest state parks in the U.S. — half a million acres of mountains on Anchorage's doorstep with Dall sheep, moose, bears, and beluga whales in Turnagain Arm.",
  'ak-kachemak-bay': "Alaska's first state park — glaciers, spruce forest, and a rich marine bay of sea otters, puffins, and black bears reached only by boat or plane.",
  // Hawaii flagships.
  'hi-kokee': "High native rainforest above Waimea Canyon — among the best places to see Kauaʻi's endemic honeycreepers (ʻiʻiwi, ʻapapane) and the nēnē goose.",
  'hi-na-pali-coast': 'Towering fluted sea cliffs on Kauaʻi\'s wild north shore — nesting seabirds, spinner dolphins, and Hawaiian monk seals along a roadless coast.',
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
  NH: STATE_PARKS_NH,
  VT: STATE_PARKS_VT,
  ME: STATE_PARKS_ME,
  NY: STATE_PARKS_NY,
  PA: STATE_PARKS_PA,
  MD: STATE_PARKS_MD,
  VA: STATE_PARKS_VA,
  WV: STATE_PARKS_WV,
  NC: STATE_PARKS_NC,
  SC: STATE_PARKS_SC,
  GA: STATE_PARKS_GA,
  TN: STATE_PARKS_TN,
  KY: STATE_PARKS_KY,
  OH: STATE_PARKS_OH,
  MI: STATE_PARKS_MI,
  IN: STATE_PARKS_IN,
  IL: STATE_PARKS_IL,
  WI: STATE_PARKS_WI,
  MN: STATE_PARKS_MN,
  FL: STATE_PARKS_FL,
  AL: STATE_PARKS_AL,
  MS: STATE_PARKS_MS,
  LA: STATE_PARKS_LA,
  AR: STATE_PARKS_AR,
  IA: STATE_PARKS_IA,
  MO: STATE_PARKS_MO,
  ND: STATE_PARKS_ND,
  SD: STATE_PARKS_SD,
  NE: STATE_PARKS_NE,
  KS: STATE_PARKS_KS,
  OK: STATE_PARKS_OK,
  MT: STATE_PARKS_MT,
  WY: STATE_PARKS_WY,
  CO: STATE_PARKS_CO,
  ID: STATE_PARKS_ID,
  UT: STATE_PARKS_UT,
  NV: STATE_PARKS_NV,
  AZ: STATE_PARKS_AZ,
  NM: STATE_PARKS_NM,
  CA: STATE_PARKS_CA,
  OR: STATE_PARKS_OR,
  WA: STATE_PARKS_WA,
  TX: STATE_PARKS_TX,
  AK: STATE_PARKS_AK,
  HI: STATE_PARKS_HI,
};

// Resolve a state-park entry from a path like /state-park/nj/<id>.
export function findStatePark(stateCode, parkId) {
  const list = STATE_PARKS_BY_STATE[String(stateCode).toUpperCase()];
  if (!list) return null;
  return list.find(p => p.id === parkId) || null;
}
