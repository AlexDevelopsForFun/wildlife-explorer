'use strict';
const fs = require('fs');
const path = require('path');

// Load wildlifeCache as CJS
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'wildlifeCache.js'), 'utf8');
const cjs = src
  .replace('export const WILDLIFE_CACHE_BUILT_AT', 'const WILDLIFE_CACHE_BUILT_AT')
  .replace('export const WILDLIFE_CACHE', 'const WILDLIFE_CACHE')
  + '\nmodule.exports = { WILDLIFE_CACHE };';

const tmpPath = path.join(__dirname, '_wc_tmp.cjs');
fs.writeFileSync(tmpPath, cjs);
const { WILDLIFE_CACHE: cache } = require(tmpPath);
fs.unlinkSync(tmpPath);

const find = (parkId, name) => {
  const park = cache[parkId];
  if (!park) return null;
  return (park.animals || []).find(a => a.name === name);
};

const CHECK = (label, parkId, name, expectedRarity, requiredSeasons, forbiddenSeasons) => {
  const a = find(parkId, name);
  if (!a) { console.log(`❌ MISS    ${label}`); return; }
  let ok = true;
  const issues = [];
  if (expectedRarity && a.rarity !== expectedRarity) {
    // For some checks we allow a range
    if (Array.isArray(expectedRarity) && !expectedRarity.includes(a.rarity)) {
      issues.push(`rarity=${a.rarity} (expected one of [${expectedRarity.join('|')}])`);
      ok = false;
    } else if (!Array.isArray(expectedRarity)) {
      issues.push(`rarity=${a.rarity} (expected ${expectedRarity})`);
      ok = false;
    }
  }
  const seasons = a.seasons || [];
  (requiredSeasons || []).forEach(s => {
    if (!seasons.includes(s)) { issues.push(`missing season '${s}'`); ok = false; }
  });
  (forbiddenSeasons || []).forEach(s => {
    if (seasons.includes(s)) { issues.push(`has forbidden season '${s}'`); ok = false; }
  });
  const tag = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${tag}  ${label}`);
  console.log(`         rarity=${a.rarity}  seasons=[${seasons.join(',')}]  best=${a.bestSeason||'—'}`);
  if (issues.length) issues.forEach(i => console.log(`         ⚠ ${i}`));
};

console.log('══════════════════════════════════════════════════');
console.log('  SPOT CHECK — post S&T enrichment');
console.log('══════════════════════════════════════════════════\n');

console.log('─── Check 1: Specific Birds ───────────────────────');
CHECK('American Robin @ Yellowstone',
  'yellowstone', 'American Robin',
  'very_likely', ['spring','summer','fall'], ['winter']);

CHECK('Osprey @ Acadia',
  'acadia', 'Osprey',
  ['unlikely','likely','very_likely'], ['spring','summer','fall'], []);

CHECK('Yellow Warbler @ Acadia',
  'acadia', 'Yellow Warbler',
  null, ['spring','summer','fall'], ['winter']);

CHECK('Bald Eagle @ Acadia',
  'acadia', 'Bald Eagle',
  null, [], []);   // just report, any rarity acceptable here

console.log('\n  — Canada Goose (any Likely or higher park) —');
let cgFound = false;
for (const [id, park] of Object.entries(cache)) {
  const a = (park.animals||[]).find(x => x.name === 'Canada Goose');
  if (a) {
    const rankOk = ['guaranteed','very_likely','likely'].includes(a.rarity);
    const tag = rankOk ? '✅' : '⚠';
    console.log(`  ${tag}  Canada Goose @ ${id}: rarity=${a.rarity} seasons=[${(a.seasons||[]).join(',')}]`);
    cgFound = true;
    if ([...Object.keys(cache)].indexOf(id) > 5) break; // show first 6 occurrences
  }
}
if (!cgFound) console.log('  ❌ Canada Goose not found in any park');

console.log('\n─── Check 2: Upgrades-only guard ─────────────────');
CHECK('Bald Eagle @ Yellowstone (must still be rare)',
  'yellowstone', 'Bald Eagle', 'rare', [], []);
const wolf = find('yellowstone', 'Gray Wolf');
if (wolf) {
  const ok = wolf.rarity === 'rare';
  console.log(`${ok?'✅ PASS':'❌ FAIL'}  Gray Wolf @ Yellowstone`);
  console.log(`         rarity=${wolf.rarity}  seasons=[${(wolf.seasons||[]).join(',')}]`);
} else {
  console.log('❌ MISS  Gray Wolf @ Yellowstone');
}

// ── Helper: find birds that were upgraded (have bestSeason = S&T touched them, and rarity changed)
// Since we don't have before/after, we look at birds with bestSeason set (S&T enriched them)
const enrichedBirds = (parkId) => {
  return (cache[parkId]?.animals || []).filter(a => a.animalType === 'bird' && a.bestSeason);
};

console.log('\n─── Check 3a: Mammoth Cave (18 upgrades reported) ─');
const mc = enrichedBirds('mammothcave');
console.log(`  Birds with S&T seasonal data: ${mc.length}`);
mc.forEach(a => console.log(`    ${a.name}: rarity=${a.rarity} seasons=[${(a.seasons||[]).join(',')}] best=${a.bestSeason}`));

console.log('\n─── Check 3b: Gateway Arch (12 upgrades reported) ─');
const ga = enrichedBirds('gatewayarch');
console.log(`  Birds with S&T seasonal data: ${ga.length}`);
ga.forEach(a => console.log(`    ${a.name}: rarity=${a.rarity} seasons=[${(a.seasons||[]).join(',')}] best=${a.bestSeason}`));

console.log('\n─── Check 3c: Cuyahoga Valley (15 upgrades reported) ─');
const cv = enrichedBirds('cuyahogavalley');
console.log(`  Birds with S&T seasonal data: ${cv.length}`);
cv.forEach(a => console.log(`    ${a.name}: rarity=${a.rarity} seasons=[${(a.seasons||[]).join(',')}] best=${a.bestSeason}`));
