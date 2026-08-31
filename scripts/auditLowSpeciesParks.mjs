#!/usr/bin/env node
/**
 * scripts/auditLowSpeciesParks.mjs — find parks that would show FEW species.
 *
 * The displayed list = live eBird/iNat/GBIF + the county "floor" (seeded when
 * live is thin). So the worst case a park can show is roughly its floor. This
 * lists parks with the smallest floor (or none), separating likely ERRORS
 * (a mainland park with no/empty county — probably a bad coordinate or an
 * unbuilt county) from legitimately data-sparse remote units (offshore/AK).
 *
 * Run: node scripts/auditLowSpeciesParks.mjs
 */
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';
import { PARK_COUNTY, COUNTY_BIRD_FREQ } from '../src/data/stateParkBirdFreq.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NB_DIR = path.join(__dirname, '..', 'src', 'data', 'countyNonbird');
const COUNTY_NONBIRD = {};
for (const f of readdirSync(NB_DIR)) {
  if (!/^nb_[a-z]{2}\.js$/.test(f)) continue;
  const m = await import(`../src/data/countyNonbird/${f}`);
  Object.assign(COUNTY_NONBIRD, m.COUNTY_NONBIRD ?? {});
}
// eBird county species-LIST floor (counties with no frequency floor — the fix
// for parks that collapse to ~1 species). Counts toward a park's bird floor.
const CBL_DIR = path.join(__dirname, '..', 'src', 'data', 'countyBirdList');
const COUNTY_BIRD_LIST = {};
for (const f of readdirSync(CBL_DIR)) {
  if (!/^cbl_[a-z]{2}\.js$/.test(f)) continue;
  const m = await import(`../src/data/countyBirdList/${f}`);
  Object.assign(COUNTY_BIRD_LIST, m.COUNTY_BIRD_LIST ?? {});
}
// Mirror App.jsx PARK_COUNTY_EXTRA (hand-mapped orphan state parks).
const PARK_COUNTY_EXTRA = {
  'ma-richard-mckinnon': 'US-MA-017', 'ny-three-falls': 'US-NY-099',
  'ms-holmes-county': 'US-MS-051', 'ak-wood-tikchik': 'US-AK-070',
};

const birdN    = (c) => {
  if (!c) return 0;
  if (COUNTY_BIRD_FREQ[c]) return Object.keys(COUNTY_BIRD_FREQ[c]).filter(k => !k.startsWith('__')).length;
  if (COUNTY_BIRD_LIST[c]) return COUNTY_BIRD_LIST[c].length;   // presence-list floor
  return 0;
};
const nonbirdN = (c) => (c && COUNTY_NONBIRD[c]) ? Object.values(COUNTY_NONBIRD[c]).reduce((s, l) => s + l.length, 0) : 0;

const rows = [];
// State parks
for (const [st, list] of Object.entries(STATE_PARKS_BY_STATE)) {
  for (const p of (list ?? [])) {
    const c = PARK_COUNTY[p.id] ?? PARK_COUNTY_EXTRA[p.id] ?? null;
    rows.push({ id: p.id, name: p.name, kind: 'state', st, county: c, lat: p.lat, lng: p.lng, bird: birdN(c), nonbird: nonbirdN(c) });
  }
}
// Refuges
for (const r of NATIONAL_WILDLIFE_REFUGES) {
  const c = UNIT_COUNTY[r.id] ?? null;
  rows.push({ id: r.id, name: r.name, kind: 'refuge', st: (r.stateCodes||[])[0]||'', county: c, lat: r.lat, lng: r.lng, bird: birdN(c), nonbird: nonbirdN(c) });
}
// National units (from UNIT_COUNTY nps_ keys)
for (const id of Object.keys(UNIT_COUNTY).filter(k => k.startsWith('nps_'))) {
  const c = UNIT_COUNTY[id];
  rows.push({ id, name: id, kind: 'national', st: c?.split('-')[1] || '', county: c, lat: null, lng: null, bird: birdN(c), nonbird: nonbirdN(c) });
}
for (const r of rows) r.total = r.bird + r.nonbird;

const LOW = 40;
const noCounty   = rows.filter(r => !r.county);
const emptyFloor = rows.filter(r => r.county && r.total === 0);
const lowFloor   = rows.filter(r => r.county && r.total > 0 && r.total < LOW).sort((a, b) => a.total - b.total);

// Offshore/AK/HI/territory = legitimately sparse; mainland no-county = likely a
// bad coordinate or unbuilt county (the fixable errors).
const REMOTE = new Set(['AK', 'HI', 'PR', 'VI', 'GU', 'MP', 'AS']);
const isRemote = (r) => REMOTE.has((r.st || '').toUpperCase()) || !r.st;

console.log(`Audited ${rows.length} parks (state + refuge + national).\n`);
console.log(`── NO county mapping (rely on live+GBIF only — Barnegat risk) : ${noCounty.length} ──`);
const fixableNoCounty = noCounty.filter(r => !isRemote(r));
console.log(`   likely FIXABLE (mainland): ${fixableNoCounty.length}`);
fixableNoCounty.forEach(r => console.log(`     ${r.kind.padEnd(8)} ${r.id.padEnd(26)} ${r.name.slice(0,30)} (${r.st}) @ ${r.lat},${r.lng}`));
console.log(`   remote/offshore (expected): ${noCounty.length - fixableNoCounty.length}\n`);

console.log(`── County mapped but EMPTY floor (county has no data) : ${emptyFloor.length} ──`);
emptyFloor.slice(0, 30).forEach(r => console.log(`     ${r.kind.padEnd(8)} ${r.id.padEnd(26)} ${r.county} (${r.st})`));

console.log(`\n── LOW floor (<${LOW} total species) : ${lowFloor.length} ── (bird+nonbird)`);
lowFloor.slice(0, 40).forEach(r => console.log(`     ${String(r.total).padStart(3)} [b${r.bird}/n${r.nonbird}] ${r.kind.padEnd(8)} ${r.id.padEnd(24)} ${r.county||''} (${r.st})`));
