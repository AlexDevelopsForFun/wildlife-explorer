#!/usr/bin/env node
/**
 * scripts/fixDuplicates.js
 *
 * Standardizes animal names in wildlifeCache.js to canonical forms
 * so that runtime merge/dedup doesn't create duplicates when live API
 * data uses a different variant of the same species name.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js');

let src = readFileSync(CACHE_PATH, 'utf8');

// ── Name standardizations: variant → preferred common name ──────────────────
// Only rename when both refer to the exact same species and one name is more
// recognizable to general audiences.
const NAME_RENAMES = {
  'American Black Bear': 'Black Bear',
  'American Elk':        'Elk',
  'American Moose':      'Moose',
  'Grey Wolf':           'Gray Wolf',
  'Timber Wolf':         'Gray Wolf',
  'Grey Fox':            'Gray Fox',
  'Grey Jay':            'Canada Jay',
  'Gray Jay':            'Canada Jay',
  'Harbour Seal':        'Harbor Seal',
  'White-tail Deer':     'White-tailed Deer',
  'Whitetail Deer':      'White-tailed Deer',
  'Red Tailed Hawk':     'Red-tailed Hawk',
  'Wapiti':              'Elk',
  'Buffalo':             'American Bison',
  'Cougar':              'Mountain Lion',
  'Puma':                'Mountain Lion',
};

// NOTE: We do NOT rename Brown Bear → Grizzly Bear globally because at
// Alaskan parks (Katmai, Glacier Bay) "Brown Bear" is the correct name.
// And we do NOT rename "Black-tailed Deer" → "Mule Deer" because they are
// recognized subspecies that can coexist in different habitats.

let renames = 0;
const renameLog = {};

for (const [oldName, newName] of Object.entries(NAME_RENAMES)) {
  // Replace in "name": "X" fields only (not in funFact text etc.)
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`("name":\\s*)"${escaped}"`, 'g');
  const matches = src.match(re);
  if (matches && matches.length > 0) {
    src = src.replace(re, `$1"${newName}"`);
    renames += matches.length;
    renameLog[`${oldName} → ${newName}`] = matches.length;
  }
}

console.log(`Cache name standardizations: ${renames} total`);
for (const [change, count] of Object.entries(renameLog)) {
  console.log(`  ${change}: ${count}`);
}

// ── Verify: no park now has both "Black Bear" and "American Black Bear" etc. ──
const parkRe = /"(\w+)":\s*\{\s*builtAt/g;
let pm;
const parkPositions = [];
while ((pm = parkRe.exec(src)) !== null) {
  parkPositions.push({ name: pm[1], pos: pm.index });
}

// Count total animals
const nameRe = /"name":\s*"[^"]+"/g;
const totalAnimals = (src.match(nameRe) || []).length;
console.log(`\nTotal species in cache: ${totalAnimals}`);

// Quick duplicate check (same exact name in same park)
let exactDups = 0;
for (let i = 0; i < parkPositions.length; i++) {
  const park = parkPositions[i].name;
  const start = parkPositions[i].pos;
  const end = i + 1 < parkPositions.length ? parkPositions[i + 1].pos : src.length;
  const section = src.substring(start, end);
  const names = [];
  const nr = /"name":\s*"([^"]+)"/g;
  let nm;
  while ((nm = nr.exec(section)) !== null) names.push(nm[1]);
  const seen = new Set();
  for (const n of names) {
    if (seen.has(n)) {
      console.log(`  ⚠️  Exact duplicate at ${park}: "${n}"`);
      exactDups++;
    }
    seen.add(n);
  }
}
if (exactDups === 0) console.log('✅ Zero exact-name duplicates within any park');

// ── Show Shenandoah Black Bear entry for the report ──────────────────────────
const shenStart = src.indexOf('"shenandoah"');
const shenEnd = src.indexOf('"newrivergorge"', shenStart);
const shenSection = src.substring(shenStart, shenEnd || shenStart + 100000);
const bbIdx = shenSection.indexOf('"name": "Black Bear"');
if (bbIdx >= 0) {
  // Extract the full object
  let depth = 0, objStart = -1, objEnd = -1;
  for (let i = bbIdx; i >= 0; i--) {
    if (shenSection[i] === '{') { objStart = i; break; }
  }
  for (let i = objStart; i < shenSection.length; i++) {
    if (shenSection[i] === '{') depth++;
    if (shenSection[i] === '}') { depth--; if (depth === 0) { objEnd = i + 1; break; } }
  }
  console.log('\n=== Shenandoah Black Bear (merged result) ===');
  console.log(shenSection.substring(objStart, objEnd));
}

writeFileSync(CACHE_PATH, src, 'utf8');
console.log('\nWritten: wildlifeCache.js');
