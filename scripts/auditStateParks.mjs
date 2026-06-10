// One-off audit of the 50-state park registry. Checks the invariants that
// catch real data bugs: duplicate ids, mis-filed parks, coordinate errors
// (park outside its own state box — the Oracle/Patrick's-Point class of bug,
// esp. in sparse-iNat states with no distance cross-check), bad categories,
// dup coordinates, and orphaned iNat/highlight keys.
import { STATE_PARKS_BY_STATE, INAT_PLACE_IDS, STATE_PARK_HIGHLIGHTS } from '../src/data/stateParksNJ.js';

// Padded state bounding boxes [latMin, latMax, lngMin, lngMax] — a park outside
// its box is almost certainly a coordinate error.
const BOX = {
  AL:[30.1,35.1,-88.6,-84.8], AK:[51.0,71.6,-179.9,-129.9], AZ:[31.2,37.1,-114.9,-108.9],
  AR:[33.0,36.6,-94.7,-89.6], CA:[32.4,42.1,-124.5,-114.0], CO:[36.9,41.1,-109.1,-101.9],
  CT:[40.9,42.1,-73.8,-71.7], DE:[38.4,39.9,-75.8,-75.0], FL:[24.4,31.1,-87.7,-79.9],
  GA:[30.3,35.1,-85.7,-80.8], HI:[18.8,22.3,-160.3,-154.7], ID:[41.9,49.1,-117.3,-110.9],
  IL:[36.9,42.6,-91.6,-87.4], IN:[37.7,41.8,-88.1,-84.7], IA:[40.3,43.6,-96.7,-90.1],
  KS:[36.9,40.1,-102.1,-94.5], KY:[36.4,39.2,-89.6,-81.9], LA:[28.9,33.1,-94.1,-88.8],
  ME:[43.0,47.5,-71.1,-66.9], MD:[37.8,39.8,-79.5,-75.0], MA:[41.2,42.9,-73.6,-69.9],
  MI:[41.6,48.3,-90.5,-82.3], MN:[43.4,49.5,-97.3,-89.4], MS:[30.1,35.1,-91.7,-88.0],
  MO:[35.9,40.7,-95.9,-89.0], MT:[44.3,49.1,-116.2,-103.9], NE:[39.9,43.1,-104.1,-95.2],
  NV:[34.9,42.1,-120.1,-113.9], NH:[42.6,45.4,-72.6,-70.6], NJ:[38.9,41.4,-75.6,-73.8],
  NM:[31.2,37.1,-109.1,-102.9], NY:[40.4,45.1,-79.9,-71.8], NC:[33.8,36.6,-84.4,-75.4],
  ND:[45.8,49.1,-104.1,-96.5], OH:[38.3,42.4,-84.9,-80.5], OK:[33.6,37.1,-103.1,-94.4],
  OR:[41.9,46.4,-124.7,-116.4], PA:[39.7,42.3,-80.6,-74.6], RI:[41.1,42.1,-71.9,-71.1],
  SC:[32.0,35.3,-83.4,-78.4], SD:[42.4,46.0,-104.1,-96.4], TN:[34.9,36.7,-90.4,-81.6],
  TX:[25.8,36.6,-106.7,-93.5], UT:[36.9,42.1,-114.1,-108.9], VT:[42.7,45.1,-73.5,-71.4],
  VA:[36.5,39.5,-83.7,-75.2], WA:[45.5,49.1,-124.8,-116.9], WV:[37.1,40.7,-82.7,-77.7],
  WI:[42.4,47.4,-92.9,-86.7], WY:[40.9,45.1,-111.1,-104.0],
};

const allParks = [];
const idCount = {};
let issues = 0;
const warn = (m) => { console.log('  ⚠ ' + m); issues++; };

for (const [code, list] of Object.entries(STATE_PARKS_BY_STATE)) {
  for (const p of list) {
    allParks.push({ ...p, _state: code });
    idCount[p.id] = (idCount[p.id] || 0) + 1;
    // id prefix must match the state
    const pref = p.id.split('-')[0].toUpperCase();
    if (pref !== code) warn(`${code}: id "${p.id}" prefix ≠ state ${code}`);
    // category sanity
    const OK = ['state-park','state-forest','state-beach','state-preserve','recreation-area'];
    if (!OK.includes(p.category)) warn(`${code}: "${p.id}" bad category "${p.category}"`);
    // coord present + numeric
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') { warn(`${code}: "${p.id}" missing lat/lng`); continue; }
    // inside its state box?
    const b = BOX[code];
    if (b && (p.lat < b[0] || p.lat > b[1] || p.lng < b[2] || p.lng > b[3]))
      warn(`${code}: "${p.id}" (${p.lat},${p.lng}) OUTSIDE ${code} box → coord error?`);
  }
  // duplicate coordinates within the state (Wikidata dup bug)
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const dLat = Math.abs(list[i].lat - list[j].lat), dLng = Math.abs(list[i].lng - list[j].lng);
      if (dLat < 0.01 && dLng < 0.01) warn(`${code}: "${list[i].id}" & "${list[j].id}" share ~same coord`);
    }
}

// global duplicate ids
for (const [id, n] of Object.entries(idCount)) if (n > 1) warn(`DUPLICATE id "${id}" appears ${n}×`);

// orphaned iNat / highlight keys (key not matching any park)
const ids = new Set(allParks.map(p => p.id));
for (const k of Object.keys(INAT_PLACE_IDS)) if (!ids.has(k)) warn(`INAT_PLACE_IDS key "${k}" has no matching park`);
for (const k of Object.keys(STATE_PARK_HIGHLIGHTS)) if (!ids.has(k)) warn(`HIGHLIGHT key "${k}" has no matching park`);

console.log(`\n— audited ${allParks.length} parks across ${Object.keys(STATE_PARKS_BY_STATE).length} states —`);
console.log(`iNat ids: ${Object.keys(INAT_PLACE_IDS).length} · highlights: ${Object.keys(STATE_PARK_HIGHLIGHTS).length}`);
console.log(issues ? `\n❌ ${issues} issue(s) found` : `\n✅ clean — no issues`);
