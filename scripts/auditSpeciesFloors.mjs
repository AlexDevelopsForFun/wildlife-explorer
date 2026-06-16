#!/usr/bin/env node
/**
 * scripts/auditSpeciesFloors.mjs — STANDING HEALTH AUDIT of the species floors.
 *
 * The durable guardrail so we catch the next "Barnegat" (a park silently
 * collapsing to near-empty) automatically, instead of waiting for a user to
 * notice. Pure data check — no live APIs, fast, deterministic.
 *
 * Two things:
 *   1. COVERAGE — every park (state park / refuge / national unit) maps to a
 *      county AND that county has a bird floor + a non-bird floor. A park with
 *      no floor is one that can collapse when its live call is thin.
 *   2. SIGNATURE SPECIES — iconic animals appear where they're known to live
 *      (alligator in Florida, moose up north, bison by Yellowstone, …). Catches
 *      a data regression (e.g. a bad rebuild dropping a whole taxon).
 *
 * Exits non-zero (fails CI) only on a genuine regression — coverage falling
 * below the floor, or a must-pass signature going missing. Run:
 *   node scripts/auditSpeciesFloors.mjs
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

// Merge every non-bird chunk into one county → {group:[[name,freq]]} map.
const COUNTY_NONBIRD = {};
for (const f of readdirSync(NB_DIR)) {
  if (!/^nb_[a-z]{2}\.js$/.test(f)) continue;
  const m = await import(`../src/data/countyNonbird/${f}`);
  Object.assign(COUNTY_NONBIRD, m.COUNTY_NONBIRD ?? {});
}

let failures = 0, warnings = 0;
const fail = (m) => { console.log('  ❌ ' + m); failures++; };
const warn = (m) => { console.log('  ⚠️  ' + m); warnings++; };
const ok   = (m) => console.log('  ✓ ' + m);
const st   = (c) => c.split('-')[1];

console.log('═══ Species-floor health audit ═══');

// ── 1. COVERAGE ─────────────────────────────────────────────────────────────
function coverage(label, parks, countyOf, minPct) {
  let total = 0, mapped = 0, bird = 0, nonbird = 0; const orphans = [];
  for (const p of parks) {
    total++;
    const c = countyOf(p);
    if (!c) { orphans.push(p.id); continue; }
    mapped++;
    if (COUNTY_BIRD_FREQ[c]) bird++;
    if (COUNTY_NONBIRD[c])   nonbird++;
  }
  const pct = total ? mapped / total : 1;
  console.log(`\n${label}: ${total} parks — ${mapped} county-mapped (${(pct*100).toFixed(1)}%), ` +
    `${bird} w/ bird floor, ${nonbird} w/ non-bird floor`);
  if (orphans.length) {
    const sample = orphans.slice(0, 12).join(', ');
    console.log(`   ${orphans.length} with no county (live-only): ${sample}${orphans.length>12?'…':''}`);
  }
  if (pct < minPct) fail(`${label} coverage ${(pct*100).toFixed(1)}% < required ${(minPct*100)}%`);
  else ok(`${label} coverage OK (${(pct*100).toFixed(1)}%)`);
  return { total, mapped };
}

console.log('\n── Coverage (every park should have a county floor) ──');
coverage('State parks', Object.values(STATE_PARKS_BY_STATE).flat(), p => PARK_COUNTY[p.id], 0.97);
coverage('Refuges', NATIONAL_WILDLIFE_REFUGES, p => UNIT_COUNTY[p.id], 0.80);
coverage('National units', Object.keys(UNIT_COUNTY).filter(k => k.startsWith('nps_')).map(id => ({ id })),
         p => UNIT_COUNTY[p.id], 0.85);

// ── 2. SIGNATURE SPECIES ────────────────────────────────────────────────────
// Each: should appear in ≥ `min` of the named states' counties. gate 'fail'
// (must-pass widespread species) blocks CI; 'warn' is informational.
const SIGNATURES = [
  { name: 'white-tailed deer',  group: 'mammal',   states: ['NJ','NY','PA','VA','GA','FL','OH','MI','WI','TX'], min: 0.80, gate: 'fail' },
  { name: 'american alligator', group: 'reptile',  states: ['FL'],                         min: 0.80, gate: 'fail' },
  { name: 'american bullfrog',  group: 'amphibian', states: ['CA','NY','OH','TX'],          min: 0.60, gate: 'fail' },
  { name: 'bald eagle',         group: 'bird',     states: ['MN','FL','WA','ME','WI'],     min: 0.80, gate: 'fail' },
  { name: 'monarch',            group: 'insect',   states: ['TX','IA','MN','OH'],          min: 0.60, gate: 'fail' },
  { name: 'moose',              group: 'mammal',   states: ['ME','NH','MT','WY','AK'],     min: 0.25, gate: 'warn' },
  { name: 'bison',              group: 'mammal',   states: ['WY','MT','SD','ND'],          min: 0.08, gate: 'warn' },
  { name: 'manatee',            group: 'mammal',   states: ['FL'],                         min: 0.15, gate: 'warn' },
  { name: 'gopher tortoise',    group: 'reptile',  states: ['FL','GA','AL'],               min: 0.25, gate: 'warn' },
];

function checkSignature(sig) {
  const pool = sig.group === 'bird' ? COUNTY_BIRD_FREQ : COUNTY_NONBIRD;
  const counties = Object.keys(pool).filter(c => sig.states.includes(st(c)));
  if (!counties.length) { warn(`${sig.name}: no counties found for ${sig.states.join('/')}`); return; }
  let present = 0;
  for (const c of counties) {
    const has = sig.group === 'bird'
      ? Object.keys(pool[c]).some(n => !n.startsWith('__') && n.includes(sig.name))
      : (pool[c]?.[sig.group] ?? []).some(([n]) => n.toLowerCase().includes(sig.name));
    if (has) present++;
  }
  const frac = present / counties.length;
  const msg = `${sig.name} (${sig.group}) in ${present}/${counties.length} ${sig.states.join('/')} counties — ` +
    `${(frac*100).toFixed(0)}% (need ${(sig.min*100).toFixed(0)}%)`;
  if (frac >= sig.min) ok(msg);
  else if (sig.gate === 'fail') fail(msg);
  else warn(msg);
}

console.log('\n── Signature species (range sanity) ──');
SIGNATURES.forEach(checkSignature);

console.log(`\n═══ ${failures} failure(s), ${warnings} warning(s) ═══`);
process.exit(failures ? 1 : 0);
