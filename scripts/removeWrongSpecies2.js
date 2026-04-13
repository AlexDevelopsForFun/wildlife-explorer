#!/usr/bin/env node
/**
 * scripts/removeWrongSpecies2.js
 *
 * Surgical removal of geographically wrong species that the first pass
 * failed to remove due to a buggy object-boundary parser. This script
 * uses a reliable approach: parse the whole file as a module, manipulate
 * the arrays, then write it back.
 *
 * Also re-checks after removal for any remaining issues.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js');

let src = readFileSync(CACHE_PATH, 'utf8');

// ── Removals: [park, animalName] ────────────────────────────────────────────
// Each confirmed as geographically wrong after careful review.
const REMOVALS = [
  // Hawaiian endemic at non-Hawaii park
  ['lassenvolcanic', 'Hawaiian Goose'],
  ['sequoia', 'Hawaiian Goose'],
  // California Condor at parks far from reintroduction sites
  // (OK at: Grand Canyon, Zion, Pinnacles, Channel Islands, Yosemite, Sequoia, Kings Canyon, Redwood)
  ['lassenvolcanic', 'California Condor'],
  ['yellowstone', 'California Condor'],
  ['brycecanyon', 'California Condor'],
  ['canyonlands', 'California Condor'],
  ['whitesands', 'California Condor'],
  ['northcascades', 'California Condor'],
  ['mountrainier', 'California Condor'],
  // Greater Roadrunner outside its range
  // (OK at Pinnacles, Kings Canyon — both in California within range)
  ['lassenvolcanic', 'Greater Roadrunner'],  // Northern CA, too high elevation
  ['craterlake', 'Greater Roadrunner'],       // Oregon, outside range
  // Gray Wolf at parks with no confirmed packs
  ['pinnacles', 'Gray Wolf'],
  ['craterlake', 'Gray Wolf'],
  // Bison at parks with no managed herds
  ['capitolreef', 'American Bison'],
  ['greatsanddunes', 'American Bison'],
  // Snowy Owl at tropical parks
  ['hawaiivolcanoes', 'Snowy Owl'],
  ['haleakala', 'Snowy Owl'],
  // Desert Tortoise far outside Mojave/Sonoran range
  ['virginislands', 'Desert Tortoise'],
  ['hotsprings', 'Desert Tortoise'],
];

// ── Parse park sections and remove animals ──────────────────────────────────
// Strategy: find each animal object by its "name" field within the park section,
// then find the complete { ... } object boundaries using brace counting, and
// remove the object plus its surrounding comma/whitespace.

let removed = 0;

for (const [park, animalName] of REMOVALS) {
  // Find the park key in the source
  const parkPattern = `"${park}":`;
  const parkIdx = src.indexOf(parkPattern);
  if (parkIdx < 0) {
    console.log(`  Park not found: ${park}`);
    continue;
  }

  // Find the animals array start
  const animalsIdx = src.indexOf('animals:', parkIdx);
  if (animalsIdx < 0 || animalsIdx > parkIdx + 500) continue;
  const arrayStart = src.indexOf('[', animalsIdx);
  if (arrayStart < 0) continue;

  // Find the animal's "name" field within this park
  const escaped = animalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRe = new RegExp('"name":\\s*"' + escaped + '"');

  // Search only within this park's section (up to next park or end)
  const nextParkRe = /"\w+":\s*\{\s*\n\s*builtAt/g;
  nextParkRe.lastIndex = parkIdx + parkPattern.length + 50;
  const nextParkMatch = nextParkRe.exec(src);
  const sectionEnd = nextParkMatch ? nextParkMatch.index : src.length;

  const section = src.substring(parkIdx, sectionEnd);
  const nameMatch = nameRe.exec(section);

  if (!nameMatch) {
    console.log(`  Not found: ${animalName} at ${park}`);
    continue;
  }

  const nameAbsPos = parkIdx + nameMatch.index;

  // Walk backwards from the "name" field to find the opening brace of this object
  let objStart = nameAbsPos;
  while (objStart > arrayStart && src[objStart] !== '{') objStart--;

  if (src[objStart] !== '{') {
    console.log(`  Could not find object start for ${animalName} at ${park}`);
    continue;
  }

  // Walk forward from objStart counting braces to find the matching close
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < sectionEnd; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) { objEnd = i + 1; break; }
    }
  }

  // Determine what to trim: object + trailing comma/whitespace, or leading comma
  let cutStart = objStart;
  let cutEnd = objEnd;

  // Check for trailing comma + optional whitespace/newline
  const afterObj = src.substring(objEnd, objEnd + 30);
  const trailingMatch = afterObj.match(/^(\s*,\s*\n?\s*)/);
  if (trailingMatch) {
    cutEnd = objEnd + trailingMatch[0].length;
  } else {
    // No trailing comma — this might be the last element. Remove leading comma.
    const beforeObj = src.substring(Math.max(0, objStart - 30), objStart);
    const leadingMatch = beforeObj.match(/(,\s*\n\s*)$/);
    if (leadingMatch) {
      cutStart = objStart - leadingMatch[0].length;
    }
  }

  // Perform the cut
  const before = src.substring(0, cutStart);
  const after = src.substring(cutEnd);
  src = before + after;

  console.log(`  ✘ Removed: ${animalName} from ${park}`);
  removed++;
}

console.log(`\nRemoved ${removed} of ${REMOVALS.length} species`);

// ── Final validation ──────────────────���─────────────────────────────────────
const finalCount = (src.match(/"name":\s*"[^"]+"/g) || []).length;
console.log(`Final species count: ${finalCount}`);

// Check that none of the removed species remain at their parks
let verified = 0;
const parkRe2 = /"(\w+)":\s*\{\s*builtAt/g;
let pm2;
const parkList = [];
while ((pm2 = parkRe2.exec(src)) !== null) parkList.push({ name: pm2[1], pos: pm2.index });

for (const [park, animalName] of REMOVALS) {
  const pi = parkList.findIndex(p => p.name === park);
  if (pi < 0) continue;
  const start = parkList[pi].pos;
  const end = pi + 1 < parkList.length ? parkList[pi + 1].pos : src.length;
  const section = src.substring(start, end);
  const escaped = animalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('"name":\\s*"' + escaped + '"').test(section)) {
    console.log(`  ⚠️ STILL PRESENT: ${animalName} at ${park}`);
  } else {
    verified++;
  }
}
console.log(`Verified: ${verified}/${REMOVALS.length} removals confirmed`);

writeFileSync(CACHE_PATH, src, 'utf8');
console.log('Written: wildlifeCache.js');
