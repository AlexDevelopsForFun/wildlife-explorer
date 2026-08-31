#!/usr/bin/env node
/**
 * scripts/auditTaxaFloors.mjs — per-TAXON low-species audit across every park.
 *
 * For each park (state park + refuge + national unit) we resolve its county and
 * count the floor it can seed in each taxon the user cares about:
 *   birds, mammals, reptiles, amphibians, marine (ray-finned fish).
 * (Birds come from COUNTY_BIRD_FREQ or the presence COUNTY_BIRD_LIST; the rest
 * from COUNTY_NONBIRD.)  A park can never display fewer than ~its floor once the
 * live calls are thin, so a thin floor == a park that can look empty.
 *
 * Classes (most actionable first):
 *   NO_COUNTY    — no county at all → seeds nothing (must hand-map).
 *   NO_NONBIRD   — county has a bird floor but NO non-bird entry at all → the
 *                  park shows birds and ZERO mammals/reptiles/amphibians/fish
 *                  (the county was never covered by the iNat non-bird build).
 *   LOW_TAXON    — county is covered but a taxon is below threshold. Segmented
 *                  by climate because reptiles/amphibians/fish are legitimately
 *                  sparse in the far north (AK) and arid interior — those are
 *                  reported as "expected-sparse", not bugs.
 *
 * Emits the set of counties that need a non-bird build (NO_NONBIRD) and a bird
 * build (no bird floor) so a follow-up build script can target exactly them.
 *
 * Run: node scripts/auditTaxaFloors.mjs
 */
import { readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';
import { PARK_COUNTY, COUNTY_BIRD_FREQ } from '../src/data/stateParkBirdFreq.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const D = (p) => path.join(__dirname, '..', 'src', 'data', p);

// Hand-mapped orphan parks (mirror App.jsx PARK_COUNTY_EXTRA + the 5 new edge units).
const PARK_COUNTY_EXTRA = {
  'ma-richard-mckinnon': 'US-MA-017', 'ny-three-falls': 'US-NY-099',
  'ms-holmes-county': 'US-MS-051', 'ak-wood-tikchik': 'US-AK-070',
  'al-cedar-creek': 'US-AL-097', 'ms-kurtz-sf': 'US-MS-041',
  'ca-border-field': 'US-CA-073',   // overrides PARK_COUNTY's MX municipio
};
import { UNIT_COUNTY_EXTRA } from '../src/data/unitCountyExtra.js';

const COUNTY_BIRD_LIST = {};
for (const f of readdirSync(D('countyBirdList'))) {
  if (!/^cbl_[a-z]{2}\.js$/.test(f)) continue;
  Object.assign(COUNTY_BIRD_LIST, (await import(`../src/data/countyBirdList/${f}`)).COUNTY_BIRD_LIST ?? {});
}
const COUNTY_NONBIRD = {};
for (const f of readdirSync(D('countyNonbird'))) {
  if (!/^nb_[a-z]{2}\.js$/.test(f)) continue;
  Object.assign(COUNTY_NONBIRD, (await import(`../src/data/countyNonbird/${f}`)).COUNTY_NONBIRD ?? {});
}

const birdN = (c) => !c ? 0
  : COUNTY_BIRD_FREQ[c] ? Object.keys(COUNTY_BIRD_FREQ[c]).filter(k => !k.startsWith('__')).length
  : COUNTY_BIRD_LIST[c] ? COUNTY_BIRD_LIST[c].length : 0;
const nb = (c, t) => (c && COUNTY_NONBIRD[c] && COUNTY_NONBIRD[c][t]) ? COUNTY_NONBIRD[c][t].length : 0;

// Per-taxon "healthy" thresholds and where a low count is expected (not a bug).
const TAXA = ['mammal', 'reptile', 'amphibian', 'marine'];
const THRESH = { mammal: 5, reptile: 5, amphibian: 3, marine: 3 };
// Reptiles/amphibians/fish naturally near-zero in AK; reptiles sparse across the
// cold north; fish sparse in arid interior. Treat these as expected, not bugs.
const COLD_NORTH = new Set(['AK','MT','ND','MN','WI','ME','VT','NH','WY','ID']);
const ARID = new Set(['AZ','NV','NM','UT']);
const expectedSparse = (st, t) => {
  st = (st || '').toUpperCase();
  if (st === 'AK') return true;                       // AK: almost no herps/fish floor
  if (t === 'reptile' && COLD_NORTH.has(st)) return true;
  if (t === 'amphibian' && ARID.has(st)) return true;
  if (t === 'marine' && ARID.has(st)) return true;
  return false;
};

const rows = [];
for (const [st, list] of Object.entries(STATE_PARKS_BY_STATE))
  for (const p of (list ?? []))
    rows.push({ id: p.id, name: p.name, kind: 'state', st, county: PARK_COUNTY_EXTRA[p.id] ?? PARK_COUNTY[p.id] ?? null });
for (const r of NATIONAL_WILDLIFE_REFUGES)
  rows.push({ id: r.id, name: r.name, kind: 'refuge', st: (r.stateCodes || [])[0] || '', county: UNIT_COUNTY[r.id] ?? UNIT_COUNTY_EXTRA[r.id] ?? null });
for (const id of Object.keys(UNIT_COUNTY).filter(k => k.startsWith('nps_')))
  rows.push({ id, name: id, kind: 'national', st: UNIT_COUNTY[id]?.split('-')[1] || '', county: UNIT_COUNTY[id] });

for (const r of rows) {
  r.bird = birdN(r.county);
  for (const t of TAXA) r[t] = nb(r.county, t);
  r.hasNonbird = !!(r.county && COUNTY_NONBIRD[r.county]);
}

const noCounty  = rows.filter(r => !r.county);
const noBird    = rows.filter(r => r.county && r.bird === 0);
const noNonbird = rows.filter(r => r.county && r.bird > 0 && !r.hasNonbird);

// Per-taxon low (county covered, taxon below threshold, NOT expected-sparse).
const lowByTaxon = {};
for (const t of TAXA) {
  lowByTaxon[t] = rows.filter(r => r.county && r.hasNonbird && r[t] < THRESH[t] && !expectedSparse(r.st, t));
}

const REMOTE = new Set(['AK','HI','PR','VI','GU','MP','AS']);
const isRemote = (r) => REMOTE.has((r.st || '').toUpperCase()) || !r.st;

console.log(`Audited ${rows.length} parks (state ${rows.filter(r=>r.kind==='state').length} + refuge ${rows.filter(r=>r.kind==='refuge').length} + national ${rows.filter(r=>r.kind==='national').length}).\n`);

console.log(`── NO county (seeds nothing) : ${noCounty.length} ──`);
const ncMain = noCounty.filter(r => !isRemote(r));
console.log(`   mainland (fixable): ${ncMain.length}`);
ncMain.forEach(r => console.log(`     ${r.kind.padEnd(8)} ${r.id.padEnd(26)} ${r.name.slice(0,28)} (${r.st})`));
console.log(`   remote/offshore: ${noCounty.length - ncMain.length}\n`);

console.log(`── NO bird floor : ${noBird.length} ── (county not in freq nor list)`);
[...new Set(noBird.map(r => r.county))].forEach(c => console.log(`     ${c}  (${noBird.filter(r=>r.county===c).length} parks)`));

console.log(`\n── NO non-bird floor (shows birds, ZERO mammals/reptiles/amph/fish) : ${noNonbird.length} parks ──`);
const nnCounties = [...new Set(noNonbird.map(r => r.county))].sort();
console.log(`   distinct counties to build: ${nnCounties.length}`);
nnCounties.slice(0, 60).forEach(c => console.log(`     ${c}  (${noNonbird.filter(r=>r.county===c).length} parks, e.g. ${noNonbird.find(r=>r.county===c).name.slice(0,26)})`));
if (nnCounties.length > 60) console.log(`     …and ${nnCounties.length - 60} more`);

console.log(`\n── LOW per-taxon (covered county, below threshold, excl. expected-sparse) ──`);
for (const t of TAXA)
  console.log(`   ${t.padEnd(10)}: ${lowByTaxon[t].length} parks  (thresh <${THRESH[t]})`);

// Emit the build target lists.
const buildTargets = {
  noBirdCounties: [...new Set(noBird.map(r => r.county))].sort(),
  noNonbirdCounties: nnCounties,
  noCountyMainland: ncMain.map(r => ({ id: r.id, name: r.name, st: r.st })),
};
writeFileSync(path.join(__dirname, '_auditTargets.json'), JSON.stringify(buildTargets, null, 1));
console.log(`\n→ wrote scripts/_auditTargets.json (noBird ${buildTargets.noBirdCounties.length} counties, noNonbird ${nnCounties.length} counties).`);
