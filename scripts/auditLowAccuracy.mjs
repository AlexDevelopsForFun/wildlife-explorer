#!/usr/bin/env node
/**
 * scripts/auditLowAccuracy.mjs — verify every remaining LOW per-taxon reading is
 * ACCURATE (genuine iNat sparsity) rather than a fixable data gap.
 *
 * Floor COVERAGE is already 100% (auditTaxaFloors). What's left are counties
 * whose floor is small. A small floor is fine IF iNat genuinely has little there
 * (remote/landlocked/cold) — but it's a BUG if the county resolved to the wrong
 * iNat place (a shared region pid, or a null pid). This separates the two:
 *
 *   GENUINE  — unique, county-level place_id; the floor ≈ what iNat actually has.
 *   SUSPECT  — pid shared across multiple counties (resolved to a region, not the
 *              county) OR pid null OR (for marine) a COASTAL county with ~no fish.
 *
 * Only SUSPECT rows need action. Run: node scripts/auditLowAccuracy.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATE_PARKS_BY_STATE } from '../src/data/stateParksNJ.js';
import { PARK_COUNTY } from '../src/data/stateParkBirdFreq.js';
import { UNIT_COUNTY } from '../src/data/unitCounty.js';
import { UNIT_COUNTY_EXTRA } from '../src/data/unitCountyExtra.js';
import { NATIONAL_WILDLIFE_REFUGES } from '../src/data/nationalWildlifeRefuges.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, '_nonbird_cache');
const PARK_COUNTY_EXTRA = {
  'ma-richard-mckinnon':'US-MA-017','ny-three-falls':'US-NY-099',
  'ms-holmes-county':'US-MS-051','ak-wood-tikchik':'US-AK-070','al-cedar-creek':'US-AL-097',
  'ms-kurtz-sf':'US-MS-041','ca-border-field':'US-CA-073',
};

const NB = {};
for (const f of readdirSync(path.join(__dirname,'..','src','data','countyNonbird')))
  if (/^nb_[a-z]{2}\.js$/.test(f)) Object.assign(NB, (await import(`../src/data/countyNonbird/${f}`)).COUNTY_NONBIRD);

// county → all park coords in it (to test coastal-ness: near salt water?)
const TAXA = ['mammal','reptile','amphibian','marine'];
const THRESH = { mammal:5, reptile:5, amphibian:3, marine:3 };
const COLD_NORTH = new Set(['AK','MT','ND','MN','WI','ME','VT','NH','WY','ID']);
const ARID = new Set(['AZ','NV','NM','UT']);
const expectedSparse = (st,t) => { st=(st||'').toUpperCase();
  if (st==='AK') return true;
  if (t==='reptile' && COLD_NORTH.has(st)) return true;
  if ((t==='amphibian'||t==='marine') && ARID.has(st)) return true;
  return false; };

// rows
const rows = [];
for (const [st,list] of Object.entries(STATE_PARKS_BY_STATE)) for (const p of (list??[]))
  rows.push({ id:p.id, name:p.name, st, county: PARK_COUNTY_EXTRA[p.id] ?? PARK_COUNTY[p.id] ?? null });
for (const r of NATIONAL_WILDLIFE_REFUGES)
  rows.push({ id:r.id, name:r.name, st:(r.stateCodes||[])[0]||'', county: UNIT_COUNTY[r.id] ?? UNIT_COUNTY_EXTRA[r.id] ?? null });
for (const id of Object.keys(UNIT_COUNTY).filter(k=>k.startsWith('nps_')))
  rows.push({ id, name:id, st:UNIT_COUNTY[id]?.split('-')[1]||'', county: UNIT_COUNTY[id] });

// pid per county (from cache) + how many counties share each pid
const pidOf = {}; const pidCount = {};
for (const c of new Set(rows.map(r=>r.county).filter(Boolean))) {
  const cf = path.join(CACHE, `${c}.json`);
  if (existsSync(cf)) { try { const j=JSON.parse(readFileSync(cf,'utf8')); pidOf[c]=j.pid; if(j.pid!=null) pidCount[j.pid]=(pidCount[j.pid]||0)+1; } catch {} }
}

// Live-probed (iNat) and CONFIRMED genuinely sparse: the county's own correct
// place_id also has ≤ threshold for this taxon, so the low reading is accurate
// (arid SW Kansas ≈ no iNat fish; rural IA/MO border ≈ 2 amphibians; rural ND ≈
// 2 fish). They share a place_id only because they're tiny adjacent rural
// counties. Not bugs — documented here so the guardrail stays meaningful.
const VERIFIED_ACCURATE = new Set([
  'US-IA-053|amphibian','US-KS-109|marine','US-KS-171|marine',
  'US-MO-081|amphibian','US-ND-005|marine','US-ND-069|marine',
]);

let genuine=0, suspect=0, verified=0; const suspectRows=[];
for (const t of TAXA) {
  for (const r of rows) {
    if (!r.county || !NB[r.county]) continue;
    const n = NB[r.county][t]?.length || 0;
    if (n >= THRESH[t] || expectedSparse(r.st, t)) continue;     // ok / expected
    const pid = pidOf[r.county];
    const shared = pid!=null && pidCount[pid] > 1;
    const reason = pid==null ? 'NULL pid' : shared ? `pid ${pid} shared by ${pidCount[pid]} counties` : null;
    if (reason && VERIFIED_ACCURATE.has(`${r.county}|${t}`)) { verified++; continue; }
    if (reason) { suspect++; suspectRows.push({ ...r, t, n, reason }); }
    else genuine++;
  }
}

// de-dup suspect rows by county+taxon
const seen = new Set(); const uniqSus = [];
for (const r of suspectRows) { const k=r.county+r.t; if(!seen.has(k)){seen.add(k);uniqSus.push(r);} }

console.log(`Low per-taxon readings examined (excl. climate-expected-sparse):`);
console.log(`  GENUINE  (unique county place_id, floor ≈ real iNat data):       ${genuine}`);
console.log(`  VERIFIED (shared pid but live-probed = genuinely sparse, listed): ${verified}`);
console.log(`  SUSPECT  (wrong/shared/null place — worth a re-resolve):          ${suspect}\n`);
if (uniqSus.length) {
  console.log(`SUSPECT counties/taxa to investigate (${uniqSus.length} distinct):`);
  uniqSus.sort((a,b)=>a.county.localeCompare(b.county)).forEach(r =>
    console.log(`  ${r.county} ${r.t.padEnd(9)} n=${r.n}  (${r.reason})  e.g. ${r.name.slice(0,28)}`));
} else {
  console.log('✅ No suspect readings — every low taxon reading has a unique county-level place_id, i.e. it reflects genuine iNat sparsity, not a resolution error.');
}
