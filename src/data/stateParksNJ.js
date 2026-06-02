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
 * Parks with no published coordinates (Capital, Stow Creek) are omitted.
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
};

// Multi-state registry. Each new state ships its own data file (same shape)
// and is added here + to STATE_PARK_STATES in App.jsx + STATE_NAMES in
// scripts/prerenderParks.js; the selector, map, deep links, and prerender
// then pick it up automatically. (Delaware is built + verified in
// stateParksDE.js but intentionally un-wired until NJ accuracy is locked.)
export const STATE_PARKS_BY_STATE = {
  NJ: STATE_PARKS_NJ,
};

// Resolve a state-park entry from a path like /state-park/nj/<id>.
export function findStatePark(stateCode, parkId) {
  const list = STATE_PARKS_BY_STATE[String(stateCode).toUpperCase()];
  if (!list) return null;
  return list.find(p => p.id === parkId) || null;
}
