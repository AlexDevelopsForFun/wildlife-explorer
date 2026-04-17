// Verify deployed caches by extracting WILDLIFE_CACHE_PRIMARY/SECONDARY
// from the minified bundles served by Vercel, then running all audit checks.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { classifyMammalSubtype } from '../src/utils/subcategories.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractCacheObject(path) {
  const src = readFileSync(path, 'utf8');
  // Vite minifies to: const e={...};export{e as ...}
  // Find the exported variable name from the export block
  const exportMatch = src.match(/export\{(\w+)\s+as\s+\w+\}/);
  if (!exportMatch) throw new Error(`No export block found in ${path}`);
  const varName = exportMatch[1];
  // Locate `const varName={`
  const declRegex = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(\\{)`);
  const declMatch = src.match(declRegex);
  if (!declMatch) throw new Error(`Declaration for '${varName}' not found in ${path}`);
  const start = declMatch.index + declMatch[0].length - 1; // position of opening '{'
  // Walk matching braces, respecting strings and template literals
  let depth = 0, i = start, inStr = false, strCh = '';
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const literal = src.slice(start, i);
  return new Function(`return ${literal}`)();
}

console.log('Parsing deployed bundles…');
const primary   = extractCacheObject(join(ROOT, 'scripts/deployed-primary.js'));
const secondary = extractCacheObject(join(ROOT, 'scripts/deployed-secondary.js'));
const DEPLOYED  = { ...primary, ...secondary };

const parkCount   = Object.keys(DEPLOYED).length;
const speciesCount = Object.values(DEPLOYED).reduce((n, p) => n + (p.animals?.length || 0), 0);
console.log(`Deployed: ${parkCount} parks, ${speciesCount} total species\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
function findAt(parkId, name) {
  return (DEPLOYED[parkId]?.animals || []).find(a => a.name === name);
}
function allAtPark(parkId, predicate) {
  return (DEPLOYED[parkId]?.animals || []).filter(predicate);
}

const ALASKA_PARKS = ['denali','kenaifjords','glacierbay','katmai','wrangellstelias','lakeclark','gatesofthearctic','kobukvalley'];
const HAWAII_PARKS = ['hawaiivolcanoes','haleakala'];

const results = [];
function check(label, passed, detail) {
  results.push({ label, passed, detail });
  console.log(`${passed ? '✓ PASS' : '✗ FAIL'} | ${label}`);
  if (detail) console.log(`        ${detail}`);
}

// ── CHECK 1: "deermouse" → Rodent ────────────────────────────────────────────
{
  const hits = [];
  for (const [pk, d] of Object.entries(DEPLOYED)) {
    for (const a of d.animals || []) {
      if (a.animalType === 'mammal' && /deermouse|deer mouse/i.test(a.name)) {
        hits.push({ pk, name: a.name, sub: classifyMammalSubtype(a.name) });
      }
    }
  }
  const allRodent = hits.length > 0 && hits.every(x => x.sub === 'rodent');
  const wrongOnes = hits.filter(x => x.sub !== 'rodent');
  check('Search "deermouse" → Rodent (NOT Large)',
    allRodent,
    `${hits.length} entries across all parks. Wrong subtypes: ${wrongOnes.length ? wrongOnes.map(x=>`${x.name}@${x.pk}=${x.sub}`).join(', ') : 'none'}`);
}

// ── CHECK 2: "myotis" at Yellowstone → Bat ───────────────────────────────────
{
  const hits = allAtPark('yellowstone', a => a.animalType === 'mammal' && /myotis/i.test(a.name));
  const subs  = hits.map(h => ({ name: h.name, sub: classifyMammalSubtype(h.name) }));
  const allBat = subs.length > 0 && subs.every(x => x.sub === 'bat');
  check('"myotis" at Yellowstone → Bat (NOT Small)',
    allBat,
    `Found: ${subs.map(x=>`${x.name}=${x.sub}`).join(' | ')}`);
}

// ── CHECK 3: Yellowstone Turkey Vulture = very_likely ─────────────────────────
{
  const a = findAt('yellowstone', 'Turkey Vulture');
  check('Yellowstone Turkey Vulture = very_likely',
    a?.rarity === 'very_likely',
    `rarity = ${a?.rarity ?? '(not found)'}`);
}

// ── CHECK 4: Yellowstone Red-tailed Hawk = very_likely ───────────────────────
{
  const a = findAt('yellowstone', 'Red-tailed Hawk');
  check('Yellowstone Red-tailed Hawk = very_likely',
    a?.rarity === 'very_likely',
    `rarity = ${a?.rarity ?? '(not found)'}`);
}

// ── CHECK 5: Yellowstone American Robin = guaranteed ─────────────────────────
{
  const a = findAt('yellowstone', 'American Robin');
  check('Yellowstone American Robin = guaranteed',
    a?.rarity === 'guaranteed',
    `rarity = ${a?.rarity ?? '(not found)'}`);
}

// ── CHECK 6: Denali Scarlet Tanager does NOT exist ───────────────────────────
{
  const a = findAt('denali', 'Scarlet Tanager');
  check('Denali Scarlet Tanager = NOT present',
    a == null,
    a ? `still present (rarity=${a.rarity})` : 'absent (correctly removed)');
}

// ── CHECK 7: Acadia Common Raccoon = very_likely ─────────────────────────────
{
  const raccoonNames = ['Raccoon','Common Raccoon','Northern Raccoon'];
  const a = raccoonNames.map(n => findAt('acadia', n)).find(Boolean);
  check('Acadia Raccoon = very_likely',
    a?.rarity === 'very_likely',
    `name="${a?.name ?? '(not found)'}" rarity=${a?.rarity ?? '-'}`);
}

// ── CHECK 8: Shenandoah Eastern Gray Squirrel = guaranteed ───────────────────
{
  const a = findAt('shenandoah', 'Eastern Gray Squirrel');
  check('Shenandoah Eastern Gray Squirrel = guaranteed',
    a?.rarity === 'guaranteed',
    `rarity = ${a?.rarity ?? '(not found)'}`);
}

// ── CHECK 9: Lower-48 Snowy Owl → seasons = ["winter"] only ─────────────────
{
  const wrong = [];
  for (const [pk, d] of Object.entries(DEPLOYED)) {
    if (ALASKA_PARKS.includes(pk) || HAWAII_PARKS.includes(pk)) continue;
    const a = (d.animals || []).find(x => x.name === 'Snowy Owl');
    if (!a) continue;
    const ok = Array.isArray(a.seasons) && a.seasons.length === 1 && a.seasons[0] === 'winter';
    if (!ok) wrong.push(`${pk}: ${JSON.stringify(a.seasons)}`);
  }
  check('Lower-48 Snowy Owl = ["winter"] only',
    wrong.length === 0,
    wrong.length ? `Bad: ${wrong.join(', ')}` : 'All lower-48 Snowy Owls are winter-only');
}

// ── CHECK 10: Everglades insects mostly very_likely (≤1 guaranteed, Spotted Lanternfly exempted) ─
{
  const insects = allAtPark('everglades', a => a.animalType === 'insect');
  const guaranteed = insects.filter(a => a.rarity === 'guaranteed');
  const veryLikely = insects.filter(a => a.rarity === 'very_likely');
  // Spotted Lanternfly is not at Everglades anyway; expect 0 guaranteed insects there
  check('Everglades insects mostly very_likely (not guaranteed)',
    guaranteed.length === 0 && veryLikely.length > 0,
    `total=${insects.length}  guaranteed=${guaranteed.length}  very_likely=${veryLikely.length}`
    + (guaranteed.length ? `  still-guaranteed: ${guaranteed.map(a=>a.name).join(', ')}` : ''));
}

// ── CHECK 11: Biscayne American Alligator = likely ───────────────────────────
{
  const a = findAt('biscayne', 'American Alligator');
  check('Biscayne American Alligator = likely',
    a?.rarity === 'likely',
    `rarity = ${a?.rarity ?? '(not found)'}`);
}

// ── CHECK 12: Biscayne "arctic" search → zero results ────────────────────────
{
  const hits = allAtPark('biscayne', a => /arctic/i.test(a.name));
  check('Biscayne search "arctic" → zero results',
    hits.length === 0,
    hits.length ? `still present: ${hits.map(a=>a.name).join(', ')}` : 'none found (correct)');
}

// ── Summary ───────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`\n${'─'.repeat(60)}`);
console.log(`RESULT: ${passed}/${results.length} passed  |  ${failed} failed`);
if (failed > 0) {
  console.log('\nFailed checks:');
  for (const r of results.filter(r => !r.passed)) {
    console.log(`  ✗ ${r.label}`);
    console.log(`    ${r.detail}`);
  }
}
